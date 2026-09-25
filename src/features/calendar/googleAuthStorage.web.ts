const KEY = 'google-calendar-auth-v1';
const SYNC_KEY = 'google-calendar-sync-v1';

export async function loadGoogleAuthToken() {
  return globalThis.localStorage?.getItem(KEY) ?? null;
}

export async function saveGoogleAuthToken(token: string) {
  globalThis.localStorage?.setItem(KEY, token);
}

export async function clearGoogleAuthToken() {
  globalThis.localStorage?.removeItem(KEY);
}

export async function loadGoogleCalendarEventIds() {
  const rawValue = globalThis.localStorage?.getItem(SYNC_KEY);
  return rawValue ? JSON.parse(rawValue) as Record<string, string> : {};
}

export async function saveGoogleCalendarEventIds(eventIds: Record<string, string>) {
  globalThis.localStorage?.setItem(SYNC_KEY, JSON.stringify(eventIds));
}

export async function clearGoogleCalendarEventIds() {
  globalThis.localStorage?.removeItem(SYNC_KEY);
}
