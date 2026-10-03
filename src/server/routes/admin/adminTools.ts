import express from 'express';
import { desc, eq } from 'drizzle-orm';
import { tools } from '../../../db/schema';
import { requireAuth, AuthRequest } from '../../../middleware/auth';
import { matchId } from '../../../lib/auth-utils';
import { checkAdmin } from './common';

export function createAdminToolsRouter(db: any) {
  const router = express.Router();

  // Tools Routes
  router.get("/tools", async (req: express.Request, res: express.Response) => {
    try {
      const allTools = await db.select().from(tools).orderBy(desc(tools.id));
      res.json(allTools);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/admin/tools", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const { title, name, description, link, icon, category } = req.body;
      const toolTitle = title || name;
      if (!toolTitle || !link) {
        return res.status(400).json({ error: "Title and link are required" });
      }
      const [newTool] = await db.insert(tools).values({
        title: toolTitle,
        description: description || '',
        link,
        icon: icon || null,
        category: category || 'عام'
      }).returning();
      res.json(newTool);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.put("/admin/tools/:id", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idRaw = req.params.id;
      if (!idRaw || isNaN(Number(idRaw))) {
        return res.status(400).json({ error: "Invalid tool ID" });
      }
      const { title, name, description, link, icon, category } = req.body;
      const toolTitle = title || name;
      const updateData: any = {};
      if (toolTitle !== undefined) updateData.title = toolTitle;
      if (description !== undefined) updateData.description = description;
      if (link !== undefined) updateData.link = link;
      if (icon !== undefined) updateData.icon = icon;
      if (category !== undefined) updateData.category = category;

      const [updatedTool] = await db.update(tools).set(updateData).where(matchId(tools.id, idRaw)).returning();
      if (!updatedTool) return res.status(404).json({ error: "Tool not found" });
      res.json(updatedTool);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.delete("/admin/tools/:id", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idRaw = req.params.id;
      if (!idRaw || isNaN(Number(idRaw))) {
        return res.status(400).json({ error: "Invalid tool ID" });
      }
      await db.delete(tools).where(matchId(tools.id, idRaw));
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  return router;
}
