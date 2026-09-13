'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Heart, MessageSquare, Share2, Check, Send, 
  Trash2, ChevronLeft, ChevronRight, Maximize2, Newspaper, Bookmark, ArrowLeft
} from 'lucide-react';
import { FormattedNewsContent } from './FormattedNewsContent';
import { formatDate } from '../lib/date-utils';
import { decodeHtmlEntities, getContentWithoutTitle, getArabicCategoryLabel } from '../lib/textHelpers';

export interface CommentItem {
  id: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
  profilePicUrl?: string;
}

export interface NewsDetailItem {
  id: number;
  title: string;
  content: string;
  summary?: string;
  category?: string;
  author: string;
  authorHandle?: string;
  authorAvatar?: string;
  imageUrl?: string;
  images?: string[];
  videoUrl?: string;
  views?: number;
  likes?: number;
  likesCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  commentsCount: number;
  createdAt: string;
  date?: string;
  source?: string;
}

interface NewsDetailModalProps {
  item: NewsDetailItem | null;
  onClose: () => void;
  onLikeToggle?: (id: number, isLiked?: boolean, likesCount?: number) => void;
  currentUser: any;
  dbUser?: any;
  onImageZoom?: (url: string) => void;
  onOpenArticleModel?: (item: NewsDetailItem) => void;
  onAuthorClick?: (handleOrSource: string) => void;
}

