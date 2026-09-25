import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { useActivePlan } from '@/features/plan/ActivePlanContext';

export default function DerivedLiftSettingsScreen() {
  const { activePlan, updatePlanSettings } = useActivePlan();
  const [speedCleanReduction, setSpeedCleanReduction] = useState(String(activePlan?.speedCleanReductionKg ?? 22.5));
  const [frontSquatReduction, setFrontSquatReduction] = useState(String(activePlan?.frontSquatReductionKg ?? 45));

  async function saveReductions() {
    await updatePlanSettings({
      speedCleanReductionKg: parseNumber(speedCleanReduction, 22.5),
      frontSquatReductionKg: parseNumber(frontSquatReduction, 45),
    });
    router.back();
  }

  return (
    <Screen title="Derived Lifts" subtitle="Change reductions from main maxes.">
      <AppCard style={styles.card}>
        <Field label="Speed clean reduction" value={speedCleanReduction} onChangeText={setSpeedCleanReduction} />
        <Field label="Front squat reduction" value={frontSquatReduction} onChangeText={setFrontSquatReduction} />
      </AppCard>
      <AppButton onPress={saveReductions}>Save Reductions</AppButton>
    </Screen>
  );
}

type FieldProps = { label: string; value: string; onChangeText: (value: string) => void };

function Field({ label, value, onChangeText }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput keyboardType="decimal-pad" onChangeText={onChangeText} style={styles.input} value={value} />
        <Text style={styles.suffix}>kg</Text>
      </View>
    </View>
  );
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  field: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 20,
    fontWeight: '800',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  suffix: { color: colors.textMuted, fontSize: 16, fontWeight: '800', width: 32 },
});
