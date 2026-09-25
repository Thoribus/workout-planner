import { router } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { useActivePlan } from '@/features/plan/ActivePlanContext';

const OPTIONS = [2.5, 1.25];

export default function RoundingSettingsScreen() {
  const { activePlan, updatePlanSettings } = useActivePlan();

  async function saveRounding(roundingIncrementKg: number) {
    await updatePlanSettings({ roundingIncrementKg });
    router.back();
  }

  return (
    <Screen title="Rounding" subtitle="Choose the plate increment for calculated weights.">
      {OPTIONS.map((option) => {
        const selected = activePlan?.roundingIncrementKg === option;

        return (
          <Pressable key={option} onPress={() => saveRounding(option)} style={({ pressed }) => pressed && styles.pressed}>
            <AppCard style={[styles.card, selected && styles.selectedCard]}>
              <Text style={styles.title}>{option} kg</Text>
              <Text style={styles.body}>{selected ? 'Currently selected' : 'Tap to use this increment'}</Text>
            </AppCard>
          </Pressable>
        );
      })}
      <AppButton href="/settings" variant="secondary">Cancel</AppButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  selectedCard: { borderColor: colors.accent },
  title: { color: colors.text, fontSize: 22, fontWeight: '900' },
  body: { color: colors.textMuted, fontSize: 15 },
  pressed: { opacity: 0.75 },
});
