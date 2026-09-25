import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { useActivePlan } from '@/features/plan/ActivePlanContext';
import { SUPPORTED_PROGRAM_LENGTHS } from '@/lib/program/phases';
import type { ProgramLength, Weekday, WorkoutSlot } from '@/types/workout';

type SetupStep =
  | 'name'
  | 'weeks'
  | 'bench'
  | 'squat'
  | 'clean'
  | 'warmup'
  | 'mainRest'
  | 'accessoryRest'
  | 'startDate'
  | 'benchDay'
  | 'squatDay'
  | 'closeGripDay'
  | 'powerCleanDay'
  | 'review';

const SETUP_STEPS: SetupStep[] = [
  'name',
  'weeks',
  'bench',
  'squat',
  'clean',
  'warmup',
  'mainRest',
  'accessoryRest',
  'startDate',
  'benchDay',
  'squatDay',
  'closeGripDay',
  'powerCleanDay',
  'review',
];

const WEEKDAYS: { label: string; value: Weekday }[] = [
  { label: 'Monday', value: 1 },
  { label: 'Tuesday', value: 2 },
  { label: 'Wednesday', value: 3 },
  { label: 'Thursday', value: 4 },
  { label: 'Friday', value: 5 },
  { label: 'Saturday', value: 6 },
  { label: 'Sunday', value: 0 },
];

const SLOT_BY_STEP: Partial<Record<SetupStep, WorkoutSlot>> = {
  benchDay: 1,
  squatDay: 2,
  closeGripDay: 3,
  powerCleanDay: 4,
};

const SLOT_LABELS: Record<WorkoutSlot, string> = {
  1: 'Bench Press Day',
  2: 'Squat Day',
  3: 'Close Grip Bench Day',
  4: 'Power Clean Day',
};

