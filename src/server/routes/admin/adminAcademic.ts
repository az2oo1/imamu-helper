import express from 'express';
import { eq, or, sql } from 'drizzle-orm';
import { subjects, majors, majorCourses, course_resources, events, users } from '../../../db/schema';
import { requireAuth, AuthRequest } from '../../../middleware/auth';
import { matchId } from '../../../lib/auth-utils';
import { calculateMokafaaDate, formatDate, parseDate } from '../../../lib/date-utils';
import { uploadMajorPlanToStorage, listMajorPlansFromS3, deleteFileFromStorage } from '../../../lib/storage';
import { importMsariData } from '../../services/msari';
import { checkAdmin, uploadStorage } from './common';

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
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { code, name, creditHours, level, description, driveLink, whatsappLink } = req.body;
      const [subj] = await db.insert(subjects).values({
        code, name, creditHours: Number(creditHours) || 3, level: level ? Number(level) : null, description, driveLink, whatsappLink
      }).returning();
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
      res.json({ success: true });
    } catch (e: any) {
      console.error("[Admin Subject Delete Error]", e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Create Major
  router.post("/admin/majors", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { name, pdfUrl } = req.body;
      const [mjr] = await db.insert(majors).values({ name, pdfUrl }).returning();
      res.json(mjr);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin Update Major
  router.put("/admin/majors/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const idRaw = req.params.id;
      const { name, pdfUrl } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (pdfUrl !== undefined) updates.pdfUrl = pdfUrl;
      const [mjr] = await db.update(majors).set(updates).where(matchId(majors.id, idRaw)).returning();
      if (!mjr) return res.status(404).json({ error: "Major not found" });
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
      const plans = await listMajorPlansFromS3(idRaw, major?.name, major?.pdfUrl);

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
      const plans = await listMajorPlansFromS3(idRaw, major?.name, major?.pdfUrl);

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
      const { title, date, description, isHoliday, isHolidayEnd, isSemesterStart, isSemesterEnd, isEid, isNationalDay } = req.body;
      const [ev] = await db.insert(events).values({ 
        title, 
        date, 
        description,
        isHoliday: !!isHoliday,
        isHolidayEnd: !!isHolidayEnd,
        isSemesterStart: !!isSemesterStart,
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
      const { title, date, description, isHoliday, isHolidayEnd, isSemesterStart, isSemesterEnd, isEid, isNationalDay } = req.body;
      const [ev] = await db.update(events)
        .set({ 
          title, 
          date, 
          description,
          isHoliday: !!isHoliday,
          isHolidayEnd: !!isHolidayEnd,
          isSemesterStart: !!isSemesterStart,
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

      const escapeIcs = (str: string) => {
        if (!str) return '';
        return String(str)
          .replace(/\\/g, '\\\\')
          .replace(/;/g, '\\;')
          .replace(/,/g, '\\,')
          .replace(/\r?\n/g, '\\n');
      };

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
        if (u && u.semesters) {
          try {
            const userSemesters = typeof u.semesters === 'string' ? JSON.parse(u.semesters) : u.semesters;
            if (Array.isArray(userSemesters)) {
              for (const sem of userSemesters) {
                if (Array.isArray(sem?.courses)) {
                  for (const c of sem.courses) {
                    if (c && c.examDate) {
                      const examDateStr = c.examTime ? `${c.examDate}T${c.examTime}:00` : c.examDate;
                      const courseName = c.courseName || c.courseCode || 'المقرر';
                      const details = [
                        `اختبار نهائي مقرر ${courseName} (${c.courseCode || ''})`,
                        c.crn ? `CRN: ${c.crn}` : '',
                        c.sectionNumber ? `الشعبة: ${c.sectionNumber}` : '',
                        c.classroom ? `القاعة: ${c.classroom}` : ''
                      ].filter(Boolean).join(' | ');

                      userEvents.push({
                        id: `exam-${c.courseCode || 'course'}-${c.examDate}`,
                        title: `اختبار نهائي - ${courseName}`,
                        date: examDateStr,
                        description: details,
                        calendarType: 'user',
                        userId: u.uid || userId,
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
        }

        if (includeAcademic) {
          const academicEvents = allEvents.filter((ev: any) => !ev.calendarType || ev.calendarType === 'academic');
          filtered = [...academicEvents, ...userEvents];
        } else {
          filtered = userEvents;
        }
      } else if (type === 'all') {
        calName = 'تقويم جامعة الإمام الشامل';
        filtered = allEvents.filter((ev: any) => {
          if (!ev.calendarType || ev.calendarType === 'academic' || ev.calendarType === 'entity') return true;
          if (ev.calendarType === 'user') {
            return userId && (ev.userId === userId);
          }
          return true;
        });
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
        const d = parseDate(ev.date);
        if (!d) continue;

        const dtstamp = ev.createdAt ? formatDate(new Date(ev.createdAt), 'ics') : formatDate(new Date(), 'ics');
        const hasTime = typeof ev.date === 'string' && (ev.date.includes('T') || ev.date.includes(':'));

        ics += "BEGIN:VEVENT\r\n";
        ics += `UID:event-${ev.id}@imamu-helper\r\n`;
        ics += `DTSTAMP:${dtstamp}\r\n`;
        ics += `LAST-MODIFIED:${dtstamp}\r\n`;
        ics += "SEQUENCE:0\r\n";
        ics += "STATUS:CONFIRMED\r\n";

        if (hasTime) {
          const dtstart = formatDate(d, 'ics');
          const dtend = formatDate(new Date(d.getTime() + 60 * 60 * 1000), 'ics');
          ics += `DTSTART:${dtstart}\r\n`;
          ics += `DTEND:${dtend}\r\n`;
        } else {
          const dtstart = formatDate(d, 'iso-date').replace(/-/g, '');
          ics += `DTSTART;VALUE=DATE:${dtstart}\r\n`;
        }

        ics += `SUMMARY:${escapeIcs(ev.title)}\r\n`;
        if (ev.description) {
          ics += `DESCRIPTION:${escapeIcs(ev.description)}\r\n`;
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
