import express from 'express';
import multer from 'multer';
import { sql, eq, or, ilike, and } from 'drizzle-orm';
import { course_sections, subjects } from '../../db/schema';
import { matchId } from '../../lib/auth-utils';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { checkAdmin } from './admin/common';
import { normalizeFormattedSchedules, processAndUpsertCatalog } from '../services/sections-importer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB max file size
});

/**
 * Format raw database section row into clean, typed, normalized JSON
 */
export function formatSectionRow(item: any) {
  if (!item) return item;

  // 1. Instructors array
  let instructors: any[] = [];
  try {
    if (typeof item.instructors === 'string' && item.instructors.startsWith('[')) {
      instructors = JSON.parse(item.instructors);
    } else if (Array.isArray(item.instructors)) {
      instructors = item.instructors;
    }
  } catch (e) {}

  if (instructors.length === 0 && item.primaryInstructor && item.primaryInstructor !== 'غير محدد') {
    instructors = [{
      name: item.primaryInstructor,
      email: item.primaryInstructorEmail || null,
      isPrimary: true
    }];
  }

  // 2. Schedules array
  const schedules = normalizeFormattedSchedules(item.schedules);

  // 3. Final Exam object
  let finalExam = item.finalExam;
  try {
    if (typeof finalExam === 'string' && finalExam.startsWith('{')) {
      finalExam = JSON.parse(finalExam);
    }
  } catch (e) {}

  return {
    ...item,
    schedules,
    instructors,
    finalExam
  };
}

export interface SectionQueryParams {
  crn?: string;
  crns?: string;
  code?: string;
  courseCode?: string;
  subjectId?: string | number;
  term?: string;
  academicYear?: string;
  semester?: string;
  campus?: string;
  search?: string;
  limit?: number;
}

/**
 * Core query engine for class sections
 */
export async function querySections(db: any, params: SectionQueryParams): Promise<any[]> {
  const crnsRaw = String(params.crn || params.crns || '').trim();
  const codeRaw = String(params.code || params.courseCode || '').trim();
  const subjectIdRaw = params.subjectId !== undefined && params.subjectId !== null ? String(params.subjectId).trim() : '';
  const term = String(params.term || '').trim();
  const academicYear = String(params.academicYear || '').trim();
  const semester = String(params.semester || '').trim();
  const campus = String(params.campus || '').trim();
  const search = String(params.search || '').trim();

  let baseConditions: any[] = [];

  // A. By CRN(s)
  if (crnsRaw) {
    const crnList = crnsRaw.split(/[,،\s]+/).map(c => c.trim()).filter(Boolean);
    if (crnList.length > 0) {
      baseConditions.push(
        or(
          ...crnList.map(crn => eq(course_sections.crn, crn)),
          ...crnList.map(val => ilike(course_sections.courseCode, `%${val}%`))
        )
      );
    }
  }

  // B. By Course Code
  if (codeRaw) {
    baseConditions.push(
      or(
        sql`LOWER(${course_sections.courseCode}) = LOWER(${codeRaw})`,
        ilike(course_sections.courseCode, `%${codeRaw}%`)
      )
    );
  }

  // C. By Subject ID
  if (subjectIdRaw) {
    baseConditions.push(matchId(course_sections.subjectId, subjectIdRaw));
  }

  // D. By Text Search
  if (search) {
    baseConditions.push(
      or(
        ilike(course_sections.crn, `%${search}%`),
        ilike(course_sections.courseCode, `%${search}%`),
        ilike(course_sections.courseTitle, `%${search}%`),
        ilike(course_sections.primaryInstructor, `%${search}%`),
        ilike(course_sections.sectionNumber, `%${search}%`)
      )
    );
  }

  // E. By Campus
  if (campus) {
    baseConditions.push(ilike(course_sections.campus, `%${campus}%`));
  }

  // F. Term isolation conditions
  const termConditions: any[] = [];
  if (term) {
    const parts = term.split(/[-–]/).map(s => s.trim());
    const extractedYear = parts[0];
    const extractedSem = parts.slice(1).join(' ').trim();

    termConditions.push(eq(course_sections.term, term));
    if (extractedYear && extractedSem) {
      termConditions.push(
        and(eq(course_sections.academicYear, extractedYear), eq(course_sections.semester, extractedSem))
      );
    }
    if (academicYear && semester) {
      termConditions.push(
        and(eq(course_sections.academicYear, academicYear), eq(course_sections.semester, semester))
      );
    }
  } else if (academicYear && semester) {
    termConditions.push(
      and(eq(course_sections.academicYear, academicYear), eq(course_sections.semester, semester))
    );
  } else if (academicYear) {
    termConditions.push(eq(course_sections.academicYear, academicYear));
  }

  let finalConditions = [...baseConditions];
  if (termConditions.length > 0) {
    finalConditions.push(or(...termConditions));
  }

  const limit = params.limit ? Math.min(params.limit, 1000) : 500;

  let rows = await db
    .select()
    .from(course_sections)
    .where(finalConditions.length > 0 ? and(...finalConditions) : undefined)
    .orderBy(course_sections.courseCode, course_sections.sectionNumber, course_sections.crn)
    .limit(limit);

  // Fallback: If nothing was found with term filter, but search/crn/code was given, try without term filter
  if (rows.length === 0 && termConditions.length > 0 && baseConditions.length > 0) {
    rows = await db
      .select()
      .from(course_sections)
      .where(and(...baseConditions))
      .orderBy(course_sections.courseCode, course_sections.sectionNumber, course_sections.crn)
      .limit(limit);
  }

  return rows.map(formatSectionRow);
}

