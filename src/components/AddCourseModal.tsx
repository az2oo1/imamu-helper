'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  ArrowLeft
} from 'lucide-react';
import { WhatsappIcon } from './WhatsappIcon';
import { TimingEditor, ScheduleItem } from './TimingEditor';
import {
  parseScheduleDays,
  parseTimeRange,
  formatTo12Hour,
  formatScheduleDaysDisplay,
  DAY_MAP_AR
} from '../lib/schedule-utils';
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
}

interface AddCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  semesters: { id: string; label: string; term?: string; academicYear?: string; semester?: string }[];
  activeSemId: string | null;
  initialCourse?: CourseEntry | null;
  onAddCourseToSemester: (semesterId: string, course: CourseEntry) => void;
  onDeleteCourseFromSemester?: (semesterId: string, courseCode: string, crn?: string) => void;
  onOpenCreateSemester: () => void;
  allSubjects?: any[];
}

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

      if (initialCourse.crn) {
        setCrnInput(initialCourse.crn);
        setCustomWaLink(initialCourse.whatsappLink || '');
        setWaLinkInput(initialCourse.whatsappLink || '');

        const fallbackSchedules = initialCourse.customSchedule && initialCourse.customSchedule.length > 0
          ? initialCourse.customSchedule
          : [];
        setCustomSchedules(fallbackSchedules);

        const fallbackSec: any = {
          crn: initialCourse.crn,
          courseCode: initialCourse.courseCode,
          courseTitle: initialCourse.courseName,
          creditHours: initialCourse.creditHours || 3,
          sectionNumber: initialCourse.sectionNumber,
          whatsappLink: initialCourse.whatsappLink || '',
          schedules: fallbackSchedules.map(fs => ({
            days: fs.days,
            startTime: fs.startTime,
            endTime: fs.endTime,
            room: fs.classroom,
            instructor: fs.teacher
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
          .then(data => {
            const found = Array.isArray(data?.sections) && data.sections.length > 0 ? data.sections[0] : null;
            if (found) {
              setFetchedSection((prev: any) => ({
                ...prev,
                ...found,
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
    onClose();
  };

  if (!isOpen) return null;

  // ─────────────────────────────────────────────
  // 1. Empty State: No Semesters Available
  // ─────────────────────────────────────────────
  if (semesters.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm" dir="rtl">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl text-center space-y-5"
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
      const found = Array.isArray(data?.sections) && data.sections.length > 0 ? data.sections[0] : null;

      if (!found) {
        setCrnError(`لم يتم العثور على شعبة تطابق الـ CRN (${raw}). تأكد من صحة الرقم أو اختر المقرر من دليل المقررات.`);
      } else {
        setFetchedSection(found);
        setCustomWaLink(found.whatsappLink || '');

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

  const handleConfirmAddCrnCourse = () => {
    if (!fetchedSection || !selectedSemId) return;
    const course: CourseEntry = {
      subjectId: fetchedSection.subjectId || initialCourse?.subjectId,
      courseCode: fetchedSection.courseCode || initialCourse?.courseCode || '',
      courseName: fetchedSection.courseTitle || initialCourse?.courseName || fetchedSection.courseCode || '',
      crn: String(fetchedSection.crn || crnInput || initialCourse?.crn || '').trim(),
      creditHours: fetchedSection.creditHours || initialCourse?.creditHours || 3,
      sectionNumber: (fetchedSection.sectionNumber ? String(fetchedSection.sectionNumber).trim() : undefined) || initialCourse?.sectionNumber,
      examDate: initialCourse?.examDate,
      examTime: initialCourse?.examTime,
      customSchedule: customSchedules,
      whatsappLink: customWaLink || initialCourse?.whatsappLink || undefined
    };
    onAddCourseToSemester(selectedSemId, course);
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
      whatsappLink: manualWaLink || initialCourse?.whatsappLink || undefined
    };
    onAddCourseToSemester(selectedSemId, course);
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      dir="rtl"
      onClick={handleModalClose}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm cursor-pointer"
      />

      {/* Modal Window Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{
          duration: 0.28,
          ease: [0.4, 0, 0.2, 1]
        }}
        onClick={e => e.stopPropagation()}
        className={`relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full ${isBrowsingCatalog && !selectedSubject ? 'max-w-lg' : 'max-w-[480px]'} overflow-hidden shadow-2xl flex flex-col max-h-[88vh] z-10 transition-all duration-200`}
      >
        {/* ─── Simple Clean Modal Header ─── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-stone-100 dark:bg-stone-900/60 border border-[var(--color-imamu-accent)]/20 flex items-center justify-center shrink-0 overflow-hidden p-1">
              {fetchedSection ? (
                <>
                  <img src="/logo_dark.png" alt="مساعد الإمام" className="w-full h-full object-contain dark:hidden" />
                  <img src="/logo_light.png" alt="مساعد الإمام" className="w-full h-full object-contain hidden dark:block" />
                </>
              ) : selectedSubject ? (
                <BookOpen className="w-5 h-5 text-[var(--color-imamu-accent)]" />
              ) : isBrowsingCatalog ? (
                <BookOpen className="w-5 h-5 text-[var(--color-imamu-accent)]" />
              ) : (
                <GraduationCap className="w-5 h-5 text-[var(--color-imamu-accent)]" />
              )}
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

        {/* ─── Body Content with Dynamic Height Animation ─── */}
        <motion.div
          animate={{ height: contentHeight }}
          transition={{ duration: 0.28, ease: [0.4, 0.2, 0.2, 1] }}
          className="overflow-hidden flex-1 flex flex-col"
        >
          <div ref={contentRef} className="p-5 sm:p-6 overflow-y-auto max-h-[calc(85vh-7rem)] custom-scrollbar space-y-5">
            {/* ══════════════════════════════════════════════════════════════
                FLOW 1: INITIAL POPUP (Year Slide-down + CRN Box + Catalog Box)
                ══════════════════════════════════════════════════════════════ */}
            {!fetchedSection && !selectedSubject && !isBrowsingCatalog && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 space-y-2">
                  <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 block">
                    الفصل الدراسي
                  </label>
                  <div className="relative">
                    <select
                      value={selectedSemId}
                      onChange={e => setSelectedSemId(e.target.value)}
                      className="w-full appearance-none bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white text-xs font-bold rounded-xl px-4 py-2.5 pr-4 pl-10 outline-none cursor-pointer focus:ring-1 focus:ring-[var(--color-imamu-accent)] focus:border-[var(--color-imamu-accent)] transition"
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
                    <label className="text-xs font-bold text-slate-800 dark:text-zinc-200 mb-1 block">
                      الرقم المرجعي للشعبة (CRN)
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                      أدخل رقم الـ CRN واضغط <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-700 font-semibold text-[10px] text-slate-700 dark:text-zinc-300">Enter</kbd> لجلب بيانات المقرر والجدول فوراً.
                    </p>
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
                    onChange={e => setManualWaLink(e.target.value)}
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
                    onChange={setManualSchedules}
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
                      {/* Section WhatsApp Link (placed ABOVE the teachers as requested) */}
                      <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center shrink-0">
                            <WhatsappIcon className="w-5 h-5 fill-current" />
                          </div>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                              {`قروب واتساب ${sectionNameDisplay || 'الشعبة'}`}
                              {customWaLink && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">
                                  مسجل
                                </span>
                              )}
                            </h4>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                              {customWaLink
                                ? 'رابط القروب الطلابي المعتمد لهذه الشعبة للتواصل والمذكرات'
                                : 'لا يوجد رابط قروب واتساب مسجل لهذه الشعبة، يمكنك إضافته'}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          {customWaLink ? (
                            <>
                              <a
                                href={customWaLink}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                              >
                                <WhatsappIcon className="w-3.5 h-3.5 fill-current" />
                                <span>انضمام</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  setWaLinkInput(customWaLink);
                                  setIsEditingWaLink(true);
                                }}
                                className="p-2 rounded-xl border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 text-xs font-bold transition cursor-pointer"
                                title="تعديل الرابط"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setWaLinkInput('');
                                setIsEditingWaLink(true);
                              }}
                              className="flex items-center gap-1 text-xs font-bold text-emerald-500 hover:text-emerald-400 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>إضافة رابط</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* WhatsApp Edit Drawer */}
                      {isEditingWaLink && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-3.5 rounded-2xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 flex flex-col sm:flex-row gap-2"
                        >
                          <input
                            type="url"
                            value={waLinkInput}
                            onChange={e => setWaLinkInput(e.target.value)}
                            placeholder="https://chat.whatsapp.com/..."
                            className="flex-1 px-3.5 py-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-emerald-500"
                            dir="ltr"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCustomWaLink(waLinkInput.trim());
                                setIsEditingWaLink(false);
                              }}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                            >
                              حفظ الرابط
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsEditingWaLink(false)}
                              className="px-3 py-2 bg-slate-200 dark:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs rounded-xl transition cursor-pointer"
                            >
                              إلغاء
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Instructor Information Cards (All Teachers) */}
                      {(() => {
                        let list: { name: string; email?: string; isPrimary?: boolean }[] = [];
                        if (Array.isArray(fetchedSection.instructors) && fetchedSection.instructors.length > 0) {
                          list = fetchedSection.instructors;
                        } else if (fetchedSection.primaryInstructor && fetchedSection.primaryInstructor !== 'غير محدد') {
                          list = [{
                            name: fetchedSection.primaryInstructor,
                            email: `${fetchedSection.courseCode.toLowerCase()}@imamu.edu.sa`,
                            isPrimary: true
                          }];
                        } else {
                          list = [{
                            name: 'أستاذ المادة',
                            email: undefined,
                            isPrimary: true
                          }];
                        }

                        return (
                          <div className="space-y-2.5">
                            <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 px-1 flex items-center justify-between">
                              <span>هيئة التدريس ({list.length})</span>
                              <span className="text-[10px] text-slate-400">معتمد من نظام بانر</span>
                            </div>

                            {list.map((inst, idx) => {
                              const emailToCopy = inst.email || `${fetchedSection.courseCode.toLowerCase()}@imamu.edu.sa`;
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

                                  {/* Copy Email Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleCopyEmail(emailToCopy)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 transition cursor-pointer shrink-0"
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
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}

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
                              onChange={setCustomSchedules}
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
          </div>
        </motion.div>

        {/* ─── Bottom Action Bar ─── */}
        <div className="px-5 py-3.5 border-t border-slate-200/80 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-900/60 backdrop-blur-md flex items-center justify-between gap-2.5 shrink-0">
          <div>
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
          </div>

          <div className="flex items-center gap-2">
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
          </div>
        </div>
      </motion.div>
    </div>
  );
}
