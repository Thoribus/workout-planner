import { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { colors, spacing } from '@/constants/theme';
import { hasSeenFirstRunOnboarding, markFirstRunOnboardingSeen } from '@/features/onboarding/onboardingStorage'; // eslint-disable-line import/no-unresolved -- Metro resolves onboardingStorage.native/web.ts by platform.

export function FirstRunOnboarding() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadSeenState() {
      const hasSeen = await hasSeenFirstRunOnboarding();

      if (active && !hasSeen) {
        setVisible(true);
      }
    }

    void loadSeenState();

    return () => {
      active = false;
    };
  }, []);

  async function dismiss() {
    setVisible(false);
    await markFirstRunOnboardingSeen();
  }

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.overlay}>
        <AppCard style={styles.card}>
          <Text style={styles.kicker}>Workout Planner</Text>
          <Text style={styles.title}>Train first. Sync when you want.</Text>
          <Text style={styles.body}>Your plan, weights, timers, and history work offline on this device.</Text>
          <Text style={styles.body}>Google Calendar is optional. When enabled, workouts sync into a dedicated Workout Planner calendar that you can hide or remove.</Text>
          <Text style={styles.body}>You can unsync later, and deleting a synced plan removes that calendar too.</Text>
          <AppButton onPress={dismiss} size="large">Start Training</AppButton>
        </AppCard>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    borderColor: colors.accent,
    gap: spacing.md,
    width: '100%',
  },
  kicker: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  body: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
  },
});
