/**
 * Unified Date Utilities for IMAMU Helper (R2)
 */

export type DateInput = Date | string | number | null | undefined;

export type DateFormatPreset = 
  | 'iso-date'       // YYYY-MM-DD (e.g., "2026-09-23")
  | 'ar-display'     // Arabic Gregorian Date (e.g., "23 سبتمبر 2026")
  | 'ar-full'        // Arabic Full Date & Time (e.g., "الأربعاء، 23 سبتمبر 2026 • 3:45 م")
  | 'ar-hijri'       // Hijri Umm al-Qura Date (e.g., "11 ربيع الأول 1448 هـ")
  | 'time'           // Time string (e.g., "03:45 PM" / "3:45 م")
  | 'ics';           // iCalendar ISO (e.g., "20260923T154500Z")

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
  isSemesterStart?: boolean;
  isSemesterEnd?: boolean;
  isEid?: boolean;
  isNationalDay?: boolean;
}

/**
 * 1. Safe Date Parser
 * Parses strings (YYYY-MM-DD, DD/MM/YYYY, ISO), numbers, or Date objects into a valid Date object or null.
 */
export function parseDate(input: DateInput): Date | null {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? null : d;
  }

  const trimmed = String(input).trim();
  if (!trimmed) return null;

  // Handle YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }

  // Handle DD/MM/YYYY
  const ddmmMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmMatch) {
    const day = Number(ddmmMatch[1]);
    const month = Number(ddmmMatch[2]) - 1;
    const year = Number(ddmmMatch[3]);
    const dateObj = new Date(year, month, day);
    return isNaN(dateObj.getTime()) ? null : dateObj;
  }

  // Fallback to standard JS parsing
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Legacy compatibility alias for parseDate.
 */
export function parseAcademicDate(dateStr: string | null | undefined): Date | null {
  return parseDate(dateStr);
}

/**
 * Legacy compatibility helper for date range extraction.
 */
export function extractCleanDateRange(desc: string | null | undefined, fallbackDate: string = ''): string {
  if (!desc) return fallbackDate;
  const matches = Array.from(String(desc).matchAll(/\((\d{2}\/\d{2}\/\d{4})م?\)/g)).map(m => m[1]);
  if (matches.length >= 2) {
    return `${matches[0]} - ${matches[1]}`;
  }
  return fallbackDate;
}

/**
 * 2. Unified Date Formatter
 */
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
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      const seconds = String(d.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
    }

    default:
      return d.toLocaleDateString('ar-SA');
  }
}

/**
 * 3. Hijri Date Formatter
 */
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

/**
 * Compact Hijri Month & Day Formatter (e.g. "١٢ ربيع الآخر")
 */
export function formatHijriMonthDay(input: DateInput): string {
  const d = parseDate(input);
  if (!d) return '-';
  return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
    day: 'numeric',
    month: 'long'
  }).format(d);
}

/**
 * 4. Unified Countdown Calculator
 */
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

/**
 * 5. Mokafaa Payout Calculation with Saudi Weekend Rules
 * (27th of month, Friday -> 26th, Saturday -> 28th)
 */
export function calculateMokafaaDate(year: number, monthZeroBased: number): Date {
  const dateObj = new Date(year, monthZeroBased, 27);
  const dayOfWeek = dateObj.getDay();
  if (dayOfWeek === 5) dateObj.setDate(26);      // Friday -> Thursday 26th
  else if (dayOfWeek === 6) dateObj.setDate(28); // Saturday -> Sunday 28th
  return dateObj;
}

/**
 * 6. Calculation of Progress Percentage
 */
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
export function getEventCategoryMeta(flags: AcademicEventFlags & { title?: string }): { label: string; icon: string; badgeClass: string } | null {
  if (flags.title?.includes('مكافأة') || flags.title?.includes('المكافأة') || flags.title?.includes('إيداع')) {
    return { label: '💰 إيداع المكافأة', icon: '💰', badgeClass: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30' };
  }
  if (flags.isSemesterStart) return { label: '🚀 بداية الفصل', icon: '🚀', badgeClass: 'bg-[var(--color-imamu-brown)/15] text-[var(--color-imamu-accent)] border-amber-700/30' };
  if (flags.isSemesterEnd) return { label: '🏁 نهاية الفصل', icon: '🏁', badgeClass: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30' };
  if (flags.isHoliday) return { label: '🌴 بداية إجازة', icon: '🌴', badgeClass: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' };
  if (flags.isHolidayEnd) return { label: '🔄 نهاية إجازة', icon: '🔄', badgeClass: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30' };
  if (flags.isEid) return { label: '🌙 احتفال العيد', icon: '🌙', badgeClass: 'bg-amber-500/15 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] border-amber-500/30' };
  if (flags.isNationalDay) return { label: '🇸🇦 اليوم الوطني', icon: '🇸🇦', badgeClass: 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-emerald-600/40' };
  return null;
}
