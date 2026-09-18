import { sql } from 'drizzle-orm';
import { subjects, course_sections } from '../../db/schema';
import { decodeHtmlEntities } from '../../lib/url-utils';
import {
  formatScheduleDaysDisplay,
  parseScheduleDays,
  formatTo12Hour
} from '../../lib/schedule-utils';

export interface TermInfo {
  academicYear?: string | null;
  semester?: string | null;
  term?: string | null;
}

export interface ParsedCatalog {
  courses: any[];
  sections: any[];
}

export function extractInstructors(item: any): { instructorsJson: string | null; primaryInstructor: string; primaryInstructorEmail: string | null } {
  let list: { name: string; email?: string; isPrimary?: boolean }[] = [];

  // Check if string list
  if (typeof item.instructors === 'string' && item.instructors.startsWith('[')) {
    try {
      list = JSON.parse(item.instructors);
    } catch {}
  } else if (Array.isArray(item.instructors) && item.instructors.length > 0) {
    list = item.instructors.map((i: any) => ({
      name: decodeHtmlEntities(String(i.name || i.displayName || '')).trim(),
      email: String(i.email || i.emailAddress || '').trim() || undefined,
      isPrimary: Boolean(i.isPrimary || i.primaryIndicator)
    })).filter((i: any) => Boolean(i.name));
  } else if (Array.isArray(item.faculty) && item.faculty.length > 0) {
    list = item.faculty.map((f: any) => ({
      name: decodeHtmlEntities(String(f.displayName || f.name || '')).trim(),
      email: String(f.emailAddress || f.email || '').trim() || undefined,
      isPrimary: Boolean(f.primaryIndicator || f.isPrimary)
    })).filter((f: any) => Boolean(f.name));
  } else if (typeof item['كافة المحاضرين'] === 'string' && item['كافة المحاضرين']) {
    // Parse "د. محمد [email@...] | د. خالد"
    const parts = item['كافة المحاضرين'].split('|').map((s: string) => s.trim()).filter(Boolean);
    for (const part of parts) {
      const emailMatch = part.match(/\[([^\]]+)\]/);
      const isPrimary = part.includes('(رئيسي)');
      const name = part.replace(/\[[^\]]+\]/, '').replace('(رئيسي)', '').trim();
      if (name) {
        list.push({
          name,
          email: emailMatch ? emailMatch[1].trim() : undefined,
          isPrimary
        });
      }
    }
  } else if (item.primaryInstructor && item.primaryInstructor !== 'غير محدد') {
    list = [{
      name: decodeHtmlEntities(String(item.primaryInstructor)).trim(),
      email: item.primaryInstructorEmail ? String(item.primaryInstructorEmail).trim() : undefined,
      isPrimary: true
    }];
  }

  // Deduplicate instructors by email or name
  const seen = new Set<string>();
  const uniqueList: { name: string; email?: string; isPrimary?: boolean }[] = [];
  for (const inst of list) {
    const key = (inst.email ? inst.email.toLowerCase() : inst.name.toLowerCase());
    if (!seen.has(key)) {
      seen.add(key);
      uniqueList.push(inst);
    }
  }

  const primaryObj = uniqueList.find(i => i.isPrimary) || uniqueList[0];
  const primaryName = item.primaryInstructor && item.primaryInstructor !== 'غير محدد'
    ? decodeHtmlEntities(String(item.primaryInstructor)).trim()
    : (primaryObj?.name || 'غير محدد');

  const primaryEmail = item.primaryInstructorEmail
    ? String(item.primaryInstructorEmail).trim()
    : (primaryObj?.email || null);

  return {
    instructorsJson: uniqueList.length > 0 ? JSON.stringify(uniqueList) : null,
    primaryInstructor: primaryName,
    primaryInstructorEmail: primaryEmail
  };
}

