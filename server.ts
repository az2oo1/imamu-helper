import 'dotenv/config';
import express from "express";
import compression from "compression";
import path from "path";
import fs from "fs";
import next from "next";
import { getDb, checkDatabaseHealth, closeDatabaseConnections } from "./src/db/index";
import { requestLogger, logger } from "./src/middleware/logger";
import { getFileFromStorage, ensureAllBucketsExist } from "./src/lib/storage";

import { extractTelegramChannelPosts } from './src/server/services/telegram';
import { news_sources } from './src/db/schema';
import { sql } from 'drizzle-orm';
import { generalApiLimiter, authApiLimiter } from './src/middleware/rateLimiter';
import { createAuthRouter } from './src/server/routes/auth';
import { createSubjectsRouter } from './src/server/routes/subjects';
import { createSectionsRouter } from './src/server/routes/sections';
import { createNewsRouter } from './src/server/routes/news';
import { createTutorialsRouter } from './src/server/routes/tutorials';
import { createAdminRouter } from './src/server/routes/admin';
import { createContributorsRouter } from './src/server/routes/contributors';
import { createSeoRouter } from './src/server/routes/seo';
import { createAuthenticatedAccountsRouter } from './src/server/routes/authenticatedAccounts';

async function startServer() {
  // Wait for DB to be fully initialized (PGlite WASM or PostgreSQL)
  const db = await getDb();

  const app = express();
  const trustProxyEnv = process.env.TRUST_PROXY;
  if (trustProxyEnv !== undefined) {
    const parsedNum = Number(trustProxyEnv);
    app.set('trust proxy', isNaN(parsedNum) ? (trustProxyEnv === 'true' ? true : trustProxyEnv === 'false' ? false : trustProxyEnv) : parsedNum);
  } else {
    app.set('trust proxy', 1);
  }
  app.use(requestLogger);
  app.use(compression());
  const PORT = Number(process.env.PORT) || 3000;

  // Make sure persistent uploads folder exists outside public/ so Next.js builds won't clear it
  const persistentUploadsDir = path.join(process.cwd(), 'uploads');
  const legacyUploadsDir = path.join(process.cwd(), 'public/uploads');
  if (!fs.existsSync(persistentUploadsDir)) {
    fs.mkdirSync(persistentUploadsDir, { recursive: true });
  }
  if (!fs.existsSync(legacyUploadsDir)) {
    fs.mkdirSync(legacyUploadsDir, { recursive: true });
  }

  // PDF Proxy Route to serve any remote PDF inline with guaranteed Content-Type & Content-Disposition
  app.get('/api/pdf-proxy', async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send('Missing url parameter');

    try {
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/pdf,*/*'
        }
      });

      if (!response.ok) {
        return res.status(response.status).send('Failed to fetch PDF');
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      return res.send(buffer);
    } catch (err: any) {
      console.error('[PDF Proxy Error]', err);
      return res.status(500).send('Error proxying PDF');
    }
  });

  // Serve uploaded files from Object Storage or local disk fallback
  app.get('/uploads/*', async (req, res, next) => {
    const filename = req.params[0];
    if (!filename) return next();
    try {
      const file = await getFileFromStorage(filename);
      if (file) {
        let mimeType = file.mimeType;
        if (!mimeType || mimeType === 'application/octet-stream' || filename.toLowerCase().endsWith('.pdf')) {
          if (filename.toLowerCase().endsWith('.pdf')) mimeType = 'application/pdf';
          else if (filename.toLowerCase().endsWith('.png')) mimeType = 'image/png';
          else if (filename.toLowerCase().endsWith('.jpg') || filename.toLowerCase().endsWith('.jpeg')) mimeType = 'image/jpeg';
        }
        if (mimeType) res.setHeader('Content-Type', mimeType);
        res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(path.basename(filename)) + '"');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');

        const etag = `W/"${file.buffer.length.toString(16)}-${file.buffer.slice(0, 16).toString('hex')}"`;
        res.setHeader('ETag', etag);
        if (req.headers['if-none-match'] === etag) {
          return res.status(304).end();
        }

        return res.send(file.buffer);
      }
    } catch (e) {}
    next();
  });

  const setInlineHeaders = (res: express.Response, filePath: string) => {
    res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
    if (filePath.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  };

  const staticUploadsConfig = { maxAge: '1d', setHeaders: setInlineHeaders };
  app.use('/uploads', express.static(persistentUploadsDir, staticUploadsConfig));
  app.use('/uploads', express.static(legacyUploadsDir, staticUploadsConfig));

  app.use(express.json({ limit: '50mb' }));

  // Ensure all dedicated S3 buckets exist in Garage Object Storage in the background
  ensureAllBucketsExist().catch(err => console.warn('[Storage] Bucket init notice:', err.message || err));

  let isShuttingDown = false;

  // Kubernetes Liveness Probes: /healthz & /api/health
  const handleLiveness = (_req: express.Request, res: express.Response) => {
    res.json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  };
  app.get("/healthz", handleLiveness);
  app.get("/api/health", handleLiveness);

  // Kubernetes Readiness Probes: /readyz & /api/ready
  const handleReadiness = async (_req: express.Request, res: express.Response) => {
    if (isShuttingDown) {
      return res.status(503).json({
        status: "shutting_down",
        message: "Server is in graceful shutdown process"
      });
    }
    const dbHealth = await checkDatabaseHealth();
    if (dbHealth.status === 'unhealthy') {
      return res.status(503).json({
        status: "unhealthy",
        database: dbHealth,
        timestamp: new Date().toISOString()
      });
    }
    return res.status(200).json({
      status: "ready",
      database: dbHealth,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  };
  app.get("/readyz", handleReadiness);
  app.get("/api/ready", handleReadiness);

  // Apply rate limiting before routes
  app.use("/api/auth", authApiLimiter);
  app.use("/api", generalApiLimiter);

  // Mount Modular Express Routers under /api
  app.use("/api", createAuthRouter(db));
  app.use("/api", createSubjectsRouter(db));
  app.use("/api", createSectionsRouter(db));
  app.use("/api", createNewsRouter(db));
  app.use("/api", createTutorialsRouter(db));
  app.use("/api", createAdminRouter(db));
  app.use("/api", createContributorsRouter(db));
  app.use("/api", createAuthenticatedAccountsRouter(db));

  // Dynamic SEO Router (/sitemap.xml & /robots.txt)
  app.use("/", createSeoRouter(db));

  // Start periodic Telegram channel news fetcher worker with distributed locking
  const startPeriodicTelegramFetcher = () => {
    if (process.env.DISABLE_BACKGROUND_WORKERS === 'true') {
      logger.info('[Background Worker] Disabled via DISABLE_BACKGROUND_WORKERS');
      return;
    }

    const TELEGRAM_CRON_LOCK_ID = 84729104;

    const fetchAllSources = async () => {
      let lockAcquired = true;
      try {
        const lockResult: any = await db.execute(sql`SELECT pg_try_advisory_lock(${TELEGRAM_CRON_LOCK_ID}) as locked`);
        lockAcquired = lockResult?.rows?.[0]?.locked ?? true;
      } catch (_e) {
        lockAcquired = true;
      }

      if (!lockAcquired) {
        // Another instance is already executing the worker
        return;
      }

      try {
        const settings = await db.query.global_settings.findFirst().catch(() => null);
        if (!settings?.autoFetchTelegram) {
          return;
        }

        const sources = await db.select().from(news_sources);
        for (const source of sources) {
          if (source.handle && source.isActive !== false) {
            try {
              await extractTelegramChannelPosts(source.handle, 25, db);
            } catch (err: any) {
              console.warn(`[Periodic Fetcher Warning] Channel @${source.handle}:`, err.message || err);
            }
          }
        }
      } catch (e) {
        console.error('[Periodic Fetcher Error]', e);
      } finally {
        try {
          await db.execute(sql`SELECT pg_advisory_unlock(${TELEGRAM_CRON_LOCK_ID})`);
        } catch (_e) {}
      }
    };

    setTimeout(fetchAllSources, 10000);
    setInterval(fetchAllSources, 30 * 60 * 1000);
  };

  startPeriodicTelegramFetcher();

  // JSON 404 fallback for unmatched /api routes (prevents Next.js HTML 404 rendering)
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  // 404 fallback for missing /uploads files (prevents routing missing images to Next.js SSR)
  app.all("/uploads/*", (req, res) => {
    res.status(404).send("File not found");
  });

  // Next.js SSR request handling
  if (process.env.NODE_ENV !== "test") {
    const isProd = process.env.NODE_ENV === "production" || (typeof process !== 'undefined' && process.argv[1]?.endsWith('server.cjs'));
    const dev = !isProd;
    const nextApp = next({ dev });
    const handle = nextApp.getRequestHandler();
    await nextApp.prepare();

    app.all('*', (req, res) => {
      return handle(req, res);
    });
  } else {
    app.all('*', (req, res) => {
      res.status(404).json({ error: "Not found" });
    });
  }

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error("Express Error:", err);
    if (req.path.startsWith('/api/')) {
      res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
    } else {
      next(err);
    }
  });

  const server = app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown handling for Kubernetes
  const gracefulShutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);

    const shutdownTimeoutMs = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 15000;
    const forceExitTimer = setTimeout(() => {
      logger.error(`Graceful shutdown timed out (${shutdownTimeoutMs}ms). Forcing exit.`);
      process.exit(1);
    }, shutdownTimeoutMs);
    if (forceExitTimer.unref) forceExitTimer.unref();

    server.close(async (err) => {
      if (err) {
        console.error('[Shutdown Error] Error closing HTTP server:', err);
        logger.error('SYSTEM', 'SHUTDOWN_ERROR', err?.message || String(err));
        process.exit(1);
      }
      logger.info('SYSTEM', 'SHUTDOWN', 'HTTP server closed. Draining database connection pools...');
      try {
        await closeDatabaseConnections();
        logger.info('SYSTEM', 'SHUTDOWN', 'Database connections closed cleanly. Exiting.');
        process.exit(0);
      } catch (dbErr: any) {
        console.error('[Shutdown Error] Error closing database connections:', dbErr);
        logger.error('SYSTEM', 'DB_SHUTDOWN_ERROR', dbErr?.message || String(dbErr));
        process.exit(1);
      }
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

startServer();