export default function NewPlanScreen() {
  const { createPlan } = useActivePlan();
  const [stepIndex, setStepIndex] = useState(0);
  const [name, setName] = useState('Clemson Power Program');
  const [weeks, setWeeks] = useState<ProgramLength>(10);
  const [benchMaxKg, setBenchMaxKg] = useState('70');
  const [squatMaxKg, setSquatMaxKg] = useState('100');
  const [cleanMaxKg, setCleanMaxKg] = useState('75');
  const [warmupMinutes, setWarmupMinutes] = useState('10');
  const [mainRestSeconds, setMainRestSeconds] = useState('90');
  const [accessoryRestSeconds, setAccessoryRestSeconds] = useState('60');
  const [scheduleStartDate, setScheduleStartDate] = useState(formatGermanDate(new Date()));
  const [scheduleWeekdays, setScheduleWeekdays] = useState<Partial<Record<WorkoutSlot, Weekday>>>({});
  const [stepError, setStepError] = useState<string | null>(null);

  const currentStep = SETUP_STEPS[stepIndex];
  const progress = (stepIndex + 1) / SETUP_STEPS.length;

  function goNext() {
    if (currentStep === 'startDate' && !parseGermanDateInput(scheduleStartDate)) {
      setStepError('Use DD/MM/YYYY, for example 27/10/2026.');
      return;
    }

    const slot = SLOT_BY_STEP[currentStep];
    if (slot && scheduleWeekdays[slot] === undefined) {
      setStepError('Select a weekday before continuing.');
      return;
    }

    setStepError(null);
    setStepIndex((current) => Math.min(current + 1, SETUP_STEPS.length - 1));
  }

  function goBack() {
    if (stepIndex === 0) {
      router.back();
      return;
    }

    setStepIndex((current) => Math.max(current - 1, 0));
  }

  async function handleCreatePlan() {
    const startDate = parseGermanDateInput(scheduleStartDate);
    const completeWeekdays = toCompleteWeekdayMap(scheduleWeekdays);

    if (!startDate || !completeWeekdays) {
      setStepError('Complete the scheduling steps before creating the plan.');
      return;
    }

    await createPlan({
      name,
      weeks,
      benchMaxKg: parseNumber(benchMaxKg, 70),
      squatMaxKg: parseNumber(squatMaxKg, 100),
      cleanMaxKg: parseNumber(cleanMaxKg, 75),
      warmupSeconds: parseNumber(warmupMinutes, 10) * 60,
      mainRestSeconds: parseNumber(mainRestSeconds, 90),
      accessoryRestSeconds: parseNumber(accessoryRestSeconds, 60),
      roundingIncrementKg: 2.5,
      scheduleStartDate: startDate,
      scheduleWeekdays: completeWeekdays,
    });

    router.replace('/training');
  }

  return (
    <Screen
      title="New Plan"
      subtitle="Set up one thing at a time. You can adjust these values later.">
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <Text style={styles.progressText}>
        Step {stepIndex + 1} of {SETUP_STEPS.length}
      </Text>

      <AppCard style={styles.stepCard}>{renderStep()}</AppCard>
      {stepError ? <Text style={styles.errorText}>{stepError}</Text> : null}

      <View style={styles.actions}>
        <AppButton onPress={goBack} variant="secondary" style={styles.actionButton}>
          Back
        </AppButton>
        {currentStep === 'review' ? (
          <AppButton onPress={handleCreatePlan} style={styles.actionButton}>
            Create Plan
          </AppButton>
        ) : (
          <AppButton onPress={goNext} style={styles.actionButton}>
            Next
          </AppButton>
        )}
      </View>
    </Screen>
  );

  function renderStep() {
    switch (currentStep) {
      case 'name':
        return (
          <SingleInputStep
            label="Plan name"
            helper="This is what appears on the home screen."
            value={name}
            onChangeText={setName}
          />
        );
      case 'weeks':
        return <WeeksStep selectedWeeks={weeks} onSelectWeeks={setWeeks} />;
      case 'bench':
        return (
          <SingleInputStep
            label="Bench max"
            helper="Current bench press max in kg."
            keyboardType="decimal-pad"
            suffix="kg"
            value={benchMaxKg}
            onChangeText={setBenchMaxKg}
          />
        );
      case 'squat':
        return (
          <SingleInputStep
            label="Squat max"
            helper="Current squat max in kg."
            keyboardType="decimal-pad"
            suffix="kg"
            value={squatMaxKg}
            onChangeText={setSquatMaxKg}
          />
        );
      case 'clean':
        return (
          <SingleInputStep
            label="Power clean max"
            helper="Current power clean max in kg."
            keyboardType="decimal-pad"
            suffix="kg"
            value={cleanMaxKg}
            onChangeText={setCleanMaxKg}
          />
        );
      case 'warmup':
        return (
          <SingleInputStep
            label="Warmup time"
            helper="One warmup timer before the lifting starts."
            keyboardType="numeric"
            suffix="min"
            value={warmupMinutes}
            onChangeText={setWarmupMinutes}
          />
        );
      case 'mainRest':
        return (
          <SingleInputStep
            label="Main lift rest"
            helper="Default rest after bench, squat, and clean work sets."
            keyboardType="numeric"
            suffix="sec"
            value={mainRestSeconds}
            onChangeText={setMainRestSeconds}
          />
        );
      case 'accessoryRest':
        return (
          <SingleInputStep
            label="Accessory rest"
            helper="Default rest after accessory sets."
            keyboardType="numeric"
            suffix="sec"
            value={accessoryRestSeconds}
            onChangeText={setAccessoryRestSeconds}
          />
        );
      case 'startDate':
        return (
          <SingleInputStep
            label="Start date"
            helper=""
            value={scheduleStartDate}
            onChangeText={setScheduleStartDate}
          />
        );
      case 'benchDay':
      case 'squatDay':
      case 'closeGripDay':
      case 'powerCleanDay': {
        const slot = SLOT_BY_STEP[currentStep]!;
        return (
          <WeekdayStep
            label={SLOT_LABELS[slot]}
            selectedWeekdays={scheduleWeekdays}
            slot={slot}
            onSelect={(weekday) => setScheduleWeekdays((current) => ({ ...current, [slot]: weekday }))}
          />
        );
      }
      case 'review':
        return (
          <View style={styles.reviewList}>
            <ReviewRow label="Plan" value={name} />
            <ReviewRow label="Weeks" value={String(weeks)} />
            <ReviewRow label="Bench" value={`${benchMaxKg} kg`} />
            <ReviewRow label="Squat" value={`${squatMaxKg} kg`} />
            <ReviewRow label="Power clean" value={`${cleanMaxKg} kg`} />
            <ReviewRow label="Warmup" value={`${warmupMinutes} min`} />
            <ReviewRow label="Main rest" value={`${mainRestSeconds} sec`} />
            <ReviewRow label="Accessory rest" value={`${accessoryRestSeconds} sec`} />
            <ReviewRow label="Start date" value={scheduleStartDate} />
            <ReviewRow label="Bench day" value={weekdayLabel(scheduleWeekdays[1])} />
            <ReviewRow label="Squat day" value={weekdayLabel(scheduleWeekdays[2])} />
            <ReviewRow label="Close grip day" value={weekdayLabel(scheduleWeekdays[3])} />
            <ReviewRow label="Power clean day" value={weekdayLabel(scheduleWeekdays[4])} />
          </View>
        );
    }
  }
}

