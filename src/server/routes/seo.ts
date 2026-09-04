import express from 'express';
import { subjects, news, tutorials } from '../../db/schema';

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export function createSeoRouter(db: any) {
  const router = express.Router();

  router.get('/sitemap.xml', async (req, res) => {
    try {
      const host = req.get('host') || 'imamu.app';
      const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
      const baseUrl = `${protocol}://${host}`;

      const staticPages = [
        { url: '/', priority: '1.0', changefreq: 'daily' },
        { url: '/tools', priority: '0.9', changefreq: 'weekly' },
        { url: '/tools/gpa', priority: '0.8', changefreq: 'monthly' },
        { url: '/tools/plans', priority: '0.8', changefreq: 'monthly' },
        { url: '/resources', priority: '0.9', changefreq: 'daily' },
        { url: '/calendar', priority: '0.8', changefreq: 'weekly' },
        { url: '/news', priority: '0.9', changefreq: 'daily' },
        { url: '/how-to', priority: '0.8', changefreq: 'weekly' },
        { url: '/newbie', priority: '0.7', changefreq: 'monthly' },
        { url: '/contributors', priority: '0.7', changefreq: 'monthly' },
        { url: '/numbers', priority: '0.6', changefreq: 'monthly' },
        { url: '/emails', priority: '0.6', changefreq: 'monthly' },
      ];

      // Fetch dynamic database items safely
      const allSubjects = await db.select({ id: subjects.id, code: subjects.code, name: subjects.name, createdAt: subjects.createdAt }).from(subjects).catch(() => []);
      const allNews = await db.select({ id: news.id, createdAt: news.createdAt }).from(news).catch(() => []);
      const allTutorials = await db.select({ id: tutorials.id, createdAt: tutorials.createdAt }).from(tutorials).catch(() => []);

      const currentDate = new Date().toISOString().split('T')[0];

      let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
      xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

      // Static pages
      for (const page of staticPages) {
        xml += `  <url>\n`;
        xml += `    <loc>${escapeXml(baseUrl + page.url)}</loc>\n`;
        xml += `    <lastmod>${currentDate}</lastmod>\n`;
        xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
        xml += `    <priority>${page.priority}</priority>\n`;
        xml += `  </url>\n`;
      }

      // Dynamic Subjects
      for (const subj of allSubjects) {
        if (!subj.code) continue;
        const lastModDate = subj.createdAt ? new Date(subj.createdAt).toISOString().split('T')[0] : currentDate;
        const subjUrl = `${baseUrl}/resources?code=${encodeURIComponent(subj.code)}`;
        xml += `  <url>\n`;
        xml += `    <loc>${escapeXml(subjUrl)}</loc>\n`;
        xml += `    <lastmod>${lastModDate}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.8</priority>\n`;
        xml += `  </url>\n`;
      }

      // Dynamic News
      for (const item of allNews) {
        if (!item.id) continue;
        const lastModDate = item.createdAt ? new Date(item.createdAt).toISOString().split('T')[0] : currentDate;
        const newsUrl = `${baseUrl}/news?id=${item.id}`;
        xml += `  <url>\n`;
        xml += `    <loc>${escapeXml(newsUrl)}</loc>\n`;
        xml += `    <lastmod>${lastModDate}</lastmod>\n`;
        xml += `    <changefreq>daily</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      }

      // Dynamic Tutorials
      for (const tut of allTutorials) {
        if (!tut.id) continue;
        const lastModDate = tut.createdAt ? new Date(tut.createdAt).toISOString().split('T')[0] : currentDate;
        const tutUrl = `${baseUrl}/how-to?id=${tut.id}`;
        xml += `  <url>\n`;
        xml += `    <loc>${escapeXml(tutUrl)}</loc>\n`;
        xml += `    <lastmod>${lastModDate}</lastmod>\n`;
        xml += `    <changefreq>weekly</changefreq>\n`;
        xml += `    <priority>0.7</priority>\n`;
        xml += `  </url>\n`;
      }

      xml += `</urlset>`;

      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=14400');
      return res.send(xml);
    } catch (e) {
      console.error('[SEO Sitemap Error]', e);
      return res.status(500).send('Error generating sitemap');
    }
  });

  router.get('/robots.txt', (req, res) => {
    const host = req.get('host') || 'imamu.app';
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const baseUrl = `${protocol}://${host}`;

    const txt = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /admin-logs/

Sitemap: ${baseUrl}/sitemap.xml
`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(txt);
  });

  return router;
}
