import express from 'express';
import jwt from 'jsonwebtoken';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { news, events, newsLikes, newsComments, news_sources, users } from '../../db/schema';
import { requireAuth, AuthRequest } from '../../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

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
        const likes = allLikes.filter((l: any) => l.newsId === record.id);
        const comments = allComments.filter((c: any) => c.newsId === record.id);
        const userLiked = currentUserId ? likes.some((l: any) => l.userId === currentUserId) : false;

        return {
          ...record,
          likesCount: likes.length,
          commentsCount: comments.length,
          userLiked
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
      const newsId = parseInt(req.params.id);
      const userId = req.user.uid;

      const existing = await db.select().from(newsLikes).where(and(eq(newsLikes.userId, userId), eq(newsLikes.newsId, newsId)));
      if (existing.length > 0) {
        await db.delete(newsLikes).where(eq(newsLikes.id, existing[0].id));
        return res.json({ liked: false });
      } else {
        await db.insert(newsLikes).values({ userId, newsId });
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
      const newsId = parseInt(req.params.id);
      const comments = await db.select({
          id: newsComments.id,
          content: newsComments.content,
          createdAt: newsComments.createdAt,
          userId: users.uid,
          userName: users.userName,
          profilePic: users.profilePicUrl
        })
        .from(newsComments)
        .where(eq(newsComments.newsId, newsId))
        .leftJoin(users, eq(newsComments.userId, users.uid))
        .orderBy(desc(newsComments.createdAt));
      res.json(comments);
    } catch (e) {
      res.status(500).json({ error: "Server error" });
    }
  });

  // Post comment to news item
  router.post("/news/:id/comments", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      const newsId = parseInt(req.params.id);
      const userId = req.user.uid;
      const { content } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ error: "Empty comment" });

      const [newComment] = await db.insert(newsComments).values({ userId, newsId, content: content.trim() }).returning();
      const userRec = await db.select().from(users).where(eq(users.uid, userId));

      res.json({
        id: newComment.id,
        content: newComment.content,
        createdAt: newComment.createdAt,
        userId: userRec[0].uid,
        userName: userRec[0].userName || userRec[0].email?.split('@')[0],
        profilePic: userRec[0].profilePicUrl
      });
    } catch (e) {
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
