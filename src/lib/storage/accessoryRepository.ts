// eslint-disable-next-line import/no-unresolved -- Metro resolves database.native/web.ts by platform.
import { getDatabase } from '@/lib/storage/database';
import type { AccessoryDefault } from '@/types/workout';

type AccessoryDefaultRow = {
  exercise_name: string;
  last_weight_kg: number | null;
  last_reps: string | null;
};

export async function getAccessoryDefaultsFromDb(): Promise<AccessoryDefault[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<AccessoryDefaultRow>('SELECT * FROM accessory_defaults ORDER BY exercise_name');

  return rows.map((row) => ({
    exerciseName: row.exercise_name,
    lastWeightKg: row.last_weight_kg ?? undefined,
    lastReps: row.last_reps ?? undefined,
  }));
}

export async function saveAccessoryDefaultToDb(defaultValue: AccessoryDefault) {
  const db = await getDatabase();

  await db.runAsync(
    `
      INSERT INTO accessory_defaults (exercise_name, last_weight_kg, last_reps, last_completed_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(exercise_name) DO UPDATE SET
        last_weight_kg = excluded.last_weight_kg,
        last_reps = excluded.last_reps,
        last_completed_at = excluded.last_completed_at
    `,
    [
      defaultValue.exerciseName,
      defaultValue.lastWeightKg ?? null,
      defaultValue.lastReps ?? null,
      new Date().toISOString(),
    ],
  );
}
