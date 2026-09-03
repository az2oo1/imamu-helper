import 'dotenv/config';
import express from "express";
import compression from "compression";
import path from "path";
import fs from "fs";
import next from "next";
import { getDb } from "./src/db/index";
import { requestLogger, logger } from "./src/middleware/logger";
import { getFileFromStorage } from "./src/lib/storage";

import { seedDefaults } from './src/server/services/seed';
import { createAuthRouter } from './src/server/routes/auth';
import { createSubjectsRouter } from './src/server/routes/subjects';
import { createNewsRouter } from './src/server/routes/news';
import { createTutorialsRouter } from './src/server/routes/tutorials';
import { createAdminRouter } from './src/server/routes/admin';
import { createContributorsRouter } from './src/server/routes/contributors';

async function startServer() {
  // Wait for DB to be fully initialized (PGlite WASM or CockroachDB / PostgreSQL)
  const db = await getDb();

  const app = express();
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

  // Serve uploaded files from Object Storage or local disk fallback
  app.get('/uploads/:filename', async (req, res, next) => {
    const filename = req.params.filename;
    try {
      const file = await getFileFromStorage(filename);
      if (file) {
        if (file.mimeType) res.setHeader('Content-Type', file.mimeType);
        return res.send(file.buffer);
      }
    } catch (e) {}
    next();
  });
  app.use('/uploads', express.static(persistentUploadsDir));
  app.use('/uploads', express.static(legacyUploadsDir));

  app.use(express.json({ limit: '50mb' }));

  // Seed default tutorials & newbie portal links if empty
  await seedDefaults(db);

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Mount Modular Express Routers under /api
  app.use("/api", createAuthRouter(db));
  app.use("/api", createSubjectsRouter(db));
  app.use("/api", createNewsRouter(db));
  app.use("/api", createTutorialsRouter(db));
  app.use("/api", createAdminRouter(db));
  app.use("/api", createContributorsRouter(db));

  // JSON 404 fallback for unmatched /api routes (prevents Next.js HTML 404 rendering)
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
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

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
