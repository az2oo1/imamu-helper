import express from 'express';
import jwt from 'jsonwebtoken';
import { eq, desc, and, inArray, sql, or } from 'drizzle-orm';
import { news, events, newsLikes, newsComments, news_sources, users, news_bookmarks } from '../../db/schema';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { JWT_SECRET } from '../../lib/config';
import { matchId } from '../../lib/auth-utils';
import { calculateReadTime, deriveArticleTitle, parseImageList } from '../../lib/textHelpers';


export function createNewsRouter(db: any) {
  const router = express.Router();

  const extractUserId = (req: express.Request): string | null => {
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1];
    } else if ((req as any).cookies && (req as any).cookies.token) {
      token = (req as any).cookies.token;
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]*)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }
    if (!token) return null;
    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      return decoded.uid || decoded.id || null;
    } catch (e) {
      return null;
    }
  };

  // Events
  router.get("/events", async (req, res) => {
    try {
      const currentUserId = extractUserId(req);
      const records = await db.select().from(events);
      // Filter: return academic, entity, and if user is logged in, their own events
      const filtered = records.filter((e: any) => {
        if (!e.calendarType || e.calendarType === 'academic' || e.calendarType === 'entity') {
          return true;
        }
        if (e.calendarType === 'user') {
          return currentUserId && e.userId === currentUserId;
        }
        return true;
      });
      res.json(filtered);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // Personal user events (Create)
  router.post("/user-events", async (req, res): Promise<any> => {
    try {
      const currentUserId = extractUserId(req);
      if (!currentUserId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لإضافة موعد شخصي" });
      }
      const { title, date, description, location } = req.body;
      if (!title || !date) {
        return res.status(400).json({ error: "العنوان والتاريخ مطلوبان" });
      }
      const [newEvent] = await db.insert(events).values({
        title,
        date,
        description: description || '',
        location: location || '',
        calendarType: 'user',
        userId: currentUserId,
      }).returning();
      res.status(201).json(newEvent);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create user event" });
    }
  });

  // Personal user events (Bulk Sync from local/exams)
  router.post("/user-events/sync", async (req, res): Promise<any> => {
    try {
      const currentUserId = extractUserId(req);
      if (!currentUserId) {
        return res.status(401).json({ error: "يجب تسجيل الدخول لمزامنة المواعيد" });
      }
      const items = Array.isArray(req.body?.events) ? req.body.events : [];
      let syncedCount = 0;
      for (const item of items) {
        if (!item.title || !item.date || item.isTask || (typeof item.id === 'string' && item.id.startsWith('task-'))) continue;
        const dateTime = item.time && !item.date.includes('T') ? `${item.date}T${item.time}:00` : item.date;
        const existing = await db.select().from(events).where(
          and(
            eq(events.userId, currentUserId),
            eq(events.title, item.title),
            eq(events.date, dateTime)
          )
        );
        if (existing.length === 0) {
          await db.insert(events).values({
            title: item.title,
            date: dateTime,
            description: item.description || '',
            location: item.location || '',
            calendarType: 'user',
            userId: currentUserId,
          });
          syncedCount++;
        }
      }
      res.json({ success: true, count: syncedCount });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to sync user events" });
    }
  });

  // Personal user events (Delete)
  router.delete("/user-events/:id", async (req, res): Promise<any> => {
    try {
      const currentUserId = extractUserId(req);
      if (!currentUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const eventId = Number(req.params.id);
      const [existing] = await db.select().from(events).where(eq(events.id, eventId));
      if (!existing) {
        return res.status(404).json({ error: "الموعد غير موجود" });
      }
      if (existing.userId !== currentUserId) {
        return res.status(403).json({ error: "غير مصرح بحذف هذا الموعد" });
      }
      await db.delete(events).where(eq(events.id, eventId));
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete user event" });
    }
  });

  // News Tags / Categories
  router.get("/news-tags", async (req, res) => {
    try {
      const defaultTags = [
        { id: 1, name: "Campus" },
        { id: 2, name: "Academic" },
        { id: 3, name: "Sports" },
        { id: 4, name: "Events" },
        { id: 5, name: "Announcements" }
      ];
      res.json({ tags: defaultTags });
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch tags" });
    }
  });

  // Helper function to format news record
  const mapNewsRecord = (
    record: any, 
    likesMap: Map<string, any[]> | any[] = new Map(), 
    commentsMap: Map<string, any[]> | any[] = new Map(), 
    bookmarksMap: Map<string, any[]> | any[] = new Map(), 
    currentUserId: string | null = null
  ) => {
    const recIdStr = String(record.id).trim();
    const likes = Array.isArray(likesMap) ? likesMap : (likesMap.get(recIdStr) || []);
    const comments = Array.isArray(commentsMap) ? commentsMap : (commentsMap.get(recIdStr) || []);
    const bookmarks = Array.isArray(bookmarksMap) ? bookmarksMap : (bookmarksMap.get(recIdStr) || []);
    
    const userLiked = currentUserId ? likes.some((l: any) => l.userId === currentUserId) : false;
    const userSaved = currentUserId ? bookmarks.some((b: any) => b.userId === currentUserId) : false;
    const effectiveAvatar = record.profilePicUrl || record.authorAvatar || null;

    let postTitle = record.title;
    if (!postTitle && record.content) {
      const firstLine = record.content.trim().split('\n')[0].replace(/^#+\s*/, '').trim();
      if (firstLine && firstLine !== record.authorName && firstLine !== record.sourceDisplayName) {
        postTitle = firstLine.length > 90 ? firstLine.slice(0, 87) + '...' : firstLine;
      }
    }

    let parsedImages: string[] = [];
    if (record.images) {
      try {
        parsedImages = typeof record.images === 'string' ? JSON.parse(record.images) : record.images;
      } catch (e) {}
    }
    if (parsedImages.length === 0 && record.imageUrl) {
      parsedImages = [record.imageUrl];
    }

    const calculatedReadTime = record.readTime || (Math.max(1, Math.ceil((record.content || '').split(/\s+/).length / 200)) + ' min read');

    const effectiveAuthorName = record.sourceDisplayName || record.authorName || (record.source ? `@${record.source}` : 'إدارة الأخبار');
    const effectiveAuthorHandle = record.sourceHandle 
      ? (record.sourceHandle.startsWith('@') ? record.sourceHandle : `@${record.sourceHandle}`)
      : (record.authorHandle || (record.source ? `@${record.source}` : '@IMAMU'));

    return {
      ...record,
      id: record.id,
      title: postTitle || 'خبر جديد',
      content: record.content,
      excerpt: record.excerpt || record.content,
      category: record.category || record.tag || 'General',
      tag: record.category || record.tag || 'General',
      author: effectiveAuthorName,
      authorName: effectiveAuthorName,
      authorHandle: effectiveAuthorHandle,
      authorAvatar: effectiveAvatar,
      imageUrl: record.imageUrl || (parsedImages[0] || null),
      images: parsedImages,
      readTime: calculatedReadTime,
      featured: !!record.isFeatured,
      isFeatured: !!record.isFeatured,
      formId: record.formId || null,
      isArchived: !!record.isArchived,
      date: record.date || (record.createdAt ? new Date(record.createdAt).toLocaleDateString() : 'Recent'),
      createdAt: record.createdAt,
      likes: likes.length,
      likesCount: likes.length,
      commentsCount: comments.length,
      userLiked,
      isLiked: userLiked,
      isSaved: userSaved,
    };
  };

  // News List (Supports returning array as well as { articles: [...] })
  router.get("/news", async (req, res) => {
    try {
      const currentUserId = extractUserId(req);

      const limit = Number(req.query.limit) || 20;
      const offset = Number(req.query.offset) || 0;

      const records = await db
        .select({
          id: news.id,
          title: news.title,
          content: news.content,
          excerpt: news.excerpt,
          category: news.category,
          source: news.source,
          imageUrl: news.imageUrl,
          images: news.images,
          videoUrl: news.videoUrl,
          readTime: news.readTime,
          isFeatured: news.isFeatured,
          formId: news.formId,
          isArchived: news.isArchived,
          date: news.date,
          createdAt: news.createdAt,
          authorName: news.authorName,
          authorHandle: news.authorHandle,
          authorAvatar: news.authorAvatar,
          authorId: news.authorId,
          entityId: news.entityId,
          profilePicUrl: news_sources.profilePicUrl,
          sourceDisplayName: news_sources.displayName,
          sourceHandle: news_sources.handle
        })
        .from(news)
        .leftJoin(
          news_sources, 
          or(
            eq(news.source, news_sources.handle),
            eq(sql`REPLACE(${news.source}, '@', '')`, sql`REPLACE(${news_sources.handle}, '@', '')`)
          )
        )
        .orderBy(desc(news.isFeatured), desc(news.createdAt), desc(news.date))
        .limit(limit)
        .offset(offset);

      const recordIds = records.map((r: any) => r.id).filter(Boolean);
      const likesMap = new Map<string, any[]>();
      const commentsMap = new Map<string, any[]>();
      const bookmarksMap = new Map<string, any[]>();

      if (recordIds.length > 0) {
        const allLikes = await db.select().from(newsLikes).where(inArray(newsLikes.newsId, recordIds as any)).catch(() => []);
        const allComments = await db.select().from(newsComments).where(inArray(newsComments.newsId, recordIds as any)).catch(() => []);
        const allBookmarks = await db.select().from(news_bookmarks).where(inArray(news_bookmarks.newsId, recordIds as any)).catch(() => []);

        for (const l of allLikes) {
          const key = String(l.newsId).trim();
          if (!likesMap.has(key)) likesMap.set(key, []);
          likesMap.get(key)!.push(l);
        }
        for (const c of allComments) {
          const key = String(c.newsId).trim();
          if (!commentsMap.has(key)) commentsMap.set(key, []);
          commentsMap.get(key)!.push(c);
        }
        for (const b of allBookmarks) {
          const key = String(b.newsId).trim();
          if (!bookmarksMap.has(key)) bookmarksMap.set(key, []);
          bookmarksMap.get(key)!.push(b);
        }
      }

      const mapped = records.map((r: any) => mapNewsRecord(r, likesMap, commentsMap, bookmarksMap, currentUserId));


      // Return response compatible with both array & { articles: mapped }
      if (req.query.format === 'object') {
        res.json({ articles: mapped });
      } else {
        // Attach .articles property to array response so both res.json() array and data.articles work!
        const resObj: any = mapped;
        resObj.articles = mapped;
        res.json(resObj);
      }
    } catch (error) {
      console.error("[Get News Error]", error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  // Single News Item GET
  router.get("/news/:id", async (req, res): Promise<any> => {
    try {
      const newsIdRaw = req.params.id;
      if (!newsIdRaw) return res.status(400).json({ error: "Invalid news ID" });

      const currentUserId = extractUserId(req);

      const records = await db
        .select({
          id: news.id,
          title: news.title,
          content: news.content,
          excerpt: news.excerpt,
          category: news.category,
          source: news.source,
          imageUrl: news.imageUrl,
          images: news.images,
          videoUrl: news.videoUrl,
          readTime: news.readTime,
          isFeatured: news.isFeatured,
          formId: news.formId,
          isArchived: news.isArchived,
          date: news.date,
          createdAt: news.createdAt,
          authorName: news.authorName,
          authorHandle: news.authorHandle,
          authorAvatar: news.authorAvatar,
          authorId: news.authorId,
          entityId: news.entityId,
          profilePicUrl: news_sources.profilePicUrl,
          sourceDisplayName: news_sources.displayName,
          sourceHandle: news_sources.handle
        })
        .from(news)
        .where(matchId(news.id, newsIdRaw))
        .leftJoin(
          news_sources, 
          or(
            eq(news.source, news_sources.handle),
            eq(sql`REPLACE(${news.source}, '@', '')`, sql`REPLACE(${news_sources.handle}, '@', '')`)
          )
        );

      if (records.length === 0) {
        return res.status(404).json({ error: "Article not found" });
      }

      const rec = records[0];
      const allLikes = await db.select().from(newsLikes).where(matchId(newsLikes.newsId, newsIdRaw)).catch(() => []);
      const allComments = await db.select().from(newsComments).where(matchId(newsComments.newsId, newsIdRaw)).catch(() => []);
      const allBookmarks = await db.select().from(news_bookmarks).where(matchId(news_bookmarks.newsId, newsIdRaw)).catch(() => []);

      const mapped = mapNewsRecord(rec, allLikes, allComments, allBookmarks, currentUserId);

      res.json({ article: mapped, ...mapped });
    } catch (e) {
      console.error("[Get Article Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Bookmark / Save News Endpoint
  router.post(["/news/:id/save", "/news/:id/bookmark"], requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      const newsIdRaw = req.params.id;
      if (!newsIdRaw) return res.status(400).json({ error: "Invalid news ID" });
      const userId = req.user.uid || req.user.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized: Missing user ID" });

      const numNewsId = Number(newsIdRaw);
      const existing = await db.select().from(news_bookmarks).where(and(eq(news_bookmarks.userId, userId), matchId(news_bookmarks.newsId, newsIdRaw))).catch(() => []);
      if (existing.length > 0) {
        await db.delete(news_bookmarks).where(eq(news_bookmarks.id, existing[0].id));
        return res.json({ saved: false, isSaved: false });
      } else {
        await db.insert(news_bookmarks).values({ userId, newsId: numNewsId as any });
        return res.json({ saved: true, isSaved: true });
      }
    } catch (e) {
      console.error("[Save Article Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Like news item
  router.post("/news/:id/like", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      const newsIdRaw = req.params.id;
      if (!newsIdRaw) return res.status(400).json({ error: "Invalid news ID" });
      const userId = req.user.uid || req.user.id;
      if (!userId) return res.status(401).json({ error: "Unauthorized: Missing user ID" });

      const numNewsId = Number(newsIdRaw);
      const existing = await db.select().from(newsLikes).where(and(eq(newsLikes.userId, userId), matchId(newsLikes.newsId, newsIdRaw)));
      
      if (existing.length > 0) {
        await db.delete(newsLikes).where(eq(newsLikes.id, existing[0].id));
        const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(newsLikes).where(matchId(newsLikes.newsId, newsIdRaw));
        const likesCount = Number(count) || 0;
        return res.json({ liked: false, isLiked: false, likes: likesCount, likesCount });
      } else {
        await db.insert(newsLikes).values({ userId, newsId: numNewsId as any }).catch(async () => {});
        const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(newsLikes).where(matchId(newsLikes.newsId, newsIdRaw));
        const likesCount = Number(count) || 0;
        return res.json({ liked: true, isLiked: true, likes: likesCount, likesCount });
      }
    } catch (e) {
      console.error("[Like Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get comments for news item
  router.get("/news/:id/comments", async (req, res) => {
    try {
      const newsIdRaw = req.params.id;
      if (!newsIdRaw) return res.status(400).json({ error: "Invalid news ID" });
      const comments = await db.select({
          id: newsComments.id,
          content: newsComments.content,
          createdAt: newsComments.createdAt,
          userId: users.uid,
          userName: users.userName,
          profilePic: users.profilePicUrl
        })
        .from(newsComments)
        .where(matchId(newsComments.newsId, newsIdRaw))
        .leftJoin(users, eq(users.uid, newsComments.userId))
        .orderBy(desc(newsComments.createdAt));
      res.json(comments);
    } catch (e) {
      console.error("[Get Comments Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Post comment to news item
  router.post("/news/:id/comments", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      const newsIdRaw = req.params.id;
      if (!newsIdRaw) return res.status(400).json({ error: "Invalid news ID" });
      const userId = req.user.uid;
      const { content } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ error: "Empty comment" });

      const [newComment] = await db.insert(newsComments).values({ userId, newsId: newsIdRaw as any, content: content.trim() }).returning();
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
      console.error("[Post Comment Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Delete comment endpoint
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

  // Create Article endpoint (Article Composer POST)
  const createArticleHandler = async (req: AuthRequest, res: express.Response): Promise<any> => {
    try {
      const { title, content, tag, category, images, photoUrl, formId, entityId, isArchived, isFeatured, date } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ error: "محتوى الخبر مطلوب" });
      }

      const userRec = await db.select().from(users).where(eq(users.uid, req.user.uid));
      const authorName = userRec[0]?.userName || userRec[0]?.email?.split('@')[0] || 'إدارة الأخبار';
      const authorAvatar = userRec[0]?.profilePicUrl || null;
      const authorHandle = userRec[0]?.userName ? `@${userRec[0].userName}` : '@admin';

      const imageList = parseImageList(images, photoUrl);
      const coverImage = photoUrl || (imageList.length > 0 ? imageList[0] : null);
      const categoryName = tag || category || 'Campus';
      const calculatedReadTime = calculateReadTime(content);
      const articleTitle = deriveArticleTitle(title, content);

      const [newArticle] = await db.insert(news).values({
        title: articleTitle,
        content: content.trim(),
        excerpt: content.trim(),
        category: categoryName,
        source: 'UserPost',
        authorName,
        authorHandle,
        authorAvatar,
        authorId: req.user.uid,
        entityId: entityId || null,
        imageUrl: coverImage,
        images: JSON.stringify(imageList),
        readTime: calculatedReadTime,
        isFeatured: !!isFeatured,
        formId: formId || null,
        isArchived: !!isArchived,
        date: date || new Date().toISOString().split('T')[0]
      }).returning();

      res.json({ success: true, article: newArticle, id: newArticle.id });
    } catch (e: any) {
      console.error("[Create Article Error]", e);
      res.status(500).json({ error: "فشل نشر الخبر" });
    }
  };

  router.post("/user/articles", requireAuth, createArticleHandler);
  router.post("/news", requireAuth, createArticleHandler);

  // Update Article endpoint (Article Composer PUT)
  const updateArticleHandler = async (req: AuthRequest, res: express.Response): Promise<any> => {
    try {
      const articleId = req.params.id;
      const { title, content, tag, category, images, photoUrl, formId, entityId, isArchived, isFeatured } = req.body;

      const existing = await db.select().from(news).where(matchId(news.id, articleId));
      if (existing.length === 0) return res.status(404).json({ error: "Article not found" });

      const userId = req.user?.uid || req.user?.id;
      const isAdmin = req.user?.isAdmin || req.user?.role === 'ADMIN';
      const isAuthor = existing[0].authorId && userId && existing[0].authorId === userId;

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ error: "Forbidden: You do not have permission to modify this article" });
      }

      const imageList = parseImageList(images, photoUrl);
      const coverImage = photoUrl || (imageList.length > 0 ? imageList[0] : existing[0].imageUrl);
      const categoryName = tag || category || existing[0].category || 'Campus';

      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (content !== undefined) {
        updateData.content = content;
        updateData.excerpt = content;
        updateData.readTime = calculateReadTime(content);
      }
      if (categoryName !== undefined) updateData.category = categoryName;
      if (coverImage !== undefined) updateData.imageUrl = coverImage;
      if (imageList !== undefined) updateData.images = JSON.stringify(imageList);
      if (formId !== undefined) updateData.formId = formId;
      if (entityId !== undefined) updateData.entityId = entityId;
      if (isArchived !== undefined) updateData.isArchived = isArchived;
      if (isFeatured !== undefined) updateData.isFeatured = isFeatured;

      const [updated] = await db.update(news).set(updateData).where(matchId(news.id, articleId)).returning();
      res.json({ success: true, article: updated });
    } catch (e: any) {
      console.error("[Update Article Error]", e);
      res.status(500).json({ error: "فشل تحديث الخبر" });
    }
  };

  router.put("/user/articles/:id", requireAuth, updateArticleHandler);
  router.put("/news/:id", requireAuth, updateArticleHandler);

  // Delete Article endpoint
  const deleteArticleHandler = async (req: AuthRequest, res: express.Response): Promise<any> => {
    try {
      const articleId = req.params.id;

      const existing = await db.select().from(news).where(matchId(news.id, articleId));
      if (existing.length === 0) return res.status(404).json({ error: "Article not found" });

      const userId = req.user?.uid || req.user?.id;
      const isAdmin = req.user?.isAdmin || req.user?.role === 'ADMIN';
      const isAuthor = existing[0].authorId && userId && existing[0].authorId === userId;

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ error: "Forbidden: You do not have permission to delete this article" });
      }

      await db.delete(newsLikes).where(matchId(newsLikes.newsId, articleId));
      await db.delete(newsComments).where(matchId(newsComments.newsId, articleId));
      await db.delete(news_bookmarks).where(matchId(news_bookmarks.newsId, articleId)).catch(() => {});
      await db.delete(news).where(matchId(news.id, articleId));
      res.json({ success: true });
    } catch (e: any) {
      console.error("[Delete Article Error]", e);
      res.status(500).json({ error: "Failed to delete article" });
    }
  };


  router.delete("/news/:id", requireAuth, deleteArticleHandler);
  router.delete("/user/articles/:id", requireAuth, deleteArticleHandler);

  return router;
}
