import 'dotenv/config';
import * as schema from './schema';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { Pool, PoolConfig } from 'pg';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import path from 'path';
import fs from 'fs';

let activeDb: any;
let resolveDbReady!: () => void;
const dbReadyPromise = new Promise<void>((resolve) => {
  resolveDbReady = resolve;
});

/**
 * Returns the fully-initialized drizzle db instance.
 * Waits for WASM/CockroachDB/PostgreSQL init and schema migrations to complete.
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

  // 1. Initialize PGlite as the default fallback database
  console.log('[DB] Initializing PGlite embedded database fallback...');
  const memClient = new PGlite(dbDir);
  await memClient.waitReady;
  const memDb = drizzlePglite(memClient, { schema });
  activeDb = memDb;

  try {
    console.log('[DB] Applying schema migrations to embedded database...');
    await migratePglite(memDb, { migrationsFolder });
    try {
      await memClient.exec(`
        ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS twitter_auth_token text;
        ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS twitter_ct0 text;
      `);
    } catch(e) {}
    console.log('[DB] Embedded database fallback is ready.');
  } catch (err) {
    console.error('[DB] Failed to migrate embedded database:', err);
  }

  // 2. Check for CockroachDB / PostgreSQL connection configuration
  const dbUrl = process.env.DATABASE_URL || process.env.COCKROACH_URL;
  const primaryHost = process.env.SQL_HOST || process.env.COCKROACH_HOST;
  const backupHost = process.env.SQL_BACKUP_HOST || process.env.COCKROACH_BACKUP_HOST;

  if (dbUrl || primaryHost) {
    console.log('[DB] Physical Database (CockroachDB) configuration detected. Initializing connection...');
    
    // Prepare list of hosts to attempt (Primary first, then Secondary/Backup server)
    const hostList: string[] = [];
    if (primaryHost) {
      // Split comma separated hosts if present
      primaryHost.split(',').forEach(h => hostList.push(h.trim()));
    }
    if (backupHost) {
      backupHost.split(',').forEach(h => {
        const trimmed = h.trim();
        if (!hostList.includes(trimmed)) hostList.push(trimmed);
      });
    }

    let connectedPool: Pool | null = null;
    let isCockroachDB = false;

    if (dbUrl) {
      const poolConfig: PoolConfig = {
        connectionString: dbUrl,
        connectionTimeoutMillis: 8000,
      };
      if (process.env.SQL_SSL === 'true' || process.env.COCKROACH_SSL === 'true' || dbUrl.includes('sslmode=')) {
        poolConfig.ssl = {
          rejectUnauthorized: process.env.SQL_SSL_REJECT_UNAUTHORIZED !== 'false',
        };
      }
      const pool = new Pool(poolConfig);
      try {
        const client = await pool.connect();
        const res = await client.query("SELECT version()");
        const versionStr = res.rows[0]?.version || '';
        isCockroachDB = versionStr.toLowerCase().includes('cockroachdb');
        client.release();
        connectedPool = pool;
        console.log(`[DB] Successfully connected via DATABASE_URL to ${isCockroachDB ? 'CockroachDB' : 'PostgreSQL'}`);
      } catch (err: any) {
        console.warn(`[DB] Primary DATABASE_URL connection failed: ${err.message || err}`);
        pool.end().catch(() => {});
      }
    }

    // Try discrete hosts if DATABASE_URL was not set or failed
    if (!connectedPool && hostList.length > 0) {
      for (let i = 0; i < hostList.length; i++) {
        const host = hostList[i];
        const isBackupNode = i > 0;
        console.log(`[DB] Attempting connection to ${isBackupNode ? 'Backup' : 'Primary'} CockroachDB server: ${host}...`);

        const isCockroach = !!(host.includes('cockroach') || process.env.COCKROACH_HOST);
        const defaultPort = isCockroach ? 26257 : 5432;
        const port = Number(process.env.SQL_PORT || process.env.COCKROACH_PORT) || defaultPort;

        const poolConfig: PoolConfig = {
          host,
          user: process.env.SQL_USER || process.env.COCKROACH_USER || 'root',
          password: process.env.SQL_PASSWORD || process.env.COCKROACH_PASSWORD || '',
          database: process.env.SQL_DB_NAME || process.env.COCKROACH_DB_NAME || 'defaultdb',
          port,
          connectionTimeoutMillis: 8000,
        };

        if (process.env.SQL_SSL === 'true' || process.env.COCKROACH_SSL === 'true' || isCockroach) {
          poolConfig.ssl = {
            rejectUnauthorized: process.env.SQL_SSL_REJECT_UNAUTHORIZED === 'true',
          };
        }

        const pool = new Pool(poolConfig);
        try {
          const client = await pool.connect();
          const res = await client.query("SELECT version()");
          const versionStr = res.rows[0]?.version || '';
          isCockroachDB = versionStr.toLowerCase().includes('cockroachdb');
          client.release();

          connectedPool = pool;
          console.log(`[DB] Successfully connected to ${isBackupNode ? 'Backup' : 'Primary'} server (${host}) running ${isCockroachDB ? 'CockroachDB' : 'PostgreSQL'}`);
          break; // Stop loop once connected
        } catch (err: any) {
          console.error(`[DB] Server (${host}) connection failed: ${err.message || err}`);
          pool.end().catch(() => {});
        }
      }
    }

    if (connectedPool) {
      const pgDb = drizzlePg(connectedPool, { schema });

      // Run migrations on physical CockroachDB / PostgreSQL database if migration folder exists
      if (fs.existsSync(migrationsFolder)) {
        try {
          console.log(`[DB] Applying schema migrations to ${isCockroachDB ? 'CockroachDB' : 'PostgreSQL'}...`);
          await migratePg(pgDb, { migrationsFolder });
          console.log(`[DB] Schema migrations applied successfully.`);
        } catch (migErr: any) {
          console.warn(`[DB] Migration warning: ${migErr.message || migErr}`);
        }
      }

      // Swap activeDb to connected CockroachDB server
      activeDb = pgDb;
      console.log(`[DB] Swapped active DB reference to physical database.`);
    } else {
      console.log('[DB] All physical CockroachDB host connection attempts failed. Staying on embedded database (PGlite) fallback.');
    }
  } else {
    console.log('[DB] No physical database configured. Using embedded database fallback.');
  }

  resolveDbReady();
}

// Start initialization immediately
initializeDatabase().catch(err => {
  console.error('[DB] Critical database initialization error:', err);
  resolveDbReady();
});

