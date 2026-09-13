'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../src/lib/AuthContext';
import { Shield, Loader2, Lock, FileText, Plus, Calendar, Eye, Trash2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { EntityDashboardHeader } from '../../../../../src/components/EntityDashboardHeader';

export const dynamic = 'force-dynamic';

export default function AccountDashboardArticlesPage() {
  const params = useParams();
  const router = useRouter();
  const handleParam = params?.handle as string;

  const { user, dbUser, loading: authLoading } = useAuth();
  const [account, setAccount] = useState<any>(null);
  const [publishedArticles, setPublishedArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    if (handleParam) {
      fetchAccount();
    }
  }, [handleParam]);

  const fetchAccount = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('imamu_token') || '';
      const res = await fetch(`/api/authenticated-accounts/${encodeURIComponent(handleParam)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        setAccount(data);
        setPublishedArticles(Array.isArray(data.articles) ? data.articles : []);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'تعذر العثور على حساب الجهة المطلوب');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteArticle = (articleId: number) => {
    setConfirmModal({
      title: 'حذف المقال',
      message: 'هل أنت متأكد من حذف هذا المقال المنشور؟ لا يمكن التراجع عن هذا الإجراء.',
      onConfirm: async () => {
        try {
          const token = user ? await user.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
          const res = await fetch(`/api/news/${articleId}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.ok) {
            setPublishedArticles(prev => prev.filter(a => a.id !== articleId));
            showToast('success', 'تم حذف المقال بنجاح');
          } else {
            showToast('error', 'فشل حذف المقال');
          }
        } catch (e: any) {
          showToast('error', e.message || 'حدث خطأ في حذف المقال');
        }
      }
    });
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--color-imamu-brown)] animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">جاري تحميل المنشورات المقالية...</span>
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
            هذه اللوحة خاصة بمدراء حساب الجهة (@{account.handle}) فقط.
          </p>
          <button
            onClick={() => router.push(`/@/${encodeURIComponent(account.handle.replace(/^@/, ''))}`)}
            className="px-5 py-2.5 bg-[var(--color-imamu-brown)] text-white font-bold text-xs rounded-xl hover:bg-[var(--color-imamu-brown-dark)] transition cursor-pointer"
          >
            عرض الصفحة العامة
          </button>
        </div>
      </main>
    );
  }

  const cleanHandle = account.handle.replace(/^@/, '');

  return (
    <main className="min-h-screen bg-black text-white w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6 text-right" dir="rtl">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-none">
          <div className={`px-5 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-bold flex items-center gap-2.5 backdrop-blur-xl ${
            toast.type === 'success' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800/80' :
            toast.type === 'error' ? 'bg-red-950/90 text-red-300 border-red-800/80' :
            'bg-sky-950/90 text-sky-300 border-sky-800/80'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
            {toast.type === 'info' && <Info className="w-4 h-4 shrink-0 text-sky-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">{confirmModal.title}</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition cursor-pointer"
              >
                نعم، إزالة
              </button>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Page Navigation Buttons */}
      <EntityDashboardHeader
        account={account}
        activePage="articles"
        publishedCount={publishedArticles.length}
      />

      {/* Published Articles List Body */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 flex items-center justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-[var(--color-imamu-accent)]" />
              <span>المنشورات المقالية للحساب ({publishedArticles.length})</span>
            </h4>
            <p className="text-xs text-neutral-400">
              استعراض كامل الأخبار والمقالات التي تم نشرها رسمياً من قِبل هذا الحساب.
            </p>
          </div>

          <button
            onClick={() => router.push(`/@/${encodeURIComponent(cleanHandle)}/dashboard/composer`)}
            className="px-4 py-2 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>كتابة خبر جديد</span>
          </button>
        </div>

        {publishedArticles.length === 0 ? (
          <div className="p-12 text-center bg-neutral-900/40 rounded-3xl border border-neutral-800 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-neutral-800 text-neutral-500 flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h5 className="text-base font-bold text-white">لا توجد مقالات منشورة بعد</h5>
              <p className="text-xs text-neutral-400">قم بنشر أول خبر أو مقال باسم هذا الحساب من محرر المقالات.</p>
            </div>
            <button
              onClick={() => router.push(`/@/${encodeURIComponent(cleanHandle)}/dashboard/composer`)}
              className="px-6 py-2.5 bg-[var(--color-imamu-brown)] text-white font-bold text-xs rounded-xl hover:bg-[var(--color-imamu-brown-dark)] transition cursor-pointer"
            >
              فتح محرر المقالات
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {publishedArticles.map((art) => (
              <div key={art.id} className="bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-neutral-700 transition">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] font-bold text-[var(--color-imamu-accent)] bg-[var(--color-imamu-brown)]/15 border border-[var(--color-imamu-brown)]/30 px-2.5 py-0.5 rounded-full">
                      {art.category || 'جامعي'}
                    </span>
                    <span className="text-[11px] text-neutral-500 flex items-center gap-1 font-mono">
                      <Calendar className="w-3 h-3 text-neutral-500" />
                      <span>{art.createdAt ? new Date(art.createdAt).toLocaleDateString('ar-SA') : ''}</span>
                    </span>
                  </div>

                  <h5 className="text-sm font-bold text-white line-clamp-2 leading-snug">
                    {art.title}
                  </h5>

                  {art.content && (
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {art.content.replace(/<[^>]*>/g, '')}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                  <a
                    href={`/news/${art.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--color-imamu-accent)] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>عرض الخبر</span>
                  </a>

                  <button
                    onClick={() => handleDeleteArticle(art.id)}
                    className="text-neutral-400 hover:text-red-400 p-1.5 hover:bg-neutral-800 rounded-xl transition cursor-pointer"
                    title="حذف المقال"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
