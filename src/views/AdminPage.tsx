'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import {
  ShieldAlert, ShieldCheck, Twitter, Calendar, BookOpen, FileText,
  Trash2, Link as LinkIcon, Download, Upload, Plus, Search, X,
  Users, BarChart3, Settings, HelpCircle, ExternalLink, PlusCircle,
  ChevronDown, ChevronUp, Activity, Server, Database, Cpu, Globe,
  Shield, UserCheck, UserX, Eye, Sparkles, Command, Hash, Clock,
  CheckCircle2, AlertTriangle, Info, XCircle, RefreshCw, Zap, 
  LayoutDashboard, Newspaper, GraduationCap, BookMarked, Link2,
  MoreHorizontal, ArrowUpRight, TrendingUp, Bell, Folder
} from 'lucide-react';
import { format } from 'date-fns';
import { TutorialsTab } from '../components/TutorialsTab';
import CreateCourseModal from '../components/CreateCourseModal';
import { AnimatedNumber } from '../components/ui';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';


// ============================================================================
// TYPES
// ============================================================================
type Tab = 'dashboard' | 'users' | 'news_sources' | 'majors' | 'events' | 'subjects' | 'tutorials' | 'newbie_links' | 'settings';

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
  newbieLinks: number;
  newsSources: number;
  recentUsers7d: number;
  recentUsers30d: number;
  usersByDay: { day: string; count: number }[];
  newsBySource: { source: string; count: number }[];
}

interface HealthInfo {
  uptime: number;
  memory: { rss: number; heapUsed: number; heapTotal: number };
  dbStatus: string;
  storageStatus: string;
  nodeVersion: string;
  platform: string;
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
            background: t.type === 'success' ? 'rgba(16,185,129,0.12)' : t.type === 'error' ? 'rgba(239,68,68,0.12)' : t.type === 'warning' ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)',
            borderColor: t.type === 'success' ? 'rgba(16,185,129,0.3)' : t.type === 'error' ? 'rgba(239,68,68,0.3)' : t.type === 'warning' ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)',
            color: t.type === 'success' ? '#10b981' : t.type === 'error' ? '#ef4444' : t.type === 'warning' ? '#f59e0b' : '#3b82f6'
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

