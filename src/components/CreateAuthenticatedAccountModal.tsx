'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Shield, UserPlus, Send, Plus, Trash2, Check, Loader2, Sparkles, User, Globe, Image as ImageIcon, Link2,
  CheckCircle2, AlertCircle, Info, Camera, MessageSquare, RefreshCw
} from 'lucide-react';
import ImageUploadInput from './ImageUploadInput';

interface LinkItem {
  title: string;
  url: string;
}

interface CreateAuthenticatedAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  editAccount?: any;
}

export function CreateAuthenticatedAccountModal({
  isOpen,
  onClose,
  onSuccess,
  editAccount
}: CreateAuthenticatedAccountModalProps) {
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  // Custom In-App Site Toast State (No browser native alerts)
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  // Multiple assigned users state (User UIDs)
  const [assignedUsers, setAssignedUsers] = useState<string[]>([]);
  const [newUidInput, setNewUidInput] = useState('');

  // Multiple telegram channels state
  const [telegramChannels, setTelegramChannels] = useState<string[]>([]);
  const [newTgInput, setNewTgInput] = useState('');

  // Social Media Links state
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncTelegram = async () => {
    if (!editAccount) return;
    const accountParam = editAccount.id || editAccount.handle;
    setIsSyncing(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('imamu_token') || '';
      const res = await fetch(`/api/authenticated-accounts/${accountParam}/sync-telegram`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (res.ok) {
        showToast('success', data.message || 'تم سحب الأخبار بنجاح!');
        if (onSuccess) onSuccess();
      } else {
        showToast('error', data.error || 'فشل سحب الأخبار من التليقرام');
      }
    } catch (err: any) {
      showToast('error', err.message || 'حدث خطأ أثناء سحب الأخبار');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (editAccount && isOpen) {
      setDisplayName(editAccount.displayName || editAccount.handle || '');
      setHandle(editAccount.handle || '');
      setBio(editAccount.bio || '');
      setProfilePicUrl(editAccount.profilePicUrl || '');
      setBannerUrl(editAccount.bannerUrl || '');

      // Parse assigned users
      let usersArr: string[] = [];
      if (editAccount.assignedUsers) {
        try {
          usersArr = typeof editAccount.assignedUsers === 'string' ? JSON.parse(editAccount.assignedUsers) : editAccount.assignedUsers;
        } catch (e) {}
      }
      setAssignedUsers(Array.isArray(usersArr) ? usersArr : []);

      // Parse telegram channels
      let tgArr: string[] = [];
      if (editAccount.telegramChannels) {
        try {
          tgArr = typeof editAccount.telegramChannels === 'string' ? JSON.parse(editAccount.telegramChannels) : editAccount.telegramChannels;
        } catch (e) {}
      }
      setTelegramChannels(Array.isArray(tgArr) ? tgArr : []);

      // Parse links
      let linksArr: any[] = [];
      if (editAccount.links) {
        try {
          linksArr = typeof editAccount.links === 'string' ? JSON.parse(editAccount.links) : editAccount.links;
        } catch (e) {}
      }
      const parsedLinks = Array.isArray(linksArr) ? linksArr : [];
      setLinks(parsedLinks);

      // Extract presets
      extractSocialPresets(parsedLinks, Array.isArray(tgArr) ? tgArr : []);
    } else if (isOpen) {
      setDisplayName('');
      setHandle('');
      setBio('');
      setProfilePicUrl('');
      setBannerUrl('');
      setAssignedUsers([]);
      setNewUidInput('');
      setTelegramChannels([]);
      setNewTgInput('');
      setLinks([]);
      setNewLinkTitle('');
      setNewLinkUrl('');
      setSocialPresets({
        x: '',
        telegram: '',
        instagram: '',
        linkedin: '',
        youtube: '',
        whatsapp: '',
        website: ''
      });
    }
  }, [editAccount, isOpen]);

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

  if (!isOpen) return null;

  const handleAddUserUid = () => {
    const val = newUidInput.trim();
    if (!val) return;
    if (!assignedUsers.includes(val)) {
      setAssignedUsers([...assignedUsers, val]);
    }
    setNewUidInput('');
  };

  const handleRemoveUserUid = (uid: string) => {
    setAssignedUsers(assignedUsers.filter(u => u !== uid));
  };

  const handleAddTelegramChannel = () => {
    let val = newTgInput.trim();
    if (!val) return;
    val = val.replace(/^https?:\/\/(www\.)?t\.me\/(s\/)?/i, '').replace(/^t\.me\/(s\/)?/i, '').replace(/^@/, '').trim();
    if (val && !telegramChannels.includes(val)) {
      setTelegramChannels([...telegramChannels, val]);
      if (!socialPresets.telegram) {
        setSocialPresets(prev => ({ ...prev, telegram: `@${val}` }));
      }
    }
    setNewTgInput('');
  };

  const handleRemoveTelegramChannel = (channel: string) => {
    setTelegramChannels(telegramChannels.filter(c => c !== channel));
  };

  const handleAddSocialLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) return;
    let url = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    setLinks([...links, { title: newLinkTitle.trim(), url }]);
    setNewLinkTitle('');
    setNewLinkUrl('');
  };

  const handleRemoveSocialLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() && !handle.trim()) {
      showToast('error', 'الرجاء إدخال اسم الحساب المعروض واسم المستخدم');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('imamu_token') || '';
      const accountParam = editAccount?.id || editAccount?.handle;
      const url = editAccount ? `/api/authenticated-accounts/${accountParam}/profile` : '/api/admin/news_sources';
      const method = editAccount ? 'PUT' : 'POST';

      const cleanHandle = (handle.trim() || displayName.trim()).replace(/^@/, '');

      // Build merged links list combining fixed social preset boxes + custom links
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

      // Update telegram channels array if telegram preset is specified
      let finalTgChannels = [...telegramChannels];
      if (socialPresets.telegram) {
        const cleanTg = socialPresets.telegram.replace(/^https?:\/\/(www\.)?t\.me\/(s\/)?/i, '').replace(/^t\.me\/(s\/)?/i, '').replace(/^@/, '').trim();
        if (cleanTg && !finalTgChannels.includes(cleanTg)) {
          finalTgChannels.unshift(cleanTg);
        }
      }

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          displayName: displayName.trim(),
          handle: cleanHandle,
          bio: bio.trim(),
          profilePicUrl: profilePicUrl.trim(),
          bannerUrl: bannerUrl.trim(),
          assignedUsers,
          telegramChannels: finalTgChannels,
          links: mergedLinks
        })
      });

      if (res.ok) {
        if (onSuccess) onSuccess();
        onClose();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('error', err.error || err.message || 'فشل حفظ حساب الجهة');
      }
    } catch (err: any) {
      showToast('error', err.message || 'حدث خطأ أثناء حفظ البيانات');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 dark:bg-black/85 backdrop-blur-xl overflow-y-auto text-right font-sans"
        onClick={onClose}
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col z-10 text-slate-900 dark:text-white max-h-[90vh]"
        >
          {/* Custom In-App Toast Notification Banner */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className={`absolute top-4 left-6 right-6 z-[160] p-4 rounded-2xl flex items-center justify-between gap-3 text-xs font-bold shadow-xl border backdrop-blur-md ${
                  toast.type === 'success'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                    : toast.type === 'error'
                    ? 'bg-red-500/20 border-red-500/40 text-red-600 dark:text-red-300'
                    : 'bg-sky-500/20 border-sky-500/40 text-sky-600 dark:text-sky-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                  {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
                  {toast.type === 'info' && <Info className="w-5 h-5 text-sky-500 shrink-0" />}
                  <span className="leading-snug">{toast.message}</span>
                </div>
                <button type="button" onClick={() => setToast(null)} className="p-1 hover:bg-black/10 rounded-lg transition">
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header Bar */}
          <div className="p-6 bg-slate-50/80 dark:bg-zinc-900/90 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[var(--color-imamu-brown)] text-white shadow-md">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-tight">
                  {editAccount ? 'تعديل بيانات حساب الجهة' : 'إنشاء حساب جهة جديد'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
                  رفع الصور، تعيين عدة مدراء، ربط حسابات التواصل وقنوات التليقرام
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {editAccount && (
                <button
                  type="button"
                  onClick={handleSyncTelegram}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold rounded-2xl transition cursor-pointer shadow-sm disabled:opacity-50"
                  title="سحب الأخبار من التليقرام الآن"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'جاري السحب...' : 'سحب الأخبار'}</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form Body */}
          <form id="create-account-form" onSubmit={handleSubmit} className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            
            {/* Display Name & Handle Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                  اسم حساب الجهة *
                </label>
                <input
                  type="text"
                  placeholder="مثال: نادي الحاسب الآلي"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl px-4 py-3 text-slate-900 dark:text-white text-xs font-bold outline-none focus:ring-2 focus:ring-[var(--color-imamu-brown)] shadow-xs transition"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                  اسم المستخدم / المعرف *
                </label>
                <input
                  type="text"
                  placeholder="مثال: computer_club"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl px-4 py-3 text-slate-900 dark:text-white text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-[var(--color-imamu-brown)] shadow-xs transition"
                  required
                />
              </div>
            </div>

            {/* Direct File Uploads for PFP & Banner (No Text URL Inputs) */}
            <div className="bg-slate-50 dark:bg-zinc-800/40 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800/80 space-y-4">
              <label className="text-xs font-bold text-slate-900 dark:text-white block">
                رفع صور حساب الجهة
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <ImageUploadInput
                  label="الصورة الشخصية"
                  value={profilePicUrl}
                  onChange={setProfilePicUrl}
                  type="avatar"
                  uploadUrl="/api/admin/upload"
                />

                <ImageUploadInput
                  label="صورة الغلاف"
                  value={bannerUrl}
                  onChange={setBannerUrl}
                  type="banner"
                  uploadUrl="/api/admin/upload"
                />
              </div>
            </div>

            {/* Bio Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block">
                النبذة التعريفية للحساب
              </label>
              <textarea
                rows={3}
                placeholder="اكتب نبذة تعريفية قصيرة تظهر في بروفايل حساب الجهة..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-2xl p-4 text-slate-900 dark:text-white text-xs leading-relaxed outline-none focus:ring-2 focus:ring-[var(--color-imamu-brown)] shadow-xs transition resize-none"
              />
            </div>

            {/* Multiple Telegram Channels */}
            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-sky-500" />
                  <span>قنوات تليقرام متعددة للسحب التلقائي</span>
                </label>
                <div className="flex items-center gap-2">
                  {editAccount && (
                    <button
                      type="button"
                      onClick={handleSyncTelegram}
                      disabled={isSyncing}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'جاري السحب...' : 'سحب الأخبار الآن'}</span>
                    </button>
                  )}
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400 hidden sm:inline">يمكن ربط أكثر من قناة</span>
                </div>
              </div>

              {/* Added Telegram Badges */}
              {telegramChannels.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {telegramChannels.map((ch) => (
                    <span
                      key={ch}
                      className="inline-flex items-center gap-1.5 bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 text-xs font-mono font-bold px-3 py-1.5 rounded-xl border border-sky-200 dark:border-sky-900/50 shadow-2xs"
                    >
                      <span>@{ch}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTelegramChannel(ch)}
                        className="hover:text-red-500 p-0.5 rounded transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add Telegram Channel Input Row */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="أدخل رابط أو معرف القناة (مثال: IMAMU_NEWS أو t.me/channel)..."
                  value={newTgInput}
                  onChange={(e) => setNewTgInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTelegramChannel();
                    }
                  }}
                  className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
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
            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-700 pb-3">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  <span>صناديق حسابات التواصل الاجتماعي</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">إدخال معرفات أو روابط الحسابات القائمة</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Fixed Box: Platform X */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block flex items-center gap-1.5">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">𝕏</span>
                    <span>منصة X (تويتر)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://x.com/username أو @username"
                    value={socialPresets.x}
                    onChange={(e) => setSocialPresets({ ...socialPresets, x: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl px-4 py-2.5 text-slate-900 dark:text-white text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  />
                </div>

                {/* Fixed Box: Telegram */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block flex items-center gap-1.5">
                    <Send className="w-3.5 h-3.5 text-sky-500" />
                    <span>قناة / حساب التليقرام</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://t.me/channel أو @channel"
                    value={socialPresets.telegram}
                    onChange={(e) => setSocialPresets({ ...socialPresets, telegram: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl px-4 py-2.5 text-slate-900 dark:text-white text-xs font-mono outline-none focus:ring-2 focus:ring-sky-500 shadow-xs"
                  />
                </div>

                {/* Fixed Box: Instagram */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-pink-500" />
                    <span>حساب إنستغرام</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://instagram.com/username"
                    value={socialPresets.instagram}
                    onChange={(e) => setSocialPresets({ ...socialPresets, instagram: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl px-4 py-2.5 text-slate-900 dark:text-white text-xs font-mono outline-none focus:ring-2 focus:ring-pink-500 shadow-xs"
                  />
                </div>

                {/* Fixed Box: LinkedIn */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-500" />
                    <span>صفحة لينكدإن</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://linkedin.com/company/name"
                    value={socialPresets.linkedin}
                    onChange={(e) => setSocialPresets({ ...socialPresets, linkedin: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl px-4 py-2.5 text-slate-900 dark:text-white text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
                  />
                </div>

                {/* Fixed Box: YouTube */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block flex items-center gap-1.5">
                    <span className="text-red-500 font-bold">▶</span>
                    <span>قناة يوتيوب</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://youtube.com/@channel"
                    value={socialPresets.youtube}
                    onChange={(e) => setSocialPresets({ ...socialPresets, youtube: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl px-4 py-2.5 text-slate-900 dark:text-white text-xs font-mono outline-none focus:ring-2 focus:ring-red-500 shadow-xs"
                  />
                </div>

                {/* Fixed Box: WhatsApp */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                    <span>رابط واتساب</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://wa.me/... أو رابط مجتمع واتساب"
                    value={socialPresets.whatsapp}
                    onChange={(e) => setSocialPresets({ ...socialPresets, whatsapp: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl px-4 py-2.5 text-slate-900 dark:text-white text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                  />
                </div>

                {/* Fixed Box: Official Website */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-amber-500" />
                    <span>الموقع الإلكتروني الرسمي</span>
                  </label>
                  <input
                    type="text"
                    placeholder="https://example.imamu.edu.sa"
                    value={socialPresets.website}
                    onChange={(e) => setSocialPresets({ ...socialPresets, website: e.target.value })}
                    className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl px-4 py-2.5 text-slate-900 dark:text-white text-xs font-mono outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
                  />
                </div>
              </div>
            </div>

            {/* Custom Links */}
            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-emerald-500" />
                  <span>روابط إضافية مخصصة</span>
                </label>
              </div>

              {/* Added Links List */}
              {links.length > 0 && (
                <div className="space-y-2 pt-1">
                  {links.map((lnk, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-zinc-900/80 border border-slate-200 dark:border-zinc-700/80 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Link2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="font-bold text-slate-900 dark:text-white truncate">{lnk.title}</span>
                        <span className="text-slate-400 font-mono text-[11px] truncate">({lnk.url})</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSocialLink(idx)}
                        className="text-slate-400 hover:text-red-500 p-1 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Link Input Row */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
                <input
                  type="text"
                  placeholder="اسم الرابط الإضافي"
                  value={newLinkTitle}
                  onChange={(e) => setNewLinkTitle(e.target.value)}
                  className="sm:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl px-4 py-2.5 text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                />
                <input
                  type="url"
                  placeholder="الرابط (مثال: x.com/club)"
                  value={newLinkUrl}
                  onChange={(e) => setNewLinkUrl(e.target.value)}
                  className="sm:col-span-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl px-4 py-2.5 text-xs font-mono text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                />
                <button
                  type="button"
                  onClick={handleAddSocialLink}
                  className="sm:col-span-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-3 rounded-2xl transition flex items-center justify-center gap-1 shrink-0 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة</span>
                </button>
              </div>
            </div>

            {/* Multiple Assigned Users */}
            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                  <span>تعيين مدراء للحساب</span>
                </label>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">يمكن إضافة أكثر من مدير بواسطة المعرّف</span>
              </div>

              {/* Added Users Badges */}
              {assignedUsers.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {assignedUsers.map((uid) => (
                    <span
                      key={uid}
                      className="inline-flex items-center gap-1.5 bg-stone-100 dark:bg-stone-950/60 text-[var(--color-imamu-brown)] dark:text-[var(--color-imamu-accent)] text-xs font-mono font-bold px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-zinc-700/80 shadow-2xs"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>{uid}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveUserUid(uid)}
                        className="hover:text-red-500 p-0.5 rounded transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add UID Input Row */}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  placeholder="أدخل المعرّف الخاص بالمستخدم ثم انقر إضافة..."
                  value={newUidInput}
                  onChange={(e) => setNewUidInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddUserUid();
                    }
                  }}
                  className="flex-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[var(--color-imamu-brown)] shadow-xs"
                />
                <button
                  type="button"
                  onClick={handleAddUserUid}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-xs rounded-2xl transition flex items-center gap-1 shrink-0 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                  <span>إضافة مدير</span>
                </button>
              </div>
            </div>

          </form>

          {/* Action Footer */}
          <div className="p-4 px-6 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/80 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              إلغاء
            </button>

            <button
              type="submit"
              form="create-account-form"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white transition shadow-md disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{editAccount ? 'تحديث حساب الجهة' : 'إنشاء حساب الجهة'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default CreateAuthenticatedAccountModal;