export function normalizeFormattedSchedules(rawSchedules: any): any[] {
  let list: any[] = [];
  if (typeof rawSchedules === 'string' && (rawSchedules.startsWith('[') || rawSchedules.startsWith('{'))) {
    try { list = JSON.parse(rawSchedules); } catch (e) {}
  } else if (Array.isArray(rawSchedules)) {
    list = rawSchedules;
  }
  if (!Array.isArray(list)) return [];

  return list.map((sch: any) => {
    if (!sch || typeof sch !== 'object') return sch;
    const bldgStr = String(sch.building || '').trim();
    const roomStr = String(sch.room || '').trim();

    const daysString = formatScheduleDaysDisplay(sch);
    const parsedDays = parseScheduleDays(sch);

    let startTime = sch.startTime;
    let endTime = sch.endTime;
    let timeRange = sch.timeRange ? String(sch.timeRange).trim() : '';

    if ((!startTime || !endTime) && timeRange) {
      const parts = timeRange.split(/[-–—]/).map(s => s.trim());
      if (parts[0] && !startTime) startTime = formatTo12Hour(parts[0]);
      if (parts[1] && !endTime) endTime = formatTo12Hour(parts[1]);
    }

    if (!timeRange && startTime && endTime) {
      timeRange = `${startTime} - ${endTime}`;
    }

    return {
      ...sch,
      days: parsedDays.length > 0 ? parsedDays : (sch.days || daysString),
      daysString: daysString !== 'الأيام غير محددة' ? daysString : undefined,
      startTime: startTime || null,
      endTime: endTime || null,
      timeRange: timeRange || null,
      building: bldgStr || null,
      room: roomStr || null,
      type: sch.type || 'محاضرة'
    };
  });
}

export function normalizeScheduleData(schedulesRaw: any, summaryRaw?: string | null) {
  const schedules = normalizeFormattedSchedules(schedulesRaw);
  let summary = summaryRaw ? decodeHtmlEntities(String(summaryRaw).trim()) : null;

  if (!summary && schedules.length > 0) {
    summary = schedules.map((s: any) => {
      const d = s.daysString || (Array.isArray(s.days) ? s.days.join('، ') : s.days) || '';
      const t = s.timeRange ? `(${s.timeRange})` : '';
      const b = s.building ? `مبنى ${s.building}` : '';
      const r = s.room ? `قاعة ${s.room}` : '';
      return [d, t, b, r].filter(Boolean).join(' - ');
    }).filter(Boolean).join(' | ');
  }

  return {
    schedules: schedules.length > 0 ? JSON.stringify(schedules) : null,
    scheduleSummary: summary || null
  };
}

/**
 * Parses raw input from File Buffer or JSON body into standard { courses, sections }
 */
export function parseRawCatalog(input: any, filename?: string): ParsedCatalog {
  let raw: any = input;
  const courses: any[] = [];
  const sections: any[] = [];

  // Check if buffer
  if (Buffer.isBuffer(input)) {
    try {
      raw = JSON.parse(input.toString('utf8'));
    } catch (err: any) {
      throw new Error(`الملف المرفوع ليس ملف JSON صالحاً: ${err.message}`);
    }
  }

  // Process JSON structure
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (!item) continue;

      // 1. Flat Section
      if ((item.crn || item.courseReferenceNumber) && !Array.isArray(item.sections)) {
        sections.push(item);
        if (item.courseCode || item.code) {
          courses.push({
            code: (item.courseCode || item.code).trim(),
            name: item.courseTitle || item.name || item.courseCode,
            creditHours: item.creditHours || 3
          });
        }
      }
      // 2. Course with nested sections
      else if (item.code || item.courseNumber || item.courseTitle || item.name) {
        const courseCode = (item.code || `${item.subjectCode || item.subject || ''} ${item.courseNumber || ''}`).trim();
        if (courseCode) {
          courses.push({
            code: courseCode,
            name: decodeHtmlEntities(item.name || item.courseTitle || courseCode).trim(),
            courseNumber: item.courseNumber ? String(item.courseNumber) : null,
            subjectCode: item.subjectCode || item.subject || null,
            subjectDescription: item.subjectDescription ? decodeHtmlEntities(item.subjectDescription) : null,
            college: item.college || null,
            collegeCode: item.collegeCode ? String(item.collegeCode) : null,
            department: item.department || null,
            departmentCode: item.departmentCode ? String(item.departmentCode) : null,
            creditHours: Number(item.creditHours || item.creditHourLow) || 3,
            lectureHours: item.lectureHours ? Number(item.lectureHours) : null,
            labHours: item.labHours ? Number(item.labHours) : null
          });
        }

        if (Array.isArray(item.sections) && item.sections.length > 0) {
          for (const s of item.sections) {
            if (!s) continue;
            sections.push({
              ...s,
              courseCode: s.courseCode || courseCode,
              courseTitle: s.courseTitle || item.name || item.courseTitle || courseCode,
              creditHours: s.creditHours || item.creditHours || 3
            });
          }
        }
      }
    }
  } else if (typeof raw === 'object' && raw !== null) {
    if (Array.isArray(raw.courses)) courses.push(...raw.courses);
    if (Array.isArray(raw.sections)) sections.push(...raw.sections);
  }

  return { courses, sections };
}

