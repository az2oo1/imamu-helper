'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { useRouter } from 'next/navigation';
import * as Icons from 'lucide-react';
import { 
  HelpCircle, GraduationCap, Search, CheckSquare, 
  ArrowLeft, Video, ThumbsUp, ThumbsDown, MessageSquare, 
  CheckCircle, X, AlertCircle, ExternalLink, Compass, Info,
  Share2
} from 'lucide-react';
import { InView, SpotlightCard } from '../components/ui';
import { getSectionColorClasses } from '../lib/section-colors';

interface Section {
  id: number;
  title: string;
  icon: string;
  color: string;
}

interface Tutorial {
  id: number;
  sectionId: number;
  title: string;
  description: string;
  text: string;
  steps: string[];
  videoUrl?: string;
  imageUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
}

function matchSubjectIds(id1: any, id2: any): boolean {
  if (id1 == null || id2 == null || id1 === '' || id2 === '') return false;
  const s1 = String(id1).trim();
  const s2 = String(id2).trim();
  if (s1 === s2) return true;
  const n1 = Number(s1);
  const n2 = Number(s2);
  if (!isNaN(n1) && !isNaN(n2)) {
    return n1 === n2;
  }
  return false;
}

interface Feedback {
  id: number;
  tutorialId: number;
  userId: string;
  userName: string;
  isHelpful: boolean;
  comment?: string;
  createdAt: string;
  profilePicUrl?: string;
}

