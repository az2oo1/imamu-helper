/**
 * Unified Schedule, Time, and Day Utilities for IMAMU Helper
 */

export const SCHEDULE_DAYS_LIST = [
  { key: 'الأحد', label: 'الأحد', en: 'Sun', dayOfWeek: 0 },
  { key: 'الاثنين', label: 'الاثنين', en: 'Mon', dayOfWeek: 1 },
  { key: 'الثلاثاء', label: 'الثلاثاء', en: 'Tue', dayOfWeek: 2 },
  { key: 'الأربعاء', label: 'الأربعاء', en: 'Wed', dayOfWeek: 3 },
  { key: 'الخميس', label: 'الخميس', en: 'Thu', dayOfWeek: 4 },
];

export const DAY_MAP_AR: Record<string, string> = {
  Sunday: 'الأحد', Monday: 'الاثنين', Tuesday: 'الثلاثاء', Wednesday: 'الأربعاء', Thursday: 'الخميس', Friday: 'الجمعة', Saturday: 'السبت',
  Sun: 'الأحد', Mon: 'الاثنين', Tue: 'الثلاثاء', Wed: 'الأربعاء', Thu: 'الخميس', Fri: 'الجمعة', Sat: 'السبت',
  U: 'الأحد', M: 'الاثنين', T: 'الثلاثاء', W: 'الأربعاء', R: 'الخميس', F: 'الجمعة', S: 'السبت',
  'الأحد': 'الأحد', 'الاثنين': 'الاثنين', 'الإثنين': 'الاثنين', 'الثلاثاء': 'الثلاثاء', 'الأربعاء': 'الأربعاء', 'الاربعاء': 'الأربعاء', 'الخميس': 'الخميس', 'الجمعة': 'الجمعة', 'السبت': 'السبت',
  // Single-letter Arabic abbreviations commonly used in Saudi university SIS
  'ح': 'الأحد', 'ن': 'الاثنين', 'ث': 'الثلاثاء', 'ر': 'الأربعاء', 'خ': 'الخميس', 'ج': 'الجمعة', 'س': 'السبت'
};

export const DAY_MAP_EN: Record<string, string> = {
  'الأحد': 'Sun', 'الاثنين': 'Mon', 'الإثنين': 'Mon', 'الثلاثاء': 'Tue',
  'الأربعاء': 'Wed', 'الاربعاء': 'Wed', 'الخميس': 'Thu', 'الجمعة': 'Fri', 'السبت': 'Sat',
  Sun: 'Sun', Mon: 'Mon', Tue: 'Tue', Wed: 'Wed', Thu: 'Thu', Fri: 'Fri', Sat: 'Sat',
  Sunday: 'Sun', Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat',
  U: 'Sun', M: 'Mon', T: 'Tue', W: 'Wed', R: 'Thu', F: 'Fri', S: 'Sat',
  'ح': 'Sun', 'ن': 'Mon', 'ث': 'Tue', 'ر': 'Wed', 'خ': 'Thu', 'ج': 'Fri', 'س': 'Sat'
};

export interface CoursePalette {
  bg: string;
  border: string;
  accent: string;
  badge: string;
  dot: string;
  gradient: string;
  boxBorder: string;
  boxBg: string;
}

