'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Calendar, Search, Filter, RefreshCw, Upload, CheckCircle2,
  AlertTriangle, Trash2, Clock, MapPin, User, Users,
  BookOpen, ChevronRight, ChevronLeft, Eye, X, FileText, Loader2,
  Check, Layers, Sparkles, Folder, FolderOpen, FolderPlus, ArrowRight,
  Copy, Mail, UserCheck, ChevronDown, ChevronUp
} from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';
import { formatScheduleDaysDisplay } from '../../lib/schedule-utils';

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

interface ImportResult {
  success: boolean;
  coursesCount: number;
  sectionsCount: number;
  elapsedMs: number;
  message: string;
}

export interface FolderItem {
  id: string;
  name: string;
  academicYear?: string;
  semester?: string;
  term?: string;
  count: number;
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

  // Import Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Import Modal Folder State: 'existing' | 'new'
  const [uploadFolderMode, setUploadFolderMode] = useState<'existing' | 'new'>('existing');
  const [selectedExistingFolderId, setSelectedExistingFolderId] = useState<string>('');
  const [newFolderYear, setNewFolderYear] = useState('1448');
  const [newFolderSemester, setNewFolderSemester] = useState('الفصل الأول');

  // Derive folder list from availableTerms
  const folders: FolderItem[] = availableTerms.map((t, idx) => {
    const name = t.term || (t.academicYear && t.semester ? `${t.academicYear} - ${t.semester}` : t.academicYear || t.semester || 'غير مصنف');
    const id = t.term || `${t.academicYear || ''}-${t.semester || ''}` || `term-${idx}`;
    return {
      id,
      name,
      academicYear: t.academicYear,
      semester: t.semester,
      term: t.term,
      count: t.count || 0
    };
  });

  const grandTotalSections = availableTerms.reduce((sum, t) => sum + (Number(t.count) || 0), 0);

  // Fetch distinct terms metadata
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

  useEffect(() => {
    fetchTerms();
  }, [fetchTerms]);

  // Keep selectedExistingFolderId valid
  useEffect(() => {
    if (folders.length > 0 && !selectedExistingFolderId) {
      setSelectedExistingFolderId(selectedFolder && selectedFolder !== 'all' ? selectedFolder.id : folders[0].id);
    }
  }, [folders, selectedFolder, selectedExistingFolderId]);

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

