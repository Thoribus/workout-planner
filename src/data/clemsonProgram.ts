import type { ExerciseKey, Phase, WorkoutSlot } from '@/types/workout';

export type PhaseSetDefinition = {
  reps: number | string;
  percent: number;
};

export type MainExerciseDefinition = {
  key: ExerciseKey;
  name: string;
  phases: Record<Phase, PhaseSetDefinition[]>;
};

export type AccessoryDefinition = {
  name: string;
  reps: (number | string)[];
};

export const MAIN_EXERCISES: Record<ExerciseKey, MainExerciseDefinition> = {
  benchPress: {
    key: 'benchPress',
    name: 'Bench Press',
    phases: {
      'Phase I': [
        { reps: 10, percent: 0.4 },
        { reps: 8, percent: 0.5 },
        { reps: 5, percent: 0.6 },
        { reps: 10, percent: 0.65 },
        { reps: 10, percent: 0.7 },
        { reps: 10, percent: 0.75 },
      ],
      'Phase II': [
        { reps: 10, percent: 0.4 },
        { reps: 8, percent: 0.5 },
        { reps: 5, percent: 0.65 },
        { reps: 5, percent: 0.78 },
        { reps: 5, percent: 0.82 },
        { reps: 5, percent: 0.85 },
        { reps: 10, percent: 0.7 },
      ],
      'Phase III': [
        { reps: 10, percent: 0.45 },
        { reps: 8, percent: 0.6 },
        { reps: 5, percent: 0.7 },
        { reps: 3, percent: 0.82 },
        { reps: 3, percent: 0.87 },
        { reps: 3, percent: 0.92 },
        { reps: 5, percent: 0.8 },
        { reps: 10, percent: 0.7 },
      ],
      'Peak Phase': [
        { reps: 10, percent: 0.45 },
        { reps: 8, percent: 0.6 },
        { reps: 5, percent: 0.7 },
        { reps: 1, percent: 0.8 },
        { reps: 1, percent: 0.9 },
        { reps: 1, percent: 0.95 },
        { reps: 1, percent: 0.97 },
        { reps: 5, percent: 0.83 },
        { reps: 10, percent: 0.74 },
      ],
    },
  },
  closeGripBenchPress: {
    key: 'closeGripBenchPress',
    name: 'Close Grip Bench Press',
    phases: {
      'Phase I': [
        { reps: 10, percent: 0.4 },
        { reps: 8, percent: 0.5 },
        { reps: 5, percent: 0.6 },
        { reps: 10, percent: 0.725 },
        { reps: 10, percent: 0.725 },
        { reps: 10, percent: 0.725 },
      ],
      'Phase II': [
        { reps: 10, percent: 0.4 },
        { reps: 8, percent: 0.5 },
        { reps: 5, percent: 0.7 },
        { reps: 5, percent: 0.835 },
        { reps: 5, percent: 0.835 },
        { reps: 5, percent: 0.835 },
        { reps: 5, percent: 0.835 },
      ],
      'Phase III': [
        { reps: 10, percent: 0.45 },
        { reps: 8, percent: 0.6 },
        { reps: 5, percent: 0.8 },
        { reps: 3, percent: 0.92 },
        { reps: 3, percent: 0.92 },
        { reps: 3, percent: 0.92 },
        { reps: 3, percent: 0.92 },
        { reps: 10, percent: 0.7 },
      ],
      'Peak Phase': [
        { reps: 10, percent: 0.45 },
        { reps: 8, percent: 0.6 },
        { reps: 5, percent: 0.7 },
        { reps: 1, percent: 0.8 },
        { reps: 1, percent: 0.9 },
        { reps: 1, percent: 0.95 },
        { reps: 1, percent: 0.97 },
        { reps: 5, percent: 0.82 },
        { reps: 10, percent: 0.72 },
      ],
    },
  },
  squat: {
    key: 'squat',
    name: 'Squat',
    phases: {
      'Phase I': [
        { reps: 8, percent: 0.4 },
        { reps: 5, percent: 0.5 },
        { reps: 3, percent: 0.6 },
        { reps: '10-12', percent: 0.68 },
        { reps: '10-12', percent: 0.72 },
        { reps: '10-12', percent: 0.78 },
      ],
      'Phase II': [
        { reps: 8, percent: 0.4 },
        { reps: 5, percent: 0.55 },
        { reps: 3, percent: 0.68 },
        { reps: '5-7', percent: 0.82 },
        { reps: '5-7', percent: 0.87 },
        { reps: '5-7', percent: 0.9 },
      ],
      'Phase III': [
        { reps: 8, percent: 0.4 },
        { reps: 5, percent: 0.6 },
        { reps: 3, percent: 0.7 },
        { reps: '4-5', percent: 0.82 },
        { reps: '4-5', percent: 0.9 },
        { reps: '4-5', percent: 0.92 },
      ],
      'Peak Phase': [
        { reps: 8, percent: 0.4 },
        { reps: 5, percent: 0.6 },
        { reps: 3, percent: 0.72 },
        { reps: 3, percent: 0.85 },
        { reps: 3, percent: 0.92 },
        { reps: 3, percent: 1 },
      ],
    },
  },
  speedClean: {
    key: 'speedClean',
    name: 'Speed Clean',
    phases: {} as Record<Phase, PhaseSetDefinition[]>,
  },
  powerClean: {
    key: 'powerClean',
    name: 'Power Clean',
    phases: {
      'Phase I': [
        { reps: 8, percent: 0.5 },
        { reps: 5, percent: 0.6 },
        { reps: 3, percent: 0.7 },
        { reps: 5, percent: 0.78 },
        { reps: 5, percent: 0.8 },
        { reps: 5, percent: 0.85 },
      ],
      'Phase II': [
        { reps: 8, percent: 0.5 },
        { reps: 5, percent: 0.65 },
        { reps: 3, percent: 0.75 },
        { reps: 3, percent: 0.87 },
        { reps: 3, percent: 0.9 },
        { reps: 3, percent: 0.92 },
        { reps: 3, percent: 0.95 },
      ],
      'Phase III': [
        { reps: 8, percent: 0.5 },
        { reps: 5, percent: 0.65 },
        { reps: 3, percent: 0.75 },
        { reps: 2, percent: 0.85 },
        { reps: 2, percent: 0.87 },
        { reps: 2, percent: 0.95 },
        { reps: 2, percent: 0.97 },
      ],
      'Peak Phase': [
        { reps: 8, percent: 0.5 },
        { reps: 5, percent: 0.65 },
        { reps: 3, percent: 0.75 },
        { reps: 1, percent: 0.87 },
        { reps: 1, percent: 0.92 },
        { reps: 1, percent: 0.97 },
        { reps: 1, percent: 1 },
      ],
    },
  },
  frontSquat: {
    key: 'frontSquat',
    name: 'Front Squat',
    phases: {} as Record<Phase, PhaseSetDefinition[]>,
  },
};

