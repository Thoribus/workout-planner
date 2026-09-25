# Workout Planner Implementation Plan

## Product Scope

Build a local-first Android app for one Clemson-style power program. The first version must let the user create one active plan, calculate each workout from current maxes, guide every main and accessory set, handle timers, support skips/edits, and save history.

## Technical Architecture

The app has four layers:

| Layer | Responsibility |
| --- | --- |
| Routes | Screens and navigation with Expo Router |
| Features | Screen-specific state and UI composition |
| Domain | Pure workout/program calculation functions |
| Storage | Local persistence and repository functions |

Do not put workout calculation logic directly in screens. Screens should call domain functions and storage repositories.

## Target Folder Structure

```txt
src/
  app/
    _layout.tsx
    index.tsx
    plan/
      new.tsx
      overview.tsx
    workout/
      preview.tsx
      active.tsx
      complete.tsx
    history/
      index.tsx
    settings/
      index.tsx
  components/
    AppButton.tsx
    AppCard.tsx
    AppTextField.tsx
    SetRow.tsx
    TimerDisplay.tsx
  data/
    clemsonProgram.ts
  features/
    plan/
      PlanForm.tsx
    workout/
      ExerciseEditor.tsx
      WorkoutExerciseCard.tsx
      WorkoutRunner.tsx
  lib/
    program/
      phases.ts
      weights.ts
      workoutBuilder.ts
    storage/
      database.ts
      schema.ts
      planRepository.ts
      workoutRepository.ts
      accessoryRepository.ts
    time/
      timer.ts
  types/
    program.ts
    storage.ts
    workout.ts
```

## Screen Hierarchy

Use two main tabs for v1.

```txt
Home tab
  Recent workout history
  Completed plan/workout summaries
  Settings action

Training tab
  No plan: Create Plan
  Active plan: Plan card, next workout preview, start flow
  Settings action
```

Workout preview and plan overview belong inside the Training flow. They should not be primary Home actions.

## Route Map

| Route | Screen | Purpose |
| --- | --- | --- |
| `/` | Home tab | Shows recent workout history and summaries |
| `/training` | Training tab | Creates a plan or starts the active plan's next workout |
| `/plan/new` | New Plan | Creates or restarts the active plan |
| `/plan/overview` | Plan Overview | Shows week/slot progress and upcoming workouts |
| `/workout/preview` | Workout Preview | Shows calculated workout before starting |
| `/workout/active` | Active Workout | Guided workout runner with timers and set tracking |
| `/workout/complete` | Complete | Summary, notes, max update prompts |
| `/history` | History | Previous completed workouts |
| `/settings` | Settings | Timers, rounding, maxes, derived weight settings |

## Navigation Flow

```txt
No active plan
  -> Training tab
  -> New Plan
  -> Training tab

Active plan exists
  -> Training tab
  -> Workout Preview
  -> Active Workout
  -> Complete
  -> Training tab with next workout advanced
```

## Core Data Concepts

### Workout Slots

Progression is based on completed slots, not calendar dates.

| Slot | Main work | Accessories |
| --- | --- | --- |
| 1 | Bench Press | Day 1 accessory template |
| 2 | Squat + Speed Clean | Day 2 accessory template |
| 3 | Close Grip Bench Press | Day 3 accessory template |
| 4 | Power Clean + Front Squat | Day 4 accessory template |

Weekdays selected during setup are scheduling hints. If the user misses a calendar day, the app still serves the next uncompleted slot.

### Plan Progression

The active plan stores:

```txt
currentWeek
currentSlot
```

After completing a workout:

```txt
if currentSlot < 4:
  currentSlot += 1
else:
  currentSlot = 1
  currentWeek += 1
```

If `currentWeek > plan.weeks`, the plan is complete.

## Types

Create `src/types/workout.ts` first.

