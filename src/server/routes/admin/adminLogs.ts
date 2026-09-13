import express from 'express';
import { eq, desc, or, sql } from 'drizzle-orm';
import { activity_logs } from '../../../db/schema';
import { requireAuth, AuthRequest } from '../../../middleware/auth';
import { logger } from '../../../middleware/logger';
import { checkAdmin } from './common';

export function createAdminLogsRouter(db: any) {
  const router = express.Router();

  // Admin Activity Logs (Optimized aggregated count query!)
  router.get("/admin/logs", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;
      const category = req.query.category as string;
      const level = req.query.level as string;
      const search = (req.query.search as string || '').trim();

      let query = db.select().from(activity_logs).$dynamic();
      if (category && category !== 'ALL' && category !== 'all') {
        query = query.where(eq(activity_logs.category, category));
      }
      if (level && level !== 'ALL' && level !== 'all') {
        query = query.where(eq(activity_logs.level, level));
      }
      if (search) {
        const pattern = `%${search}%`;
        query = query.where(
          or(
            sql`LOWER(${activity_logs.message}) LIKE LOWER(${pattern})`,
            sql`LOWER(${activity_logs.action}) LIKE LOWER(${pattern})`,
            sql`LOWER(${activity_logs.userEmail}) LIKE LOWER(${pattern})`
          )
        );
      }

      const logsList = await query.orderBy(desc(activity_logs.createdAt)).limit(limit).offset(offset);
      res.json({ logs: logsList, total: logsList.length });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  router.get("/admin/logs/stats", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const [categoryCounts, levelCounts] = await Promise.all([
        db.select({
          category: activity_logs.category,
          count: sql<number>`count(*)`
        }).from(activity_logs).groupBy(activity_logs.category),
        db.select({
          level: activity_logs.level,
          count: sql<number>`count(*)`
        }).from(activity_logs).groupBy(activity_logs.level)
      ]);

      const countsMap: Record<string, number> = {};
      let total = 0;
      for (const row of categoryCounts) {
        const cnt = Number(row.count || 0);
        countsMap[row.category] = cnt;
        total += cnt;
      }

      const levelMap: Record<string, number> = {};
      for (const row of levelCounts) {
        if (row.level) {
          levelMap[row.level.toLowerCase()] = Number(row.count || 0);
        }
      }

      const errors = (levelMap['error'] || 0) + (levelMap['warn'] || 0);

      res.json({
        total,
        system: countsMap['SYSTEM'] || 0,
        auth: countsMap['AUTH'] || levelMap['auth'] || 0,
        admin: countsMap['ADMIN'] || levelMap['admin'] || 0,
        sync: countsMap['MSARI_SYNC'] || countsMap['SYNC'] || 0,
        errors,
      });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to fetch log stats" });
    }
  });

  router.delete("/admin/logs/clear", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      await db.delete(activity_logs);
      logger.admin("CLEAR_LOGS", "System activity logs cleared");
      res.json({ success: true, message: "Logs cleared successfully" });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to clear logs" });
    }
  });

  return router;
}
