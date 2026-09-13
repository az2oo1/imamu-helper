import express from 'express';
import { eq, desc } from 'drizzle-orm';
import { app_feedback, tutorial_sections, tutorials } from '../../../db/schema';
import { requireAuth, AuthRequest } from '../../../middleware/auth';
import { matchId, matchSubjectIds } from '../../../lib/auth-utils';
import { logEvent } from '../../../lib/logger';
import { checkAdmin } from './common';

export function createAdminFeedbackRouter(db: any) {
  const router = express.Router();

  // Admin: Get all tutorial feedback
  router.get("/admin/tutorials/feedback", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const list = await db.select().from(app_feedback).where(eq(app_feedback.targetType, 'tutorial')).orderBy(desc(app_feedback.id));
      res.json(list);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Get Universal Feedback & Problem Reports
  router.get("/admin/feedback", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const universalList = await db.select().from(app_feedback).orderBy(desc(app_feedback.id));

      const combined = universalList.map((uf: any) => ({
        ...uf,
        id: String(uf.id),
        rawId: uf.id
      }));

      const helpfulCount = combined.filter((f: any) => f.feedbackType === 'helpful').length;
      const unhelpfulCount = combined.filter((f: any) => f.feedbackType !== 'helpful').length;
      const pendingCount = combined.filter((f: any) => f.status === 'pending').length;
      const resolvedCount = combined.filter((f: any) => f.status === 'resolved').length;

      const byTargetType = {
        tutorial: combined.filter((f: any) => f.targetType === 'tutorial').length,
        news: combined.filter((f: any) => f.targetType === 'news').length,
        resource: combined.filter((f: any) => f.targetType === 'resource').length,
        tool: combined.filter((f: any) => f.targetType === 'tool').length,
        event: combined.filter((f: any) => f.targetType === 'event').length,
        general: combined.filter((f: any) => f.targetType === 'general').length
      };

      res.json({
        feedback: combined,
        stats: {
          totalCount: combined.length,
          helpfulCount,
          unhelpfulCount,
          pendingCount,
          resolvedCount,
          byTargetType
        }
      });
    } catch (e: any) {
      console.error("[Get Feedback Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Update feedback resolution status
  router.put("/admin/feedback/:id/status", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const idStr = req.params.id;
      const { status } = req.body;
      const cleanId = idStr.replace(/^(app_|tut_)/, '');

      const [updated] = await db.update(app_feedback)
        .set({ status: status || 'resolved' })
        .where(matchId(app_feedback.id, cleanId))
        .returning();

      await logEvent({
        level: 'admin',
        category: 'ADMIN',
        action: 'UPDATE_FEEDBACK_STATUS',
        message: `قام المسؤول (${req.user?.email || 'الأدمن'}) بتحديث حالة البلاغ (#${cleanId}) إلى (${status || 'resolved'})`,
        userId: req.user?.uid,
        userEmail: req.user?.email,
        metadata: { feedbackId: cleanId, status: status || 'resolved' }
      }).catch(() => {});

      res.json({ success: true, feedback: updated });
    } catch (e: any) {
      console.error("[Update Feedback Status Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Delete feedback item
  router.delete("/admin/feedback/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const idStr = req.params.id;
      const cleanId = idStr.replace(/^(app_|tut_)/, '');

      await db.delete(app_feedback).where(matchId(app_feedback.id, cleanId));

      await logEvent({
        level: 'admin',
        category: 'ADMIN',
        action: 'DELETE_FEEDBACK',
        message: `قام المسؤول (${req.user?.email || 'الأدمن'}) بحذف البلاغ/التقييم (#${cleanId})`,
        userId: req.user?.uid,
        userEmail: req.user?.email,
        metadata: { feedbackId: cleanId }
      }).catch(() => {});

      res.json({ success: true });
    } catch (e: any) {
      console.error("[Delete Feedback Error]", e);
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
      const idRaw = req.params.id;
      const { title, icon, color } = req.body;
      const [sec] = await db.update(tutorial_sections).set({ title, icon, color }).where(matchId(tutorial_sections.id, idRaw)).returning();
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
      const idRaw = req.params.id;
      await db.delete(tutorial_sections).where(matchId(tutorial_sections.id, idRaw));
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
      
      const allSections = await db.select().from(tutorial_sections);
      let targetSectionId: any = sectionId;
      if (allSections.length === 0) {
        const [newSec] = await db.insert(tutorial_sections).values({
          title: 'الشروحات العامة',
          icon: 'GraduationCap',
          color: 'text-[var(--color-imamu-accent)] bg-stone-50 border-stone-100/50'
        }).returning();
        targetSectionId = newSec.id;
      } else if (sectionId != null && sectionId !== '') {
        const matched = allSections.find((s: any) => matchSubjectIds(s.id, sectionId));
        if (matched) targetSectionId = matched.id;
        else targetSectionId = sectionId;
      } else {
        targetSectionId = allSections[0]?.id;
      }

      const stepsJson = Array.isArray(steps) ? JSON.stringify(steps) : (steps ? String(steps) : '[]');
      const [tut] = await db.insert(tutorials).values({
        sectionId: targetSectionId, title: title || 'شرح جديد', description: description || '', text: text || '', steps: stepsJson, videoUrl, imageUrl, linkUrl, linkTitle
      }).returning();
      let parsedSteps: any[] = [];
      try { parsedSteps = JSON.parse(tut.steps || '[]'); } catch(_e) { parsedSteps = []; }
      res.json({ ...tut, steps: parsedSteps });
    } catch (e) {
      console.error("[Create Tutorial Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Update tutorial
  router.put("/admin/tutorials/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const idRaw = req.params.id;
      const { sectionId, title, description, text, steps, videoUrl, imageUrl, linkUrl, linkTitle } = req.body;
      
      const allSections = await db.select().from(tutorial_sections);
      let targetSectionId: any = sectionId;
      if (allSections.length === 0) {
        const [newSec] = await db.insert(tutorial_sections).values({
          title: 'الشروحات العامة',
          icon: 'GraduationCap',
          color: 'text-[var(--color-imamu-accent)] bg-stone-50 border-stone-100/50'
        }).returning();
        targetSectionId = newSec.id;
      } else if (sectionId != null && sectionId !== '') {
        const matched = allSections.find((s: any) => matchSubjectIds(s.id, sectionId));
        if (matched) targetSectionId = matched.id;
        else targetSectionId = sectionId;
      } else {
        targetSectionId = allSections[0]?.id;
      }

      const stepsJson = Array.isArray(steps) ? JSON.stringify(steps) : (steps ? String(steps) : '[]');
      const [tut] = await db.update(tutorials).set({
        sectionId: targetSectionId, title: title || 'شرح جديد', description: description || '', text: text || '', steps: stepsJson, videoUrl, imageUrl, linkUrl, linkTitle
      }).where(matchId(tutorials.id, idRaw)).returning();
      let parsedSteps: any[] = [];
      try { parsedSteps = JSON.parse(tut.steps || '[]'); } catch(_e) { parsedSteps = []; }
      res.json({ ...tut, steps: parsedSteps });
    } catch (e) {
      console.error("[Update Tutorial Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Delete tutorial
  router.delete("/admin/tutorials/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const idRaw = req.params.id;
      await db.delete(tutorials).where(matchId(tutorials.id, idRaw));
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
