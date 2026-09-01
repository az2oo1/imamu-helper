'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { 
  Newspaper, Heart, MessageSquare, Share2, Eye, Clock, 
  ChevronLeft, ThumbsUp, Send, User, Check, Sparkles, Image, Video, X, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { InView, SpotlightCard } from '../components/ui';

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

  const categories = [
    { id: 'all', label: 'جميع الأخبار' },
    { id: 'academic', label: 'أكاديمي' },
    { id: 'events', label: 'فعاليات' },
    { id: 'announcements', label: 'تنبيهات عاجلة' },
  ];

  const fetchNews = async () => {
    try {
      const res = await fetch('/api/news');
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
  }, []);

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

  const filteredNews = activeCategory === 'all' 
    ? news 
    : news.filter(n => n.category === activeCategory);

  const featuredItem = news.find(n => n.isFeatured) || news[0];

  const isAdminUser = !!(dbUser?.isAdmin || dbUser?.role === 'ADMIN');

  return (
    <div className="flex flex-col flex-1 w-full pb-24 px-4 sm:px-6 lg:px-8 pt-8 relative max-w-7xl mx-auto text-right min-h-screen" dir="rtl">
      
      {/* Page Header */}
      <div className="mb-8 relative z-10">
        <span className="text-xs sm:text-sm font-semibold tracking-widest text-blue-600 dark:text-blue-400 uppercase mb-2 block">
          التحديثات والإعلانات الرسمية
        </span>
        <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-slate-900 dark:text-white mb-2">أخبار وحسابات جامعة الإمام</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl">
          آخر التحديثات والأخبار الأكاديمية والفعاليات مباشرة من قنوات الحسابات الرسمية بالجامعة.
        </p>
      </div>

      {/* Featured News Hero Card */}
      {featuredItem && (
        <InView preset="fade-up" delay={0.1} className="mb-10 w-full">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xs relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              <div className="lg:col-span-7 flex flex-col items-start text-right order-2 lg:order-1">
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-900/50">
                    أبرز التحديثات
                  </span>
                  <span className="text-xs text-slate-400 dark:text-zinc-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(featuredItem.createdAt).toLocaleDateString('ar-SA')}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3 leading-snug">
                  {featuredItem.title}
                </h2>

                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mb-6 leading-relaxed line-clamp-3">
                  {featuredItem.content}
                </p>

                <div className="flex items-center justify-between w-full border-t border-slate-100 dark:border-zinc-800 pt-4 mt-auto">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 overflow-hidden">
                      {featuredItem.authorAvatar ? (
                        <img src={featuredItem.authorAvatar} alt="" className="w-full h-full rounded-full object-cover" />
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
                      onClick={(e) => openComments(featuredItem, e)}
                      className="flex items-center gap-1.5 hover:text-blue-600 transition"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>{featuredItem.commentsCount ?? 0}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 order-1 lg:order-2">
                <div className="w-full aspect-video lg:aspect-square rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 relative group">
                  {featuredItem.videoUrl ? (
                    <iframe 
                      src={featuredItem.videoUrl} 
                      title={featuredItem.title}
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  ) : featuredItem.imageUrl ? (
                    <img 
                      src={featuredItem.imageUrl} 
                      alt={featuredItem.title} 
                      onClick={() => setImageModalUrl(featuredItem.imageUrl || null)}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-zinc-600">
                      <Newspaper className="w-12 h-12" />
                    </div>
                  )}
                </div>
              </div>

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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredNews.map((item) => (
            <SpotlightCard
              key={item.id}
              onClick={() => openComments(item, {} as any)}
              className="cursor-pointer border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-slate-700 dark:text-zinc-300 overflow-hidden">
                      {item.authorAvatar ? (
                        <img src={item.authorAvatar} alt="" className="w-full h-full object-cover" />
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
                    {new Date(item.createdAt).toLocaleDateString('ar-SA')}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-2 leading-snug line-clamp-2">
                  {item.title}
                </h4>

                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed line-clamp-3 mb-4">
                  {item.content}
                </p>

                {/* Media Preview */}
                {item.imageUrl && (
                  <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 mb-4">
                    <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
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
                    onClick={(e) => openComments(item, e)}
                    className="flex items-center gap-1 hover:text-blue-600 transition"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>{item.commentsCount ?? 0}</span>
                  </button>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(window.location.href);
                    }}
                    className="hover:text-slate-900 dark:hover:text-white transition p-1"
                    title="مشاركة الشرح"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      </InView>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {imageModalUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl w-full max-h-[90vh] bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden p-2 shadow-2xl border border-slate-200 dark:border-zinc-800"
            >
              <button 
                onClick={() => setImageModalUrl(null)}
                className="absolute top-4 left-4 z-10 p-2 bg-slate-900/60 text-white rounded-full hover:bg-slate-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
              <img src={imageModalUrl} alt="Preview" className="w-full h-full object-contain max-h-[85vh] rounded-2xl" />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comments Drawer Modal (Positioned at the Left Edge) */}
      <AnimatePresence>
        {selectedNews && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs flex justify-start pointer-events-auto">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl border-l border-slate-200 dark:border-zinc-800 flex flex-col p-6 text-right fixed left-0 top-0 bottom-0 z-50"
              dir="rtl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-4 mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>التعليقات والمناقشة ({comments.length})</span>
                </h3>
                <button 
                  onClick={() => setSelectedNews(null)}
                  className="p-1 text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Original Post Snippet */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 mb-4">
                <span className="text-xs font-bold text-slate-900 dark:text-white block mb-1">{selectedNews.title}</span>
                <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2">{selectedNews.content}</p>
              </div>

              {/* Comment List */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 mb-4">
                {comments.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-400 dark:text-zinc-500 italic">
                    لا توجد تعليقات بعد. كن أول من يكتب تعليقاً!
                  </div>
                ) : (
                  comments.map(c => {
                    const canDelete = isAdminUser || (user && (user.uid === c.userId || user.email === c.userName));
                    return (
                      <div key={c.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex flex-col gap-1.5 group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center font-bold text-[10px]">
                              {c.userName ? c.userName.charAt(0).toUpperCase() : 'ط'}
                            </div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">@{c.userName || 'طالب'}</span>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 mr-2">
                              {new Date(c.createdAt).toLocaleDateString('ar-SA')}
                            </span>
                          </div>

                          {canDelete && (
                            <button
                              onClick={(e) => handleDeleteComment(c.id, e)}
                              className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                              title="حذف التعليق"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed pr-8">{c.content}</p>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Submit Comment Input */}
              <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 flex gap-2">
                <input 
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitComment()}
                  placeholder={user ? "اكتب تعليقك..." : "سجل الدخول للتعليق"}
                  disabled={!user}
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-600 placeholder-slate-400 dark:placeholder-zinc-500"
                />
                <button
                  onClick={submitComment}
                  disabled={!user || !newComment.trim()}
                  className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Send className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
