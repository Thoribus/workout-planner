# Workout Planner

Personal Android-first workout app for running a Clemson-style power program. The app is built with Expo, React Native, TypeScript, Expo Router, and SQLite on native platforms.

## Developer Setup

Install dependencies:

```bash
npm install
```

Start the dev server:

```bash
npx expo start
```

Run on web:

```bash
npx expo start --web
```

Run with Expo Go over LAN:

```bash
npx expo start --go --lan -c
```

Run with Expo Go through a tunnel:

```bash
npx expo start --go --tunnel -c
```

If port `8081` is busy:

```bash
npx expo start --go --tunnel -c --port 8082
```

This repo pins the working Expo Ngrok binary through `package.json` overrides because the newer Darwin ARM64 binary package resolved to an empty package on this machine.

## Useful Commands

Typecheck:

```bash
npx tsc --noEmit
```

Lint:

```bash
npx expo lint
```

Audit dependencies:

```bash
npm audit --audit-level=moderate
```

Verify web export:

```bash
npx expo export --platform web --clear
```

## Google Calendar Setup

Calendar sync uses native Google Sign-In through `@react-native-google-signin/google-signin`. It requires a development or preview APK; Expo Go cannot load the native Google Sign-In module.

Create OAuth client IDs in Google Cloud Console:

1. Create/select a Google Cloud project.
2. Enable the Google Calendar API.
3. Configure the OAuth consent screen.
4. Create OAuth client IDs for Android and Web.
5. Add the Android package name and SHA-1 certificate fingerprint for the APK signing certificate.
6. Copy `.env.example` to `.env` and fill the client IDs:

```bash
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
```

The app requests this scope for event creation:

```txt
https://www.googleapis.com/auth/calendar.events
```

Google Calendar sync should be tested in a development or preview build, not Expo Go.

For local calendar UI work, Expo Go is fine. For Google sign-in/sync, build an APK/development build.

The native Google Sign-In module will crash with `RNGoogleSignin could not be found` if the installed APK was built before the module was added. Rebuild and reinstall the APK after dependency or native config changes:

```bash
npx eas-cli@latest build --platform android --profile development
```

For day-to-day private testing, keep the OAuth consent screen in `Testing` and add your Gmail address under `Test users`. Full Google verification is only needed before public use outside the test-user list.

The app uses the Web OAuth client ID in JS configuration and the Android OAuth client for native package/SHA-1 validation.

Android package name configured in this project:

```txt
com.thoribus.workoutplanner
```

To get the SHA-1 for the Android OAuth client when using EAS credentials:

```bash
npx eas-cli@latest login
npx eas-cli@latest credentials -p android
```

In the credentials UI, create/select Android credentials for `com.thoribus.workoutplanner`, then view the keystore certificate fingerprints and copy the SHA-1 value.

In Google Cloud Console, create an OAuth client:

- Application type: `Android`
- Package name: `com.thoribus.workoutplanner`
- SHA-1 certificate fingerprint: the value from EAS credentials

Then put that OAuth client ID into `.env`:

```bash
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
```

Restart Expo after changing `.env`.

Calendar sync behavior:

- `Sync Google Calendar` creates all-day workout events in the primary calendar.
- Events are stored by Google event ID so the app can unsync/delete only the events it created.
- `Unsync Google Calendar` deletes those synced events.
- Deleting an active plan also deletes its synced calendar events first.
- Synced event titles use the workout name without `Day`, for example `Power Clean - Week 1`.
- Events include a 20:00 previous-day popup reminder and the description `Denk ans Training morgen, du faule Sau!`.
- Google Calendar event colors are limited to the API event color palette exposed by `colorId`; not every Google Calendar UI color name is available as an event color. The app does not force an event `colorId`, so synced workouts inherit the calendar's color.

## Architecture

Routes live in `src/app` and use Expo Router.

Main tabs:

- `src/app/(tabs)/index.tsx` - Home and recent workout history.
- `src/app/(tabs)/training.tsx` - Active plan, next workout, and plan creation entry point.

Stack routes:

- `src/app/plan/new.tsx` - Step-by-step plan setup wizard.
- `src/app/plan/overview.tsx` - Plan progress, current maxes, next workout, delete plan.
- `src/app/workout/preview.tsx` - Calculated workout preview.
- `src/app/workout/active.tsx` - Guided warmup, sets, rest timers, skips, weight edits.
- `src/app/history/[id].tsx` - Completed workout detail.
- `src/app/settings/*` - Settings overview and edit screens.

Core state:

- `src/features/plan/ActivePlanContext.tsx` owns active plan state, current maxes, accessory defaults, and history.
- Native persistence uses SQLite.
- Web persistence uses `localStorage` so browser refreshes keep state during development.

Program logic:

- `src/data/clemsonProgram.ts` stores phase tables, workout slots, and accessory templates.
- `src/lib/program/phases.ts` maps week/program length to phases.
- `src/lib/program/weights.ts` calculates and rounds weights.
- `src/lib/program/workoutBuilder.ts` builds the current workout from plan, maxes, and accessory defaults.

Persistence:

- `src/lib/storage/schema.ts` defines SQLite schema/migrations.
- `src/lib/storage/database.native.ts` opens and migrates SQLite on Android/iOS.
- `src/lib/storage/database.web.ts` is a no-op fallback so web does not bundle SQLite.
- `src/lib/storage/planRepository.ts` persists plans and maxes.
- `src/lib/storage/workoutRepository.ts` persists completed workouts.
- `src/lib/storage/accessoryRepository.ts` persists accessory defaults.

## APK Readiness

Before building an APK, the main remaining gaps are:

- Test the full workout flow on a physical Android device.
- Make sure SQLite persistence works after app restart on-device.
- Decide whether workout history needs delete/edit before first APK.
- Add app icon/splash polish if desired.
- Build with EAS or local Android tooling.

Recommended APK command path:

```bash
npx eas-cli@latest build -p android --profile preview
```

The `preview` profile in `eas.json` builds an installable APK for personal testing.