```ts
export type Lift = 'bench' | 'squat' | 'clean';
export type ExerciseType = 'warmup' | 'main' | 'accessory';
export type WorkoutSlot = 1 | 2 | 3 | 4;
export type Phase = 'Phase I' | 'Phase II' | 'Phase III' | 'Peak Phase';

export type Plan = {
  id: string;
  name: string;
  weeks: number;
  currentWeek: number;
  currentSlot: WorkoutSlot;
  roundingIncrementKg: number;
  warmupSeconds: number;
  mainRestSeconds: number;
  accessoryRestSeconds: number;
  speedCleanReductionKg: number;
  frontSquatReductionKg: number;
  createdAt: string;
  completedAt?: string;
};

export type LiftMax = {
  id: string;
  lift: Lift;
  valueKg: number;
  effectiveFromWeek: number;
  createdAt: string;
  note?: string;
};

export type PlannedSet = {
  setIndex: number;
  reps: number | string;
  weightKg?: number;
  percent?: number;
};

export type PlannedExercise = {
  id: string;
  name: string;
  type: ExerciseType;
  lift?: Lift;
  restSeconds: number;
  sets: PlannedSet[];
};

export type WorkoutPlan = {
  week: number;
  slot: WorkoutSlot;
  phase: Phase;
  exercises: PlannedExercise[];
};
```

## Static Program Data

Create `src/data/clemsonProgram.ts`.

This file contains no business logic, only constants:

```ts
export const PHASE_TABLES = { ... };
export const WORKOUT_SLOTS = { ... };
export const ACCESSORY_TEMPLATES = { ... };
```

### Required Data

- Bench Press phase percentages.
- Close Grip Bench Press phase percentages.
- Squat phase percentages.
- Power Clean phase percentages.
- Slot-to-main-exercise mapping.
- Slot-to-accessory mapping.

Accessory templates:

```txt
Slot 1:
Dumbbell Benchpress 2 x 12
Triceps 10, 10, 10, 10, 10, 10
Dumbbell Front Raise 12, 10
Dumbbell Side Raise 12, 10
Dumbbell Row 12, 10, 8
Lat Pulldown 12, 10, 8, 6
Hammer Curl 10, 8, 8, 8, 8, 8
Abs 3 x 25

Slot 2:
Leg Extension 3 x 8-12
Leg Curl 3 x 8-12
Calves (heavy) 3 x 15-20
Hyperextension 3 x 10
Abs (heavy) 3 x 8-12

Slot 3:
Incline DB 12, 10, 8, 8
EZ-Bar Tri Ext 12, 10, 8, 6, 5, 5
Dumbbell Front Raise 12, 10
Dumbbell Side Raise 12, 10
DB Row 12, 10, 8
Lat Pulldown 12, 10, 8, 6
Hammer Curl 10, 8, 8, 8, 8, 8
Abs 3 x 25

Slot 4:
Shrugs 3 x 8-12
Romanian Deads 3 x 10
Calves (heavy) 3 x 15-20
Abs (heavy) 3 x 8-12
```

## Domain Functions

### `src/lib/program/phases.ts`

```ts
getPhaseForWeek(week, weeks, phaseGroup): Phase
```

Initial implementation supports 8 and 10 week plans only. Bench and lower-body phase mappings are separate because the PDF defines them differently.

12-week lower-body support can be revisited once the matching bench behavior is decided.

### `src/lib/program/weights.ts`

```ts
roundWeightKg(weightKg: number, incrementKg: number): number
getSpeedCleanTrainingMax(cleanMaxKg: number, reductionKg: number): number
getFrontSquatTrainingMax(squatMaxKg: number, reductionKg: number): number
calculateSetWeight(maxKg: number, percent: number, roundingIncrementKg: number): number
```

Rules:

- Default rounding is `2.5 kg`.
- Speed Clean uses `cleanMaxKg - 22.5`.
- Front Squat uses `squatMaxKg - 45`.

### `src/lib/program/workoutBuilder.ts`

```ts
buildWorkout(args: {
  plan: Plan;
  maxes: Record<Lift, number>;
  slot: WorkoutSlot;
  accessoryDefaults: AccessoryDefault[];
}): WorkoutPlan
```

Responsibilities:

- Determine phase from `plan.currentWeek`.
- Build main exercises for current slot.
- Calculate main lift weights.
- Build accessory exercises as guided set lists.
- Use last completed accessory weight when available.
- Attach correct rest timer to each exercise.

### `src/lib/program/progression.ts`

```ts
advancePlanAfterWorkout(plan: Plan): Plan
```

Responsibilities:

- Move from slot 1 to 2 to 3 to 4.
- Move to next week after slot 4.
- Mark plan complete after final week slot 4.

