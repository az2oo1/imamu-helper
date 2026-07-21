'use client';

import React, { useEffect, useState } from "react";
import { Newspaper, Twitter, MessageCircle, Heart, Link as LinkIcon, Send, X, Trash2, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import { useAuth } from "../lib/AuthContext";
import Masonry from 'react-masonry-css';

const breakpointColumnsObj = {
  default: 3,
  1280: 3,
  1024: 2,
  640: 1,
  0: 1
};

const VideoPlayer = ({ videoUrl, posterUrl }: { videoUrl: string, posterUrl?: string }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div className="w-full aspect-video rounded-2xl overflow-hidden border border-gray-100 bg-gray-900 mb-2 flex items-center justify-center relative group" dir="ltr" onClick={(e) => e.stopPropagation()}>
      <video 
        ref={videoRef}
        src={videoUrl.includes('#') ? videoUrl : `${videoUrl}#t=0.1`} 
        poster={posterUrl}
        controls={isPlaying}
        preload="metadata"
        playsInline
        className="w-full h-full object-contain mx-auto" 
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
      {!isPlaying && posterUrl && (
        <img 
          src={posterUrl} 
          alt="Video preview" 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      )}
      {!isPlaying && (
        <button 
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center hover:bg-black/20 transition-colors z-10"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/90 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm group-hover:scale-105 transition-transform">
            <Play className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--color-imamu-blue)] ml-0.5" fill="currentColor" />
          </div>
        </button>
      )}
    </div>
  );
};

