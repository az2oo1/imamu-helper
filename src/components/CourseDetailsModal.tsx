'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  BookOpen, 
  ExternalLink, 
  Clock, 
  MessageCircle, 
  FolderGit2, 
  FileText, 
  Sparkles, 
  Layers,
  GraduationCap
} from 'lucide-react';

import { cleanCourseName, cleanUrlProtocol, parseResourceUrl, isWhatsappUrl } from '../lib/url-utils';

interface CourseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseIdOrCode: string | number | null;
}

const DEFAULT_WHATSAPP_GROUP_IMG = "https://pps.whatsapp.net/v/t61.24694-24/554639788_1312723487174013_704239896391263939_n.jpg?ccb=11-4&oh=01_Q5Aa5QEpzqKGzWUTpPFHeQuLhshTezJq0J9Ivo0mLQCdfmSFKw&oe=6AA37856&_nc_sid=5e03e0&_nc_cat=108";

function CourseAvatar({ avatarUrl, whatsappUrl, bannerUrl, name }: { avatarUrl?: string; whatsappUrl?: string; bannerUrl?: string; name?: string }) {
  const [imgState, setImgState] = useState<'primary' | 'whatsapp' | 'default_wa' | 'banner' | 'fallback'>('primary');

  useEffect(() => {
    setImgState('primary');
  }, [avatarUrl, whatsappUrl, bannerUrl]);

  if (avatarUrl && imgState === 'primary') {
    return (
      <img 
        src={avatarUrl} 
        alt={name || 'Avatar'} 
        className="w-full h-full object-cover" 
        onError={() => setImgState(whatsappUrl ? 'whatsapp' : bannerUrl ? 'banner' : 'fallback')} 
      />
    );
  }

  if (whatsappUrl && (imgState === 'primary' || imgState === 'whatsapp')) {
    return (
      <img 
        src={`/api/whatsapp-avatar?url=${encodeURIComponent(whatsappUrl)}`} 
        alt={name || 'WhatsApp Group'} 
        className="w-full h-full object-cover" 
        onError={() => setImgState('default_wa')} 
      />
    );
  }

  if (imgState === 'default_wa' || (whatsappUrl && imgState !== 'banner' && imgState !== 'fallback')) {
    return (
      <img 
        src={DEFAULT_WHATSAPP_GROUP_IMG} 
        alt={name || 'WhatsApp Group Image'} 
        className="w-full h-full object-cover" 
        onError={() => setImgState(bannerUrl ? 'banner' : 'fallback')} 
      />
    );
  }

  if (bannerUrl && (imgState === 'primary' || imgState === 'banner')) {
    return (
      <img 
        src={bannerUrl} 
        alt={name || 'Banner'} 
        className="w-full h-full object-cover" 
        onError={() => setImgState('fallback')} 
      />
    );
  }

  return (
    <div className="w-full h-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
      <GraduationCap className="w-10 h-10" />
    </div>
  );
}

