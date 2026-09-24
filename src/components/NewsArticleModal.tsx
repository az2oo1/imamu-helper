'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Calendar, Clock, Share2, Bookmark, ArrowLeft, ArrowRight, FileText, 
  Check, Heart, UserPlus, UserCheck, Send, Trash2, MessageSquare, AlertTriangle
} from 'lucide-react';
import { FormattedNewsContent } from './FormattedNewsContent';
import { ImageViewerModal } from './ImageViewerModal';
import ReportDropdownMenu from './ReportDropdownMenu';
import { formatDate } from '../lib/date-utils';
import { getContentWithoutTitle, getArabicCategoryLabel } from '../lib/textHelpers';
import { useAuth } from '../lib/AuthContext';

export interface NewsItem {
  id: number | string;
  title: string;
  category?: string;
  tag?: string;
  date?: string;
  readTime?: string;
  imageUrl?: string;
  image?: string;
  images?: string[] | string;
  content: string;
  excerpt?: string;
  featured?: boolean;
  isFeatured?: boolean;
  isSaved?: boolean;
  isLiked?: boolean;
  likesCount?: number;
  likes?: number;
  commentsCount?: number;
  author?: string | { id?: string; name?: string; avatar?: string; username?: string; isClub?: boolean };
  authorName?: string;
  authorHandle?: string;
  authorAvatar?: string;
  isFollowedAuthor?: boolean;
  entityId?: string;
  formId?: string;
  form?: { id: string; title: string; description?: string };
  createdAt?: string;
}

interface NewsArticleModalProps {
  article: NewsItem | null;
  isOpen: boolean;
  onClose: () => void;
  onLikeToggle?: (id: number | string) => void;
  onSaveToggle?: (id: number | string) => void;
  isStandalonePage?: boolean;
}

