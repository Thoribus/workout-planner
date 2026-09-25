import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { useActivePlan } from '@/features/plan/ActivePlanContext';
import { buildWorkout } from '@/lib/program/workoutBuilder';
import type { Lift, LiftMaxes, PlannedExercise, PlannedSet, WorkoutPlan } from '@/types/workout';

type RunnerStatus = 'warmupReady' | 'warmup' | 'exerciseReady' | 'set' | 'rest' | 'betweenExercises' | 'complete';

type PendingConfirmation = 'skipExercise' | null;

type RunnerSnapshot = {
  status: RunnerStatus;
  exerciseIndex: number;
  setIndex: number;
  remainingSeconds: number;
  completedSets: number;
  skippedSets: number;
  skippedExercises: number;
  setWeightInputs: Record<string, string>;
  setWeightOverrides: Record<string, number>;
  workoutMaxes: LiftMaxes | null;
  maxInputs: Record<Lift, string>;
  weightInputError: string | null;
  lastCompletedExercise: PlannedExercise | null;
  nextWeekMaxAdjustments: Partial<Record<Lift, number>>;
  nextWeekAccessoryAdjustments: Record<string, number>;
  pendingConfirmation: PendingConfirmation;
};

const BETWEEN_EXERCISE_SECONDS = 120;

