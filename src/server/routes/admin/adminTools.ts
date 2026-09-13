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

  // Newbie Links
  router.get("/newbie/links", async (req, res): Promise<any> => {
    try {
      const linkList = await db.select().from(tools).where(eq(tools.category, 'newbie_link'));
      res.json(linkList.map((t: any) => ({ id: t.id, title: t.title, description: t.description, url: t.link, link: t.link })));
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch newbie links" });
    }
  });

  router.post("/admin/newbie/links", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const { title, url, link, description } = req.body;
      const targetUrl = url || link || '#';
      const [newLink] = await db.insert(tools).values({
        title: title || 'رابط جديد',
        description: description || '',
        link: targetUrl,
        category: 'newbie_link'
      }).returning();
      res.json({ id: newLink.id, title: newLink.title, description: newLink.description, url: newLink.link, link: newLink.link });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to create newbie link" });
    }
  });

  router.put("/admin/newbie/links/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idRaw = req.params.id;
      const { title, url, link, description } = req.body;
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (url !== undefined || link !== undefined) updateData.link = url || link;

      const [updated] = await db.update(tools).set(updateData).where(matchId(tools.id, idRaw)).returning();
      if (!updated) return res.status(404).json({ error: "Link not found" });
      res.json({ id: updated.id, title: updated.title, description: updated.description, url: updated.link, link: updated.link });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to update newbie link" });
    }
  });

  router.delete("/admin/newbie/links/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idRaw = req.params.id;
      await db.delete(tools).where(matchId(tools.id, idRaw));
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Failed to delete newbie link" });
    }
  });

  return router;
}
