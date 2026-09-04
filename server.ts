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
import { createSeoRouter } from './src/server/routes/seo';

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
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(buffer);
    } catch (err: any) {
      console.error('[PDF Proxy Error]', err);
      return res.status(500).send('Error proxying PDF');
    }
  });

  // Serve uploaded files from Object Storage or local disk fallback
  app.get('/uploads/:filename', async (req, res, next) => {
    const filename = req.params.filename;
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
        res.setHeader('Content-Disposition', 'inline; filename="' + encodeURIComponent(filename) + '"');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.send(file.buffer);
      }
    } catch (e) {}
    next();
  });

  const setInlineHeaders = (res: express.Response, filePath: string) => {
    if (filePath.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }
  };

  app.use('/uploads', express.static(persistentUploadsDir, { setHeaders: setInlineHeaders }));
  app.use('/uploads', express.static(legacyUploadsDir, { setHeaders: setInlineHeaders }));

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

  // Dynamic SEO Router (/sitemap.xml & /robots.txt)
  app.use("/", createSeoRouter(db));

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
