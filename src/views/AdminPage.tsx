'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  ShieldAlert, ShieldCheck, Shield, Calendar, BookOpen,
  Trash2, Link as LinkIcon, Download, Upload, Plus, X,
  Users, Settings, HelpCircle, ExternalLink, Server, Command,
  CheckCircle2, AlertTriangle, Info, XCircle, RefreshCw, Zap, Loader2,
  LayoutDashboard, Newspaper, GraduationCap, Link2, Folder, Edit3, Send, Mail, HeartHandshake, MessageSquare, Layers, UserCheck, Activity,
  MapPin, Search, Check, Sparkles, ChevronDown, ArrowRightLeft, MoveRight, MoreVertical, SlidersHorizontal, ArrowRight
} from 'lucide-react';
import { TutorialsTab } from '../components/TutorialsTab';
import { AdminLogsPage } from './AdminLogsPage';
import CreateCourseModal from '../components/CreateCourseModal';
import CreateResourceModal from '../components/CreateResourceModal';
import CreateEventModal, { EventFormData } from '../components/CreateEventModal';
import CreateAuthenticatedAccountModal from '../components/CreateAuthenticatedAccountModal';
import { AuthenticatedAccountDashboardModal } from '../components/AuthenticatedAccountDashboardModal';
import { AuthenticatedAccountProfileModal } from '../components/AuthenticatedAccountProfileModal';
import AdminDashboardTab from './admin/AdminDashboardTab';
import AdminUsersTab from './admin/AdminUsersTab';
import AdminContributorsTab from './admin/AdminContributorsTab';
import AdminFeedbackTab from './admin/AdminFeedbackTab';
import AdminSettingsTab from './admin/AdminSettingsTab';
import AdminSectionsTab from './admin/AdminSectionsTab';
import AdminMajorsTab from './admin/AdminMajorsTab';
import AdminAcademicHubTab from './admin/AdminAcademicHubTab';
import { Button } from '../components/ui/Button';
import CommandPalette from './admin/CommandPalette';
import { matchArabicSearch } from '../lib/search-utils';
import { parseDate, formatDate, getEventCategoryMeta } from '../lib/date-utils';

type Tab = 'dashboard' | 'users' | 'contributors' | 'news_sources' | 'majors' | 'events' | 'subjects' | 'sections' | 'teachers' | 'resources' | 'academic' | 'tutorials' | 'feedback' | 'settings' | 'logs';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface Stats {
  users: number;
  subjects: number;
  majors: number;
  events: number;
  news: number;
  tutorials: number;
  newsSources: number;
  recentUsers7d: number;
  recentUsers30d: number;
  usersByDay: { day: string; count: number }[];
  newsBySource: { source: string; count: number }[];
}

interface HealthInfo {
  uptime: number;
  memory?: { rss: number; heapUsed: number; heapTotal: number };
  memoryUsage?: { rss: number; heapUsed: number; heapTotal: number };
  dbStatus?: string;
  storageStatus?: string;
  nodeVersion?: string;
  platform?: string;
}

