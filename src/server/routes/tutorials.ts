import express from 'express';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { tutorial_sections, tutorials, tutorial_feedback, feedback_comments, tutorial_comments, newbie_links, users } from '../../db/schema';
import { requireAuth, requireAdmin, AuthRequest } from '../../middleware/auth';
import { matchId } from '../../lib/auth-utils';

function parseSteps(steps: any): any[] {
  if (!steps) return [];
  if (Array.isArray(steps)) return steps;
  if (typeof steps === 'string') {
    try {
      const parsed = JSON.parse(steps);
      return Array.isArray(parsed) ? parsed : [steps];
    } catch (_e) {
      return [steps];
    }
  }
  return [];
}

export function createTutorialsRouter(db: any) {
  const router = express.Router();

  // Get all newbie links
  router.get("/newbie/links", async (req, res) => {
    try {
      const list = await db.select().from(newbie_links).orderBy(newbie_links.id);
      res.json(list);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Create newbie link
  router.post("/admin/newbie/links", requireAdmin, async (req: AuthRequest, res): Promise<any> => {
    try {
      const { title, url, description } = req.body;
      if (!title || !url) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const [newLink] = await db.insert(newbie_links).values({ title, url, description }).returning();
      res.json(newLink);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Update newbie link
  router.put("/admin/newbie/links/:id", requireAdmin, async (req: AuthRequest, res): Promise<any> => {
    try {
      const idRaw = req.params.id;
      const { title, url, description } = req.body;
      const [updated] = await db.update(newbie_links)
        .set({ title, url, description })
        .where(matchId(newbie_links.id, idRaw))
        .returning();
      if (!updated) {
        return res.status(404).json({ error: "Link not found" });
      }
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Delete newbie link
  router.delete("/admin/newbie/links/:id", requireAdmin, async (req: AuthRequest, res): Promise<any> => {
    try {
      const idRaw = req.params.id;
      await db.delete(newbie_links).where(matchId(newbie_links.id, idRaw));
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get all sections
  router.get("/tutorials/sections", async (req, res) => {
    try {
      const sectionsList = await db.select().from(tutorial_sections);
      res.json(sectionsList);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get all tutorials
  router.get("/tutorials", async (req, res) => {
    try {
      const { sectionId } = req.query;
      let query = db.select().from(tutorials).$dynamic();
      if (sectionId) {
        query = query.where(matchId(tutorials.sectionId, sectionId as string));
      }
      const list = await query;
      res.json(list.map((t: any) => ({
        ...t,
        steps: parseSteps(t.steps)
      })));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get single tutorial with feedback
  router.get("/tutorials/:id", async (req, res): Promise<any> => {
    try {
      const idRaw = req.params.id;
      const [tutorial] = await db.select().from(tutorials).where(matchId(tutorials.id, idRaw));
      if (!tutorial) return res.status(404).json({ error: "Tutorial not found" });

      const feedbackList = await db.select().from(tutorial_feedback).where(matchId(tutorial_feedback.tutorialId, idRaw));

      const userIds: string[] = Array.from(new Set(feedbackList.map((fb: any) => String(fb.userId)).filter(Boolean)));
      const userRecords = userIds.length > 0 ? await db.select().from(users).where(inArray(users.uid, userIds)) : [];
      const userMap = new Map<string, any>(userRecords.map((u: any) => [u.uid, u]));

      const feedbackWithUser = feedbackList.map((fb: any) => {
        const userRec = userMap.get(fb.userId);
        return {
          ...fb,
          userName: userRec ? (userRec.userName || userRec.email?.split('@')[0]) : 'طالب',
          profilePicUrl: userRec?.profilePicUrl
        };
      });

      res.json({
        ...tutorial,
        steps: parseSteps(tutorial.steps),
        feedback: feedbackWithUser
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Submit feedback
  router.post("/tutorials/:id/feedback", requireAuth, async (req: AuthRequest, res) => {
    try {
      const idRaw = req.params.id;
      const userId = req.user.uid;
      const { isHelpful, comment } = req.body;

      const existing = await db.select().from(tutorial_feedback).where(
        and(
          matchId(tutorial_feedback.tutorialId, idRaw),
          eq(tutorial_feedback.userId, userId)
        )
      );

      let feedbackRecord;
      if (existing.length > 0) {
        [feedbackRecord] = await db.update(tutorial_feedback)
          .set({ isHelpful, comment: comment || null })
          .where(matchId(tutorial_feedback.id, existing[0].id))
          .returning();
      } else {
        [feedbackRecord] = await db.insert(tutorial_feedback)
          .values({ tutorialId: idRaw as any, userId, isHelpful, comment: comment || null })
          .returning();
      }

      res.json(feedbackRecord);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get comments for specific feedback
  router.get("/feedback/:id/comments", async (req, res) => {
    try {
      const idRaw = req.params.id;
      const commentsList = await db.select().from(feedback_comments).where(matchId(feedback_comments.feedbackId, idRaw));

      const userIds: string[] = Array.from(new Set(commentsList.map((c: any) => String(c.userId)).filter(Boolean)));
      const userRecords = userIds.length > 0 ? await db.select().from(users).where(inArray(users.uid, userIds)) : [];
      const userMap = new Map<string, any>(userRecords.map((u: any) => [u.uid, u]));

      const enriched = commentsList.map((c: any) => {
        const userRec = userMap.get(c.userId);
        return {
          ...c,
          userName: userRec ? (userRec.userName || userRec.email?.split('@')[0]) : (c.userName || 'طالب'),
          profilePicUrl: userRec?.profilePicUrl
        };
      });

      res.json(enriched);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Post a comment/reply on feedback
  router.post("/feedback/:id/comments", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      const idRaw = req.params.id;
      const userId = req.user.uid;
      const { content } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ error: "Comment text required" });

      const [userRec] = await db.select().from(users).where(eq(users.uid, userId));
      const userName = userRec ? (userRec.userName || userRec.email?.split('@')[0]) : 'طالب';

      const [newComment] = await db.insert(feedback_comments)
        .values({
          feedbackId: idRaw as any,
          userId,
          userName,
          content: content.trim()
        })
        .returning();

      res.json({
        ...newComment,
        profilePicUrl: userRec?.profilePicUrl
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get public comments for specific tutorial
  router.get("/tutorials/:id/comments", async (req, res) => {
    try {
      const idRaw = req.params.id;
      const commentsList = await db.select().from(tutorial_comments).where(matchId(tutorial_comments.tutorialId, idRaw));

      const userIds: string[] = Array.from(new Set(commentsList.map((c: any) => String(c.userId)).filter(Boolean)));
      const userRecords = userIds.length > 0 ? await db.select().from(users).where(inArray(users.uid, userIds)) : [];
      const userMap = new Map<string, any>(userRecords.map((u: any) => [u.uid, u]));

      const enriched = commentsList.map((c: any) => {
        const userRec = userMap.get(c.userId);
        return {
          ...c,
          userName: userRec ? (userRec.userName || userRec.email?.split('@')[0]) : (c.userName || 'طالب'),
          profilePicUrl: userRec?.profilePicUrl
        };
      });

      res.json(enriched);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Post a public comment on specific tutorial
  router.post("/tutorials/:id/comments", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      const idRaw = req.params.id;
      const userId = req.user.uid;
      const { content } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ error: "Comment text required" });

      const [userRec] = await db.select().from(users).where(eq(users.uid, userId));
      const userName = userRec ? (userRec.userName || userRec.email?.split('@')[0]) : 'طالب';

      const [newComment] = await db.insert(tutorial_comments)
        .values({
          tutorialId: idRaw as any,
          userId,
          userName,
          content: content.trim()
        })
        .returning();

      res.json({
        ...newComment,
        profilePicUrl: userRec?.profilePicUrl
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
