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

interface CourseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseIdOrCode: string | number | null;
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
      const res = await fetch(`/api/courses/${courseIdOrCode}/details`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
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
                  <div className="w-20 h-20 rounded-2xl bg-white dark:bg-zinc-900 border-4 border-white dark:border-zinc-900 overflow-hidden shadow-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                    {course.avatarUrl ? (
                      <img src={course.avatarUrl} alt={course.name} className="w-full h-full object-cover" />
                    ) : (
                      <GraduationCap className="w-10 h-10" />
                    )}
                  </div>
                </div>
              </div>

              {/* Content Body */}
              <div className="pt-10 px-6 pb-6 overflow-y-auto flex-1 custom-scrollbar">
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-zinc-800/80">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 text-xs font-mono font-bold rounded-lg" dir="ltr">
                        {course.code ? course.code.replace(/^مادة\s*/i, '').trim() : ''}
                      </span>
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
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">{course.name}</h2>
                  </div>
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
                    {/* Prerequisite & Progression Chain Diagram */}
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
                          <span className="text-sm font-mono block">{course.code}</span>
                          <span className="text-xs truncate block opacity-90">{course.name}</span>
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

                    <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800">
                      <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider mb-2">عن المادة</h3>
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

                    {/* Quick Direct Links Preview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {course.driveLink && (
                        <a
                          href={course.driveLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-3.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-blue-700 dark:text-blue-300 transition"
                        >
                          <div className="flex items-center gap-2">
                            <FolderGit2 className="w-4 h-4" />
                            <span className="text-xs font-bold">رابط جوجل درايف</span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                        </a>
                      )}
                      {course.whatsappLink && (
                        <a
                          href={course.whatsappLink}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-700 dark:text-emerald-300 transition"
                        >
                          <div className="flex items-center gap-2">
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-xs font-bold">جروب الواتساب</span>
                          </div>
                          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Tab 2: Resources & Links */}
                {activeTab === 'resources' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Direct Links Section: Free, Paid, Drive, & WhatsApp */}
                    {(course.freeResourcesUrl || course.paidResourcesUrl || course.driveLink || course.whatsappLink) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                        {course.freeResourcesUrl && (
                          <a
                            href={course.freeResourcesUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-700 dark:text-emerald-300 transition shadow-xs"
                          >
                            <div className="flex items-center gap-2">
                              <FolderGit2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-xs font-bold">المصادر المجانية</span>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                          </a>
                        )}
                        {course.paidResourcesUrl && (
                          <a
                            href={course.paidResourcesUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-3.5 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-700 dark:text-amber-300 transition shadow-xs"
                          >
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              <span className="text-xs font-bold">المصادر والشروحات المدفوعة</span>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                          </a>
                        )}
                        {course.driveLink && (
                          <a
                            href={course.driveLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-3.5 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-900/50 rounded-xl text-blue-700 dark:text-blue-300 transition shadow-xs"
                          >
                            <div className="flex items-center gap-2">
                              <FolderGit2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-xs font-bold">ملفات درايف / Box</span>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                          </a>
                        )}
                        {course.whatsappLink && (
                          <a
                            href={course.whatsappLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between p-3.5 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/40 border border-teal-200 dark:border-teal-900/50 rounded-xl text-teal-700 dark:text-teal-300 transition shadow-xs"
                          >
                            <div className="flex items-center gap-2">
                              <MessageCircle className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                              <span className="text-xs font-bold">مجموعة الواتساب</span>
                            </div>
                            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                          </a>
                        )}
                      </div>
                    )}

                    {/* Course Resources items list */}
                    {course.resources && course.resources.length > 0 ? (
                      <div className="space-y-2.5">
                        {course.resources.map((res: any, idx: number) => (
                          <div key={idx} className="p-4 bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-2.5">
                            <a
                              href={res.url || res.boxLink || res.driveLink || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between group"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                  {res.type === 'whatsapp' || res.type === 'group' ? (
                                    <MessageCircle className="w-4 h-4" />
                                  ) : (
                                    <FolderGit2 className="w-4 h-4" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-zinc-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">{res.title}</h4>
                                  {res.description && (
                                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">{res.description}</p>
                                  )}
                                </div>
                              </div>
                              <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
                            </a>

                            {(res.freeResourcesUrl || res.paidResourcesUrl) && (
                              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-zinc-700/60">
                                {res.freeResourcesUrl && (
                                  <a
                                    href={res.freeResourcesUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 text-xs font-bold hover:bg-emerald-100 transition"
                                  >
                                    <FolderGit2 className="w-3.5 h-3.5" />
                                    <span>المصادر المجانية</span>
                                  </a>
                                )}
                                {res.paidResourcesUrl && (
                                  <a
                                    href={res.paidResourcesUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 text-xs font-bold hover:bg-amber-100 transition"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>المصادر والشروحات المدفوعة</span>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : !(course.freeResourcesUrl || course.paidResourcesUrl || course.driveLink || course.whatsappLink) ? (
                      <div className="p-8 text-center bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400">
                        <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-zinc-600" />
                        <p className="text-xs sm:text-sm font-semibold">لم يتم إضافة مصادر إضافية للمادة بعد.</p>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Tab 3: Syllabus */}
                {activeTab === 'syllabus' && course.syllabus && (
                  <div className="animate-in fade-in duration-200 bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800">
                    <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider mb-2">توصيف المقرر التفصيلي</h3>
                    <div className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                      {course.syllabus}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