export const COURSE_CARD_PALETTES: CoursePalette[] = [
  {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    border: 'border-amber-500/30 dark:border-amber-500/40 hover:border-amber-500/60',
    accent: 'text-amber-700 dark:text-amber-400',
    badge: 'bg-amber-500/20 text-amber-800 dark:text-amber-300',
    dot: 'bg-amber-500',
    gradient: 'from-amber-500/5 to-transparent',
    boxBorder: 'border-amber-500 dark:border-amber-400',
    boxBg: 'bg-amber-500/15 dark:bg-amber-500/25'
  },
  {
    bg: 'bg-sky-500/10 dark:bg-sky-500/15',
    border: 'border-sky-500/30 dark:border-sky-500/40 hover:border-sky-500/60',
    accent: 'text-sky-700 dark:text-sky-400',
    badge: 'bg-sky-500/20 text-sky-800 dark:text-sky-300',
    dot: 'bg-sky-500',
    gradient: 'from-sky-500/5 to-transparent',
    boxBorder: 'border-sky-500 dark:border-sky-400',
    boxBg: 'bg-sky-500/15 dark:bg-sky-500/25'
  },
  {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    border: 'border-emerald-500/30 dark:border-emerald-500/40 hover:border-emerald-500/60',
    accent: 'text-emerald-700 dark:text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-800 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    gradient: 'from-emerald-500/5 to-transparent',
    boxBorder: 'border-emerald-500 dark:border-emerald-400',
    boxBg: 'bg-emerald-500/15 dark:bg-emerald-500/25'
  },
  {
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/15',
    border: 'border-indigo-500/30 dark:border-indigo-500/40 hover:border-indigo-500/60',
    accent: 'text-indigo-700 dark:text-indigo-400',
    badge: 'bg-indigo-500/20 text-indigo-800 dark:text-indigo-300',
    dot: 'bg-indigo-500',
    gradient: 'from-indigo-500/5 to-transparent',
    boxBorder: 'border-indigo-500 dark:border-indigo-400',
    boxBg: 'bg-indigo-500/15 dark:bg-indigo-500/25'
  },
  {
    bg: 'bg-purple-500/10 dark:bg-purple-500/15',
    border: 'border-purple-500/30 dark:border-purple-500/40 hover:border-purple-500/60',
    accent: 'text-purple-700 dark:text-purple-400',
    badge: 'bg-purple-500/20 text-purple-800 dark:text-purple-300',
    dot: 'bg-purple-500',
    gradient: 'from-purple-500/5 to-transparent',
    boxBorder: 'border-purple-500 dark:border-purple-400',
    boxBg: 'bg-purple-500/15 dark:bg-purple-500/25'
  },
  {
    bg: 'bg-rose-500/10 dark:bg-rose-500/15',
    border: 'border-rose-500/30 dark:border-rose-500/40 hover:border-rose-500/60',
    accent: 'text-rose-700 dark:text-rose-400',
    badge: 'bg-rose-500/20 text-rose-800 dark:text-rose-300',
    dot: 'bg-rose-500',
    gradient: 'from-rose-500/5 to-transparent',
    boxBorder: 'border-rose-500 dark:border-rose-400',
    boxBg: 'bg-rose-500/15 dark:bg-rose-500/25'
  }
];

/**
 * Parses any schedule representation (string, array, JSON string) into canonical Arabic day names.
 */
export function parseScheduleDays(sch: any): string[] {
  if (!sch) return [];

  // If raw object with days or daysString
  const rawDays = typeof sch === 'object' && !Array.isArray(sch)
    ? (sch.days ?? sch.daysString ?? sch.day)
    : sch;

  if (!rawDays) return [];

  if (Array.isArray(rawDays)) {
    const results: string[] = [];
    for (const item of rawDays) {
      const parsed = parseScheduleDays(item);
      for (const d of parsed) {
        if (!results.includes(d)) results.push(d);
      }
    }
    return results;
  }

  if (typeof rawDays === 'string') {
    let trimmed = rawDays.trim();
    if (!trimmed) return [];

    // JSON string e.g. '["الثلاثاء"]'
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parseScheduleDays(parsed);
        }
      } catch {}
    }

    // Replace Arabic conjunction 'و' when followed by day prefix 'ال'
    trimmed = trimmed.replace(/\s+و\s*ال/g, '، ال');

    // Split on commas, slashes, pipes, dashes (outside ranges), newlines
    const tokens = trimmed.split(/[,،/|–—\n]+/).map(s => s.trim()).filter(Boolean);
    if (tokens.length > 1) {
      const mapped: string[] = [];
      for (const tok of tokens) {
        const canonical = DAY_MAP_AR[tok] || tok;
        if (!mapped.includes(canonical)) mapped.push(canonical);
      }
      return mapped;
    }

    // Single-letter English abbreviations like "MWF", "UTR", "TR"
    if (/^[UMTRWF]{2,5}$/i.test(trimmed)) {
      return trimmed.toUpperCase().split('').map(ch => DAY_MAP_AR[ch] || ch);
    }

    // Single-letter Arabic abbreviations like "حنث", "نخ"
    if (/^[حنثرخجس]{2,7}$/.test(trimmed)) {
      return trimmed.split('').map(ch => DAY_MAP_AR[ch] || ch);
    }

    const canonical = DAY_MAP_AR[trimmed] || trimmed;
    return [canonical];
  }

  return [];
}

