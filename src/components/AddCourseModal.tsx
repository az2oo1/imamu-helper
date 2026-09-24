'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import clsx from 'clsx';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import {
  X,
  Sparkles,
  BookOpen,
  Calendar,
  Clock,
  User,
  Mail,
  Copy,
  Check,
  Search,
  ChevronDown,
  Loader2,
  Plus,
  AlertCircle,
  GraduationCap,
  ExternalLink,
  Users,
  Video,
  FileText,
  MapPin,
  Edit3,
  Trash2,
  Folder,
  Tag,
  ArrowRight,
  ArrowLeft,
  Pencil,
  Palette,
  RefreshCw,
  CheckSquare,
  Square,
  MoreVertical
} from 'lucide-react';
import { WhatsappIcon } from './WhatsappIcon';
import { TimingEditor, ScheduleItem } from './TimingEditor';
import {
  parseScheduleDays,
  parseTimeRange,
  formatTo12Hour,
  formatScheduleDaysDisplay,
  DAY_MAP_AR,
  extractFinalExamInfo,
  COURSE_COLOR_OPTIONS
} from '../lib/schedule-utils';
import { getCourseColor } from '../lib/task-utils';
import { parseResourceUrl, parseAllResourceLinks, isWhatsappUrl, decodeHtmlEntities } from '../lib/url-utils';

export interface CourseEntry {
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

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesters: { id: string; label: string; term?: string; academicYear?: string; semester?: string; courses?: CourseEntry[] }[];
  activeSemId: string | null;
  initialCourse?: CourseEntry | null;
  onAddCourseToSemester: (semesterId: string, course: CourseEntry, originalCourseCode?: string) => void;
  onDeleteCourseFromSemester?: (semesterId: string, courseCode: string, crn?: string) => void;
  onOpenCreateSemester: () => void;
  allSubjects?: any[];
}

let globalTeachersCache: any[] | null = null;

