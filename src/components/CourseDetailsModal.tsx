'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import { 
  X, 
  BookOpen, 
  ExternalLink, 
  Clock, 
  FileText, 
  Sparkles, 
  GraduationCap,
  Folder,
  Video,
  ArrowLeft,
  Tag,
  Copy,
  Check,
  DollarSign,
  BadgePercent
} from 'lucide-react';

import { cleanCourseName, cleanUrlProtocol, parseResourceUrl, parseAllResourceLinks, isWhatsappUrl } from '../lib/url-utils';
import { WhatsappIcon } from './WhatsappIcon';
import { CourseBannerPattern } from './CourseBannerPattern';

interface CourseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseIdOrCode: string | number | object | null;
  initialData?: any;
}

function CourseAvatar({ avatarUrl, bannerUrl, name }: { avatarUrl?: string; whatsappUrl?: string; bannerUrl?: string; name?: string }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [avatarUrl, bannerUrl]);

  if (avatarUrl && !hasError) {
    return (
      <img 
        src={avatarUrl} 
        alt={name || 'Avatar'} 
        className="w-full h-full object-cover" 
        onError={() => setHasError(true)} 
      />
    );
  }

  if (bannerUrl && !hasError) {
    return (
      <img 
        src={bannerUrl} 
        alt={name || 'Banner'} 
        className="w-full h-full object-cover" 
        onError={() => setHasError(true)} 
      />
    );
  }

  return (
    <div className="w-full h-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-[var(--color-imamu-accent)]">
      <GraduationCap className="w-10 h-10" />
    </div>
  );
}

