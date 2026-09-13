import express from 'express';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { tutorial_sections, tutorials, tutorial_comments, users, app_feedback } from '../../db/schema';
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

      const feedbackList = await db.select().from(app_feedback).where(
        and(
          eq(app_feedback.targetType, 'tutorial'),
          eq(app_feedback.targetId, String(idRaw))
        )
      );

      const userIds: string[] = Array.from(new Set(feedbackList.map((fb: any) => String(fb.userId)).filter(Boolean)));
      const userRecords = userIds.length > 0 ? await db.select().from(users).where(inArray(users.uid, userIds)) : [];
      const userMap = new Map<string, any>(userRecords.map((u: any) => [u.uid, u]));

      const feedbackWithUser = feedbackList.map((fb: any) => {
        const userRec = userMap.get(fb.userId);
        return {
          ...fb,
          isHelpful: fb.feedbackType === 'helpful',
          userName: userRec ? (userRec.userName || userRec.email?.split('@')[0]) : (fb.userName || 'طالب'),
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

  // Submit feedback on tutorial
  router.post("/tutorials/:id/feedback", requireAuth, async (req: AuthRequest, res) => {
    try {
      const idRaw = req.params.id;
      const userId = req.user.uid;
      const { isHelpful, comment } = req.body;

      const existing = await db.select().from(app_feedback).where(
        and(
          eq(app_feedback.targetType, 'tutorial'),
          eq(app_feedback.targetId, String(idRaw)),
          eq(app_feedback.userId, userId)
        )
      );

      const [tut] = await db.select().from(tutorials).where(matchId(tutorials.id, idRaw));

      let feedbackRecord;
      const feedbackType = isHelpful ? 'helpful' : 'unhelpful';
      if (existing.length > 0) {
        [feedbackRecord] = await db.update(app_feedback)
          .set({
            feedbackType,
            comment: comment || existing[0].comment || ''
          })
          .where(eq(app_feedback.id, existing[0].id))
          .returning();
      } else {
        [feedbackRecord] = await db.insert(app_feedback)
          .values({
            targetType: 'tutorial',
            targetId: String(idRaw),
            targetTitle: tut?.title || null,
            userId,
            userName: req.user.userName || 'طالب',
            userEmail: req.user.email || null,
            feedbackType,
            comment: comment || '',
            status: 'pending'
          })
          .returning();
      }

      res.json({
        ...feedbackRecord,
        isHelpful: feedbackRecord.feedbackType === 'helpful'
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get comments for specific feedback (Legacy stub endpoint)
  router.get("/feedback/:id/comments", async (req, res) => {
    res.json([]);
  });

  // Post a comment/reply on feedback (Legacy stub endpoint)
  router.post("/feedback/:id/comments", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: "Comment text required" });
    res.json({
      id: Date.now(),
      feedbackId: req.params.id,
      userId: req.user.uid,
      userName: req.user.userName || 'طالب',
      content: content.trim()
    });
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

  // Submit universal app feedback or report problem
  router.post("/feedback", async (req: AuthRequest, res): Promise<any> => {
    try {
      const { targetType, targetId, targetTitle, feedbackType, comment, userEmail, userName } = req.body;
      if (!targetType) return res.status(400).json({ error: "targetType is required" });

      const userId = req.user?.uid || null;
      let resolvedUserName = userName || null;
      let resolvedUserEmail = userEmail || req.user?.email || null;

      if (userId && !resolvedUserName) {
        const [uRec] = await db.select().from(users).where(eq(users.uid, userId));
        if (uRec) {
          resolvedUserName = uRec.userName || uRec.email?.split('@')[0];
          resolvedUserEmail = uRec.email || resolvedUserEmail;
        }
      }

      const [newFeedback] = await db.insert(app_feedback).values({
        targetType,
        targetId: targetId ? String(targetId) : null,
        targetTitle: targetTitle || null,
        userId,
        userName: resolvedUserName || 'طالب',
        userEmail: resolvedUserEmail,
        feedbackType: feedbackType || 'bug_report',
        comment: comment ? String(comment).trim() : '',
        status: 'pending'
      }).returning();

      res.json(newFeedback);
    } catch (e: any) {
      console.error("[Post Feedback Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}

