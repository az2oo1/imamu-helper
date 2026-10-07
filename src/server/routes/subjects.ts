import express from 'express';
import { eq, sql, inArray, or } from 'drizzle-orm';
import { subjects, majors, majorCourses, course_resources, course_sections } from '../../db/schema';
import { requireAuth } from '../../middleware/auth';
import { matchId, matchSubjectIds } from '../../lib/auth-utils';
import { cleanCourseName, decodeHtmlEntities } from '../../lib/url-utils';
import { listMajorPlansFromS3 } from '../../lib/storage';
import { querySections, formatSectionRow } from './sections';
import { extractPrereqCodes, areCourseCodesEqual, normalizeCourseCode, cleanPrereqText } from '../../lib/academic-utils';

interface PrereqCatalogCache {
  allSimpleSubjects: any[];
  allMajorCourses: any[];
  majorCoursesBySubjId: Map<string, any[]>;
  subjectById: Map<string, any>;
  subjectByNormCode: Map<string, any>;
  dependentsByNormCode: Map<string, any[]>;
  cachedAt: number;
}

let prereqCatalogCache: PrereqCatalogCache | null = null;
let prereqCatalogPromise: Promise<PrereqCatalogCache> | null = null;

export function invalidatePrereqCatalogCache() {
  prereqCatalogCache = null;
  prereqCatalogPromise = null;
}

