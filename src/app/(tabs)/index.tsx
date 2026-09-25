import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { useActivePlan } from '@/features/plan/ActivePlanContext';

export default function HomeTab() {
  const { activePlan, workoutHistory } = useActivePlan();
  const recentWorkouts = workoutHistory.slice(0, 5);

  return (
    <Screen
      title="Home"
      rightAction={
        <Link href="/settings" asChild>
          <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <MaterialCommunityIcons name="cog" color={colors.text} size={22} />
          </Pressable>
        </Link>
      }>
      {recentWorkouts.length > 0 ? (
        recentWorkouts.map((workout) => {
          const mainLifts = workout.exercises.filter((exercise) => exercise.type === 'main');
          const primaryMainLift = mainLifts[0];

          return (
            <Link key={workout.id} href={`/history/${encodeURIComponent(workout.id)}` as Href} asChild>
              <Pressable style={({ pressed }) => pressed && styles.pressed}>
                <AppCard style={styles.card}>
                  <Text style={styles.kicker}>{formatRelativeDate(workout.completedAt)}</Text>
                  <Text style={styles.title}>{formatWorkoutHeading(workout.title, workout.week, workout.phase)}</Text>
                  <View style={styles.metricGrid}>
                    <Metric label="Time" value={formatDuration(workout.durationSeconds)} />
                    <Metric label="Volume" value={`${Math.round(workout.totalVolumeKg)} kg`} />
                    <Metric
                      label={primaryMainLift ? `Max ${primaryMainLift.name}` : 'Max'}
                      value={primaryMainLift?.maxWeightKg ? `${primaryMainLift.maxWeightKg} kg` : '-'}
                    />
                  </View>
                  <Text style={styles.openText}>Open details</Text>
                </AppCard>
              </Pressable>
            </Link>
          );
        })
      ) : (
        <AppCard style={styles.card}>
          <Text style={styles.kicker}>Recent history</Text>
          <Text style={styles.title}>No completed workouts yet</Text>
          <Text style={styles.body}>Complete a workout and it will appear here.</Text>
        </AppCard>
      )}

      {!activePlan ? (
        <AppCard style={styles.card}>
          <Text style={styles.kicker}>Getting started</Text>
          <Text style={styles.body}>Create your first plan from the Training tab.</Text>
          <AppButton href="/training">Go to Training</AppButton>
        </AppCard>
      ) : null}
    </Screen>
  );
}

function formatRelativeDate(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return 'Today';
  }

  if (diffDays === 1) {
    return 'Yesterday';
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  const weeks = Math.floor(diffDays / 7);
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min`;
}

function formatWorkoutHeading(title: string, week: number, phase: string) {
  return `${title} - Week ${week} ${phase}`;
}

type MetricProps = {
  label: string;
  value: string;
};

function Metric({ label, value }: MetricProps) {
  return (
    <Text style={styles.metricText}>
      <Text style={styles.metricLabel}>{label}{'\n'}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </Text>
  );
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
    fontSize: 22,
    fontWeight: '800',
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metricText: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 12,
    flex: 1,
    padding: spacing.sm,
  },
  metricLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.75,
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  openText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
});
