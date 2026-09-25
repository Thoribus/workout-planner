import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { useActivePlan } from '@/features/plan/ActivePlanContext';

export default function TimerSettingsScreen() {
  const { activePlan, updatePlanSettings } = useActivePlan();
  const [warmup, setWarmup] = useState(String((activePlan?.warmupSeconds ?? 600) / 60));
  const [mainRest, setMainRest] = useState(String(activePlan?.mainRestSeconds ?? 90));
  const [accessoryRest, setAccessoryRest] = useState(String(activePlan?.accessoryRestSeconds ?? 60));

  async function saveTimers() {
    await updatePlanSettings({
      warmupSeconds: parseNumber(warmup, 10) * 60,
      mainRestSeconds: parseNumber(mainRest, 90),
      accessoryRestSeconds: parseNumber(accessoryRest, 60),
    });
    router.back();
  }

  return (
    <Screen title="Timer Defaults" subtitle="Change default workout timers.">
      <AppCard style={styles.card}>
        <Field label="Warmup" suffix="min" value={warmup} onChangeText={setWarmup} />
        <Field label="Main lift rest" suffix="sec" value={mainRest} onChangeText={setMainRest} />
        <Field label="Accessory rest" suffix="sec" value={accessoryRest} onChangeText={setAccessoryRest} />
      </AppCard>
      <AppButton onPress={saveTimers}>Save Timers</AppButton>
    </Screen>
  );
}

type FieldProps = { label: string; suffix: string; value: string; onChangeText: (value: string) => void };

function Field({ label, suffix, value, onChangeText }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput keyboardType="decimal-pad" onChangeText={onChangeText} style={styles.input} value={value} />
        <Text style={styles.suffix}>{suffix}</Text>
      </View>
    </View>
  );
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
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
  suffix: { color: colors.textMuted, fontSize: 16, fontWeight: '800', width: 44 },
});