async function getOrBuildPrereqCatalog(db: any): Promise<PrereqCatalogCache> {
  const now = Date.now();
  if (prereqCatalogCache && (now - prereqCatalogCache.cachedAt < 30 * 60 * 1000)) {
    return prereqCatalogCache;
  }
  if (prereqCatalogPromise) {
    return prereqCatalogPromise;
  }

  prereqCatalogPromise = (async () => {
    try {
      const allSimpleSubjects = await db.select({
        id: subjects.id,
        code: subjects.code,
        name: subjects.name,
        prereq: subjects.prereq,
        description: subjects.description
      }).from(subjects);

      const allMajorCourses = await db.select().from(majorCourses);

      const subjectById = new Map<string, any>();
      const subjectByNormCode = new Map<string, any>();

      for (const s of allSimpleSubjects) {
        subjectById.set(String(s.id), s);
        const norm = normalizeCourseCode(s.code).replace(/\s+/g, '').toLowerCase();
        if (norm && !subjectByNormCode.has(norm)) {
          subjectByNormCode.set(norm, s);
        }
      }

      const majorCoursesBySubjId = new Map<string, any[]>();
      for (const mc of allMajorCourses) {
        const k = String(mc.subjectId);
        let list = majorCoursesBySubjId.get(k);
        if (!list) {
          list = [];
          majorCoursesBySubjId.set(k, list);
        }
        list.push(mc);
      }

      // Precompute reverse index: Map<targetNormCode, dependents[]>
      const dependentsByNormCode = new Map<string, any[]>();

      for (const other of allSimpleSubjects) {
        const otherBannerCodes = extractPrereqCodes(other.prereq);
        const otherMajorLinks = majorCoursesBySubjId.get(String(other.id)) || [];
        const otherCollegeCodes = [
          ...otherMajorLinks.flatMap((l: any) => extractPrereqCodes(l.prereq)),
          ...(other.description && (other.description.startsWith('المتطلبات السابقة:') || other.description.startsWith('المتطلب السابق:'))
            ? extractPrereqCodes(other.description)
            : [])
        ];

        const normOtherCode = normalizeCourseCode(other.code) || other.code;
        const otherInfo = {
          id: other.id,
          code: normOtherCode,
          name: decodeHtmlEntities(other.name)
        };

        for (const reqCode of otherBannerCodes) {
          const normReq = normalizeCourseCode(reqCode).replace(/\s+/g, '').toLowerCase();
          if (!normReq) continue;

          let list = dependentsByNormCode.get(normReq);
          if (!list) {
            list = [];
            dependentsByNormCode.set(normReq, list);
          }
          if (!list.some(d => d.id === other.id || areCourseCodesEqual(d.code, other.code))) {
            list.push({ ...otherInfo, source: 'banner' });
          }
        }

        for (const reqCode of otherCollegeCodes) {
          const normReq = normalizeCourseCode(reqCode).replace(/\s+/g, '').toLowerCase();
          if (!normReq) continue;

          let list = dependentsByNormCode.get(normReq);
          if (!list) {
            list = [];
            dependentsByNormCode.set(normReq, list);
          }
          const existing = list.find(d => d.id === other.id || areCourseCodesEqual(d.code, other.code));
          if (existing) {
            existing.source = 'both';
          } else {
            list.push({ ...otherInfo, source: 'college' });
          }
        }
      }

      const built: PrereqCatalogCache = {
        allSimpleSubjects,
        allMajorCourses,
        majorCoursesBySubjId,
        subjectById,
        subjectByNormCode,
        dependentsByNormCode,
        cachedAt: Date.now()
      };

      prereqCatalogCache = built;
      return built;
    } finally {
      prereqCatalogPromise = null;
    }
  })();

  return prereqCatalogPromise;
}

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
        code: normalizeCourseCode(s.code) || s.code,
        name: decodeHtmlEntities(s.name),
        description: decodeHtmlEntities(s.description),
        prereq: cleanPrereqText(s.prereq),
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
        const allSubjs = await db.select().from(subjects);
        const matchByCode = allSubjs.find((s: any) => areCourseCodesEqual(s.code, realId));
        if (matchByCode) {
          subjectList = [matchByCode];
        } else {
          subjectList = await db.select().from(subjects).where(
            sql`LOWER(${subjects.name}) LIKE LOWER(${'%' + realId + '%'}) OR LOWER(${subjects.code}) LIKE LOWER(${'%' + realId + '%'})`
          );
        }
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
          ? (matchingResources.find((r: any) => matchSubjectIds(r.id, realId)) || matchingResources[0])
          : matchingResources[0];

        if (firstRes) {
          // 1. Resolve parent subject if firstRes has a linked subjectId
          if (firstRes.subjectId) {
            const [linkedSubj] = await db.select().from(subjects).where(matchId(subjects.id, firstRes.subjectId));
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
              sectionsEnabled: firstRes ? (firstRes.sectionsEnabled !== false) : true,
              prerequisites: [],
              dependents: []
            }
          });
        }
      }

      let allResources = subject.id 
        ? await db.select().from(course_resources).where(matchId(course_resources.subjectId, subject.id))
        : [];

      let sisterSubjs: any[] = [];

      // Link resources by course name or sister subject representations (e.g. 'علوم الحاسب 1140' <=> 'عال 1140')
      if (subject.name) {
        const cleanSubjName = subject.name.trim();
        sisterSubjs = await db.select().from(subjects).where(
          sql`LOWER(TRIM(${subjects.name})) = LOWER(TRIM(${cleanSubjName}))`
        );
        const sisterIds = sisterSubjs.map((s: any) => s.id).filter(Boolean);

        let additionalResources: any[] = [];
        if (sisterIds.length > 0) {
          additionalResources = await db.select().from(course_resources).where(
            sql`${inArray(course_resources.subjectId, sisterIds)} OR LOWER(TRIM(${course_resources.title})) = LOWER(TRIM(${cleanSubjName}))`
          );
        } else {
          additionalResources = await db.select().from(course_resources).where(
            sql`LOWER(TRIM(${course_resources.title})) = LOWER(TRIM(${cleanSubjName}))`
          );
        }

        const existingIds = new Set(allResources.map((r: any) => String(r.id)));
        for (const r of additionalResources) {
          if (!existingIds.has(String(r.id))) {
            allResources.push(r);
            existingIds.add(String(r.id));
          }
        }
      }

      const connectUrl = process.env.CONNECT_APP_URL || 'http://localhost:3000';

      // Gather prerequisites and dependents via in-memory precomputed reverse index
      const catalog = await getOrBuildPrereqCatalog(db);
      const subjectMajorLinks = catalog.majorCoursesBySubjId.get(String(subject.id)) || [];

      // Extract all prereq codes across Banner & College Plan
      // Only include sister subjects if they represent the exact same course code,
      // preventing cross-contamination between different courses that share the same title (e.g. ريض 1227 vs ريض 1222).
      const bannerPrereqCodes = [
        ...extractPrereqCodes(subject.prereq),
        ...(Array.isArray(sisterSubjs)
          ? sisterSubjs
              .filter((s: any) => areCourseCodesEqual(s.code, subject.code))
              .flatMap((s: any) => extractPrereqCodes(s.prereq))
          : [])
      ];

      const collegePrereqCodes = [
        ...subjectMajorLinks.flatMap((l: any) => extractPrereqCodes(l.prereq)),
        ...(subject.description && (subject.description.startsWith('المتطلبات السابقة:') || subject.description.startsWith('المتطلب السابق:'))
          ? extractPrereqCodes(subject.description)
          : [])
      ];

      const combinedPrereqCodes = Array.from(new Set([...bannerPrereqCodes, ...collegePrereqCodes]));

      // Match each prereq code to subjects in the catalog in O(1)
      const prerequisites: { id: number | null; code: string; name: string; source: 'banner' | 'college' | 'both' }[] = [];
      const seenPrereqCodes = new Set<string>();

      for (const pCode of combinedPrereqCodes) {
        const normCode = normalizeCourseCode(pCode);
        const canonKey = normCode.replace(/\s+/g, '').toLowerCase();
        if (seenPrereqCodes.has(canonKey)) continue;
        seenPrereqCodes.add(canonKey);

        const isFromBanner = bannerPrereqCodes.some(c => areCourseCodesEqual(c, pCode));
        const isFromCollege = collegePrereqCodes.some(c => areCourseCodesEqual(c, pCode));
        const source: 'banner' | 'college' | 'both' = (isFromBanner && isFromCollege) ? 'both' : (isFromBanner ? 'banner' : 'college');

        const matchedSubj = catalog.subjectByNormCode.get(canonKey);
        if (matchedSubj) {
          prerequisites.push({
            id: matchedSubj.id,
            code: normalizeCourseCode(matchedSubj.code) || matchedSubj.code,
            name: decodeHtmlEntities(matchedSubj.name),
            source
          });
        } else {
          prerequisites.push({
            id: null,
            code: normCode,
            name: normCode,
            source
          });
        }
      }

      // Compute dependents in O(1) from precomputed reverse index
      const normSubjCode = normalizeCourseCode(subject.code).replace(/\s+/g, '').toLowerCase();
      const dependents = (catalog.dependentsByNormCode.get(normSubjCode) || []).filter(
        (d: any) => !areCourseCodesEqual(d.code, subject.code)
      );

      const firstWaResource = allResources.find((r: any) => r.whatsappLink || r.whatsappUrl || (r.url && r.url.includes('whatsapp')));
      const resolvedWhatsappLink = firstWaResource?.whatsappLink || firstWaResource?.whatsappUrl || firstWaResource?.url || null;
      const firstAvatar = allResources.find((r: any) => r.avatarUrl)?.avatarUrl || null;
      const firstBanner = allResources.find((r: any) => r.bannerUrl)?.bannerUrl || null;
      const firstResWithDesc = allResources.find((r: any) => r.description && r.description.trim() && !r.description.trim().startsWith('المتطلبات السابقة:') && !r.description.trim().startsWith('المتطلب السابق:'));
      const subjDescIsPrereqOnly = subject.description?.trim().startsWith('المتطلبات السابقة:') || subject.description?.trim().startsWith('المتطلب السابق:');
      const resolvedDescription = (subjDescIsPrereqOnly && firstResWithDesc?.description)
        ? firstResWithDesc.description.trim()
        : (subject.description?.trim() || firstResWithDesc?.description?.trim() || null);

      let sectionsList: any[] = [];
      try {
        sectionsList = await querySections(db, {
          subjectId: subject.id,
          courseCode: normalizeCourseCode(subject.code) || subject.code
        });
      } catch (_secErr) {}

      const canonicalCode = normalizeCourseCode(subject.code) || subject.code;

      res.json({
        course: {
          ...subject,
          code: canonicalCode,
          name: decodeHtmlEntities(subject.name),
          prereq: cleanPrereqText(subject.prereq),
          description: decodeHtmlEntities(resolvedDescription),
          avatarUrl: firstAvatar,
          whatsappLink: resolvedWhatsappLink,
          freeResourcesUrl: allResources.find((r: any) => r.freeResourcesUrl)?.freeResourcesUrl || null,
          paidResourcesUrl: allResources.find((r: any) => r.paidResourcesUrl)?.paidResourcesUrl || null,
          boxLink: allResources.find((r: any) => r.boxLink)?.boxLink || null,
          isAcademicSubject: true,
          resources: allResources,
          sections: sectionsList,
          sectionsEnabled: allResources.length > 0 ? !allResources.every((r: any) => r.sectionsEnabled === false) : true,
          prerequisites,
          dependents,
          connectUrl: `${connectUrl.replace(/\/$/, '')}/academics?courseId=${encodeURIComponent(canonicalCode)}`
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

  // Get resources specifically for a subject
  router.get(["/subjects/:idOrCode/resources", "/courses/:idOrCode/resources"], async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { idOrCode } = req.params;
      const rawDecoded = decodeURIComponent(idOrCode || '').trim();
      const realId = rawDecoded.replace(/^syn(thetic)?_/, '').trim();
      const isNumeric = !isNaN(Number(realId)) && realId !== '';

      let filtered: any[] = [];
      if (isNumeric) {
        filtered = await db.select().from(course_resources).where(matchId(course_resources.subjectId, realId));
      } else {
        const cleanTarget = realId.toLowerCase().replace(/[\s\-]/g, '');
        const sub = (await db.select().from(subjects).where(sql`REPLACE(REPLACE(LOWER(${subjects.code}), ' ', ''), '-', '') = ${cleanTarget}`))[0];
        if (sub?.id) {
          filtered = await db.select().from(course_resources).where(matchId(course_resources.subjectId, sub.id));
          if (filtered.length === 0 && sub.name) {
            const sisterSubjs = await db.select({ id: subjects.id }).from(subjects).where(sql`LOWER(TRIM(${subjects.name})) = LOWER(TRIM(${sub.name.trim()}))`);
            const sisterIds = sisterSubjs.map((s: any) => s.id).filter(Boolean);
            if (sisterIds.length > 0) {
              filtered = await db.select().from(course_resources).where(
                sql`${inArray(course_resources.subjectId, sisterIds)} OR LOWER(TRIM(${course_resources.title})) = LOWER(TRIM(${sub.name.trim()}))`
              );
            }
          }
        } else {
          filtered = await db.select().from(course_resources).where(sql`LOWER(TRIM(${course_resources.title})) = LOWER(TRIM(${realId}))`);
        }
      }
      res.json(filtered);
    } catch (err) {
      console.error("Error fetching subject resources:", err);
      res.status(500).json({ error: "Failed to fetch subject resources" });
    }
  });

  // Subject Sections Endpoint (delegated to unified querySections)
  router.get("/subjects/:idOrCode/sections", async (req: express.Request, res: express.Response) => {
    try {
      const { idOrCode } = req.params;
      const cleanTarget = decodeURIComponent(idOrCode || '').trim();
      if (!cleanTarget) return res.json([]);

      const isNumeric = !isNaN(Number(cleanTarget)) && cleanTarget !== '';
      const sections = await querySections(db, isNumeric ? { subjectId: cleanTarget } : { courseCode: cleanTarget });
      res.json(sections);
    } catch (err) {
      console.error("Error fetching subject sections:", err);
      res.json([]);
    }
  });

  router.get("/majors", async (req: express.Request, res: express.Response) => {
    try {
      const records = await db.select().from(majors);
      const rawMajorCourses: any = await db.execute(sql`SELECT CAST(id AS text) as id, CAST(major_id AS text) as "majorId", CAST(subject_id AS text) as "subjectId", optional_group as "optionalGroup", optional_group_req_count as "optionalGroupReqCount", prereq FROM major_courses`).catch(() => []);
      const allMajorCourses = rawMajorCourses.rows || rawMajorCourses || [];

      const mapped = await Promise.all(records.map(async (m: any) => {
        const courseIds = allMajorCourses.filter((mc: any) => String(mc.majorId) === String(m.id)).map((mc: any) => String(mc.subjectId));
        const courses = allMajorCourses.filter((mc: any) => String(mc.majorId) === String(m.id)).map((mc: any) => ({
          subjectId: String(mc.subjectId), optionalGroup: mc.optionalGroup, optionalGroupReqCount: mc.optionalGroupReqCount, prereq: mc.prereq
        }));
        const plans = await listMajorPlansFromS3(m.id, m.name);
        let parsedBatches = null;
        if (m.batches) {
          try {
            parsedBatches = typeof m.batches === 'string' ? JSON.parse(m.batches) : m.batches;
          } catch (e) {
            console.error('Failed to parse batches for major', m.id, e);
          }
        }
        return {
          ...m,
          batches: parsedBatches,
          plans,
          courseIds,
          courses
        };
      }));
      res.json(mapped);
    } catch (error) {
      console.error(error);
      res.json([
        { id: 1, name: 'علوم الحاسب', plans: [], courseIds: [], courses: [] },
        { id: 2, name: 'تقنية المعلومات', plans: [], courseIds: [], courses: [] },
        { id: 3, name: 'نظم المعلومات', plans: [], courseIds: [], courses: [] }
      ]);
    }
  });

  router.get("/majors/:id/plans", async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { id } = req.params;
      const allMajors = await db.select().from(majors);
      const major = allMajors.find((m: any) => String(m.id) === String(id));
      const plans = await listMajorPlansFromS3(id, major?.name);
      res.json(plans);
    } catch (error) {
      console.error("Error fetching major plans:", error);
      res.status(500).json({ error: "Failed to fetch major plans" });
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
        const isGroupOrBatch = cr.type === 'group' || cr.type === 'whatsapp' || 
          cr.title?.includes('قروب') || cr.title?.includes('مجموعة') || cr.title?.includes('دفعة') || cr.title?.includes('قناة');

        // STRICT SEPARATION:
        // A resource belongs to a course IF AND ONLY IF it has an explicit subjectId!
        // No automatic guessing or title matching. Manual resources remain strictly independent.
        const s = cr.subjectId ? (subjectMap.get(cr.subjectId) || allSubjects.find((subj: any) => matchSubjectIds(subj.id, cr.subjectId))) : null;
        const isCourseResource = Boolean(s);

        if (s) {
          subjectsWithResources.add(s.id);
        }

        const majorNames = s ? (subjectMajorsMap.get(s.id) || []) : [];
        const majorStr = majorNames.length > 0 ? majorNames.join(' / ') : (isGroupOrBatch ? 'مجموعات طلابية' : 'عام');
        const cleanName = s ? cleanCourseName(s.name) : cleanCourseName(cr.title);

        const rawTitle = cr.title || (s ? cleanName : 'مصدر مستقل');
        const cleanTitle = cleanCourseName(rawTitle);
        const isWaUrl = (u?: string) => Boolean(u && (u.includes('whatsapp.com') || u.includes('wa.me')));
        const resolvedWa = isWaUrl(cr.whatsappLink) ? cr.whatsappLink : 
                           isWaUrl(cr.whatsappUrl) ? cr.whatsappUrl : 
                           isWaUrl(cr.url) ? cr.url : 
                           (cr.type === 'whatsapp' || cr.type === 'group') ? cr.url : undefined;

        let extractedCode = '';
        if (isCourseResource) {
          extractedCode = s.code || '';
        } else {
          extractedCode = isGroupOrBatch ? 'مجموعة طلابية' : 'مصدر مستقل';
        }

        resourcesList.push({
          id: cr.id,
          subjectId: s ? s.id : null,
          title: cleanTitle,
          courseCode: extractedCode,
          courseName: isCourseResource ? cleanName : cleanTitle,
          major: majorStr,
          majors: majorNames,
          type: cr.type || (resolvedWa ? 'group' : 'drive'),
          fileUrl: cr.url,
          boxLink: cr.boxLink || undefined,
          whatsappUrl: resolvedWa,
          whatsappLink: resolvedWa,
          freeResourcesUrl: cr.freeResourcesUrl || undefined,
          paidResourcesUrl: cr.paidResourcesUrl || undefined,
          avatarUrl: cr.avatarUrl || undefined,
          telegramUrl: cr.type === 'telegram' ? cr.url : undefined,
          description: cr.description,
          sectionsEnabled: isCourseResource ? (cr.sectionsEnabled !== false) : false,
          creditHours: s?.creditHours || null,
          level: s?.level || null,
          createdAt: cr.createdAt ? new Date(cr.createdAt).toISOString() : new Date().toISOString()
        });
      }


      res.json(resourcesList);
    } catch (error) {
      console.error(error);
      res.json([]);
    }
  });

  return router;
}
