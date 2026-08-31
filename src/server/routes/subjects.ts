import express from 'express';
import { eq, sql, inArray } from 'drizzle-orm';
import { subjects, majors, majorCourses, course_resources } from '../../db/schema';
import { requireAuth } from '../../middleware/auth';

export function createSubjectsRouter(db: any) {
  const router = express.Router();

  const getSubjectsHandler = async (req: express.Request, res: express.Response) => {
    try {
      let allSubjects = await db.select().from(subjects);


      const allMajorCourses = await db.select().from(majorCourses);
      let allCourseResources: any[] = [];
      try {
        allCourseResources = await db.select().from(course_resources);
      } catch (crErr) {}

      const majorMap = new Map<number, number>();
      for (const mc of allMajorCourses) {
        if (!majorMap.has(mc.subjectId)) {
          majorMap.set(mc.subjectId, mc.majorId);
        }
      }

      const resourceMap = new Map<number, any[]>();
      for (const cr of allCourseResources) {
        if (!resourceMap.has(cr.subjectId)) {
          resourceMap.set(cr.subjectId, []);
        }
        resourceMap.get(cr.subjectId)!.push(cr);
      }

      const mapped = allSubjects.map((s: any) => ({
        ...s,
        majorId: majorMap.get(s.id) || null,
        resources: resourceMap.get(s.id) || []
      }));

      res.json(mapped);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch subjects" });
    }
  };

  router.get("/subjects", getSubjectsHandler);
  router.get("/courses", getSubjectsHandler);

  const getCourseDetailsHandler = async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { idOrCode } = req.params;
      const isNumeric = !isNaN(Number(idOrCode)) && idOrCode.trim() !== '';
      const subjectList = await db.select().from(subjects).where(
        isNumeric 
          ? eq(subjects.id, Number(idOrCode)) 
          : sql`LOWER(${subjects.code}) = LOWER(${idOrCode})`
      );
      const subject = subjectList[0];

      if (!subject) {
        return res.status(404).json({ error: "Course not found" });
      }

      const allResources = await db.select().from(course_resources).where(eq(course_resources.subjectId, subject.id));
      const connectUrl = process.env.CONNECT_APP_URL || 'http://localhost:3000';

      const subjectMajorLinks = await db.select().from(majorCourses).where(eq(majorCourses.subjectId, subject.id));
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
        prerequisites = allSimpleSubjects.filter((s: any) => prereqCodes.some(code => code.toLowerCase() === s.code.toLowerCase()));
      }

      const dependentSubjectIds = allMajorCourses.filter((mc: any) => {
        if (!mc.prereq) return false;
        return mc.prereq.toLowerCase().includes(subject.code.toLowerCase());
      }).map((mc: any) => mc.subjectId);

      let dependents: { id: number; code: string; name: string }[] = [];
      if (dependentSubjectIds.length > 0) {
        dependents = await db.select({ id: subjects.id, code: subjects.code, name: subjects.name })
          .from(subjects)
          .where(inArray(subjects.id, dependentSubjectIds));
      }

      res.json({
        course: {
          ...subject,
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
      const majorCourseMap = new Map<number, any>(allMajorCourses.map((mc: any) => [mc.subjectId, mc]));

      const resourcesList: any[] = [];
      const subjectsWithResources = new Set<number>();

      for (const cr of allCourseResources) {
        const s = cr.subjectId ? subjectMap.get(cr.subjectId) : null;
        if (s) {
          subjectsWithResources.add(s.id);
        }
        const mc = cr.subjectId ? majorCourseMap.get(cr.subjectId) : null;
        const major = mc ? majorMap.get(mc.majorId) : null;

        resourcesList.push({
          id: cr.id,
          subjectId: cr.subjectId || null,
          title: cr.title || s?.name || 'مصدر عام',
          courseCode: s?.code || 'عام',
          courseName: s?.name || 'مصدر عام غير مخصص لمادة',
          major: major?.name || 'عام',
          type: cr.type || 'drive',
          fileUrl: cr.url,
          driveUrl: (cr.type === 'drive' || cr.type === 'summary') ? cr.url : (cr.driveLink || undefined),
          boxLink: cr.boxLink || undefined,
          whatsappUrl: (cr.type === 'whatsapp' || cr.type === 'group') ? cr.url : (cr.whatsappLink || undefined),
          whatsappLink: cr.whatsappLink || undefined,
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
          const mc = majorCourseMap.get(s.id);
          const major = mc ? majorMap.get(mc.majorId) : null;
          resourcesList.push({
            id: s.id * 10000,
            subjectId: s.id,
            title: s.name,
            courseCode: s.code,
            courseName: s.name,
            major: major?.name || 'عام',
            type: s.driveLink ? 'summary' : s.whatsappLink ? 'group' : 'exam',
            fileUrl: s.driveLink || '',
            driveUrl: s.driveLink || undefined,
            whatsappUrl: s.whatsappLink || undefined,
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
