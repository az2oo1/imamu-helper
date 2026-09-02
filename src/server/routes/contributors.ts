import express from 'express';
import { eq, desc, asc, or, sql, inArray } from 'drizzle-orm';
import { 
  contributors, users, course_resources, tutorial_comments, 
  newsComments, news, subjects 
} from '../../db/schema';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { logEvent } from '../../lib/logger';

export function createContributorsRouter(db: any) {
  const router = express.Router();

  // Helper check admin
  const checkAdmin = async (req: AuthRequest): Promise<boolean> => {
    if (!req.user) return false;
    if (req.user.isAdmin || req.user.role === 'ADMIN') return true;
    const userRec = await db.select().from(users).where(eq(users.uid, req.user.uid));
    return !!(userRec[0]?.isAdmin);
  };

  // 1. PUBLIC: Get all public contributors with aggregated contributions
  router.get('/contributors', async (req, res) => {
    try {
      const records = await db
        .select()
        .from(contributors)
        .where(eq(contributors.isPublic, true))
        .orderBy(asc(contributors.displayOrder), asc(contributors.id));

      // Gather linked user UIDs to aggregate live contribution tags
      const userIds = records.map((c: any) => c.userId).filter(Boolean);

      let userMap = new Map<string, any>();
      let resourcesCountMap = new Map<string, number>();
      let answersCountMap = new Map<string, number>();

      if (userIds.length > 0) {
        // Fetch linked user details
        const userRecs = await db.select().from(users).where(inArray(users.uid, userIds));
        for (const u of userRecs) {
          userMap.set(u.uid, u);
          if (u.id) userMap.set(String(u.id), u);
        }

        // Aggregate resources shared (if tagged with user_id or created)
        for (const uid of userIds) {
          try {
            const resRecs = await db.select().from(course_resources).where(eq(course_resources.whatsappLink, uid)).catch(() => []);
            resourcesCountMap.set(uid, resRecs.length);
          } catch (e) {}

          try {
            const commentsRecs = await db.select().from(tutorial_comments).where(eq(tutorial_comments.userId, uid)).catch(() => []);
            const newsComms = await db.select().from(newsComments).where(eq(newsComments.userId, uid)).catch(() => []);
            answersCountMap.set(uid, commentsRecs.length + newsComms.length);
          } catch (e) {}
        }
      }

      const formatted = records.map((c: any) => {
        let linkedUser: any = null;
        let isPrivateAccount = false;
        let totalResources = 0;
        let totalAnswers = 0;

        if (c.userId) {
          const u = userMap.get(c.userId);
          if (u) {
            linkedUser = {
              uid: u.uid,
              userName: u.userName,
              major: u.major,
              profilePicUrl: u.profilePicUrl
            };
            totalResources = resourcesCountMap.get(c.userId) || 0;
            totalAnswers = answersCountMap.get(c.userId) || 0;
          } else {
            isPrivateAccount = true;
          }
        }

        let parsedSocial = {};
        try {
          if (c.socialLinks) parsedSocial = typeof c.socialLinks === 'string' ? JSON.parse(c.socialLinks) : c.socialLinks;
        } catch (e) {}

        let parsedTools = [];
        try {
          if (c.linkedTools) parsedTools = typeof c.linkedTools === 'string' ? JSON.parse(c.linkedTools) : c.linkedTools;
        } catch (e) {}

        return {
          id: c.id,
          name: c.name,
          role: c.role,
          category: c.category || 'other',
          photoUrl: c.photoUrl || '',
          userId: c.userId || null,
          bio: c.bio || '',
          socialLinks: parsedSocial,
          linkedMajor: c.linkedMajor || null,
          linkedTools: parsedTools,
          displayOrder: c.displayOrder || 0,
          createdAt: c.createdAt,
          linkedUser,
          isPrivateAccount: isPrivateAccount || !c.userId,
          stats: {
            resourcesShared: totalResources,
            answersProvided: totalAnswers,
            totalContributions: totalResources + totalAnswers
          }
        };
      });

      res.json(formatted);
    } catch (e: any) {
      console.error('[Get Contributors Error]', e);
      res.status(500).json({ error: 'Failed to fetch contributors' });
    }
  });

  // 2. ADMIN: List all contributors (including non-public)
  router.get('/admin/contributors', requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: 'Admin only' });
    try {
      const records = await db
        .select()
        .from(contributors)
        .orderBy(asc(contributors.displayOrder), asc(contributors.id));
      res.json(records);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch admin contributors' });
    }
  });

  // 3. ADMIN: Create contributor
  router.post('/admin/contributors', requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: 'Admin only' });
    try {
      const { 
        name, role, category, photoUrl, userId, bio, 
        socialLinks, linkedMajor, linkedTools, isPublic, displayOrder 
      } = req.body;

      if (!name || !role) {
        return res.status(400).json({ error: 'الاسم والمسمى الوظيفي مطلوبان' });
      }

      const socialStr = socialLinks ? (typeof socialLinks === 'string' ? socialLinks : JSON.stringify(socialLinks)) : null;
      const toolsStr = linkedTools ? (typeof linkedTools === 'string' ? linkedTools : JSON.stringify(linkedTools)) : null;

      const [newContr] = await db.insert(contributors).values({
        name: name.trim(),
        role: role.trim(),
        category: category || 'other',
        photoUrl: photoUrl || '',
        userId: userId ? String(userId).trim() : null,
        bio: bio ? bio.trim() : null,
        socialLinks: socialStr,
        linkedMajor: linkedMajor ? linkedMajor.trim() : null,
        linkedTools: toolsStr,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
        displayOrder: displayOrder ? Number(displayOrder) : 0
      }).returning();

      await logEvent({
        level: 'admin',
        category: 'ADMIN',
        action: 'CREATE_CONTRIBUTOR',
        message: `قام المسؤول (${req.user?.email}) بإضافة المساهم الجديد (${name}) بمسمى (${role})`,
        userId: req.user?.uid,
        userEmail: req.user?.email,
        metadata: { contributorId: newContr.id, name, role }
      });

      res.json(newContr);
    } catch (e: any) {
      console.error('[Create Contributor Error]', e);
      res.status(500).json({ error: 'Failed to create contributor' });
    }
  });

  // 4. ADMIN: Update contributor
  router.put('/admin/contributors/:id', requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: 'Admin only' });
    try {
      const id = req.params.id;
      const { 
        name, role, category, photoUrl, userId, bio, 
        socialLinks, linkedMajor, linkedTools, isPublic, displayOrder 
      } = req.body;

      const updateData: any = {};
      if (name !== undefined) updateData.name = name.trim();
      if (role !== undefined) updateData.role = role.trim();
      if (category !== undefined) updateData.category = category;
      if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
      if (userId !== undefined) updateData.userId = userId ? String(userId).trim() : null;
      if (bio !== undefined) updateData.bio = bio ? bio.trim() : null;
      if (socialLinks !== undefined) updateData.socialLinks = typeof socialLinks === 'string' ? socialLinks : JSON.stringify(socialLinks);
      if (linkedMajor !== undefined) updateData.linkedMajor = linkedMajor ? linkedMajor.trim() : null;
      if (linkedTools !== undefined) updateData.linkedTools = typeof linkedTools === 'string' ? linkedTools : JSON.stringify(linkedTools);
      if (isPublic !== undefined) updateData.isPublic = Boolean(isPublic);
      if (displayOrder !== undefined) updateData.displayOrder = Number(displayOrder);

      const [updated] = await db.update(contributors).set(updateData).where(eq(contributors.id, Number(id))).returning();
      if (!updated) return res.status(404).json({ error: 'Contributor not found' });

      await logEvent({
        level: 'admin',
        category: 'ADMIN',
        action: 'UPDATE_CONTRIBUTOR',
        message: `قام المسؤول (${req.user?.email}) بتحديث بيانات المساهم (${updated.name})`,
        userId: req.user?.uid,
        userEmail: req.user?.email,
        metadata: { contributorId: updated.id, name: updated.name }
      });

      res.json(updated);
    } catch (e: any) {
      console.error('[Update Contributor Error]', e);
      res.status(500).json({ error: 'Failed to update contributor' });
    }
  });

  // 5. ADMIN: Delete contributor
  router.delete('/admin/contributors/:id', requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: 'Admin only' });
    try {
      const id = req.params.id;
      const target = await db.select().from(contributors).where(eq(contributors.id, Number(id)));
      if (target.length === 0) return res.status(404).json({ error: 'Contributor not found' });

      await db.delete(contributors).where(eq(contributors.id, Number(id)));

      await logEvent({
        level: 'admin',
        category: 'ADMIN',
        action: 'DELETE_CONTRIBUTOR',
        message: `قام المسؤول (${req.user?.email}) بحذف المساهم (${target[0].name}) نهائياً`,
        userId: req.user?.uid,
        userEmail: req.user?.email,
        metadata: { contributorId: id, name: target[0].name }
      });

      res.json({ success: true, message: 'Contributor deleted successfully' });
    } catch (e: any) {
      console.error('[Delete Contributor Error]', e);
      res.status(500).json({ error: 'Failed to delete contributor' });
    }
  });

  return router;
}
