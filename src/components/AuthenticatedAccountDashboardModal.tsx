'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  X, Settings, Edit3, Newspaper, Users, Image as ImageIcon, Plus, Trash2, 
  Send, Loader2, Sparkles, Check, Globe, Link2, UserPlus, UserCheck, Shield, Camera, Layout,
  CheckCircle2, AlertCircle, Info, MessageSquare, ExternalLink, BadgeCheck, FileText,
  ArrowRight, ArrowLeft, Eye, Calendar, Clock, LayoutList, ChevronLeft, RefreshCw
} from 'lucide-react';
import { SpotlightCard } from './ui/SpotlightCard';
import TipTapEditor, { TipTapEditorRef } from './TipTapEditor';
import ImageUploadInput from './ImageUploadInput';
import { compressImageFile } from '../lib/imageCompressor';

interface LinkItem {
  title: string;
  url: string;
}

interface ConnectedUser {
  id?: number;
  uid: string;
  userName?: string;
  email?: string;
  profilePicUrl?: string;
}

interface AccountData {
  id: number;
  handle: string;
  displayName?: string;
  bio?: string;
  bannerUrl?: string;
  profilePicUrl?: string;
  links?: LinkItem[];
  assignedUsers?: string[];
  telegramChannels?: string[];
  followersCount?: number;
  articles?: any[];
}

interface AuthenticatedAccountDashboardModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  account: AccountData;
  currentUser: any;
  onAccountUpdate?: (updated: any) => void;
  isStandalonePage?: boolean;
  initialTab?: 'grid' | 'profile' | 'composer' | 'articles' | 'users';
}

