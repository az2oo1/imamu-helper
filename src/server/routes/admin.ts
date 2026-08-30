import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { eq, desc, and, or, sql, inArray } from 'drizzle-orm';
import { 
  users, majors, subjects, course_resources, events, news, majorCourses, 
  news_sources, global_settings, tutorial_sections, tutorials, tutorial_feedback, 
  feedback_comments, activity_logs, newbie_links, tools
} from '../../db/schema';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { logger } from '../../middleware/logger';
import { uploadFileToStorage, getFileFromStorage, deleteFileFromStorage, isS3Configured } from '../../lib/storage';
import { GoogleGenAI, Type } from '@google/genai';
import { importMsariData } from '../services/msari';

import { getDb } from '../../db/index';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const storage = multer.memoryStorage();

const uploadStorage = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

async function checkAdmin(req: AuthRequest, db?: any): Promise<boolean> {
  if (!req.user) return false;
  if (req.user.isAdmin || req.user.role === 'ADMIN') return true;
  const database = db || (await getDb());
  if (database) {
    try {
      const condition = req.user.uid
        ? eq(users.uid, req.user.uid)
        : req.user.email
        ? eq(users.email, req.user.email)
        : req.user.id
        ? eq(users.id, Number(req.user.id))
        : null;
      if (condition) {
        const records = await database.select().from(users).where(condition);
        const u = records[0];
        return !!(u?.isAdmin || u?.role === 'ADMIN');
      }
    } catch(e) {}
  }
  return false;
}