export default function ActiveWorkoutScreen() {
  const { activePlan, maxes, accessoryDefaults, completeCurrentWorkout } = useActivePlan();
  const [status, setStatus] = useState<RunnerStatus>('warmupReady');
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);
  const [skippedSets, setSkippedSets] = useState(0);
  const [skippedExercises, setSkippedExercises] = useState(0);
  const [setWeightInputs, setSetWeightInputs] = useState<Record<string, string>>({});
  const [setWeightOverrides, setSetWeightOverrides] = useState<Record<string, number>>({});
  const [workoutMaxes, setWorkoutMaxes] = useState<LiftMaxes | null>(maxes);
  const [maxInputs, setMaxInputs] = useState<Record<Lift, string>>({
    bench: String(maxes?.bench ?? ''),
    squat: String(maxes?.squat ?? ''),
    clean: String(maxes?.clean ?? ''),
  });
  const [weightInputError, setWeightInputError] = useState<string | null>(null);
  const [lastCompletedExercise, setLastCompletedExercise] = useState<PlannedExercise | null>(null);
  const [nextWeekMaxAdjustments, setNextWeekMaxAdjustments] = useState<Partial<Record<Lift, number>>>({});
  const [nextWeekAccessoryAdjustments, setNextWeekAccessoryAdjustments] = useState<Record<string, number>>({});
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation>(null);
  const [historyStack, setHistoryStack] = useState<RunnerSnapshot[]>([]);
  const [isSavingWorkout, setIsSavingWorkout] = useState(false);
  const [workoutStartedAt] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const maxesForWorkout = workoutMaxes ?? maxes;
  const workout = activePlan && maxesForWorkout
    ? buildWorkout({ plan: activePlan, maxes: maxesForWorkout, accessoryDefaults })
    : null;
  const currentExercise = workout?.exercises[exerciseIndex];
  const currentSet = currentExercise?.sets[setIndex];

  function createSnapshot(): RunnerSnapshot {
    return {
      status,
      exerciseIndex,
      setIndex,
      remainingSeconds,
      completedSets,
      skippedSets,
      skippedExercises,
      setWeightInputs,
      setWeightOverrides,
      workoutMaxes,
      maxInputs,
      weightInputError,
      lastCompletedExercise,
      nextWeekMaxAdjustments,
      nextWeekAccessoryAdjustments,
      pendingConfirmation,
    };
  }

  function pushSnapshot() {
    setHistoryStack((current) => [...current, createSnapshot()]);
  }

  function restoreSnapshot(snapshot: RunnerSnapshot) {
    setStatus(snapshot.status);
    setExerciseIndex(snapshot.exerciseIndex);
    setSetIndex(snapshot.setIndex);
    setRemainingSeconds(snapshot.remainingSeconds);
    setCompletedSets(snapshot.completedSets);
    setSkippedSets(snapshot.skippedSets);
    setSkippedExercises(snapshot.skippedExercises);
    setSetWeightInputs(snapshot.setWeightInputs);
    setSetWeightOverrides(snapshot.setWeightOverrides);
    setWorkoutMaxes(snapshot.workoutMaxes);
    setMaxInputs(snapshot.maxInputs);
    setWeightInputError(snapshot.weightInputError);
    setLastCompletedExercise(snapshot.lastCompletedExercise);
    setNextWeekMaxAdjustments(snapshot.nextWeekMaxAdjustments);
    setNextWeekAccessoryAdjustments(snapshot.nextWeekAccessoryAdjustments);
    setPendingConfirmation(snapshot.pendingConfirmation);
  }

  useEffect(() => {
    if ((status !== 'warmup' && status !== 'rest' && status !== 'betweenExercises') || remainingSeconds <= 0) {
      return;
    }

    const timeoutId = setTimeout(() => {
      const nextRemainingSeconds = Math.max(0, remainingSeconds - 1);

      setRemainingSeconds(nextRemainingSeconds);

      if (nextRemainingSeconds === 0) {
        if (status === 'warmup') {
          setStatus('exerciseReady');
        }
        if (status === 'rest') {
          setStatus('set');
        }
        if (status === 'betweenExercises') {
          setStatus('exerciseReady');
        }
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [remainingSeconds, status]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (historyStack.length === 0) {
        return false;
      }

      restoreSnapshot(historyStack[historyStack.length - 1]);
      setHistoryStack((current) => current.slice(0, -1));
      return true;
    });

    return () => subscription.remove();
  }, [historyStack]);

  useEffect(() => {
    if (status === 'complete') {
      return;
    }

    const intervalId = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - workoutStartedAt) / 1000)));
    }, 1000);

    return () => clearInterval(intervalId);
  }, [status, workoutStartedAt]);

  if (!activePlan || !maxes || !workout) {
    return (
      <Screen title="Active Workout" subtitle="Create a plan before starting a workout.">
        <AppCard style={styles.cardGap}>
          <Text style={styles.body}>No active plan is loaded.</Text>
          <AppButton href="/plan/new">Create Plan</AppButton>
        </AppCard>
      </Screen>
    );
  }

  const workoutPlan = workout;
  const plan = activePlan;
  const currentMaxes: LiftMaxes = maxesForWorkout ?? { bench: 0, squat: 0, clean: 0 };

  function startWarmup() {
    pushSnapshot();
    setRemainingSeconds(plan.warmupSeconds);
    setStatus('warmup');
  }

  function finishWarmup() {
    pushSnapshot();
    setRemainingSeconds(0);
    setStatus('exerciseReady');
  }

  function startExercise() {
    if (!currentExercise) {
      return;
    }

    if (currentExercise.lift) {
      const parsedMax = parseWeight(maxInputs[currentExercise.lift]);

      if (parsedMax === null) {
        setWeightInputError('Enter a valid max before starting this exercise.');
        return;
      }

      pushSnapshot();
      setWeightInputError(null);
      setWorkoutMaxes((current) => ({ ...(current ?? currentMaxes), [currentExercise.lift!]: parsedMax }));
      setSetIndex(0);
      setStatus('set');
      return;
    }

    const parsedWeights = parseAccessoryWeights(currentExercise, setWeightInputs, setWeightOverrides);

    if (!parsedWeights) {
      setWeightInputError('Enter a weight for every set before starting this exercise.');
      return;
    }

    pushSnapshot();
    setWeightInputError(null);
    setSetWeightOverrides((current) => ({ ...current, ...parsedWeights }));
    setSetIndex(0);
    setStatus('set');
  }

  function completeCurrentSet() {
    pushSnapshot();
    setCompletedSets((current) => current + 1);
    moveToNextStep(true);
  }

  function requestSkipCurrentExercise() {
    setPendingConfirmation('skipExercise');
  }

  function skipCurrentExercise() {
    if (!currentExercise) {
      return;
    }

    pushSnapshot();
    setSkippedExercises((current) => current + 1);
    setSkippedSets((current) => current + currentExercise.sets.length - setIndex);

    if (status === 'exerciseReady') {
      moveToNextExerciseWithoutTransition();
      return;
    }

    moveToNextExercise(currentExercise);
  }

  function skipRest() {
    pushSnapshot();
    setRemainingSeconds(0);
    setStatus(status === 'betweenExercises' ? 'exerciseReady' : 'set');
  }

  function moveToNextStep(useRest: boolean) {
    if (!currentExercise) {
      completeWorkoutFlow();
      return;
    }

    const nextSetIndex = setIndex + 1;

    if (nextSetIndex < currentExercise.sets.length) {
      setSetIndex(nextSetIndex);
      setRemainingSeconds(currentExercise.restSeconds);
      setStatus(useRest ? 'rest' : 'set');
      return;
    }

    moveToNextExercise(currentExercise);
  }

  function moveToNextExercise(completedExercise: PlannedExercise) {
    const nextExerciseIndex = exerciseIndex + 1;

    setLastCompletedExercise(completedExercise);

    if (nextExerciseIndex >= workoutPlan.exercises.length) {
      completeWorkoutFlow();
      return;
    }

    setExerciseIndex(nextExerciseIndex);
    setSetIndex(0);
    setWeightInputError(null);
    setRemainingSeconds(BETWEEN_EXERCISE_SECONDS);
    setStatus('betweenExercises');
  }

  function moveToNextExerciseWithoutTransition() {
    const nextExerciseIndex = exerciseIndex + 1;

    if (nextExerciseIndex >= workoutPlan.exercises.length) {
      completeWorkoutFlow();
      return;
    }

    setExerciseIndex(nextExerciseIndex);
    setSetIndex(0);
    setWeightInputError(null);
    setRemainingSeconds(0);
    setLastCompletedExercise(null);
    setStatus('exerciseReady');
  }

  function adjustNextWeekMax(lift: Lift, changeKg: number) {
    setNextWeekMaxAdjustments((current) => ({
      ...current,
      [lift]: (current[lift] ?? 0) + changeKg,
    }));
  }

  function adjustNextWeekAccessory(exerciseName: string, changeKg: number) {
    setNextWeekAccessoryAdjustments((current) => ({
      ...current,
      [exerciseName]: (current[exerciseName] ?? 0) + changeKg,
    }));
  }

  function confirmPendingAction() {
    if (pendingConfirmation === 'skipExercise') {
      setPendingConfirmation(null);
      skipCurrentExercise();
    }
  }

  async function finishWorkout() {
    setIsSavingWorkout(true);
    await completeCurrentWorkout({
      title: workoutPlan.title,
      week: workoutPlan.week,
      slot: workoutPlan.slot,
      phase: workoutPlan.phase,
      durationSeconds: elapsedSeconds,
      completedSets,
      skippedSets,
      skippedExercises,
      exercises: workoutPlan.exercises.map((exercise) => ({
        name: exercise.name,
        type: exercise.type,
        maxWeightKg: exercise.trainingMaxKg,
        volumeKg: calculateExerciseVolume(exercise, setWeightOverrides),
      })),
      maxAdjustments: nextWeekMaxAdjustments,
      accessoryUpdates: buildAccessoryUpdates(workoutPlan, setWeightOverrides, nextWeekAccessoryAdjustments),
    });
    requestAnimationFrame(() => router.replace('/'));
  }

  function renderConfirmationOverlay() {
    if (!pendingConfirmation) {
      return null;
    }

    return (
      <ConfirmationOverlay
        onCancel={() => setPendingConfirmation(null)}
        onConfirm={confirmPendingAction}
      />
    );
  }

  function completeWorkoutFlow() {
    setStatus('complete');
  }

  if (status === 'warmupReady') {
    return (
      <Screen title="Warmup" subtitle={`${workoutPlan.title} · Week ${workoutPlan.week} · ${workoutPlan.phase}`}>
        <TimerCard label="Warmup" seconds={activePlan.warmupSeconds} />
        <AppButton onPress={startWarmup}>Start Warmup</AppButton>
        <AppButton onPress={finishWarmup} variant="secondary">
          Skip Warmup
        </AppButton>
        {renderConfirmationOverlay()}
      </Screen>
    );
  }

  if (status === 'warmup') {
    return (
      <Screen title="Warmup" subtitle="Timer is running.">
        <TimerCard label="Warmup" seconds={remainingSeconds} />
        <AppButton onPress={finishWarmup} variant="secondary">
          Finish Warmup
        </AppButton>
        {renderConfirmationOverlay()}
      </Screen>
    );
  }

  if (status === 'betweenExercises') {
    const nextExercise = currentExercise;
    const nextSet = nextExercise?.sets[0];

    return (
      <Screen title="Next Exercise">
        <TimerCard label="Exercise transition" seconds={remainingSeconds} />
        {nextExercise && nextSet ? (
          <UpNextCard
            exercise={nextExercise}
            set={nextSet}
            setWeightInputs={setWeightInputs}
            setWeightOverrides={setWeightOverrides}
            onChangeSetWeight={(set, value) => updateAccessorySetWeight(nextExercise, set, value)}
          />
        ) : null}
        {lastCompletedExercise ? (
          <AdjustmentCard
            exercise={lastCompletedExercise}
            adjustmentKg={getExerciseAdjustment(lastCompletedExercise)}
            label={lastCompletedExercise.lift ? 'Next week max' : 'Next week accessory weight'}
            onAdjust={(changeKg) => {
              if (lastCompletedExercise.lift) {
                adjustNextWeekMax(lastCompletedExercise.lift, changeKg);
                return;
              }

              adjustNextWeekAccessory(lastCompletedExercise.name, changeKg);
            }}
          />
        ) : null}
        <AppButton onPress={skipRest}>Start Next Exercise</AppButton>
        {renderConfirmationOverlay()}
      </Screen>
    );
  }

  if (status === 'rest') {
    return (
      <Screen title="Rest">
        <TimerCard label="Rest" seconds={remainingSeconds} />
        {currentExercise && currentSet ? (
          <UpNextCard
            exercise={currentExercise}
            set={currentSet}
            setWeightInputs={setWeightInputs}
            setWeightOverrides={setWeightOverrides}
            onChangeSetWeight={(set, value) => updateAccessorySetWeight(currentExercise, set, value)}
          />
        ) : null}
        <AppButton onPress={skipRest} variant="secondary">
          Skip Rest
        </AppButton>
        {renderConfirmationOverlay()}
      </Screen>
    );
  }

  if (status === 'complete' || !currentExercise || !currentSet) {
    const totalVolumeKg = workoutPlan.exercises.reduce(
      (total, exercise) => total + calculateExerciseVolume(exercise, setWeightOverrides),
      0,
    );
    const durationSeconds = elapsedSeconds;

    return (
      <Screen title="Workout Done">
        <SummaryCard
          completedSets={completedSets}
          skippedSets={skippedSets}
          skippedExercises={skippedExercises}
          workout={workoutPlan}
          durationSeconds={durationSeconds}
          totalVolumeKg={totalVolumeKg}
          nextWeekMaxAdjustments={nextWeekMaxAdjustments}
          nextWeekAccessoryAdjustments={nextWeekAccessoryAdjustments}
        />
        <AppButton onPress={finishWorkout}>Continue</AppButton>
        {isSavingWorkout ? <SavingOverlay /> : null}
        {renderConfirmationOverlay()}
      </Screen>
    );
  }

  if (status === 'exerciseReady') {
    return (
      <Screen
        title={currentExercise.name}
        subtitle={`${workoutPlan.title} · Exercise ${exerciseIndex + 1} of ${workoutPlan.exercises.length}`}
        rightAction={<SkipExerciseIcon onPress={requestSkipCurrentExercise} />}>
        <ExerciseReadyCard
          exercise={currentExercise}
          maxInputs={maxInputs}
          setWeightInputs={setWeightInputs}
          setWeightOverrides={setWeightOverrides}
          weightInputError={weightInputError}
          onChangeMax={(lift, value) => {
            setWeightInputError(null);
            setMaxInputs((current) => ({ ...current, [lift]: value }));
          }}
          onChangeSetWeight={(set, value) => {
            setWeightInputError(null);
            updateAccessorySetWeight(currentExercise, set, value);
          }}
        />
        <AppButton onPress={startExercise}>Start Exercise</AppButton>
        {renderConfirmationOverlay()}
      </Screen>
    );
  }

  const displayWeight = getDisplayWeight(currentSet, currentExercise, getSetWeightOverride(currentExercise, currentSet, setWeightOverrides));

  return (
    <Screen
      title={currentExercise.name}
      subtitle={`${workoutPlan.title} · Exercise ${exerciseIndex + 1} of ${workoutPlan.exercises.length}`}
      rightAction={<SkipExerciseIcon onPress={requestSkipCurrentExercise} />}>
      <AppCard style={styles.cardGap}>
        <Text style={styles.setTitle}>Set {setIndex + 1}/{currentExercise.sets.length}</Text>
        <View style={styles.targetRow}>
          <View style={styles.targetBox}>
            <Text style={styles.targetLabel}>Reps</Text>
            <Text style={styles.targetValue}>{currentSet.reps}</Text>
          </View>
          <View style={styles.targetBox}>
            <Text style={styles.targetLabel}>Weight</Text>
            {currentExercise.type === 'accessory' ? (
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(value) => updateAccessorySetWeight(currentExercise, currentSet, value)}
                placeholder="kg"
                placeholderTextColor={colors.textMuted}
                style={styles.inlineWeightInput}
                value={getSetWeightInputValue(currentExercise, currentSet, setWeightInputs, setWeightOverrides)}
              />
            ) : (
              <Text style={styles.targetValue}>{displayWeight}</Text>
            )}
          </View>
        </View>
      </AppCard>

      <AppButton onPress={completeCurrentSet}>Done</AppButton>
      {renderConfirmationOverlay()}
    </Screen>
  );

  function getExerciseAdjustment(exercise: PlannedExercise) {
    if (exercise.lift) {
      return nextWeekMaxAdjustments[exercise.lift] ?? 0;
    }

    return nextWeekAccessoryAdjustments[exercise.name] ?? 0;
  }

  function updateAccessorySetWeight(exercise: PlannedExercise, set: PlannedSet, value: string) {
    if (exercise.type !== 'accessory') {
      return;
    }

    const key = getSetKey(exercise, set);
    const parsedWeight = parseWeight(value);

    setSetWeightInputs((current) => ({ ...current, [key]: value }));

    if (parsedWeight === null) {
      setSetWeightOverrides((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
      return;
    }

    setSetWeightOverrides((current) => ({ ...current, [key]: parsedWeight }));
  }
}

function SavingOverlay() {
  return (
    <View style={styles.overlay}>
      <View style={styles.overlayBackdrop} />
      <AppCard style={styles.confirmationCard}>
        <Text style={styles.exerciseName}>Saving workout...</Text>
        <Text style={styles.body}>Updating plan progress and workout history.</Text>
      </AppCard>
    </View>
  );
}

type TimerCardProps = {
  label: string;
  seconds: number;
};

function TimerCard({ label, seconds }: TimerCardProps) {
  return (
    <AppCard style={styles.timerCard}>
      <Text style={styles.kicker}>{label}</Text>
      <Text style={styles.timer}>{formatSeconds(seconds)}</Text>
    </AppCard>
  );
}

type UpNextCardProps = {
  exercise: PlannedExercise;
  set: PlannedSet;
  setWeightInputs: Record<string, string>;
  setWeightOverrides: Record<string, number>;
  onChangeSetWeight: (set: PlannedSet, value: string) => void;
};

function UpNextCard({ exercise, set, setWeightInputs, setWeightOverrides, onChangeSetWeight }: UpNextCardProps) {
  return (
    <AppCard style={styles.cardGap}>
      <Text style={styles.kicker}>Up next</Text>
      <Text style={styles.exerciseName}>{exercise.name}</Text>
      <View style={styles.targetRow}>
        <View style={styles.targetBox}>
          <Text style={styles.targetLabel}>Reps</Text>
          <Text style={styles.targetValueSmall}>{set.reps}</Text>
        </View>
        <View style={styles.targetBox}>
          <Text style={styles.targetLabel}>Weight</Text>
          {exercise.type === 'accessory' ? (
            <TextInput
              keyboardType="decimal-pad"
              onChangeText={(value) => onChangeSetWeight(set, value)}
              placeholder="kg"
              placeholderTextColor={colors.textMuted}
              style={styles.inlineWeightInputSmall}
              value={getSetWeightInputValue(exercise, set, setWeightInputs, setWeightOverrides)}
            />
          ) : (
            <Text style={styles.targetValueSmall}>
              {getDisplayWeight(set, exercise, getSetWeightOverride(exercise, set, setWeightOverrides))}
            </Text>
          )}
        </View>
      </View>
    </AppCard>
  );
}

type ExerciseReadyCardProps = {
  exercise: PlannedExercise;
  maxInputs: Record<Lift, string>;
  setWeightInputs: Record<string, string>;
  setWeightOverrides: Record<string, number>;
  weightInputError: string | null;
  onChangeMax: (lift: Lift, value: string) => void;
  onChangeSetWeight: (set: PlannedSet, value: string) => void;
};

function ExerciseReadyCard({
  exercise,
  maxInputs,
  setWeightInputs,
  setWeightOverrides,
  weightInputError,
  onChangeMax,
  onChangeSetWeight,
}: ExerciseReadyCardProps) {
  return (
    <AppCard style={styles.cardGap}>
      <Text style={styles.kicker}>Exercise setup</Text>
      <Text style={styles.exerciseName}>{exercise.name}</Text>
      <Text style={styles.body}>{exercise.sets.length} sets · Rest {exercise.restSeconds}s</Text>

      {exercise.lift ? (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Max for this exercise</Text>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={(value) => onChangeMax(exercise.lift!, value)}
            placeholder="kg"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={maxInputs[exercise.lift]}
          />
          <Text style={styles.body}>Work sets are calculated from this max and cannot be edited individually.</Text>
          {weightInputError ? <Text style={styles.errorText}>{weightInputError}</Text> : null}
        </View>
      ) : (
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Weight before starting</Text>
          {exercise.sets.map((set) => (
            <View key={getSetKey(exercise, set)} style={styles.setInputRow}>
              <Text style={styles.setInputLabel}>Set {set.setIndex}/{exercise.sets.length}</Text>
              <Text style={styles.setInputReps}>{set.reps}</Text>
              <TextInput
                keyboardType="decimal-pad"
                onChangeText={(nextValue) => onChangeSetWeight(set, nextValue)}
                placeholder="kg"
                placeholderTextColor={colors.textMuted}
                style={styles.setInput}
                value={getSetWeightInputValue(exercise, set, setWeightInputs, setWeightOverrides)}
              />
            </View>
          ))}
          {weightInputError ? <Text style={styles.errorText}>{weightInputError}</Text> : null}
        </View>
      )}
    </AppCard>
  );
}

type SkipExerciseIconProps = {
  onPress: () => void;
};

function SkipExerciseIcon({ onPress }: SkipExerciseIconProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.skipIcon, pressed && styles.skipIconPressed]}>
      <Text style={styles.skipIconText}>&gt;&gt;|</Text>
    </Pressable>
  );
}