export function NewsArticleModal({ 
  article, 
  isOpen, 
  onClose,
  onLikeToggle,
  onSaveToggle,
  isStandalonePage = false
}: NewsArticleModalProps) {
  const router = useRouter();
  const { user, dbUser } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [viewerImage, setViewerImage] = useState<string>('');
  
  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);


  useEffect(() => {
    if (article && isOpen) {
      setIsSaved(!!article.isSaved);
      setIsFollowing(!!article.isFollowedAuthor);
      fetchComments(article.id);
    }
  }, [article?.id, isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const fetchComments = async (newsId: number | string) => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/news/${newsId}/comments`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json().catch(() => []);
        if (Array.isArray(data)) setComments(data);
      }
    } catch (e) {
      console.error('Failed to fetch comments', e);
    } finally {
      setLoadingComments(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!article || !newCommentText.trim()) return;
    const textToSend = newCommentText.trim();
    setNewCommentText('');

    try {
      const token = user ? await user.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const res = await fetch(`/api/news/${article.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ content: textToSend })
      });

      if (res.ok) {
        const commentData = await res.json().catch(() => null);
        if (commentData) {
          setComments(prev => [commentData, ...prev]);
        }
      }
    } catch (err) {
      console.error('Failed to post comment', err);
    }
  };

  const handleDeleteComment = async (commentId: number | string) => {
    try {
      const token = user ? await user.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const res = await fetch(`/api/news/comments/${commentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': token ? `Bearer ${token}` : '' }
      });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
      }
    } catch (err) {
      console.error('Failed to delete comment', err);
    }
  };

  if (!article) return null;

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      const shareUrl = `${window.location.origin}/news/${article.id}`;
      if (navigator.share) {
        navigator.share({
          title: article.title,
          url: shareUrl
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(shareUrl);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const prevSaved = isSaved;
    setIsSaved(!prevSaved);
    if (onSaveToggle) onSaveToggle(article.id);

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('imamu_token') || '';
      const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`/api/news/${article.id}/save`, { method: 'POST', headers });
      if (!res.ok) {
        setIsSaved(prevSaved);
      }
    } catch (err) {
      setIsSaved(prevSaved);
    }
  };

  // Author details
  const authorName = typeof article.author === 'object' 
    ? article.author.name || 'إدارة الأخبار' 
    : (article.authorName || (typeof article.author === 'string' && article.author !== 'System Admin' ? article.author : 'إدارة الأخبار'));
  
  const rawHandle = typeof article.author === 'object' ? article.author.username : article.authorHandle;
  const authorHandle = rawHandle || 'admin';
  const cleanHandle = authorHandle.replace(/^@/, '');
  const authorAvatar = article.authorAvatar || (typeof article.author === 'object' ? article.author.avatar : null);

  const [isTogglingFollow, setIsTogglingFollow] = useState(false);

  useEffect(() => {
    if (article && isOpen && cleanHandle && cleanHandle !== 'admin') {
      const checkFollow = async () => {
        try {
          const token = user ? await user.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
          const res = await fetch(`/api/authenticated-accounts/${encodeURIComponent(cleanHandle)}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.ok) {
            const accData = await res.json();
            if (typeof accData.isFollowing === 'boolean') {
              setIsFollowing(accData.isFollowing);
            }
          }
        } catch (e) {}
      };
      checkFollow();
    }
  }, [article?.id, isOpen, user, cleanHandle]);

  const handleToggleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      router.push('/login');
      return;
    }
    const targetParam = article?.entityId || cleanHandle;
    if (!targetParam || targetParam === 'admin') return;

    if (isTogglingFollow) return;
    setIsTogglingFollow(true);

    const prevFollowing = isFollowing;
    setIsFollowing(!prevFollowing);

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/authenticated-accounts/${encodeURIComponent(targetParam)}/follow`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setIsFollowing(data.isFollowing);
      } else {
        setIsFollowing(prevFollowing);
      }
    } catch (err) {
      console.error('Failed to toggle follow', err);
      setIsFollowing(prevFollowing);
    } finally {
      setIsTogglingFollow(false);
    }
  };

  // Parse images
  let displayImages: string[] = [];
  if (article.images) {
    try {
      const parsed = typeof article.images === 'string' ? JSON.parse(article.images) : article.images;
      if (Array.isArray(parsed) && parsed.length > 0) displayImages = parsed;
    } catch (e) {}
  }
  if (displayImages.length === 0) {
    const single = article.image || article.imageUrl;
    if (single && !single.includes('telegram.org/img/emoji')) displayImages = [single];
  }

  const categoryLabel = getArabicCategoryLabel(article.category, article.tag, article.content, article.title);
  const displayDate = article.date || (article.createdAt ? formatDate(article.createdAt, 'ar-display') : 'مؤخراً');
  const readTimeLabel = article.readTime && !article.readTime.includes('min read') 
    ? article.readTime 
    : (Math.max(1, Math.ceil((article.content || '').split(/\s+/).length / 200)) + ' دقيقة قراءة');

  const isAdminUser = !!(dbUser?.isAdmin || dbUser?.role === 'ADMIN');

  if (isStandalonePage) {
    if (!isOpen || !article) return null;
    return (
      <div className="w-full max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8 text-right" dir="rtl">
        {/* Top Bar: Back Button */}
        <div className="flex items-center justify-start mb-6">
          <button
            onClick={onClose}
            className="flex items-center gap-2.5 text-white hover:text-white transition text-xs sm:text-sm font-bold bg-neutral-900/90 hover:bg-neutral-800 px-5 py-2.5 rounded-2xl border border-neutral-700/60 shadow-lg cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 text-[var(--color-imamu-accent)]" />
            <span>العودة للأخبار</span>
          </button>
        </div>

        {/* Large Headline Title */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-[1.25] tracking-tight mb-4 text-right">
          {article.title}
        </h1>

        {/* Category Tag (To the Right of Date), Date & Read Time Row */}
        <div className="flex flex-wrap items-center gap-3 mb-6 text-neutral-400 text-xs font-medium text-right" dir="rtl">
          {/* Category Tag Badge (Far Right in RTL / To the Right of Date) */}
          <span className="px-3.5 py-1 rounded-full bg-neutral-800/90 border border-neutral-700/80 text-[var(--color-imamu-accent)] text-[11px] font-bold shadow-sm">
            {categoryLabel}
          </span>

          <span className="text-neutral-600">•</span>

          {/* Date (Left of Badge in RTL) */}
          <div className="flex items-center gap-1.5 text-neutral-300">
            <Calendar className="w-4 h-4 text-[var(--color-imamu-accent)]" />
            <span>{displayDate}</span>
          </div>

          <span className="text-neutral-600">•</span>

          {/* Read Time */}
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-neutral-400" />
            <span>{readTimeLabel}</span>
          </div>
        </div>

        {/* Author Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 py-4 px-4 bg-neutral-900/60 rounded-2xl border border-neutral-800/80 mb-8">
          <div 
            onClick={() => router.push(`/account/${encodeURIComponent(cleanHandle)}`)}
            className="flex items-center gap-3 cursor-pointer group/author"
          >
            <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-700 group-hover/author:border-[var(--color-imamu-accent)] flex items-center justify-center font-bold text-sm text-neutral-300 overflow-hidden shrink-0 shadow-sm transition">
              {authorAvatar ? (
                <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
              ) : (
                authorName.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-base group-hover/author:text-[var(--color-imamu-accent)] transition">{authorName}</span>
                <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[var(--color-imamu-accent)] text-[10px] font-bold uppercase tracking-wider">
                  الناشر
                </span>
              </div>
              <div className="text-xs text-neutral-400 font-mono">@{cleanHandle}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFollow}
              disabled={isTogglingFollow}
              className={`btn-rise px-5 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-75 flex items-center gap-1.5 ${
                isFollowing
                  ? 'bg-neutral-900 text-white hover:bg-neutral-800 border border-neutral-700'
                  : 'bg-[var(--color-imamu-brown)] text-white hover:bg-[var(--color-imamu-brown-dark)]'
              }`}
            >
              {isFollowing ? <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span>{isFollowing ? 'مُتابَع' : 'متابعة'}</span>
            </button>

            <button
              onClick={handleShare}
              className="p-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition border border-neutral-800"
              title="مشاركة الرابط"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              onClick={handleSave}
              className={`p-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 transition border border-neutral-800 ${
                isSaved ? 'text-[var(--color-imamu-accent)] border-[var(--color-imamu-accent)]/50' : 'text-neutral-300'
              }`}
              title={isSaved ? "إزالة المحفوظات" : "حفظ الخبر"}
            >
              <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
            </button>

            <ReportDropdownMenu
              targetType="news"
              targetId={article.id}
              targetTitle={article.title}
              user={user}
              buttonClassName="p-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white transition border border-neutral-800"
            />
          </div>
        </div>

        {/* Article Content Text Body */}
        <div className="mb-8 text-neutral-200 text-base sm:text-lg leading-relaxed text-right font-sans">
          <FormattedNewsContent content={getContentWithoutTitle(article.content || article.excerpt || '', article.title)} />
        </div>

        {/* Attached Interactive Form Card */}
        {(article.formId || article.form) && (
          <div className="mb-8 border border-neutral-800 bg-neutral-900/70 rounded-2xl p-6 relative flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden shadow-md text-right">
            <div className="text-right relative z-10 flex-1">
              <h3 className="font-bold text-white text-lg mb-1 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[var(--color-imamu-accent)]" />
                <span>{article.form?.title || 'نموذج / استبيان مائل'}</span>
              </h3>
              <p className="text-xs text-neutral-400">{article.form?.description || 'قم بتعبئة النموذج التفاعلي المرفق مع هذا الخبر.'}</p>
            </div>
            <button
              onClick={() => window.open(`/forms/${article.formId || article.form?.id}`, '_blank')}
              className="bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white px-6 py-3 rounded-full text-xs font-bold transition flex items-center justify-center gap-2 w-full sm:w-auto shrink-0 z-10 shadow-sm"
            >
              فتح النموذج
            </button>
          </div>
        )}

        {/* Main Featured Image */}
        {displayImages.length > 0 && (
          <div className="my-8 w-full max-w-2xl mx-auto">
            <div 
              onClick={() => {
                setViewerImage(displayImages[0]);
              }}
              className="relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-xl cursor-zoom-in group"
            >
              <img
                src={displayImages[0]}
                alt={article.title}
                className="w-full max-h-[450px] object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>

            {displayImages.length > 1 && (
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {displayImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setViewerImage(img)}
                    className="w-16 h-16 rounded-xl overflow-hidden border-2 border-neutral-800 hover:border-white transition shrink-0"
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* COMMENTS & DISCUSSION SECTION */}
        <div className="mt-12 pt-8 border-t border-neutral-800/80 text-right">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[var(--color-imamu-accent)]" />
            <span>التعليقات والمناقشة ({comments.length})</span>
          </h3>

          {/* Add Comment Input */}
          <form onSubmit={handlePostComment} className="mb-8">
            <div className="flex gap-3">
              <input
                type="text"
                value={newCommentText}
                onChange={(e) => setNewCommentText(e.target.value)}
                placeholder={user ? "اكتب تعليقك هنا..." : "سجل الدخول للتمكن من التعليق"}
                disabled={!user}
                className="flex-1 px-5 py-3 bg-neutral-900 border border-neutral-800 rounded-2xl text-sm text-white outline-none focus:border-[var(--color-imamu-brown)] transition placeholder-neutral-500 text-right"
              />
              <button
                type="submit"
                disabled={!user || !newCommentText.trim()}
                className="px-6 py-3 bg-[var(--color-imamu-brown)] text-white font-bold text-xs rounded-2xl hover:bg-[var(--color-imamu-brown-dark)] transition disabled:opacity-40 flex items-center justify-center shrink-0"
              >
                <Send className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </form>

          {/* Comments Feed List */}
          <div className="space-y-4">
            {loadingComments ? (
              <div className="text-neutral-500 text-sm py-4">جاري تحميل التعليقات...</div>
            ) : comments.length === 0 ? (
              <div className="text-neutral-500 text-sm py-4 italic">لا توجد تعليقات بعد. كن أول من يشارك!</div>
            ) : (
              comments.map((c) => {
                const isMyComment = user && (user.uid === c.userId || user.email === c.userName);
                const canDelete = isMyComment || isAdminUser;

                return (
                  <div 
                    key={c.id} 
                    className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex items-start justify-between gap-3 text-right"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                        {c.userName ? c.userName.charAt(0).toUpperCase() : 'ط'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{c.userName || 'طالب'}</span>
                          <span className="text-xs text-neutral-500">{formatDate(c.createdAt, 'ar-display')}</span>
                        </div>
                        <p className="text-sm text-neutral-300 mt-1 leading-relaxed">{c.content}</p>
                      </div>
                    </div>

                    {canDelete && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition"
                        title="حذف التعليق"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Lightbox Viewer */}
        <ImageViewerModal
          imageUrl={viewerImage}
          onClose={() => setViewerImage('')}
        />
      </div>
    );
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/90 backdrop-blur-xl overflow-y-auto"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-neutral-950 border border-neutral-800 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar shadow-2xl p-6 sm:p-10 text-left"
            dir="ltr"
          >
            {/* Top Bar: Back Button */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={onClose}
                className="flex items-center gap-2 text-neutral-300 hover:text-white transition text-xs sm:text-sm font-bold bg-neutral-900 hover:bg-neutral-800 px-4 py-2 rounded-xl border border-neutral-800"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                onClick={onClose}
                className="p-2.5 bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-full transition border border-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Large Headline Title */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-[1.15] tracking-tight mb-4 text-left">
              {article.title}
            </h1>

            {/* Category Tag (To the Right of Date), Date & Read Time Row */}
            <div className="flex flex-wrap items-center gap-3 mb-6 text-neutral-400 text-xs font-medium text-right" dir="rtl">
              {/* Category Tag Badge (Far Right in RTL / To the Right of Date) */}
              <span className="px-3.5 py-1 rounded-full bg-neutral-800/90 border border-neutral-700/80 text-[var(--color-imamu-accent)] text-[11px] font-bold shadow-sm">
                {categoryLabel}
              </span>

              <span className="text-neutral-600">•</span>

              {/* Date (Left of Badge in RTL) */}
              <div className="flex items-center gap-1.5 text-neutral-300">
                <Calendar className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                <span>{displayDate}</span>
              </div>

              <span className="text-neutral-600">•</span>

              {/* Read Time */}
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-neutral-400" />
                <span>{readTimeLabel}</span>
              </div>
            </div>

            {/* Author Row (Left Aligned matching Image 2) */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-4 px-4 bg-neutral-900/60 rounded-2xl border border-neutral-800/80 mb-8">
              <div 
                onClick={() => router.push(`/account/${encodeURIComponent(cleanHandle)}`)}
                className="flex items-center gap-3 cursor-pointer group/author"
              >
                <div className="w-12 h-12 rounded-full bg-neutral-900 border border-neutral-700 group-hover/author:border-white flex items-center justify-center font-bold text-sm text-neutral-300 overflow-hidden shrink-0 shadow-sm transition">
                  {authorAvatar ? (
                    <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
                  ) : (
                    authorName.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-base group-hover/author:text-white transition">{authorName}</span>
                    <span className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-neutral-400 text-[10px] font-bold uppercase tracking-wider">
                      AUTHOR
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400 font-mono">@{cleanHandle}</div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleFollow}
                  disabled={isTogglingFollow}
                  className={`btn-rise px-5 py-2 text-xs font-bold rounded-full transition-all duration-200 cursor-pointer active:scale-95 disabled:opacity-75 flex items-center gap-1.5 ${
                    isFollowing
                      ? 'bg-neutral-900 text-white hover:bg-neutral-800 border border-neutral-700'
                      : 'bg-white text-black hover:bg-neutral-200'
                  }`}
                >
                  {isFollowing ? <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> : <UserPlus className="w-3.5 h-3.5" />}
                  <span>{isFollowing ? 'Following' : 'Follow'}</span>
                </button>

                <button
                  onClick={handleShare}
                  className="p-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition border border-neutral-800"
                  title="Share link"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                </button>

                <button
                  onClick={handleSave}
                  className={`p-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 transition border border-neutral-800 ${
                    isSaved ? 'text-primary-400 border-primary-500/50' : 'text-neutral-300'
                  }`}
                  title={isSaved ? "Remove bookmark" : "Bookmark article"}
                >
                  <Bookmark className="w-4 h-4" fill={isSaved ? "currentColor" : "none"} />
                </button>
              </div>
            </div>

            {/* Article Content Text Body */}
            <div className="mb-8 text-neutral-300 text-base sm:text-lg leading-relaxed text-left font-sans">
              <FormattedNewsContent content={getContentWithoutTitle(article.content || article.excerpt || '', article.title)} />
            </div>

            {/* Attached Interactive Form Card */}
            {(article.formId || article.form) && (
              <div className="mb-8 border border-neutral-800 bg-neutral-900/70 rounded-2xl p-6 relative flex flex-col sm:flex-row items-center justify-between gap-4 overflow-hidden shadow-md">
                <div className="text-left relative z-10 flex-1">
                  <h3 className="font-bold text-white text-lg mb-1 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-primary-400" />
                    <span>{article.form?.title || 'Attached Form / Survey'}</span>
                  </h3>
                  <p className="text-xs text-neutral-400">{article.form?.description || 'Fill out the interactive form attached to this article.'}</p>
                </div>
                <button
                  onClick={() => window.open(`/forms/${article.formId || article.form?.id}`, '_blank')}
                  className="bg-white hover:bg-neutral-200 text-black px-6 py-3 rounded-full text-xs font-bold transition flex items-center justify-center gap-2 w-full sm:w-auto shrink-0 z-10 shadow-sm"
                >
                  Open Form
                </button>
              </div>
            )}

            {/* Main Featured Image (Centered below body text matching Image 2) */}
            {displayImages.length > 0 && (
              <div className="my-8 w-full max-w-2xl mx-auto">
                <div 
                  onClick={() => {
                    setViewerImage(displayImages[0]);
                  }}
                  className="relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-xl cursor-zoom-in group"
                >
                  <img
                    src={displayImages[0]}
                    alt={article.title}
                    className="w-full max-h-[450px] object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>

                {displayImages.length > 1 && (
                  <div className="flex flex-wrap justify-center gap-3 mt-4">
                    {displayImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setViewerImage(img)}
                        className="w-16 h-16 rounded-xl overflow-hidden border-2 border-neutral-800 hover:border-white transition shrink-0"
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* COMMENTS & DISCUSSION SECTION */}
            <div className="mt-12 pt-8 border-t border-neutral-800/80 text-left">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-400" />
                <span>Comments ({comments.length})</span>
              </h3>

              {/* Add Comment Input */}
              <form onSubmit={handlePostComment} className="mb-8">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    placeholder={user ? "Write a comment..." : "Log in to post a comment"}
                    disabled={!user}
                    className="flex-1 px-5 py-3 bg-neutral-900 border border-neutral-800 rounded-2xl text-sm text-white outline-none focus:border-primary-500 transition placeholder-neutral-500"
                  />
                  <button
                    type="submit"
                    disabled={!user || !newCommentText.trim()}
                    className="px-6 py-3 bg-white text-black font-bold text-xs rounded-2xl hover:bg-neutral-200 transition disabled:opacity-40 flex items-center justify-center shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>

              {/* Comments Feed List */}
              <div className="space-y-4">
                {loadingComments ? (
                  <div className="text-neutral-500 text-sm py-4">Loading comments...</div>
                ) : comments.length === 0 ? (
                  <div className="text-neutral-500 text-sm py-4 italic">No comments yet. Be the first to join the conversation!</div>
                ) : (
                  comments.map((c) => {
                    const isMyComment = user && (user.uid === c.userId || user.email === c.userName);
                    const canDelete = isMyComment || isAdminUser;

                    return (
                      <div 
                        key={c.id} 
                        className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 flex items-start justify-between gap-3 text-left"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-xs text-white shrink-0">
                            {c.userName ? c.userName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{c.userName || 'Student'}</span>
                              <span className="text-xs text-neutral-500">{formatDate(c.createdAt, 'iso-date')}</span>
                            </div>
                            <p className="text-sm text-neutral-300 mt-1 leading-relaxed">{c.content}</p>
                          </div>
                        </div>

                        {canDelete && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded-lg transition"
                            title="Delete comment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </motion.div>
        </div>
      )}

      {/* Lightbox Viewer */}
      <ImageViewerModal
        imageUrl={viewerImage}
        onClose={() => setViewerImage('')}
      />
    </AnimatePresence>
  );
}



export default NewsArticleModal;