export function NewsPage() {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsOpenId, setCommentsOpenId] = useState<number | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [imageModal, setImageModal] = useState<{ images: string[], currentIndex: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const { user, dbUser } = useAuth();
  
  const loadNews = async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else setLoading(true);

    try {
      const headers: Record<string, string> = {};
      if (user) {
        const token = await user.getIdToken();
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const currentOffset = isLoadMore ? offset : 0;
      const limit = isLoadMore ? 4 : 10; // Load 10 items initially
      
      const res = await fetch(`/api/news?limit=${limit}&offset=${currentOffset}`, { headers });
      if(res.ok) {
        let data = await res.json();
        data = data.map((item: any) => {
           let parsedImages: string[] = [];
           if (item.imageUrl) {
               try { parsedImages = JSON.parse(item.imageUrl); }
               catch(e) { parsedImages = [item.imageUrl]; }
           }
           return { ...item, parsedImages };
         });
         
        if (data.length < limit) {
           setHasMore(false);
        } else {
           setHasMore(true);
        }

        if (isLoadMore) {
           setNews(prev => [...prev, ...data]);
           setOffset(prev => prev + limit);
        } else {
           setNews(data);
           setOffset(limit);
        }
      }
    } catch(e) {
       console.error("Error fetching news:", e);
    }
    
    setLoading(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    loadNews(false);
  }, [user]);

  const observerTarget = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          loadNews(true);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, loading, loadingMore, offset]);

  const toggleLike = async (id: number) => {
    if (!user) return alert("الرجاء تسجيل الدخول لتسجيل الإعجاب.");
    
    setNews(news.map(p => {
      if (p.id === id) {
        const isLiked = !p.userLiked;
        return {
            ...p,
            userLiked: isLiked,
            likesCount: Math.max(0, p.likesCount + (isLiked ? 1 : -1))
        }
      }
      return p;
    }));

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/news/${id}/like`, { 
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if(!res.ok) {
        loadNews();
      }
    } catch (e) {
       loadNews();
    }
  };

  const loadComments = async (id: number) => {
    if (commentsOpenId === id) {
        setCommentsOpenId(null);
        setCommentText("");
        return;
    }
    setCommentsOpenId(id);
    setCommentText("");
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/news/${id}/comments`);
      if (res.ok) {
        setComments(await res.json());
      }
    } catch(e) {}
    setCommentsLoading(false);
  };

  const postComment = async (id: number) => {
    if (!user) return alert("الرجاء تسجيل الدخول للتعليق.");
    if (!commentText.trim()) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/news/${id}/comments`, {
        method: "POST",
        headers: {
           "Authorization": `Bearer ${token}`,
           "Content-Type": "application/json"
        },
        body: JSON.stringify({ content: commentText.trim() })
      });
      if (res.ok) {
        const newCom = await res.json();
        setComments([newCom, ...comments]);
        setCommentText("");
        setNews(news.map(p => p.id === id ? { ...p, commentsCount: (p.commentsCount || 0) + 1 } : p));
      }
    } catch (e) {}
  };

  const deleteComment = async (newsId: number, commentId: number) => {
    if (!user) return;
    if (!confirm("هل أنت متأكد من حذف هذا التعليق؟")) return;
    
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/news/${newsId}/comments/${commentId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setComments(comments.filter(c => c.id !== commentId));
        setNews(news.map(p => p.id === newsId ? { ...p, commentsCount: Math.max(0, (p.commentsCount || 1) - 1) } : p));
      }
    } catch(e) {}
  };

  const copyLink = (id: number, e: React.MouseEvent) => {
     e.stopPropagation();
     const link = `${window.location.origin}/news/${id}`;
     navigator.clipboard.writeText(link);
     alert("تم نسخ الرابط في الحافظة!");
  };

  const featuredPost = news[0];
  const remainingNews = news.slice(1);

  // Redesigned: Gorgeous Two-Column Featured Post Card (Desktop)
  const renderFeaturedPost = (item: any) => {
    const hasMedia = item.videoUrl || (item.parsedImages && item.parsedImages.length > 0);

    return (
      <div className="w-full max-w-4xl mx-auto mb-16 bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm flex flex-col md:flex-row gap-6 md:gap-8 text-right relative overflow-hidden group">
        
        <div className="absolute -left-16 -top-16 w-32 h-32 bg-blue-950/10 rounded-full blur-2xl pointer-events-none" />

        {/* Media Column (Left side in RTL) */}
        {hasMedia && (
          <div className="w-full md:w-1/2 shrink-0 flex flex-col justify-center z-10 order-2 md:order-1">
            {item.videoUrl ? (
              <VideoPlayer videoUrl={item.videoUrl} posterUrl={item.videoThumbnailUrl || (item.parsedImages?.length > 0 ? item.parsedImages[0] : undefined)} />
            ) : (
              item.parsedImages && item.parsedImages.length > 0 && (
                <div className="w-full h-full rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950/40 aspect-video md:aspect-[4/3] flex items-center justify-center">
                  <img 
                    src={item.parsedImages[0]} 
                    alt="Featured media" 
                    onClick={(e) => { e.stopPropagation(); setImageModal({ images: item.parsedImages, currentIndex: 0 }); }}
                    className="w-full h-full object-cover cursor-pointer hover:scale-[1.02] transition-transform duration-300" 
                    loading="lazy" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              )
            )}
          </div>
        )}

        {/* Content Column (Right side in RTL) */}
        {/* Author Profile */}
        <div className={`flex flex-col flex-1 justify-between z-10 order-1 md:order-2 ${hasMedia ? 'md:w-1/2' : 'w-full'}`}>
          <div>
            {/* Header Badge */}
            <div className="flex justify-between items-center mb-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-blue-950/40 text-blue-400 border border-blue-900/50">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                أبرز التحديثات
              </div>
            </div>

            {/* Author Profile */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
                <img 
                  src={(item.authorAvatar && !item.authorAvatar.includes('googleusercontent')) ? item.authorAvatar : (item.profilePicUrl && !item.profilePicUrl.includes('googleusercontent')) ? item.profilePicUrl : "https://upload.wikimedia.org/wikipedia/ar/e/e0/%D8%B4%D8%B9%D8%A7%D8%B1_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D8%A5%D9%85%D8%A7%D9%85_%D9%85%D8%AD%D9%85%D8%AF_%D8%A8%D9%86_%D8%B3%D8%B9%D9%88%D8%AF_%D8%A7%D9%84%D8%A5%D8%B3%D9%84%D8%A7%D9%85%D9%8A%D8%A9.png"} 
                  className="w-full h-full object-cover p-0.5" 
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute('src', 'https://upload.wikimedia.org/wikipedia/ar/e/e0/%D8%B4%D8%B9%D8%A7%D8%B1_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D8%A5%D9%85%D8%A7%D9%85_%D9%85%D8%AD%D9%85%D8%AF_%D8%A8%D9%86_%D8%B3%D8%B9%D9%88%D8%AF_%D8%A7%D9%84%D8%A5%D8%B3%D9%84%D8%A7%D9%85%D9%8A%D8%A9.png');
                  }}
                />
              </div>
              <div className="flex flex-col flex-1 min-w-0 justify-center min-h-[44px]">
                <div className="flex items-center gap-2 flex-wrap text-right">
                  <span className="font-bold text-zinc-100 text-[14px] hover:underline truncate">
                    {item.authorName || item.source || "أخبار جامعة الإمام"}
                  </span>
                  <span className="text-zinc-400 text-[11px] whitespace-nowrap">
                    · {item.date ? formatDistanceToNow(parseISO(item.date), { addSuffix: true, locale: ar }) : "مؤخراً"}
                  </span>
                </div>
                <span className="text-blue-400/80 text-[11px] block font-mono">
                   {item.authorHandle || "@" + (item.source || "IMAMU_News")}
                </span>
              </div>
            </div>

            {/* Main Text Content */}
            <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap mb-6 text-right text-[15px] sm:text-[16px] font-normal">
              {item.content}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-start text-zinc-400 mt-auto gap-8 border-t border-zinc-800 pt-4 pr-1">
            <button 
              onClick={(e) => { e.stopPropagation(); loadComments(item.id); }}
              className="flex items-center gap-1.5 hover:text-blue-400 transition group/btn py-1.5 px-2 -ml-2"
            >
              <MessageCircle className="w-4.5 h-4.5 group-hover/btn:scale-110 transition shrink-0" />
              <span className="text-[12px] font-bold">{item.commentsCount || 0}</span>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); toggleLike(item.id); }}
              className={`flex items-center gap-1.5 transition group/btn py-1.5 px-2 ${item.userLiked ? 'text-red-500' : 'hover:text-red-500'}`}
            >
              <Heart className={`w-4.5 h-4.5 group-hover/btn:scale-110 transition shrink-0 ${item.userLiked ? 'fill-current text-red-500' : ''}`} />
              <span className="text-[12px] font-bold">{item.likesCount || 0}</span>
            </button>
            <button 
              onClick={(e) => copyLink(item.id, e)}
              className="flex items-center gap-1.5 hover:text-green-500 transition group/btn py-1.5 px-2"
            >
              <LinkIcon className="w-4.5 h-4.5 group-hover/btn:scale-110 transition shrink-0" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Redesigned: Self-contained News Card for Grid View
  const renderNewsCard = (item: any) => {
    return (
      <div 
        key={item.id} 
        className="break-inside-avoid bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 shadow-sm hover:border-zinc-705 transition-all duration-300 flex flex-col group w-full text-right relative mb-6"
      >
        {/* Author Profile */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
            <img 
              src={(item.authorAvatar && !item.authorAvatar.includes('googleusercontent')) ? item.authorAvatar : (item.profilePicUrl && !item.profilePicUrl.includes('googleusercontent')) ? item.profilePicUrl : "https://upload.wikimedia.org/wikipedia/ar/e/e0/%D8%B4%D8%B9%D8%A7%D8%B1_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D8%A5%D9%85%D8%A7%D9%85_%D9%85%D8%AD%D9%85%D8%AF_%D8%A8%D9%86_%D8%B3%D8%B9%D9%88%D8%AF_%D8%A7%D9%84%D8%A5%D8%B3%D9%84%D8%A7%D9%85%D9%8A%D8%A9.png"} 
              className="w-full h-full object-cover p-0.5" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLElement).setAttribute('src', 'https://upload.wikimedia.org/wikipedia/ar/e/e0/%D8%B4%D8%B9%D8%A7%D8%B1_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D8%A5%D9%85%D8%A7%D9%85_%D9%85%D8%AD%D9%85%D8%AF_%D8%A8%D9%86_%D8%B3%D8%B9%D9%88%D8%AF_%D8%A7%D9%84%D8%A5%D8%B3%D9%84%D8%A7%D9%85%D9%8A%D8%A9.png');
              }}
            />
          </div>
          <div className="flex flex-col flex-1 min-w-0 justify-center min-h-[40px]">
            <div className="flex items-center gap-2 flex-wrap text-right">
              <span className="font-bold text-zinc-100 text-[13.5px] hover:underline truncate">
                {item.authorName || item.source || "أخبار جامعة الإمام"}
              </span>
              <span className="text-zinc-400 text-[11px] whitespace-nowrap">
                · {item.date ? formatDistanceToNow(parseISO(item.date), { addSuffix: true, locale: ar }) : "مؤخراً"}
              </span>
            </div>
            <span className="text-blue-400/80 text-[11px] block font-mono">
               {item.authorHandle || "@" + (item.source || "IMAMU_News")}
            </span>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="flex flex-col flex-1 mt-1">
          <p className="text-zinc-200 leading-relaxed whitespace-pre-wrap mb-4 text-right font-normal text-[14px]">
            {item.content}
          </p>
          
          {/* Video Attachment */}
          {item.videoUrl && (
            <VideoPlayer videoUrl={item.videoUrl} posterUrl={item.videoThumbnailUrl || (item.parsedImages?.length > 0 ? item.parsedImages[0] : undefined)} />
          )}

          {/* Image Attachments */}
          {!item.videoUrl && item.parsedImages && item.parsedImages.length > 0 && (
            <div className="w-full rounded-xl overflow-hidden border border-zinc-800 mb-4 bg-zinc-950/40" dir="ltr">
                {item.parsedImages.length === 1 ? (
                    <div className="w-full min-h-[180px]">
                      <img 
                        src={item.parsedImages[0]} 
                        alt="Post media" 
                        onClick={(e) => { e.stopPropagation(); setImageModal({ images: item.parsedImages, currentIndex: 0 }); }}
                        className="w-full h-auto max-h-[380px] object-cover cursor-pointer hover:opacity-95 transition" 
                        loading="lazy" 
                        referrerPolicy="no-referrer"
                      />
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-0.5 bg-zinc-800">
                        {item.parsedImages.map((src: string, imgIdx: number) => (
                            <img 
                              key={imgIdx}
                              src={src} 
                              onClick={(e) => { e.stopPropagation(); setImageModal({ images: item.parsedImages, currentIndex: imgIdx }); }}
                              alt="Post media" 
                              className={`w-full object-cover cursor-pointer hover:opacity-95 transition ${item.parsedImages.length === 3 && imgIdx === 0 ? 'col-span-2 h-40' : 'h-24'}`} 
                              loading="lazy" 
                              referrerPolicy="no-referrer"
                            />
                        ))}
                    </div>
                )}
            </div>
          )}

          {/* Actions Bar */}
          <div className="flex items-center justify-start text-zinc-400 mt-2 gap-6 border-t border-zinc-800 pt-3 pr-1">
             <button 
                 onClick={(e) => { e.stopPropagation(); loadComments(item.id); }}
                 className="flex items-center gap-1.5 hover:text-blue-400 transition group/btn py-1 px-1.5 -ml-1.5"
             >
               <MessageCircle className="w-4 h-4 group-hover/btn:scale-110 transition shrink-0" />
               <span className="text-[11px] font-bold">{item.commentsCount || 0}</span>
             </button>
             <button 
                 onClick={(e) => { e.stopPropagation(); toggleLike(item.id); }}
                 className={`flex items-center gap-1.5 transition group/btn py-1 px-1.5 ${item.userLiked ? 'text-red-500' : 'hover:text-red-500'}`}
             >
               <Heart className={`w-4 h-4 group-hover/btn:scale-110 transition shrink-0 ${item.userLiked ? 'fill-current text-red-500' : ''}`} />
               <span className="text-[11px] font-bold">{item.likesCount || 0}</span>
             </button>
             <button 
                 onClick={(e) => copyLink(item.id, e)}
                 className="flex items-center gap-1.5 hover:text-green-500 transition group/btn py-1 px-1.5"
             >
               <LinkIcon className="w-4 h-4 group-hover/btn:scale-110 transition shrink-0" />
             </button>
          </div>
          
          {/* Comments Section */}
          {commentsOpenId === item.id && (
             <div className="mt-4 pt-4 border-t border-zinc-800 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-2">
                   <input 
                      type="text"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && postComment(item.id)}
                      placeholder="أضف تعليقاً..."
                      className="flex-1 bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-full text-xs outline-none text-right placeholder-zinc-500 focus:ring-1 focus:ring-blue-500 transition"
                   />
                   <button 
                      onClick={() => postComment(item.id)}
                      disabled={!commentText.trim()}
                      className="p-2 bg-blue-600 text-white rounded-full disabled:opacity-50 hover:bg-blue-550 transition flex items-center justify-center shrink-0"
                   >
                       <Send className="w-3.5 h-3.5 rotate-180" />
                   </button>
                </div>
                
                {commentsLoading ? (
                   <div className="text-center py-4 text-zinc-400 text-xs">جاري التحميل...</div>
                ) : comments.length > 0 ? (
                   <div className="flex flex-col gap-3 mt-1 max-h-60 overflow-y-auto pr-1">
                       {comments.map(c => (
                          <div key={c.id} className="flex gap-2.5 items-start">
                             <div className="w-7 h-7 rounded-full overflow-hidden bg-zinc-950 border border-zinc-850 shrink-0">
                                {c.profilePic ? (
                                  <img src={c.profilePic} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full bg-blue-950/40 text-blue-400 border border-blue-900/50 flex items-center justify-center font-bold text-[10px]">
                                    {c.userName ? c.userName[0].toUpperCase() : 'U'}
                                  </div>
                                )}
                             </div>
                             <div className="flex flex-col max-w-[85%]">
                                <div className="bg-zinc-950 rounded-xl px-3 py-1.5 border border-zinc-800">
                                   <span className="font-bold text-[11px] text-zinc-100 block mb-0.5">{c.userName || "طالب"}</span>
                                   <span className="text-xs text-zinc-350 break-words leading-relaxed whitespace-pre-wrap">{c.content}</span>
                                 </div>
                                <div className="flex gap-2 items-center mt-0.5 px-2">
                                   <span className="text-[9px] text-zinc-450">{formatDistanceToNow(parseISO(c.createdAt), { addSuffix: true, locale: ar })}</span>
                                   {(dbUser?.isAdmin || (user && user.uid === c.userId)) && (
                                     <button 
                                       onClick={() => deleteComment(item.id, c.id)}
                                       className="text-zinc-450 hover:text-red-500 transition"
                                     >
                                       <Trash2 className="w-3 h-3" />
                                     </button>
                                   )}
                                </div>
                             </div>
                          </div>
                       ))}
                   </div>
                ) : (
                   <div className="text-center py-4 text-zinc-400 text-xs">لا توجد تعليقات بعد. كن الأول!</div>
                )}
             </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 w-full pb-24 px-4 sm:px-6 lg:px-8 xl:px-12 pt-12 relative max-w-[1400px] mx-auto min-h-screen" dir="rtl">
       {/* Background decorative blur shapes */}
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[var(--color-imamu-blue)]/3 rounded-full blur-[120px]" />
         <div className="absolute top-[35%] -left-40 w-[400px] h-[400px] bg-sky-500/3 rounded-full blur-[100px]" />
       </div>

       {/* Redesigned spacious Page Title Header (Non-sticky, clean, premium) */}
       <div className="mb-12 text-right relative z-10">
         <div className="inline-flex items-center gap-3.5 mb-2.5">
           <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center shadow-sm text-zinc-400">
             <Newspaper className="w-5 h-5" />
           </div>
           <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-zinc-50">
             تحديثات وأخبار الجامعة
           </h1>
         </div>
         <p className="text-sm text-zinc-400 mr-13 font-semibold leading-relaxed">
           تابع آخر المستجدات والتحديثات الأكاديمية والأنشطة مباشرة من قنوات جامعة الإمام الرسمية
         </p>
       </div>

       {loading ? (
         <Masonry
           breakpointCols={breakpointColumnsObj}
           className="flex w-auto gap-6 relative z-10"
           columnClassName="bg-clip-padding flex flex-col gap-6"
         >
           {Array.from({ length: 3 }).map((_, i) => (
             <div key={i} className="w-full break-inside-avoid bg-zinc-900/40 border border-zinc-800 rounded-xl p-5 shadow-sm animate-pulse flex flex-col gap-4">
               <div className="flex gap-3 items-center">
                 <div className="w-10 h-10 rounded-full bg-zinc-950/40 animate-pulse" />
                 <div className="flex flex-col gap-2 flex-1">
                   <div className="h-4 w-24 bg-zinc-950/40 rounded" />
                   <div className="h-3 w-16 bg-zinc-950/40 rounded" />
                 </div>
               </div>
               <div className="h-24 w-full bg-zinc-950/40 rounded-xl" />
               <div className="h-4 w-full bg-zinc-950/40 rounded" />
             </div>
           ))}
         </Masonry>
       ) : (
         <div className="w-full relative z-10 flex flex-col">
             
             {/* Beautifully Redesigned Featured Post Section */}
             {featuredPost && renderFeaturedPost(featuredPost)}

             {remainingNews.length > 0 && (
               <div className="mb-8 flex items-center gap-4">
                 <span className="text-xs font-bold text-zinc-400 tracking-wider">التحديثات الأخرى</span>
                 <div className="h-px bg-zinc-800 flex-1" />
               </div>
             )}

             {remainingNews.length > 0 && (
               <Masonry
                 breakpointCols={breakpointColumnsObj}
                 className="flex w-auto gap-6"
                 columnClassName="bg-clip-padding flex flex-col"
               >
                   {remainingNews.map((item) => renderNewsCard(item))}
               </Masonry>
             )}

             {!featuredPost && remainingNews.length === 0 && (
               <div className="flex flex-col items-center justify-center py-32 text-gray-400 gap-4 bg-white border border-gray-100 rounded-3xl w-full">
                 <Twitter className="w-12 h-12 text-gray-300" />
                 <p className="text-lg font-medium">لا توجد تحديثات متاحة حالياً.</p>
               </div>
             )}
             
             {hasMore && !loading && (
               <div ref={observerTarget} className="w-full h-10 flex items-center justify-center mt-8">
                 {loadingMore && <div className="w-6 h-6 border-2 border-[var(--color-imamu-blue)] border-t-transparent rounded-full animate-spin" />}
               </div>
             )}
             {!hasMore && news.length > 0 && (
               <div className="w-full text-center py-12 text-gray-400 text-xs font-semibold">
                 وصلت إلى نهاية التحديثات
               </div>
             )}
         </div>
       )}

       {imageModal && (
           <div 
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm group"
              onClick={() => setImageModal(null)}
           >
              <button 
                className="absolute top-4 right-4 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition z-50"
                onClick={() => setImageModal(null)}
              >
                 <X className="w-6 h-6" />
              </button>
              
              {imageModal.images.length > 1 && (
                  <>
                      <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setImageModal({
                                images: imageModal.images,
                                currentIndex: imageModal.currentIndex === 0 ? imageModal.images.length - 1 : imageModal.currentIndex - 1
                            });
                        }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition z-50"
                      >
                        <ChevronLeft className="w-8 h-8" />
                      </button>
                      <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            setImageModal({
                                images: imageModal.images,
                                currentIndex: imageModal.currentIndex === imageModal.images.length - 1 ? 0 : imageModal.currentIndex + 1
                            });
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition z-50"
                      >
                        <ChevronRight className="w-8 h-8" />
                      </button>
                  </>
              )}

              <img 
                 src={imageModal.images[imageModal.currentIndex]} 
                 className="max-w-full max-h-full object-contain rounded-xl relative z-40" 
                 alt="Full size"
                 onClick={(e) => e.stopPropagation()} 
                 referrerPolicy="no-referrer"
              />
              
              {imageModal.images.length > 1 && (
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 pointer-events-none z-50">
                      {imageModal.images.map((_, idx) => (
                          <div 
                              key={idx} 
                              className={`w-2 h-2 rounded-full transition-all ${idx === imageModal.currentIndex ? 'bg-white scale-125' : 'bg-white/50'}`}
                          />
                      ))}
                  </div>
              )}
           </div>
       )}
    </div>
  );
}
