import { eq, and, sql } from 'drizzle-orm';
import { events } from '../../db/schema';
import { logger } from '../../middleware/logger';

const EVENTS_URL = 'https://bext.imamu.edu.sa/BannerExtensibility/internalPb/virtualDomains.IM_CDC_EVENTS';
const TERMS_URL = 'https://bext.imamu.edu.sa/BannerExtensibility/internalPb/virtualDomains.IM_CLASSROOMS';
const YEAR_URL = 'https://bext.imamu.edu.sa/BannerExtensibility/internalPb/virtualDomains.IM_ACADEMIC_YEAR';

/**
 * Converts ISO UTC date string (e.g. "2026-08-22T21:00:00Z") to Riyadh local date "YYYY-MM-DD"
 */
export function toRiyadhDateStr(isoString: string | null | undefined): string | null {
  if (!isoString) return null;
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return null;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Riyadh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(d);
}

export interface EventClassification {
  isHoliday: boolean;
  isHolidayEnd: boolean;
  isEid: boolean;
  isNationalDay: boolean;
  isSemester: boolean;
  isSemesterStart: boolean;
  isSemesterEnd: boolean;
}

/**
 * Classifies an IMAMU academic calendar event into accurate category flags.
 */
export function classifyCalendarEvent(title: string, rawType: string = ''): EventClassification {
  const cleanTitle = (title || '').trim();
  const type = (rawType || '').toLowerCase().trim();

  // 1. Resumption / End of vacation detection
  // Events such as "بداية الدراسة بعد إجازة الخريف", "بداية الدراسة بعد إجازة عيد الفطر"
  // indicate returning to study after a vacation. They mark the conclusion of a holiday,
  // NOT a new holiday start, NOT an Eid day, and NOT the start of a semester.
  const isResumption = cleanTitle.includes('بعد إجازة') ||
                       cleanTitle.includes('بعد الإجازة') ||
                       cleanTitle.includes('استئناف الدراسة') ||
                       cleanTitle.includes('عودة الدراسة');

  const isHolidayEnd = isResumption ||
                       cleanTitle.includes('نهاية إجازة') ||
                       cleanTitle.includes('نهاية الإجازة');

  // 2. National Day / Founding Day
  const isNationalDay = type === 'national' ||
                        cleanTitle.includes('الوطني') ||
                        cleanTitle.includes('التأسيس');

  // 3. Eid Celebration:
  // Must be islamic type or explicitly mention Eid / Al-Eid.
  // Crucially excludes "المعيدين" (Faculty teaching assistants) and "معيد", and excludes resumption after Eid!
  const mentionsEid = type === 'islamic' ||
                      cleanTitle.includes('عيد الفطر') ||
                      cleanTitle.includes('عيد الأضحى') ||
                      /(?:^|\s)(?:عيد|العيد)(?:\s|$)/.test(cleanTitle);
  const isTeachingAssistant = cleanTitle.includes('المعيدين') || cleanTitle.includes('معيد');
  const isEid = mentionsEid && !isTeachingAssistant && !isResumption;

  // 4. Holiday:
  // Must be holiday/islamic/national type or mention 'إجازة', but NOT if it's returning from holiday!
  const isHoliday = (type === 'holiday' || type === 'islamic' || type === 'national' || cleanTitle.includes('إجازة')) && !isResumption;

  // 5. Exam Detection:
  const isExam = cleanTitle.includes('اختبار') || cleanTitle.includes('امتحان');

  // 6. Academic Movement & Procedures Detection:
  // (Withdrawal, postponement, registration, admission, transfer, drop/add, re-enrollment)
  const isAcademicProcedure = cleanTitle.includes('اعتذار') ||
                              cleanTitle.includes('الاعتذار') ||
                              cleanTitle.includes('تسجيل') ||
                              cleanTitle.includes('التسجيل') ||
                              cleanTitle.includes('تحويل') ||
                              cleanTitle.includes('التحويل') ||
                              cleanTitle.includes('قبول') ||
                              cleanTitle.includes('القبول') ||
                              cleanTitle.includes('تأجيل') ||
                              cleanTitle.includes('التأجيل') ||
                              cleanTitle.includes('حذف') ||
                              cleanTitle.includes('إضافة') ||
                              cleanTitle.includes('قيد');

  // 7. Semester Start:
  // Starting university at semester start (e.g. "بداية الدراسة", "بدء الدراسة", "بداية الفصل"),
  // but NOT returning after a mid-semester holiday, NOT exams, NOT procedures!
  const isSemesterStart = (
    cleanTitle.includes('بداية الدراسة') ||
    cleanTitle.includes('بدء الدراسة') ||
    cleanTitle.includes('بداية الفصل') ||
    cleanTitle.includes('بدء الفصل')
  ) && !isResumption && !isExam && !isAcademicProcedure;

  // 8. Semester End:
  // End of year/semester for students; exclude faculty-specific end-of-year vacation starts, exams, procedures.
  const isSemesterEnd = (
    cleanTitle.includes('نهاية العام') ||
    cleanTitle.includes('نهاية الفصل') ||
    cleanTitle.includes('انتهاء الفصل') ||
    cleanTitle.includes('ختام الفصل')
  ) && !cleanTitle.includes('هيئة التدريس') && !isExam && !isAcademicProcedure;

  // 9. General Semester Milestone:
  // Only true if it is an actual semester entity or boundary, NOT exams and NOT academic procedures!
  const isSemesterOnly = /^(الفصل الدراسي (الأول|الثاني|الثالث)|الفصل الصيفي)$/.test(cleanTitle) ||
                         (cleanTitle.startsWith('الفصل الدراسي') && !cleanTitle.includes('الاعتذار') && !cleanTitle.includes('الاختبارات'));
  const isSemester = (isSemesterStart || isSemesterEnd || isSemesterOnly) && !isExam && !isAcademicProcedure;

  return {
    isHoliday,
    isHolidayEnd,
    isEid,
    isNationalDay,
    isSemester,
    isSemesterStart,
    isSemesterEnd,
  };
}

