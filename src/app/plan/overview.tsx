import { Link, router, type Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { useGoogleCalendar } from '@/features/calendar/GoogleCalendarContext';
import { useActivePlan } from '@/features/plan/ActivePlanContext';
import { buildWorkout } from '@/lib/program/workoutBuilder';

export default function PlanOverviewScreen() {
  const { activePlan, maxes, workoutHistory, deleteActivePlan } = useActivePlan();
  const { isConfigured, isSignedIn, syncedEventIds, unsyncSchedule } = useGoogleCalendar();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  if (!activePlan || !maxes) {
    return (
      <Screen title="Plan Overview" subtitle="Create a plan first.">
        <AppCard style={styles.card}>
          <Text style={styles.body}>No active plan exists yet.</Text>
          <AppButton href="/plan/new">Create Plan</AppButton>
        </AppCard>
      </Screen>
    );
  }

  const plan = activePlan;
  const nextWorkout = buildWorkout({ plan, maxes });
  const syncedWorkoutCount = plan.schedule?.workouts.filter((workout) => syncedEventIds[`${workout.date}-${workout.slot}`]).length ?? 0;

  async function handleDeletePlan() {
    if (plan.schedule && syncedWorkoutCount > 0) {
      if (!isConfigured || !isSignedIn) {
        setDeleteMessage('Sign in to Google Calendar before deleting this synced plan.');
        return;
      }

      setDeleteMessage('Removing calendar events...');
      try {
        await unsyncSchedule(plan.schedule);
      } catch (error) {
        setDeleteMessage(error instanceof Error ? error.message : 'Calendar unsync failed.');
        return;
      }
    }

    await deleteActivePlan();
    router.replace('/training');
  }

  return (
    <Screen title="Plan Overview" subtitle={plan.name}>
      <Link href={'/workout/preview' as Href} asChild>
        <Pressable style={({ pressed }) => pressed && styles.pressed}>
          <AppCard style={styles.nextWorkoutCard}>
            <Text style={styles.kicker}>Next workout</Text>
            <Text style={styles.title}>{formatWorkoutHeading(nextWorkout.title, nextWorkout.week, nextWorkout.phase)}</Text>
          </AppCard>
        </Pressable>
      </Link>

      <AppCard style={styles.card}>
        <Text style={styles.kicker}>Program progress</Text>
        <Text style={styles.body}>{workoutHistory.length} workouts completed</Text>
        <Text style={styles.body}>{Math.max(0, plan.weeks * 4 - workoutHistory.length)} workouts remaining</Text>
      </AppCard>

      <AppCard style={styles.card}>
        <Text style={styles.kicker}>Current maxes</Text>
        <Text style={styles.body}>Bench {maxes.bench} kg</Text>
        <Text style={styles.body}>Squat {maxes.squat} kg</Text>
        <Text style={styles.body}>Power Clean {maxes.clean} kg</Text>
      </AppCard>

      <Pressable onPress={() => {
        setDeleteMessage(null);
        setConfirmDelete(true);
      }} style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}>
        <Text style={styles.deleteText}>Delete Current Plan</Text>
      </Pressable>

      {confirmDelete ? (
        <View style={styles.overlay}>
          <Pressable style={styles.overlayBackdrop} onPress={() => setConfirmDelete(false)} />
          <AppCard style={styles.confirmCard}>
            <Text style={styles.title}>Delete this plan?</Text>
            <Text style={styles.body}>This removes the current plan and its persisted workout history.</Text>
            {syncedWorkoutCount > 0 ? (
              <Text style={styles.body}>It will also delete {syncedWorkoutCount} synced Google Calendar entries.</Text>
            ) : null}
            {deleteMessage ? <Text style={styles.body}>{deleteMessage}</Text> : null}
            <View style={styles.actions}>
              <AppButton onPress={() => {
                setConfirmDelete(false);
                setDeleteMessage(null);
              }} variant="secondary" style={styles.actionButton}>
                Cancel
              </AppButton>
              <AppButton onPress={handleDeletePlan} style={styles.actionButton}>
                Delete
              </AppButton>
            </View>
          </AppCard>
        </View>
      ) : null}
    </Screen>
  );
}

function formatWorkoutHeading(title: string, week: number, phase: string) {
  return `${title} - Week ${week} ${phase}`;
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
  deleteButton: {
    alignItems: 'center',
    borderColor: '#ef4444',
    borderRadius: 14,
    borderWidth: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  deleteText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '900',
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
  confirmCard: {
    borderColor: colors.accent,
    gap: spacing.md,
    width: '100%',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  nextWorkoutCard: {
    borderColor: colors.accent,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.75,
  },
});
