'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Sparkles,
  ArrowUpRight,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BookOpen,
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { useSWR } from '../lib/swr';
import { AnimatedNumber } from './ui';
import {
  getSubjectPrereqs,
  isCourseCompleted,
  computeAcademicProgress
} from '../lib/academic-utils';

interface AcademicProgressTabProps {
  user: any;
  dbUser: any;
  subjects?: any[];
  majors?: any[];
  refreshToken?: () => Promise<void>;
}

export function AcademicProgressTab({
  user,
  dbUser,
  subjects: propSubjects,
  majors: propMajors,
  refreshToken
}: AcademicProgressTabProps) {
  // SWR fetches for fallback if not provided
  const { data: fetchedMajors, isLoading: majorsLoading } = useSWR<any[]>(
    !propMajors ? '/api/majors' : null
  );
  const { data: fetchedSubjects, isLoading: subjectsLoading } = useSWR<any[]>(
    !propSubjects ? '/api/subjects' : null
  );

  const majors = useMemo(() => {
    return propMajors || (Array.isArray(fetchedMajors) ? fetchedMajors : []);
  }, [propMajors, fetchedMajors]);

  const subjects = useMemo(() => {
    return propSubjects || (Array.isArray(fetchedSubjects) ? fetchedSubjects : []);
  }, [propSubjects, fetchedSubjects]);

  const [completedCourses, setCompletedCourses] = useState<string[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Sync completedCourses with dbUser
  useEffect(() => {
    if (dbUser) {
      let parsedCourses: string[] = [];
      if (dbUser.completedCourses) {
        if (Array.isArray(dbUser.completedCourses)) {
          parsedCourses = dbUser.completedCourses;
        } else if (typeof dbUser.completedCourses === 'string') {
          try {
            parsedCourses = JSON.parse(dbUser.completedCourses);
          } catch {}
        }
      }
      setCompletedCourses(parsedCourses);
    }
  }, [dbUser]);

  const majorName = dbUser?.major || '';

  const progressData = useMemo(() => {
    return computeAcademicProgress(majors, subjects, majorName, completedCourses);
  }, [majors, subjects, majorName, completedCourses]);

  const saveProgressToServer = async (updatedCourses: string[], updatedHours: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/users/me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          completedCourses: updatedCourses,
          finishedHours: updatedHours ? parseInt(updatedHours, 10) || null : null
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل تحديث المقررات المنجزة');
      }

      if (refreshToken) {
        await refreshToken();
      }
    } catch (err: any) {
      console.error('[Save Progress Error]', err);
      setFeedback({
        type: 'error',
        message: err.message || 'حدث خطأ أثناء حفظ تقدم المواد. يرجى المحاولة مرة أخرى.'
      });
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleCourse = (s: any) => {
    const isChecked = isCourseCompleted(completedCourses, s.code);
    const prereqCodes = getSubjectPrereqs(s);
    const unmetPrereqs = prereqCodes.filter(p => !isCourseCompleted(completedCourses, p));
    const isLocked = !isChecked && unmetPrereqs.length > 0;

    if (isLocked) {
      setFeedback({
        type: 'error',
        message: `لا يمكن تحديد المادة (${s.code}) قبل اجتياز المتطلبات السابقة: ${unmetPrereqs.join(', ')}`
      });
      setTimeout(() => setFeedback(null), 4000);
      return;
    }

    const checked = !isChecked;
    const targetNorm = s.code.replace(/\s+/g, '').toLowerCase();
    const updatedCourses = checked
      ? [...completedCourses, s.code]
      : completedCourses.filter(c => c && c.replace(/\s+/g, '').toLowerCase() !== targetNorm);

    let newFinishedHours = 0;
    progressData.displayedSubjects.forEach((subj: any) => {
      if (isCourseCompleted(updatedCourses, subj.code)) {
        newFinishedHours += Number(subj.creditHours || 3);
      }
    });

    const newHoursStr = newFinishedHours.toString();
    setCompletedCourses(updatedCourses);
    saveProgressToServer(updatedCourses, newHoursStr);
  };

  const isLoading = (majorsLoading && !propMajors) || (subjectsLoading && !propSubjects);

  if (isLoading && subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl text-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-imamu-accent)] mb-3" />
        <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">جاري تحميل الخطة والمقررات الأكاديمية...</p>
      </div>
    );
  }

  if (!majorName) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl text-center gap-4 animate-in fade-in duration-300">
        <div className="w-16 h-16 rounded-2xl bg-[var(--color-imamu-brown)]/10 border border-[var(--color-imamu-brown)]/20 flex items-center justify-center text-[var(--color-imamu-accent)]">
          <GraduationCap className="w-8 h-8" />
        </div>
        <div className="max-w-md">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mb-1.5">
            يرجى تحديد تخصصك الدراسي
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
            لعرض خطتك الأكاديمية ومتابعة المواد المنجزة والمتطلبات السابقة، يرجى اختيار تخصصك من صفحة الملف الشخصي.
          </p>
        </div>
        <Link
          href="/profile"
          className="btn-rise inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-light)] text-white text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <Settings className="w-4 h-4" />
          <span>الذهاب إلى الملف الشخصي</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Toast Feedback */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <div
              className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-xs sm:text-sm font-bold shadow-xs ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-800 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {feedback.type === 'success' ? (
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="text-xs opacity-70 hover:opacity-100 px-1.5 py-0.5 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Header */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-[var(--color-imamu-accent)]">
                {progressData.userMajor?.name || majorName}
              </span>
              {isSaving && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  جارٍ الحفظ...
                </span>
              )}
            </div>
            <h2 className="text-slate-900 dark:text-white font-bold block text-lg sm:text-xl">
              نسبة إنجاز الخطة الأكاديمية
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium mt-0.5">
              اجتزت <AnimatedNumber value={progressData.totalFinishedInReq} /> من {progressData.totalReq} مقرر (إجمالي <AnimatedNumber value={progressData.totalFinishedHours} /> ساعة معتمدة)
            </p>
          </div>
          <div className="flex items-baseline gap-1 text-[var(--color-imamu-accent)] font-black text-3xl">
            <AnimatedNumber value={progressData.percentFinished} />
            <span className="text-2xl font-bold">%</span>
          </div>
        </div>

        {/* Solid Color Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-zinc-800/80 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200/50 dark:border-zinc-700/50">
          <motion.div
            className="bg-[var(--color-imamu-accent)] h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressData.percentFinished}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>

        {/* Global Accordion Toggle Bar with Msari Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs border-t border-slate-100 dark:border-zinc-800/80">
          <span className="text-slate-500 dark:text-zinc-400 font-medium">
            إجمالي {progressData.groups.length} حزمة ومستوى
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="https://msari.vercel.app/index.html"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-rise inline-flex items-center gap-2 text-xs font-bold text-white bg-[#0E352C] hover:bg-[#13493d] px-4 py-2 rounded-full border border-[#3DC9B0]/40 shadow-sm shadow-[#0E352C]/30 transition-all cursor-pointer shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#3DC9B0] shrink-0" />
              <span>تعمّق مع مساري</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
            </a>

            <button
              type="button"
              onClick={() => {
                const nextState: Record<string, boolean> = {};
                progressData.allGroupNames.forEach(n => {
                  nextState[n] = false;
                });
                setCollapsedGroups(nextState);
              }}
              className="text-xs font-bold text-[var(--color-imamu-accent)] hover:underline px-3.5 py-2 rounded-xl bg-stone-50 dark:bg-stone-950/40 border border-slate-200/80 dark:border-zinc-700/80 cursor-pointer transition hover:bg-stone-100 dark:hover:bg-stone-900"
            >
              توسيع الكل
            </button>
            <button
              type="button"
              onClick={() => {
                const nextState: Record<string, boolean> = {};
                progressData.allGroupNames.forEach(n => {
                  nextState[n] = true;
                });
                setCollapsedGroups(nextState);
              }}
              className="text-xs font-bold text-slate-600 dark:text-zinc-400 hover:underline px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 cursor-pointer transition hover:bg-slate-200 dark:hover:bg-zinc-700"
            >
              طي الكل
            </button>
          </div>
        </div>
      </div>

      {/* Groups / Batches Collapsible List (2-column masonry grid) */}
      {progressData.groups.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          {[
            progressData.groups.filter((_, idx) => idx % 2 === 0),
            progressData.groups.filter((_, idx) => idx % 2 === 1)
          ].map((columnGroups, colIdx) => (
            <div key={colIdx} className="flex flex-col gap-4 w-full">
              {columnGroups.map(([groupName, groupSubjects]: [string, any[]]) => {
                const totalInGroup = groupSubjects.length;
                const declaredReqCount = groupSubjects[0]?.reqCount || 0;
                const isLevelGroup = groupName.startsWith('المستوى');
                const reqCount = (declaredReqCount > 0 && !isLevelGroup) ? declaredReqCount : totalInGroup;

                const selectedInGroup = groupSubjects.filter(s =>
                  isCourseCompleted(completedCourses, s.code)
                ).length;
                const isGroupFull = selectedInGroup >= reqCount;

                // Calculate if ALL courses in this batch are locked
                const allCoursesInGroupLocked =
                  groupSubjects.length > 0 &&
                  groupSubjects.every(s => {
                    if (isCourseCompleted(completedCourses, s.code)) return false;
                    const prereqs = getSubjectPrereqs(s);
                    return prereqs.length > 0 && prereqs.some(p => !isCourseCompleted(completedCourses, p));
                  });

                // Calculate batch completion ratio
                const completionRatio = totalInGroup > 0 ? selectedInGroup / totalInGroup : 0;
                const isAtLeast33Percent = completionRatio >= 0.33;

                const defaultCollapsed = isGroupFull || allCoursesInGroupLocked || !isAtLeast33Percent;
                const isCollapsed = collapsedGroups[groupName] ?? defaultCollapsed;

                return (
                  <div
                    key={groupName}
                    className={`border rounded-2xl overflow-hidden transition-all duration-300 h-fit ${
                      isGroupFull
                        ? 'bg-emerald-50/30 border-emerald-200/80 dark:bg-emerald-950/15 dark:border-emerald-900/40'
                        : allCoursesInGroupLocked
                        ? 'bg-slate-100/50 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800/60 opacity-85'
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800'
                    }`}
                  >
                    {/* Collapsible Accordion Header */}
                    <div
                      onClick={() =>
                        setCollapsedGroups(prev => ({ ...prev, [groupName]: !isCollapsed }))
                      }
                      className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`p-1 rounded-lg text-slate-400 dark:text-zinc-500 shrink-0 transition-transform duration-200 ${
                            !isCollapsed ? 'rotate-180' : ''
                          }`}
                        >
                          <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-zinc-400" />
                        </div>
                        <h4
                          className={`font-bold text-xs sm:text-sm leading-snug truncate flex items-center gap-1.5 ${
                            isGroupFull
                              ? 'text-emerald-800 dark:text-emerald-400'
                              : 'text-slate-900 dark:text-white'
                          }`}
                          title={groupName}
                        >
                          <span className="truncate">{groupName}</span>
                          {isGroupFull && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          )}
                        </h4>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                        {allCoursesInGroupLocked && !isGroupFull && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-300/60 dark:border-zinc-700 whitespace-nowrap flex items-center gap-1">
                            🔒 مغلقة
                          </span>
                        )}
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                            isGroupFull
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                              : 'bg-stone-50 dark:bg-stone-950/50 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] border-slate-200/80 dark:border-zinc-700/80'
                          }`}
                        >
                          المنجز: {selectedInGroup} / {reqCount}
                        </span>
                      </div>
                    </div>

                    {/* Accordion Body */}
                    <AnimatePresence initial={false}>
                      {!isCollapsed && (
                        <motion.div
                          key="accordion-body"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-zinc-800/80 mt-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                              {groupSubjects.map((s: any) => {
                                const isChecked = isCourseCompleted(completedCourses, s.code);
                                const prereqCodes = getSubjectPrereqs(s);
                                const unmetPrereqs = prereqCodes.filter(
                                  p => !isCourseCompleted(completedCourses, p)
                                );
                                const isLocked = !isChecked && unmetPrereqs.length > 0;

                                return (
                                  <div
                                    key={s.id}
                                    onClick={() => handleToggleCourse(s)}
                                    className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-2.5 select-none ${
                                      isChecked
                                        ? 'bg-emerald-50/70 border-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-700 shadow-xs cursor-pointer hover:bg-emerald-100/60 dark:hover:bg-emerald-900/50'
                                        : isLocked
                                        ? 'bg-slate-100/70 border-slate-200 dark:bg-zinc-950/70 dark:border-zinc-800/80 cursor-not-allowed opacity-75'
                                        : 'bg-white border-slate-200/90 hover:border-[var(--color-imamu-accent)] dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-700 cursor-pointer shadow-2xs hover:shadow-sm'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-1">
                                          <span className="font-mono text-[11px] font-bold text-[var(--color-imamu-accent)]">
                                            {s.code}
                                          </span>
                                          <span className="text-[10px] text-slate-400 dark:text-zinc-500">•</span>
                                          <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">
                                            {s.creditHours || 3} س
                                          </span>
                                        </div>
                                        <h5
                                          className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1"
                                          title={s.name}
                                        >
                                          {s.name}
                                        </h5>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-zinc-800/60 text-[11px]">
                                      {isChecked ? (
                                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                                          <CheckCircle2 className="w-3.5 h-3.5" /> تم الاجتياز
                                        </span>
                                      ) : isLocked ? (
                                        <span
                                          className="inline-flex items-center gap-1 font-bold text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] truncate"
                                          title={`يتطلب اجتياز: ${unmetPrereqs.join(', ')}`}
                                        >
                                          <span>🔒 يتطلب: {unmetPrereqs.join(', ')}</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 font-bold text-slate-500 dark:text-zinc-400 hover:text-[var(--color-imamu-accent)] dark:hover:text-[var(--color-imamu-accent)]">
                                          <span>انقر لتحديد المادة</span>
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 text-sm font-medium">
          لم يتم العثور على مقررات أو خطة لتخصصك الحالي.
        </div>
      )}
    </div>
  );
}
