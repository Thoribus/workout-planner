import { Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

import { colors } from '@/constants/theme';
import { GoogleCalendarProvider } from '@/features/calendar/GoogleCalendarContext';
import { FirstRunOnboarding } from '@/features/onboarding/FirstRunOnboarding';
import { ActivePlanProvider } from '@/features/plan/ActivePlanContext';

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 0, fade: false });

export default function RootLayout() {
  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background).finally(() => SplashScreen.hideAsync());
  }, []);

  return (
    <ActivePlanProvider>
      <GoogleCalendarProvider>
        <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            animation: 'none',
            contentStyle: { backgroundColor: colors.background },
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '700' },
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="plan/new" options={{ title: 'New Plan' }} />
          <Stack.Screen name="plan/overview" options={{ title: 'Plan' }} />
          <Stack.Screen name="workout/preview" options={{ title: 'Workout Preview' }} />
          <Stack.Screen name="workout/active" options={{ title: 'Active Workout' }} />
          <Stack.Screen name="workout/complete" options={{ title: 'Complete' }} />
          <Stack.Screen name="history/index" options={{ title: 'History' }} />
          <Stack.Screen name="history/[id]" options={{ title: 'Workout Details' }} />
          <Stack.Screen name="settings/index" options={{ title: 'Settings' }} />
          <Stack.Screen name="settings/weights" options={{ title: 'Weight Updates' }} />
          <Stack.Screen name="settings/timers" options={{ title: 'Timer Defaults' }} />
          <Stack.Screen name="settings/rounding" options={{ title: 'Rounding' }} />
          <Stack.Screen name="settings/derived-lifts" options={{ title: 'Derived Lifts' }} />
        </Stack>
        <FirstRunOnboarding />
        </ThemeProvider>
      </GoogleCalendarProvider>
    </ActivePlanProvider>
  );
}

const navigationTheme = {
  dark: true,
  colors: {
    primary: colors.accent,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
  },
};
