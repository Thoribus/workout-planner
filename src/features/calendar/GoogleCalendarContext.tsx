import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { WORKOUT_SLOTS } from '@/data/clemsonProgram';
import {
  clearGoogleAuthToken,
  clearGoogleCalendarEventIds,
  loadGoogleAuthToken,
  loadGoogleCalendarEventIds,
  saveGoogleAuthToken,
  saveGoogleCalendarEventIds,
} from '@/features/calendar/googleAuthStorage'; // eslint-disable-line import/no-unresolved -- Metro resolves googleAuthStorage.native/web.ts by platform.
import type { PlanSchedule } from '@/types/workout';

const GOOGLE_SCOPES = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar.events'];
const GOOGLE_EVENT_DESCRIPTION = 'Denk ans Training morgen, du faule Sau!';

type GoogleCalendarState = {
  accessToken: string | null;
  syncedEventIds: Record<string, string>;
  isExpoGo: boolean;
  isConfigured: boolean;
  isSignedIn: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
  syncSchedule: (schedule: PlanSchedule) => Promise<{ created: number; skipped: number }>;
  unsyncSchedule: (schedule: PlanSchedule) => Promise<{ deleted: number; skipped: number }>;
};

const GoogleCalendarContext = createContext<GoogleCalendarState | null>(null);

export function GoogleCalendarProvider({ children }: PropsWithChildren) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [syncedEventIds, setSyncedEventIds] = useState<Record<string, string>>({});
  const isExpoGo = Constants.appOwnership === 'expo';
  const isNative = Platform.OS === 'android' || Platform.OS === 'ios';
  const isConfigured = Boolean(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) && isNative && !isExpoGo;

  useEffect(() => {
    if (isConfigured) {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        scopes: GOOGLE_SCOPES,
      });
    }

    let active = true;

    async function loadToken() {
      const token = await loadGoogleAuthToken();
      const eventIds = await loadGoogleCalendarEventIds();

      if (active) {
        setAccessToken(token);
        setSyncedEventIds(eventIds);
      }
    }

    void loadToken();

    return () => {
      active = false;
    };
  }, [isConfigured]);

  async function signIn() {
    if (!isConfigured) {
      return;
    }

    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    const result = await GoogleSignin.signIn();

    if (!isSuccessResponse(result)) {
      return;
    }

    const { accessToken: token } = await GoogleSignin.getTokens();

    setAccessToken(token);
    await saveGoogleAuthToken(token);
  }

  async function getAccessToken() {
    if (!isConfigured) {
      return null;
    }

    try {
      const { accessToken: freshToken } = await GoogleSignin.getTokens();
      setAccessToken(freshToken);
      await saveGoogleAuthToken(freshToken);
      return freshToken;
    } catch {
      await signIn();
      return loadGoogleAuthToken();
    }
  }

  async function logout() {
    setAccessToken(null);
    setSyncedEventIds({});
    if (isConfigured) {
      await GoogleSignin.signOut();
    }
    await clearGoogleAuthToken();
    await clearGoogleCalendarEventIds();
  }

  async function syncSchedule(schedule: PlanSchedule) {
    const token = await getAccessToken();

    if (!token) {
      throw new Error('Google sign-in is required before syncing calendar events.');
    }

    const nextEventIds = { ...syncedEventIds };
    let created = 0;
    let skipped = 0;

    for (const workout of schedule.workouts) {
      const syncKey = `${workout.date}-${workout.slot}`;

      if (nextEventIds[syncKey]) {
        skipped += 1;
        continue;
      }

      const eventId = await createCalendarEvent(token, {
        date: workout.date,
        summary: `${formatWorkoutTitle(WORKOUT_SLOTS[workout.slot].title)} - Week ${workout.week}`,
      });

      nextEventIds[syncKey] = eventId;
      created += 1;
    }

    setSyncedEventIds(nextEventIds);
    await saveGoogleCalendarEventIds(nextEventIds);

    return { created, skipped };
  }

  async function unsyncSchedule(schedule: PlanSchedule) {
    const token = await getAccessToken();

    if (!token) {
      throw new Error('Google sign-in is required before removing calendar events.');
    }

    const nextEventIds = { ...syncedEventIds };
    let deleted = 0;
    let skipped = 0;

    for (const workout of schedule.workouts) {
      const syncKey = `${workout.date}-${workout.slot}`;
      const eventId = nextEventIds[syncKey];

      if (!eventId) {
        skipped += 1;
        continue;
      }

      await deleteCalendarEvent(token, eventId);
      delete nextEventIds[syncKey];
      deleted += 1;
    }

    setSyncedEventIds(nextEventIds);
    await saveGoogleCalendarEventIds(nextEventIds);

    return { deleted, skipped };
  }

  return (
    <GoogleCalendarContext.Provider
      value={{
        accessToken,
        syncedEventIds,
        isExpoGo,
        isConfigured,
        isSignedIn: Boolean(accessToken),
        signIn,
        logout,
        syncSchedule,
        unsyncSchedule,
      }}>
      {children}
    </GoogleCalendarContext.Provider>
  );
}

type CreateCalendarEventInput = {
  date: string;
  summary: string;
};

async function createCalendarEvent(accessToken: string, input: CreateCalendarEventInput) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: input.summary,
      description: GOOGLE_EVENT_DESCRIPTION,
      start: { date: input.date },
      end: { date: addDays(input.date, 1) },
      reminders: {
        useDefault: false,
        overrides: [{ method: 'popup', minutes: 4 * 60 }],
      },
      extendedProperties: {
        private: {
          source: 'workout-planner',
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Calendar sync failed: ${response.status}`);
  }

  const event = await response.json() as { id?: string };

  if (!event.id) {
    throw new Error('Google Calendar did not return an event ID.');
  }

  return event.id;
}

async function deleteCalendarEvent(accessToken: string, eventId: string) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${encodeURIComponent(eventId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.ok || response.status === 404 || response.status === 410) {
    return;
  }

  throw new Error(`Google Calendar unsync failed: ${response.status}`);
}

function addDays(dateValue: string, days: number) {
  const [year, month, day] = dateValue.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0');
  const nextDay = String(date.getDate()).padStart(2, '0');
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function formatWorkoutTitle(title: string) {
  return title.replace(' Day', '');
}

export function useGoogleCalendar() {
  const context = useContext(GoogleCalendarContext);

  if (!context) {
    throw new Error('useGoogleCalendar must be used inside GoogleCalendarProvider');
  }

  return context;
}
