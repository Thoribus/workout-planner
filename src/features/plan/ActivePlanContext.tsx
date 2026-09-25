import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import {
  deletePlanFromDb,
  getActivePlanFromDb,
  getDeletedPlansFromDb,
  restorePlanInDb,
  saveLiftMaxesToDb,
  savePlanToDb,
  updatePlanProgressInDb,
  updatePlanSettingsInDb,
} from '@/lib/storage/planRepository';
import { getAccessoryDefaultsFromDb, saveAccessoryDefaultToDb } from '@/lib/storage/accessoryRepository';
import { buildPlanSchedule } from '@/lib/schedule/scheduleBuilder';
import { getWorkoutHistoryFromDb, saveWorkoutHistoryItemToDb } from '@/lib/storage/workoutRepository';
import type { AccessoryDefault, Lift, LiftMaxes, Plan, ProgramLength, Weekday, WorkoutSlot } from '@/types/workout';

type CreatePlanInput = {
  name: string;
  weeks: ProgramLength;
  benchMaxKg: number;
  squatMaxKg: number;
  cleanMaxKg: number;
  warmupSeconds: number;
  mainRestSeconds: number;
  accessoryRestSeconds: number;
  roundingIncrementKg: number;
  scheduleStartDate: string;
  scheduleWeekdays: Record<WorkoutSlot, Weekday>;
};

type ActivePlanState = {
  activePlan: Plan | null;
  maxes: LiftMaxes | null;
  accessoryDefaults: AccessoryDefault[];
  workoutHistory: WorkoutHistoryItem[];
  deletedPlans: Plan[];
  createPlan: (input: CreatePlanInput) => Promise<void>;
  completeCurrentWorkout: (summary: WorkoutCompletionInput) => Promise<void>;
  deleteActivePlan: () => Promise<void>;
  restoreDeletedPlan: (planId: string) => Promise<void>;
  updateMaxes: (nextMaxes: LiftMaxes) => Promise<void>;
  updatePlanSettings: (settings: Partial<Pick<Plan,
    | 'warmupSeconds'
    | 'mainRestSeconds'
    | 'accessoryRestSeconds'
    | 'roundingIncrementKg'
    | 'speedCleanReductionKg'
    | 'frontSquatReductionKg'
  >>) => Promise<void>;
};

export type WorkoutCompletionInput = {
  title: string;
  week: number;
  slot: WorkoutSlot;
  phase: string;
  durationSeconds: number;
  completedSets: number;
  skippedSets: number;
  skippedExercises: number;
  exercises: {
    name: string;
    type: 'main' | 'accessory';
    maxWeightKg?: number;
    volumeKg: number;
  }[];
  maxAdjustments?: Partial<Record<Lift, number>>;
  accessoryUpdates?: AccessoryDefault[];
};

export type WorkoutHistoryItem = WorkoutCompletionInput & {
  id: string;
  completedAt: string;
  totalVolumeKg: number;
};

const ActivePlanContext = createContext<ActivePlanState | null>(null);
const persistenceEnabled = Platform.OS !== 'web';
const WEB_STORAGE_KEY = 'workout-planner-state-v1';

type PersistedWebState = {
  activePlan: Plan | null;
  maxes: LiftMaxes | null;
  accessoryDefaults: AccessoryDefault[];
  workoutHistory: WorkoutHistoryItem[];
  deletedPlans: Plan[];
};

