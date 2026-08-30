'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { useRouter } from 'next/navigation';
import * as Icons from 'lucide-react';
import { 
  HelpCircle, GraduationCap, Search, CheckSquare, 
  ArrowLeft, Video, ThumbsUp, ThumbsDown, MessageSquare, 
  CheckCircle, X, AlertCircle, ExternalLink, Compass
} from 'lucide-react';
import { InView, SpotlightCard } from '../components/ui';

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
      if (Array.isArray(tutRes)) setTutorials(tutRes);
    } catch (e) {
      console.error("Failed to load guide data:", e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectTutorial = async (tut: Tutorial) => {
    setSelectedTutorial(tut);
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
        <span className="text-xs sm:text-sm font-semibold tracking-widest text-blue-600 dark:text-blue-400 uppercase mb-2 block">
          دليل الطالب والمستجدين
        </span>
        <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-slate-900 dark:text-white mb-2">الدليلة</h1>
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
            {/* Back Button */}
            <button 
              onClick={() => {
                setSelectedTutorial(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-2 text-xs text-slate-700 dark:text-zinc-300 font-bold mb-6 bg-white dark:bg-zinc-900 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs self-start hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
            >
              <ArrowLeft className="w-4 h-4 rotate-180 text-blue-600 dark:text-blue-400" /> العودة إلى قائمة الشروحات
            </button>

            {/* Header Detail Card */}
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xs mb-8">
              {(() => {
                const section = sections.find(s => s.id === selectedTutorial.sectionId);
                return (
                  <span className="text-xs font-bold px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 mb-4 inline-block">
                    {section?.title || 'شرح'}
                  </span>
                );
              })()}
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-3">{selectedTutorial.title}</h1>
              <p className="text-slate-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed mb-6 font-normal">{selectedTutorial.description}</p>
              
              <div className="h-px bg-slate-100 dark:bg-zinc-800 w-full mb-6" />

              <div className="mb-6 text-xs sm:text-sm text-slate-800 dark:text-zinc-200 leading-relaxed font-normal">
                {renderTutorialContent(selectedTutorial.text)}
              </div>

              {/* Detailed Steps */}
              {!selectedTutorial.text.trim().startsWith('[') && selectedTutorial.steps && selectedTutorial.steps.filter(s => s.trim().length > 0).length > 0 && (
                <>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400" /> خطوات وتفاصيل الشرح:
                  </h2>
                  <div className="relative border-r-2 border-slate-200 dark:border-zinc-800 mr-2.5 pr-6 space-y-6 mb-8 text-right">
                    {selectedTutorial.steps.filter(s => s.trim().length > 0).map((step, index) => {
                      return (
                        <div key={index} className="relative flex flex-col gap-1">
                          <span className="absolute -right-[33px] top-1 flex items-center justify-center shrink-0 w-5.5 h-5.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-2xs z-10">
                            {index + 1}
                          </span>
                          <p className="text-xs sm:text-sm text-slate-800 dark:text-zinc-200 font-normal leading-relaxed pt-0.5">{step}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Action Link Button */}
              {selectedTutorial.linkUrl && (
                <div className="mt-8 mb-2 text-right">
                  <a 
                    href={selectedTutorial.linkUrl}
                    target={selectedTutorial.linkUrl!.startsWith('http') ? '_blank' : undefined}
                    rel={selectedTutorial.linkUrl!.startsWith('http') ? 'noopener noreferrer' : undefined}
                    onClick={(e) => {
                      if (!selectedTutorial.linkUrl!.startsWith('http')) {
                        e.preventDefault();
                        router.push(selectedTutorial.linkUrl!);
                      }
                    }}
                    className="btn-rise inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-5 rounded-xl text-xs shadow-md shadow-blue-600/20 w-full sm:w-auto justify-center cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0" /> {selectedTutorial.linkTitle || 'الانتقال للرابط المذكور'}
                  </a>
                </div>
              )}

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
                  <MessageSquare className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" /> استفسارات ومناقشة الشرح ({tutorialComments.length})
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
                          <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-xs border border-blue-200 dark:border-blue-900/50">
                            {c.userName ? c.userName.charAt(0).toUpperCase() : 'ط'}
                          </div>
                        )}
                        <div className="flex flex-col text-right">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">@{c.userName || 'طالب'}</span>
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
                      className="w-full p-3.5 bg-white dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-600 text-xs resize-none text-right text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={submitTutorialComment}
                        disabled={!tutorialCommentInput.trim()}
                        className="btn-rise bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 disabled:opacity-50 cursor-pointer"
                      >
                        إرسال التعليق
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-400 rounded-xl p-4 text-xs font-bold text-center">
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
                className="w-full bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 rounded-2xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-5 text-center sm:text-right flex-col sm:flex-row">
                    <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-xl flex items-center justify-center shrink-0 border border-white/20 shadow-inner">
                      <GraduationCap className="w-6 h-6 text-amber-300" />
                    </div>
                    <div>
                      <span className="bg-white/20 text-white text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider">دليل المستجدين الأكاديمي</span>
                      <h2 className="text-lg sm:text-xl font-bold mt-1.5 flex items-center gap-2 justify-center sm:justify-start">
                        دليل الطلاب المستجدين (عش آل إمام) 🎓
                      </h2>
                      <p className="text-xs text-blue-100 mt-1 max-w-lg leading-relaxed">
                        بوابتك الشاملة للتعرف على الأنظمة الأكاديمية، السكن، المكافآت، والمباني والتحضيري خطوة بخطوة.
                      </p>
                    </div>
                  </div>
                  <span className="px-5 py-2.5 bg-white text-blue-900 font-bold text-xs rounded-xl shadow-md shrink-0">
                    استكشف الدليل الأكاديمي
                  </span>
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
                  className="w-full pr-11 pl-4 py-3 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-600 outline-none shadow-2xs text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500"
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
              {sections.map(section => {
                const sectionTutorials = filteredTutorials.filter(t => t.sectionId === section.id);
                if (sectionTutorials.length === 0) return null;

                const SectionIcon = (Icons[section.icon as keyof typeof Icons] || Icons.BookOpen) as React.ComponentType<any>;

                return (
                  <div key={section.id} className="space-y-5">
                    {/* Section Header */}
                    <div className="flex items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 shadow-2xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900/50">
                          <SectionIcon className="w-4.5 h-4.5" />
                        </div>
                        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{section.title}</h2>
                      </div>
                      <span className="text-xs text-blue-700 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 px-3 py-1 rounded-full">
                        {sectionTutorials.length} شروحات
                      </span>
                    </div>

                    {/* Tutorial Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sectionTutorials.map((tutorial) => (
                        <SpotlightCard
                          key={tutorial.id}
                          spotlightColor="rgba(37, 99, 235, 0.12)"
                          onClick={() => selectTutorial(tutorial)}
                          className="cursor-pointer border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5"
                        >
                          <div className="flex items-start gap-4 h-full">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
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
              })}

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
                <Compass className="w-5 h-5 text-blue-600 dark:text-blue-400" /> وسائل الاتصال بالجامعة 📞
              </h2>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mb-6">
                سواء كنت بحاجة للاتصال بهاتف جهة أكاديمية أو العثور على البريد الإلكتروني الرسمي لكليتك، اختر الدليل المناسب أدناه:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SpotlightCard 
                  onClick={() => router.push('/numbers')}
                  className="cursor-pointer border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center shrink-0">
                      <Icons.Phone className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">دليل الأرقام الهاتفية والتحويلات 📞</h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">أرقام الكليات، العمادات، والتحويلات.</p>
                    </div>
                  </div>
                </SpotlightCard>

                <SpotlightCard 
                  onClick={() => router.push('/emails')}
                  className="cursor-pointer border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center shrink-0">
                      <Icons.Mail className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">دليل البريد الإلكتروني الأكاديمي ✉️</h4>
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
                customAlert.type === 'error' ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'
              }`}>
                {customAlert.type === 'success' && <CheckCircle className="w-6 h-6" />}
                {customAlert.type === 'error' && <AlertCircle className="w-6 h-6" />}
                {customAlert.type === 'info' && <HelpCircle className="w-6 h-6" />}
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{customAlert.title}</h3>
              <p className="text-xs text-slate-600 dark:text-zinc-400 mb-6 leading-relaxed">{customAlert.message}</p>
              <button 
                onClick={() => setCustomAlert(null)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md shadow-blue-600/20"
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
                className="w-full p-3.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-600 text-xs resize-none mb-6 text-right text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500"
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
      </AnimatePresence>

    </div>
  );
}

function renderTutorialContent(text: string) {
  if (!text) return null;

  if (text.trim().startsWith('[')) {
    try {
      const blocks = JSON.parse(text);
      if (Array.isArray(blocks)) {
        return (
          <div className="space-y-5 text-right" dir="rtl">
            {blocks.map((block: any, blockIdx: number) => {
              if (block.type === 'text') {
                return (
                  <p key={blockIdx} className="text-slate-800 dark:text-zinc-200 text-xs sm:text-sm leading-relaxed mb-3 font-normal whitespace-pre-line">
                    {block.content}
                  </p>
                );
              }
              if (block.type === 'list') {
                const items = block.listItems || [];
                if (block.listType === 'ordered') {
                  return (
                    <ol key={blockIdx} className="list-decimal list-inside space-y-1.5 my-3 pr-2 text-slate-800 dark:text-zinc-200 text-xs sm:text-sm">
                      {items.map((it: string, idx: number) => <li key={idx}>{it}</li>)}
                    </ol>
                  );
                } else {
                  return (
                    <ul key={blockIdx} className="list-disc list-inside space-y-1.5 my-3 pr-2 text-slate-800 dark:text-zinc-200 text-xs sm:text-sm">
                      {items.map((it: string, idx: number) => <li key={idx}>{it}</li>)}
                    </ul>
                  );
                }
              }
              if (block.type === 'table') {
                const headers = block.tableHeaders || [];
                const rows = block.tableRows || [];
                return (
                  <div key={blockIdx} className="overflow-x-auto my-4 border border-slate-200 dark:border-zinc-800 rounded-xl">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead className="bg-slate-50 dark:bg-zinc-950 border-b border-slate-200 dark:border-zinc-800 font-bold text-slate-900 dark:text-white">
                        <tr>
                          {headers.map((h: string, idx: number) => (
                            <th key={idx} className="p-3.5 text-right font-bold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-zinc-800 text-slate-800 dark:text-zinc-200">
                        {rows.map((row: string[], rowIdx: number) => (
                          <tr key={rowIdx} className="hover:bg-slate-50/50 dark:hover:bg-zinc-800/50 transition">
                            {row.map((cell: string, cellIdx: number) => (
                              <td key={cellIdx} className="p-3.5">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              if (block.type === 'steps') {
                const steps = block.stepsItems || [];
                return (
                  <div key={blockIdx} className="relative border-r-2 border-slate-200 dark:border-zinc-800 mr-3 pr-6 space-y-6 my-6 text-right">
                    {steps.map((step: string, index: number) => (
                      <div key={index} className="relative flex flex-col gap-1">
                        <span className="absolute -right-[35px] top-0.5 flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-2xs">
                          {index + 1}
                        </span>
                        <p className="text-xs sm:text-sm text-slate-800 dark:text-zinc-200 font-normal leading-relaxed pt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                );
              }
              if (block.type === 'buttons') {
                const buttons = block.buttons || [];
                return (
                  <div key={blockIdx} className="flex flex-wrap gap-3 my-6 justify-center" dir="rtl">
                    {buttons.map((btn: any, btnIdx: number) => {
                      if (!btn.label || !btn.url) return null;
                      return (
                        <a
                          key={btnIdx}
                          href={btn.url}
                          target={btn.url.startsWith('http') ? '_blank' : undefined}
                          rel={btn.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                          className="inline-flex items-center gap-2 bg-blue-600 text-white font-bold py-2.5 px-4.5 rounded-xl text-xs shadow-md shadow-blue-600/20 w-full sm:w-auto justify-center"
                        >
                          <ExternalLink className="w-4 h-4 shrink-0" /> {btn.label}
                        </a>
                      );
                    })}
                  </div>
                );
              }
              return null;
            })}
          </div>
        );
      }
    } catch (e) {
      // fallback
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
          {currentList.items.map((it, idx) => <li key={idx}>{it}</li>)}
        </ul>
      );
    } else {
      elements.push(
        <ol key={key} className="list-decimal list-inside space-y-1.5 my-3 pr-2 text-slate-800 dark:text-zinc-200 text-xs sm:text-sm">
          {currentList.items.map((it, idx) => <li key={idx}>{it}</li>)}
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
          {line}
        </p>
      );
    }
  }

  flushList('list-end');

  return <div className="space-y-1">{elements}</div>;
}

