'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../src/lib/AuthContext';
import { 
  Shield, Loader2, Lock, Calendar as CalendarIcon, Plus, Trash2, 
  Clock, MapPin, AlertCircle, CheckCircle2, Info, X, ExternalLink
} from 'lucide-react';
import { EntityDashboardHeader } from '../../../../../src/components/EntityDashboardHeader';
import { formatDate } from '../../../../../src/lib/date-utils';

export const dynamic = 'force-dynamic';

export default function AccountDashboardEventsPage() {
  const params = useParams();
  const router = useRouter();
  const handleParam = params?.handle as string;

  const { user, dbUser, loading: authLoading } = useAuth();
  const [account, setAccount] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add Event Form Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('10:00');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (handleParam) {
      fetchAccountAndEvents();
    }
  }, [handleParam]);

  const fetchAccountAndEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('imamu_token') || '';
      const cleanHandle = encodeURIComponent(handleParam);
      
      const [accRes, eventsRes] = await Promise.all([
        fetch(`/api/authenticated-accounts/${cleanHandle}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }),
        fetch(`/api/authenticated-accounts/${cleanHandle}/events`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })
      ]);

      if (accRes.ok) {
        const data = await accRes.json();
        setAccount(data);
      } else {
        const errData = await accRes.json().catch(() => ({}));
        setError(errData.error || 'تعذر العثور على حساب الجهة المطلوب');
      }

      if (eventsRes.ok) {
        const evData = await eventsRes.json();
        setEvents(Array.isArray(evData) ? evData : []);
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) {
      showToast('error', 'يرجى كتابة عنوان وتاريخ الفعالية');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = user ? await user.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const dateTime = time ? `${date}T${time}:00` : date;
      const cleanHandle = encodeURIComponent(handleParam);

      const res = await fetch(`/api/authenticated-accounts/${cleanHandle}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          title: title.trim(),
          date: dateTime,
          description: description.trim(),
          location: location.trim()
        })
      });

      if (res.ok) {
        const created = await res.json();
        setEvents(prev => [created, ...prev]);
        showToast('success', 'تمت إضافة الفعالية ونشرها في التقويم بنجاح');
        setIsAddModalOpen(false);
        setTitle('');
        setDescription('');
        setLocation('');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('error', err.error || 'فشل حفظ الفعالية');
      }
    } catch (e: any) {
      showToast('error', e.message || 'حدث خطأ أثناء الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = (eventId: number) => {
    setConfirmModal({
      title: 'حذف الفعالية',
      message: 'هل أنت متأكد من حذف هذه الفعالية من التقويم؟ لا يمكن التراجع عن هذا الإجراء.',
      onConfirm: async () => {
        try {
          const token = user ? await user.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
          const cleanHandle = encodeURIComponent(handleParam);
          const res = await fetch(`/api/authenticated-accounts/${cleanHandle}/events/${eventId}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.ok) {
            setEvents(prev => prev.filter(e => e.id !== eventId));
            showToast('success', 'تم حذف الفعالية بنجاح');
          } else {
            showToast('error', 'فشل حذف الفعالية');
          }
        } catch (e: any) {
          showToast('error', e.message || 'حدث خطأ في حذف الفعالية');
        }
      }
    });
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--color-imamu-brown)] animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">جاري تحميل الفعاليات...</span>
        </div>
      </main>
    );
  }

  if (error || !account) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8 text-right" dir="rtl">
        <div className="text-center max-w-md bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">حساب الجهة غير موجود</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">{error || 'تعذر العثور على هذا الحساب.'}</p>
          <button
            onClick={() => router.push('/news')}
            className="px-6 py-2.5 bg-[var(--color-imamu-brown)] text-white font-bold text-xs rounded-xl hover:bg-[var(--color-imamu-brown-dark)] transition cursor-pointer"
          >
            العودة للأخبار
          </button>
        </div>
      </main>
    );
  }

  const isManager = !!(
    account.isManager ||
    dbUser?.isAdmin ||
    dbUser?.role === 'ADMIN' ||
    (user?.uid && Array.isArray(account.assignedUsers) && account.assignedUsers.includes(user.uid))
  );

  if (!isManager) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8 text-right" dir="rtl">
        <div className="text-center max-w-md bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">غير مصرح بالوصول</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            أنت لا تملك صلاحية إدارة الفعاليات لحساب هذه الجهة (@{account.handle}).
          </p>
          <button
            onClick={() => router.push(`/@/${encodeURIComponent(account.handle.replace(/^@/, ''))}`)}
            className="px-6 py-2.5 bg-neutral-800 text-neutral-200 font-bold text-xs rounded-xl hover:bg-neutral-700 transition cursor-pointer border border-neutral-700"
          >
            العودة لصفحة الجهة
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white pb-20 selection:bg-[var(--color-imamu-brown)] selection:text-white" dir="rtl">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-none">
          <div className={`px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl backdrop-blur-xl border flex items-center gap-2.5 ${
            toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
              : toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-500/40 text-rose-300'
              : 'bg-neutral-900/90 border-neutral-700 text-neutral-200'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toast.type === 'info' && <Info className="w-4 h-4 text-neutral-400 shrink-0" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        <EntityDashboardHeader
          account={account}
          activePage="events"
          publishedCount={account.articles?.length || 0}
        />

        {/* Content Header & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 p-6 rounded-3xl">
          <div className="space-y-1">
            <h2 className="text-xl font-serif font-extrabold text-white flex items-center gap-2.5">
              <CalendarIcon className="w-5 h-5 text-emerald-500" />
              <span>فعاليات ومواعيد الجهة ({events.length})</span>
            </h2>
            <p className="text-xs text-neutral-400">
              جميع الفعاليات المضافة هنا تظهر تلقائياً للطلاب في تقويم فعاليات الجهات بالصفحة الرئيسية للتقويم.
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة فعالية جديدة</span>
          </button>
        </div>

        {/* Events Grid / List */}
        {events.length === 0 ? (
          <div className="bg-neutral-900/50 border border-dashed border-neutral-800 rounded-3xl p-12 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-500 flex items-center justify-center mx-auto">
              <CalendarIcon className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-200">لا توجد فعاليات مضافة حالياً</h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                قم بإضافة أول فعالية للجهة ليتمكن الطلاب من متابعتها وإضافتها إلى تقويمهم.
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold rounded-xl transition cursor-pointer border border-neutral-700"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>إضافة فعالية</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 space-y-3 relative group hover:border-neutral-700 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      فعالية معتمدة
                    </span>
                    <h3 className="text-base font-bold text-white leading-snug truncate">
                      {ev.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleDeleteEvent(ev.id)}
                    className="p-2 text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 rounded-xl transition cursor-pointer"
                    title="حذف الفعالية"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-400 pt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{formatDate(ev.date, 'ar-full')}</span>
                  </div>
                  {ev.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      <span className="truncate max-w-[150px]">{ev.location}</span>
                    </div>
                  )}
                </div>

                {ev.description && (
                  <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800/60">
                    {ev.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Event Modal */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div 
            className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative text-right animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
              <h3 className="font-serif font-extrabold text-base text-white inline-flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-emerald-400" />
                <span>إضافة فعالية جديدة للجهة</span>
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  عنوان الفعالية *
                </label>
                <input
                  type="text"
                  placeholder="مثال: ورشة عمل الذكاء الاصطناعي، اللقاء التعريفي..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white outline-none focus:border-emerald-500 transition"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    تاريخ الفعالية *
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white outline-none focus:border-emerald-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-1">
                    الوقت
                  </label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  المقر أو الرابط (اختياري)
                </label>
                <input
                  type="text"
                  placeholder="مثال: مبنى 324 - القاعة الكبرى، أو رابط تيمز..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-1">
                  وصف وتفاصيل الفعالية (اختياري)
                </label>
                <textarea
                  rows={3}
                  placeholder="تفاصيل الفعالية، المتحدثين، شروط الحضور..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs text-white outline-none focus:border-emerald-500 transition resize-none"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2 border-t border-neutral-800">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري النشر...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>نشر الفعالية في التقويم</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-bold text-neutral-400 hover:bg-neutral-800 transition cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div 
            className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-sm w-full text-right space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
            dir="rtl"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">{confirmModal.title}</h3>
              <p className="text-xs text-neutral-400 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex items-center gap-2 pt-2 border-t border-neutral-800">
              <button
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition cursor-pointer"
              >
                تأكيد الحذف
              </button>
              <button
                onClick={() => setConfirmModal(null)}
                className="py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
