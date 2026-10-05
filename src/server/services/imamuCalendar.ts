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

export interface SyncResult {
  success: boolean;
  academicYear?: string;
  totalFetched: number;
  addedCount: number;
  updatedCount: number;
  error?: string;
}

/**
 * Synchronizes official IMAMU academic calendar events from Banner Extensibility API
 */
export async function syncImamuCalendar(db: any): Promise<SyncResult> {
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

    // 2. Fetch Events
    const eventsRes = await fetch(EVENTS_URL, { headers, signal: AbortSignal.timeout(10000) });
    if (!eventsRes.ok) {
      throw new Error(`Failed to fetch events from IMAMU API (HTTP ${eventsRes.status})`);
    }

    const rawEvents = await eventsRes.json();
    if (!Array.isArray(rawEvents)) {
      throw new Error('Invalid response structure: expected array of events');
    }

    // 3. Fetch Terms / Milestones (optional enrichment)
    let rawTerms: any[] = [];
    try {
      const termsRes = await fetch(TERMS_URL, { headers, signal: AbortSignal.timeout(8000) });
      if (termsRes.ok) {
        rawTerms = await termsRes.json();
      }
    } catch (e: any) {
      logger.warn('[IMAMU Calendar Sync] Terms fetch failed (non-critical):', e.message);
    }

    // Load existing academic events from DB to perform safe upsert
    const existingAcademicEvents = await db
      .select()
      .from(events)
      .where(eq(events.calendarType, 'academic'));

    const existingMap = new Map<string, any>();
    for (const ev of existingAcademicEvents) {
      const key = `${ev.title.trim()}::${ev.date.trim()}`;
      existingMap.set(key, ev);
    }

    let addedCount = 0;
    let updatedCount = 0;

    for (const item of rawEvents) {
      const rawTitle = (item.TITLE || '').trim();
      if (!rawTitle) continue;

      const startDate = toRiyadhDateStr(item.STARTD);
      const endDate = toRiyadhDateStr(item.ENDD) || startDate;
      if (!startDate) continue;

      const type = (item.TYPE || '').toLowerCase();
      const isHoliday = type === 'holiday' || type === 'islamic' || type === 'national' || rawTitle.includes('إجازة');
      const isEid = type === 'islamic' || rawTitle.includes('عيد');
      const isNationalDay = type === 'national' || rawTitle.includes('الوطني') || rawTitle.includes('التأسيس');
      const isSemesterStart = rawTitle.includes('بداية الدراسة') || rawTitle.includes('بدء الدراسة');
      const isSemesterEnd = rawTitle.includes('نهاية العام') || rawTitle.includes('نهاية الفصل');

      const finalEndDate = endDate !== startDate ? endDate : null;
      let desc = '';
      if (finalEndDate) {
        desc = `الفترة الرسمية: من ${startDate} إلى ${finalEndDate} (آخر موعد للإغلاق: ${finalEndDate})`;
      } else {
        desc = `موعد رسمي معتمد للعام الجامعي ${academicYear}هـ`;
      }

      const existingKey = `${rawTitle}::${startDate}`;
      const existing = existingMap.get(existingKey);

      if (existing) {
        // Update only if dates or details genuinely differ
        const hasDateChanged = existing.date !== startDate;
        const hasEndDateChanged = (existing.endDate || null) !== finalEndDate;
        const hasHolidayChanged = !!existing.isHoliday !== isHoliday;
        const hasSemesterStartChanged = !!existing.isSemesterStart !== isSemesterStart;

        if (hasDateChanged || hasEndDateChanged || hasHolidayChanged || hasSemesterStartChanged) {
          await db
            .update(events)
            .set({
              date: startDate,
              endDate: finalEndDate,
              description: desc,
              isHoliday,
              isEid,
              isNationalDay,
              isSemesterStart,
              isSemesterEnd,
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
          isHoliday,
          isEid,
          isNationalDay,
          isSemesterStart,
          isSemesterEnd,
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
  }
}
