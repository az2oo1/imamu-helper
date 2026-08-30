'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { 
  ShieldAlert, Activity, Search, RefreshCw, Trash2, Download, 
  CheckCircle2, AlertTriangle, AlertCircle, Info, Lock, Server, 
  User, Code, Filter, ChevronRight, X 
} from 'lucide-react';

interface LogEntry {
  id: number;
  level: 'info' | 'warn' | 'error' | 'auth' | 'admin';
  category: string;
  action: string;
  message: string;
  userId?: string | null;
  userEmail?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: string | null;
  createdAt: string;
}

interface LogStats {
  total: number;
  errors: number;
  auth: number;
  admin: number;
  sync: number;
}

export function AdminLogsPage() {
  const { user, dbUser, loading: authLoading } = useAuth();
  const isAdmin = !!(dbUser?.isAdmin || dbUser?.role === 'ADMIN');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats>({ total: 0, errors: 0, auth: 0, admin: 0, sync: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedLevel !== 'all') params.append('level', selectedLevel);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      if (search.trim()) params.append('search', search.trim());
      params.append('limit', '100');

      const token = user ? await user.getIdToken() : (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const [logsRes, statsRes] = await Promise.all([
        fetch(`/api/admin/logs?${params.toString()}`, { headers }),
        fetch('/api/admin/logs/stats', { headers })
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(data.logs || []);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (e) {
      console.error('Failed to fetch logs', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user && isAdmin) {
      fetchLogs();
    }
  }, [selectedLevel, selectedCategory, authLoading, user, dbUser, isAdmin]);

  useEffect(() => {
    if (!autoRefresh || authLoading || !user || !isAdmin) return;
    const interval = setInterval(() => {
      fetchLogs();
    }, 10000); // Live refresh every 10s
    return () => clearInterval(interval);
  }, [autoRefresh, selectedLevel, selectedCategory, search, authLoading, user, dbUser]);

  const handleClearLogs = async () => {
    if (!confirm('هل أنت تأكد من رغبتك في مسح كافة سجلات النظام؟')) return;
    try {
      const token = user ? await user.getIdToken() : (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/admin/logs/clear', { method: 'DELETE', headers });
      if (res.ok) {
        fetchLogs();
      }
    } catch (e) {
      console.error('Failed to clear logs', e);
    }
  };

  const handleExportLogs = () => {
    const jsonStr = JSON.stringify(logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `imamu_system_logs_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case 'error':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50">
            <AlertCircle className="w-3.5 h-3.5" /> ERROR
          </span>
        );
      case 'warn':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
            <AlertTriangle className="w-3.5 h-3.5" /> WARN
          </span>
        );
      case 'auth':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50">
            <Lock className="w-3.5 h-3.5" /> AUTH
          </span>
        );
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
            <ShieldAlert className="w-3.5 h-3.5" /> ADMIN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
            <Info className="w-3.5 h-3.5" /> INFO
          </span>
        );
    }
  };

  if (authLoading || (user && dbUser === null)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center text-center p-4">
        <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-600 dark:text-zinc-400 text-sm font-medium">جاري التحقق من صلاحيات الدخول...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 flex flex-col items-center justify-center text-center p-4">
        <ShieldAlert className="w-20 h-20 text-red-500 mb-6" />
        <h1 className="text-3xl font-display font-bold mb-2 text-slate-900 dark:text-white">Access Denied</h1>
        <p className="text-slate-600 dark:text-zinc-400 text-sm">You must be an administrator to view this page.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 p-4 sm:p-8 text-right" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-1">
              <Activity className="w-4 h-4 animate-pulse text-emerald-500" /> مركز الرقابة والتدقيق الأمني
            </div>
            <h1 className="text-3xl font-display font-extrabold text-slate-900 dark:text-white">
              سجلات أحداث النظام (System Logs)
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">
              متابعة أنشطة المستخدمين، محاولات الدخول، مزامنة قاعدة البيانات، والأحداث الأمنية لحظة بلحظة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition ${
                autoRefresh 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' 
                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
              {autoRefresh ? 'تحديث تلقائي مفعل' : 'التحديث التلقائي متوقف'}
            </button>

            <button
              onClick={handleExportLogs}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-4 h-4 text-blue-500" /> تصدير السجلات (JSON)
            </button>

            <button
              onClick={handleClearLogs}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 transition flex items-center gap-1.5 shadow-2xs"
            >
              <Trash2 className="w-4 h-4" /> تفريغ السجلات
            </button>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">إجمالي الأحداث المسجلة</span>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
              {stats.total.toLocaleString()}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" /> أحداث المصادقة (Auth)
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-600 dark:text-purple-400 mt-2">
              {stats.auth.toLocaleString()}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <Server className="w-3.5 h-3.5" /> عمليات المزامنة
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">
              {stats.sync.toLocaleString()}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> أحداث الإدارة
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
              {stats.admin.toLocaleString()}
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> الأخطاء والتحذيرات
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-red-600 dark:text-red-400 mt-2">
              {stats.errors.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute right-3.5 top-3.5" />
              <input
                type="text"
                placeholder="ابحث برمز الإجراء، البريد الإلكتروني، أو نص الرسالة..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && fetchLogs()}
                className="w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:border-blue-500 transition"
              />
            </div>

            {/* Level Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 ml-2">المستوى:</span>
              {[
                { id: 'all', label: 'الكل' },
                { id: 'info', label: 'معلومات (INFO)' },
                { id: 'auth', label: 'مصادقة (AUTH)' },
                { id: 'admin', label: 'إدارة (ADMIN)' },
                { id: 'warn', label: 'تحذير (WARN)' },
                { id: 'error', label: 'خطأ (ERROR)' },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setSelectedLevel(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    selectedLevel === f.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

          </div>
        </div>

        {/* Log Entries Table */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/80 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs sm:text-sm">
              <thead className="bg-slate-50 dark:bg-zinc-950/80 border-b border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">التاريخ والوقت</th>
                  <th className="py-3.5 px-4">المستوى</th>
                  <th className="py-3.5 px-4">الفئة (Category)</th>
                  <th className="py-3.5 px-4">الإجراء (Action)</th>
                  <th className="py-3.5 px-4">الوصف والتفاصيل</th>
                  <th className="py-3.5 px-4">المستخدم / IP</th>
                  <th className="py-3.5 px-4 text-center">التفاصيل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 font-medium">
                {logs.map(log => (
                  <tr 
                    key={log.id} 
                    className="hover:bg-blue-50/30 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-zinc-400 text-xs font-mono" dir="ltr">
                      {new Date(log.createdAt).toLocaleString('ar-SA')}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getLevelBadge(log.level)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-bold text-slate-700 dark:text-zinc-300">
                      {log.category}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 text-xs" dir="ltr">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 dark:text-zinc-200 max-w-md truncate" dir="auto">
                      {log.message}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-zinc-400 text-xs">
                      {log.userEmail ? (
                        <span className="font-bold text-slate-700 dark:text-zinc-300">{log.userEmail}</span>
                      ) : (
                        <span className="italic text-slate-400 dark:text-zinc-600">{log.ipAddress || 'نظام آلي'}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 dark:bg-zinc-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 text-slate-700 dark:text-zinc-300 hover:text-blue-600 transition"
                      >
                        عرض
                      </button>
                    </td>
                  </tr>
                ))}

                {logs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-zinc-500 text-sm">
                      {loading ? 'جاري تحميل سجلات الأحداث...' : 'لا توجد سجلات مطابقة للفلاتر المحددة.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Log Details Modal Drawer */}
        <AnimatePresence>
          {selectedLog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl text-right overflow-hidden flex flex-col max-h-[85vh]"
              >
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-zinc-800 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    {getLevelBadge(selectedLog.level)}
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white font-mono">{selectedLog.action}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedLog(null)}
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 hover:text-slate-600 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto pr-1 flex-1 text-xs sm:text-sm">
                  <div>
                    <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 block mb-1">الرسالة</span>
                    <p className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white font-medium" dir="auto">
                      {selectedLog.message}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl">
                      <span className="text-slate-400 dark:text-zinc-500 font-bold block mb-1">وقت الحدث</span>
                      <span className="font-mono text-slate-800 dark:text-zinc-200">{new Date(selectedLog.createdAt).toLocaleString('ar-SA')}</span>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl">
                      <span className="text-slate-400 dark:text-zinc-500 font-bold block mb-1">عنوان IP</span>
                      <span className="font-mono text-slate-800 dark:text-zinc-200">{selectedLog.ipAddress || 'غير مسجل'}</span>
                    </div>
                  </div>

                  {selectedLog.userEmail && (
                    <div className="p-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs">
                      <span className="text-slate-400 dark:text-zinc-500 font-bold block mb-1">المستخدم المرتبط</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">{selectedLog.userEmail}</span>
                    </div>
                  )}

                  {selectedLog.metadata && (
                    <div>
                      <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 block mb-1">حمولة البيانات الإضافية (Metadata JSON)</span>
                      <pre className="p-3.5 bg-zinc-950 text-emerald-400 border border-zinc-800 rounded-xl text-xs font-mono overflow-x-auto dir-ltr text-left">
                        {(() => {
                          try {
                            return JSON.stringify(JSON.parse(selectedLog.metadata), null, 2);
                          } catch (e) {
                            return selectedLog.metadata;
                          }
                        })()}
                      </pre>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
