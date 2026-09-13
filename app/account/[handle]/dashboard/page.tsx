'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../src/lib/AuthContext';
import { Shield, Loader2, Lock, Check, Plus, Trash2, Send, X, Globe, Camera, MessageSquare, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { EntityDashboardHeader } from '../../../../src/components/EntityDashboardHeader';
import ImageUploadInput from '../../../../src/components/ImageUploadInput';

export const dynamic = 'force-dynamic';

interface LinkItem {
  title: string;
  url: string;
}

export default function AccountDashboardGridPage() {
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

      {/* Shared Header & App Grid */}
      <EntityDashboardHeader
        account={account}
        activePage="grid"
        publishedCount={Array.isArray(account.articles) ? account.articles.length : 0}
      />
    </main>
  );
}
