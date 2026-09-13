import { news_sources, news, course_resources, subjects, users } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { downloadAndUploadToStorage } from '../../lib/storage';

export async function syncExternalImagesToStorage(db: any) {
  try {
    console.log('[DB] Checking for external images/avatars/logos to save into Garage S3 Object Storage...');

    // 1. news_sources profilePicUrl
    const sources = await db.select().from(news_sources);
    for (const s of sources) {
      if (s.profilePicUrl && (s.profilePicUrl.startsWith('http://') || s.profilePicUrl.startsWith('https://'))) {
        const storedUrl = await downloadAndUploadToStorage(s.profilePicUrl, `news_sources/${s.id}/avatar`, 'news');
        if (storedUrl && storedUrl !== s.profilePicUrl) {
          await db.update(news_sources).set({ profilePicUrl: storedUrl }).where(eq(news_sources.id, s.id));
          console.log(`[Storage Sync] Saved news_source logo @${s.handle} to Garage S3: ${storedUrl}`);
        }
      }
    }

    // 2. news authorAvatar and imageUrl
    const newsItems = await db.select().from(news);
    for (const n of newsItems) {
      const updates: any = {};
      if (n.authorAvatar && (n.authorAvatar.startsWith('http://') || n.authorAvatar.startsWith('https://'))) {
        const storedAvatar = await downloadAndUploadToStorage(n.authorAvatar, `news/${n.id}/author`, 'news');
        if (storedAvatar && storedAvatar !== n.authorAvatar) updates.authorAvatar = storedAvatar;
      }
      if (n.imageUrl && (n.imageUrl.startsWith('http://') || n.imageUrl.startsWith('https://'))) {
        const storedImg = await downloadAndUploadToStorage(n.imageUrl, `news/${n.id}/image`, 'news');
        if (storedImg && storedImg !== n.imageUrl) updates.imageUrl = storedImg;
      }
      if (Object.keys(updates).length > 0) {
        await db.update(news).set(updates).where(eq(news.id, n.id));
        console.log(`[Storage Sync] Saved news item #${n.id} media to Garage S3`, updates);
      }
    }

    // 3. course_resources avatarUrl and bannerUrl
    const resources = await db.select().from(course_resources);
    for (const r of resources) {
      const updates: any = {};
      if (r.avatarUrl && (r.avatarUrl.startsWith('http://') || r.avatarUrl.startsWith('https://') || r.avatarUrl.startsWith('data:image/'))) {
        const stored = await downloadAndUploadToStorage(r.avatarUrl, `resources/${r.id}/avatar`, 'resources');
        if (stored && stored !== r.avatarUrl) updates.avatarUrl = stored;
      }
      if (r.bannerUrl && (r.bannerUrl.startsWith('http://') || r.bannerUrl.startsWith('https://') || r.bannerUrl.startsWith('data:image/'))) {
        const stored = await downloadAndUploadToStorage(r.bannerUrl, `resources/${r.id}/banner`, 'resources');
        if (stored && stored !== r.bannerUrl) updates.bannerUrl = stored;
      }
      if (Object.keys(updates).length > 0) {
        await db.update(course_resources).set(updates).where(eq(course_resources.id, r.id));
        console.log(`[Storage Sync] Saved course_resource #${r.id} avatar to Garage S3`, updates);
      }
    }

    // 4. subjects avatarUrl and bannerUrl
    const subjs = await db.select().from(subjects);
    for (const sub of subjs) {
      const updates: any = {};
      if (sub.avatarUrl && (sub.avatarUrl.startsWith('http://') || sub.avatarUrl.startsWith('https://') || sub.avatarUrl.startsWith('data:image/'))) {
        const stored = await downloadAndUploadToStorage(sub.avatarUrl, `subjects/${sub.id}/avatar`, 'resources');
        if (stored && stored !== sub.avatarUrl) updates.avatarUrl = stored;
      }
      if (sub.bannerUrl && (sub.bannerUrl.startsWith('http://') || sub.bannerUrl.startsWith('https://') || sub.bannerUrl.startsWith('data:image/'))) {
        const stored = await downloadAndUploadToStorage(sub.bannerUrl, `subjects/${sub.id}/banner`, 'resources');
        if (stored && stored !== sub.bannerUrl) updates.bannerUrl = stored;
      }
      if (Object.keys(updates).length > 0) {
        await db.update(subjects).set(updates).where(eq(subjects.id, sub.id));
        console.log(`[Storage Sync] Saved subject #${sub.id} avatar to Garage S3`, updates);
      }
    }

    // 5. users profilePicUrl (including base64 data URLs)
    const userRecs = await db.select().from(users);
    for (const u of userRecs) {
      if (u.profilePicUrl && (u.profilePicUrl.startsWith('http://') || u.profilePicUrl.startsWith('https://') || u.profilePicUrl.startsWith('data:image/'))) {
        const stored = await downloadAndUploadToStorage(u.profilePicUrl, `users/${u.id}/pfp`, 'pfp');
        if (stored && stored !== u.profilePicUrl) {
          await db.update(users).set({ profilePicUrl: stored }).where(eq(users.id, u.id));
          console.log(`[Storage Sync] Saved user #${u.id} profile pic to Garage S3: ${stored}`);
        }
      }
    }
  } catch (err: any) {
    console.error('[Storage Sync] Error syncing external images to storage:', err.message || err);
  }
}
