import express from 'express';
import { contributors } from '../../../db/schema';
import { requireAuth, AuthRequest } from '../../../middleware/auth';
import { matchId } from '../../../lib/auth-utils';
import { logEvent } from '../../../lib/logger';
import { checkAdmin } from './common';

export function createAdminContributorsRouter(db: any) {
  const router = express.Router();

  router.get('/admin/contributors', requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: 'Admin only' });
    try {
      const records = await db.select().from(contributors).orderBy(contributors.displayOrder, contributors.id);
      res.json(records);
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: 'Failed to fetch admin contributors' });
    }
  });

  router.post('/admin/contributors', requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: 'Admin only' });
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

  router.put('/admin/contributors/:id', requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: 'Admin only' });
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

      const [updated] = await db.update(contributors).set(updateData).where(matchId(contributors.id, id)).returning();
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

  router.delete('/admin/contributors/:id', requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: 'Admin only' });
    try {
      const id = req.params.id;
      const target = await db.select().from(contributors).where(matchId(contributors.id, id));
      if (target.length === 0) return res.status(404).json({ error: 'Contributor not found' });

      await db.delete(contributors).where(matchId(contributors.id, id));

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