  // Handle File Upload and Import
  const handleUploadAndImport = async () => {
    if (!importFile) {
      toast('warning', 'يرجى اختيار ملف JSON أولاً');
      return;
    }

    let finalYear = '';
    let finalSemester = '';
    let finalTerm = '';

    if (uploadFolderMode === 'existing') {
      const existing = folders.find(f => f.id === selectedExistingFolderId) || folders[0];
      if (existing) {
        finalYear = existing.academicYear || '';
        finalSemester = existing.semester || '';
        finalTerm = existing.term || existing.name;
      } else {
        toast('warning', 'يرجى اختيار مجلد موجود أو إنشاء مجلد جديد');
        return;
      }
    } else {
      finalYear = newFolderYear.trim();
      finalSemester = newFolderSemester.trim();
      finalTerm = finalYear && finalSemester ? `${finalYear} - ${finalSemester}` : (finalYear || finalSemester || 'فصل جديد');
    }

    setImporting(true);
    setImportResult(null);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('file', importFile);
      if (finalYear) formData.append('academicYear', finalYear);
      if (finalSemester) formData.append('semester', finalSemester);
      if (finalTerm) formData.append('term', finalTerm);

      const res = await fetch('/api/admin/import-data', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setImportResult(data);
        toast('success', `اكتمل الاستيراد بنجاح في مجلد (${finalTerm})! تم تحديث ${data.coursesCount} مقرر و ${data.sectionsCount} شعبة.`);
        const newFolderObj: FolderItem = {
          id: finalTerm,
          name: finalTerm,
          academicYear: finalYear,
          semester: finalSemester,
          term: finalTerm,
          count: data.sectionsCount || 0
        };
        const currentSaved = loadSharedFolders();
        saveSharedFolders([newFolderObj, ...currentSaved.filter(f => f.term !== finalTerm && f.name !== finalTerm)]);
        fetchSections();
        fetchTerms();
        fetchTeachers();
      } else {
        toast('error', data.error || 'فشل استيراد البيانات');
      }
    } catch (err: any) {
      console.error(err);
      toast('error', 'حدث خطأ أثناء رفع ومعالجة الملف');
    } finally {
      setImporting(false);
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
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">إدارة مجلدات الشعب الدراسية واستيراد البيانات</p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setUploadFolderMode('existing');
              setImportFile(null);
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md border border-amber-700/30 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>استيراد شعب (JSON)</span>
          </button>
          <button
            onClick={() => {
              if (activeSubTab === 'teachers') fetchTeachers();
              else { fetchSections(); fetchTerms(); }
            }}
            disabled={loading || teachersLoading}
            className="p-2 rounded-xl border transition hover:bg-slate-100 dark:hover:bg-zinc-800"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
            title="تحديث البيانات"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || teachersLoading) ? 'animate-spin' : ''}`} />
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
                  onClick={() => setIsImportModalOpen(true)}
                  className="mt-3 px-4 py-2 bg-[var(--color-imamu-brown)] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  استيراد ملف الشُعب الآن
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
                onClick={() => {
                  setUploadFolderMode('new');
                  setImportFile(null);
                  setImportResult(null);
                  setIsImportModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md border border-amber-700/30"
              >
                <FolderPlus className="w-4 h-4" />
                <span>إنشاء مجلد واستيراد شعب</span>
              </button>

              <button
                onClick={() => fetchTerms()}
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
                    اضغط على أي مجلد لتحميل وعرض الشعب الخاصة به
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setUploadFolderMode('new');
                  setImportFile(null);
                  setImportResult(null);
                  setIsImportModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[var(--color-imamu-accent)] border border-amber-500/30 text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                <FolderPlus className="w-4 h-4" />
                <span>مجلد جديد</span>
              </button>
            </div>

            {folders.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-[var(--color-imamu-accent)] mx-auto flex items-center justify-center">
                  <Folder className="w-7 h-7" />
                </div>
                <div className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                  لا توجد مجلدات شعب دراسية مسجلة حالياً
                </div>
                <p className="text-xs max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
                  قم بإنشاء مجلد فصلي واستيراد ملف الشعب الدراسية (JSON) للبدء في إدارة الشعب والمواعيد.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUploadFolderMode('new');
                    setImportFile(null);
                    setImportResult(null);
                    setIsImportModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-imamu-brown)] text-white text-xs font-bold shadow-md hover:bg-[var(--color-imamu-brown-dark)] transition"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>إنشاء أول مجلد واستيراد الشعب</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 pt-1">
                {/* Individual Folder Cards */}
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => handleSelectFolder(folder)}
                    className="group p-4 rounded-2xl border text-right transition-all duration-150 hover:shadow-md hover:border-amber-500/50 hover:bg-amber-500/[0.02] cursor-pointer flex flex-col justify-between gap-3 relative border-slate-200 dark:border-zinc-800/80"
                    style={{ background: 'var(--bg-subtle)' }}
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-[var(--color-imamu-accent)] group-hover:bg-[var(--color-imamu-brown)] group-hover:text-white transition flex items-center justify-center shrink-0 shadow-xs">
                          <Folder className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate text-slate-900 dark:text-white group-hover:text-[var(--color-imamu-accent)] transition" title={folder.name}>
                            {folder.name}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {folder.academicYear ? `عام ${folder.academicYear}` : 'سنة دراسية'} {folder.semester ? `• ${folder.semester}` : ''}
                          </div>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-[var(--color-imamu-accent)] shrink-0">
                        {folder.count.toLocaleString()}
                      </span>
                    </div>

                    {/* Quick actions strip */}
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
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExistingFolderId(folder.id);
                            setUploadFolderMode('existing');
                            setImportFile(null);
                            setImportResult(null);
                            setIsImportModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg hover:bg-amber-500/15 text-slate-400 hover:text-[var(--color-imamu-accent)] transition cursor-pointer"
                          title="استيراد شعب إضافية لهذا المجلد"
                        >
                          <Upload className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFolder(folder)}
                          className="p-1.5 rounded-lg hover:bg-red-500/15 text-slate-400 hover:text-red-500 transition cursor-pointer"
                          title="حذف شعب هذا المجلد بالكامل"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

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
                  <button
                    onClick={() => {
                      setSelectedExistingFolderId(selectedFolder.id);
                      setUploadFolderMode('existing');
                      setImportFile(null);
                      setImportResult(null);
                      setIsImportModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-700 transition cursor-pointer shadow-xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                    <span>إضافة شعب لهذا المجلد</span>
                  </button>
                  <button
                    onClick={() => handleDeleteFolder(selectedFolder)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold text-red-600 dark:text-red-400 transition cursor-pointer"
                    title="حذف شعب هذا المجلد فقط"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف المجلد</span>
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
      {/* MODAL 2: High-Speed JSON Import (استيراد المقررات والشعب) */}
      {/* ==================================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" dir="rtl">
          <div className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden p-6 space-y-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-start justify-between border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h3 className="text-base font-black flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                  <Sparkles className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                  <span>استيراد وتحديث المقررات والشعب (JSON)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ارفع ملف المقررات أو الشعب مع تحديد السنة والفصل لمنع اختلاط الشعب بين الفصول.
                </p>
              </div>
              <button
                disabled={importing}
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-40"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Folder Mode Switcher: Existing vs New */}
            <div className="p-4 rounded-xl border space-y-3.5" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                  <Folder className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                  <span>تحديد مجلد الشعب الدراسية:</span>
                </label>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-amber-500/10 text-[var(--color-imamu-accent)] border border-amber-500/20">
                  {uploadFolderMode === 'existing'
                    ? (folders.find(f => f.id === selectedExistingFolderId)?.name || 'اختر مجلد')
                    : (`${newFolderYear} - ${newFolderSemester}` || 'مجلد جديد')}
                </span>
              </div>

              {/* Mode Toggle Buttons */}
              <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-zinc-800/80 rounded-xl border border-slate-300/60 dark:border-zinc-700/60">
                <button
                  type="button"
                  onClick={() => setUploadFolderMode('existing')}
                  className={clsx(
                    "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer",
                    uploadFolderMode === 'existing'
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <Folder className="w-3.5 h-3.5 text-amber-500" />
                  <span>اختيار مجلد موجود</span>
                  {folders.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 font-mono">
                      {folders.length}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setUploadFolderMode('new')}
                  className={clsx(
                    "flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer",
                    uploadFolderMode === 'new'
                      ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <FolderPlus className="w-3.5 h-3.5 text-emerald-500" />
                  <span>إنشاء مجلد جديد</span>
                </button>
              </div>

              {/* Mode 1: Choose Existing Folder */}
              {uploadFolderMode === 'existing' ? (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                    اختر المجلد الذي ترغب بحفظ أو تحديث الشعب بداخله:
                  </label>
                  {folders.length === 0 ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                      لا توجد مجلدات مسجلة بعد. استخدم خيار «إنشاء مجلد جديد» لإنشاء أول مجلد.
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={selectedExistingFolderId}
                        onChange={(e) => setSelectedExistingFolderId(e.target.value)}
                        className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold border focus:outline-none focus:border-amber-600 cursor-pointer"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                      >
                        {folders.map(f => (
                          <option key={f.id} value={f.id}>
                            📁 {f.name} ({f.count.toLocaleString()} شعبة)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (
                /* Mode 2: Create New Folder (only Year and Semester) */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold mb-1 text-slate-500 dark:text-zinc-400">
                        السنة الأكاديمية <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: 1448"
                        value={newFolderYear}
                        onChange={(e) => setNewFolderYear(e.target.value)}
                        className="w-full py-2 px-3 rounded-xl text-xs border focus:outline-none focus:border-amber-600 font-semibold"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold mb-1 text-slate-500 dark:text-zinc-400">
                        الفصل الدراسي <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: الفصل الأول"
                        value={newFolderSemester}
                        onChange={(e) => setNewFolderSemester(e.target.value)}
                        className="w-full py-2 px-3 rounded-xl text-xs border focus:outline-none focus:border-amber-600 font-semibold"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                      />
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-zinc-300 font-medium">اسم المجلد المنشأ تلقائياً:</span>
                    <span className="font-bold text-[var(--color-imamu-accent)] font-mono">
                      📁 {newFolderYear.trim()} - {newFolderSemester.trim()}
                    </span>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                💡 سيتم إيداع كافة الشعب المرفوعة داخل هذا المجلد تلقائياً ولن تختلط بشعب الفصول الأخرى.
              </p>
            </div>

            {/* Drop Zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition hover:border-[var(--color-imamu-brown)] hover:bg-amber-500/5"
              style={{ borderColor: importFile ? 'var(--color-imamu-brown)' : 'var(--border-color)' }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImportFile(file);
                    setImportResult(null);
                  }
                }}
              />

              {importFile ? (
                <div className="space-y-2">
                  <FileText className="w-10 h-10 mx-auto text-emerald-500" />
                  <div className="font-bold text-sm text-slate-800 dark:text-slate-100">{importFile.name}</div>
                  <div className="text-xs text-slate-400">{(importFile.size / (1024 * 1024)).toFixed(2)} MB</div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600">
                    جاهز للاستيراد (ملف JSON)
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-10 h-10 mx-auto text-slate-400" />
                  <div className="font-bold text-sm text-slate-700 dark:text-slate-200">
                    اضغط لاختيار ملف JSON أو اسحبه هنا
                  </div>
                  <p className="text-xs text-slate-400">
                    يدعم ملفات JSON الناتجة من أداة بانر (مثل imamu_helper_catalog.json)
                  </p>
                </div>
              )}
            </div>

            {/* Result Report Card */}
            {importResult && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-xs text-emerald-700 dark:text-emerald-300">
                <div className="font-bold flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{importResult.message}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1 font-mono">
                  <div>المقررات: <b>{importResult.coursesCount.toLocaleString()}</b></div>
                  <div>الشعب: <b>{importResult.sectionsCount.toLocaleString()}</b></div>
                  <div>الوقت: <b>{(importResult.elapsedMs / 1000).toFixed(2)}s</b></div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
              <button
                disabled={importing}
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition disabled:opacity-40 cursor-pointer"
              >
                إلغاء
              </button>
              <button
                disabled={!importFile || importing}
                onClick={handleUploadAndImport}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] transition shadow-md disabled:opacity-50 cursor-pointer"
              >
                {importing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الاستيراد والتحديث الفائق...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>بدء الاستيراد الفوري (JSON)</span>
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
