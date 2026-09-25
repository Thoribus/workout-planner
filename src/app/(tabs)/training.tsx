import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { useActivePlan } from '@/features/plan/ActivePlanContext';
import { WORKOUT_SLOTS } from '@/data/clemsonProgram';
import { getPhaseForWeek } from '@/lib/program/phases';

export default function TrainingTab() {
  const { activePlan, deletedPlans, maxes, restoreDeletedPlan } = useActivePlan();
  const activeTitle = activePlan
    ? `${WORKOUT_SLOTS[activePlan.currentSlot].title} - Week ${activePlan.currentWeek} ${getPhaseForWeek(activePlan.currentWeek, activePlan.weeks, activePlan.currentSlot === 1 || activePlan.currentSlot === 3 ? 'bench' : 'lower')}`
    : null;

  return (
    <Screen
      title="Training"
      rightAction={
        <Link href="/settings" asChild>
          <Pressable style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <MaterialCommunityIcons name="cog" color={colors.text} size={22} />
          </Pressable>
        </Link>
      }>
      {activePlan && maxes ? (
        <Link href={'/plan/overview' as Href} asChild>
          <Pressable style={({ pressed }) => pressed && styles.pressed}>
            <AppCard style={styles.card}>
              <Text style={styles.kicker}>Active plan</Text>
              <Text style={styles.title}>{activeTitle}</Text>
              <Text style={styles.body}>{activePlan.name}</Text>
              <Text style={styles.body}>Bench {maxes.bench} · Squat {maxes.squat} · Power Clean {maxes.clean}</Text>
            </AppCard>
          </Pressable>
        </Link>
      ) : (
        <>
          <Link href={'/plan/new' as Href} asChild>
            <Pressable style={({ pressed }) => pressed && styles.pressed}>
              <AppCard style={styles.card}>
                <Text style={styles.kicker}>No routine</Text>
                <Text style={styles.title}>Create your training plan</Text>
              </AppCard>
            </Pressable>
          </Link>

        </>
      )}

      {deletedPlans.length > 0 ? (
        <AppCard style={styles.card}>
          <Text style={styles.kicker}>Deleted plans</Text>
          {deletedPlans.map((plan) => (
            <Pressable
              key={plan.id}
              onPress={() => restoreDeletedPlan(plan.id)}
              style={({ pressed }) => [styles.restoreRow, pressed && styles.pressed]}>
              <Text style={styles.restoreTitle}>{plan.name}</Text>
              <Text style={styles.restoreMeta}>Restore plan</Text>
            </Pressable>
          ))}
        </AppCard>
      ) : null}
    </Screen>
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
    fontSize: 24,
    fontWeight: '800',
  },
  body: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
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
  pressed: {
    opacity: 0.75,
  },
  restoreRow: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  restoreTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  restoreMeta: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
});
