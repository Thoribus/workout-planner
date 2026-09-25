import * as SecureStore from 'expo-secure-store';

const KEY = 'google-calendar-auth-v1';
const SYNC_KEY = 'google-calendar-sync-v1';

export async function loadGoogleAuthToken() {
  return SecureStore.getItemAsync(KEY);
}

export async function saveGoogleAuthToken(token: string) {
  await SecureStore.setItemAsync(KEY, token);
}

export async function clearGoogleAuthToken() {
  await SecureStore.deleteItemAsync(KEY);
}

export async function loadGoogleCalendarEventIds() {
  const rawValue = await SecureStore.getItemAsync(SYNC_KEY);
  return rawValue ? JSON.parse(rawValue) as Record<string, string> : {};
}

export async function saveGoogleCalendarEventIds(eventIds: Record<string, string>) {
  await SecureStore.setItemAsync(SYNC_KEY, JSON.stringify(eventIds));
}

export async function clearGoogleCalendarEventIds() {
  await SecureStore.deleteItemAsync(SYNC_KEY);
}
