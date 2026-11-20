import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { runMigrations } from './migrate';
import { seedData } from './seed';
import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

let db: Database.Database | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;

export function getDataDirectory(): string {
  try {
    if (app && typeof app.getPath === 'function') {
      const userDataPath = app.getPath('userData');
      const dataDir = path.join(userDataPath, 'AGC_Data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      return dataDir;
    }
  } catch {}

  const basePath = process.env.APPDATA || process.env.USERPROFILE || process.cwd();
  const dataDir = path.join(basePath, 'agc-billing', 'AGC_Data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

export function getDatabasePath(): string {
  return path.join(getDataDirectory(), 'agc-billing.db');
}

export function initDatabase(customPath?: string): { db: Database.Database; drizzleDb: ReturnType<typeof drizzle> } {
  if (db && drizzleDb && !customPath) {
    return { db, drizzleDb };
  }

  const dbPath = customPath || getDatabasePath();
  console.log('[Database] Initializing at:', dbPath);

  db = new Database(dbPath);
  
  // Enable WAL mode for file-based DBs
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
  }
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');

  // Run migrations
  runMigrations(db);

  // Initialize Drizzle ORM
  drizzleDb = drizzle(db, { schema });

  // Seed default data if needed
  seedData(db);

  console.log('[Database] Initialization complete');
  return { db, drizzleDb };
}

export function getDb(): Database.Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function getDrizzle(): ReturnType<typeof drizzle> {
  if (!drizzleDb) throw new Error('Drizzle not initialized');
  return drizzleDb;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    drizzleDb = null;
    console.log('[Database] Closed');
  }
}
