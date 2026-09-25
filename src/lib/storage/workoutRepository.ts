// eslint-disable-next-line import/no-unresolved -- Metro resolves database.native/web.ts by platform.
import { getDatabase } from '@/lib/storage/database';
import type { WorkoutHistoryItem } from '@/features/plan/ActivePlanContext';

type WorkoutSessionRow = {
  id: string;
  title: string;
  week: number;
  slot: number;
  phase: string;
  completed_at: string;
  duration_seconds: number;
  completed_sets: number;
  skipped_sets: number;
  skipped_exercises: number;
  total_volume_kg: number;
};

type ExerciseSessionRow = {
  name: string;
  type: 'main' | 'accessory';
  training_max_kg: number | null;
  volume_kg: number;
};

export async function saveWorkoutHistoryItemToDb(planId: string, summary: WorkoutHistoryItem) {
  const db = await getDatabase();

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `
        INSERT INTO workout_sessions (
          id, plan_id, title, week, slot, phase, completed_at,
          duration_seconds, completed_sets, skipped_sets, skipped_exercises, total_volume_kg
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        summary.id,
        planId,
        summary.title,
        summary.week,
        summary.slot,
        summary.phase,
        summary.completedAt,
        summary.durationSeconds,
        summary.completedSets,
        summary.skippedSets,
        summary.skippedExercises,
        summary.totalVolumeKg,
      ],
    );

    for (const [index, exercise] of summary.exercises.entries()) {
      await txn.runAsync(
        `
          INSERT INTO exercise_sessions (
            id, workout_session_id, order_index, name, type, training_max_kg, volume_kg
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [
          `${summary.id}-${index}`,
          summary.id,
          index,
          exercise.name,
          exercise.type,
          exercise.maxWeightKg ?? null,
          exercise.volumeKg,
        ],
      );
    }
  });
}

export async function getWorkoutHistoryFromDb(planId: string) {
  const db = await getDatabase();
  const rows = await db.getAllAsync<WorkoutSessionRow>(
    'SELECT * FROM workout_sessions WHERE plan_id = ? ORDER BY completed_at DESC',
    [planId],
  );

  const history: WorkoutHistoryItem[] = [];

  for (const row of rows) {
    const exercises = await db.getAllAsync<ExerciseSessionRow>(
      'SELECT name, type, training_max_kg, volume_kg FROM exercise_sessions WHERE workout_session_id = ? ORDER BY order_index ASC',
      [row.id],
    );

    history.push({
      id: row.id,
      title: row.title,
      week: row.week,
      slot: row.slot as WorkoutHistoryItem['slot'],
      phase: row.phase,
      completedAt: row.completed_at,
      durationSeconds: row.duration_seconds,
      completedSets: row.completed_sets,
      skippedSets: row.skipped_sets,
      skippedExercises: row.skipped_exercises,
      totalVolumeKg: row.total_volume_kg,
      exercises: exercises.map((exercise) => ({
        name: exercise.name,
        type: exercise.type,
        maxWeightKg: exercise.training_max_kg ?? undefined,
        volumeKg: exercise.volume_kg,
      })),
    });
  }

  return history;
}
