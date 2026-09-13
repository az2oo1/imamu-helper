import express from 'express';
import jwt from 'jsonwebtoken';
import { eq, and, desc, inArray, or } from 'drizzle-orm';
import { news_sources, account_follows, news, users, newsLikes, newsComments, news_bookmarks } from '../../db/schema';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { JWT_SECRET } from '../../lib/config';
import { matchId } from '../../lib/auth-utils';
import { extractTelegramChannelPosts } from '../services/telegram';

export function createAuthenticatedAccountsRouter(db: any) {
  const router = express.Router();

  // Helper to parse JSON safely
  const parseJson = (val: any, fallback: any = []) => {
    if (!val) return fallback;
    if (typeof val !== 'string') return val;
    try {
      return JSON.parse(val);
    } catch (e) {
      return fallback;
    }
  };

  // Helper to check manager permissions
  const isManagerOrAdmin = (account: any, user: any): boolean => {
    if (!user) return false;
    if (user.isAdmin || user.role === 'ADMIN') return true;
    const assigned = parseJson(account.assignedUsers, []);
    return Array.isArray(assigned) && assigned.includes(user.uid);
  };

  // Helper to fetch account by numeric ID or handle string
  const getAccountByParam = async (param: string) => {
    if (!param || !String(param).trim()) return null;
    const isNumeric = /^\d+$/.test(param);
    const cleanHandle = String(param).replace(/^@/, '').trim();

    const accounts = await db
      .select()
      .from(news_sources)
      .where(
        isNumeric
          ? matchId(news_sources.id, param)
          : or(
              eq(news_sources.handle, param),
              eq(news_sources.handle, cleanHandle),
              eq(news_sources.handle, `@${cleanHandle}`)
            )
      );

    return accounts.length > 0 ? accounts[0] : null;
  };

  // GET /authenticated-accounts - List all accounts with follower count & follow state
  router.get('/authenticated-accounts', async (req, res) => {
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

      const sources = await db.select().from(news_sources).orderBy(desc(news_sources.createdAt));
      const follows = await db.select().from(account_follows);

      const followsMap = new Map<number, any[]>();
      for (const f of follows) {
        const key = Number(f.sourceId);
        if (!followsMap.has(key)) followsMap.set(key, []);
        followsMap.get(key)!.push(f);
      }

      const mapped = sources.map((acc: any) => {
        const accFollows = followsMap.get(Number(acc.id)) || [];
        const isFollowing = currentUserId ? accFollows.some((f: any) => f.userId === currentUserId) : false;
        const assignedUsersArr = parseJson(acc.assignedUsers, []);
        const isManager = currentUserId ? (assignedUsersArr.includes(currentUserId)) : false;

        return {
          ...acc,
          id: acc.id,
          handle: acc.handle,
          displayName: acc.displayName || acc.handle,
          bio: acc.bio || '',
          bannerUrl: acc.bannerUrl || null,
          profilePicUrl: acc.profilePicUrl || null,
          links: parseJson(acc.links, []),
          assignedUsers: assignedUsersArr,
          followersCount: accFollows.length,
          isFollowing,
          isManager
        };
      });

      res.json(mapped);
    } catch (e) {
      console.error('[Get Authenticated Accounts Error]', e);
      res.status(500).json({ error: 'Failed to fetch accounts' });
    }
  });

  // GET /authenticated-accounts/my-accounts - Accounts managed by current user
  router.get('/authenticated-accounts/my-accounts', requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    try {
      const userUid = req.user.uid;
      const isAdmin = req.user.isAdmin || req.user.role === 'ADMIN';

      const sources = await db.select().from(news_sources);
      const managed = sources.filter((acc: any) => {
        if (isAdmin) return true;
        const assigned = parseJson(acc.assignedUsers, []);
        return Array.isArray(assigned) && assigned.includes(userUid);
      });

      const follows = await db.select().from(account_follows);

      const mapped = managed.map((acc: any) => {
        const accFollows = follows.filter((f: any) => Number(f.sourceId) === Number(acc.id));
        return {
          ...acc,
          displayName: acc.displayName || acc.handle,
          links: parseJson(acc.links, []),
          assignedUsers: parseJson(acc.assignedUsers, []),
          followersCount: accFollows.length,
          isManager: true
        };
      });

      res.json(mapped);
    } catch (e) {
      console.error('[Get My Accounts Error]', e);
      res.status(500).json({ error: 'Failed to fetch managed accounts' });
    }
  });

  // GET /authenticated-accounts/:idOrHandle - Single account profile detail & published articles
  router.get('/authenticated-accounts/:idOrHandle', async (req, res): Promise<any> => {
    try {
      const param = req.params.idOrHandle;
      if (!param) return res.status(400).json({ error: 'Invalid account ID or handle' });

      let currentUserId: string | null = null;
      let currentUserIsAdmin = false;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        try {
          const decodedToken: any = jwt.verify(token, JWT_SECRET);
          currentUserId = decodedToken.uid;
          currentUserIsAdmin = !!(decodedToken.isAdmin || decodedToken.role === 'ADMIN');
        } catch (e) {}
      }

      const isNumeric = /^\d+$/.test(param);
      const cleanHandle = param.replace(/^@/, '');

      const accounts = await db
        .select()
        .from(news_sources)
        .where(
          isNumeric
            ? eq(news_sources.id, Number(param))
            : or(eq(news_sources.handle, param), eq(news_sources.handle, cleanHandle), eq(news_sources.handle, `@${cleanHandle}`))
        );

      if (accounts.length === 0) {
        return res.status(404).json({ error: 'Authenticated account not found' });
      }

      const account = accounts[0];
      const follows = await db.select().from(account_follows).where(eq(account_follows.sourceId, account.id));
      const isFollowing = currentUserId ? follows.some((f: any) => f.userId === currentUserId) : false;
      const assignedUsersArr = parseJson(account.assignedUsers, []);
      const isManager = currentUserIsAdmin || (currentUserId ? assignedUsersArr.includes(currentUserId) : false);

      // Fetch articles authored by or sourced from this entity
      const entityArticles = await db
        .select()
        .from(news)
        .where(
          or(
            eq(news.source, account.handle),
            eq(news.source, cleanHandle),
            eq(news.source, `@${cleanHandle}`),
            eq(news.entityId, String(account.id))
          )
        )
        .orderBy(desc(news.createdAt));

      const articleIds = entityArticles.map((a: any) => a.id).filter(Boolean);
      const likesMap = new Map<string, any[]>();
      const commentsMap = new Map<string, any[]>();

      if (articleIds.length > 0) {
        const allLikes = await db.select().from(newsLikes).where(inArray(newsLikes.newsId, articleIds as any)).catch(() => []);
        const allComments = await db.select().from(newsComments).where(inArray(newsComments.newsId, articleIds as any)).catch(() => []);

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
      }

      const mappedArticles = entityArticles.map((art: any) => {
        const key = String(art.id).trim();
        const likes = likesMap.get(key) || [];
        const comments = commentsMap.get(key) || [];
        const isLiked = currentUserId ? likes.some((l: any) => l.userId === currentUserId || l.userId === String(currentUserId)) : false;

        return {
          ...art,
          likes: likes.length,
          likesCount: likes.length,
          commentsCount: comments.length,
          isLiked,
          userLiked: isLiked
        };
      });

      res.json({
        ...account,
        displayName: account.displayName || account.handle,
        bio: account.bio || '',
        bannerUrl: account.bannerUrl || null,
        profilePicUrl: account.profilePicUrl || null,
        links: parseJson(account.links, []),
        assignedUsers: assignedUsersArr,
        followersCount: follows.length,
        isFollowing,
        isManager,
        articles: mappedArticles
      });
    } catch (e) {
      console.error('[Get Account Detail Error]', e);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // PUT /authenticated-accounts/:id/profile - Update account profile (bio, banner, links, etc.)
  router.put('/authenticated-accounts/:id/profile', requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    try {
      const account = await getAccountByParam(req.params.id);
      if (!account) return res.status(404).json({ error: 'Account not found' });

      if (!isManagerOrAdmin(account, req.user)) {
        return res.status(403).json({ error: 'Forbidden: You are not a manager of this account' });
      }

      const { displayName, bio, bannerUrl, profilePicUrl, links, telegramChannels } = req.body;

      const updateData: any = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (bio !== undefined) updateData.bio = bio;
      if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
      if (profilePicUrl !== undefined) updateData.profilePicUrl = profilePicUrl;
      if (links !== undefined) updateData.links = typeof links === 'string' ? links : JSON.stringify(links);
      if (telegramChannels !== undefined) {
        let tgArr: string[] = [];
        if (Array.isArray(telegramChannels)) {
          tgArr = telegramChannels.map((c: any) => String(c).replace(/^https?:\/\/(www\.)?t\.me\/(s\/)?/i, '').replace(/^t\.me\/(s\/)?/i, '').replace(/^@/, '').trim()).filter(Boolean);
        } else if (typeof telegramChannels === 'string' && telegramChannels.trim()) {
          try {
            const parsed = JSON.parse(telegramChannels);
            if (Array.isArray(parsed)) {
              tgArr = parsed.map((c: any) => String(c).replace(/^https?:\/\/(www\.)?t\.me\/(s\/)?/i, '').replace(/^t\.me\/(s\/)?/i, '').replace(/^@/, '').trim()).filter(Boolean);
            }
          } catch (e) {
            tgArr.push(telegramChannels.replace(/^https?:\/\/(www\.)?t\.me\/(s\/)?/i, '').replace(/^t\.me\/(s\/)?/i, '').replace(/^@/, '').trim());
          }
        }
        updateData.telegramChannels = tgArr.length > 0 ? JSON.stringify(tgArr) : null;
      }

      const [updated] = await db.update(news_sources).set(updateData).where(eq(news_sources.id, account.id)).returning();

      res.json({
        success: true,
        account: {
          ...updated,
          displayName: updated.displayName || updated.handle,
          links: parseJson(updated.links, []),
          assignedUsers: parseJson(updated.assignedUsers, []),
          telegramChannels: parseJson(updated.telegramChannels, [])
        }
      });
    } catch (e) {
      console.error('[Update Account Profile Error]', e);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // GET /authenticated-accounts/:id/users - Get connected manager users
  router.get('/authenticated-accounts/:id/users', requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    try {
      const account = await getAccountByParam(req.params.id);
      if (!account) return res.status(404).json({ error: 'Account not found' });

      if (!isManagerOrAdmin(account, req.user)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const assignedUids: string[] = parseJson(account.assignedUsers, []);
      if (assignedUids.length === 0) return res.json({ users: [] });

      const connectedUsers = await db.select({
        id: users.id,
        uid: users.uid,
        userName: users.userName,
        email: users.email,
        profilePicUrl: users.profilePicUrl
      }).from(users).where(inArray(users.uid, assignedUids));

      res.json({ users: connectedUsers });
    } catch (e) {
      console.error('[Get Connected Users Error]', e);
      res.status(500).json({ error: 'Failed to fetch connected users' });
    }
  });

  // POST /authenticated-accounts/:id/users - Add user UID to account managers
  router.post('/authenticated-accounts/:id/users', requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    try {
      const { userUid } = req.body;
      if (!userUid || !userUid.trim()) return res.status(400).json({ error: 'User UID is required' });

      const cleanUid = userUid.trim();

      const account = await getAccountByParam(req.params.id);
      if (!account) return res.status(404).json({ error: 'Account not found' });

      if (!isManagerOrAdmin(account, req.user)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to manage users for this account' });
      }

      let currentUids: string[] = parseJson(account.assignedUsers, []);
      if (!currentUids.includes(cleanUid)) {
        currentUids.push(cleanUid);
        await db.update(news_sources).set({ assignedUsers: JSON.stringify(currentUids) }).where(eq(news_sources.id, account.id));
      }

      // Fetch user detail for response
      const targetUserArr = await db.select().from(users).where(or(eq(users.uid, cleanUid), eq(users.email, cleanUid), eq(users.userName, cleanUid)));
      const addedUser = targetUserArr[0] || { uid: cleanUid, userName: cleanUid };

      res.json({ success: true, assignedUsers: currentUids, user: addedUser });
    } catch (e) {
      console.error('[Add Manager User Error]', e);
      res.status(500).json({ error: 'Failed to add user' });
    }
  });

  // DELETE /authenticated-accounts/:id/users/:userUid - Remove manager user UID
  router.delete('/authenticated-accounts/:id/users/:userUid', requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    try {
      const targetUid = req.params.userUid;

      const account = await getAccountByParam(req.params.id);
      if (!account) return res.status(404).json({ error: 'Account not found' });

      if (!isManagerOrAdmin(account, req.user)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      let currentUids: string[] = parseJson(account.assignedUsers, []);
      currentUids = currentUids.filter(u => u !== targetUid);

      await db.update(news_sources).set({ assignedUsers: JSON.stringify(currentUids) }).where(eq(news_sources.id, account.id));

      res.json({ success: true, assignedUsers: currentUids });
    } catch (e) {
      console.error('[Remove Manager User Error]', e);
      res.status(500).json({ error: 'Failed to remove user' });
    }
  });

  // POST /authenticated-accounts/:id/articles - Publish news article authored by entity
  router.post('/authenticated-accounts/:id/articles', requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    try {
      const account = await getAccountByParam(req.params.id);
      if (!account) return res.status(404).json({ error: 'Account not found' });

      if (!isManagerOrAdmin(account, req.user)) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to publish for this account' });
      }

      const { title, content, tag, category, images, photoUrl, formId, isArchived, isFeatured, date } = req.body;
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content is required' });
      }

      const imageList = Array.isArray(images) ? images : (photoUrl ? [photoUrl] : []);
      const coverImage = photoUrl || (imageList.length > 0 ? imageList[0] : null);
      const categoryName = tag || category || 'Campus';
      const readTime = Math.max(1, Math.ceil((content || '').split(/\s+/).length / 200)) + ' min read';

      const authorName = account.displayName || account.handle;
      const authorHandle = account.handle.startsWith('@') ? account.handle : `@${account.handle}`;
      const authorAvatar = account.profilePicUrl || null;

      const [newArticle] = await db.insert(news).values({
        title: title || (content.trim().split('\n')[0].replace(/^#+\s*/, '').slice(0, 80)),
        content: content.trim(),
        excerpt: content.trim(),
        category: categoryName,
        source: account.handle,
        authorName,
        authorHandle,
        authorAvatar,
        authorId: req.user.uid,
        entityId: String(account.id),
        imageUrl: coverImage,
        images: JSON.stringify(imageList),
        readTime,
        isFeatured: !!isFeatured,
        formId: formId || null,
        isArchived: !!isArchived,
        date: date || new Date().toISOString().split('T')[0]
      }).returning();

      res.json({ success: true, article: newArticle, id: newArticle.id });
    } catch (e) {
      console.error('[Publish Entity Article Error]', e);
      res.status(500).json({ error: 'Failed to publish article' });
    }
  });

  // POST /authenticated-accounts/:id/follow - Toggle follow state
  router.post('/authenticated-accounts/:id/follow', requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    try {
      const account = await getAccountByParam(req.params.id);
      if (!account) return res.status(404).json({ error: 'Account not found' });
      const userId = req.user.uid;

      const existing = await db
        .select()
        .from(account_follows)
        .where(and(eq(account_follows.userId, userId), eq(account_follows.sourceId, account.id)));

      if (existing.length > 0) {
        await db.delete(account_follows).where(eq(account_follows.id, existing[0].id));
        const allFollows = await db.select().from(account_follows).where(eq(account_follows.sourceId, account.id));
        return res.json({ isFollowing: false, followersCount: allFollows.length });
      } else {
        await db.insert(account_follows).values({ userId, sourceId: account.id });
        const allFollows = await db.select().from(account_follows).where(eq(account_follows.sourceId, account.id));
        return res.json({ isFollowing: true, followersCount: allFollows.length });
      }
    } catch (e) {
      console.error('[Toggle Follow Error]', e);
      res.status(500).json({ error: 'Failed to toggle follow status' });
    }
  });

  // POST /authenticated-accounts/:id/sync-telegram - Sync Telegram channel posts for entity account
  router.post('/authenticated-accounts/:id/sync-telegram', requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    try {
      const account = await getAccountByParam(req.params.id);
      if (!account) return res.status(404).json({ error: 'Account not found' });

      if (!isManagerOrAdmin(account, req.user)) {
        return res.status(403).json({ error: 'Forbidden: You are not authorized to sync news for this account' });
      }

      const syncResult = await extractTelegramChannelPosts(account.handle, 30, db);
      res.json({
        message: `تم سحب ${syncResult.newPublished} خبر جديد من القناة`,
        ...syncResult
      });
    } catch (e: any) {
      console.error('[Sync Telegram Account Error]', e);
      res.status(500).json({ error: e.message || 'Failed to sync Telegram channel' });
    }
  });

  return router;
}

export default createAuthenticatedAccountsRouter;
