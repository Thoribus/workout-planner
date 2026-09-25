import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { useGoogleCalendar } from '@/features/calendar/GoogleCalendarContext';
import { useActivePlan } from '@/features/plan/ActivePlanContext';
import { WORKOUT_SLOTS } from '@/data/clemsonProgram';
import type { ScheduledWorkout } from '@/types/workout';

export default function CalendarTab() {
  const { activePlan } = useActivePlan();
  const { isConfigured, isExpoGo, isSignedIn, signIn, syncedEventIds, syncSchedule, unsyncSchedule } = useGoogleCalendar();
  const [monthOffset, setMonthOffset] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [confirmSync, setConfirmSync] = useState(false);

  const workouts = activePlan?.schedule?.workouts ?? [];
  const firstScheduledDate = workouts[0]?.date;
  const visibleMonth = addMonths(firstScheduledDate ? parseDate(firstScheduledDate) : new Date(), monthOffset);
  const monthDays = getMonthDays(visibleMonth);
  const syncedWorkoutCount = workouts.filter((workout) => syncedEventIds[getWorkoutSyncKey(workout)]).length;
  const unsyncedWorkoutCount = Math.max(0, workouts.length - syncedWorkoutCount);
  const hasSyncedWorkouts = syncedWorkoutCount > 0;

  useFocusEffect(useCallback(() => () => {
    setConfirmSync(false);
    setSyncMessage(null);
  }, []));

  async function handleSyncCalendar() {
    if (!activePlan?.schedule) {
      return;
    }

    setConfirmSync(false);
    setSyncMessage('Syncing...');

    try {
      const result = await syncSchedule(activePlan.schedule);
      setSyncMessage(`Created ${result.created}, skipped ${result.skipped} existing events.`);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Calendar sync failed.');
    }
  }

  async function handleUnsyncCalendar() {
    if (!activePlan?.schedule) {
      return;
    }

    setSyncMessage('Removing calendar events...');

    try {
      const result = await unsyncSchedule(activePlan.schedule);
      setSyncMessage(`Deleted ${result.deleted}, skipped ${result.skipped} missing events.`);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : 'Calendar unsync failed.');
    }
  }

  return (
    <Screen title="Calendar">
      {isExpoGo ? (
        <AppCard style={styles.card}>
          <Text style={styles.monthTitle}>Development build required</Text>
          <Text style={styles.body}>Google Calendar sync cannot be completed in Expo Go. Build a development or preview APK so OAuth can redirect back to this app.</Text>
        </AppCard>
      ) : null}
      {!isConfigured && !isExpoGo ? (
        <AppCard style={styles.card}>
          <Text style={styles.monthTitle}>Google Calendar not configured</Text>
          <Text style={styles.body}>Add Expo public Google OAuth client IDs to enable sign-in and calendar sync.</Text>
        </AppCard>
      ) : null}
      {isConfigured && !isSignedIn ? (
        <AppCard style={styles.card}>
          <Text style={styles.body}>Sign in to enable Google Calendar sync.</Text>
          <AppButton onPress={signIn}>Sign in with Google</AppButton>
        </AppCard>
      ) : null}
      {activePlan?.schedule && isConfigured && isSignedIn ? (
        <AppCard style={styles.card}>
          {hasSyncedWorkouts ? (
            <AppButton onPress={handleUnsyncCalendar} variant="outline">Unsync Google Calendar</AppButton>
          ) : (
            <AppButton onPress={() => setConfirmSync(true)}>Sync Google Calendar</AppButton>
          )}
          {syncMessage ? <Text style={styles.body}>{syncMessage}</Text> : null}
        </AppCard>
      ) : null}
      <AppCard style={styles.card}>
        <View style={styles.monthHeader}>
          <Pressable onPress={() => setMonthOffset((current) => current - 1)} style={styles.monthButton}>
            <Text style={styles.monthButtonText}>‹</Text>
          </Pressable>
          <Text style={styles.monthTitle}>
            {new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(visibleMonth)}
          </Text>
          <Pressable onPress={() => setMonthOffset((current) => current + 1)} style={styles.monthButton}>
            <Text style={styles.monthButtonText}>›</Text>
          </Pressable>
        </View>
        <View style={styles.weekHeader}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <Text key={day} style={styles.weekHeaderText}>{day}</Text>
          ))}
        </View>
        <View style={styles.grid}>
          {monthDays.map((day, index) => {
            const dayWorkouts = day ? workouts.filter((candidate) => candidate.date === formatDate(day)) : [];

            return (
              <View key={day?.toISOString() ?? `empty-${index}`} style={[styles.dayCell, dayWorkouts.length > 0 && styles.workoutDay]}>
                {day ? <Text style={styles.dayText}>{day.getDate()}</Text> : null}
                {dayWorkouts.map((workout) => (
                  <Text key={`${workout.date}-${workout.slot}`} style={styles.workoutText}>{shortSlotTitle(workout.slot)}</Text>
                ))}
              </View>
            );
          })}
        </View>
      </AppCard>
      {!activePlan ? (
        <AppCard style={styles.card}>
          <Text style={styles.body}>Create a plan to generate scheduled training days.</Text>
        </AppCard>
      ) : null}
      {confirmSync ? (
        <View style={styles.overlay}>
          <Pressable style={styles.overlayBackdrop} onPress={() => setConfirmSync(false)} />
          <AppCard style={styles.confirmCard}>
            <Text style={styles.monthTitle}>Sync Google Calendar?</Text>
            <Text style={styles.body}>This will add {unsyncedWorkoutCount} entries to your calendar.</Text>
            <View style={styles.actions}>
              <AppButton onPress={() => setConfirmSync(false)} variant="secondary" style={styles.actionButton}>
                Cancel
              </AppButton>
              <AppButton onPress={handleSyncCalendar} style={styles.actionButton}>
                Understood
              </AppButton>
            </View>
          </AppCard>
        </View>
      ) : null}
    </Screen>
  );
}

function getWorkoutSyncKey(workout: ScheduledWorkout) {
  return `${workout.date}-${workout.slot}`;
}

function getMonthDays(date: Date) {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  const days: (Date | null)[] = [];
  const mondayFirstOffset = (first.getDay() + 6) % 7;

  for (let index = 0; index < mondayFirstOffset; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(new Date(date.getFullYear(), date.getMonth(), day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function shortSlotTitle(slot: keyof typeof WORKOUT_SLOTS) {
  return WORKOUT_SLOTS[slot].title.replace(' Day', '');
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  monthHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  monthTitle: { color: colors.text, fontSize: 22, fontWeight: '900' },
  monthButton: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  monthButtonText: { color: colors.text, fontSize: 28, fontWeight: '900', lineHeight: 30 },
  weekHeader: { flexDirection: 'row' },
  weekHeaderText: { color: colors.textMuted, flex: 1, fontSize: 12, fontWeight: '800', textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.background,
    borderWidth: 2,
    borderRadius: 10,
    minHeight: 64,
    padding: spacing.xs,
    width: '14.2857%',
  },
  workoutDay: { borderColor: colors.accent, borderWidth: 1 },
  dayText: { color: colors.text, fontSize: 13, fontWeight: '800' },
  workoutText: { color: colors.accent, fontSize: 10, fontWeight: '800', marginTop: spacing.xs },
  body: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
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
});