MAIN_EXERCISES.speedClean.phases = MAIN_EXERCISES.powerClean.phases;
MAIN_EXERCISES.frontSquat.phases = MAIN_EXERCISES.squat.phases;

export const WORKOUT_SLOTS: Record<WorkoutSlot, { title: string; mainExerciseKeys: ExerciseKey[] }> = {
  1: { title: 'Bench Day', mainExerciseKeys: ['benchPress'] },
  2: { title: 'Squat Day', mainExerciseKeys: ['squat', 'speedClean'] },
  3: { title: 'Close Grip Bench Day', mainExerciseKeys: ['closeGripBenchPress'] },
  4: { title: 'Power Clean Day', mainExerciseKeys: ['powerClean', 'frontSquat'] },
};

export const ACCESSORY_TEMPLATES: Record<WorkoutSlot, AccessoryDefinition[]> = {
  1: [
    { name: 'Incline Dumbbell Bench Press', reps: [12, 12] },
    { name: 'Triceps Extensions', reps: [10, 10, 10, 10, 10, 10] },
    { name: 'Dumbbell Front Raise', reps: [12, 10] },
    { name: 'Dumbbell Side Raise', reps: [12, 10] },
    { name: 'Dumbbell Row', reps: [12, 10, 8] },
    { name: 'Lat Pulldown', reps: [12, 10, 8, 6] },
    { name: 'Hammer Curl', reps: [10, 8, 8, 8, 8, 8] },
    { name: 'Abs', reps: [25, 25, 25] },
  ],
  2: [
    { name: 'Leg Extension', reps: ['8-12', '8-12', '8-12'] },
    { name: 'Leg Curl', reps: ['8-12', '8-12', '8-12'] },
    { name: 'Calves (heavy)', reps: ['15-20', '15-20', '15-20'] },
    { name: 'Hyperextension', reps: [10, 10, 10] },
    { name: 'Abs (Heavy)', reps: ['8-12', '8-12', '8-12'] },
  ],
  3: [
    { name: 'Incline Dumbbell Bench Press', reps: [12, 10, 8, 8] },
    { name: 'EZ-Bar Triceps Extensions', reps: [12, 10, 8, 6, 5, 5] },
    { name: 'Dumbbell Front Raise', reps: [12, 10] },
    { name: 'Dumbbell Side Raise', reps: [12, 10] },
    { name: 'Dumbbell Row', reps: [12, 10, 8] },
    { name: 'Lat Pulldown', reps: [12, 10, 8, 6] },
    { name: 'Hammer Curl', reps: [10, 8, 8, 8, 8, 8] },
    { name: 'Abs', reps: [25, 25, 25] },
  ],
  4: [
    { name: 'Shrugs', reps: ['8-12', '8-12', '8-12'] },
    { name: 'Romanian Deadlift', reps: [10, 10, 10] },
    { name: 'Calves (heavy)', reps: ['15-20', '15-20', '15-20'] },
    { name: 'Abs (Heavy)', reps: ['8-12', '8-12', '8-12'] },
  ],
};
