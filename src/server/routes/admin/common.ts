import multer from 'multer';
import { eq } from 'drizzle-orm';
import { users } from '../../../db/schema';
import { getDb } from '../../../db/index';
import { AuthRequest } from '../../../middleware/auth';

const storage = multer.memoryStorage();

export const uploadStorage = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

export async function checkAdmin(req: AuthRequest, db?: any): Promise<boolean> {
  if (!req.user) return false;
  if (req.user.isAdmin || req.user.role === 'ADMIN') return true;
  const database = db || (await getDb());
  if (database) {
    try {
      const condition = req.user.uid
        ? eq(users.uid, req.user.uid)
        : req.user.email
        ? eq(users.email, req.user.email)
        : req.user.id
        ? eq(users.id, Number(req.user.id))
        : null;
      if (condition) {
        const records = await database.select().from(users).where(condition).limit(1);
        const u = records[0];
        return !!(u?.isAdmin || u?.role === 'ADMIN');
      }
    } catch (e) {}
  }
  return false;
}
