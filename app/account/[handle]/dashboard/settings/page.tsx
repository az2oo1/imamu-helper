'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../src/lib/AuthContext';
import { Shield, Loader2, Lock, Plus, Trash2, Send, X, Globe, Camera, MessageSquare, CheckCircle2, AlertCircle, Info, Check } from 'lucide-react';
import { EntityDashboardHeader } from '../../../../../src/components/EntityDashboardHeader';
import ImageUploadInput from '../../../../../src/components/ImageUploadInput';

export const dynamic = 'force-dynamic';

interface LinkItem {
  title: string;
  url: string;
}

export default function AccountDashboardSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const handleParam = params?.handle as string;

  const { user, dbUser, loading: authLoading } = useAuth();
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [telegramChannels, setTelegramChannels] = useState<string[]>([]);
  const [newTgChannelInput, setNewTgChannelInput] = useState('');

  const [socialPresets, setSocialPresets] = useState({
    x: '',
    telegram: '',
    instagram: '',
    linkedin: '',
    youtube: '',
    whatsapp: '',
    website: ''
  });

  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

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
        setDisplayName(data.displayName || data.handle || '');
        setBio(data.bio || '');
        setBannerUrl(data.bannerUrl || '');
        setProfilePicUrl(data.profilePicUrl || '');

        const parsedLinks = Array.isArray(data.links) ? data.links : [];
        setLinks(parsedLinks);

        let tgArr: string[] = [];
        if (data.telegramChannels) {
          try {
            tgArr = typeof data.telegramChannels === 'string' ? JSON.parse(data.telegramChannels) : data.telegramChannels;
          } catch (e) {}
        }
        setTelegramChannels(Array.isArray(tgArr) ? tgArr : []);
        extractSocialPresets(parsedLinks, Array.isArray(tgArr) ? tgArr : []);
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

  const extractSocialPresets = (linksList: LinkItem[], tgList: string[]) => {
    const presets = {
      x: '',
      telegram: tgList.length > 0 ? `@${tgList[0]}` : '',
      instagram: '',
      linkedin: '',
      youtube: '',
      whatsapp: '',
      website: ''
    };

    if (Array.isArray(linksList)) {
      linksList.forEach(lnk => {
        const t = (lnk.title || '').toLowerCase();
        const u = (lnk.url || '').toLowerCase();

        if (t.includes('x') || t.includes('twitter') || u.includes('x.com') || u.includes('twitter.com')) {
          presets.x = lnk.url;
        } else if (t.includes('instagram') || u.includes('instagram.com')) {
          presets.instagram = lnk.url;
        } else if (t.includes('linkedin') || u.includes('linkedin.com')) {
          presets.linkedin = lnk.url;
        } else if (t.includes('youtube') || u.includes('youtube.com')) {
          presets.youtube = lnk.url;
        } else if (t.includes('whatsapp') || u.includes('wa.me')) {
          presets.whatsapp = lnk.url;
        } else if (t.includes('موقع') || t.includes('website') || t.includes('رسمي')) {
          presets.website = lnk.url;
        } else if (t.includes('telegram') || u.includes('t.me')) {
          if (!presets.telegram) presets.telegram = lnk.url;
        }
      });
    }

    setSocialPresets(presets);
  };

  const handleAddTelegramChannel = () => {
    let val = newTgChannelInput.trim();
    if (!val) return;
    val = val.replace(/^https?:\/\/(www\.)?t\.me\/(s\/)?/i, '').replace(/^t\.me\/(s\/)?/i, '').replace(/^@/, '').trim();
    if (val && !telegramChannels.includes(val)) {
      const updated = [...telegramChannels, val];
      setTelegramChannels(updated);
      if (!socialPresets.telegram) {
        setSocialPresets(prev => ({ ...prev, telegram: `@${val}` }));
      }
    }
    setNewTgChannelInput('');
  };

  const handleRemoveTelegramChannel = (ch: string) => {
    setTelegramChannels(telegramChannels.filter(c => c !== ch));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const token = user ? await user.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const mergedLinks: LinkItem[] = [...links];

      const upsertPreset = (title: string, val: string, keyword: string) => {
        if (!val.trim()) return;
        let url = val.trim();
        if (!/^https?:\/\//i.test(url) && !url.startsWith('@')) {
          url = 'https://' + url;
        }
        const existingIdx = mergedLinks.findIndex(l => (l.title || '').toLowerCase().includes(keyword) || (l.url || '').toLowerCase().includes(keyword));
        if (existingIdx >= 0) {
          mergedLinks[existingIdx] = { title, url };
        } else {
          mergedLinks.push({ title, url });
        }
      };

      if (socialPresets.x) upsertPreset('منصة X (تويتر)', socialPresets.x, 'x.com');
      if (socialPresets.instagram) upsertPreset('إنستغرام', socialPresets.instagram, 'instagram.com');
      if (socialPresets.linkedin) upsertPreset('لينكدإن', socialPresets.linkedin, 'linkedin.com');
      if (socialPresets.youtube) upsertPreset('يوتيوب', socialPresets.youtube, 'youtube.com');
      if (socialPresets.whatsapp) upsertPreset('واتساب', socialPresets.whatsapp, 'wa.me');
      if (socialPresets.website) upsertPreset('الموقع الرسمي', socialPresets.website, 'website');
      if (socialPresets.telegram) upsertPreset('تليقرام', socialPresets.telegram, 't.me');

      let finalTgChannels = [...telegramChannels];
      if (socialPresets.telegram) {
        const cleanTg = socialPresets.telegram.replace(/^https?:\/\/(www\.)?t\.me\/(s\/)?/i, '').replace(/^t\.me\/(s\/)?/i, '').replace(/^@/, '').trim();
        if (cleanTg && !finalTgChannels.includes(cleanTg)) {
          finalTgChannels.unshift(cleanTg);
        }
      }

      const accountParam = account.id || account.handle;

      const res = await fetch(`/api/authenticated-accounts/${accountParam}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          bio: bio.trim(),
          bannerUrl: bannerUrl.trim(),
          profilePicUrl: profilePicUrl.trim(),
          links: mergedLinks,
          telegramChannels: finalTgChannels
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.account) setAccount(data.account);
        showToast('success', 'تم حفظ إعدادات حساب الجهة بنجاح!');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('error', err.error || 'فشل حفظ الإعدادات');
      }
    } catch (err: any) {
      showToast('error', err.message || 'حدث خطأ في الاتصال');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    let url = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    setLinks([...links, { title: newLinkTitle.trim(), url }]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, idx) => idx !== index));
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--color-imamu-brown)] animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">جاري تحميل إعدادات الحساب...</span>
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

      {/* Shared Header & Back Button Bar */}
      <EntityDashboardHeader
        account={account}
        activePage="settings"
        publishedCount={Array.isArray(account.articles) ? account.articles.length : 0}
      />

      {/* Standalone Settings Page Body Form */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        <form onSubmit={handleSaveProfile} className="space-y-6 animate-in fade-in duration-200">
          
          {/* Image Upload Controls */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
              صورة الغلاف والصورة الشخصية (Banner & Avatar Uploads)
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ImageUploadInput
                label="الصورة الشخصية (Profile Pic)"
                value={profilePicUrl}
                onChange={setProfilePicUrl}
                type="avatar"
                uploadUrl="/api/admin/upload"
              />

              <ImageUploadInput
                label="صورة الغلاف (Banner Image)"
                value={bannerUrl}
                onChange={setBannerUrl}
                type="banner"
                uploadUrl="/api/admin/upload"
              />
            </div>
          </div>

          {/* Display Name & Bio */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                اسم حساب الجهة (Display Name)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="مثال: نادي الحوسبة بجامعة الإمام"
                className="w-full bg-neutral-900/70 border border-neutral-800 rounded-2xl px-4 py-3.5 text-white text-sm font-bold outline-none focus:border-[var(--color-imamu-accent)] transition"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                نبذة عن الحساب (Bio / Description)
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="اكتب نبذة تعريفية قصيرة تظهر في الملف الشخصي للحساب..."
                className="w-full bg-neutral-900/70 border border-neutral-800 rounded-2xl p-4 text-white text-xs leading-relaxed outline-none focus:border-[var(--color-imamu-accent)] transition"
              />
            </div>
          </div>

          {/* Telegram Channels Section */}
          <div className="bg-neutral-900/50 rounded-2xl p-5 border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Send className="w-4 h-4 text-sky-400" />
                <span>قنوات التليقرام للسحب التلقائي (Telegram Channels)</span>
              </label>
              <span className="text-[11px] text-neutral-400">ربط عدة قنوات لاستخراج الأخبار منها</span>
            </div>

            {telegramChannels.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {telegramChannels.map((ch) => (
                  <span
                    key={ch}
                    className="inline-flex items-center gap-1.5 bg-sky-950/60 text-sky-300 text-xs font-mono font-bold px-3 py-1.5 rounded-xl border border-sky-800/60"
                  >
                    <span>@{ch}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTelegramChannel(ch)}
                      className="hover:text-red-400 p-0.5 rounded transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                placeholder="أدخل معرف أو رابط قناة التليقرام (مثال: IMAMU_NEWS أو t.me/channel)..."
                value={newTgChannelInput}
                onChange={(e) => setNewTgChannelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTelegramChannel();
                  }
                }}
                className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold text-white outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleAddTelegramChannel}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-2xl transition flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة قناة</span>
              </button>
            </div>
          </div>

          {/* Fixed Social Media Preset Boxes */}
          <div className="bg-neutral-900/50 rounded-2xl p-5 border border-neutral-800 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <label className="text-xs font-bold text-white flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>حسابات وسائل التواصل الاجتماعي (Social Media Presets)</span>
              </label>
              <span className="text-[11px] text-neutral-400">صناديق ثابتة لإدخال معرفات أو روابط الحسابات</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300 block flex items-center gap-1.5">
                  <span className="font-bold text-white text-xs">𝕏</span>
                  <span>منصة X (تويتر)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://x.com/username أو @username"
                  value={socialPresets.x}
                  onChange={(e) => setSocialPresets({ ...socialPresets, x: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-white text-xs font-mono outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300 block flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-400" />
                  <span>قناة / حساب التليقرام</span>
                </label>
                <input
                  type="text"
                  placeholder="https://t.me/channel أو @channel"
                  value={socialPresets.telegram}
                  onChange={(e) => setSocialPresets({ ...socialPresets, telegram: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-white text-xs font-mono outline-none focus:border-sky-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300 block flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-pink-400" />
                  <span>حساب إنستغرام (Instagram)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://instagram.com/username"
                  value={socialPresets.instagram}
                  onChange={(e) => setSocialPresets({ ...socialPresets, instagram: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-white text-xs font-mono outline-none focus:border-pink-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300 block flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span>صفحة لينكدإن (LinkedIn)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://linkedin.com/company/name"
                  value={socialPresets.linkedin}
                  onChange={(e) => setSocialPresets({ ...socialPresets, linkedin: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-white text-xs font-mono outline-none focus:border-blue-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300 block flex items-center gap-1.5">
                  <span className="text-red-500 font-bold">▶</span>
                  <span>قناة يوتيوب (YouTube)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://youtube.com/@channel"
                  value={socialPresets.youtube}
                  onChange={(e) => setSocialPresets({ ...socialPresets, youtube: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-white text-xs font-mono outline-none focus:border-red-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-neutral-300 block flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>رابط واتساب (WhatsApp Group / Contact)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://wa.me/... أو رابط مجتمع واتساب"
                  value={socialPresets.whatsapp}
                  onChange={(e) => setSocialPresets({ ...socialPresets, whatsapp: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-white text-xs font-mono outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-xs font-bold text-neutral-300 block flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-amber-400" />
                  <span>الموقع الإلكتروني الرسمي (Official Website)</span>
                </label>
                <input
                  type="text"
                  placeholder="https://example.imamu.edu.sa"
                  value={socialPresets.website}
                  onChange={(e) => setSocialPresets({ ...socialPresets, website: e.target.value })}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-2xl px-4 py-2.5 text-white text-xs font-mono outline-none focus:border-amber-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Custom Links */}
          <div className="space-y-3 pt-4 border-t border-neutral-800">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                روابط إضافية مخصصة (Custom Profile Links)
              </label>
            </div>

            {links.map((lnk, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 p-3 bg-neutral-900/70 border border-neutral-800 rounded-2xl text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Globe className="w-4 h-4 text-[var(--color-imamu-accent)] shrink-0" />
                  <span className="font-bold text-white truncate">{lnk.title}</span>
                  <span className="text-neutral-500 font-mono truncate">({lnk.url})</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveLink(idx)}
                  className="p-1.5 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-xl transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2">
              <input
                type="text"
                placeholder="عنوان الرابط الإضافي"
                value={newLinkTitle}
                onChange={(e) => setNewLinkTitle(e.target.value)}
                className="sm:col-span-5 bg-neutral-900/70 border border-neutral-800 rounded-2xl px-4 py-2.5 text-white text-xs outline-none focus:border-[var(--color-imamu-accent)]"
              />
              <input
                type="url"
                placeholder="رابط الموقع (https://...)"
                value={newLinkUrl}
                onChange={(e) => setNewLinkUrl(e.target.value)}
                className="sm:col-span-5 bg-neutral-900/70 border border-neutral-800 rounded-2xl px-4 py-2.5 text-white text-xs outline-none focus:border-[var(--color-imamu-accent)] font-mono"
              />
              <button
                type="button"
                onClick={handleAddLink}
                className="sm:col-span-2 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs py-2.5 px-4 rounded-2xl transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-neutral-800 flex justify-end">
            <button
              type="submit"
              disabled={isSavingProfile}
              className="px-6 py-3 rounded-2xl font-bold text-xs flex items-center gap-2 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white transition shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>{isSavingProfile ? 'جاري الحفظ...' : 'حفظ إعدادات الملف الشخصي'}</span>
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
