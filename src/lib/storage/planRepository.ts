// eslint-disable-next-line import/no-unresolved -- Metro resolves database.native/web.ts by platform.
import { getDatabase } from '@/lib/storage/database';
import type { LiftMaxes, Plan, ProgramLength, WorkoutSlot } from '@/types/workout';

type PlanRow = {
  id: string;
  name: string;
  weeks: number;
  current_week: number;
  current_slot: number;
  rounding_increment_kg: number;
  warmup_seconds: number;
  main_rest_seconds: number;
  accessory_rest_seconds: number;
  speed_clean_reduction_kg: number;
  front_squat_reduction_kg: number;
  current_schedule_index: number;
  schedule_json: string | null;
  created_at: string;
  completed_at: string | null;
  deleted_at: string | null;
};

type LiftMaxRow = {
  lift: keyof LiftMaxes;
  value_kg: number;
};

export async function getActivePlanFromDb() {
  const db = await getDatabase();
  const row = await db.getFirstAsync<PlanRow>(
    'SELECT * FROM plans WHERE completed_at IS NULL AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1',
  );

  if (!row) {
    return null;
  }

  const maxRows = await db.getAllAsync<LiftMaxRow>(
    `
      SELECT lift, value_kg
      FROM lift_maxes
      WHERE plan_id = ?
      ORDER BY effective_from_week ASC, created_at ASC
    `,
    [row.id],
  );

  return {
    plan: mapPlanRow(row),
    maxes: mapMaxRows(maxRows),
  };
}

export async function savePlanToDb(plan: Plan, maxes: LiftMaxes) {
  const db = await getDatabase();

  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `
        INSERT OR REPLACE INTO plans (
          id, name, weeks, current_week, current_slot, rounding_increment_kg,
          warmup_seconds, main_rest_seconds, accessory_rest_seconds,
          speed_clean_reduction_kg, front_squat_reduction_kg, current_schedule_index,
          schedule_json, created_at, completed_at, deleted_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        plan.id,
        plan.name,
        plan.weeks,
        plan.currentWeek,
        plan.currentSlot,
        plan.roundingIncrementKg,
        plan.warmupSeconds,
        plan.mainRestSeconds,
        plan.accessoryRestSeconds,
        plan.speedCleanReductionKg,
        plan.frontSquatReductionKg,
        plan.currentScheduleIndex,
        plan.schedule ? JSON.stringify(plan.schedule) : null,
        plan.createdAt,
        plan.completedAt ?? null,
        plan.deletedAt ?? null,
      ],
    );

    const createdAt = new Date().toISOString();

    for (const [lift, valueKg] of Object.entries(maxes)) {
      await txn.runAsync(
        `
          INSERT INTO lift_maxes (id, plan_id, lift, value_kg, effective_from_week, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        [`${plan.id}-${lift}-${createdAt}`, plan.id, lift, valueKg, plan.currentWeek, createdAt],
      );
    }
  });
}

export async function updatePlanProgressInDb(plan: Plan) {
  const db = await getDatabase();

  await db.runAsync(
    'UPDATE plans SET current_week = ?, current_slot = ?, current_schedule_index = ?, completed_at = ? WHERE id = ?',
    [plan.currentWeek, plan.currentSlot, plan.currentScheduleIndex, plan.completedAt ?? null, plan.id],
  );
}

export async function updatePlanSettingsInDb(plan: Plan) {
  const db = await getDatabase();

  await db.runAsync(
    `
      UPDATE plans
      SET rounding_increment_kg = ?,
          warmup_seconds = ?,
          main_rest_seconds = ?,
          accessory_rest_seconds = ?,
          speed_clean_reduction_kg = ?,
          front_squat_reduction_kg = ?
      WHERE id = ?
    `,
    [
      plan.roundingIncrementKg,
      plan.warmupSeconds,
      plan.mainRestSeconds,
      plan.accessoryRestSeconds,
      plan.speedCleanReductionKg,
      plan.frontSquatReductionKg,
      plan.id,
    ],
  );
}

export async function deletePlanFromDb(planId: string) {
  const db = await getDatabase();

  await db.runAsync('UPDATE plans SET deleted_at = ? WHERE id = ?', [new Date().toISOString(), planId]);
}

export async function restorePlanInDb(planId: string) {
  const db = await getDatabase();

  await db.runAsync('UPDATE plans SET deleted_at = NULL, completed_at = NULL WHERE id = ?', [planId]);
}

export async function getDeletedPlansFromDb() {
  const db = await getDatabase();
  const rows = await db.getAllAsync<PlanRow>('SELECT * FROM plans WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC');

  return rows.map(mapPlanRow);
}

export async function saveLiftMaxesToDb(plan: Plan, maxes: LiftMaxes) {
  const db = await getDatabase();
  const createdAt = new Date().toISOString();

  for (const [lift, valueKg] of Object.entries(maxes)) {
    await db.runAsync(
      `
        INSERT INTO lift_maxes (id, plan_id, lift, value_kg, effective_from_week, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [`${plan.id}-${lift}-${createdAt}`, plan.id, lift, valueKg, plan.currentWeek, createdAt],
    );
  }
}

function mapPlanRow(row: PlanRow): Plan {
  return {
    id: row.id,
    name: row.name,
    weeks: row.weeks as ProgramLength,
    currentWeek: row.current_week,
    currentSlot: row.current_slot as WorkoutSlot,
    roundingIncrementKg: row.rounding_increment_kg,
    warmupSeconds: row.warmup_seconds,
    mainRestSeconds: row.main_rest_seconds,
    accessoryRestSeconds: row.accessory_rest_seconds,
    speedCleanReductionKg: row.speed_clean_reduction_kg,
    frontSquatReductionKg: row.front_squat_reduction_kg,
    currentScheduleIndex: row.current_schedule_index,
    schedule: row.schedule_json ? JSON.parse(row.schedule_json) : undefined,
    createdAt: row.created_at,
    completedAt: row.completed_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
  };
}

function mapMaxRows(rows: LiftMaxRow[]): LiftMaxes {
  return rows.reduce<LiftMaxes>(
    (maxes, row) => ({ ...maxes, [row.lift]: row.value_kg }),
    { bench: 0, squat: 0, clean: 0 },
  );
}
