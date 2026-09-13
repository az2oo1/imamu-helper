'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../src/lib/AuthContext';
import { Shield, Loader2, Lock, Send, Plus, Trash2, BadgeCheck, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { EntityDashboardHeader } from '../../../../../src/components/EntityDashboardHeader';
import TipTapEditor, { TipTapEditorRef } from '../../../../../src/components/TipTapEditor';

export const dynamic = 'force-dynamic';

export default function AccountDashboardComposerPage() {
  const params = useParams();
  const router = useRouter();
  const handleParam = params?.handle as string;

  const { user, dbUser, loading: authLoading } = useAuth();
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Composer Form State
  const [articleTitle, setArticleTitle] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [articleCategory, setArticleCategory] = useState('Campus');
  const [articleImages, setArticleImages] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [isPublishingArticle, setIsPublishingArticle] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const editorRef = useRef<TipTapEditorRef>(null);

  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const availableCategories = [
    { id: 'Campus', label: 'جامعي (Campus)' },
    { id: 'Academic', label: 'أكاديمي (Academic)' },
    { id: 'Events', label: 'فعاليات (Events)' },
    { id: 'Announcements', label: 'تنبيهات (Announcements)' },
    { id: 'Sports', label: 'رياضي (Sports)' }
  ];

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

  const handlePublishArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleContent.trim()) {
      showToast('error', 'الرجاء كتابة محتوى الخبر');
      return;
    }

    setIsPublishingArticle(true);
    try {
      const token = user ? await user.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const accountParam = account.id || account.handle;

      const res = await fetch(`/api/authenticated-accounts/${accountParam}/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          title: articleTitle || (articleContent.trim().split('\n')[0].replace(/^#+\s*/, '').slice(0, 80)),
          content: articleContent,
          category: articleCategory,
          tag: articleCategory,
          images: articleImages,
          photoUrl: articleImages[0] || null,
          isFeatured,
          isArchived
        })
      });

      if (res.ok) {
        showToast('success', 'تم نشر الخبر بنجاح باسم حساب الجهة!');
        setArticleTitle('');
        setArticleContent('');
        setArticleImages([]);
        setIsFeatured(false);
        setIsArchived(false);
        router.push(`/@/${encodeURIComponent(account.handle.replace(/^@/, ''))}/dashboard/articles`);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('error', err.error || 'فشل نشر الخبر');
      }
    } catch (err: any) {
      showToast('error', err.message || 'حدث خطأ أثناء النشر');
    } finally {
      setIsPublishingArticle(false);
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingMedia(true);
    try {
      const urls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        const urlPromise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(files[i]);
        });
        const dataUrl = await urlPromise;
        urls.push(dataUrl);
      }
      setArticleImages(prev => Array.from(new Set([...prev, ...urls])));
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploadingMedia(false);
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--color-imamu-brown)] animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">جاري تحميل محرر المقالات...</span>
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

      {/* Header & Page Navigation Buttons */}
      <EntityDashboardHeader
        account={account}
        activePage="composer"
        publishedCount={Array.isArray(account.articles) ? account.articles.length : 0}
      />

      {/* Standalone Article Composer Body */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <form onSubmit={handlePublishArticle} className="space-y-6 animate-in fade-in duration-200">
          <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 flex items-center justify-between text-xs">
            <span className="text-neutral-400">سيتم نشر الخبر رسمياً بالهوية والمظهر الخاص بـ:</span>
            <span className="font-bold text-[var(--color-imamu-accent)] bg-stone-950 px-3 py-1 rounded-full border border-neutral-800 flex items-center gap-1.5">
              <BadgeCheck className="w-4 h-4" />
              <span>{account.displayName || account.handle} (@{cleanHandle})</span>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                عنوان الخبر المقالي
              </label>
              <input
                type="text"
                value={articleTitle}
                onChange={(e) => setArticleTitle(e.target.value)}
                placeholder="اكتب عنوان الخبر الرئيسي..."
                className="w-full bg-neutral-900/70 border border-neutral-800 rounded-2xl px-4 py-3.5 text-white text-sm font-bold outline-none focus:border-[var(--color-imamu-accent)] transition"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                التصنيف
              </label>
              <select
                value={articleCategory}
                onChange={(e) => setArticleCategory(e.target.value)}
                className="w-full bg-neutral-900/70 border border-neutral-800 rounded-2xl px-4 py-3.5 text-white text-sm font-bold outline-none focus:border-[var(--color-imamu-accent)] cursor-pointer"
              >
                {availableCategories.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-neutral-900 text-white">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* TipTap Editor */}
          <div className="space-y-2 flex flex-col min-h-[340px]">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
              محتوى الخبر المقالي
            </label>
            <TipTapEditor
              ref={editorRef}
              value={articleContent}
              onChange={setArticleContent}
              placeholder="اكتب التفاصيل الكاملة للخبر باللغة العربية..."
            />
          </div>

          {/* Media Gallery */}
          <div className="space-y-3 pt-4 border-t border-neutral-800">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
              مرفقات الصور والغلاف
            </label>

            <div className="flex flex-wrap gap-4 p-4 bg-neutral-900/40 border border-neutral-800 border-dashed rounded-3xl min-h-[110px]">
              {articleImages.map((img, i) => (
                <div key={i} className="relative group w-32 h-24 shrink-0 rounded-2xl overflow-hidden border-2 border-neutral-800 bg-neutral-900 shadow-md">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  {i === 0 && (
                    <span className="absolute top-2 right-2 bg-[var(--color-imamu-brown)] text-white text-[9px] font-bold px-2 py-0.5 rounded shadow">
                      غلاف
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setArticleImages(articleImages.filter((_, idx) => idx !== i))}
                    className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 transition cursor-pointer"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => document.getElementById('account-composer-file')?.click()}
                className="flex flex-col items-center justify-center gap-1.5 w-32 h-24 border-2 border-neutral-800 border-dashed hover:border-[var(--color-imamu-accent)] hover:bg-[var(--color-imamu-accent)]/5 text-neutral-400 hover:text-white rounded-2xl text-xs transition cursor-pointer"
              >
                <Plus className="w-6 h-6 text-[var(--color-imamu-accent)]" />
                <span className="font-bold">إضافة صورة</span>
              </button>

              <input
                id="account-composer-file"
                type="file"
                multiple
                accept="image/*"
                onChange={handleMediaUpload}
                className="hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-neutral-300">
                <input
                  type="checkbox"
                  checked={isFeatured}
                  onChange={(e) => setIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-700 bg-neutral-900 text-[var(--color-imamu-accent)]"
                />
                <span>تعيين كخبر بارز ومثبت</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isPublishingArticle}
              className="px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white transition shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isPublishingArticle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rotate-180" />}
              <span>{isPublishingArticle ? 'جاري النشر...' : 'نشر الخبر المقالي باسم الحساب'}</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