export function HowToPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [sections, setSections] = useState<Section[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [tutorialFeedback, setTutorialFeedback] = useState<Feedback[]>([]);
  const [tutorialComments, setTutorialComments] = useState<any[]>([]);
  const [tutorialCommentInput, setTutorialCommentInput] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');

  const [customAlert, setCustomAlert] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string } | null>(null);
  const [negativeFeedbackModal, setNegativeFeedbackModal] = useState<Tutorial | null>(null);
  const [negativeFeedbackComment, setNegativeFeedbackComment] = useState('');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const loadFeedback = async (tutId: number) => {
    try {
      const res = await fetch(`/api/tutorials/${tutId}`).then(r => r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : null);
      if (res && Array.isArray(res.feedback)) {
        setTutorialFeedback(res.feedback);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadData = async () => {
    try {
      const secRes = await fetch('/api/tutorials/sections').then(r => r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : []);
      const tutRes = await fetch('/api/tutorials').then(r => r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : []);
      if (Array.isArray(secRes)) setSections(secRes);
      if (Array.isArray(tutRes)) {
        setTutorials(tutRes);

        // Auto-select tutorial if URL contains ?id=... or ?tutorial=...
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const targetId = params.get('id') || params.get('tutorial');
          if (targetId) {
            const matched = tutRes.find((t: any) => matchSubjectIds(t.id, targetId));
            if (matched) {
              selectTutorial(matched, false);
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to load guide data:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Listen to browser navigation (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const targetId = params.get('id') || params.get('tutorial');
        if (targetId) {
          const matched = tutorials.find(t => matchSubjectIds(t.id, targetId));
          if (matched) {
            selectTutorial(matched, false);
            return;
          }
        }
        setSelectedTutorial(null);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [tutorials]);

  const selectTutorial = async (tut: Tutorial, updateUrl: boolean = true) => {
    setSelectedTutorial(tut);
    if (updateUrl && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('id', String(tut.id));
      window.history.pushState({ tutorialId: tut.id }, '', url.toString());
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const res = await fetch(`/api/tutorials/${tut.id}`).then(r => r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : null);
      if (res) setSelectedTutorial(res);
      
      const commentsRes = await fetch(`/api/tutorials/${tut.id}/comments`).then(r => r.ok && r.headers.get('content-type')?.includes('json') ? r.json() : []);
      if (Array.isArray(commentsRes)) {
        setTutorialComments(commentsRes);
      }
      
      if (res && Array.isArray(res.feedback)) {
        setTutorialFeedback(res.feedback);
      }
    } catch (e) {
      console.error("Failed to load tutorial details:", e);
    }
  };

  const submitTutorialComment = async () => {
    if (!selectedTutorial) return;
    if (!user) {
      setCustomAlert({
        type: 'info',
        title: 'تسجيل الدخول مطلوب',
        message: 'الرجاء تسجيل الدخول أولاً للمشاركة وكتابة تعليق.'
      });
      return;
    }
    if (!tutorialCommentInput.trim()) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/tutorials/${selectedTutorial.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: tutorialCommentInput.trim() })
      }).then(r => r.json());

      if (res && res.id) {
        setTutorialComments(prev => [...prev, res]);
        setTutorialCommentInput('');
      }
    } catch (e) {
      console.error("Failed to submit comment:", e);
    }
  };

  const filteredTutorials = tutorials.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const submitPositiveFeedback = async (tutId: number) => {
    if (!user) {
      setCustomAlert({
        type: 'info',
        title: 'تسجيل الدخول مطلوب',
        message: 'الرجاء تسجيل الدخول أولاً لتقييم الشروحات.'
      });
      return;
    }
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/tutorials/${tutId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isHelpful: true })
      });
      if (res.ok) {
        setCustomAlert({
          type: 'success',
          title: 'شكراً لتقييمك!',
          message: 'تم تسجيل تقييمك الإيجابي لمساعدتنا على تحسين المنصة.'
        });
        loadFeedback(tutId);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const openNegativeFeedback = (tut: Tutorial) => {
    if (!user) {
      setCustomAlert({
        type: 'info',
        title: 'تسجيل الدخول مطلوب',
        message: 'الرجاء تسجيل الدخول أولاً لتقييم الشروحات.'
      });
      return;
    }
    setNegativeFeedbackModal(tut);
    setNegativeFeedbackComment('');
  };

  const submitNegativeFeedback = async () => {
    if (!negativeFeedbackModal) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/tutorials/${negativeFeedbackModal.id}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          isHelpful: false,
          comment: negativeFeedbackComment.trim() || 'لا توجد تفاصيل إضافية'
        })
      });
      if (res.ok) {
        setCustomAlert({
          type: 'success',
          title: 'تم إرسال ملاحظتك',
          message: 'نشكرك على الملاحظات، وسيعمل فريق الإشراف على تحسين الشرح وحل مشكلتك.'
        });
        loadFeedback(negativeFeedbackModal.id);
        setNegativeFeedbackModal(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full pb-24 px-4 sm:px-6 lg:px-8 pt-8 relative max-w-7xl mx-auto min-h-screen text-right" dir="rtl">
      
      {/* Main Header */}
      <div className="mb-8 relative z-10">
        <span className="text-xs sm:text-sm font-semibold tracking-widest text-[var(--color-imamu-accent)] uppercase mb-2 block">
          دليل الطالب والمستجدين
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900 dark:text-white mb-2">الدليلة</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl">
          دليلك المتكامل للتعرف على الأنظمة، الإجراءات الأكاديمية، والخدمات الطلابية بجامعة الإمام.
        </p>
      </div>

      <AnimatePresence mode="wait">
        
        {/* VIEW 1: Tutorial Detail View */}
        {selectedTutorial ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-full max-w-4xl mx-auto relative z-10 pt-2 sm:pt-4"
          >
            {/* Action Bar: Back Button & Direct Link Share Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <button 
                onClick={() => {
                  setSelectedTutorial(null);
                  if (typeof window !== 'undefined') {
                    const url = new URL(window.location.href);
                    url.searchParams.delete('id');
                    url.searchParams.delete('tutorial');
                    window.history.pushState({}, '', url.pathname);
                  }
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="btn-rise inline-flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300 font-bold bg-white dark:bg-zinc-900 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 rotate-180 text-[var(--color-imamu-accent)]" /> العودة إلى قائمة الشروحات
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    const shareUrl = `${window.location.origin}/howto?id=${selectedTutorial.id}`;
                    if (navigator?.clipboard?.writeText) {
                      navigator.clipboard.writeText(shareUrl);
                    }
                    setCustomAlert({
                      type: 'success',
                      title: 'تم نسخ الرابط',
                      message: 'تم نسخ رابط الشرح إلى الحافظة، يمكنك الآن مشاركته مع الطلاب للوصول السريع للشرح.'
                    });
                  }
                }}
                className="btn-rise inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-700 dark:text-zinc-300 shadow-2xs hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" /> نسخ رابط الشرح
              </button>
            </div>

            {/* Header Detail Card */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xs mb-8">
              {(() => {
                const section = sections.find(s => matchSubjectIds(s.id, selectedTutorial.sectionId));
                const colorClasses = getSectionColorClasses(section?.color);
                return (
                  <span className={`text-xs font-bold px-3 py-1 rounded-lg border mb-4 inline-block ${colorClasses.badge}`}>
                    {section?.title || 'شرح'}
                  </span>
                );
              })()}
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">{selectedTutorial.title}</h1>
              <p className="text-slate-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed mb-6 font-normal">{selectedTutorial.description}</p>
              
              <div className="h-px bg-slate-100 dark:bg-zinc-800 w-full mb-6" />

              {/* Main Tutorial Infographic / Image if available */}
              {selectedTutorial.imageUrl && (
                <div className="mb-8 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-2 sm:p-3 text-center">
                  <img 
                    src={selectedTutorial.imageUrl} 
                    alt={selectedTutorial.title} 
                    className="w-full h-auto max-h-[520px] object-contain rounded-xl shadow-xs cursor-pointer hover:opacity-95 transition mx-auto"
                    onClick={() => setZoomedImage(selectedTutorial.imageUrl!)}
                  />
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-2 font-medium flex items-center justify-center gap-1.5">
                    <Search className="w-3.5 h-3.5" /> انقر على الصورة لتكبيرها وقراءتها بدقة عالية
                  </p>
                </div>
              )}

              <div className="mb-6 text-xs sm:text-sm text-slate-800 dark:text-zinc-200 leading-relaxed font-normal">
                {renderTutorialContent(selectedTutorial.text, setZoomedImage, (url) => router.push(url))}
              </div>

              {/* Detailed Steps */}
              {!selectedTutorial.text.trim().startsWith('[') && selectedTutorial.steps && selectedTutorial.steps.filter(s => s && (typeof s === 'string' ? s.trim().length > 0 : true)).length > 0 && (
                <>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-[var(--color-imamu-accent)]" /> خطوات وتفاصيل الشرح:
                  </h2>
                  <div className="space-y-6 mb-8 text-right" dir="rtl">
                    {selectedTutorial.steps.filter(s => s && (typeof s === 'string' ? s.trim().length > 0 : true)).map((rawStep: any, index, arr) => {
                      const isLast = index === arr.length - 1;
                      let stepText = '';
                      let stepImg: string | null = null;
                      if (typeof rawStep === 'string') {
                        if (rawStep.includes('|||')) {
                          const parts = rawStep.split('|||');
                          stepText = parts[0].trim();
                          stepImg = parts[1].trim();
                        } else {
                          stepText = rawStep;
                        }
                      } else if (rawStep && typeof rawStep === 'object') {
                        stepText = rawStep.text || '';
                        stepImg = rawStep.image || rawStep.imageUrl || null;
                      }

                      return (
                        <div key={index} className="relative flex items-start gap-4">
                          <div className="relative flex flex-col items-center shrink-0 w-7">
                            <span className="w-7 h-7 rounded-full bg-[var(--color-imamu-brown)] text-white text-xs font-bold flex items-center justify-center shadow-2xs z-10 shrink-0">
                              {index + 1}
                            </span>
                            {!isLast && (
                              <span className="absolute top-7 bottom-0 right-1/2 translate-x-1/2 w-0.5 bg-slate-200 dark:bg-zinc-800 -mb-6" />
                            )}
                          </div>
                          <div className="flex-1 pt-0.5 min-w-0">
                            <p className="text-xs sm:text-sm text-slate-800 dark:text-zinc-200 font-normal leading-relaxed">{stepText}</p>
                            {stepImg && (
                              <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 max-w-md bg-slate-50 dark:bg-zinc-950 p-1.5 shadow-xs">
                                <img 
                                  src={stepImg} 
                                  alt={`خطوة ${index + 1}`} 
                                  className="w-full h-auto max-h-[260px] object-contain rounded-lg cursor-pointer hover:opacity-90 transition mx-auto"
                                  onClick={() => setZoomedImage(stepImg)}
                                />
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 block text-center mt-1">انقر للتكبير 🔍</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Action Link Button (Only show if tutorial has no links section) */}
              {(() => {
                let hasButtonsBlock = false;
                if (selectedTutorial.text && selectedTutorial.text.trim().startsWith('[')) {
                  try {
                    const parsed = JSON.parse(selectedTutorial.text);
                    hasButtonsBlock = Array.isArray(parsed) && parsed.some(b => b.type === 'buttons' && Array.isArray(b.buttons) && b.buttons.length > 0);
                  } catch {}
                }

                if (!selectedTutorial.linkUrl || hasButtonsBlock) return null;

                return (
                  <div className="mt-8 mb-2 text-right">
                    <a 
                      href={selectedTutorial.linkUrl}
                      target={selectedTutorial.linkUrl.startsWith('http') ? '_blank' : undefined}
                      rel={selectedTutorial.linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                      onClick={(e) => {
                        if (!selectedTutorial.linkUrl!.startsWith('http')) {
                          e.preventDefault();
                          router.push(selectedTutorial.linkUrl!);
                        }
                      }}
                      className="btn-rise inline-flex items-center gap-2 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] active:scale-95 text-white font-bold py-3 px-5 rounded-xl text-xs shadow-md shadow-[var(--color-imamu-brown)/20] w-full sm:w-auto justify-center cursor-pointer transition duration-200"
                    >
                      <ExternalLink className="w-4 h-4 shrink-0" /> {selectedTutorial.linkTitle || 'الانتقال للرابط المذكور'}
                    </a>
                  </div>
                );
              })()}

              {/* Feedback Rating Widget */}
              <div className="mt-10 pt-6 border-t border-slate-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
                <div className="text-right">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1">هل كان هذا الشرح مفيداً لك؟</h4>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">تقييمك يساعد زملاءك الطلاب للوصول لأفضل الشروحات.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => submitPositiveFeedback(selectedTutorial.id)}
                    className="inline-flex items-center gap-2 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 py-2 px-3.5 rounded-xl font-bold shadow-2xs"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> مفيد جداً
                  </button>
                  <button 
                    onClick={() => openNegativeFeedback(selectedTutorial)}
                    className="inline-flex items-center gap-2 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 py-2 px-3.5 rounded-xl font-bold shadow-2xs"
                  >
                    <ThumbsDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> غير واضح / غير مفيد
                  </button>
                </div>
              </div>
            </div>

            {/* Public Q&A / Comments & Discussion Section */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xs space-y-6 text-right" dir="rtl">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4.5 h-4.5 text-[var(--color-imamu-accent)]" /> استفسارات ومناقشة الشرح ({tutorialComments.length})
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  إذا كان لديك سؤال أو استفسار حول هذا الشرح، يمكنك كتابته هنا ليتفاعل معك الطلاب أو المشرفون.
                </p>
              </div>

              {/* Comments List */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {tutorialComments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 dark:text-zinc-500 italic bg-slate-50 dark:bg-zinc-950 rounded-xl border border-slate-200 dark:border-zinc-800">
                    لا توجد تعليقات أو استفسارات حالياً. كن أول من يكتب استفساراً!
                  </div>
                ) : (
                  tutorialComments.map(c => (
                    <div key={c.id} className="border border-slate-200 dark:border-zinc-800 p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        {c.profilePicUrl ? (
                          <img src={c.profilePicUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-200 dark:border-zinc-700" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-stone-50 dark:bg-stone-950/50 text-[var(--color-imamu-accent)] flex items-center justify-center shrink-0 font-bold text-xs border border-amber-200 dark:border-stone-900/50">
                            {c.userName ? c.userName.charAt(0).toUpperCase() : 'ط'}
                          </div>
                        )}
                        <div className="flex flex-col text-right">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{c.userName || 'طالب'}</span>
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500">
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-800 dark:text-zinc-200 leading-relaxed font-medium pr-10">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input Form */}
              <div className="border-t border-slate-100 dark:border-zinc-800 pt-4 space-y-3">
                {user ? (
                  <div className="flex flex-col gap-3">
                    <textarea
                      rows={3}
                      value={tutorialCommentInput}
                      onChange={e => setTutorialCommentInput(e.target.value)}
                      placeholder="اكتب استفسارك أو تعليقك هنا..."
                      className="w-full p-3.5 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-stone-100 dark:focus:ring-stone-900 focus:border-[var(--color-imamu-brown)] text-xs resize-none text-right text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={submitTutorialComment}
                        disabled={!tutorialCommentInput.trim()}
                        className="btn-rise bg-[var(--color-imamu-brown)] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-[var(--color-imamu-brown)/20] disabled:opacity-50 cursor-pointer"
                      >
                        إرسال التعليق
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] rounded-xl p-4 text-xs font-bold text-center">
                    يرجى تسجيل الدخول لتتمكن من إضافة استفسار أو التعليق على هذا الشرح.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          
          /* VIEW 2: General Catalog View */
          <motion.div
            key="catalog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full relative z-10 space-y-8"
          >
            {/* Newbie Guide Banner Card */}
            <div className="w-full max-w-4xl mx-auto">
              <div 
                onClick={() => router.push('/newbie')}
                className="w-full relative overflow-hidden rounded-2xl p-6 sm:p-8 cursor-pointer border transition-all duration-300 group"
                style={{
                  background: 'var(--bg-card)',
                  borderColor: 'var(--border-color)'
                }}
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-5 text-center sm:text-right flex-col sm:flex-row">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border transition-transform duration-300 group-hover:scale-105"
                      style={{
                        background: 'color-mix(in srgb, var(--color-imamu-brown) 15%, transparent)',
                        borderColor: 'color-mix(in srgb, var(--color-imamu-brown) 30%, transparent)',
                        color: 'var(--color-imamu-accent)'
                      }}
                    >
                      <GraduationCap className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-xl sm:text-2xl font-serif font-bold transition-colors" style={{ color: 'var(--text-main)' }}>
                        دليل الطلاب المستجدين 🎓
                      </h2>
                      <p className="text-xs mt-1.5 max-w-lg leading-relaxed font-normal transition-colors" style={{ color: 'var(--text-muted)' }}>
                        بوابتك الشاملة للتعرف على الأنظمة الأكاديمية، السكن، المكافآت، والمباني والتحضيري خطوة بخطوة.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push('/newbie');
                    }}
                    className="btn-rise px-5 py-2.5 font-bold text-xs rounded-xl shrink-0 transition-all duration-200 cursor-pointer flex items-center gap-2 group/btn shadow-xs hover:shadow-md active:scale-95"
                    style={{
                      background: 'var(--color-imamu-brown)',
                      color: 'var(--btn-text-primary, #ffffff)'
                    }}
                  >
                    <span>استكشف الدليل الأكاديمي</span>
                    <ArrowLeft className="w-3.5 h-3.5 transition-transform duration-200 group-hover/btn:-translate-x-1" />
                  </button>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  <Search className="w-4.5 h-4.5 text-slate-400 dark:text-zinc-500" />
                </div>
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن شروحات، مواضيع، أو خدمات..."
                  className="w-full pr-11 pl-4 py-3 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-stone-100 dark:focus:ring-stone-900 focus:border-[var(--color-imamu-brown)] outline-none shadow-2xs text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Categories & Lists */}
            <InView preset="fade-up" delay={0.1} className="w-full max-w-4xl mx-auto space-y-12">
              {(() => {
                const matchedTutorialIds = new Set<any>();

                const renderedSections = sections.map(section => {
                  const sectionTutorials = filteredTutorials.filter(t => {
                    const isMatch = matchSubjectIds(t.sectionId, section.id);
                    if (isMatch) matchedTutorialIds.add(t.id);
                    return isMatch;
                  });
                  if (sectionTutorials.length === 0) return null;

                  const SectionIcon = (Icons[section.icon as keyof typeof Icons] || Icons.BookOpen) as React.ComponentType<any>;
                  const colorClasses = getSectionColorClasses(section.color);

                  return (
                    <div key={section.id} className="space-y-5">
                      {/* Section Header */}
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs ${colorClasses.container}`}>
                            <SectionIcon className="w-4.5 h-4.5" />
                          </div>
                          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{section.title}</h2>
                        </div>
                        <span className={`text-xs font-bold border px-3 py-1 rounded-full ${colorClasses.badge}`}>
                          {sectionTutorials.length} شروحات
                        </span>
                      </div>

                      {/* Tutorial Cards Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {sectionTutorials.map((tutorial) => (
                          <SpotlightCard
                            key={tutorial.id}
                            spotlightColor={colorClasses.spotlight}
                            onClick={() => selectTutorial(tutorial)}
                            className="cursor-pointer border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
                          >
                            <div className="flex items-start gap-4 h-full">
                              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${colorClasses.container}`}>
                                <SectionIcon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0 text-right">
                                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-1 leading-snug truncate">
                                  {tutorial.title}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                                  {tutorial.description}
                                </p>
                              </div>
                            </div>
                          </SpotlightCard>
                        ))}
                      </div>
                    </div>
                  );
                });

                const orphanTutorials = filteredTutorials.filter(t => !matchedTutorialIds.has(t.id));

                return (
                  <>
                    {renderedSections}
                    {orphanTutorials.length > 0 && (
                      <div className="space-y-5">
                        <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs text-[var(--color-imamu-accent)] bg-stone-50 dark:bg-stone-950/50 border-amber-200 dark:border-stone-900/50">
                              <GraduationCap className="w-4.5 h-4.5" />
                            </div>
                            <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">شروحات عامة وإضافية</h2>
                          </div>
                          <span className="text-xs text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] font-bold bg-stone-50 dark:bg-stone-950/50 border border-amber-200 dark:border-stone-900/50 px-3 py-1 rounded-full">
                            {orphanTutorials.length} شروحات
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {orphanTutorials.map((tutorial) => (
                            <SpotlightCard
                              key={tutorial.id}
                              spotlightColor="rgba(139, 94, 60, 0.12)"
                              onClick={() => selectTutorial(tutorial)}
                              className="cursor-pointer border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
                            >
                              <div className="flex items-start gap-4 h-full">
                                <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-stone-950/50 border border-amber-200 dark:border-stone-900/50 text-[var(--color-imamu-accent)] flex items-center justify-center shrink-0">
                                  <GraduationCap className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0 text-right">
                                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-1 leading-snug truncate">
                                    {tutorial.title}
                                  </h3>
                                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed line-clamp-2">
                                    {tutorial.description}
                                  </p>
                                </div>
                              </div>
                            </SpotlightCard>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {filteredTutorials.length === 0 && (
                <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-zinc-400">
                  <HelpCircle className="w-10 h-10 text-slate-300 dark:text-zinc-600" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">لا توجد نتائج مطابقة</h3>
                  <p className="text-xs max-w-xs leading-relaxed">تأكد من كتابة الكلمة بشكل صحيح، أو ابحث في تصنيفات الدليلة الأخرى.</p>
                </div>
              )}
            </InView>

            {/* Directories Banners Grid */}
            <div className="w-full max-w-4xl mx-auto mt-16 border-t border-slate-200 dark:border-zinc-800 pt-10 text-right">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2 pr-1">
                <Compass className="w-5 h-5 text-teal-600 dark:text-teal-400" /> وسائل الاتصال بالجامعة 📞
              </h2>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mb-6">
                سواء كنت بحاجة للاتصال بهاتف جهة أكاديمية أو العثور على البريد الإلكتروني الرسمي لكليتك، اختر الدليل المناسب أدناه:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SpotlightCard 
                  onClick={() => router.push('/numbers')}
                  className="cursor-pointer border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xs group hover:border-emerald-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center shrink-0">
                      <Icons.Phone className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">دليل الأرقام الهاتفية والتحويلات 📞</h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">أرقام الكليات، العمادات، والتحويلات.</p>
                    </div>
                  </div>
                </SpotlightCard>

                <SpotlightCard 
                  onClick={() => router.push('/emails')}
                  className="cursor-pointer border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xs group hover:border-blue-500/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center shrink-0">
                      <Icons.Mail className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">دليل البريد الإلكتروني الأكاديمي ✉️</h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">إيميلات شؤون الطلاب والأقسام.</p>
                    </div>
                  </div>
                </SpotlightCard>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* POPUP MODALS LAYER */}
      <AnimatePresence>
        {customAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 border border-slate-200 dark:border-zinc-800 text-center"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                customAlert.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400' : 
                customAlert.type === 'error' ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400' : 'bg-stone-50 dark:bg-stone-950/50 text-[var(--color-imamu-accent)]'
              }`}>
                {customAlert.type === 'success' && <CheckCircle className="w-6 h-6" />}
                {customAlert.type === 'error' && <AlertCircle className="w-6 h-6" />}
                {customAlert.type === 'info' && <HelpCircle className="w-6 h-6" />}
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{customAlert.title}</h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mb-6 leading-relaxed">{customAlert.message}</p>
              <button 
                onClick={() => setCustomAlert(null)}
                className="w-full bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md shadow-[var(--color-imamu-brown)/20]"
              >
                موافق
              </button>
            </motion.div>
          </div>
        )}

        {negativeFeedbackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 border border-slate-200 dark:border-zinc-800"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-3.5 mb-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">ملاحظاتك حول هذا الشرح 📝</h3>
                <button onClick={() => setNegativeFeedbackModal(null)} className="text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-white">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mb-4 leading-relaxed">
                يؤسفنا أن الشرح لم يكن كافياً. يرجى كتابة المشكلة التي واجهتك (مثال: الشرح قديم، الروابط معطلة، أو نقص في الخطوات) لمساعدتنا على تحسينه:
              </p>
              <textarea 
                rows={4}
                value={negativeFeedbackComment}
                onChange={e => setNegativeFeedbackComment(e.target.value)}
                placeholder="اكتب تعليقك هنا..."
                className="w-full p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-stone-100 dark:focus:ring-stone-900 focus:border-[var(--color-imamu-brown)] text-xs resize-none mb-6 text-right text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setNegativeFeedbackModal(null)}
                  className="flex-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold py-2.5 rounded-xl text-xs transition"
                >
                  إلغاء
                </button>
                <button 
                  onClick={submitNegativeFeedback}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md shadow-rose-600/20"
                >
                  إرسال الملاحظة
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Zoomed Image Lightbox */}
        {zoomedImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 cursor-zoom-out"
            onClick={() => setZoomedImage(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setZoomedImage(null)}
                className="absolute -top-12 left-0 sm:left-auto sm:-right-2 bg-white/20 hover:bg-white/30 text-white rounded-full p-2 transition backdrop-blur-xs"
                title="إغلاق"
              >
                <X className="w-6 h-6" />
              </button>
              <img 
                src={zoomedImage} 
                alt="تكبير الصورة" 
                className="max-h-[85vh] max-w-full object-contain rounded-2xl shadow-2xl bg-white dark:bg-zinc-900 p-1"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function renderFormattedInline(str: string): React.ReactNode {
  if (!str) return null;
  // Strip any markdown link syntax [text](url) -> text, so no links or URLs clutter the text
  const cleaned = str.replace(/\[(.*?)\]\((?:https?:\/\/[^\s)]+)\)/g, '$1');
  const regex = /\*\*(.*?)\*\*/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIdx) {
      parts.push(cleaned.substring(lastIdx, match.index));
    }
    if (match[1]) {
      parts.push(
        <strong key={`bold-${match.index}`} className="font-bold text-slate-900 dark:text-white">
          {match[1]}
        </strong>
      );
    }
    lastIdx = regex.lastIndex;
  }

  if (lastIdx < cleaned.length) {
    parts.push(cleaned.substring(lastIdx));
  }

  return parts.length > 0 ? parts : cleaned;
}

function renderTutorialContent(
  text: string, 
  onImageClick?: (url: string) => void,
  onNavigate?: (url: string) => void
) {
  if (!text) return null;

  if (text.trim().startsWith('[')) {
    try {
      const blocks = JSON.parse(text);
      if (Array.isArray(blocks)) {
        return (
          <div className="space-y-6 text-right" dir="rtl">
            {blocks.map((block: any, blockIdx: number) => {
              if (block.type === 'text') {
                return (
                  <p key={blockIdx} className="text-slate-800 dark:text-zinc-200 text-xs sm:text-sm leading-relaxed font-normal whitespace-pre-line">
                    {renderFormattedInline(block.content || block.text || '')}
                  </p>
                );
              }

              if (block.type === 'callout' || block.type === 'alert') {
                const variant = block.variant || 'info';
                const isWarning = variant === 'warning';
                const isDanger = variant === 'danger' || variant === 'error';
                const isSuccess = variant === 'success';

                const rawContent = (block.content || block.text || '').trim();
                let lines: string[] = [];
                if (rawContent.includes('\n')) {
                  lines = rawContent.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
                } else if (/(\d+[\.\)]\s+)/.test(rawContent)) {
                  lines = rawContent.split(/(?=(?:^|\s+)\d+[\.\)]\s+)/).map((l: string) => l.trim()).filter(Boolean);
                } else {
                  lines = [rawContent];
                }

                return (
                  <div 
                    key={blockIdx} 
                    className={`p-4 sm:p-5 rounded-2xl border flex items-start gap-3.5 my-5 shadow-xs ${
                      isWarning ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200' :
                      isDanger ? 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200' :
                      isSuccess ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200' :
                      'bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-200'
                    }`}
                  >
                    {isDanger || isWarning ? (
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                    )}
                    <div className="flex-1 min-w-0 text-right font-normal">
                      {block.title && (
                        <h4 className="font-bold text-xs sm:text-sm mb-2 text-slate-900 dark:text-white flex items-center gap-1.5">
                          {block.title}
                        </h4>
                      )}
                      {lines.length > 1 ? (
                        <div className="space-y-2 mt-1">
                          {lines.map((line, lIdx) => (
                            <div key={lIdx} className="text-xs sm:text-sm leading-relaxed flex items-start gap-2">
                              <span className="opacity-60 text-xs mt-1 shrink-0">•</span>
                              <div className="flex-1 min-w-0">{renderFormattedInline(line)}</div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                          {renderFormattedInline(rawContent)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              if (block.type === 'media') {
                const images: string[] = [
                  ...(block.mediaUrls || []),
                  ...(block.images || []),
                  ...(block.mediaType === 'image' && block.mediaUrl ? [block.mediaUrl] : [])
                ].filter(Boolean);
                const uniqueImages = Array.from(new Set(images));
                const video = block.videoUrl || (block.mediaType === 'video' ? block.mediaUrl : null);

                if (uniqueImages.length === 0 && !video) return null;

                return (
                  <div key={blockIdx} className="my-6 space-y-4">
                    {/* Video Player if present */}
                    {video && (
                      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-black max-w-2xl mx-auto shadow-md">
                        {video.includes('youtube.com') || video.includes('youtu.be') ? (
                          <div className="aspect-video w-full">
                            <iframe 
                              src={video.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} 
                              className="w-full h-full" 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                              allowFullScreen 
                            />
                          </div>
                        ) : (
                          <video src={video} controls className="w-full max-h-[460px] object-contain mx-auto" />
                        )}
                      </div>
                    )}

                    {/* Images Gallery */}
                    {uniqueImages.length === 1 ? (
                      <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-2 text-center max-w-2xl mx-auto shadow-xs">
                        <img 
                          src={uniqueImages[0]} 
                          alt="صورة توضيحية للشرح" 
                          className="w-full h-auto max-h-[480px] object-contain rounded-xl cursor-pointer hover:opacity-95 transition mx-auto"
                          onClick={() => onImageClick?.(uniqueImages[0])}
                        />
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500 block text-center mt-2">انقر على الصورة لتكبيرها بدقة عالية 🔍</span>
                      </div>
                    ) : uniqueImages.length > 1 ? (
                      <div className="border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-zinc-950/50">
                        <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-3">🖼️ معرض الصور التوضيحية ({uniqueImages.length} صور):</span>
                        <div className={`grid gap-3 ${uniqueImages.length === 2 ? 'grid-cols-2' : uniqueImages.length === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
                          {uniqueImages.map((imgUrl, imgIdx) => (
                            <div 
                              key={imgIdx} 
                              className="group relative rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 cursor-pointer shadow-2xs hover:shadow-md transition duration-200 aspect-4/3 flex items-center justify-center p-1"
                              onClick={() => onImageClick?.(imgUrl)}
                            >
                              <img 
                                src={imgUrl} 
                                alt={`صورة توضيحية ${imgIdx + 1}`} 
                                className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition duration-200"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold">
                                🔍 تكبير
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              }

              if (block.type === 'image') {
                const imgUrl = block.url || block.imageUrl;
                if (!imgUrl) return null;
                return (
                  <div key={blockIdx} className="my-6 rounded-2xl overflow-hidden border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-2 text-center max-w-2xl mx-auto shadow-xs">
                    <img 
                      src={imgUrl} 
                      alt={block.caption || 'صورة توضيحية'} 
                      className="w-full h-auto max-h-[500px] object-contain rounded-xl cursor-pointer hover:opacity-95 transition mx-auto"
                      onClick={() => onImageClick?.(imgUrl)}
                    />
                    {block.caption && (
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2 font-medium">{block.caption}</p>
                    )}
                  </div>
                );
              }

              if (block.type === 'list') {
                const items = block.listItems || [];
                if (block.listType === 'ordered') {
                  return (
                    <ol key={blockIdx} className="list-decimal list-inside space-y-2 my-3 pr-2 text-slate-800 dark:text-zinc-200 text-xs sm:text-sm">
                      {items.map((it: string, idx: number) => <li key={idx}>{renderFormattedInline(it)}</li>)}
                    </ol>
                  );
                } else {
                  return (
                    <ul key={blockIdx} className="list-disc list-inside space-y-2 my-3 pr-2 text-slate-800 dark:text-zinc-200 text-xs sm:text-sm">
                      {items.map((it: string, idx: number) => <li key={idx}>{renderFormattedInline(it)}</li>)}
                    </ul>
                  );
                }
              }

              if (block.type === 'table' || block.type === 'grid') {
                const headers = block.tableHeaders || block.headers || [];
                const rows = block.tableRows || block.rows || [];
                return (
                  <div key={blockIdx} className="overflow-x-auto my-5 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xs">
                    <table className="w-full text-right border-collapse text-xs sm:text-sm">
                      <thead className="bg-slate-100 dark:bg-zinc-800/80 border-b border-slate-200 dark:border-zinc-700 font-bold text-slate-900 dark:text-white">
                        <tr>
                          {headers.map((h: string, idx: number) => (
                            <th key={idx} className="p-3.5 text-right font-bold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-800 dark:text-zinc-200">
                        {rows.map((row: string[], rowIdx: number) => (
                          <tr key={rowIdx} className="hover:bg-slate-50/70 dark:hover:bg-zinc-800/40 transition">
                            {row.map((cell: string, cellIdx: number) => (
                              <td key={cellIdx} className="p-3.5 leading-relaxed">{renderFormattedInline(cell)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              if (block.type === 'steps') {
                const steps = block.stepsItems || block.items || [];
                return (
                  <div key={blockIdx} className="space-y-6 my-6 text-right" dir="rtl">
                    {steps.map((rawStep: any, index: number) => {
                      const isLast = index === steps.length - 1;
                      let stepText = '';
                      let stepImg: string | null = null;
                      if (typeof rawStep === 'string') {
                        if (rawStep.includes('|||')) {
                          const parts = rawStep.split('|||');
                          stepText = parts[0].trim();
                          stepImg = parts[1].trim();
                        } else {
                          stepText = rawStep;
                        }
                      } else if (rawStep && typeof rawStep === 'object') {
                        stepText = rawStep.text || '';
                        stepImg = rawStep.image || rawStep.imageUrl || null;
                      }

                      return (
                        <div key={index} className="relative flex items-start gap-4">
                          <div className="relative flex flex-col items-center shrink-0 w-7">
                            <span className="w-7 h-7 rounded-full bg-[var(--color-imamu-brown)] text-white text-xs font-bold flex items-center justify-center shadow-2xs z-10 shrink-0">
                              {index + 1}
                            </span>
                            {!isLast && (
                              <span className="absolute top-7 bottom-0 right-1/2 translate-x-1/2 w-0.5 bg-slate-200 dark:bg-zinc-800 -mb-6" />
                            )}
                          </div>
                          <div className="flex-1 pt-0.5 min-w-0">
                            <p className="text-xs sm:text-sm text-slate-800 dark:text-zinc-200 font-normal leading-relaxed">
                              {renderFormattedInline(stepText)}
                            </p>
                            {stepImg && (
                              <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 max-w-md bg-slate-50 dark:bg-zinc-950 p-1.5 shadow-xs">
                                <img 
                                  src={stepImg} 
                                  alt={`خطوة ${index + 1}`} 
                                  className="w-full h-auto max-h-[260px] object-contain rounded-lg cursor-pointer hover:opacity-90 transition mx-auto"
                                  onClick={() => onImageClick?.(stepImg!)}
                                />
                                <span className="text-[10px] text-slate-400 dark:text-zinc-500 block text-center mt-1">انقر للتكبير 🔍</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              if (block.type === 'buttons') {
                const buttons = block.buttons || [];
                return (
                  <div key={blockIdx} className="pt-2 my-6">
                    <span className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-3">🔗 روابط ومنصات الشرح المعتمدة:</span>
                    <div className="flex flex-wrap gap-2.5 justify-start" dir="rtl">
                      {buttons.map((btn: any, btnIdx: number) => {
                        if (!btn.label || !btn.url) return null;
                        const isExternal = btn.url.startsWith('http');
                        return (
                          <a
                            key={btnIdx}
                            href={btn.url}
                            target={isExternal ? '_blank' : undefined}
                            rel={isExternal ? 'noopener noreferrer' : undefined}
                            onClick={(e) => {
                              if (!isExternal) {
                                e.preventDefault();
                                onNavigate?.(btn.url);
                              }
                            }}
                            className="btn-rise inline-flex items-center gap-2 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] active:scale-95 text-white font-bold py-3 px-5 rounded-xl text-xs shadow-md shadow-[var(--color-imamu-brown)/20] transition duration-200 cursor-pointer"
                          >
                            <ExternalLink className="w-4 h-4 shrink-0" /> {btn.label}
                          </a>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        );
      }
    } catch (e) {
      // fallback to plain text parsing
    }
  }

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = (key: string | number) => {
    if (!currentList) return;
    if (currentList.type === 'ul') {
      elements.push(
        <ul key={key} className="list-disc list-inside space-y-1.5 my-3 pr-2 text-slate-800 dark:text-zinc-200 text-xs sm:text-sm">
          {currentList.items.map((it, idx) => <li key={idx}>{renderFormattedInline(it)}</li>)}
        </ul>
      );
    } else {
      elements.push(
        <ol key={key} className="list-decimal list-inside space-y-1.5 my-3 pr-2 text-slate-800 dark:text-zinc-200 text-xs sm:text-sm">
          {currentList.items.map((it, idx) => <li key={idx}>{renderFormattedInline(it)}</li>)}
        </ol>
      );
    }
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('- ') || line.startsWith('* ')) {
      const item = line.substring(2).trim();
      if (!currentList || currentList.type !== 'ul') {
        flushList(`list-${i}`);
        currentList = { type: 'ul', items: [item] };
      } else {
        currentList.items.push(item);
      }
      continue;
    }

    const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      const item = numMatch[2].trim();
      if (!currentList || currentList.type !== 'ol') {
        flushList(`list-${i}`);
        currentList = { type: 'ol', items: [item] };
      } else {
        currentList.items.push(item);
      }
      continue;
    }

    flushList(`list-${i}`);
    if (line === '') {
      elements.push(<div key={`br-${i}`} className="h-2" />);
    } else {
      elements.push(
        <p key={`p-${i}`} className="text-slate-800 dark:text-zinc-200 text-xs sm:text-sm leading-relaxed mb-3 font-normal whitespace-pre-line">
          {renderFormattedInline(line)}
        </p>
      );
    }
  }

  flushList('list-end');

  return <div className="space-y-1">{elements}</div>;
}

