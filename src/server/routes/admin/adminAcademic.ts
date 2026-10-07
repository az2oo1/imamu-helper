import express from 'express';
import { eq, or, sql } from 'drizzle-orm';
import { subjects, majors, majorCourses, course_resources, events, users } from '../../../db/schema';
import { requireAuth, AuthRequest } from '../../../middleware/auth';
import { matchId } from '../../../lib/auth-utils';
import { calculateMokafaaDate, formatDate, parseDate, parseTimeIntoDate, formatIcsFloating, escapeIcs } from '../../../lib/date-utils';
import { normalizeExamDate, normalizeExamTime } from '../../../lib/schedule-utils';
import { uploadMajorPlanToStorage, listMajorPlansFromS3, deleteFileFromStorage } from '../../../lib/storage';
import { importMsariData } from '../../services/msari';
import { syncImamuCalendar } from '../../services/imamuCalendar';
import { checkAdmin, uploadStorage } from './common';
import { invalidatePrereqCatalogCache } from '../subjects';

export function createAdminAcademicRouter(db: any) {
  const router = express.Router();

  // Deduplicate Subjects
  router.post("/admin/subjects/deduplicate", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const allSubjects = await db.select().from(subjects);
      const codeMap = new Map<string, any[]>();
      for (const s of allSubjects) {
        const cleanCode = s.code.trim().toUpperCase();
        if (!codeMap.has(cleanCode)) codeMap.set(cleanCode, []);
        codeMap.get(cleanCode)!.push(s);
      }

      let removedCount = 0;
      for (const [code, items] of codeMap.entries()) {
        if (items.length > 1) {
          items.sort((a, b) => b.id - a.id);
          const primary = items[0];
          const duplicates = items.slice(1);

          for (const dup of duplicates) {
            await db.update(majorCourses).set({ subjectId: primary.id }).where(eq(majorCourses.subjectId, dup.id));
            await db.update(course_resources).set({ subjectId: primary.id }).where(eq(course_resources.subjectId, dup.id));
            await db.delete(subjects).where(eq(subjects.id, dup.id));
            removedCount++;
          }
        }
      }

      res.json({ success: true, removedCount });
    } catch (e: any) {
      console.error("[Deduplicate Subjects Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Create Subject
  router.post("/admin/subjects", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const { code, name, creditHours, level, description, college, department, prereq, tags, syllabus } = req.body;
      const [subj] = await db.insert(subjects).values({
        code,
        name,
        creditHours: Number(creditHours) || 3,
        level: level ? Number(level) : null,
        description,
        college,
        department,
        prereq,
        tags,
        syllabus
      }).returning();
      invalidatePrereqCatalogCache();
      res.json(subj);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Update Subject
  router.put("/admin/subjects/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idRaw = req.params.id;
      const { code, name, creditHours, level, description, college, department, prereq, tags, syllabus } = req.body;
      const updates: any = {};
      if (code !== undefined) updates.code = code;
      if (name !== undefined) updates.name = name;
      if (creditHours !== undefined) updates.creditHours = Number(creditHours) || 3;
      if (level !== undefined) updates.level = level ? Number(level) : null;
      if (description !== undefined) updates.description = description;
      if (college !== undefined) updates.college = college;
      if (department !== undefined) updates.department = department;
      if (prereq !== undefined) updates.prereq = prereq;
      if (tags !== undefined) updates.tags = tags;
      if (syllabus !== undefined) updates.syllabus = syllabus;

      const [subj] = await db.update(subjects).set(updates).where(matchId(subjects.id, idRaw)).returning();
      if (!subj) return res.status(404).json({ error: "Subject not found" });
      invalidatePrereqCatalogCache();
      res.json(subj);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Delete Subject
  router.delete("/admin/subjects/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const idRaw = req.params.id;
      await db.delete(majorCourses).where(matchId(majorCourses.subjectId, idRaw));
      await db.delete(course_resources).where(matchId(course_resources.subjectId, idRaw));
      await db.delete(subjects).where(matchId(subjects.id, idRaw));
      invalidatePrereqCatalogCache();
      res.json({ success: true });
    } catch (e: any) {
      console.error("[Admin Subject Delete Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Create Major
  router.post("/admin/majors", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const { name, courses: reqCourses, batches } = req.body;
      const batchesValue = batches ? (typeof batches === 'string' ? batches : JSON.stringify(batches)) : null;
      const [mjr] = await db.insert(majors).values({ name, batches: batchesValue }).returning();
      if (!mjr) return res.status(500).json({ error: "Failed to create major" });

      if (Array.isArray(reqCourses) && reqCourses.length > 0) {
        const rowsToInsert = reqCourses.map((c: any) => ({
          majorId: mjr.id,
          subjectId: Number(c.subjectId),
          optionalGroup: c.optionalGroup || null,
          optionalGroupReqCount: c.optionalGroupReqCount ? Number(c.optionalGroupReqCount) : null,
          prereq: c.prereq || null,
        })).filter((r: any) => !isNaN(r.subjectId));

        if (rowsToInsert.length > 0) {
          await db.insert(majorCourses).values(rowsToInsert);
        }
      }

      invalidatePrereqCatalogCache();
      res.json(mjr);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Update Major
  router.put("/admin/majors/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idRaw = req.params.id;
      const { name, courses: reqCourses, batches } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (batches !== undefined) {
        updates.batches = batches ? (typeof batches === 'string' ? batches : JSON.stringify(batches)) : null;
      }
      const [mjr] = await db.update(majors).set(updates).where(matchId(majors.id, idRaw)).returning();
      if (!mjr) return res.status(404).json({ error: "Major not found" });

      if (reqCourses !== undefined && Array.isArray(reqCourses)) {
        await db.delete(majorCourses).where(matchId(majorCourses.majorId, idRaw));

        const rowsToInsert = reqCourses.map((c: any) => ({
          majorId: mjr.id,
          subjectId: Number(c.subjectId),
          optionalGroup: c.optionalGroup || null,
          optionalGroupReqCount: c.optionalGroupReqCount ? Number(c.optionalGroupReqCount) : null,
          prereq: c.prereq || null,
        })).filter((r: any) => !isNaN(r.subjectId));

        if (rowsToInsert.length > 0) {
          await db.insert(majorCourses).values(rowsToInsert);
        }
      }

      invalidatePrereqCatalogCache();
      res.json(mjr);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Delete Major
  router.delete("/admin/majors/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const idRaw = req.params.id;
      await db.delete(majorCourses).where(matchId(majorCourses.majorId, idRaw));
      await db.delete(majors).where(matchId(majors.id, idRaw));
      res.json({ success: true });
    } catch (e: any) {
      console.error("[Admin Major Delete Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Upload Major Plan PDF
  router.post("/admin/majors/:id/plans", requireAuth, uploadStorage.any(), async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idRaw = req.params.id;
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No PDF file uploaded" });
      }

      const customTitle = req.body?.title || req.body?.name;
      const uploadedPlans: any[] = [];
      for (const file of files) {
        const result = await uploadMajorPlanToStorage(file.buffer, file.originalname, idRaw, file.mimetype, customTitle);
        uploadedPlans.push(result);
      }

      const allMajors = await db.select().from(majors);
      const major = allMajors.find((m: any) => String(m.id) === String(idRaw));
      const plans = await listMajorPlansFromS3(idRaw, major?.name);

      res.json({ success: true, uploaded: uploadedPlans, plans });
    } catch (e: any) {
      console.error("[Admin Major Plan Upload Error]", e);
      res.status(500).json({ error: e.message || "Failed to upload major plan" });
    }
  });

  // Admin Delete Major Plan PDF
  router.delete("/admin/majors/:id/plans", requireAuth, async (req: AuthRequest, res: express.Response): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const idRaw = req.params.id;
      const key = String(req.query.key || '').trim();
      if (!key) {
        return res.status(400).json({ error: "Missing plan key" });
      }

      await deleteFileFromStorage(key, 'plan');

      const allMajors = await db.select().from(majors);
      const major = allMajors.find((m: any) => String(m.id) === String(idRaw));
      const plans = await listMajorPlansFromS3(idRaw, major?.name);

      res.json({ success: true, plans });
    } catch (e: any) {
      console.error("[Admin Major Plan Delete Error]", e);
      res.status(500).json({ error: e.message || "Failed to delete major plan" });
    }
  });

  // Admin Import Msari Data
  router.post("/admin/import-msari", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const result = await importMsariData();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message || "Failed to import Msari dataset" });
    }
  });

  // Calendar Event Deletion
  router.delete("/admin/events/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Forbidden - Admin access required" });
    try {
      const idRaw = req.params.id;
      await db.delete(events).where(matchId(events.id, idRaw));
      res.json({ success: true });
    } catch (e: any) {
      console.error("[Admin Event Delete Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Events (POST, PUT)
  router.post("/admin/events", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { title, date, endDate, time, endTime, location, link, description, isHoliday, isHolidayEnd, isSemester, isSemesterStart, isSemesterEnd, isEid, isNationalDay } = req.body;
      const [ev] = await db.insert(events).values({ 
        title, 
        date, 
        endDate: endDate || null,
        time: time || null,
        endTime: endTime || null,
        location: location || null,
        link: link || null,
        description: description || null,
        isHoliday: !!isHoliday,
        isHolidayEnd: !!isHolidayEnd,
        isSemester: !!(isSemester ?? isSemesterStart),
        isSemesterStart: !!(isSemesterStart ?? isSemester),
        isSemesterEnd: !!isSemesterEnd,
        isEid: !!isEid,
        isNationalDay: !!isNationalDay
      }).returning();
      res.json(ev);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.put("/admin/events/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const idRaw = req.params.id;
      const { title, date, endDate, time, endTime, location, link, description, isHoliday, isHolidayEnd, isSemester, isSemesterStart, isSemesterEnd, isEid, isNationalDay } = req.body;
      const [ev] = await db.update(events)
        .set({ 
          title, 
          date, 
          endDate: endDate || null,
          time: time || null,
          endTime: endTime || null,
          location: location || null,
          link: link || null,
          description: description || null,
          isHoliday: !!isHoliday,
          isHolidayEnd: !!isHolidayEnd,
          isSemester: !!(isSemester ?? isSemesterStart),
          isSemesterStart: !!(isSemesterStart ?? isSemester),
          isSemesterEnd: !!isSemesterEnd,
          isEid: !!isEid,
          isNationalDay: !!isNationalDay
        })
        .where(matchId(events.id, idRaw))
        .returning();
      res.json(ev);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  router.post("/admin/events/generate-mokafaa", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      let added = 0;
      for (let month = 0; month < 12; month++) {
        const dateObj = calculateMokafaaDate(currentYear, month);
        const dateStr = formatDate(dateObj, 'iso-date');
        const title = `إيداع المكافأة الجامعية - شهر ${month + 1}`;
        const existing = await db.select().from(events).where(eq(events.date, dateStr));
        if (existing.length === 0) {
          await db.insert(events).values({
            title, date: dateStr, description: "الموعد الرسمي لإيداع المكافأة الجامعية لطلاب جامعة الإمام"
          });
          added++;
        }
      }
      res.json({ success: true, added });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Sync Calendar from Official IMAMU Banner Extensibility API
  router.post("/admin/events/sync-imamu", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req, db))) return res.status(403).json({ error: "Admin only" });
    try {
      const result = await syncImamuCalendar(db);
      if (!result.success) {
        return res.status(502).json({ error: result.error || "Failed to sync with university calendar" });
      }
      res.json(result);
    } catch (e: any) {
      console.error("[Sync IMAMU Calendar Error]", e);
      res.status(500).json({ error: e.message || "Server error while syncing calendar" });
    }
  });

function extractUserExamEvents(u: any, fallbackUserId: string): any[] {
  const examEvents: any[] = [];
  if (!u || !u.semesters) return examEvents;
  try {
    const userSemesters = typeof u.semesters === 'string' ? JSON.parse(u.semesters) : u.semesters;
    if (Array.isArray(userSemesters)) {
      for (const sem of userSemesters) {
        if (Array.isArray(sem?.courses)) {
          for (const c of sem.courses) {
            if (c && c.examDate) {
              const normDate = normalizeExamDate(c.examDate);
              if (!normDate) continue;
              const normTime = normalizeExamTime(c.examTime);
              const examDateStr = normTime ? `${normDate}T${normTime}:00` : normDate;
              const courseName = c.courseName || c.courseCode || 'المقرر';
              const details = [
                `اختبار نهائي مقرر ${courseName} (${c.courseCode || ''})`,
                c.crn ? `CRN: ${c.crn}` : '',
                c.sectionNumber ? `الشعبة: ${c.sectionNumber}` : '',
                c.classroom ? `القاعة: ${c.classroom}` : ''
              ].filter(Boolean).join(' | ');

              examEvents.push({
                id: `exam-${c.courseCode || 'course'}-${normDate}`,
                title: `اختبار نهائي - ${courseName}`,
                date: examDateStr,
                description: details,
                calendarType: 'user',
                userId: u.uid || fallbackUserId,
                createdAt: new Date().toISOString()
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.error("[ICS User Semesters Error]", e);
  }
  return examEvents;
}

  // Calendar .ics live subscription & export
  router.get("/calendar.ics", async (req, res): Promise<any> => {
    try {
      const type = req.query.type as string; // 'academic' | 'entity' | 'user' | 'all'
      const userId = (req.query.userId as string || '').trim();
      const isDownload = req.query.download === 'true' || req.query.download === '1';
      const includeAcademic = req.query.includeAcademic === 'true' || req.query.includeAcademic === '1';
      const allEvents = await db.select().from(events);
      
      let filtered: any[] = [];
      let calName = 'تقويم جامعة الإمام';

      if (type === 'entity') {
        calName = 'فعاليات الجهات والأندية - جامعة الإمام';
        filtered = allEvents.filter((ev: any) => ev.calendarType === 'entity');
      } else if (type === 'user') {
        if (!userId) {
          res.setHeader("Content-Type", "text/calendar; charset=utf-8");
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
          if (isDownload) {
            res.setHeader("Content-Disposition", `attachment; filename="user_calendar.ics"`);
          }
          return res.send(
            "BEGIN:VCALENDAR\r\n" +
            "VERSION:2.0\r\n" +
            "PRODID:-//IMAMU Helper//Personal Calendar//AR\r\n" +
            "CALSCALE:GREGORIAN\r\n" +
            "METHOD:PUBLISH\r\n" +
            "X-WR-CALNAME:التقويم الشخصي\r\n" +
            "X-WR-TIMEZONE:Asia/Riyadh\r\n" +
            "REFRESH-INTERVAL;VALUE=DURATION:PT1H\r\n" +
            "X-PUBLISHED-TTL:PT1H\r\n" +
            "END:VCALENDAR\r\n"
          );
        }

        // Look up user in DB to match any identifier variant (uid, id, email)
        const userRecs = await db.select().from(users).where(
          or(
            eq(users.uid, userId),
            matchId(users.id, userId),
            eq(users.email, userId)
          )
        );
        const u = userRecs[0];
        const validIds = new Set<string>([userId]);
        if (u) {
          if (u.uid) validIds.add(String(u.uid));
          if (u.id) validIds.add(String(u.id));
          if (u.email) validIds.add(String(u.email));
        }

        calName = u?.userName 
          ? `التقويم الشخصي (${u.userName}) - جامعة الإمام` 
          : 'التقويم الشخصي - جامعة الإمام';

        const userEvents = allEvents.filter((ev: any) => {
          return ev.calendarType === 'user' && ev.userId && validIds.has(String(ev.userId));
        });

        // Include final exams from user's account semesters
        userEvents.push(...extractUserExamEvents(u, userId));

        if (includeAcademic) {
          const academicEvents = allEvents.filter((ev: any) => !ev.calendarType || ev.calendarType === 'academic');
          filtered = [...academicEvents, ...userEvents];
        } else {
          filtered = userEvents;
        }
      } else if (type === 'all') {
        calName = 'تقويم جامعة الإمام الشامل';
        const publicEvents = allEvents.filter((ev: any) => !ev.calendarType || ev.calendarType === 'academic' || ev.calendarType === 'entity');
        
        let userSpecificEvents: any[] = [];
        if (userId) {
          const userRecs = await db.select().from(users).where(
            or(
              eq(users.uid, userId),
              matchId(users.id, userId),
              eq(users.email, userId)
            )
          );
          const u = userRecs[0];
          const validIds = new Set<string>([userId]);
          if (u) {
            if (u.uid) validIds.add(String(u.uid));
            if (u.id) validIds.add(String(u.id));
            if (u.email) validIds.add(String(u.email));
          }

          userSpecificEvents = allEvents.filter((ev: any) => {
            return ev.calendarType === 'user' && ev.userId && validIds.has(String(ev.userId));
          });

          userSpecificEvents.push(...extractUserExamEvents(u, userId));
        }
        filtered = [...publicEvents, ...userSpecificEvents];
      } else {
        calName = 'التقويم الأكاديمي - جامعة الإمام';
        filtered = allEvents.filter((ev: any) => !ev.calendarType || ev.calendarType === 'academic');
      }

      let ics = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//IMAMU Helper//Academic Calendar//AR",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:${escapeIcs(calName)}`,
        "X-WR-TIMEZONE:Asia/Riyadh",
        "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
        "X-PUBLISHED-TTL:PT1H",
      ].join("\r\n") + "\r\n";

      for (const ev of filtered) {
        const startBase = parseDate(ev.date);
        if (!startBase) continue;

        const dtstamp = ev.createdAt ? formatDate(new Date(ev.createdAt), 'ics') : formatDate(new Date(), 'ics');
        
        // Determine whether event has a specific time
        let hasTime = false;
        let startD = startBase;
        let endD: Date | null = null;

        if (ev.time) {
          const parsedStart = parseTimeIntoDate(startBase, ev.time);
          if (parsedStart.hasTime) {
            hasTime = true;
            startD = parsedStart.date;

            const endBase = ev.endDate ? (parseDate(ev.endDate) || startBase) : startBase;
            if (ev.endTime) {
              const parsedEnd = parseTimeIntoDate(endBase, ev.endTime);
              endD = parsedEnd.date;
            } else if (ev.endDate && ev.endDate !== ev.date) {
              endD = parseTimeIntoDate(endBase, ev.time).date;
            } else {
              endD = new Date(startD.getTime() + 60 * 60 * 1000);
            }
          }
        } else if (typeof ev.date === 'string' && (ev.date.includes('T') || ev.date.includes(':'))) {
          hasTime = true;
          startD = startBase;
          endD = new Date(startD.getTime() + 60 * 60 * 1000);
        }

        ics += "BEGIN:VEVENT\r\n";
        ics += `UID:event-${ev.id || Math.random().toString(36).substring(2)}@imamu-helper\r\n`;
        ics += `DTSTAMP:${dtstamp}\r\n`;
        ics += `LAST-MODIFIED:${dtstamp}\r\n`;
        ics += "SEQUENCE:0\r\n";
        ics += "STATUS:CONFIRMED\r\n";

        if (hasTime && endD) {
          ics += `DTSTART:${formatIcsFloating(startD)}\r\n`;
          ics += `DTEND:${formatIcsFloating(endD)}\r\n`;
        } else {
          const dtstart = formatDate(startBase, 'iso-date').replace(/-/g, '');
          ics += `DTSTART;VALUE=DATE:${dtstart}\r\n`;
          const endBase = ev.endDate ? parseDate(ev.endDate) : startBase;
          if (endBase) {
            const nextDay = new Date(endBase.getTime() + 24 * 60 * 60 * 1000);
            const dtend = formatDate(nextDay, 'iso-date').replace(/-/g, '');
            ics += `DTEND;VALUE=DATE:${dtend}\r\n`;
          }
        }

        ics += `SUMMARY:${escapeIcs(ev.title)}\r\n`;

        let descText = ev.description || '';
        if (ev.link) {
          descText = descText ? `${descText}\n\nالرابط: ${ev.link}` : `الرابط: ${ev.link}`;
          ics += `URL:${ev.link}\r\n`;
        }
        if (descText) {
          ics += `DESCRIPTION:${escapeIcs(descText)}\r\n`;
        }
        if (ev.location) {
          ics += `LOCATION:${escapeIcs(ev.location)}\r\n`;
        }
        ics += "END:VEVENT\r\n";
      }

      ics += "END:VCALENDAR\r\n";

      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");

      if (isDownload) {
        res.setHeader("Content-Disposition", `attachment; filename="${type || 'imamu'}_calendar.ics"`);
      }
      res.send(ics);
    } catch (e) {
      res.status(500).send("Error generating ICS");
    }
  });

  return router;
}
