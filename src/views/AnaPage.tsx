'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';
import {
  User2, Plus, ChevronDown, Calendar, Clock, MapPin, Mail,
  BookOpen, GraduationCap, Sparkles, X, Check, ChevronRight,
  ChevronLeft, Search, Loader2, AlertCircle, CalendarPlus,
  Trash2, TrendingUp, Tv, Settings, Folder, FolderOpen, FolderPlus,
  Pencil, Edit3, MoreVertical, CalendarClock, CheckSquare, Link2
} from 'lucide-react';
import { SpotlightCard, AnimatedNumber, Button } from '../components/ui';
import { motion, AnimatePresence } from 'motion/react';
import {
  parseDate, formatDate, getCountdown, calculateMokafaaDate, calculateProgressMetrics
} from '../lib/date-utils';
import { useSWR } from '../lib/swr';
import clsx from 'clsx';
import { TimingEditor, ScheduleItem } from '../components/TimingEditor';
import { AddCourseModal } from '../components/AddCourseModal';
import { SpeedDialPlusMenu } from '../components/SpeedDialPlusMenu';
import { WeeklySchedule } from '../components/WeeklySchedule';
import { AcademicProgressTab } from '../components/AcademicProgressTab';
import { parseScheduleDays, parseTimeRange, COURSE_CARD_PALETTES, extractFinalExamInfo, normalizeExamDate, normalizeExamTime, parseTimeToMinutes, DAY_MAP_AR, formatMinutesToTime } from '../lib/schedule-utils';
import { NewTaskModal } from '../components/NewTaskModal';
import {
  StudentTask,
  TASK_CATEGORIES,
  formatTaskCountdown,
  formatTaskDuePill,
  syncTaskToCalendar,
  removeTaskFromCalendar,
  getCourseColor,
  COURSE_HEX_COLORS
} from '../lib/task-utils';
import { matchArabicSearch } from '../lib/search-utils';
import { EmojiPickerPopover } from '../components/EmojiPickerPopover';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface CourseEntry {
  subjectId?: number;
  courseCode: string;
  courseName: string;
  crn: string;
  creditHours?: number;
  sectionNumber?: string;
  examDate?: string;
  examTime?: string;
  customSchedule?: ScheduleItem[];
  whatsappLink?: string;
  primaryInstructor?: string;
  instructors?: { name: string; email?: string; isPrimary?: boolean }[];
  color?: string;
}

interface MySemester {
  id: string;
  label: string;
  emoji?: string;
  academicYear: string;
  semester: string;
  term: string;
  courses: CourseEntry[];
  createdAt: string;
}

interface SectionData {
  id: number;
  crn: string;
  courseCode: string;
  courseTitle: string;
  sectionNumber?: string;
  whatsappLink?: string;
  primaryInstructor?: string;
  instructors: { name: string; email?: string; isPrimary?: boolean }[];
  schedules: {
    type?: string;
    days?: string[] | string;
    daysString?: string;
    startTime?: string;
    endTime?: string;
    timeRange?: string;
    building?: string;
    room?: string;
    campus?: string;
    startDate?: string;
    endDate?: string;
  }[];
  scheduleSummary?: string;
  campus?: string;
  creditHours?: number;
  academicYear?: string;
  semester?: string;
  term?: string;
  color?: string;
}

// ─────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────
const STORAGE_KEY = 'imamu_my_semesters';
const ACTIVE_SEM_KEY = 'imamu_active_semester_id';

export function normalizeCourseCode(code?: string): string {
  if (!code) return '';
  return code.replace(/[\s\-_]+/g, '').toLowerCase();
}

export function normalizeCourseName(name?: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function getBaseCourseName(name?: string): string {
  if (!name) return '';
  const norm = normalizeCourseName(name);
  return norm.replace(/[\s(]+[1-9١-٩][)]?$/, '').trim();
}

export function isSameCourseEntry(c1: CourseEntry, c2: CourseEntry, originalCode?: string): boolean {
  if (!c1 || !c2) return false;

  if (originalCode) {
    const normOrig = normalizeCourseCode(originalCode);
    if (c1.courseCode === originalCode || normalizeCourseCode(c1.courseCode) === normOrig) {
      return true;
    }
  }

  const crn1 = String(c1.crn || '').trim();
  const crn2 = String(c2.crn || '').trim();
  if (crn1 && crn2 && crn1 === crn2) {
    return true;
  }

  const code1 = normalizeCourseCode(c1.courseCode);
  const code2 = normalizeCourseCode(c2.courseCode);
  if (code1 && code2 && code1 === code2) {
    return true;
  }

  const name1 = normalizeCourseName(c1.courseName);
  const name2 = normalizeCourseName(c2.courseName);
  if (name1 && name2 && name1 === name2) {
    return true;
  }

  const base1 = getBaseCourseName(c1.courseName);
  const base2 = getBaseCourseName(c2.courseName);
  if (base1 && base2 && base1 === base2 && base1.length >= 4) {
    const prefix1 = code1.replace(/\d+/g, '');
    const prefix2 = code2.replace(/\d+/g, '');
    if (!prefix1 || !prefix2 || prefix1 === prefix2) {
      return true;
    }
  }

  return false;
}

export function mergeCourseEntries(older: CourseEntry, newer: CourseEntry): CourseEntry {
  const courseName = newer.courseName || older.courseName;
  const courseCode = newer.courseCode || older.courseCode;
  const crn = (newer.crn && String(newer.crn).trim()) || (older.crn && String(older.crn).trim()) || '';
  const creditHours = newer.creditHours || older.creditHours || 3;
  const sectionNumber = newer.sectionNumber || older.sectionNumber;
  const examDate = newer.examDate || older.examDate;
  const examTime = newer.examTime || older.examTime;
  const customSchedule = (newer.customSchedule && newer.customSchedule.length > 0)
    ? newer.customSchedule
    : older.customSchedule;
  const whatsappLink = newer.whatsappLink || older.whatsappLink;
  const color = newer.color || older.color;
  const primaryInstructor = newer.primaryInstructor || older.primaryInstructor;
  const instructors = (newer.instructors && newer.instructors.length > 0)
    ? newer.instructors
    : older.instructors;

  return {
    ...older,
    ...newer,
    courseCode,
    courseName,
    crn,
    creditHours,
    sectionNumber,
    examDate,
    examTime,
    customSchedule,
    whatsappLink,
    color,
    primaryInstructor,
    instructors
  };
}

export function dedupeSemesterCourses(courses: CourseEntry[]): CourseEntry[] {
  if (!Array.isArray(courses) || courses.length <= 1) return courses || [];
  const deduped: CourseEntry[] = [];

  for (const c of courses) {
    const existingIdx = deduped.findIndex(item => isSameCourseEntry(item, c));
    if (existingIdx >= 0) {
      deduped[existingIdx] = mergeCourseEntries(deduped[existingIdx], c);
    } else {
      deduped.push({ ...c });
    }
  }

  return deduped;
}

function loadSemesters(): MySemester[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list: MySemester[] = JSON.parse(raw);
    let hasChanges = false;
    const cleaned = list.map(sem => {
      const origCount = sem.courses?.length || 0;
      const deduped = dedupeSemesterCourses(sem.courses || []);
      if (deduped.length !== origCount) hasChanges = true;
      return { ...sem, courses: deduped };
    });
    if (hasChanges) {
      saveSemesters(cleaned);
    }
    return cleaned;
  } catch { return []; }
}

function saveSemesters(list: MySemester[]) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

function loadActiveSemId(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem(ACTIVE_SEM_KEY); } catch { return null; }
}

function saveActiveSemId(id: string | null) {
  if (typeof window === 'undefined') return;
  try { if (id) localStorage.setItem(ACTIVE_SEM_KEY, id); else localStorage.removeItem(ACTIVE_SEM_KEY); } catch {}
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function syncExamToStudentTasks(course: CourseEntry, allCourses?: CourseEntry[], effectiveSections?: SectionData[]) {
  if (!course.examDate) return;
  try {
    const taskId = `exam-${course.courseCode}`;
    const dismissed: string[] = JSON.parse(localStorage.getItem('imamu_dismissed_exam_tasks') || '[]');
    if (dismissed.includes(taskId)) return;

    const raw = localStorage.getItem('imamu_student_tasks');
    const curTasks: StudentTask[] = raw ? JSON.parse(raw) : [];
    const existingIndex = curTasks.findIndex(t => t.id === taskId);

    let taskColor = '#8c6239';
    if (effectiveSections && effectiveSections.length > 0) {
      const secIdx = effectiveSections.findIndex(s => {
        const sCode = s.courseCode?.trim().toLowerCase();
        const sTitle = s.courseTitle?.trim().toLowerCase();
        const cCode = course.courseCode?.trim().toLowerCase();
        const cTitle = course.courseName?.trim().toLowerCase();
        if (course.crn && s.crn && String(s.crn) === String(course.crn)) return true;
        if (cCode && sCode && (sCode === cCode || sCode.includes(cCode) || cCode.includes(sCode))) return true;
        if (cTitle && sTitle && (sTitle === cTitle || sTitle.includes(cTitle) || cTitle.includes(sTitle))) return true;
        return false;
      });
      if (secIdx >= 0) {
        taskColor = COURSE_HEX_COLORS[secIdx % COURSE_HEX_COLORS.length];
      }
    }
    if (taskColor === '#8c6239') {
      taskColor = getCourseColor(course.courseCode, allCourses);
    }
    const taskData: StudentTask = {
      id: taskId,
      title: 'اختبار نهائي',
      completed: existingIndex >= 0 ? curTasks[existingIndex].completed : false,
      priority: 'high',
      category: 'Final Exam',
      categoryLabel: 'اختبار نهائي',
      courseCode: course.courseCode,
      courseName: course.courseName,
      dueDate: course.examDate,
      dueTime: course.examTime,
      color: taskColor,
      createdAt: existingIndex >= 0 ? curTasks[existingIndex].createdAt : new Date().toISOString(),
    };

    let updatedTasks: StudentTask[];
    if (existingIndex >= 0) {
      updatedTasks = [...curTasks];
      updatedTasks[existingIndex] = {
        ...updatedTasks[existingIndex],
        ...taskData,
        title: 'اختبار نهائي',
        completed: curTasks[existingIndex].completed,
      };
    } else {
      updatedTasks = [taskData, ...curTasks];
    }
    localStorage.setItem('imamu_student_tasks', JSON.stringify(updatedTasks));
    syncTaskToCalendar();
    window.dispatchEvent(new Event('imamu_tasks_updated'));
  } catch {}
}

// ─────────────────────────────────────────────
// Countdown — live, stable (no layout shift)
// ─────────────────────────────────────────────
function useCurrentTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const CountdownBox = memo(function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-slate-100/90 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl py-2.5 px-1.5 flex-1 min-w-[44px] shadow-xs">
      <span className="text-lg font-serif font-extrabold text-slate-900 dark:text-white tabular-nums w-9 text-center">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold mt-0.5">{label}</span>
    </div>
  );
});

function LiveCountdown({ targetDate }: { targetDate: Date | null }) {
  const now = useCurrentTime();
  const t = getCountdown(targetDate, now);
  if (!targetDate || t.isPast) return (
    <p className="text-xs text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
      <AlertCircle className="w-3.5 h-3.5" />
      لا توجد بيانات
    </p>
  );
  return (
    <div className="flex w-full gap-1" dir="rtl">
      <CountdownBox value={t.days} label="أيام" />
      <CountdownBox value={t.hours} label="ساعة" />
      <CountdownBox value={t.minutes} label="دقيقة" />
      <CountdownBox value={t.seconds} label="ثانية" />
    </div>
  );
}

// ─────────────────────────────────────────────
// Days map & parser helper
// ─────────────────────────────────────────────


const WEEK_DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

const COURSE_COLORS = [
  'bg-[var(--color-imamu-brown)]/15 text-[var(--color-imamu-accent)] border-[var(--color-imamu-brown)]/30',
  'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-400/30',
  'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/30',
  'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-400/30',
  'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-400/30',
  'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-400/30',
];


// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// Segmented progress bar (matching screenshot)
// ─────────────────────────────────────────────
function SegmentedBar({
  percent,
  total = 21,
  filledColor = 'bg-[var(--color-imamu-accent)]',
}: {
  percent: number;
  total?: number;
  filledColor?: string;
}) {
  const filled = Math.round((percent / 100) * total);
  return (
    <div className="flex gap-[5px] items-center w-full">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`flex-1 h-3 sm:h-4 rounded-[1.3px] transition-colors duration-300 ${
            i < filled
              ? `${filledColor} shadow-xs`
              : 'bg-slate-200 dark:bg-zinc-800'
          }`}
        />
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Reusable Progress Metric Card (like the Term card)
// ─────────────────────────────────────────────
function ProgressMetricCard({
  icon,
  title,
  passedDays,
  totalDays,
  remainingDays,
  percent,
  startDate,
  endDate,
  remainingColor = 'text-[var(--color-imamu-accent)]',
  barColor = 'bg-[var(--color-imamu-accent)]',
}: {
  icon: string;
  title: string;
  passedDays: number;
  totalDays: number;
  remainingDays: number;
  percent: number;
  startDate: Date | null;
  endDate: Date | null;
  remainingColor?: string;
  barColor?: string;
}) {
  const fmtDate = (d: Date | null) => d
    ? `${d.getDate()}-${d.getMonth() + 1}-${d.getFullYear()}`
    : '—';

  const formatRemainingDaysText = (days: number) => {
    if (days <= 0) return 'اليوم';
    if (days === 1) return 'يوم واحد متبقٍ';
    if (days === 2) return 'يومان متبقيان';
    if (days <= 10) return `${days} أيام متبقية`;
    return `${days} يوم متبقٍ`;
  };

  return (
    <div className="flex flex-col gap-2.5 py-3 transition-colors">
      {/* Top row */}
      <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm shrink-0">{icon}</span>
          <span className="truncate">{title}</span>
        </div>
        <span className={`shrink-0 font-bold ${remainingColor}`}>
          {formatRemainingDaysText(remainingDays)}
        </span>
      </div>

      {/* Segmented bar + percent */}
      <div className="flex items-center gap-2.5">
        <div className="flex-1 min-w-0">
          <SegmentedBar percent={percent} filledColor={barColor} />
        </div>
        <span className="text-xs font-extrabold text-slate-900 dark:text-white w-9 text-left tabular-nums shrink-0">
          {percent}%
        </span>
      </div>

      {/* Date labels */}
      <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 dark:text-zinc-500">
        <span>{fmtDate(startDate)}</span>
        <span>{fmtDate(endDate)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Edit Semester & Courses Modal
// ─────────────────────────────────────────────
function EditSemesterModal({
  semester,
  allSubjects = [],
  onClose,
  onSave,
  onDelete,
}: {
  semester: MySemester;
  allSubjects: any[];
  onClose: () => void;
  onSave: (newLabel: string, newCourses: CourseEntry[], newEmoji?: string) => void;
  onDelete?: () => void;
}) {
  const [label, setLabel] = useState(semester.label || '');
  const [emoji, setEmoji] = useState(semester.emoji || '🎓');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [courses, setCourses] = useState<CourseEntry[]>(semester.courses || []);
  const [isEditingCourses, setIsEditingCourses] = useState(false);
  const [crnInput, setCrnInput] = useState('');
  const [isFetchingCrn, setIsFetchingCrn] = useState(false);
  const [crnFeedback, setCrnFeedback] = useState<{ type: 'success' | 'warn'; msg: string } | null>(null);

  const [searchSubject, setSearchSubject] = useState('');
  const [showSubjectPicker, setShowSubjectPicker] = useState(false);

  // Check if user changed anything
  const hasChanges = useMemo(() => {
    if (label.trim() !== (semester.label || '').trim()) return true;
    if (emoji !== (semester.emoji || '🎓')) return true;
    const initialList = semester.courses || [];
    if (courses.length !== initialList.length) return true;
    const initCodes = initialList.map(c => `${c.courseCode}_${c.crn || ''}`).sort().join('||');
    const curCodes = courses.map(c => `${c.courseCode}_${c.crn || ''}`).sort().join('||');
    return initCodes !== curCodes;
  }, [label, emoji, courses, semester]);

  const handleFetchCrn = async () => {
    const raw = crnInput.trim();
    if (!raw) return;
    setIsFetchingCrn(true);
    setCrnFeedback(null);
    try {
      const crns = raw.split(/[,،\s]+/).map(s => s.trim()).filter(Boolean);
      if (crns.length === 0) return;

      const params = new URLSearchParams({ crns: crns.join(',') });
      if (semester.term) params.set('term', semester.term);
      if (semester.academicYear) params.set('academicYear', semester.academicYear);
      if (semester.semester) params.set('semester', semester.semester);

      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '') : '';
      const res = await fetch(`/api/sections/by-crn?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json().catch(() => ({}));
      const foundSections: any[] = Array.isArray(data?.sections) ? data.sections : [];

      if (foundSections.length === 0) {
        setCrnFeedback({
          type: 'warn',
          msg: `لم يتم العثور على شعب تطابق (${crns.join(', ')}). يمكنك اختيار المادة يدوياً بالأسفل.`
        });
      } else {
        setCourses(prev => {
          const next = [...prev];
          for (const sec of foundSections) {
            const courseCode = (sec.courseCode || '').trim();
            const crn = String(sec.crn || '').trim();
            const exists = next.some(c => c.courseCode === courseCode || (crn && c.crn === crn));
            if (!exists) {
              const { examDate, examTime } = extractFinalExamInfo(sec);
              next.push({
                subjectId: sec.subjectId,
                courseCode: courseCode,
                courseName: sec.courseTitle || courseCode,
                crn: crn,
                creditHours: sec.creditHours || 3,
                examDate,
                examTime,
              });
            }
          }
          return next;
        });

        const missing = crns.filter(c => !foundSections.some(s => String(s.crn) === c));
        let msg = `تم جلب وإضافة ${foundSections.length} مادة بنجاح!`;
        if (missing.length > 0) {
          msg += ` (لم يتم العثور على: ${missing.join(', ')})`;
        }
        setCrnFeedback({ type: 'success', msg });
        setCrnInput('');
      }
    } catch {
      setCrnFeedback({ type: 'warn', msg: 'حدث خطأ أثناء جلب الشعب، يرجى المحاولة ثانية.' });
    } finally {
      setIsFetchingCrn(false);
    }
  };

  const removeCourse = (courseCode: string) => {
    setCourses(prev => prev.filter(c => c.courseCode !== courseCode));
  };

  const addSubjectFromCatalog = (s: any) => {
    if (!courses.some(c => c.courseCode === s.code)) {
      setCourses(prev => [
        ...prev,
        {
          subjectId: s.id,
          courseCode: s.code,
          courseName: s.name,
          crn: '',
          creditHours: s.creditHours || 3,
        }
      ]);
      setSearchSubject('');
      setShowSubjectPicker(false);
    }
  };

  const filteredCatalog = allSubjects
    .filter(s => matchArabicSearch([s.code, s.name], searchSubject.trim()))
    .slice(0, 8);

  const totalHours = courses.reduce((sum, c) => sum + (c.creditHours || 0), 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" dir="rtl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="relative w-full sm:max-w-lg bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-imamu-brown)]/10 text-[var(--color-imamu-accent)] flex items-center justify-center">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">إدارة وتعديل الفصل الدراسي</h3>
              <p className="text-[11px] text-slate-400">تعديل الاسم وإضافة أو حذف المواد</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pinned: Semester Name & Emoji Picker */}
        <div className="pt-3 pb-3 border-b border-slate-100 dark:border-zinc-800/80 shrink-0">
          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">اسم الفصل</label>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(prev => !prev)}
                className="w-12 h-10 rounded-xl bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-xl hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition cursor-pointer shrink-0 shadow-2xs"
                title="تغيير إيموجي الفصل"
              >
                <span>{emoji || '🎓'}</span>
              </button>
                <EmojiPickerPopover
                  isOpen={showEmojiPicker}
                  onClose={() => setShowEmojiPicker(false)}
                  selectedEmoji={emoji}
                  onSelectEmoji={setEmoji}
                  title="أيقونة الفصل الدراسي"
                />
              </div>

            <input
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="مثال: المستوى الثاني"
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/80 text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-[var(--color-imamu-accent)]/30 focus:border-[var(--color-imamu-accent)] transition"
            />
          </div>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3.5 min-h-0 pr-1 pl-1">
          {/* Card: Enrolled Courses */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800/80 transition shadow-xs space-y-3">
            {/* Card Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-[var(--color-imamu-accent)]/10 text-[var(--color-imamu-accent)] flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-zinc-100">
                    المواد المسجلة في هذا الفصل
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-white dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/80 shadow-2xs">
                    {courses.length} مواد · {totalHours} ساعة
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant={isEditingCourses ? "primary" : "secondary"}
                size="xs"
                onClick={() => setIsEditingCourses(prev => !prev)}
                leftIcon={isEditingCourses ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Edit3 className="w-3.5 h-3.5" />}
              >
                {isEditingCourses ? 'إنهاء التعديل' : 'تعديل المواد'}
              </Button>
            </div>

            {/* List of Courses */}
            {courses.length === 0 ? (
              <div className="text-center py-6 px-4 bg-white dark:bg-zinc-900/60 rounded-xl border border-dashed border-slate-200 dark:border-zinc-800">
                <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center mx-auto mb-2 text-slate-400 dark:text-zinc-500">
                  <BookOpen className="w-4 h-4" />
                </div>
                <p className="text-xs font-medium text-slate-400 dark:text-zinc-500">لا توجد مواد مسجلة بعد في هذا الفصل.</p>
                {!isEditingCourses && (
                  <button
                    type="button"
                    onClick={() => setIsEditingCourses(true)}
                    className="text-[11px] font-bold text-[var(--color-imamu-accent)] mt-2 hover:underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <span>انقر هنا لإضافة مواد بالـ CRN أو من الدليل</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1 pl-0.5 custom-scrollbar">
                {courses.map((c, idx) => (
                  <div
                    key={c.courseCode || idx}
                    className="group p-2.5 sm:p-3 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 transition shadow-2xs flex flex-col gap-2"
                  >
                    {/* Top Row: Course Code badge + Name + Delete button */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-[var(--color-imamu-accent)]/10 text-[var(--color-imamu-accent)] border border-[var(--color-imamu-accent)]/20 shrink-0">
                          {c.courseCode}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-100 truncate" title={c.courseName}>
                          {c.courseName}
                        </span>
                      </div>

                      {isEditingCourses && (
                        <button
                          type="button"
                          onClick={() => removeCourse(c.courseCode)}
                          className="p-1 -my-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer shrink-0"
                          title={`حذف مادة ${c.courseName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Bottom Row: Metadata chips */}
                    <div className="flex items-center flex-wrap gap-1.5 text-[10.5px]">
                      {c.sectionNumber && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-medium">
                          <span className="text-slate-400 dark:text-zinc-500 text-[10px]">شعبة</span>
                          <span className="font-bold text-slate-800 dark:text-zinc-200">{c.sectionNumber}</span>
                        </span>
                      )}
                      {c.creditHours && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-medium">
                          <span className="font-bold text-slate-800 dark:text-zinc-200">{c.creditHours}</span>
                          <span className="text-slate-400 dark:text-zinc-500 text-[10px]">ساعات</span>
                        </span>
                      )}
                      {c.crn && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-mono text-[10px]">
                          <span className="text-slate-400 dark:text-zinc-500 font-sans font-medium text-[10px]">CRN</span>
                          <span className="font-bold text-slate-700 dark:text-zinc-200">{c.crn}</span>
                        </span>
                      )}
                      {c.primaryInstructor && c.primaryInstructor !== 'غير محدد' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-medium truncate max-w-[150px]">
                          <span className="text-slate-400 dark:text-zinc-500 text-[10px]">أستاذ:</span>
                          <span className="truncate">{c.primaryInstructor}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Under it: CRN Adder & Subject Picker (only when editing) */}
          {isEditingCourses && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                  <span>الرقم المرجعي للشعبة (CRN)</span>
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setShowSubjectPicker(!showSubjectPicker)}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  className="text-[var(--color-imamu-accent)]"
                >
                  إضافة من دليل المواد
                </Button>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={crnInput}
                    onChange={e => {
                      setCrnInput(e.target.value);
                      if (crnFeedback) setCrnFeedback(null);
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleFetchCrn();
                      }
                    }}
                    placeholder="أدخل الـ CRN (مثال: 10245)"
                    className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-[var(--color-imamu-accent)] focus:ring-1 focus:ring-[var(--color-imamu-accent)] shadow-xs transition text-center sm:text-right"
                  />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  disabled={isFetchingCrn || !crnInput.trim()}
                  isLoading={isFetchingCrn}
                  onClick={handleFetchCrn}
                  leftIcon={<Search className="w-4 h-4" />}
                  className="shrink-0"
                >
                  {isFetchingCrn ? 'جلب...' : 'جلب البيانات'}
                </Button>
              </div>

              {crnFeedback && (
                <div className={clsx(
                  "p-3 rounded-xl border text-xs flex items-center gap-2",
                  crnFeedback.type === 'success'
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                )}>
                  {crnFeedback.type === 'success' ? (
                    <Check className="w-4 h-4 shrink-0 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                  )}
                  <span>{crnFeedback.msg}</span>
                </div>
              )}

              {/* Subject Picker Dropdown */}
              {showSubjectPicker && (
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-2xl p-3 animate-in fade-in duration-150">
                  <div className="relative mb-2">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchSubject}
                      onChange={e => setSearchSubject(e.target.value)}
                      placeholder="ابحث باسم المادة أو رمزها..."
                      className="w-full pr-8 pl-3 py-1.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none"
                      autoFocus
                    />
                  </div>
                  {filteredCatalog.length > 0 ? (
                    <div className="flex flex-col gap-1 max-h-36 overflow-y-auto">
                      {filteredCatalog.map(s => (
                        <div
                          key={s.id}
                          onClick={() => addSubjectFromCatalog(s)}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700/60 transition cursor-pointer border border-slate-100 dark:border-zinc-800"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-[11px] font-bold text-[var(--color-imamu-accent)]">{s.code}</span>
                            <span className="text-xs text-slate-700 dark:text-zinc-200 truncate">{s.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0">{s.creditHours || 3} س</span>
                        </div>
                      ))}
                    </div>
                  ) : searchSubject.trim() ? (
                    <p className="text-center text-[11px] text-slate-400 py-2">لا توجد مواد مطابقة للبحث</p>
                  ) : null}
                </div>
              )}
            </div>
          )}

          {/* Under it: Delete Term Button (not in the save changes bar) */}
          {onDelete && (
            <div className="pt-2">
              <Button
                type="button"
                variant="destructive"
                size="md"
                onClick={() => {
                  if (confirm(`هل أنت متأكد من حذف فصل "${semester.label || 'هذا الفصل'}"؟`)) {
                    onDelete();
                  }
                }}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                className="w-full"
              >
                حذف هذا الفصل الدراسي
              </Button>
            </div>
          )}
        </div>

        {/* Footer actions: "Close" when untouched, "Save / Cancel" when modified */}
        <div className="flex gap-2 pt-3.5 border-t border-slate-100 dark:border-zinc-800 shrink-0">
          {hasChanges ? (
            <>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  onSave(label.trim() || semester.label, courses, emoji);
                }}
                leftIcon={<Check className="w-4 h-4" />}
                className="flex-1"
              >
                حفظ التغييرات
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onClose}
              >
                إلغاء
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onClose}
              className="w-full"
            >
              إغلاق
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Sidebar — combined semester info + insights
// ─────────────────────────────────────────────
function SidebarInsights({
  events,
  activeSemester,
  dbUser,
  effectiveSections = [],
  onOpenCourseDetails,
  onOpenNewTaskModal,
  onEditTask,
  onRename,
  onUpdateSemester,
  onDeleteSemester,
  onOpenNewSemesterModal,
  subjects = [],
}: {
  events: any[];
  activeSemester: MySemester | null;
  dbUser: any;
  effectiveSections?: SectionData[];
  onOpenCourseDetails?: (course: CourseEntry) => void;
  onOpenNewTaskModal?: () => void;
  onEditTask?: (task: StudentTask) => void;
  onRename?: (newLabel: string) => void;
  onUpdateSemester?: (newLabel: string, newCourses: CourseEntry[], newEmoji?: string) => void;
  onDeleteSemester?: (id: string) => void;
  onOpenNewSemesterModal?: () => void;
  subjects?: any[];
}) {
  const now = useCurrentTime();
  const { data: settingsData } = useSWR<{ semesterStartDate?: string; semesterEndDate?: string }>('/api/settings');
  const [semesterStart, setSemesterStart] = useState<Date | null>(null);
  const [semesterEnd, setSemesterEnd] = useState<Date | null>(null);
  const [nextMokafaa, setNextMokafaa] = useState<Date | null>(null);
  const [nextHoliday, setNextHoliday] = useState<{ title: string; date: Date } | null>(null);
  const [activeHoliday, setActiveHoliday] = useState<{ title: string; date: Date } | null>(null);
  const [vacationEnd, setVacationEnd] = useState<Date | null>(null);
  const [upcomingEvent, setUpcomingEvent] = useState<{ title: string; date: Date } | null>(null);
  const [progressView, setProgressView] = useState<'upcoming' | 'courses' | 'tasks'>('upcoming');

  // Edit Semester & Courses modal state
  const [showEditModal, setShowEditModal] = useState(false);

  // Tasks state with localStorage persistence & category collapse
  const [tasks, setTasks] = useState<StudentTask[]>([]);
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(true);
  const [isLateOpen, setIsLateOpen] = useState(true);
  const [isUndatedOpen, setIsUndatedOpen] = useState(true);
  const [isFinishedOpen, setIsFinishedOpen] = useState(false);
  const [activeTaskMenu, setActiveTaskMenu] = useState<{
    task: StudentTask;
    x: number;
    y: number;
    openUpwards: boolean;
  } | null>(null);

  useEffect(() => {
    const handleCloseMenu = () => setActiveTaskMenu(null);
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('scroll', handleCloseMenu, true);
    window.addEventListener('resize', handleCloseMenu);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('scroll', handleCloseMenu, true);
      window.removeEventListener('resize', handleCloseMenu);
    };
  }, []);

  useEffect(() => {
    const loadTasks = () => {
      try {
        const raw = localStorage.getItem('imamu_student_tasks');
        if (raw) {
          const parsed: StudentTask[] = JSON.parse(raw);
          const cleaned = parsed.map(t => {
            let due = t.dueDate;
            let time = t.dueTime;
            if (due) {
              const str = String(due).trim();
              if (str.toLowerCase().includes('nan')) {
                due = undefined;
              } else {
                const norm = normalizeExamDate(due);
                if (norm && !norm.toLowerCase().includes('nan')) {
                  due = norm;
                } else {
                  due = undefined;
                }
              }
            }
            if (time) {
              const strT = String(time).trim();
              if (strT.toLowerCase().includes('nan')) {
                time = undefined;
              } else {
                time = normalizeExamTime(time) || time;
              }
            }
            return { ...t, dueDate: due, dueTime: time };
          });
          setTasks(cleaned);
          if (JSON.stringify(cleaned) !== raw) {
            try {
              localStorage.setItem('imamu_student_tasks', JSON.stringify(cleaned));
            } catch {}
          }
        }
      } catch {
        // ignore
      }
    };
    loadTasks();
    window.addEventListener('storage', loadTasks);
    window.addEventListener('imamu_tasks_updated', loadTasks);
    return () => {
      window.removeEventListener('storage', loadTasks);
      window.removeEventListener('imamu_tasks_updated', loadTasks);
    };
  }, []);

  const saveTasks = (newTasks: StudentTask[]) => {
    setTasks(newTasks);
    try {
      localStorage.setItem('imamu_student_tasks', JSON.stringify(newTasks));
    } catch {
      // ignore
    }
  };


  const toggleTask = (id: string) => {
    const updated = tasks.map(t => {
      if (t.id === id) {
        const next = { ...t, completed: !t.completed };
        syncTaskToCalendar();
        return next;
      }
      return t;
    });
    saveTasks(updated);
    window.dispatchEvent(new Event('imamu_tasks_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  const deleteTask = (id: string) => {
    removeTaskFromCalendar();
    if (id.startsWith('exam-') || id.startsWith('task-exam-')) {
      try {
        const rawExamId = id.replace(/^task-/, '');
        const dismissed: string[] = JSON.parse(localStorage.getItem('imamu_dismissed_exam_tasks') || '[]');
        let changed = false;
        if (!dismissed.includes(id)) { dismissed.push(id); changed = true; }
        if (!dismissed.includes(rawExamId)) { dismissed.push(rawExamId); changed = true; }
        if (changed) {
          localStorage.setItem('imamu_dismissed_exam_tasks', JSON.stringify(dismissed));
        }
      } catch {}
    }
    const updated = tasks.filter(t => t.id !== id);
    saveTasks(updated);
    window.dispatchEvent(new Event('imamu_tasks_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  useEffect(() => {
    if (!events?.length && !settingsData) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // Mokafaa
    const mokafaaEvents = (events || [])
      .filter((e: any) => e.title?.includes('مكافأة') || e.title?.includes('mokafaa'))
      .map((e: any) => parseDate(e.date))
      .filter((d: Date | null): d is Date => d !== null && d >= todayStart)
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());
    let mo = mokafaaEvents[0];
    if (!mo) {
      mo = calculateMokafaaDate(now.getFullYear(), now.getMonth());
      if (mo < todayStart) mo = calculateMokafaaDate(now.getFullYear(), now.getMonth() + 1);
    }
    setNextMokafaa(mo);

    // Holiday (Unified single holiday concept with active [startDate, endDate] & upcoming support)
    let foundActiveHoliday: { title: string; startDate: Date; endDate: Date } | null = null;
    const allHolidays = (events || [])
      .filter((e: any) => (e.isHoliday || e.isHolidayEnd || e.isEid || e.isNationalDay || e.title?.includes('إجازة')) && !e.title?.includes('بعد إجازة') && !e.title?.includes('استئناف'))
      .map((e: any) => {
        const startDate = parseDate(e.date);
        let endDate = parseDate(e.endDate);
        if (!endDate && startDate) {
          const legacyEnd = (events || []).find((x: any) => 
            (x.isHolidayEnd || (x.title && (x.title.includes('نهاية إجازة') || x.title.includes('استئناف')))) &&
            parseDate(x.date) && parseDate(x.date)! >= startDate
          );
          endDate = legacyEnd ? parseDate(legacyEnd.date) : startDate;
        }
        return {
          title: e.title,
          startDate,
          endDate: endDate || startDate,
        };
      })
      .filter((x: any): x is { title: string; startDate: Date; endDate: Date } => x.startDate !== null && x.endDate !== null);

    for (const h of allHolidays) {
      if (h.startDate <= todayStart && h.endDate >= todayStart) {
        foundActiveHoliday = h;
        break;
      }
    }

    if (foundActiveHoliday) {
      setActiveHoliday({ title: foundActiveHoliday.title, date: foundActiveHoliday.startDate });
      setVacationEnd(foundActiveHoliday.endDate);
    } else {
      setActiveHoliday(null);
      setVacationEnd(null);
    }

    const upcomingHolidays = allHolidays
      .filter(h => h.startDate >= todayStart)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
    setNextHoliday(upcomingHolidays[0] ? { title: upcomingHolidays[0].title, date: upcomingHolidays[0].startDate } : null);

    // Next academic milestone (non-holiday)
    const milestones = (events || [])
      .filter((e: any) => !e.isHoliday && !e.isEid && !e.isNationalDay && !e.title?.includes('مكافأة') && !e.title?.includes('mokafaa'))
      .map((e: any) => ({ title: e.title, date: parseDate(e.date) }))
      .filter((x: any): x is { title: string; date: Date } => x.date && x.date >= todayStart)
      .sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
    setUpcomingEvent(milestones[0] || null);

    // Semester start/end
    const startEs = (events || [])
      .filter((e: any) => 
        (e.isSemester || e.isSemesterStart) &&
        !e.isHoliday && !e.isEid && !e.isNationalDay &&
        !e.title?.includes('اختبار') && !e.title?.includes('امتحان') &&
        !e.title?.includes('اعتذار') && !e.title?.includes('الاعتذار') &&
        !e.title?.includes('تسجيل') && !e.title?.includes('تحويل') &&
        !e.title?.includes('بعد إجازة')
      )
      .map((e: any) => parseDate(e.date))
      .filter((d: Date | null): d is Date => d !== null)
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());
    const endEs = (events || [])
      .filter((e: any) => 
        !e.title?.includes('اختبار') && !e.title?.includes('امتحان') &&
        !e.title?.includes('اعتذار') && !e.title?.includes('الاعتذار') &&
        !e.title?.includes('تسجيل') && !e.title?.includes('تحويل')
      )
      .flatMap((e: any) => {
        const res: (Date | null)[] = [];
        if (e.isSemesterEnd) res.push(parseDate(e.date));
        if ((e.isSemester || e.isSemesterStart) && e.endDate) res.push(parseDate(e.endDate));
        return res;
      })
      .filter((d: Date | null): d is Date => d !== null)
      .sort((a: Date, b: Date) => a.getTime() - b.getTime());

    // Fallback to settings if no semester start/end events found
    if (startEs.length === 0 && settingsData?.semesterStartDate) {
      const d = parseDate(settingsData.semesterStartDate);
      if (d) startEs.push(d);
    }
    if (endEs.length === 0 && settingsData?.semesterEndDate) {
      const d = parseDate(settingsData.semesterEndDate);
      if (d) endEs.push(d);
    }

    const lastStart = [...startEs].reverse().find(d => d <= todayStart) || null;
    const upcomingStart = startEs.find(d => d > todayStart) || null;
    const upcomingEnd = endEs.find(d => d >= todayStart) || null;
    setSemesterStart(lastStart || upcomingStart);
    setSemesterEnd(upcomingEnd || endEs[endEs.length - 1] || null);
  }, [events, settingsData]);

  // Stable calendar day computations (midnight-to-midnight)
  const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 1. Term progress calculations
  const startDay = semesterStart ? new Date(semesterStart.getFullYear(), semesterStart.getMonth(), semesterStart.getDate()) : null;
  const endDay = semesterEnd ? new Date(semesterEnd.getFullYear(), semesterEnd.getMonth(), semesterEnd.getDate()) : null;

  const isUpcomingSemester = !!(startDay && todayDateOnly.getTime() < startDay.getTime());
  const isEndedSemester = !!(endDay && todayDateOnly.getTime() > endDay.getTime());

  const semesterProgress = calculateProgressMetrics(startDay, endDay, todayDateOnly);
  const { totalDays, passedDays, remainingDays, percent: progressPercent } = semesterProgress;

  // 2. Mokafaa progress calculations
  const prevMokafaa = nextMokafaa
    ? (() => {
        const m = nextMokafaa.getMonth();
        const y = nextMokafaa.getFullYear();
        const prevMonth = m === 0 ? 11 : m - 1;
        const prevYear = m === 0 ? y - 1 : y;
        return calculateMokafaaDate(prevYear, prevMonth);
      })()
    : null;

  const moStart = prevMokafaa ? new Date(prevMokafaa.getFullYear(), prevMokafaa.getMonth(), prevMokafaa.getDate()) : null;
  const moTarget = nextMokafaa ? new Date(nextMokafaa.getFullYear(), nextMokafaa.getMonth(), nextMokafaa.getDate()) : null;

  const mokafaaProgress = calculateProgressMetrics(moStart, moTarget, todayDateOnly);
  const {
    totalDays: mokafaaTotalDays,
    passedDays: mokafaaPassedDays,
    remainingDays: mokafaaRemainingDays,
    percent: mokafaaPercent
  } = mokafaaProgress;

  // 3. Next Vacation progress calculations
  const holTarget = nextHoliday ? new Date(nextHoliday.date.getFullYear(), nextHoliday.date.getMonth(), nextHoliday.date.getDate()) : null;
  const holStart = startDay;
  
  const holidayProgress = calculateProgressMetrics(holStart, holTarget, todayDateOnly);
  const {
    totalDays: holidayTotalDays,
    passedDays: holidayPassedDays,
    remainingDays: holidayRemainingDays,
    percent: holidayPercent
  } = holidayProgress;

  // 4. Upcoming exams from courses
  const upcomingExams = (activeSemester?.courses || [])
    .filter(c => c.examDate)
    .map(c => {
      const d = parseDate(c.examDate!);
      const examDay = d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null;
      const days = examDay ? Math.round((examDay.getTime() - todayDateOnly.getTime()) / 86400000) : null;
      return { course: c, date: d, daysRemaining: days };
    })
    .filter((x): x is { course: CourseEntry; date: Date; daysRemaining: number } => x.date !== null && x.daysRemaining !== null && x.daysRemaining >= 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const nearestExam = upcomingExams[0] || null;

  const gpa = parseFloat(dbUser?.currentGpa || '0');
  const finishedHours = dbUser?.finishedHours || 0;
  const semesterCreditHours = activeSemester?.courses.reduce((sum, c) => sum + (c.creditHours || 0), 0) || 0;

  // Extract today's classes/lectures
  const todayDayOfWeek = now.getDay(); // 0: Sun, 1: Mon, ...
  const todayClasses = useMemo(() => {
    const list: {
      id: string;
      courseCode: string;
      courseName: string;
      startTimeStr: string;
      endTimeStr: string;
      startMinutes: number;
      endMinutes: number;
      room?: string;
      color: string;
      isOngoing: boolean;
      isUpcoming: boolean;
      isPassed: boolean;
    }[] = [];

    const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

    // Map through effectiveSections
    (effectiveSections || []).forEach((sec, sIdx) => {
      const matchedIdx = sec.color ? COURSE_HEX_COLORS.indexOf(sec.color) : -1;
      const color = sec.color || COURSE_HEX_COLORS[(matchedIdx >= 0 ? matchedIdx : sIdx) % COURSE_HEX_COLORS.length];
      const schedList = Array.isArray(sec.schedules) ? sec.schedules : [];

      schedList.forEach((sch, scIdx) => {
        const rawDays = parseScheduleDays(sch);
        const { startTime, endTime, startMinutes, endMinutes } = parseTimeRange(
          sch.timeRange,
          sch.startTime || '08:00 am',
          sch.endTime || '09:50 am'
        );

        const isToday = rawDays.some(d => {
          const mapped = DAY_MAP_AR[d] || d;
          if (mapped === 'الأحد' && todayDayOfWeek === 0) return true;
          if (mapped === 'الاثنين' && todayDayOfWeek === 1) return true;
          if (mapped === 'الثلاثاء' && todayDayOfWeek === 2) return true;
          if (mapped === 'الأربعاء' && todayDayOfWeek === 3) return true;
          if (mapped === 'الخميس' && todayDayOfWeek === 4) return true;
          if (mapped === 'الجمعة' && todayDayOfWeek === 5) return true;
          if (mapped === 'السبت' && todayDayOfWeek === 6) return true;
          return false;
        });

        if (isToday) {
          list.push({
            id: `${sec.id || sec.courseCode}_${scIdx}_${startMinutes}`,
            courseCode: sec.courseCode,
            courseName: sec.courseTitle || sec.courseCode,
            startTimeStr: startTime,
            endTimeStr: endTime,
            startMinutes,
            endMinutes,
            room: sch.room,
            color,
            isOngoing: currentTotalMinutes >= startMinutes && currentTotalMinutes <= endMinutes,
            isUpcoming: currentTotalMinutes < startMinutes,
            isPassed: currentTotalMinutes > endMinutes,
          });
        }
      });
    });

    // Fallback to activeSemester.courses if effectiveSections had no schedules for today
    if (list.length === 0 && activeSemester?.courses) {
      activeSemester.courses.forEach((c, cIdx) => {
        const color = c.color || COURSE_HEX_COLORS[cIdx % COURSE_HEX_COLORS.length];
        const customSched = Array.isArray(c.customSchedule) ? c.customSchedule : [];
        customSched.forEach((sch: any, scIdx: number) => {
          const rawDays = parseScheduleDays(sch.days || sch);
          const { startTime, endTime, startMinutes, endMinutes } = parseTimeRange(
            undefined,
            sch.startTime || '08:00 am',
            sch.endTime || '09:50 am'
          );

          const isToday = rawDays.some(d => {
            const mapped = DAY_MAP_AR[d] || d;
            if (mapped === 'الأحد' && todayDayOfWeek === 0) return true;
            if (mapped === 'الاثنين' && todayDayOfWeek === 1) return true;
            if (mapped === 'الثلاثاء' && todayDayOfWeek === 2) return true;
            if (mapped === 'الأربعاء' && todayDayOfWeek === 3) return true;
            if (mapped === 'الخميس' && todayDayOfWeek === 4) return true;
            if (mapped === 'الجمعة' && todayDayOfWeek === 5) return true;
            if (mapped === 'السبت' && todayDayOfWeek === 6) return true;
            return false;
          });

          if (isToday) {
            list.push({
              id: `${c.courseCode}_${scIdx}_${startMinutes}`,
              courseCode: c.courseCode,
              courseName: c.courseName || c.courseCode,
              startTimeStr: startTime,
              endTimeStr: endTime,
              startMinutes,
              endMinutes,
              room: sch.classroom,
              color,
              isOngoing: currentTotalMinutes >= startMinutes && currentTotalMinutes <= endMinutes,
              isUpcoming: currentTotalMinutes < startMinutes,
              isPassed: currentTotalMinutes > endMinutes,
            });
          }
        });
      });
    }

    return list.sort((a, b) => a.startMinutes - b.startMinutes);
  }, [effectiveSections, activeSemester?.courses, todayDayOfWeek, now]);

  const todayDateKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [manualCheckedClasses, setManualCheckedClasses] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(`imamu_attended_classes_${todayDateKey}`);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const toggleClassCheck = useCallback((slotId: string, isAutoPassed: boolean) => {
    setManualCheckedClasses(prev => {
      const currentChecked = prev[slotId] !== undefined ? prev[slotId] : isAutoPassed;
      const nextVal = !currentChecked;
      const next = { ...prev, [slotId]: nextVal };
      try {
        localStorage.setItem(`imamu_attended_classes_${todayDateKey}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [todayDateKey]);

  const resolveTaskColor = useCallback((t: StudentTask): string => {
    if (effectiveSections && effectiveSections.length > 0) {
      const sec = effectiveSections.find(s => {
        const secCode = s.courseCode?.trim().toLowerCase();
        const secTitle = s.courseTitle?.trim().toLowerCase();
        const tCode = t.courseCode?.trim().toLowerCase();
        const tName = t.courseName?.trim().toLowerCase();
        if (tCode && secCode && (secCode === tCode || secCode.includes(tCode) || tCode.includes(secCode))) return true;
        if (tName && secTitle && (secTitle === tName || secTitle.includes(tName) || tName.includes(secTitle))) return true;
        return false;
      });
      if (sec) {
        if (sec.color) return sec.color;
        const secIdx = effectiveSections.indexOf(sec);
        return COURSE_HEX_COLORS[secIdx % COURSE_HEX_COLORS.length];
      }
    }

    if (activeSemester?.courses && activeSemester.courses.length > 0) {
      const course = activeSemester.courses.find(c => {
        const cCode = c.courseCode?.trim().toLowerCase();
        const cName = c.courseName?.trim().toLowerCase();
        const tCode = t.courseCode?.trim().toLowerCase();
        const tName = t.courseName?.trim().toLowerCase();
        if (tCode && cCode && (cCode === tCode || cCode.includes(tCode) || tCode.includes(cCode))) return true;
        if (tName && cName && (cName === tName || cName.includes(tName) || tName.includes(cName))) return true;
        return false;
      });
      if (course) {
        if (course.color) return course.color;
        const cIdx = activeSemester.courses.indexOf(course);
        return COURSE_HEX_COLORS[cIdx % COURSE_HEX_COLORS.length];
      }
    }

    return t.color || '#8c6239';
  }, [effectiveSections, activeSemester?.courses]);

  const todayTasks = useMemo(() => {
    return tasks.filter(t => {
      if (!t.dueDate) return false;
      const countdown = formatTaskCountdown(t.dueDate, t.dueTime);
      return Boolean(countdown?.isToday);
    });
  }, [tasks]);

  const todayDoneClassesCount = useMemo(() => {
    return todayClasses.filter(slot => {
      if (manualCheckedClasses[slot.id] !== undefined) {
        return manualCheckedClasses[slot.id];
      }
      return slot.isPassed;
    }).length;
  }, [todayClasses, manualCheckedClasses]);

  const todayDoneTasksCount = useMemo(() => {
    return todayTasks.filter(t => t.completed).length;
  }, [todayTasks]);

  const totalTodayItems = todayClasses.length + todayTasks.length;
  const doneTodayItems = todayDoneClassesCount + todayDoneTasksCount;

  const formatDaysPhrase = (count: number, prefix: string) => {
    if (count === 0) return prefix === 'بدأ قبل' ? 'يبدأ اليوم' : 'ينتهي اليوم';
    if (count === 1) return prefix === 'بدأ قبل' ? 'بدأ قبل يوم واحد' : 'ينتهي خلال يوم واحد';
    if (count === 2) return prefix === 'بدأ قبل' ? 'بدأ قبل يومين' : 'ينتهي خلال يومين';
    if (count <= 10) return `${prefix} ${count} أيام`;
    return `${prefix} ${count} يوماً`;
  };

  const formatCountdownPhrase = (days: number) => {
    if (days <= 0) return 'اليوم';
    if (days === 1) return 'غداً (خلال يوم)';
    if (days === 2) return 'خلال يومين';
    if (days <= 10) return `خلال ${days} أيام`;
    return `خلال ${days} يوماً`;
  };

  const daysUntilStart = semesterStart ? Math.ceil((semesterStart.getTime() - now.getTime()) / 86400000) : 0;
  const startedText = isUpcomingSemester
    ? `يبدأ ${formatCountdownPhrase(daysUntilStart)}`
    : semesterStart
      ? formatDaysPhrase(passedDays, 'بدأ قبل')
      : 'لم يبدأ بعد';
  const endsText = isEndedSemester
    ? 'انتهى الفصل'
    : semesterEnd
      ? formatDaysPhrase(remainingDays, 'ينتهي خلال')
      : '—';

  return (
    <div className="flex flex-col gap-3.5 w-full">

      {/* ── Edit Semester & Courses Modal ── */}
      <AnimatePresence>
        {showEditModal && activeSemester && (
          <EditSemesterModal
            semester={activeSemester}
            allSubjects={subjects}
            onClose={() => setShowEditModal(false)}
            onSave={(newLabel, newCourses, newEmoji) => {
              onUpdateSemester?.(newLabel, newCourses, newEmoji);
              setShowEditModal(false);
            }}
            onDelete={() => {
              if (activeSemester) {
                onDeleteSemester?.(activeSemester.id);
                setShowEditModal(false);
              }
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Card 1: Semester overview ── */}
      {activeSemester ? (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/90 rounded-2xl p-4 shadow-xs relative overflow-hidden transition-all duration-200 hover:border-slate-300 dark:hover:border-zinc-700/80">
          {/* Subtle decorative gradient glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-imamu-brown)]/5 rounded-full blur-2xl pointer-events-none" />

          {/* Top header row */}
          <div className="flex items-center justify-between mb-3.5 relative">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-zinc-800 border border-stone-200/80 dark:border-zinc-700/60 flex items-center justify-center text-lg leading-none shadow-2xs select-none">
                {activeSemester.emoji ? (
                  <span>{activeSemester.emoji}</span>
                ) : (
                  <GraduationCap className="w-5 h-5 text-[var(--color-imamu-accent)]" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">
                    {activeSemester.label}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    الفصل الحالي
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="w-8 h-8 rounded-xl bg-slate-100/60 dark:bg-zinc-800/60 flex items-center justify-center text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200 dark:hover:border-zinc-700"
              title="إدارة وتعديل الفصل والمواد"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3 Modern KPI stat pills */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
            <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/60">
              <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 mb-0.5">الساعات</span>
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 tabular-nums">
                {semesterCreditHours > 0 ? `${semesterCreditHours} س` : '0 س'}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-[var(--color-imamu-brown)]/5 dark:bg-[var(--color-imamu-brown)]/10 border border-[var(--color-imamu-brown)]/15">
              <span className="text-[10px] font-medium text-[var(--color-imamu-brown)] dark:text-[var(--color-imamu-accent)] mb-0.5">المعدل</span>
              <span className="text-xs font-black text-[var(--color-imamu-brown)] dark:text-[var(--color-imamu-accent)] tabular-nums">
                {gpa > 0 ? gpa.toFixed(2) : '—'}
              </span>
            </div>

            <div className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-slate-50/70 dark:bg-zinc-800/40 border border-slate-100 dark:border-zinc-800/60">
              <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 mb-0.5">المكتسبة</span>
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 tabular-nums">
                {finishedHours > 0 ? `${finishedHours} س` : '0 س'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800/90 rounded-2xl p-4 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-imamu-brown)]/10 text-[var(--color-imamu-brown)] flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">لا يوجد فصل محدد</p>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">مهامك محفوظة ومستقلة تماماً</p>
            </div>
          </div>
          {onOpenNewSemesterModal && (
            <button
              type="button"
              onClick={onOpenNewSemesterModal}
              className="px-3 py-1.5 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
            >
              إضافة فصل
            </button>
          )}
        </div>
      )}

      {/* ── Card 2: Progress Section & Tasks ── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-1.5 transition-all duration-200 hover:border-slate-300 dark:hover:border-zinc-700/80">
        {/* ── Progress Section Controls (Tabs) ── */}
        <div className="relative flex items-center border-b border-slate-200 dark:border-zinc-800/80 mb-0 pb-0" dir="rtl">
        <button
          type="button"
          onClick={() => setProgressView('upcoming')}
          className={clsx(
            "relative flex-1 pb-2.5 px-1 font-bold transition-colors duration-200 text-xs sm:text-sm flex items-center justify-center gap-1.5 select-none cursor-pointer whitespace-nowrap",
            progressView === 'upcoming'
              ? "text-[var(--color-imamu-accent)]"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
          )}
        >
          <CalendarClock className={clsx("w-4 h-4 transition-colors", progressView === 'upcoming' ? "text-[var(--color-imamu-accent)]" : "text-slate-400 dark:text-zinc-500")} />
          <span>اليوم</span>
          {totalTodayItems > 0 && (
            <span className={clsx(
              "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
              progressView === 'upcoming' ? "bg-[var(--color-imamu-brown)] text-white" : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
            )}>
              {totalTodayItems}
            </span>
          )}
          {progressView === 'upcoming' && (
            <motion.div
              layoutId="sidebarActiveTabUnderline"
              className="absolute bottom-0 right-0 left-0 h-0.5 bg-[var(--color-imamu-brown)] dark:bg-[var(--color-imamu-brown)] rounded-full shadow-xs"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => setProgressView('courses')}
          className={clsx(
            "relative flex-1 pb-2.5 px-1 font-bold transition-colors duration-200 text-xs sm:text-sm flex items-center justify-center gap-1.5 select-none cursor-pointer whitespace-nowrap",
            progressView === 'courses'
              ? "text-[var(--color-imamu-accent)]"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
          )}
        >
          <BookOpen className={clsx("w-4 h-4 transition-colors", progressView === 'courses' ? "text-[var(--color-imamu-accent)]" : "text-slate-400 dark:text-zinc-500")} />
          <span>المواد</span>
          {activeSemester?.courses && activeSemester.courses.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
              {activeSemester.courses.length}
            </span>
          )}
          {progressView === 'courses' && (
            <motion.div
              layoutId="sidebarActiveTabUnderline"
              className="absolute bottom-0 right-0 left-0 h-0.5 bg-[var(--color-imamu-brown)] dark:bg-[var(--color-imamu-brown)] rounded-full shadow-xs"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => setProgressView('tasks')}
          className={clsx(
            "relative flex-1 pb-2.5 px-1 font-bold transition-colors duration-200 text-xs sm:text-sm flex items-center justify-center gap-1.5 select-none cursor-pointer whitespace-nowrap",
            progressView === 'tasks'
              ? "text-[var(--color-imamu-accent)]"
              : "text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200"
          )}
        >
          <CheckSquare className={clsx("w-4 h-4 transition-colors", progressView === 'tasks' ? "text-[var(--color-imamu-accent)]" : "text-slate-400 dark:text-zinc-500")} />
          <span>المهام</span>
          {tasks.filter(t => !t.completed).length > 0 && (
            <span className={clsx(
              "text-[10px] px-1.5 py-0.2 rounded-full font-bold",
              progressView === 'tasks' ? "bg-[var(--color-imamu-brown)] text-white" : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
            )}>
              {tasks.filter(t => !t.completed).length}
            </span>
          )}
          {progressView === 'tasks' && (
            <motion.div
              layoutId="sidebarActiveTabUnderline"
              className="absolute bottom-0 right-0 left-0 h-0.5 bg-[var(--color-imamu-brown)] dark:bg-[var(--color-imamu-brown)] rounded-full shadow-xs"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
        </button>
      </div>

      {/* ── Progress Cards & Widgets ── */}
      <div className="flex flex-col gap-2 pt-0.5">
        {/* 1. UPCOMING TAB */}
        {progressView === 'upcoming' && (
          <div className="flex flex-col px-1 gap-6">
            {/* ── Today's Schedule & Tasks Section ── */}
            <div className="flex flex-col">
              {/* Items list: Today's Classes + Today's Tasks */}
              {totalTodayItems === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400 dark:text-zinc-500 font-medium">
                    لا توجد محاضرات أو مهام مجدولة لهذا اليوم 🎉
                  </p>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-slate-100 dark:divide-zinc-800/60 pt-1">
                  {/* 1. Today's Classes */}
                  {todayClasses.map(slot => {
                    const isDone = manualCheckedClasses[slot.id] !== undefined ? manualCheckedClasses[slot.id] : slot.isPassed;
                    return (
                      <div
                        key={slot.id}
                        className={clsx(
                          "group relative flex items-start gap-2.5 py-2.5 transition-colors",
                          isDone && "opacity-50"
                        )}
                      >
                        {/* Interactive Checkmark: Clickable to toggle, auto-checked if class time is passed */}
                        <button
                          type="button"
                          onClick={() => toggleClassCheck(slot.id, slot.isPassed)}
                          className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer shadow-2xs"
                          style={{
                            borderColor: slot.color,
                            backgroundColor: isDone ? slot.color : 'transparent'
                          }}
                          title={isDone ? 'تم الانتهاء (انقر للإلغاء)' : 'انقر للتحديد كمكتملة'}
                        >
                          {isDone && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </button>

                        {/* Class details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            {/* Course Title */}
                            <span
                              className={clsx(
                                "text-xs sm:text-sm font-bold leading-snug truncate",
                                isDone
                                  ? "text-slate-400 dark:text-zinc-500 line-through"
                                  : "text-slate-900 dark:text-white"
                              )}
                            >
                              {slot.courseName}
                            </span>

                            {/* Timing & Status badge */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10.5px] font-medium text-slate-500 dark:text-zinc-400 inline-flex items-center gap-1" dir="rtl">
                                <Clock className="w-3 h-3 text-slate-400 dark:text-zinc-500 shrink-0" />
                                <span>{formatMinutesToTime(slot.startMinutes, true)}</span>
                                <span className="text-slate-400 font-normal">←</span>
                                <span>{formatMinutesToTime(slot.endMinutes, true)}</span>
                              </span>

                              {slot.isOngoing && !isDone && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                                  الآن
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Tags in pills: Course Code & Classroom */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
                            <span
                              className="subject-tag px-2 py-0.5 rounded-md font-bold text-[10px] shadow-2xs shrink-0"
                              style={{ '--subject-color': slot.color } as React.CSSProperties}
                            >
                              {slot.courseCode}
                            </span>

                            {slot.room && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium text-[10px] flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                <span>{slot.room}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* 2. Today's Tasks */}
                  {todayTasks.map(t => {
                    const taskColor = resolveTaskColor(t);
                    const duePill = formatTaskDuePill(t.dueDate, t.dueTime);
                    const categoryLabel = TASK_CATEGORIES.find(c => c.key === t.category || c.label === t.category)?.label || t.categoryLabel || t.category;

                    return (
                      <div
                        key={t.id}
                        className={clsx(
                          "group relative flex items-start gap-2.5 py-2.5 transition-colors",
                          t.completed && "opacity-50"
                        )}
                      >
                        {/* Circle checkbox with colored border */}
                        <button
                          type="button"
                          onClick={() => toggleTask(t.id)}
                          className="mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer shadow-2xs"
                          style={{
                            borderColor: taskColor,
                            backgroundColor: t.completed ? taskColor : 'transparent'
                          }}
                          title={t.completed ? 'إلغاء الإكمال' : 'تحديد كمكتمل'}
                        >
                          {t.completed && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                        </button>

                        {/* Task info */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            {/* Title */}
                            <span
                              className={clsx(
                                "text-xs sm:text-sm font-bold leading-snug truncate",
                                t.completed
                                  ? "line-through text-slate-400 dark:text-zinc-500"
                                  : "text-slate-900 dark:text-white"
                              )}
                            >
                              {t.title}
                            </span>

                            {/* Time / Countdown */}
                            {duePill && (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-[10.5px] font-medium text-slate-500 dark:text-zinc-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-400 dark:text-zinc-500 shrink-0" />
                                  <span dir="rtl">{duePill}</span>
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Tags in pills: Course, Category */}
                          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[10px]">
                            {t.courseName && (
                              <span
                                className="subject-tag px-2 py-0.5 rounded-md font-bold text-[10px] truncate max-w-[140px] shadow-2xs"
                                style={{ '--subject-color': taskColor } as React.CSSProperties}
                                title={t.courseName}
                              >
                                {t.courseName}
                              </span>
                            )}

                            {categoryLabel && (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium text-[10px]">
                                {categoryLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Milestones Section (نهاية الفصل، الإجازة، المكافأة) ── */}
            <div className="flex flex-col">
              {/* Header: القادم */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  القادم
                </h3>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                  {2 + (activeHoliday ? 1 : nextHoliday ? 1 : 0)}
                </span>
              </div>

              <div className="flex flex-col divide-y divide-slate-100 dark:divide-zinc-800/60 max-h-[500px] overflow-y-auto pr-0.5 custom-scrollbar">
              {/* Semester End Progress Card */}
              {semesterStart && semesterEnd && (
                <ProgressMetricCard
                  icon="📚"
                  title="نهاية الفصل الدراسي"
                  passedDays={passedDays}
                  totalDays={totalDays}
                  remainingDays={remainingDays}
                  percent={progressPercent}
                  startDate={semesterStart}
                  endDate={semesterEnd}
                  remainingColor="text-[var(--color-imamu-accent)]"
                />
              )}

              {/* Vacation Card */}
              {activeHoliday && vacationEnd ? (() => {
                const vStart = new Date(activeHoliday.date.getFullYear(), activeHoliday.date.getMonth(), activeHoliday.date.getDate());
                const vEnd = new Date(vacationEnd.getFullYear(), vacationEnd.getMonth(), vacationEnd.getDate());
                const vTotalDays = Math.max(1, Math.round((vEnd.getTime() - vStart.getTime()) / 86400000) + 1);
                const vPassedDays = Math.max(0, Math.min(vTotalDays, Math.round((todayDateOnly.getTime() - vStart.getTime()) / 86400000) + 1));
                const vRemainingDays = Math.max(0, Math.round((vEnd.getTime() - todayDateOnly.getTime()) / 86400000));
                const vPercent = Math.min(100, Math.max(0, Math.round((vPassedDays / vTotalDays) * 100)));
                return (
                  <ProgressMetricCard
                    icon="🌴"
                    title={`إجازة ${activeHoliday.title.replace(/^إجازة\s*/, '')}`}
                    passedDays={vPassedDays}
                    totalDays={vTotalDays}
                    remainingDays={vRemainingDays}
                    percent={vPercent}
                    startDate={activeHoliday.date}
                    endDate={vacationEnd}
                    remainingColor="text-emerald-600 dark:text-emerald-400"
                    barColor="bg-emerald-500"
                  />
                );
              })() : nextHoliday && holStart ? (
                <ProgressMetricCard
                  icon="🌴"
                  title={nextHoliday.title || 'أقرب إجازة'}
                  passedDays={holidayPassedDays}
                  totalDays={holidayTotalDays}
                  remainingDays={holidayRemainingDays}
                  percent={holidayPercent}
                  startDate={holStart}
                  endDate={nextHoliday.date}
                  remainingColor="text-[var(--color-imamu-accent)]"
                />
              ) : null}

              {/* Next Mokafaa Progress Card */}
              {prevMokafaa && nextMokafaa && (
                <ProgressMetricCard
                  icon="💰"
                  title="المكافأة الجامعية"
                  passedDays={mokafaaPassedDays}
                  totalDays={mokafaaTotalDays}
                  remainingDays={mokafaaRemainingDays}
                  percent={mokafaaPercent}
                  startDate={prevMokafaa}
                  endDate={nextMokafaa}
                  remainingColor="text-[var(--color-imamu-accent)]"
                />
              )}
            </div>
          </div>
        </div>
        )}

        {/* 2. COURSES TAB */}
        {progressView === 'courses' && (
          <div className="flex flex-col px-1">
            {(!activeSemester || !activeSemester.courses.length) ? (
              <p className="text-xs text-slate-400 dark:text-zinc-500 text-center py-6">
                لم تقم بإضافة مواد لهذا الفصل بعد.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-slate-100 dark:divide-zinc-800/60 max-h-[500px] overflow-y-auto pr-0.5 custom-scrollbar pt-1">
                {activeSemester.courses.map((c, idx) => {
                  const matchingSec = effectiveSections?.find(
                    s => (c.crn && String(s.crn) === String(c.crn)) || s.courseCode === c.courseCode
                  );
                  const matchingSecIdx = effectiveSections?.findIndex(
                    s => (c.crn && String(s.crn) === String(c.crn)) || s.courseCode === c.courseCode
                  );
                  const colorIdx = (matchingSecIdx !== undefined && matchingSecIdx >= 0 ? matchingSecIdx : idx) % COURSE_HEX_COLORS.length;
                  const courseColor = c.color || matchingSec?.color || COURSE_HEX_COLORS[colorIdx];

                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2.5 py-2.5 transition-colors group"
                    >
                      {/* Square indicator with matching schedule color */}
                      <button
                        type="button"
                        onClick={() => onOpenCourseDetails?.(c)}
                        className="w-5 h-5 rounded-md border-2 shrink-0 transition-transform duration-150 group-hover:scale-105 shadow-2xs cursor-pointer"
                        style={{
                          borderColor: courseColor,
                          backgroundColor: `${courseColor}20`
                        }}
                        title="تفاصيل المقرر"
                        aria-label="تفاصيل المقرر"
                      />

                      {/* Course title - click to open info */}
                      <div
                        onClick={() => onOpenCourseDetails?.(c)}
                        className="min-w-0 flex-1 cursor-pointer"
                        title="عرض تفاصيل المقرر"
                      >
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug truncate hover:text-[var(--color-imamu-accent)] transition-colors">
                          {c.courseName}
                        </p>
                      </div>

                      {/* Three dots action button */}
                      <button
                        type="button"
                        onClick={() => onOpenCourseDetails?.(c)}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
                        title="تفاصيل وخيارات المقرر"
                        aria-label="تفاصيل وخيارات المقرر"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 3. TASKS TAB */}
        {progressView === 'tasks' && (
          <div className="flex flex-col px-1">
            {/* Tasks list items */}
            {tasks.length === 0 ? (
              <div className="text-center py-6 px-4">
                <p className="text-xs text-slate-400 dark:text-zinc-500 mb-2">
                  لا توجد مهام حالياً.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenNewTaskModal?.()}
                  leftIcon={<Plus className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />}
                >
                  أضف أول مهمة أو واجب دراسي
                </Button>
              </div>
            ) : (() => {
              const getTaskTimestamp = (t: StudentTask): number => {
                if (!t.dueDate) return Infinity;
                const parts = t.dueDate.split('-');
                if (parts.length === 3) {
                  const y = parseInt(parts[0], 10);
                  const m = parseInt(parts[1], 10) - 1;
                  const d = parseInt(parts[2], 10);
                  let h = 23;
                  let min = 59;
                  if (t.dueTime) {
                    const parsedMin = parseTimeToMinutes(t.dueTime);
                    if (parsedMin !== null) {
                      h = Math.floor(parsedMin / 60);
                      min = parsedMin % 60;
                    }
                  }
                  return new Date(y, m, d, h, min).getTime();
                }
                const parsed = new Date(t.dueDate).getTime();
                return isNaN(parsed) ? Infinity : parsed;
              };

              const lateTasks = tasks
                .filter(t => !t.completed && Boolean(t.dueDate) && Boolean(formatTaskCountdown(t.dueDate, t.dueTime)?.isOverdue))
                .sort((a, b) => getTaskTimestamp(a) - getTaskTimestamp(b));

              const upcomingTasks = tasks
                .filter(t => !t.completed && Boolean(t.dueDate) && !formatTaskCountdown(t.dueDate, t.dueTime)?.isOverdue)
                .sort((a, b) => getTaskTimestamp(a) - getTaskTimestamp(b));

              const undatedTasks = tasks
                .filter(t => !t.completed && !t.dueDate)
                .sort((a, b) => {
                  const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                  const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                  return timeB - timeA;
                });

              const finishedTasks = tasks
                .filter(t => t.completed)
                .sort((a, b) => getTaskTimestamp(b) - getTaskTimestamp(a));

              const renderTaskItem = (t: StudentTask) => {
                const countdown = formatTaskCountdown(t.dueDate, t.dueTime);
                const duePill = formatTaskDuePill(t.dueDate, t.dueTime, t.endDate, t.endTime);
                const taskColor = resolveTaskColor(t);
                const categoryLabel = TASK_CATEGORIES.find(c => c.key === t.category || c.label === t.category)?.label || t.categoryLabel || t.category;

                return (
                  <div
                    key={t.id}
                    className={`group relative flex flex-col gap-2.5 py-3 transition-colors border-b border-slate-100 dark:border-zinc-800 last:border-0 ${
                      t.completed ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Top Row: Circle Checkbox + Title + Countdown Badge + Three Dots */}
                    <div className="flex items-center gap-2.5 w-full">
                      {/* Circle checkbox with colored border */}
                      <button
                        type="button"
                        onClick={() => toggleTask(t.id)}
                        className="w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer shadow-2xs"
                        style={{
                          borderColor: taskColor,
                          backgroundColor: t.completed ? taskColor : 'transparent'
                        }}
                      >
                        {t.completed && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                      </button>

                      {/* Title */}
                      <span
                        className={`text-sm font-bold leading-snug transition-colors truncate flex-1 min-w-0 ${
                          t.completed
                            ? 'line-through text-slate-400 dark:text-zinc-500'
                            : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {t.title}
                      </span>

                      {/* Countdown badge */}
                      {countdown && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 ${
                            countdown.isOverdue
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : countdown.isToday
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400'
                          }`}
                        >
                          {countdown.text}
                        </span>
                      )}

                      {/* Three dots action button */}
                      <div className="relative shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeTaskMenu?.task.id === t.id) {
                              setActiveTaskMenu(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const menuHeight = 84;
                              const menuWidth = 112;
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const openUpwards = spaceBelow < (menuHeight + 10) && rect.top > menuHeight;
                              const x = Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8));
                              const y = openUpwards ? rect.top - 4 : rect.bottom + 4;
                              setActiveTaskMenu({ task: t, x, y, openUpwards });
                            }
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                          title="خيارات المهمة"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Tags starting right under the circle */}
                    <div className="flex items-center gap-1.5 flex-wrap text-[10px] w-full mt-1">
                      {/* Date/time pill */}
                      {duePill && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-medium" dir="rtl">
                          <Clock className="w-3 h-3 shrink-0" />
                          {duePill}
                        </span>
                      )}

                      {/* Location pill */}
                      {t.location && (
                        <span
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-medium truncate max-w-[140px]"
                          title={t.location}
                        >
                          <MapPin className="w-3 h-3 text-[var(--color-imamu-accent)] shrink-0" />
                          <span className="truncate">{t.location}</span>
                        </span>
                      )}

                      {/* Link pill */}
                      {t.link && (
                        <a
                          href={t.link.startsWith('http') ? t.link : `https://${t.link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 font-medium hover:underline truncate max-w-[130px] cursor-pointer"
                          title={t.link}
                        >
                          <Link2 className="w-3 h-3 shrink-0" />
                          <span>رابط</span>
                        </a>
                      )}

                      {t.courseName && (
                        <span
                          className="subject-tag px-2 py-0.5 rounded-md font-bold text-[10px] truncate max-w-[140px] shadow-2xs"
                          style={{ '--subject-color': taskColor } as React.CSSProperties}
                          title={t.courseName}
                        >
                          {t.courseName}
                        </span>
                      )}

                      {categoryLabel && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-medium text-[10px]">
                          {categoryLabel}
                        </span>
                      )}

                      {t.priority === 'high' && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold border border-rose-500/20 text-[10px]">
                          عالية !!!
                        </span>
                      )}
                      {t.priority === 'medium' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20 text-[10px]">
                          متوسطة !!
                        </span>
                      )}
                      {t.priority === 'low' && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 font-medium text-[10px]">
                          منخفضة !
                        </span>
                      )}
                    </div>
                  </div>
                );
              };

              return (
                <div className="flex flex-col gap-2 pt-0.5">
                  {/* 1. LATE TASKS (Open by default, only shown if tasks exist under it) */}
                  {lateTasks.length > 0 && (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => setIsLateOpen(!isLateOpen)}
                        className="flex items-center justify-between py-1 text-xs font-bold text-rose-600 dark:text-rose-400 cursor-pointer select-none group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>متأخرة</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
                            {lateTasks.length}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isLateOpen ? '' : 'rotate-90'}`} />
                        </div>
                      </button>
                      {isLateOpen && (
                        <div className="flex flex-col divide-y divide-slate-100 dark:divide-zinc-800/60">
                          {lateTasks.map(renderTaskItem)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 2. UPCOMING TASKS (Open by default, only shown if tasks exist under it) */}
                  {upcomingTasks.length > 0 && (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => setIsUpcomingOpen(!isUpcomingOpen)}
                        className="flex items-center justify-between py-1 text-xs font-bold text-slate-700 dark:text-zinc-300 cursor-pointer select-none group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>القادمة</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                            {upcomingTasks.length}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isUpcomingOpen ? '' : 'rotate-90'}`} />
                        </div>
                      </button>
                      {isUpcomingOpen && (
                        <div className="flex flex-col divide-y divide-slate-100 dark:divide-zinc-800/60">
                          {upcomingTasks.map(renderTaskItem)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. UNDATED TASKS (Open by default, only shown if tasks exist under it) */}
                  {undatedTasks.length > 0 && (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => setIsUndatedOpen(!isUndatedOpen)}
                        className="flex items-center justify-between py-1 text-xs font-bold text-slate-700 dark:text-zinc-300 cursor-pointer select-none group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>بدون تاريخ</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                            {undatedTasks.length}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isUndatedOpen ? '' : 'rotate-90'}`} />
                        </div>
                      </button>
                      {isUndatedOpen && (
                        <div className="flex flex-col divide-y divide-slate-100 dark:divide-zinc-800/60">
                          {undatedTasks.map(renderTaskItem)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 4. FINISHED TASKS (Compressed by default, only shown if tasks exist under it) */}
                  {finishedTasks.length > 0 && (
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => setIsFinishedOpen(!isFinishedOpen)}
                        className="flex items-center justify-between py-1 text-xs font-bold text-slate-500 dark:text-zinc-400 cursor-pointer select-none group"
                      >
                        <div className="flex items-center gap-1.5">
                          <span>المكتملة</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
                            {finishedTasks.length}
                          </span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFinishedOpen ? '' : 'rotate-90'}`} />
                        </div>
                      </button>
                      {isFinishedOpen && (
                        <div className="flex flex-col divide-y divide-slate-100 dark:divide-zinc-800/60">
                          {finishedTasks.map(renderTaskItem)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </div>
      </div>

      {/* ── Fixed Portal for 3-dots Task Action Menu ── */}
      {activeTaskMenu && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: activeTaskMenu.openUpwards ? undefined : `${activeTaskMenu.y}px`,
            bottom: activeTaskMenu.openUpwards ? `${window.innerHeight - activeTaskMenu.y}px` : undefined,
            left: `${activeTaskMenu.x}px`,
            zIndex: 99999,
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-28 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-2xl py-1 flex flex-col text-xs"
        >
          <button
            type="button"
            onClick={() => {
              const taskToEdit = activeTaskMenu.task;
              setActiveTaskMenu(null);
              onEditTask?.(taskToEdit);
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition cursor-pointer text-right w-full font-medium"
          >
            <Pencil className="w-3.5 h-3.5 text-slate-400" />
            <span>تعديل</span>
          </button>
          <button
            type="button"
            onClick={() => {
              const taskId = activeTaskMenu.task.id;
              setActiveTaskMenu(null);
              deleteTask(taskId);
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer text-right w-full font-medium"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
            <span>حذف</span>
          </button>
        </div>,
        document.body
      )}

    </div>
  );
}



// ─────────────────────────────────────────────
// Semester creation wizard
// ─────────────────────────────────────────────
interface WizardProps {
  onClose: () => void;
  onSave: (sem: MySemester) => void;
  subjects: any[];
}

interface FolderTermOption {
  name: string;
  academicYear?: string;
  semester?: string;
  term?: string;
  count?: number;
}

const FOLDERS_STORAGE_KEY = 'imamu_section_folders';

function loadStoredFolders(): FolderTermOption[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function SemesterWizard({ onClose, onSave, subjects }: WizardProps) {
  const [step, setStep] = useState(1);
  const storedInitial = loadStoredFolders();
  const initialFolder = storedInitial.length > 0 ? storedInitial[0] : null;

  // Step 1: free-text label + folder/term selection (Dropdown Slider)
  const [label, setLabel] = useState('');
  const [emoji, setEmoji] = useState('🎓');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [academicYear, setAcademicYear] = useState(initialFolder?.academicYear || '1448');
  const [semesterName, setSemesterName] = useState(initialFolder?.semester || 'الفصل الأول');
  const [selectedFolderTerm, setSelectedFolderTerm] = useState(
    initialFolder ? (initialFolder.term || initialFolder.name) : '1448 - الفصل الأول'
  );
  const [availableFolders, setAvailableFolders] = useState<FolderTermOption[]>(() => {
    return storedInitial;
  });
  const [isFolderDropdownOpen, setIsFolderDropdownOpen] = useState(false);

  // Step 2: course picking
  const [searchSubject, setSearchSubject] = useState('');
  const [selectedCourses, setSelectedCourses] = useState<CourseEntry[]>([]);

  // Fetch available folders from /api/sections/terms-public and merge with user-created folders
  useEffect(() => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '') : '';
    fetch('/api/sections/terms-public', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then(r => r.ok ? r.json() : { terms: [] })
      .then(data => {
        const stored = loadStoredFolders();
        let apiList: FolderTermOption[] = [];
        if (data.terms && Array.isArray(data.terms) && data.terms.length > 0) {
          apiList = data.terms.map((t: any) => {
            const name = t.term || (t.academicYear && t.semester ? `${t.academicYear} - ${t.semester}` : t.academicYear || t.semester || '');
            return {
              name,
              academicYear: t.academicYear,
              semester: t.semester,
              term: t.term || name,
              count: t.count || 0
            };
          }).filter((x: any) => Boolean(x.name));
        }

        const mergedMap = new Map<string, FolderTermOption>();
        // Only real folders: from DB terms
        for (const item of apiList) {
          if (item && item.name) mergedMap.set(item.term || item.name, item);
        }
        // User folders created in AdminSectionsTab
        for (const item of stored) {
          if (item && item.name) {
            const key = item.term || item.name;
            if (mergedMap.has(key)) {
              mergedMap.set(key, { ...item, count: mergedMap.get(key)!.count || item.count || 0 });
            } else if (apiList.length === 0) {
              mergedMap.set(key, item);
            }
          }
        }
        const merged = Array.from(mergedMap.values());
        setAvailableFolders(merged);
        if (merged.length > 0) {
          const hasCurrent = merged.some(f => (f.term || f.name) === selectedFolderTerm);
          if (!hasCurrent || !selectedFolderTerm) {
            const first = merged[0];
            setSelectedFolderTerm(first.term || first.name);
            setAcademicYear(first.academicYear || '');
            setSemesterName(first.semester || '');
          }
        }
      })
      .catch(() => {});
  }, [selectedFolderTerm]);

  const displayedFolders = availableFolders.length > 0 ? availableFolders : storedInitial;

  const selectFolder = (termStr: string) => {
    setSelectedFolderTerm(termStr);
    setIsFolderDropdownOpen(false);

    const match = displayedFolders.find(f => (f.term || f.name) === termStr);
    if (match) {
      setAcademicYear(match.academicYear || '');
      setSemesterName(match.semester || '');
    } else {
      const parts = termStr.split(/[-–]/).map(s => s.trim());
      if (parts.length >= 2) {
        setAcademicYear(parts[0]);
        setSemesterName(parts.slice(1).join(' '));
      } else {
        setAcademicYear(termStr);
        setSemesterName('');
      }
    }

    if (!label.trim()) {
      setLabel(`المستوى الأول – ${termStr}`);
    }
  };

  const term = selectedFolderTerm || (academicYear && semesterName ? `${academicYear}-${semesterName}` : label);
  const finalLabel = label.trim() || `${academicYear} ${semesterName}`.trim() || 'فصل جديد';

  const filteredSubjects = subjects.filter(s => 
    matchArabicSearch([s.code, s.name], searchSubject)
  ).slice(0, 50);

  const isSelected = (s: any) => selectedCourses.some(c => c.courseCode === s.code);

  const toggleSubject = (s: any) => {
    if (isSelected(s)) {
      setSelectedCourses(prev => prev.filter(c => c.courseCode !== s.code));
    } else {
      setSelectedCourses(prev => [...prev, {
        subjectId: s.id,
        courseCode: s.code,
        courseName: s.name,
        crn: '',
        creditHours: s.creditHours
      }]);
    }
  };

  const updateCrn = (code: string, crn: string) => {
    setSelectedCourses(prev => prev.map(c => c.courseCode === code ? { ...c, crn } : c));
  };

  const [isBrowsingCatalog, setIsBrowsingCatalog] = useState(false);
  const [courseTimings, setCourseTimings] = useState<Record<string, ScheduleItem[]>>({});
  const [crnBatchInput, setCrnBatchInput] = useState('');
  const [isFetchingCrn, setIsFetchingCrn] = useState(false);
  const [crnFeedback, setCrnFeedback] = useState<{ type: 'success' | 'warn'; msg: string } | null>(null);

  const handleFetchCrnBatch = async () => {
    const raw = crnBatchInput.trim();
    if (!raw) return;
    setIsFetchingCrn(true);
    setCrnFeedback(null);
    try {
      const crns = raw.split(/[,،\s]+/).map(s => s.trim()).filter(Boolean);
      if (crns.length === 0) return;

      const params = new URLSearchParams({ crns: crns.join(',') });
      if (term) params.set('term', term);
      if (academicYear) params.set('academicYear', academicYear);
      if (semesterName) params.set('semester', semesterName);

      const token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '') : '';
      const res = await fetch(`/api/sections/by-crn?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json().catch(() => ({}));
      const foundSections: any[] = Array.isArray(data?.sections) ? data.sections : [];

      if (foundSections.length === 0) {
        setCrnFeedback({
          type: 'warn',
          msg: `لم يتم العثور على شعب تطابق (${crns.join(', ')}). يمكنك اختيار المواد من القائمة أدناه.`
        });
      } else {
        let addedCount = 0;
        setSelectedCourses(prev => {
          const next = [...prev];
          for (const sec of foundSections) {
            const courseCode = (sec.courseCode || '').trim();
            const crn = String(sec.crn || '').trim();
            const exists = next.some(c => c.courseCode === courseCode || (crn && c.crn === crn));
            if (!exists) {
              const mappedScheds: ScheduleItem[] = [];
              const rawScheds = Array.isArray(sec.schedules) ? sec.schedules : [];
              rawScheds.forEach((sch: any, sIdx: number) => {
                const daysArr = parseScheduleDays(sch);
                const { startTime, endTime } = parseTimeRange(
                  sch.timeRange,
                  sch.startTime || '08:25 am',
                  sch.endTime || '09:15 am'
                );
                mappedScheds.push({
                  id: String(sIdx + 1),
                  days: daysArr.length > 0 ? daysArr : ['الأحد', 'الثلاثاء'],
                  startTime,
                  endTime,
                  classroom: sch.room || sch.building || '',
                  teacher: sec.primaryInstructor || sch.instructor || ''
                });
              });

              const { examDate, examTime } = extractFinalExamInfo(sec);
              next.push({
                subjectId: sec.subjectId,
                courseCode: courseCode,
                courseName: sec.courseTitle || courseCode,
                crn: crn,
                creditHours: sec.creditHours || 3,
                sectionNumber: sec.sectionNumber,
                examDate,
                examTime,
                primaryInstructor: sec.primaryInstructor || (sec.instructors?.[0]?.name) || '',
                instructors: Array.isArray(sec.instructors) && sec.instructors.length > 0
                  ? sec.instructors
                  : (sec.primaryInstructor ? [{ name: sec.primaryInstructor }] : []),
                customSchedule: mappedScheds.length > 0 ? mappedScheds : undefined
              });
              addedCount++;
            }
          }
          return next;
        });

        const missing = crns.filter(c => !foundSections.some(s => String(s.crn) === c));
        let msg = `تم جلب وإضافة ${foundSections.length} مادة بنجاح!`;
        if (missing.length > 0) {
          msg += ` (لم يتم العثور على: ${missing.join(', ')})`;
        }
        setCrnFeedback({ type: 'success', msg });
        setCrnBatchInput('');
      }
    } catch {
      setCrnFeedback({ type: 'warn', msg: 'حدث خطأ أثناء جلب الشعب، يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsFetchingCrn(false);
    }
  };

  const handleSave = () => {
    const finalCourses = selectedCourses.map(c => ({
      ...c,
      customSchedule: courseTimings[c.courseCode] || c.customSchedule
    }));
    onSave({
      id: genId(),
      label: finalLabel,
      academicYear,
      semester: semesterName,
      term,
      courses: finalCourses,
      emoji: emoji || '🎓',
      createdAt: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center" dir="rtl">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="relative w-full sm:max-w-lg bg-white dark:bg-zinc-950 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-zinc-800 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[var(--color-imamu-accent)] uppercase mb-0.5">فصل دراسي جديد</p>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {step === 1 ? 'سمّ فصلك الدراسي' : step === 2 ? 'اختر موادك' : 'تأكيد الخطة'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 transition cursor-pointer">
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1 px-6 pt-3 pb-1 shrink-0">
          {[1, 2, 3].map(s => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-all duration-300 ${s <= step ? 'bg-[var(--color-imamu-brown)]' : 'bg-slate-200 dark:bg-zinc-800'}`} />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          <AnimatePresence mode="wait" initial={false}>

            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }} className="flex flex-col gap-5">
                {/* Main label */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
                    اسم الفصل الدراسي <span className="text-red-400">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(prev => !prev)}
                        className="w-12 h-11 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 flex items-center justify-center text-xl hover:bg-slate-100 dark:hover:bg-zinc-800 hover:border-[var(--color-imamu-accent)] transition cursor-pointer shrink-0 shadow-2xs"
                        title="اختر إيموجي للفصل الدراسي"
                      >
                        <span>{emoji || '🎓'}</span>
                      </button>
                      <EmojiPickerPopover
                        isOpen={showEmojiPicker}
                        onClose={() => setShowEmojiPicker(false)}
                        selectedEmoji={emoji}
                        onSelectEmoji={setEmoji}
                        title="أيقونة الفصل الدراسي"
                      />
                    </div>

                    <input
                      type="text"
                      autoFocus
                      value={label}
                      onChange={e => setLabel(e.target.value)}
                      placeholder="مثال: المستوى الأول، مستواي الثالث..."
                      className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:ring-2 focus:ring-[var(--color-imamu-accent)]/30 focus:border-[var(--color-imamu-accent)] transition"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1.5">سمّه كيفما تريد، هذا الاسم هو ما سيظهر لك في لوحتك وقوائمك.</p>
                </div>

                {/* Section Folder / Term Selector */}
                <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                      <span>الترم الدراسي:</span>
                    </label>
                    <span className="text-[11px] font-bold text-[var(--color-imamu-accent)]">
                      {selectedFolderTerm || 'اختر الترم'}
                    </span>
                  </div>

                  {/* Dropdown Header Trigger */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsFolderDropdownOpen(prev => !prev)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FolderOpen className="w-4 h-4 text-[var(--color-imamu-accent)] shrink-0" />
                        <span className="truncate">
                          {selectedFolderTerm || 'اختر الترم الدراسي المتاح...'}
                        </span>
                        {(() => {
                          const curr = displayedFolders.find(f => (f.term || f.name) === selectedFolderTerm);
                          return curr?.count ? (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-imamu-accent)]/10 text-[var(--color-imamu-accent)] font-bold">
                              {curr.count} شعبة
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isFolderDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Inline Expandable List (Never behind footer or clipped) */}
                    <AnimatePresence>
                      {isFolderDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden mt-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl divide-y divide-slate-100 dark:divide-zinc-800 shadow-sm max-h-56 overflow-y-auto"
                        >
                          {displayedFolders.length > 0 ? (
                            displayedFolders.map(f => {
                              const val = f.term || f.name;
                              const isSel = selectedFolderTerm === val;
                              return (
                                <button
                                  key={val}
                                  type="button"
                                  onClick={() => selectFolder(val)}
                                  className={clsx(
                                    "w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-right transition cursor-pointer",
                                    isSel
                                      ? "bg-[var(--color-imamu-accent)]/10 text-[var(--color-imamu-accent)] font-bold"
                                      : "text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <Folder className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                                    <span>{f.name}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {f.count ? (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 font-sans">
                                        {f.count} شعبة
                                      </span>
                                    ) : null}
                                    {isSel && <Check className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />}
                                  </div>
                                </button>
                              );
                            })
                          ) : (
                            <div className="px-4 py-3 text-xs text-center text-slate-400 dark:text-zinc-500">
                              لا توجد مجلدات شعب متاحة حالياً
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }} className="flex flex-col gap-4">
                {!isBrowsingCatalog ? (
                  <div className="space-y-4">
                    {/* 1. CRN Text Box (Matching AddCourseModal) */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 space-y-3">
                      <div>
                        <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2 mb-1">
                          <span>الرقم المرجعي للشعبة (CRN)</span>
                        </label>
                      </div>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={crnBatchInput}
                            onChange={e => {
                              setCrnBatchInput(e.target.value);
                              if (crnFeedback) setCrnFeedback(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleFetchCrnBatch();
                              }
                            }}
                            placeholder="أدخل الـ CRN (مثال: 10245)"
                            className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-[var(--color-imamu-accent)] focus:ring-1 focus:ring-[var(--color-imamu-accent)] shadow-xs transition text-center sm:text-right"
                            autoFocus
                          />
                        </div>
                        <button
                          type="button"
                          disabled={isFetchingCrn || !crnBatchInput.trim()}
                          onClick={handleFetchCrnBatch}
                          className="px-4 py-2.5 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] disabled:opacity-40 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                        >
                          {isFetchingCrn ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>جلب...</span>
                            </>
                          ) : (
                            <>
                              <Search className="w-4 h-4" />
                              <span>جلب البيانات</span>
                            </>
                          )}
                        </button>
                      </div>

                      {crnFeedback && (
                        <div className={clsx(
                          "p-3 rounded-xl border text-xs flex items-center gap-2",
                          crnFeedback.type === 'success'
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                        )}>
                          {crnFeedback.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                          <span>{crnFeedback.msg}</span>
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="relative flex items-center my-1.5">
                      <div className="flex-grow border-t border-slate-200 dark:border-zinc-800"></div>
                      <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-400 dark:text-zinc-500">أو</span>
                      <div className="flex-grow border-t border-slate-200 dark:border-zinc-800"></div>
                    </div>

                    {/* 2. Catalog Card (Matching AddCourseModal) */}
                    <button
                      type="button"
                      onClick={() => setIsBrowsingCatalog(true)}
                      className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-stone-50/80 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/70 border border-slate-200/80 hover:border-[var(--color-imamu-accent)] dark:border-zinc-800 dark:hover:border-[var(--color-imamu-accent)]/60 transition-all duration-200 flex items-center justify-between gap-3 cursor-pointer group shadow-xs text-right"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-900/60 border border-[var(--color-imamu-accent)]/20 text-[var(--color-imamu-accent)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                          <BookOpen className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[var(--color-imamu-accent)] transition-colors truncate">
                            تصفح واختيار المقرر من الدليل
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                            استعراض قائمة المواد وتحديد المواعيد يدوياً
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-[var(--color-imamu-accent)] shrink-0 pl-1">
                        <span>فتح الدليل</span>
                        <span className="group-hover:-translate-x-1 transition-transform">←</span>
                      </div>
                    </button>
                  </div>
                ) : (
                  /* Catalog Browser Mode (Matching AddCourseModal) */
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <BookOpen className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                        <span>دليل المقررات الجامعية</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsBrowsingCatalog(false)}
                        className="text-xs text-[var(--color-imamu-accent)] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>رجوع للإدخال بالـ CRN</span>
                        <span>←</span>
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        value={searchSubject}
                        onChange={e => setSearchSubject(e.target.value)}
                        placeholder="ابحث برمز المادة أو اسمها في الدليل..."
                        className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[var(--color-imamu-accent)] transition"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[320px] overflow-y-auto pr-1 pl-1">
                      {filteredSubjects.map(s => {
                        const selected = isSelected(s);
                        return (
                          <div
                            key={s.id}
                            onClick={() => toggleSubject(s)}
                            className={clsx(
                              "rounded-2xl p-3.5 text-right flex flex-col justify-between min-h-[120px] transition cursor-pointer select-none border",
                              selected
                                ? "bg-[var(--color-imamu-brown)]/10 border-[var(--color-imamu-accent)] shadow-xs ring-1 ring-[var(--color-imamu-accent)]/50"
                                : "bg-slate-50 dark:bg-zinc-800/40 border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                            )}
                          >
                            <div className="flex items-center justify-between text-xs font-mono font-bold text-[var(--color-imamu-accent)]">
                              <span>{s.code}</span>
                              <span className="text-[10.5px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-zinc-800 text-slate-500 font-sans">
                                {s.creditHours || 3} س
                              </span>
                            </div>

                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-tight my-2">
                              {s.name}
                            </h4>

                            <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center justify-between border-t border-slate-200/60 dark:border-zinc-800 pt-2">
                              <span>{selected ? 'تم تحديد المادة' : 'انقر لتحديد المادة'}</span>
                              {selected && <Check className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />}
                            </div>
                          </div>
                        );
                      })}
                      {filteredSubjects.length === 0 && (
                        <p className="col-span-2 text-center text-xs text-slate-400 py-6">لم يتم العثور على مواد تطابق البحث</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Selected courses preview with CRN */}
                {selectedCourses.length > 0 && (
                  <div className="pt-3 border-t border-slate-200/80 dark:border-zinc-800">
                    <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>المواد المضافة لهذا الفصل ({selectedCourses.length})</span>
                      <span className="text-[10px] text-slate-400 font-normal">يمكنك مراجعة الجدول في الخطوة التالية</span>
                    </p>
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1">
                      {selectedCourses.map(c => (
                        <div
                          key={c.courseCode}
                          className="flex items-center gap-2.5 bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-800 rounded-xl px-3.5 py-2.5"
                        >
                          <span className="text-xs font-bold font-mono text-[var(--color-imamu-accent)] shrink-0">
                            {c.courseCode}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-white flex-1 truncate">
                            {c.courseName}
                          </span>
                          {c.crn ? (
                            <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-lg bg-[var(--color-imamu-accent)]/10 text-[var(--color-imamu-accent)] shrink-0">
                              CRN: {c.crn}
                            </span>
                          ) : (
                            <span className="text-[10.5px] text-slate-400 dark:text-zinc-500 shrink-0">
                              دليل المواد
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => toggleSubject({ code: c.courseCode, name: c.courseName })}
                            className="p-1 text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 rounded-lg transition cursor-pointer shrink-0"
                            title="حذف المادة من القائمة"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }} className="flex flex-col gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">اسم الفصل</p>
                  <p className="text-sm font-bold text-amber-500">{finalLabel}</p>
                  {term && <p className="text-[11px] text-zinc-500 mt-0.5 font-mono">{term}</p>}
                </div>

                {selectedCourses.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs">لم تختر أي مواد، يرجى الرجوع للخطوة السابقة لاختيار المواد</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3.5 max-h-[460px] overflow-y-auto pr-1">
                    <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      المواد المختارة وجدول المحاضرات ({selectedCourses.length})
                    </p>
                    {selectedCourses.map(c => {
                      const isManual = !c.crn;
                      const currentSched = courseTimings[c.courseCode] || c.customSchedule || [{
                        id: '1',
                        days: ['الأحد', 'الثلاثاء'],
                        startTime: '08:25 am',
                        endTime: '09:15 am',
                        classroom: '',
                        teacher: ''
                      }];

                      return (
                        <div key={c.courseCode} className="bg-[#121214] border border-zinc-800 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold font-mono text-amber-500">{c.courseCode}</span>
                              <span className="text-xs font-bold text-white">{c.courseName}</span>
                            </div>
                            {c.crn ? (
                              <span className="text-xs font-mono font-bold bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-lg">
                                CRN: {c.crn}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                                مادة يدوية · حدد جدولها أدناه
                              </span>
                            )}
                          </div>

                          {/* Timing Editor (Image 2 style) for configuring schedule */}
                          <div className="pt-1">
                            <TimingEditor
                              schedules={currentSched}
                              onChange={(nextScheds) => {
                                setCourseTimings(prev => ({ ...prev, [c.courseCode]: nextScheds }));
                                setSelectedCourses(prev => prev.map(item => item.courseCode === c.courseCode ? { ...item, customSchedule: nextScheds } : item));
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/60 shrink-0">
          <button
            type="button"
            onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-900 transition cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
            {step > 1 ? 'السابق' : 'إلغاء'}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !label.trim()}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm"
            >
              التالي
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold transition cursor-pointer shadow-sm"
            >
              <Check className="w-4 h-4" />
              حفظ الفصل
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ─────────────────────────────────────────────
// WeeklySchedule component is imported from ../components/WeeklySchedule
// ─────────────────────────────────────────────


// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────
export function AnaPage() {
  const router = useRouter();
  const { user, dbUser, loading: authLoading, refreshToken } = useAuth();

  // Tab switcher state ('schedule' | 'progress')
  const [activeMainTab, setActiveMainTab] = useState<'schedule' | 'progress'>('schedule');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'progress' || tabParam === 'schedule') {
        setActiveMainTab(tabParam);
      }
    }
  }, []);

  const handleMainTabChange = (tab: 'schedule' | 'progress') => {
    setActiveMainTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'schedule') {
        url.searchParams.delete('tab');
      } else {
        url.searchParams.set('tab', tab);
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  // Instant cache load (SWR pattern)
  const [semesters, setSemesters] = useState<MySemester[]>(() => loadSemesters());
  const [activeSemId, setActiveSemId] = useState<string | null>(() => {
    const activeId = loadActiveSemId();
    const saved = loadSemesters();
    if (activeId && saved.find(s => s.id === activeId)) return activeId;
    return saved[0]?.id || null;
  });
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSemDropdownOpen, setIsSemDropdownOpen] = useState(false);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Plus Action Menu (4 actions) & New Modals
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState(false);
  const [isAddCourseOpen, setIsAddCourseOpen] = useState(false);
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState<CourseEntry | null>(null);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<StudentTask | null>(null);

  const activeSemester = semesters.find(s => s.id === activeSemId) || semesters[0] || null;

  const getToken = useCallback(async () => {
    if (user) return await user.getIdToken();
    return localStorage.getItem('token') || '';
  }, [user]);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  // SWR: Fetch semesters from server and reconcile with local cache
  useEffect(() => {
    if (!user && !dbUser) return;
    let isCancelled = false;

    getToken().then(async (token) => {
      if (!token || isCancelled) return;
      try {
        const res = await fetch('/api/user-semesters', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok || isCancelled) return;
        const data = await res.json();
        const serverSemesters = Array.isArray(data.semesters) ? data.semesters : [];
        const serverActiveId = data.activeSemId;

        if (serverSemesters.length > 0) {
          const dedupedServer = serverSemesters.map((sem: MySemester) => ({
            ...sem,
            courses: dedupeSemesterCourses(sem.courses || [])
          }));
          setSemesters(dedupedServer);
          saveSemesters(dedupedServer);
          const nextActiveId = (serverActiveId && dedupedServer.some((s: MySemester) => s.id === serverActiveId))
            ? serverActiveId
            : (dedupedServer[0]?.id || null);
          setActiveSemId(nextActiveId);
          saveActiveSemId(nextActiveId);
        } else {
          // If server has no semesters yet, upload local cache to server so no data is lost
          const localSaved = loadSemesters();
          if (localSaved.length > 0) {
            const currentActive = loadActiveSemId() || localSaved[0]?.id || null;
            fetch('/api/user-semesters', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                semesters: localSaved,
                activeSemId: currentActive
              })
            }).catch(() => {});
          }
        }
        // Sync tasks from server (independent from semesters)
        if (Array.isArray(data.tasks)) {
          if (data.tasks.length > 0) {
            localStorage.setItem('imamu_student_tasks', JSON.stringify(data.tasks));
            window.dispatchEvent(new Event('imamu_tasks_updated'));
          } else {
            // If server has no tasks yet, push local tasks to server
            const localTasksRaw = localStorage.getItem('imamu_student_tasks');
            if (localTasksRaw) {
              try {
                const localTasks = JSON.parse(localTasksRaw);
                if (Array.isArray(localTasks) && localTasks.length > 0) {
                  fetch('/api/user-tasks', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ tasks: localTasks })
                  }).catch(() => {});
                }
              } catch {}
            }
          }
        }
      } catch (err) {
        console.error("[SWR Semesters Sync Error]", err);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [user, dbUser, getToken]);

  // Subjects
  const { data: subjectsData } = useSWR(user ? '/api/subjects' : null, async (url: string) => {
    const token = await getToken();
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    return res.ok ? res.json() : [];
  });
  useEffect(() => { if (Array.isArray(subjectsData)) setSubjects(subjectsData); }, [subjectsData]);

  // Sections by CRN (works for both logged in users and guests)
  useEffect(() => {
    if (!activeSemester) { setSections([]); return; }
    const crns = activeSemester.courses.map(c => c.crn).filter(Boolean);
    if (!crns.length) { setSections([]); return; }
    setLoadingSections(true);
    getToken().then(token => {
      const params = new URLSearchParams({ crns: crns.join(',') });
      if (activeSemester.term) params.set('term', activeSemester.term);
      if (activeSemester.academicYear) params.set('academicYear', activeSemester.academicYear);
      if (activeSemester.semester) params.set('semester', activeSemester.semester);
      fetch(`/api/sections/by-crn?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
        .then(r => r.ok ? r.json() : { sections: [] })
        .then(d => setSections(d.sections || []))
        .catch(() => setSections([]))
        .finally(() => setLoadingSections(false));
    });
  }, [activeSemester, getToken]);

  // Merge sections from API with customSchedule from activeSemester.courses
  const effectiveSections: SectionData[] = useMemo(() => {
    const list: SectionData[] = [...sections];
    if (activeSemester?.courses) {
      activeSemester.courses.forEach((c, idx) => {
        const existingIdx = list.findIndex(s => (c.crn && s.crn === c.crn) || s.courseCode === c.courseCode);
        if (existingIdx >= 0 && c.color) {
          list[existingIdx] = {
            ...list[existingIdx],
            color: c.color
          };
        }

        if (c.customSchedule && c.customSchedule.length > 0) {
          const mappedSchedules = c.customSchedule.map(cs => ({
            days: cs.days,
            startTime: cs.startTime,
            endTime: cs.endTime,
            timeRange: `${cs.startTime} - ${cs.endTime}`,
            room: cs.classroom,
            building: ''
          }));
          const teacher = c.customSchedule.find(cs => cs.teacher)?.teacher;

          if (existingIdx >= 0) {
            const isLegacyDummySchedule = c.customSchedule.length === 1 &&
              c.customSchedule[0].startTime === '10:15 am' &&
              c.customSchedule[0].endTime === '11:55 am';

            const dbSchedules = list[existingIdx].schedules;
            const useDbSchedules = isLegacyDummySchedule && Array.isArray(dbSchedules) && dbSchedules.length > 0;

            list[existingIdx] = {
              ...list[existingIdx],
              schedules: useDbSchedules ? dbSchedules : mappedSchedules,
              primaryInstructor: c.primaryInstructor || teacher || list[existingIdx].primaryInstructor,
              instructors: (c.instructors && c.instructors.length > 0) ? c.instructors : list[existingIdx].instructors,
              whatsappLink: c.whatsappLink || list[existingIdx].whatsappLink,
              sectionNumber: c.sectionNumber || list[existingIdx].sectionNumber,
              color: c.color || list[existingIdx].color
            };
          } else {
            list.push({
              id: 90000 + idx,
              crn: c.crn || '',
              courseCode: c.courseCode,
              courseTitle: c.courseName,
              sectionNumber: c.sectionNumber,
              primaryInstructor: c.primaryInstructor || teacher || '',
              instructors: (c.instructors && c.instructors.length > 0) ? c.instructors : (teacher ? [{ name: teacher }] : []),
              schedules: mappedSchedules,
              whatsappLink: c.whatsappLink,
              color: c.color
            });
          }
        }
      });
    }
    return list;
  }, [sections, activeSemester]);

  // Dropdown outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsSemDropdownOpen(false);
    };
    if (isSemDropdownOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isSemDropdownOpen]);

  const syncSemesters = useCallback((next: MySemester[], targetActiveId?: string | null) => {
    saveSemesters(next);
    setSemesters(next);
    if (targetActiveId !== undefined) {
      setActiveSemId(targetActiveId);
      saveActiveSemId(targetActiveId);
    }
    getToken().then(token => {
      if (!token) return;
      const curActiveId = targetActiveId !== undefined ? targetActiveId : (loadActiveSemId() || (next[0]?.id ?? null));
      fetch('/api/user-semesters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          semesters: next,
          activeSemId: curActiveId
        })
      }).catch(err => console.error('[Sync Semesters Error]', err));
    });
  }, [getToken]);

  const syncExam = (course: CourseEntry, allCourses?: CourseEntry[]) => {
    syncExamToStudentTasks(course, allCourses || activeSemester?.courses, effectiveSections);
  };

  useEffect(() => {
    if (!activeSemester?.courses?.length) return;
    activeSemester.courses.forEach(c => syncExam(c, activeSemester.courses));
  }, [activeSemester?.id, activeSemester?.courses, effectiveSections]);

  const addSemester = (sem: MySemester) => {
    const next = [...semesters, sem];
    syncSemesters(next, sem.id);
    sem.courses.forEach(c => syncExam(c, sem.courses));
  };

  const selectSemester = (id: string) => {
    setActiveSemId(id);
    saveActiveSemId(id);
    setIsSemDropdownOpen(false);
    getToken().then(token => {
      if (!token) return;
      fetch('/api/user-semesters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ activeSemId: id })
      }).catch(() => {});
    });
  };

  const deleteSemester = (id: string) => {
    if (!confirm('حذف هذا الفصل؟')) return;
    const next = semesters.filter(s => s.id !== id);
    const nid = activeSemId === id ? (next[0]?.id || null) : activeSemId;
    syncSemesters(next, nid);
    setIsSemDropdownOpen(false);
  };

  const renameSemester = (id: string, newLabel: string) => {
    const next = semesters.map(s => s.id === id ? { ...s, label: newLabel } : s);
    syncSemesters(next);
  };

  const updateSemesterDetails = (id: string, newLabel: string, newCourses: CourseEntry[], newEmoji?: string) => {
    const dedupedCourses = dedupeSemesterCourses(newCourses);
    const next = semesters.map(s => s.id === id ? { ...s, label: newLabel, courses: dedupedCourses, emoji: newEmoji ?? s.emoji } : s);
    syncSemesters(next);
    dedupedCourses.forEach(c => syncExam(c, dedupedCourses));
  };

  const handleAddCourseToSemester = (semesterId: string, course: CourseEntry, originalCourseCode?: string) => {
    syncExam(course);
    const next = semesters.map(s => {
      if (s.id !== semesterId) return s;
      const existingIdx = s.courses.findIndex(c => isSameCourseEntry(c, course, originalCourseCode));
      const updatedCourses = existingIdx >= 0
        ? s.courses.map((c, i) => i === existingIdx ? mergeCourseEntries(c, course) : c)
        : [...s.courses, course];
      return { ...s, courses: dedupeSemesterCourses(updatedCourses) };
    });
    syncSemesters(next, semesterId);
  };

  const handleDeleteCourseFromSemester = (semesterId: string, courseCode: string, crn?: string) => {
    const next = semesters.map(s => {
      if (s.id !== semesterId) return s;
      const updatedCourses = s.courses.filter(c => {
        if (crn && c.crn) {
          return c.crn !== crn && c.courseCode !== courseCode;
        }
        return c.courseCode !== courseCode;
      });
      return { ...s, courses: updatedCourses };
    });
    syncSemesters(next);
  };

  const syncTasksToServer = useCallback((tasksToSync: StudentTask[]) => {
    getToken().then(token => {
      if (!token) return;
      fetch('/api/user-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ tasks: tasksToSync })
      }).catch(err => console.error('[Sync Tasks Error]', err));
    });
  }, [getToken]);

  useEffect(() => {
    let timer: any = null;
    const handleTasksSync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        try {
          const raw = localStorage.getItem('imamu_student_tasks');
          if (raw) {
            syncTasksToServer(JSON.parse(raw));
          }
        } catch {}
      }, 500);
    };
    window.addEventListener('imamu_tasks_updated', handleTasksSync);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('imamu_tasks_updated', handleTasksSync);
    };
  }, [syncTasksToServer]);

  const handleSaveNewTask = (taskData: Omit<StudentTask, 'id' | 'completed' | 'createdAt'>) => {
    try {
      const raw = localStorage.getItem('imamu_student_tasks');
      const prev: StudentTask[] = raw ? JSON.parse(raw) : [];
      if (taskToEdit) {
        const updated = prev.map(t => t.id === taskToEdit.id ? { ...t, ...taskData } : t);
        localStorage.setItem('imamu_student_tasks', JSON.stringify(updated));
        const updatedTask = updated.find(t => t.id === taskToEdit.id);
        if (updatedTask) syncTaskToCalendar();
        setTaskToEdit(null);
      } else {
        const newTask: StudentTask = {
          id: Date.now().toString(),
          ...taskData,
          completed: false,
          createdAt: new Date().toISOString()
        };
        const updated = [newTask, ...prev];
        localStorage.setItem('imamu_student_tasks', JSON.stringify(updated));
        syncTaskToCalendar();
      }
      window.dispatchEvent(new Event('imamu_tasks_updated'));
      window.dispatchEvent(new Event('storage'));
    } catch {}
  };

  // Events (for sidebar)
  const { data: eventsData } = useSWR<any[]>('/api/events');
  const events = Array.isArray(eventsData) ? eventsData : [];

  if (authLoading) return (
    <div className="flex flex-col flex-1 items-center justify-center min-h-[60vh]">
      <Loader2 className="w-7 h-7 animate-spin text-[var(--color-imamu-accent)] mb-3" />
      <p className="text-xs text-slate-400 dark:text-zinc-500">جارٍ التحميل...</p>
    </div>
  );
  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 w-full pb-28 px-4 sm:px-6 lg:px-8 pt-8 relative max-w-7xl mx-auto min-h-screen text-right" dir="rtl">

      {/* ─── Header ─── */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs sm:text-sm font-semibold tracking-widest text-[var(--color-imamu-accent)] uppercase mb-2 block">
            لوحتي الأكاديمية
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900 dark:text-white mb-2">
            مرحباً، {dbUser?.userName || 'طالب'} 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl">
            {activeMainTab === 'schedule'
              ? 'جدولك الشخصي، مواد فصلك، أسماء أساتذتك، وكل ما تحتاجه في مكان واحد.'
              : 'تتبّع خطتك الدراسية، المواد المنجزة، وحساب الساعات المتبقية للتخرج.'}
          </p>
        </div>

        {/* Semester selector & Speed Dial (shown when schedule tab is active) */}
        {activeMainTab === 'schedule' && (
          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsSemDropdownOpen(p => !p)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition shadow-xs cursor-pointer max-w-[220px]"
              >
                <BookOpen className="w-4 h-4 text-[var(--color-imamu-accent)] shrink-0" />
                <span className="truncate">{activeSemester ? activeSemester.label : 'اختر الفصل'}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isSemDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isSemDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.97 }}
                    transition={{ duration: 0.14 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden py-1.5"
                    dir="rtl"
                  >
                    {semesters.length === 0 ? (
                      <p className="text-center text-xs text-slate-400 dark:text-zinc-500 py-4">لا توجد فصول بعد</p>
                    ) : semesters.map(sem => (
                      <div key={sem.id} className={`flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-zinc-900 transition group ${sem.id === activeSemId ? 'bg-[var(--color-imamu-brown)]/5' : ''}`}>
                        <button type="button" onClick={() => selectSemester(sem.id)} className="flex-1 text-right text-xs font-semibold text-slate-700 dark:text-zinc-300 truncate cursor-pointer">
                          {sem.id === activeSemId && <Check className="w-3 h-3 text-[var(--color-imamu-accent)] inline ml-1.5" />}
                          {sem.label}
                        </button>
                      </div>
                    ))}
                    <div className="border-t border-slate-100 dark:border-zinc-800 mt-1 pt-1">
                      <button type="button" onClick={() => { setIsSemDropdownOpen(false); setIsWizardOpen(true); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-[var(--color-imamu-accent)] hover:bg-[var(--color-imamu-brown)]/5 transition cursor-pointer">
                        <Plus className="w-4 h-4" />
                        إضافة فصل جديد
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Radial Speed-Dial Plus Menu (3 orbiting actions) */}
            <SpeedDialPlusMenu
              isOpen={isPlusMenuOpen}
              onToggle={() => setIsPlusMenuOpen(!isPlusMenuOpen)}
              onClose={() => setIsPlusMenuOpen(false)}
              onAddCourse={() => {
                setSelectedCourseForDetails(null);
                setIsAddCourseOpen(true);
              }}
              onAddSemester={() => setIsWizardOpen(true)}
              onAddTask={() => {
                setTaskToEdit(null);
                setIsNewTaskModalOpen(true);
              }}
            />
          </div>
        )}
      </div>

      {/* ─── Main Tabs Switcher ─── */}
      <div className="relative flex items-center gap-1 border-b border-slate-200 dark:border-zinc-800/80 mb-8 pb-0" dir="rtl">
        <button
          type="button"
          onClick={() => handleMainTabChange('schedule')}
          className={`relative pb-3.5 px-4 font-bold transition-colors duration-200 text-sm flex items-center gap-2 select-none cursor-pointer ${
            activeMainTab === 'schedule'
              ? 'text-[var(--color-imamu-accent)]'
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          <Calendar className={`w-4.5 h-4.5 transition-colors ${activeMainTab === 'schedule' ? 'text-[var(--color-imamu-accent)]' : 'text-slate-400 dark:text-zinc-500'}`} />
          <span>الجدول الدراسي</span>
          {activeMainTab === 'schedule' && (
            <motion.div
              layoutId="anaActiveTabUnderline"
              className="absolute bottom-0 right-0 left-0 h-0.5 bg-[var(--color-imamu-brown)] dark:bg-[var(--color-imamu-brown)] rounded-full shadow-xs shadow-[var(--color-imamu-brown)/20]"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => handleMainTabChange('progress')}
          className={`relative pb-3.5 px-4 font-bold transition-colors duration-200 text-sm flex items-center gap-2 select-none cursor-pointer ${
            activeMainTab === 'progress'
              ? 'text-[var(--color-imamu-accent)]'
              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
          }`}
        >
          <GraduationCap className={`w-4.5 h-4.5 transition-colors ${activeMainTab === 'progress' ? 'text-[var(--color-imamu-accent)]' : 'text-slate-400 dark:text-zinc-500'}`} />
          <span>التقدم والمقررات</span>
          {activeMainTab === 'progress' && (
            <motion.div
              layoutId="anaActiveTabUnderline"
              className="absolute bottom-0 right-0 left-0 h-0.5 bg-[var(--color-imamu-brown)] dark:bg-[var(--color-imamu-brown)] rounded-full shadow-xs shadow-[var(--color-imamu-brown)/20]"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          )}
        </button>
      </div>

      {/* ─── Main Content ─── */}
      {activeMainTab === 'schedule' ? (
        <div className="flex flex-col md:flex-row gap-6 items-start w-full">
          {/* RIGHT: main content (Schedule & Courses) — primary focus */}
          <div className="flex-1 min-w-0 w-full order-1">
            {!activeSemester ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[var(--color-imamu-brown)]/10 border border-[var(--color-imamu-brown)]/20 flex items-center justify-center">
                  <GraduationCap className="w-8 h-8 text-[var(--color-imamu-accent)]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">أضف فصلك الدراسي الأول</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-xs mx-auto">
                    انقر على زر ＋ لإضافة فصل دراسي، اختيار موادك، وإدخال رقم الـ CRN.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-sm font-bold transition shadow-md cursor-pointer"
                >
                  <Plus className="w-4.5 h-4.5" />
                  أضف فصلاً دراسياً
                </button>
              </div>
            ) : (
              <>
                {/* Weekly schedule */}
                <WeeklySchedule sections={effectiveSections} />
              </>
            )}
          </div>

          <div className="w-full md:w-96 lg:w-[26rem] shrink-0 order-2">
            <SidebarInsights
              events={events}
              activeSemester={activeSemester}
              dbUser={dbUser}
              effectiveSections={effectiveSections}
              onOpenCourseDetails={(c) => {
                const matchingSec = effectiveSections?.find(s =>
                  (c.crn && s.crn && String(s.crn) === String(c.crn)) ||
                  (c.courseCode && s.courseCode && s.courseCode === c.courseCode)
                );
                const enriched: CourseEntry = matchingSec ? {
                  ...c,
                  primaryInstructor: (matchingSec as any).primaryInstructor || (matchingSec as any).instructor || c.primaryInstructor,
                  instructors: (Array.isArray((matchingSec as any).instructors) && (matchingSec as any).instructors.length > 0)
                    ? (matchingSec as any).instructors
                    : c.instructors,
                  sectionNumber: matchingSec.sectionNumber || c.sectionNumber,
                  customSchedule: (c.customSchedule && c.customSchedule.length > 0)
                    ? c.customSchedule
                    : (matchingSec.schedules || []).map((s: any, sIdx: number) => ({
                        id: String(sIdx + 1),
                        days: Array.isArray(s.days) ? s.days : (s.days ? [String(s.days)] : ['الأحد']),
                        startTime: s.startTime || '08:25 am',
                        endTime: s.endTime || '09:15 am',
                        classroom: s.room || s.classroom || s.building || '',
                        teacher: s.instructor || (matchingSec as any).primaryInstructor || ''
                      }))
                } : c;
                setSelectedCourseForDetails(enriched);
                setIsAddCourseOpen(true);
              }}
              onOpenNewTaskModal={() => {
                setTaskToEdit(null);
                setIsNewTaskModalOpen(true);
              }}
              onEditTask={(task) => {
                setTaskToEdit(task);
                setIsNewTaskModalOpen(true);
              }}
              onRename={(newLabel) => activeSemester && renameSemester(activeSemester.id, newLabel)}
              onUpdateSemester={(newLabel, newCourses, newEmoji) => activeSemester && updateSemesterDetails(activeSemester.id, newLabel, newCourses, newEmoji)}
              onDeleteSemester={deleteSemester}
              onOpenNewSemesterModal={() => setIsWizardOpen(true)}
              subjects={subjects}
            />
          </div>
        </div>
      ) : (
        <AcademicProgressTab
          user={user}
          dbUser={dbUser}
          subjects={subjects}
          refreshToken={refreshToken}
        />
      )}

      {/* Modals */}
      <AnimatePresence>
        {isWizardOpen && (
          <SemesterWizard
            onClose={() => setIsWizardOpen(false)}
            onSave={addSemester}
            subjects={subjects}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isAddCourseOpen && (
          <AddCourseModal
            isOpen={isAddCourseOpen}
            onClose={() => {
              setIsAddCourseOpen(false);
              setSelectedCourseForDetails(null);
            }}
            semesters={semesters}
            activeSemId={activeSemId}
            initialCourse={selectedCourseForDetails}
            onAddCourseToSemester={handleAddCourseToSemester}
            onDeleteCourseFromSemester={handleDeleteCourseFromSemester}
            onOpenCreateSemester={() => setIsWizardOpen(true)}
            allSubjects={subjects}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isNewTaskModalOpen && (
          <NewTaskModal
            isOpen={isNewTaskModalOpen}
            onClose={() => {
              setIsNewTaskModalOpen(false);
              setTaskToEdit(null);
            }}
            onSaveTask={handleSaveNewTask}
            courses={(activeSemester?.courses || []).map(c => {
              const secIdx = effectiveSections?.findIndex(s =>
                (c.crn && s.crn && String(s.crn) === String(c.crn)) ||
                (c.courseCode && s.courseCode && s.courseCode === c.courseCode) ||
                (c.courseName && s.courseTitle && (s.courseTitle === c.courseName || s.courseTitle.includes(c.courseName) || c.courseName.includes(s.courseTitle)))
              ) ?? -1;
              const color = secIdx >= 0
                ? COURSE_HEX_COLORS[secIdx % COURSE_HEX_COLORS.length]
                : getCourseColor(c.courseCode, activeSemester?.courses);
              return { ...c, color };
            })}
            taskToEdit={taskToEdit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