type WeekdayStepProps = {
  label: string;
  slot: WorkoutSlot;
  selectedWeekdays: Partial<Record<WorkoutSlot, Weekday>>;
  onSelect: (weekday: Weekday) => void;
};

function WeekdayStep({ label, slot, selectedWeekdays, onSelect }: WeekdayStepProps) {
  const unavailableWeekdays = new Set(
    Object.entries(selectedWeekdays)
      .filter(([selectedSlot]) => Number(selectedSlot) !== slot)
      .map(([, weekday]) => weekday),
  );

  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{label}</Text>
      <Text style={styles.helper}>Choose a weekday. Previously selected days are disabled.</Text>
      <View style={styles.weekOptions}>
        {WEEKDAYS.map((weekday) => {
          const selected = selectedWeekdays[slot] === weekday.value;
          const disabled = unavailableWeekdays.has(weekday.value);

          return (
            <Pressable
              disabled={disabled}
              key={weekday.value}
              onPress={() => onSelect(weekday.value)}
              style={[styles.weekOption, selected && styles.weekOptionSelected, disabled && styles.weekOptionDisabled]}>
              <Text style={[styles.weekOptionText, selected && styles.weekOptionTextSelected, disabled && styles.weekOptionTextDisabled]}>
                {weekday.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type SingleInputStepProps = {
  label: string;
  helper: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'numeric' | 'decimal-pad';
  suffix?: string;
};

function SingleInputStep({
  label,
  helper,
  value,
  onChangeText,
  keyboardType = 'default',
  suffix,
}: SingleInputStepProps) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{label}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={value}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

type WeeksStepProps = {
  selectedWeeks: ProgramLength;
  onSelectWeeks: (weeks: ProgramLength) => void;
};

function WeeksStep({ selectedWeeks, onSelectWeeks }: WeeksStepProps) {
  return (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Program length</Text>
      <Text style={styles.helper}>Choose one of the week lengths currently supported.</Text>
      <View style={styles.weekOptions}>
        {SUPPORTED_PROGRAM_LENGTHS.map((weekOption) => {
          const selected = selectedWeeks === weekOption;

          return (
            <Pressable
              key={weekOption}
              onPress={() => onSelectWeeks(weekOption)}
              style={[styles.weekOption, selected && styles.weekOptionSelected]}>
              <Text style={[styles.weekOptionText, selected && styles.weekOptionTextSelected]}>
                {weekOption} weeks
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type ReviewRowProps = {
  label: string;
  value: string;
};

function ReviewRow({ label, value }: ReviewRowProps) {
  return (
    <View style={styles.reviewRow}>
      <Text style={styles.reviewLabel}>{label}</Text>
      <Text style={styles.reviewValue}>{value}</Text>
    </View>
  );
}

function parseNumber(value: string, fallback: number) {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatGermanDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseGermanDateInput(value: string) {
  const [day, month, year] = value.split('/').map(Number);

  if (!day || !month || !year) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return formatDate(date);
}

function toCompleteWeekdayMap(weekdays: Partial<Record<WorkoutSlot, Weekday>>) {
  if (
    weekdays[1] === undefined ||
    weekdays[2] === undefined ||
    weekdays[3] === undefined ||
    weekdays[4] === undefined
  ) {
    return null;
  }

  return weekdays as Record<WorkoutSlot, Weekday>;
}

function weekdayLabel(weekday: Weekday | undefined) {
  if (weekday === undefined) {
    return '-';
  }

  return WEEKDAYS.find((option) => option.value === weekday)?.label ?? '-';
}

const styles = StyleSheet.create({
  progressTrack: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 999,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: colors.accent,
    height: '100%',
  },
  progressText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  stepCard: {
    minHeight: 260,
  },
  stepContent: {
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
  },
  stepTitle: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '800',
  },
  helper: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    fontWeight: '800',
  },
  inputRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  suffix: {
    color: colors.textMuted,
    fontSize: 18,
    fontWeight: '800',
    minWidth: 40,
  },
  weekOptions: {
    gap: spacing.sm,
  },
  weekOption: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  weekOptionSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  weekOptionDisabled: {
    opacity: 0.35,
  },
  weekOptionText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  weekOptionTextSelected: {
    color: colors.accentText,
  },
  weekOptionTextDisabled: {
    color: colors.textMuted,
  },
  reviewList: {
    gap: spacing.sm,
  },
  reviewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reviewLabel: {
    color: colors.textMuted,
    fontSize: 15,
  },
  reviewValue: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
});
