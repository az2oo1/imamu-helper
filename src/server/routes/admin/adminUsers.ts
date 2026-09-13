import express from 'express';
import { sql, or, eq, desc } from 'drizzle-orm';
import { users, newsComments, tutorial_comments, newsLikes } from '../../../db/schema';
import { requireAuth, AuthRequest } from '../../../middleware/auth';
import { matchId } from '../../../lib/auth-utils';
import { logEvent } from '../../../lib/logger';
import { checkAdmin } from './common';

export function createAdminUsersRouter(db: any) {
  const router = express.Router();

  // Admin Users List
  const getUsersHandler = async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const search = (req.query.search as string || '').trim().toLowerCase();
      let userList;
      if (search) {
        userList = await db.select().from(users)
          .where(or(
            sql`LOWER(${users.userName}) LIKE ${'%' + search + '%'}`,
            sql`LOWER(${users.email}) LIKE ${'%' + search + '%'}`,
            sql`LOWER(${users.studentEmail}) LIKE ${'%' + search + '%'}`,
            sql`LOWER(${users.googleEmail}) LIKE ${'%' + search + '%'}`,
            sql`LOWER(${users.major}) LIKE ${'%' + search + '%'}`
          ))
          .orderBy(desc(users.id));
      } else {
        userList = await db.select().from(users).orderBy(desc(users.id));
      }
      res.json(userList.map((u: any) => {
        const { passwordHash, currentGpa, ...sanitized } = u; // Omit GPA from user list
        return sanitized;
      }));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  };
  router.get("/admin/users", requireAuth, getUsersHandler as any);

  // Get User Details
  router.get("/admin/users/:id/details", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idParam = req.params.id;
      const condition = or(
        matchId(users.id, idParam),
        eq(users.uid, idParam),
        eq(users.email, idParam)
      );
      const userList = await db.select().from(users).where(condition);
      const targetUser = userList[0];

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const nComments = await db.select().from(newsComments).where(eq(newsComments.userId, targetUser.uid));
      const tComments = await db.select().from(tutorial_comments).where(eq(tutorial_comments.userId, targetUser.uid));
      const nLikes = await db.select().from(newsLikes).where(eq(newsLikes.userId, targetUser.uid));

      const { passwordHash, currentGpa, ...sanitizedUser } = targetUser;

      res.json({
        user: sanitizedUser,
        stats: {
          commentsCount: nComments.length + tComments.length,
          likesCount: nLikes.length,
        },
        comments: [
          ...nComments.map(c => ({ id: c.id, content: c.content, category: 'أخبار', createdAt: c.createdAt })),
          ...tComments.map(c => ({ id: c.id, content: c.content, category: 'شروحات', createdAt: c.createdAt })),
        ],
        likesCount: nLikes.length
      });
    } catch (e: any) {
      console.error("[Get User Details Error]", e);
      res.status(500).json({ error: "Failed to fetch user details" });
    }
  });

  // Toggle Ban Status
  router.put("/admin/users/:id/toggle-ban", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idParam = req.params.id;
      const condition = or(
        matchId(users.id, idParam),
        eq(users.uid, idParam),
        eq(users.email, idParam)
      );
      const userList = await db.select().from(users).where(condition);
      const targetUser = userList[0];

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (req.user?.uid && targetUser.uid === req.user.uid) {
        return res.status(400).json({ error: "Cannot ban your own admin account" });
      }

      const newIsBanned = !targetUser.isBanned;
      const [updated] = await db.update(users)
        .set({ isBanned: newIsBanned })
        .where(condition)
        .returning();

      await logEvent({
        level: 'admin',
        category: 'ADMIN',
        action: newIsBanned ? 'BAN_USER' : 'UNBAN_USER',
        message: `قام المسؤول (${req.user?.email || 'الأدمن'}) بـ ${newIsBanned ? 'حظر' : 'إلغاء حظر'} حساب المستخدم (${targetUser.userName || targetUser.email})`,
        userId: req.user?.uid,
        userEmail: req.user?.email,
        metadata: { targetUserId: targetUser.uid, targetUserEmail: targetUser.email, isBanned: newIsBanned }
      });

      const { passwordHash, currentGpa, ...sanitized } = updated;
      res.json({ success: true, user: sanitized });
    } catch (e: any) {
      console.error("[Toggle Ban Error]", e);
      res.status(500).json({ error: "Failed to update user ban status" });
    }
  });

  // Toggle Admin Status
  const toggleAdminHandler = async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idParam = req.params.id;
      const { permissions } = req.body;
      const condition = or(
        matchId(users.id, idParam),
        eq(users.uid, idParam),
        eq(users.email, idParam)
      );
      const userList = await db.select().from(users).where(condition);
      const targetUser = userList[0];

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const newIsAdmin = !targetUser.isAdmin;
      const permString = newIsAdmin ? (Array.isArray(permissions) ? JSON.stringify(permissions) : targetUser.adminPermissions || null) : null;

      const [updated] = await db.update(users)
        .set({ isAdmin: newIsAdmin, adminPermissions: permString })
        .where(condition)
        .returning();

      await logEvent({
        level: 'admin',
        category: 'ADMIN',
        action: newIsAdmin ? 'GRANT_ADMIN' : 'REVOKE_ADMIN',
        message: `قام المسؤول (${req.user?.email || 'الأدمن'}) بـ ${newIsAdmin ? 'منح' : 'سحب'} صلاحيات المسؤول للمستخدم (${targetUser.userName || targetUser.email})${newIsAdmin && Array.isArray(permissions) ? ` بالصلاحيات: [${permissions.join(', ')}]` : ''}`,
        userId: req.user?.uid,
        userEmail: req.user?.email,
        metadata: { targetUserId: targetUser.uid, targetUserEmail: targetUser.email, isAdmin: newIsAdmin, permissions }
      });

      const { passwordHash, ...sanitized } = updated;
      res.json({ success: true, user: sanitized });
    } catch (e: any) {
      console.error("[Toggle Admin Error]", e);
      res.status(500).json({ error: "Failed to update user admin status" });
    }
  };
  router.put("/admin/users/:id/toggle-admin", requireAuth, toggleAdminHandler as any);

  // Update Admin Permissions
  router.put("/admin/users/:id/permissions", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idParam = req.params.id;
      const { permissions } = req.body;
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ error: "Permissions must be an array" });
      }
      const condition = or(
        matchId(users.id, idParam),
        eq(users.uid, idParam),
        eq(users.email, idParam)
      );
      const userList = await db.select().from(users).where(condition);
      const targetUser = userList[0];

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const permString = JSON.stringify(permissions);
      const [updated] = await db.update(users)
        .set({ isAdmin: true, adminPermissions: permString })
        .where(condition)
        .returning();

      await logEvent({
        level: 'admin',
        category: 'ADMIN',
        action: 'UPDATE_ADMIN_PERMISSIONS',
        message: `قام المسؤول (${req.user?.email || 'الأدمن'}) بتحديث صلاحيات المسؤول للمستخدم (${targetUser.userName || targetUser.email}) إلى: [${permissions.join(', ')}]`,
        userId: req.user?.uid,
        userEmail: req.user?.email,
        metadata: { targetUserId: targetUser.uid, targetUserEmail: targetUser.email, permissions }
      });

      const { passwordHash, ...sanitized } = updated;
      res.json({ success: true, user: sanitized });
    } catch (e: any) {
      console.error("[Update Permissions Error]", e);
      res.status(500).json({ error: "Failed to update admin permissions" });
    }
  });

  // Delete User
  const deleteUserHandler = async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idParam = req.params.id;
      const condition = or(
        matchId(users.id, idParam),
        eq(users.uid, idParam),
        eq(users.email, idParam)
      );
      const userList = await db.select().from(users).where(condition);
      const targetUser = userList[0];

      if (!targetUser) {
        return res.status(404).json({ error: "User not found" });
      }

      if (req.user?.uid && targetUser.uid === req.user.uid) {
        return res.status(400).json({ error: "Cannot delete your own admin account" });
      }

      await db.delete(users).where(condition);

      await logEvent({
        level: 'admin',
        category: 'ADMIN',
        action: 'DELETE_USER',
        message: `قام المسؤول (${req.user?.email || 'الأدمن'}) بحذف حساب المستخدم (${targetUser.userName || targetUser.email}) نهائياً`,
        userId: req.user?.uid,
        userEmail: req.user?.email,
        metadata: { targetUserId: targetUser.uid, targetUserEmail: targetUser.email }
      });

      res.json({ success: true, message: "User deleted successfully" });
    } catch (e: any) {
      console.error("[Delete User Error]", e);
      res.status(500).json({ error: "Failed to delete user" });
    }
  };
  router.delete("/admin/users/:id", requireAuth, deleteUserHandler as any);

  // General Update User
  const updateUserHandler = async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idParam = req.params.id;
      const condition = or(
        matchId(users.id, idParam),
        eq(users.uid, idParam),
        eq(users.email, idParam)
      );

      const { userName, email, phone, major, isAdmin, currentGpa, finishedHours } = req.body;
      const updateData: any = {};
      if (userName !== undefined) updateData.userName = userName;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (major !== undefined) updateData.major = major;
      if (isAdmin !== undefined) updateData.isAdmin = Boolean(isAdmin);
      if (currentGpa !== undefined) updateData.currentGpa = currentGpa;
      if (finishedHours !== undefined) updateData.finishedHours = Number(finishedHours);

      const [updated] = await db.update(users).set(updateData).where(condition).returning();
      if (!updated) {
        return res.status(404).json({ error: "User not found" });
      }
      const { passwordHash, ...sanitized } = updated;
      res.json(sanitized);
    } catch (e: any) {
      console.error("[Update User Error]", e);
      res.status(500).json({ error: "Failed to update user" });
    }
  };
  router.put("/admin/users/:id", requireAuth, updateUserHandler as any);

  return router;
}
