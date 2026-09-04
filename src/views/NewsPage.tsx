'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { 
  Newspaper, Heart, MessageSquare, Share2, Eye, Clock, 
  ChevronLeft, ThumbsUp, Send, User, Check, Sparkles, Image, Video, X, Trash2, Maximize2
} from 'lucide-react';
import { InView, SpotlightCard } from '../components/ui';
import { FormattedNewsContent } from '../components/FormattedNewsContent';
import { NewsDetailModal } from '../components/NewsDetailModal';
import { ImageViewerModal } from '../components/ImageViewerModal';
import { NewsMediaPreview } from '../components/NewsMediaPreview';
import { formatDate } from '../lib/date-utils';

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
}

export function NewsPage() {
  const { user, dbUser } = useAuth();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [imageModalUrl, setImageModalUrl] = useState<string | null>(null);
  const [viewerImageUrl, setViewerImageUrl] = useState<string | null>(null);
  const [isFeaturedImageValid, setIsFeaturedImageValid] = useState<boolean>(true);

  const categories = [
    { id: 'all', label: 'جميع الأخبار' },
    { id: 'academic', label: 'أكاديمي' },
    { id: 'events', label: 'فعاليات' },
    { id: 'announcements', label: 'تنبيهات عاجلة' },
  ];

  const fetchNews = async () => {
    try {
      const token = user ? await user.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch('/api/news', { headers });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (Array.isArray(data)) {
          setNews(data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch news', e);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [user]);

  const handleLike = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const token = user ? await user.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/news/${id}/like`, { method: 'POST', headers });
      if (res.ok) {
        setNews(news.map(item => {
          if (item.id === id) {
            const isLiked = !item.isLiked;
            const currentLikes = item.likes ?? item.likesCount ?? 0;
            const newLikes = isLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1);
            return {
              ...item,
              isLiked,
              likes: newLikes,
              likesCount: newLikes
            };
          }
          return item;
        }));
      }
    } catch (e) {
      console.error('Failed to toggle like', e);
    }
  };

  const openComments = async (item: NewsItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNews(item);
    try {
      const res = await fetch(`/api/news/${item.id}/comments`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (Array.isArray(data)) {
          setComments(data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch comments', e);
    }
  };

  const submitComment = async () => {
    if (!selectedNews || !newComment.trim() || !user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/news/${selectedNews.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment })
      });

      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const commentData = await res.json().catch(() => null);
        if (commentData) {
          setComments([commentData, ...comments]);
          setNewComment('');
          const newCount = (selectedNews.commentsCount || 0) + 1;
          setSelectedNews({ ...selectedNews, commentsCount: newCount });
          setNews(news.map(n => n.id === selectedNews.id ? { ...n, commentsCount: newCount } : n));
        }
      }
    } catch (e) {
      console.error('Failed to submit comment', e);
    }
  };

  const handleDeleteComment = async (commentId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/news/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        if (selectedNews) {
          const newCount = Math.max(0, (selectedNews.commentsCount || 1) - 1);
          setSelectedNews({ ...selectedNews, commentsCount: newCount });
          setNews(prev => prev.map(n => n.id === selectedNews.id ? { ...n, commentsCount: newCount } : n));
        }
      }
    } catch (e) {
      console.error('Failed to delete comment', e);
    }
  };

  const featuredItem = news.find(n => n.isFeatured) || news[0];

  const filteredNews = (activeCategory === 'all' 
    ? news 
    : news.filter(n => n.category === activeCategory)
  ).filter(n => !featuredItem || n.id !== featuredItem.id);

  const isAdminUser = !!(dbUser?.isAdmin || dbUser?.role === 'ADMIN');

  return (
    <div className="flex flex-col flex-1 w-full pb-24 px-4 sm:px-6 lg:px-8 pt-8 relative max-w-7xl mx-auto text-right min-h-screen" dir="rtl">
      
      {/* Page Header */}
      <div className="mb-8 relative z-10">
        <span className="text-xs sm:text-sm font-semibold tracking-widest text-[var(--color-imamu-accent)] uppercase mb-2 block">
          التحديثات والإعلانات الرسمية
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900 dark:text-white mb-2">أخبار وحسابات جامعة الإمام</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl">
          آخر التحديثات والأخبار الأكاديمية والفعاليات مباشرة من قنوات الحسابات الرسمية بالجامعة.
        </p>
      </div>

      {/* Featured News Hero Card */}
      {featuredItem && (
        <InView preset="fade-up" delay={0.1} className="mb-10 w-full">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xs relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className={`${(featuredItem.videoUrl || (featuredItem.imageUrl && isFeaturedImageValid)) ? 'lg:col-span-7' : 'lg:col-span-12'} flex flex-col items-start text-right order-2 lg:order-1`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-stone-50 dark:bg-stone-950/50 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] text-xs font-bold border border-amber-200 dark:border-stone-900/50">
                    أبرز التحديثات
                  </span>
                  <span className="text-xs text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatDate(featuredItem.createdAt, 'ar-display')}
                  </span>
                </div>

                {featuredItem.title && featuredItem.title !== featuredItem.author && (
                  <h2 
                    onClick={() => setSelectedNews(featuredItem)}
                    className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 leading-snug cursor-pointer hover:text-[var(--color-imamu-accent)] dark:hover:text-[var(--color-imamu-accent)] transition-colors"
                  >
                    {featuredItem.title}
                  </h2>
                )}

                <div 
                  onClick={() => setSelectedNews(featuredItem)}
                  className="mb-6 cursor-pointer w-full"
                >
                  <FormattedNewsContent 
                    content={featuredItem.content} 
                    truncateLines={3} 
                    className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed" 
                  />
                </div>

                <div className="flex items-center justify-between w-full border-t border-slate-100 dark:border-zinc-800 pt-4 mt-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-zinc-300 overflow-hidden shrink-0">
                      {featuredItem.authorAvatar ? (
                        <img 
                          src={featuredItem.authorAvatar} 
                          alt={featuredItem.author} 
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        featuredItem.author.charAt(0)
                      )}
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-slate-900 dark:text-white">{featuredItem.author}</span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500">{featuredItem.authorHandle || '@IMAMU'}</span>
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
                      onClick={() => setSelectedNews(featuredItem)}
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
                      className="w-full aspect-video lg:aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 relative group cursor-pointer"
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
                      className="w-full aspect-video lg:aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 relative group cursor-pointer"
                    />
                  )}
                </div>
              )}

            </div>
          </div>
        </InView>
      )}

      {/* News Grid */}
      <InView preset="fade-up" delay={0.2} className="w-full">
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <span>باقي التحديثات</span>
          <div className="h-px bg-slate-200 dark:bg-zinc-800 flex-1 mr-3" />
        </h3>

        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {filteredNews.map((item) => (
            <SpotlightCard
              key={item.id}
              onClick={() => setSelectedNews(item)}
              className="break-inside-avoid inline-block w-full cursor-pointer border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 hover:border-[var(--color-imamu-accent)] transition duration-200 shadow-2xs"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-zinc-300 overflow-hidden shrink-0">
                      {item.authorAvatar ? (
                        <img 
                          src={item.authorAvatar} 
                          alt={item.author} 
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        item.author.charAt(0)
                      )}
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">{item.author}</span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500">{item.authorHandle || '@IMAMU'}</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                    {formatDate(item.createdAt, 'ar-display')}
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

                {/* Media Preview - Auto-hides tiny emojis (<180px) */}
                <NewsMediaPreview 
                  imageUrl={item.imageUrl}
                  title={item.title}
                  onImageClick={(e) => {
                    e.stopPropagation();
                    setViewerImageUrl(item.imageUrl || null);
                  }}
                />
              </div>

              {/* Bottom Actions */}
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
      </InView>

      {/* Instagram-inspired Article Detail Modal */}
      {selectedNews && (
        <NewsDetailModal
          item={selectedNews}
          onClose={() => setSelectedNews(null)}
          currentUser={user}
          dbUser={dbUser}
          onImageZoom={(url) => setViewerImageUrl(url)}
          onLikeToggle={(id) => {
            setNews(prev => prev.map(n => {
              if (n.id === id) {
                const isLiked = !n.isLiked;
                const currentLikes = n.likes ?? n.likesCount ?? 0;
                const newLikes = isLiked ? currentLikes + 1 : Math.max(0, currentLikes - 1);
                return { ...n, isLiked, likes: newLikes, likesCount: newLikes };
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
