import 'dotenv/config';
import * as schema from './schema';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { Pool, PoolConfig, types } from 'pg';
types.setTypeParser(20, (val: string) => val); // Force INT8 (64-bit int) to string to prevent JS float precision loss
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import path from 'path';
import fs from 'fs';

let fallbackDb: any = null;
let activeDb: any = null;
let primaryDb: any = null;
let primaryPool: Pool | null = null;
let usingPrimary = false;
let healthCheckTimer: NodeJS.Timeout | null = null;

function startHealthCheck() {
  if (healthCheckTimer) return;
  healthCheckTimer = setInterval(async () => {
    if (!usingPrimary && primaryDb && primaryPool) {
      try {
        await primaryPool.query('SELECT 1');
        console.log('[DB Resilience] Primary DB connection restored! Re-activating primary database connection.');
        usingPrimary = true;
        activeDb = primaryDb;
      } catch (_err) {
        // Primary DB still unreachable, will retry on next interval
      }
    }
  }, 10000);
}

let resolveDbReady!: () => void;
const dbReadyPromise = new Promise<void>((resolve) => {
  resolveDbReady = resolve;
});

let resilientProxy: any = null;

const SCHEMA_VERIFICATION_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id serial PRIMARY KEY,
    uid text NOT NULL UNIQUE,
    user_name text,
    email text NOT NULL UNIQUE,
    student_email text,
    google_email text,
    password_hash text,
    phone text,
    major text,
    current_gpa varchar(10),
    finished_hours integer,
    completed_courses text,
    is_admin boolean DEFAULT false,
    profile_pic_url text,
    created_at timestamp DEFAULT now()
  )`,
  `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS description text`,
  `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS syllabus text`,
  `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS free_resources_url text`,
  `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS paid_resources_url text`,
  `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS avatar_url text`,
  `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS banner_url text`,
  `ALTER TABLE subjects ADD COLUMN IF NOT EXISTS tags text`,
  `ALTER TABLE major_courses ADD COLUMN IF NOT EXISTS prereq text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS student_email text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS google_email text`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false`,
  `CREATE INDEX IF NOT EXISTS idx_users_user_name ON users(user_name)`,
  `ALTER TABLE course_resources ADD COLUMN IF NOT EXISTS drive_link text`,
  `ALTER TABLE course_resources ADD COLUMN IF NOT EXISTS box_link text`,
  `ALTER TABLE course_resources ADD COLUMN IF NOT EXISTS whatsapp_link text`,
  `ALTER TABLE course_resources ADD COLUMN IF NOT EXISTS free_resources_url text`,
  `ALTER TABLE course_resources ADD COLUMN IF NOT EXISTS paid_resources_url text`,
  `ALTER TABLE course_resources ADD COLUMN IF NOT EXISTS avatar_url text`,
  `ALTER TABLE course_resources ADD COLUMN IF NOT EXISTS banner_url text`,
  `ALTER TABLE course_resources ALTER COLUMN subject_id DROP NOT NULL`,
  `CREATE TABLE IF NOT EXISTS course_resources (
    id serial PRIMARY KEY,
    subject_id integer,
    title text NOT NULL,
    type text NOT NULL DEFAULT 'drive',
    url text NOT NULL,
    drive_link text,
    box_link text,
    whatsapp_link text,
    free_resources_url text,
    paid_resources_url text,
    avatar_url text,
    banner_url text,
    description text,
    created_at timestamp DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS activity_logs (
    id serial PRIMARY KEY,
    level varchar(20) DEFAULT 'info' NOT NULL,
    category varchar(50) DEFAULT 'SYSTEM' NOT NULL,
    action text NOT NULL,
    message text NOT NULL,
    user_id text,
    user_email text,
    ip_address text,
    user_agent text,
    metadata text,
    created_at timestamp DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS tools (
    id serial PRIMARY KEY,
    title text NOT NULL,
    description text NOT NULL,
    link text NOT NULL,
    icon text,
    category text,
    created_at timestamp DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS contributors (
    id serial PRIMARY KEY,
    name text NOT NULL,
    role text NOT NULL,
    category text DEFAULT 'other' NOT NULL,
    photo_url text,
    user_id text,
    bio text,
    social_links text,
    linked_major text,
    linked_tools text,
    is_public boolean DEFAULT true,
    display_order integer DEFAULT 0,
    created_at timestamp DEFAULT now()
  )`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS is_holiday boolean DEFAULT false`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS is_holiday_end boolean DEFAULT false`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS is_semester_start boolean DEFAULT false`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS is_semester_end boolean DEFAULT false`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS is_eid boolean DEFAULT false`,
  `ALTER TABLE events ADD COLUMN IF NOT EXISTS is_national_day boolean DEFAULT false`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_permissions text`,
  `ALTER TABLE news_likes ALTER COLUMN news_id TYPE bigint`,
  `ALTER TABLE news_comments ALTER COLUMN news_id TYPE bigint`
];