export function AuthenticatedAccountDashboardModal({
  account,
  currentUser,
  onAccountUpdate,
  initialTab = 'grid'
}: AuthenticatedAccountDashboardModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'grid' | 'profile' | 'composer' | 'articles' | 'users'>(initialTab);

  // Sync tab with URL search parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'grid' || tabParam === 'profile' || tabParam === 'composer' || tabParam === 'articles' || tabParam === 'users') {
        setActiveTab(tabParam as any);
      }
    }
  }, []);

  const handleTabChange = (tab: 'grid' | 'profile' | 'composer' | 'articles' | 'users') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.pushState({}, '', url.toString());
    }
  };

  // Custom In-App Site Toast & Confirm Modal States (No browser native alert/confirm)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Profile Form State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Telegram channels state
  const [telegramChannels, setTelegramChannels] = useState<string[]>([]);
  const [newTgChannelInput, setNewTgChannelInput] = useState('');

  // Fixed Social Presets State
  const [socialPresets, setSocialPresets] = useState({
    x: '',
    telegram: '',
    instagram: '',
    linkedin: '',
    youtube: '',
    whatsapp: '',
    website: ''
  });

  // Article Composer State
  const [articleTitle, setArticleTitle] = useState('');
  const [articleContent, setArticleContent] = useState('');
  const [articleCategory, setArticleCategory] = useState('Campus');
  const [articleImages, setArticleImages] = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [isPublishingArticle, setIsPublishingArticle] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const editorRef = useRef<TipTapEditorRef>(null);

  // Articles & User Management State
  const [publishedArticles, setPublishedArticles] = useState<any[]>(account?.articles || []);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [newUserUid, setNewUserUid] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);

  const availableCategories = [
    { id: 'Campus', label: 'جامعي (Campus)' },
    { id: 'Academic', label: 'أكاديمي (Academic)' },
    { id: 'Events', label: 'فعاليات (Events)' },
    { id: 'Announcements', label: 'تنبيهات (Announcements)' },
    { id: 'Sports', label: 'رياضي (Sports)' }
  ];

  const [isSyncingTelegram, setIsSyncingTelegram] = useState(false);

  const handleSyncTelegram = async () => {
    if (!account?.id && !account?.handle) return;
    setIsSyncingTelegram(true);
    try {
      const token = currentUser ? await currentUser.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const accountParam = account.id || account.handle;
      const res = await fetch(`/api/authenticated-accounts/${accountParam}/sync-telegram`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        showToast('success', data.message || 'تم سحب الأخبار بنجاح!');
        fetchAccountArticles();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('error', err.error || 'فشل سحب الأخبار من التليقرام');
      }
    } catch (err: any) {
      showToast('error', err.message || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsSyncingTelegram(false);
    }
  };

  useEffect(() => {
    if (account) {
      setDisplayName(account.displayName || account.handle || '');
      setBio(account.bio || '');
      setBannerUrl(account.bannerUrl || '');
      setProfilePicUrl(account.profilePicUrl || '');
      if (Array.isArray(account.articles)) {
        setPublishedArticles(account.articles);
      }

      const parsedLinks = Array.isArray(account.links) ? account.links : [];
      setLinks(parsedLinks);

      // Parse telegram channels
      let tgArr: string[] = [];
      if (account.telegramChannels) {
        try {
          tgArr = typeof account.telegramChannels === 'string' ? JSON.parse(account.telegramChannels) : account.telegramChannels;
        } catch (e) {}
      }
      setTelegramChannels(Array.isArray(tgArr) ? tgArr : []);

      // Extract presets from links & telegram
      extractSocialPresets(parsedLinks, Array.isArray(tgArr) ? tgArr : []);
      fetchConnectedUsers();
      fetchAccountArticles();
    }
  }, [account]);

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

  const fetchConnectedUsers = async () => {
    if (!account?.id && !account?.handle) return;
    setIsLoadingUsers(true);
    try {
      const token = currentUser ? await currentUser.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const accountParam = account.id || account.handle;
      const res = await fetch(`/api/authenticated-accounts/${accountParam}/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setConnectedUsers(data.users || []);
      }
    } catch (e) {
      console.error('Failed to fetch connected users', e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchAccountArticles = async () => {
    if (!account?.handle && !account?.id) return;
    try {
      const accountParam = account.handle || account.id;
      const res = await fetch(`/api/authenticated-accounts/${accountParam}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.articles)) {
          setPublishedArticles(data.articles);
        }
      }
    } catch (e) {
      console.error('Failed to fetch account articles', e);
    }
  };

  if (!account) return null;

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

  const handleSaveProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingProfile(true);
    try {
      const token = currentUser ? await currentUser.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      
      const mergedLinks: LinkItem[] = [...links];

      const formatSocialUrl = (val: string, domain: string) => {
        let trimmed = val.trim();
        if (!trimmed) return '';
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        const cleanHandle = trimmed
          .replace(/^https?:\/\/(www\.)?/i, '')
          .replace(new RegExp(`^(www\\.)?${domain.replace('.', '\\.')}\\/`, 'i'), '')
          .replace(/^@/, '')
          .replace(/@$/, '')
          .trim();
        return `https://${domain}/${cleanHandle}`;
      };

      const upsertPreset = (title: string, val: string, keyword: string, domain?: string) => {
        if (!val.trim()) return;
        const url = domain ? formatSocialUrl(val, domain) : (/^https?:\/\//i.test(val.trim()) ? val.trim() : `https://${val.trim()}`);
        const existingIdx = mergedLinks.findIndex(l => (l.title || '').toLowerCase().includes(keyword) || (l.url || '').toLowerCase().includes(keyword));
        if (existingIdx >= 0) {
          mergedLinks[existingIdx] = { title, url };
        } else {
          mergedLinks.push({ title, url });
        }
      };

      if (socialPresets.x) upsertPreset('منصة X (تويتر)', socialPresets.x, 'x.com', 'x.com');
      if (socialPresets.instagram) upsertPreset('إنستغرام', socialPresets.instagram, 'instagram.com', 'instagram.com');
      if (socialPresets.linkedin) upsertPreset('لينكدإن', socialPresets.linkedin, 'linkedin.com', 'linkedin.com');
      if (socialPresets.youtube) upsertPreset('يوتيوب', socialPresets.youtube, 'youtube.com', 'youtube.com');
      if (socialPresets.whatsapp) upsertPreset('واتساب', socialPresets.whatsapp, 'wa.me', 'wa.me');
      if (socialPresets.website) upsertPreset('الموقع الرسمي', socialPresets.website, 'website');
      if (socialPresets.telegram) upsertPreset('تليقرام', socialPresets.telegram, 't.me', 't.me');

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
        if (onAccountUpdate && data.account) {
          onAccountUpdate(data.account);
        }
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

  const handlePublishArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleContent.trim()) {
      showToast('error', 'الرجاء كتابة محتوى الخبر');
      return;
    }

    setIsPublishingArticle(true);
    try {
      const token = currentUser ? await currentUser.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
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
        fetchAccountArticles();
        handleTabChange('articles');
        if (onAccountUpdate) onAccountUpdate({ ...account });
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
        const compressedFile = await compressImageFile(files[i], { maxWidth: 1920, maxHeight: 1080, quality: 0.82 });
        const reader = new FileReader();
        const urlPromise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(compressedFile);
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

  const handleAddUser = async () => {
    if (!newUserUid.trim()) return;
    setIsAddingUser(true);
    try {
      const token = currentUser ? await currentUser.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const accountParam = account.id || account.handle;

      const res = await fetch(`/api/authenticated-accounts/${accountParam}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ userUid: newUserUid.trim() })
      });

      if (res.ok) {
        setNewUserUid('');
        fetchConnectedUsers();
        showToast('success', 'تمت إضافة المدير بنجاح إلى إدارة حساب الجهة!');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('error', err.error || 'فشل إضافة المستخدم');
      }
    } catch (err: any) {
      showToast('error', err.message || 'حدث خطأ أثناء إضافة المستخدم');
    } finally {
      setIsAddingUser(false);
    }
  };

  const promptRemoveUser = (userUid: string) => {
    setConfirmModal({
      title: 'إزالة مدير الحساب',
      message: `هل أنت متأكد من إزالة المستخدم (${userUid}) من قائمة مدراء حساب الجهة؟`,
      onConfirm: () => executeRemoveUser(userUid)
    });
  };

  const executeRemoveUser = async (userUid: string) => {
    try {
      const token = currentUser ? await currentUser.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const accountParam = account.id || account.handle;

      const res = await fetch(`/api/authenticated-accounts/${accountParam}/users/${encodeURIComponent(userUid)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        fetchConnectedUsers();
        showToast('success', 'تمت إزالة المدير بنجاح');
      } else {
        showToast('error', 'فشل إزالة المستخدم');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'حدث خطأ أثناء إزالة المستخدم');
    }
  };

  const handleDeleteArticle = (articleId: number) => {
    setConfirmModal({
      title: 'حذف المقال',
      message: 'هل أنت متأكد من حذف هذا المقال المنشور؟ لا يمكن التراجع عن هذا الإجراء.',
      onConfirm: async () => {
        try {
          const token = currentUser ? await currentUser.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
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

  const cleanHandle = account.handle.replace(/^@/, '');

  return (
    <div className="min-h-screen bg-black text-white w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6 text-right" dir="rtl">
      
      {/* Toast Notification Banner */}
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

      {/* Confirmation Modal */}
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

      {/* Page Top Header Card (Banner, PFP, Display Name, Action Buttons) - ONLY rendered on main grid view */}
      {activeTab === 'grid' && (
        <div className="relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-2xl">
          {/* Cover Banner */}
          <div className="relative h-48 sm:h-64 w-full bg-neutral-950 overflow-hidden">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-amber-950/60 via-neutral-900 to-amber-900/60 flex items-center justify-center">
                <Layout className="w-16 h-16 text-neutral-700 opacity-40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />

            {/* Top Header Action Buttons */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <button
                onClick={() => router.push('/news')}
                className="flex items-center gap-2.5 px-5 py-2.5 bg-neutral-900/90 hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold rounded-2xl backdrop-blur-md transition border border-neutral-700/60 shadow-lg cursor-pointer"
              >
                <ArrowRight className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                <span>العودة للأخبار</span>
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={`/@/${encodeURIComponent(cleanHandle)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold rounded-xl shadow-lg transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>زيارة الصفحة العامة</span>
                </a>
              </div>
            </div>
          </div>

          {/* Profile Info Row Overlapping Cover Banner */}
          <div className="p-6 pt-0 relative z-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 sm:-mt-14">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              {/* PFP Avatar */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-neutral-900 bg-neutral-950 overflow-hidden shadow-2xl shrink-0 flex items-center justify-center">
                {profilePicUrl ? (
                  <img src={profilePicUrl} alt="PFP" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white">{(displayName || account.handle).charAt(0)}</span>
                )}
              </div>

              {/* Display Name & Handle */}
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-white flex items-center gap-2">
                  <span>{displayName || account.handle}</span>
                  <BadgeCheck className="w-6 h-6 text-[var(--color-imamu-accent)] shrink-0" />
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 font-sans">
                  <span>@{cleanHandle}</span>
                  <span className="w-1 h-1 rounded-full bg-neutral-700" />
                  <span>{account.followersCount || 0} متابع</span>
                  <span className="w-1 h-1 rounded-full bg-neutral-700" />
                  <span>{publishedArticles.length} خبر منشور</span>
                </div>
              </div>
            </div>

            {/* Title Badge */}
            <div className="shrink-0 bg-neutral-800/80 border border-neutral-700/70 px-4 py-2 rounded-2xl flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--color-imamu-accent)]" />
              <span className="text-xs font-bold text-white">لوحة تحكم إدارة الحساب</span>
            </div>
          </div>
        </div>
      )}

      {/* Smartphone App Grid OR Sub-page Header with Back Button */}
      {activeTab === 'grid' ? (
        <div className="space-y-5 animate-in fade-in duration-300 font-sans">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-imamu-brown)] shadow-sm" />
              <span>تطبيقات وأدوات الحساب</span>
            </h2>
            <span className="text-xs text-neutral-400 font-medium bg-neutral-900/80 px-3.5 py-1 rounded-full border border-neutral-800">
              تطبيقات النظام
            </span>
          </div>

          {/* Resources Style App Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <SpotlightCard
              className="border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-5 sm:p-6 flex flex-col justify-between relative group cursor-pointer h-full text-right"
              onClick={() => handleTabChange('profile')}
            >
              <div className="flex flex-col justify-between h-full w-full">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-50 dark:bg-stone-950/50 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] border border-slate-200/80 dark:border-zinc-700/80">
                      تطبيق نظام
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center text-[var(--color-imamu-accent)] group-hover:scale-105 transition-transform shadow-xs">
                      <Edit3 className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 leading-snug group-hover:text-[var(--color-imamu-accent)] transition-colors">
                    إعدادات الملف الشخصي
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                    تعديل الشعار، الغلاف، النبذة والروابط
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80 pt-3.5 mt-auto w-full relative z-20">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 group-hover:bg-slate-200 dark:group-hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 text-xs font-bold transition-all duration-200 shadow-xs">
                    <span>فتح التطبيق</span>
                    <ChevronLeft className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                  </span>
                </div>
              </div>
            </SpotlightCard>

            <SpotlightCard
              className="border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-5 sm:p-6 flex flex-col justify-between relative group cursor-pointer h-full text-right"
              onClick={() => handleTabChange('composer')}
            >
              <div className="flex flex-col justify-between h-full w-full">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-50 dark:bg-stone-950/50 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] border border-slate-200/80 dark:border-zinc-700/80">
                      تطبيق نظام
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center text-[var(--color-imamu-accent)] group-hover:scale-105 transition-transform shadow-xs">
                      <Newspaper className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 leading-snug group-hover:text-[var(--color-imamu-accent)] transition-colors">
                    محرر المقالات
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                    صياغة ونشر الأخبار والتحديثات
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80 pt-3.5 mt-auto w-full relative z-20">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 group-hover:bg-slate-200 dark:group-hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 text-xs font-bold transition-all duration-200 shadow-xs">
                    <span>فتح التطبيق</span>
                    <ChevronLeft className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                  </span>
                </div>
              </div>
            </SpotlightCard>

            <SpotlightCard
              className="border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-5 sm:p-6 flex flex-col justify-between relative group cursor-pointer h-full text-right"
              onClick={() => handleTabChange('articles')}
            >
              <div className="flex flex-col justify-between h-full w-full">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-50 dark:bg-stone-950/50 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] border border-slate-200/80 dark:border-zinc-700/80">
                      تطبيق نظام
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center text-[var(--color-imamu-accent)] group-hover:scale-105 transition-transform shadow-xs">
                      <LayoutList className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 leading-snug group-hover:text-[var(--color-imamu-accent)] transition-colors">
                    المنشورات المقالية
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                    الأخبار والمقالات المنشورة ({publishedArticles.length})
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80 pt-3.5 mt-auto w-full relative z-20">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 group-hover:bg-slate-200 dark:group-hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 text-xs font-bold transition-all duration-200 shadow-xs">
                    <span>فتح التطبيق</span>
                    <ChevronLeft className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                  </span>
                  {publishedArticles.length > 0 && (
                    <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/90 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-zinc-700">
                      {publishedArticles.length} خبر
                    </span>
                  )}
                </div>
              </div>
            </SpotlightCard>

            <SpotlightCard
              className="border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-5 sm:p-6 flex flex-col justify-between relative group cursor-pointer h-full text-right"
              onClick={() => handleTabChange('users')}
            >
              <div className="flex flex-col justify-between h-full w-full">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-50 dark:bg-stone-950/50 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] border border-slate-200/80 dark:border-zinc-700/80">
                      تطبيق نظام
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center text-[var(--color-imamu-accent)] group-hover:scale-105 transition-transform shadow-xs">
                      <Users className="w-5 h-5" />
                    </div>
                  </div>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 leading-snug group-hover:text-[var(--color-imamu-accent)] transition-colors">
                    إدارة المدراء
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                    تعيين وتحديد المدراء المصرح لهم
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80 pt-3.5 mt-auto w-full relative z-20">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 group-hover:bg-slate-200 dark:group-hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 text-xs font-bold transition-all duration-200 shadow-xs">
                    <span>فتح التطبيق</span>
                    <ChevronLeft className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                  </span>
                </div>
              </div>
            </SpotlightCard>
          </div>
        </div>
      ) : (
        /* Sub-page Navigation Header with Back Button */
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-neutral-800 bg-neutral-900/80 rounded-3xl shadow-xl animate-in fade-in duration-200">
          <button
            type="button"
            onClick={() => handleTabChange('grid')}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs sm:text-sm rounded-2xl transition border border-neutral-700/60 cursor-pointer shadow-md shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لتطبيقات الحساب</span>
          </button>

          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
            <button
              type="button"
              onClick={() => handleTabChange('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                activeTab === 'profile'
                  ? 'bg-[var(--color-imamu-brown)] text-white border-[var(--color-imamu-brown)] shadow-md'
                  : 'bg-neutral-900/90 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>إعدادات الملف</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('composer')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                activeTab === 'composer'
                  ? 'bg-[var(--color-imamu-brown)] text-white border-[var(--color-imamu-brown)] shadow-md'
                  : 'bg-neutral-900/90 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Newspaper className="w-3.5 h-3.5" />
              <span>محرر المقالات</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('articles')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                activeTab === 'articles'
                  ? 'bg-[var(--color-imamu-brown)] text-white border-[var(--color-imamu-brown)] shadow-md'
                  : 'bg-neutral-900/90 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span>المنشورات المقالية ({publishedArticles.length})</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('users')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                activeTab === 'users'
                  ? 'bg-[var(--color-imamu-brown)] text-white border-[var(--color-imamu-brown)] shadow-md'
                  : 'bg-neutral-900/90 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>إدارة المدراء</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Page View Content Container (Only rendered when in a specific app view) */}
      {activeTab !== 'grid' && (
        <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl">
        {/* TAB 1: PROFILE SETTINGS */}
        {activeTab === 'profile' && (
          <form onSubmit={handleSaveProfile} className="space-y-6 animate-in fade-in duration-200">
            {/* Banner & PFP Preview */}
            <div className="space-y-4">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                غلاف الحساب والصورة الشخصية (Banner & Avatar)
              </label>
              
              <div className="relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900 h-44 sm:h-52 flex items-end p-4 shadow-inner">
                {bannerUrl ? (
                  <img src={bannerUrl} alt="Banner" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-r from-amber-950/40 via-neutral-900 to-amber-900/40 flex items-center justify-center">
                    <Layout className="w-12 h-12 text-neutral-700 opacity-50" />
                  </div>
                )}

                <div className="relative z-10 flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full border-4 border-neutral-950 bg-neutral-900 overflow-hidden shrink-0 shadow-lg flex items-center justify-center">
                    {profilePicUrl ? (
                      <img src={profilePicUrl} alt="PFP" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-white">{(displayName || account.handle).charAt(0)}</span>
                    )}
                  </div>
                  <div className="text-white drop-shadow-md">
                    <h3 className="text-lg font-serif font-bold flex items-center gap-1.5">
                      <span>{displayName || account.handle}</span>
                      <BadgeCheck className="w-5 h-5 text-[var(--color-imamu-accent)]" />
                    </h3>
                    <p className="text-xs text-neutral-300 font-sans">@{cleanHandle}</p>
                  </div>
                </div>
              </div>

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
                      className="inline-flex items-center gap-1.5 bg-[var(--color-imamu-brown)]/20 text-[var(--color-imamu-accent)] text-xs font-sans font-bold px-3 py-1.5 rounded-xl border border-[var(--color-imamu-brown)]/40"
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
                  className="px-4 py-2.5 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white font-bold text-xs rounded-2xl transition flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
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
        )}

        {/* TAB 2: ARTICLE COMPOSER */}
        {activeTab === 'composer' && (
          <form onSubmit={handlePublishArticle} className="space-y-6 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 flex items-center justify-between text-xs">
              <span className="text-neutral-400">سيتم نشر الخبر رسمياً بالهوية والمظهر الخاص بـ:</span>
              <span className="font-bold text-[var(--color-imamu-accent)] bg-stone-950 px-3 py-1 rounded-full border border-neutral-800 flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4" />
                <span>{displayName || account.handle} (@{cleanHandle})</span>
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
        )}

        {/* TAB 3: PUBLISHED ARTICLES */}
        {activeTab === 'articles' && (
          <div className="space-y-6 animate-in fade-in duration-200">
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
                onClick={() => handleTabChange('composer')}
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
                  onClick={() => handleTabChange('composer')}
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

                    <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-end text-xs">
                      <a
                        href={`/news/${art.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[var(--color-imamu-accent)] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>عرض الخبر</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: USER MANAGEMENT */}
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-1">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Shield className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                <span>مدراء حساب الجهة (Entity Account Managers)</span>
              </h4>
              <p className="text-xs text-neutral-400">
                يمكن للمستخدمين المضافين هنا الوصول إلى لوحة تحكم هذا الحساب وتعديل بياناته ونشر الأخبار باسمه باستخدام الـ User UID الخاص بهم.
              </p>
            </div>

            {/* Add User Section */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
                إضافة مدير جديد بالمعرف (User UID)
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="أدخل User UID الخاص بالمستخدم (e.g. Firebase Auth UID)"
                  value={newUserUid}
                  onChange={(e) => setNewUserUid(e.target.value)}
                  className="flex-1 bg-neutral-900/70 border border-neutral-800 rounded-2xl px-4 py-3 text-white text-xs font-mono outline-none focus:border-[var(--color-imamu-accent)] transition"
                />
                <button
                  type="button"
                  onClick={handleAddUser}
                  disabled={isAddingUser || !newUserUid.trim()}
                  className="bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white font-bold text-xs px-6 py-3 rounded-2xl transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
                >
                  {isAddingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  <span>إضافة مدير</span>
                </button>
              </div>
            </div>

            {/* Connected Users List */}
            <div className="space-y-3 pt-4 border-t border-neutral-800">
              <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                المدراء المتصلون حالياً ({connectedUsers.length})
              </h4>

              {isLoadingUsers ? (
                <div className="py-12 flex justify-center text-neutral-500">
                  <Loader2 className="w-6 h-6 animate-spin text-[var(--color-imamu-accent)]" />
                </div>
              ) : connectedUsers.length === 0 ? (
                <div className="p-8 text-center bg-neutral-900/40 rounded-3xl border border-neutral-800 text-xs text-neutral-500">
                  لا يوجد مدراء معينون لهذا الحساب حالياً. يمكنك استخدام User UID لإضافة مدراء.
                </div>
              ) : (
                <div className="space-y-2">
                  {connectedUsers.map((u) => (
                    <div key={u.uid} className="flex items-center justify-between p-4 bg-neutral-900/70 border border-neutral-800 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-white overflow-hidden shrink-0">
                          {u.profilePicUrl ? (
                            <img src={u.profilePicUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            u.userName?.charAt(0) || 'U'
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-white block">{u.userName || 'مستخدم'}</span>
                          <span className="text-[10px] text-neutral-400 font-mono">{u.email || u.uid}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => promptRemoveUser(u.uid)}
                        className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-xl transition cursor-pointer"
                        title="إزالة المدير"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
}

export default AuthenticatedAccountDashboardModal;