export function CourseDetailsModal({ isOpen, onClose, courseIdOrCode }: CourseDetailsModalProps) {
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'syllabus'>('overview');

  useEffect(() => {
    if (isOpen && courseIdOrCode) {
      fetchCourseDetails();
    } else {
      setCourse(null);
    }
  }, [isOpen, courseIdOrCode]);

  const fetchCourseDetails = async () => {
    if (!courseIdOrCode) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/courses/${encodeURIComponent(String(courseIdOrCode))}/details`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
        if (data.course && data.course.isAcademicSubject === false) {
          setActiveTab('resources');
        } else {
          setActiveTab('overview');
        }
      } else {
        setCourse(null);
      }
    } catch (e) {
      console.error('Error fetching course details:', e);
      setCourse(null);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 font-sans text-right" dir="rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: "spring", duration: 0.4, bounce: 0.1 }}
          className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2 bg-slate-900/60 hover:bg-slate-900/80 text-white rounded-full z-20 backdrop-blur-md transition-all duration-200 shadow-md"
            title="إغلاق النافذة"
          >
            <X className="w-5 h-5" />
          </button>

          {loading ? (
            <div className="p-16 flex flex-col items-center justify-center gap-4 text-slate-500 dark:text-zinc-400">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold">جاري تحميل تفاصيل المادة...</p>
            </div>
          ) : !course ? (
            <div className="p-12 text-center text-slate-500 dark:text-zinc-400 flex flex-col items-center gap-3">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-zinc-700" />
              <p className="text-base font-bold text-slate-700 dark:text-zinc-300">عذراً، لم يتم العثور على معلومات هذه المادة.</p>
              <button onClick={onClose} className="mt-2 px-5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-200">
                إغلاق
              </button>
            </div>
          ) : (
            <>
              {/* Header / Banner */}
              <div className="relative h-36 bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 shrink-0">
                <div className="absolute inset-0 overflow-hidden">
                  {course.bannerUrl ? (
                    <img src={course.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 opacity-30 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]" />
                  )}
                </div>
                
                {/* Course Avatar */}
                <div className="absolute -bottom-8 right-6 z-20">
                  <div className="w-20 h-20 rounded-2xl bg-white dark:bg-zinc-900 border-4 border-white dark:border-zinc-900 overflow-hidden shadow-xl flex items-center justify-center">
                    <CourseAvatar 
                      avatarUrl={course.avatarUrl} 
                      whatsappUrl={course.whatsappLink || course.whatsappUrl || course.resources?.find((r: any) => r.whatsappUrl || r.whatsappLink || (r.url && r.url.includes('whatsapp')))?.whatsappUrl || course.resources?.find((r: any) => r.whatsappUrl || r.whatsappLink || (r.url && r.url.includes('whatsapp')))?.whatsappLink} 
                      bannerUrl={course.bannerUrl}
                      name={course.name}
                    />
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="pt-10 px-6 pb-6 overflow-y-auto flex-1 custom-scrollbar">
                {(() => {
                  const rawCode = course.code ? course.code.replace(/^مصادر مادة\s*/i, '').replace(/^مادة\s*/i, '').trim() : '';
                  const rawName = course.name ? course.name.replace(/^مصادر مادة\s+مادة\s*/gi, '').replace(/^مصادر مادة\s*/gi, '').trim() : '';
                  
                  const displayCode = rawCode.replace(/\s*\([^)]*\)/g, '').trim();
                  const displayName = rawName.replace(/\s*\([^)]*\)/g, '').trim();

                  const isAcademicSubject = course.isAcademicSubject !== false && Boolean(
                    course.subjectId || 
                    course.level ||
                    (displayCode && /^[A-Z0-9\-\_]{2,10}$/i.test(displayCode) && !/[\u0600-\u06FF]/.test(displayCode) && displayCode !== 'مصدر' && displayCode !== 'مصدر أكاديمي') ||
                    (course.prerequisites && course.prerequisites.length > 0) ||
                    (course.dependents && course.dependents.length > 0)
                  );

                  return (
                    <>
                      {/* Header Information */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {displayCode && displayCode !== 'مادة' && displayCode !== 'مصدر أكاديمي' && !/[\u0600-\u06FF]/.test(displayCode) && (
                              <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 text-xs font-mono font-bold rounded-lg" dir="ltr">
                                {displayCode}
                              </span>
                            )}
                            {course.creditHours && (
                              <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-semibold rounded-lg">
                                <Clock className="w-3 h-3 text-blue-500" /> {course.creditHours} ساعات
                              </span>
                            )}
                            {course.level && (
                              <span className="px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-semibold rounded-lg">
                                المستوى {course.level}
                              </span>
                            )}
                          </div>
                          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">{displayName || course.name}</h2>
                        </div>

                        {/* Top Left WhatsApp Action Button */}
                        {(() => {
                          const getWa = (c: any) => {
                            if (!c) return null;
                            const isWa = (u?: string) => Boolean(u && (u.includes('whatsapp.com') || u.includes('wa.me')));
                            if (isWa(c.whatsappLink)) return c.whatsappLink;
                            if (isWa(c.whatsappUrl)) return c.whatsappUrl;
                            if (Array.isArray(c.resources)) {
                              for (const r of c.resources) {
                                if (isWa(r.whatsappLink)) return r.whatsappLink;
                                if (isWa(r.whatsappUrl)) return r.whatsappUrl;
                                if (isWa(r.url)) return r.url;
                                if (r.type === 'whatsapp' || r.type === 'group') {
                                  const fallback = r.whatsappLink || r.whatsappUrl || r.url;
                                  if (fallback) return fallback;
                                }
                              }
                            }
                            return c.whatsappLink || c.whatsappUrl || null;
                          };
                          const rawWa = getWa(course);
                          if (!rawWa) return null;
                          const parsedWa = parseResourceUrl(rawWa);
                          return (
                            <a
                              href={parsedWa.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all duration-200 hover:scale-[1.04] active:scale-95 cursor-pointer shrink-0 self-start sm:self-center"
                            >
                              <MessageCircle className="w-4 h-4" />
                              <span>واتساب</span>
                            </a>
                          );
                        })()}
                      </div>

                      {/* Tabs Header */}
                      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 dark:border-zinc-800 pb-2">
                        <button
                          onClick={() => setActiveTab('overview')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            activeTab === 'overview'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50'
                              : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>نظرة عامة</span>
                        </button>
                        <button
                          onClick={() => setActiveTab('resources')}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                            activeTab === 'resources'
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50'
                              : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <FolderGit2 className="w-4 h-4" />
                          <span>المصادر والروابط</span>
                        </button>
                        {course.syllabus && (
                          <button
                            onClick={() => setActiveTab('syllabus')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                              activeTab === 'syllabus'
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50'
                                : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            <FileText className="w-4 h-4" />
                            <span>توصيف المقرر</span>
                          </button>
                        )}
                      </div>

                      {/* Tab 1: Overview */}
                      {activeTab === 'overview' && (
                        <div className="space-y-5 animate-in fade-in duration-200">
                          {/* 1. Description Section (الوصف) - Placed Above Prerequisite Diagram */}
                          <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800">
                            <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider mb-2">الوصف</h3>
                            <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                              {(() => {
                                const desc = course.description?.trim();
                                const isGeneric = !desc ||
                                  desc === course.name?.trim() ||
                                  desc === course.code?.trim() ||
                                  /^مصادر مادة/i.test(desc) ||
                                  /^تفاصيل ومعلومات مادة/i.test(desc) ||
                                  /^باقة مصادر/i.test(desc);
                                return isGeneric
                                  ? "لا يوجد وصف مختصر متاح لهذه المادة حالياً. يمكنك تصفح المصادر والروابط أو توصيف المقرر لمزيد من التفاصيل."
                                  : desc;
                              })()}
                            </p>
                          </div>

                          {/* 2. Prerequisite & Progression Chain Diagram */}
                          {isAcademicSubject && (
                            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 flex flex-col gap-4">
                              <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                سلسلة الاعتماديات والمتطلبات الشجرية
                              </h3>

                              <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl overflow-x-auto">
                                {/* 1. Prerequisites Node */}
                                <div className="flex-1 w-full text-center p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700">
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block mb-1.5">المتطلبات السابقة (قبل المادة)</span>
                                  {course.prerequisites && course.prerequisites.length > 0 ? (
                                    <div className="flex flex-wrap justify-center gap-1.5">
                                      {course.prerequisites.map((p: any) => (
                                        <span key={p.id} className="text-xs font-mono font-bold px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 rounded-lg">
                                          {p.code}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg inline-block">
                                      لا يوجد متطلب سابق
                                    </span>
                                  )}
                                </div>

                                {/* Arrow */}
                                <div className="text-slate-400 dark:text-zinc-600 font-bold shrink-0 text-sm hidden md:block">
                                  ←
                                </div>

                                {/* 2. Current Course Node */}
                                <div className="flex-1 w-full text-center p-3 rounded-xl bg-blue-600 text-white font-bold shadow-md shadow-blue-600/20">
                                  <span className="text-[10px] uppercase font-bold text-blue-100 block mb-0.5">المادة الحالية</span>
                                  <span className="text-sm font-mono block">{displayCode || course.code}</span>
                                  <span className="text-xs truncate block opacity-90">{displayName || course.name}</span>
                                </div>

                                {/* Arrow */}
                                <div className="text-slate-400 dark:text-zinc-600 font-bold shrink-0 text-sm hidden md:block">
                                  ←
                                </div>

                                {/* 3. Dependents Node */}
                                <div className="flex-1 w-full text-center p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/80 dark:border-zinc-700">
                                  <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 block mb-1.5">المقررات المعتمدة عليها (تفتح مستقبلاً)</span>
                                  {course.dependents && course.dependents.length > 0 ? (
                                    <div className="flex flex-wrap justify-center gap-1.5">
                                      {course.dependents.map((d: any) => (
                                        <span key={d.id} className="text-xs font-mono font-bold px-2.5 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/50 rounded-lg">
                                          {d.code}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                                      مادة نهائية في المسار
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                        </div>
                      )}

                      {/* Tab 2: Resources & Links */}
                      {activeTab === 'resources' && (() => {
                        const isWhatsappUrl = (url?: string) => Boolean(url && (url.includes('chat.whatsapp.com') || url.includes('wa.me') || url.includes('whatsapp.com')));

                        // Collect all Free links
                        const freeList: { title: string; url: string; description?: string }[] = [];
                        if (course.freeResourcesUrl) {
                          const parsed = parseResourceUrl(course.freeResourcesUrl);
                          freeList.push({ title: parsed.title || 'المصادر المجانية المباشرة', url: parsed.url });
                        }
                        (course.resources || []).forEach((r: any) => {
                          if (r.freeResourcesUrl) {
                            const parsed = parseResourceUrl(r.freeResourcesUrl);
                            const itemTitle = parsed.title || (r.title ? `${r.title} - مصادر مجانية` : 'مصادر مجانية');
                            freeList.push({ title: itemTitle, url: parsed.url, description: r.description });
                          }
                        });

                        // Collect all Paid links
                        const paidList: { title: string; url: string; description?: string }[] = [];
                        if (course.paidResourcesUrl) {
                          const parsed = parseResourceUrl(course.paidResourcesUrl);
                          paidList.push({ title: parsed.title || 'المصادر والشروحات المدفوعة', url: parsed.url });
                        }
                        (course.resources || []).forEach((r: any) => {
                          if (r.paidResourcesUrl) {
                            const parsed = parseResourceUrl(r.paidResourcesUrl);
                            const itemTitle = parsed.title || (r.title ? `${r.title} - شروحات مدفوعة` : 'شروحات مدفوعة');
                            paidList.push({ title: itemTitle, url: parsed.url, description: r.description });
                          }
                        });

                        // Collect all Drive / File Links (Strictly EXCLUDING WhatsApp Links)
                        const fileList: { title: string; url: string; description?: string }[] = [];
                        if (course.driveLink || course.boxLink) {
                          const mainRaw = course.driveLink || course.boxLink;
                          if (!isWhatsappUrl(mainRaw)) {
                            const parsed = parseResourceUrl(mainRaw);
                            fileList.push({ title: parsed.title || 'ملفات جوجل درايف / Box الرئيسية', url: parsed.url });
                          }
                        }
                        (course.resources || []).forEach((r: any) => {
                          const fileRaw = r.url || r.boxLink || r.driveLink;
                          if (fileRaw && r.type !== 'whatsapp' && r.type !== 'group' && !isWhatsappUrl(fileRaw)) {
                            const parsed = parseResourceUrl(fileRaw);
                            fileList.push({ title: parsed.title || r.title || 'باقة ملفات ومصادر', url: parsed.url, description: r.description });
                          }
                        });

                        const hasAnyContent = freeList.length > 0 || paidList.length > 0 || fileList.length > 0;

                        return (
                          <div className="space-y-6 animate-in fade-in duration-200">
                            {!hasAnyContent ? (
                              <div className="p-8 text-center bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400">
                                <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-zinc-600" />
                                <p className="text-xs sm:text-sm font-semibold">لم يتم إضافة مصادر إضافية للمادة بعد.</p>
                              </div>
                            ) : (
                              <>
                                {/* Section 1: Free Resources List */}
                                {freeList.length > 0 && (
                                  <div className="space-y-2.5">
                                    <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                                      <FolderGit2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                      المصادر المجانية ({freeList.length})
                                    </h3>
                                    <div className="space-y-2">
                                      {freeList.map((item, idx) => (
                                        <a
                                          key={idx}
                                          href={item.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex items-center justify-between p-3.5 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/50 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl text-emerald-800 dark:text-emerald-300 transition group shadow-xs"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                              <FolderGit2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                              <h4 className="text-xs sm:text-sm font-bold group-hover:underline">{item.title}</h4>
                                              {item.description && <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5">{item.description}</p>}
                                            </div>
                                          </div>
                                          <ExternalLink className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Section 2: Paid Resources List */}
                                {paidList.length > 0 && (
                                  <div className="space-y-2.5">
                                    <h3 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                                      <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                      المصادر والشروحات المدفوعة ({paidList.length})
                                    </h3>
                                    <div className="space-y-2">
                                      {paidList.map((item, idx) => (
                                        <a
                                          key={idx}
                                          href={item.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex items-center justify-between p-3.5 bg-amber-50/60 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-900/50 border border-amber-200/80 dark:border-amber-900/50 rounded-2xl text-amber-800 dark:text-amber-300 transition group shadow-xs"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                              <Sparkles className="w-4 h-4" />
                                            </div>
                                            <div>
                                              <h4 className="text-xs sm:text-sm font-bold group-hover:underline">{item.title}</h4>
                                              {item.description && <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-0.5">{item.description}</p>}
                                            </div>
                                          </div>
                                          <ExternalLink className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Section 3: Files & Drive Packages List */}
                                {fileList.length > 0 && (
                                  <div className="space-y-2.5">
                                    <h3 className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5 px-1">
                                      <FolderGit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                      الملفات وباقات الدرايف ({fileList.length})
                                    </h3>
                                    <div className="space-y-2">
                                      {fileList.map((item, idx) => (
                                        <a
                                          key={idx}
                                          href={item.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="flex items-center justify-between p-3.5 bg-blue-50/60 dark:bg-blue-950/30 hover:bg-blue-100/80 dark:hover:bg-blue-900/50 border border-blue-200/80 dark:border-blue-900/50 rounded-2xl text-blue-900 dark:text-blue-200 transition group shadow-xs"
                                        >
                                          <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                              <FolderGit2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                              <h4 className="text-xs sm:text-sm font-bold group-hover:underline">{item.title}</h4>
                                              {item.description && <p className="text-[11px] text-blue-600/80 dark:text-blue-400/80 mt-0.5">{item.description}</p>}
                                            </div>
                                          </div>
                                          <ExternalLink className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}

                              </>
                            )}
                          </div>
                        );
                      })()}

                      {/* Tab 3: Syllabus */}
                      {activeTab === 'syllabus' && course.syllabus && (
                        <div className="animate-in fade-in duration-200 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800">
                          <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider mb-2">توصيف المقرر التفصيلي</h3>
                          <div className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                            {course.syllabus}
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
