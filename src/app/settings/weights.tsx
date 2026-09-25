import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { useActivePlan } from '@/features/plan/ActivePlanContext';
import type { LiftMaxes } from '@/types/workout';

export default function WeightSettingsScreen() {
  const { maxes, updateMaxes } = useActivePlan();
  const [bench, setBench] = useState(String(maxes?.bench ?? ''));
  const [squat, setSquat] = useState(String(maxes?.squat ?? ''));
  const [clean, setClean] = useState(String(maxes?.clean ?? ''));

  async function saveMaxes() {
    const nextMaxes: LiftMaxes = {
      bench: parseWeight(bench, maxes?.bench ?? 0),
      squat: parseWeight(squat, maxes?.squat ?? 0),
      clean: parseWeight(clean, maxes?.clean ?? 0),
    };

    await updateMaxes(nextMaxes);
    router.replace('/settings');
  }

  return (
    <Screen title="Weight Updates" subtitle="Change current main lift maxes.">
      <AppCard style={styles.card}>
        <Field label="Bench max" value={bench} onChangeText={setBench} />
        <Field label="Squat max" value={squat} onChangeText={setSquat} />
        <Field label="Power clean max" value={clean} onChangeText={setClean} />
      </AppCard>
      <AppButton onPress={saveMaxes}>Save Maxes</AppButton>
    </Screen>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
};

function Field({ label, value, onChangeText }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        keyboardType="decimal-pad"
        onChangeText={onChangeText}
        placeholder="kg"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function parseWeight(value: string, fallback: number) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  field: {
    gap: spacing.xs,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