## Storage Plan

Use SQLite, but do not start with complex ORM abstractions.

Install later with:

```bash
npx expo install expo-sqlite
```

### Tables

```sql
plans
lift_maxes
weekday_assignments
workout_sessions
exercise_sessions
set_sessions
accessory_defaults
```

### Repository Files

```txt
src/lib/storage/database.ts
src/lib/storage/schema.ts
src/lib/storage/planRepository.ts
src/lib/storage/workoutRepository.ts
src/lib/storage/accessoryRepository.ts
```

### Repository Functions

`planRepository.ts`:

```ts
getActivePlan(): Promise<Plan | null>
createPlan(input): Promise<Plan>
updatePlanProgress(planId, week, slot): Promise<void>
completePlan(planId): Promise<void>
```

`workoutRepository.ts`:

```ts
createWorkoutSession(workoutPlan): Promise<string>
saveExerciseSession(...): Promise<void>
saveSetSession(...): Promise<void>
completeWorkoutSession(...): Promise<void>
getWorkoutHistory(): Promise<WorkoutSummary[]>
```

`accessoryRepository.ts`:

```ts
getAccessoryDefaults(): Promise<AccessoryDefault[]>
updateAccessoryDefaultFromCompletedExercise(...): Promise<void>
```

## Active Workout State

Use in-memory reducer first. Persist final result at workout completion.

Create `src/features/workout/workoutReducer.ts`.

State shape:

```ts
type ActiveWorkoutState = {
  workout: WorkoutPlan;
  status: 'warmup' | 'exercise' | 'rest' | 'complete';
  currentExerciseIndex: number;
  currentSetIndex: number;
  startedAt: string;
  completedAt?: string;
  completedSets: CompletedSet[];
  skippedSetIds: string[];
  skippedExerciseIds: string[];
};
```

Actions:

```ts
START_WARMUP
COMPLETE_WARMUP
COMPLETE_SET
SKIP_SET
SKIP_EXERCISE
EDIT_SET
EDIT_EXERCISE
COMPLETE_REST
COMPLETE_WORKOUT
```

## Screen Implementation Details

### Home `/`

First version:

- Load active plan.
- If no plan, show `Create Plan`.
- If plan exists, show current week/slot and `Start Next Workout`.
- Secondary actions: `Plan Overview`, `History`, `Settings`.

Main functions used:

```ts
getActivePlan()
getCurrentMaxes()
buildWorkout(...)
```

### New Plan `/plan/new`

Fields:

- Plan name.
- Weeks, default `10`.
- Bench max.
- Squat max.
- Power clean max.
- Preferred weekdays for slots 1-4.
- Warmup seconds.
- Main rest seconds.
- Accessory rest seconds.
- Rounding increment.

On submit:

```ts
createPlan(...)
createInitialLiftMaxes(...)
seedAccessoryDefaults(...)
router.replace('/')
```

### Workout Preview `/workout/preview`

Shows:

- Week and slot.
- Phase.
- Main exercises with all sets.
- Accessories with all sets.
- Start button.

Main functions used:

```ts
buildWorkout(...)
createWorkoutSession(...)
```

### Active Workout `/workout/active`

Shows one focused step at a time:

- Warmup timer.
- Current exercise.
- Current set target reps/weight.
- Done button.
- Skip set.
- Skip exercise.
- Edit set.
- Rest timer.

Main functions/components:

```ts
WorkoutRunner
TimerDisplay
SetRow
ExerciseEditor
workoutReducer
```

### Complete `/workout/complete`

Shows:

- Total time.
- Completed sets.
- Skipped sets/exercises.
- Notes field.
- Optional max update fields.

On finish:

```ts
completeWorkoutSession(...)
updateAccessoryDefaultsFromCompletedWorkout(...)
applyNextWeekMaxUpdates(...)
advancePlanAfterWorkout(...)
router.replace('/')
```

### History `/history`

Shows:

- Completed sessions.
- Date.
- Week/slot.
- Total time.
- Skipped items.

V1 can be read-only.

### Settings `/settings`

Shows:

- Current maxes.
- Warmup timer.
- Main rest timer.
- Accessory rest timer.
- Rounding increment.
- Speed clean reduction.
- Front squat reduction.

