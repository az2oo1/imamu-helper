'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  ShieldAlert, ShieldCheck, Shield, Calendar, BookOpen,
  Trash2, Link as LinkIcon, Download, Upload, Plus, X,
  Users, Settings, HelpCircle, ExternalLink, Server, Command,
  CheckCircle2, AlertTriangle, Info, XCircle, RefreshCw, Zap, Loader2,
  LayoutDashboard, Newspaper, GraduationCap, Link2, Folder, Edit3, Send, Mail, HeartHandshake, MessageSquare, Layers
} from 'lucide-react';
import { TutorialsTab } from '../components/TutorialsTab';
import CreateCourseModal from '../components/CreateCourseModal';
import CreateResourceModal from '../components/CreateResourceModal';
import CreateEventModal from '../components/CreateEventModal';
import CreateAuthenticatedAccountModal from '../components/CreateAuthenticatedAccountModal';
import { AuthenticatedAccountDashboardModal } from '../components/AuthenticatedAccountDashboardModal';
import { AuthenticatedAccountProfileModal } from '../components/AuthenticatedAccountProfileModal';
import AdminDashboardTab from './admin/AdminDashboardTab';
import AdminUsersTab from './admin/AdminUsersTab';
import AdminContributorsTab from './admin/AdminContributorsTab';
import AdminFeedbackTab from './admin/AdminFeedbackTab';
import AdminSettingsTab from './admin/AdminSettingsTab';
import AdminSectionsTab from './admin/AdminSectionsTab';
import CommandPalette from './admin/CommandPalette';
import { parseDate, formatDate } from '../lib/date-utils';

