'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Calendar, Search, Filter, RefreshCw, Upload, CheckCircle2,
  AlertTriangle, Trash2, Clock, MapPin, User, Users,
  BookOpen, ChevronRight, ChevronLeft, Eye, X, FileText, Loader2,
  Check, Layers, Sparkles, Folder, FolderOpen, FolderPlus, ArrowRight,
  Copy, Mail, UserCheck, ChevronDown, ChevronUp, Plus, RotateCcw,
  Activity, Play, Pause, Radio, Globe, Sliders
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { formatScheduleDaysDisplay } from '../../lib/schedule-utils';
import { formatDate } from '../../lib/date-utils';

interface ScheduleMeeting {
  type?: string;
  meetingType?: string;
  days?: string[] | string;
  daysString?: string;
  startTime?: string;
  endTime?: string;
  timeRange?: string;
  startDate?: string;
  endDate?: string;
  building?: string;
  buildingCode?: string;
  room?: string;
  campus?: string;
}

interface SectionItem {
  id: number;
  crn: string;
  sectionNumber: string;
  courseCode: string;
  courseTitle: string;
  subjectId?: number;
  academicYear?: string;
  semester?: string;
  term?: string;
  campus?: string;
  scheduleType?: string;
  instructionalMethod?: string;
  creditHours?: number;
  primaryInstructor?: string;
  instructors?: { name: string; email?: string; isPrimary?: boolean }[];
  schedules?: ScheduleMeeting[];
  scheduleSummary?: string;
  isOpen?: boolean;
  maxEnrollment?: number | null;
  currentEnrollment?: number | null;
  seatsAvailable?: number | null;
  finalExam?: any;
  createdAt?: string;
}

export interface BannerTermItem {
  termCode: string;
  termName: string;
  academicYear: string;
  semester: string;
  monitorChanges: boolean;
  autoUpdate: boolean;
  updateIntervalDays: number;
  lastSyncAt?: string | null;
  lastCheckAt?: string | null;
  totalSections: number;
  status: 'idle' | 'syncing' | 'error';
  lastError?: string | null;
}

export interface DetectedTermItem {
  termCode: string;
  termName: string;
  academicYear: string;
  semester: string;
}

export interface FolderItem {
  id: string;
  name: string;
  academicYear?: string;
  semester?: string;
  term?: string;
  termCode?: string;
  count: number;
  bannerConfig?: BannerTermItem;
}

const FOLDERS_STORAGE_KEY = 'imamu_section_folders';

export function saveSharedFolders(folderList: Array<{ name: string; academicYear?: string; semester?: string; term?: string; count?: number }>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folderList));
  } catch {}
}

