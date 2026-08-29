import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import AdmZip from 'adm-zip';
import { eq, desc, and, or, sql, inArray } from 'drizzle-orm';
import { 
  users, majors, subjects, course_resources, events, news, majorCourses, 
  news_sources, global_settings, tutorial_sections, tutorials, tutorial_feedback, 
  feedback_comments, activity_logs, newbie_links
} from '../../db/schema';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { logger } from '../../middleware/logger';
import { uploadFileToStorage, getFileFromStorage, deleteFileFromStorage, isS3Configured } from '../../lib/storage';
import { GoogleGenAI, Type } from '@google/genai';
import { importMsariData } from '../../../scripts/import_msari';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

const uploadStorage = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

async function checkAdmin(req: AuthRequest): Promise<boolean> {
  return !!req.user?.isAdmin;
}

export function createAdminRouter(db: any) {
  const router = express.Router();

  // Admin: Get all feedback
  router.get("/admin/tutorials/feedback", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const allFeedback = await db.select().from(tutorial_feedback);
      const enriched = await Promise.all(allFeedback.map(async (fb: any) => {
        const [userRec] = await db.select().from(users).where(eq(users.uid, fb.userId));
        const [tut] = await db.select().from(tutorials).where(eq(tutorials.id, fb.tutorialId));
        return {
          ...fb,
          tutorialTitle: tut ? tut.title : 'شرح محذوف',
          userName: userRec ? (userRec.userName || userRec.email?.split('@')[0]) : 'طالب',
          userEmail: userRec?.email,
          profilePicUrl: userRec?.profilePicUrl
        };
      }));
      res.json(enriched);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Create section
  router.post("/admin/tutorials/sections", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { title, icon, color } = req.body;
      const [sec] = await db.insert(tutorial_sections).values({ title, icon, color }).returning();
      res.json(sec);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Update section
  router.put("/admin/tutorials/sections/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const id = parseInt(req.params.id);
      const { title, icon, color } = req.body;
      const [sec] = await db.update(tutorial_sections).set({ title, icon, color }).where(eq(tutorial_sections.id, id)).returning();
      res.json(sec);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Delete section
  router.delete("/admin/tutorials/sections/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const id = parseInt(req.params.id);
      await db.delete(tutorial_sections).where(eq(tutorial_sections.id, id));
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Create tutorial
  router.post("/admin/tutorials", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { sectionId, title, description, text, steps, videoUrl, imageUrl, linkUrl, linkTitle } = req.body;
      const stepsJson = Array.isArray(steps) ? JSON.stringify(steps) : steps;
      const [tut] = await db.insert(tutorials).values({
        sectionId, title, description, text, steps: stepsJson, videoUrl, imageUrl, linkUrl, linkTitle
      }).returning();
      res.json({ ...tut, steps: JSON.parse(tut.steps) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Update tutorial
  router.put("/admin/tutorials/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const id = parseInt(req.params.id);
      const { sectionId, title, description, text, steps, videoUrl, imageUrl, linkUrl, linkTitle } = req.body;
      const stepsJson = Array.isArray(steps) ? JSON.stringify(steps) : steps;
      const [tut] = await db.update(tutorials).set({
        sectionId, title, description, text, steps: stepsJson, videoUrl, imageUrl, linkUrl, linkTitle
      }).where(eq(tutorials.id, id)).returning();
      res.json({ ...tut, steps: JSON.parse(tut.steps) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Delete tutorial
  router.delete("/admin/tutorials/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const id = parseInt(req.params.id);
      await db.delete(tutorials).where(eq(tutorials.id, id));
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Export Calendar ICS
  router.get("/calendar.ics", async (req, res) => {
    try {
      const allEvents = await db.select().from(events);
      let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//IMAMU Helper Calendar//AR\r\nCALSCALE:GREGORIAN\r\nMETHOD:PUBLISH\r\nX-WR-CALNAME:التقويم الأكاديمي - جامعة الإمام\r\n";

      for (const ev of allEvents) {
        const cleanDate = ev.date ? ev.date.replace(/-/g, '') : '';
        if (cleanDate.length === 8) {
          icsContent += "BEGIN:VEVENT\r\n";
          icsContent += `SUMMARY:${ev.title}\r\n`;
          icsContent += `DESCRIPTION:${ev.description || ''}\r\n`;
          icsContent += `DTSTART;VALUE=DATE:${cleanDate}\r\n`;
          icsContent += `DTEND;VALUE=DATE:${cleanDate}\r\n`;
          icsContent += `UID:event-${ev.id}@imamu-helper\r\n`;
          icsContent += "END:VEVENT\r\n";
        }
      }
      icsContent += "END:VCALENDAR\r\n";

      res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="imamu-calendar.ics"');
      res.send(icsContent);
    } catch (e) {
      console.error(e);
      res.status(500).send("Error generating ICS");
    }
  });

  // Admin Stats
  router.get("/admin/stats", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const usersCount = (await db.select({ count: sql`count(*)` }).from(users))[0].count;
      const subjectsCount = (await db.select({ count: sql`count(*)` }).from(subjects))[0].count;
      const resourcesCount = (await db.select({ count: sql`count(*)` }).from(course_resources))[0].count;
      const newsCount = (await db.select({ count: sql`count(*)` }).from(news))[0].count;
      const eventsCount = (await db.select({ count: sql`count(*)` }).from(events))[0].count;
      const tutorialsCount = (await db.select({ count: sql`count(*)` }).from(tutorials))[0].count;
      const feedbackCount = (await db.select({ count: sql`count(*)` }).from(tutorial_feedback))[0].count;

      res.json({
        usersCount: Number(usersCount),
        subjectsCount: Number(subjectsCount),
        resourcesCount: Number(resourcesCount),
        newsCount: Number(newsCount),
        eventsCount: Number(eventsCount),
        tutorialsCount: Number(tutorialsCount),
        feedbackCount: Number(feedbackCount)
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Users List
  router.get("/admin/users", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const userList = await db.select().from(users).orderBy(desc(users.id));
      res.json(userList.map((u: any) => {
        const { passwordHash, ...sanitized } = u;
        return sanitized;
      }));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Health
  router.get("/admin/health", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      res.json({
        status: "ok",
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        storageConfigured: isS3Configured()
      });
    } catch (e) {
      res.status(500).json({ error: "Health check error" });
    }
  });

  // Upload handler helper
  const handleUpload = async (req: AuthRequest & { files?: Express.Multer.File[] }, res: express.Response) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const uploadedFiles: any[] = [];
      for (const file of req.files) {
        const ext = path.extname(file.originalname);
        const filename = `${Date.now()}_${crypto.randomUUID().slice(0, 8)}${ext}`;
        const result = await uploadFileToStorage(file.buffer, filename, file.mimetype);
        uploadedFiles.push(result);
      }

      res.json({ files: uploadedFiles, url: uploadedFiles[0]?.url });
    } catch (e: any) {
      console.error("[Upload Error]", e);
      res.status(500).json({ error: e.message || "Failed to upload file" });
    }
  };

  router.post("/admin/upload", requireAuth, uploadStorage.any(), handleUpload as any);
  router.post("/upload", requireAuth, uploadStorage.any(), handleUpload as any);

  // Admin Deduplicate Subjects
  router.post("/admin/subjects/deduplicate", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const allSubj = await db.select().from(subjects);
      const codeMap = new Map<string, any[]>();
      for (const s of allSubj) {
        const key = s.code.toLowerCase().trim();
        if (!codeMap.has(key)) codeMap.set(key, []);
        codeMap.get(key)!.push(s);
      }

      let removedCount = 0;
      for (const [code, items] of codeMap.entries()) {
        if (items.length > 1) {
          items.sort((a, b) => b.id - a.id);
          const keep = items[0];
          const toRemove = items.slice(1);
          for (const rem of toRemove) {
            await db.delete(subjects).where(eq(subjects.id, rem.id));
            removedCount++;
          }
        }
      }
      res.json({ success: true, removedCount });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Add Subject
  router.post("/admin/subjects", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { code, name, creditHours, level, description, driveLink, whatsappLink } = req.body;
      const [subj] = await db.insert(subjects).values({
        code, name, creditHours: Number(creditHours) || 3, level: level ? Number(level) : null, description, driveLink, whatsappLink
      }).returning();
      res.json(subj);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Add Resource Handler
  const addResourceHandler = async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const subjectId = parseInt(req.params.subjectId);
      const { title, type, url, description } = req.body;
      const [resRec] = await db.insert(course_resources).values({
        subjectId, title, type: type || 'drive', url, description
      }).returning();
      res.json(resRec);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  };

  router.post("/admin/subjects/:subjectId/resources", requireAuth, addResourceHandler);
  router.post("/admin/courses/:subjectId/resources", requireAuth, addResourceHandler);

  // Admin Create Major
  router.post("/admin/majors", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { name, pdfUrl } = req.body;
      const [mjr] = await db.insert(majors).values({ name, pdfUrl }).returning();
      res.json(mjr);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Import Msari Data
  router.post("/admin/import-msari", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const result = await importMsariData();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to import Msari dataset" });
    }
  });

  // Admin Events (POST, PUT, DELETE)
  router.post("/admin/events", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { title, date, description } = req.body;
      const [ev] = await db.insert(events).values({ title, date, description }).returning();
      res.json(ev);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/admin/events/generate-mokafaa", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      let added = 0;
      for (let month = 0; month < 12; month++) {
        let dateObj = new Date(currentYear, month, 27);
        const day = dateObj.getDay();
        if (day === 5) dateObj.setDate(26); // Friday -> Thursday
        else if (day === 6) dateObj.setDate(28); // Saturday -> Sunday

        const dateStr = dateObj.toISOString().split('T')[0];
        const title = `إيداع المكافأة الجامعية - شهر ${month + 1}`;
        const existing = await db.select().from(events).where(eq(events.date, dateStr));
        if (existing.length === 0) {
          await db.insert(events).values({
            title, date: dateStr, description: "الموعد الرسمي لإيداع المكافأة الجامعية لطلاب جامعة الإمام"
          });
          added++;
        }
      }
      res.json({ success: true, added });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin News (POST, PUT, DELETE)
  router.post("/admin/news", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { content, source, authorName, authorHandle, authorAvatar, imageUrl, videoUrl, date } = req.body;
      const [n] = await db.insert(news).values({
        content, source, authorName, authorHandle, authorAvatar, imageUrl, videoUrl, date: date || new Date().toISOString().split('T')[0]
      }).returning();
      res.json(n);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin News Sources
  router.get("/admin/news_sources", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const sources = await db.select().from(news_sources);
      res.json(sources);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/admin/news_sources", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { handle, profilePicUrl, isActive } = req.body;
      const [ns] = await db.insert(news_sources).values({
        handle: handle.replace(/^@/, ''), profilePicUrl, isActive: isActive ?? true
      }).returning();
      res.json(ns);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Settings
  router.get("/settings", async (req, res): Promise<any> => {
    try {
      const settings = await db.query.global_settings.findFirst();
      res.json(settings || {});
    } catch (e) {
      res.status(500).json({ error: "Server error" });
    }
  });

  router.get("/admin/global_settings", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const settings = await db.query.global_settings.findFirst();
      res.json(settings || {});
    } catch (e) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Export DB Backup Zip
  router.get("/admin/export-db", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const zip = new AdmZip();
      const tables = {
        users: await db.select().from(users),
        majors: await db.select().from(majors),
        subjects: await db.select().from(subjects),
        course_resources: await db.select().from(course_resources),
        majorCourses: await db.select().from(majorCourses),
        events: await db.select().from(events),
        news: await db.select().from(news),
        news_sources: await db.select().from(news_sources),
        global_settings: await db.select().from(global_settings),
        tutorial_sections: await db.select().from(tutorial_sections),
        tutorials: await db.select().from(tutorials),
        newbie_links: await db.select().from(newbie_links),
      };

      zip.addFile("db_backup.json", Buffer.from(JSON.stringify(tables, null, 2), "utf8"));
      const zipBuffer = zip.toBuffer();

      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", `attachment; filename="imamu_backup_${Date.now()}.zip"`);
      res.send(zipBuffer);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Export failed" });
    }
  });

  // AI Parse Course PDF / Image
  router.post("/admin/ai_parse", requireAuth, upload.single("file"), async (req: AuthRequest & { file?: Express.Multer.File }, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { prompt, type } = req.body;
      const file = req.file;

      if (!file) return res.status(400).json({ error: "File required" });

      const contents: any[] = [];
      contents.push({
        inlineData: {
          mimeType: file.mimetype,
          data: file.buffer.toString("base64")
        }
      });
      contents.push(prompt || "Extract details from this academic document into structured JSON format.");

      let response: any;
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config: {
            responseMimeType: "application/json",
          }
        });
      } catch (primaryErr: any) {
        response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents,
          config: {
            responseMimeType: "application/json",
          }
        });
      }

      let parsed: any = [];
      try {
        parsed = JSON.parse(response.text?.trim() || "[]");
      } catch (e) {}

      res.json({ success: true, data: parsed });
    } catch (e: any) {
      console.error("[AI Parse Error]", e);
      res.status(500).json({ error: e.message || "Failed to parse document" });
    }
  });

  // Admin Activity Logs (Optimized aggregated count query!)
  router.get("/admin/logs", async (req: express.Request, res: express.Response) => {
    try {
      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;
      const category = req.query.category as string;
      const level = req.query.level as string;

      let query = db.select().from(activity_logs).$dynamic();
      if (category && category !== 'ALL') query = query.where(eq(activity_logs.category, category));
      if (level && level !== 'ALL') query = query.where(eq(activity_logs.level, level));

      const logsList = await query.orderBy(desc(activity_logs.createdAt)).limit(limit).offset(offset);
      res.json(logsList);
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  router.get("/admin/logs/stats", async (req: express.Request, res: express.Response) => {
    try {
      const counts: any = await db.select({
        category: activity_logs.category,
        count: sql<number>`count(*)`
      }).from(activity_logs).groupBy(activity_logs.category);

      const countsMap: Record<string, number> = {};
      let total = 0;
      for (const row of counts) {
        const cnt = Number(row.count || 0);
        countsMap[row.category] = cnt;
        total += cnt;
      }

      res.json({
        total,
        system: countsMap['SYSTEM'] || 0,
        auth: countsMap['AUTH'] || 0,
        admin: countsMap['ADMIN'] || 0,
        sync: countsMap['SYNC'] || 0,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch log stats" });
    }
  });

  router.delete("/admin/logs/clear", async (req: express.Request, res: express.Response) => {
    try {
      await db.delete(activity_logs);
      logger.admin("CLEAR_LOGS", "System activity logs cleared");
      res.json({ success: true, message: "Logs cleared successfully" });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to clear logs" });
    }
  });

  // Admin Terminal Exec Endpoint
  router.post("/admin/terminal/exec", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { command } = req.body;
      if (!command || typeof command !== 'string') {
        return res.status(400).json({ error: "Command string is required." });
      }

      const safeCommand = command.trim();
      if (!safeCommand) {
        return res.status(400).json({ error: "Empty command." });
      }

      const shellExec = process.platform === 'win32' ? undefined : '/bin/sh';

      exec(safeCommand, {
        cwd: process.cwd(),
        timeout: 35000,
        maxBuffer: 10 * 1024 * 1024,
        shell: shellExec,
      }, (error, stdout, stderr) => {
        res.json({
          success: !error,
          exitCode: error ? (error.code || 1) : 0,
          stdout: stdout || '',
          stderr: stderr || (error ? error.message : ''),
        });
      });
    } catch (err: any) {
      console.error("[Terminal Exec Error]", err);
      res.status(500).json({ error: err.message || "Execution error" });
    }
  });

  return router;
}
