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

let fallbackDb: any = null;
let activeDb: any = null;
let primaryDb: any = null;
let usingPrimary = false;

let resolveDbReady!: () => void;
const dbReadyPromise = new Promise<void>((resolve) => {
  resolveDbReady = resolve;
});

let resilientProxy: any = null;

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
                      console.warn(`[DB Resilience] Primary DB query.${String(tableProp)}.${String(methodProp)} failed, falling back to PGlite:`, err.message || err);
                      usingPrimary = false;
                      activeDb = fallbackDb;
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
              console.warn('[DB Resilience] Primary DB execute failed, falling back to PGlite:', err.message || err);
              usingPrimary = false;
              activeDb = fallbackDb;
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
              console.warn('[DB Resilience] Primary DB transaction failed, falling back to PGlite:', err.message || err);
              usingPrimary = false;
              activeDb = fallbackDb;
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
                console.warn('[DB Resilience] Primary DB operation failed, falling back to PGlite:', err.message || err);
                usingPrimary = false;
                activeDb = fallbackDb;
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
      await memClient.exec(`
        ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS twitter_auth_token text;
        ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS twitter_ct0 text;
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS description text;
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS syllabus text;
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS free_resources_url text;
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS paid_resources_url text;
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS avatar_url text;
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS banner_url text;
        ALTER TABLE subjects ADD COLUMN IF NOT EXISTS tags text;
        ALTER TABLE major_courses ADD COLUMN IF NOT EXISTS prereq text;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS student_email text;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS google_email text;
        CREATE INDEX IF NOT EXISTS idx_users_user_name ON users(user_name);
        CREATE TABLE IF NOT EXISTS "Course" (
          id text PRIMARY KEY,
          name text NOT NULL,
          code text UNIQUE NOT NULL,
          description text,
          syllabus text,
          "freeResourcesUrl" text,
          "paidResourcesUrl" text,
          "avatarUrl" text,
          "bannerUrl" text,
          tags text
        );
        CREATE TABLE IF NOT EXISTS course_resources (
          id serial PRIMARY KEY,
          subject_id integer NOT NULL,
          title text NOT NULL,
          type text NOT NULL DEFAULT 'drive',
          url text NOT NULL,
          description text,
          created_at timestamp DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS "User" (
          id text PRIMARY KEY,
          username text UNIQUE,
          "passwordHash" text,
          "studentEmail" text UNIQUE,
          "googleEmail" text UNIQUE,
          name text,
          role text DEFAULT 'USER'
        );
      `);
    } catch(e) {}
    console.log('[DB] Embedded database fallback is ready.');
    resolveDbReady();

  } catch (err: any) {
    console.warn('[DB] Embedded database migration notice:', err.message || err);
    resolveDbReady();
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
        connectionTimeoutMillis: 1500,
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
          connectionTimeoutMillis: 1500,
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
        await connectedPool.query(`
          ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS twitter_auth_token text;
          ALTER TABLE global_settings ADD COLUMN IF NOT EXISTS twitter_ct0 text;
          ALTER TABLE subjects ADD COLUMN IF NOT EXISTS description text;
          ALTER TABLE subjects ADD COLUMN IF NOT EXISTS syllabus text;
          ALTER TABLE subjects ADD COLUMN IF NOT EXISTS free_resources_url text;
          ALTER TABLE subjects ADD COLUMN IF NOT EXISTS paid_resources_url text;
          ALTER TABLE subjects ADD COLUMN IF NOT EXISTS avatar_url text;
          ALTER TABLE subjects ADD COLUMN IF NOT EXISTS banner_url text;
          ALTER TABLE subjects ADD COLUMN IF NOT EXISTS tags text;
          ALTER TABLE major_courses ADD COLUMN IF NOT EXISTS prereq text;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS student_email text;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS google_email text;
          CREATE INDEX IF NOT EXISTS idx_users_user_name ON users(user_name);
          CREATE TABLE IF NOT EXISTS "Course" (
            id text PRIMARY KEY,
            name text NOT NULL,
            code text UNIQUE NOT NULL,
            description text,
            syllabus text,
            "freeResourcesUrl" text,
            "paidResourcesUrl" text,
            "avatarUrl" text,
            "bannerUrl" text,
            tags text
          );
          CREATE TABLE IF NOT EXISTS course_resources (
            id serial PRIMARY KEY,
            subject_id integer NOT NULL,
            title text NOT NULL,
            type text NOT NULL DEFAULT 'drive',
            url text NOT NULL,
            description text,
            created_at timestamp DEFAULT now()
          );
          CREATE TABLE IF NOT EXISTS activity_logs (
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
          );
        `);
        console.log(`[DB] Schema column verifications applied to ${isCockroachDB ? 'CockroachDB' : 'PostgreSQL'}.`);
      } catch (altErr: any) {
        console.warn('[DB] Physical DB column verification notice:', altErr.message || altErr);
      }

      // Swap activeDb to connected CockroachDB server
      primaryDb = pgDb;
      activeDb = pgDb;
      usingPrimary = true;
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