/**
 * Formats schedule days for human-readable display in Arabic.
 * Fallback to 'الأيام غير محددة' if none found.
 */
export function formatScheduleDaysDisplay(sch: any): string {
  if (!sch) return 'الأيام غير محددة';

  const days = parseScheduleDays(sch);
  if (days.length > 0) {
    return days.join('، ');
  }

  // Fallback to explicit raw strings if not parsable to known days
  if (typeof sch === 'object') {
    if (sch.daysString && String(sch.daysString).trim()) return String(sch.daysString).trim();
    if (sch.days && typeof sch.days === 'string' && sch.days.trim()) return sch.days.trim();
  } else if (typeof sch === 'string' && sch.trim()) {
    return sch.trim();
  }

  return 'الأيام غير محددة';
}

/**
 * Parses any time representation (12h with AM/PM/ص/م, or 24h format like 08:25, 13:25)
 * into minutes from midnight (0 to 1439).
 */
export function parseTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toLowerCase();
  const isPm = clean.includes('pm') || clean.includes('م');
  const isAm = clean.includes('am') || clean.includes('ص');
  const digits = clean.replace(/[^\d:]/g, '');
  const [hStr, mStr] = digits.split(':');
  if (!hStr) return null;

  let hours = parseInt(hStr, 10);
  const minutes = mStr ? parseInt(mStr, 10) : 0;
  if (isNaN(hours) || isNaN(minutes)) return null;

  if (isPm && hours < 12) hours += 12;
  if (isAm && hours === 12) hours = 0;

  // Saudi university daytime heuristic:
  // Class times are between 08:00 AM and 07:00 PM.
  // If neither AM nor PM is indicated and hours is 1..6, it is afternoon PM (13..18).
  if (!isPm && !isAm && hours >= 1 && hours <= 6) {
    hours += 12;
  }

  return hours * 60 + minutes;
}

/**
 * Formats minutes from midnight into 12-hour time string.
 * Example: 505 -> '08:25 ص' (or '08:25 am' if isArabic is false)
 */
export function formatMinutesToTime(minutes: number, isArabic = true): string {
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const isPm = h24 >= 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mFormatted = m < 10 ? `0${m}` : `${m}`;
  const hFormatted = h12 < 10 ? `0${h12}` : `${h12}`;

  if (isArabic) {
    const period = isPm ? 'م' : 'ص';
    return `${hFormatted}:${mFormatted} ${period}`;
  }
  const period = isPm ? 'pm' : 'am';
  return `${hFormatted}:${mFormatted} ${period}`;
}

/**
 * Normalizes any time string (e.g. '08:25', '13:25', '8:25 ص') into standard 12-hour format ('08:25 am', '01:25 pm').
 */
export function formatTo12Hour(timeStr?: string | null): string {
  if (!timeStr) return '';
  const totalMinutes = parseTimeToMinutes(timeStr);
  if (totalMinutes === null) return String(timeStr).trim();
  return formatMinutesToTime(totalMinutes, false);
}

/**
 * Parses timeRange (e.g. '08:25 - 09:15', '13:25 – 14:15') and returns normalized times and minute offsets.
 */
export function parseTimeRange(
  timeRange?: string | null,
  fallbackStart = '08:00 am',
  fallbackEnd = '09:50 am'
): {
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
} {
  const parts = timeRange ? String(timeRange).split(/[-–—]/).map(s => s.trim()).filter(Boolean) : [];
  const rawStart = parts[0] || fallbackStart;
  const rawEnd = parts[1] || fallbackEnd;

  let startMin = parseTimeToMinutes(rawStart) ?? 8 * 60;
  let endMin = parseTimeToMinutes(rawEnd) ?? (startMin + 50);

  if (endMin <= startMin) {
    endMin = startMin + 50;
  }

  return {
    startTime: formatMinutesToTime(startMin, false),
    endTime: formatMinutesToTime(endMin, false),
    startMinutes: startMin,
    endMinutes: endMin,
  };
}
