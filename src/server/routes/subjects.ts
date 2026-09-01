import express from 'express';
import { eq, sql, inArray } from 'drizzle-orm';
import { subjects, majors, majorCourses, course_resources } from '../../db/schema';
import { requireAuth } from '../../middleware/auth';
import { matchId, matchSubjectIds } from '../../lib/auth-utils';
import { cleanCourseName } from '../../lib/url-utils';

export function createSubjectsRouter(db: any) {
  const router = express.Router();

  // WhatsApp Group Avatar Scraper & Proxy
  router.get("/whatsapp-avatar", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const rawUrl = String(req.query.url || '').trim();
      if (!rawUrl || (!rawUrl.includes('chat.whatsapp.com') && !rawUrl.includes('wa.me'))) {
        return res.status(400).json({ error: "Invalid WhatsApp URL" });
      }

      // Fetch WhatsApp invite page HTML using social crawler user agent
      const resp = await fetch(rawUrl, {
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        }
      });

      if (!resp.ok) {
        return res.status(404).json({ error: "Could not fetch WhatsApp link" });
      }

      const html = await resp.text();
      const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

      if (ogMatch && ogMatch[1]) {
        const imageUrl = ogMatch[1].replace(/&amp;/g, '&');
        const imageResp = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        if (imageResp.ok) {
          const contentType = imageResp.headers.get('content-type') || 'image/jpeg';
          const buffer = await imageResp.arrayBuffer();
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(Buffer.from(buffer));
        }
      }

      return res.status(404).json({ error: "No group image found" });
    } catch (err) {
      console.error("Error fetching WhatsApp avatar:", err);
      return res.status(500).json({ error: "Failed to load WhatsApp avatar" });
    }
  });

  const getSubjectsHandler = async (req: express.Request, res: express.Response) => {
    try {
      let allSubjects = await db.select().from(subjects);


      const allMajorCourses = await db.select().from(majorCourses);
      let allCourseResources: any[] = [];
      try {
        allCourseResources = await db.select().from(course_resources);
      } catch (crErr) {}

      const majorMap = new Map<string, number>();
      for (const mc of allMajorCourses) {
        const key = String(mc.subjectId);
        if (!majorMap.has(key)) {
          majorMap.set(key, mc.majorId);
        }
      }

      const resourceMap = new Map<string, any[]>();
      for (const cr of allCourseResources) {
        const key = String(cr.subjectId);
        if (!resourceMap.has(key)) {
          resourceMap.set(key, []);
        }
        resourceMap.get(key)!.push(cr);
      }

      const mapped = allSubjects.map((s: any) => ({
        ...s,
        majorId: majorMap.get(String(s.id)) || null,
        resources: resourceMap.get(String(s.id)) || []
      }));

      res.json(mapped);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch subjects" });
    }
  };

  router.get("/subjects", getSubjectsHandler);
  router.get("/courses", getSubjectsHandler);

  // Get course/subject details by code or ID
  const getCourseDetailsHandler = async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { idOrCode } = req.params;
      const rawDecoded = decodeURIComponent(idOrCode || '').trim();
      const realId = rawDecoded.replace(/^syn(thetic)?_/, '').trim();
      const isNumeric = !isNaN(Number(realId)) && realId !== '';
      const cleanSearchCode = realId.toLowerCase().replace(/[\s\-]/g, '');

      let subjectList = await db.select().from(subjects).where(
        isNumeric 
          ? matchId(subjects.id, realId)
          : sql`REPLACE(REPLACE(LOWER(${subjects.code}), ' ', ''), '-', '') = ${cleanSearchCode}`
      );
      if (subjectList.length === 0 && isNumeric) {
        const allSubjs = await db.select().from(subjects);
        const foundSubj = allSubjs.find((s: any) => matchSubjectIds(s.id, realId));
        if (foundSubj) {
          subjectList = [foundSubj];
        }
      }
      if (subjectList.length === 0 && !isNumeric) {
        subjectList = await db.select().from(subjects).where(
          sql`LOWER(${subjects.name}) LIKE LOWER(${'%' + realId + '%'}) OR LOWER(${subjects.code}) LIKE LOWER(${'%' + realId + '%'})`
        );
      }

      // Regex extraction fallback if realId was a title string like "مصادر مادة CS1111 - ..."
      if (subjectList.length === 0) {
        const extractedCode = realId.match(/[A-Z]{2,4}\d{3,4}|عال\d{4}/i)?.[0];
        if (extractedCode) {
          const cleanExtracted = extractedCode.toLowerCase().replace(/[\s\-]/g, '');
          subjectList = await db.select().from(subjects).where(
            sql`REPLACE(REPLACE(LOWER(${subjects.code}), ' ', ''), '-', '') = ${cleanExtracted}`
          );
        }
      }

      let subject = subjectList[0];

      // If subject was not found directly, check if idOrCode matches a course_resource or subject_id
      if (!subject) {
        let matchingResources: any[] = [];
        if (isNumeric) {
          matchingResources = await db.select().from(course_resources).where(
            sql`${matchId(course_resources.id, realId)} OR ${matchId(course_resources.subjectId, realId)}`
          );
        }
        if (matchingResources.length === 0) {
          matchingResources = await db.select().from(course_resources).where(
            sql`LOWER(${course_resources.title}) LIKE LOWER(${'%' + realId + '%'}) OR LOWER(${course_resources.description}) LIKE LOWER(${'%' + realId + '%'})`
          );
        }

        const firstRes = isNumeric 
          ? (matchingResources.find((r: any) => matchId(r.id, realId)) || matchingResources[0])
          : matchingResources[0];

        if (firstRes) {
          // 1. Only resolve parent subject if firstRes has a subjectId AND realId was NOT explicitly requesting a specific resource ID!
          if (firstRes.subjectId && !isNumeric) {
            const allSubjs = await db.select().from(subjects);
            const linkedSubj = allSubjs.find((s: any) => matchSubjectIds(s.id, firstRes.subjectId));
            if (linkedSubj) {
              subject = linkedSubj;
            }
          }
          // 2. If subjectId failed or wasn't set, try extracting course code from firstRes.title / firstRes.description!
          if (!subject && !isNumeric) {
            const codeFromRes = (firstRes.title + ' ' + (firstRes.description || '')).match(/[A-Z]{2,4}\d{3,4}|عال\d{4}/i)?.[0];
            if (codeFromRes) {
              const cleanCodeFromRes = codeFromRes.toLowerCase().replace(/[\s\-]/g, '');
              const matchedSubj = (await db.select().from(subjects).where(
                sql`REPLACE(REPLACE(LOWER(${subjects.code}), ' ', ''), '-', '') = ${cleanCodeFromRes}`
              ))[0];
              if (matchedSubj) {
                subject = matchedSubj;
                // Auto-fix the missing or float-corrupted subjectId on the resource in database
                db.update(course_resources).set({ subjectId: matchedSubj.id }).where(matchId(course_resources.id, firstRes.id)).catch(() => {});
              }
            }
          }
        }

        // If still no subject exists in catalog (or if a specific resource was queried directly), return rich fallback course object
        if (!subject) {
          const connectUrl = process.env.CONNECT_APP_URL || 'http://localhost:3000';
          const codeMatchInRes = (firstRes?.title + ' ' + (firstRes?.description || '')).match(/[A-Z]{2,4}\d{3,4}|عال\d{4}/i)?.[0];
          const isGroupRes = firstRes?.type === 'group' || firstRes?.type === 'whatsapp' || firstRes?.title?.includes('قروب') || firstRes?.title?.includes('مجموعة');
          const fallbackCode = codeMatchInRes || (isGroupRes ? 'مجموعة طلابية' : (isNumeric ? 'مصدر أكاديمي' : realId.replace(/^مصادر مادة\s*/i, '').replace(/^مادة\s*/i, '').trim()));
          
          let fallbackName = firstRes?.title || (firstRes?.description ? cleanCourseName(firstRes.description) : '');
          if (!fallbackName || fallbackName === 'مادة' || fallbackName === 'مصادر مادة' || fallbackName === 'مصادر مادة مادة') {
            fallbackName = fallbackCode ? fallbackCode : 'تفاصيل المصدر الأكاديمي';
          }
          fallbackName = fallbackName
            .replace(/^مصادر مادة\s+مادة\s*/gi, '')
            .replace(/^مصادر مادة\s*/gi, '')
            .replace(/^مادة\s+مادة\s*/gi, '')
            .trim();

          const fallbackDescription = firstRes?.description?.trim() || null;

          return res.json({
            course: {
              id: idOrCode,
              subjectId: firstRes?.subjectId || null,
              isAcademicSubject: false,
              code: fallbackCode || 'مصدر أكاديمي',
              name: fallbackName || fallbackCode || 'مصدر أكاديمي',
              creditHours: null,
              level: null,
              description: fallbackDescription,
              freeResourcesUrl: firstRes?.freeResourcesUrl || undefined,
              paidResourcesUrl: firstRes?.paidResourcesUrl || undefined,
              boxLink: firstRes?.boxLink || undefined,
              whatsappLink: firstRes?.whatsappLink || undefined,
              avatarUrl: firstRes?.avatarUrl || undefined,
              bannerUrl: firstRes?.bannerUrl || undefined,
              resources: matchingResources,
              prerequisites: [],
              dependents: []
            }
          });
        }
      }

      const allCr = await db.select().from(course_resources);
      let allResources = allCr.filter((cr: any) => {
        if (matchSubjectIds(cr.subjectId, subject.id)) return true;
        const cleanS = cleanCourseName(subject.name).toLowerCase();
        const cleanT = cleanCourseName(cr.title).toLowerCase();
        const cleanCode = (subject.code || '').toLowerCase().trim();
        const titleText = (cr.title + ' ' + (cr.description || '')).toLowerCase();
        return (cleanS && cleanT && (cleanS === cleanT || cleanT.includes(cleanS) || cleanS.includes(cleanT))) ||
               (cleanCode && cleanCode.length > 2 && titleText.includes(cleanCode));
      });
      const connectUrl = process.env.CONNECT_APP_URL || 'http://localhost:3000';

      const subjectMajorLinks = await db.select().from(majorCourses).where(matchId(majorCourses.subjectId, subject.id));
      const allMajorCourses = await db.select().from(majorCourses);

      let prereqCodes: string[] = [];
      subjectMajorLinks.forEach((link: any) => {
        if (link.prereq) {
          const codes = link.prereq.split(/[,|\s\+/]+/).map((s: string) => s.trim()).filter(Boolean);
          prereqCodes.push(...codes);
        }
      });
      if (prereqCodes.length === 0 && subject.description) {
        const match = subject.description.match(/(?:المتطلبات السابقة:|prereq:?)\s*([A-Z0-9,\s\u0600-\u06FF]+)/i);
        if (match) {
          const codes = match[1].match(/[A-Z]{2,4}\d{3,4}|عال\d{4}/g);
          if (codes) prereqCodes.push(...codes);
        }
      }
      prereqCodes = Array.from(new Set(prereqCodes));

      let prerequisites: { id: number; code: string; name: string }[] = [];
      if (prereqCodes.length > 0) {
        const allSimpleSubjects = await db.select({ id: subjects.id, code: subjects.code, name: subjects.name }).from(subjects);
        prerequisites = allSimpleSubjects.filter((s: any) => prereqCodes.some(code => code && s.code && code.toLowerCase() === s.code.toLowerCase()));
      }

      const dependentSubjectIds = allMajorCourses.filter((mc: any) => {
        if (!mc.prereq || !subject?.code) return false;
        return mc.prereq.toLowerCase().includes(subject.code.toLowerCase());
      }).map((mc: any) => mc.subjectId);

      let dependents: { id: any; code: string; name: string }[] = [];
      if (dependentSubjectIds.length > 0) {
        const depSet = new Set(dependentSubjectIds.map((id: any) => String(id)));
        const allSubjectsList = await db.select({ id: subjects.id, code: subjects.code, name: subjects.name }).from(subjects);
        dependents = allSubjectsList.filter((s: any) => depSet.has(String(s.id)));
      }

      const firstWaResource = allResources.find((r: any) => r.whatsappLink || r.whatsappUrl || (r.url && r.url.includes('whatsapp')));
      const resolvedWhatsappLink = subject.whatsappLink || firstWaResource?.whatsappLink || firstWaResource?.whatsappUrl || firstWaResource?.url || null;
      const firstAvatar = subject.avatarUrl || allResources.find((r: any) => r.avatarUrl)?.avatarUrl || null;
      const firstBanner = subject.bannerUrl || allResources.find((r: any) => r.bannerUrl)?.bannerUrl || null;
      const firstResWithDesc = allResources.find((r: any) => r.description && r.description.trim() && !r.description.trim().startsWith('المتطلبات السابقة:') && !r.description.trim().startsWith('المتطلب السابق:'));
      const subjDescIsPrereqOnly = subject.description?.trim().startsWith('المتطلبات السابقة:') || subject.description?.trim().startsWith('المتطلب السابق:');
      const resolvedDescription = (subjDescIsPrereqOnly && firstResWithDesc?.description) 
        ? firstResWithDesc.description.trim() 
        : (subject.description?.trim() || firstResWithDesc?.description?.trim() || null);

      res.json({
        course: {
          ...subject,
          description: resolvedDescription,
          avatarUrl: firstAvatar,
          bannerUrl: firstBanner,
          whatsappLink: resolvedWhatsappLink,
          isAcademicSubject: true,
          resources: allResources,
          prerequisites,
          dependents,
          connectUrl: `${connectUrl.replace(/\/$/, '')}/academics?courseId=${encodeURIComponent(subject.code)}`
        }
      });
    } catch (error) {
      console.error("Error in getCourseDetailsHandler:", error);
      res.status(500).json({ error: "Failed to fetch course details" });
    }
  };

  router.get("/subjects/:idOrCode/details", getCourseDetailsHandler);
  router.get("/courses/:idOrCode/details", getCourseDetailsHandler);
  router.get("/subjects/:idOrCode", getCourseDetailsHandler);
  router.get("/courses/:idOrCode", getCourseDetailsHandler);

  router.get("/majors", async (req: express.Request, res: express.Response) => {
    try {
      const records = await db.select().from(majors);
      const rawMajorCourses: any = await db.execute(sql`SELECT CAST(id AS text) as id, CAST(major_id AS text) as "majorId", CAST(subject_id AS text) as "subjectId", optional_group as "optionalGroup", optional_group_req_count as "optionalGroupReqCount", prereq FROM major_courses`).catch(() => []);
      const allMajorCourses = rawMajorCourses.rows || rawMajorCourses || [];

      if (!records || records.length === 0) {
        return res.json([
          { id: 1, name: 'علوم الحاسب', pdfUrl: null, courseIds: [], courses: [] },
          { id: 2, name: 'تقنية المعلومات', pdfUrl: null, courseIds: [], courses: [] },
          { id: 3, name: 'نظم المعلومات', pdfUrl: null, courseIds: [], courses: [] }
        ]);
      }

      const mapped = records.map((m: any) => {
        const courseIds = allMajorCourses.filter((mc: any) => String(mc.majorId) === String(m.id)).map((mc: any) => String(mc.subjectId));
        const courses = allMajorCourses.filter((mc: any) => String(mc.majorId) === String(m.id)).map((mc: any) => ({
          subjectId: String(mc.subjectId), optionalGroup: mc.optionalGroup, optionalGroupReqCount: mc.optionalGroupReqCount, prereq: mc.prereq
        }));
        return {
          ...m,
          courseIds,
          courses
        };
      });
      res.json(mapped);
    } catch (error) {
      console.error(error);
      res.json([
        { id: 1, name: 'علوم الحاسب', pdfUrl: null, courseIds: [], courses: [] },
        { id: 2, name: 'تقنية المعلومات', pdfUrl: null, courseIds: [], courses: [] },
        { id: 3, name: 'نظم المعلومات', pdfUrl: null, courseIds: [], courses: [] }
      ]);
    }
  });



  router.get("/resources", requireAuth, async (req: express.Request, res: express.Response) => {
    try {
      const allSubjects = await db.select().from(subjects);
      const allMajors = await db.select().from(majors);
      const allMajorCourses = await db.select().from(majorCourses);
      const allCourseResources = await db.select().from(course_resources);

      const subjectMap = new Map<number, any>(allSubjects.map((s: any) => [s.id, s]));
      const majorMap = new Map<number, any>(allMajors.map((m: any) => [m.id, m]));
      
      const subjectMajorsMap = new Map<number, string[]>();
      for (const mc of allMajorCourses) {
        const majorObj = majorMap.get(mc.majorId);
        if (majorObj?.name) {
          if (!subjectMajorsMap.has(mc.subjectId)) {
            subjectMajorsMap.set(mc.subjectId, []);
          }
          const list = subjectMajorsMap.get(mc.subjectId)!;
          if (!list.includes(majorObj.name)) {
            list.push(majorObj.name);
          }
        }
      }

      const resourcesList: any[] = [];
      const subjectsWithResources = new Set<number>();

      for (const cr of allCourseResources) {
        const s = cr.subjectId ? (subjectMap.get(cr.subjectId) || allSubjects.find((subj: any) => matchSubjectIds(subj.id, cr.subjectId))) : null;
        const matchedSubjByTitle = !s ? allSubjects.find((subj: any) => {
          const cleanS = cleanCourseName(subj.name).toLowerCase();
          const cleanT = cleanCourseName(cr.title).toLowerCase();
          return cleanS === cleanT || (cleanS.length > 3 && cleanT.includes(cleanS)) || (cleanT.length > 3 && cleanS.includes(cleanT));
        }) : null;

        const resolvedSubject = s || matchedSubjByTitle;
        if (resolvedSubject) {
          subjectsWithResources.add(resolvedSubject.id);
        }
        const majorNames = resolvedSubject ? (subjectMajorsMap.get(resolvedSubject.id) || []) : [];
        const majorStr = majorNames.length > 0 ? majorNames.join(' / ') : 'جميع التخصصات';
        const cleanName = resolvedSubject ? cleanCourseName(resolvedSubject.name) : cleanCourseName(cr.title);

        const rawTitle = cr.title || (resolvedSubject ? cleanName : 'باقة مصادر جديدة');
        const cleanTitle = cleanCourseName(rawTitle);
        const isWaUrl = (u?: string) => Boolean(u && (u.includes('whatsapp.com') || u.includes('wa.me')));
        const resolvedWa = isWaUrl(cr.whatsappLink) ? cr.whatsappLink : 
                           isWaUrl(cr.whatsappUrl) ? cr.whatsappUrl : 
                           isWaUrl(cr.url) ? cr.url : 
                           (cr.type === 'whatsapp' || cr.type === 'group') ? cr.url : undefined;

        const codeMatch = (cr.title || cr.description || '').match(/[A-Z]{2,4}\d{3,4}|عال\d{4}/i)?.[0];
        let extractedCode = resolvedSubject?.code || codeMatch || '';
        if (!extractedCode || /[\u0600-\u06FF]/.test(extractedCode) || extractedCode === 'مادة') {
          extractedCode = (cr.type === 'group' || cr.type === 'whatsapp' || cr.title?.includes('قروب') || cr.title?.includes('مجموعة')) 
            ? 'مجموعة طلابية' 
            : 'مصدر أكاديمي';
        }

        resourcesList.push({
          id: cr.id,
          subjectId: resolvedSubject?.id || cr.subjectId || null,
          title: cleanTitle,
          courseCode: extractedCode,
          courseName: cleanName,
          major: majorStr,
          majors: majorNames,
          type: cr.type || (resolvedWa ? 'group' : 'drive'),
          fileUrl: cr.url,
          driveUrl: (cr.type === 'drive' || cr.type === 'summary') ? cr.url : (cr.driveLink || undefined),
          boxLink: cr.boxLink || undefined,
          whatsappUrl: resolvedWa,
          whatsappLink: resolvedWa,
          freeResourcesUrl: cr.freeResourcesUrl || undefined,
          paidResourcesUrl: cr.paidResourcesUrl || undefined,
          avatarUrl: cr.avatarUrl || undefined,
          bannerUrl: cr.bannerUrl || undefined,
          telegramUrl: cr.type === 'telegram' ? cr.url : undefined,
          description: cr.description,
          createdAt: cr.createdAt ? new Date(cr.createdAt).toISOString() : new Date().toISOString()
        });
      }

      for (const s of allSubjects) {
        if (!subjectsWithResources.has(s.id) && (s.driveLink || s.whatsappLink)) {
          const majorNames = subjectMajorsMap.get(s.id) || [];
          const majorStr = majorNames.length > 0 ? majorNames.join(' / ') : 'جميع التخصصات';
          const cleanName = cleanCourseName(s.name);
          resourcesList.push({
            id: `syn_${s.id}`,
            subjectId: s.id,
            title: cleanName,
            courseCode: s.code,
            courseName: cleanName,
            major: majorStr,
            majors: majorNames,
            type: s.driveLink ? 'summary' : s.whatsappLink ? 'group' : 'exam',
            fileUrl: s.driveLink || '',
            driveUrl: s.driveLink || undefined,
            whatsappUrl: s.whatsappLink || undefined,
            description: s.description || undefined,
            createdAt: new Date().toISOString()
          });
        }
      }

      res.json(resourcesList);
    } catch (error) {
      console.error(error);
      res.json([]);
    }
  });

  return router;
}