export function AddCourseModal({
  isOpen,
  onClose,
  semesters,
  activeSemId,
  initialCourse,
  onAddCourseToSemester,
  onDeleteCourseFromSemester,
  onOpenCreateSemester,
  allSubjects = []
}: AddCourseModalProps) {
  const [selectedSemId, setSelectedSemId] = useState<string>(activeSemId || semesters[0]?.id || '');

  // Navigation flow state
  const [isBrowsingCatalog, setIsBrowsingCatalog] = useState(false);

  // CRN State
  const [crnInput, setCrnInput] = useState('');
  const [isFetchingCrn, setIsFetchingCrn] = useState(false);
  const [crnError, setCrnError] = useState<string | null>(null);
  const [fetchedSection, setFetchedSection] = useState<any | null>(null);

  // Full Course Details from API (for tabs: tutorials, files)
  const [courseDetails, setCourseDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Active Tab for Fetched Course View
  const [activeTab, setActiveTab] = useState<'overview' | 'tutorials' | 'files'>('overview');

  // Timing Editor State for CRN view
  const [isEditingTimings, setIsEditingTimings] = useState(false);
  const [customSchedules, setCustomSchedules] = useState<ScheduleItem[]>([]);

  // WhatsApp Link Management for CRN view
  const [customWaLink, setCustomWaLink] = useState('');
  const [isEditingWaLink, setIsEditingWaLink] = useState(false);
  const [waLinkInput, setWaLinkInput] = useState('');

  // Email Copy State
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Instructors state & Teachers DB search for course
  const [courseInstructors, setCourseInstructors] = useState<{ name: string; email?: string; isPrimary?: boolean }[]>([]);
  const [isSearchingTeachers, setIsSearchingTeachers] = useState(false);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [dbTeachers, setDbTeachers] = useState<any[]>(() => globalTeachersCache || []);
  const [loadingDbTeachers, setLoadingDbTeachers] = useState(false);
  const [isEditingInstructors, setIsEditingInstructors] = useState(false);

  // Fetch teachers from DB once and cache globally for instant search
  useEffect(() => {
    if (!isSearchingTeachers && !isEditingInstructors) return;
    if (globalTeachersCache && globalTeachersCache.length > 0) {
      if (dbTeachers.length === 0) setDbTeachers(globalTeachersCache);
      return;
    }
    let isCancelled = false;
    setLoadingDbTeachers(true);
    fetch('/api/teachers')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!isCancelled && data?.teachers) {
          globalTeachersCache = data.teachers;
          setDbTeachers(data.teachers);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setLoadingDbTeachers(false);
      });
    return () => { isCancelled = true; };
  }, [isSearchingTeachers, isEditingInstructors, dbTeachers.length]);

  // Instant in-memory filter as user types (0ms lag, no network roundtrips)
  const filteredDbTeachers = useMemo(() => {
    const q = teacherSearchQuery.trim().toLowerCase();
    if (!q) return dbTeachers.slice(0, 15);
    return dbTeachers
      .filter(t =>
        t.name?.toLowerCase().includes(q) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (Array.isArray(t.courses) && t.courses.some((c: any) =>
          c.courseCode?.toLowerCase().includes(q) ||
          c.courseTitle?.toLowerCase().includes(q)
        ))
      )
      .slice(0, 25);
  }, [dbTeachers, teacherSearchQuery]);

  const handleAddTeacher = (teacher: { name: string; email?: string }) => {
    if (courseInstructors.some(t => t.name.toLowerCase() === teacher.name.toLowerCase())) {
      setIsSearchingTeachers(false);
      return;
    }
    const isFirst = courseInstructors.length === 0;
    const next = [...courseInstructors, { name: teacher.name, email: teacher.email, isPrimary: isFirst }];
    setCourseInstructors(next);
    setHasUserEdited(true);
    setIsSearchingTeachers(false);
    setTeacherSearchQuery('');
  };

  const handleRemoveTeacher = (idx: number) => {
    const next = courseInstructors.filter((_, i) => i !== idx);
    if (next.length > 0 && !next.some(t => t.isPrimary)) {
      next[0].isPrimary = true;
    }
    setCourseInstructors(next);
    setHasUserEdited(true);
  };

  // Manual Mode State (after selecting a course from catalog)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<any | null>(null);
  const [manualSchedules, setManualSchedules] = useState<ScheduleItem[]>([
    {
      id: '1',
      days: ['الأحد', 'الثلاثاء'],
      startTime: '08:25 am',
      endTime: '09:15 am',
      classroom: '',
      teacher: ''
    }
  ]);
  const [manualWaLink, setManualWaLink] = useState('');

  // Course Custom Color State
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);

  // Track if user actually edited any data (timings, whatsapp, color)
  const [hasUserEdited, setHasUserEdited] = useState(false);

  // Course update comparison & sync state
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [courseUpdateDiff, setCourseUpdateDiff] = useState<{
    crn: string;
    courseCode: string;
    courseTitle: string;
    items: Array<{
      key: string;
      title: string;
      iconType: 'user' | 'clock' | 'map-pin' | 'users' | 'calendar';
      currentDisplay: string;
      newDisplay: string;
      currentSchedules?: ScheduleItem[];
      newSchedules?: ScheduleItem[];
      applyData: any;
    }>;
    rawLatestSection: any;
  } | null>(null);
  const [selectedDiffKeys, setSelectedDiffKeys] = useState<Record<string, boolean>>({});
  const [updateNoticeMessage, setUpdateNoticeMessage] = useState<string | null>(null);
  const [updateSuccessMessage, setUpdateSuccessMessage] = useState<string | null>(null);

  // Dynamic Content Height Animation (Matching CourseDetailsModal craftsmanship)
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;
    const element = contentRef.current;
    const updateHeight = () => {
      if (element) {
        const fullHeight = element.scrollHeight;
        const maxHeight = window.innerHeight * 0.85 - 144;
        setContentHeight(Math.min(fullHeight, maxHeight));
      }
    };

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    updateHeight();

    window.addEventListener('resize', updateHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [
    isBrowsingCatalog,
    fetchedSection,
    selectedSubject,
    activeTab,
    isEditingTimings,
    isEditingWaLink,
    loadingDetails,
    crnError
  ]);

  // Sync selectedSemId with activeSemId
  useEffect(() => {
    if (activeSemId && semesters.some(s => s.id === activeSemId)) {
      setSelectedSemId(activeSemId);
    } else if (semesters.length > 0 && !selectedSemId) {
      setSelectedSemId(semesters[0].id);
    }
  }, [activeSemId, semesters, selectedSemId]);

  // Handle initialCourse when passed (e.g. opened via three dots on a registered course)
  useEffect(() => {
    if (!isOpen) return;

    if (initialCourse) {
      setIsBrowsingCatalog(false);
      setCrnError(null);
      setActiveTab('overview');
      setIsEditingTimings(false);
      setIsEditingWaLink(false);
      setSelectedColor(initialCourse.color || '');
      setIsColorPickerOpen(false);
      setHasUserEdited(false);

      if (initialCourse.crn) {
        setCrnInput(initialCourse.crn);
        setCustomWaLink(initialCourse.whatsappLink || '');
        setWaLinkInput(initialCourse.whatsappLink || '');

        const fallbackSchedules = initialCourse.customSchedule && initialCourse.customSchedule.length > 0
          ? initialCourse.customSchedule
          : [];
        setCustomSchedules(fallbackSchedules);

        const teacherFromSched = fallbackSchedules.find(fs => fs.teacher)?.teacher;
        const initialPrimary = initialCourse.primaryInstructor || teacherFromSched;
        let initialInstructors = initialCourse.instructors;
        if (typeof initialInstructors === 'string') {
          try {
            initialInstructors = JSON.parse(initialInstructors);
          } catch (_) {}
        }
        if (!Array.isArray(initialInstructors) || initialInstructors.length === 0) {
          if (initialPrimary && initialPrimary !== 'غير محدد') {
            initialInstructors = [{ name: initialPrimary, isPrimary: true }];
          } else {
            initialInstructors = [];
          }
        }
        setCourseInstructors(initialInstructors);

        const fallbackSec: any = {
          crn: initialCourse.crn,
          courseCode: initialCourse.courseCode,
          courseTitle: initialCourse.courseName,
          creditHours: initialCourse.creditHours || 3,
          sectionNumber: initialCourse.sectionNumber,
          whatsappLink: initialCourse.whatsappLink || '',
          primaryInstructor: initialPrimary,
          instructors: initialInstructors,
          schedules: fallbackSchedules.map(fs => ({
            days: fs.days,
            startTime: fs.startTime,
            endTime: fs.endTime,
            room: fs.classroom,
            instructor: fs.teacher || initialPrimary
          }))
        };
        setFetchedSection(fallbackSec);

        // Fetch full section from server to enrich details (instructors, emails, files, etc.)
        const activeSem = semesters.find(s => s.id === selectedSemId);
        const params = new URLSearchParams({ crns: initialCourse.crn });
        if (activeSem?.term) params.set('term', activeSem.term);
        if (activeSem?.academicYear) params.set('academicYear', activeSem.academicYear);
        if (activeSem?.semester) params.set('semester', activeSem.semester);

        setIsFetchingCrn(true);
        fetch(`/api/sections/by-crn?${params}`)
          .then(res => (res.ok ? res.json() : null))
          .then(async data => {
            let found = Array.isArray(data?.sections) && data.sections.length > 0 ? data.sections[0] : null;
            if (!found) {
              try {
                const fallbackRes = await fetch(`/api/sections/by-crn?crns=${encodeURIComponent(initialCourse.crn)}`);
                if (fallbackRes.ok) {
                  const fallbackData = await fallbackRes.json();
                  if (Array.isArray(fallbackData?.sections) && fallbackData.sections.length > 0) {
                    found = fallbackData.sections[0];
                  }
                }
              } catch (_) {}
            }
            if (found) {
              let fetchedInsts: any[] = [];
              if (Array.isArray(found.instructors) && found.instructors.length > 0) {
                fetchedInsts = found.instructors;
              } else if (found.primaryInstructor && found.primaryInstructor !== 'غير محدد') {
                fetchedInsts = [{ name: found.primaryInstructor, email: found.primaryInstructorEmail, isPrimary: true }];
              }
              if (initialInstructors.length === 0 && fetchedInsts.length > 0) {
                setCourseInstructors(fetchedInsts);
              }

              setFetchedSection((prev: any) => ({
                ...prev,
                ...found,
                primaryInstructor: found.primaryInstructor || prev?.primaryInstructor,
                instructors: (Array.isArray(found.instructors) && found.instructors.length > 0) ? found.instructors : prev?.instructors,
                whatsappLink: initialCourse.whatsappLink || found.whatsappLink || '',
                creditHours: initialCourse.creditHours || found.creditHours || 3,
                sectionNumber: initialCourse.sectionNumber || found.sectionNumber
              }));

              if (initialCourse.customSchedule && initialCourse.customSchedule.length > 0) {
                setCustomSchedules(initialCourse.customSchedule);
              } else if (Array.isArray(found.schedules) && found.schedules.length > 0) {
                const convertedSchedules: ScheduleItem[] = [];
                const seenSched = new Set<string>();
                found.schedules.forEach((sch: any) => {
                  const daysArr = parseScheduleDays(sch);
                  const { startTime, endTime } = parseTimeRange(
                    sch.timeRange,
                    sch.startTime || '08:25 am',
                    sch.endTime || '09:15 am'
                  );
                  const classroom = sch.room || sch.building || '';
                  const key = `${daysArr.slice().sort().join(',')}_${startTime}_${endTime}_${classroom}`;
                  if (seenSched.has(key)) return;
                  seenSched.add(key);

                  convertedSchedules.push({
                    id: String(convertedSchedules.length + 1),
                    days: daysArr.length > 0 ? daysArr : ['الأحد', 'الثلاثاء'],
                    startTime,
                    endTime,
                    classroom,
                    teacher: found.primaryInstructor || sch.instructor || ''
                  });
                });
                if (convertedSchedules.length > 0) {
                  setCustomSchedules(convertedSchedules);
                }
              }
            }
          })
          .catch(() => {})
          .finally(() => {
            setIsFetchingCrn(false);
          });
      } else {
        const foundSub = allSubjects.find(s => s.code === initialCourse.courseCode || s.id === initialCourse.subjectId);
        setSelectedSubject(foundSub || {
          id: initialCourse.subjectId,
          code: initialCourse.courseCode,
          name: initialCourse.courseName,
          creditHours: initialCourse.creditHours || 3
        });
        if (initialCourse.customSchedule && initialCourse.customSchedule.length > 0) {
          setManualSchedules(initialCourse.customSchedule);
        }
        if (initialCourse.whatsappLink) {
          setManualWaLink(initialCourse.whatsappLink);
        }
      }
    }
  }, [isOpen, initialCourse]);

  // When a section is fetched, load course details (sections, tutorials, files) from API
  useEffect(() => {
    if (!fetchedSection?.courseCode) return;
    let cancelled = false;
    setLoadingDetails(true);

    const code = fetchedSection.courseCode;

    // Fetch details (resources, tutorials, files)
    fetch(`/api/subjects/${encodeURIComponent(code)}/details`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled && data?.course) {
          setCourseDetails(data.course);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingDetails(false);
      });



    return () => {
      cancelled = true;
    };
  }, [fetchedSection?.courseCode]);

  // Reset modal state on close
  const handleModalClose = () => {
    setFetchedSection(null);
    setSelectedSubject(null);
    setIsBrowsingCatalog(false);
    setCrnInput('');
    setCrnError(null);
    setIsEditingTimings(false);
    setIsEditingWaLink(false);
    setActiveTab('overview');
    setSelectedColor('');
    setIsColorPickerOpen(false);
    setHasUserEdited(false);
    setCourseInstructors([]);
    setIsSearchingTeachers(false);
    setTeacherSearchQuery('');
    setCourseUpdateDiff(null);
    setSelectedDiffKeys({});
    setUpdateNoticeMessage(null);
    setUpdateSuccessMessage(null);
    onClose();
  };

  if (!isOpen) return null;

  // ─────────────────────────────────────────────
  // 1. Empty State: No Semesters Available
  // ─────────────────────────────────────────────
  if (semesters.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir="rtl">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm cursor-pointer"
          onClick={handleModalClose}
        />
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="relative bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl text-center space-y-5 z-10"
        >
          <button
            onClick={handleModalClose}
            className="absolute top-4 left-4 p-2 rounded-full text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mx-auto flex items-center justify-center shadow-inner">
            <GraduationCap className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              يجب إضافة فصل دراسي أولاً
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
              لتتمكن من إضافة المقررات وجداولها الدراسية، يرجى إنشاء فصل دراسي أولاً (مثل: المستوى الأول أو الثاني).
            </p>
          </div>

          <div className="flex items-center gap-3 justify-center pt-2">
            <button
              type="button"
              onClick={handleModalClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={() => {
                handleModalClose();
                onOpenCreateSemester();
              }}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              إضافة فصل دراسي الآن
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────────────────────────
  // CRN Fetch Logic
  // ─────────────────────────────────────────────
  const handleFetchCrn = async () => {
    const raw = crnInput.trim();
    if (!raw) return;
    setIsFetchingCrn(true);
    setCrnError(null);
    setFetchedSection(null);
    setCourseDetails(null);
    setIsEditingTimings(false);
    setActiveTab('overview');

    try {
      const activeSem = semesters.find(s => s.id === selectedSemId);
      const params = new URLSearchParams({ crns: raw });
      if (activeSem?.term) params.set('term', activeSem.term);
      if (activeSem?.academicYear) params.set('academicYear', activeSem.academicYear);
      if (activeSem?.semester) params.set('semester', activeSem.semester);

      const res = await fetch(`/api/sections/by-crn?${params}`);
      const data = await res.json().catch(() => ({}));
      let found = Array.isArray(data?.sections) && data.sections.length > 0 ? data.sections[0] : null;

      if (!found) {
        try {
          const fallbackRes = await fetch(`/api/sections/by-crn?crns=${encodeURIComponent(raw)}`);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            if (Array.isArray(fallbackData?.sections) && fallbackData.sections.length > 0) {
              found = fallbackData.sections[0];
            }
          }
        } catch (_) {}
      }

      if (!found) {
        setCrnError(`لم يتم العثور على شعبة تطابق الـ CRN (${raw}). تأكد من صحة الرقم أو اختر المقرر من دليل المقررات.`);
      } else {
        setFetchedSection(found);
        setCustomWaLink(found.whatsappLink || '');

        let foundInsts: any[] = [];
        if (Array.isArray(found.instructors) && found.instructors.length > 0) {
          foundInsts = found.instructors;
        } else if (found.primaryInstructor && found.primaryInstructor !== 'غير محدد') {
          foundInsts = [{ name: found.primaryInstructor, email: found.primaryInstructorEmail, isPrimary: true }];
        }
        setCourseInstructors(foundInsts);

        // Convert schedules & deduplicate
        const initialSchedules: ScheduleItem[] = [];
        const schedList = Array.isArray(found.schedules) ? found.schedules : [];
        const seenSched = new Set<string>();
        if (schedList.length > 0) {
          schedList.forEach((sch: any) => {
            const daysArr = parseScheduleDays(sch);
            const { startTime, endTime } = parseTimeRange(
              sch.timeRange,
              sch.startTime || '08:25 am',
              sch.endTime || '09:15 am'
            );
            const classroom = sch.room || sch.building || '';
            const key = `${daysArr.slice().sort().join(',')}_${startTime}_${endTime}_${classroom}`;
            if (seenSched.has(key)) return;
            seenSched.add(key);

            initialSchedules.push({
              id: String(initialSchedules.length + 1),
              days: daysArr.length > 0 ? daysArr : ['الأحد', 'الثلاثاء'],
              startTime,
              endTime,
              classroom,
              teacher: found.primaryInstructor || sch.instructor || ''
            });
          });
        } else {
          initialSchedules.push({
            id: '1',
            days: ['الأحد', 'الثلاثاء'],
            startTime: '08:25 am',
            endTime: '09:15 am',
            classroom: '',
            teacher: found.primaryInstructor || ''
          });
        }
        setCustomSchedules(initialSchedules);
      }
    } catch {
      setCrnError('حدث خطأ أثناء الاتصال بالخادم، يرجى المحاولة لاحقاً.');
    } finally {
      setIsFetchingCrn(false);
    }
  };

  const handleCopyEmail = (email: string) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleColorSelect = (hex: string) => {
    setSelectedColor(hex);
    setIsColorPickerOpen(false);
    setHasUserEdited(true);

    if (selectedSemId && (initialCourse || fetchedSection)) {
      const code = initialCourse?.courseCode || fetchedSection?.courseCode;
      if (code) {
        const activeSem = semesters.find(s => s.id === selectedSemId);
        const existingCourse = activeSem?.courses?.find(c => c.courseCode === code);
        if (existingCourse) {
          onAddCourseToSemester(selectedSemId, {
            ...existingCourse,
            color: hex
          }, initialCourse?.courseCode);
        }
      }
    }
  };

  const handleCheckCourseUpdates = async () => {
    if (!initialCourse) return;
    setIsCheckingUpdates(true);
    setUpdateNoticeMessage(null);
    setUpdateSuccessMessage(null);

    try {
      const activeSem = semesters.find(s => s.id === selectedSemId);
      let found: any = null;

      // 1. By CRN if available
      if (initialCourse.crn) {
        const params = new URLSearchParams({ crns: initialCourse.crn });
        if (activeSem?.term) params.set('term', activeSem.term);
        if (activeSem?.academicYear) params.set('academicYear', activeSem.academicYear);
        if (activeSem?.semester) params.set('semester', activeSem.semester);

        try {
          const res = await fetch(`/api/sections/by-crn?${params}`);
          if (res.ok) {
            const data = await res.json();
            const list = Array.isArray(data?.sections) ? data.sections : (Array.isArray(data) ? data : []);
            if (list.length > 0) found = list[0];
          }
        } catch (_) {}

        if (!found) {
          try {
            const fallbackRes = await fetch(`/api/sections/by-crn?crns=${encodeURIComponent(initialCourse.crn)}`);
            if (fallbackRes.ok) {
              const fbData = await fallbackRes.json();
              const list = Array.isArray(fbData?.sections) ? fbData.sections : (Array.isArray(fbData) ? fbData : []);
              if (list.length > 0) found = list[0];
            }
          } catch (_) {}
        }
      }

      // 2. By Course Code if not found by CRN
      if (!found && initialCourse.courseCode) {
        try {
          const codeRes = await fetch(`/api/sections?code=${encodeURIComponent(initialCourse.courseCode)}`);
          if (codeRes.ok) {
            const codeData = await codeRes.json();
            const list = Array.isArray(codeData?.sections) ? codeData.sections : (Array.isArray(codeData) ? codeData : []);
            if (list.length > 0) {
              found = list.find((s: any) => s.sectionNumber === initialCourse.sectionNumber) || list[0];
            }
          }
        } catch (_) {}
      }

      if (!found) {
        setUpdateNoticeMessage('لم يتم العثور على بيانات لهذه الشعبة في قاعدة بيانات النظام للمقارنة.');
        return;
      }

      const diffItems: Array<{
        key: string;
        title: string;
        iconType: 'user' | 'clock' | 'map-pin' | 'users' | 'calendar';
        currentDisplay: string;
        newDisplay: string;
        currentSchedules?: ScheduleItem[];
        newSchedules?: ScheduleItem[];
        applyData: any;
      }> = [];

      // A. Instructors diff
      const currentNames = courseInstructors.map(t => t.name.trim()).filter(Boolean);
      if (currentNames.length === 0 && initialCourse.primaryInstructor) {
        currentNames.push(initialCourse.primaryInstructor.trim());
      }

      let newInstructors: Array<{ name: string; email?: string | null; isPrimary?: boolean }> = [];
      if (Array.isArray(found.instructors) && found.instructors.length > 0) {
        newInstructors = found.instructors;
      } else if (found.primaryInstructor && found.primaryInstructor !== 'غير محدد') {
        newInstructors = [{ name: found.primaryInstructor, email: found.primaryInstructorEmail || null, isPrimary: true }];
      }

      const newNames = newInstructors.map(t => t.name.trim()).filter(Boolean);
      const currentNamesSorted = [...currentNames].sort().join(', ');
      const newNamesSorted = [...newNames].sort().join(', ');

      if (newNames.length > 0 && currentNamesSorted !== newNamesSorted) {
        diffItems.push({
          key: 'instructors',
          title: 'أستاذ المقرر / هيئة التدريس',
          iconType: 'user',
          currentDisplay: currentNames.join('، ') || 'غير محدد',
          newDisplay: newNames.join('، ') || 'غير محدد',
          applyData: newInstructors
        });
      }

      // B. Schedules diff (Days, Times, Classroom, Teacher per schedule)
      const convertedLatestSchedules: ScheduleItem[] = [];
      if (Array.isArray(found.schedules) && found.schedules.length > 0) {
        const seenSched = new Set<string>();
        found.schedules.forEach((sch: any) => {
          const daysArr = parseScheduleDays(sch);
          const { startTime, endTime } = parseTimeRange(
            sch.timeRange,
            sch.startTime || '08:25 am',
            sch.endTime || '09:15 am'
          );
          const classroom = sch.room || sch.building || '';
          const teacher = sch.instructor || found.primaryInstructor || '';
          const key = `${daysArr.slice().sort().join(',')}-${startTime}-${endTime}-${classroom}-${teacher}`;
          if (!seenSched.has(key)) {
            seenSched.add(key);
            convertedLatestSchedules.push({
              id: String(Date.now() + Math.random()),
              days: daysArr,
              startTime,
              endTime,
              classroom,
              teacher
            });
          }
        });
      }

      if (convertedLatestSchedules.length > 0) {
        const currTimes = customSchedules.map(s => `${(s.days || []).join('، ')} (${s.startTime} → ${s.endTime})`).join(' | ');
        const newTimes = convertedLatestSchedules.map(s => `${(s.days || []).join('، ')} (${s.startTime} → ${s.endTime})`).join(' | ');
        if (currTimes !== newTimes) {
          diffItems.push({
            key: 'schedules_times',
            title: 'مواعيد وأيام المحاضرات',
            iconType: 'clock',
            currentDisplay: currTimes || 'غير محددة',
            newDisplay: newTimes || 'غير محددة',
            currentSchedules: customSchedules,
            newSchedules: convertedLatestSchedules,
            applyData: convertedLatestSchedules
          });
        }

        const currRooms = Array.from(new Set(customSchedules.map(s => s.classroom?.trim()).filter(Boolean))).join('، ');
        const newRooms = Array.from(new Set(convertedLatestSchedules.map(s => s.classroom?.trim()).filter(Boolean))).join('، ');
        if (newRooms && currRooms !== newRooms) {
          diffItems.push({
            key: 'classroom',
            title: 'القاعة الدراسية',
            iconType: 'map-pin',
            currentDisplay: currRooms || 'غير محددة',
            newDisplay: newRooms || 'غير محددة',
            applyData: convertedLatestSchedules
          });
        }

        const currTeachersPerSched = Array.from(new Set(customSchedules.map(s => s.teacher?.trim()).filter(Boolean))).join('، ');
        const newTeachersPerSched = Array.from(new Set(convertedLatestSchedules.map(s => s.teacher?.trim()).filter(Boolean))).join('، ');
        if (newTeachersPerSched && currTeachersPerSched !== newTeachersPerSched) {
          diffItems.push({
            key: 'schedules_teachers',
            title: 'أساتذة مواعيد المحاضرات',
            iconType: 'users',
            currentDisplay: currTeachersPerSched || 'غير محدد',
            newDisplay: newTeachersPerSched || 'غير محدد',
            applyData: convertedLatestSchedules
          });
        }
      }

      // C. Final Exam diff
      const { examDate: latestExamDate, examTime: latestExamTime } = extractFinalExamInfo(found);
      const currExam = [initialCourse.examDate, initialCourse.examTime].filter(Boolean).join(' - ');
      const newExam = [latestExamDate, latestExamTime].filter(Boolean).join(' - ');
      if (newExam && currExam !== newExam) {
        diffItems.push({
          key: 'exam',
          title: 'موعد الاختبار النهائي',
          iconType: 'calendar',
          currentDisplay: currExam || 'غير محدد',
          newDisplay: newExam || 'غير محدد',
          applyData: { examDate: latestExamDate, examTime: latestExamTime }
        });
      }

      if (diffItems.length === 0) {
        setUpdateNoticeMessage('بيانات هذا المقرر مطابقة لأحدث نسخة مسجلة في النظام! لا توجد تعديلات جديدة.');
        return;
      }

      const initialChecked: Record<string, boolean> = {};
      diffItems.forEach(item => { initialChecked[item.key] = true; });
      setSelectedDiffKeys(initialChecked);

      setCourseUpdateDiff({
        crn: found.crn || initialCourse.crn || '',
        courseCode: found.courseCode || initialCourse.courseCode || '',
        courseTitle: found.courseTitle || initialCourse.courseName || '',
        items: diffItems,
        rawLatestSection: found
      });
    } catch (err) {
      console.error('Error checking course updates:', err);
      setUpdateNoticeMessage('حدث خطأ أثناء فحص التحديثات. يرجى التحقق من اتصالك والمحاولة مرة أخرى.');
    } finally {
      setIsCheckingUpdates(false);
    }
  };

  const handleApplySelectedUpdates = () => {
    if (!courseUpdateDiff) return;

    let hasAnyChange = false;

    // 1. Instructors
    if (selectedDiffKeys['instructors']) {
      const instItem = courseUpdateDiff.items.find(i => i.key === 'instructors');
      if (instItem && Array.isArray(instItem.applyData)) {
        setCourseInstructors(instItem.applyData);
        setFetchedSection((prev: any) => ({
          ...prev,
          instructors: instItem.applyData,
          primaryInstructor: instItem.applyData[0]?.name || prev?.primaryInstructor
        }));
        hasAnyChange = true;
      }
    }

    // 2. Schedules (times / days / classroom / teachers)
    const updateTimes = !!selectedDiffKeys['schedules_times'];
    const updateClassroom = !!selectedDiffKeys['classroom'];
    const updateSchedTeachers = !!selectedDiffKeys['schedules_teachers'];

    if (updateTimes || updateClassroom || updateSchedTeachers) {
      const schedItem = courseUpdateDiff.items.find(i =>
        i.key === 'schedules_times' || i.key === 'classroom' || i.key === 'schedules_teachers'
      );
      if (schedItem && Array.isArray(schedItem.applyData)) {
        const latestScheds: ScheduleItem[] = schedItem.applyData;
        if (updateTimes) {
          setCustomSchedules(latestScheds.map((ls, idx) => ({
            ...ls,
            classroom: updateClassroom ? ls.classroom : (customSchedules[idx]?.classroom ?? ls.classroom),
            teacher: updateSchedTeachers ? ls.teacher : (customSchedules[idx]?.teacher ?? ls.teacher)
          })));
        } else {
          setCustomSchedules(prev => prev.map((ps, idx) => ({
            ...ps,
            classroom: updateClassroom ? (latestScheds[idx]?.classroom ?? ps.classroom) : ps.classroom,
            teacher: updateSchedTeachers ? (latestScheds[idx]?.teacher ?? ps.teacher) : ps.teacher
          })));
        }
        hasAnyChange = true;
      }
    }

    // 3. Exam
    if (selectedDiffKeys['exam']) {
      const examItem = courseUpdateDiff.items.find(i => i.key === 'exam');
      if (examItem && examItem.applyData) {
        setFetchedSection((prev: any) => ({
          ...prev,
          examDate: examItem.applyData.examDate || prev?.examDate,
          examTime: examItem.applyData.examTime || prev?.examTime,
        }));
        hasAnyChange = true;
      }
    }

    if (hasAnyChange) {
      setHasUserEdited(true);
      setUpdateSuccessMessage('تم تطبيق التحديثات المحددة على المقرر بنجاح! اضغط على "حفظ التعديلات" لحفظها.');
    }

    setCourseUpdateDiff(null);
  };

  const handleConfirmAddCrnCourse = () => {
    if (!fetchedSection || !selectedSemId) return;
    const { examDate, examTime } = extractFinalExamInfo(fetchedSection);
    const course: CourseEntry = {
      subjectId: fetchedSection.subjectId || initialCourse?.subjectId,
      courseCode: fetchedSection.courseCode || initialCourse?.courseCode || '',
      courseName: fetchedSection.courseTitle || initialCourse?.courseName || fetchedSection.courseCode || '',
      crn: String(fetchedSection.crn || crnInput || initialCourse?.crn || '').trim(),
      creditHours: fetchedSection.creditHours || initialCourse?.creditHours || 3,
      sectionNumber: (fetchedSection.sectionNumber ? String(fetchedSection.sectionNumber).trim() : undefined) || initialCourse?.sectionNumber,
      examDate: examDate || fetchedSection.examDate || initialCourse?.examDate,
      examTime: examTime || fetchedSection.examTime || initialCourse?.examTime,
      customSchedule: customSchedules,
      whatsappLink: customWaLink || initialCourse?.whatsappLink || undefined,
      color: selectedColor || initialCourse?.color || undefined,
      primaryInstructor: courseInstructors.find(i => i.isPrimary)?.name || courseInstructors[0]?.name || fetchedSection.primaryInstructor || initialCourse?.primaryInstructor,
      instructors: courseInstructors.length > 0 ? courseInstructors : (fetchedSection.instructors || initialCourse?.instructors)
    };
    onAddCourseToSemester(selectedSemId, course, initialCourse?.courseCode);
    handleModalClose();
  };

  const handleConfirmManualCourse = () => {
    const code = (selectedSubject?.code || '').trim();
    const name = (selectedSubject?.name || code).trim();
    if (!code || !selectedSemId) return;

    const course: CourseEntry = {
      subjectId: selectedSubject?.id || initialCourse?.subjectId,
      courseCode: code,
      courseName: name,
      crn: '',
      creditHours: selectedSubject?.creditHours || initialCourse?.creditHours || 3,
      examDate: initialCourse?.examDate,
      examTime: initialCourse?.examTime,
      customSchedule: manualSchedules,
      whatsappLink: manualWaLink || initialCourse?.whatsappLink || undefined,
      color: selectedColor || initialCourse?.color || undefined,
      primaryInstructor: courseInstructors.find(i => i.isPrimary)?.name || courseInstructors[0]?.name || manualSchedules.find(s => s.teacher)?.teacher || initialCourse?.primaryInstructor,
      instructors: courseInstructors.length > 0 ? courseInstructors : undefined
    };
    onAddCourseToSemester(selectedSemId, course, initialCourse?.courseCode);
    handleModalClose();
  };

  // Helper dedupe
  const dedupe = <T extends { url: string }>(items: T[]): T[] => {
    const seen = new Set<string>();
    return items.filter(i => {
      if (!i.url || i.url === '#') return false;
      const u = i.url.trim().toLowerCase().replace(/\/$/, '');
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    });
  };

  // Parse resources from courseDetails
  const freeTutorials = dedupe([
    ...(courseDetails?.freeResourcesUrl ? parseAllResourceLinks(courseDetails.freeResourcesUrl) : []),
    ...(courseDetails?.resources?.filter((r: any) => r.freeResourcesUrl)?.flatMap((r: any) => parseAllResourceLinks(r.freeResourcesUrl)) || [])
  ]);

  const paidTutorials = dedupe([
    ...(courseDetails?.paidResourcesUrl ? parseAllResourceLinks(courseDetails.paidResourcesUrl) : []),
    ...(courseDetails?.resources?.filter((r: any) => r.paidResourcesUrl)?.flatMap((r: any) => parseAllResourceLinks(r.paidResourcesUrl)) || [])
  ]);

  const fileResources = dedupe([
    ...(courseDetails?.driveLink ? parseAllResourceLinks(courseDetails.driveLink) : []),
    ...(courseDetails?.boxLink ? parseAllResourceLinks(courseDetails.boxLink) : []),
    ...(courseDetails?.resources?.filter((r: any) => r.url && !isWhatsappUrl(r.url))?.flatMap((r: any) => parseAllResourceLinks(r.url)) || [])
  ]);

  const filteredCatalog = allSubjects
    .filter(s => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return s.code?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q);
    })
    .slice(0, 16);

  // Active semester helper label
  const currentSemesterObj = semesters.find(s => s.id === selectedSemId);

  // Section label helper: display actual section number/name, separate from CRN
  const sectionNameDisplay = fetchedSection
    ? (fetchedSection.sectionNumber
        ? (String(fetchedSection.sectionNumber).startsWith('شعبة')
            ? String(fetchedSection.sectionNumber)
            : `شعبة ${fetchedSection.sectionNumber}`)
        : (fetchedSection.sectionName
            ? (String(fetchedSection.sectionName).startsWith('شعبة')
                ? String(fetchedSection.sectionName)
                : `شعبة ${fetchedSection.sectionName}`)
            : 'الشعبة'))
    : '';

  const activeSemCourses = semesters.find(s => s.id === selectedSemId)?.courses || [];
  const activeCourseCode = fetchedSection?.courseCode || selectedSubject?.code || initialCourse?.courseCode;
  const effectiveCourseColor = selectedColor || initialCourse?.color || (
    activeCourseCode
      ? getCourseColor(activeCourseCode, activeSemCourses)
      : '#10b981'
  );
  const hasCourse = Boolean(fetchedSection || selectedSubject || initialCourse);

  const courseImage = useMemo(() => {
    if (courseDetails?.avatarUrl) return courseDetails.avatarUrl;
    if (courseDetails?.bannerUrl) return courseDetails.bannerUrl;
    if (Array.isArray(courseDetails?.resources)) {
      const resWithImg = courseDetails.resources.find((r: any) => r.avatarUrl || r.avatar_url || r.imageUrl || r.image_url);
      if (resWithImg?.avatarUrl || resWithImg?.avatar_url || resWithImg?.imageUrl || resWithImg?.image_url) {
        return resWithImg.avatarUrl || resWithImg.avatar_url || resWithImg.imageUrl || resWithImg.image_url;
      }
    }
    const matchingSub = allSubjects?.find(s =>
      (s.code && s.code === activeCourseCode) ||
      (s.id && (s.id === (fetchedSection as any)?.subjectId || s.id === initialCourse?.subjectId))
    );
    if (matchingSub?.avatarUrl) return matchingSub.avatarUrl;
    if (matchingSub?.bannerUrl) return matchingSub.bannerUrl;
    return null;
  }, [courseDetails, allSubjects, activeCourseCode, fetchedSection, initialCourse]);

  const [imgError, setImgError] = useState(false);
  useEffect(() => {
    setImgError(false);
  }, [courseImage]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      dir="rtl"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm cursor-pointer"
        onClick={handleModalClose}
      />

      {/* Modal Window Container */}
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className={`relative bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full ${isBrowsingCatalog && !selectedSubject ? 'max-w-lg' : 'max-w-[480px]'} overflow-hidden shadow-2xl flex flex-col max-h-[92vh] z-10`}
      >
        {/* ─── Simple Clean Modal Header ─── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            {/* Interactive Color Box with Hover Pencil & Color Picker Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => hasCourse && setIsColorPickerOpen(prev => !prev)}
                disabled={!hasCourse}
                className={clsx(
                  "group relative w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden p-1 transition-all duration-200 shadow-2xs border-2",
                  hasCourse
                    ? "cursor-pointer hover:scale-105 active:scale-95"
                    : "cursor-default"
                )}
                style={{
                  borderColor: hasCourse ? effectiveCourseColor : 'rgba(140,98,57,0.2)',
                  backgroundColor: hasCourse ? `${effectiveCourseColor}18` : undefined
                }}
                title={hasCourse ? "تخصيص لون المقرر" : undefined}
                aria-label={hasCourse ? "تخصيص لون المقرر" : undefined}
              >
                {/* Course image from resources or book icon (no site logo) */}
                {courseImage && !imgError ? (
                  <img
                    src={courseImage}
                    alt={fetchedSection?.courseTitle || initialCourse?.courseName || selectedSubject?.name || 'صورة المقرر'}
                    className="w-full h-full object-cover rounded-xl transition-opacity group-hover:opacity-20"
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <BookOpen
                    className="w-5 h-5 transition-opacity group-hover:opacity-20"
                    style={{ color: effectiveCourseColor }}
                  />
                )}

                {/* Hover overlay with pencil icon */}
                {hasCourse && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px] rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                    <Pencil className="w-4 h-4 text-white drop-shadow" />
                  </div>
                )}
              </button>

              {/* Color Options Popover */}
              <AnimatePresence>
                {isColorPickerOpen && (
                  <>
                    {/* Click-away backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setIsColorPickerOpen(false)}
                    />

                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: -4 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full mt-2 right-0 z-50 p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl w-64"
                      dir="rtl"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100 dark:border-zinc-800">
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                          <Palette className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                          <span>اختر لون المقرر</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsColorPickerOpen(false)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-5 gap-2">
                        {COURSE_COLOR_OPTIONS.map(c => {
                          const isSelected = effectiveCourseColor.toLowerCase() === c.hex.toLowerCase();
                          return (
                            <button
                              key={c.hex}
                              type="button"
                              onClick={() => handleColorSelect(c.hex)}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer hover:scale-110 relative ${
                                isSelected ? 'ring-2 ring-offset-2 ring-slate-800 dark:ring-white dark:ring-offset-zinc-900 shadow-sm' : ''
                              }`}
                              style={{ backgroundColor: c.hex }}
                              title={c.label}
                            >
                              {isSelected && (
                                <Check className="w-4 h-4 text-white drop-shadow stroke-[3]" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                {fetchedSection
                  ? fetchedSection.courseTitle || fetchedSection.courseCode
                  : selectedSubject
                  ? selectedSubject.name
                  : isBrowsingCatalog
                  ? 'دليل المقررات الجامعية'
                  : 'إضافة مقرر دراسي جديد'}
              </h2>
              {fetchedSection ? (
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <span className="px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700" dir="ltr">
                    {fetchedSection.courseCode}
                  </span>
                  <span className="px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700">
                    {sectionNameDisplay}
                  </span>
                  <span className="px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700">
                    {fetchedSection.creditHours || 3} س
                  </span>
                  <span className="px-2.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-bold rounded-lg border border-zinc-200 dark:border-zinc-700" dir="ltr">
                    CRN: {fetchedSection.crn}
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                  {selectedSubject
                    ? `${selectedSubject.code} · ${currentSemesterObj?.label || 'الفصل الدراسي'}`
                    : currentSemesterObj?.label || 'الفصل الدراسي'}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleModalClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ─── Body Content ─── */}
        <div className="overflow-hidden flex-1 flex flex-col">
          <div ref={contentRef} className="p-5 sm:p-6 overflow-y-auto max-h-[calc(85vh-7rem)] custom-scrollbar space-y-5">
            {/* Success message banner when updates applied */}
            {updateSuccessMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between gap-2 shadow-xs">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{updateSuccessMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setUpdateSuccessMessage(null)}
                  className="p-1 rounded-lg text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-200 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                FLOW 1: INITIAL POPUP (Year Slide-down + CRN Box + Catalog Box)
                ══════════════════════════════════════════════════════════════ */}
            {!fetchedSection && !selectedSubject && !isBrowsingCatalog && (
              <div className="space-y-4">
                {/* 1. Slide-down / Dropdown to choose what year & semester */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                    <span>العام والفصل الدراسي المراد الإضافة إليه</span>
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSemId}
                      onChange={e => setSelectedSemId(e.target.value)}
                      className="w-full appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white text-xs font-bold rounded-xl px-4 py-3 pr-4 pl-10 outline-none cursor-pointer focus:ring-1 focus:ring-[var(--color-imamu-accent)] focus:border-[var(--color-imamu-accent)] shadow-xs transition"
                    >
                      {semesters.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {/* 2. CRN Text Box to Add (fetch data on Enter) */}
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
                        value={crnInput}
                        onChange={e => {
                          setCrnInput(e.target.value);
                          if (crnError) setCrnError(null);
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleFetchCrn();
                          }
                        }}
                        placeholder="أدخل الـ CRN (مثال: 10245)"
                        className="w-full px-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-[var(--color-imamu-accent)] focus:ring-1 focus:ring-[var(--color-imamu-accent)] shadow-xs transition text-center sm:text-right"
                        autoFocus
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isFetchingCrn || !crnInput.trim()}
                      onClick={handleFetchCrn}
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

                  {crnError && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{crnError}</span>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="relative flex items-center my-1.5">
                  <div className="flex-grow border-t border-slate-200 dark:border-zinc-800"></div>
                  <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-400 dark:text-zinc-500">أو</span>
                  <div className="flex-grow border-t border-slate-200 dark:border-zinc-800"></div>
                </div>

                {/* 3. Another Box Under It: Click to Open Courses Catalog */}
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
            )}

            {/* ══════════════════════════════════════════════════════════════
                FLOW 2: COURSES CATALOG BROWSER (Opened via the box under CRN)
                ══════════════════════════════════════════════════════════════ */}
            {isBrowsingCatalog && !selectedSubject && !fetchedSection && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3 pb-1 border-b border-slate-200/80 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      اختر المقرر الدراسي من الدليل
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBrowsingCatalog(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-600 dark:text-zinc-400 text-xs font-bold transition cursor-pointer flex items-center gap-1.5"
                  >
                    <span>العودة لإدخال CRN</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="ابحث برمز المقرر أو اسمه (مثال: CS101، حاسب، رياضيات)..."
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:border-[var(--color-imamu-accent)] transition pr-9"
                    autoFocus
                  />
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* 2-Column Catalog Cards (Exact Image 1 Style) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                  {filteredCatalog.map(s => (
                    <div
                      key={s.id || s.code}
                      onClick={() => {
                        setSelectedSubject(s);
                        setManualSchedules([
                          {
                            id: '1',
                            days: ['الأحد', 'الثلاثاء'],
                            startTime: '08:25 am',
                            endTime: '09:15 am',
                            classroom: '',
                            teacher: ''
                          }
                        ]);
                      }}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-800 hover:border-[var(--color-imamu-accent)]/60 transition cursor-pointer text-right flex flex-col justify-between group shadow-sm"
                    >
                      <div className="space-y-1.5">
                        <p className="text-[var(--color-imamu-accent)] text-xs font-bold" dir="ltr">
                          {s.code} · {s.creditHours || 3} س
                        </p>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug group-hover:text-[var(--color-imamu-accent)] transition line-clamp-2">
                          {s.name}
                        </h4>
                      </div>
                      <div className="pt-3 mt-3 border-t border-slate-200/60 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400">
                        <span>اختيار وإضافة البيانات</span>
                        <span className="text-[var(--color-imamu-accent)] font-bold group-hover:-translate-x-1 transition-transform">←</span>
                      </div>
                    </div>
                  ))}
                  {filteredCatalog.length === 0 && (
                    <div className="col-span-full py-10 text-center text-slate-400 dark:text-zinc-500 text-xs">
                      لم يتم العثور على مقررات تطابق بحثك.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                FLOW 3: MANUAL ENTRY TAB (Opened after selecting a course)
                ══════════════════════════════════════════════════════════════ */}
            {selectedSubject && !fetchedSection && (
              <div className="space-y-4">
                {/* Selected Course Header */}
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-900/30 border border-[var(--color-imamu-accent)]/30 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[var(--color-imamu-accent)] text-xs font-bold" dir="ltr">
                      {selectedSubject.code} · {selectedSubject.creditHours || 3} ساعات معتمدة
                    </p>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
                      {selectedSubject.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedSubject(null)}
                    className="px-3 py-1.5 rounded-xl border border-[var(--color-imamu-accent)]/30 text-xs font-bold text-[var(--color-imamu-accent)] hover:bg-[var(--color-imamu-accent)]/10 transition cursor-pointer shrink-0"
                  >
                    تغيير المقرر
                  </button>
                </div>

                {/* Section WhatsApp Link */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-2">
                    <WhatsappIcon className="w-4 h-4 fill-emerald-500" />
                    <span>رابط قروب الواتساب للشعبة (اختياري)</span>
                  </label>
                  <input
                    type="url"
                    value={manualWaLink}
                    onChange={e => {
                      setManualWaLink(e.target.value);
                      setHasUserEdited(true);
                    }}
                    placeholder="https://chat.whatsapp.com/..."
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                    dir="ltr"
                  />
                </div>

                {/* TimingEditor (Image 2 style) */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                    <span>تحديد المواعيد والقاعة وأستاذ المادة</span>
                  </h4>
                  <TimingEditor
                    schedules={manualSchedules}
                    availableTeachers={courseInstructors.map(t => t.name)}
                    onChange={(newSched) => {
                      setManualSchedules(newSched);
                      setHasUserEdited(true);
                    }}
                  />
                </div>
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════
                FLOW 4: FETCHED CRN COURSE DETAILS (Tabs: Overview, Sections, Tutorials, Files)
                ══════════════════════════════════════════════════════════════ */}
            {fetchedSection && (
              <div className="space-y-3">
                {/* ─── Animated Tabs Header (CourseDetailsModal style) ─── */}
                <LayoutGroup id="addCourseModalTabs">
                  <div className="relative flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-zinc-800 pb-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('overview');
                        setIsEditingTimings(false);
                      }}
                      className={`relative pb-3 px-4 font-bold transition-colors duration-200 text-xs sm:text-sm flex items-center gap-2 select-none cursor-pointer ${
                        activeTab === 'overview'
                          ? 'text-[var(--color-imamu-accent)]'
                          : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      <BookOpen className={`w-4 h-4 transition-colors ${activeTab === 'overview' ? 'text-[var(--color-imamu-accent)]' : 'text-slate-400 dark:text-zinc-500'}`} />
                      <span>نظرة عامة</span>
                      {activeTab === 'overview' && (
                        <motion.div
                          layoutId="addCourseTabUnderline"
                          className="absolute bottom-0 right-0 left-0 h-0.5 bg-[var(--color-imamu-accent)] rounded-full shadow-xs shadow-[var(--color-imamu-accent)/20]"
                          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        />
                      )}
                    </button>



                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('tutorials');
                        setIsEditingTimings(false);
                      }}
                      className={`relative pb-3 px-4 font-bold transition-colors duration-200 text-xs sm:text-sm flex items-center gap-2 select-none cursor-pointer ${
                        activeTab === 'tutorials'
                          ? 'text-[var(--color-imamu-accent)]'
                          : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Video className={`w-4 h-4 transition-colors ${activeTab === 'tutorials' ? 'text-[var(--color-imamu-accent)]' : 'text-slate-400 dark:text-zinc-500'}`} />
                      <span>الشروحات ({freeTutorials.length + paidTutorials.length})</span>
                      {activeTab === 'tutorials' && (
                        <motion.div
                          layoutId="addCourseTabUnderline"
                          className="absolute bottom-0 right-0 left-0 h-0.5 bg-[var(--color-imamu-accent)] rounded-full shadow-xs shadow-[var(--color-imamu-accent)/20]"
                          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('files');
                        setIsEditingTimings(false);
                      }}
                      className={`relative pb-3 px-4 font-bold transition-colors duration-200 text-xs sm:text-sm flex items-center gap-2 select-none cursor-pointer ${
                        activeTab === 'files'
                          ? 'text-[var(--color-imamu-accent)]'
                          : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      <Folder className={`w-4 h-4 transition-colors ${activeTab === 'files' ? 'text-[var(--color-imamu-accent)]' : 'text-slate-400 dark:text-zinc-500'}`} />
                      <span>الملفات ({fileResources.length})</span>
                      {activeTab === 'files' && (
                        <motion.div
                          layoutId="addCourseTabUnderline"
                          className="absolute bottom-0 right-0 left-0 h-0.5 bg-[var(--color-imamu-accent)] rounded-full shadow-xs shadow-[var(--color-imamu-accent)/20]"
                          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                        />
                      )}
                    </button>
                  </div>
                </LayoutGroup>

                {/* Animated Tab Content Panels */}
                <AnimatePresence mode="wait">
                  {/* ─── Tab 1: OVERVIEW ─── */}
                  {activeTab === 'overview' && (
                    <motion.div
                      key="tab-overview"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="space-y-4"
                    >
                      {/* Section WhatsApp Link */}
                      <div className="rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 overflow-hidden">
                        {/* Main row */}
                        <div className="flex items-center gap-3 px-3.5 py-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                            <WhatsappIcon className="w-4 h-4 fill-current" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {`قروب واتساب ${sectionNameDisplay || 'الشعبة'}`}
                              {customWaLink && (
                                <span className="mr-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">مسجل</span>
                              )}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate">
                              {customWaLink ? 'رابط القروب الطلابي المعتمد لهذه الشعبة' : 'لا يوجد رابط مسجل لهذه الشعبة'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {customWaLink ? (
                              <>
                                <a
                                  href={customWaLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition"
                                >
                                  <WhatsappIcon className="w-3 h-3 fill-current" />
                                  <span>انضمام</span>
                                </a>
                                <button
                                  type="button"
                                  onClick={() => { setWaLinkInput(customWaLink); setIsEditingWaLink(v => !v); }}
                                  className="p-1.5 rounded-lg border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 transition cursor-pointer"
                                  title="تعديل الرابط"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => { setWaLinkInput(''); setIsEditingWaLink(v => !v); }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20 text-[11px] font-bold transition cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>إضافة رابط</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Inline expand: URL input */}
                        <AnimatePresence>
                          {isEditingWaLink && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.18 }}
                              className="border-t border-emerald-500/20 px-3.5 py-3 flex gap-2"
                            >
                              <input
                                type="url"
                                value={waLinkInput}
                                onChange={e => setWaLinkInput(e.target.value)}
                                placeholder="https://chat.whatsapp.com/..."
                                className="flex-1 px-3 py-1.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                                dir="ltr"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => { setCustomWaLink(waLinkInput.trim()); setIsEditingWaLink(false); setHasUserEdited(true); }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition cursor-pointer"
                              >
                                حفظ
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsEditingWaLink(false)}
                                className="px-2.5 py-1.5 bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs rounded-lg transition cursor-pointer"
                              >
                                إلغاء
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Instructor Information Cards (Interactive Add & Remove) */}
                      <div className="space-y-2.5">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 px-1 flex items-center justify-between">
                          <span>هيئة التدريس ({courseInstructors.length})</span>
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingInstructors(prev => !prev);
                              if (isEditingInstructors) {
                                setIsSearchingTeachers(false);
                              }
                            }}
                            className={clsx(
                              "flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border transition cursor-pointer",
                              isEditingInstructors
                                ? "bg-[var(--color-imamu-accent)] text-white border-[var(--color-imamu-accent)] shadow-2xs"
                                : "text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 border-slate-200/80 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700"
                            )}
                          >
                            {isEditingInstructors ? (
                              <>
                                <Check className="w-3 h-3" />
                                <span>تم</span>
                              </>
                            ) : (
                              <>
                                <Pencil className="w-3 h-3" />
                                <span>تعديل</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Compact Searchable Add Teacher with Floating Dropdown */}
                        {isSearchingTeachers && (
                          <div className="relative">
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-zinc-800/90 border border-slate-200 dark:border-zinc-700 rounded-xl px-3 py-1.5 focus-within:border-[var(--color-imamu-accent)] transition shadow-xs">
                              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <input
                                type="text"
                                value={teacherSearchQuery}
                                onChange={e => setTeacherSearchQuery(e.target.value)}
                                placeholder="ابحث باسم الأستاذ أو بريده..."
                                className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder-slate-400"
                                autoFocus
                              />
                              {loadingDbTeachers && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-imamu-accent)] shrink-0" />
                              )}
                              <button
                                type="button"
                                onClick={() => { setIsSearchingTeachers(false); setTeacherSearchQuery(''); }}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 transition cursor-pointer"
                                title="إغلاق البحث"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Floating Dropdown */}
                            <div className="absolute top-full right-0 left-0 mt-1 z-50 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/80 custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                              {loadingDbTeachers && dbTeachers.length === 0 ? (
                                <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[var(--color-imamu-accent)] shrink-0" />
                                  <span>جاري التحميل...</span>
                                </div>
                              ) : filteredDbTeachers.length === 0 ? (
                                <div className="py-3 text-center text-xs text-slate-400">
                                  {teacherSearchQuery.trim() ? 'لا توجد نتائج مطابقة' : 'لا يوجد أساتذة في قاعدة البيانات'}
                                </div>
                              ) : (
                                filteredDbTeachers.map(t => {
                                  const isAlreadyAdded = courseInstructors.some(ci => ci.name.toLowerCase() === t.name.toLowerCase());
                                  return (
                                    <div
                                      key={t.id || t.name}
                                      onClick={() => !isAlreadyAdded && handleAddTeacher(t)}
                                      className={clsx(
                                        "px-3 py-2 flex items-center justify-between gap-2 transition cursor-pointer text-right",
                                        isAlreadyAdded
                                          ? "opacity-40 cursor-not-allowed bg-slate-50/50 dark:bg-zinc-800/30"
                                          : "hover:bg-slate-50 dark:hover:bg-zinc-800/80"
                                      )}
                                    >
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                          {t.name}
                                        </div>
                                        {t.email && (
                                          <div className="text-[10px] text-slate-400 font-mono truncate" dir="ltr">
                                            {t.email}
                                          </div>
                                        )}
                                      </div>
                                      <span
                                        className="text-[10.5px] font-bold px-2 py-0.5 rounded-md shrink-0"
                                        style={{
                                          backgroundColor: isAlreadyAdded ? undefined : 'color-mix(in srgb, var(--color-imamu-accent) 15%, transparent)',
                                          color: isAlreadyAdded ? '#888' : 'var(--color-imamu-accent)'
                                        }}
                                      >
                                        {isAlreadyAdded ? 'مضاف' : '+ إضافة'}
                                      </span>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}

                        {courseInstructors.length === 0 ? (
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-dashed border-slate-200 dark:border-zinc-700 text-center space-y-2">
                            <User className="w-5 h-5 mx-auto text-slate-400 opacity-60" />
                            <p className="text-xs text-slate-500 dark:text-zinc-400">لا يوجد أساتذة مسجلين لهذا المقرر حالياً.</p>
                            <button
                              type="button"
                              onClick={() => { setIsEditingInstructors(true); setIsSearchingTeachers(true); }}
                              className="px-3 py-1.5 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs inline-flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>إضافة أستاذ</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            {courseInstructors.map((inst, idx) => {
                              const emailToCopy = inst.email || `${(fetchedSection?.courseCode || 'course').toLowerCase()}@imamu.edu.sa`;
                              return (
                                <div
                                  key={idx}
                                  className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-3"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-10 h-10 rounded-2xl bg-stone-100 dark:bg-stone-900/50 border border-[var(--color-imamu-accent)]/20 text-[var(--color-imamu-accent)] flex items-center justify-center shrink-0">
                                      <User className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                                          {inst.name}
                                        </h4>
                                        <span
                                          className={clsx(
                                            "text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0",
                                            inst.isPrimary
                                              ? "bg-stone-100 dark:bg-stone-900/50 text-[var(--color-imamu-accent)]"
                                              : "bg-slate-200/60 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300"
                                          )}
                                        >
                                          {inst.isPrimary ? 'أستاذ رئيسي' : 'أستاذ مشارك'}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate" dir="ltr">
                                        {emailToCopy}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    {isEditingInstructors ? (
                                      /* Edit Mode: Remove Button replaces Copy Email Button */
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveTeacher(idx)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-xs font-bold transition hover:bg-rose-100 dark:hover:bg-rose-900/50 cursor-pointer shadow-2xs"
                                        title="حذف الأستاذ من هذا المقرر"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span className="text-[11px]">حذف</span>
                                      </button>
                                    ) : (
                                      /* Normal Mode: Copy Email Button */
                                      <button
                                        type="button"
                                        onClick={() => handleCopyEmail(emailToCopy)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 transition cursor-pointer"
                                      >
                                        {copiedEmail === emailToCopy ? (
                                          <>
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                            <span className="text-emerald-500 text-[11px]">تم النسخ!</span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-[11px]">نسخ البريد</span>
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Add Teacher option shown while editing */}
                            {isEditingInstructors && !isSearchingTeachers && (
                              <button
                                type="button"
                                onClick={() => setIsSearchingTeachers(true)}
                                className="w-full py-2 px-3 border border-dashed border-slate-300 dark:border-zinc-700 hover:border-[var(--color-imamu-accent)] rounded-xl text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-[var(--color-imamu-accent)] transition flex items-center justify-center gap-1.5 bg-slate-50/50 dark:bg-zinc-800/30 cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>إضافة أستاذ للمقرر</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>

                      {/* Course Timings Box (Clicking opens TimingEditor inline) */}
                      <div className="space-y-3">
                        {!isEditingTimings ? (
                          /* Timings Preview Card */
                          <div
                            onClick={() => setIsEditingTimings(true)}
                            className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 hover:border-[var(--color-imamu-accent)]/50 transition cursor-pointer group shadow-xs"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                                أوقات ومواعيد المحاضرات
                              </span>
                              <span className="text-[11px] font-bold text-[var(--color-imamu-accent)] group-hover:underline flex items-center gap-1">
                                <Edit3 className="w-3.5 h-3.5" />
                                تعديل المواعيد والقاعة
                              </span>
                            </div>

                            {/* Timings List */}
                            <div className="space-y-2">
                              {customSchedules.map((sch, i) => (
                                <div
                                  key={sch.id || i}
                                  className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="flex gap-1">
                                      {sch.days.map(d => (
                                        <span
                                          key={d}
                                          className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-900/50 text-[var(--color-imamu-accent)] font-bold text-[10px]"
                                        >
                                          {d}
                                        </span>
                                      ))}
                                    </div>
                                    <span className="text-slate-700 dark:text-zinc-300 font-semibold" dir="ltr">
                                      {sch.startTime} → {sch.endTime}
                                    </span>
                                  </div>
                                  {sch.classroom && (
                                    <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1 text-[11px]">
                                      <MapPin className="w-3 h-3 text-[var(--color-imamu-accent)]" />
                                      القاعة: {sch.classroom}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          /* TimingEditor */
                          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-[var(--color-imamu-accent)]/40 space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
                              <span className="text-xs font-bold text-[var(--color-imamu-accent)] flex items-center gap-1.5">
                                <Clock className="w-4 h-4" />
                                محرر المواعيد والقاعة
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsEditingTimings(false)}
                                className="px-3.5 py-1.5 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold transition cursor-pointer shadow-sm"
                              >
                                حفظ والرجوع للنظرة العامة ✓
                              </button>
                            </div>
                            <TimingEditor
                              schedules={customSchedules}
                              availableTeachers={courseInstructors.map(t => t.name)}
                              onChange={(newSched) => {
                                setCustomSchedules(newSched);
                                setHasUserEdited(true);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}



                  {/* ─── Tab 3: TUTORIALS ─── */}
                  {activeTab === 'tutorials' && (
                    <motion.div
                      key="tab-tutorials"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="space-y-3"
                    >
                      {freeTutorials.length === 0 && paidTutorials.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 dark:text-zinc-500 space-y-2">
                          <Video className="w-10 h-10 mx-auto opacity-40 text-[var(--color-imamu-accent)]" />
                          <p className="text-xs">لا توجد شروحات مسجلة لهذا المقرر حالياً.</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Free Tutorials */}
                          {freeTutorials.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Video className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                                <span>المصادر المجانية ({freeTutorials.length})</span>
                              </h3>
                              {freeTutorials.map((tut, i) => (
                                <a
                                  key={i}
                                  href={tut.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 hover:bg-stone-50 dark:hover:bg-stone-950/40 border border-slate-200/80 dark:border-zinc-800 hover:border-[var(--color-imamu-accent)]/50 transition-all duration-200 group cursor-pointer"
                                >
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900/50 text-[var(--color-imamu-accent)] shrink-0">
                                      <Video className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[var(--color-imamu-accent)] transition-colors truncate">
                                        {tut.title || 'شرح مجاني للمقرر'}
                                      </h4>
                                    </div>
                                  </div>
                                  <ExternalLink className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-[var(--color-imamu-accent)] transition-colors shrink-0" />
                                </a>
                              ))}
                            </div>
                          )}

                          {/* Paid Tutorials */}
                          {paidTutorials.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Tag className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                                <span>المصادر والشروحات المدفوعة ({paidTutorials.length})</span>
                              </h3>
                              {paidTutorials.map((tut: any, i) => (
                                <a
                                  key={i}
                                  href={tut.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 dark:bg-zinc-800/40 hover:bg-stone-50 dark:hover:bg-stone-950/40 border border-slate-200/80 dark:border-zinc-800/80 hover:border-[var(--color-imamu-accent)]/50 transition-all duration-200 group cursor-pointer"
                                >
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900/50 text-[var(--color-imamu-accent)] shrink-0">
                                      <Video className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[var(--color-imamu-accent)] transition-colors truncate">
                                        {tut.title || 'شرح مدفوع'}
                                      </h4>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {tut.code && (
                                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-stone-900/50 text-[var(--color-imamu-accent)] text-xs font-bold border border-amber-500/30">
                                        <Tag className="w-3 h-3" />
                                        <span>{tut.code}</span>
                                      </span>
                                    )}
                                    <ExternalLink className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-[var(--color-imamu-accent)] transition-colors shrink-0" />
                                  </div>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* ─── Tab 4: FILES ─── */}
                  {activeTab === 'files' && (
                    <motion.div
                      key="tab-files"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="space-y-3"
                    >
                      <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Folder className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                        <span>الملفات ({fileResources.length})</span>
                      </h3>
                      {fileResources.length === 0 ? (
                        <div className="py-12 text-center text-slate-400 dark:text-zinc-500 space-y-2">
                          <Folder className="w-10 h-10 mx-auto opacity-40 text-[var(--color-imamu-accent)]" />
                          <p className="text-xs">لا توجد ملفات أو روابط درايف مسجلة لهذا المقرر حالياً.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {fileResources.map((file, i) => (
                            <a
                              key={i}
                              href={file.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 hover:bg-stone-50 dark:hover:bg-stone-950/40 border border-slate-200/80 dark:border-zinc-800 hover:border-[var(--color-imamu-accent)]/50 transition-all duration-200 group cursor-pointer"
                            >
                              <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900/50 text-[var(--color-imamu-accent)] shrink-0">
                                <Folder className="w-5 h-5 text-[var(--color-imamu-accent)]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1">
                                  <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[var(--color-imamu-accent)] transition-colors truncate">
                                    {file.title || 'مجلد ملفات المقرر (Drive / Box)'}
                                  </h4>
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 group-hover:text-[var(--color-imamu-accent)] transition-colors shrink-0" />
                                </div>
                              </div>
                            </a>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            <div className="h-10 shrink-0" />
          </div>
        </div>

        {/* ─── Bottom Action Bar ─── */}
        <div className="px-5 py-3.5 border-t border-slate-200/80 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/60 backdrop-blur-md flex items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            {initialCourse && onDeleteCourseFromSemester && (
              <button
                type="button"
                onClick={() => {
                  onDeleteCourseFromSemester(selectedSemId, initialCourse.courseCode, initialCourse.crn);
                  handleModalClose();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs font-bold transition cursor-pointer active:scale-98"
                title="حذف المقرر من الفصل"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف المقرر</span>
              </button>
            )}

            {initialCourse && (
              <button
                type="button"
                onClick={handleCheckCourseUpdates}
                disabled={isCheckingUpdates}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-xs font-bold transition cursor-pointer active:scale-98 disabled:opacity-60"
                title="التحقق من وجود تحديثات للمقرر وتطبيقها"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdates ? 'animate-spin' : ''}`} />
                <span>{isCheckingUpdates ? 'جاري الفحص...' : 'تحديث بيانات المقرر'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {initialCourse && !hasUserEdited ? (
              <button
                type="button"
                onClick={handleModalClose}
                className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-xs font-bold transition cursor-pointer active:scale-98"
              >
                إغلاق
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={isBrowsingCatalog && !selectedSubject ? () => setIsBrowsingCatalog(false) : handleModalClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  {isBrowsingCatalog && !selectedSubject ? 'العودة' : 'إلغاء'}
                </button>

                {fetchedSection ? (
                  <button
                    type="button"
                    onClick={handleConfirmAddCrnCourse}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                  >
                    {initialCourse ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{initialCourse ? 'حفظ التعديلات' : 'إضافة المقرر'}</span>
                  </button>
                ) : selectedSubject ? (
                  <button
                    type="button"
                    onClick={handleConfirmManualCourse}
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98"
                  >
                    {initialCourse ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{initialCourse ? 'حفظ التعديلات' : 'إضافة المقرر'}</span>
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* ─── Course Update Comparison Modal Dialog ─── */}
      <AnimatePresence>
        {courseUpdateDiff && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full sm:max-w-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="px-6 py-4.5 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0 bg-white dark:bg-zinc-900">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-stone-100 dark:bg-zinc-800 text-[var(--color-imamu-accent)] flex items-center justify-center border border-slate-200/60 dark:border-zinc-700/60 shadow-2xs shrink-0">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
                      تحديث بيانات المقرر
                    </h3>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-xs text-slate-600 dark:text-zinc-300 font-medium truncate">
                        {courseUpdateDiff.courseTitle}
                      </span>
                      <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-[11px] font-bold rounded-md border border-zinc-200 dark:border-zinc-700 font-mono" dir="ltr">
                        {courseUpdateDiff.courseCode}
                      </span>
                      {courseUpdateDiff.crn && (
                        <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 text-[11px] font-bold rounded-md border border-zinc-200 dark:border-zinc-700 font-mono" dir="ltr">
                          CRN: {courseUpdateDiff.crn}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCourseUpdateDiff(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer shrink-0"
                  title="إغلاق النافذة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sub-bar: Clean prompt & Select All */}
              <div className="px-6 py-3 border-b border-slate-100 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400 shrink-0">
                <span>تم رصد تحديثات في النظام، حدد ما ترغب بتطبيقه:</span>
                <button
                  type="button"
                  onClick={() => {
                    const allChecked = courseUpdateDiff.items.every(item => selectedDiffKeys[item.key]);
                    const nextKeys: Record<string, boolean> = {};
                    courseUpdateDiff.items.forEach(item => {
                      nextKeys[item.key] = !allChecked;
                    });
                    setSelectedDiffKeys(nextKeys);
                  }}
                  className="text-xs font-bold text-[var(--color-imamu-accent)] hover:underline cursor-pointer"
                >
                  {courseUpdateDiff.items.every(item => selectedDiffKeys[item.key]) ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </button>
              </div>

              {/* Diff List */}
              <div className="p-6 overflow-y-auto space-y-3 custom-scrollbar flex-1">
                {courseUpdateDiff.items.map(item => {
                  const isChecked = !!selectedDiffKeys[item.key];
                  return (
                    <div
                      key={item.key}
                      onClick={() => setSelectedDiffKeys(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer select-none space-y-3 ${
                        isChecked
                          ? 'bg-slate-50/80 dark:bg-zinc-800/60 border-[var(--color-imamu-accent)]/60 shadow-2xs'
                          : 'bg-slate-50/50 dark:bg-zinc-900 border-slate-200/80 dark:border-zinc-800 opacity-60 hover:opacity-90'
                      }`}
                    >
                      {/* Card Title & Checkbox */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                            isChecked
                              ? 'bg-[var(--color-imamu-brown)] border-[var(--color-imamu-brown)] text-white'
                              : 'border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-transparent'
                          }`}>
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          </div>
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                            {item.iconType === 'user' && <User className="w-4 h-4 text-[var(--color-imamu-accent)]" />}
                            {item.iconType === 'clock' && <Clock className="w-4 h-4 text-[var(--color-imamu-accent)]" />}
                            {item.iconType === 'map-pin' && <MapPin className="w-4 h-4 text-[var(--color-imamu-accent)]" />}
                            {item.iconType === 'users' && <Users className="w-4 h-4 text-[var(--color-imamu-accent)]" />}
                            {item.iconType === 'calendar' && <Calendar className="w-4 h-4 text-[var(--color-imamu-accent)]" />}
                            {item.title}
                          </span>
                        </div>
                        {isChecked && (
                          <span className="text-[10px] font-bold text-[var(--color-imamu-accent)] bg-stone-100 dark:bg-stone-900/60 px-2 py-0.5 rounded-md">
                            سيتم التحديث
                          </span>
                        )}
                      </div>

                      {/* Schedule Item Diff */}
                      {item.key === 'schedules_times' && item.currentSchedules && item.newSchedules ? (
                        <div className="space-y-3 pt-1">
                          {/* Current */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-slate-400 dark:text-zinc-500 block">
                              الحالي في جدولك:
                            </span>
                            <div className="flex flex-wrap gap-2 opacity-60">
                              {item.currentSchedules.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs">
                                  <div className="flex gap-1">
                                    {s.days.map(d => (
                                      <span key={d} className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 font-bold text-[10px]">
                                        {d}
                                      </span>
                                    ))}
                                  </div>
                                  <span dir="ltr" className="line-through text-slate-500 dark:text-zinc-400 font-medium">
                                    {s.startTime} → {s.endTime}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* New */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-[var(--color-imamu-accent)] block">
                              الجديد في النظام:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {item.newSchedules.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-xs shadow-2xs">
                                  <div className="flex gap-1">
                                    {s.days.map(d => (
                                      <span key={d} className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-900/50 text-[var(--color-imamu-accent)] font-bold text-[10px]">
                                        {d}
                                      </span>
                                    ))}
                                  </div>
                                  <span dir="ltr" className="font-bold text-slate-800 dark:text-white">
                                    {s.startTime} → {s.endTime}
                                  </span>
                                  {s.classroom && (
                                    <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1 text-[11px] mr-1">
                                      <MapPin className="w-3 h-3 text-[var(--color-imamu-accent)]" />
                                      {s.classroom}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Non-schedule diffs (Instructors, classroom, exam) */
                        <div className="space-y-2 pt-1 text-xs">
                          <div className="flex items-start gap-2">
                            <span className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 min-w-[80px] shrink-0 pt-0.5">
                              الحالي في جدولك:
                            </span>
                            <span className="text-slate-500 dark:text-zinc-400 line-through leading-relaxed">
                              {item.currentDisplay || 'غير محددة'}
                            </span>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="text-[11px] font-bold text-[var(--color-imamu-accent)] min-w-[80px] shrink-0 pt-0.5">
                              الجديد في النظام:
                            </span>
                            <span className="text-slate-900 dark:text-white font-bold leading-relaxed">
                              {item.newDisplay || 'غير محددة'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Footer Actions */}
              <div className="px-6 py-4 border-t border-slate-200/80 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/60 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setCourseUpdateDiff(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  إلغاء
                </button>

                <button
                  type="button"
                  onClick={handleApplySelectedUpdates}
                  disabled={!Object.values(selectedDiffKeys).some(Boolean)}
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>
                    تطبيق التحديثات ({Object.values(selectedDiffKeys).filter(Boolean).length})
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Notice Dialog (e.g. Up to date or not found) ─── */}
      <AnimatePresence>
        {updateNoticeMessage && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-stone-100 dark:bg-zinc-800 text-[var(--color-imamu-accent)] mx-auto flex items-center justify-center border border-slate-200 dark:border-zinc-700 shadow-2xs">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  تحديث بيانات المقرر
                </h4>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {updateNoticeMessage}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUpdateNoticeMessage(null)}
                className="w-full py-2.5 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold transition cursor-pointer active:scale-98 shadow-xs"
              >
                حسناً
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