function isConnectionError(err: any): boolean {
  if (!err) return false;
  const code = err.code || err?.cause?.code;
  if (code && typeof code === 'string') {
    if (
      code.startsWith('22') || // Data Exception (e.g. 22003 out of range)
      code.startsWith('23') || // Integrity Constraint (e.g. 23505 unique)
      code.startsWith('42') || // Syntax / Access Rule
      code.startsWith('02')    // No Data
    ) {
      return false;
    }
  }
  const msg = (err.message || err.toString() || err?.cause?.message || '').toLowerCase();
  return (
    msg.includes('econnaborted') ||
    msg.includes('econnrefused') ||
    msg.includes('econnreset') ||
    msg.includes('etimedout') ||
    msg.includes('connection terminated') ||
    msg.includes('connection closed') ||
    msg.includes('connection timeout') ||
    msg.includes('failed to connect') ||
    msg.includes('could not connect') ||
    msg.includes('terminating connection') ||
    code === '57P01' || // admin_shutdown
    code === '57P02' || // crash_shutdown
    code === '57P03' || // cannot_connect_now
    code === '08000' || // connection_exception
    code === '08003' || // connection_does_not_exist
    code === '08006'    // connection_failure
  );
}

async function applySchemaVerifications(runner: (sql: string) => Promise<any>) {
  for (const stmt of SCHEMA_VERIFICATION_STATEMENTS) {
    try {
      await runner(stmt);
    } catch (_e) {}
  }
}

function createResilientProxy() {
  return new Proxy({}, {
    get(_target, prop: string | symbol) {
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'then') return undefined;

      if (prop === 'query') {
        return new Proxy({}, {
          get(_qTarget, tableProp: string | symbol) {
            if (typeof tableProp === 'symbol') return undefined;
            return new Proxy({}, {
              get(_tTarget, methodProp: string | symbol) {
                if (typeof methodProp === 'symbol') return undefined;
                return async (...args: any[]) => {
                  if (usingPrimary && primaryDb) {
                    try {
                      return await primaryDb.query[tableProp][methodProp](...args);
                    } catch (err: any) {
                      if (isConnectionError(err)) {
                        console.warn(`[DB Resilience] Primary DB connection lost, falling back to PGlite:`, err.message || err);
                        usingPrimary = false;
                        activeDb = fallbackDb;
                      } else {
                        throw err;
                      }
                    }
                  }
                  return await fallbackDb.query[tableProp][methodProp](...args);
                };
              }
            });
          }
        });
      }

      if (prop === 'execute') {
        return async (...args: any[]) => {
          if (usingPrimary && primaryDb) {
            try {
              return await primaryDb.execute(...args);
            } catch (err: any) {
              if (isConnectionError(err)) {
                console.warn('[DB Resilience] Primary DB connection lost, falling back to PGlite:', err.message || err);
                usingPrimary = false;
                activeDb = fallbackDb;
              } else {
                throw err;
              }
            }
          }
          return await fallbackDb.execute(...args);
        };
      }

      if (prop === 'transaction') {
        return async (...args: any[]) => {
          if (usingPrimary && primaryDb) {
            try {
              return await primaryDb.transaction(...args);
            } catch (err: any) {
              if (isConnectionError(err)) {
                console.warn('[DB Resilience] Primary DB connection lost, falling back to PGlite:', err.message || err);
                usingPrimary = false;
                activeDb = fallbackDb;
              } else {
                throw err;
              }
            }
          }
          return await fallbackDb.transaction(...args);
        };
      }

      return (...initialArgs: any[]) => {
        return createChainBuilder(prop, initialArgs);
      };
    }
  });
}

function createChainBuilder(initialMethod: string, initialArgs: any[]) {
  const chain: Array<{ method: string; args: any[] }> = [
    { method: initialMethod, args: initialArgs }
  ];

  const proxyHandler: ProxyHandler<any> = {
    get(_target, prop: string | symbol) {
      if (typeof prop === 'symbol') {
        return undefined;
      }

      if (prop === 'then') {
        return (onfulfilled?: any, onrejected?: any) => {
          const runChain = async () => {
            if (usingPrimary && primaryDb) {
              try {
                let current = primaryDb;
                for (const item of chain) {
                  current = current[item.method](...item.args);
                }
                return await current;
              } catch (err: any) {
                if (isConnectionError(err)) {
                  console.warn('[DB Resilience] Primary DB connection lost, falling back to PGlite:', err.message || err);
                  usingPrimary = false;
                  activeDb = fallbackDb;
                } else {
                  throw err;
                }
              }
            }

            let current = fallbackDb || activeDb;
            if (!current) {
              throw new Error('[DB Resilience] Neither primary nor fallback database is available');
            }
            try {
              for (const item of chain) {
                if (typeof current[item.method] !== 'function') {
                  throw new Error(`Method ${item.method} is not supported on fallback database`);
                }
                current = current[item.method](...item.args);
              }
              return await current;
            } catch (err: any) {
              if (err?.message?.includes('Aborted()') || err?.toString()?.includes('Aborted()') || err?.cause?.toString()?.includes('Aborted()')) {
                console.warn('[DB Resilience] PGlite WASM aborted, creating fresh in-memory PGlite fallback...');
                const freshClient = new PGlite();
                await freshClient.waitReady;
                const freshDb = drizzlePglite(freshClient, { schema });
                fallbackDb = freshDb;
                activeDb = freshDb;
                let retryCurrent: any = freshDb;
                for (const item of chain) {
                  retryCurrent = retryCurrent[item.method](...item.args);
                }
                return await retryCurrent;
              }
              throw err;
            }
          };

          return runChain().then(onfulfilled, onrejected);
        };
      }

      if (prop === 'catch') {
        return (onrejected?: any) => {
          return (proxyObj as any).then(undefined, onrejected);
        };
      }

      if (prop === 'inspect' || prop === 'toJSON' || prop === 'toString' || prop === 'valueOf') {
        return undefined;
      }

      return (...args: any[]) => {
        chain.push({ method: prop, args });
        return proxyObj;
      };
    }
  };

  const proxyObj = new Proxy({}, proxyHandler);
  return proxyObj;
}

