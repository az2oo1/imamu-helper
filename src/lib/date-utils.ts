/**
 * Unified Date Utilities for IMAMU Helper (R2)
 */

import { normalizeExamDate } from './schedule-utils';

export type DateInput = Date | string | number | null | undefined;

export type DateFormatPreset = 'iso-date' | 'ar-display' | 'ar-full' | 'ar-hijri' | 'time' | 'ics';

export interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
  isToday: boolean;
  totalMs: number;
}

export interface AcademicEventFlags {
  isHoliday?: boolean;
  isHolidayEnd?: boolean;
  isSemester?: boolean;
  isSemesterStart?: boolean;
  isSemesterEnd?: boolean;
  isEid?: boolean;
  isNationalDay?: boolean;
}

export function parseDate(input: DateInput): Date | null {
  if (!input) return null;
  const checkValid = (d: Date): Date | null => {
    if (isNaN(d.getTime())) return null;
    const year = d.getFullYear();
    if (year < 1900 || year > 2100) return null;
    return d;
  };

  if (input instanceof Date) return checkValid(input);
  if (typeof input === 'number') {
    return checkValid(new Date(input));
  }

  const trimmed = String(input).trim();
  if (!trimmed) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    return checkValid(new Date(y, m - 1, d));
  }

  const norm = normalizeExamDate(trimmed);
  if (norm) {
    const [y, m, d] = norm.split('-').map(Number);
    return checkValid(new Date(y, m - 1, d));
  }

  // Fallback to standard JS parsing
  return checkValid(new Date(trimmed));
}

export function formatDate(input: DateInput, preset: DateFormatPreset = 'ar-display'): string {
  const d = parseDate(input);
  if (!d) return '-';

  switch (preset) {
    case 'iso-date': {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    case 'ar-display': {
      return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(d);
    }

    case 'ar-full': {
      return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(d);
    }

    case 'ar-hijri': {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(d) + ' هـ';
    }

    case 'time': {
      return new Intl.DateTimeFormat('ar-SA-u-ca-gregory', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }).format(d);
    }

    case 'ics': {
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      const hours = String(d.getUTCHours()).padStart(2, '0');
      const minutes = String(d.getUTCMinutes()).padStart(2, '0');
      const seconds = String(d.getUTCSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    }

    default:
      return d.toLocaleDateString('ar-SA');
  }
}

export function formatHijriDate(input: DateInput, options?: Intl.DateTimeFormatOptions): string {
  const d = parseDate(input);
  if (!d) return '-';
  const defaultOpts: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options
  };
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', defaultOpts).format(d) + ' هـ';
}

export function formatHijriMonthDay(input: DateInput): string {
  const d = parseDate(input);
  if (!d) return '-';
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'long'
  }).format(d);
}

export function getCountdown(targetDateInput: DateInput, nowInput: DateInput = new Date()): CountdownResult {
  const target = parseDate(targetDateInput);
  const now = parseDate(nowInput) || new Date();

  if (!target) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false, isToday: false, totalMs: 0 };
  }

  const isToday = now.getFullYear() === target.getFullYear() && 
                  now.getMonth() === target.getMonth() && 
                  now.getDate() === target.getDate();

  const difference = target.getTime() - now.getTime();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, isToday, totalMs: difference };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    isPast: false,
    isToday,
    totalMs: difference
  };
}

export function calculateMokafaaDate(year: number, monthZeroBased: number): Date {
  const dateObj = new Date(year, monthZeroBased, 27);
  const dayOfWeek = dateObj.getDay();
  if (dayOfWeek === 5) dateObj.setDate(26);      // Friday -> Thursday 26th
  else if (dayOfWeek === 6) dateObj.setDate(28); // Saturday -> Sunday 28th
  return dateObj;
}

export function calculateProgressPercent(startInput: DateInput, endInput: DateInput, nowInput: DateInput = new Date()): number {
  const start = parseDate(startInput);
  const end = parseDate(endInput);
  const now = parseDate(nowInput) || new Date();

  if (!start || !end) return 0;

  const total = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();

  if (total <= 0) return 0;
  const percent = (elapsed / total) * 100;
  return Math.min(100, Math.max(0, percent));
}

/**
 * 7. Category Descriptor Badge Helper
 */
