import express from 'express';
import { eq, or } from 'drizzle-orm';
import { news, news_sources, newsLikes, newsComments } from '../../../db/schema';
import { requireAuth, AuthRequest } from '../../../middleware/auth';
import { matchId } from '../../../lib/auth-utils';
import { extractTelegramChannelPosts } from '../../services/telegram';
import { checkAdmin } from './common';

export function createAdminNewsRouter(db: any) {
  const router = express.Router();

  // Admin News (POST, DELETE)
  router.post("/admin/news", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
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

  router.delete("/admin/news/:id", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const idRaw = req.params.id;
      await db.delete(newsLikes).where(matchId(newsLikes.newsId, idRaw));
      await db.delete(newsComments).where(matchId(newsComments.newsId, idRaw));
      await db.delete(news).where(matchId(news.id, idRaw));
      res.json({ success: true });
    } catch (e: any) {
      console.error("[Admin News Delete Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin News Sources
  router.get("/admin/news_sources", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const sources = await db.select().from(news_sources);
      res.json(sources);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/admin/news_sources", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { handle, telegramChannel, telegramChannels, displayName, bio, bannerUrl, profilePicUrl, links, assignedUserUid, assignedUsers, isActive } = req.body;
      
      let tgChannelsArr: string[] = [];
      if (Array.isArray(telegramChannels)) {
        tgChannelsArr = telegramChannels.map((c: any) => String(c).replace(/^https?:\/\/(www\.)?t\.me\/(s\/)?/i, '').replace(/^t\.me\/(s\/)?/i, '').replace(/^@/, '').trim()).filter(Boolean);
      } else if (telegramChannel && String(telegramChannel).trim()) {
        tgChannelsArr.push(String(telegramChannel).replace(/^https?:\/\/(www\.)?t\.me\/(s\/)?/i, '').replace(/^t\.me\/(s\/)?/i, '').replace(/^@/, '').trim());
      }

      const rawHandle = handle || tgChannelsArr[0] || displayName;
      if (!rawHandle || !String(rawHandle).trim()) {
        return res.status(400).json({ error: "اسم المستخدم / المعرف مطلوب" });
      }

      const cleanHandle = String(rawHandle).replace(/^https?:\/\/(www\.)?t\.me\/(s\/)?/i, '').replace(/^t\.me\/(s\/)?/i, '').replace(/^@/, '').trim();

      let assignedArr: string[] = [];
      if (Array.isArray(assignedUsers)) {
        assignedArr = assignedUsers.map((u: any) => String(u).trim()).filter(Boolean);
      } else if (assignedUserUid && String(assignedUserUid).trim()) {
        assignedArr.push(String(assignedUserUid).trim());
      }

      const [ns] = await db.insert(news_sources).values({
        handle: cleanHandle,
        displayName: displayName || cleanHandle,
        bio: bio || null,
        bannerUrl: bannerUrl || null,
        profilePicUrl: profilePicUrl || null,
        links: links ? (typeof links === 'string' ? links : JSON.stringify(links)) : null,
        assignedUsers: assignedArr.length > 0 ? JSON.stringify(assignedArr) : null,
        telegramChannels: tgChannelsArr.length > 0 ? JSON.stringify(tgChannelsArr) : null,
        isActive: isActive ?? true
      }).returning();

      res.json(ns);
    } catch (e: any) {
      console.error("[Create Authenticated Account Error]", e);
      res.status(500).json({ error: e.message || "Failed to create account" });
    }
  });

  router.delete("/admin/news_sources/:id", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const idRaw = req.params.id;
      await db.delete(news_sources).where(or(matchId(news_sources.id, idRaw), eq(news_sources.handle, idRaw)));
      res.json({ success: true });
    } catch (e: any) {
      console.error("[Admin News Source Delete Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Telegram Extractor
  router.post("/admin/telegram/extract", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const { channel, channelUrl, limit } = req.body;
      const targetChannel = channel || channelUrl;
      if (!targetChannel) {
        return res.status(400).json({ error: "الرجاء إدخال اسم أو رابط قناة التليقرام" });
      }

      const result = await extractTelegramChannelPosts(targetChannel, Number(limit) || 30, db);
      res.json(result);
    } catch (e: any) {
      console.error("[Telegram Extract Error]", e);
      res.status(400).json({ error: e.message || "فشل استخراج المنشورات من التليقرام" });
    }
  });

  // Fetch All News Sources
  router.post("/admin/news_sources/fetch-all", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const sources = await db.select().from(news_sources).where(eq(news_sources.isActive, true));
      let totalNew = 0;
      for (const s of sources) {
        const channelsToFetch: string[] = [s.handle];
        if (s.telegramChannels) {
          try {
            const extra = typeof s.telegramChannels === 'string' ? JSON.parse(s.telegramChannels) : s.telegramChannels;
            if (Array.isArray(extra)) channelsToFetch.push(...extra);
          } catch (e) {}
        }
        const uniqueChannels = Array.from(new Set(channelsToFetch.filter(Boolean)));
        for (const ch of uniqueChannels) {
          try {
            const resObj = await extractTelegramChannelPosts(ch, 30, db);
            totalNew += resObj.newPublished;
          } catch (e) {}
        }
      }
      res.json({ success: true, fetchedCount: totalNew });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to fetch sources" });
    }
  });

  // Fetch Posts from a Specific News Source
  router.post("/admin/news_sources/fetch", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const handle = req.body?.handle || req.body?.channel;
      if (!handle) return res.status(400).json({ error: "Missing handle" });
      const result = await extractTelegramChannelPosts(handle, 30, db);
      res.json({ success: true, fetchedCount: result.newPublished, message: `Extracted ${result.newPublished} new posts from Telegram` });
    } catch (e: any) {
      console.error("[Fetch News Source Error]", e);
      res.status(400).json({ error: e.message || "Failed to fetch news source" });
    }
  });

  router.post("/admin/news_sources/:handle/fetch", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const handle = decodeURIComponent(req.params.handle);
      const result = await extractTelegramChannelPosts(handle, 30, db);
      res.json({ success: true, fetchedCount: result.newPublished, message: `Extracted ${result.newPublished} new posts from Telegram` });
    } catch (e: any) {
      console.error("[Fetch News Source Error]", e);
      res.status(400).json({ error: e.message || "Failed to fetch news source" });
    }
  });

  // Delete All Posts from a Specific News Source
  router.delete("/admin/news_sources/:handle/posts", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const handle = req.params.handle.replace(/^@/, '');
      const deleted = await db.delete(news).where(or(eq(news.source, handle), eq(news.authorHandle, `@${handle}`))).returning();
      res.json({ success: true, deletedCount: deleted.length });
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to delete posts" });
    }
  });

  return router;
}
