'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, ThumbsUp, ThumbsDown, AlertTriangle, 
  CheckCircle2, Clock, Trash2, Search, HelpCircle, 
  Newspaper, Folder, Cpu, Calendar, ExternalLink, RefreshCw
} from 'lucide-react';
import { CustomSelect } from '../../components/ui/CustomSelect';

interface FeedbackItem {
  id: string;
  rawId: any;
  targetType: 'tutorial' | 'news' | 'resource' | 'tool' | 'event' | 'general' | string;
  targetId?: string;
  targetTitle?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  feedbackType: 'helpful' | 'unhelpful' | 'bug_report' | 'broken_link' | 'wrong_info' | 'suggestion' | string;
  comment?: string;
  status: 'pending' | 'reviewed' | 'resolved' | string;
  createdAt: string;
}

interface Stats {
  totalCount: number;
  helpfulCount: number;
  unhelpfulCount: number;
  pendingCount: number;
  resolvedCount: number;
  byTargetType: {
    tutorial: number;
    news: number;
    resource: number;
    tool: number;
    event: number;
    general: number;
  };
}



export default function AdminFeedbackTab({ getToken }: { getToken: () => Promise<string> }) {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/feedback', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.feedback || []);
        setStats(data.stats || null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/feedback/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setFeedback(prev => prev.map(item => item.id === id ? { ...item, status: newStatus } : item));
        if (stats) {
          const oldStatus = feedback.find(f => f.id === id)?.status;
          let pending = stats.pendingCount;
          let resolved = stats.resolvedCount;
          if (oldStatus === 'pending' && newStatus === 'resolved') {
            pending = Math.max(0, pending - 1);
            resolved += 1;
          } else if (oldStatus === 'resolved' && newStatus === 'pending') {
            resolved = Math.max(0, resolved - 1);
            pending += 1;
          }
          setStats({ ...stats, pendingCount: pending, resolvedCount: resolved });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا البلاغ / التقييم؟')) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setFeedback(prev => prev.filter(f => f.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredFeedback = feedback.filter(item => {
    const matchSearch = !search ||
      item.targetTitle?.toLowerCase().includes(search.toLowerCase()) ||
      item.comment?.toLowerCase().includes(search.toLowerCase()) ||
      item.userName?.toLowerCase().includes(search.toLowerCase()) ||
      item.userEmail?.toLowerCase().includes(search.toLowerCase());

    const matchCategory = categoryFilter === 'ALL' || item.targetType === categoryFilter;
    const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
    const matchType = typeFilter === 'ALL' || 
      (typeFilter === 'helpful' && item.feedbackType === 'helpful') ||
      (typeFilter === 'issues' && item.feedbackType !== 'helpful');

    return matchSearch && matchCategory && matchStatus && matchType;
  });

  const getCategoryBadge = (targetType: string) => {
    switch (targetType) {
      case 'tutorial':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-[var(--color-imamu-accent)] border border-amber-500/20">
            <HelpCircle className="w-3.5 h-3.5" /> الدليلة (الشروحات)
          </span>
        );
      case 'news':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-500 border border-sky-500/20">
            <Newspaper className="w-3.5 h-3.5" /> الأخبار والمقالات
          </span>
        );
      case 'resource':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <Folder className="w-3.5 h-3.5" /> المصادر والمراجع
          </span>
        );
      case 'tool':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Cpu className="w-3.5 h-3.5" /> الأدوات والحاسبة
          </span>
        );
      case 'event':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Calendar className="w-3.5 h-3.5" /> التقويم والمواعيد
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-stone-500/10 text-stone-400 border border-stone-500/20">
            <MessageSquare className="w-3.5 h-3.5" /> عام / التطبيق
          </span>
        );
    }
  };

  const getFeedbackTypeBadge = (feedbackType: string) => {
    switch (feedbackType) {
      case 'helpful':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <ThumbsUp className="w-3.5 h-3.5" /> تقييم إيجابي (مفيد)
          </span>
        );
      case 'unhelpful':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <ThumbsDown className="w-3.5 h-3.5" /> غير مفيد / ملاحظة
          </span>
        );
      case 'bug_report':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> بلاغ مشكلة / خطأ
          </span>
        );
      case 'broken_link':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ExternalLink className="w-3.5 h-3.5 text-amber-500" /> رابط عاطل / مفقود
          </span>
        );
      case 'wrong_info':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> معلومات غير دقيقة
          </span>
        );
      case 'suggestion':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <MessageSquare className="w-3.5 h-3.5" /> اقتراح تحسين
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-700">
            <MessageSquare className="w-3.5 h-3.5" /> ملاحظة
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-right animate-fadeIn" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-main)' }}>
            مركز البلاغات والتقييمات الشامل
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            جميع تقييمات الشروحات (الدليلة)، بلاغات المشاكل، الروابط العاطلة، والاقتراحات من كافة أجزاء المنصة.
          </p>
        </div>
        <button
          onClick={fetchFeedback}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[var(--bg-card)] border border-[var(--border-color)] hover:bg-[var(--bg-subtle)] transition shadow-2xs cursor-pointer shrink-0"
          style={{ color: 'var(--text-main)' }}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>تحديث القائمة</span>
        </button>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border space-y-2" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">إجمالي التقييمات والبلاغات</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
              <MessageSquare className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif" style={{ color: 'var(--text-main)' }}>{stats?.totalCount || 0}</p>
          <p className="text-xs text-slate-400">من كافة أجزاء الموقع</p>
        </div>

        <div className="p-5 rounded-2xl border space-y-2" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400">التقييمات الإيجابية (إعجابات)</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <ThumbsUp className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-emerald-500">{stats?.helpfulCount || 0}</p>
          <p className="text-xs text-emerald-400/80">شروحات ومحتوى مفيد</p>
        </div>

        <div className="p-5 rounded-2xl border space-y-2" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400">بلاغات وملاحظات عاجلة</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-amber-400">{stats?.unhelpfulCount || 0}</p>
          <p className="text-xs text-amber-400/80">روابط عاطلة أو مشاكل</p>
        </div>

        <div className="p-5 rounded-2xl border space-y-2" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-purple-400">البلاغات المعلقة قيد المراجعة</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-serif text-purple-400">{stats?.pendingCount || 0}</p>
          <p className="text-xs text-purple-400/80">تتطلب اتخاذ إجراء</p>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="rounded-2xl p-4 border flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="ابحث بالنص، العنوان، أو اسم الطالب..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full py-2 pr-9 pl-4 rounded-xl text-xs border outline-none font-medium"
            style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          />
          <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap shrink-0 z-30">
          {/* Target Category */}
          <CustomSelect
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { value: 'ALL', label: `جميع الأقسام (${stats?.totalCount || 0})` },
              { value: 'tutorial', label: `الدليلة والشروحات (${stats?.byTargetType?.tutorial || 0})` },
              { value: 'news', label: `الأخبار والمقالات (${stats?.byTargetType?.news || 0})` },
              { value: 'resource', label: `المصادر والمراجع (${stats?.byTargetType?.resource || 0})` },
              { value: 'tool', label: `الأدوات والحاسبة (${stats?.byTargetType?.tool || 0})` },
              { value: 'event', label: `التقويم والمواعيد (${stats?.byTargetType?.event || 0})` },
              { value: 'general', label: `عام / التطبيق (${stats?.byTargetType?.general || 0})` },
            ]}
          />

          {/* Feedback Type */}
          <CustomSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'ALL', label: 'جميع أنواع التقييمات' },
              { value: 'issues', label: 'البلاغات والملاحظات فقط' },
              { value: 'helpful', label: 'الإعجابات والتقييمات الإيجابية' },
            ]}
          />

          {/* Resolution Status */}
          <CustomSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'ALL', label: 'جميع الحالات' },
              { value: 'pending', label: 'معلق' },
              { value: 'resolved', label: 'تم الحل' },
              { value: 'reviewed', label: 'تمت المراجعة' },
            ]}
          />
        </div>
      </div>

      {/* Feedback Items List */}
      <div className="space-y-4">
        {filteredFeedback.map(item => (
          <div
            key={item.id}
            className="rounded-3xl p-5 sm:p-6 border space-y-4 transition hover:shadow-lg shadow-sm text-right"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            dir="rtl"
          >
            {/* Top Bar: Target Category, Type Badges, Title & Created Time */}
            <div className="border-b pb-3.5 space-y-2.5" style={{ borderColor: 'var(--border-color)' }}>
              {/* Row 1: Badges & Timestamp */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  {getCategoryBadge(item.targetType)}
                  {getFeedbackTypeBadge(item.feedbackType)}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-zinc-500 font-mono shrink-0" dir="ltr">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('ar-SA', { hour: '2-digit', minute: '2-digit', year: 'numeric', month: 'short', day: 'numeric' }) : ''}</span>
                </div>
              </div>

              {/* Row 2: Target Item Title */}
              {item.targetTitle && (
                <div className="flex items-center gap-2 pt-0.5 text-base sm:text-lg font-bold" style={{ color: 'var(--text-main)' }}>
                  <span className="w-1.5 h-4 rounded-full bg-[var(--color-imamu-accent)] shrink-0" />
                  <span className="truncate">{item.targetTitle}</span>
                </div>
              )}
            </div>

            {/* Middle Content: Message / Comment Bubble */}
            {item.comment ? (
              <div 
                className="p-4 rounded-2xl border text-xs sm:text-sm font-medium leading-relaxed" 
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              >
                <div className="flex items-start gap-2.5">
                  <MessageSquare className="w-4 h-4 text-[var(--color-imamu-accent)] shrink-0 mt-0.5" />
                  <p className="whitespace-pre-line flex-1 min-w-0" dir="auto">
                    {item.comment}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">بدون تفاصيل إضافية</div>
            )}

            {/* Sender & Status Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
              {/* User Avatar & Info */}
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 font-bold flex items-center justify-center border border-slate-200 dark:border-zinc-700 text-xs shrink-0">
                  {item.userName ? item.userName.charAt(0).toUpperCase() : 'ط'}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold" style={{ color: 'var(--text-main)' }}>
                    {item.userName || 'طالب (زائر)'}
                  </span>
                  {item.userEmail && (
                    <span className="text-[11px] text-slate-400 font-mono dir-ltr inline-block" dir="ltr">
                      ({item.userEmail})
                    </span>
                  )}
                </div>
              </div>

              {/* Status Indicator Badge */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-slate-400 dark:text-zinc-500 font-bold text-xs">الحالة:</span>
                {item.status === 'resolved' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 font-bold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> تم الحل
                  </span>
                ) : item.status === 'reviewed' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-900/50 font-bold text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" /> تمت المراجعة
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 font-bold text-xs">
                    <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" /> معلق قيد المعالجة
                  </span>
                )}
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--border-color)' }}>
              {item.status !== 'resolved' ? (
                <button
                  onClick={() => handleUpdateStatus(item.id, 'resolved')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> تحديد كـ "تم الحل"
                </button>
              ) : (
                <button
                  onClick={() => handleUpdateStatus(item.id, 'pending')}
                  className="px-4 py-2 rounded-xl border border-amber-500/30 text-amber-500 hover:bg-amber-500/10 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Clock className="w-3.5 h-3.5" /> إعادة قيد المعالجة
                </button>
              )}

              <button
                onClick={() => handleDelete(item.id)}
                className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition cursor-pointer active:scale-95"
                title="حذف البلاغ"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredFeedback.length === 0 && !loading && (
          <div className="py-20 text-center rounded-2xl border border-dashed text-xs text-slate-400" style={{ borderColor: 'var(--border-color)' }}>
            لا توجد بلاغات أو تقييمات مطابقة لخيارات الفلترة الحالية.
          </div>
        )}

        {loading && (
          <div className="py-20 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-[var(--color-imamu-accent)]" /> جاري تحميل البلاغات والتقييمات...
          </div>
        )}
      </div>
    </div>
  );
}