/**
 * Unified Core: Bulk Upserts courses into `subjects` and sections into `course_sections`
 */
export async function processAndUpsertCatalog(
  rawInput: any,
  termInfo: TermInfo,
  db: any,
  filename?: string
): Promise<{ success: boolean; coursesCount: number; sectionsCount: number; elapsedMs: number; message: string }> {
  const startTime = Date.now();

  const { courses: rawCourses, sections: rawSections } = parseRawCatalog(rawInput, filename);

  const defaultYear = termInfo.academicYear || '1448';
  const defaultSem = termInfo.semester || 'الفصل الأول';
  const defaultTerm = termInfo.term || (defaultYear && defaultSem ? `${defaultYear} - ${defaultSem}` : '144810');

  // 1. Deduplicate & normalize courses
  const coursesMap = new Map<string, any>();
  for (const c of rawCourses) {
    const code = String(c.code || '').trim();
    if (!code) continue;
    if (!coursesMap.has(code)) {
      coursesMap.set(code, {
        code,
        name: decodeHtmlEntities(String(c.name || c.courseTitle || code)).trim(),
        courseNumber: c.courseNumber ? String(c.courseNumber) : null,
        subjectCode: c.subjectCode ? String(c.subjectCode) : null,
        subjectDescription: c.subjectDescription ? decodeHtmlEntities(String(c.subjectDescription)) : null,
        college: c.college ? String(c.college) : null,
        collegeCode: c.collegeCode ? String(c.collegeCode) : null,
        department: c.department ? String(c.department) : null,
        departmentCode: c.departmentCode ? String(c.departmentCode) : null,
        creditHours: Number(c.creditHours) || 3,
        lectureHours: c.lectureHours ? Number(c.lectureHours) : null,
        labHours: c.labHours ? Number(c.labHours) : null
      });
    }
  }
  const uniqueCourses = Array.from(coursesMap.values());

  // 2. Normalize sections
  const sectionsMap = new Map<string, any>();
  for (const s of rawSections) {
    const crn = String(s.crn || s.courseReferenceNumber || '').trim();
    if (!crn) continue;

    const secYear = s.academicYear || defaultYear;
    const secSem = s.semester || defaultSem;
    const secTerm = s.term || defaultTerm;

    const normalizedSched = normalizeScheduleData(s.schedules, s.scheduleSummary);
    const { instructorsJson, primaryInstructor, primaryInstructorEmail } = extractInstructors(s);

    const max = s.maxEnrollment ?? s.maximumEnrollment ?? s.enrollment?.maximum ?? null;
    const curr = s.currentEnrollment ?? s.enrollmentCount ?? s.enrollment?.current ?? null;
    const avail = s.seatsAvailable ?? s.enrollment?.seatsAvailable ?? (max !== null && curr !== null ? max - curr : null);
    const isOpen = s.isOpen !== undefined ? Boolean(s.isOpen) : (avail !== null ? avail > 0 : true);
    const finalExam = s.finalExam ? (typeof s.finalExam === 'string' ? s.finalExam : JSON.stringify(s.finalExam)) : null;

    const key = `${crn}___${secTerm}`;
    if (!sectionsMap.has(key)) {
      sectionsMap.set(key, {
        crn,
        sectionNumber: s.sectionNumber ? String(s.sectionNumber) : null,
        courseCode: String(s.courseCode || s.code || '').trim(),
        courseTitle: decodeHtmlEntities(String(s.courseTitle || s.name || '')).trim(),
        academicYear: secYear,
        semester: secSem,
        term: secTerm,
        campus: s.campus ? String(s.campus) : 'المدينة الجامعية',
        scheduleType: s.scheduleType ? String(s.scheduleType) : 'نظري - محاضرة',
        instructionalMethod: s.instructionalMethod ? String(s.instructionalMethod) : 'حضوري',
        creditHours: s.creditHours ? Number(s.creditHours) : 3,
        isOpen,
        maxEnrollment: max !== null ? Number(max) : null,
        currentEnrollment: curr !== null ? Number(curr) : null,
        seatsAvailable: avail !== null ? Number(avail) : null,
        finalExam,
        primaryInstructor,
        instructors: instructorsJson,
        schedules: normalizedSched.schedules,
        scheduleSummary: normalizedSched.scheduleSummary
      });
    }
  }
  const uniqueSections = Array.from(sectionsMap.values());

  // 3. Bulk Batch Upsert Courses (Subjects) in chunks of 500
  const BATCH_SIZE = 500;
  let insertedCoursesCount = 0;

  for (let i = 0; i < uniqueCourses.length; i += BATCH_SIZE) {
    const chunk = uniqueCourses.slice(i, i + BATCH_SIZE);
    await db
      .insert(subjects)
      .values(chunk)
      .onConflictDoUpdate({
        target: subjects.code,
        set: {
          name: sql`excluded.name`,
          courseNumber: sql`coalesce(excluded.course_number, subjects.course_number)`,
          subjectCode: sql`coalesce(excluded.subject_code, subjects.subject_code)`,
          subjectDescription: sql`coalesce(excluded.subject_description, subjects.subject_description)`,
          college: sql`coalesce(excluded.college, subjects.college)`,
          collegeCode: sql`coalesce(excluded.college_code, subjects.college_code)`,
          department: sql`coalesce(excluded.department, subjects.department)`,
          departmentCode: sql`coalesce(excluded.department_code, subjects.department_code)`,
          creditHours: sql`coalesce(excluded.credit_hours, subjects.credit_hours)`,
          lectureHours: sql`coalesce(excluded.lecture_hours, subjects.lecture_hours)`,
          labHours: sql`coalesce(excluded.lab_hours, subjects.lab_hours)`
        }
      });
    insertedCoursesCount += chunk.length;
  }

  // 4. Map subjectId to sections
  let insertedSectionsCount = 0;
  if (uniqueSections.length > 0) {
    const allSubjects = await db.select({ id: subjects.id, code: subjects.code }).from(subjects);
    const subjectCodeToId = new Map<string, number>();
    for (const subj of allSubjects) {
      if (subj.code) subjectCodeToId.set(subj.code.trim().toLowerCase(), subj.id);
    }

    for (const s of uniqueSections) {
      if (s.courseCode && subjectCodeToId.has(s.courseCode.toLowerCase())) {
        s.subjectId = subjectCodeToId.get(s.courseCode.toLowerCase());
      }
    }

    // 5. Bulk Batch Upsert Sections in chunks of 500
    for (let i = 0; i < uniqueSections.length; i += BATCH_SIZE) {
      const chunk = uniqueSections.slice(i, i + BATCH_SIZE);
      await db
        .insert(course_sections)
        .values(chunk)
        .onConflictDoUpdate({
          target: [course_sections.crn, course_sections.term],
          set: {
            sectionNumber: sql`excluded.section_number`,
            courseCode: sql`excluded.course_code`,
            courseTitle: sql`excluded.course_title`,
            subjectId: sql`coalesce(excluded.subject_id, course_sections.subject_id)`,
            academicYear: sql`coalesce(excluded.academic_year, course_sections.academic_year)`,
            semester: sql`coalesce(excluded.semester, course_sections.semester)`,
            term: sql`coalesce(excluded.term, course_sections.term)`,
            campus: sql`excluded.campus`,
            scheduleType: sql`excluded.schedule_type`,
            instructionalMethod: sql`excluded.instructional_method`,
            creditHours: sql`excluded.credit_hours`,
            isOpen: sql`coalesce(excluded.is_open, course_sections.is_open)`,
            maxEnrollment: sql`coalesce(excluded.max_enrollment, course_sections.max_enrollment)`,
            currentEnrollment: sql`coalesce(excluded.current_enrollment, course_sections.current_enrollment)`,
            seatsAvailable: sql`coalesce(excluded.seats_available, course_sections.seats_available)`,
            finalExam: sql`coalesce(excluded.final_exam, course_sections.final_exam)`,
            primaryInstructor: sql`excluded.primary_instructor`,
            instructors: sql`excluded.instructors`,
            schedules: sql`excluded.schedules`,
            scheduleSummary: sql`excluded.schedule_summary`
          }
        });
      insertedSectionsCount += chunk.length;
    }
  }

  const elapsedMs = Date.now() - startTime;
  console.log(`[Sections Importer] Success in ${elapsedMs}ms: ${insertedCoursesCount} courses, ${insertedSectionsCount} sections.`);

  return {
    success: true,
    coursesCount: insertedCoursesCount,
    sectionsCount: insertedSectionsCount,
    elapsedMs,
    message: `تم استيراد وتحديث ${insertedCoursesCount.toLocaleString()} مقرر و ${insertedSectionsCount.toLocaleString()} شعبة بنجاح!`
  };
}
