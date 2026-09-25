import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { AppCard } from '@/components/AppCard';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { useGoogleCalendar } from '@/features/calendar/GoogleCalendarContext';

export default function SettingsScreen() {
  const { isSignedIn, logout } = useGoogleCalendar();

  return (
    <Screen>
      <SettingsCard href="/settings/weights" title="Update Weights" />
      <SettingsCard href="/settings/timers" title="Adjust Timer Defaults" />
      <SettingsCard href="/settings/rounding" title="Adjust Rounding" />
      <SettingsCard href="/settings/derived-lifts" title="Adjust Derived Lift Reductions" />
      {isSignedIn ? (
        <Pressable onPress={logout} style={({ pressed }) => pressed && styles.pressed}>
          <AppCard style={styles.card}>
            <Text style={styles.title}>Logout Google Calendar</Text>
          </AppCard>
        </Pressable>
      ) : null}
    </Screen>
  );
}

type SettingsCardProps = {
  href: string;
  title: string;
};

function SettingsCard({ href, title }: SettingsCardProps) {
  return (
    <Link href={href as Href} asChild>
      <Pressable style={({ pressed }) => pressed && styles.pressed}>
        <AppCard style={styles.card}>
          <Text style={styles.title}>{title}</Text>
        </AppCard>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.75,
  },
});