export function createAdminRouter(db: any) {
  const router = express.Router();

  // Admin: Get all feedback
  router.get("/admin/tutorials/feedback", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const enriched = await db.select({
        id: tutorial_feedback.id,
        tutorialId: tutorial_feedback.tutorialId,
        userId: tutorial_feedback.userId,
        isHelpful: tutorial_feedback.isHelpful,
        comment: tutorial_feedback.comment,
        createdAt: tutorial_feedback.createdAt,
        tutorialTitle: sql<string>`COALESCE(${tutorials.title}, 'شرح محذوف')`,
        userName: sql<string>`COALESCE(${users.userName}, 'طالب')`,
        userEmail: users.email,
        profilePicUrl: users.profilePicUrl
      })
      .from(tutorial_feedback)
      .leftJoin(users, eq(users.uid, tutorial_feedback.userId))
      .leftJoin(tutorials, eq(tutorials.id, tutorial_feedback.tutorialId));

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
      const [
        [uRes], [sRes], [rRes], [nRes], [eRes], [tRes], [fRes]
      ] = await Promise.all([
        db.select({ count: sql`count(*)` }).from(users),
        db.select({ count: sql`count(*)` }).from(subjects),
        db.select({ count: sql`count(*)` }).from(course_resources),
        db.select({ count: sql`count(*)` }).from(news),
        db.select({ count: sql`count(*)` }).from(events),
        db.select({ count: sql`count(*)` }).from(tutorials),
        db.select({ count: sql`count(*)` }).from(tutorial_feedback),
      ]);

      res.json({
        usersCount: Number(uRes?.count || 0),
        subjectsCount: Number(sRes?.count || 0),
        resourcesCount: Number(rRes?.count || 0),
        newsCount: Number(nRes?.count || 0),
        eventsCount: Number(eRes?.count || 0),
        tutorialsCount: Number(tRes?.count || 0),
        feedbackCount: Number(fRes?.count || 0)
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Users List & Management
  const getUsersHandler = async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const search = (req.query.search as string || '').trim().toLowerCase();
      let userList;
      if (search) {
        userList = await db.select().from(users)
          .where(or(
            sql`LOWER(${users.userName}) LIKE ${'%' + search + '%'}`,
            sql`LOWER(${users.email}) LIKE ${'%' + search + '%'}`,
            sql`LOWER(${users.studentEmail}) LIKE ${'%' + search + '%'}`,
            sql`LOWER(${users.googleEmail}) LIKE ${'%' + search + '%'}`,
            sql`LOWER(${users.major}) LIKE ${'%' + search + '%'}`
          ))
          .orderBy(desc(users.id));
      } else {
        userList = await db.select().from(users).orderBy(desc(users.id));
      }
      res.json(userList.map((u: any) => {
        const { passwordHash, ...sanitized } = u;
        return sanitized;
      }));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  };
  router.get("/admin/users", requireAuth, getUsersHandler as any);

  // Toggle Admin Status
  const toggleAdminHandler = async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idParam = req.params.id;
      const numId = Number(idParam);

      const condition = !isNaN(numId) ? eq(users.id, numId) : eq(users.uid, idParam);
      const userList = await db.select().from(users).where(condition);
      const targetUser = userList[0];

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const newIsAdmin = !targetUser.isAdmin;
      const [updated] = await db.update(users)
        .set({ isAdmin: newIsAdmin })
        .where(condition)
        .returning();

      const { passwordHash, ...sanitized } = updated;
      res.json({ success: true, user: sanitized });
    } catch (e: any) {
      console.error("[Toggle Admin Error]", e);
      res.status(500).json({ error: "Failed to update user admin status" });
    }
  };
  router.put("/admin/users/:id/toggle-admin", requireAuth, toggleAdminHandler as any);

  // Delete User
  const deleteUserHandler = async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idParam = req.params.id;
      const numId = Number(idParam);

      const condition = !isNaN(numId) ? eq(users.id, numId) : eq(users.uid, idParam);
      const userList = await db.select().from(users).where(condition);
      const targetUser = userList[0];

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (req.user?.uid && targetUser.uid === req.user.uid) {
        return res.status(400).json({ error: "Cannot delete your own admin account" });
      }

      await db.delete(users).where(condition);
      res.json({ success: true, message: "User deleted successfully" });
    } catch (e: any) {
      console.error("[Delete User Error]", e);
      res.status(500).json({ error: "Failed to delete user" });
    }
  };
  router.delete("/admin/users/:id", requireAuth, deleteUserHandler as any);

  // General Update User
  const updateUserHandler = async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idParam = req.params.id;
      const numId = Number(idParam);
      const condition = !isNaN(numId) ? eq(users.id, numId) : eq(users.uid, idParam);

      const { userName, email, phone, major, isAdmin, currentGpa, finishedHours } = req.body;
      const updateData: any = {};
      if (userName !== undefined) updateData.userName = userName;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (major !== undefined) updateData.major = major;
      if (isAdmin !== undefined) updateData.isAdmin = Boolean(isAdmin);
      if (currentGpa !== undefined) updateData.currentGpa = currentGpa;
      if (finishedHours !== undefined) updateData.finishedHours = Number(finishedHours);

      const [updated] = await db.update(users).set(updateData).where(condition).returning();
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      const { passwordHash, ...sanitized } = updated;
      res.json(sanitized);
    } catch (e: any) {
      console.error("[Update User Error]", e);
      res.status(500).json({ error: "Failed to update user" });
    }
  };
  router.put("/admin/users/:id", requireAuth, updateUserHandler as any);

  // Admin Health
  router.get("/admin/health", requireAuth, async (req: AuthRequest, res): Promise<any> => {
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
  const handleUpload = async (req: AuthRequest & { files?: Express.Multer.File[] }, res: express.Response) => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
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
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
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

  // Admin Direct Resource Creation
  router.post("/admin/resources", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const { 
        subjectId, courseCode, title, type, url, description, 
        driveLink, boxLink, whatsappLink, freeResourcesUrl, paidResourcesUrl, avatarUrl, bannerUrl 
      } = req.body;
      let targetSubjectId = subjectId ? parseInt(subjectId) : null;
      if (!targetSubjectId && courseCode) {
        const sub = (await db.select().from(subjects).where(sql`LOWER(${subjects.code}) = LOWER(${courseCode.trim()})`))[0];
        if (sub) targetSubjectId = sub.id;
      }
      if (!targetSubjectId && !courseCode && (!title || !title.trim())) {
        return res.status(400).json({ error: "الرجاء اختيار المادة الأكاديمية أو إدخال عنوان للمصدر" });
      }
      const [resRec] = await db.insert(course_resources).values({
        subjectId: targetSubjectId || null,
        title: title || 'مصدر أكاديمي',
        type: type || 'drive',
        url: url || driveLink || whatsappLink || '',
        driveLink: driveLink || null,
        boxLink: boxLink || null,
        whatsappLink: whatsappLink || null,
        freeResourcesUrl: freeResourcesUrl || null,
        paidResourcesUrl: paidResourcesUrl || null,
        avatarUrl: avatarUrl || null,
        bannerUrl: bannerUrl || null,
        description: description || null
      }).returning();
      res.json(resRec);
    } catch (e: any) {
      console.error("[Admin Resource Create Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Update Resource
  router.put("/admin/resources/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const id = parseInt(req.params.id);
      const { 
        title, type, url, description, subjectId, courseCode,
        driveLink, boxLink, whatsappLink, freeResourcesUrl, paidResourcesUrl, avatarUrl, bannerUrl 
      } = req.body;

      let targetSubjectId = subjectId ? parseInt(subjectId) : undefined;
      if (!targetSubjectId && courseCode) {
        const sub = (await db.select().from(subjects).where(sql`LOWER(${subjects.code}) = LOWER(${courseCode.trim()})`))[0];
        if (sub) targetSubjectId = sub.id;
      }

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (type !== undefined) updateData.type = type;
      if (url !== undefined) updateData.url = url;
      if (description !== undefined) updateData.description = description;
      if (driveLink !== undefined) updateData.driveLink = driveLink;
      if (boxLink !== undefined) updateData.boxLink = boxLink;
      if (whatsappLink !== undefined) updateData.whatsappLink = whatsappLink;
      if (freeResourcesUrl !== undefined) updateData.freeResourcesUrl = freeResourcesUrl;
      if (paidResourcesUrl !== undefined) updateData.paidResourcesUrl = paidResourcesUrl;
      if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
      if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
      if (targetSubjectId !== undefined) updateData.subjectId = targetSubjectId;

      const [updated] = await db.update(course_resources)
        .set(updateData)
        .where(eq(course_resources.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Resource not found" });
      }

      res.json(updated);
    } catch (e: any) {
      console.error("[Admin Resource Update Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Delete Resource
  router.delete("/admin/resources/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const id = parseInt(req.params.id);
      await db.delete(course_resources).where(eq(course_resources.id, id));
      res.json({ success: true });
    } catch (e: any) {
      console.error("[Admin Resource Delete Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

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

  router.put("/admin/global_settings", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { 
        fetchRangeDays, autoDeleteDays, 
        smtpHost, smtpPort, smtpUser, smtpPass, 
        imapHost, imapPort, imapSecure, 
        semesterStartDate, semesterEndDate, apiToken
      } = req.body;

      const existing = await db.query.global_settings.findFirst();

      const updateData = {
        fetchRangeDays: fetchRangeDays !== undefined ? Number(fetchRangeDays) : (existing?.fetchRangeDays ?? 30),
        autoDeleteDays: autoDeleteDays !== undefined ? Number(autoDeleteDays) : (existing?.autoDeleteDays ?? 30),
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
  router.post("/admin/ai_parse", requireAuth, uploadStorage.single("file"), async (req: AuthRequest & { file?: Express.Multer.File }, res): Promise<any> => {
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
  router.get("/admin/logs", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;
      const category = req.query.category as string;
      const level = req.query.level as string;

      let query = db.select().from(activity_logs).$dynamic();
      if (category && category !== 'ALL') query = query.where(eq(activity_logs.category, category));
      if (level && level !== 'ALL') query = query.where(eq(activity_logs.level, level));

      const logsList = await query.orderBy(desc(activity_logs.createdAt)).limit(limit).offset(offset);
      res.json({ logs: logsList, total: logsList.length });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  router.get("/admin/logs/stats", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
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

  router.delete("/admin/logs/clear", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      await db.delete(activity_logs);
      logger.admin("CLEAR_LOGS", "System activity logs cleared");
      res.json({ success: true, message: "Logs cleared successfully" });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to clear logs" });
    }
  });

  // Tools Routes
  const getToolsHandler = async (req: express.Request, res: express.Response) => {
    try {
      const allTools = await db.select().from(tools).orderBy(desc(tools.id));
      res.json(allTools);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  };
  router.get("/tools", getToolsHandler);

  const createToolHandler = async (req: AuthRequest, res: express.Response) => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const { title, name, description, link, icon, category } = req.body;
      const toolTitle = title || name;
      if (!toolTitle || !link) {
        return res.status(400).json({ error: "Title and link are required" });
      }
      const [newTool] = await db.insert(tools).values({
        title: toolTitle,
        description: description || '',
        link,
        icon: icon || null,
        category: category || 'عام'
      }).returning();
      res.json(newTool);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  };
  router.post("/admin/tools", requireAuth, createToolHandler as any);

  const updateToolHandler = async (req: AuthRequest, res: express.Response) => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid tool ID" });
      const { title, name, description, link, icon, category } = req.body;
      const toolTitle = title || name;
      const updateData: any = {};
      if (toolTitle !== undefined) updateData.title = toolTitle;
      if (description !== undefined) updateData.description = description;
      if (link !== undefined) updateData.link = link;
      if (icon !== undefined) updateData.icon = icon;
      if (category !== undefined) updateData.category = category;

      const [updatedTool] = await db.update(tools).set(updateData).where(eq(tools.id, id)).returning();
      if (!updatedTool) return res.status(404).json({ error: "Tool not found" });
      res.json(updatedTool);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  };
  router.put("/admin/tools/:id", requireAuth, updateToolHandler as any);

  const deleteToolHandler = async (req: AuthRequest, res: express.Response) => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid tool ID" });
      await db.delete(tools).where(eq(tools.id, id));
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  };
  router.delete("/admin/tools/:id", requireAuth, deleteToolHandler as any);

  return router;
}
