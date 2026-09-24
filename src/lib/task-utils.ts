/**
 * Unified Task Types, Categories, Priorities, and Calendar Sync Utilities
 */

export type TaskPriority = 'low' | 'medium' | 'high';

export interface StudentTask {
  id: string;
  title: string;
  completed: boolean;
  priority?: TaskPriority;
  category?: string;
  categoryLabel?: string;
  courseCode?: string;
  courseName?: string;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm (24h or 12h)
  color?: string; // Hex color
  createdAt?: string;
}

export const TASK_PRIORITIES: { key: TaskPriority; label: string; badge: string; color: string; border: string; bg: string }[] = [
  { key: 'low', label: 'منخفضة', badge: '! منخفضة', color: 'text-slate-500 dark:text-slate-400', border: 'border-slate-500/40', bg: 'bg-slate-500/10' },
  { key: 'medium', label: 'متوسطة', badge: '!! متوسطة', color: 'text-amber-500 dark:text-amber-400', border: 'border-amber-500/50', bg: 'bg-amber-500/10' },
  { key: 'high', label: 'عالية', badge: '!!! عالية', color: 'text-rose-500 dark:text-rose-400', border: 'border-rose-500/50', bg: 'bg-rose-500/10' },
];

export const TASK_CATEGORIES = [
  { key: 'Quiz', label: 'كويز', en: 'Quiz' },
  { key: 'Midterm Exam', label: 'اختبار فصلي', en: 'Midterm Exam' },
  { key: 'Final Exam', label: 'اختبار نهائي', en: 'Final Exam' },
  { key: 'Homework', label: 'واجب', en: 'Homework' },
  { key: 'Project', label: 'مشروع', en: 'Project' },
  { key: 'Presentation', label: 'عرض تقديمي', en: 'Presentation' },
  { key: 'Report', label: 'تقرير', en: 'Report' },
  { key: 'Research', label: 'بحث', en: 'Research' },
  { key: 'Essay', label: 'مقال', en: 'Essay' },
  { key: 'Case Study', label: 'دراسة حالة', en: 'Case Study' },
  { key: 'Event', label: 'موعد شخصي', en: 'Personal Event' },
];

export const COURSE_HEX_COLORS = [
  '#f59e0b', // amber
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#f43f5e', // rose
  '#14b8a6', // teal
  '#ec4899', // pink
  '#f97316', // orange
  '#8c6239', // imamu brown
];

export function getCourseColor(
  courseCodeOrIdx?: string | number,
  courses?: { courseCode?: string; courseName?: string; courseTitle?: string; crn?: string; color?: string }[]
): string {
  if (courseCodeOrIdx === undefined || courseCodeOrIdx === null || courseCodeOrIdx === '') {
    return '#8c6239'; // Default app theme brown
  }
  if (typeof courseCodeOrIdx === 'number') {
    return COURSE_HEX_COLORS[Math.abs(courseCodeOrIdx) % COURSE_HEX_COLORS.length];
  }
  if (courses && courses.length > 0) {
    const cleanKey = String(courseCodeOrIdx).trim().toLowerCase();
    const idx = courses.findIndex(c => {
      const code = c.courseCode?.trim().toLowerCase();
      const name = (c.courseName || c.courseTitle)?.trim().toLowerCase();
      return code === cleanKey || name === cleanKey || (code && cleanKey.includes(code)) || (name && cleanKey.includes(name));
    });
    if (idx >= 0) {
      if (courses[idx].color) return courses[idx].color!;
      return COURSE_HEX_COLORS[idx % COURSE_HEX_COLORS.length];
    }
  }
  let hash = 0;
  const str = String(courseCodeOrIdx);
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return COURSE_HEX_COLORS[Math.abs(hash) % COURSE_HEX_COLORS.length];
}

export const TASK_COLORS = COURSE_HEX_COLORS;

const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

/**
 * Format relative countdown badge (e.g. "متأخر", "اليوم", "غداً", "خلال 3 أيام")
 */
export function formatTaskCountdown(dueDate?: string, dueTime?: string): { text: string; isOverdue: boolean; isToday: boolean } | null {
  if (!dueDate) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const parts = dueDate.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return null;

  const target = new Date(parts[0], parts[1] - 1, parts[2]);
  target.setHours(0, 0, 0, 0);

  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays < 0) {
    return { text: 'متأخر', isOverdue: true, isToday: false };
  } else if (diffDays === 0) {
    return { text: 'اليوم', isOverdue: false, isToday: true };
  } else if (diffDays === 1) {
    return { text: 'غداً', isOverdue: false, isToday: false };
  } else if (diffDays === 2) {
    return { text: 'بعد غد', isOverdue: false, isToday: false };
  } else if (diffDays <= 10) {
    return { text: `خلال ${diffDays} أيام`, isOverdue: false, isToday: false };
  } else {
    return { text: `خلال ${diffDays} يوم`, isOverdue: false, isToday: false };
  }
}

/**
 * Formats due date & time pill label in Arabic (e.g. "24 سبتمبر، 12:30 م")
 */
export function formatTaskDuePill(dueDate?: string, dueTime?: string): string | null {
  if (!dueDate) return null;
  const parts = dueDate.split('-').map(Number);
  if (parts.length < 3) return dueDate;

  const day = parts[2];
  const monthIdx = parts[1] - 1;
  const monthStr = MONTH_NAMES_AR[monthIdx] || `${parts[1]}`;

  let timeFormatted = '';
  if (dueTime) {
    const timeParts = dueTime.split(':').map(Number);
    if (timeParts.length >= 2 && !isNaN(timeParts[0]) && !isNaN(timeParts[1])) {
      const h24 = timeParts[0];
      const m = timeParts[1].toString().padStart(2, '0');
      const isPM = h24 >= 12;
      const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
      timeFormatted = `، ${h12}:${m} ${isPM ? 'م' : 'ص'}`;
    } else {
      timeFormatted = `، ${dueTime}`;
    }
  }

  return `${day} ${monthStr}${timeFormatted}`;
}

function notifyTaskChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('imamu_tasks_updated'));
  window.dispatchEvent(new Event('storage'));
}

export function syncTaskToCalendar() {
  notifyTaskChange();
}

/**
 * Remove task from calendar events
 */
export function removeTaskFromCalendar() {
  notifyTaskChange();
}
