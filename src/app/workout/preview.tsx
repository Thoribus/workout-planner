import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/Screen';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { colors, spacing } from '@/constants/theme';
import { useActivePlan } from '@/features/plan/ActivePlanContext';
import { buildWorkout } from '@/lib/program/workoutBuilder';
import type { AccessoryDefault, LiftMaxes, Plan } from '@/types/workout';

const demoPlan: Plan = {
  id: 'demo-plan',
  name: 'Demo Clemson Plan',
  weeks: 10,
  currentWeek: 1,
  currentSlot: 1,
  roundingIncrementKg: 2.5,
  warmupSeconds: 600,
  mainRestSeconds: 90,
  accessoryRestSeconds: 60,
  speedCleanReductionKg: 22.5,
  frontSquatReductionKg: 45,
  currentScheduleIndex: 0,
  createdAt: new Date().toISOString(),
};

const demoMaxes: LiftMaxes = {
  bench: 70,
  squat: 100,
  clean: 75,
};

const demoAccessoryDefaults: AccessoryDefault[] = [
  { exerciseName: 'Incline Dumbbell Bench Press', lastWeightKg: 20 },
  { exerciseName: 'Triceps Extensions', lastWeightKg: 25 },
  { exerciseName: 'Lat Pulldown', lastWeightKg: 55 },
];

export default function WorkoutPreviewScreen() {
  const { activePlan, maxes, accessoryDefaults } = useActivePlan();
  const plan = activePlan ?? demoPlan;
  const liftMaxes = maxes ?? demoMaxes;
  const workout = buildWorkout({
    plan,
    maxes: liftMaxes,
    accessoryDefaults: activePlan ? accessoryDefaults : demoAccessoryDefaults,
  });

  return (
    <Screen
      title="Next Workout"
      subtitle={formatWorkoutHeading(workout.title, workout.week, workout.phase)}>
      <AppCard style={styles.summaryCard}>
        <Text style={styles.kicker}>{activePlan ? 'Current maxes' : 'Demo maxes'}</Text>
        <Text style={styles.body}>Bench {liftMaxes.bench} kg</Text>
        <Text style={styles.body}>Squat {liftMaxes.squat} kg</Text>
        <Text style={styles.body}>Power Clean {liftMaxes.clean} kg</Text>
      </AppCard>

      <AppButton href="/workout/active" variant="outline" size="large" style={styles.startButton}>
        Start Workout
      </AppButton>

      {workout.exercises.map((exercise) => (
        <AppCard key={exercise.id} style={styles.exerciseCard}>
          <View style={styles.exerciseHeader}>
            <View style={styles.exerciseTitleGroup}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.exerciseMeta}>
                {exercise.type === 'main' ? 'Main lift' : 'Accessory'} · Rest {exercise.restSeconds}s
              </Text>
            </View>
            {exercise.trainingMaxKg ? (
              <Text style={styles.trainingMax}>{exercise.trainingMaxKg} kg max</Text>
            ) : null}
          </View>

          <View style={styles.setHeaderRow}>
            <Text style={styles.headerReps}>Reps</Text>
            <Text style={styles.headerWeight}>Weight</Text>
          </View>

          <View style={styles.setList}>
            {exercise.sets.map((set) => (
              <View key={`${exercise.id}-${set.setIndex}`} style={styles.setRow}>
                <Text style={styles.setDetail}>{set.reps}</Text>
                <Text style={styles.setWeight}>
                  {set.weightKg ? set.weightKg : 'set during workout'}
                </Text>
              </View>
            ))}
          </View>
        </AppCard>
      ))}

      <AppButton href="/workout/active" variant="outline" size="large" style={styles.startButton}>
        Start Workout
      </AppButton>
    </Screen>
  );
}

function formatWorkoutHeading(title: string, week: number, phase: string) {
  return `${title} - Week ${week} ${phase}`;
}

const styles = StyleSheet.create({
  summaryCard: {
    gap: spacing.xs,
  },
  startButton: {
    borderRadius: 18,
    marginVertical: spacing.sm,
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
  },
  exerciseCard: {
    gap: spacing.md,
  },
  exerciseHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  exerciseTitleGroup: {
    flex: 1,
    gap: spacing.xs,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '800',
  },
  exerciseMeta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  trainingMax: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  setList: {
    gap: spacing.xs,
  },
  setHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  headerReps: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerWeight: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'right',
    textTransform: 'uppercase',
    width: 150,
  },
  setRow: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  setDetail: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  setWeight: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
    width: 150,
  },
});
