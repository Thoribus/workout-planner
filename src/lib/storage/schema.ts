import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'workout-planner.db';
export const DATABASE_VERSION = 4;

export async function migrateDatabase(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;

  if (currentVersion >= DATABASE_VERSION) {
    return;
  }

  let migratedVersion = currentVersion;

  if (migratedVersion === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        weeks INTEGER NOT NULL,
        current_week INTEGER NOT NULL,
        current_slot INTEGER NOT NULL,
        rounding_increment_kg REAL NOT NULL,
        warmup_seconds INTEGER NOT NULL,
        main_rest_seconds INTEGER NOT NULL,
        accessory_rest_seconds INTEGER NOT NULL,
        speed_clean_reduction_kg REAL NOT NULL,
        front_squat_reduction_kg REAL NOT NULL,
        current_schedule_index INTEGER NOT NULL DEFAULT 0,
        schedule_json TEXT,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS lift_maxes (
        id TEXT PRIMARY KEY NOT NULL,
        plan_id TEXT NOT NULL,
        lift TEXT NOT NULL,
        value_kg REAL NOT NULL,
        effective_from_week INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        note TEXT,
        FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS lift_maxes_plan_lift_week_idx
        ON lift_maxes(plan_id, lift, effective_from_week);

      CREATE TABLE IF NOT EXISTS workout_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        plan_id TEXT NOT NULL,
        title TEXT NOT NULL,
        week INTEGER NOT NULL,
        slot INTEGER NOT NULL,
        phase TEXT NOT NULL,
        started_at TEXT,
        completed_at TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        completed_sets INTEGER NOT NULL,
        skipped_sets INTEGER NOT NULL,
        skipped_exercises INTEGER NOT NULL,
        total_volume_kg REAL NOT NULL,
        notes TEXT,
        FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS workout_sessions_plan_completed_idx
        ON workout_sessions(plan_id, completed_at DESC);

      CREATE TABLE IF NOT EXISTS exercise_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        workout_session_id TEXT NOT NULL,
        order_index INTEGER NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        main_lift TEXT,
        training_max_kg REAL,
        volume_kg REAL NOT NULL,
        skipped INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (workout_session_id) REFERENCES workout_sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS set_sessions (
        id TEXT PRIMARY KEY NOT NULL,
        exercise_session_id TEXT NOT NULL,
        set_index INTEGER NOT NULL,
        target_reps TEXT NOT NULL,
        target_weight_kg REAL,
        actual_reps TEXT,
        actual_weight_kg REAL,
        skipped INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        notes TEXT,
        FOREIGN KEY (exercise_session_id) REFERENCES exercise_sessions(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS accessory_defaults (
        exercise_name TEXT PRIMARY KEY NOT NULL,
        last_weight_kg REAL,
        last_reps TEXT,
        last_completed_at TEXT,
        notes TEXT
      );
    `);
    migratedVersion = DATABASE_VERSION;
  }

  if (migratedVersion === 1) {
    await db.execAsync(`
      ALTER TABLE workout_sessions ADD COLUMN duration_seconds INTEGER NOT NULL DEFAULT 0;
    `);
    migratedVersion = 2;
  }

  if (migratedVersion === 2) {
    await db.execAsync(`
      ALTER TABLE plans ADD COLUMN current_schedule_index INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE plans ADD COLUMN schedule_json TEXT;
    `);
    migratedVersion = 3;
  }

  if (migratedVersion === 3) {
    await db.execAsync(`
      ALTER TABLE plans ADD COLUMN deleted_at TEXT;
    `);
  }

  await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
}