export function NewsDetailModal({
  item,
  onClose,
  onLikeToggle,
  currentUser,
  dbUser,
  onImageZoom,
  onOpenArticleModel,
  onAuthorClick
}: NewsDetailModalProps) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSmallImage, setIsSmallImage] = useState(false);
  const [isSaved, setIsSaved] = useState(!!item?.isSaved);
  const [likesState, setLikesState] = useState({
    count: item?.likes ?? item?.likesCount ?? 0,
    isLiked: !!item?.isLiked
  });

  // Sync like & save state when item changes
  useEffect(() => {
    if (item) {
      setIsSmallImage(false);
      setIsSaved(!!item.isSaved);
      setLikesState({
        count: item.likes ?? item.likesCount ?? 0,
        isLiked: !!item.isLiked
      });
      fetchComments(item.id);
    }
  }, [item?.id]);

  const handleSaveToggle = async () => {
    if (!item) return;
    if (!currentUser) {
      router.push('/login');
      return;
    }
    const prevIsSaved = isSaved;
    const newIsSaved = !prevIsSaved;
    setIsSaved(newIsSaved);
    try {
      const token = currentUser ? await currentUser.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/news/${item.id}/save`, { method: 'POST', headers });
      if (!res.ok) {
        setIsSaved(prevIsSaved);
      }
    } catch (e) {
      console.error('Failed to toggle save', e);
      setIsSaved(prevIsSaved);
    }
  };

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const fetchComments = async (newsId: number) => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/news/${newsId}/comments`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json().catch(() => []);
        if (Array.isArray(data)) {
          setComments(data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch comments', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleLike = async () => {
    if (!item) return;
    if (!currentUser) {
      router.push('/login');
      return;
    }
    const prevIsLiked = likesState.isLiked;
    const prevCount = likesState.count;

    const optIsLiked = !prevIsLiked;
    const optCount = optIsLiked ? prevCount + 1 : Math.max(0, prevCount - 1);
    
    // Optimistic update
    setLikesState({ isLiked: optIsLiked, count: optCount });
    if (onLikeToggle) {
      onLikeToggle(item.id, optIsLiked, optCount);
    }

    try {
      const token = currentUser ? await currentUser.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/news/${item.id}/like`, { method: 'POST', headers });
      if (res.ok) {
        const data = await res.json().catch(() => null);
        if (data) {
          const finalLiked = data.isLiked ?? data.liked ?? optIsLiked;
          const finalCount = data.likesCount ?? data.likes ?? optCount;
          setLikesState({ isLiked: finalLiked, count: finalCount });
          if (onLikeToggle) {
            onLikeToggle(item.id, finalLiked, finalCount);
          }
        }
      } else {
        setLikesState({ isLiked: prevIsLiked, count: prevCount });
        if (onLikeToggle) {
          onLikeToggle(item.id, prevIsLiked, prevCount);
        }
      }
    } catch (e) {
      console.error('Failed to toggle like', e);
      setLikesState({ isLiked: prevIsLiked, count: prevCount });
      if (onLikeToggle) {
        onLikeToggle(item.id, prevIsLiked, prevCount);
      }
    }
  };

  const handleAddComment = async () => {
    if (!item || !newCommentText.trim() || !currentUser) return;
    const textToSend = newCommentText.trim();
    setNewCommentText('');

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`/api/news/${item.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: textToSend })
      });

      if (res.ok) {
        const commentData = await res.json().catch(() => null);
        if (commentData) {
          setComments(prev => [commentData, ...prev]);
        }
      }
    } catch (e) {
      console.error('Failed to submit comment', e);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!currentUser) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`/api/news/comments/${commentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (e) {
      console.error('Failed to delete comment', e);
    }
  };

  const handleCopyShare = () => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/news?id=${item?.id}`;
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (!item) return null;

  // Build images array
  const allImages: string[] = [];
  if (item.images && item.images.length > 0) {
    allImages.push(...item.images);
  } else if (item.imageUrl) {
    allImages.push(item.imageUrl);
  }

  const currentImage = allImages[activeImageIndex] || null;
  const isAdminUser = !!(dbUser?.isAdmin || dbUser?.role === 'ADMIN');
  const hasMedia = !!((allImages.length > 0 && !isSmallImage) || item.videoUrl);

  const cleanTitle = item.title ? decodeHtmlEntities(item.title) : '';
  const displayBodyContent = getContentWithoutTitle(item.content, item.title);

  const categoryLabel = getArabicCategoryLabel(item.category, item.summary, item.content, item.title);

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/70 dark:bg-black/85 backdrop-blur-md overflow-y-auto"
        onClick={() => onClose()}
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full ${hasMedia ? 'max-w-6xl md:flex-row' : 'max-w-xl flex-col'} bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-zinc-800 overflow-hidden flex h-[85vh] md:h-[88vh] max-h-[850px] min-h-[480px] text-right`}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-30 p-2 rounded-full bg-slate-900/60 hover:bg-slate-900 text-white backdrop-blur-md transition shadow-md"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>
          
          {/* RIGHT SIDE (in RTL): Article Details, Rich Content & Live Comments */}
          <div className="flex-1 flex flex-col min-w-0 h-full order-2 md:order-1 bg-white dark:bg-zinc-900">
            {/* Scrollable Body: Author Bar, Category Tag, Title & Formatted Article Text */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
              
              {/* Category Tag Badge (Placed ABOVE the title in popup only) */}
              <div className="pt-1">
                <span className="inline-block px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800/90 border border-slate-200/80 dark:border-zinc-700/80 text-[var(--color-imamu-accent)] text-xs font-bold shadow-2xs">
                  {categoryLabel}
                </span>
              </div>

              {/* Article Headline Title (ABOVE profile & ABOVE divider line) */}
              {cleanTitle && (
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight text-right pt-1 pl-12">
                  {cleanTitle}
                </h2>
              )}

              {/* Divider Line under Title */}
              <div className="border-b border-slate-200 dark:border-zinc-800/80 my-2" />

              {/* Author Profile & Actions Bar (With bottom line separating Profile from Article) */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-zinc-800/80 mb-3">
                {/* Author Info & Date */}
                <div 
                  onClick={() => {
                    const handleOrSource = item.authorHandle || item.source || '@IMAMU';
                    if (onAuthorClick) {
                      onAuthorClick(handleOrSource);
                    } else {
                      const cleanHandle = handleOrSource.replace(/^@/, '');
                      router.push(`/account/${encodeURIComponent(cleanHandle)}`);
                    }
                  }}
                  className="flex items-center gap-3 min-w-0 cursor-pointer group/author"
                >
                  <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700/80 flex items-center justify-center font-bold text-sm text-[var(--color-imamu-accent)] overflow-hidden shrink-0 group-hover/author:border-[var(--color-imamu-accent)] transition">
                    {item.authorAvatar ? (
                      <img 
                        src={item.authorAvatar} 
                        alt={item.author || (item as any).authorName || 'إدارة الأخبار'} 
                        className="w-full h-full rounded-full object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      (item.author || (item as any).authorName || item.source || 'إدارة الأخبار').charAt(0)
                    )}
                  </div>
                  <div className="flex flex-col text-right min-w-0">
                    <span className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover/author:text-[var(--color-imamu-accent)] transition">
                      {item.author || (item as any).authorName || (item.source ? `@${item.source.replace(/^@/, '')}` : 'إدارة الأخبار')}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-zinc-500 truncate flex items-center gap-1.5 font-mono">
                      <span>{item.date || formatDate(item.createdAt, 'ar-display')}</span>
                      <span>•</span>
                      <span>{item.authorHandle || `@${item.source || 'IMAMU'}`}</span>
                    </span>
                  </div>
                </div>

                {/* Actions: Share (circle), Save (circle), Read Full Page (pill) */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyShare}
                    className="w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800/90 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700/80 transition shrink-0"
                    title="مشاركة الخبر"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
                  </button>

                  <button
                    onClick={handleSaveToggle}
                    className={`w-9 h-9 rounded-full bg-slate-100 dark:bg-zinc-800/90 hover:bg-slate-200 dark:hover:bg-zinc-700 flex items-center justify-center border border-slate-200 dark:border-zinc-700/80 transition shrink-0 ${
                      isSaved ? 'text-[var(--color-imamu-accent)] border-[var(--color-imamu-accent)]/50' : 'text-slate-700 dark:text-zinc-300'
                    }`}
                    title={isSaved ? "إزالة من المحفوظات" : "حفظ الخبر"}
                  >
                    <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      if (onOpenArticleModel) {
                        onOpenArticleModel(item);
                      } else {
                        window.location.href = `/news/${item.id}`;
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white font-bold text-xs sm:text-sm transition shadow-sm hover:shadow-md active:scale-95 shrink-0 whitespace-nowrap"
                    title="فتح صفحة المقال الكاملة"
                  >
                    <span className="whitespace-nowrap">قراءة المقال كاملاً</span>
                    <ArrowLeft className="w-4 h-4 rtl:rotate-0 shrink-0" />
                  </button>
                </div>
              </div>

              {/* Formatted Post Content (Without duplicate title) */}
              {displayBodyContent ? (
                <div className="py-1 px-0.5">
                  <FormattedNewsContent content={displayBodyContent} className="text-sm text-slate-800 dark:text-zinc-200 leading-relaxed" />
                </div>
              ) : null}

            </div>

            {/* FIXED TO THE END: Comments Section + Engagement Bar + Comment Input Field */}
            <div className="shrink-0 border-t border-slate-100 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 flex flex-col">
              
              {/* Comments Feed Header & List (Taller fixed scrollable area) */}
              <div className="px-4 sm:px-5 pt-3 pb-3 border-b border-slate-100 dark:border-zinc-800/50 h-44 sm:h-52 overflow-y-auto custom-scrollbar flex flex-col">
                <div className="text-xs font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between shrink-0">
                  <span>المناقشة والتعليقات ({comments.length})</span>
                </div>

                {/* Comments List / Empty State */}
                <div className="flex-1 flex flex-col">
                  {loadingComments ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-slate-400">جاري تحميل التعليقات...</div>
                  ) : comments.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-xs text-slate-400 dark:text-zinc-500 italic py-4">
                      لا توجد تعليقات بعد. كن أول من يشارك!
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {comments.map((c) => {
                        const canDelete = isAdminUser || (currentUser && (currentUser.uid === c.userId || currentUser.email === c.userName));
                        return (
                          <div
                            key={c.id}
                            className="p-2.5 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/50 flex flex-col gap-1 text-right group"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-stone-100 dark:bg-stone-900/40 text-[var(--color-imamu-accent)] flex items-center justify-center font-bold text-[9px] shrink-0">
                                  {c.userName ? c.userName.charAt(0).toUpperCase() : 'ط'}
                                </div>
                                <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                                  {c.userName || 'طالب'}
                                </span>
                                <span className="text-[9px] text-slate-400 dark:text-zinc-500 mr-1">
                                  {formatDate(c.createdAt, 'ar-display')}
                                </span>
                              </div>

                              {canDelete && (
                                <button
                                  onClick={() => handleDeleteComment(c.id)}
                                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                                  title="حذف التعليق"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed pr-7">{c.content}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Engagement Bar + Sleek Comment Typing Box */}
              <div className="pt-2 px-3 sm:px-4 pb-2.5 sm:pb-3 space-y-1.5">
                {/* Row 1: Engagement Bar (Likes & Comments Count) */}
                <div className="flex items-center justify-between text-xs px-0.5">
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={handleLike}
                      className={`flex items-center gap-1.5 transition font-bold px-2.5 py-0.5 rounded-lg border ${
                        likesState.isLiked
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200 dark:border-rose-900/50'
                          : 'bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:text-rose-600'
                      }`}
                    >
                      <Heart className={`w-3.5 h-3.5 ${likesState.isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                      <span>{likesState.count}</span>
                    </button>

                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 font-medium text-[11px]">
                      <MessageSquare className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                      <span>{comments.length} تعليق</span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Sleek Unified Comment Input Bar */}
                <div className="relative flex items-center w-full">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder={currentUser ? "اكتب تعليقك هنا..." : "سجل الدخول للتمكن من التعليق"}
                    disabled={!currentUser}
                    className="w-full pr-3.5 pl-10 py-2 bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/80 rounded-full text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[var(--color-imamu-brown)]/30 placeholder-slate-400 dark:placeholder-zinc-400 transition"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={!currentUser || !newCommentText.trim()}
                    className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white flex items-center justify-center transition shadow-xs disabled:opacity-40 disabled:bg-slate-300 dark:disabled:bg-zinc-700 shrink-0"
                    title="إرسال التعليق"
                  >
                    <Send className="w-3 h-3 text-white -rotate-90 rtl:rotate-180" />
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* LEFT SIDE (in RTL): Media Section */}
          {hasMedia && (
            <div className="w-full md:w-1/2 lg:w-[46%] bg-slate-950 flex flex-col justify-center items-center relative overflow-hidden h-full order-1 md:order-2">
              {item.videoUrl ? (
                <iframe
                  src={item.videoUrl}
                  title={item.author}
                  className="w-full h-full min-h-[300px] border-0"
                  allowFullScreen
                />
              ) : currentImage ? (
                <div className="relative w-full h-full flex items-center justify-center group bg-black/40">
                  <img
                    src={currentImage}
                    alt={item.author}
                    onLoad={(e) => {
                      const { naturalWidth, naturalHeight } = e.currentTarget;
                      if ((naturalWidth > 0 && naturalWidth < 180) || (naturalHeight > 0 && naturalHeight < 180)) {
                        setIsSmallImage(true);
                      }
                    }}
                    onError={() => setIsSmallImage(true)}
                    onClick={() => currentImage && onImageZoom?.(currentImage)}
                    className="max-h-[75vh] w-full object-contain cursor-zoom-in transition duration-300 group-hover:scale-[1.01]"
                  />

                  <button
                    onClick={() => currentImage && onImageZoom?.(currentImage)}
                    className="absolute bottom-4 left-4 p-2 bg-black/60 hover:bg-black/80 text-white rounded-xl backdrop-blur-md transition opacity-0 group-hover:opacity-100 flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Maximize2 className="w-4 h-4" />
                    <span>توسيع الصورة</span>
                  </button>

                  {/* Multiple Images Carousel Controls */}
                  {allImages.length > 1 && (
                    <>
                      <button
                        onClick={() => setActiveImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition backdrop-blur-sm"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setActiveImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white transition backdrop-blur-sm"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      {/* Dots indicator */}
                      <div className="absolute bottom-4 right-1/2 translate-x-1/2 flex items-center gap-1.5">
                        {allImages.map((_, idx) => (
                          <button
                            key={idx}
                            onClick={() => setActiveImageIndex(idx)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              idx === activeImageIndex ? 'bg-white w-4' : 'bg-white/50'
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          )}

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
