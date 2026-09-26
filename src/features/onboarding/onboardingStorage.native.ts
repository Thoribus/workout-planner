import * as SecureStore from 'expo-secure-store';

const ONBOARDING_KEY = 'first-run-onboarding-seen-v1';

export async function hasSeenFirstRunOnboarding() {
  return await SecureStore.getItemAsync(ONBOARDING_KEY) === 'true';
}

export async function markFirstRunOnboardingSeen() {
  await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
}
