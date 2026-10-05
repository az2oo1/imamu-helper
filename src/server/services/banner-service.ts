import { sql, eq, and } from 'drizzle-orm';
import { subjects, course_sections, banner_terms } from '../../db/schema';
import { processAndUpsertCatalog, TermInfo } from './sections-importer';
import { decodeHtmlEntities } from '../../lib/url-utils';

const BANNER_BASE_URL = 'https://bstureg.imamu.edu.sa/StudentRegistrationSsb';

export interface DetectedTerm {
  code: string;
  name: string;
  academicYear: string;
  semester: string;
}

export class BannerClient {
  private baseUrl: string;
  private cookies: Map<string, string>;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = BANNER_BASE_URL;
    this.cookies = new Map();
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8'
    };
  }

  private updateCookies(res: Response) {
    const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [];
    if (raw && raw.length > 0) {
      for (const str of raw) {
        const part = str.split(';')[0];
        const eqIdx = part.indexOf('=');
        if (eqIdx > 0) {
          const name = part.slice(0, eqIdx).trim();
          const val = part.slice(eqIdx + 1).trim();
          this.cookies.set(name, val);
        }
      }
    }
  }

  private getCookieHeader(): string {
    const arr: string[] = [];
    for (const [k, v] of this.cookies.entries()) {
      arr.push(`${k}=${v}`);
    }
    return arr.join('; ');
  }

  async request(urlPath: string, options: RequestInit = {}): Promise<Response> {
    const fullUrl = urlPath.startsWith('http') ? urlPath : `${this.baseUrl}${urlPath}`;
    const opts: RequestInit = {
      ...options,
      headers: {
        ...this.headers,
        'Cookie': this.getCookieHeader(),
        ...(options.headers || {})
      }
    };

    const res = await fetch(fullUrl, opts);
    this.updateCookies(res);
    return res;
  }

  async connect(): Promise<boolean> {
    await this.request('/', { redirect: 'manual' });
    if (!this.cookies.has('JSESSIONID')) {
      await this.request('/ssb/registration', { redirect: 'manual' });
    }
    return this.cookies.has('JSESSIONID');
  }

  async getDetectedTerms(): Promise<DetectedTerm[]> {
    // Standard detected terms from IMAMU Banner pattern
    return [
      { code: '144810', name: 'الفصل الدراسي الأول 1448', academicYear: '1448', semester: 'الفصل الأول' },
      { code: '144720', name: 'الفصل الدراسي الثاني 1447', academicYear: '1447', semester: 'الفصل الثاني' },
      { code: '144710', name: 'الفصل الدراسي الأول 1447', academicYear: '1447', semester: 'الفصل الأول' },
      { code: '144630', name: 'الفصل الصيفي 1446', academicYear: '1446', semester: 'الفصل الصيفي' }
    ];
  }

  async initTerm(term: string): Promise<boolean> {
    const res = await this.request('/ssb/term/search?dataType=json', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${this.baseUrl}/ssb/term/termSelection?mode=search`
      },
      body: `term=${encodeURIComponent(term)}`
    });
    return res.ok;
  }

  async getTotalSectionsCount(term: string): Promise<number> {
    await this.initTerm(term);
    const res = await this.request(`/ssb/searchResults/searchResults?txt_term=${term}&pageOffset=0&pageMaxSize=10&sortColumn=subjectDescription&sortDirection=asc`, {
      headers: {
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    const d = await res.json();
    return Number(d.totalCount) || 0;
  }

  async fetchSectionsBatch(term: string, offsets: number[], pageSize = 250): Promise<any[]> {
    const dayOrder: Record<string, number> = { "الأحد": 1, "الاثنين": 2, "الثلاثاء": 3, "الأربعاء": 4, "الخميس": 5, "الجمعة": 6, "السبت": 7 };
    const dayNames: Record<string, string> = { sunday: "الأحد", monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة", saturday: "السبت" };

    function formatTime(t: any): string {
      if (!t) return "";
      const s = String(t).padStart(4, "0");
      return s.slice(0, 2) + ":" + s.slice(2);
    }

    const promises = offsets.map(async offset => {
      try {
        const res = await this.request(`/ssb/searchResults/searchResults?txt_term=${term}&pageOffset=${offset}&pageMaxSize=${pageSize}&txt_openSectionOnly=false&sortColumn=subjectDescription&sortDirection=asc`, {
          headers: {
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        const d = await res.json();
        return (d.data || []).map((sec: any) => {
          // Deduplicate faculty
          const facultyMap = new Map();
          for (const f of (sec.faculty || [])) {
            const name = (f.displayName || "").trim();
            const email = (f.emailAddress || "").trim();
            const key = email ? email.toLowerCase() : name;
            if (key && !facultyMap.has(key)) {
              facultyMap.set(key, {
                name,
                email: email || null,
                isPrimary: Boolean(f.primaryIndicator)
              });
            }
          }
          const instructors = Array.from(facultyMap.values());
          const primary = instructors.find(f => f.isPrimary) || instructors[0] || null;

          let finalExam: any = null;
          const meetingsList: any[] = [];

          for (const item of (sec.meetingsFaculty || [])) {
            const mt = item.meetingTime;
            if (!mt) continue;

            if (mt.meetingType === "EXAM" || (mt.meetingTypeDescription && mt.meetingTypeDescription.includes("اختبار"))) {
              const activeDays = Object.keys(dayNames).filter(k => mt[k]).map(k => dayNames[k]);
              const dayStr = activeDays.join("، ");
              const timeRange = (mt.beginTime && mt.endTime) ? formatTime(mt.beginTime) + " - " + formatTime(mt.endTime) : "";
              finalExam = {
                date: mt.startDate || "",
                day: dayStr,
                timeRange: timeRange,
                building: mt.building || "",
                buildingDescription: mt.buildingDescription || "",
                room: mt.room || "",
                summary: [dayStr, mt.startDate, timeRange ? "(" + timeRange + ")" : "", mt.building ? "مبنى " + mt.building : "", mt.room ? "قاعة " + mt.room : ""].filter(Boolean).join(" ")
              };
              continue;
            }

            const activeDays = Object.keys(dayNames).filter(k => mt[k]).map(k => dayNames[k]);
            const startMin = mt.beginTime ? parseInt(mt.beginTime.slice(0, 2)) * 60 + parseInt(mt.beginTime.slice(2)) : 0;
            const endMin = mt.endTime ? parseInt(mt.endTime.slice(0, 2)) * 60 + parseInt(mt.endTime.slice(2)) : 0;

            for (const day of activeDays) {
              meetingsList.push({
                day,
                dayOrder: dayOrder[day] || 99,
                beginTime: mt.beginTime,
                endTime: mt.endTime,
                startMin,
                endMin,
                timeRange: (mt.beginTime && mt.endTime) ? formatTime(mt.beginTime) + " - " + formatTime(mt.endTime) : "غير محدد",
                building: mt.building || null,
                buildingDescription: mt.buildingDescription || null,
                room: mt.room || null,
                type: mt.meetingTypeDescription || "محاضرة (حضوري)"
              });
            }
          }

          meetingsList.sort((a, b) => (a.dayOrder !== b.dayOrder ? a.dayOrder - b.dayOrder : a.startMin - b.startMin));

          const merged: any[] = [];
          for (const m of meetingsList) {
            const last = merged[merged.length - 1];
            if (
              last &&
              last.day === m.day &&
              last.building === m.building &&
              last.room === m.room &&
              Math.abs(m.startMin - last.endMin) <= 10
            ) {
              last.endTime = m.endTime;
              last.endMin = m.endMin;
              last.timeRange = formatTime(last.beginTime) + " - " + formatTime(last.endTime);
            } else {
              merged.push({ ...m });
            }
          }

          const schedules = merged.map(s => ({
            days: s.day,
            timeRange: s.timeRange,
            building: s.building || null,
            buildingDescription: s.buildingDescription || null,
            room: s.room || null,
            type: s.type
          }));

          const scheduleSummary = schedules.map(s => 
            s.days + " (" + s.timeRange + ")" + 
            (s.building ? " - مبنى " + s.building : "") + 
            (s.room ? " - قاعة " + s.room : "")
          ).join(" | ");

          const courseNumber = sec.courseNumber || "";
          const subject = sec.subject || "";
          const courseCode = (subject + " " + courseNumber).trim();

          const max = sec.maximumEnrollment || 0;
          const curr = sec.enrollment || 0;
          const avail = sec.seatsAvailable !== undefined ? sec.seatsAvailable : (max - curr);

          return {
            crn: String(sec.courseReferenceNumber),
            sectionNumber: sec.sequenceNumber || "",
            courseCode,
            courseNumber,
            subject,
            subjectDescription: sec.subjectDescription || "",
            courseTitle: (sec.courseTitle || "").trim(),
            campus: sec.campusDescription || "",
            scheduleType: sec.scheduleTypeDescription || "",
            instructionalMethod: sec.instructionalMethodDescription || "",
            creditHours: sec.creditHours || sec.creditHourLow || 3,
            primaryInstructor: primary ? primary.name : "غير محدد",
            primaryInstructorEmail: primary ? primary.email : null,
            instructors,
            finalExam,
            schedules,
            scheduleSummary,
            maximumEnrollment: max,
            enrollmentCount: curr,
            seatsAvailable: avail,
            isOpen: avail > 0,
            college: sec.college || sec.collegeDescription || null,
            department: sec.department || sec.departmentDescription || null,
            lastUpdated: new Date().toISOString()
          };
        });
      } catch (e) {
        return [];
      }
    });

    const results = await Promise.all(promises);
    return results.flat();
  }

  async updateLiveEnrollmentByCrns(term: string, crns: string[]): Promise<any[]> {
    const promises = crns.map(async crn => {
      try {
        const res = await this.request(`/ssb/searchResults/getEnrollmentInfo?term=${term}&courseReferenceNumber=${crn}`);
        const html = await res.text();

        const spans = [...html.matchAll(/<span[^>]*dir=["']?ltr["']?[^>]*>([^<]+)<\/span>/gi)].map(m => m[1].trim());
        const current = spans[0] ? parseInt(spans[0], 10) : null;
        const maximum = spans[1] ? parseInt(spans[1], 10) : null;
        const seats = (maximum !== null && current !== null) ? (maximum - current) : null;

        return {
          crn: String(crn),
          current,
          maximum,
          seatsAvailable: seats,
          isOpen: seats !== null ? seats > 0 : null,
          ok: true
        };
      } catch (e: any) {
        return { crn: String(crn), error: e.message };
      }
    });

    return await Promise.all(promises);
  }

  async fetchCoursesPrerequisites(term: string, coursesWithCrn: { courseCode: string; crn: string }[]): Promise<Map<string, string>> {
    const CHUNK_SIZE = 20;
    const prereqMap = new Map<string, string>();

    const noPrereqKeywords = [
      "لا توجد متطلبات",
      "لا يوجد متطلب",
      "no prerequisite",
      "no course prerequisite",
      "none"
    ];

    for (let i = 0; i < coursesWithCrn.length; i += CHUNK_SIZE) {
      const chunk = coursesWithCrn.slice(i, i + CHUNK_SIZE);
      const promises = chunk.map(async item => {
        try {
          const res = await this.request(`/ssb/searchResults/getSectionPrerequisites?term=${term}&courseReferenceNumber=${encodeURIComponent(item.crn)}`);
          const html = await res.text();

          const bodyText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          const hasNegative = noPrereqKeywords.some(k => bodyText.toLowerCase().includes(k.toLowerCase()));

          if (!bodyText || hasNegative || (!html.includes('<table') && !html.includes('<tr>'))) {
            return { courseCode: item.courseCode, text: null };
          }

          const rows: string[] = [];
          const trMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) || [];
          for (let r = 1; r < trMatches.length; r++) {
            const tr = trMatches[r];
            const tdMatches = tr.match(/<td[\s\S]*?<\/td>/gi) || [];
            const cells = tdMatches.map(td => td.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
            if (cells.length > 0) {
              rows.push(cells.join(' '));
            }
          }

          const finalText = rows.length > 0 ? rows.join(' | ') : bodyText;
          return { courseCode: item.courseCode, text: finalText };
        } catch (e) {
          return { courseCode: item.courseCode, text: null };
        }
      });

      const results = await Promise.all(promises);
      for (const r of results) {
        if (r.text) prereqMap.set(r.courseCode, r.text);
      }
    }

    return prereqMap;
  }
}

/**
 * High-level: Synchronize all sections and courses for a term directly from Banner into DB
 */
export async function syncTermFromBanner(
  termCode: string,
  termName: string,
  db: any,
  academicYear?: string,
  semester?: string
): Promise<{ success: boolean; sectionsCount: number; coursesCount: number; message: string }> {
  const client = new BannerClient();
  const ok = await client.connect();
  if (!ok) {
    throw new Error('فشل الاتصال بنظام بانر 9.');
  }

  // Update banner_terms table to syncing
  await db.insert(banner_terms).values({
    termCode,
    termName,
    academicYear: academicYear || '1448',
    semester: semester || 'الفصل الأول',
    status: 'syncing'
  }).onConflictDoUpdate({
    target: banner_terms.termCode,
    set: {
      status: 'syncing',
      termName
    }
  });

  try {
    const totalCount = await client.getTotalSectionsCount(termCode);
    if (!totalCount || totalCount === 0) {
      await db.update(banner_terms).set({ status: 'idle', totalSections: 0, lastSyncAt: new Date() }).where(eq(banner_terms.termCode, termCode));
      return { success: true, sectionsCount: 0, coursesCount: 0, message: 'لا توجد شعب مسجلة لهذا الفصل الدراسي.' };
    }

    const pageSize = 250;
    const totalPages = Math.ceil(totalCount / pageSize);
    const CONCURRENCY = 4;
    const allSections: any[] = [];

    for (let p = 0; p < totalPages; p += CONCURRENCY) {
      const offsets: number[] = [];
      for (let c = 0; c < CONCURRENCY && (p + c) < totalPages; c++) {
        offsets.push((p + c) * pageSize);
      }
      const roundRes = await client.fetchSectionsBatch(termCode, offsets, pageSize);
      allSections.push(...roundRes);
    }

    // Extract unique courses (1 CRN per course) to fetch prerequisites
    const uniqueCourseCrnMap = new Map<string, { courseCode: string; crn: string }>();
    for (const sec of allSections) {
      if (sec.courseCode && sec.crn && !uniqueCourseCrnMap.has(sec.courseCode)) {
        uniqueCourseCrnMap.set(sec.courseCode, {
          courseCode: sec.courseCode,
          crn: sec.crn
        });
      }
    }

    const prereqMap = await client.fetchCoursesPrerequisites(termCode, Array.from(uniqueCourseCrnMap.values()));

    // Build courses array
    const coursesMap = new Map<string, any>();
    for (const sec of allSections) {
      if (!coursesMap.has(sec.courseCode)) {
        coursesMap.set(sec.courseCode, {
          code: sec.courseCode,
          name: sec.courseTitle,
          courseNumber: sec.courseNumber,
          subjectCode: sec.subject,
          subjectDescription: sec.subjectDescription,
          college: sec.college,
          department: sec.department,
          creditHours: sec.creditHours,
          prereq: prereqMap.get(sec.courseCode) || null,
          sections: []
        });
      }
    }

    const termInfo: TermInfo = {
      academicYear: academicYear || '1448',
      semester: semester || 'الفصل الأول',
      term: termCode
    };

    // Upsert into subjects & course_sections
    const catalogInput = {
      courses: Array.from(coursesMap.values()),
      sections: allSections
    };

    const result = await processAndUpsertCatalog(catalogInput, termInfo, db);

    // Update banner_terms
    await db.update(banner_terms).set({
      status: 'idle',
      totalSections: allSections.length,
      lastSyncAt: new Date(),
      lastError: null
    }).where(eq(banner_terms.termCode, termCode));

    return {
      success: true,
      sectionsCount: allSections.length,
      coursesCount: coursesMap.size,
      message: `تمت مزامنة ${allSections.length} شعبة و ${coursesMap.size} مقرر بنجاح.`
    };
  } catch (err: any) {
    await db.update(banner_terms).set({
      status: 'error',
      lastError: err.message || String(err)
    }).where(eq(banner_terms.termCode, termCode));
    throw err;
  }
}

/**
 * Checks and updates live seat counts and section statuses for a term
 */
export async function checkTermChangesAndSeats(termCode: string, db: any): Promise<{ updatedCount: number }> {
  const existingSections = await db.select({
    crn: course_sections.crn,
    maxEnrollment: course_sections.maxEnrollment,
    currentEnrollment: course_sections.currentEnrollment
  }).from(course_sections).where(eq(course_sections.term, termCode));

  if (existingSections.length === 0) return { updatedCount: 0 };

  const client = new BannerClient();
  await client.connect();

  const crns = existingSections.map((s: any) => s.crn).filter(Boolean);
  const CHUNK_SIZE = 50;
  let updatedCount = 0;

  for (let i = 0; i < crns.length; i += CHUNK_SIZE) {
    const chunk = crns.slice(i, i + CHUNK_SIZE);
    const liveResults = await client.updateLiveEnrollmentByCrns(termCode, chunk);

    for (const item of liveResults) {
      if (item && item.maximum !== null && item.current !== null) {
        await db.update(course_sections).set({
          maxEnrollment: item.maximum,
          currentEnrollment: item.current,
          seatsAvailable: item.seatsAvailable,
          isOpen: item.isOpen
        }).where(and(eq(course_sections.crn, item.crn), eq(course_sections.term, termCode)));
        updatedCount++;
      }
    }
  }

  await db.update(banner_terms).set({
    lastCheckAt: new Date()
  }).where(eq(banner_terms.termCode, termCode));

  return { updatedCount };
}

/**
 * Empty/purge all sections belonging to a specific term
 */
export async function emptyTermSections(termCode: string, db: any): Promise<{ deletedCount: number }> {
  const res: any = await db.delete(course_sections).where(eq(course_sections.term, termCode));
  const deletedCount = res?.rowCount || 0;

  await db.update(banner_terms).set({
    totalSections: 0,
    lastSyncAt: null,
    lastCheckAt: null
  }).where(eq(banner_terms.termCode, termCode));

  return { deletedCount };
}

/**
 * Fetch and add a custom list of CRNs to a term
 */
export async function addCrnsToTerm(termCode: string, crns: string[], db: any): Promise<{ addedCount: number }> {
  const client = new BannerClient();
  await client.connect();
  await client.initTerm(termCode);

  const cleanCrns = Array.from(new Set(crns.map(c => String(c).trim()).filter(Boolean)));
  if (cleanCrns.length === 0) return { addedCount: 0 };

  // Fetch sections by batches
  const sections = await client.fetchSectionsBatch(termCode, [0], 250);
  const targetSections = sections.filter((s: any) => cleanCrns.includes(s.crn));

  if (targetSections.length === 0) {
    return { addedCount: 0 };
  }

  const termInfo: TermInfo = {
    academicYear: '1448',
    semester: 'الفصل الأول',
    term: termCode
  };

  const catalogInput = {
    courses: targetSections.map((s: any) => ({
      code: s.courseCode,
      name: s.courseTitle,
      creditHours: s.creditHours,
      sections: []
    })),
    sections: targetSections
  };

  await processAndUpsertCatalog(catalogInput, termInfo, db);

  // Update total count
  const countRes = await db.select({ count: sql<number>`count(*)` }).from(course_sections).where(eq(course_sections.term, termCode));
  const total = Number(countRes[0]?.count) || 0;
  await db.update(banner_terms).set({ totalSections: total }).where(eq(banner_terms.termCode, termCode));

  return { addedCount: targetSections.length };
}