V1 can be simple form updates.

## Build Order

### Phase 1: App Skeleton

Goal: Replace Expo starter with useful empty screens.

Steps:

1. Create route files.
2. Create minimal shared components: `AppButton`, `AppCard`.
3. Create a basic visual theme.
4. Home screen links to all major screens.
5. Run typecheck and app start.

Done when: app opens and navigation works.

### Phase 2: Program Engine

Goal: Generate a workout in memory without storage.

Steps:

1. Add `types/workout.ts`.
2. Add `data/clemsonProgram.ts`.
3. Add `phases.ts`.
4. Add `weights.ts`.
5. Add `workoutBuilder.ts`.
6. Render a hardcoded generated workout on `Workout Preview`.

Done when: preview shows correct Week 1 Slot 1 workout from hardcoded maxes.

### Phase 3: Plan Setup Without SQLite

Goal: Create a temporary in-memory or simple local-storage active plan.

Steps:

1. Build `New Plan` form.
2. Save current plan to temporary app state or AsyncStorage.
3. Home reads active plan.
4. Preview builds from active plan.

Done when: user can create a plan and preview next workout.

### Phase 4: Active Workout Runner

Goal: Guide a workout from warmup to completion in memory.

Steps:

1. Add `workoutReducer.ts`.
2. Build warmup timer.
3. Build set screen.
4. Add main/accessory rest timer split.
5. Add skip set.
6. Add skip exercise.
7. Add edit set weight/reps.
8. Add completion summary.

Done when: a full workout can be completed without persistence.

### Phase 5: SQLite Persistence

Goal: Persist plans, sessions, sets, and accessory defaults.

Steps:

1. Install `expo-sqlite`.
2. Add schema migration.
3. Add plan repository.
4. Add workout repository.
5. Add accessory repository.
6. Replace temporary plan state with SQLite.

Done when: app can be closed/reopened and still knows active plan/history.

### Phase 6: Progression and History

Goal: Make the app usable across multiple workouts.

Steps:

1. Implement `advancePlanAfterWorkout`.
2. Complete workout advances week/slot.
3. Skipped exercises are saved as skipped.
4. Accessory defaults update only from completed non-skipped exercises.
5. History screen lists completed workouts.

Done when: completing Slot 1 makes Home show Slot 2, and history contains Slot 1.

### Phase 7: Polish for Personal Use

Goal: Make it comfortable enough to train with.

Steps:

1. Improve active workout screen ergonomics.
2. Add confirmation for skip exercise.
3. Add editable timers in workout.
4. Add settings screen persistence.
5. Add empty/loading/error states.
6. Test on Android device.

Done when: app is usable for a full training week.

## First Coding Task

Start with Phase 1 and Phase 2 together:

1. Replace the starter routes with app-specific screens.
2. Add program data and pure calculation functions.
3. Show a generated hardcoded workout preview.

This gives an immediate vertical slice without getting blocked on SQLite or complex forms.

## Future Google Calendar Integration

Goal: let the user select training dates and optionally add reminder events to Google Calendar.

Likely requirements:

- Google sign-in is required if the app writes events directly to Google Calendar.
- The app should request the narrowest possible Google Calendar scope for creating/editing events.
- User chooses dates for workout slots, not exact workout times in the first version.
- Calendar entries can be all-day reminder events.
- Reminder should trigger the day before.
- Calendar sync should be opt-in per plan.
- The app should store Google Calendar event IDs locally so events can be updated or deleted later.

Implementation path:

1. Add local date assignment UI for upcoming workout slots.
2. Persist planned training dates locally.
3. Add Google auth with Expo AuthSession, or use a development build if required by the chosen auth library.
4. Request Calendar event write permission.
5. Create calendar events for assigned training dates.
6. Save returned Google event IDs locally.
7. Update/delete calendar events when dates change or the plan is deleted.

This is post-MVP. First support local date scheduling, then add Google sync.

## Validation Commands

Run after each implementation phase:

```bash
npx tsc --noEmit
npx expo lint
```

Run manually during development:

```bash
npx expo start --go --lan -c
```

If the phone cannot reach the Mac on LAN, use:

```bash
npx expo start --go --tunnel
```
