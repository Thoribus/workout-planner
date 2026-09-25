import { ACCESSORY_TEMPLATES, MAIN_EXERCISES, WORKOUT_SLOTS } from '@/data/clemsonProgram';
import { getPhaseForWeek } from '@/lib/program/phases';
import {
  calculateSetWeight,
  getFrontSquatTrainingMax,
  getSpeedCleanTrainingMax,
} from '@/lib/program/weights';
import type {
  AccessoryDefault,
  ExerciseKey,
  LiftMaxes,
  PhaseGroup,
  Phase,
  Plan,
  PlannedExercise,
  WorkoutPlan,
  WorkoutSlot,
} from '@/types/workout';

type BuildWorkoutArgs = {
  plan: Plan;
  maxes: LiftMaxes;
  slot?: WorkoutSlot;
  accessoryDefaults?: AccessoryDefault[];
};

export function buildWorkout({
  plan,
  maxes,
  slot = plan.currentSlot,
  accessoryDefaults = [],
}: BuildWorkoutArgs): WorkoutPlan {
  const slotDefinition = WORKOUT_SLOTS[slot];
  const phaseGroup = getPhaseGroupForSlot(slot);
  const phase = getPhaseForWeek(plan.currentWeek, plan.weeks, phaseGroup);
  const mainExercises = slotDefinition.mainExerciseKeys.map((key) =>
    buildMainExercise(key, phase, plan, maxes),
  );
  const accessoryExercises = ACCESSORY_TEMPLATES[slot].map((definition, index) => {
    const accessoryDefault = accessoryDefaults.find(
      (defaultValue) => defaultValue.exerciseName === definition.name,
    );

    return {
      id: `accessory-${slot}-${index + 1}`,
      name: definition.name,
      type: 'accessory',
      restSeconds: plan.accessoryRestSeconds,
      sets: definition.reps.map((reps, setIndex) => ({
        setIndex: setIndex + 1,
        reps: accessoryDefault?.lastReps ?? reps,
        weightKg: accessoryDefault?.lastWeightKg,
      })),
    } satisfies PlannedExercise;
  });

  return {
    week: plan.currentWeek,
    slot,
    phase,
    title: slotDefinition.title,
    exercises: [...mainExercises, ...accessoryExercises],
  };
}

function getPhaseGroupForSlot(slot: WorkoutSlot): PhaseGroup {
  return slot === 1 || slot === 3 ? 'bench' : 'lower';
}

function buildMainExercise(
  key: ExerciseKey,
  phase: Phase,
  plan: Plan,
  maxes: LiftMaxes,
): PlannedExercise {
  const definition = MAIN_EXERCISES[key];
  const trainingMaxKg = getTrainingMaxForExercise(key, plan, maxes);

  return {
    id: `main-${key}`,
    name: definition.name,
    type: 'main',
    key,
    lift: getLiftForExercise(key),
    restSeconds: plan.mainRestSeconds,
    trainingMaxKg,
    sets: definition.phases[phase].map((setDefinition, index) => ({
      setIndex: index + 1,
      reps: setDefinition.reps,
      percent: setDefinition.percent,
      weightKg: calculateSetWeight(
        trainingMaxKg,
        setDefinition.percent,
        plan.roundingIncrementKg,
      ),
    })),
  };
}

function getTrainingMaxForExercise(key: ExerciseKey, plan: Plan, maxes: LiftMaxes): number {
  switch (key) {
    case 'benchPress':
    case 'closeGripBenchPress':
      return maxes.bench;
    case 'squat':
      return maxes.squat;
    case 'speedClean':
      return getSpeedCleanTrainingMax(maxes.clean, plan.speedCleanReductionKg);
    case 'powerClean':
      return maxes.clean;
    case 'frontSquat':
      return getFrontSquatTrainingMax(maxes.squat, plan.frontSquatReductionKg);
  }
}

function getLiftForExercise(key: ExerciseKey) {
  switch (key) {
    case 'benchPress':
    case 'closeGripBenchPress':
      return 'bench';
    case 'squat':
    case 'frontSquat':
      return 'squat';
    case 'speedClean':
    case 'powerClean':
      return 'clean';
  }
}