type AdjustmentCardProps = {
  exercise: PlannedExercise;
  adjustmentKg: number;
  label: string;
  onAdjust: (changeKg: number) => void;
};

function AdjustmentCard({ exercise, adjustmentKg, label, onAdjust }: AdjustmentCardProps) {
  return (
    <AppCard style={styles.cardGap}>
      <Text style={styles.kicker}>{label}</Text>
      <Text style={styles.body}>{exercise.name} adjustment: {formatSignedWeight(adjustmentKg)}</Text>
      <View style={styles.adjustmentGrid}>
        {[-5, -2.5, 2.5, 5, 10].map((changeKg) => (
          <Pressable key={changeKg} onPress={() => onAdjust(changeKg)} style={styles.adjustmentButton}>
            <Text style={styles.adjustmentText}>{formatSignedWeight(changeKg)}</Text>
          </Pressable>
        ))}
      </View>
    </AppCard>
  );
}

type ConfirmationOverlayProps = {
  onCancel: () => void;
  onConfirm: () => void;
};

function ConfirmationOverlay({ onCancel, onConfirm }: ConfirmationOverlayProps) {
  const copy = {
    title: 'Skip this exercise?',
    body: 'All remaining sets for this exercise will be marked as skipped.',
    confirm: 'Skip Exercise',
  };

  return (
    <View style={styles.overlay}>
      <Pressable style={styles.overlayBackdrop} onPress={onCancel} />
      <AppCard style={styles.confirmationCard}>
        <Text style={styles.exerciseName}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
        <View style={styles.actions}>
          <AppButton onPress={onCancel} variant="secondary" style={styles.actionButton}>
            Cancel
          </AppButton>
          <AppButton onPress={onConfirm} style={styles.actionButton}>
            {copy.confirm}
          </AppButton>
        </View>
      </AppCard>
    </View>
  );
}

