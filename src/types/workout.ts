export type Lift = 'bench' | 'squat' | 'clean';

export type ExerciseType = 'main' | 'accessory';

export type WorkoutSlot = 1 | 2 | 3 | 4;

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type Phase = 'Phase I' | 'Phase II' | 'Phase III' | 'Peak Phase';

export type ProgramLength = 8 | 10;

export type PhaseGroup = 'bench' | 'lower';

export type ExerciseKey =
  | 'benchPress'
  | 'closeGripBenchPress'
  | 'squat'
  | 'speedClean'
  | 'powerClean'
  | 'frontSquat';

export type Plan = {
  id: string;
  name: string;
  weeks: ProgramLength;
  currentWeek: number;
  currentSlot: WorkoutSlot;
  roundingIncrementKg: number;
  warmupSeconds: number;
  mainRestSeconds: number;
  accessoryRestSeconds: number;
  speedCleanReductionKg: number;
  frontSquatReductionKg: number;
  currentScheduleIndex: number;
  schedule?: PlanSchedule;
  createdAt: string;
  completedAt?: string;
  deletedAt?: string;
};

export type ScheduledWorkout = {
  index: number;
  date: string;
  week: number;
  slot: WorkoutSlot;
};

export type PlanSchedule = {
  startDate: string;
  weekdays: Record<WorkoutSlot, Weekday>;
  workouts: ScheduledWorkout[];
};

export type LiftMaxes = Record<Lift, number>;

export type AccessoryDefault = {
  exerciseName: string;
  lastWeightKg?: number;
  lastReps?: string;
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
  key?: ExerciseKey;
  lift?: Lift;
  restSeconds: number;
  trainingMaxKg?: number;
  sets: PlannedSet[];
};

export type WorkoutPlan = {
  week: number;
  slot: WorkoutSlot;
  phase: Phase;
  title: string;
  exercises: PlannedExercise[];
};
