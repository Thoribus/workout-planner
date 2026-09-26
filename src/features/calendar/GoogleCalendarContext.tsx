import { GoogleSignin, isSuccessResponse } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { createContext, type PropsWithChildren, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { WORKOUT_SLOTS } from '@/data/clemsonProgram';
import {
  clearGoogleAuthToken,
  clearGoogleCalendarId,
  clearGoogleCalendarEventIds,
  loadGoogleAuthToken,
  loadGoogleCalendarId,
  loadGoogleCalendarEventIds,
  saveGoogleAuthToken,
  saveGoogleCalendarId,
  saveGoogleCalendarEventIds,
} from '@/features/calendar/googleAuthStorage'; // eslint-disable-line import/no-unresolved -- Metro resolves googleAuthStorage.native/web.ts by platform.
import type { PlanSchedule } from '@/types/workout';

const GOOGLE_SCOPES = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/calendar'];
const GOOGLE_WORKOUT_CALENDAR_NAME = 'Workout Planner';
const GOOGLE_WORKOUT_CALENDAR_BACKGROUND = '#F691B2';
const GOOGLE_WORKOUT_CALENDAR_FOREGROUND = '#000000';
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
    await clearGoogleCalendarId();
  }

  async function syncSchedule(schedule: PlanSchedule) {
    const token = await getAccessToken();

    if (!token) {
      throw new Error('Google sign-in is required before syncing calendar events.');
    }

    const calendarId = await ensureWorkoutCalendar(token);
    const nextEventIds = { ...syncedEventIds };
    let created = 0;
    let skipped = 0;

    for (const workout of schedule.workouts) {
      const syncKey = `${workout.date}-${workout.slot}`;

      if (nextEventIds[syncKey]) {
        skipped += 1;
        continue;
      }

      const eventId = await createCalendarEvent(token, calendarId, {
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

    const calendarId = await loadGoogleCalendarId() ?? await findWorkoutCalendar(token);
    const deleted = schedule.workouts.filter((workout) => syncedEventIds[`${workout.date}-${workout.slot}`]).length;
    const skipped = Math.max(0, schedule.workouts.length - deleted);

    if (calendarId) {
      await deleteWorkoutCalendar(token, calendarId);
    }

    setSyncedEventIds({});
    await clearGoogleCalendarEventIds();
    await clearGoogleCalendarId();

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

async function createCalendarEvent(accessToken: string, calendarId: string, input: CreateCalendarEventInput) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`, {
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

async function deleteWorkoutCalendar(accessToken: string, calendarId: string) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.ok || response.status === 404 || response.status === 410) {
    return;
  }

  throw new Error(`Google Calendar deletion failed: ${response.status}`);
}

async function ensureWorkoutCalendar(accessToken: string) {
  const storedCalendarId = await loadGoogleCalendarId();

  if (storedCalendarId) {
    await setWorkoutCalendarColor(accessToken, storedCalendarId);
    return storedCalendarId;
  }

  const existingCalendarId = await findWorkoutCalendar(accessToken);

  if (existingCalendarId) {
    await saveGoogleCalendarId(existingCalendarId);
    await setWorkoutCalendarColor(accessToken, existingCalendarId);
    return existingCalendarId;
  }

  const createdCalendarId = await createWorkoutCalendar(accessToken);
  await saveGoogleCalendarId(createdCalendarId);
  await setWorkoutCalendarColor(accessToken, createdCalendarId);
  return createdCalendarId;
}

async function findWorkoutCalendar(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google Calendar lookup failed: ${response.status}`);
  }

  const calendarList = await response.json() as { items?: { id?: string; summary?: string }[] };
  return calendarList.items?.find((calendar) => calendar.summary === GOOGLE_WORKOUT_CALENDAR_NAME)?.id ?? null;
}

async function createWorkoutCalendar(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: GOOGLE_WORKOUT_CALENDAR_NAME,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Calendar creation failed: ${response.status}`);
  }

  const calendar = await response.json() as { id?: string };

  if (!calendar.id) {
    throw new Error('Google Calendar did not return a calendar ID.');
  }

  return calendar.id;
}

async function setWorkoutCalendarColor(accessToken: string, calendarId: string) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/users/me/calendarList/${encodeURIComponent(calendarId)}?colorRgbFormat=true`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      backgroundColor: GOOGLE_WORKOUT_CALENDAR_BACKGROUND,
      foregroundColor: GOOGLE_WORKOUT_CALENDAR_FOREGROUND,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google Calendar color update failed: ${response.status}`);
  }
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
