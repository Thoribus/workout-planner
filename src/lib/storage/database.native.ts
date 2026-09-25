import * as SQLite from 'expo-sqlite';
import type { SQLiteDatabase } from 'expo-sqlite';

import { DATABASE_NAME, migrateDatabase } from '@/lib/storage/schema';

let databasePromise: Promise<SQLiteDatabase> | null = null;

export function getDatabase() {
  databasePromise ??= openAndMigrateDatabase();
  return databasePromise;
}

async function openAndMigrateDatabase() {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  await migrateDatabase(db);
  return db;
}
