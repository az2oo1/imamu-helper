import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { 
  HelpCircle, Play, FileText, ChevronLeft, 
  GraduationCap, Search, CheckSquare, BookOpen, CreditCard, Compass, 
  ArrowLeft, Video, ThumbsUp, ThumbsDown, MessageSquare, 
  CheckCircle, Clock, X, AlertCircle, Send, ExternalLink
} from 'lucide-react';

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
  const navigate = useNavigate();
  
  // Dynamic data states
  const [sections, setSections] = useState<Section[]>([]);
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [tutorialFeedback, setTutorialFeedback] = useState<Feedback[]>([]);
  const [tutorialComments, setTutorialComments] = useState<any[]>([]);
  const [tutorialCommentInput, setTutorialCommentInput] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');

  // Custom Popups / Modals States
  const [customAlert, setCustomAlert] = useState<{ type: 'success' | 'error' | 'info'; title: string; message: string } | null>(null);
  const [negativeFeedbackModal, setNegativeFeedbackModal] = useState<Tutorial | null>(null);
  const [negativeFeedbackComment, setNegativeFeedbackComment] = useState('');
  
  // Discussion Modal States
  const [activeFeedbackThread, setActiveFeedbackThread] = useState<Feedback | null>(null);
  const [threadComments, setThreadComments] = useState<any[]>([]);
  const [newCommentText, setNewCommentText] = useState('');

  // Fetch feedback helper for comment refreshes
  const loadFeedback = async (tutId: number) => {
    try {
      const res = await fetch(`/api/tutorials/${tutId}`).then(r => r.json());
      if (res && Array.isArray(res.feedback)) {
        setTutorialFeedback(res.feedback);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch sections and tutorials from DB
  const loadData = async () => {
    try {
      const secRes = await fetch('/api/tutorials/sections').then(r => r.json());
      const tutRes = await fetch('/api/tutorials').then(r => r.json());
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
    try {
      const res = await fetch(`/api/tutorials/${tut.id}`).then(r => r.json());
      setSelectedTutorial(res);
      
      const commentsRes = await fetch(`/api/tutorials/${tut.id}/comments`).then(r => r.json());
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

  const getDynamicIcon = (iconName: string) => {
    const IconComp = (Icons as any)[iconName];
    return IconComp ? <IconComp className="w-5.5 h-5.5" /> : <HelpCircle className="w-5.5 h-5.5" />;
  };

  // Submit positive feedback directly
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

  // Open negative feedback modal to type comment
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

  // Open feedback comments thread popup
  const openThread = async (fb: Feedback) => {
    setActiveFeedbackThread(fb);
    setNewCommentText('');
    try {
      const res = await fetch(`/api/feedback/${fb.id}/comments`).then(r => r.json());
      if (Array.isArray(res)) setThreadComments(res);
    } catch (e) {
      console.error(e);
    }
  };

  const submitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !activeFeedbackThread || !user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/feedback/${activeFeedbackThread.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: newCommentText })
      });
      if (res.ok) {
        const newC = await res.json();
        setThreadComments(prev => [...prev, newC]);
        setNewCommentText('');
      }
    } catch (e) {
      console.error(e);
    }
  };



  return (
    <div className="flex flex-col flex-1 w-full pb-24 px-4 sm:px-6 lg:px-8 pt-8 relative max-w-[1400px] mx-auto min-h-screen text-right" dir="rtl">
      
      {/* Background Decorative glow */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-[var(--color-imamu-blue)]/3 rounded-full blur-[120px]" />
        <div className="absolute top-[35%] -left-40 w-[400px] h-[400px] bg-amber-500/3 rounded-full blur-[100px]" />
      </div>

      {/* Main Header */}
      <div className="mb-8 relative z-10">
        <div className="inline-flex items-center gap-3.5 mb-2.5">
          <div className="w-10 h-10 bg-[var(--color-imamu-blue)]/[0.04] border border-[var(--color-imamu-blue)]/10 rounded-2xl flex items-center justify-center shadow-sm">
            <GraduationCap className="w-5.5 h-5.5 text-[var(--color-imamu-blue)]" />
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-gray-955">الدليلة</h1>
        </div>
        <p className="text-sm text-gray-450 mr-13 font-semibold leading-relaxed">
          دليلك المتكامل لكل ما تحتاج معرفته عن الأنظمة الأكاديمية والخدمات بجامعة الإمام
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
            className="w-full max-w-4xl mx-auto relative z-10"
          >
            {/* Back Button */}
            <button 
              onClick={() => setSelectedTutorial(null)}
              className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-950 transition font-semibold mb-6 bg-white hover:bg-zinc-50 py-2 px-3 rounded-md border border-zinc-200 shadow-sm self-start"
            >
              <ArrowLeft className="w-4 h-4 rotate-180" /> العودة إلى قائمة الشروحات
            </button>

            {/* Header Detail Card */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm mb-8">
              {(() => {
                const section = sections.find(s => s.id === selectedTutorial.sectionId);
                const badgeClass = getSectionBadgeClass(section?.color || '');
                return (
                  <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider mb-4 inline-block ${badgeClass}`}>
                    {section?.title || 'شرح'}
                  </span>
                );
              })()}
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 mb-3">{selectedTutorial.title}</h1>
              <p className="text-zinc-300 text-xs leading-relaxed mb-6 font-normal">{selectedTutorial.description}</p>
              
              <div className="h-px bg-zinc-800 w-full mb-6" />

              <div className="mb-6 text-xs text-zinc-200 leading-relaxed font-normal">
                {renderTutorialContent(selectedTutorial.text)}
              </div>

              {/* Detailed Steps */}
              {!selectedTutorial.text.trim().startsWith('[') && selectedTutorial.steps && selectedTutorial.steps.filter(s => s.trim().length > 0).length > 0 && (
                <>
                  <h2 className="text-xs font-bold text-zinc-100 mb-6 flex items-center gap-2">
                    <CheckSquare className="w-4 h-4 text-blue-500" /> خطوات وتفاصيل الشرح:
                  </h2>
                  <div className="relative border-r border-zinc-800 mr-2.5 pr-6 space-y-6 mb-8 text-right">
                    {selectedTutorial.steps.filter(s => s.trim().length > 0).map((step, index) => {
                      const section = sections.find(s => s.id === selectedTutorial.sectionId);
                      const accentClass = getSectionAccentClass(section?.color || '');
                      return (
                        <div key={index} className="relative flex flex-col gap-1">
                          {/* Timeline Node Point */}
                          <span className={`absolute -right-[31px] top-1 flex items-center justify-center shrink-0 w-5 h-5 rounded-full text-[9px] font-bold shadow-sm z-10 ${accentClass}`}>
                            {index + 1}
                          </span>
                          <p className="text-xs text-zinc-200 font-normal leading-relaxed pt-0.5">{step}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Media Walkthroughs (Video/Image Link) */}
              {!selectedTutorial.text.trim().startsWith('[') && (() => {
                const videoUrls = parseMediaUrls(selectedTutorial.videoUrl);
                const imageUrls = parseMediaUrls(selectedTutorial.imageUrl);
                if (videoUrls.length === 0 && imageUrls.length === 0) return null;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 border-t border-zinc-800 pt-8">
                    {videoUrls.length > 0 && (
                      <div className="flex flex-col gap-4">
                        <h3 className="text-[10px] font-bold text-zinc-200 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Video className="w-3.5 h-3.5 text-blue-500" /> الشروحات المرئية والمسجلة
                        </h3>
                        {videoUrls.map((vUrl, vIdx) => (
                          <div key={vIdx} className="w-full aspect-video rounded-lg border border-zinc-800 shadow-sm overflow-hidden bg-zinc-950 relative group flex items-center justify-center">
                            <iframe 
                              src={vUrl} 
                              title={`Walkthrough Video ${vIdx + 1}`}
                              className="w-full h-full border-0"
                              allowFullScreen
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {imageUrls.length > 0 && (
                      <div className="flex flex-col gap-4">
                        <h3 className="text-[10px] font-bold text-zinc-200 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Icons.Image className="w-3.5 h-3.5 text-blue-500" /> لقطات الشاشة التوضيحية
                        </h3>
                        {imageUrls.map((imgUrl, imgIdx) => (
                          <a key={imgIdx} href={imgUrl} target="_blank" rel="noreferrer" className="w-full aspect-video rounded-lg border border-zinc-800 shadow-sm overflow-hidden bg-zinc-900 block relative hover:opacity-90 transition">
                            <img 
                              src={imgUrl} 
                              alt={`Tutorial Screenshot ${imgIdx + 1}`} 
                              className="w-full h-full object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Action Link Button */}
              {selectedTutorial.linkUrl && (
                <div className="mt-8 mb-2 text-right">
                  <a 
                    href={selectedTutorial.linkUrl}
                    target={selectedTutorial.linkUrl.startsWith('http') ? '_blank' : undefined}
                    rel={selectedTutorial.linkUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                    onClick={(e) => {
                      if (!selectedTutorial.linkUrl.startsWith('http')) {
                        e.preventDefault();
                        navigate(selectedTutorial.linkUrl);
                      }
                    }}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4.5 rounded-md text-xs transition shadow-sm w-full sm:w-auto justify-center"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0" /> {selectedTutorial.linkTitle || 'الانتقال للرابط المذكور'}
                  </a>
                </div>
              )}

              {/* Feedback Rating Widget */}
              <div className="mt-10 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right">
                <div className="text-right">
                  <h4 className="text-xs font-bold text-zinc-100 mb-1">هل كان هذا الشرح مفيداً لك؟</h4>
                  <p className="text-[10px] text-zinc-400 font-medium">تقييمك يساعد زملاءك الطلاب للوصول لأفضل الشروحات.</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => submitPositiveFeedback(selectedTutorial.id)}
                    className="inline-flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 py-1.5 px-3 rounded-md font-semibold hover:bg-zinc-800 hover:text-zinc-50 transition shadow-sm"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-500" /> مفيد جداً
                  </button>
                  <button 
                    onClick={() => openNegativeFeedback(selectedTutorial)}
                    className="inline-flex items-center gap-2 text-xs bg-zinc-900 border border-zinc-800 text-zinc-200 py-1.5 px-3 rounded-md font-semibold hover:bg-zinc-800 hover:text-zinc-50 transition shadow-sm"
                  >
                    <ThumbsDown className="w-3.5 h-3.5 text-rose-500" /> غير واضح / غير مفيد
                  </button>
                </div>
              </div>
            </div>

            {/* Public Q&A / Comments & Discussion Section */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm space-y-6 text-right" dir="rtl">
              <div>
                <h3 className="text-sm font-bold text-zinc-100 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4.5 h-4.5 text-blue-500" /> استفسارات ومناقشة الشرح ({tutorialComments.length})
                </h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  إذا كان لديك سؤال أو استفسار حول هذا الشرح، يمكنك كتابته هنا ليتفاعل معك الطلاب أو المشرفون.
                </p>
              </div>

              {/* Comments List */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {tutorialComments.length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-500 italic">
                    لا توجد تعليقات أو استفسارات حالياً. كن أول من يكتب استفساراً!
                  </div>
                ) : (
                  tutorialComments.map(c => (
                    <div key={c.id} className="border border-zinc-800 p-4 rounded-lg bg-zinc-950/40 flex flex-col gap-2">
                      <div className="flex items-center gap-3">
                        {c.profilePicUrl ? (
                          <img src={c.profilePicUrl} alt="" className="w-7 h-7 rounded-full object-cover border border-zinc-800" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-200 flex items-center justify-center shrink-0 font-bold text-xs border border-zinc-700">
                            {c.userName ? c.userName.charAt(0).toUpperCase() : 'ط'}
                          </div>
                        )}
                        <div className="flex flex-col text-right">
                          <span className="text-xs font-bold text-zinc-900">@{c.userName || 'طالب'}</span>
                          <span className="text-[9px] text-zinc-400">
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-zinc-700 leading-relaxed font-medium pr-10">{c.content}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Input Form */}
              <div className="border-t border-zinc-100 pt-4 space-y-3">
                {user ? (
                  <div className="flex flex-col gap-3">
                    <textarea
                      rows={3}
                      value={tutorialCommentInput}
                      onChange={e => setTutorialCommentInput(e.target.value)}
                      placeholder="اكتب استفسارك أو تعليقك هنا..."
                      className="w-full p-3 bg-white border border-zinc-200 rounded-md outline-none focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 text-xs resize-none text-right"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={submitTutorialComment}
                        disabled={!tutorialCommentInput.trim()}
                        className="bg-zinc-900 text-zinc-50 px-4 py-2 rounded-md text-xs font-semibold hover:bg-zinc-900/90 shadow-sm transition"
                      >
                        إرسال التعليق
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50/50 border border-amber-100 text-amber-800 rounded-2xl p-4 text-xs font-medium text-center">
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
            {/* Newbie Guide Banner Card (Takes to page as requested) */}
            <div className="w-full max-w-4xl mx-auto">
              <div 
                onClick={() => navigate('/newbie')}
                className="w-full bg-zinc-950 rounded-xl p-6 sm:p-8 text-zinc-50 border border-zinc-800 shadow-sm relative overflow-hidden group cursor-pointer"
              >
                {/* Glowing decorative rings */}
                <div className="absolute -right-10 -top-10 w-44 h-44 bg-white/5 rounded-full blur-xl pointer-events-none group-hover:scale-110 transition duration-500" />
                
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                  <div className="flex items-center gap-5 text-center sm:text-right flex-col sm:flex-row">
                    <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-lg flex items-center justify-center shrink-0 border border-white/20 shadow-inner group-hover:rotate-3 transition duration-300">
                      <GraduationCap className="w-6 h-6 text-zinc-50" />
                    </div>
                    <div>
                      <span className="bg-white/15 text-zinc-300 text-[9px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider">دليل المستجدين الأكاديمي</span>
                      <h2 className="text-lg font-bold mt-1.5 flex items-center gap-2 justify-center sm:justify-start">
                        دليل الطلاب المستجدين (عش آل إمام) 🎓
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1 max-w-lg leading-relaxed">
                        بوابتك الشاملة للتعرف على الأنظمة الأكاديمية، السكن، المكافآت، والمباني والتحضيري خطوة بخطوة.
                      </p>
                    </div>
                  </div>
                  <span className="px-4 py-2 bg-zinc-50 text-zinc-950 font-bold text-xs rounded-md shadow hover:bg-zinc-100 hover:scale-[1.02] transition-all shrink-0">
                    استكشف الدليل الأكاديمي
                  </span>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                  <Search className="w-5 h-5 text-zinc-400" />
                </div>
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="ابحث عن شروحات، مواضيع، أو خدمات..."
                  className="w-full pr-11 pl-4 py-2 bg-white border border-zinc-200 rounded-md focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 outline-none transition shadow-sm text-sm"
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-400 hover:text-zinc-600"
                  >
                    <X className="w-4.5 h-4.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Categories & Lists (Dynamic data) */}
            <div className="w-full max-w-4xl mx-auto space-y-12">
              {sections.map(section => {
                const sectionTutorials = filteredTutorials.filter(t => t.sectionId === section.id);
                if (sectionTutorials.length === 0) return null;

                const SectionIcon = (Icons[section.icon as keyof typeof Icons] || Icons.BookOpen) as React.ComponentType<any>;

                return (
                  <div key={section.id} className="space-y-5">
                    {/* Section Header */}
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-md border flex items-center justify-center shrink-0 shadow-sm text-zinc-400 bg-zinc-950 border-zinc-800">
                          <SectionIcon className="w-4.5 h-4.5" />
                        </div>
                        <h2 className="text-sm sm:text-base font-bold text-zinc-100">{section.title}</h2>
                      </div>
                      <span className="text-[10px] text-zinc-300 font-semibold bg-zinc-900/50 border border-zinc-800 px-2.5 py-0.5 rounded-full">
                        {sectionTutorials.length} شروحات
                      </span>
                    </div>

                    {/* Tutorial Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {sectionTutorials.map((tutorial, idx) => (
                        <motion.div
                          key={tutorial.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          onClick={() => selectTutorial(tutorial)}
                          className={`bg-zinc-900/40 border border-zinc-800 ${getBorderColorClass(section.color)} rounded-xl p-5 flex items-start gap-4 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all duration-200 cursor-pointer group`}
                        >
                          <div className="p-2 rounded-md shrink-0 border border-zinc-800 bg-zinc-950 text-zinc-400 group-hover:text-zinc-100 transition-colors">
                            <SectionIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0 pr-1 text-right">
                            <h3 className="text-xs sm:text-sm font-bold text-zinc-100 mb-1 leading-snug group-hover:text-white transition-colors truncate">
                              {tutorial.title}
                            </h3>
                            <p className="text-[11px] text-zinc-400 leading-relaxed line-clamp-2">
                              {tutorial.description}
                            </p>
                          </div>
                          <div className="mt-auto mb-auto bg-zinc-950 border border-zinc-800 p-1.5 rounded-md text-zinc-500 group-hover:text-zinc-100 group-hover:bg-zinc-900 transition-all">
                            <ChevronLeft className="w-4 h-4 group-hover:translate-x-[-2px] transition-transform" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {filteredTutorials.length === 0 && (
                <div className="text-center py-20 bg-zinc-900/40 border border-zinc-800 rounded-xl flex flex-col items-center justify-center gap-4 text-zinc-400">
                  <HelpCircle className="w-10 h-10 text-zinc-550" />
                  <h3 className="text-sm font-bold text-zinc-100">لا توجد نتائج مطابقة</h3>
                  <p className="text-xs max-w-xs leading-relaxed">تأكد من كتابة الكلمة بشكل صحيح، أو ابحث في تصنيفات الدليلة الأخرى.</p>
                </div>
              )}
            </div>

            {/* Directories Banners Grid */}
            <div className="w-full max-w-4xl mx-auto mt-16 border-t border-zinc-805 pt-10 text-right">
              <h2 className="text-sm sm:text-base font-bold text-zinc-100 mb-2 flex items-center gap-2 pr-1">
                <Compass className="w-5 h-5 text-blue-500" /> وسائل الاتصال بالجامعة 📞
              </h2>
              <p className="text-xs text-zinc-400 mb-6 mr-7">
                سواء كنت بحاجة للاتصال بهاتف جهة أكاديمية أو العثور على البريد الإلكتروني الرسمي لكليتك، اختر الدليل المناسب أدناه:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* 1. Phone Numbers Directory Button */}
                <div 
                  onClick={() => navigate('/numbers')}
                  className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-xl hover:bg-zinc-900/80 hover:border-zinc-700 transition-all cursor-pointer flex justify-between items-center group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-zinc-950 text-zinc-400 border border-zinc-800 flex items-center justify-center shrink-0">
                      <Icons.Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-zinc-100 group-hover:text-white transition-colors">دليل الأرقام الهاتفية والتحويلات 📞</h4>
                      <p className="text-[10px] text-zinc-400 mt-1 font-medium">أرقام الكليات، العمادات، وخطوط الطوارئ والسلامة.</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-zinc-500 group-hover:text-zinc-100 transition-colors rotate-180" />
                </div>

                {/* 2. College Emails Directory Button */}
                <div 
                  onClick={() => navigate('/emails')}
                  className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-xl hover:bg-zinc-900/80 hover:border-zinc-700 transition-all cursor-pointer flex justify-between items-center group shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-zinc-950 text-zinc-400 border border-zinc-800 flex items-center justify-center shrink-0">
                      <Icons.Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs text-zinc-100 group-hover:text-white transition-colors">دليل البريد الإلكتروني الأكاديمي ✉️</h4>
                      <p className="text-[10px] text-zinc-400 mt-1 font-medium">إيميلات شؤون الطلاب، العميد، ومسؤولي الأقسام.</p>
                    </div>
                  </div>
                  <ChevronLeft className="w-4 h-4 text-zinc-500 group-hover:text-zinc-100 transition-colors rotate-180" />
                </div>
              </div>
            </div>

            {/* FAQ Quick Accordion */}
            <div className="w-full max-w-4xl mx-auto mt-16 border-t border-zinc-805 pt-10">
              <h2 className="text-sm sm:text-base font-bold text-zinc-100 mb-6 flex items-center gap-2 pr-1">
                <HelpCircle className="w-5 h-5 text-zinc-100" /> الأسئلة الشائعة للطلاب
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
                <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl shadow-sm">
                  <h4 className="font-bold text-zinc-100 text-xs mb-2">س: متى يحرم الطالب من دخول الاختبار النهائي؟</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">ج: يحرم الطالب إذا تجاوزت نسبة غيابه بدون عذر مقبول 25% من المحاضرات المحددة للمادة خلال الفصل الدراسي.</p>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl shadow-sm">
                  <h4 className="font-bold text-zinc-100 text-xs mb-2">س: كيف يمكنني تعديل شعبة مادة دراسية بعد التسجيل؟</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">ج: يتم ذلك من خلال الخدمة الذاتية عبر خيار "حذف وإضافة" بالبحث عن شعبة أخرى متاحة وإجراء عملية استبدال للمادة.</p>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl shadow-sm">
                  <h4 className="font-bold text-zinc-100 text-xs mb-2">س: ما هو المعدل الأكاديمي المطلوب لتفادي الإنذار؟</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">ج: يجب الحفاظ على معدل تراكمي لا يقل عن 2.00 من 5.00 لتفادي الحصول على إنذارات أكاديمية تؤثر على المكافأة والانتظام.</p>
                </div>
                <div className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl shadow-sm">
                  <h4 className="font-bold text-zinc-100 text-xs mb-2">س: كيف أعيد تفعيل حساب البريد الجامعي المعطل؟</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">ج: يمكنك مراجعة الدعم الفني لعمادة تقنية المعلومات أو مراجعة الخدمة الذاتية وتعديل كلمة المرور لإعادة التزامن التلقائي لحسابك.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* POPUP MODALS LAYER */}
      <AnimatePresence>
        {/* 1. Custom Alert / Message Dialog Popup */}
        {customAlert && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 border border-gray-100 text-center"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                customAlert.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 
                customAlert.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {customAlert.type === 'success' && <CheckCircle className="w-6 h-6" />}
                {customAlert.type === 'error' && <AlertCircle className="w-6 h-6" />}
                {customAlert.type === 'info' && <HelpCircle className="w-6 h-6" />}
              </div>
              <h3 className="text-base font-bold text-gray-955 mb-2">{customAlert.title}</h3>
              <p className="text-xs text-gray-500 mb-6 leading-relaxed">{customAlert.message}</p>
              <button 
                onClick={() => setCustomAlert(null)}
                className="w-full bg-[var(--color-imamu-blue)] hover:bg-[var(--color-imamu-blue-light)] text-white font-bold py-2.5 rounded-xl text-xs transition shadow-sm"
              >
                موافق
              </button>
            </motion.div>
          </div>
        )}

        {/* 2. Negative Feedback Modal (Write comment/reason) */}
        {negativeFeedbackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 border border-gray-100"
            >
              <div className="flex justify-between items-center border-b pb-3.5 mb-4">
                <h3 className="text-sm font-bold text-gray-955">ملاحظاتك حول هذا الشرح 📝</h3>
                <button onClick={() => setNegativeFeedbackModal(null)} className="text-gray-450 hover:text-gray-700">
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                يؤسفنا أن الشرح لم يكن كافياً. يرجى كتابة المشكلة التي واجهتك (مثال: الشرح قديم، الروابط معطلة، أو نقص في الخطوات) لمساعدتنا على تحسينه:
              </p>
              <textarea 
                rows={4}
                value={negativeFeedbackComment}
                onChange={e => setNegativeFeedbackComment(e.target.value)}
                placeholder="اكتب تعليقك أو استفسارك هنا..."
                className="w-full p-3 bg-gray-50 border border-gray-250 rounded-2xl outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)] text-xs resize-none mb-6 text-right"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setNegativeFeedbackModal(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition"
                >
                  إلغاء
                </button>
                <button 
                  onClick={submitNegativeFeedback}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 rounded-xl text-xs transition"
                >
                  إرسال الملاحظة
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* 3. Feedback Discussion / Comments Thread Modal */}
        {activeFeedbackThread && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[80vh] border border-gray-100 text-right"
            >
              {/* Header */}
              <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h4 className="text-sm font-bold text-gray-955">مناقشة استفسار الطالب</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5 font-medium">موضوع الشرح: {selectedTutorial?.title}</p>
                </div>
                <button 
                  onClick={() => setActiveFeedbackThread(null)}
                  className="p-1 text-gray-455 hover:text-gray-700 hover:bg-gray-100 rounded-full transition"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-white min-h-[220px]">
                {/* Parent Review details */}
                <div className="bg-amber-50/40 border border-amber-100 rounded-2xl p-4 flex gap-3 text-right">
                  <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 font-bold">
                    👎
                  </div>
                  <div>
                    <span className="text-xs font-bold text-gray-955">@{activeFeedbackThread.userName}</span>
                    <p className="text-xs text-gray-755 mt-1 italic font-medium">{activeFeedbackThread.comment || 'أشار إلى وجود صعوبة بالشرح.'}</p>
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-3">
                  {threadComments.map(c => (
                    <div key={c.id} className="flex gap-3 text-right p-3.5 bg-gray-50/50 rounded-2xl border border-gray-150">
                      <div className="w-7 h-7 rounded-full bg-blue-50 text-[var(--color-imamu-blue)] flex items-center justify-center font-bold text-xs shrink-0">
                        {c.userName?.substring(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <span className="text-xs font-bold text-gray-900">@{c.userName}</span>
                        <p className="text-xs text-gray-700 mt-1 font-medium">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  {threadComments.length === 0 && (
                    <p className="text-xs text-gray-400 italic text-center py-6">لا توجد ردود بعد. كن أول من يساعد زميله ويكتب رداً مفيداً!</p>
                  )}
                </div>
              </div>

              {/* Reply Form */}
              <form onSubmit={submitComment} className="p-4 border-t border-gray-100 bg-gray-50/50 flex gap-2">
                <input 
                  type="text"
                  required
                  value={newCommentText}
                  onChange={e => setNewCommentText(e.target.value)}
                  placeholder="اكتب رداً أو توضيحاً للزميل..."
                  className="flex-1 bg-white border border-gray-300 py-2 px-3.5 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)] text-right"
                />
                <button 
                  type="submit"
                  className="bg-[var(--color-imamu-blue)] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[var(--color-imamu-blue-light)] transition shrink-0 flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" /> إرسال
                </button>
              </form>
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
                  <p key={blockIdx} className="text-zinc-200 text-xs sm:text-sm leading-relaxed mb-3 font-normal whitespace-pre-line">
                    {block.content}
                  </p>
                );
              }
              if (block.type === 'list') {
                const items = block.listItems || [];
                if (block.listType === 'ordered') {
                  return (
                    <ol key={blockIdx} className="list-decimal list-inside space-y-1.5 my-3 pr-2 text-zinc-300 text-xs sm:text-sm">
                      {items.map((it: string, idx: number) => <li key={idx}>{it}</li>)}
                    </ol>
                  );
                } else {
                  return (
                    <ul key={blockIdx} className="list-disc list-inside space-y-1.5 my-3 pr-2 text-zinc-300 text-xs sm:text-sm">
                      {items.map((it: string, idx: number) => <li key={idx}>{it}</li>)}
                    </ul>
                  );
                }
              }
              if (block.type === 'table') {
                const headers = block.tableHeaders || [];
                const rows = block.tableRows || [];
                return (
                  <div key={blockIdx} className="overflow-x-auto my-4 border border-zinc-800 rounded-2xl">
                    <table className="w-full text-right border-collapse text-xs">
                      <thead className="bg-zinc-950 border-b border-zinc-800 font-bold text-zinc-100">
                        <tr>
                          {headers.map((h: string, idx: number) => (
                            <th key={idx} className="p-3.5 text-right font-bold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800 text-zinc-300">
                        {rows.map((row: string[], rowIdx: number) => (
                          <tr key={rowIdx} className="hover:bg-zinc-900/50 transition">
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
                  <div key={blockIdx} className="relative border-r-2 border-zinc-800 mr-3 pr-6 space-y-6 my-6 text-right">
                    {steps.map((step: string, index: number) => (
                      <div key={index} className="relative flex flex-col gap-1">
                        <span className="absolute -right-[35px] top-0.5 flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-blue-950/40 border border-blue-900/50 text-blue-400 text-[10px] font-bold shadow-sm z-10">
                          {index + 1}
                        </span>
                        <p className="text-xs sm:text-sm text-zinc-200 font-normal leading-relaxed pt-0.5">{step}</p>
                      </div>
                    ))}
                  </div>
                );
              }
              if (block.type === 'media') {
                if (block.mediaType === 'video') {
                  return (
                    <div key={blockIdx} className="w-full max-w-xl aspect-video rounded-2xl border border-zinc-800 shadow-sm overflow-hidden bg-zinc-950 relative flex items-center justify-center my-4 mx-auto">
                      <iframe 
                        src={block.mediaUrl} 
                        title="Walkthrough Video"
                        className="w-full h-full border-0"
                        allowFullScreen
                      />
                    </div>
                  );
                } else {
                  return (
                    <a key={blockIdx} href={block.mediaUrl} target="_blank" rel="noreferrer" className="w-full max-w-xl aspect-video rounded-2xl border border-zinc-800 shadow-sm overflow-hidden bg-zinc-900 block relative hover:opacity-90 transition my-4 mx-auto">
                      <img 
                        src={block.mediaUrl} 
                        alt="Screenshot" 
                        className="w-full h-full object-cover"
                      />
                    </a>
                  );
                }
              }
              return null;
            })}
          </div>
        );
      }
    } catch (e) {
      // JSON parse error, proceed to fallback line parsing
    }
  }

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let currentTable: { headers: string[]; rows: string[][] } | null = null;

  const flushList = (key: string | number) => {
    if (!currentList) return;
    if (currentList.type === 'ul') {
      elements.push(
        <ul key={key} className="list-disc list-inside space-y-1.5 my-3 pr-2 text-zinc-300 text-xs sm:text-sm">
          {currentList.items.map((it, idx) => <li key={idx}>{it}</li>)}
        </ul>
      );
    } else {
      elements.push(
        <ol key={key} className="list-decimal list-inside space-y-1.5 my-3 pr-2 text-zinc-300 text-xs sm:text-sm">
          {currentList.items.map((it, idx) => <li key={idx}>{it}</li>)}
        </ol>
      );
    }
    currentList = null;
  };

  const flushTable = (key: string | number) => {
    if (!currentTable) return;
    elements.push(
      <div key={key} className="overflow-x-auto my-4 border border-zinc-800 rounded-2xl">
        <table className="w-full text-right border-collapse text-xs">
          <thead className="bg-zinc-950 border-b border-zinc-800 font-bold text-zinc-100">
            <tr>
              {currentTable.headers.map((h, idx) => (
                <th key={idx} className="p-3.5 text-right font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-300">
            {currentTable.rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-zinc-900/50 transition">
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx} className="p-3.5">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    currentTable = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('|') && line.endsWith('|') && line.length > 2) {
      flushList(`list-${i}`);
      const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      
      if (cells.every(c => c.startsWith('-') || c.startsWith(':'))) {
        continue;
      }

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      continue;
    } else {
      flushTable(`table-${i}`);
    }

    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushTable(`table-${i}`);
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
      flushTable(`table-${i}`);
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
        <p key={`p-${i}`} className="text-zinc-200 text-xs sm:text-sm leading-relaxed mb-3 font-normal whitespace-pre-line">
          {line}
        </p>
      );
    }
  }

  flushList('list-end');
  flushTable('table-end');

  return <div className="space-y-1">{elements}</div>;
}

function getSectionBadgeClass(colorStr: string) {
  if (!colorStr) return 'bg-zinc-900 text-zinc-300 border border-zinc-800';
  const match = colorStr.match(/text-([a-z]+)-/i);
  if (match && match[1]) {
    const name = match[1].toLowerCase();
    if (name === 'blue') return 'bg-blue-950/40 text-blue-400 border border-blue-900/50';
    if (name === 'amber') return 'bg-amber-950/40 text-amber-400 border border-amber-900/50';
    if (name === 'emerald') return 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50';
    if (name === 'purple') return 'bg-purple-950/40 text-purple-400 border border-purple-900/50';
  }
  return 'bg-blue-950/40 text-blue-400 border border-blue-900/50';
}

function getSectionAccentClass(colorStr: string) {
  if (!colorStr) return 'bg-blue-950/40 border border-blue-900/50 text-blue-400';
  const match = colorStr.match(/text-([a-z]+)-/i);
  if (match && match[1]) {
    const name = match[1].toLowerCase();
    if (name === 'blue') return 'bg-blue-950/40 border border-blue-900/50 text-blue-400';
    if (name === 'amber') return 'bg-amber-950/40 border border-amber-900/50 text-amber-400';
    if (name === 'emerald') return 'bg-emerald-950/40 border border-emerald-900/50 text-emerald-400';
    if (name === 'purple') return 'bg-purple-950/40 border border-purple-900/50 text-purple-400';
  }
  return 'bg-blue-950/40 border border-blue-900/50 text-blue-400';
}

function getBorderColorClass(colorStr: string) {
  if (!colorStr) return 'border-r-4 border-r-gray-300';
  const match = colorStr.match(/text-([a-z]+)-/i);
  if (match && match[1]) {
    return `border-r-4 border-r-${match[1].toLowerCase()}-500`;
  }
  return 'border-r-4 border-r-[var(--color-imamu-blue)]';
}

export function parseMediaUrls(fieldVal: string | null | undefined): string[] {
  if (!fieldVal) return [];
  const trimmed = fieldVal.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      return JSON.parse(trimmed);
    } catch(e) {
      // fallback
    }
  }
  if (trimmed.includes(',')) {
    return trimmed.split(',').map(u => u.trim()).filter(Boolean);
  }
  return [trimmed];
}