type SummaryCardProps = {
  workout: WorkoutPlan;
  durationSeconds: number;
  totalVolumeKg: number;
  completedSets: number;
  skippedSets: number;
  skippedExercises: number;
  nextWeekMaxAdjustments: Partial<Record<Lift, number>>;
  nextWeekAccessoryAdjustments: Record<string, number>;
};

function SummaryCard({
  workout,
  durationSeconds,
  totalVolumeKg,
  completedSets,
  skippedSets,
  skippedExercises,
  nextWeekMaxAdjustments,
  nextWeekAccessoryAdjustments,
}: SummaryCardProps) {
  const maxAdjustmentEntries = Object.entries(nextWeekMaxAdjustments).filter(([, value]) => value !== 0);
  const accessoryAdjustmentEntries = Object.entries(nextWeekAccessoryAdjustments).filter(([, value]) => value !== 0);

  return (
    <AppCard style={styles.cardGap}>
      <Text style={styles.kicker}>{formatWorkoutHeading(workout.title, workout.week, workout.phase)}</Text>
      <View style={styles.summaryGrid}>
        <SummaryMetric label="Time" value={formatDuration(durationSeconds)} />
        <SummaryMetric label="Volume" value={`${Math.round(totalVolumeKg)} kg`} />
        <SummaryMetric label="Sets" value={String(completedSets)} />
      </View>
      <Text style={styles.body}>Skipped sets: {skippedSets}</Text>
      <Text style={styles.body}>Skipped exercises: {skippedExercises}</Text>
      {maxAdjustmentEntries.map(([lift, value]) => (
        <Text key={lift} style={styles.body}>
          {lift} next week: {formatSignedWeight(value ?? 0)}
        </Text>
      ))}
      {accessoryAdjustmentEntries.map(([exerciseName, value]) => (
        <Text key={exerciseName} style={styles.body}>
          {exerciseName} next week: {formatSignedWeight(value ?? 0)}
        </Text>
      ))}
    </AppCard>
  );
}

