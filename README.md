# Workout Planner

Personal Android-first workout app for running a Clemson-style power program. The app is built with Expo, React Native, TypeScript, Expo Router, and SQLite on native platforms.

## Fresh PC Setup

These steps assume a new Windows machine.

Install prerequisites:

- Git for Windows: https://git-scm.com/download/win
- Node.js LTS: https://nodejs.org/
- Expo account access for the `thoribus` project.

Clone the repo and install dependencies:

```bash
git clone <repo-url>
cd workout-planner
npm install
```

Sign in to Expo/EAS:

```bash
npx eas-cli@latest login
```

Create local env file for development. In PowerShell:

```powershell
Copy-Item .env.example .env
```

Fill `.env` with the Google OAuth client IDs from Google Cloud Console:

```txt
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
```

Where to find those IDs:

- Google Cloud Console -> APIs & Services -> Credentials.
- Android client ID: OAuth client with package `com.thoribus.workoutplanner` and the EAS keystore SHA-1.
- Web client ID: OAuth client with application type `Web application`.

Start local development:

```bash
npx expo start
```

Run on web:

```bash
npx expo start --web
```

Run in a development APK:

```bash
npx expo start --dev-client --tunnel -c
```

Expo Go is okay for non-native UI work, but Google Sign-In needs a development or preview APK because the app uses native Google Sign-In.

This repo pins the working Expo Ngrok binary through `package.json` overrides because the newer Darwin ARM64 binary package resolved to an empty package on macOS. Windows should not need anything special beyond `npm install`.

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
6. Copy `.env.example` to `.env` and fill the local development client IDs:

```bash
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
```

The app requests this scope so it can create/reuse a dedicated workout calendar, color it, add events, and delete synced events later:

```txt
https://www.googleapis.com/auth/calendar
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

## EAS Environment Variables

Local `.env` is used by `npx expo start`, but cloud builds need EAS environment variables. These values are public OAuth client IDs, not OAuth secrets, but they should still not be committed to the repo.

Set them for preview builds:

```bash
npx eas-cli@latest env:set preview --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value "your-android-client-id.apps.googleusercontent.com" --visibility plaintext
```

```bash
npx eas-cli@latest env:set preview --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "your-web-client-id.apps.googleusercontent.com" --visibility plaintext
```

Check what is configured:

```bash
npx eas-cli@latest env:list --environment preview
```

If building production later, set the same variables for `production` too:

```bash
npx eas-cli@latest env:set production --name EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID --value "your-android-client-id.apps.googleusercontent.com" --visibility plaintext
npx eas-cli@latest env:set production --name EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID --value "your-web-client-id.apps.googleusercontent.com" --visibility plaintext
```

Do not use `secret` visibility for `EXPO_PUBLIC_*`; EAS rejects that because these values are embedded into the compiled app.

Calendar sync behavior:

- `Sync Google Calendar` creates/reuses a dedicated `Workout Planner` calendar.
- Events are stored by Google event ID so the app can track sync state.
- `Unsync Google Calendar` deletes the dedicated `Workout Planner` calendar.
- Deleting an active plan also deletes the dedicated `Workout Planner` calendar first.
- Synced event titles use the workout name without `Day`, for example `Power Clean - Week 1`.
- Events include a 20:00 previous-day popup reminder and the description `Denk ans Training morgen, du faule Sau!`.
- The dedicated calendar is colored Kirschblüte / Cherry Blossom using `#F691B2`.

## First Run Onboarding

The app shows a one-time onboarding modal on first startup. The dismissal flag is stored locally with SecureStore on native and `localStorage` on web.

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

## Preview APK Build

The preview profile builds a real standalone APK. It does not need Metro or a dev server.

Before building:

- Confirm EAS preview env vars are set.
- Confirm Google OAuth consent screen is in `Testing` and your Gmail is listed under test users.
- Confirm Google Calendar API is enabled.
- Confirm Android OAuth client uses package `com.thoribus.workoutplanner` and the EAS keystore SHA-1.

Build:

```bash
npx eas-cli@latest build --platform android --profile preview
```

Open the Expo build URL, download the APK, and install it on Android.

Use this for personal testing. Production Play Store release should wait until the app has been used for a while and any missing features are clear.
