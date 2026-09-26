const ONBOARDING_KEY = 'first-run-onboarding-seen-v1';

export async function hasSeenFirstRunOnboarding() {
  return globalThis.localStorage?.getItem(ONBOARDING_KEY) === 'true';
}

export async function markFirstRunOnboardingSeen() {
  globalThis.localStorage?.setItem(ONBOARDING_KEY, 'true');
}
