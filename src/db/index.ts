import 'dotenv/config';
import * as schema from './schema';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import path from 'path';
import fs from 'fs';

let activeDb: any;
let resolveDbReady!: () => void;
const dbReadyPromise = new Promise<void>((resolve) => {
  resolveDbReady = resolve;
});

/**
 * Returns the fully-initialized drizzle db instance.
 * Waits for PGlite WASM init and schema migrations to complete.
 * Usage: const db = await getDb(); const rows = await db.select().from(myTable);
 */
export async function getDb() {
  await dbReadyPromise;
  return activeDb as ReturnType<typeof drizzlePglite<typeof schema>>;
}

async function initializeDatabase() {
  const migrationsFolder = path.join(process.cwd(), 'drizzle');
  const dbDir = path.join(process.cwd(), '.data', 'db');
  fs.mkdirSync(dbDir, { recursive: true });

  // 1. Initialize PGlite as the default database
  console.log('[DB] Initializing PostgreSQL (PGlite) fallback with local persistence...');
  const memClient = new PGlite(dbDir);

  // Wait for PGlite WASM to fully initialize before running any queries
  await memClient.waitReady;
  console.log('[DB] PGlite WASM initialized.');

  const memDb = drizzlePglite(memClient, { schema });
  activeDb = memDb;

  try {
    console.log('[DB] Applying schema migrations to in-memory database...');
    await migrate(memDb, { migrationsFolder });
    console.log('[DB] In-memory database is ready.');
  } catch (err) {
    console.error('[DB] Failed to migrate in-memory database:', err);
  }

  // 2. If SQL_HOST is configured, try to connect to the physical database
  if (process.env.SQL_HOST) {
    console.log(`[DB] SQL_HOST is configured (${process.env.SQL_HOST}). Testing connection...`);
    const pool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      port: Number(process.env.SQL_PORT) || 5432,
      connectionTimeoutMillis: 5000,
    });

    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();

      // Connection succeeded! Swap activeDb to the physical database
      activeDb = drizzlePg(pool, { schema });
      console.log('[DB] Connected to physical PostgreSQL database. Swapped database reference.');
    } catch (err: any) {
      console.error(`[DB] Physical database connection failed: ${err.message || err}`);
      console.log('[DB] Staying on in-memory PostgreSQL (PGlite) fallback.');
      pool.end().catch(() => {});
    }
  } else {
    console.log('[DB] No SQL_HOST configured. Staying on in-memory PostgreSQL.');
  }

  // Resolve so all getDb() waiters receive the fully initialized db
  resolveDbReady();
}

// Start initialization immediately
initializeDatabase().catch(err => {
  console.error('[DB] Critical database initialization error:', err);
  resolveDbReady(); // Unblock waiters even on error
});
