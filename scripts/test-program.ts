import { buildWorkout } from '../src/lib/program/workoutBuilder';
import { getPhaseForWeek } from '../src/lib/program/phases';
import type { Plan } from '../src/types/workout';

function assertEqual<T>(actual: T, expected: T) {
  if (actual !== expected) {
    throw new Error(`Expected ${String(expected)}, got ${String(actual)}`);
  }
}

function assertDeepEqual<T>(actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertDefined<T>(value: T | undefined | null): T {
  if (value === undefined || value === null) {
    throw new Error('Expected value to be defined');
  }

  return value;
}

const basePlan: Plan = {
  id: 'test-plan',
  name: 'Test Plan',
  weeks: 10,
  currentWeek: 1,
  currentSlot: 1,
  roundingIncrementKg: 2.5,
  warmupSeconds: 600,
  mainRestSeconds: 90,
  accessoryRestSeconds: 60,
  speedCleanReductionKg: 22.5,
  frontSquatReductionKg: 45,
  currentScheduleIndex: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const maxes = {
  bench: 70,
  squat: 100,
  clean: 75,
};

assertEqual(getPhaseForWeek(1, 10, 'bench'), 'Phase I');
assertEqual(getPhaseForWeek(5, 10, 'bench'), 'Phase II');
assertEqual(getPhaseForWeek(5, 10, 'lower'), 'Phase III');

const benchDay = buildWorkout({ plan: basePlan, maxes });
assertEqual(benchDay.title, 'Bench Day');
assertEqual(benchDay.phase, 'Phase I');
assertEqual(benchDay.exercises[0].name, 'Bench Press');
assertDeepEqual(
  benchDay.exercises[0].sets.map((set) => set.weightKg),
  [27.5, 35, 42.5, 45, 50, 52.5],
);

const squatDay = buildWorkout({
  plan: { ...basePlan, currentSlot: 2 },
  maxes,
});
assertEqual(squatDay.title, 'Squat Day');
assertEqual(squatDay.exercises[1].name, 'Speed Clean');
assertEqual(squatDay.exercises[1].trainingMaxKg, 52.5);

const powerCleanDay = buildWorkout({
  plan: { ...basePlan, currentSlot: 4 },
  maxes,
});
assertEqual(powerCleanDay.title, 'Power Clean Day');
assertEqual(powerCleanDay.exercises[1].name, 'Front Squat');
assertEqual(powerCleanDay.exercises[1].trainingMaxKg, 55);

const accessoryDay = buildWorkout({
  plan: basePlan,
  maxes,
  accessoryDefaults: [{ exerciseName: 'Incline Dumbbell Bench Press', lastWeightKg: 22.5 }],
});
const inclineBench = accessoryDay.exercises.find(
  (exercise) => exercise.name === 'Incline Dumbbell Bench Press',
);
assertEqual(assertDefined(inclineBench).sets[0].weightKg, 22.5);

console.log('Program engine tests passed');