// ============================================================================
// COMMAND PALETTE
// ============================================================================
function CommandPalette({ open, onClose, onSelect, tabs }: { open: boolean; onClose: () => void; onSelect: (tab: Tab) => void; tabs: { id: Tab; label: string; icon: React.ReactNode }[] }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const filtered = tabs.filter(t => t.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <Command className="w-5 h-5 opacity-40" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search admin sections..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-main)' }}
            onKeyDown={e => {
              if (e.key === 'Escape') onClose();
              if (e.key === 'Enter' && filtered.length > 0) { onSelect(filtered[0].id); onClose(); }
            }}
          />
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border opacity-40" style={{ borderColor: 'var(--border-color)' }}>ESC</kbd>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {filtered.map(t => (
            <button
              key={t.id}
              onClick={() => { onSelect(t.id); onClose(); }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition hover:bg-[var(--bg-subtle)]"
              style={{ color: 'var(--text-main)' }}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
          {filtered.length === 0 && <div className="text-center py-6 text-sm opacity-40">No results</div>}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================
function StatCard({ label, value, icon, color, sub }: { label: string; value: number; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div
      className="relative rounded-2xl p-5 border overflow-hidden group transition-all duration-300 hover:scale-[1.02] hover:shadow-lg"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
    >
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: color }} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="text-3xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
            <AnimatedNumber value={value} />
          </p>
          {sub && <p className="text-xs mt-1.5 font-medium" style={{ color }}>{sub}</p>}
        </div>
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: `${color}18`, color }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN ADMIN PAGE
// ============================================================================
export function AdminPage() {
  const { user, dbUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
  const [newbieLinks, setNewbieLinks] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>({ fetchRangeDays: 30, autoDeleteDays: 30 });

  // Forms

  const [sourceForm, setSourceForm] = useState<{ id?: number; handle: string }>({ handle: '' });
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

  const [eventForm, setEventForm] = useState<{ id?: number; title: string; date: string; description: string }>({ title: '', date: '', description: '' });
  const [newbieLinkForm, setNewbieLinkForm] = useState<{ id?: number; title: string; url: string; description: string }>({ title: '', url: '', description: '' });
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);




  // Search & pagination
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectLimit, setSubjectLimit] = useState(20);
  const [majorSearch, setMajorSearch] = useState('');
  const [majorLimit, setMajorLimit] = useState(10);
  const [eventSearch, setEventSearch] = useState('');
  const [eventLimit, setEventLimit] = useState(20);
  const [unassignedSearch, setUnassignedSearch] = useState('');
  const [expandedCourseId, setExpandedCourseId] = useState<number | null>(null);
  const [resourceForm, setResourceForm] = useState<{ id?: number; subjectId?: number; title: string; type: string; url: string; description: string }>({ title: '', type: 'drive', url: '', description: '' });

  // Modals
  const [deleteModal, setDeleteModal] = useState<{ url: string; message: string } | null>(null);

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
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'users', label: 'User Management', icon: <Users className="w-5 h-5" /> },
    { id: 'news_sources', label: 'News Sources', icon: <Newspaper className="w-5 h-5" /> },
    { id: 'majors', label: 'Academic Majors', icon: <GraduationCap className="w-5 h-5" /> },
    { id: 'events', label: 'Calendar Dates', icon: <Calendar className="w-5 h-5" /> },
    { id: 'subjects', label: 'Courses & Resources', icon: <BookOpen className="w-5 h-5" /> },
    { id: 'tutorials', label: 'Tutorials Manager', icon: <HelpCircle className="w-5 h-5" /> },
    { id: 'newbie_links', label: 'Newbie Links', icon: <Link2 className="w-5 h-5" /> },
    { id: 'settings', label: 'Global Settings', icon: <Settings className="w-5 h-5" /> },
  ];

  // ============================================================================
  // API HELPERS
  // ============================================================================
  const getToken = async () => user?.getIdToken() || '';
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
      fetch('/api/newbie/links', opts).then(r => r.ok && r.json()),
      fetch('/api/admin/stats', opts).then(r => r.ok ? r.json() : null),
      fetch('/api/admin/health', opts).then(r => r.ok ? r.json() : null),
    ]).then(([ns, m, e, s, gs, ts, tuts, nl, st, hl]) => {
      if (ns) setNewsSources(ns);
      if (m) setMajors(m);
      if (e) setEvents(e);
      if (s) setSubjects(s);
      if (gs) setGlobalSettings(gs);
      if (ts) setTutorialSections(ts);
      if (tuts) setTutorials(tuts);
      if (nl) setNewbieLinks(nl);
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
    if (user && dbUser?.isAdmin) {
      fetchData();
      fetchUsers();
    }
  }, [user, dbUser]);

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
    let prevSubjects = [...subjects];
    if (targetUrl.includes('/api/admin/subjects/')) {
      const parts = targetUrl.split('/');
      const subjId = Number(parts[parts.length - 1]);
      if (subjId) {
        setSubjects(prev => prev.filter(s => s.id !== subjId));
      }
    }

    setDeleteModal(null);

    try {
      const t = await getToken();
      const res = await fetch(targetUrl, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) { 
        fetchData(); 
        fetchUsers(); 
        toast('success', 'Deleted successfully'); 
      } else {
        setSubjects(prevSubjects); // Rollback
        toast('error', 'Failed to delete'); 
      }
    } catch (e) { 
      setSubjects(prevSubjects); // Rollback
      console.error(e); 
      toast('error', 'Network error'); 
    }
  };


  const handleFetchPosts = async (handle: string, fetchAll: boolean = false) => {
    try {
      const t = await getToken();
      const url = fetchAll ? `/api/admin/news_sources/fetch-all` : `/api/admin/news_sources/${handle}/fetch`;
      const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${t}` } });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.fetchedCount === 0) toast('warning', 'No new posts fetched. Sources may be rate-limited.');
        else toast('success', `Fetched ${data.fetchedCount} recent posts`);
        fetchData();
      } else toast('error', 'Failed to fetch: ' + (data.message || data.error || 'Unknown error'));
    } catch (e) { console.error(e); toast('error', 'Network error'); }
  };

  // ============================================================================
  // ACCESS CHECK
  // ============================================================================
  if (authLoading || (user && dbUser === null)) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p style={{ color: 'var(--text-muted)' }}>جاري التحقق من صلاحيات الدخول...</p>
      </div>
    );
  }

  if (!user || !dbUser?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6" />
        <h1 className="text-3xl font-display font-bold mb-2" style={{ color: 'var(--text-main)' }}>Access Denied</h1>
        <p style={{ color: 'var(--text-muted)' }}>You must be an administrator to view this page.</p>
      </div>
    );
  }

  // ============================================================================
  // CHART COLORS
  // ============================================================================
  const chartColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  // ============================================================================
  // TAB: DASHBOARD
  // ============================================================================
  const renderDashboard = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-display font-bold" style={{ color: 'var(--text-main)' }}>Dashboard Overview</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Real-time platform metrics and system status</p>
        </div>
        <button
          onClick={() => fetchData()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition hover:bg-[var(--bg-subtle)]"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats?.users || 0} icon={<Users className="w-5 h-5" />} color="#3b82f6" sub={`+${stats?.recentUsers7d || 0} this week`} />
        <StatCard label="News Items" value={stats?.news || 0} icon={<Newspaper className="w-5 h-5" />} color="#10b981" sub={`${stats?.newsSources || 0} sources`} />
        <StatCard label="Events" value={stats?.events || 0} icon={<Calendar className="w-5 h-5" />} color="#f59e0b" />
        <StatCard label="Courses" value={stats?.subjects || 0} icon={<BookOpen className="w-5 h-5" />} color="#8b5cf6" sub={`${stats?.majors || 0} majors`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Tutorials" value={stats?.tutorials || 0} icon={<HelpCircle className="w-5 h-5" />} color="#ec4899" />
        <StatCard label="Newbie Links" value={stats?.newbieLinks || 0} icon={<Link2 className="w-5 h-5" />} color="#06b6d4" />
        <StatCard label="New (30d)" value={stats?.recentUsers30d || 0} icon={<TrendingUp className="w-5 h-5" />} color="#84cc16" />
        <StatCard label="Academic Majors" value={stats?.majors || 0} icon={<GraduationCap className="w-5 h-5" />} color="#f97316" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Registrations Chart */}
        <div className="rounded-2xl p-5 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-main)' }}>User Registrations (30 Days)</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats?.usersByDay || []}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} tickFormatter={v => v?.slice(5) || ''} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', fontSize: 12 }} />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#colorUsers)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* News by Source Chart */}
        <div className="rounded-2xl p-5 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h4 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-main)' }}>News Distribution by Source</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.newsBySource || []}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                  paddingAngle={2}
                >
                  {(stats?.newsBySource || []).map((_, i) => (
                    <Cell key={i} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '0.75rem', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {(stats?.newsBySource || []).map((s, i) => (
              <span key={i} className="text-[10px] font-medium px-2 py-0.5 rounded-full border" style={{ borderColor: 'var(--border-color)', color: chartColors[i % chartColors.length] }}>
                @{s.source || 'unknown'}: {s.count}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* System Health */}
      {health && (
        <div className="rounded-2xl p-5 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h4 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Activity className="w-4 h-4 text-emerald-500" /> System Health
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Uptime</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                {Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Memory (Heap)</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>
                {health.memory.heapUsed}MB / {health.memory.heapTotal}MB
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Database</span>
              <span className={`text-sm font-semibold ${health.dbStatus === 'connected' ? 'text-emerald-500' : 'text-red-500'}`}>
                {health.dbStatus === 'connected' ? '● Connected' : '● Error'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Storage</span>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-main)' }}>{health.storageStatus}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // TAB: USERS
  // ============================================================================
  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-display font-bold" style={{ color: 'var(--text-main)' }}>User Management</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>View, search, and manage platform users</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={e => { setUserSearch(e.target.value); fetchUsers(e.target.value); }}
              className="pl-9 pr-3 py-2 rounded-xl text-sm border w-64"
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
          </div>
          <button onClick={() => fetchUsers(userSearch)} className="p-2 rounded-xl border transition hover:bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border-color)' }}>
            <RefreshCw className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                <th className="text-start px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>User</th>
                <th className="text-start px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Major</th>
                <th className="text-start px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Phone</th>
                <th className="text-start px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Role</th>
                <th className="text-start px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Joined</th>
                <th className="text-end px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {adminUsers.map(u => (
                <tr key={u.id} className="transition hover:bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border-color)' }}>
                  <td className="px-4 py-3 text-start">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden shrink-0" style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                        {u.profilePicUrl ? <img src={u.profilePicUrl} className="w-full h-full object-cover" /> : (u.userName?.[0] || '?')}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate max-w-[180px]" style={{ color: 'var(--text-main)' }}>{u.userName || 'Unnamed'}</div>
                        <div className="text-xs truncate max-w-[180px]" style={{ color: 'var(--text-muted)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-start" style={{ color: 'var(--text-muted)' }}>{u.major || '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-start" style={{ color: 'var(--text-muted)' }}>{u.phone || '—'}</td>
                  <td className="px-4 py-3 text-start">
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${u.isAdmin ? 'bg-amber-500/15 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {u.isAdmin ? 'Admin' : 'User'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-start" style={{ color: 'var(--text-muted)' }}>
                    {u.createdAt ? format(new Date(u.createdAt), 'MMM dd, yyyy') : '—'}
                  </td>
                  <td className="px-4 py-3 text-end">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={async () => {
                          const t = await getToken();
                          const res = await fetch(`/api/admin/users/${u.id}/toggle-admin`, { method: 'PUT', headers: { Authorization: `Bearer ${t}` } });
                          if (res.ok) { fetchUsers(userSearch); fetchData(); toast('success', `${u.userName || 'User'} admin status toggled`); }
                          else { const err = await res.json().catch(() => ({})); toast('error', err.error || 'Failed'); }
                        }}
                        className="p-1.5 rounded-lg transition hover:bg-[var(--bg-subtle)]"
                        title={u.isAdmin ? 'Demote to User' : 'Promote to Admin'}
                      >
                        {u.isAdmin ? <UserX className="w-4 h-4 text-amber-500" /> : <UserCheck className="w-4 h-4 text-blue-500" />}
                      </button>
                      <button
                        onClick={() => handleDelete(`/api/admin/users/${u.id}`, u.userName || 'this user')}
                        className="p-1.5 rounded-lg transition hover:bg-red-500/10"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {adminUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // TAB: NEWS SOURCES
  // ============================================================================
  const renderNewsSources = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-display font-bold" style={{ color: 'var(--text-main)' }}>News Sources</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Track handles & RSS feeds to fetch announcements</p>
        </div>
        <button
          onClick={() => handleFetchPosts('', true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
        >
          <RefreshCw className="w-4 h-4" /> Fetch All Now
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Add Source + Settings */}
        <div className="space-y-4">
          <div className="rounded-2xl p-5 border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>Add News Source</h4>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Enter a Twitter handle or RSS Feed URL.</p>
            <input
              type="text"
              placeholder="Handle (e.g. IMAMU_News) or RSS URL"
              value={sourceForm.handle}
              onChange={e => setSourceForm({ ...sourceForm, handle: e.target.value.trim() })}
              className="w-full py-2 px-3 rounded-xl text-sm border"
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
            <button
              onClick={() => handlePost('/api/admin/news_sources', sourceForm, () => setSourceForm({ handle: '' }))}
              className="w-full bg-[var(--color-imamu-blue)] text-white px-4 py-2 rounded-xl font-medium text-sm hover:bg-[var(--color-imamu-blue-light)] transition"
            >
              Add Source
            </button>
          </div>

          <div className="rounded-2xl p-5 border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>Automation Settings</h4>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Fetch Range (Days)</label>
                <input type="number" min="1" value={globalSettings.fetchRangeDays} onChange={e => setGlobalSettings((s: any) => ({ ...s, fetchRangeDays: parseInt(e.target.value) || 30 }))} className="py-2 px-3 rounded-xl text-sm border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Auto-Delete Older Than (Days)</label>
                <input type="number" min="1" value={globalSettings.autoDeleteDays} onChange={e => setGlobalSettings((s: any) => ({ ...s, autoDeleteDays: parseInt(e.target.value) || 30 }))} className="py-2 px-3 rounded-xl text-sm border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="border-t pt-3 space-y-3" style={{ borderColor: 'var(--border-color)' }}>
                <div className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>X / Twitter Credentials (Optional)</div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: 'var(--text-muted)' }}>auth_token</label>
                  <input type="password" placeholder="X session auth_token" value={globalSettings.twitterAuthToken || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, twitterAuthToken: e.target.value }))} className="py-2 px-3 rounded-xl text-xs border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: 'var(--text-muted)' }}>ct0 (CSRF)</label>
                  <input type="password" placeholder="X session ct0 token" value={globalSettings.twitterCt0 || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, twitterCt0: e.target.value }))} className="py-2 px-3 rounded-xl text-xs border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
                </div>
              </div>
              <button
                className="w-full bg-[var(--color-imamu-blue)] text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:bg-[var(--color-imamu-blue-light)] transition"
                onClick={() => handlePostWithMethod('/api/admin/global_settings', 'PUT', globalSettings, () => toast('success', 'Settings saved!'))}
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>

        {/* Sources List */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>Current Sources ({newsSources.length})</h4>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {newsSources.map(s => (
                <div key={s.id} className="p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-4 transition hover:bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-[#1DA1F2]/10 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
                      {s.profilePicUrl ? <img src={s.profilePicUrl} className="w-full h-full object-cover" /> : <Twitter className="w-5 h-5 text-[#1DA1F2]" />}
                    </div>
                    <div>
                      <div className="font-semibold text-lg" style={{ color: 'var(--text-main)' }}>@{s.handle}</div>
                      <div className="text-xs mt-1 flex gap-2 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                        <span className="font-medium px-2 py-0.5 rounded" style={{ background: 'var(--bg-subtle)' }}>{s.newsCount || 0} posts</span>
                        <span style={{ color: 'var(--border-color)' }}>•</span>
                        <span>Last fetched: {s.lastFetched ? new Date(s.lastFetched).toLocaleString() : 'Never'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => handleFetchPosts(s.handle, false)} className="bg-blue-500/10 text-blue-500 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-500/20 transition whitespace-nowrap">Fetch Now</button>
                    <button onClick={() => handleDelete(`/api/admin/news_sources/${s.handle}/posts`, `all posts from @${s.handle}`)} className="bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-500/20 transition whitespace-nowrap">Empty Posts</button>
                    <button onClick={() => handleDelete(`/api/admin/news_sources/${s.id}`, `@${s.handle}`)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition" title="Delete Source">
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
              {newsSources.length === 0 && <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No sources added yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // TAB: MAJORS
  // ============================================================================
  const renderMajors = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-display font-bold" style={{ color: 'var(--text-main)' }}>Academic Majors</h3>
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
                  className="flex-1 bg-[var(--color-imamu-blue)] text-white py-2 rounded-xl font-medium text-sm hover:bg-[var(--color-imamu-blue-light)] transition"
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
            <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {majors.filter(m => m.name?.toLowerCase().includes(majorSearch.toLowerCase())).slice(0, majorLimit).map(m => (
                <div key={m.id} className="py-3 flex items-center justify-between group">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm truncate" style={{ color: 'var(--text-main)' }}>{m.name}</div>
                    {m.pdfUrl && <a href={m.pdfUrl} target="_blank" rel="noreferrer" className="text-[10px] text-[var(--color-imamu-blue)] font-medium hover:underline flex items-center gap-1 mt-1"><LinkIcon className="w-2.5 h-2.5" /> PDF Plan</a>}
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
                      className="px-2 py-1 rounded transition text-xs font-semibold hover:bg-[var(--bg-subtle)]"
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
              <button type="button" onClick={() => setMajorForm(f => ({ ...f, batches: [...f.batches, { name: `Batch ${f.batches.length + 1}`, reqCount: '1' }] }))} className="text-xs text-[var(--color-imamu-blue)] font-medium hover:underline">+ Add Batch</button>
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
                                className="p-2 rounded shadow-sm text-xs cursor-grab active:cursor-grabbing border transition hover:border-[var(--color-imamu-blue)] shrink-0"
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

  // ============================================================================
  // TAB: EVENTS
  // ============================================================================
  const renderEvents = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-display font-bold" style={{ color: 'var(--text-main)' }}>Calendar Dates</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage academic dates, events, subscriptions, and allowances</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4">
          <div className="rounded-2xl p-5 border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>{eventForm.id ? 'Edit Calendar Event' : 'Add Calendar Event'}</h4>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Event Title</label>
                <input type="text" placeholder="e.g. Final Exams Begin" value={eventForm.title} onChange={e => setEventForm(s => ({ ...s, title: e.target.value }))} className="py-2 px-3 rounded-xl text-sm border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Event Date</label>
                <input type="date" value={eventForm.date} onChange={e => setEventForm(s => ({ ...s, date: e.target.value }))} className="py-2 px-3 rounded-xl text-sm border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Description</label>
                <textarea placeholder="Event Description (optional)" value={eventForm.description} onChange={e => setEventForm(s => ({ ...s, description: e.target.value }))} className="py-2 px-3 rounded-xl min-h-[80px] text-sm border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    const url = eventForm.id ? `/api/admin/events/${eventForm.id}` : '/api/admin/events';
                    const method = eventForm.id ? 'PUT' : 'POST';
                    handlePostWithMethod(url, method, eventForm, () => setEventForm({ id: undefined, title: '', date: '', description: '' }));
                  }}
                  className="flex-1 bg-[var(--color-imamu-blue)] text-white py-2 rounded-xl font-medium text-sm hover:bg-[var(--color-imamu-blue-light)] transition"
                >
                  {eventForm.id ? 'Update Event' : 'Add Event'}
                </button>
                {eventForm.id && <button onClick={() => setEventForm({ id: undefined, title: '', date: '', description: '' })} className="px-3 py-2 border rounded-xl text-sm font-medium transition hover:bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>Cancel</button>}
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-4 border space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h4 className="font-semibold text-xs" style={{ color: 'var(--text-main)' }}>Calendar Feed Subscriptions</h4>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Users can sync using ICS format.</p>
            <a href="/api/calendar.ics" download className="flex items-center justify-center gap-2 border font-medium py-1.5 rounded-xl text-xs w-full transition hover:bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
              <Download className="w-3.5 h-3.5" /> Download .ics Feed
            </a>
          </div>

          <div className="rounded-2xl p-4 border space-y-3" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.2)' }}>
            <h4 className="font-semibold text-xs text-emerald-500">Mokafaa Allowance Scheduler</h4>
            <p className="text-[11px] text-emerald-400/80">Generates allowance dates on the 25th of every month for 12 months.</p>
            <button
              onClick={() => handlePost('/api/admin/events/generate-mokafaa', {}, () => { toast('success', 'Generated 12 Mokafaa events!'); fetchData(); })}
              className="flex items-center justify-center gap-2 bg-emerald-600 text-white font-medium py-1.5 rounded-xl text-xs w-full hover:bg-emerald-700 transition"
            >
              <Zap className="w-3.5 h-3.5" /> Generate Mokafaa Dates
            </button>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: 'var(--border-color)' }}>
              <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>Upcoming Events ({events.length})</h4>
              <input type="text" placeholder="Search events..." value={eventSearch} onChange={e => setEventSearch(e.target.value)} className="py-1.5 px-3 rounded-xl text-xs border w-full sm:w-48" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {events.filter(e => e.title?.toLowerCase().includes(eventSearch.toLowerCase()) || e.description?.toLowerCase().includes(eventSearch.toLowerCase())).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, eventLimit).map(e => (
                <div key={e.id} className="py-3.5 px-5 flex items-center justify-between group transition hover:bg-[var(--bg-subtle)]">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="font-medium text-sm truncate" style={{ color: 'var(--text-main)' }}>{e.title}</div>
                    <div className="text-xs mt-1 flex gap-2 flex-wrap" style={{ color: 'var(--text-muted)' }}>
                      <span className="font-semibold text-[var(--color-imamu-blue)]">{format(new Date(e.date), 'MMM dd, yyyy')}</span>
                      {e.description && (<><span style={{ color: 'var(--border-color)' }}>•</span><span className="truncate">{e.description}</span></>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setEventForm(e)} className="px-2 py-1 rounded transition text-xs font-semibold hover:bg-[var(--bg-subtle)]" style={{ color: 'var(--text-muted)' }}>Edit</button>
                    <button onClick={() => handleDelete(`/api/admin/events/${e.id}`, e.title)} className="p-1.5 rounded transition hover:bg-red-500/10"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
              ))}
              {events.length === 0 && <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No events scheduled.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // TAB: SUBJECTS / COURSES
  // ============================================================================
  const renderSubjects = () => (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-display font-bold" style={{ color: 'var(--text-main)' }}>Create & Manage Courses (المقررات والمواد)</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage academic courses, syllabus details, and object storage resources</p>
        </div>

        <button
          onClick={() => {
            setSubjectForm({ 
              id: undefined, code: '', name: '', creditHours: '3', level: '', whatsappLink: '', driveLink: '', description: '', syllabus: '', freeResourcesUrl: '', paidResourcesUrl: '', avatarUrl: '', bannerUrl: '', tags: '' 
            });
            setIsCourseModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold text-xs sm:text-sm rounded-xl transition shadow-sm border border-blue-500/30 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Course</span>
        </button>

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
              <Zap className="w-4 h-4 text-amber-500" />
            </button>
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {subjects.filter(s => s.code?.toLowerCase().includes(subjectSearch.toLowerCase()) || s.name?.toLowerCase().includes(subjectSearch.toLowerCase())).slice(0, subjectLimit).map(s => (
            <div key={s.id} className="py-3.5 px-5 flex items-center justify-between group hover:bg-[var(--bg-subtle)] transition">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="font-mono text-xs px-2.5 py-1 rounded-lg border font-bold shrink-0 bg-blue-500/10 text-blue-500 border-blue-500/20">{s.code}</div>
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
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold transition hover:bg-blue-500/10 text-blue-500 border-blue-500/30"
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
  // TAB: NEWBIE LINKS
  // ============================================================================
  const renderNewbieLinks = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-display font-bold" style={{ color: 'var(--text-main)' }}>Newbie Links</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage orientation links for new students</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div>
          <div className="rounded-2xl p-5 border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>{newbieLinkForm.id ? 'Edit Link' : 'Add New Link'}</h4>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Title</label>
                <input type="text" placeholder="e.g. Student Portal" value={newbieLinkForm.title} onChange={e => setNewbieLinkForm(s => ({ ...s, title: e.target.value }))} className="py-2 px-3 rounded-xl text-sm border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>URL</label>
                <input type="text" placeholder="https://..." value={newbieLinkForm.url} onChange={e => setNewbieLinkForm(s => ({ ...s, url: e.target.value }))} className="py-2 px-3 rounded-xl text-sm border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Description</label>
                <textarea placeholder="Brief description..." value={newbieLinkForm.description} onChange={e => setNewbieLinkForm(s => ({ ...s, description: e.target.value }))} className="py-2 px-3 rounded-xl min-h-[60px] text-sm border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    const url = newbieLinkForm.id ? `/api/admin/newbie/links/${newbieLinkForm.id}` : '/api/admin/newbie/links';
                    const method = newbieLinkForm.id ? 'PUT' : 'POST';
                    handlePostWithMethod(url, method, newbieLinkForm, () => setNewbieLinkForm({ id: undefined, title: '', url: '', description: '' }));
                  }}
                  className="flex-1 bg-[var(--color-imamu-blue)] text-white py-2 rounded-xl font-medium text-sm hover:bg-[var(--color-imamu-blue-light)] transition"
                >
                  {newbieLinkForm.id ? 'Update Link' : 'Add Link'}
                </button>
                {newbieLinkForm.id && <button onClick={() => setNewbieLinkForm({ id: undefined, title: '', url: '', description: '' })} className="px-3 py-2 border rounded-xl text-sm font-medium transition hover:bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>Cancel</button>}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>Current Links ({newbieLinks.length})</h4>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
              {newbieLinks.map((link: any) => (
                <div key={link.id} className="py-3.5 px-5 flex items-center justify-between group transition hover:bg-[var(--bg-subtle)]">
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="font-medium text-sm" style={{ color: 'var(--text-main)' }}>{link.title}</div>
                    <a href={link.url} target="_blank" rel="noreferrer" className="text-xs text-[var(--color-imamu-blue)] hover:underline flex items-center gap-1 mt-0.5">
                      <ExternalLink className="w-3 h-3" /> {link.url?.length > 50 ? link.url.slice(0, 50) + '...' : link.url}
                    </a>
                    {link.description && <p className="text-xs mt-1 truncate" style={{ color: 'var(--text-muted)' }}>{link.description}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => setNewbieLinkForm({ id: link.id, title: link.title || '', url: link.url || '', description: link.description || '' })} className="px-2 py-1 rounded transition text-xs font-semibold hover:bg-[var(--bg-subtle)]" style={{ color: 'var(--text-muted)' }}>Edit</button>
                    <button onClick={() => handleDelete(`/api/admin/newbie/links/${link.id}`, link.title)} className="p-1.5 rounded transition hover:bg-red-500/10"><Trash2 className="w-4 h-4 text-red-400" /></button>
                  </div>
                </div>
              ))}
              {newbieLinks.length === 0 && <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No links added yet.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // TAB: SETTINGS
  // ============================================================================
  const renderSettings = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-display font-bold" style={{ color: 'var(--text-main)' }}>Global Settings</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Configure database backups, schedules, and mailing setups</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4">
          <div className="rounded-2xl p-5 border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>Database Utilities</h4>
            <div className="flex flex-col gap-3">
              <label className="bg-[var(--color-imamu-blue)] text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer text-sm hover:bg-[var(--color-imamu-blue-light)] transition w-full">
                <Upload className="w-4 h-4" /> Import Database
                <input type="file" accept=".json,.zip" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!window.confirm('WARNING: This will overwrite the current database. Are you sure?')) return;
                  try {
                    const t = await getToken();
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await fetch('/api/admin/import-db', { method: 'POST', headers: { Authorization: `Bearer ${t}` }, body: formData });
                    if (!res.ok) throw new Error('Failed');
                    toast('success', 'Database imported! Reloading...');
                    setTimeout(() => window.location.reload(), 1000);
                  } catch { toast('error', 'Error importing database'); }
                  e.target.value = '';
                }} />
              </label>
              <button
                onClick={async () => {
                  try {
                    const t = await getToken();
                    const res = await fetch('/api/admin/export-db', { headers: { Authorization: `Bearer ${t}` } });
                    if (!res.ok) throw new Error('Failed');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `imamu_backup_${new Date().toISOString().split('T')[0]}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    toast('success', 'Database exported successfully');
                  } catch { toast('error', 'Error exporting database'); }
                }}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 text-sm hover:bg-emerald-700 transition w-full"
              >
                <Download className="w-4 h-4" /> Export Database
              </button>
            </div>
          </div>

          <div className="rounded-2xl p-5 border space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>Semester Countdowns</h4>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Semester Start Date</label>
                <input type="date" value={globalSettings.semesterStartDate || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, semesterStartDate: e.target.value }))} className="py-2 px-3 rounded-xl text-sm border w-full" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Semester End Date</label>
                <input type="date" value={globalSettings.semesterEndDate || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, semesterEndDate: e.target.value }))} className="py-2 px-3 rounded-xl text-sm border w-full" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl p-5 border space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>External API Settings</h4>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>API Endpoint Token</label>
              <input type="text" value={globalSettings.apiToken || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, apiToken: e.target.value }))} placeholder="super_secret_token_123" className="py-2 px-3 rounded-xl text-sm border w-full" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl p-6 border space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div>
              <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-main)' }}>IMAP Configuration (Direct Email Auth)</h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Enable students to log in directly via university credentials.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b pb-5" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>IMAP Host</label>
                <input type="text" value={globalSettings.imapHost || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, imapHost: e.target.value }))} placeholder="outlook.office365.com" className="py-2 px-3 rounded-xl text-sm border w-full" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>IMAP Port</label>
                <input type="number" value={globalSettings.imapPort || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, imapPort: parseInt(e.target.value) || undefined }))} placeholder="993" className="py-2 px-3 rounded-xl text-sm border w-full" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col justify-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: 'var(--text-muted)' }}>
                  <input type="checkbox" checked={globalSettings.imapSecure !== false} onChange={e => setGlobalSettings((s: any) => ({ ...s, imapSecure: e.target.checked }))} className="rounded" />
                  <span>Use Secure TLS</span>
                </label>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-main)' }}>SMTP Configuration (Verification Mails)</h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Required for email verifications and passcodes.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>SMTP Host</label>
                <input type="text" value={globalSettings.smtpHost || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, smtpHost: e.target.value }))} placeholder="smtp.gmail.com" className="py-2 px-3 rounded-xl text-sm border w-full" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>SMTP Port</label>
                <input type="number" value={globalSettings.smtpPort || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, smtpPort: parseInt(e.target.value) || undefined }))} placeholder="587" className="py-2 px-3 rounded-xl text-sm border w-full" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>SMTP Username</label>
                <input type="text" value={globalSettings.smtpUser || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, smtpUser: e.target.value }))} placeholder="example@gmail.com" className="py-2 px-3 rounded-xl text-sm border w-full" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>SMTP Password</label>
                <input type="password" value={globalSettings.smtpPass || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, smtpPass: e.target.value }))} placeholder="App Password" className="py-2 px-3 rounded-xl text-sm border w-full" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end" style={{ borderColor: 'var(--border-color)' }}>
              <button
                className="bg-[var(--color-imamu-blue)] text-white px-5 py-2 rounded-xl font-medium text-sm hover:bg-[var(--color-imamu-blue-light)] transition"
                onClick={() => handlePostWithMethod('/api/admin/global_settings', 'PUT', globalSettings, () => toast('success', 'Settings saved!'))}
              >
                Save All Settings
              </button>
            </div>
          </div>

          {/* System Health Panel */}
          {health && (
            <div className="rounded-2xl p-5 border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <h4 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <Server className="w-4 h-4 text-blue-500" /> System Information
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Node Version</span>
                  <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-main)' }}>{health.nodeVersion}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Platform</span>
                  <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-main)' }}>{health.platform}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>RSS Memory</span>
                  <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-main)' }}>{health.memory.rss} MB</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ============================================================================
  // TAB SWITCHER
  // ============================================================================
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'users': return renderUsers();
      case 'news_sources': return renderNewsSources();
      case 'majors': return renderMajors();
      case 'events': return renderEvents();
      case 'subjects': return renderSubjects();
      case 'tutorials': return <TutorialsTab user={user} sections={tutorialSections} tutorials={tutorials} onRefresh={fetchData} />;
      case 'newbie_links': return renderNewbieLinks();
      case 'settings': return renderSettings();
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
          <h1 className="text-3xl sm:text-4xl font-display font-bold inline-flex items-center gap-3" style={{ color: 'var(--text-main)' }}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            Admin Console
          </h1>
          <p className="mt-1" style={{ color: 'var(--text-muted)' }}>Manage and monitor your platform</p>
        </div>
        <button
          onClick={() => setCmdOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition hover:bg-[var(--bg-subtle)]"
          style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
        >
          <Command className="w-4 h-4" />
          <span className="hidden sm:inline">Quick Navigate</span>
          <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded border ml-1" style={{ borderColor: 'var(--border-color)' }}>⌘K</kbd>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-10">
        {/* Sidebar */}
        <div className="w-full md:w-56 shrink-0">
          <nav className="flex flex-col space-y-0.5">
            {tabDefs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-3 w-full px-3.5 py-2.5 text-left rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === t.id
                    ? 'bg-[var(--color-imamu-blue)] text-white shadow-md shadow-blue-500/20'
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
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} onSelect={setActiveTab} tabs={tabDefs} />

      {/* Delete Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-main)' }}>Delete Confirmation</h3>
              <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{deleteModal.message}</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteModal(null)} className="flex-1 py-2.5 rounded-xl font-medium transition border hover:bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>Cancel</button>
                <button onClick={confirmDelete} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700 transition">Delete</button>
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
