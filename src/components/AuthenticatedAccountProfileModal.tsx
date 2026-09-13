'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Check, Shield, Globe, UserCheck, UserPlus, Settings, ExternalLink, 
  Newspaper, Heart, MessageSquare, Clock, Calendar, Sparkles, Layout, ArrowLeft, ArrowRight, Users, BadgeCheck, Video, Folder, Send, Camera, Share2
} from 'lucide-react';
import { SpotlightCard } from './ui';
import { NewsMediaPreview } from './NewsMediaPreview';
import { ImageViewerModal } from './ImageViewerModal';
import { FormattedNewsContent } from './FormattedNewsContent';
import { NewsDetailModal } from './NewsDetailModal';
import { AuthenticatedAccountDashboardModal } from './AuthenticatedAccountDashboardModal';
import { formatDate } from '../lib/date-utils';
import { getArabicCategoryLabel } from '../lib/textHelpers';

function getSocialLinkMeta(url: string, title: string) {
  const lowerUrl = (url || '').toLowerCase();
  const lowerTitle = (title || '').toLowerCase();

  if (lowerUrl.includes('t.me') || lowerUrl.includes('telegram') || lowerTitle.includes('تليقرام') || lowerTitle.includes('telegram')) {
    return {
      icon: <Send className="w-4 h-4 text-sky-400 shrink-0" />,
      colorClass: 'text-sky-400 group-hover:text-sky-300',
      label: title || 'تليقرام'
    };
  }
  if (lowerUrl.includes('x.com') || lowerUrl.includes('twitter') || lowerTitle.includes('تويتر') || lowerTitle.includes('x')) {
    return {
      icon: <span className="font-bold text-xs text-white shrink-0">𝕏</span>,
      colorClass: 'text-white group-hover:text-neutral-200',
      label: title || 'منصة X'
    };
  }
  if (lowerUrl.includes('instagram') || lowerTitle.includes('إنستغرام') || lowerTitle.includes('instagram')) {
    return {
      icon: <Camera className="w-4 h-4 text-pink-400 shrink-0" />,
      colorClass: 'text-pink-400 group-hover:text-pink-300',
      label: title || 'إنستغرام'
    };
  }
  if (lowerUrl.includes('youtube') || lowerTitle.includes('يوتيوب') || lowerTitle.includes('youtube')) {
    return {
      icon: <Video className="w-4 h-4 text-red-500 shrink-0" />,
      colorClass: 'text-red-400 group-hover:text-red-300',
      label: title || 'يوتيوب'
    };
  }
  if (lowerUrl.includes('linkedin') || lowerTitle.includes('لينكدإن') || lowerTitle.includes('linkedin')) {
    return {
      icon: <Globe className="w-4 h-4 text-blue-400 shrink-0" />,
      colorClass: 'text-blue-400 group-hover:text-blue-300',
      label: title || 'لينكدإن'
    };
  }
  if (lowerUrl.includes('wa.me') || lowerUrl.includes('whatsapp') || lowerTitle.includes('واتساب')) {
    return {
      icon: <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />,
      colorClass: 'text-emerald-400 group-hover:text-emerald-300',
      label: title || 'واتساب'
    };
  }
  return {
    icon: <Globe className="w-4 h-4 text-[var(--color-imamu-accent)] shrink-0" />,
    colorClass: 'text-[var(--color-imamu-accent)] group-hover:text-white',
    label: title || 'موقع إلكتروني'
  };
}

interface LinkItem {
  title: string;
  url: string;
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
  followersCount?: number;
  isFollowing?: boolean;
  isManager?: boolean;
  articles?: any[];
}

interface AuthenticatedAccountProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: AccountData | null;
  currentUser: any;
  dbUser?: any;
  onAccountUpdate?: () => void;
  isStandalonePage?: boolean;
}

