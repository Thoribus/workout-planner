import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { useActivePlan } from '@/features/plan/ActivePlanContext';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { workoutHistory } = useActivePlan();
  const workout = workoutHistory.find((historyItem) => historyItem.id === id);

  if (!workout) {
    return (
      <Screen title="Workout Details" subtitle="Workout not found.">
        <AppCard style={styles.card}>
          <Text style={styles.body}>This workout is not available in local state.</Text>
        </AppCard>
      </Screen>
    );
  }

  return (
    <Screen title={workout.title} subtitle={`${formatDateTime(workout.completedAt)} · ${workout.phase}`}>
      <AppCard style={styles.card}>
        <Text style={styles.kicker}>Summary</Text>
        <Text style={styles.body}>Week {workout.week} · Day {workout.slot}</Text>
        <Text style={styles.body}>Volume {Math.round(workout.totalVolumeKg)} kg</Text>
        <Text style={styles.body}>Completed sets {workout.completedSets}</Text>
        <Text style={styles.body}>Skipped sets {workout.skippedSets}</Text>
        <Text style={styles.body}>Skipped exercises {workout.skippedExercises}</Text>
      </AppCard>

      {workout.exercises.map((exercise) => (
        <AppCard key={exercise.name} style={styles.card}>
          <Text style={styles.kicker}>{exercise.type}</Text>
          <Text style={styles.title}>{exercise.name}</Text>
          {exercise.maxWeightKg ? <Text style={styles.body}>Training max {exercise.maxWeightKg} kg</Text> : null}
          <Text style={styles.body}>Volume {Math.round(exercise.volumeKg)} kg</Text>
        </AppCard>
      ))}
    </Screen>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  kicker: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
});