type SummaryMetricProps = {
  label: string;
  value: string;
};

function SummaryMetric({ label, value }: SummaryMetricProps) {
  return (
    <View style={styles.summaryMetric}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function parseAccessoryWeights(
  exercise: PlannedExercise,
  setWeightInputs: Record<string, string>,
  setWeightOverrides: Record<string, number>,
) {
  const parsedWeights: Record<string, number> = {};

  for (const set of exercise.sets) {
    const key = getSetKey(exercise, set);
    const rawValue = setWeightInputs[key] ?? String(setWeightOverrides[key] ?? set.weightKg ?? '');
    const parsedWeight = parseWeight(rawValue);

    if (parsedWeight === null) {
      return null;
    }

    parsedWeights[key] = parsedWeight;
  }

  return parsedWeights;
}

function getSetKey(exercise: PlannedExercise, set: PlannedSet) {
  return `${exercise.id}-${set.setIndex}`;
}

function getSetWeightOverride(
  exercise: PlannedExercise,
  set: PlannedSet,
  setWeightOverrides: Record<string, number>,
) {
  return setWeightOverrides[getSetKey(exercise, set)];
}

function getSetWeightInputValue(
  exercise: PlannedExercise,
  set: PlannedSet,
  setWeightInputs: Record<string, string>,
  setWeightOverrides: Record<string, number>,
) {
  const key = getSetKey(exercise, set);
  const value = setWeightInputs[key] ?? setWeightOverrides[key] ?? set.weightKg ?? '';

  return String(value);
}

function getDisplayWeight(set: PlannedSet, exercise: PlannedExercise, weightOverride?: number) {
  if (weightOverride !== undefined) {
    return weightOverride;
  }

  if (set.weightKg !== undefined) {
    return set.weightKg;
  }

  return exercise.type === 'accessory' ? 'Set first' : '-';
}

function parseWeight(value: string) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatSignedWeight(weightKg: number) {
  if (weightKg > 0) {
    return `+${weightKg}`;
  }

  return String(weightKg);
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

function formatWorkoutHeading(title: string, week: number, phase: string) {
  return `${title} - Week ${week} ${phase}`;
}

function calculateExerciseVolume(exercise: PlannedExercise, setWeightOverrides: Record<string, number>) {
  return exercise.sets.reduce((total, set) => {
    const reps = typeof set.reps === 'number' ? set.reps : parseRepRange(set.reps);
    const weight = getSetWeightOverride(exercise, set, setWeightOverrides) ?? set.weightKg ?? 0;

    return total + reps * weight;
  }, 0);
}

function buildAccessoryUpdates(
  workout: WorkoutPlan,
  setWeightOverrides: Record<string, number>,
  nextWeekAccessoryAdjustments: Record<string, number>,
) {
  return workout.exercises
    .filter((exercise) => exercise.type === 'accessory')
    .map((exercise) => {
      const firstSet = exercise.sets[0];
      const baseWeight = firstSet ? getSetWeightOverride(exercise, firstSet, setWeightOverrides) ?? firstSet.weightKg : undefined;
      const adjustment = nextWeekAccessoryAdjustments[exercise.name] ?? 0;
      const lastWeightKg = baseWeight !== undefined ? Math.max(0, baseWeight + adjustment) : undefined;

      return {
        exerciseName: exercise.name,
        lastWeightKg,
        lastReps: firstSet ? String(firstSet.reps) : undefined,
      };
    })
    .filter((update) => update.lastWeightKg !== undefined);
}

function parseRepRange(reps: string) {
  const firstNumber = Number(reps.split('-')[0]);
  return Number.isFinite(firstNumber) ? firstNumber : 0;
}

const styles = StyleSheet.create({
  cardGap: {
    gap: spacing.md,
  },
  kicker: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  timerCard: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  timer: {
    color: colors.text,
    fontSize: 52,
    fontWeight: '900',
    letterSpacing: -2,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryMetric: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 14,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  exerciseName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  setTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
  },
  targetRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  targetBox: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  targetLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  targetValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
  },
  targetValueSmall: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  inlineWeightInput: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    padding: 0,
  },
  inlineWeightInputSmall: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
    padding: 0,
  },
  skipIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 52,
  },
  skipIconPressed: {
    opacity: 0.7,
  },
  skipIconText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  inputLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  setInputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  setInputLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
    width: 70,
  },
  setInputReps: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 14,
  },
  setInput: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    textAlign: 'right',
    width: 96,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    fontWeight: '700',
  },
  overlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    padding: spacing.md,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 10,
  },
  overlayBackdrop: {
    backgroundColor: 'rgba(2, 6, 23, 0.72)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  confirmationCard: {
    borderColor: colors.accent,
    gap: spacing.md,
    width: '100%',
  },
  adjustmentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  adjustmentButton: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  adjustmentText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
});
