import express from 'express';
import path from 'path';
import crypto from 'crypto';
import AdmZip from 'adm-zip';
import { sql, eq } from 'drizzle-orm';
import { 
  users, majors, subjects, course_resources, majorCourses, 
  events, news, news_sources, global_settings, tutorial_sections, 
  tutorials, app_feedback 
} from '../../../db/schema';
import { requireAuth, AuthRequest } from '../../../middleware/auth';
import { uploadFileToStorage, isS3Configured } from '../../../lib/storage';
import { syncExternalImagesToStorage } from '../../services/seed';
import { cleanupUnregisteredStorageFiles } from '../../../lib/storageCleanup';
import { checkAdmin, uploadStorage } from './common';

export function createAdminSystemRouter(db: any) {
  const router = express.Router();

  // Admin Stats
  router.get("/admin/stats", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const [
        [uRes], [mRes], [sRes], [rRes], [nRes], [eRes], [tRes], [fRes]
      ] = await Promise.all([
        db.select({ count: sql`count(*)` }).from(users),
        db.select({ count: sql`count(*)` }).from(majors),
        db.select({ count: sql`count(*)` }).from(subjects),
        db.select({ count: sql`count(*)` }).from(course_resources),
        db.select({ count: sql`count(*)` }).from(news),
        db.select({ count: sql`count(*)` }).from(events),
        db.select({ count: sql`count(*)` }).from(tutorials),
        db.select({ count: sql`count(*)` }).from(app_feedback),
      ]);

      const usersCount = Number(uRes?.count || 0);
      let majorsCount = Number(mRes?.count || 0);
      if (majorsCount === 0) {
        await db.insert(majors).values([
          { name: 'علوم الحاسب' },
          { name: 'تقنية المعلومات' },
          { name: 'نظم المعلومات' }
        ]).catch(() => {});
        const [freshM] = await db.select({ count: sql`count(*)` }).from(majors);
        majorsCount = Number(freshM?.count || 3);
      }
      const subjectsCount = Number(sRes?.count || 0);
      const resourcesCount = Number(rRes?.count || 0);
      const newsCount = Number(nRes?.count || 0);
      const eventsCount = Number(eRes?.count || 0);
      const tutorialsCount = Number(tRes?.count || 0);
      const feedbackCount = Number(fRes?.count || 0);

      res.json({
        totalUsers: usersCount,
        totalMajors: majorsCount,
        totalSubjects: subjectsCount,
        totalResources: resourcesCount,
        totalNews: newsCount,
        totalEvents: eventsCount,
        totalTutorials: tutorialsCount,
        totalFeedback: feedbackCount,

        usersCount,
        majorsCount,
        subjectsCount,
        resourcesCount,
        newsCount,
        eventsCount,
        tutorialsCount,
        feedbackCount,

        users: usersCount,
        majors: majorsCount,
        subjects: subjectsCount,
        events: eventsCount
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Health
  router.get("/admin/health", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const mem = process.memoryUsage();
      const heapUsedMB = Math.round(mem.heapUsed / (1024 * 1024));
      const heapTotalMB = Math.round(mem.heapTotal / (1024 * 1024));
      const rssMB = Math.round(mem.rss / (1024 * 1024));

      res.json({
        status: "ok",
        uptime: process.uptime(),
        memoryUsage: mem,
        memory: {
          heapUsed: heapUsedMB,
          heapTotal: heapTotalMB,
          rss: rssMB,
        },
        dbStatus: "connected",
        storageStatus: isS3Configured() ? "S3 Storage" : "Local Storage",
        storageConfigured: isS3Configured(),
        nodeVersion: process.version,
        platform: process.platform,
      });
    } catch (e) {
      res.status(500).json({ error: "Health check error" });
    }
  });

  // Upload handler helper
  const handleUpload = async (req: AuthRequest & { files?: Express.Multer.File[] }, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const category = (req.body?.category || req.query?.category || req.body?.type || req.query?.type || '').toString();

      const uniqueFiles: Express.Multer.File[] = [];
      const seenHashes = new Set<string>();
      for (const file of req.files) {
        const hash = crypto.createHash('md5').update(file.buffer).digest('hex');
        if (!seenHashes.has(hash)) {
          seenHashes.add(hash);
          uniqueFiles.push(file);
        }
      }

      const uploadedFiles: any[] = [];
      for (const file of uniqueFiles) {
        const ext = path.extname(file.originalname).toLowerCase();
        const rawBase = path.basename(file.originalname, ext);

        let cleanBase = rawBase
          .normalize('NFC')
          .replace(/[^\w\u0600-\u06FF\s-]/g, '')
          .trim()
          .replace(/[\s+]+/g, '_');

        if (!cleanBase) {
          cleanBase = category || 'file';
        }

        const filename = `${cleanBase}_${crypto.randomUUID().slice(0, 4)}${ext}`;
        const result = await uploadFileToStorage(file.buffer, filename, file.mimetype, category);
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

  // Sync external images to Garage S3 Storage manually
  router.post("/admin/storage/sync-images", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      await syncExternalImagesToStorage(db);
      res.json({ success: true, message: "External images migrated to Garage S3 Storage successfully" });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to sync images to storage" });
    }
  });

  // Purge any storage files not referenced in DB
  router.post("/admin/storage/cleanup", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const result = await cleanupUnregisteredStorageFiles(db);
      res.json({ 
        success: true, 
        message: `Successfully deleted ${result.totalDeletedCount} unregistered storage files (${(result.totalFreedBytes / 1024 / 1024).toFixed(2)} MB freed)`,
        ...result 
      });
    } catch (e: any) {
      console.error("[Storage Cleanup Error]", e);
      res.status(500).json({ error: e.message || "Failed to perform storage cleanup" });
    }
  });

  // Fetch WhatsApp Group Avatar
  router.post("/admin/fetch-whatsapp-avatar", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const { whatsappUrl } = req.body;
      const rawUrl = String(whatsappUrl || '').trim();

      if (!rawUrl || (!rawUrl.includes('chat.whatsapp.com') && !rawUrl.includes('wa.me'))) {
        return res.status(400).json({ error: "الرجاء إدخال رابط مجموعة واتساب صحيح (chat.whatsapp.com)" });
      }

      const resp = await fetch(rawUrl, {
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      if (!resp.ok) {
        return res.status(404).json({ error: "لم يتم التمكن من تصفح رابط الواتساب" });
      }

      const html = await resp.text();
      const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

      if (!ogMatch || !ogMatch[1]) {
        return res.status(404).json({ error: "لم يتم العثور على صورة شخصية لهذه المجموعة في الواتساب" });
      }

      const imageUrl = ogMatch[1].replace(/&amp;/g, '&');
      const imageResp = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!imageResp.ok) {
        return res.status(500).json({ error: "تعذر تحميل ملف الصورة من سيرفر الواتساب" });
      }

      const contentType = imageResp.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await imageResp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const filename = `wa_avatar_${Date.now()}_${crypto.randomUUID().slice(0, 8)}.jpg`;
      const uploadResult = await uploadFileToStorage(buffer, filename, contentType);

      res.json({
        success: true,
        avatarUrl: uploadResult.url,
        message: "تم جلب وحفظ صورة مجموعة الواتساب بنجاح في التخزين المباشر"
      });
    } catch (e: any) {
      console.error("[Fetch WhatsApp Avatar Error]", e);
      res.status(500).json({ error: e.message || "فشل جلب صورة الواتساب" });
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

  router.put("/admin/global_settings", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { 
        fetchRangeDays, autoDeleteDays, autoFetchTelegram,
        smtpHost, smtpPort, smtpUser, smtpPass, 
        imapHost, imapPort, imapSecure, 
        semesterStartDate, semesterEndDate, apiToken
      } = req.body;

      const existing = await db.query.global_settings.findFirst();

      const updateData = {
        fetchRangeDays: fetchRangeDays !== undefined ? Number(fetchRangeDays) : (existing?.fetchRangeDays ?? 30),
        autoDeleteDays: autoDeleteDays !== undefined ? Number(autoDeleteDays) : (existing?.autoDeleteDays ?? 30),
        autoFetchTelegram: autoFetchTelegram !== undefined ? Boolean(autoFetchTelegram) : (existing?.autoFetchTelegram ?? false),
        smtpHost: smtpHost !== undefined ? (smtpHost || null) : (existing?.smtpHost ?? null),
        smtpPort: smtpPort ? Number(smtpPort) : (existing?.smtpPort ?? null),
        smtpUser: smtpUser !== undefined ? (smtpUser || null) : (existing?.smtpUser ?? null),
        smtpPass: smtpPass !== undefined ? (smtpPass || null) : (existing?.smtpPass ?? null),
        imapHost: imapHost !== undefined ? (imapHost || null) : (existing?.imapHost ?? null),
        imapPort: imapPort ? Number(imapPort) : (existing?.imapPort ?? null),
        imapSecure: imapSecure !== undefined ? Boolean(imapSecure) : (existing?.imapSecure ?? true),
        semesterStartDate: semesterStartDate !== undefined ? (semesterStartDate || null) : (existing?.semesterStartDate ?? null),
        semesterEndDate: semesterEndDate !== undefined ? (semesterEndDate || null) : (existing?.semesterEndDate ?? null),
        apiToken: apiToken !== undefined ? (apiToken || null) : (existing?.apiToken ?? null),
      };

      let result;
      if (existing) {
        [result] = await db.update(global_settings).set(updateData).where(eq(global_settings.id, existing.id)).returning();
      } else {
        [result] = await db.insert(global_settings).values(updateData).returning();
      }

      res.json({ success: true, settings: result });
    } catch (e: any) {
      console.error("[Global Settings Save Error]", e);
      res.status(500).json({ error: e.message || "Failed to update global settings" });
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

  return router;
}