export function loadSharedFolders(): Array<{ name: string; academicYear?: string; semester?: string; term?: string; count?: number }> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FOLDERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function AdminSectionsTab({
  getToken,
  toast,
  defaultSubTab = 'sections'
}: {
  getToken: () => Promise<string>;
  toast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  defaultSubTab?: 'sections' | 'teachers';
}) {
  const [activeSubTab, setActiveSubTab] = useState<'sections' | 'teachers'>(defaultSubTab);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [expandedTeacherIds, setExpandedTeacherIds] = useState<Record<string, boolean>>({});

  const toggleTeacherExpanded = (id: string) => {
    setExpandedTeacherIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    setActiveSubTab(defaultSubTab);
  }, [defaultSubTab]);

  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(25);

  // Filters
  const [search, setSearch] = useState('');
  const [campusFilter, setCampusFilter] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [availableTerms, setAvailableTerms] = useState<Array<{ academicYear?: string; semester?: string; term?: string; count?: number }>>([]);

  // Folder View State
  // Folder View State: null = root explorer (show folders only), 'all' = all sections, FolderItem = specific term
  const [selectedFolder, setSelectedFolder] = useState<FolderItem | 'all' | null>(null);

  // Selected Section for Details Modal
  const [selectedSection, setSelectedSection] = useState<SectionItem | null>(null);

  // Banner Terms State
  const [bannerTerms, setBannerTerms] = useState<BannerTermItem[]>([]);
  const [bannerTermsLoading, setBannerTermsLoading] = useState(false);

  // Add Term Modal State
  const [isAddTermModalOpen, setIsAddTermModalOpen] = useState(false);
  const [detectedTerms, setDetectedTerms] = useState<DetectedTermItem[]>([]);
  const [detectedLoading, setDetectedLoading] = useState(false);
  const [selectedTermMode, setSelectedTermMode] = useState<'detected' | 'custom'>('detected');
  const [selectedTermCode, setSelectedTermCode] = useState<string>('');
  const [customTermCode, setCustomTermCode] = useState('');
  const [customTermName, setCustomTermName] = useState('');
  const [customYear, setCustomYear] = useState('1448');
  const [customSemester, setCustomSemester] = useState('الفصل الأول');
  const [newTermMonitorChanges, setNewTermMonitorChanges] = useState(true);
  const [newTermAutoUpdate, setNewTermAutoUpdate] = useState(true);
  const [newTermIntervalDays, setNewTermIntervalDays] = useState(2);
  const [newTermSyncImmediately, setNewTermSyncImmediately] = useState(true);
  const [addingTerm, setAddingTerm] = useState(false);

  // Add CRNs Modal State
  const [addCrnsTerm, setAddCrnsTerm] = useState<BannerTermItem | null>(null);
  const [crnsInputText, setCrnsInputText] = useState('');
  const [addingCrns, setAddingCrns] = useState(false);
  const [addCrnsResult, setAddCrnsResult] = useState<{ addedCount: number; message: string } | null>(null);

  // Action status indicators
  const [syncingTermCode, setSyncingTermCode] = useState<string | null>(null);
  const [emptyingTermCode, setEmptyingTermCode] = useState<string | null>(null);

  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Derive folder list from bannerTerms and availableTerms
  const folders: FolderItem[] = useMemo(() => {
    const list: FolderItem[] = [];
    const bannerCodeSet = new Set<string>();

    for (const bt of bannerTerms) {
      bannerCodeSet.add(bt.termCode);
      list.push({
        id: bt.termCode,
        name: bt.termName,
        academicYear: bt.academicYear,
        semester: bt.semester,
        term: bt.termCode,
        termCode: bt.termCode,
        count: bt.totalSections || 0,
        bannerConfig: bt
      });
    }

    // Also include any terms from availableTerms that aren't already represented
    for (const t of availableTerms) {
      const codeOrTerm = t.term || '';
      if (codeOrTerm && bannerCodeSet.has(codeOrTerm)) continue;
      const name = t.term || (t.academicYear && t.semester ? `${t.academicYear} - ${t.semester}` : t.academicYear || t.semester || 'غير مصنف');
      const id = t.term || `${t.academicYear || ''}-${t.semester || ''}`;
      if (!list.some(f => f.name === name || f.id === id)) {
        list.push({
          id,
          name,
          academicYear: t.academicYear,
          semester: t.semester,
          term: t.term,
          termCode: t.term,
          count: t.count || 0
        });
      }
    }

    return list;
  }, [bannerTerms, availableTerms]);

  const grandTotalSections = folders.reduce((sum, t) => sum + (Number(t.count) || 0), 0);

  // Fetch distinct terms metadata from DB
  const fetchTerms = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/sections/terms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const termsList = data.terms || [];
        setAvailableTerms(termsList);
        if (Array.isArray(termsList)) {
          const list = termsList.map((t: any) => ({
            name: t.term || (t.academicYear && t.semester ? `${t.academicYear} - ${t.semester}` : t.academicYear || t.semester || ''),
            academicYear: t.academicYear,
            semester: t.semester,
            term: t.term,
            count: t.count || 0
          })).filter((x: any) => Boolean(x.name));
          saveSharedFolders(list);
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, [getToken]);

  // Fetch registered banner terms
  const fetchBannerTerms = useCallback(async () => {
    setBannerTermsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/banner/terms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBannerTerms(data.terms || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBannerTermsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchTerms();
    fetchBannerTerms();
  }, [fetchTerms, fetchBannerTerms]);

  // Open Add Term Modal and query detected terms
  const openAddTermModal = async () => {
    setIsAddTermModalOpen(true);
    setDetectedLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/banner/detected-terms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const terms = data.terms || [];
        setDetectedTerms(terms);
        if (terms.length > 0) {
          setSelectedTermCode(terms[0].termCode);
        }
      }
    } catch (e) {
      console.error(e);
      toast('error', 'تعذر جلب الفصول المكتشفة من بانر');
    } finally {
      setDetectedLoading(false);
    }
  };

  // Submit adding term
  const handleAddTermSubmit = async () => {
    let termCode = '';
    let termName = '';
    let academicYear = '';
    let semester = '';

    if (selectedTermMode === 'detected') {
      const found = detectedTerms.find(t => t.termCode === selectedTermCode);
      if (!found) {
        toast('warning', 'يرجى اختيار فصل دراسي محدد');
        return;
      }
      termCode = found.termCode;
      termName = found.termName;
      academicYear = found.academicYear;
      semester = found.semester;
    } else {
      if (!customTermCode.trim() || !customTermName.trim()) {
        toast('warning', 'يرجى إدخال رمز الفصل واسمه');
        return;
      }
      termCode = customTermCode.trim();
      termName = customTermName.trim();
      academicYear = customYear.trim();
      semester = customSemester.trim();
    }

    setAddingTerm(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/banner/terms', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          termCode,
          termName,
          academicYear,
          semester,
          syncImmediately: newTermSyncImmediately
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'فشل إضافة الفصل');
      }

      // Update options toggles
      await fetch(`/api/admin/banner/terms/${encodeURIComponent(termCode)}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          monitorChanges: newTermMonitorChanges,
          autoUpdate: newTermAutoUpdate,
          updateIntervalDays: newTermIntervalDays
        })
      });

      toast('success', `تمت إضافة الفصل «${termName}» بنجاح!`);
      setIsAddTermModalOpen(false);
      fetchBannerTerms();
      fetchTerms();
    } catch (e: any) {
      toast('error', e.message || 'حدث خطأ أثناء إضافة الفصل');
    } finally {
      setAddingTerm(false);
    }
  };

  // Toggle Live Monitoring for Term
  const handleToggleMonitor = async (termCode: string, currentValue: boolean) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/banner/terms/${encodeURIComponent(termCode)}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ monitorChanges: !currentValue })
      });
      if (res.ok) {
        toast('success', !currentValue ? 'تم تفعيل مراقبة التغييرات الفورية' : 'تم إيقاف مراقبة التغييرات');
        fetchBannerTerms();
      } else {
        toast('error', 'فشل تحديث إعدادات المراقبة');
      }
    } catch {
      toast('error', 'خطأ في الاتصال بالخادم');
    }
  };

  // Toggle Auto Regular Update for Term
  const handleToggleAutoUpdate = async (termCode: string, currentValue: boolean) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/banner/terms/${encodeURIComponent(termCode)}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ autoUpdate: !currentValue })
      });
      if (res.ok) {
        toast('success', !currentValue ? 'تم تفعيل التحديث الدوري التلقائي' : 'تم إيقاف التحديث الدوري');
        fetchBannerTerms();
      } else {
        toast('error', 'فشل تحديث إعدادات التحديث الدوري');
      }
    } catch {
      toast('error', 'خطأ في الاتصال بالخادم');
    }
  };

  // Change Update Interval for Term
  const handleChangeInterval = async (termCode: string, newDays: number) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/banner/terms/${encodeURIComponent(termCode)}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ updateIntervalDays: newDays })
      });
      if (res.ok) {
        toast('success', `تم ضبط التحديث الدوري ليكون كل ${newDays} ${newDays === 1 ? 'يوم' : newDays === 2 ? 'يومين' : 'أيام'}`);
        fetchBannerTerms();
      }
    } catch {
      toast('error', 'خطأ في الاتصال بالخادم');
    }
  };

  // Immediate Full Sync for Term
  const handleSyncNow = async (termCode: string) => {
    setSyncingTermCode(termCode);
    try {
      const token = await getToken();
      toast('info', 'بدأت مزامنة بيانات الشعب ومقاعدها من بانر الآن...');
      const res = await fetch(`/api/admin/banner/terms/${encodeURIComponent(termCode)}/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast('success', `اكتملت المزامنة بنجاح! تم استيراد ${data.sectionsCount?.toLocaleString() || 0} شعبة و ${data.coursesCount?.toLocaleString() || 0} مقرر.`);
        fetchBannerTerms();
        fetchTerms();
        if (selectedFolder) fetchSections();
      } else {
        toast('error', data.error || 'فشلت المزامنة من بانر');
      }
    } catch (e: any) {
      toast('error', e.message || 'خطأ أثناء المزامنة');
    } finally {
      setSyncingTermCode(null);
    }
  };

  // Empty Term Sections
  const handleEmptyTerm = async (termCode: string, termName: string) => {
    if (!confirm(`⚠️ هل أنت متأكد من تفريغ كافة شُعب الفصل «${termName}» من قاعدة البيانات؟\n\nستبقى إعدادات الفصل محفوظة للمزامنة اللاحقة.`)) {
      return;
    }
    setEmptyingTermCode(termCode);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/banner/terms/${encodeURIComponent(termCode)}/empty`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast('success', data.message || 'تم تفريغ شعب الفصل بنجاح');
        fetchBannerTerms();
        fetchTerms();
        if (selectedFolder) fetchSections();
      } else {
        toast('error', data.error || 'فشل تفريغ شعب الفصل');
      }
    } catch {
      toast('error', 'حدث خطأ في الاتصال');
    } finally {
      setEmptyingTermCode(null);
    }
  };

  // Delete Term from Tracking
  const handleDeleteTerm = async (termCode: string, termName: string) => {
    if (!confirm(`⚠️ هل أنت متأكد من حذف الفصل «${termName}» وإلغاء متابعته نهائياً؟\n\nسيتم مسح شعب هذا الفصل أيضاً.`)) {
      return;
    }
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/banner/terms/${encodeURIComponent(termCode)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast('success', 'تم حذف الفصل الدراسي بنجاح');
        if (selectedFolder && selectedFolder !== 'all' && (selectedFolder.termCode === termCode || selectedFolder.id === termCode)) {
          setSelectedFolder(null);
        }
        fetchBannerTerms();
        fetchTerms();
      } else {
        toast('error', 'فشل حذف الفصل');
      }
    } catch {
      toast('error', 'حدث خطأ في الاتصال');
    }
  };

  // Detected CRNs count for modal
  const detectedCrnsCount = useMemo(() => {
    const raw = crnsInputText.trim();
    if (!raw) return 0;
    try {
      if (raw.startsWith('[') || raw.startsWith('{')) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter(Boolean).length;
        }
        if (parsed && Array.isArray(parsed.crns)) {
          return parsed.crns.filter(Boolean).length;
        }
      }
    } catch {}
    return raw.split(/[\s,،\n\r]+/).filter(c => /^\d+$/.test(c.trim())).length;
  }, [crnsInputText]);

  // Submit adding CRNs
  const handleAddCrnsSubmit = async () => {
    if (!addCrnsTerm) return;
    const raw = crnsInputText.trim();
    if (!raw) {
      toast('warning', 'يرجى إدخال أرقام الـ CRN أولاً');
      return;
    }

    let crns: string[] = [];
    try {
      if (raw.startsWith('[') || raw.startsWith('{')) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          crns = parsed.map(item => typeof item === 'object' && item !== null ? String(item.crn || item.CRN || '') : String(item)).filter(Boolean);
        } else if (parsed && Array.isArray(parsed.crns)) {
          crns = parsed.crns.map(String).filter(Boolean);
        }
      }
    } catch {}

    if (crns.length === 0) {
      crns = raw.split(/[\s,،\n\r]+/).map(c => c.trim()).filter(c => /^\d+$/.test(c));
    }

    if (crns.length === 0) {
      toast('warning', 'لم يتم العثور على أرقام CRN صالحة. تأكد من الصيغة.');
      return;
    }

    setAddingCrns(true);
    setAddCrnsResult(null);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/banner/terms/${encodeURIComponent(addCrnsTerm.termCode)}/add-crns`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ crns })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        setAddCrnsResult({
          addedCount: data.addedCount || 0,
          message: data.message || `تمت إضافة ${data.addedCount} شعبة بنجاح`
        });
        toast('success', data.message || 'تمت إضافة الشعب بنجاح!');
        fetchBannerTerms();
        fetchTerms();
        if (selectedFolder) fetchSections();
      } else {
        toast('error', data.error || 'فشلت إضافة الشعب من بانر');
      }
    } catch (e: any) {
      toast('error', e.message || 'خطأ أثناء إضافة الشعب');
    } finally {
      setAddingCrns(false);
    }
  };


  // Fetch teachers list from backend API
  const fetchTeachers = useCallback(async () => {
    setTeachersLoading(true);
    try {
      const token = await getToken();
      const termParam = selectedFolder && selectedFolder !== 'all' ? (selectedFolder.term || selectedFolder.name) : '';
      const url = termParam ? `/api/admin/teachers?term=${encodeURIComponent(termParam)}` : '/api/admin/teachers';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.teachers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTeachersLoading(false);
    }
  }, [getToken, selectedFolder]);

  useEffect(() => {
    if (activeSubTab === 'teachers') {
      fetchTeachers();
    }
  }, [activeSubTab, fetchTeachers]);

  const filteredTeachers = useMemo(() => {
    if (!teacherSearch.trim()) return teachers;
    const q = teacherSearch.trim().toLowerCase();
    return teachers.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.email && t.email.toLowerCase().includes(q)) ||
      (t.courses && t.courses.some((c: any) =>
        c.courseCode.toLowerCase().includes(q) ||
        c.courseTitle.toLowerCase().includes(q)
      ))
    );
  }, [teachers, teacherSearch]);

  // Fetch sections list (only invoked when a folder is selected)
  const fetchSections = useCallback(async () => {
    if (selectedFolder === null) return;
    setLoading(true);
    try {
      const token = await getToken();
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(search ? { search } : {}),
        ...(campusFilter ? { campus: campusFilter } : {}),
        ...(selectedFolder === 'all'
          ? {
              ...(academicYearFilter ? { academicYear: academicYearFilter } : {}),
              ...(semesterFilter ? { semester: semesterFilter } : {})
            }
          : selectedFolder.term
          ? { term: selectedFolder.term }
          : {
              ...(selectedFolder.academicYear ? { academicYear: selectedFolder.academicYear } : {}),
              ...(selectedFolder.semester ? { semester: selectedFolder.semester } : {})
            })
      });

      const res = await fetch(`/api/admin/sections?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setSections(data.sections || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
      } else {
        toast('error', 'فشل جلب الشعب الدراسية');
      }
    } catch (e) {
      console.error(e);
      toast('error', 'خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }, [getToken, page, limit, search, campusFilter, academicYearFilter, semesterFilter, selectedFolder, toast]);

  useEffect(() => {
    if (selectedFolder !== null) {
      fetchSections();
    } else {
      setSections([]);
    }
  }, [fetchSections, selectedFolder]);

  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Handle Select Folder
  const handleSelectFolder = (folder: FolderItem | 'all' | null) => {
    setSelectedFolder(folder);
    setPage(1);
    setSearch('');
    if (folder && folder !== 'all') {
      setAcademicYearFilter(folder.academicYear || '');
      setSemesterFilter(folder.semester || '');
    } else {
      setAcademicYearFilter('');
      setSemesterFilter('');
    }
  };

  // Handle Delete Single Section
  const handleDeleteSection = async (id: number, crn: string) => {
    if (!confirm(`هل أنت متأكد من حذف الشعبة ذات الرقم المرجعي ${crn}؟`)) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/sections/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast('success', `تم حذف الشعبة ${crn} بنجاح`);
        fetchSections();
        fetchTerms();
      } else {
        toast('error', 'فشل حذف الشعبة');
      }
    } catch (e) {
      toast('error', 'خطأ في الاتصال بالخادم');
    }
  };

  // Handle Delete Entire Folder
  const handleDeleteFolder = async (folder: FolderItem) => {
    const confirmMsg = `⚠️ هل أنت متأكد من حذف كافة شعب مجلد «${folder.name}» (${folder.count.toLocaleString()} شعبة) بالكامل؟\n\nتنويه: لن يتم المساس بأي مجلدات أو فصول دراسية أخرى.`;
    if (!confirm(confirmMsg)) return;

    try {
      const token = await getToken();
      const params = new URLSearchParams();
      if (folder.term) params.append('term', folder.term);
      if (folder.academicYear) params.append('academicYear', folder.academicYear);
      if (folder.semester) params.append('semester', folder.semester);

      const res = await fetch(`/api/admin/sections/clear-all?${params.toString()}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast('success', `تم حذف شعب مجلد «${folder.name}» بنجاح!`);
        if (selectedFolder && selectedFolder !== 'all' && selectedFolder.id === folder.id) {
          setSelectedFolder(null);
        }
        setPage(1);
        fetchSections();
        fetchTerms();
      } else {
        toast('error', data.error || 'فشل حذف شعب المجلد');
      }
    } catch (e) {
      console.error(e);
      toast('error', 'حدث خطأ أثناء حذف شعب المجلد');
    }
  };

  // Handle Delete All Sections
  const handleDeleteAllSections = async () => {
    const isFolderTarget = selectedFolder && selectedFolder !== 'all';
    const countToDelete = isFolderTarget ? selectedFolder.count : (selectedFolder === 'all' ? totalCount : grandTotalSections);
    if (countToDelete === 0) {
      toast('info', 'لا توجد شعب دراسية لحذفها');
      return;
    }

    const targetDesc = isFolderTarget ? `مجلد (${selectedFolder.name})` : 'كافة المجلدات والفصول';
    const confirmMsg = `⚠️ تحذير: هل أنت متأكد من مسح وحذف الشعب لـ ${targetDesc} (${countToDelete.toLocaleString()} شعبة) بالكامل؟\n\nتنويه: لا يمكن التراجع عن هذه العملية بعد التأكيد.`;

    if (!confirm(confirmMsg)) return;

    setIsDeletingAll(true);
    try {
      const token = await getToken();
      const params = new URLSearchParams();
      if (isFolderTarget) {
        if (selectedFolder.term) {
          params.append('term', selectedFolder.term);
        } else {
          if (selectedFolder.academicYear) params.append('academicYear', selectedFolder.academicYear);
          if (selectedFolder.semester) params.append('semester', selectedFolder.semester);
        }
      } else {
        if (academicYearFilter) params.append('academicYear', academicYearFilter);
        if (semesterFilter) params.append('semester', semesterFilter);
      }

      const res = await fetch(`/api/admin/sections/clear-all?${params.toString()}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast('success', data.message || `تم مسح وحذف ${data.count ?? countToDelete} شعبة بنجاح!`);
        setSelectedFolder(null);
        setPage(1);
        fetchTerms();
      } else {
        toast('error', data.error || 'فشل حذف الشعب');
      }
    } catch (e) {
      console.error(e);
      toast('error', 'حدث خطأ أثناء مسح وحذف الشعب');
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Top View Toggle: Sections vs Teachers */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-2 border-b border-slate-200 dark:border-zinc-800">
        <div className="flex items-center gap-2.5">
          {activeSubTab === 'teachers' ? (
            <>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-black" style={{ color: 'var(--text-main)' }}>هيئة التدريس</h1>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">كشف ومتابعة أعضاء هيئة التدريس والمحاضرين</p>
              </div>
            </>
          ) : (
            <>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-black" style={{ color: 'var(--text-main)' }}>الشعب والمواعيد</h1>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">إدارة الفصول الدراسية والمزامنة التلقائية مع بانر</p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={openAddTermModal}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md border border-amber-700/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة فصل دراسي</span>
          </button>
          <button
            onClick={() => {
              if (activeSubTab === 'teachers') fetchTeachers();
              else { fetchSections(); fetchTerms(); fetchBannerTerms(); }
            }}
            disabled={loading || teachersLoading || bannerTermsLoading}
            className="p-2 rounded-xl border transition hover:bg-slate-100 dark:hover:bg-zinc-800"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || teachersLoading || bannerTermsLoading) ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {activeSubTab === 'teachers' ? (
        <div className="space-y-6">
          {/* Header & Term Selector for Teachers */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div>
              <h2 className="text-xl font-black" style={{ color: 'var(--text-main)' }}>
                أعضاء هيئة التدريس والمحاضرين
              </h2>
              <p className="text-xs sm:text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                كشف بجميع أعضاء هيئة التدريس والمقررات والشُعب المسندة لهم من واقع بيانات الشُعب المسجلة.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-500">الفصل الدراسي:</span>
              <select
                value={selectedFolder && selectedFolder !== 'all' ? selectedFolder.id : 'all'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'all') handleSelectFolder('all');
                  else {
                    const f = folders.find(x => x.id === val);
                    if (f) handleSelectFolder(f);
                  }
                }}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer"
                style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              >
                <option value="all">كافة الفصول المسجلة</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={teacherSearch}
              onChange={(e) => setTeacherSearch(e.target.value)}
              placeholder="ابحث باسم المحاضر، البريد، أو رمز المقرر..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
          </div>

          {/* Loading or Empty or Cards */}
          {teachersLoading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-600 mb-2" />
              <p className="text-xs font-bold text-slate-500">جاري تحميل قائمة المحاضرين...</p>
            </div>
          ) : filteredTeachers.length === 0 ? (
            <div className="p-12 text-center border rounded-2xl" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}>
              <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-zinc-600 mb-2" />
              <p className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                {teachers.length === 0 ? 'لا توجد شُعب مسجلة لاستخراج المحاضرين منها' : 'لا توجد نتائج مطابقة لبحثك'}
              </p>
              {teachers.length === 0 && (
                <button
                  onClick={openAddTermModal}
                  className="mt-3 px-4 py-2 bg-[var(--color-imamu-brown)] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  إضافة فصل دراسي من بانر
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTeachers.map((teacher: any) => (
                <div
                  key={teacher.id}
                  className="p-4 rounded-2xl border transition hover:shadow-md flex flex-col justify-between gap-3"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-black" style={{ color: 'var(--text-main)' }}>
                          {teacher.name}
                        </h3>
                        {teacher.email ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                            <Mail className="w-3 h-3 text-[var(--color-imamu-accent)]" />
                            <span dir="ltr" className="font-mono text-[11px]">{teacher.email}</span>
                            <button
                              onClick={() => copyEmail(teacher.email)}
                              className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-zinc-700"
                              title="نسخ البريد"
                            >
                              {copiedEmail === teacher.email ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400">البريد غير متوفر</span>
                        )}
                      </div>
                      <span
                        className="px-2.5 py-1 rounded-xl text-xs font-black shrink-0"
                        style={{
                          backgroundColor: 'color-mix(in srgb, var(--color-imamu-accent) 12%, transparent)',
                          color: 'var(--color-imamu-accent)',
                        }}
                      >
                        {teacher.courses?.length || 0} مقررات
                      </span>
                    </div>

                    {/* Slide down button to show what they teach */}
                    {teacher.courses && teacher.courses.length > 0 && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => toggleTeacherExpanded(teacher.id)}
                          className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-imamu-accent)] hover:underline cursor-pointer select-none py-1"
                        >
                          <span>{expandedTeacherIds[teacher.id] ? 'إخفاء ما يدرّسه' : 'عرض ما يدرّسه'}</span>
                          {expandedTeacherIds[teacher.id] ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <AnimatePresence>
                          {expandedTeacherIds[teacher.id] && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="flex flex-wrap gap-1.5 pt-2 border-t mt-1" style={{ borderColor: 'var(--border-color)' }}>
                                {teacher.courses.map((c: any) => (
                                  <div
                                    key={c.courseCode}
                                    className="px-2.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5"
                                    style={{ background: 'var(--bg-main)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                                  >
                                    <BookOpen className="w-3.5 h-3.5 text-[var(--color-imamu-accent)] shrink-0" />
                                    <span className="font-bold text-[var(--color-imamu-accent)]">{c.courseCode}</span>
                                    <span>{c.courseTitle}</span>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        selectedFolder === null ? (
        /* ================================================================ */
        /* VIEW A: Folders Explorer (استعراض الفصول كمجلدات فقط)             */
        /* ================================================================ */
        <div className="space-y-6">
          {/* Header & Stats */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black" style={{ color: 'var(--text-main)' }}>
                  الشعب الدراسية والمواعيد
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-[var(--color-imamu-accent)] border border-amber-500/20">
                  {folders.length} فصول دراسية
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700">
                  {grandTotalSections.toLocaleString()} شعبة مسجلة
                </span>
              </div>
              <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                تصفح الفصول الدراسية كمجلدات. اضغط على أي فصل لاستعراض وتحميل الشعب والمواعيد الخاصة به.
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {grandTotalSections > 0 && (
                <button
                  onClick={handleDeleteAllSections}
                  disabled={isDeletingAll}
                  className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md border border-rose-700/30 disabled:opacity-50"
                  title="حذف ومسح جميع الشعب الدراسية للبدء بفصل دراسي جديد"
                >
                  {isDeletingAll ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>حذف جميع الشعب</span>
                </button>
              )}

              <button
                onClick={openAddTermModal}
                className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md border border-amber-700/30 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة فصل دراسي</span>
              </button>

              <button
                onClick={() => { fetchTerms(); fetchBannerTerms(); }}
                className="p-2.5 rounded-xl border transition hover:bg-slate-100 dark:hover:bg-zinc-800"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                title="تحديث قائمة الفصول"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Folders Explorer Container */}
          <div className="p-5 rounded-2xl border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-[var(--color-imamu-accent)]">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
                    مجلدات الفصول الأكاديمية
                  </h3>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    اضغط على أي مجلد لتحميل وعرض الشعب الخاصة به أو إدارة مزامنته مع بانر
                  </p>
                </div>
              </div>

              <button
                onClick={openAddTermModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[var(--color-imamu-accent)] border border-amber-500/30 text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة فصل دراسي</span>
              </button>
            </div>

            {folders.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-[var(--color-imamu-accent)] mx-auto flex items-center justify-center">
                  <Folder className="w-7 h-7" />
                </div>
                <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                  لا توجد فصول دراسية مضافة حالياً
                </div>
                <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
                  اضغط على زر «إضافة فصل دراسي» لاختيار فصل من بانر والبدء في سحب ومراقبة وتحديث الشعب تلقائياً.
                </p>
                <button
                  type="button"
                  onClick={openAddTermModal}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-imamu-brown)] text-white text-xs font-bold shadow-md hover:bg-[var(--color-imamu-brown-dark)] transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة أول فصل دراسي من بانر</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-1">
                {/* Individual Folder Cards */}
                {folders.map((folder) => {
                  const isSyncing = syncingTermCode === (folder.termCode || folder.id) || folder.bannerConfig?.status === 'syncing';
                  const isEmptying = emptyingTermCode === (folder.termCode || folder.id);

                  return (
                    <div
                      key={folder.id}
                      onClick={() => handleSelectFolder(folder)}
                      className="group p-4 rounded-2xl border text-right transition-all duration-150 hover:shadow-md hover:border-amber-500/50 hover:bg-amber-500/[0.02] cursor-pointer flex flex-col justify-between gap-3 relative border-slate-200 dark:border-zinc-800/80"
                      style={{ background: 'var(--bg-subtle)' }}
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-[var(--color-imamu-accent)] group-hover:bg-[var(--color-imamu-brown)] group-hover:text-white transition flex items-center justify-center shrink-0 shadow-xs">
                            <Folder className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold truncate text-slate-900 dark:text-white group-hover:text-[var(--color-imamu-accent)] transition" title={folder.name}>
                                {folder.name}
                              </span>
                              {folder.termCode && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-amber-500/10 text-[var(--color-imamu-accent)] border border-amber-500/20">
                                  {folder.termCode}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {folder.academicYear ? `عام ${folder.academicYear}` : 'سنة دراسية'} {folder.semester ? `• ${folder.semester}` : ''}
                            </div>
                          </div>
                        </div>

                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-[var(--color-imamu-accent)] shrink-0">
                          {folder.count.toLocaleString()} شعبة
                        </span>
                      </div>

                      {/* Syncing Progress Banner if active */}
                      {isSyncing && (
                        <div className="p-2 rounded-xl bg-amber-500/15 text-[var(--color-imamu-accent)] text-xs font-bold flex items-center gap-2 animate-pulse">
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          <span>جاري المزامنة والتحديث من بانر...</span>
                        </div>
                      )}

                      {/* Options & Controls (1: Monitoring, 2: Auto Update) */}
                      {folder.bannerConfig && (
                        <div
                          className="p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 space-y-2 bg-white/50 dark:bg-zinc-900/50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Option 1: Monitoring for changes */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5">
                              <Activity className={clsx("w-3.5 h-3.5", folder.bannerConfig.monitorChanges ? "text-emerald-500" : "text-slate-400")} />
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300">مراقبة التغييرات:</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleMonitor(folder.termCode!, folder.bannerConfig!.monitorChanges)}
                              className={clsx(
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                folder.bannerConfig.monitorChanges ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-700"
                              )}
                              title={folder.bannerConfig.monitorChanges ? "المراقبة مفعلة (فحص دوري للمقاعد والشعب)" : "المراقبة متوقفة"}
                            >
                              <span className={clsx(
                                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                folder.bannerConfig.monitorChanges ? "translate-x-0" : "-translate-x-4"
                              )} />
                            </button>
                          </div>

                          {/* Option 2: Regularly updating + Frequency */}
                          <div className="flex items-center justify-between text-xs gap-2 pt-1 border-t border-slate-200/40 dark:border-zinc-800/60">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <RefreshCw className={clsx("w-3.5 h-3.5", folder.bannerConfig.autoUpdate ? "text-amber-500" : "text-slate-400")} />
                              <span className="text-[11px] font-semibold text-slate-700 dark:text-zinc-300 shrink-0">تحديث دوري:</span>
                              {folder.bannerConfig.autoUpdate && (
                                <select
                                  value={folder.bannerConfig.updateIntervalDays || 2}
                                  onChange={(e) => handleChangeInterval(folder.termCode!, Number(e.target.value))}
                                  className="text-[10px] font-bold py-0.5 px-1.5 rounded-lg border bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-[var(--color-imamu-accent)] cursor-pointer"
                                >
                                  <option value={1}>كل 1 يوم</option>
                                  <option value={2}>كل يومين</option>
                                  <option value={3}>كل 3 أيام</option>
                                  <option value={7}>كل أسبوع</option>
                                </select>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleToggleAutoUpdate(folder.termCode!, folder.bannerConfig!.autoUpdate)}
                              className={clsx(
                                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                                folder.bannerConfig.autoUpdate ? "bg-amber-500" : "bg-slate-300 dark:bg-zinc-700"
                              )}
                              title={folder.bannerConfig.autoUpdate ? "التحديث الدوري مفعل" : "التحديث الدوري متوقف"}
                            >
                              <span className={clsx(
                                "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                                folder.bannerConfig.autoUpdate ? "translate-x-0" : "-translate-x-4"
                              )} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Quick Actions Strip */}
                      <div className="flex items-center justify-between border-t pt-2.5 border-slate-200/60 dark:border-zinc-800/80 text-[11px]" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleSelectFolder(folder)}
                          className="text-[var(--color-imamu-accent)] font-bold flex items-center gap-1 group-hover:translate-x-[-2px] transition-transform cursor-pointer"
                        >
                          <span>فتح المجلد</span>
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>

                        <div className="flex items-center gap-1">
                          {/* Sync Now Button */}
                          <button
                            type="button"
                            onClick={() => handleSyncNow(folder.termCode || folder.id)}
                            disabled={isSyncing}
                            className="p-1.5 rounded-lg hover:bg-amber-500/15 text-slate-400 hover:text-[var(--color-imamu-accent)] transition cursor-pointer disabled:opacity-40"
                            title="مزامنة فورية وتحديث كامل من بانر الآن"
                          >
                            <RefreshCw className={clsx("w-3.5 h-3.5", isSyncing && "animate-spin")} />
                          </button>

                          {/* Option 4: Add CRNs by JSON */}
                          <button
                            type="button"
                            onClick={() => {
                              const bt = folder.bannerConfig || {
                                termCode: folder.termCode || folder.id,
                                termName: folder.name,
                                academicYear: folder.academicYear || '',
                                semester: folder.semester || '',
                                monitorChanges: false,
                                autoUpdate: false,
                                updateIntervalDays: 2,
                                totalSections: folder.count,
                                status: 'idle'
                              };
                              setAddCrnsTerm(bt);
                              setCrnsInputText('');
                              setAddCrnsResult(null);
                            }}
                            className="p-1.5 rounded-lg hover:bg-amber-500/15 text-slate-400 hover:text-[var(--color-imamu-accent)] transition cursor-pointer"
                            title="إضافة شعب بالرقم المرجعي (CRN) أو JSON"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* Option 3: Empty Term */}
                          <button
                            type="button"
                            onClick={() => handleEmptyTerm(folder.termCode || folder.id, folder.name)}
                            disabled={isEmptying}
                            className="p-1.5 rounded-lg hover:bg-amber-500/15 text-slate-400 hover:text-amber-600 transition cursor-pointer disabled:opacity-40"
                            title="تفريغ كافة شعب هذا الفصل"
                          >
                            <RotateCcw className={clsx("w-3.5 h-3.5", isEmptying && "animate-spin")} />
                          </button>

                          {/* Delete Term */}
                          <button
                            type="button"
                            onClick={() => folder.bannerConfig ? handleDeleteTerm(folder.termCode!, folder.name) : handleDeleteFolder(folder)}
                            className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-400 hover:text-red-500 transition cursor-pointer"
                            title="حذف الفصل الدراسي بالكامل"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* "All Sections" Card */}
                <div
                  onClick={() => handleSelectFolder('all')}
                  className="group p-4 rounded-2xl border text-right transition-all duration-150 hover:shadow-md hover:border-amber-500/50 hover:bg-amber-500/[0.02] cursor-pointer flex flex-col justify-between gap-3 relative border-slate-200 dark:border-zinc-800/80"
                  style={{ background: 'var(--bg-subtle)' }}
                >
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300 group-hover:bg-[var(--color-imamu-brown)] group-hover:text-white transition flex items-center justify-center shrink-0 shadow-xs">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold truncate text-slate-900 dark:text-white group-hover:text-[var(--color-imamu-accent)] transition">
                          كافة الشعب الدراسية
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          عرض والبحث في كل الشعب مجمعة
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 shrink-0">
                      {grandTotalSections.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t pt-2.5 border-slate-200/60 dark:border-zinc-800/80 text-[11px]" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleSelectFolder('all')}
                      className="text-[var(--color-imamu-accent)] font-bold flex items-center gap-1 group-hover:translate-x-[-2px] transition-transform cursor-pointer"
                    >
                      <span>استعراض الكل</span>
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ================================================================ */
        /* VIEW B: Folder Sections Table (استعراض وإدارة شعب المجلد المحدد)  */
        /* ================================================================ */
        <div className="space-y-6">
          {/* Active Folder Navigation & Actions Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => handleSelectFolder(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-zinc-700 text-xs font-bold transition shadow-xs cursor-pointer shrink-0"
              >
                <ChevronRight className="w-4 h-4" />
                <span>العودة إلى مجلدات الفصول</span>
              </button>

              <div className="h-5 w-px bg-amber-500/30 shrink-0" />

              <div className="flex items-center gap-2 min-w-0">
                {selectedFolder === 'all' ? (
                  <Layers className="w-5 h-5 text-[var(--color-imamu-accent)] shrink-0" />
                ) : (
                  <FolderOpen className="w-5 h-5 text-[var(--color-imamu-accent)] shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-500 dark:text-zinc-400">المجلد:</span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">
                      {selectedFolder === 'all' ? 'كافة الشعب الدراسية' : selectedFolder.name}
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-[var(--color-imamu-accent)]">
                      {loading ? 'جاري التحميل...' : `${totalCount.toLocaleString()} شعبة`}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {selectedFolder !== 'all' && (
                <>
                  {/* Quick Toggles if Banner Config is available */}
                  {selectedFolder.bannerConfig && (
                    <div className="flex items-center gap-2 p-1 bg-white/70 dark:bg-zinc-800/70 border border-slate-200 dark:border-zinc-700 rounded-xl px-2.5 text-xs">
                      {/* Monitor toggle */}
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-zinc-200" title="مراقبة التغييرات وتحديث المقاعد والشعب">
                        <Activity className={clsx("w-3.5 h-3.5", selectedFolder.bannerConfig.monitorChanges ? "text-emerald-500" : "text-slate-400")} />
                        <span>مراقبة</span>
                        <input
                          type="checkbox"
                          checked={selectedFolder.bannerConfig.monitorChanges}
                          onChange={() => handleToggleMonitor(selectedFolder.termCode || selectedFolder.id, selectedFolder.bannerConfig!.monitorChanges)}
                          className="w-3.5 h-3.5 accent-emerald-500 rounded cursor-pointer"
                        />
                      </label>

                      <div className="w-px h-3.5 bg-slate-200 dark:bg-zinc-700" />

                      {/* Auto update toggle */}
                      <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-700 dark:text-zinc-200" title="تحديث دوري تلقائي">
                        <RefreshCw className={clsx("w-3.5 h-3.5", selectedFolder.bannerConfig.autoUpdate ? "text-amber-500" : "text-slate-400")} />
                        <span>تحديث دوري</span>
                        <input
                          type="checkbox"
                          checked={selectedFolder.bannerConfig.autoUpdate}
                          onChange={() => handleToggleAutoUpdate(selectedFolder.termCode || selectedFolder.id, selectedFolder.bannerConfig!.autoUpdate)}
                          className="w-3.5 h-3.5 accent-amber-500 rounded cursor-pointer"
                        />
                      </label>
                    </div>
                  )}

                  {/* Immediate Sync Button */}
                  <button
                    type="button"
                    onClick={() => handleSyncNow(selectedFolder.termCode || selectedFolder.id)}
                    disabled={syncingTermCode === (selectedFolder.termCode || selectedFolder.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition cursor-pointer shadow-xs disabled:opacity-50"
                    title="مزامنة وتحديث الشعب فوراً من بانر"
                  >
                    <RefreshCw className={clsx("w-3.5 h-3.5", syncingTermCode === (selectedFolder.termCode || selectedFolder.id) && "animate-spin")} />
                    <span>مزامنة فورية من بانر</span>
                  </button>

                  {/* Add CRNs Button */}
                  <button
                    type="button"
                    onClick={() => {
                      const bt = selectedFolder.bannerConfig || {
                        termCode: selectedFolder.termCode || selectedFolder.id,
                        termName: selectedFolder.name,
                        academicYear: selectedFolder.academicYear || '',
                        semester: selectedFolder.semester || '',
                        monitorChanges: false,
                        autoUpdate: false,
                        updateIntervalDays: 2,
                        totalSections: selectedFolder.count,
                        status: 'idle'
                      };
                      setAddCrnsTerm(bt);
                      setCrnsInputText('');
                      setAddCrnsResult(null);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 transition cursor-pointer shadow-xs"
                    title="إضافة وتحديث أرقام CRN محددة عبر JSON"
                  >
                    <FileText className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                    <span>إضافة شعب (JSON)</span>
                  </button>

                  {/* Empty Term Sections Button */}
                  <button
                    type="button"
                    onClick={() => handleEmptyTerm(selectedFolder.termCode || selectedFolder.id, selectedFolder.name)}
                    disabled={emptyingTermCode === (selectedFolder.termCode || selectedFolder.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-xs font-bold text-amber-700 dark:text-amber-300 transition cursor-pointer disabled:opacity-50"
                    title="تفريغ جميع شعب هذا الفصل"
                  >
                    <RotateCcw className={clsx("w-3.5 h-3.5", emptyingTermCode === (selectedFolder.termCode || selectedFolder.id) && "animate-spin")} />
                    <span>تفريغ الشعب</span>
                  </button>

                  {/* Delete Term Button */}
                  <button
                    type="button"
                    onClick={() => selectedFolder.bannerConfig ? handleDeleteTerm(selectedFolder.termCode!, selectedFolder.name) : handleDeleteFolder(selectedFolder)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold text-red-600 dark:text-red-400 transition cursor-pointer"
                    title="حذف الفصل الدراسي بالكامل"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف الفصل</span>
                  </button>
                </>
              )}

              <button
                onClick={() => fetchSections()}
                className="p-2 rounded-xl border transition hover:bg-slate-100 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-800"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                title="تحديث البيانات"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-4 rounded-2xl border flex flex-col md:flex-row items-center gap-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="بحث بالرقم المرجعي CRN، رقم الشعبة، رمز المقرر، اسم المقرر، أو اسم الدكتور..."
                className="w-full pl-4 pr-9 py-2 rounded-xl text-xs sm:text-sm border transition focus:outline-none focus:border-amber-600"
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
              {selectedFolder === 'all' && (
                <>
                  <select
                    value={academicYearFilter}
                    onChange={(e) => {
                      setAcademicYearFilter(e.target.value);
                      setPage(1);
                    }}
                    className="flex-1 md:w-36 py-2 px-3 rounded-xl text-xs border"
                    style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  >
                    <option value="">كل السنوات الأكاديمية</option>
                    {Array.from(new Set(['1448', '1447', '1446', ...availableTerms.map((t) => t.academicYear).filter(Boolean)])).sort().reverse().map((y) => (
                      <option key={y as string} value={y as string}>{y} هـ</option>
                    ))}
                  </select>

                  <select
                    value={semesterFilter}
                    onChange={(e) => {
                      setSemesterFilter(e.target.value);
                      setPage(1);
                    }}
                    className="flex-1 md:w-36 py-2 px-3 rounded-xl text-xs border"
                    style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  >
                    <option value="">جميع الفصول</option>
                    <option value="الفصل الأول">الفصل الأول</option>
                    <option value="الفصل الثاني">الفصل الثاني</option>
                    <option value="الفصل الثالث">الفصل الثالث</option>
                    <option value="الفصل الصيفي">الفصل الصيفي</option>
                  </select>
                </>
              )}

              <select
                value={campusFilter}
                onChange={(e) => {
                  setCampusFilter(e.target.value);
                  setPage(1);
                }}
                className="flex-1 md:w-40 py-2 px-3 rounded-xl text-xs border"
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              >
                <option value="">جميع المقار والفروع</option>
                <option value="طلاب">المدينة الجامعية - طلاب</option>
                <option value="طالبات">المدينة الجامعية - طالبات</option>
                <option value="عن بعد">تعليم عن بعد</option>
              </select>
            </div>
          </div>

          {/* Sections List Table */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            {loading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--color-imamu-accent)]" />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>جاري تحميل الشعب...</span>
              </div>
            ) : sections.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-zinc-600" />
                <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>لم يتم العثور على أي شعب مطابقة</div>
                <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
                  جرّب تغيير كلمات البحث أو الفلاتر، أو قم بإضافة شعب جديدة لهذا المجلد.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="border-b text-slate-400 font-semibold" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                    <tr>
                      <th className="py-3 px-4">CRN</th>
                      <th className="py-3 px-4">الشعبة</th>
                      <th className="py-3 px-4">المقرر</th>
                      <th className="py-3 px-4">الفصل والسنة</th>
                      <th className="py-3 px-4">المحاضر</th>
                      <th className="py-3 px-4">المواعيد والقاعات</th>
                      <th className="py-3 px-4">المقر</th>
                      <th className="py-3 px-4 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                    {sections.map((sec) => {
                      const firstSched = sec.schedules?.[0];

                      return (
                        <tr key={sec.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/40 transition">
                          {/* CRN */}
                          <td className="py-3 px-4 font-mono font-bold text-[var(--color-imamu-accent)]">
                            {sec.crn || '—'}
                          </td>

                          {/* Section Number */}
                          <td className="py-3 px-4">
                            <span className="px-2 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 font-mono font-bold text-slate-700 dark:text-slate-300">
                              {sec.sectionNumber || '—'}
                            </span>
                          </td>

                          {/* Course */}
                          <td className="py-3 px-4 max-w-[220px]">
                            <div className="font-bold truncate text-slate-800 dark:text-slate-100">
                              {sec.courseTitle || sec.courseCode}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400">
                              {sec.courseCode} {sec.creditHours ? `• ${sec.creditHours} س` : ''}
                            </div>
                          </td>

                          {/* Term / Year & Semester */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {sec.term || (sec.academicYear && sec.semester ? `${sec.academicYear} - ${sec.semester}` : sec.academicYear || sec.semester) ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-[var(--color-imamu-accent)] border border-amber-500/20">
                                <Calendar className="w-3 h-3 text-[var(--color-imamu-accent)] shrink-0" />
                                <span>{sec.term || `${sec.academicYear || ''} ${sec.semester || ''}`}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">عام / غير محدد</span>
                            )}
                          </td>

                          {/* Instructor */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-200">
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span
                                  className="truncate max-w-[140px]"
                                  title={sec.primaryInstructor || (sec.instructors?.[0]?.name) || 'غير محدد'}
                                >
                                  {sec.primaryInstructor || (sec.instructors?.[0]?.name) || 'غير محدد'}
                                </span>
                              </div>
                              {sec.instructors && sec.instructors.length > 1 && (
                                <div
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 w-fit cursor-help"
                                  title={sec.instructors.map(i => `${i.name}${i.email ? ` (${i.email})` : ''}${i.isPrimary ? ' [رئيسي]' : ''}`).join('\n')}
                                >
                                  <Users className="w-3 h-3 shrink-0" />
                                  <span>+{sec.instructors.length - 1} آخرين</span>
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Schedule Summary */}
                          <td className="py-3 px-4 max-w-[240px]">
                            {sec.scheduleSummary ? (
                              <div className="truncate text-slate-600 dark:text-slate-300" title={sec.scheduleSummary}>
                                {sec.scheduleSummary}
                              </div>
                            ) : firstSched ? (
                              <div className="truncate text-slate-600 dark:text-slate-300">
                                {formatScheduleDaysDisplay(firstSched)} {firstSched.timeRange ? `(${firstSched.timeRange})` : ''}{firstSched.room ? ` - ${firstSched.room}` : ''}
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">غير محدد</span>
                            )}
                          </td>

                          {/* Campus */}
                          <td className="py-3 px-4">
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[120px] block">
                              {sec.campus || '—'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setSelectedSection(sec)}
                                className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-zinc-700 text-slate-600 dark:text-slate-300 transition"
                                title="تفاصيل اللقاءات والقاعات"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteSection(sec.id, sec.crn)}
                                className="p-1.5 rounded-lg border hover:bg-red-50 dark:hover:bg-red-950/40 text-red-500 border-red-200 dark:border-red-900/40 transition"
                                title="حذف الشعبة"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-5 py-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-subtle)' }}>
                <span className="text-xs text-slate-500">
                  صفحة {page} من {totalPages} ({totalCount.toLocaleString()} شعبة)
                </span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-zinc-700 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-zinc-700 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* ==================================================================== */}
      {/* MODAL 1: Section Details (المواعيد والقاعات التفصيلية) */}
      {/* ==================================================================== */}
      {selectedSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" dir="rtl">
          <div className="w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden p-6 space-y-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-start justify-between border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-amber-500/10 text-[var(--color-imamu-accent)]">
                  CRN: {selectedSection.crn}
                </span>
                <h3 className="text-base font-bold mt-1" style={{ color: 'var(--text-main)' }}>
                  {selectedSection.courseTitle || selectedSection.courseCode} (شعبة {selectedSection.sectionNumber})
                </h3>
                <span className="text-xs text-slate-400 font-mono">{selectedSection.courseCode}</span>
              </div>
              <button
                onClick={() => setSelectedSection(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                <span className="text-slate-400 block mb-1">الفصل والسنة:</span>
                <span className="font-bold text-[var(--color-imamu-accent)] truncate block">
                  {selectedSection.term || (selectedSection.academicYear && selectedSection.semester ? `${selectedSection.academicYear} - ${selectedSection.semester}` : selectedSection.academicYear || selectedSection.semester || 'عام / غير محدد')}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                <span className="text-slate-400 block mb-1">المحاضر الرئيسي:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {selectedSection.primaryInstructor || selectedSection.instructors?.[0]?.name || 'غير محدد'}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                <span className="text-slate-400 block mb-1">المقر:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{selectedSection.campus || 'غير محدد'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60">
                <span className="text-slate-400 block mb-1">المقاعد المتاحة:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">
                  {selectedSection.seatsAvailable !== undefined && selectedSection.seatsAvailable !== null
                    ? `${selectedSection.seatsAvailable} متاح (${selectedSection.currentEnrollment ?? 0}/${selectedSection.maxEnrollment ?? '—'})`
                    : (selectedSection.instructionalMethod || 'تقليدي')}
                </span>
              </div>
            </div>

            {/* All Instructors List */}
            {selectedSection.instructors && selectedSection.instructors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    <span>أساتذة ومحاضرو الشعبة ({selectedSection.instructors.length}):</span>
                  </span>
                </h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {selectedSection.instructors.map((inst, iIdx) => (
                    <div
                      key={iIdx}
                      className="p-2.5 rounded-xl border flex items-center justify-between text-xs"
                      style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                          {inst.name.slice(0, 1)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                            <span>{inst.name}</span>
                            {inst.isPrimary ? (
                              <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                أستاذ رئيسي
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.2 text-[10px] font-semibold rounded bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300">
                                أستاذ مشارك
                              </span>
                            )}
                          </div>
                          {inst.email && (
                            <div className="text-[11px] text-slate-400 font-mono truncate dir-ltr text-right">
                              {inst.email}
                            </div>
                          )}
                        </div>
                      </div>

                      {inst.email && (
                        <button
                          type="button"
                          onClick={() => copyEmail(inst.email!)}
                          className="p-1.5 rounded-lg border hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 transition shrink-0 ml-2 cursor-pointer"
                          title="نسخ البريد الإلكتروني"
                        >
                          {copiedEmail === inst.email ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Schedules List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>أوقات المحاضرات والقاعات:</span>
              </h4>

              {selectedSection.schedules && selectedSection.schedules.length > 0 ? (
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {selectedSection.schedules.map((sch, idx) => (
                    <div key={idx} className="p-3 rounded-xl border flex items-center justify-between text-xs" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                      <div>
                        <div className="font-bold text-slate-800 dark:text-slate-100">
                          {formatScheduleDaysDisplay(sch)} ({sch.timeRange || 'الموعد غير محدد'})
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {sch.building ? `${sch.building} - ` : ''}قاعة: {sch.room || 'غير محددة'}
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded bg-amber-500/10 text-[var(--color-imamu-accent)] font-bold text-[11px]">
                        {sch.type || 'محاضرة'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 text-center text-xs text-slate-400">
                  لا توجد مواعيد مفصلة مسجلة لهذه الشعبة.
                </div>
              )}
            </div>

            {/* Final Exam Info if present */}
            {selectedSection.finalExam && (
              <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-purple-500 shrink-0" />
                  <div>
                    <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold block">موعد الاختبار النهائي:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {typeof selectedSection.finalExam === 'object'
                        ? `${selectedSection.finalExam.examDate || ''} ${selectedSection.finalExam.examTime ? `(${selectedSection.finalExam.examTime})` : ''}`
                        : String(selectedSection.finalExam)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedSection(null)}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-bold transition cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: Add Term from Banner (إضافة فصل دراسي من بانر)              */}
      {/* ==================================================================== */}
      {isAddTermModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" dir="rtl">
          <div className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden p-6 space-y-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-start justify-between border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-[var(--color-imamu-accent)]">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black" style={{ color: 'var(--text-main)' }}>
                    إضافة فصل دراسي من بانر
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    اختر فصلاً دراسياً مكتشفاً من نظام بانر أو أدخل رمزه لبدء المتابعة والمزامنة.
                  </p>
                </div>
              </div>
              <button
                disabled={addingTerm}
                onClick={() => setIsAddTermModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-40 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selector: Detected vs Custom */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-zinc-800/80 rounded-xl border border-slate-300/60 dark:border-zinc-700/60">
              <button
                type="button"
                onClick={() => setSelectedTermMode('detected')}
                className={clsx(
                  "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer",
                  selectedTermMode === 'detected'
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Globe className="w-3.5 h-3.5 text-amber-500" />
                <span>الفصول المكتشفة في بانر</span>
                {detectedTerms.length > 0 && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-[var(--color-imamu-accent)] font-mono">
                    {detectedTerms.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSelectedTermMode('custom')}
                className={clsx(
                  "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer",
                  selectedTermMode === 'custom'
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <Sliders className="w-3.5 h-3.5 text-emerald-500" />
                <span>إدخال كود مخصص يدوي</span>
              </button>
            </div>

            {/* Mode 1: Detected Terms */}
            {selectedTermMode === 'detected' ? (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300">
                  اختر الفصل الدراسي المكتشف:
                </label>
                {detectedLoading ? (
                  <div className="p-8 text-center space-y-2 rounded-xl border border-slate-200 dark:border-zinc-800">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-amber-600" />
                    <p className="text-xs text-slate-400">جاري الاتصال ببانر واستكشاف الفصول...</p>
                  </div>
                ) : detectedTerms.length === 0 ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                    لم يتم العثور على فصول دراسية مباشرة. يمكنك استخدام خيار «إدخال كود مخصص يدوي» لإضافة الفصل.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {detectedTerms.map((t) => (
                      <div
                        key={t.termCode}
                        onClick={() => setSelectedTermCode(t.termCode)}
                        className={clsx(
                          "p-3 rounded-xl border transition cursor-pointer flex items-center justify-between text-xs",
                          selectedTermCode === t.termCode
                            ? "border-[var(--color-imamu-brown)] bg-amber-500/10 font-bold"
                            : "border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/60"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Radio className={clsx("w-4 h-4", selectedTermCode === t.termCode ? "text-[var(--color-imamu-accent)] fill-amber-500/30" : "text-slate-400")} />
                          <div>
                            <div className="text-slate-900 dark:text-white font-bold">{t.termName}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {t.academicYear} • {t.semester}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-[var(--color-imamu-accent)]">
                          {t.termCode}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Mode 2: Custom Term */
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-zinc-300">
                      كود الفصل في بانر <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: 144720"
                      value={customTermCode}
                      onChange={(e) => setCustomTermCode(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl text-xs font-mono border focus:outline-none focus:border-amber-600 font-semibold"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-zinc-300">
                      اسم الفصل المعروض <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: الفصل الدراسي الثاني 1447هـ"
                      value={customTermName}
                      onChange={(e) => setCustomTermName(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl text-xs border focus:outline-none focus:border-amber-600 font-semibold"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-zinc-300">
                      السنة الأكاديمية
                    </label>
                    <input
                      type="text"
                      placeholder="1448"
                      value={customYear}
                      onChange={(e) => setCustomYear(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl text-xs border focus:outline-none focus:border-amber-600"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold mb-1 text-slate-700 dark:text-zinc-300">
                      الفصل
                    </label>
                    <input
                      type="text"
                      placeholder="الفصل الأول"
                      value={customSemester}
                      onChange={(e) => setCustomSemester(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl text-xs border focus:outline-none focus:border-amber-600"
                      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Automation Options (Monitoring, Regular Update, Immediate Sync) */}
            <div className="p-4 rounded-xl border space-y-3" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
              <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                <span>خيارات المراقبة والتحديث التلقائي:</span>
              </div>

              {/* Option 1: Monitor Changes */}
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newTermMonitorChanges}
                  onChange={(e) => setNewTermMonitorChanges(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-amber-600 rounded cursor-pointer"
                />
                <div className="text-xs">
                  <div className="font-bold text-slate-800 dark:text-slate-100">1. مراقبة التغييرات والتحديث الفوري</div>
                  <div className="text-[11px] text-slate-400">فحص دوري للشعب وتحديث المقاعد المتاحة فور وجود أي تغيير في بانر.</div>
                </div>
              </label>

              {/* Option 2: Regularly Updating */}
              <div className="space-y-1.5">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newTermAutoUpdate}
                    onChange={(e) => setNewTermAutoUpdate(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-amber-600 rounded cursor-pointer"
                  />
                  <div className="text-xs flex-1">
                    <div className="font-bold text-slate-800 dark:text-slate-100">2. التحديث الدوري التلقائي</div>
                    <div className="text-[11px] text-slate-400">مزامنة كاملة للشعب وإضافة أي شعب جديدة كل فترة دورية محددة.</div>
                  </div>
                </label>

                {newTermAutoUpdate && (
                  <div className="mr-6 flex items-center gap-2 pt-1">
                    <span className="text-[11px] font-semibold text-slate-600 dark:text-zinc-400">تكرار التحديث:</span>
                    <select
                      value={newTermIntervalDays}
                      onChange={(e) => setNewTermIntervalDays(Number(e.target.value))}
                      className="py-1 px-2.5 rounded-lg border text-xs font-bold bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-[var(--color-imamu-accent)] cursor-pointer"
                    >
                      <option value={1}>كل 1 يوم</option>
                      <option value={2}>كل يومين (موصى به)</option>
                      <option value={3}>كل 3 أيام</option>
                      <option value={7}>كل أسبوع</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Immediate Sync Checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer pt-1 border-t border-slate-200/50 dark:border-zinc-800/60">
                <input
                  type="checkbox"
                  checked={newTermSyncImmediately}
                  onChange={(e) => setNewTermSyncImmediately(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-emerald-600 rounded cursor-pointer"
                />
                <div className="text-xs">
                  <div className="font-bold text-emerald-700 dark:text-emerald-400">بدء المزامنة الفورية من بانر عند الإضافة</div>
                  <div className="text-[11px] text-slate-400">سحب وجلب الشعب والمقررات فور حفظ الفصل الدراسي.</div>
                </div>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button
                disabled={addingTerm}
                onClick={() => setIsAddTermModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-40 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                disabled={addingTerm || (selectedTermMode === 'detected' && !selectedTermCode)}
                onClick={handleAddTermSubmit}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] transition shadow-md disabled:opacity-50 cursor-pointer"
              >
                {addingTerm ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري إضافة الفصل وبدء المتابعة...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>إضافة الفصل وبدء المتابعة</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: Add CRNs from JSON (إضافة شعب عبر CRN / JSON)               */}
      {/* ==================================================================== */}
      {addCrnsTerm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" dir="rtl">
          <div className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden p-6 space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-start justify-between border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-[var(--color-imamu-accent)]">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black" style={{ color: 'var(--text-main)' }}>
                    إضافة شُعب عبر أرقام CRN أو JSON
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    الفصل: <span className="font-bold text-[var(--color-imamu-accent)]">{addCrnsTerm.termName} ({addCrnsTerm.termCode})</span>
                  </p>
                </div>
              </div>
              <button
                disabled={addingCrns}
                onClick={() => { setAddCrnsTerm(null); setAddCrnsResult(null); }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-40 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  ألصق مصفوفة JSON أو أرقام الـ CRN مفصولة بفواصل أو مسافات:
                </label>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-[var(--color-imamu-accent)]">
                  {detectedCrnsCount} رقم CRN مكتشف
                </span>
              </div>
              <textarea
                rows={6}
                value={crnsInputText}
                onChange={(e) => setCrnsInputText(e.target.value)}
                placeholder={`أمثلة للصيغ المدعومة:\n["10234", "10235", "10236"]\nأو:\n10234, 10235, 10236`}
                className="w-full p-3 rounded-xl text-xs font-mono border focus:outline-none focus:border-amber-600 leading-relaxed resize-none"
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              />
              <p className="text-[11px] text-slate-400">
                💡 سيقوم النظام بالاتصال الفوري بنظام بانر وجلب بيانات ومواعيد ومقاعد ومدرسي هذه الشعب فقط وتضمينها للفصل.
              </p>
            </div>

            {/* Result message */}
            {addCrnsResult && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span className="font-bold">{addCrnsResult.message}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button
                disabled={addingCrns}
                onClick={() => { setAddCrnsTerm(null); setAddCrnsResult(null); }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-40 cursor-pointer"
              >
                إغلاق
              </button>
              <button
                disabled={addingCrns || detectedCrnsCount === 0}
                onClick={handleAddCrnsSubmit}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] transition shadow-md disabled:opacity-50 cursor-pointer"
              >
                {addingCrns ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري جلب الشعب من بانر...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>بدء الجلب والإضافة من بانر ({detectedCrnsCount})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