export function ActivePlanProvider({ children }: PropsWithChildren) {
  const [activePlan, setActivePlan] = useState<Plan | null>(null);
  const [maxes, setMaxes] = useState<LiftMaxes | null>(null);
  const [accessoryDefaults, setAccessoryDefaults] = useState<AccessoryDefault[]>([]);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutHistoryItem[]>([]);
  const [deletedPlans, setDeletedPlans] = useState<Plan[]>([]);

  useEffect(() => {
    let active = true;

    async function loadPersistedState() {
      if (Platform.OS === 'web') {
        const webState = loadWebState();

        if (!active || !webState) {
          return;
        }

        setActivePlan(webState.activePlan);
        setMaxes(webState.maxes);
        setAccessoryDefaults(webState.accessoryDefaults ?? []);
        setWorkoutHistory(webState.workoutHistory);
        setDeletedPlans(webState.deletedPlans ?? []);
        return;
      }

      if (!persistenceEnabled) {
        return;
      }

      const persistedPlan = await getActivePlanFromDb();
      const persistedDeletedPlans = await getDeletedPlansFromDb();

      if (!active) {
        return;
      }

      setDeletedPlans(persistedDeletedPlans);

      if (!persistedPlan) {
        return;
      }

      setActivePlan(persistedPlan.plan);
      setMaxes(persistedPlan.maxes);
      setAccessoryDefaults(await getAccessoryDefaultsFromDb());
      setWorkoutHistory(await getWorkoutHistoryFromDb(persistedPlan.plan.id));
    }

    void loadPersistedState();

    return () => {
      active = false;
    };
  }, []);

  async function createPlan(input: CreatePlanInput) {
    const now = new Date().toISOString();
    const schedule = buildPlanSchedule(input.scheduleStartDate, input.scheduleWeekdays, input.weeks);
    const firstWorkout = schedule.workouts[0];
    const plan: Plan = {
      id: now,
      name: input.name.trim() || 'Clemson Power Program',
      weeks: input.weeks,
      currentWeek: firstWorkout.week,
      currentSlot: firstWorkout.slot,
      roundingIncrementKg: input.roundingIncrementKg,
      warmupSeconds: input.warmupSeconds,
      mainRestSeconds: input.mainRestSeconds,
      accessoryRestSeconds: input.accessoryRestSeconds,
      speedCleanReductionKg: 22.5,
      frontSquatReductionKg: 45,
      currentScheduleIndex: firstWorkout.index,
      schedule,
      createdAt: now,
    };
    const initialMaxes = {
      bench: input.benchMaxKg,
      squat: input.squatMaxKg,
      clean: input.cleanMaxKg,
    };
    setActivePlan(plan);
    setMaxes(initialMaxes);
    setAccessoryDefaults([]);
    setWorkoutHistory([]);
    saveWebState({ activePlan: plan, maxes: initialMaxes, accessoryDefaults: [], workoutHistory: [], deletedPlans });

    if (persistenceEnabled) {
      await savePlanToDb(plan, initialMaxes);
    }
  }

  async function completeCurrentWorkout(summary: WorkoutCompletionInput) {
    if (!activePlan || !maxes) {
      return;
    }

    const completedAt = new Date().toISOString();
    const historyItem = {
      ...summary,
      id: `${activePlan.id}-${summary.week}-${summary.slot}-${completedAt}`,
      completedAt,
      totalVolumeKg: summary.exercises.reduce((total, exercise) => total + exercise.volumeKg, 0),
    };
    const nextPlan = advancePlan(activePlan);
    const nextMaxes = applyMaxAdjustments(maxes, summary.maxAdjustments);
    const nextAccessoryDefaults = applyAccessoryUpdates(accessoryDefaults, summary.accessoryUpdates ?? []);

    setWorkoutHistory((current) => [historyItem, ...current]);
    setActivePlan(nextPlan);
    setMaxes(nextMaxes);
    setAccessoryDefaults(nextAccessoryDefaults);
    saveWebState({
      activePlan: nextPlan,
      maxes: nextMaxes,
      accessoryDefaults: nextAccessoryDefaults,
      workoutHistory: [historyItem, ...workoutHistory],
      deletedPlans,
    });

    if (persistenceEnabled) {
      await saveWorkoutHistoryItemToDb(activePlan.id, historyItem);
      await updatePlanProgressInDb(nextPlan);
      await saveLiftMaxesToDb(nextPlan, nextMaxes);
      for (const accessoryDefault of summary.accessoryUpdates ?? []) {
        await saveAccessoryDefaultToDb(accessoryDefault);
      }
    }
  }

  async function deleteActivePlan() {
    const plan = activePlan;
    const planId = plan?.id;

    setActivePlan(null);
    setMaxes(null);
    setAccessoryDefaults([]);
    setWorkoutHistory([]);
    const nextDeletedPlans = plan ? [{ ...plan, deletedAt: new Date().toISOString() }, ...deletedPlans] : deletedPlans;
    setDeletedPlans(nextDeletedPlans);
    saveWebState({ activePlan: null, maxes: null, accessoryDefaults: [], workoutHistory: [], deletedPlans: nextDeletedPlans });

    if (planId && persistenceEnabled) {
      await deletePlanFromDb(planId);
    }
  }

  async function restoreDeletedPlan(planId: string) {
    const plan = deletedPlans.find((candidate) => candidate.id === planId);

    if (!plan) {
      return;
    }

    const restoredPlan = { ...plan, deletedAt: undefined, completedAt: undefined };
    const restoredMaxes = persistenceEnabled
      ? (await getActivePlanAfterRestore(planId))?.maxes
      : maxes ?? { bench: 0, squat: 0, clean: 0 };
    const nextDeletedPlans = deletedPlans.filter((candidate) => candidate.id !== planId);

    setActivePlan(restoredPlan);
    setMaxes(restoredMaxes ?? { bench: 0, squat: 0, clean: 0 });
    setDeletedPlans(nextDeletedPlans);
    setWorkoutHistory(persistenceEnabled ? await getWorkoutHistoryFromDb(planId) : []);
    saveWebState({
      activePlan: restoredPlan,
      maxes: restoredMaxes ?? { bench: 0, squat: 0, clean: 0 },
      accessoryDefaults,
      workoutHistory: [],
      deletedPlans: nextDeletedPlans,
    });

    if (persistenceEnabled) {
      await restorePlanInDb(planId);
    }
  }

  async function updateMaxes(nextMaxes: LiftMaxes) {
    setMaxes(nextMaxes);
    saveWebState({ activePlan, maxes: nextMaxes, accessoryDefaults, workoutHistory, deletedPlans });

    if (activePlan && persistenceEnabled) {
      await saveLiftMaxesToDb(activePlan, nextMaxes);
    }
  }

  async function updatePlanSettings(settings: Partial<Pick<Plan,
    | 'warmupSeconds'
    | 'mainRestSeconds'
    | 'accessoryRestSeconds'
    | 'roundingIncrementKg'
    | 'speedCleanReductionKg'
    | 'frontSquatReductionKg'
  >>) {
    if (!activePlan) {
      return;
    }

    const nextPlan = { ...activePlan, ...settings };
    setActivePlan(nextPlan);
    saveWebState({ activePlan: nextPlan, maxes, accessoryDefaults, workoutHistory, deletedPlans });

    if (persistenceEnabled) {
      await updatePlanSettingsInDb(nextPlan);
    }
  }

  return (
    <ActivePlanContext.Provider
      value={{
        activePlan,
        maxes,
        accessoryDefaults,
        workoutHistory,
        deletedPlans,
        createPlan,
        completeCurrentWorkout,
        deleteActivePlan,
        restoreDeletedPlan,
        updateMaxes,
        updatePlanSettings,
      }}>
      {children}
    </ActivePlanContext.Provider>
  );
}