/**
 * Returns the fully-initialized drizzle db instance.
 * Waits for WASM/CockroachDB/PostgreSQL init and schema migrations to complete.
 * Usage: const db = await getDb(); const rows = await db.select().from(myTable);
 */
export async function getDb() {
  await dbReadyPromise;
  if (!resilientProxy) {
    resilientProxy = createResilientProxy();
  }
  return resilientProxy as ReturnType<typeof drizzlePglite<typeof schema>>;
}

async function initializeDatabase() {
  const migrationsFolder = path.join(process.cwd(), 'drizzle');
  const dbDir = path.join(process.cwd(), '.data', 'db');
  fs.mkdirSync(dbDir, { recursive: true });

  console.log('[DB] Initializing PGlite embedded database fallback...');
  let memClient: PGlite;
  try {
    memClient = process.env.NODE_ENV === 'test' ? new PGlite('memory://') : new PGlite(dbDir);
    await memClient.waitReady;
  } catch (pgliteErr: any) {
    console.warn('[DB] Persistent PGlite initialization failed, resetting to fresh in-memory database:', pgliteErr.message || pgliteErr);
    memClient = new PGlite('memory://');
    await memClient.waitReady;
  }
  const memDb = drizzlePglite(memClient, { schema });
  fallbackDb = memDb;
  activeDb = memDb;
  usingPrimary = false;

  try {
    if (fs.existsSync(path.join(migrationsFolder, 'meta', '_journal.json'))) {
      console.log('[DB] Applying schema migrations to embedded database...');
      await migratePglite(memDb, { migrationsFolder });
    }
    try {
      await applySchemaVerifications((sql) => memClient.exec(sql));
      console.log('[DB] Embedded database fallback is ready.');
    } catch (e) {}
  } catch (err: any) {
    console.warn('[DB] Embedded database migration notice:', err.message || err);
  }

  // 2. Check for CockroachDB / PostgreSQL connection configuration
  const dbUrl = process.env.DATABASE_URL || process.env.COCKROACH_URL;
  const primaryHost = process.env.SQL_HOST || process.env.COCKROACH_HOST;
  const backupHost = process.env.SQL_BACKUP_HOST || process.env.COCKROACH_BACKUP_HOST;

  if (process.env.NODE_ENV !== 'test' && (dbUrl || primaryHost)) {
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
        connectionTimeoutMillis: 3000,
      };
      if ((process.env.SQL_SSL === 'true' || process.env.COCKROACH_SSL === 'true' || dbUrl.includes('sslmode=require')) && !dbUrl.includes('sslmode=disable')) {
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
          connectionTimeoutMillis: 3000,
        };

        if ((process.env.SQL_SSL === 'true' || process.env.COCKROACH_SSL === 'true') && process.env.SQL_SSL !== 'false') {
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
      connectedPool.on('error', (err) => {
        console.warn('[DB Resilience] CockroachDB pool connection error, falling back to PGlite:', err.message || err);
        usingPrimary = false;
        activeDb = fallbackDb;
      });

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

      // Ensure all dynamically added columns and tables exist on physical CockroachDB / PostgreSQL
      try {
        await applySchemaVerifications((sql) => connectedPool.query(sql));
        console.log(`[DB] Schema column verifications applied to ${isCockroachDB ? 'CockroachDB' : 'PostgreSQL'}.`);
      } catch (altErr: any) {
        console.warn('[DB] Physical DB column verification notice:', altErr.message || altErr);
      }

      // Swap activeDb to connected CockroachDB server
      primaryDb = pgDb;
      primaryPool = connectedPool;
      activeDb = pgDb;
      usingPrimary = true;
      startHealthCheck();
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
