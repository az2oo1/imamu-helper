import express from 'express';
import { sql } from 'drizzle-orm';
import { course_resources, subjects, course_sections } from '../../../db/schema';
import { requireAuth, AuthRequest } from '../../../middleware/auth';
import { matchId } from '../../../lib/auth-utils';
import { checkAdmin } from './common';

export function createAdminResourcesRouter(db: any) {
  const router = express.Router();

  // Admin Add Resource Handler
  const addResourceHandler = async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const subjectId = String(req.params.subjectId || '').trim();
      const { title, type, url, description } = req.body;
      const [resRec] = await db.insert(course_resources).values({
        subjectId: subjectId as any, title, type: type || 'drive', url, description
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
  router.post("/admin/resources", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const { 
        subjectId, courseCode, title, type, url, description, 
        driveLink, boxLink, whatsappLink, freeResourcesUrl, paidResourcesUrl, avatarUrl, bannerUrl, sectionsEnabled 
      } = req.body;
      let targetSubjectId: any = subjectId ? String(subjectId).replace(/^syn(thetic)?_/, '') : null;
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
        description: description || null,
        sectionsEnabled: sectionsEnabled !== undefined ? Boolean(sectionsEnabled) : true
      }).returning();
      res.json(resRec);
    } catch (e: any) {
      console.error("[Admin Resource Create Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Update Resource
  router.put("/admin/resources/:id", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const idRaw = req.params.id;
      const { 
        title, type, url, description, subjectId, courseCode,
        driveLink, boxLink, whatsappLink, freeResourcesUrl, paidResourcesUrl, avatarUrl, bannerUrl, sectionsEnabled 
      } = req.body;

      let targetSubjectId: any = subjectId ? String(subjectId).replace(/^syn(thetic)?_/, '') : undefined;
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
      if (sectionsEnabled !== undefined) updateData.sectionsEnabled = Boolean(sectionsEnabled);

      const [updated] = await db.update(course_resources)
        .set(updateData)
        .where(matchId(course_resources.id, idRaw))
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

  // Admin Delete Resource (supports BigInt/integer PKs and synthetic IDs)
  router.delete("/admin/resources/:id", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const idRaw = String(req.params.id || '').trim();

      // 1. First attempt direct deletion from course_resources by primary key using string/sql casting
      const [existingRes] = await db.select().from(course_resources).where(matchId(course_resources.id, idRaw));
      if (existingRes) {
        await db.delete(course_resources).where(matchId(course_resources.id, idRaw));
        return res.json({ success: true, deletedCount: 1 });
      }

      // 2. Check for synthetic subject resource deletion
      let subjectIdToClear: string | null = null;
      if (idRaw.startsWith('syn_') || idRaw.startsWith('synthetic_')) {
        subjectIdToClear = idRaw.replace(/^syn(thetic)?_/, '');
      } else {
        const numericId = Number(idRaw);
        if (!isNaN(numericId) && numericId >= 10000 && numericId < 1e15) {
          subjectIdToClear = String(Math.floor(numericId / 10000));
        }
      }

      if (subjectIdToClear) {
        const [targetSubj] = await db.select().from(subjects).where(matchId(subjects.id, subjectIdToClear));
        if (targetSubj) {
          await db.update(subjects).set({ driveLink: null, whatsappLink: null }).where(matchId(subjects.id, subjectIdToClear));
          await db.delete(course_resources).where(matchId(course_resources.subjectId, subjectIdToClear));
          return res.json({ success: true, syntheticDeleted: true });
        }
      }

      return res.status(404).json({ success: false, error: "Resource not found", deletedCount: 0 });
    } catch (e: any) {
      console.error("[Admin Resource Delete Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Clear All Course Sections (Reset for new term)
  router.delete("/admin/sections/clear-all", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const { subjectId, courseCode } = req.query;
      let deletedRows: any[] = [];
      if (subjectId) {
        deletedRows = await db.delete(course_sections).where(matchId(course_sections.subjectId, String(subjectId))).returning();
      } else if (courseCode) {
        deletedRows = await db.delete(course_sections).where(sql`LOWER(${course_sections.courseCode}) = LOWER(${String(courseCode).trim()})`).returning();
      } else {
        deletedRows = await db.delete(course_sections).returning();
      }
      res.json({ success: true, count: deletedRows.length });
    } catch (e: any) {
      console.error("[Clear All Sections Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