/**
 * Fetch distinct academic terms/semesters present in course_sections
 */
export async function getDistinctTerms(db: any) {
  return await db
    .select({
      academicYear: course_sections.academicYear,
      semester: course_sections.semester,
      term: course_sections.term,
      count: sql<number>`count(*)::int`
    })
    .from(course_sections)
    .groupBy(course_sections.academicYear, course_sections.semester, course_sections.term)
    .orderBy(sql`${course_sections.academicYear} desc nulls last`, sql`${course_sections.semester} asc nulls last`);
}

/**
 * Express router for all sections operations (Public & Admin)
 */
export function createSectionsRouter(db: any) {
  const router = express.Router();

  // ============================================================================
  // 1. PUBLIC: GET /sections - Unified query endpoint (by CRN, Code, Term, SubjectId)
  // ============================================================================
  const handleGetSections = async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const {
        crn,
        crns,
        code,
        courseCode,
        subjectId,
        term,
        academicYear,
        semester,
        campus,
        search,
        format,
        limit
      } = req.query as Record<string, string>;

      const sections = await querySections(db, {
        crn,
        crns,
        code,
        courseCode,
        subjectId,
        term,
        academicYear,
        semester,
        campus,
        search,
        limit: limit ? Number(limit) : undefined
      });

      if (format === 'array') {
        return res.json(sections);
      }

      return res.json({ sections });
    } catch (err: any) {
      console.error('[Sections Query Error]', err);
      return res.status(500).json({ error: 'Failed to fetch sections' });
    }
  };

  router.get('/sections', handleGetSections);
  router.get('/sections/by-crn', handleGetSections); // Compatibility alias

  // ============================================================================
  // 2. PUBLIC & ADMIN: GET /sections/terms - Distinct terms list
  // ============================================================================
  const handleGetTerms = async (_req: express.Request, res: express.Response): Promise<any> => {
    try {
      const terms = await getDistinctTerms(db);
      res.json({ terms });
    } catch (err: any) {
      console.error('[Section Terms Error]', err);
      res.status(500).json({ error: 'Failed to fetch terms' });
    }
  };

  router.get('/sections/terms', handleGetTerms);
  router.get('/sections/terms-public', handleGetTerms); // Compatibility alias
  router.get('/admin/sections/terms', handleGetTerms);  // Admin UI alias

  // ============================================================================
  // 3. PUBLIC: PUT /sections/:id & /sections/:id/links - Update WhatsApp/Contact link
  // ============================================================================
  const handleUpdateSectionLink = async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { id } = req.params;
      const { whatsappLink, phone } = req.body;

      const reqUser = (req as any).user;
      const resolvedUserId = reqUser?.uid || reqUser?.userName || null;
      const resolvedUserName = reqUser?.userName || null;

      const updateData: any = {};
      if (whatsappLink !== undefined) {
        updateData.whatsappLink = whatsappLink ? String(whatsappLink).trim() : null;
      }
      if (phone !== undefined) {
        updateData.phone = phone ? String(phone).trim() : null;
      }
      if (resolvedUserId) updateData.publishedByUserId = resolvedUserId;
      if (resolvedUserName) updateData.publishedByUserName = resolvedUserName;

      const [updated] = await db.update(course_sections)
        .set(updateData)
        .where(matchId(course_sections.id, id))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: 'الشعبة غير موجودة' });
      }

      res.json(formatSectionRow(updated));
    } catch (err: any) {
      console.error('[Update Section Link Error]', err);
      res.status(500).json({ error: 'فشل تحديث روابط الشعبة' });
    }
  };

  router.put('/sections/:id', handleUpdateSectionLink);
  router.put('/sections/:id/links', handleUpdateSectionLink);

  // ============================================================================
  // 4. PUBLIC: DELETE /sections/:id & /sections/:id/links - Clear community links
  // ============================================================================
  const handleDeleteSectionLink = async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { id } = req.params;
      const [updated] = await db.update(course_sections).set({
        whatsappLink: null,
        phone: null,
        publishedByUserId: null,
        publishedByUserName: null
      }).where(matchId(course_sections.id, id)).returning();

      if (!updated) {
        return res.status(404).json({ error: 'الشعبة غير موجودة' });
      }

      res.json({ success: true, message: 'تم حذف روابط الشعبة بنجاح', section: formatSectionRow(updated) });
    } catch (err: any) {
      console.error('[Clear Section Link Error]', err);
      res.status(500).json({ error: 'فشل حذف روابط الشعبة' });
    }
  };

  router.delete('/sections/:id', handleDeleteSectionLink);
  router.delete('/sections/:id/links', handleDeleteSectionLink);

  // ============================================================================
  // 5. PUBLIC: POST /sections - Add a custom/community section
  // ============================================================================
  router.post('/sections', async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { sectionName, whatsappLink, phone, subjectId, courseCode, publishedByUserId, publishedByUserName } = req.body;
      if (!sectionName || !sectionName.trim()) {
        return res.status(400).json({ error: 'اسم الشعبة مطلوب' });
      }
      if (!whatsappLink || !whatsappLink.trim()) {
        return res.status(400).json({ error: 'رابط الواتساب مطلوب' });
      }

      const reqUser = (req as any).user;
      const resolvedUserId = (reqUser?.uid || reqUser?.userName || publishedByUserId || `user_${Math.random().toString(36).substring(2, 8)}`).trim();
      const resolvedUserName = reqUser?.userName || publishedByUserName || null;

      let targetSubjectId = subjectId ? Number(subjectId) : null;
      if (!targetSubjectId && courseCode) {
        const sub = (await db.select().from(subjects).where(sql`LOWER(${subjects.code}) = LOWER(${String(courseCode).trim()})`))[0];
        if (sub) targetSubjectId = sub.id;
      }

      const [newSection] = await db.insert(course_sections).values({
        subjectId: targetSubjectId || null,
        courseCode: courseCode || null,
        sectionName: sectionName.trim(),
        whatsappLink: whatsappLink.trim(),
        phone: phone ? phone.trim() : null,
        publishedByUserId: resolvedUserId,
        publishedByUserName: resolvedUserName
      }).returning();

      res.json(formatSectionRow(newSection));
    } catch (err: any) {
      console.error('[Create Section Error]', err);
      res.status(500).json({ error: 'فشل إضافة الشعبة' });
    }
  });

  // ============================================================================
  // 6. ADMIN: GET /admin/sections - Paginated list with filters
  // ============================================================================
  router.get('/admin/sections', requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: 'Admin only' });
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      const search = String(req.query.search || '').trim();
      const campus = String(req.query.campus || '').trim();
      const academicYear = String(req.query.academicYear || '').trim();
      const semester = String(req.query.semester || '').trim();
      const term = String(req.query.term || '').trim();

      let conditions: any[] = [];
      if (search) {
        conditions.push(
          or(
            ilike(course_sections.crn, `%${search}%`),
            ilike(course_sections.courseCode, `%${search}%`),
            ilike(course_sections.courseTitle, `%${search}%`),
            ilike(course_sections.primaryInstructor, `%${search}%`),
            ilike(course_sections.sectionNumber, `%${search}%`)
          )
        );
      }
      if (campus) conditions.push(ilike(course_sections.campus, `%${campus}%`));
      if (academicYear) conditions.push(eq(course_sections.academicYear, academicYear));
      if (semester) conditions.push(eq(course_sections.semester, semester));
      if (term) conditions.push(eq(course_sections.term, term));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(course_sections)
        .where(whereClause);

      const total = Number(countResult?.count || 0);

      const items = await db
        .select()
        .from(course_sections)
        .where(whereClause)
        .limit(limit)
        .offset(offset)
        .orderBy(course_sections.courseCode, course_sections.sectionNumber);

      res.json({
        sections: items.map(formatSectionRow),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    } catch (err: any) {
      console.error('[Admin Sections Error]', err);
      res.status(500).json({ error: 'Failed to fetch sections' });
    }
  });

  // ============================================================================
  // 7. ADMIN: GET /admin/sections/stats - Metrics overview
  // ============================================================================
  router.get('/admin/sections/stats', requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: 'Admin only' });
    try {
      const [stats] = await db
        .select({
          totalSections: sql<number>`count(*)::int`,
          uniqueCourses: sql<number>`count(distinct course_code)::int`
        })
        .from(course_sections);

      res.json(stats || { totalSections: 0, uniqueCourses: 0 });
    } catch (err: any) {
      console.error('[Admin Sections Stats Error]', err);
      res.status(500).json({ error: 'Failed to fetch section stats' });
    }
  });

  // ============================================================================
  // 8. ADMIN: DELETE /admin/sections & aliases - Unified delete
  // ============================================================================
  const handleDeleteAdminSections = async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: 'Admin only' });
    try {
      const id = req.params.id ? Number(req.params.id) : (req.query.id ? Number(req.query.id) : null);
      if (id) {
        await db.delete(course_sections).where(eq(course_sections.id, id));
        return res.json({ success: true });
      }

      const academicYear = req.query.academicYear ? String(req.query.academicYear).trim() : '';
      const semester = req.query.semester ? String(req.query.semester).trim() : '';
      const term = req.query.term ? String(req.query.term).trim() : '';
      const courseCode = req.query.courseCode ? String(req.query.courseCode).trim() : '';
      const subjectId = req.query.subjectId ? String(req.query.subjectId).trim() : '';

      let conditions: any[] = [];
      if (term) conditions.push(eq(course_sections.term, term));
      if (academicYear) conditions.push(eq(course_sections.academicYear, academicYear));
      if (semester) conditions.push(eq(course_sections.semester, semester));
      if (courseCode) conditions.push(sql`LOWER(${course_sections.courseCode}) = LOWER(${courseCode})`);
      if (subjectId) conditions.push(sql`${course_sections.subjectId} = ${Number(subjectId)}`);

      let deletedRows: any[] = [];
      if (conditions.length > 0) {
        deletedRows = await db.delete(course_sections).where(and(...conditions)).returning();
      } else {
        deletedRows = await db.delete(course_sections).returning();
      }
      res.json({ success: true, count: deletedRows.length, message: `تم مسح وحذف ${deletedRows.length} شعبة بنجاح` });
    } catch (err: any) {
      console.error('[Admin Delete Sections Error]', err);
      res.status(500).json({ error: 'فشل مسح الشعب الدراسية' });
    }
  };

  router.delete('/admin/sections', requireAuth, handleDeleteAdminSections);
  router.delete('/admin/sections/clear-all', requireAuth, handleDeleteAdminSections);
  router.delete('/admin/sections/:id', requireAuth, handleDeleteAdminSections);

  // ============================================================================
  // 9. ADMIN: POST /admin/import-data - Upload JSON catalog
  // ============================================================================
  router.post('/admin/import-data', requireAuth, upload.single('file'), async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: 'Admin only' });

    try {
      const termInfo = {
        academicYear: req.body.academicYear || '1448',
        semester: req.body.semester || 'الفصل الأول',
        term: req.body.term || '1448 - الفصل الأول'
      };

      let inputData: any;
      if (req.file) {
        inputData = req.file.buffer;
      } else if (req.body.data) {
        inputData = typeof req.body.data === 'string' ? JSON.parse(req.body.data) : req.body.data;
      } else if (req.body.courses || req.body.sections) {
        inputData = req.body;
      } else {
        return res.status(400).json({ error: 'يرجى اختيار ملف JSON صالح' });
      }

      const result = await processAndUpsertCatalog(inputData, termInfo, db, req.file?.originalname);
      res.json(result);
    } catch (err: any) {
      console.error('[Admin Import Error]', err);
      res.status(500).json({ error: `فشل الاستيراد: ${err.message || err}` });
    }
  });

  // ============================================================================
  // 10. ADMIN: POST /admin/sync-direct - 1-Click fast sync from Banner JSON
  // ============================================================================
  router.post('/admin/sync-direct', requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: 'Admin only' });

    try {
      const fs = await import('fs');
      const path = await import('path');
      const catalogCandidates = [
        path.resolve(process.cwd(), '../scratch/imamu-sections-api/output/imamu_helper_catalog.json'),
        '/home/interstellar/.gemini/antigravity/scratch/imamu-sections-api/output/imamu_helper_catalog.json',
        '/home/interstellar/.gemini/antigravity/scratch/imamu-sections-api/data/sections.json',
        path.resolve(process.cwd(), 'data/sections.json')
      ];

      let catalogPath: string | null = null;
      for (const p of catalogCandidates) {
        if (fs.existsSync(p)) {
          catalogPath = p;
          break;
        }
      }

      if (!catalogPath) {
        return res.status(404).json({ error: 'لم يتم العثور على ملف شُعب ومقررات بانر على الخادم.' });
      }

      const fileBuffer = fs.readFileSync(catalogPath);
      const termInfo = {
        academicYear: req.body?.academicYear || '1448',
        semester: req.body?.semester || 'الفصل الأول',
        term: req.body?.term || '1448 - الفصل الأول'
      };

      const result = await processAndUpsertCatalog(fileBuffer, termInfo, db, path.basename(catalogPath));
      res.json({
        ...result,
        message: 'تمت المزامنة المباشرة من ملفات بانر بنجاح تام!'
      });
    } catch (err: any) {
      console.error('[Admin Direct Sync Error]', err);
      res.status(500).json({ error: `فشل المزامنة المباشرة: ${err.message || err}` });
    }
  });

  return router;
}