export interface SyncResult {
  success: boolean;
  academicYear?: string;
  totalFetched: number;
  addedCount: number;
  updatedCount: number;
  error?: string;
}

let isSyncInProgress = false;

/**
 * Synchronizes official IMAMU academic calendar events from Banner Extensibility API
 */
export async function syncImamuCalendar(db: any): Promise<SyncResult> {
  if (isSyncInProgress) {
    return {
      success: false,
      totalFetched: 0,
      addedCount: 0,
      updatedCount: 0,
      error: 'Calendar synchronization is already in progress.',
    };
  }

  isSyncInProgress = true;
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
  };

  try {
    // 1. Fetch Academic Year
    let academicYear = '1448';
    try {
      const yrRes = await fetch(YEAR_URL, { headers, signal: AbortSignal.timeout(8000) });
      if (yrRes.ok) {
        const yrData = await yrRes.json();
        if (Array.isArray(yrData) && yrData[0]?.STVACYR_DESC) {
          academicYear = String(yrData[0].STVACYR_DESC);
        }
      }
    } catch (e: any) {
      logger.warn('[IMAMU Calendar Sync] Could not fetch academic year, fallback to default:', e.message);
    }

    // 2. Fetch Terms / Milestones (STVTERM dates) first so semester starts can be matched with their finish dates
    let rawTerms: any[] = [];
    try {
      const termsRes = await fetch(TERMS_URL, { headers, signal: AbortSignal.timeout(8000) });
      if (termsRes.ok) {
        rawTerms = await termsRes.json();
      }
    } catch (e: any) {
      logger.warn('[IMAMU Calendar Sync] Terms fetch failed (non-critical):', e.message);
    }

    // Map terms by their start date to enrich semester start events with accurate finish/end dates!
    const termsByStartDate = new Map<string, { termName: string; startDate: string; endDate: string }>();
    const termStartDates: string[] = [];
    if (Array.isArray(rawTerms)) {
      for (const term of rawTerms) {
        const semName = term.SEMESTER_NAME || '';
        const termStart = toRiyadhDateStr(term.STVTERM_START_DATE);
        const termEnd = toRiyadhDateStr(term.STVTERM_END_DATE);
        if (termStart && termEnd) {
          termsByStartDate.set(termStart, { termName: semName, startDate: termStart, endDate: termEnd });
          termStartDates.push(termStart);
        }
      }
    }
    termStartDates.sort();

    // Map resumption dates by holiday keyword so holiday start and resumption merge into ONE event
    const resumptionByHoliday = new Map<string, string>();
    const allResumptions: { title: string; date: string }[] = [];

    // 3. Fetch Events
    const eventsRes = await fetch(EVENTS_URL, { headers, signal: AbortSignal.timeout(10000) });
    if (!eventsRes.ok) {
      throw new Error(`Failed to fetch events from IMAMU API (HTTP ${eventsRes.status})`);
    }

    const rawEvents = await eventsRes.json();
    if (!Array.isArray(rawEvents)) {
      throw new Error('Invalid response structure: expected array of events');
    }

    // Pre-scan rawEvents for vacation resumption dates
    for (const item of rawEvents) {
      const rawTitle = (item.TITLE || '').trim();
      const startDate = toRiyadhDateStr(item.STARTD);
      if (!startDate) continue;

      const isResumption = rawTitle.includes('بعد إجازة') ||
                           rawTitle.includes('بعد الإجازة') ||
                           rawTitle.includes('استئناف الدراسة') ||
                           rawTitle.includes('عودة الدراسة');
      if (isResumption) {
        allResumptions.push({ title: rawTitle, date: startDate });
        const match = rawTitle.match(/(?:بعد\s+)(إجازة\s+[^\s]+(?:\s+[^\s]+)?)/);
        if (match && match[1]) {
          resumptionByHoliday.set(match[1].trim(), startDate);
        }
      }
    }
    allResumptions.sort((a, b) => a.date.localeCompare(b.date));

    // Load existing academic events from DB to perform safe upsert and cleanup duplicates
    const existingAcademicEvents = await db
      .select()
      .from(events)
      .where(eq(events.calendarType, 'academic'));

    const existingMap = new Map<string, any>();
    const duplicateIdsToDelete: number[] = [];

    const normalizeEventKey = (t: string, d: string) => `${(t || '').replace(/\s+/g, ' ').trim()}::${(d || '').trim()}`;

    for (const ev of existingAcademicEvents) {
      const key = normalizeEventKey(ev.title, ev.date);
      // Delete obsolete standalone resumption rows immediately (they are unified into holidays)
      if (
        ev.title.includes('بعد إجازة') ||
        ev.title.includes('بعد الإجازة') ||
        ev.title.includes('استئناف الدراسة') ||
        ev.title.includes('عودة الدراسة')
      ) {
        duplicateIdsToDelete.push(ev.id);
        continue;
      }

      if (existingMap.has(key)) {
        duplicateIdsToDelete.push(ev.id);
      } else {
        existingMap.set(key, ev);
      }
    }

    if (duplicateIdsToDelete.length > 0) {
      for (const dupId of duplicateIdsToDelete) {
        await db.delete(events).where(eq(events.id, dupId));
      }
      logger.info(`[IMAMU Calendar Sync] Cleaned up ${duplicateIdsToDelete.length} obsolete/duplicate academic event rows.`);
    }

    let addedCount = 0;
    let updatedCount = 0;

    for (const item of rawEvents) {
      let rawTitle = (item.TITLE || '').trim();
      if (!rawTitle) continue;

      const startDate = toRiyadhDateStr(item.STARTD);
      const endDate = toRiyadhDateStr(item.ENDD) || startDate;
      if (!startDate) continue;

      const isResumption = rawTitle.includes('بعد إجازة') ||
                           rawTitle.includes('بعد الإجازة') ||
                           rawTitle.includes('استئناف الدراسة') ||
                           rawTitle.includes('عودة الدراسة');

      // Standalone resumption events are merged directly into the holiday event, so skip them!
      if (isResumption) {
        continue;
      }

      // Unify holiday title: "بداية إجازة عيد الفطر" -> "إجازة عيد الفطر"
      const originalTitle = rawTitle;
      if (rawTitle.startsWith('بداية إجازة ') || rawTitle.startsWith('بدء إجازة ')) {
        rawTitle = rawTitle.replace(/^(بداية|بدء)\s+(إجازة\s+)/, '$2');
      }

      const classification = classifyCalendarEvent(rawTitle, item.TYPE);

      let computedEndDate = endDate !== startDate ? endDate : null;

      // 1. Semester study period duration matching
      if (classification.isSemesterStart && !computedEndDate) {
        const matchedTerm = termsByStartDate.get(startDate);
        if (matchedTerm && matchedTerm.endDate && matchedTerm.endDate !== startDate) {
          computedEndDate = matchedTerm.endDate;
        }
      }

      // 2. Holiday duration matching: combine start and end into ONE unified multi-day holiday!
      if (classification.isHoliday && !computedEndDate) {
        if (rawTitle.includes('منتصف العام')) {
          const nextTermStart = termStartDates.find(d => d > startDate);
          if (nextTermStart) {
            computedEndDate = nextTermStart;
          }
        } else if (rawTitle.includes('نهاية العام')) {
          const nextYearNum = (parseInt(academicYear, 10) || 0) + 1;
          const nextYearStr = nextYearNum > 1000 ? String(nextYearNum) : '';
          const nextYearStudyStart = rawEvents.find((e: any) => {
            const t = e.TITLE || '';
            const d = toRiyadhDateStr(e.STARTD);
            if (!d || d <= startDate) return false;
            return (t.includes('بداية الدراسة') || t.includes('بدء الدراسة')) && (!nextYearStr || t.includes(nextYearStr));
          });
          const nextYearDate = toRiyadhDateStr(nextYearStudyStart?.STARTD);
          if (nextYearDate && nextYearDate > startDate) {
            computedEndDate = nextYearDate;
          }
        } else {
          const resumeDate = resumptionByHoliday.get(rawTitle);
          if (resumeDate && resumeDate > startDate) {
            computedEndDate = resumeDate;
          } else {
            const nextResume = allResumptions.find(r => r.date > startDate);
            if (nextResume && nextResume.date > startDate) {
              computedEndDate = nextResume.date;
            }
          }
        }
      }

      const finalEndDate = computedEndDate;
      let desc = '';
      if (finalEndDate) {
        if (classification.isSemesterStart) {
          desc = `الفترة الدراسية المعتمدة: من ${startDate} إلى ${finalEndDate} للعام الجامعي ${academicYear}هـ`;
        } else if (classification.isHoliday) {
          desc = `فترة الإجازة الرسمية: من ${startDate} إلى ${finalEndDate} (استئناف الدراسة: ${finalEndDate})`;
        } else {
          desc = `الفترة الرسمية: من ${startDate} إلى ${finalEndDate} (آخر موعد للإغلاق: ${finalEndDate})`;
        }
      } else {
        desc = `موعد رسمي معتمد للعام الجامعي ${academicYear}هـ`;
      }

      // Check existing row by either new unified title or legacy title
      const existingKey = normalizeEventKey(rawTitle, startDate);
      const legacyKey = normalizeEventKey(originalTitle, startDate);
      const existing = existingMap.get(existingKey) || existingMap.get(legacyKey);

      if (existing) {
        // Update only if dates or details genuinely differ
        const hasTitleChanged = existing.title !== rawTitle;
        const hasDateChanged = existing.date !== startDate;
        const hasEndDateChanged = (existing.endDate || null) !== finalEndDate;
        const hasHolidayChanged = !!existing.isHoliday !== classification.isHoliday;
        const hasHolidayEndChanged = !!existing.isHolidayEnd !== classification.isHolidayEnd;
        const hasEidChanged = !!existing.isEid !== classification.isEid;
        const hasNationalDayChanged = !!existing.isNationalDay !== classification.isNationalDay;
        const hasSemesterChanged = !!existing.isSemester !== classification.isSemester;
        const hasSemesterStartChanged = !!existing.isSemesterStart !== classification.isSemesterStart;
        const hasSemesterEndChanged = !!existing.isSemesterEnd !== classification.isSemesterEnd;
        const hasDescChanged = (existing.description || '') !== desc;

        if (
          hasTitleChanged ||
          hasDateChanged ||
          hasEndDateChanged ||
          hasHolidayChanged ||
          hasHolidayEndChanged ||
          hasEidChanged ||
          hasNationalDayChanged ||
          hasSemesterChanged ||
          hasSemesterStartChanged ||
          hasSemesterEndChanged ||
          hasDescChanged
        ) {
          await db
            .update(events)
            .set({
              title: rawTitle,
              date: startDate,
              endDate: finalEndDate,
              description: desc,
              isHoliday: classification.isHoliday,
              isHolidayEnd: classification.isHolidayEnd,
              isEid: classification.isEid,
              isNationalDay: classification.isNationalDay,
              isSemester: classification.isSemester,
              isSemesterStart: classification.isSemesterStart,
              isSemesterEnd: classification.isSemesterEnd,
            })
            .where(eq(events.id, existing.id));
          updatedCount++;
        }
      } else {
        // Insert new academic event
        await db.insert(events).values({
          title: rawTitle,
          date: startDate,
          endDate: finalEndDate,
          description: desc,
          calendarType: 'academic',
          isHoliday: classification.isHoliday,
          isHolidayEnd: classification.isHolidayEnd,
          isEid: classification.isEid,
          isNationalDay: classification.isNationalDay,
          isSemester: classification.isSemester,
          isSemesterStart: classification.isSemesterStart,
          isSemesterEnd: classification.isSemesterEnd,
        });
        existingMap.set(existingKey, true);
        addedCount++;
      }
    }

    // Process Terms if any term milestone is missing
    if (Array.isArray(rawTerms)) {
      for (const term of rawTerms) {
        const semName = term.SEMESTER_NAME;
        if (!semName) continue;

        // If exam dates exist and not already in events
        const examsStart = toRiyadhDateStr(term.EXAMS_START_DATE);
        const examsEnd = toRiyadhDateStr(term.EXAMS_END_DATE) || examsStart;
        if (examsStart) {
          const examTitle = `الاختبارات النهائية - ${semName}`;
          const examKey = `${examTitle}::${examsStart}`;
          if (!existingMap.has(examKey) && !existingMap.has(examTitle)) {
            await db.insert(events).values({
              title: examTitle,
              date: examsStart,
              endDate: examsEnd !== examsStart ? examsEnd : null,
              description: examsStart !== examsEnd ? `فترة الاختبارات النهائية من ${examsStart} إلى ${examsEnd}` : `بداية الاختبارات النهائية لـ ${semName}`,
              calendarType: 'academic',
            });
            existingMap.set(examKey, true);
            existingMap.set(examTitle, true);
            addedCount++;
          }
        }
      }
    }

    logger.info(`[IMAMU Calendar Sync] Complete: ${addedCount} added, ${updatedCount} updated.`);
    return {
      success: true,
      academicYear,
      totalFetched: rawEvents.length,
      addedCount,
      updatedCount,
    };
  } catch (error: any) {
    logger.error('[IMAMU Calendar Sync Error]', error);
    return {
      success: false,
      totalFetched: 0,
      addedCount: 0,
      updatedCount: 0,
      error: error.message || 'Unknown error occurred while syncing calendar',
    };
  } finally {
    isSyncInProgress = false;
  }
}