async function getActivePlanAfterRestore(planId: string) {
  await restorePlanInDb(planId);
  const restored = await getActivePlanFromDb();

  if (restored?.plan.id !== planId) {
    return null;
  }

  return restored;
}

function applyMaxAdjustments(maxes: LiftMaxes, adjustments?: Partial<Record<Lift, number>>) {
  if (!adjustments) {
    return maxes;
  }

  return {
    bench: maxes.bench + (adjustments.bench ?? 0),
    squat: maxes.squat + (adjustments.squat ?? 0),
    clean: maxes.clean + (adjustments.clean ?? 0),
  };
}

function applyAccessoryUpdates(currentDefaults: AccessoryDefault[], updates: AccessoryDefault[]) {
  const nextDefaults = new Map(currentDefaults.map((defaultValue) => [defaultValue.exerciseName, defaultValue]));

  for (const update of updates) {
    nextDefaults.set(update.exerciseName, update);
  }

  return Array.from(nextDefaults.values());
}

function loadWebState() {
  if (Platform.OS !== 'web' || !globalThis.localStorage) {
    return null;
  }

  const rawValue = globalThis.localStorage.getItem(WEB_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as PersistedWebState;
  } catch {
    return null;
  }
}

function saveWebState(state: PersistedWebState) {
  if (Platform.OS !== 'web' || !globalThis.localStorage) {
    return;
  }

  globalThis.localStorage.setItem(WEB_STORAGE_KEY, JSON.stringify(state));
}

function advancePlan(plan: Plan): Plan {
  if (plan.schedule) {
    const nextScheduleIndex = plan.currentScheduleIndex + 1;
    const nextWorkout = plan.schedule.workouts[nextScheduleIndex];

    if (!nextWorkout) {
      return {
        ...plan,
        currentScheduleIndex: nextScheduleIndex,
        completedAt: new Date().toISOString(),
      };
    }

    return {
      ...plan,
      currentWeek: nextWorkout.week,
      currentSlot: nextWorkout.slot,
      currentScheduleIndex: nextScheduleIndex,
    };
  }

  if (plan.currentSlot < 4) {
    return {
      ...plan,
      currentSlot: (plan.currentSlot + 1) as WorkoutSlot,
    };
  }

  const nextWeek = plan.currentWeek + 1;

  return {
    ...plan,
    currentWeek: nextWeek,
    currentSlot: 1,
    completedAt: nextWeek > plan.weeks ? new Date().toISOString() : plan.completedAt,
  };
}

export function useActivePlan() {
  const context = useContext(ActivePlanContext);

  if (!context) {
    throw new Error('useActivePlan must be used inside ActivePlanProvider');
  }

  return context;
}