// ============================================================================
// TOAST SYSTEM
// ============================================================================
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-xl animate-[slideUp_0.3s_ease-out] min-w-[280px]"
          style={{
            background: t.type === 'success' ? 'rgba(16,185,129,0.12)' : t.type === 'error' ? 'rgba(239,68,68,0.12)' : t.type === 'warning' ? 'rgba(245,158,11,0.12)' : 'rgba(139,94,60,0.12)',
            borderColor: t.type === 'success' ? 'rgba(16,185,129,0.3)' : t.type === 'error' ? 'rgba(239,68,68,0.3)' : t.type === 'warning' ? 'rgba(245,158,11,0.3)' : 'rgba(139,94,60,0.3)',
            color: t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : t.type === 'warning' ? '#f59e0b' : '#A0723A'
          }}
        >
          {t.type === 'success' && <CheckCircle2 className="w-5 h-5 shrink-0" />}
          {t.type === 'error' && <XCircle className="w-5 h-5 shrink-0" />}
          {t.type === 'warning' && <AlertTriangle className="w-5 h-5 shrink-0" />}
          {t.type === 'info' && <Info className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium flex-1" style={{ color: 'var(--text-main)' }}>{t.message}</span>
          <button onClick={() => onDismiss(t.id)} className="opacity-50 hover:opacity-100 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}


export function AdminPage() {
  const { user, dbUser, loading: authLoading } = useAuth();
  const isAdmin = !!(dbUser?.isAdmin || dbUser?.role === 'ADMIN');
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [cmdOpen, setCmdOpen] = useState(false);

  // Toast
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts(t => t.filter(x => x.id !== id)), []);

  // Data states
  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [newsSources, setNewsSources] = useState<any[]>([]);
  const [majors, setMajors] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [tutorialSections, setTutorialSections] = useState<any[]>([]);
  const [tutorials, setTutorials] = useState<any[]>([]);
  const [resourcesList, setResourcesList] = useState<any[]>([]);
  const [resourceSearch, setResourceSearch] = useState('');
  const [resourceFilterType, setResourceFilterType] = useState('ALL');
  const [resourceFilterWhatsapp, setResourceFilterWhatsapp] = useState('ALL');
  const [resourceFilterFiles, setResourceFilterFiles] = useState('ALL');
  const [resourceFilterCourses, setResourceFilterCourses] = useState('ALL');
  const [resourceFilterLinkCount, setResourceFilterLinkCount] = useState('ALL');
  const [globalSettings, setGlobalSettings] = useState<any>({ fetchRangeDays: 30, autoDeleteDays: 30 });
  const [telegramChannelInput, setTelegramChannelInput] = useState('');
  const [isExtractingTelegram, setIsExtractingTelegram] = useState(false);

  const [sourceForm, setSourceForm] = useState<{
    id?: number;
    displayName: string;
    handle: string;
    telegramChannel: string;
    bio: string;
    bannerUrl: string;
    profilePicUrl: string;
    assignedUserUid: string;
  }>({
    displayName: '',
    handle: '',
    telegramChannel: '',
    bio: '',
    bannerUrl: '',
    profilePicUrl: '',
    assignedUserUid: ''
  });
  const [selectedAdminAccount, setSelectedAdminAccount] = useState<any | null>(null);
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [draggedSubjectId, setDraggedSubjectId] = useState<number | null>(null);
  const [subjectForm, setSubjectForm] = useState<{ 
    id?: number; 
    code: string; 
    name: string; 
    creditHours: string; 
    level: string; 
    college?: string;
    department?: string;
    prereq?: string;
    whatsappLink: string;
    description: string; 
    syllabus: string; 
    freeResourcesUrl: string; 
    paidResourcesUrl: string; 
    avatarUrl: string; 
    tags: string; 
  }>({ 
    code: '', 
    name: '', 
    creditHours: '3', 
    level: '', 
    college: '',
    department: '',
    prereq: '',
    whatsappLink: '',
    description: '', 
    syllabus: '', 
    freeResourcesUrl: '', 
    paidResourcesUrl: '', 
    avatarUrl: '', 
    tags: '' 
  });

  const [eventForm, setEventForm] = useState<EventFormData>({
    title: '',
    date: '',
    endDate: '',
    time: '',
    endTime: '',
    location: '',
    link: '',
    description: '',
    isHoliday: false,
    isHolidayEnd: false,
    isSemester: false,
    isSemesterStart: false,
    isSemesterEnd: false,
    isEid: false,
    isNationalDay: false
  });
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);






  // Search & pagination
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectLimit, setSubjectLimit] = useState(20);
  const [majorSearch, setMajorSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [eventLimit, setEventLimit] = useState(1000);
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [resourceForm, setResourceForm] = useState<{
    id?: number;
    subjectId?: number;
    title: string;
    type: string;
    url: string;
    boxLink?: string;
    whatsappLink?: string;
    freeResourcesUrl?: string;
    paidResourcesUrl?: string;
    avatarUrl?: string;
    description?: string;
    sectionsEnabled?: boolean;
  }>({ title: '', type: 'course_hub', url: '', description: '', boxLink: '', whatsappLink: '', freeResourcesUrl: '', paidResourcesUrl: '', avatarUrl: '', sectionsEnabled: true });

  // Modals
  const [deleteModal, setDeleteModal] = useState<{ url: string; message: string } | null>(null);

  // Sync activeTab with URL search param on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as Tab;
      if (tabParam && ['dashboard', 'users', 'contributors', 'news_sources', 'majors', 'events', 'academic', 'tutorials', 'feedback', 'settings', 'logs'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Tab definitions
  const tabDefs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'users', label: 'إدارة المستخدمين', icon: <Users className="w-5 h-5" /> },
    { id: 'contributors', label: 'المساهمون والتقدير', icon: <HeartHandshake className="w-5 h-5" /> },
    { id: 'news_sources', label: 'حسابات الجهات', icon: <Shield className="w-5 h-5" /> },
    { id: 'majors', label: 'التخصصات الأكاديمية', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'events', label: 'المواعيد والتقويم', icon: <Calendar className="w-5 h-5" /> },
    { id: 'academic', label: 'الأكاديميا الموحدة', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'tutorials', label: 'إدارة شروحات الدليلة', icon: <HelpCircle className="w-5 h-5" /> },
    { id: 'feedback', label: 'البلاغات والتقييمات', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'settings', label: 'الإعدادات العامة', icon: <Settings className="w-5 h-5" /> },
    { id: 'logs', label: 'سجلات أحداث النظام', icon: <Activity className="w-5 h-5" /> },
  ];

  // Granular admin permissions filter
  const userPerms = React.useMemo(() => {
    const permVal = dbUser?.adminPermissions;
    if (!permVal) return null;
    if (Array.isArray(permVal)) return permVal;
    try {
      const parsed = JSON.parse(permVal);
      return Array.isArray(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }, [dbUser?.adminPermissions]);

  const hasPermissionForTab = (tabId: Tab): boolean => {
    if (!userPerms || userPerms.length === 0 || userPerms.includes('*') || userPerms.includes('all')) return true;
    if (tabId === 'dashboard') return true;
    if (tabId === 'users' || tabId === 'contributors') return userPerms.includes('users') || userPerms.includes('contributors');
    if (tabId === 'academic') return userPerms.includes('resources') || userPerms.includes('courses') || userPerms.includes('teachers');
    if (tabId === 'events') return userPerms.includes('dates');
    if (tabId === 'news_sources') return userPerms.includes('news');
    if (tabId === 'tutorials' || tabId === 'feedback') return userPerms.includes('tutorials') || userPerms.includes('feedback');
    if (tabId === 'settings' || tabId === 'logs') return userPerms.includes('logs');
    return true;
  };

  const visibleTabs = tabDefs.filter(t => hasPermissionForTab(t.id));

  // Ensure activeTab is accessible
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  // ============================================================================
  // API HELPERS
  // ============================================================================
  const getToken = async () => {
    const local = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('imamu_token')) : null;
    if (local) return local;
    if (user) {
      try { return await user.getIdToken(); } catch (e) {}
    }
    return '';
  };
  const authHeaders = async () => ({ Authorization: `Bearer ${await getToken()}`, 'Content-Type': 'application/json' });

  const fetchData = async () => {
    if (!user) return;
    const t = await getToken();
    const opts = { headers: { Authorization: `Bearer ${t}` } };

    Promise.all([
      fetch('/api/admin/news_sources', opts).then(r => r.ok && r.json()),
      fetch('/api/majors', opts).then(r => r.ok && r.json()),
      fetch('/api/events', opts).then(r => r.ok && r.json()),
      fetch('/api/subjects', opts).then(r => r.ok && r.json()),
      fetch('/api/admin/global_settings', opts).then(r => r.ok ? r.json() : { fetchRangeDays: 30, autoDeleteDays: 30 }),
      fetch('/api/tutorials/sections', opts).then(r => r.ok && r.json()),
      fetch('/api/tutorials', opts).then(r => r.ok && r.json()),
      fetch('/api/resources', opts).then(r => r.ok && r.json()),
      fetch('/api/admin/stats', opts).then(r => r.ok ? r.json() : null),
      fetch('/api/admin/health', opts).then(r => r.ok ? r.json() : null),
    ]).then(([ns, m, e, s, gs, ts, tuts, resList, st, hl]) => {
      if (ns) setNewsSources(ns);
      if (m) setMajors(m);
      if (e) setEvents(e);
      if (s) setSubjects(s);
      if (gs) setGlobalSettings(gs);
      if (ts) setTutorialSections(ts);
      if (tuts) setTutorials(tuts);
      if (resList) setResourcesList(resList);
      if (st) setStats(st);
      if (hl) setHealth(hl);
    }).catch(console.error);
  };

  const fetchUsers = async (search = '') => {
    const t = await getToken();
    const res = await fetch(`/api/admin/users?search=${encodeURIComponent(search)}&limit=100`, { headers: { Authorization: `Bearer ${t}` } });
    if (res.ok) setAdminUsers(await res.json());
  };

  useEffect(() => {
    if (user && isAdmin) {
      fetchData();
      fetchUsers();
    }
  }, [user, dbUser, isAdmin]);

  const handlePostWithMethod = async (url: string, method: string, data: any, resetCb: () => void) => {
    // Optimistic Update for Subjects/Courses
    let prevSubjects = [...subjects];
    if (url.includes('/api/admin/subjects') && method === 'POST') {
      const optimisticSubject = {
        id: Date.now(),
        code: data.code,
        name: data.name,
        driveLink: data.driveLink || null,
        whatsappLink: data.whatsappLink || null,
        creditHours: data.creditHours ? Number(data.creditHours) : 3,
        level: data.level ? Number(data.level) : null,
        resources: []
      };
      setSubjects(prev => [optimisticSubject, ...prev]);
    }

    try {
      const headers = await authHeaders();
      const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
      if (res.ok) {
        resetCb();
        fetchData();
        toast('success', 'Operation completed successfully');
      } else {
        setSubjects(prevSubjects); // Rollback optimistic state if error
        const err = await res.json().catch(() => ({}));
        toast('error', err.message || err.error || 'Failed to save record');
      }
    } catch (e) { 
      setSubjects(prevSubjects); // Rollback optimistic state
      console.error(e); 
      toast('error', 'Network error'); 
    }
  };

  const handlePost = async (url: string, data: any, resetCb: () => void) => handlePostWithMethod(url, 'POST', data, resetCb);

  const handleDelete = (url: string, prefix: string = 'this item') => {
    setDeleteModal({ url, message: `Are you sure you want to delete ${prefix}? This action cannot be undone.` });
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    const targetUrl = deleteModal.url;

    // Optimistic Deletion
    const parts = targetUrl.split('/');
    const rawId = parts[parts.length - 1];
    const numId = Number(rawId);

    const prevSubjects = [...subjects];
    const prevAdminUsers = [...adminUsers];
    const prevResources = [...resourcesList];
    const prevEvents = [...events];
    const prevMajors = [...majors];
    const prevTutorials = [...tutorials];
    const prevNewsSources = [...newsSources];

    if (targetUrl.includes('/api/admin/subjects/')) {
      setSubjects(prev => prev.filter(s => String(s.id) !== rawId));
    } else if (targetUrl.includes('/api/admin/users/')) {
      setAdminUsers(prev => prev.filter(u => String(u.id) !== rawId && u.uid !== rawId));
    } else if (targetUrl.includes('/api/admin/resources/')) {
      setResourcesList(prev => prev.filter(r => String(r.id) !== rawId));
    } else if (targetUrl.includes('/api/admin/events/')) {
      setEvents(prev => prev.filter(e => String(e.id) !== rawId));
    } else if (targetUrl.includes('/api/admin/majors/')) {
      setMajors(prev => prev.filter(m => String(m.id) !== rawId));
    } else if (targetUrl.includes('/api/admin/tutorials/')) {
      setTutorials(prev => prev.filter(t => String(t.id) !== rawId));
    } else if (targetUrl.includes('/api/admin/news_sources/')) {
      setNewsSources(prev => prev.filter(ns => String(ns.id) !== rawId && ns.handle !== rawId));
    }

    setDeleteModal(null);

    try {
      const t = await getToken();
      const res = await fetch(targetUrl, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) { 
        fetchData(); 
        fetchUsers(userSearch); 
        toast('success', 'Deleted successfully'); 
      } else {
        // Rollback optimistic state
        setSubjects(prevSubjects);
        setAdminUsers(prevAdminUsers);
        setResourcesList(prevResources);
        setEvents(prevEvents);
        setMajors(prevMajors);
        setTutorials(prevTutorials);
        setNewsSources(prevNewsSources);
        const err = await res.json().catch(() => ({}));
        toast('error', err.error || err.message || 'Failed to delete'); 
      }
    } catch (e) { 
      // Rollback optimistic state
      setSubjects(prevSubjects);
      setAdminUsers(prevAdminUsers);
      setResourcesList(prevResources);
      setEvents(prevEvents);
      setMajors(prevMajors);
      setTutorials(prevTutorials);
      setNewsSources(prevNewsSources);
      console.error(e); 
      toast('error', 'Network error'); 
    }
  };


  const [fetchingHandle, setFetchingHandle] = useState<string | null>(null);
  const [isFetchingAll, setIsFetchingAll] = useState(false);

  const handleFetchPosts = async (handle: string, fetchAll: boolean = false) => {
    if (fetchAll) setIsFetchingAll(true);
    else setFetchingHandle(handle);
    try {
      const t = await getToken();
      if (fetchAll) {
        const res = await fetch('/api/admin/news_sources/fetch-all', {
          method: 'POST',
          headers: { Authorization: `Bearer ${t}` }
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          if (data.fetchedCount === 0) toast('warning', 'لم يتم العثور على منشورات جديدة');
          else toast('success', `تم تحديث ونشر ${data.fetchedCount} خبر جديد من القنوات الرسمية`);
          fetchData();
        } else {
          const errDetail = data.error || data.message || (res.status === 401 ? 'جلسة الدخول منتهية' : res.status === 403 ? 'يتطلب صلاحيات مدير النظام' : `خطأ في الخادم (${res.status})`);
          toast('error', 'تعذر تحديث الأخبار: ' + errDetail);
        }
      } else {
        const res = await fetch('/api/admin/telegram/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify({ channel: handle, limit: 30 })
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          toast('success', `تم تحديث ونشر ${data.newPublished} خبر جديد من قناة @${data.channelHandle}`);
          fetchData();
        } else {
          const errDetail = data.error || data.message || (res.status === 401 ? 'جلسة الدخول منتهية' : res.status === 403 ? 'يتطلب صلاحيات مدير النظام' : `خطأ في الخادم (${res.status})`);
          toast('error', 'تعذر تحديث الأخبار: ' + errDetail);
        }
      }
    } catch (e: any) {
      console.error(e);
      toast('error', 'حدث خطأ في الاتصال بالسيرفر: ' + (e.message || 'شبكة غير متاحة'));
    } finally {
      if (fetchAll) setIsFetchingAll(false);
      else setFetchingHandle(null);
    }
  };

  const handleExtractTelegram = async () => {
    if (!telegramChannelInput.trim()) {
      toast('error', 'الرجاء إدخال اسم أو رابط قناة التليقرام');
      return;
    }
    setIsExtractingTelegram(true);
    try {
      const t = await getToken();
      const res = await fetch('/api/admin/telegram/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ channel: telegramChannelInput.trim(), limit: 30 })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        toast('success', `تم استخراج ${data.totalExtracted} منشور ونشر ${data.newPublished} خبر جديد من قناة @${data.channelHandle}`);
        setTelegramChannelInput('');
        fetchData();
      } else {
        const errDetail = data.error || data.message || (res.status === 401 ? 'جلسة الدخول منتهية، يرجى تسجيل الدخول مجدداً' : res.status === 403 ? 'عذراً، هذا الإجراء يتطلب صلاحيات مدير النظام' : `خطأ في السيرفر (${res.status})`);
        toast('error', errDetail);
      }
    } catch (e: any) {
      console.error(e);
      toast('error', 'حدث خطأ في الاتصال أثناء استخراج التليقرام: ' + (e.message || 'خطأ شبكة'));
    } finally {
      setIsExtractingTelegram(false);
    }
  };

  // ============================================================================
  // ACCESS CHECK
  // ============================================================================
  if (authLoading || (user && dbUser === null)) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <RefreshCw className="w-10 h-10 text-[var(--color-imamu-accent)] animate-spin mb-4" />
        <p style={{ color: 'var(--text-muted)' }}>جاري التحقق من صلاحيات الدخول...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6" />
        <h1 className="text-3xl font-serif font-bold mb-2" style={{ color: 'var(--text-main)' }}>Access Denied</h1>
        <p style={{ color: 'var(--text-muted)' }}>You must be an administrator to view this page.</p>
      </div>
    );
  }



  // ============================================================================
  // TAB: NEWS SOURCES
  // ============================================================================
  const renderNewsSources = () => (
    <div className="space-y-6" dir="rtl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-main)' }}>حسابات الجهات الموثقة</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>إنشاء وتعيين الحسابات الرسمية، ربط المستخدمين، وإدارة المزامنة التلقائية مع قنوات تيليجرام</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="whatsapp"
            size="sm"
            rounded="xl"
            onClick={() => {
              setEditingAccount(null);
              setIsCreateAccountModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--color-imamu-brown)] text-white hover:bg-[var(--color-imamu-brown-dark)] transition shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء حساب موثق جديد</span>
          </Button>
          
          <button
            disabled={isFetchingAll}
            onClick={() => handleFetchPosts('', true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isFetchingAll ? 'animate-spin' : ''}`} />
            <span>{isFetchingAll ? 'جاري التحديث...' : 'تحديث وسحب جميع القنوات'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Creation Form + Telegram Extractor + Settings */}
        <div className="space-y-4">
          
          {/* Create Authenticated Account Card */}
          <div className="rounded-2xl p-5 border space-y-4 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[var(--color-imamu-brown)]/10 text-[var(--color-imamu-brown)]">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>إضافة حساب موثق جديد</h4>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>إنشاء حساب جديد، تعيين مدراء، وربط قنوات تليقرام</p>
              </div>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              من خلال النافذة المنبثقة، يمكنك تعيين عدة مدراء بـ User UID وإضافة عدة قنوات تليقرام للسحب التلقائي.
            </p>

            <Button
              type="button"
              variant="whatsapp"
              size="sm"
              rounded="xl"
              onClick={() => {
                setEditingAccount(null);
                setIsCreateAccountModalOpen(true);
              }}
              className="w-full bg-[var(--color-imamu-brown)] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-[var(--color-imamu-brown-dark)] transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>فتح نافذة إنشاء حساب موثق</span>
            </Button>
          </div>

          {/* Telegram Extractor Quick Tools */}
          <div className="rounded-2xl p-5 border space-y-4 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>سحب منشورات تليقرام سريعة (30 خبر)</h4>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>استخراج ونشر آخر 30 منشور مباشرة من أي قناة تليقرام عامة</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="مثال: IMAMU_NEWS أو t.me/s/channel"
                value={telegramChannelInput}
                onChange={e => setTelegramChannelInput(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl text-sm border font-mono"
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              />
              <button
                disabled={isExtractingTelegram || !telegramChannelInput.trim()}
                onClick={handleExtractTelegram}
                className="w-full bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white px-4 py-2.5 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isExtractingTelegram ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                <span>{isExtractingTelegram ? 'جاري استخراج ورفع 30 خبر...' : 'استخراج ونشر 30 خبر من التليقرام'}</span>
              </button>
            </div>
          </div>

        </div>

        {/* Sources & Accounts List */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border overflow-hidden shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
              <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>الحسابات الموثقة الحالية ({newsSources.length})</h4>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
              {newsSources.map(s => {
                let assignedArr: string[] = [];
                if (s.assignedUsers) {
                  try {
                    assignedArr = typeof s.assignedUsers === 'string' ? JSON.parse(s.assignedUsers) : s.assignedUsers;
                  } catch (e) {}
                }

                let tgChannelsArr: string[] = [];
                if (s.telegramChannels) {
                  try {
                    tgChannelsArr = typeof s.telegramChannels === 'string' ? JSON.parse(s.telegramChannels) : s.telegramChannels;
                  } catch (e) {}
                }

                return (
                  <div key={s.id} className="p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition hover:bg-slate-100/60 dark:hover:bg-zinc-800/60">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 bg-sky-500/10 rounded-full flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 dark:border-zinc-700">
                        {s.profilePicUrl ? <img src={s.profilePicUrl} className="w-full h-full object-cover" /> : <Shield className="w-5 h-5 text-[var(--color-imamu-brown)]" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                          <span>{s.displayName || s.handle}</span>
                          <span className="text-xs font-mono text-neutral-400">(@{s.handle})</span>
                        </div>
                        {s.bio && <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">{s.bio}</p>}
                        <div className="text-xs mt-1.5 flex gap-2 flex-wrap items-center" style={{ color: 'var(--text-muted)' }}>
                          <span className="font-medium px-2 py-0.5 rounded bg-stone-100 dark:bg-stone-900/50 text-[var(--color-imamu-brown)]">
                            {assignedArr.length} مدراء معينون
                          </span>
                          <span style={{ color: 'var(--border-color)' }}>•</span>
                          <span className="font-medium px-2 py-0.5 rounded bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400">
                            {tgChannelsArr.length || (s.telegramChannel ? 1 : 0)} تليقرام
                          </span>
                          <span style={{ color: 'var(--border-color)' }}>•</span>
                          <span>المسحوب: {s.lastFetched ? formatDate(s.lastFetched, 'ar-display') : 'لم يسحب'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        onClick={() => window.open(`/@/${encodeURIComponent(s.handle.replace(/^@/, ''))}/dashboard`, '_blank')}
                        className="bg-[var(--color-imamu-brown)] text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-[var(--color-imamu-brown-dark)] transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>لوحة التحكم</span>
                      </button>

                      <Button
                        type="button"
                        variant="whatsapp"
                        size="sm"
                        rounded="xl"
                        onClick={() => {
                          setEditingAccount(s);
                          setIsCreateAccountModalOpen(true);
                        }}
                        className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
                        title="تعديل الحساب"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </Button>

                      <button onClick={() => handleDelete(`/api/admin/news_sources/${s.id}`, `@${s.handle}`)} className="p-1.5 rounded-xl hover:bg-red-500/10 transition" title="حذف الحساب">
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {newsSources.length === 0 && <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>لا توجد حسابات موثقة مضافة حتى الآن.</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Authenticated Account Popup Modal */}
      {isCreateAccountModalOpen && (
        <CreateAuthenticatedAccountModal
          isOpen={isCreateAccountModalOpen}
          onClose={() => {
            setIsCreateAccountModalOpen(false);
            setEditingAccount(null);
          }}
          editAccount={editingAccount}
          onSuccess={() => {
            fetchData();
            toast('success', editingAccount ? 'تم تحديث الحساب الموثق بنجاح' : 'تم إنشاء الحساب الموثق بنجاح!');
          }}
        />
      )}

      {/* Admin Account Dashboard Modal */}
      {selectedAdminAccount && (
        <AuthenticatedAccountDashboardModal
          isOpen={!!selectedAdminAccount}
          onClose={() => setSelectedAdminAccount(null)}
          account={selectedAdminAccount}
          currentUser={user}
          onAccountUpdate={() => fetchData()}
        />
      )}
    </div>
  );

  // ============================================================================
  // TAB: MAJORS
  // ============================================================================
  const renderMajors = () => (
    <AdminMajorsTab
      majors={majors}
      subjects={subjects}
      fetchData={fetchData}
      toast={toast}
      getToken={getToken}
      initialSearch={majorSearch}
    />
  );

  // TAB: EVENTS
  // ============================================================================
  const renderEvents = () => {
    const filteredEvents = events.filter(e => 
      e.title?.toLowerCase().includes(eventSearch.toLowerCase()) || 
      e.description?.toLowerCase().includes(eventSearch.toLowerCase())
    ).sort((a, b) => {
      const dA = parseDate(a.date)?.getTime() || 0;
      const dB = parseDate(b.date)?.getTime() || 0;
      return dA - dB;
    });

    const displayedEvents = filteredEvents.slice(0, eventLimit);

    return (
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-main)' }}>المواعيد والتقويم الأكاديمي ({events.length})</h3>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>إدارة المواعيد الرسمية، الاختبارات، الإجازات، وبداية ونهاية الفصول الدراسية</p>
          </div>

          <button
            onClick={() => {
              setEventForm({ 
                id: undefined,
                title: '',
                date: '',
                endDate: '',
                time: '',
                endTime: '',
                location: '',
                link: '',
                description: '',
                isHoliday: false,
                isHolidayEnd: false,
                isSemester: false,
                isSemesterStart: false,
                isSemesterEnd: false,
                isEid: false,
                isNationalDay: false
              });
              setIsEventModalOpen(true);
            }}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition shadow-md shadow-[var(--color-imamu-brown)/20] border border-amber-700/30 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موعد / حدث جديد</span>
          </button>
        </div>

        {/* Controls Bar: Search & Display Limit */}
        <div className="rounded-2xl p-4 border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="ابحث عن موعد أو حدث..."
              value={eventSearch}
              onChange={e => setEventSearch(e.target.value)}
              className="w-full py-2 px-4 rounded-xl text-xs sm:text-sm border outline-none font-medium"
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              عرض {displayedEvents.length} من أصل {filteredEvents.length}
            </span>
            <select
              value={eventLimit}
              onChange={e => setEventLimit(Number(e.target.value))}
              className="py-2 px-3 rounded-xl text-xs font-bold border outline-none cursor-pointer"
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            >
              <option value={20}>20 موعد</option>
              <option value={50}>50 موعد</option>
              <option value={100}>100 موعد</option>
              <option value={1000}>الكل ({events.length})</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Quick Actions Sidebar */}
          <div className="space-y-4">
            <div className="rounded-2xl p-5 border space-y-3 shadow-2xs" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <h4 className="font-bold text-xs" style={{ color: 'var(--text-main)' }}>اشتراكات تقويم Google / Apple (ICS)</h4>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>يستطيع الطلاب المزامنة مباشرة مع التقويم عبر رابط التغذية الرسمية.</p>
              <a href="/api/calendar.ics" download className="flex items-center justify-center gap-2 border font-bold py-2 rounded-xl text-xs w-full transition hover:bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                <Download className="w-4 h-4 text-[var(--color-imamu-accent)]" /> تحميل ملف التقويم (.ics)
              </a>
            </div>

            <div className="rounded-2xl p-5 border space-y-3 shadow-2xs" style={{ background: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.2)' }}>
              <h4 className="font-bold text-xs text-blue-500 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> مزامنة التقويم الأكاديمي الرسمي
              </h4>
              <p className="text-[11px] text-blue-400/80 leading-relaxed">يسحب ويحدث تلقائياً جميع الفعاليات ومواعيد التسجيل والاختبارات وبداية الفصول من بوابة الجامعة الرسمية (Banner).</p>
              <button
                onClick={() => handlePost('/api/admin/events/sync-imamu', {}, () => { toast('success', 'تمت مزامنة مواعيد التقويم بنجاح من بوابة الجامعة الرسمية!'); fetchData(); })}
                className="flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-2 rounded-xl text-xs w-full hover:bg-blue-700 transition cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-4 h-4" /> مزامنة من بوابة الجامعة
              </button>
            </div>

            <div className="rounded-2xl p-5 border space-y-3 shadow-2xs" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
              <h4 className="font-bold text-xs text-emerald-500">جدولة مواعيد المكافأة الجامعية</h4>
              <p className="text-[11px] text-emerald-400/80 leading-relaxed">يولد مواعيد إيداع المكافأة تلقائياً يوم 25 من كل شهر ميلادي لـ 12 شهراً.</p>
              <button
                onClick={() => handlePost('/api/admin/events/generate-mokafaa', {}, () => { toast('success', 'تم توليد 12 موعداً للمكافأة الجامعية!'); fetchData(); })}
                className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold py-2 rounded-xl text-xs w-full hover:bg-emerald-700 transition cursor-pointer shadow-xs"
              >
                <Zap className="w-4 h-4" /> توليد مواعيد المكافأة
              </button>
            </div>
          </div>

          {/* Events Vertical List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="rounded-2xl border divide-y divide-slate-100 dark:divide-zinc-800/60 overflow-hidden shadow-2xs" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              {displayedEvents.map(e => {
                const dateRange = e.endDate && e.endDate !== e.date
                  ? `${e.date} إلى ${e.endDate}`
                  : e.date;
                const dateDisplay = e.time
                  ? `${dateRange} • ${e.time}${e.endTime && e.endTime !== e.time ? ` - ${e.endTime}` : ''}`
                  : dateRange;

                return (
                  <div 
                    key={e.id} 
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-150 hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 group"
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm sm:text-base leading-snug" style={{ color: 'var(--text-main)' }}>
                          {e.title}
                        </span>

                        {(() => {
                          const meta = getEventCategoryMeta(e);
                          if (!meta) return null;
                          return (
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${meta.badgeClass}`}>
                              {meta.label}
                            </span>
                          );
                        })()}
                      </div>

                      {e.description && (
                        <p className="text-xs leading-relaxed max-w-2xl" style={{ color: 'var(--text-muted)' }}>
                          {e.description}
                        </p>
                      )}

                      {(e.location || e.link) && (
                        <div className="flex items-center gap-3 text-xs flex-wrap pt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {e.location && (
                            <span className="flex items-center gap-1 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" /> {e.location}
                            </span>
                          )}
                          {e.link && (
                            <a
                              href={e.link.startsWith('http') ? e.link : `https://${e.link}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[var(--color-imamu-accent)] hover:underline font-medium"
                            >
                              <Link2 className="w-3.5 h-3.5" /> {e.link}
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-xl border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--color-imamu-brown)' }}>
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{dateDisplay}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => {
                            setEventForm({
                              id: e.id,
                              title: e.title || '',
                              date: e.date || '',
                              endDate: e.endDate || '',
                              time: e.time || '',
                              endTime: e.endTime || '',
                              location: e.location || '',
                              link: e.link || '',
                              description: e.description || '',
                              isHoliday: !!e.isHoliday,
                              isHolidayEnd: !!e.isHolidayEnd,
                              isSemester: !!e.isSemester,
                              isSemesterStart: !!e.isSemesterStart,
                              isSemesterEnd: !!e.isSemesterEnd,
                              isEid: !!e.isEid,
                              isNationalDay: !!e.isNationalDay
                            });
                            setIsEventModalOpen(true);
                          }} 
                          className="px-3 py-1.5 rounded-xl border text-xs font-bold transition hover:bg-[var(--bg-subtle)] cursor-pointer" 
                          style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                        >
                          تعديل
                        </Button>

                        <Button
                          onClick={() => handleDelete(`/api/admin/events/${e.id}`, e.title)} 
                          className="p-2 rounded-xl transition hover:bg-red-500/10 cursor-pointer text-red-400"
                          title="حذف الموعد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {displayedEvents.length === 0 && (
                <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  لا توجد مواعيد أكاديمية مطابقة للبحث.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Create / Edit Calendar Event Modal Dialog Popup */}
        <CreateEventModal 
          isOpen={isEventModalOpen}
          onClose={() => setIsEventModalOpen(false)}
          eventForm={eventForm}
          setEventForm={setEventForm}
          onSave={(dataToSave) => {
            const payload = dataToSave || eventForm;
            const url = payload.id ? `/api/admin/events/${payload.id}` : '/api/admin/events';
            const method = payload.id ? 'PUT' : 'POST';
            handlePostWithMethod(url, method, payload, () => {
              fetchData();
            });
          }}
        />
      </div>
    );
  };


  // ============================================================================
  // TAB: SUBJECTS / COURSES
  // ============================================================================
  const renderSubjects = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div>
          <h3 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-main)' }}>المقررات والمواد الأكاديمية</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>إدارة بيانات المقررات والساعات والمستويات والخطط الدراسية</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="primary"
            size="sm"
            rounded="xl"
            onClick={() => {
              setSubjectForm({ 
                id: undefined, code: '', name: '', creditHours: '3', level: '', college: '', department: '', prereq: '', whatsappLink: '', description: '', syllabus: '', freeResourcesUrl: '', paidResourcesUrl: '', avatarUrl: '', tags: '' 
              });
              setIsCourseModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مقرر جديد</span>
          </Button>
        </div>

      </div>

      <div className="rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>المقررات الحالية ({subjects.length})</h4>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="البحث في المقررات..." value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)} className="flex-1 sm:w-64 py-1.5 px-3 rounded-xl text-xs border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
            <select value={subjectLimit} onChange={e => setSubjectLimit(Number(e.target.value))} className="py-1.5 px-2.5 rounded-xl text-xs border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
              <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option><option value={1000}>All</option>
            </select>
            <button
              onClick={() => { if (confirm('Deduplicate courses? Keeps only the best per course code.')) handlePost('/api/admin/subjects/deduplicate', {}, () => toast('success', 'Duplicates removed!')); }}
              className="p-2 rounded-xl transition hover:bg-amber-500/10" title="Clean Duplicates"
            >
              <Zap className="w-4 h-4 text-[var(--color-imamu-accent)]" />
            </button>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
          {subjects.filter(s => matchArabicSearch([s.code, s.name, s.tags, s.college, s.department, s.prereq], subjectSearch)).slice(0, subjectLimit).map(s => (
            <div key={s.id} className="py-3.5 px-5 flex items-center justify-between group hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 transition gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="font-mono text-xs px-2.5 py-1 rounded-lg border font-bold shrink-0 bg-[var(--color-imamu-brown)/10] text-[var(--color-imamu-accent)] border-slate-200/80 dark:border-zinc-700/80">{s.code}</div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="font-bold text-sm truncate" style={{ color: 'var(--text-main)' }}>{s.name}</div>
                  <div className="flex items-center gap-2 flex-wrap text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{s.creditHours || 3} ساعات</span>
                    {s.level && <span>• المستوى {s.level}</span>}
                    {s.college && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {s.college}
                      </span>
                    )}
                    {s.department && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {s.department}
                      </span>
                    )}
                    {s.prereq && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#8C6239]/10 text-[#7A542D] dark:text-[#D4A373] border border-[#8C6239]/20 flex items-center gap-1" title={s.prereq}>
                        <BookOpen className="w-3 h-3" />
                        <span className="truncate max-w-xs">متطلب: {s.prereq}</span>
                      </span>
                    )}
                    {s.tags && <span className="text-slate-400">• الوسوم: {s.tags}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="xs"
                  rounded="xl"
                  onClick={() => {
                    setSubjectForm({ 
                      id: s.id, 
                      code: s.code || '', 
                      name: s.name || '', 
                      creditHours: s.creditHours?.toString() || '3', 
                      level: s.level?.toString() || '',
                      college: s.college || '',
                      department: s.department || '',
                      prereq: s.prereq || '',
                      whatsappLink: s.whatsappLink || '',
                      description: s.description || '',
                      syllabus: s.syllabus || '',
                      freeResourcesUrl: s.freeResourcesUrl || '',
                      paidResourcesUrl: s.paidResourcesUrl || '',
                      avatarUrl: s.avatarUrl || '',
                      tags: s.tags || ''
                    });
                    setIsCourseModalOpen(true);
                  }}
                >
                  تعديل المقرر
                </Button>

                <Button
                  onClick={() => handleDelete(`/api/admin/subjects/${s.id}`, s.name)} 
                  className="p-2 rounded-xl transition hover:bg-red-500/10 text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {subjects.length === 0 && <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>لم تتم إضافة مقررات بعد.</div>}
        </div>
      </div>

      {/* Modal Dialog Popup for Create / Edit Course */}
      <CreateCourseModal 
        isOpen={isCourseModalOpen}
        onClose={() => setIsCourseModalOpen(false)}
        subjectForm={subjectForm}
        setSubjectForm={setSubjectForm}
        onSave={() => {
          const url = subjectForm.id ? `/api/admin/subjects/${subjectForm.id}` : '/api/admin/subjects';
          const method = subjectForm.id ? 'PUT' : 'POST';
          handlePostWithMethod(url, method, subjectForm, () => {});
        }}
      />
    </div>
  );




  // ============================================================================
  // TAB: ACADEMIC RESOURCES (المصادر والمراجع الأكاديمية)
  // ============================================================================
  const renderResources = () => (
    <div className="space-y-6" dir="rtl">
      <div className="rounded-2xl border px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div>
          <h3 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-main)' }}>المصادر والمراجع الأكاديمية</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>إدارة الدرايفات والملخصات والاختبارات السابقة وروابط المواد التعليمية</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <Button
            type="button"
            variant="whatsapp"
            size="sm"
            rounded="xl"
            onClick={() => {
              setResourceForm({ title: '', type: 'course_hub', url: '', description: '', boxLink: '', whatsappLink: '', freeResourcesUrl: '', paidResourcesUrl: '', avatarUrl: '', sectionsEnabled: true });
              setIsResourceModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مصدر جديد</span>
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>
            المصادر المتاحة ({resourcesList.length})
          </h4>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              placeholder="بحث في المصادر..."
              value={resourceSearch}
              onChange={e => setResourceSearch(e.target.value)}
              className="py-1.5 px-3 rounded-xl text-xs border flex-1 sm:w-64 outline-none"
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
            <select
              value={resourceFilterType}
              onChange={e => setResourceFilterType(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl text-xs border outline-none"
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            >
              <option value="ALL">جميع الأنواع</option>
              <option value="course_hub">حزمة مقرر كاملة</option>
              <option value="box">مجلد Box / درايف</option>
              <option value="summary">ملخصات</option>
              <option value="syllabus">خطة وتوصيف</option>
              <option value="exam">نماذج اختبارات</option>
              <option value="whatsapp">مجموعة واتساب</option>
              <option value="telegram">قناة تيليجرام</option>
            </select>
            {[
              { label: 'واتساب', value: resourceFilterWhatsapp, setValue: setResourceFilterWhatsapp },
              { label: 'روابط الملفات', value: resourceFilterFiles, setValue: setResourceFilterFiles },
              { label: 'روابط الدورات', value: resourceFilterCourses, setValue: setResourceFilterCourses }
            ].map(filter => {
              const nextValue = filter.value === 'ALL' ? 'HAS' : filter.value === 'HAS' ? 'NONE' : 'ALL';
              const stateLabel = filter.value === 'HAS' ? 'نعم' : filter.value === 'NONE' ? 'لا' : 'الكل';
              return (
                <button
                  key={filter.label}
                  type="button"
                  onClick={() => filter.setValue(nextValue)}
                  className={`inline-flex items-center gap-1.5 py-1.5 px-2.5 rounded-xl text-xs border transition ${
                    filter.value === 'HAS'
                      ? 'text-emerald-600 border-emerald-500/40 bg-emerald-500/10'
                      : filter.value === 'NONE'
                        ? 'text-red-500 border-red-500/30 bg-red-500/10'
                        : 'text-slate-500'
                  }`}
                  style={filter.value === 'ALL' ? { background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' } : undefined}
                  title="اضغط للتبديل بين نعم، لا، والكل"
                >
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded border text-[10px] font-black">
                    {filter.value === 'HAS' ? '✓' : filter.value === 'NONE' ? '×' : ''}
                  </span>
                  {filter.label}: {stateLabel}
                </button>
              );
            })}
            <select
              value={resourceFilterLinkCount}
              onChange={e => setResourceFilterLinkCount(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl text-xs border outline-none"
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            >
              <option value="ALL">عدد الروابط: الكل</option>
              <option value="0">0 روابط</option>
              <option value="1">رابط واحد</option>
              <option value="2">رابطان</option>
              <option value="3+">3 روابط فأكثر</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
          {resourcesList
            .filter(r => {
              const countLinks = (value: unknown) => {
                if (!value || typeof value !== 'string') return 0;
                const matches = value.match(/(?:https?:\/\/|www\.)[^\s)]+/gi);
                return matches ? matches.length : 0;
              };
              const whatsappCount = countLinks(r.whatsappLink || r.whatsappUrl);
              const fileCount = countLinks(r.fileUrl || r.driveUrl || r.url) + countLinks(r.boxLink);
              const courseCount = countLinks(r.freeResourcesUrl) + countLinks(r.paidResourcesUrl);
              const totalLinkCount = whatsappCount + fileCount + courseCount;
              const matchSearch = !resourceSearch || 
                r.title?.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                r.courseCode?.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                r.courseName?.toLowerCase().includes(resourceSearch.toLowerCase());
              const matchType = resourceFilterType === 'ALL' || r.type === resourceFilterType;
              const matchesPresence = (filter: string, count: number) => filter === 'ALL' || (filter === 'HAS' ? count > 0 : count === 0);
              const matchesLinkCount = resourceFilterLinkCount === 'ALL' ||
                (resourceFilterLinkCount === '3+' ? totalLinkCount >= 3 : totalLinkCount === Number(resourceFilterLinkCount));
              return matchSearch && matchType &&
                matchesPresence(resourceFilterWhatsapp, whatsappCount) &&
                matchesPresence(resourceFilterFiles, fileCount) &&
                matchesPresence(resourceFilterCourses, courseCount) &&
                matchesLinkCount;
            })
            .map(r => (
              <div key={r.id} className="p-4 flex items-center justify-between gap-4 transition hover:bg-slate-100/60 dark:hover:bg-zinc-800/60">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.courseCode && (
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-md font-bold bg-[var(--color-imamu-brown)/10] text-[var(--color-imamu-accent)] border border-slate-200/80 dark:border-zinc-700/80">
                        {r.courseCode}
                      </span>
                    )}
                    <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{r.title}</span>
                    <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      {r.type || 'course_hub'}
                    </span>
                  </div>

                  {r.description && <p className="text-xs mt-1 text-slate-400 line-clamp-2">{r.description}</p>}
                  
                  {(() => {
                    const countLinks = (value: unknown) => {
                      if (!value || typeof value !== 'string') return 0;
                      const matches = value.match(/(?:https?:\/\/|www\.)[^\s)]+/gi);
                      return matches ? matches.length : 0;
                    };
                    const whatsappCount = countLinks(r.whatsappLink || r.whatsappUrl);
                    const fileCount = countLinks(r.fileUrl || r.driveUrl || r.url) + countLinks(r.boxLink);
                    const courseCount = countLinks(r.freeResourcesUrl) + countLinks(r.paidResourcesUrl);
                    const totalLinkCount = whatsappCount + fileCount + courseCount;
                    return (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                        {whatsappCount > 0 && <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">واتساب ({whatsappCount})</span>}
                        {fileCount > 0 && <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-500 border border-sky-500/20">ملفات ({fileCount})</span>}
                        {courseCount > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">دورات ({courseCount})</span>}
                        <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-500 border border-slate-500/20">الروابط ({totalLinkCount})</span>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setResourceForm({
                        id: r.id,
                        subjectId: r.subjectId,
                        title: r.title || '',
                        type: r.type || 'course_hub',
                        url: r.fileUrl || r.driveUrl || r.url || '',
                        boxLink: r.boxLink || '',
                        whatsappLink: r.whatsappLink || '',
                        freeResourcesUrl: r.freeResourcesUrl || '',
                        paidResourcesUrl: r.paidResourcesUrl || '',
                        avatarUrl: r.avatarUrl || '',
                        description: r.description || '',
                        sectionsEnabled: r.sectionsEnabled !== false
                      });
                      setIsResourceModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl border text-xs font-bold transition hover:bg-emerald-500/10 text-emerald-500 border-emerald-500/30 flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(`/api/admin/resources/${r.id}`, r.title)}
                    className="p-2 rounded-xl transition hover:bg-red-500/10 text-red-400"
                    title="Delete Resource"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          {resourcesList.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No academic resources added yet.</div>
          )}
        </div>
      </div>

      {/* Resource Creation Wizard Popup Modal */}
      <CreateResourceModal
        isOpen={isResourceModalOpen}
        onClose={() => setIsResourceModalOpen(false)}
        resourceForm={resourceForm}
        setResourceForm={setResourceForm}
        subjects={subjects}
        onSave={async () => {
          if (!resourceForm.subjectId && !resourceForm.title?.trim()) {
            toast('error', 'Please select a course or enter a title');
            return false;
          }
          const selectedSubj = subjects.find(s => s.id === resourceForm.subjectId);
          const cleanName = selectedSubj ? selectedSubj.name.replace(/\s*\(([^)]+)\)/g, (match: string, p1: string) => {
            const mainText = selectedSubj.name.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
            const innerText = p1.trim().toLowerCase();
            return (mainText.includes(innerText) || innerText.includes(mainText)) ? '' : match;
          }).trim() : '';
          const finalTitle = resourceForm.title?.trim() || (selectedSubj ? (cleanName || selectedSubj.name) : 'باقة مصادر جديدة');
          const payload = { ...resourceForm, title: finalTitle };

          const url = resourceForm.id ? `/api/admin/resources/${resourceForm.id}` : '/api/admin/resources';
          const method = resourceForm.id ? 'PUT' : 'POST';

          try {
            const headers = await authHeaders();
            const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
            if (res.ok) {
              setResourceForm({ title: '', type: 'course_hub', url: '', description: '', boxLink: '', whatsappLink: '', freeResourcesUrl: '', paidResourcesUrl: '', avatarUrl: '', sectionsEnabled: true });
              fetchData();
              toast('success', 'Resource saved successfully');
              setIsResourceModalOpen(false);
              return true;
            } else {
              const err = await res.json().catch(() => ({}));
              toast('error', err.message || err.error || 'Failed to save resource');
              return false;
            }
          } catch (e) {
            console.error(e);
            toast('error', 'Network error');
            return false;
          }
        }}
      />
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard': return <AdminDashboardTab stats={stats} health={health} setSearchUser={setUserSearch} setActiveTab={setActiveTab} />;
      case 'users': return <AdminUsersTab adminUsers={adminUsers} searchUser={userSearch} setSearchUser={setUserSearch} fetchUsers={fetchUsers} handleDelete={handleDelete} />;
      case 'contributors': return <AdminContributorsTab />;
      case 'news_sources': return renderNewsSources();
      case 'majors': return renderMajors();
      case 'events': return renderEvents();
      case 'academic': return (
        <AdminAcademicHubTab
          teachersContent={<AdminSectionsTab getToken={getToken} toast={toast} defaultSubTab="teachers" />}
          subjectsContent={renderSubjects()}
          resourcesContent={renderResources()}
        />
      );
      case 'tutorials': return <TutorialsTab user={user} sections={tutorialSections} tutorials={tutorials} onRefresh={fetchData} />;
      case 'feedback': return <AdminFeedbackTab getToken={getToken} />;
      case 'settings': return (
        <AdminSettingsTab
          globalSettings={globalSettings}
          setGlobalSettings={setGlobalSettings}
          getToken={getToken}
          toast={toast}
          handlePostWithMethod={handlePostWithMethod}
          health={health}
        />
      );
      case 'logs': return <AdminLogsPage />;
      default: return null;
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="flex flex-col flex-1 max-w-[1400px] w-full mx-auto pb-24 px-4 sm:px-6">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold inline-flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            لوحة التحكم والإدارة
          </h1>
          <p className="mt-1" style={{ color: 'var(--text-muted)' }}>إدارة ومراقبة كافة أقسام المنصة</p>
        </div>
        <button
          onClick={() => setCmdOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition hover:bg-[var(--bg-subtle)]"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
        >
          <Command className="w-4 h-4" />
          <span className="hidden sm:inline">التنقل السريع</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border ml-1" style={{ borderColor: 'var(--border-color)' }}>⌘K</kbd>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-10">
        {/* Sidebar */}
        <div className="w-full md:w-56 shrink-0">
          <nav className="flex flex-col space-y-0.5">
            {visibleTabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-3 w-full px-3.5 py-2.5 text-left rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === t.id
                    ? 'bg-[var(--color-imamu-brown)] text-white shadow-md shadow-[var(--color-imamu-brown)/20]'
                    : 'hover:bg-[var(--bg-subtle)]'
                }`}
                style={activeTab !== t.id ? { color: 'var(--text-muted)' } : undefined}
              >
                {t.icon}
                <span className="truncate">{t.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 w-full min-w-0 max-w-7xl">
          {renderTabContent()}
        </div>
      </div>

      {/* Command Palette */}
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onSelectTab={setActiveTab}
        tabs={visibleTabs}
        users={adminUsers}
        newsSources={newsSources}
        majors={majors}
        subjects={subjects}
        resources={resourcesList}
        tutorials={tutorials}
        events={events}
        onSelectUser={(u) => {
          setActiveTab('users');
          setUserSearch(u.email || u.userName || u.handle || '');
        }}
        onSelectEntity={(s) => {
          setActiveTab('news_sources');
          setEditingAccount(s);
          setIsCreateAccountModalOpen(true);
        }}
        onSelectSubject={(subj) => {
          setActiveTab('subjects');
          setSubjectSearch(subj.code || subj.name || '');
        }}
        onSelectMajor={(m) => {
          setActiveTab('majors');
          setMajorSearch(typeof m === 'string' ? m : m.name || '');
        }}
        onSelectResource={(r) => {
          setActiveTab('resources');
          setResourceSearch(r.title || '');
        }}
        onSelectTutorial={() => {
          setActiveTab('tutorials');
        }}
        onSelectEvent={(ev) => {
          setActiveTab('events');
          setEventSearch(ev.title || '');
        }}
        onSearchUsersBackend={(q) => {
          fetchUsers(q);
        }}
      />

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-main)' }}>تأكيد الحذف</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{deleteModal.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteModal(null)} className="flex-1 py-2.5 rounded-xl font-medium transition border hover:bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>إلغاء</button>
                <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700 transition">حذف</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Animation keyframes */}
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
