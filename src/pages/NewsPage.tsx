import React, { useEffect, useState } from "react";
import { Newspaper, Twitter, MessageCircle, Heart, Link as LinkIcon, Send, X, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, formatDistanceToNow } from "date-fns";
import { useAuth } from "../lib/AuthContext";

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
      const limit = isLoadMore ? 4 : 9;
      
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
    
    // Optimistic update
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
        // Revert on failure
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

  const renderNewsCard = (item: any, isFeatured = false) => {
    return (
      <div 
        key={item.id} 
        className={`border-b border-gray-200 last:border-b-0 py-5 sm:py-6 transition flex flex-col group w-full text-right relative hover:bg-gray-50/50 duration-200`}
      >
        {isFeatured && (
          <div className="flex justify-between items-center mb-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[var(--color-imamu-blue)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-imamu-blue)] animate-pulse" />
              تحديث رئيسي
            </div>
          </div>
        )}

        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center shrink-0 overflow-hidden">
            {(item.authorAvatar || item.profilePicUrl) ? (
              <img src={item.authorAvatar || item.profilePicUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <Twitter className="w-6 h-6 text-[#1DA1F2]" />
            )}
          </div>
          <div className="flex flex-col flex-1 min-w-0 justify-center min-h-[48px]">
            <div className="flex items-center gap-1.5 flex-wrap text-right">
              <span className="font-bold text-gray-900 text-[15px] hover:underline truncate">
                {item.authorName || item.source || "IMAMU News"}
              </span>
              <span className="text-gray-400 text-xs whitespace-nowrap" dir="ltr">
                · {item.date ? formatDistanceToNow(parseISO(item.date), { addSuffix: true }) : "مؤخراً"}
              </span>
            </div>
            <span className="text-gray-400 text-xs block" dir="ltr">
               {item.authorHandle || "@" + (item.source || "IMAMU_News")}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col flex-1 pl-1 sm:pl-0 mt-2">
          <p className={`text-gray-800 leading-relaxed whitespace-pre-wrap mb-4 text-right font-normal ${isFeatured ? 'text-[16px] sm:text-[17px]' : 'text-[15px]'}`}>
            {item.content}
          </p>
          
          {item.videoUrl && (
            <div className="w-full rounded-2xl overflow-hidden border border-gray-100 bg-black mb-4" dir="ltr">
              <video 
                src={item.videoUrl} 
                controls
                preload="none"
                playsInline
                className="w-full h-auto max-h-[450px] object-contain mx-auto" 
              />
            </div>
          )}

          {item.parsedImages && item.parsedImages.length > 0 && (
            <div className="w-full rounded-2xl overflow-hidden border border-gray-100 mb-4" dir="ltr">
                {item.parsedImages.length === 1 ? (
                    <img 
                      src={item.parsedImages[0]} 
                      alt="Post media" 
                      onClick={(e) => { e.stopPropagation(); setImageModal({ images: item.parsedImages, currentIndex: 0 }); }}
                      className="w-full h-auto max-h-[550px] object-cover cursor-pointer hover:opacity-95 transition" 
                      loading="lazy" 
                      referrerPolicy="no-referrer"
                    />
                ) : (
                    <div className={`grid gap-0.5 bg-gray-100 ${item.parsedImages.length === 2 ? 'grid-cols-2' : item.parsedImages.length === 3 ? 'grid-cols-2' : 'grid-cols-2'}`}>
                        {item.parsedImages.map((src: string, imgIdx: number) => (
                            <img 
                              key={imgIdx}
                              src={src} 
                              onClick={(e) => { e.stopPropagation(); setImageModal({ images: item.parsedImages, currentIndex: imgIdx }); }}
                              alt="Post media" 
                              className={`w-full object-cover cursor-pointer hover:opacity-95 transition ${item.parsedImages.length === 3 && imgIdx === 0 ? 'col-span-2 h-48 sm:h-64' : 'h-32 sm:h-48'}`} 
                              loading="lazy" 
                              referrerPolicy="no-referrer"
                            />
                        ))}
                    </div>
                )}
            </div>
          )}

          <div className="flex items-center justify-start text-gray-400 mt-2 gap-8 ml-auto border-t border-gray-50 pt-3">
             <button 
                 onClick={(e) => { e.stopPropagation(); loadComments(item.id); }}
                 className="flex items-center gap-2 hover:text-[var(--color-imamu-blue)] transition group/btn py-1 px-2 -ml-2">
               <MessageCircle className="w-4.5 h-4.5 group-hover/btn:scale-110 transition shrink-0" />
               <span className="text-[13px] font-medium">{item.commentsCount || 0}</span>
             </button>
             <button 
                 onClick={(e) => { e.stopPropagation(); toggleLike(item.id); }}
                 className={`flex items-center gap-2 transition group/btn py-1 px-2 ${item.userLiked ? 'text-red-500' : 'hover:text-red-500'}`}>
               <Heart className={`w-4.5 h-4.5 group-hover/btn:scale-110 transition shrink-0 ${item.userLiked ? 'fill-current text-red-500' : ''}`} />
               <span className="text-[13px] font-medium">{item.likesCount || 0}</span>
             </button>
             <button 
                 onClick={(e) => copyLink(item.id, e)}
                 className="flex items-center gap-2 hover:text-green-500 transition group/btn py-1 px-2">
               <LinkIcon className="w-4.5 h-4.5 group-hover/btn:scale-110 transition shrink-0" />
             </button>
          </div>
          
          {commentsOpenId === item.id && (
             <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex gap-2">
                   <input 
                      type="text"
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && postComment(item.id)}
                      placeholder="أضف تعليقاً..."
                      className="flex-1 bg-gray-50 border border-gray-100 px-4 py-2 rounded-full text-sm outline-none text-right placeholder-gray-400 focus:ring-1 focus:ring-[var(--color-imamu-blue)] focus:bg-white transition"
                   />
                   <button 
                      onClick={() => postComment(item.id)}
                      disabled={!commentText.trim()}
                      className="p-2 bg-[var(--color-imamu-blue)] text-white rounded-full disabled:opacity-50 hover:bg-blue-700 transition flex items-center justify-center shrink-0">
                       <Send className="w-4 h-4 rotate-180" />
                   </button>
                </div>
                
                {commentsLoading ? (
                   <div className="text-center py-4 text-gray-400 text-sm">جاري التنزيل...</div>
                ) : comments.length > 0 ? (
                   <div className="flex flex-col gap-3 mt-1 max-h-80 overflow-y-auto pr-1">
                      {comments.map(c => (
                         <div key={c.id} className="flex gap-2.5 items-start">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                               {c.profilePic ? (
                                 <img src={c.profilePic} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                               ) : (
                                 <div className="w-full h-full bg-blue-50 flex items-center justify-center text-[var(--color-imamu-blue)] font-bold text-xs">
                                   {c.userName ? c.userName[0].toUpperCase() : 'U'}
                                 </div>
                               )}
                            </div>
                            <div className="flex flex-col max-w-[85%]">
                               <div className="bg-gray-50 rounded-2xl px-3.5 py-2 border border-gray-100">
                                  <span className="font-semibold text-xs text-gray-900 block mb-0.5">{c.userName || "مستخدم"}</span>
                                  <span className="text-sm text-gray-700 break-words leading-relaxed whitespace-pre-wrap">{c.content}</span>
                                </div>
                               <div className="flex gap-2 items-center mt-0.5 px-2">
                                  <span className="text-[10px] text-gray-400">{formatDistanceToNow(parseISO(c.createdAt), { addSuffix: true })}</span>
                                  {(dbUser?.isAdmin || (user && user.uid === c.userId)) && (
                                    <button 
                                      onClick={() => deleteComment(item.id, c.id)}
                                      className="text-gray-300 hover:text-red-500 transition"
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
                   <div className="text-center py-4 text-gray-400 text-sm">لم يتم العثور على تعليقات. كن الأول!</div>
                )}
             </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 w-full pb-24 px-4 sm:px-6 lg:px-8 xl:px-12 pt-8 relative max-w-[1600px] mx-auto min-h-screen" dir="rtl">
       <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
         <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[var(--color-imamu-blue)]/5 rounded-full blur-[120px]" />
         <div className="absolute top-[40%] -left-40 w-[400px] h-[400px] bg-sky-500/5 rounded-full blur-[100px]" />
       </div>

       <div className="mb-8 px-2 border-b border-gray-100 pb-5 sticky top-16 bg-[var(--color-imamu-bg,#ffffff)]/80 backdrop-blur-md z-40 py-4 -mt-4 flex items-center justify-between">
         <div>
           <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-gray-900 mb-1 flex items-center gap-3">
             <Newspaper className="w-7 h-7 text-[var(--color-imamu-blue)]" />
             تحديثات الجامعة
           </h1>
           <p className="text-gray-500 text-xs sm:text-sm font-medium">ابق على اطلاع بآخر الأخبار والإعلانات الرسمية.</p>
         </div>
       </div>

       {loading ? (
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 relative z-10">
           {Array.from({ length: 4 }).map((_, i) => (
             <div key={i} className="w-full bg-white border border-gray-100 rounded-[2rem] p-5 shadow-sm animate-pulse flex flex-col gap-4">
               <div className="flex gap-3 items-center">
                 <div className="w-12 h-12 rounded-full bg-gray-100 animate-pulse" />
                 <div className="flex flex-col gap-2 flex-1">
                   <div className="h-4 w-24 bg-gray-100 rounded" />
                   <div className="h-3 w-16 bg-gray-100 rounded" />
                 </div>
               </div>
               <div className="h-20 w-full bg-gray-50 rounded-2xl" />
               <div className="h-4 w-full bg-gray-50 rounded" />
             </div>
           ))}
         </div>
       ) : (
         <div className="w-full relative z-10 flex flex-col">
             {featuredPost && (
              <div className="w-full max-w-2xl mx-auto mb-10 flex flex-col border-b border-gray-200 pb-4">
                {renderNewsCard(featuredPost, true)}
              </div>
            )}

            {remainingNews.length > 0 && (
              <div className="mb-6 flex items-center gap-4">
                <span className="text-sm font-bold text-gray-400 tracking-wider">باقي التحديثات</span>
                <div className="h-px bg-gray-100 flex-1" />
              </div>
            )}

            {remainingNews.length > 0 && (
              <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {remainingNews.map((item) => renderNewsCard(item, false))}
              </div>
            )}

            {!featuredPost && remainingNews.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 text-gray-400 gap-4 bg-white border border-gray-100 rounded-3xl w-full">
                <Twitter className="w-12 h-12 text-gray-300" />
                <p className="text-lg font-medium">لا توجد تحديثات لعرضها.</p>
              </div>
            )}
            
            {hasMore && !loading && (
              <div ref={observerTarget} className="w-full h-10 flex items-center justify-center mt-6">
                {loadingMore && <div className="w-6 h-6 border-2 border-[var(--color-imamu-blue)] border-t-transparent rounded-full animate-spin" />}
              </div>
            )}
            {!hasMore && news.length > 0 && (
              <div className="w-full text-center py-8 text-gray-400 text-sm font-medium">
                وصلت إلى النهاية
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
