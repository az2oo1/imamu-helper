import express from 'express';
import jwt from 'jsonwebtoken';
import { eq, desc, and, inArray, sql } from 'drizzle-orm';
import { news, events, newsLikes, newsComments, news_sources, users } from '../../db/schema';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { JWT_SECRET } from '../../lib/config';
import { matchId } from '../../lib/auth-utils';

export function createNewsRouter(db: any) {
  const router = express.Router();

  // Events
  router.get("/events", async (req, res) => {
    try {
      const records = await db.select().from(events);
      res.json(records);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // News list
  router.get("/news", async (req, res) => {
    try {
      let currentUserId: string | null = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        try {
          const decodedToken: any = jwt.verify(token, JWT_SECRET);
          currentUserId = decodedToken.uid;
        } catch (e) {}
      }

      const limit = Number(req.query.limit) || 9;
      const offset = Number(req.query.offset) || 0;

      const records = await db
        .select({
          id: news.id,
          content: news.content,
          source: news.source,
          imageUrl: news.imageUrl,
          videoUrl: news.videoUrl,
          date: news.date,
          createdAt: news.createdAt,
          authorName: news.authorName,
          authorHandle: news.authorHandle,
          authorAvatar: news.authorAvatar,
          profilePicUrl: news_sources.profilePicUrl
        })
        .from(news)
        .leftJoin(news_sources, eq(news.source, news_sources.handle))
        .orderBy(desc(news.date), desc(news.createdAt))
        .limit(limit)
        .offset(offset);

      const recordIds = records.map((r: any) => r.id);
      let allLikes: any[] = [];
      let allComments: any[] = [];

      if (recordIds.length > 0) {
        allLikes = await db.select().from(newsLikes).where(inArray(newsLikes.newsId, recordIds));
        allComments = await db.select().from(newsComments).where(inArray(newsComments.newsId, recordIds));
      }

      const mapped = records.map((record: any) => {
        const likes = allLikes.filter((l: any) => String(l.newsId) === String(record.id));
        const comments = allComments.filter((c: any) => String(c.newsId) === String(record.id));
        const userLiked = currentUserId ? likes.some((l: any) => l.userId === currentUserId) : false;

        return {
          ...record,
          title: record.authorName || `@${record.source}`,
          author: record.authorName || `@${record.source}`,
          likes: likes.length,
          likesCount: likes.length,
          commentsCount: comments.length,
          userLiked,
          isLiked: userLiked
        };
      });

      res.json(mapped);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Like news item
  router.post("/news/:id/like", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      const idRaw = req.params.id;
      const userId = req.user.uid;

      const existing = await db.select().from(newsLikes).where(and(eq(newsLikes.userId, userId), matchId(newsLikes.newsId, idRaw)));
      if (existing.length > 0) {
        await db.delete(newsLikes).where(matchId(newsLikes.id, existing[0].id));
        return res.json({ liked: false });
      } else {
        await db.insert(newsLikes).values({ userId, newsId: idRaw as any });
        return res.json({ liked: true });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get comments for news item
  router.get("/news/:id/comments", async (req, res) => {
    try {
      const idRaw = req.params.id;
      const comments = await db.select({
          id: newsComments.id,
          content: newsComments.content,
          createdAt: newsComments.createdAt,
          userId: users.uid,
          userName: users.userName,
          profilePic: users.profilePicUrl
        })
        .from(newsComments)
        .where(matchId(newsComments.newsId, idRaw))
        .leftJoin(users, eq(users.uid, newsComments.userId))
        .orderBy(desc(newsComments.createdAt));
      res.json(comments);
    } catch (e) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Post comment to news item
  router.post("/news/:id/comments", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      const idRaw = req.params.id;
      const userId = req.user.uid;
      const { content } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ error: "Empty comment" });

      const [newComment] = await db.insert(newsComments).values({ userId, newsId: idRaw as any, content: content.trim() }).returning();
      const userRec = await db.select().from(users).where(eq(users.uid, userId));

      res.json({
        id: newComment.id,
        content: newComment.content,
        createdAt: newComment.createdAt,
        userId: userRec[0]?.uid || userId,
        userName: userRec[0] ? (userRec[0].userName || userRec[0].email?.split('@')[0]) : 'طالب',
        profilePic: userRec[0]?.profilePicUrl || null
      });
    } catch (e) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Delete comment endpoint (User can delete own comment, Admin can delete any comment)
  router.delete("/news/comments/:commentId", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    try {
      const commentId = req.params.commentId;
      const userId = req.user.uid;

      const commentRecs = await db.select().from(newsComments).where(matchId(newsComments.id, commentId));
      if (commentRecs.length === 0) return res.status(404).json({ error: "Comment not found" });

      const comment = commentRecs[0];
      const isAdmin = req.user.isAdmin || req.user.role === 'ADMIN';

      if (comment.userId !== userId && !isAdmin) {
        return res.status(403).json({ error: "Forbidden: You can only delete your own comments" });
      }

      await db.delete(newsComments).where(matchId(newsComments.id, commentId));
      res.json({ success: true, id: Number(commentId) });
    } catch (e) {
      console.error("[Delete Comment Error]", e);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  return router;
}
