'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';
import { 
  Newspaper, Heart, MessageSquare, Share2, Eye, Clock, 
  ChevronLeft, ThumbsUp, Send, User, Check, Sparkles, Image, Video, X, Trash2, Maximize2,
  Search, TrendingUp, Flame, Hash, Filter, CheckCircle2, UserCheck, UserPlus, ExternalLink,
  Users
} from 'lucide-react';
import { InView, SpotlightCard } from '../components/ui';
import { FormattedNewsContent } from '../components/FormattedNewsContent';
import { NewsDetailModal } from '../components/NewsDetailModal';
import { ImageViewerModal } from '../components/ImageViewerModal';
import { NewsMediaPreview } from '../components/NewsMediaPreview';
import { formatDate } from '../lib/date-utils';
import { getArabicCategoryLabel } from '../lib/textHelpers';
import { useSWR } from '../lib/swr';

interface Comment {
  id: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  profilePicUrl?: string;
}

interface NewsItem {
  id: number;
  title: string;
  content: string;
  summary?: string;
  category: string;
  author: string;
  authorHandle?: string;
  authorAvatar?: string;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  views: number;
  likes?: number;
  likesCount?: number;
  isLiked?: boolean;
  commentsCount: number;
  createdAt: string;
  isFeatured?: boolean;
  source?: string;
}

interface AccountItem {
  id: number;
  handle: string;
  displayName: string;
  bio?: string;
  bannerUrl?: string;
  profilePicUrl?: string;
  followersCount: number;
  isFollowing?: boolean;
  isManager?: boolean;
}