type CategoryMeta = { label: string; icon: string; badgeClass: string };
type CategoryRule = { matches: (title: string, flags: AcademicEventFlags) => boolean; result: CategoryMeta };

const categoryRules: CategoryRule[] = [
  { matches: t => /مكافأة|المكافأة|إيداع/.test(t), result: { label: '💰 إيداع المكافأة', icon: '💰', badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' } },
  { matches: (_t, f) => Boolean(f.isEid), result: { label: '🌙 احتفال العيد', icon: '🌙', badgeClass: 'bg-amber-500/15 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] border-amber-500/30' } },
  { matches: t => /اختبار|امتحان/.test(t), result: { label: '📝 فترة الاختبارات', icon: '📝', badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30' } },
  { matches: t => /تسجيل|التحويل|القبول|إعادة القيد|الاعتذار|التأجيل|حذف|إضافة/.test(t), result: { label: '📋 حركة أكاديمية', icon: '📋', badgeClass: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' } },
  { matches: (t, f) => Boolean(f.isHoliday || f.isHolidayEnd || t.includes('إجازة')), result: { label: '🌴 إجازة', icon: '🌴', badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' } },
  { matches: (t, f) => Boolean(f.isSemesterStart || (!t.includes('بعد إجازة') && /بداية الدراسة|بدء الدراسة|بداية الفصل|بدء الفصل/.test(t))), result: { label: '🚀 بداية الفصل', icon: '🚀', badgeClass: 'bg-[var(--color-imamu-brown)/15] text-[var(--color-imamu-accent)] border-amber-700/30' } },
  { matches: (t, f) => Boolean(f.isSemesterEnd || /نهاية الفصل|نهاية العام/.test(t)), result: { label: '🏁 نهاية الفصل', icon: '🏁', badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' } },
  { matches: (_t, f) => Boolean(f.isSemester), result: { label: '🎓 فصل دراسي', icon: '🎓', badgeClass: 'bg-[var(--color-imamu-brown)/15] text-[var(--color-imamu-accent)] border-amber-700/30' } }
];

export function getEventCategoryMeta(flags: AcademicEventFlags & { title?: string }): CategoryMeta | null {
  const title = flags.title || '';
  if (flags.isNationalDay || title.includes('الوطني') || title.includes('التأسيس')) {
    return {
      label: title.includes('التأسيس') ? '🇸🇦 يوم التأسيس' : '🇸🇦 اليوم الوطني',
      icon: '🇸🇦',
      badgeClass: 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-emerald-600/40'
    };
  }
  return categoryRules.find(rule => rule.matches(title, flags))?.result || null;
}

/**
 * 8. Escape text for iCalendar (RFC 5545)
 */
export function escapeIcs(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * 9. Calculate exact start and end Date boundaries for calendar rendering & exports
 */
export function getEventDateTimeBounds(ev: {
  date: DateInput;
  endDate?: DateInput;
  time?: string | null;
  endTime?: string | null;
}) {
  const startBase = parseDate(ev.date);
  if (!startBase || isNaN(startBase.getTime())) return null;

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

  return { startBase, startD, endD, hasTime };
}

/**
 * 8. Time Parser Helper
 * Parses various time formats (e.g. "10:15 am", "10:15 ص", "14:30", "10:15") into a Date instance.
 */
export function parseTimeIntoDate(baseDate: Date, timeStr?: string): { date: Date; hasTime: boolean } {
  const d = new Date(baseDate.getTime());
  if (!timeStr || typeof timeStr !== 'string') {
    return { date: d, hasTime: false };
  }
  const clean = timeStr.trim().toLowerCase();
  const match = clean.match(/^(\d{1,2}):(\d{2})(?:\s*(am|pm|ص|م))?$/i);
  if (!match) {
    return { date: d, hasTime: false };
  }
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3];
  if (period) {
    const isPM = period === 'pm' || period === 'م';
    const isAM = period === 'am' || period === 'ص';
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
  } else if (h >= 1 && h <= 6) {
    h += 12;
  }
  d.setHours(h, m, 0, 0);
  return { date: d, hasTime: true };
}

/**
 * 9. Format date as floating iCalendar string (YYYYMMDDTHHmmss) without Z
 */
export function formatIcsFloating(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}T${hours}${minutes}${seconds}`;
}