function CourseContentDetails({ course, activeTab, setActiveTab }: { course: any; activeTab: string; setActiveTab: (t: any) => void }) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isNonCourseRes = course.isAcademicSubject === false || course.code === 'مجموعة طلابية' || course.code === 'مصدر أكاديمي' || (!course.subjectId && (!course.code || course.code === 'مجموعة طلابية' || course.code === 'مصدر أكاديمي'));

  const rawCode = course.code ? course.code.replace(/^مصادر مادة\s*/i, '').replace(/^مادة\s*/i, '').trim() : '';
  const rawName = (course.name || course.title) ? String(course.name || course.title).replace(/^مصادر مادة\s+مادة\s*/gi, '').replace(/^مصادر مادة\s*/gi, '').trim() : '';
  
  const displayCode = isNonCourseRes ? rawCode : rawCode.replace(/\s*\([^)]*\)/g, '').trim();
  const displayName = isNonCourseRes ? (rawName || course.name || course.title) : (rawName.replace(/\s*\([^)]*\)/g, '').trim() || course.name || course.title);

  const isAcademicSubject = !isNonCourseRes && course.isAcademicSubject !== false && Boolean(
    course.subjectId || 
    course.level ||
    (displayCode && /^[A-Z0-9\-\_]{2,10}$/i.test(displayCode) && !/[\u0600-\u06FF]/.test(displayCode) && displayCode !== 'مصدر' && displayCode !== 'مصدر أكاديمي' && displayCode !== 'مجموعة طلابية') ||
    (course.prerequisites && course.prerequisites.length > 0) ||
    (course.dependents && course.dependents.length > 0)
  );

  // Link parsing & collection
  const isWaUrl = (url?: string) => Boolean(url && (url.includes('chat.whatsapp.com') || url.includes('wa.me') || url.includes('whatsapp.com')));

  // Helper utility to prevent duplicate links by URL
  const dedupeLinks = <T extends { url: string }>(items: T[]): T[] => {
    const seen = new Set<string>();
    return items.filter(item => {
      if (!item.url || item.url === '#') return true;
      const cleanUrl = item.url.trim().toLowerCase().replace(/\/$/, '');
      if (seen.has(cleanUrl)) return false;
      seen.add(cleanUrl);
      return true;
    });
  };

  // Collect all Free links
  const rawFreeList: { title: string; url: string; description?: string }[] = [];
  if (course.freeResourcesUrl) {
    const parsedItems = parseAllResourceLinks(course.freeResourcesUrl);
    parsedItems.forEach(p => {
      rawFreeList.push({ title: p.title || 'مصادر مجانية', url: p.url });
    });
  }
  (course.resources || []).forEach((r: any) => {
    if (r.freeResourcesUrl) {
      const parsedItems = parseAllResourceLinks(r.freeResourcesUrl);
      parsedItems.forEach(p => {
        const itemTitle = p.title || (r.title ? `${r.title} - شروحات مجانية` : 'شروحات مجانية');
        rawFreeList.push({ title: itemTitle, url: p.url, description: r.description });
      });
    }
  });
  const freeList = dedupeLinks(rawFreeList);

  // Collect all Paid links
  const rawPaidList: { title: string; url: string; code?: string; discount?: string; description?: string }[] = [];
  if (course.paidResourcesUrl) {
    const parsedItems = parseAllResourceLinks(course.paidResourcesUrl);
    parsedItems.forEach(p => {
      rawPaidList.push({ title: p.title || 'شروحات مدفوعة', url: p.url, code: p.code, discount: p.discount });
    });
  }
  (course.resources || []).forEach((r: any) => {
    if (r.paidResourcesUrl) {
      const parsedItems = parseAllResourceLinks(r.paidResourcesUrl);
      parsedItems.forEach(p => {
        const itemTitle = p.title || (r.title ? `${r.title} - شروحات مدفوعة` : 'شروحات مدفوعة');
        rawPaidList.push({ title: itemTitle, url: p.url, code: p.code, discount: p.discount, description: r.description });
      });
    }
  });
  const paidList = dedupeLinks(rawPaidList);

  // Collect all Drive / File Links
  const rawFileList: { title: string; url: string; description?: string }[] = [];
  if (course.driveLink || course.boxLink) {
    const mainRaw = course.driveLink || course.boxLink;
    if (!isWaUrl(mainRaw)) {
      const parsedItems = parseAllResourceLinks(mainRaw);
      parsedItems.forEach(p => {
        rawFileList.push({ title: p.title || 'ملفات جوجل درايف / Box الرئيسية', url: p.url });
      });
    }
  }
  (course.resources || []).forEach((r: any) => {
    const fileRaw = r.url || r.boxLink || r.driveLink;
    if (fileRaw && r.type !== 'whatsapp' && r.type !== 'group' && !isWaUrl(fileRaw)) {
      const parsedItems = parseAllResourceLinks(fileRaw);
      parsedItems.forEach(p => {
        rawFileList.push({ title: p.title || r.title || 'ملف مصادر', url: p.url, description: r.description });
      });
    }
  });
  const fileList = dedupeLinks(rawFileList);

  const explanationsCount = freeList.length + paidList.length;
  const filesCount = fileList.length;

  const getWa = (c: any) => {
    if (!c) return null;
    const isWa = (u?: string) => Boolean(u && (u.includes('whatsapp.com') || u.includes('wa.me')));
    if (isWa(c.whatsappLink)) return c.whatsappLink;
    if (isWa(c.whatsappUrl)) return c.whatsappUrl;
    if (c.resources && Array.isArray(c.resources)) {
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
  const parsedWa = rawWa ? parseResourceUrl(rawWa) : null;

  return (
    <>
      {/* Header Information */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {displayCode && displayCode !== 'مادة' && displayCode !== 'مصدر أكاديمي' && !/[\u0600-\u06FF]/.test(displayCode) && (
              <span className="px-2.5 py-1 bg-stone-50 dark:bg-stone-950/60 text-[var(--color-imamu-accent)] border border-amber-200 dark:border-stone-900/50 text-xs font-mono font-bold rounded-lg" dir="ltr">
                {displayCode}
              </span>
            )}
            {course.creditHours && (
              <span className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-semibold rounded-lg">
                <Clock className="w-3 h-3 text-[var(--color-imamu-accent)]" /> {course.creditHours} ساعات
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

        {parsedWa && (
          <a
            href={parsedWa.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all duration-200 hover:scale-[1.04] active:scale-95 cursor-pointer shrink-0 self-start sm:self-center"
          >
            <WhatsappIcon className="w-4 h-4 fill-current" />
            <span>واتساب</span>
          </a>
        )}
      </div>

      {/* Tabs Header */}
      <LayoutGroup id="courseDetailsModalTabs">
        <div className="relative flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-zinc-800/80 mb-6 pb-0" dir="rtl">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`relative pb-3 px-4 font-bold transition-colors duration-200 text-xs sm:text-sm flex items-center gap-2 select-none cursor-pointer ${
              activeTab === 'overview'
                ? 'text-[var(--color-imamu-accent)]'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <BookOpen className={`w-4 h-4 transition-colors ${activeTab === 'overview' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500'}`} />
            <span>نظرة عامة</span>
            {activeTab === 'overview' && (
              <motion.div
                layoutId="modalActiveTabUnderline"
                className="absolute bottom-0 right-0 left-0 h-0.5 bg-[var(--color-imamu-brown)] dark:bg-[var(--color-imamu-brown)] rounded-full shadow-xs shadow-[var(--color-imamu-brown)/20]"
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('explanations')}
            className={`relative pb-3 px-4 font-bold transition-colors duration-200 text-xs sm:text-sm flex items-center gap-2 select-none cursor-pointer ${
              activeTab === 'explanations'
                ? 'text-[var(--color-imamu-accent)]'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Video className={`w-4 h-4 transition-colors ${activeTab === 'explanations' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'}`} />
            <span>الشروحات ({explanationsCount})</span>
            {activeTab === 'explanations' && (
              <motion.div
                layoutId="modalActiveTabUnderline"
                className="absolute bottom-0 right-0 left-0 h-0.5 bg-[var(--color-imamu-brown)] dark:bg-[var(--color-imamu-brown)] rounded-full shadow-xs shadow-[var(--color-imamu-brown)/20]"
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`relative pb-3 px-4 font-bold transition-colors duration-200 text-xs sm:text-sm flex items-center gap-2 select-none cursor-pointer ${
              activeTab === 'files'
                ? 'text-[var(--color-imamu-accent)]'
                : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
            }`}
          >
            <Folder className={`w-4 h-4 transition-colors ${activeTab === 'files' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-zinc-500'}`} />
            <span>الملفات ({filesCount})</span>
            {activeTab === 'files' && (
              <motion.div
                layoutId="modalActiveTabUnderline"
                className="absolute bottom-0 right-0 left-0 h-0.5 bg-[var(--color-imamu-brown)] dark:bg-[var(--color-imamu-brown)] rounded-full shadow-xs shadow-[var(--color-imamu-brown)/20]"
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              />
            )}
          </button>

          {course.syllabus && (
            <button
              type="button"
              onClick={() => setActiveTab('syllabus')}
              className={`relative pb-3 px-4 font-bold transition-colors duration-200 text-xs sm:text-sm flex items-center gap-2 select-none cursor-pointer ${
                activeTab === 'syllabus'
                  ? 'text-[var(--color-imamu-accent)]'
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <FileText className={`w-4 h-4 transition-colors ${activeTab === 'syllabus' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-400 dark:text-zinc-500'}`} />
              <span>توصيف المقرر</span>
              {activeTab === 'syllabus' && (
                <motion.div
                  layoutId="modalActiveTabUnderline"
                  className="absolute bottom-0 right-0 left-0 h-0.5 bg-[var(--color-imamu-brown)] dark:bg-[var(--color-imamu-brown)] rounded-full shadow-xs shadow-[var(--color-imamu-brown)/20]"
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                />
              )}
            </button>
          )}
        </div>
      </LayoutGroup>

      {/* Animated Tab Content Panels */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-5"
          >
            <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider">الوصف</h3>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                {(() => {
                  const desc = course.description?.trim();
                  const isPrereqDesc = desc && (desc.startsWith('المتطلبات السابقة:') || desc.startsWith('المتطلب السابق:'));
                  const resDesc = (course.resources || []).find((r: any) => r.description && r.description.trim() && !r.description.trim().startsWith('المتطلبات السابقة:'))?.description;
                  
                  if (desc && !isPrereqDesc) {
                    return desc;
                  }
                  if (resDesc) {
                    return resDesc;
                  }
                  if (desc) {
                    return desc;
                  }
                  return isAcademicSubject
                    ? `تعتبر مادة ${displayName || course.name} من المواد الأساسية في الخطّة الأكاديمية للتخصص.`
                    : `تجميع ومصادر طلابية شاملة لـ ${displayName || course.name}.`;
                })()}
              </p>

              {/* Prerequisite & Dependent Subjects info included cleanly in Description card */}
              {isAcademicSubject && ((course.prerequisites && course.prerequisites.length > 0) || (course.dependents && course.dependents.length > 0)) && (
                <div className="pt-3 border-t border-slate-200/60 dark:border-zinc-700/60 space-y-1.5 text-xs text-slate-600 dark:text-zinc-400">
                  {course.prerequisites && course.prerequisites.length > 0 && (
                    <p className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white">• المتطلب السابق:</span>
                      <span className="font-medium text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)]">{course.prerequisites.map((p: any) => `${p.code} (${p.name})`).join('، ')}</span>
                    </p>
                  )}
                  {course.dependents && course.dependents.length > 0 && (
                    <p className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white">• تفتح المواد التالية:</span>
                      <span className="font-medium text-emerald-700 dark:text-emerald-400">{course.dependents.map((d: any) => `${d.code} (${d.name})`).join('، ')}</span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'explanations' && (
          <motion.div
            key="explanations"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-6"
          >
            {/* Free Resources Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>المصادر المجانية ({freeList.length})</span>
              </h3>
              {freeList.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-zinc-500 italic bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                  لا توجد روابط شروحات مجانية مسجلة حالياً لهذه المادة.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {freeList.map((item, idx) => (
                    <a
                      key={idx}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/10 border border-slate-200/80 dark:border-zinc-800 hover:border-emerald-500/40 dark:hover:border-emerald-400/40 transition-all duration-200 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                          <Video className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                            {item.title}
                          </h4>
                          {item.description && (
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 leading-relaxed mt-0.5">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors shrink-0 mr-2" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Paid Resources Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                <span>المصادر والشروحات المدفوعة ({paidList.length})</span>
              </h3>

              {paidList.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-zinc-500 italic bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                  لا توجد شروحات مدفوعة مسجلة لهذه المادة حالياً.
                </p>
              ) : (
                <>
                  <div className="flex flex-col gap-2.5">
                    {paidList.map((item, idx) => (
                      <a
                        key={idx}
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/70 dark:bg-zinc-800/40 hover:bg-amber-500/10 dark:hover:bg-amber-400/10 border border-slate-200/80 dark:border-zinc-800/80 hover:border-amber-500/40 dark:hover:border-amber-400/40 transition-all duration-200 group cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="p-2.5 rounded-xl bg-amber-500/10 dark:bg-amber-400/20 text-amber-600 dark:text-amber-400 shrink-0 transition-colors">
                            <DollarSign className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                              {item.title}
                            </h4>
                            {item.description && (
                              <p className="text-[11px] text-slate-500 dark:text-zinc-400 line-clamp-1 leading-relaxed mt-0.5">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 mr-2">
                          {item.code && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigator.clipboard.writeText(item.code!);
                                setCopiedCode(item.code!);
                                setTimeout(() => setCopiedCode(null), 2000);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 hover:bg-amber-500/20 dark:hover:bg-amber-400/20 text-amber-700 dark:text-amber-300 text-xs font-bold transition-all duration-200 cursor-pointer border border-amber-500/30 dark:border-amber-400/30 group/btn shadow-2xs"
                              title="انقر لنسخ كود الخصم"
                            >
                              <Tag className="w-3 h-3 text-amber-600 dark:text-amber-400 transition-colors" />
                              <span>كود الخصم: <span className="font-mono tracking-wider font-extrabold">{item.code}</span></span>
                              {item.discount && (
                                <span className="bg-amber-500/20 dark:bg-amber-400/20 text-amber-800 dark:text-amber-200 text-[10px] px-1.5 py-0.5 rounded-md font-extrabold mr-0.5">
                                  {item.discount.includes('%') || item.discount.includes('خصم') || item.discount.includes('ريال') ? item.discount : `خصم ${item.discount}`}
                                </span>
                              )}
                              {copiedCode === item.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 opacity-70 group-hover/btn:opacity-100 transition-colors" />
                              )}
                            </button>
                          )}
                          <ExternalLink className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors shrink-0" />
                        </div>
                      </a>
                    ))}
                  </div>

                  {/* Subtle Fine-Print Legal/Support Disclaimer */}
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal leading-relaxed opacity-60 hover:opacity-90 transition-opacity mt-2.5 px-1 select-none">
                    * استخدام أكواد الخصم عند الاشتراك يساهم في دعم وتمويل المنصة للاستمرار والتطوير والصيانة.
                  </p>
                </>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'files' && (
          <motion.div
            key="files"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="space-y-4"
          >
            <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-white" />
              الملفات ({fileList.length})
            </h3>
            {fileList.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-zinc-500 italic bg-slate-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-slate-100 dark:border-zinc-800">
                لا توجد ملفات درايف أو ملخصات مسجلة لهذه المادة حالياً.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fileList.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 hover:bg-stone-50 dark:hover:bg-stone-950/40 border border-slate-200/80 dark:border-zinc-800 hover:border-amber-200 dark:hover:border-amber-900/60 transition-all duration-200 group cursor-pointer"
                  >
                    <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-900/50 text-white shrink-0">
                      <Folder className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[var(--color-imamu-accent)] dark:group-hover:text-[var(--color-imamu-accent)] transition-colors truncate">{item.title}</h4>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 group-hover:text-[var(--color-imamu-accent)] transition-colors shrink-0" />
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-1 leading-relaxed">{item.description}</p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'syllabus' && course.syllabus && (
          <motion.div
            key="syllabus"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800"
          >
            <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-400 uppercase tracking-wider mb-2">توصيف المقرر الدراسي</h3>
            <p className="text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">{course.syllabus}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function CourseDetailsModal({ isOpen, onClose, courseIdOrCode, initialData }: CourseDetailsModalProps) {
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'explanations' | 'files' | 'syllabus'>('overview');
  const [contentHeight, setContentHeight] = useState<number | 'auto'>('auto');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;
    const element = contentRef.current;
    const updateHeight = () => {
      if (element) {
        const fullHeight = element.scrollHeight;
        const maxHeight = window.innerHeight * 0.85 - 144;
        setContentHeight(Math.min(fullHeight, maxHeight));
      }
    };

    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    updateHeight();

    window.addEventListener('resize', updateHeight);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateHeight);
    };
  }, [course, activeTab, loading]);

  useEffect(() => {
    if (!isOpen || !courseIdOrCode) {
      setCourse(null);
      setActiveTab('overview');
      setLoading(false);
      return;
    }

    // Populate initial course data immediately if provided (0ms instant render)
    if (initialData) {
      const isNonCourse = !initialData.subjectId || initialData.isAcademicSubject === false || initialData.courseCode === 'مجموعة طلابية' || initialData.courseCode === 'مصدر أكاديمي';
      const initObj = {
        id: initialData.subjectId || initialData.id,
        subjectId: initialData.subjectId || null,
        code: initialData.courseCode || initialData.code || String(courseIdOrCode),
        name: initialData.title || initialData.name || initialData.courseName,
        title: initialData.title || initialData.name,
        isAcademicSubject: !isNonCourse,
        avatarUrl: initialData.avatarUrl,
        bannerUrl: initialData.bannerUrl,
        whatsappLink: initialData.whatsappLink || initialData.whatsappUrl,
        boxLink: initialData.boxLink || initialData.driveLink,
        freeResourcesUrl: initialData.freeResourcesUrl,
        paidResourcesUrl: initialData.paidResourcesUrl,
        description: initialData.description,
        creditHours: initialData.creditHours,
        level: initialData.level,
        resources: initialData.resources || []
      };
      setCourse(initObj);
      setLoading(false);
    } else {
      setLoading(true);
    }

    // Silent background fetch to enrich with prerequisites & extra details
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};
    const targetCode = typeof courseIdOrCode === 'object' ? (courseIdOrCode as any).courseCode || (courseIdOrCode as any).code || (courseIdOrCode as any).id : courseIdOrCode;

    fetch(`/api/subjects/${encodeURIComponent(String(targetCode))}/details`, { headers })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.course) {
          setCourse((prev: any) => {
            const isNonCourse = (prev && (!prev.subjectId || prev.isAcademicSubject === false || prev.code === 'مجموعة طلابية' || prev.code === 'مصدر أكاديمي')) || data.course.isAcademicSubject === false;
            
            const prevDesc = prev?.description?.trim();
            const apiDesc = data.course.description?.trim();
            const prevDescValid = prevDesc && !prevDesc.startsWith('المتطلبات السابقة:') && !prevDesc.startsWith('المتطلب السابق:');
            const apiDescValid = apiDesc && !apiDesc.startsWith('المتطلبات السابقة:') && !apiDesc.startsWith('المتطلب السابق:');

            const chosenDescription = prevDescValid
              ? prevDesc
              : (apiDescValid ? apiDesc : (prevDesc || apiDesc || null));

            return {
              ...data.course,
              ...(prev || {}),
              name: (isNonCourse && (prev?.name || prev?.title)) ? (prev.name || prev.title) : (data.course.name || prev?.name || prev?.title),
              description: chosenDescription,
              code: (isNonCourse && prev?.code) ? prev.code : (data.course.code || prev?.code),
              freeResourcesUrl: data.course.freeResourcesUrl || prev?.freeResourcesUrl,
              paidResourcesUrl: data.course.paidResourcesUrl || prev?.paidResourcesUrl,
              boxLink: data.course.boxLink || prev?.boxLink,
              whatsappLink: data.course.whatsappLink || prev?.whatsappLink,
              avatarUrl: data.course.avatarUrl || prev?.avatarUrl,
              bannerUrl: data.course.bannerUrl || prev?.bannerUrl
            };
          });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load course details:', err);
        setLoading(false);
      });
  }, [isOpen, courseIdOrCode, initialData]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Window Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ 
            duration: 0.28,
            ease: [0.4, 0, 0.2, 1],
            layout: { duration: 0.28, ease: [0.4, 0, 0.2, 1] } 
          }}
          className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] z-10"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 left-4 p-2.5 rounded-full z-30 transition-all duration-300 ease-out cursor-pointer shadow-lg backdrop-blur-md bg-black/40 hover:bg-black/80 dark:bg-white/20 dark:hover:bg-white/40 text-white dark:text-black border border-white/25 dark:border-black/25 hover:scale-110 active:scale-95 group/close"
            title="إغلاق النافذة"
          >
            <X className="w-4 h-4 transition-transform duration-300 group-hover/close:rotate-90" />
          </button>

          {/* Header / Banner */}
          <div className="relative h-36 bg-slate-100 dark:bg-zinc-950 shrink-0 transition-colors border-b border-slate-200/80 dark:border-zinc-800/80">
            <div className="absolute inset-0 overflow-hidden">
              <CourseBannerPattern courseCode={course?.code} courseName={course?.name} />
              {course?.bannerUrl && (
                <img src={course.bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-20 mix-blend-overlay" />
              )}
            </div>
            
            {/* Course Avatar */}
            <div className="absolute -bottom-8 right-6 z-20">
              <div className="w-20 h-20 rounded-2xl bg-white dark:bg-zinc-900 border-4 border-white dark:border-zinc-900 overflow-hidden shadow-xl flex items-center justify-center">
                {loading ? (
                  <div className="w-full h-full bg-slate-200 dark:bg-zinc-800 animate-pulse" />
                ) : (
                  <CourseAvatar 
                    avatarUrl={course?.avatarUrl} 
                    whatsappUrl={course?.whatsappLink || course?.whatsappUrl || course?.resources?.find((r: any) => r.whatsappUrl || r.whatsappLink || (r.url && r.url.includes('whatsapp')))?.whatsappUrl || course?.resources?.find((r: any) => r.whatsappUrl || r.whatsappLink || (r.url && r.url.includes('whatsapp')))?.whatsappLink} 
                    bannerUrl={course?.bannerUrl}
                    name={course?.name}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Content Body with Height Animation */}
          <motion.div 
            animate={{ height: contentHeight }}
            transition={{ duration: 0.28, ease: [0.4, 0.2, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div ref={contentRef} className="pt-10 px-6 pb-6 overflow-y-auto max-h-[calc(85vh-9rem)] custom-scrollbar">
              {loading ? (
                <div className="space-y-6 animate-pulse" dir="rtl">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="h-6 w-48 bg-slate-200 dark:bg-zinc-800 rounded-xl" />
                      <div className="h-4 w-32 bg-slate-100 dark:bg-zinc-800/60 rounded-lg" />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 border-b border-slate-200 dark:border-zinc-800 pb-3">
                    <div className="h-5 w-20 bg-slate-200 dark:bg-zinc-800 rounded-lg" />
                    <div className="h-5 w-20 bg-slate-100 dark:bg-zinc-800/60 rounded-lg" />
                    <div className="h-5 w-20 bg-slate-100 dark:bg-zinc-800/60 rounded-lg" />
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-3">
                    <div className="h-4 w-16 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                    <div className="h-4 w-full bg-slate-100 dark:bg-zinc-800/60 rounded-md" />
                    <div className="h-4 w-3/4 bg-slate-100 dark:bg-zinc-800/60 rounded-md" />
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-zinc-800/40 rounded-2xl border border-slate-200/80 dark:border-zinc-800 space-y-3">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-zinc-800 rounded-md" />
                    <div className="h-20 w-full bg-slate-100 dark:bg-zinc-800/60 rounded-xl" />
                  </div>
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
                <CourseContentDetails course={course} activeTab={activeTab} setActiveTab={setActiveTab} />
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