export function NewsPage() {
  const router = useRouter();
  const { user, dbUser } = useAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [followingAccIds, setFollowingAccIds] = useState<Set<number>>(new Set());
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<'articles' | 'accounts'>('articles');
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  const [isFeaturedImageValid, setIsFeaturedImageValid] = useState<boolean>(true);

  const handleOpenNewsModal = (item: NewsItem) => {
    if (!item) return;
    const authorName = item.author || (item as any).authorName || (item.source ? `@${item.source.replace(/^@/, '')}` : 'إدارة الأخبار');
    const authorHandle = item.authorHandle || (item.source ? `@${item.source.replace(/^@/, '')}` : '@IMAMU');
    setSelectedNews({
      ...item,
      author: authorName,
      authorHandle: authorHandle
    });
  };

  const handleAuthorClick = (handleOrSource?: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!handleOrSource) return;
    const cleanHandle = handleOrSource.replace(/^@/, '');
    router.push(`/account/${encodeURIComponent(cleanHandle)}`);
  };

  const categories = [
    { id: 'all', label: 'جميع الأخبار' },
    { id: 'academic', label: 'أكاديمي' },
    { id: 'events', label: 'فعاليات' },
    { id: 'announcements', label: 'تنبيهات عاجلة' },
    { id: 'campus', label: 'جامعي' },
    { id: 'general', label: 'أخبار عامة' },
  ];

  const { data: newsData, mutate: refreshNews } = useSWR<any[]>('/api/news');
  const { data: accountsData, mutate: refreshAccounts } = useSWR<any[]>('/api/authenticated-accounts');

  useEffect(() => {
    if (Array.isArray(newsData)) {
      setNews(newsData);
    }
  }, [newsData]);

  useEffect(() => {
    if (Array.isArray(accountsData)) {
      setAccounts(accountsData);
    }
  }, [accountsData]);

  useEffect(() => {
    if (user) {
      refreshAccounts();
    }
  }, [user, refreshAccounts]);

  const fetchNews = async () => {
    refreshNews();
  };

  const fetchAccounts = async () => {
    refreshAccounts();
  };

  const handleLike = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      router.push('/login');
      return;
    }

    const target = news.find(n => n.id === id);
    if (!target) return;

    const prevLiked = target.isLiked;
    const prevCount = target.likes ?? target.likesCount ?? 0;
    const optLiked = !prevLiked;
    const optCount = optLiked ? prevCount + 1 : Math.max(0, prevCount - 1);

    // Optimistic update
    setNews(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, isLiked: optLiked, likes: optCount, likesCount: optCount };
      }
      return item;
    }));

    if (selectedNews && selectedNews.id === id) {
      setSelectedNews(prev => prev ? { ...prev, isLiked: optLiked, likes: optCount, likesCount: optCount } : null);
    }

    try {
      const token = await user.getIdToken();
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/news/${id}/like`, { method: 'POST', headers });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data) {
          const finalLiked = data.isLiked ?? data.liked ?? optLiked;
          const finalCount = data.likesCount ?? data.likes ?? optCount;

          setNews(prev => prev.map(item => {
            if (item.id === id) {
              return { ...item, isLiked: finalLiked, likes: finalCount, likesCount: finalCount };
            }
            return item;
          }));

          if (selectedNews && selectedNews.id === id) {
            setSelectedNews(prev => prev ? { ...prev, isLiked: finalLiked, likes: finalCount, likesCount: finalCount } : null);
          }
        }
      } else {
        // Revert on error
        setNews(prev => prev.map(item => {
          if (item.id === id) {
            return { ...item, isLiked: prevLiked, likes: prevCount, likesCount: prevCount };
          }
          return item;
        }));
        if (selectedNews && selectedNews.id === id) {
          setSelectedNews(prev => prev ? { ...prev, isLiked: prevLiked, likes: prevCount, likesCount: prevCount } : null);
        }
      }
    } catch (e) {
      console.error('Failed to toggle like', e);
      // Revert on exception
      setNews(prev => prev.map(item => {
        if (item.id === id) {
          return { ...item, isLiked: prevLiked, likes: prevCount, likesCount: prevCount };
        }
        return item;
      }));
      if (selectedNews && selectedNews.id === id) {
        setSelectedNews(prev => prev ? { ...prev, isLiked: prevLiked, likes: prevCount, likesCount: prevCount } : null);
      }
    }
  };

  const handleFollowAccount = async (accId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      router.push('/login');
      return;
    }
    if (followingAccIds.has(accId)) return;
    setFollowingAccIds(prev => new Set(prev).add(accId));

    const targetAcc = accounts.find(a => a.id === accId);
    if (!targetAcc) {
      setFollowingAccIds(prev => {
        const next = new Set(prev);
        next.delete(accId);
        return next;
      });
      return;
    }

    const prevFollowing = !!targetAcc.isFollowing;
    const prevCount = targetAcc.followersCount || 0;
    const nextFollowing = !prevFollowing;
    const nextCount = nextFollowing ? prevCount + 1 : Math.max(0, prevCount - 1);

    // Immediate optimistic update
    setAccounts(prev => prev.map(a => 
      a.id === accId ? { ...a, isFollowing: nextFollowing, followersCount: nextCount } : a
    ));

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/authenticated-accounts/${accId}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(prev => prev.map(a => {
          if (a.id === accId) {
            return {
              ...a,
              isFollowing: data.isFollowing,
              followersCount: data.followersCount
            };
          }
          return a;
        }));
        // Re-sync SWR
        refreshAccounts();
      } else {
        // Rollback on server error
        setAccounts(prev => prev.map(a => 
          a.id === accId ? { ...a, isFollowing: prevFollowing, followersCount: prevCount } : a
        ));
      }
    } catch (e) {
      console.error('Failed to follow account', e);
      setAccounts(prev => prev.map(a => 
        a.id === accId ? { ...a, isFollowing: prevFollowing, followersCount: prevCount } : a
      ));
    } finally {
      setFollowingAccIds(prev => {
        const next = new Set(prev);
        next.delete(accId);
        return next;
      });
    }
  };

  // Dynamically extract trending hashtags from news content
  const trendingHashtags = useMemo(() => {
    const counts: Record<string, number> = {};
    const hashtagRegex = /#([\u0600-\u06FF\w_]+)/g;

    news.forEach(item => {
      const text = `${item.title || ''} ${item.content || ''}`;
      const matches = text.match(hashtagRegex);
      if (matches) {
        const uniqueInItem = new Set(matches.map(m => m.trim()));
        uniqueInItem.forEach(tag => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
    });

    const extracted = Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    const defaultHashtags = [
      { tag: '#جامعة_الإمام', count: Math.max(news.length, 14) },
      { tag: '#قبول_1446', count: 9 },
      { tag: '#التقويم_الأكاديمي', count: 7 },
      { tag: '#فعاليات_الإمام', count: 6 },
      { tag: '#الخدمات_الطلابية', count: 5 },
      { tag: '#المكتبة_المركزية', count: 4 },
    ];

    const mergedMap = new Map<string, number>();
    defaultHashtags.forEach(h => mergedMap.set(h.tag, h.count));
    extracted.forEach(h => mergedMap.set(h.tag, (mergedMap.get(h.tag) || 0) + h.count));

    return Array.from(mergedMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [news]);

  // Compute top 10 authenticated accounts
  const top10Accounts = useMemo(() => {
    return [...accounts]
      .sort((a, b) => (b.followersCount || 0) - (a.followersCount || 0))
      .slice(0, 10);
  }, [accounts]);

  const matchesCategory = (item: NewsItem, catId: string) => {
    if (catId === 'all') return true;
    const label = getArabicCategoryLabel(item.category, (item as any).tag || item.summary, item.content, item.title);
    if (catId === 'academic') return label === 'أكاديمي';
    if (catId === 'events') return label === 'فعاليات';
    if (catId === 'announcements') return label === 'تنبيهات عاجلة';
    if (catId === 'campus') return label === 'جامعي';
    if (catId === 'general') return label === 'أخبار عامة' || label === 'أخبار الجامعة';
    return item.category?.toLowerCase() === catId.toLowerCase();
  };

  const featuredItem = news.find(n => n.isFeatured) || news[0];

  // Search filtering logic
  const filteredAccounts = useMemo(() => {
    if (!searchQuery.trim()) return accounts;
    const q = searchQuery.toLowerCase().replace(/^#/, '').trim();
    return accounts.filter(acc => 
      (acc.displayName && acc.displayName.toLowerCase().includes(q)) ||
      (acc.handle && acc.handle.toLowerCase().includes(q)) ||
      (acc.bio && acc.bio.toLowerCase().includes(q))
    );
  }, [accounts, searchQuery]);

  const filteredNews = useMemo(() => {
    let result = news.filter(n => matchesCategory(n, activeCategory));

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const cleanQ = q.replace(/^#/, '');
      result = result.filter(n => 
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q)) ||
        (n.title && n.title.toLowerCase().includes(cleanQ)) ||
        (n.content && n.content.toLowerCase().includes(cleanQ)) ||
        (n.author && n.author.toLowerCase().includes(cleanQ)) ||
        (n.authorHandle && n.authorHandle.toLowerCase().includes(cleanQ)) ||
        (n.category && n.category.toLowerCase().includes(cleanQ))
      );
    }

    if (searchQuery.trim()) {
      return result;
    }

    return result.filter(n => !featuredItem || n.id !== featuredItem.id);
  }, [news, activeCategory, searchQuery, featuredItem]);

  const isSearching = searchQuery.trim().length > 0;
  const showArticles = searchFilter === 'articles';
  const showAccounts = searchFilter === 'accounts';

  return (
    <div className="flex flex-col flex-1 w-full pb-24 px-4 sm:px-6 lg:px-8 pt-8 relative max-w-7xl mx-auto text-right min-h-screen" dir="rtl">
      
      {/* Page Header */}
      <div className="mb-6 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs sm:text-sm font-semibold tracking-widest text-[var(--color-imamu-accent)] uppercase mb-1 block">
            التحديثات والحسابات الرسمية
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900 dark:text-white mb-2">أخبار وحسابات جامعة الإمام</h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl">
            متابعة التحديثات والأخبار الأكاديمية والبحث الشامل في المقالات والحسابات الرسمية الموثقة.
          </p>
        </div>
      </div>

      {/* Modern Search Engine Bar & Hashtags Strip - Directly on Background */}
      <InView preset="fade-up" delay={0.05} className="mb-8 w-full">
        {/* Main Search Input & Filter Switcher Row */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
          {/* Main Search Input */}
          <div className="relative flex items-center flex-1 w-full">
            <div className="absolute right-4 pointer-events-none text-slate-400 dark:text-zinc-500">
              <Search className="w-5 h-5" />
            </div>
            
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في الأخبار، المواضيع، أو الحسابات الموثقة (مثال: قبول، #جامعة_الإمام، عمادة...)"
              className="w-full pr-12 pl-10 py-3.5 bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-200/80 dark:border-zinc-700/70 rounded-2xl text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:border-[var(--color-imamu-accent)] focus:ring-2 focus:ring-[var(--color-imamu-accent)]/20 transition shadow-xs"
            />

            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-400 hover:text-slate-600 dark:text-zinc-400 dark:hover:text-white transition"
                title="مسح البحث"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Filter Mode Switcher matching exact size & styling of Search Bar */}
          <div className="flex items-center gap-1.5 h-[50px] p-1.5 bg-slate-100/90 dark:bg-zinc-800/90 border border-slate-200/80 dark:border-zinc-700/70 rounded-2xl shrink-0 justify-center">
            <button
              onClick={() => setSearchFilter('articles')}
              className={`h-full px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                searchFilter === 'articles'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Newspaper className="w-4 h-4 text-[var(--color-imamu-accent)]" />
              <span>الأخبار ({filteredNews.length})</span>
            </button>

            <button
              onClick={() => setSearchFilter('accounts')}
              className={`h-full px-4 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                searchFilter === 'accounts'
                  ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Users className="w-4 h-4 text-amber-500" />
              <span>الحسابات ({filteredAccounts.length})</span>
            </button>
          </div>
        </div>
      </InView>

      {/* Account Results Section (Shows if searchFilter is accounts or when actively searching and accounts match) */}
      {(searchFilter === 'accounts' || (isSearching && showAccounts && filteredAccounts.length > 0)) && (
        <InView preset="fade-up" delay={0.1} className="mb-10 w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-[var(--color-imamu-accent)]" />
              <span>الحسابات الموثقة المطابقة ({filteredAccounts.length})</span>
            </h3>
            {searchFilter !== 'accounts' && (
              <button
                onClick={() => setSearchFilter('accounts')}
                className="text-xs font-bold text-[var(--color-imamu-accent)] hover:underline"
              >
                عرض كل الحسابات
              </button>
            )}
          </div>

          {filteredAccounts.length === 0 ? (
            <div className="p-8 text-center bg-slate-100/60 dark:bg-zinc-800/40 rounded-2xl border border-slate-200/60 dark:border-zinc-700/40 text-slate-500 dark:text-zinc-400 text-sm">
              لم نجد أي حسابات موثقة تطابق كلمة البحث "{searchQuery}"
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAccounts.map((acc) => (
                <div
                  key={acc.id}
                  onClick={(e) => handleAuthorClick(acc.handle, e)}
                  className="bg-slate-100/70 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700/60 rounded-2xl p-4 hover:border-[var(--color-imamu-accent)] transition cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full bg-slate-200 dark:bg-zinc-700 border border-slate-300 dark:border-zinc-600 flex items-center justify-center font-bold text-slate-700 dark:text-zinc-300 overflow-hidden shrink-0 group-hover:border-[var(--color-imamu-accent)] transition">
                      {acc.profilePicUrl ? (
                        <img 
                          src={acc.profilePicUrl} 
                          alt={acc.displayName} 
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        acc.displayName.charAt(0)
                      )}
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-[var(--color-imamu-accent)] transition">
                          {acc.displayName}
                        </h4>
                        <CheckCircle2 className="w-4 h-4 text-[var(--color-imamu-accent)] fill-[var(--color-imamu-accent)]/20 shrink-0" />
                      </div>
                      <span className="text-xs text-slate-400 dark:text-zinc-500 block truncate" dir="ltr">
                        @{acc.handle.replace(/^@/, '')}
                      </span>
                    </div>
                  </div>

                  {acc.bio && (
                    <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
                      {acc.bio}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-zinc-700/60 text-xs mt-auto">
                    <span className="text-slate-500 dark:text-zinc-400 text-[11px]">
                      {acc.followersCount || 0} متابع
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleFollowAccount(acc.id, e)}
                        disabled={followingAccIds.has(acc.id)}
                        className={`btn-rise px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 flex items-center gap-1 cursor-pointer active:scale-95 disabled:opacity-75 ${
                          acc.isFollowing
                            ? 'bg-slate-200 dark:bg-zinc-700 hover:bg-slate-300 dark:hover:bg-zinc-600 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-600'
                            : 'bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white shadow-2xs'
                        }`}
                      >
                        {acc.isFollowing ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                            <span>مُتابع</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>متابعة</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </InView>
      )}

      {/* Main Content Layout: Main Grid vs Sidebar Widgets */}
      {showArticles && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Main Articles Area */}
          <div className="lg:col-span-8 space-y-8 w-full">
            
            {/* Featured Hero Card (Only when not searching or on main view) */}
            {!isSearching && featuredItem && (
              <InView preset="fade-up" delay={0.1} className="w-full">
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-2xs relative overflow-hidden">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-7 items-center">
                    
                    <div className={`${(featuredItem.videoUrl || (featuredItem.imageUrl && isFeaturedImageValid)) ? 'lg:col-span-7' : 'lg:col-span-12'} flex flex-col items-start justify-center text-right order-2 lg:order-1 self-center`}>
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        <span className="px-3 py-1 rounded-full bg-stone-50 dark:bg-stone-950/50 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] text-xs font-bold border border-slate-200/80 dark:border-zinc-700/80">
                          أبرز التحديثات
                        </span>
                        <span className="px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] text-xs font-bold border border-slate-200 dark:border-zinc-700/80 shadow-2xs">
                          {getArabicCategoryLabel(featuredItem.category, (featuredItem as any).tag || featuredItem.summary, featuredItem.content, featuredItem.title)}
                        </span>
                      </div>

                      {featuredItem.title && featuredItem.title !== featuredItem.author && (
                        <h2 
                          onClick={() => handleOpenNewsModal(featuredItem)}
                          className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-2.5 leading-snug cursor-pointer hover:text-[var(--color-imamu-accent)] dark:hover:text-[var(--color-imamu-accent)] transition-colors"
                        >
                          {featuredItem.title}
                        </h2>
                      )}

                      <div 
                        onClick={() => handleOpenNewsModal(featuredItem)}
                        className="mb-4 cursor-pointer w-full"
                      >
                        <FormattedNewsContent 
                          content={featuredItem.content} 
                          truncateLines={3} 
                          className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed" 
                        />
                      </div>

                      <div className="flex items-center justify-between w-full border-t border-slate-100 dark:border-zinc-800 pt-3.5 mt-2">
                        <div 
                          onClick={(e) => handleAuthorClick(featuredItem.authorHandle || featuredItem.source || '@IMAMU', e)}
                          className="flex items-center gap-3 cursor-pointer group/author"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-zinc-300 overflow-hidden shrink-0 group-hover/author:border-[var(--color-imamu-accent)] transition">
                            {featuredItem.authorAvatar ? (
                              <img 
                                src={featuredItem.authorAvatar} 
                                alt={featuredItem.author || 'إدارة الأخبار'} 
                                className="w-full h-full rounded-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ) : (
                              (featuredItem.author || (featuredItem as any).authorName || featuredItem.source || 'إدارة الأخبار').charAt(0)
                            )}
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-xs font-bold text-slate-900 dark:text-white group-hover/author:text-[var(--color-imamu-accent)] transition">
                              {featuredItem.author || (featuredItem as any).authorName || (featuredItem.source ? `@${featuredItem.source.replace(/^@/, '')}` : 'إدارة الأخبار')}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                              <span>{featuredItem.authorHandle || (featuredItem.source ? `@${featuredItem.source.replace(/^@/, '')}` : '@IMAMU')}</span>
                              <span>•</span>
                              <span>{formatDate(featuredItem.createdAt, 'ar-display')}</span>
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-zinc-400">
                          <button 
                            onClick={(e) => handleLike(featuredItem.id, e)}
                            className={`flex items-center gap-1.5 transition ${featuredItem.isLiked ? 'text-rose-600 font-bold' : 'hover:text-rose-600'}`}
                          >
                            <Heart className={`w-4 h-4 ${featuredItem.isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                            <span>{featuredItem.likes ?? featuredItem.likesCount ?? 0}</span>
                          </button>
                          
                          <button 
                            onClick={() => handleOpenNewsModal(featuredItem)}
                            className="flex items-center gap-1.5 hover:text-[var(--color-imamu-accent)] transition"
                          >
                            <MessageSquare className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                            <span>{featuredItem.commentsCount ?? 0}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {(featuredItem.videoUrl || (featuredItem.imageUrl && isFeaturedImageValid)) && (
                      <div className="lg:col-span-5 order-1 lg:order-2 w-full">
                        {featuredItem.videoUrl ? (
                          <div 
                            onClick={() => setSelectedNews(featuredItem)}
                            className="w-full aspect-video rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 relative group cursor-pointer shadow-xs"
                          >
                            <iframe 
                              src={featuredItem.videoUrl} 
                              title={featuredItem.title}
                              className="w-full h-full border-0 pointer-events-none"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <NewsMediaPreview
                            imageUrl={featuredItem.imageUrl}
                            title={featuredItem.title}
                            onStatusChange={(status) => setIsFeaturedImageValid(status === 'valid')}
                            onImageClick={(e) => {
                              e.stopPropagation();
                              setViewerImageUrl(featuredItem.imageUrl || null);
                            }}
                            className="w-full aspect-video sm:aspect-[16/10] lg:aspect-[4/3] max-h-64 sm:max-h-72 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 relative group cursor-pointer shadow-xs"
                          />
                        )}
                      </div>
                    )}

                  </div>
                </div>
              </InView>
            )}

            {/* Category Filter Tabs Bar */}
            <div className="flex items-center gap-2 overflow-x-auto py-1.5 px-0.5 custom-scrollbar w-full max-w-full" dir="rtl">
              {categories.map((cat) => {
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition whitespace-nowrap border shrink-0 ${
                      isActive
                        ? 'bg-[var(--color-imamu-brown)] text-white border-[var(--color-imamu-brown)] shadow-xs'
                        : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:border-[var(--color-imamu-accent)]/50 hover:text-[var(--color-imamu-accent)] hover:bg-[var(--color-imamu-brown)]/10'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* News Grid Section */}
            <InView preset="fade-up" delay={0.2} className="w-full">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                <span>{isSearching ? `نتائج الأخبار (${filteredNews.length})` : 'أحدث التحديثات'}</span>
                <div className="h-px bg-slate-200 dark:bg-zinc-800 flex-1 mr-3" />
              </h3>

              {filteredNews.length === 0 ? (
                <div className="p-12 text-center bg-slate-100/60 dark:bg-zinc-800/40 rounded-3xl border border-slate-200/60 dark:border-zinc-700/40 text-slate-500 dark:text-zinc-400 text-sm">
                  لا توجد أخبار تطابق المعايير المحددة حالياً.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  <div className="flex flex-col gap-6 w-full">
                    {filteredNews.filter((_, idx) => idx % 2 === 0).map((item) => (
                      <SpotlightCard
                        key={item.id}
                        onClick={() => handleOpenNewsModal(item)}
                        className="w-full cursor-pointer border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 hover:border-[var(--color-imamu-accent)] transition duration-200 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-4">
                            <div 
                              onClick={(e) => handleAuthorClick(item.authorHandle || item.source || '@IMAMU', e)}
                              className="flex items-center gap-2.5 min-w-0 cursor-pointer group/author"
                            >
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-zinc-300 overflow-hidden shrink-0 group-hover/author:border-[var(--color-imamu-accent)] transition">
                                {item.authorAvatar ? (
                                  <img 
                                    src={item.authorAvatar} 
                                    alt={item.author || 'إدارة الأخبار'} 
                                    className="w-full h-full rounded-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                ) : (
                                  (item.author || (item as any).authorName || item.source || 'إدارة الأخبار').charAt(0)
                                )}
                              </div>
                              <div className="flex flex-col text-right min-w-0">
                                <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover/author:text-[var(--color-imamu-accent)] transition">
                                  {item.author || (item as any).authorName || (item.source ? `@${item.source.replace(/^@/, '')}` : 'إدارة الأخبار')}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-1 min-w-0 truncate">
                                  <span className="truncate">{item.authorHandle || (item.source ? `@${item.source.replace(/^@/, '')}` : '@IMAMU')}</span>
                                  <span className="shrink-0">•</span>
                                  <span className="shrink-0">{formatDate(item.createdAt, 'ar-display')}</span>
                                </span>
                              </div>
                            </div>

                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800/90 border border-slate-200/80 dark:border-zinc-700/80 text-[var(--color-imamu-accent)] text-[10px] font-bold shadow-2xs shrink-0">
                              {getArabicCategoryLabel(item.category, (item as any).tag || item.summary, item.content, item.title)}
                            </span>
                          </div>

                          {item.title && item.title !== item.author && (
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                              {item.title}
                            </h4>
                          )}

                          <div className="mb-4">
                            <FormattedNewsContent 
                              content={item.content} 
                              truncateLines={5} 
                              className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed" 
                            />
                          </div>

                          <NewsMediaPreview 
                            imageUrl={item.imageUrl}
                            title={item.title}
                            onImageClick={(e) => {
                              e.stopPropagation();
                              setViewerImageUrl(item.imageUrl || null);
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 pt-3.5 text-xs text-slate-500 dark:text-zinc-400 mt-2">
                          <button 
                            onClick={(e) => handleLike(item.id, e)}
                            className={`flex items-center gap-1.5 transition ${item.isLiked ? 'text-rose-600 font-bold' : 'hover:text-rose-600'}`}
                          >
                            <Heart className={`w-4 h-4 ${item.isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                            <span>{item.likes ?? item.likesCount ?? 0}</span>
                          </button>

                          <div className="flex items-center gap-3">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNews(item);
                              }}
                              className="flex items-center gap-1 hover:text-[var(--color-imamu-accent)] transition"
                            >
                              <MessageSquare className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                              <span>{item.commentsCount ?? 0}</span>
                            </button>

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(`${window.location.origin}/news?id=${item.id}`);
                              }}
                              className="hover:text-slate-900 dark:hover:text-white transition p-1"
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
                    {filteredNews.filter((_, idx) => idx % 2 === 1).map((item) => (
                      <SpotlightCard
                        key={item.id}
                        onClick={() => handleOpenNewsModal(item)}
                        className="w-full cursor-pointer border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 hover:border-[var(--color-imamu-accent)] transition duration-200 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-4">
                            <div 
                              onClick={(e) => handleAuthorClick(item.authorHandle || item.source || '@IMAMU', e)}
                              className="flex items-center gap-2.5 min-w-0 cursor-pointer group/author"
                            >
                              <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-zinc-300 overflow-hidden shrink-0 group-hover/author:border-[var(--color-imamu-accent)] transition">
                                {item.authorAvatar ? (
                                  <img 
                                    src={item.authorAvatar} 
                                    alt={item.author || 'إدارة الأخبار'} 
                                    className="w-full h-full rounded-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                ) : (
                                  (item.author || (item as any).authorName || item.source || 'إدارة الأخبار').charAt(0)
                                )}
                              </div>
                              <div className="flex flex-col text-right min-w-0">
                                <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 group-hover/author:text-[var(--color-imamu-accent)] transition">
                                  {item.author || (item as any).authorName || (item.source ? `@${item.source.replace(/^@/, '')}` : 'إدارة الأخبار')}
                                </span>
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 flex items-center gap-1 min-w-0 truncate">
                                  <span className="truncate">{item.authorHandle || (item.source ? `@${item.source.replace(/^@/, '')}` : '@IMAMU')}</span>
                                  <span className="shrink-0">•</span>
                                  <span className="shrink-0">{formatDate(item.createdAt, 'ar-display')}</span>
                                </span>
                              </div>
                            </div>

                            <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800/90 border border-slate-200/80 dark:border-zinc-700/80 text-[var(--color-imamu-accent)] text-[10px] font-bold shadow-2xs shrink-0">
                              {getArabicCategoryLabel(item.category, (item as any).tag || item.summary, item.content, item.title)}
                            </span>
                          </div>

                          {item.title && item.title !== item.author && (
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                              {item.title}
                            </h4>
                          )}

                          <div className="mb-4">
                            <FormattedNewsContent 
                              content={item.content} 
                              truncateLines={5} 
                              className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed" 
                            />
                          </div>

                          <NewsMediaPreview 
                            imageUrl={item.imageUrl}
                            title={item.title}
                            onImageClick={(e) => {
                              e.stopPropagation();
                              setViewerImageUrl(item.imageUrl || null);
                            }}
                          />
                        </div>

                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800 pt-3.5 text-xs text-slate-500 dark:text-zinc-400 mt-2">
                          <button 
                            onClick={(e) => handleLike(item.id, e)}
                            className={`flex items-center gap-1.5 transition ${item.isLiked ? 'text-rose-600 font-bold' : 'hover:text-rose-600'}`}
                          >
                            <Heart className={`w-4 h-4 ${item.isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                            <span>{item.likes ?? item.likesCount ?? 0}</span>
                          </button>

                          <div className="flex items-center gap-3">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedNews(item);
                              }}
                              className="flex items-center gap-1 hover:text-[var(--color-imamu-accent)] transition"
                            >
                              <MessageSquare className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                              <span>{item.commentsCount ?? 0}</span>
                            </button>

                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(`${window.location.origin}/news?id=${item.id}`);
                              }}
                              className="hover:text-slate-900 dark:hover:text-white transition p-1"
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
            </InView>

          </div>

          {/* Right Sidebar Column (Widgets: Top 10 Accounts & Trending Hashtags) - Direct on Background */}
          <div className="lg:col-span-4 space-y-8 w-full sticky top-24">
            
            {/* Widget 1: Trending Hashtags - Direct on Background */}
            <InView preset="fade-up" delay={0.15}>
              <div className="py-2">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
                  <Flame className="w-4 h-4 text-amber-500 fill-amber-500/20" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    الأكثر تداولاً
                  </h3>
                </div>

                <div className="space-y-1">
                  {trendingHashtags.map((item, idx) => (
                    <div
                      key={item.tag}
                      onClick={() => {
                        setSearchQuery(item.tag);
                        setSearchFilter('articles');
                      }}
                      className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-slate-100/70 dark:hover:bg-zinc-800/60 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 w-4 text-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 group-hover:text-[var(--color-imamu-accent)] transition truncate">
                          {item.tag}
                        </span>
                      </div>
                      
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                        {item.count} خبر
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </InView>

            {/* Widget 2: Top 10 Authenticated Accounts - Direct on Background */}
            <InView preset="fade-up" delay={0.25}>
              <div className="py-2 pt-2">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200/80 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      أبرز 10 حسابات
                    </h3>
                  </div>
                </div>

                <div className="space-y-1">
                  {top10Accounts.map((acc, idx) => (
                    <div
                      key={acc.id}
                      onClick={(e) => handleAuthorClick(acc.handle, e)}
                      className="flex items-center justify-between py-2 px-2.5 rounded-xl hover:bg-slate-100/70 dark:hover:bg-zinc-800/60 transition cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 w-4 text-center">
                          {idx + 1}
                        </span>

                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-zinc-300 overflow-hidden shrink-0 group-hover:border-[var(--color-imamu-accent)] transition">
                          {acc.profilePicUrl ? (
                            <img 
                              src={acc.profilePicUrl} 
                              alt={acc.displayName} 
                              className="w-full h-full object-cover"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            acc.displayName.charAt(0)
                          )}
                        </div>

                        <div className="flex flex-col min-w-0 text-right">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate group-hover:text-[var(--color-imamu-accent)] transition">
                              {acc.displayName}
                            </span>
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-imamu-accent)] shrink-0" />
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate" dir="ltr">
                            @{acc.handle.replace(/^@/, '')}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleFollowAccount(acc.id, e)}
                        disabled={followingAccIds.has(acc.id)}
                        className={`btn-rise px-3 py-1 rounded-full text-[11px] font-bold transition-all duration-200 shrink-0 cursor-pointer active:scale-95 disabled:opacity-75 ${
                          acc.isFollowing
                            ? 'bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 border border-slate-300 dark:border-zinc-700'
                            : 'bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white shadow-2xs'
                        }`}
                      >
                        {acc.isFollowing ? 'مُتابع' : 'متابعة'}
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setSearchFilter('accounts')}
                  className="w-full mt-4 py-2 bg-slate-100 dark:bg-zinc-800/80 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition text-center border border-slate-200/50 dark:border-zinc-700/50"
                >
                  استكشاف جميع الحسابات الموثقة
                </button>
              </div>
            </InView>

          </div>

        </div>
      )}

      {/* Instagram-inspired Article Detail Modal */}
      {selectedNews && (
        <NewsDetailModal
          item={selectedNews}
          onClose={() => setSelectedNews(null)}
          currentUser={user}
          dbUser={dbUser}
          onAuthorClick={(handle) => handleAuthorClick(handle)}
          onImageZoom={(url) => setViewerImageUrl(url)}
          onLikeToggle={(id, newIsLiked, newLikesCount) => {
            setNews(prev => prev.map(n => {
              if (n.id === id) {
                const isLiked = newIsLiked !== undefined ? newIsLiked : !n.isLiked;
                const currentLikes = n.likes ?? n.likesCount ?? 0;
                const likesCount = newLikesCount !== undefined ? newLikesCount : (isLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1));
                return { ...n, isLiked, likes: likesCount, likesCount };
              }
              return n;
            }));
          }}
        />
      )}

      {/* Fullscreen Image Lightbox Viewer Modal */}
      <ImageViewerModal
        imageUrl={viewerImageUrl}
        onClose={() => setViewerImageUrl(null)}
      />
    </div>
  );
}
