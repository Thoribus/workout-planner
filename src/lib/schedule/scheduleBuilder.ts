import type { PlanSchedule, ProgramLength, ScheduledWorkout, Weekday, WorkoutSlot } from '@/types/workout';

const WORKOUT_SLOTS: WorkoutSlot[] = [1, 2, 3, 4];

export function buildPlanSchedule(
  startDate: string,
  weekdays: Record<WorkoutSlot, Weekday>,
  weeks: ProgramLength,
): PlanSchedule {
  const workouts = generateScheduledWorkouts(startDate, weekdays, weeks);

  return {
    startDate,
    weekdays,
    workouts,
  };
}

function generateScheduledWorkouts(
  startDate: string,
  weekdays: Record<WorkoutSlot, Weekday>,
  weeks: ProgramLength,
): ScheduledWorkout[] {
  const start = parseDate(startDate);
  const totalWorkouts = weeks * WORKOUT_SLOTS.length;
  const candidates: Omit<ScheduledWorkout, 'index' | 'week'>[] = [];

  for (const slot of WORKOUT_SLOTS) {
    let date = nextDateForWeekday(start, weekdays[slot]);
    const occurrencesPerSlot = weeks + 1;

    for (let occurrence = 0; occurrence < occurrencesPerSlot; occurrence += 1) {
      candidates.push({ date: formatDate(date), slot });
      date = addDays(date, 7);
    }
  }

  return candidates
    .sort((left, right) => left.date.localeCompare(right.date) || left.slot - right.slot)
    .slice(0, totalWorkouts)
    .map((workout, index) => ({
      ...workout,
      index,
      week: Math.floor(index / WORKOUT_SLOTS.length) + 1,
    }));
}

function parseDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function nextDateForWeekday(start: Date, weekday: Weekday) {
  const date = new Date(start);
  const delta = (weekday - date.getDay() + 7) % 7;
  date.setDate(date.getDate() + delta);
  return date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