type Tab = 'dashboard' | 'users' | 'contributors' | 'news_sources' | 'majors' | 'events' | 'subjects' | 'sections' | 'resources' | 'tutorials' | 'feedback' | 'settings';

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
  const [majorForm, setMajorForm] = useState<{
    id?: number; name: string; pdfUrl: string;
    courses: { subjectId: number; optionalGroup: string; optionalGroupReqCount: string }[];
    batches: { name: string; reqCount: string }[]
  }>({ name: '', pdfUrl: '', courses: [], batches: [] });
  const [draggedSubjectId, setDraggedSubjectId] = useState<number | null>(null);
  const [subjectForm, setSubjectForm] = useState<{ 
    id?: number; 
    code: string; 
    name: string; 
    creditHours: string; 
    level: string; 
    whatsappLink: string;
    driveLink: string;
    description: string; 
    syllabus: string; 
    freeResourcesUrl: string; 
    paidResourcesUrl: string; 
    avatarUrl: string; 
    bannerUrl: string; 
    tags: string; 
  }>({ 
    code: '', 
    name: '', 
    creditHours: '3', 
    level: '', 
    whatsappLink: '',
    driveLink: '',
    description: '', 
    syllabus: '', 
    freeResourcesUrl: '', 
    paidResourcesUrl: '', 
    avatarUrl: '', 
    bannerUrl: '', 
    tags: '' 
  });

  const [eventForm, setEventForm] = useState<{ id?: number; title: string; date: string; description: string; isHoliday?: boolean; isHolidayEnd?: boolean; isSemesterStart?: boolean; isSemesterEnd?: boolean; isEid?: boolean; isNationalDay?: boolean }>({ title: '', date: '', description: '', isHoliday: false, isHolidayEnd: false, isSemesterStart: false, isSemesterEnd: false, isEid: false, isNationalDay: false });
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);






  // Search & pagination
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectLimit, setSubjectLimit] = useState(20);
  const [majorSearch, setMajorSearch] = useState('');
  const [majorLimit, setMajorLimit] = useState(10);
  const [eventSearch, setEventSearch] = useState('');
  const [eventLimit, setEventLimit] = useState(1000);
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [resourceForm, setResourceForm] = useState<{
    id?: number;
    subjectId?: number;
    title: string;
    type: string;
    url: string;
    driveLink?: string;
    boxLink?: string;
    whatsappLink?: string;
    freeResourcesUrl?: string;
    paidResourcesUrl?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    description?: string;
    sectionsEnabled?: boolean;
  }>({ title: '', type: 'course_hub', url: '', description: '', driveLink: '', boxLink: '', whatsappLink: '', freeResourcesUrl: '', paidResourcesUrl: '', avatarUrl: '', bannerUrl: '', sectionsEnabled: true });

  // Modals
  const [deleteModal, setDeleteModal] = useState<{ url: string; message: string } | null>(null);

  // Sync activeTab with URL search param on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') as Tab;
      if (tabParam && ['dashboard', 'users', 'news_sources', 'majors', 'events', 'subjects', 'resources', 'tutorials', 'feedback', 'settings'].includes(tabParam)) {
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
    { id: 'subjects', label: 'المقررات الأكاديمية', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'sections', label: 'الشعب والمواعيد', icon: <Layers className="w-5 h-5" /> },
    { id: 'resources', label: 'المصادر والمراجع', icon: <Folder className="w-5 h-5" /> },
    { id: 'tutorials', label: 'إدارة شروحات الدليلة', icon: <HelpCircle className="w-5 h-5" /> },
    { id: 'feedback', label: 'البلاغات والتقييمات', icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'settings', label: 'الإعدادات العامة', icon: <Settings className="w-5 h-5" /> },
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
    if (tabId === 'majors' || tabId === 'subjects' || tabId === 'sections') return userPerms.includes('courses');
    if (tabId === 'resources') return userPerms.includes('resources');
    if (tabId === 'events') return userPerms.includes('dates');
    if (tabId === 'news_sources') return userPerms.includes('news');
    if (tabId === 'tutorials' || tabId === 'feedback') return userPerms.includes('tutorials') || userPerms.includes('feedback');
    if (tabId === 'settings') return userPerms.includes('logs');
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
          <h3 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-main)' }}>حسابات الجهات (Entity Accounts)</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>إنشاء وتعيين الحسابات الرسمية، ربط المستخدمين (User UID)، وإدارة السحب التلقائي من التليقرام</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setEditingAccount(null);
              setIsCreateAccountModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-[var(--color-imamu-brown)] text-white hover:bg-[var(--color-imamu-brown-dark)] transition shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إنشاء حساب موثق جديد</span>
          </button>
          
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

            <button
              onClick={() => {
                setEditingAccount(null);
                setIsCreateAccountModalOpen(true);
              }}
              className="w-full bg-[var(--color-imamu-brown)] text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-[var(--color-imamu-brown-dark)] transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>فتح نافذة إنشاء حساب موثق</span>
            </button>
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

                      <button
                        onClick={() => {
                          setEditingAccount(s);
                          setIsCreateAccountModalOpen(true);
                        }}
                        className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
                        title="تعديل الحساب"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>

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
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-main)' }}>Academic Majors</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Configure degree planning programs, requirement groups, and courses</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Form + List */}
        <div className="space-y-4">
          <div className="rounded-2xl p-5 border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>{majorForm.id ? 'Edit Major' : 'Add New Major'}</h4>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Major Name</label>
                <input type="text" placeholder="e.g. Computer Science" value={majorForm.name} onChange={e => setMajorForm(s => ({ ...s, name: e.target.value }))} className="py-2.5 px-3 rounded-xl text-sm border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>PDF Plan URL</label>
                <input type="text" placeholder="PDF Plan URL" value={majorForm.pdfUrl} onChange={e => setMajorForm(s => ({ ...s, pdfUrl: e.target.value }))} className="py-2.5 px-3 rounded-xl text-sm border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const url = majorForm.id ? `/api/admin/majors/${majorForm.id}` : '/api/admin/majors';
                    const method = majorForm.id ? 'PUT' : 'POST';
                    handlePostWithMethod(url, method, majorForm, () => setMajorForm({ id: undefined, name: '', pdfUrl: '', courses: [], batches: [] }));
                  }}
                  className="flex-1 bg-[var(--color-imamu-brown)] text-white py-2 rounded-xl font-medium text-sm hover:bg-[var(--color-imamu-brown-light)] transition"
                >
                  {majorForm.id ? 'Update Major' : 'Add Major'}
                </button>
                {majorForm.id && <button onClick={() => setMajorForm({ id: undefined, name: '', pdfUrl: '', courses: [], batches: [] })} className="px-3 py-2 border rounded-xl text-sm font-medium transition hover:bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>Cancel</button>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-5 border space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>Current Majors ({majors.length})</h4>
            </div>
            <input type="text" placeholder="Search majors..." value={majorSearch} onChange={e => setMajorSearch(e.target.value)} className="w-full py-1.5 px-3 rounded-xl text-xs border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
            <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
              {majors.filter(m => m.name?.toLowerCase().includes(majorSearch.toLowerCase())).slice(0, majorLimit).map(m => (
                <div key={m.id} className="py-3 flex items-center justify-between group">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate" style={{ color: 'var(--text-main)' }}>{m.name}</div>
                    {m.pdfUrl && <a href={m.pdfUrl} target="_blank" rel="noreferrer" className="text-[10px] text-[var(--color-imamu-brown)] font-medium hover:underline flex items-center gap-1 mt-1"><LinkIcon className="w-2.5 h-2.5" /> PDF Plan</a>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        const courses = m.courses?.map((c: any) => ({ ...c, optionalGroupReqCount: c.optionalGroupReqCount?.toString() || '1' })) || [];
                        const bMap = new Map();
                        courses.forEach((c: any) => { if (c.optionalGroup) bMap.set(c.optionalGroup, c.optionalGroupReqCount); });
                        const batches = Array.from(bMap.entries()).map(([name, reqCount]) => ({ name, reqCount }));
                        setMajorForm({ ...m, courses, batches });
                      }}
                      className="px-2.5 py-1.5 rounded-xl transition text-xs font-semibold hover:bg-slate-100/60 dark:hover:bg-zinc-800/60"
                      style={{ color: 'var(--text-muted)' }}
                    >Edit</button>
                    <button onClick={() => handleDelete(`/api/admin/majors/${m.id}`, m.name)} className="p-1.5 rounded transition hover:bg-red-500/10"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
              ))}
              {majors.length === 0 && <div className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No majors added yet.</div>}
            </div>
          </div>
        </div>

        {/* Batches + Courses Planner */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl p-5 border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex justify-between items-center border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>Plan Levels & Batches (المستويات والحزم)</span>
              <button type="button" onClick={() => setMajorForm(f => ({ ...f, batches: [...f.batches, { name: `Batch ${f.batches.length + 1}`, reqCount: '1' }] }))} className="text-xs text-[var(--color-imamu-brown)] font-medium hover:underline">+ Add Batch</button>
            </div>
            {majorForm.batches.length > 0 && (
              <div className="rounded-xl p-3 space-y-2 border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                {majorForm.batches.map((b, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input type="text" value={b.name} placeholder="Batch Name" onChange={e => { const newName = e.target.value; const oldName = b.name; setMajorForm(f => ({ ...f, batches: f.batches.map((batch, idx) => idx === i ? { ...batch, name: newName } : batch), courses: f.courses.map(c => c.optionalGroup === oldName ? { ...c, optionalGroup: newName } : c) })); }} className="flex-1 py-1.5 px-3 rounded-lg text-sm border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                    <input type="number" min="1" value={b.reqCount} placeholder="Req" title="Required count" onChange={e => setMajorForm(f => ({ ...f, batches: f.batches.map((batch, idx) => idx === i ? { ...batch, reqCount: e.target.value } : batch), courses: f.courses.map(c => c.optionalGroup === b.name ? { ...c, optionalGroupReqCount: e.target.value } : c) }))} className="w-24 py-1.5 px-3 rounded-lg text-sm border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                    <button type="button" onClick={() => setMajorForm(f => ({ ...f, batches: f.batches.filter((_, idx) => idx !== i), courses: f.courses.map(c => c.optionalGroup === b.name ? { ...c, optionalGroup: '', optionalGroupReqCount: '1' } : c) }))} className="text-red-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Select Included Courses:</span>
              <select
                value=""
                onChange={(e) => {
                  const val = e.target.value;
                  if (val) {
                    const subjectNum = parseInt(val);
                    if (!majorForm.courses.some(c => c.subjectId === subjectNum)) {
                      setMajorForm(f => ({ ...f, courses: [...f.courses, { subjectId: subjectNum, optionalGroup: '', optionalGroupReqCount: '1' }] }));
                    }
                  }
                }}
                className="w-full py-2 px-3 rounded-xl text-sm border"
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              >
                <option value="">Search courses to include...</option>
                {subjects.map(subj => <option key={subj.id} value={subj.id}>{subj.code} - {subj.name}</option>)}
              </select>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto rounded-xl p-2.5 border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                {subjects.map(subj => {
                  const isSelected = majorForm.courses.some(c => c.subjectId === subj.id);
                  return (
                    <div key={subj.id} className="flex items-center text-xs">
                      <label className="flex items-center gap-2 cursor-pointer select-none w-full truncate" style={{ color: 'var(--text-muted)' }}>
                        <input type="checkbox" checked={isSelected} onChange={(e) => {
                          if (e.target.checked) setMajorForm(f => ({ ...f, courses: [...f.courses, { subjectId: subj.id, optionalGroup: '', optionalGroupReqCount: '1' }] }));
                          else setMajorForm(f => ({ ...f, courses: f.courses.filter(c => c.subjectId !== subj.id) }));
                        }} />
                        <span className="font-medium shrink-0" style={{ color: 'var(--text-main)' }}>{subj.code}</span>
                        <span className="truncate">{subj.name}</span>
                      </label>
                    </div>
                  );
                })}
              </div>

              {majorForm.courses.length > 0 && (
                <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="block text-xs font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Drag & Drop Courses into Batches/Levels:</span>
                  <div className="flex gap-4 overflow-x-auto pb-4 items-start">
                    {[{ name: '', title: 'Unassigned (Default)' }, ...majorForm.batches.map(b => ({ name: b.name, title: b.name }))].map(batch => (
                      <div
                        key={batch.name || 'unassigned'}
                        className="flex-shrink-0 w-60 rounded-xl p-3 flex flex-col min-h-[120px] max-h-[40vh] h-[450px] border"
                        style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedSubjectId) {
                            const newBatch = majorForm.batches.find(b => b.name === batch.name);
                            setMajorForm(f => ({ ...f, courses: f.courses.map(c => c.subjectId === draggedSubjectId ? { ...c, optionalGroup: batch.name, optionalGroupReqCount: newBatch ? newBatch.reqCount : '1' } : c) }));
                            setDraggedSubjectId(null);
                          }
                        }}
                      >
                        <h4 className="font-semibold text-xs border-b pb-2 mb-2 flex justify-between items-center shrink-0" style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                          <span className="truncate max-w-[120px]">{batch.title}</span>
                          {batch.name && <span className="bg-purple-500/15 text-purple-400 text-[10px] px-1.5 py-0.5 rounded-full shrink-0">{majorForm.batches.find(b => b.name === batch.name)?.reqCount} Req</span>}
                        </h4>

                        {!batch.name && (
                          <input type="text" placeholder="Search..." value={unassignedSearch} onChange={(e) => setUnassignedSearch(e.target.value)} className="mb-2 w-full py-1 px-2 rounded text-xs border shrink-0" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                        )}

                        <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 pr-1 pb-2">
                          {majorForm.courses.filter(c => {
                            if ((c.optionalGroup || '') !== batch.name) return false;
                            if (!batch.name && unassignedSearch) {
                              const subj = subjects.find(s => s.id === c.subjectId);
                              if (!subj) return false;
                              const term = unassignedSearch.toLowerCase();
                              return subj.name.toLowerCase().includes(term) || subj.code.toLowerCase().includes(term);
                            }
                            return true;
                          }).map(c => {
                            const subj = subjects.find(s => s.id === c.subjectId);
                            if (!subj) return null;
                            return (
                              <div
                                key={c.subjectId}
                                draggable
                                onDragStart={(e) => { setDraggedSubjectId(c.subjectId); e.dataTransfer.setData('text/plain', c.subjectId.toString()); }}
                                className="p-2 rounded shadow-sm text-xs cursor-grab active:cursor-grabbing border transition hover:border-[var(--color-imamu-brown)] shrink-0"
                                style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                              >
                                <div className="font-semibold" style={{ color: 'var(--text-main)' }}>{subj.code}</div>
                                <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>{subj.name}</div>
                              </div>
                            );
                          })}
                          {majorForm.courses.filter(c => (c.optionalGroup || '') === batch.name).length === 0 && (
                            <div className="italic flex-1 flex items-center justify-center border border-dashed rounded-lg min-h-[60px] text-[10px]" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>Drop here</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
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
                id: undefined, title: '', date: '', description: '', isHoliday: false, isSemesterStart: false, isSemesterEnd: false 
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
                const dateDisplay = e.date;

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

                        {e.isSemesterStart && <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--color-imamu-brown)/15] text-[var(--color-imamu-accent)] border border-amber-700/30">🚀 بداية الفصل</span>}
                        {e.isSemesterEnd && <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">🏁 نهاية الفصل</span>}
                        {e.isHoliday && <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">🌴 بداية إجازة</span>}
                        {e.isHolidayEnd && <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-600 dark:text-teal-400 border border-teal-500/30">🔄 نهاية إجازة</span>}
                        {e.isEid && <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] border border-amber-500/30">🌙 احتفال العيد</span>}
                        {e.isNationalDay && <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border border-emerald-600/40">🇸🇦 اليوم الوطني</span>}
                      </div>

                      {e.description && (
                        <p className="text-xs leading-relaxed max-w-2xl" style={{ color: 'var(--text-muted)' }}>
                          {e.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-xl border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--color-imamu-brown)' }}>
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{dateDisplay}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            setEventForm({
                              id: e.id,
                              title: e.title || '',
                              date: e.date || '',
                              description: e.description || '',
                              isHoliday: !!e.isHoliday,
                              isHolidayEnd: !!e.isHolidayEnd,
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
                        </button>

                        <button 
                          onClick={() => handleDelete(`/api/admin/events/${e.id}`, e.title)} 
                          className="p-2 rounded-xl transition hover:bg-red-500/10 cursor-pointer text-red-400"
                          title="حذف الموعد"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
          onSave={() => {
            const url = eventForm.id ? `/api/admin/events/${eventForm.id}` : '/api/admin/events';
            const method = eventForm.id ? 'PUT' : 'POST';
            handlePostWithMethod(url, method, eventForm, () => {
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-main)' }}>Academic Courses (المقررات والمواد)</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage course metadata, credits, level, syllabus, and basic info</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('sections')}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-semibold text-xs sm:text-sm rounded-xl transition border border-indigo-500/20 shrink-0"
          >
            <Layers className="w-4 h-4" />
            <span>إدارة الشعب والمواعيد</span>
          </button>

          <button
            onClick={() => {
              setSubjectForm({ 
                id: undefined, code: '', name: '', creditHours: '3', level: '', whatsappLink: '', driveLink: '', description: '', syllabus: '', freeResourcesUrl: '', paidResourcesUrl: '', avatarUrl: '', bannerUrl: '', tags: '' 
              });
              setIsCourseModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] active:scale-95 text-white font-semibold text-xs sm:text-sm rounded-xl transition shadow-sm border border-amber-700/30 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Course</span>
          </button>
        </div>

      </div>

      <div className="rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: 'var(--border-color)' }}>
          <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>Current Courses ({subjects.length})</h4>
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Search courses..." value={subjectSearch} onChange={e => setSubjectSearch(e.target.value)} className="flex-1 sm:w-64 py-1.5 px-3 rounded-xl text-xs border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
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
          {subjects.filter(s => s.code?.toLowerCase().includes(subjectSearch.toLowerCase()) || s.name?.toLowerCase().includes(subjectSearch.toLowerCase())).slice(0, subjectLimit).map(s => (
            <div key={s.id} className="py-3.5 px-5 flex items-center justify-between group hover:bg-slate-100/60 dark:hover:bg-zinc-800/60 transition">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="font-mono text-xs px-2.5 py-1 rounded-lg border font-bold shrink-0 bg-[var(--color-imamu-brown)/10] text-[var(--color-imamu-accent)] border-slate-200/80 dark:border-zinc-700/80">{s.code}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate" style={{ color: 'var(--text-main)' }}>{s.name}</div>
                  <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span>{s.creditHours || 3} Hours</span>
                    {s.level && <span>• Level {s.level}</span>}
                    {s.tags && <span className="text-slate-400">• Tags: {s.tags}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button 
                  onClick={() => {
                    setSubjectForm({ 
                      id: s.id, 
                      code: s.code || '', 
                      name: s.name || '', 
                      creditHours: s.creditHours?.toString() || '3', 
                      level: s.level?.toString() || '',
                      whatsappLink: s.whatsappLink || '',
                      driveLink: s.driveLink || '',
                      description: s.description || '',
                      syllabus: s.syllabus || '',
                      freeResourcesUrl: s.freeResourcesUrl || s.driveLink || '',
                      paidResourcesUrl: s.paidResourcesUrl || '',
                      avatarUrl: s.avatarUrl || '',
                      bannerUrl: s.bannerUrl || '',
                      tags: s.tags || ''
                    });
                    setIsCourseModalOpen(true);
                  }} 
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold transition hover:bg-[var(--color-imamu-brown-light)]/10 text-[var(--color-imamu-accent)] border-amber-700/30"
                >
                  Edit Course
                </button>

                <button 
                  onClick={() => handleDelete(`/api/admin/subjects/${s.id}`, s.name)} 
                  className="p-2 rounded-xl transition hover:bg-red-500/10 text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {subjects.length === 0 && <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No courses added yet.</div>}
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-main)' }}>Course Resources (المصادر والمراجع الأكاديمية)</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage academic drives, summaries, past exams, and study links via resource wizard</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          <button
            onClick={() => {
              setResourceForm({ title: '', type: 'course_hub', url: '', description: '', driveLink: '', boxLink: '', whatsappLink: '', freeResourcesUrl: '', paidResourcesUrl: '', avatarUrl: '', bannerUrl: '', sectionsEnabled: true });
              setIsResourceModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-semibold text-xs sm:text-sm rounded-xl transition shadow-sm border border-emerald-500/30 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Resource</span>
          </button>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: 'var(--border-color)' }}>
          <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>
            Academic Resources ({resourcesList.length})
          </h4>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <input
              type="text"
              placeholder="Search resources..."
              value={resourceSearch}
              onChange={e => setResourceSearch(e.target.value)}
              className="py-1.5 px-3 rounded-xl text-xs border flex-1 sm:w-64"
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
            <select
              value={resourceFilterType}
              onChange={e => setResourceFilterType(e.target.value)}
              className="py-1.5 px-2.5 rounded-xl text-xs border"
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            >
              <option value="ALL">All Types</option>
              <option value="course_hub">Course Package</option>
              <option value="box">Box Storage</option>
              <option value="summary">Summary</option>
              <option value="syllabus">Syllabus</option>
              <option value="exam">Exams</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-zinc-800/60">
          {resourcesList
            .filter(r => {
              const matchSearch = !resourceSearch || 
                r.title?.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                r.courseCode?.toLowerCase().includes(resourceSearch.toLowerCase()) || 
                r.courseName?.toLowerCase().includes(resourceSearch.toLowerCase());
              const matchType = resourceFilterType === 'ALL' || r.type === resourceFilterType;
              return matchSearch && matchType;
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
                  
                  {/* Badges for attached links */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px]">
                    {(r.fileUrl || r.driveUrl || r.url) && (
                      <a
                        href={r.fileUrl || r.driveUrl || r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[var(--color-imamu-accent)] hover:underline flex items-center gap-1 font-mono"
                      >
                        <ExternalLink className="w-3 h-3" /> Link
                      </a>
                    )}
                    {r.boxLink && (
                      <a
                        href={r.boxLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 hover:underline flex items-center gap-1 font-mono"
                      >
                        <ExternalLink className="w-3 h-3" /> Box
                      </a>
                    )}
                    {r.whatsappLink && (
                      <a
                        href={r.whatsappLink}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline flex items-center gap-1 font-mono"
                      >
                        <ExternalLink className="w-3 h-3" /> WhatsApp
                      </a>
                    )}
                  </div>
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
                        driveLink: r.driveLink || '',
                        boxLink: r.boxLink || '',
                        whatsappLink: r.whatsappLink || '',
                        freeResourcesUrl: r.freeResourcesUrl || '',
                        paidResourcesUrl: r.paidResourcesUrl || '',
                        avatarUrl: r.avatarUrl || '',
                        bannerUrl: r.bannerUrl || '',
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
              setResourceForm({ title: '', type: 'course_hub', url: '', description: '', driveLink: '', boxLink: '', whatsappLink: '', freeResourcesUrl: '', paidResourcesUrl: '', avatarUrl: '', bannerUrl: '' });
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
      case 'subjects': return renderSubjects();
      case 'sections': return <AdminSectionsTab getToken={getToken} toast={toast} />;
      case 'resources': return renderResources();
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