export function AuthenticatedAccountProfileModal({
  isOpen,
  onClose,
  account: initialAccount,
  currentUser,
  dbUser,
  onAccountUpdate,
  isStandalonePage = false
}: AuthenticatedAccountProfileModalProps) {
  const router = useRouter();
  const [account, setAccount] = useState<AccountData | null>(initialAccount);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any | null>(null);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'articles' | 'tutorials' | 'files'>('articles');

  const handleOpenArticle = (art: any) => {
    if (!art) return;
    const authorName = art.author || account?.displayName || (account as any)?.name || account?.handle;
    const authorHandle = art.authorHandle || (account?.handle ? `@${account.handle.replace(/^@/, '')}` : undefined);
    const authorAvatar = art.authorAvatar || account?.profilePicUrl || (account as any)?.avatarUrl;
    setSelectedArticle({
      ...art,
      author: authorName,
      authorName: authorName,
      authorHandle: authorHandle,
      authorAvatar: authorAvatar,
      source: art.source || account?.handle
    });
  };

  const handleToggleArticleLike = async (artId: number | string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!currentUser) {
      router.push('/login');
      return;
    }
    const currentArticles = account?.articles || [];
    const target = currentArticles.find((a: any) => a.id === artId);
    if (!target) return;

    const prevLiked = target.isLiked;
    const prevCount = target.likes ?? target.likesCount ?? 0;
    const optLiked = !prevLiked;
    const optCount = optLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

    setAccount((prev: any) => prev ? {
      ...prev,
      articles: (prev.articles || []).map((art: any) => art.id === artId ? { ...art, isLiked: optLiked, likes: optCount, likesCount: optCount } : art)
    } : null);

    if (selectedArticle && selectedArticle.id === artId) {
      setSelectedArticle((prev: any) => prev ? { ...prev, isLiked: optLiked, likes: optCount, likesCount: optCount } : null);
    }

    try {
      const token = await currentUser.getIdToken();
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/news/${artId}/like`, { method: 'POST', headers });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data) {
          const finalLiked = data.isLiked ?? data.liked ?? optLiked;
          const finalCount = data.likesCount ?? data.likes ?? optCount;

          setAccount((prev: any) => prev ? {
            ...prev,
            articles: (prev.articles || []).map((art: any) => art.id === artId ? { ...art, isLiked: finalLiked, likes: finalCount, likesCount: finalCount } : art)
          } : null);

          if (selectedArticle && selectedArticle.id === artId) {
            setSelectedArticle((prev: any) => prev ? { ...prev, isLiked: finalLiked, likes: finalCount, likesCount: finalCount } : null);
          }
        }
      } else {
        setAccount((prev: any) => prev ? {
          ...prev,
          articles: (prev.articles || []).map((art: any) => art.id === artId ? { ...art, isLiked: prevLiked, likes: prevCount, likesCount: prevCount } : art)
        } : null);
        if (selectedArticle && selectedArticle.id === artId) {
          setSelectedArticle((prev: any) => prev ? { ...prev, isLiked: prevLiked, likes: prevCount, likesCount: prevCount } : null);
        }
      }
    } catch (err) {
      console.error('Failed to toggle like on article', err);
      setAccount((prev: any) => prev ? {
        ...prev,
        articles: (prev.articles || []).map((art: any) => art.id === artId ? { ...art, isLiked: prevLiked, likes: prevCount, likesCount: prevCount } : art)
      } : null);
      if (selectedArticle && selectedArticle.id === artId) {
        setSelectedArticle((prev: any) => prev ? { ...prev, isLiked: prevLiked, likes: prevCount, likesCount: prevCount } : null);
      }
    }
  };

  useEffect(() => {
    if (initialAccount) {
      setAccount(initialAccount);
      setIsFollowing(!!initialAccount.isFollowing);
      setFollowersCount(initialAccount.followersCount || 0);
      if (initialAccount.id || initialAccount.handle) {
        fetchLatestAccountDetails(initialAccount.handle || String(initialAccount.id));
      }
    }
  }, [initialAccount]);

  const fetchLatestAccountDetails = async (handleOrId: string) => {
    try {
      const token = currentUser ? await currentUser.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const res = await fetch(`/api/authenticated-accounts/${handleOrId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setAccount(data);
        setIsFollowing(!!data.isFollowing);
        setFollowersCount(data.followersCount || 0);
      }
    } catch (e) {
      console.error('Failed to fetch account details', e);
    }
  };

  if (!isOpen || !account) return null;

  const isManager = !!(
    account.isManager ||
    dbUser?.isAdmin ||
    dbUser?.role === 'ADMIN' ||
    (currentUser?.uid && Array.isArray(account.assignedUsers) && account.assignedUsers.includes(currentUser.uid))
  );

  const [toast, setToast] = useState<{ type: 'info' | 'error' | 'success'; message: string } | null>(null);

  const showToast = (type: 'info' | 'error' | 'success', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleToggleFollow = async () => {
    if (!currentUser) {
      showToast('info', 'يرجى تسجيل الدخول أولاً للمتابعة');
      return;
    }
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`/api/authenticated-accounts/${account.id}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
        setFollowersCount(data.followersCount);
        if (onAccountUpdate) onAccountUpdate();
      }
    } catch (e) {
      console.error('Failed to toggle follow', e);
    }
  };

  const linksList: LinkItem[] = Array.isArray(account.links)
    ? account.links
    : typeof account.links === 'string'
      ? JSON.parse(account.links || '[]')
      : [];

  const articlesList: any[] = account.articles || [];

  if (isStandalonePage) {
    return (
      <div className="w-full min-h-screen bg-black text-white font-sans text-right" dir="rtl">
        {/* Custom In-App Toast Notification Banner */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.95 }}
              className="fixed top-6 left-1/2 -translate-x-1/2 z-[160] py-2.5 px-4 rounded-full flex items-center gap-3 text-xs font-bold shadow-2xl border backdrop-blur-xl bg-neutral-900/95 border-[var(--color-imamu-accent)]/40 text-[var(--color-imamu-accent)] max-w-md pointer-events-auto"
            >
              <span>{toast.message}</span>
              <button type="button" onClick={() => setToast(null)} className="p-0.5 hover:bg-white/10 rounded-full transition shrink-0 cursor-pointer">
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cover Banner Header (Full Width Edge-to-Edge) */}
        <div className="relative h-56 sm:h-72 w-full bg-neutral-900 border-b border-neutral-800/60 overflow-hidden">
          {account.bannerUrl ? (
            <img src={account.bannerUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-neutral-950 via-neutral-900 to-amber-950/40 flex items-center justify-center">
              <Layout className="w-20 h-20 text-neutral-800 opacity-40" />
            </div>
          )}

          {/* Bottom Gradient Overlay for smooth transition */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

          {/* Floating Back Button (Right-aligned with right-pointing arrow) */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 sm:right-10 flex items-center gap-2.5 px-5 py-2.5 bg-neutral-900/90 hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold rounded-2xl border border-neutral-700/60 shadow-xl backdrop-blur-md transition cursor-pointer z-20"
          >
            <ArrowRight className="w-4 h-4 text-[var(--color-imamu-accent)]" />
            <span>العودة للأخبار</span>
          </button>
        </div>

        {/* Profile Header Block */}
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-5 -mt-16 sm:-mt-20 mb-8 relative z-10">
            {/* PFP Avatar & Info Row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-5">
              <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-black bg-neutral-900 shadow-2xl shrink-0 overflow-hidden ring-2 ring-white/10 flex items-center justify-center">
                {account.profilePicUrl ? (
                  <img src={account.profilePicUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-bold text-white">
                    {(account.displayName || account.handle).charAt(0)}
                  </span>
                )}
              </div>

              <div className="space-y-2 sm:pb-1 text-right">
                {/* Title & Official Verified Badge Icon */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-normal leading-tight">
                    {account.displayName || account.handle}
                  </h1>
                  <span title="حساب جهة موثق"><BadgeCheck className="w-6 h-6 text-[var(--color-imamu-accent)] fill-[var(--color-imamu-accent)]/20 shrink-0" /></span>
                </div>

                {/* Handle & Instagram-style Stats Row (Unboxed) */}
                <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm pt-0.5">
                  <span className="text-neutral-400 font-sans" dir="ltr">@{account.handle.replace(/^@/, '')}</span>
                  <span className="text-neutral-700">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-sm sm:text-base font-sans">{articlesList.length}</span>
                    <span className="text-neutral-400 text-xs sm:text-sm font-sans">منشور</span>
                  </div>
                  <span className="text-neutral-700">•</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-sm sm:text-base font-sans">{followersCount}</span>
                    <span className="text-neutral-400 text-xs sm:text-sm font-sans">متابع</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons: Follow & Manager Settings */}
            <div className="flex items-center gap-3 w-full sm:w-auto pt-2 sm:pt-0">
              <button
                onClick={handleToggleFollow}
                className={`flex-1 sm:flex-initial px-7 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg cursor-pointer ${
                  isFollowing
                    ? 'bg-neutral-900 hover:bg-neutral-800 text-white border border-neutral-700'
                    : 'bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white'
                }`}
              >
                {isFollowing ? <UserCheck className="w-4 h-4 text-emerald-400" /> : <UserPlus className="w-4 h-4" />}
                <span>{isFollowing ? 'متابع' : 'متابعة'}</span>
              </button>

              {isManager && (
                <a
                  href={`/@/${encodeURIComponent(account.handle.replace(/^@/, ''))}/dashboard`}
                  className="px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-[var(--color-imamu-accent)] border border-[var(--color-imamu-accent)]/40 transition shadow-lg cursor-pointer whitespace-nowrap"
                >
                  <Settings className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                  <span>لوحة تحكم الجهة</span>
                </a>
              )}
            </div>
          </div>
        </div>

        {/* STRUCTURAL MAIN PAGE CONTAINER */}
        <div className="w-full bg-black min-h-screen">
          
          {/* Lowered Top Line Header with Tab Selector in Place */}
          <div className="w-full border-b border-neutral-800/80 bg-black select-none">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3">
              {/* Tab Selector aligned in Right Column */}
              <div className="lg:col-span-2 px-4 sm:px-8 pt-3 flex items-center gap-1" dir="rtl">
                <div className="relative pb-3 px-1 font-bold text-sm sm:text-base flex items-center gap-2 text-[var(--color-imamu-accent)]">
                  <Newspaper className="w-5 h-5 text-[var(--color-imamu-accent)] shrink-0" />
                  <span>المنشورات والأخبار المقالية</span>
                  <motion.div
                    layoutId="profileFeedTabUnderline"
                    className="absolute bottom-0 right-0 left-0 h-0.5 bg-[var(--color-imamu-accent)] rounded-full shadow-xs"
                    transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
              </div>
              {/* Sidebar top header area placeholder (clean, no vertical lines above border-b) */}
              <div className="hidden lg:block lg:col-span-1" />
            </div>
          </div>

          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 min-h-screen">
            
            {/* RIGHT SIDE (Column 1 & 2 in RTL): Articles Feed */}
            <div className="lg:col-span-2 p-4 sm:p-8 space-y-6 lg:border-l lg:border-neutral-800/80">
              {/* Articles Feed Content */}
              {articlesList.length === 0 ? (
                <div className="py-20 text-center text-sm text-neutral-400 bg-neutral-900/30 rounded-2xl border border-neutral-800/80">
                  لا توجد أخبار مقالية منشورات من حساب هذه الجهة حالياً.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                  <div className="flex flex-col gap-6 w-full">
                    {articlesList.filter((_, idx) => idx % 2 === 0).map((art: any) => (
                      <SpotlightCard
                        key={art.id}
                        onClick={() => handleOpenArticle(art)}
                        className="w-full cursor-pointer border-neutral-800 bg-neutral-900/50 p-6 hover:border-[var(--color-imamu-accent)] transition duration-200 shadow-md"
                      >
                        <div>
                          {/* Author & Category Header */}
                          <div className="flex items-start justify-between gap-2 mb-4">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-xs text-neutral-300 overflow-hidden shrink-0">
                                {account.profilePicUrl ? (
                                  <img src={account.profilePicUrl} alt={account.displayName || account.handle} className="w-full h-full object-cover" />
                                ) : (
                                  (account.displayName || account.handle).charAt(0)
                                )}
                              </div>
                              <div className="flex flex-col text-right min-w-0">
                                <span className="text-xs font-bold text-white line-clamp-1">{account.displayName || account.handle}</span>
                                <span className="text-[10px] text-neutral-400 flex items-center gap-1 min-w-0 truncate">
                                  <span className="truncate" dir="ltr">@{account.handle.replace(/^@/, '')}</span>
                                  <span className="shrink-0">•</span>
                                  <span className="shrink-0">{formatDate(art.createdAt || art.date, 'ar-display')}</span>
                                </span>
                              </div>
                            </div>

                            {art.category && (
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-neutral-800/90 border border-neutral-700/80 text-[var(--color-imamu-accent)] text-[10px] font-bold shadow-2xs shrink-0">
                                {getArabicCategoryLabel(art.category, art.summary, art.content, art.title)}
                              </span>
                            )}
                          </div>

                          {art.title && art.title !== (account.displayName || account.handle) && (
                            <h4 className="text-sm font-bold text-white mb-2 leading-snug">
                              {art.title}
                            </h4>
                          )}

                          <div className="mb-4">
                            <FormattedNewsContent 
                              content={art.content} 
                              truncateLines={4} 
                              className="text-xs text-neutral-300 leading-relaxed" 
                            />
                          </div>

                          {/* Media Preview Component matching NewsPage */}
                          <NewsMediaPreview 
                            imageUrl={art.imageUrl}
                            title={art.title}
                            onImageClick={(e) => {
                              e.stopPropagation();
                              setViewerImageUrl(art.imageUrl || null);
                            }}
                          />
                        </div>

                        {/* Bottom Actions Row matching NewsPage */}
                        <div className="flex items-center justify-between border-t border-neutral-800/60 pt-3.5 text-xs text-neutral-400 mt-2">
                          <button
                            onClick={(e) => handleToggleArticleLike(art.id, e)}
                            className="flex items-center gap-1.5 hover:text-rose-500 transition cursor-pointer"
                          >
                            <Heart className={`w-4 h-4 ${art.isLiked ? 'fill-rose-600 text-rose-600' : 'text-neutral-400'}`} />
                            <span>{art.likes ?? art.likesCount ?? 0}</span>
                          </button>

                          <div className="flex items-center gap-3">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenArticle(art);
                              }}
                              className="flex items-center gap-1 hover:text-[var(--color-imamu-accent)] transition"
                            >
                              <MessageSquare className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                              <span>{art.commentsCount || 0}</span>
                            </button>

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                  navigator.clipboard.writeText(`${window.location.origin}/news?id=${art.id}`);
                                }
                              }}
                              className="hover:text-white transition p-1"
                              title="مشاركة الخبر"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </SpotlightCard>
                    ))}
                  </div>

                  <div className="flex flex-col gap-6 w-full">
                    {articlesList.filter((_, idx) => idx % 2 === 1).map((art: any) => (
                      <SpotlightCard
                        key={art.id}
                        onClick={() => handleOpenArticle(art)}
                        className="w-full cursor-pointer border-neutral-800 bg-neutral-900/50 p-6 hover:border-[var(--color-imamu-accent)] transition duration-200 shadow-md"
                      >
                        <div>
                          {/* Author & Category Header */}
                          <div className="flex items-start justify-between gap-2 mb-4">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-xs text-neutral-300 overflow-hidden shrink-0">
                                {account.profilePicUrl ? (
                                  <img src={account.profilePicUrl} alt={account.displayName || account.handle} className="w-full h-full object-cover" />
                                ) : (
                                  (account.displayName || account.handle).charAt(0)
                                )}
                              </div>
                              <div className="flex flex-col text-right min-w-0">
                                <span className="text-xs font-bold text-white line-clamp-1">{account.displayName || account.handle}</span>
                                <span className="text-[10px] text-neutral-400 flex items-center gap-1 min-w-0 truncate">
                                  <span className="truncate" dir="ltr">@{account.handle.replace(/^@/, '')}</span>
                                  <span className="shrink-0">•</span>
                                  <span className="shrink-0">{formatDate(art.createdAt || art.date, 'ar-display')}</span>
                                </span>
                              </div>
                            </div>

                            {art.category && (
                              <span className="inline-block px-2.5 py-0.5 rounded-full bg-neutral-800/90 border border-neutral-700/80 text-[var(--color-imamu-accent)] text-[10px] font-bold shadow-2xs shrink-0">
                                {getArabicCategoryLabel(art.category, art.summary, art.content, art.title)}
                              </span>
                            )}
                          </div>

                          {art.title && art.title !== (account.displayName || account.handle) && (
                            <h4 className="text-sm font-bold text-white mb-2 leading-snug">
                              {art.title}
                            </h4>
                          )}

                          <div className="mb-4">
                            <FormattedNewsContent 
                              content={art.content} 
                              truncateLines={4} 
                              className="text-xs text-neutral-300 leading-relaxed" 
                            />
                          </div>

                          {/* Media Preview Component matching NewsPage */}
                          <NewsMediaPreview 
                            imageUrl={art.imageUrl}
                            title={art.title}
                            onImageClick={(e) => {
                              e.stopPropagation();
                              setViewerImageUrl(art.imageUrl || null);
                            }}
                          />
                        </div>

                        {/* Bottom Actions Row matching NewsPage */}
                        <div className="flex items-center justify-between border-t border-neutral-800/60 pt-3.5 text-xs text-neutral-400 mt-2">
                          <button
                            onClick={(e) => handleToggleArticleLike(art.id, e)}
                            className="flex items-center gap-1.5 hover:text-rose-500 transition cursor-pointer"
                          >
                            <Heart className={`w-4 h-4 ${art.isLiked ? 'fill-rose-600 text-rose-600' : 'text-neutral-400'}`} />
                            <span>{art.likes ?? art.likesCount ?? 0}</span>
                          </button>

                          <div className="flex items-center gap-3">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenArticle(art);
                              }}
                              className="flex items-center gap-1 hover:text-[var(--color-imamu-accent)] transition"
                            >
                              <MessageSquare className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                              <span>{art.commentsCount || 0}</span>
                            </button>

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                  navigator.clipboard.writeText(`${window.location.origin}/news?id=${art.id}`);
                                }
                              }}
                              className="hover:text-white transition p-1"
                              title="مشاركة الخبر"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </SpotlightCard>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* LEFT SIDEBAR (Column 3 in RTL): Lowered Full-Height Column with Left & Right Borders */}
            <div className="lg:col-span-1 bg-neutral-900/30 border-b lg:border-b-0 border-l border-r border-neutral-800 text-right min-h-full h-full">
              <div className="p-6 sm:p-8 pt-8 sm:pt-12 space-y-7 lg:sticky lg:top-24">
                {/* Account Stats Metrics Section (Instagram Style - Minimal Unboxed & Centered) */}
                <div className="pb-5 border-b border-neutral-800/50">
                  <div className="flex items-center justify-center gap-8 py-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-sans text-white">
                        {articlesList.length}
                      </span>
                      <span className="text-xs font-bold text-neutral-300">منشور</span>
                    </div>

                    <div className="w-px h-6 bg-neutral-800/80" />

                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-sans text-white">
                        {followersCount}
                      </span>
                      <span className="text-xs font-bold text-neutral-300">متابع</span>
                    </div>
                  </div>
                </div>

                {/* Bio Section */}
                {account.bio && (
                  <div className="space-y-2 pb-5 border-b border-neutral-800/50">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-imamu-accent)]">
                      النبذة التعريفية
                    </h3>
                    <p className="text-sm text-neutral-200 leading-relaxed font-normal">
                      {account.bio}
                    </p>
                  </div>
                )}

                {/* External Links Section */}
                {linksList.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                      الروابط الخارجية والحسابات
                    </h3>
                    <div className="flex flex-col gap-2">
                      {linksList.map((lnk, idx) => {
                        const meta = getSocialLinkMeta(lnk.url, lnk.title);
                        return (
                          <a
                            key={idx}
                            href={lnk.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between py-2.5 px-3.5 rounded-2xl bg-neutral-900/40 hover:bg-neutral-800/70 text-xs font-bold transition group border border-neutral-800/40 hover:border-neutral-700/60"
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              {meta.icon}
                              <span className={`truncate ${meta.colorClass} transition`}>{meta.label}</span>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 text-neutral-400 group-hover:text-white transition shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {!account.bio && linksList.length === 0 && (
                  <div className="text-xs text-neutral-500 py-2">
                    لا توجد نبذة أو روابط إضافية مضافة لهذا الحساب حالياً.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>



        {/* Article Detail Modal */}
        {selectedArticle && (
          <NewsDetailModal
            item={selectedArticle}
            onClose={() => setSelectedArticle(null)}
            currentUser={currentUser}
            dbUser={dbUser}
            onLikeToggle={(id, newLiked, newCount) => {
              setAccount((prev: any) => prev ? {
                ...prev,
                articles: (prev.articles || []).map((art: any) => {
                  if (art.id === id) {
                    const isLiked = newLiked !== undefined ? newLiked : !art.isLiked;
                    const count = art.likes ?? art.likesCount ?? 0;
                    const likesCount = newCount !== undefined ? newCount : (isLiked ? count + 1 : Math.max(0, count - 1));
                    return { ...art, isLiked, likes: likesCount, likesCount };
                  }
                  return art;
                })
              } : null);
            }}
          />
        )}
      </div>
    );
  }

  const modalBodyContent = (
    <motion.div
      initial={{ opacity: 0, y: 25, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.97 }}
      onClick={(e) => e.stopPropagation()}
      className="relative bg-neutral-950 border border-neutral-800 rounded-[2.5rem] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl text-right text-white"
    >
      {/* Custom In-App Toast Notification Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-[160] py-2.5 px-4 rounded-full flex items-center gap-3 text-xs font-bold shadow-2xl border backdrop-blur-xl bg-neutral-900/95 border-[var(--color-imamu-accent)]/40 text-[var(--color-imamu-accent)] max-w-md pointer-events-auto"
          >
            <span>{toast.message}</span>
            <button type="button" onClick={() => setToast(null)} className="p-0.5 hover:bg-white/10 rounded-full transition shrink-0 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cover Banner Header */}
      <div className="relative h-48 sm:h-64 bg-neutral-900 border-b border-neutral-800/60 shrink-0">
        {account.bannerUrl ? (
          <img src={account.bannerUrl} alt="Cover" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-neutral-950 via-neutral-900 to-amber-950/40 flex items-center justify-center">
            <Layout className="w-16 h-16 text-neutral-800 opacity-40" />
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 flex items-center gap-1.5 px-4 py-2 bg-black/70 backdrop-blur-md text-white hover:bg-black/90 rounded-full transition border border-white/10 z-20 cursor-pointer shadow-lg text-xs font-bold"
        >
          <X className="w-4 h-4" />
          <span>إغلاق</span>
        </button>
      </div>

      {/* Profile Avatar & Header Row */}
      <div className="px-6 sm:px-8 pb-6 border-b border-neutral-800/60 bg-neutral-950 relative shrink-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-14 sm:-mt-18 mb-4 relative z-10">
          {/* Avatar */}
          <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-neutral-950 bg-neutral-900 overflow-hidden shadow-2xl shrink-0 flex items-center justify-center ring-2 ring-white/10">
            {account.profilePicUrl ? (
              <img src={account.profilePicUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-4xl font-bold text-white">
                {(account.displayName || account.handle).charAt(0)}
              </span>
            )}
          </div>

          {/* Follow & Dashboard Buttons Row */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleToggleFollow}
              className={`flex-1 sm:flex-initial px-6 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-md cursor-pointer ${
                isFollowing
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-white border border-neutral-700'
                  : 'bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white'
              }`}
            >
              {isFollowing ? <UserCheck className="w-4 h-4 text-emerald-400" /> : <UserPlus className="w-4 h-4" />}
              <span>{isFollowing ? 'متابع' : 'متابعة'}</span>
            </button>

            {/* Entity Account Settings Button for Managers */}
            {isManager && (
              <a
                href={`/@/${encodeURIComponent(account.handle.replace(/^@/, ''))}/dashboard`}
                className="px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-[var(--color-imamu-accent)] border border-[var(--color-imamu-accent)]/40 transition shadow-md cursor-pointer whitespace-nowrap"
              >
                <Settings className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                <span>لوحة تحكم الجهة</span>
              </a>
            )}
          </div>
        </div>

        {/* Title & Bio Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-normal">
              {account.displayName || account.handle}
            </h1>
            <span title="حساب جهة موثق"><BadgeCheck className="w-5 h-5 text-[var(--color-imamu-accent)] fill-[var(--color-imamu-accent)]/20 shrink-0" /></span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm pt-0.5">
            <span className="text-neutral-400 font-sans" dir="ltr">@{account.handle.replace(/^@/, '')}</span>
            <span className="text-neutral-700">•</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white font-sans">{articlesList.length}</span>
              <span className="text-neutral-400 font-sans">منشور</span>
            </div>
            <span className="text-neutral-700">•</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white font-sans">{followersCount}</span>
              <span className="text-neutral-400 font-sans">متابع</span>
            </div>
          </div>

          {account.bio && (
            <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed pt-1 max-w-3xl">
              {account.bio}
            </p>
          )}

          {/* Custom External Links */}
          {linksList.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
              {linksList.map((lnk, idx) => {
                const meta = getSocialLinkMeta(lnk.url, lnk.title);
                return (
                  <a
                    key={idx}
                    href={lnk.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-300 hover:text-white transition group bg-neutral-900/60 hover:bg-neutral-800 px-3 py-1.5 rounded-full border border-neutral-800"
                  >
                    {meta.icon}
                    <span>{meta.label}</span>
                    <ExternalLink className="w-3 h-3 text-neutral-500 group-hover:text-white transition opacity-80" />
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Articles Published Feed */}
      <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar flex-1 space-y-4">
        <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
          <Newspaper className="w-5 h-5 text-[var(--color-imamu-accent)]" />
          <span>المنشورات والأخبار المقالية</span>
        </h3>

        {articlesList.length === 0 ? (
          <div className="py-16 text-center text-xs text-neutral-500 bg-neutral-900/30 rounded-3xl border border-neutral-800">
            لا توجد أخبار مقالية منشورات من حساب هذه الجهة حالياً.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            <div className="flex flex-col gap-5 w-full">
              {articlesList.filter((_, idx) => idx % 2 === 0).map((art: any) => (
                <SpotlightCard
                  key={art.id}
                  onClick={() => handleOpenArticle(art)}
                  className="w-full cursor-pointer border-neutral-800 bg-neutral-900/50 p-5 hover:border-[var(--color-imamu-accent)] transition duration-200 shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-[11px] text-neutral-300 overflow-hidden shrink-0">
                          {account.profilePicUrl ? (
                            <img src={account.profilePicUrl} alt={account.displayName || account.handle} className="w-full h-full object-cover" />
                          ) : (
                            (account.displayName || account.handle).charAt(0)
                          )}
                        </div>
                        <div className="flex flex-col text-right min-w-0">
                          <span className="text-xs font-bold text-white line-clamp-1">{account.displayName || account.handle}</span>
                          <span className="text-[10px] text-neutral-400 flex items-center gap-1 min-w-0 truncate">
                            <span className="truncate" dir="ltr">@{account.handle.replace(/^@/, '')}</span>
                            <span className="shrink-0">•</span>
                            <span className="shrink-0">{formatDate(art.createdAt || art.date, 'ar-display')}</span>
                          </span>
                        </div>
                      </div>

                      {art.category && (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-neutral-800/90 border border-neutral-700/80 text-[var(--color-imamu-accent)] text-[10px] font-bold shadow-2xs shrink-0">
                          {getArabicCategoryLabel(art.category, art.summary, art.content, art.title)}
                        </span>
                      )}
                    </div>

                    {art.title && art.title !== (account.displayName || account.handle) && (
                      <h4 className="text-sm font-bold text-white mb-2 leading-snug">
                        {art.title}
                      </h4>
                    )}

                    <div className="mb-3">
                      <FormattedNewsContent
                        content={art.content}
                        truncateLines={3}
                        className="text-xs text-neutral-300 leading-relaxed"
                      />
                    </div>

                    <NewsMediaPreview 
                      imageUrl={art.imageUrl}
                      title={art.title}
                      onImageClick={(e) => {
                        e.stopPropagation();
                        setViewerImageUrl(art.imageUrl || null);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-neutral-800/60 text-xs text-neutral-400 mt-2">
                    <button
                      onClick={(e) => handleToggleArticleLike(art.id, e)}
                      className="flex items-center gap-1.5 hover:text-rose-500 transition cursor-pointer"
                    >
                      <Heart className={`w-4 h-4 ${art.isLiked ? 'fill-rose-600 text-rose-600' : 'text-neutral-400'}`} />
                      <span>{art.likes ?? art.likesCount ?? 0}</span>
                    </button>

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenArticle(art);
                        }}
                        className="flex items-center gap-1 hover:text-[var(--color-imamu-accent)] transition"
                      >
                        <MessageSquare className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                        <span>{art.commentsCount || 0}</span>
                      </button>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText(`${window.location.origin}/news?id=${art.id}`);
                          }
                        }}
                        className="hover:text-white transition p-1"
                        title="مشاركة الخبر"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </SpotlightCard>
              ))}
            </div>

            <div className="flex flex-col gap-5 w-full">
              {articlesList.filter((_, idx) => idx % 2 === 1).map((art: any) => (
                <SpotlightCard
                  key={art.id}
                  onClick={() => handleOpenArticle(art)}
                  className="w-full cursor-pointer border-neutral-800 bg-neutral-900/50 p-5 hover:border-[var(--color-imamu-accent)] transition duration-200 shadow-md"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-[11px] text-neutral-300 overflow-hidden shrink-0">
                          {account.profilePicUrl ? (
                            <img src={account.profilePicUrl} alt={account.displayName || account.handle} className="w-full h-full object-cover" />
                          ) : (
                            (account.displayName || account.handle).charAt(0)
                          )}
                        </div>
                        <div className="flex flex-col text-right min-w-0">
                          <span className="text-xs font-bold text-white line-clamp-1">{account.displayName || account.handle}</span>
                          <span className="text-[10px] text-neutral-400 flex items-center gap-1 min-w-0 truncate">
                            <span className="truncate" dir="ltr">@{account.handle.replace(/^@/, '')}</span>
                            <span className="shrink-0">•</span>
                            <span className="shrink-0">{formatDate(art.createdAt || art.date, 'ar-display')}</span>
                          </span>
                        </div>
                      </div>

                      {art.category && (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-neutral-800/90 border border-neutral-700/80 text-[var(--color-imamu-accent)] text-[10px] font-bold shadow-2xs shrink-0">
                          {getArabicCategoryLabel(art.category, art.summary, art.content, art.title)}
                        </span>
                      )}
                    </div>

                    {art.title && art.title !== (account.displayName || account.handle) && (
                      <h4 className="text-sm font-bold text-white mb-2 leading-snug">
                        {art.title}
                      </h4>
                    )}

                    <div className="mb-3">
                      <FormattedNewsContent
                        content={art.content}
                        truncateLines={3}
                        className="text-xs text-neutral-300 leading-relaxed"
                      />
                    </div>

                    <NewsMediaPreview 
                      imageUrl={art.imageUrl}
                      title={art.title}
                      onImageClick={(e) => {
                        e.stopPropagation();
                        setViewerImageUrl(art.imageUrl || null);
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-neutral-800/60 text-xs text-neutral-400 mt-2">
                    <button
                      onClick={(e) => handleToggleArticleLike(art.id, e)}
                      className="flex items-center gap-1.5 hover:text-rose-500 transition cursor-pointer"
                    >
                      <Heart className={`w-4 h-4 ${art.isLiked ? 'fill-rose-600 text-rose-600' : 'text-neutral-400'}`} />
                      <span>{art.likes ?? art.likesCount ?? 0}</span>
                    </button>

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenArticle(art);
                        }}
                        className="flex items-center gap-1 hover:text-[var(--color-imamu-accent)] transition"
                      >
                        <MessageSquare className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                        <span>{art.commentsCount || 0}</span>
                      </button>

                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (typeof navigator !== 'undefined' && navigator.clipboard) {
                            navigator.clipboard.writeText(`${window.location.origin}/news?id=${art.id}`);
                          }
                        }}
                        className="hover:text-white transition p-1"
                        title="مشاركة الخبر"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </SpotlightCard>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );

  return (
    <>
      <AnimatePresence>
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto"
          onClick={onClose}
          dir="rtl"
        >
          {modalBodyContent}
        </div>
      </AnimatePresence>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <NewsDetailModal
          item={selectedArticle}
          onClose={() => setSelectedArticle(null)}
          currentUser={currentUser}
          dbUser={dbUser}
          onLikeToggle={(id, newLiked, newCount) => {
            setAccount((prev: any) => prev ? {
              ...prev,
              articles: (prev.articles || []).map((art: any) => {
                if (art.id === id) {
                  const isLiked = newLiked !== undefined ? newLiked : !art.isLiked;
                  const count = art.likes ?? art.likesCount ?? 0;
                  const likesCount = newCount !== undefined ? newCount : (isLiked ? count + 1 : Math.max(0, count - 1));
                  return { ...art, isLiked, likes: likesCount, likesCount };
                }
                return art;
              })
            } : null);
          }}
        />
      )}

      {/* Fullscreen Image Lightbox Viewer Modal */}
      <ImageViewerModal
        imageUrl={viewerImageUrl}
        onClose={() => setViewerImageUrl(null)}
      />
    </>
  );
}

export default AuthenticatedAccountProfileModal;
