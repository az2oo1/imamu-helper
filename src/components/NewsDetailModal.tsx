'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Heart, MessageSquare, Share2, Clock, Check, Send, 
  Trash2, ChevronLeft, ChevronRight, Maximize2, Sparkles, Newspaper
} from 'lucide-react';
import { FormattedNewsContent } from './FormattedNewsContent';
import { formatDate } from '../lib/date-utils';

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
  commentsCount: number;
  createdAt: string;
  source?: string;
}

interface NewsDetailModalProps {
  item: NewsDetailItem | null;
  onClose: () => void;
  onLikeToggle?: (id: number) => void;
  currentUser: any;
  dbUser?: any;
  onImageZoom?: (url: string) => void;
}

export function NewsDetailModal({
  item,
  onClose,
  onLikeToggle,
  currentUser,
  dbUser,
  onImageZoom
}: NewsDetailModalProps) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSmallImage, setIsSmallImage] = useState(false);
  const [likesState, setLikesState] = useState({
    count: item?.likes ?? item?.likesCount ?? 0,
    isLiked: !!item?.isLiked
  });

  // Sync like state when item changes
  useEffect(() => {
    if (item) {
      setIsSmallImage(false);
      setLikesState({
        count: item.likes ?? item.likesCount ?? 0,
        isLiked: !!item.isLiked
      });
      fetchComments(item.id);
    }
  }, [item?.id]);

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
    const newIsLiked = !likesState.isLiked;
    const newCount = newIsLiked ? likesState.count + 1 : Math.max(0, likesState.count - 1);
    
    // Optimistic update
    setLikesState({ isLiked: newIsLiked, count: newCount });
    if (onLikeToggle) {
      onLikeToggle(item.id);
    }

    try {
      const token = currentUser ? await currentUser.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      await fetch(`/api/news/${item.id}/like`, { method: 'POST', headers });
    } catch (e) {
      console.error('Failed to toggle like', e);
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
          className={`relative w-full ${hasMedia ? 'max-w-5xl md:flex-row' : 'max-w-xl flex-col'} bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-slate-200/90 dark:border-zinc-800 overflow-hidden flex max-h-[90vh] text-right`}
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
          <div className={`w-full ${hasMedia ? 'md:w-2/5 border-l border-slate-100 dark:border-zinc-800/80 order-2 md:order-1' : 'w-full'} flex flex-col h-full max-h-[85vh] md:max-h-[90vh] bg-white dark:bg-zinc-900`}>
            
            {/* Header: Author info & Source badge */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-stone-50 dark:bg-stone-950/50 border border-amber-200 dark:border-stone-900/50 flex items-center justify-center font-bold text-sm text-[var(--color-imamu-accent)] overflow-hidden shrink-0">
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
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{item.author}</span>
                    <Sparkles className="w-3.5 h-3.5 text-[var(--color-imamu-accent)] shrink-0" />
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                    {item.authorHandle || `@${item.source || 'IMAMU'}`}
                  </span>
                </div>
              </div>

              <span className="text-[11px] text-slate-400 dark:text-zinc-500 flex items-center gap-1 pl-14 sm:pl-16">
                <Clock className="w-3 h-3" />
                {formatDate(item.createdAt, 'ar-display')}
              </span>
            </div>

            {/* Scrollable Body: Rich Content & Comments */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              
              {/* Formatted Post Content */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-zinc-950/70 border border-slate-200/70 dark:border-zinc-800/80 shadow-2xs">
                <FormattedNewsContent content={item.content} className="text-sm text-slate-800 dark:text-zinc-200 leading-relaxed" />
              </div>

              {/* Engagement Bar (Likes, Comments Count, Share) */}
              <div className="flex items-center justify-between py-2 border-y border-slate-100 dark:border-zinc-800 text-xs">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-1.5 transition font-bold px-3 py-1.5 rounded-xl border ${
                      likesState.isLiked
                        ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 border-rose-200 dark:border-rose-900/50'
                        : 'bg-slate-50 dark:bg-zinc-800/50 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:text-rose-600'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${likesState.isLiked ? 'fill-rose-600 text-rose-600' : ''}`} />
                    <span>{likesState.count}</span>
                  </button>

                  <div className="flex items-center gap-1.5 text-slate-500 dark:text-zinc-400 font-medium">
                    <MessageSquare className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                    <span>{comments.length} تعليق</span>
                  </div>
                </div>

                <button
                  onClick={handleCopyShare}
                  className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-400 hover:text-[var(--color-imamu-accent)] dark:hover:text-[var(--color-imamu-accent)] px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-zinc-700 transition"
                  title="مشاركة الخبر"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">تم نسخ الرابط!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-4 h-4" />
                      <span>مشاركة</span>
                    </>
                  )}
                </button>
              </div>

              {/* Comments Feed Header */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <span>المناقشة والتعليقات</span>
                  <div className="h-px bg-slate-200 dark:bg-zinc-800 flex-1" />
                </h4>

                {/* Comments List */}
                <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                  {loadingComments ? (
                    <div className="text-center py-6 text-xs text-slate-400">جاري تحميل التعليقات...</div>
                  ) : comments.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 dark:text-zinc-500 italic">
                      لا توجد تعليقات بعد. كن أول من يشارك!
                    </div>
                  ) : (
                    comments.map((c) => {
                      const canDelete = isAdminUser || (currentUser && (currentUser.uid === c.userId || currentUser.email === c.userName));
                      return (
                        <div
                          key={c.id}
                          className="p-3 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-950/50 flex flex-col gap-1 text-right group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-stone-100 dark:bg-stone-900/40 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] flex items-center justify-center font-bold text-[10px] shrink-0">
                                {c.userName ? c.userName.charAt(0).toUpperCase() : 'ط'}
                              </div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {c.userName || 'طالب'}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500 mr-1">
                                {formatDate(c.createdAt, 'ar-display')}
                              </span>
                            </div>

                            {canDelete && (
                              <button
                                onClick={() => handleDeleteComment(c.id)}
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
              </div>

            </div>

            {/* Comment Submission Bar */}
            <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                  placeholder={currentUser ? "اكتب تعليقك هنا..." : "سجل الدخول للتمكن من التعليق"}
                  disabled={!currentUser}
                  className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20 focus:border-[var(--color-imamu-brown)] placeholder-slate-400 dark:placeholder-zinc-500"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!currentUser || !newCommentText.trim()}
                  className="bg-[var(--color-imamu-brown)] text-white px-4 py-2.5 rounded-xl hover:bg-[var(--color-imamu-brown-dark)] transition disabled:opacity-40 flex items-center justify-center shrink-0 font-bold"
                >
                  <Send className="w-4 h-4 rotate-180" />
                </button>
              </div>
            </div>

          </div>

          {/* LEFT SIDE (in RTL): Media Section (Only rendered when post actually has images or video) */}
          {hasMedia && (
            <div className="w-full md:w-3/5 bg-slate-950 flex flex-col justify-center items-center relative overflow-hidden min-h-[260px] md:min-h-[500px] order-1 md:order-2">
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
