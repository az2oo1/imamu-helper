'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Folder, 
  BookOpen, 
  FolderGit2, 
  Sparkles, 
  FileText, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  Search, 
  Loader2,
  MessageCircle,
  Download
} from 'lucide-react';
import ImageUploadInput from './ImageUploadInput';
import ResourceLinksInput from './ResourceLinksInput';
import { cleanCourseName, isWhatsappUrl, parseAllResourceLinks } from '../lib/url-utils';
import { WhatsappIcon } from './WhatsappIcon';

interface CreateResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceForm: {
    id?: number;
    subjectId?: number;
    title: string;
    type: string;
    url?: string;
    driveLink?: string;
    boxLink?: string;
    whatsappLink?: string;
    freeResourcesUrl?: string;
    paidResourcesUrl?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    description?: string;
  };
  setResourceForm: React.Dispatch<React.SetStateAction<any>>;
  subjects: any[];
  onSave: () => void | Promise<any>;
}

export default function CreateResourceModal({
  isOpen,
  onClose,
  resourceForm,
  setResourceForm,
  subjects,
  onSave
}: CreateResourceModalProps) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [courseSearch, setCourseSearch] = useState('');
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingWaAvatar, setIsFetchingWaAvatar] = useState(false);
  const [waAvatarMessage, setWaAvatarMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleFetchWhatsappAvatar = async () => {
    const waUrl = resourceForm.whatsappLink?.trim();
    if (!waUrl) {
      setWaAvatarMessage({ type: 'error', text: 'الرجاء إضافة رابط مجموعة الواتساب أولاً في الخطوة الثانية' });
      return;
    }

    setIsFetchingWaAvatar(true);
    setWaAvatarMessage(null);
    try {
      const token = localStorage.getItem('imamu_token');
      const res = await fetch('/api/admin/fetch-whatsapp-avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ whatsappUrl: waUrl })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.avatarUrl) {
        throw new Error(data.error || 'تعذر جلب صورة مجموعة الواتساب');
      }

      setResourceForm((s: any) => ({ ...s, avatarUrl: data.avatarUrl }));
      setWaAvatarMessage({ type: 'success', text: 'تم جلب صورة المجموعة وحفظها بنجاح في تخزين S3!' });
    } catch (err: any) {
      setWaAvatarMessage({ type: 'error', text: err.message || 'فشل جلب الصورة من رابط الواتساب' });
    } finally {
      setIsFetchingWaAvatar(false);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCourseDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const isEditing = !!resourceForm.id;
  const selectedCourse = subjects.find(s => 
    Boolean(resourceForm.subjectId) && String(s.id) === String(resourceForm.subjectId)
  );

  const filteredSubjects = subjects.filter(s => 
    !courseSearch || 
    s.code?.toLowerCase().includes(courseSearch.toLowerCase()) || 
    s.name?.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const canAdvance = !!(resourceForm.subjectId || selectedCourse || resourceForm.title?.trim());

  const handleNext = () => {
    if (activeStep === 1 && !canAdvance) {
      alert('الرجاء اختيار المادة الأكاديمية أو إدخال عنوان المصدر');
      return;
    }
    if (activeStep < 4) {
      setActiveStep((s) => (s + 1) as any);
    }
  };

  const handleBack = () => {
    if (activeStep > 1) {
      setActiveStep((s) => (s - 1) as any);
    }
  };

  const handleSaveSubmit = async () => {
    if (!canAdvance) {
      alert('الرجاء اختيار المادة الأكاديمية أو إدخال عنوان المصدر');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await onSave();
      if (res !== false) {
        onClose();
      }
    } catch (e) {
      console.error('Error saving resource:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: 'المادة والعنوان', icon: BookOpen },
    { id: 2, title: 'المجلدات والواتساب', icon: FolderGit2 },
    { id: 3, title: 'المصادر المجانية والمدفوعة', icon: Sparkles },
    { id: 4, title: 'الوسائط والوصف', icon: FileText }
  ];

  // Calculate track fill width for completed steps (0%, 33.3%, 66.6%, 100%)
  const lineProgressWidth = ((activeStep - 1) / (steps.length - 1)) * 100;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6 font-sans text-right" dir="rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/70 dark:bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal Main Window */}
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ 
            type: "spring", 
            duration: 0.35, 
            bounce: 0,
            layout: { type: "spring", stiffness: 350, damping: 28 } 
          }}
          className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col z-10 text-slate-900 dark:text-white max-h-[88vh]"
        >
          {/* Header */}
          <div className="p-6 bg-slate-50/80 dark:bg-zinc-900/90 border-b border-slate-200/80 dark:border-zinc-800 relative shrink-0">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-amber-200 dark:border-stone-900/50 text-[var(--color-imamu-accent)] shadow-xs">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    {isEditing ? `تعديل المصدر: ${cleanCourseName(resourceForm.title || selectedCourse?.name)}` : 'إضافة باقة مصادر جديدة'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
                    {isEditing ? 'تعديل بيانات المصدر والمجلدات المرفقة' : 'إضافة وتنسيق باقة المصادر والمجلدات والروابط بسهولة'}
                  </p>
                </div>
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-full transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                title="إغلاق النافذة"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 4 Circles Horizontal Progress Stepper */}
            <div className="relative pt-1 px-4">
              {/* Background Track Line (Spans exactly from Node 1 center at 12.5% right to Node 4 center at 12.5% left) */}
              <div className="absolute top-4 right-[12.5%] left-[12.5%] h-0.5 bg-slate-200 dark:bg-zinc-800 -z-0 overflow-hidden">
                {/* Animated Completed Track Line (Starts at Node 1 center, extends exactly to active node center) */}
                <motion.div
                  className="h-full bg-emerald-500 rounded-full origin-right"
                  initial={false}
                  animate={{ width: `${((activeStep - 1) / (steps.length - 1)) * 100}%` }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>

              {/* 4 Step Circle Nodes Grid */}
              <div className="relative z-10 grid grid-cols-4 w-full">
                {steps.map((step) => {
                  const isCompleted = activeStep > step.id;
                  const isActive = activeStep === step.id;

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        if (step.id === 1 || canAdvance) setActiveStep(step.id as any);
                      }}
                      className="flex flex-col items-center gap-1.5 cursor-pointer group text-center w-full"
                    >
                      {/* Circle Node (Clean flat, no glow, no shadow, no outer ring) */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all duration-200 ${
                          isCompleted
                            ? 'bg-emerald-500 text-white'
                            : isActive
                            ? 'bg-[var(--color-imamu-brown)] text-white'
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500 border border-slate-200 dark:border-zinc-700'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4 text-white stroke-[3]" />
                        ) : (
                          step.id
                        )}
                      </div>

                      {/* Step Label */}
                      <span className={`text-[11px] font-bold transition px-1 truncate w-full ${
                        isActive
                          ? 'text-[var(--color-imamu-accent)] font-extrabold'
                          : isCompleted
                          ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                          : 'text-slate-400 dark:text-zinc-500'
                      }`}>
                        {step.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Form Body with Smooth Dynamic Height Layout Animation */}
          <motion.div layout className={`p-6 max-h-[65vh] custom-scrollbar ${isCourseDropdownOpen ? 'overflow-visible' : 'overflow-y-auto'}`}>
            <AnimatePresence mode="wait">
              {/* STEP 1: Subject Selection & Resource Title */}
              {activeStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 space-y-4">
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200">
                      المادة الأكاديمية المستهدفة (اختر من قائمة المواد المعتمدة)
                    </label>

                    {selectedCourse ? (
                      <div className="flex items-center justify-between p-3.5 bg-stone-50/70 dark:bg-stone-950/40 border border-amber-200 dark:border-stone-900/50 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <span className="px-2.5 py-1 bg-[var(--color-imamu-brown)] text-white text-xs font-mono font-bold rounded-lg" dir="ltr">
                            {selectedCourse.code}
                          </span>
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                              {cleanCourseName(selectedCourse.name)}
                            </h4>
                            <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                              المستوى {selectedCourse.level || 'عام'} • {selectedCourse.creditHours || 3} ساعات
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setResourceForm((s: any) => ({ ...s, subjectId: undefined }));
                            setCourseSearch('');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-300 text-xs font-bold border border-slate-200 dark:border-zinc-700 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 transition cursor-pointer"
                        >
                          تغيير المادة
                        </button>
                      </div>
                    ) : (
                      <div className={`relative transition-all ${isCourseDropdownOpen ? 'z-[100]' : 'z-10'}`} ref={dropdownRef}>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="ابحث برمز المادة أو اسمها (مثال: CS1111 / أساسيات الحوسبة)..."
                            value={courseSearch}
                            onFocus={() => setIsCourseDropdownOpen(true)}
                            onChange={e => {
                              setCourseSearch(e.target.value);
                              setIsCourseDropdownOpen(true);
                            }}
                            className="w-full py-3 pr-10 pl-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-imamu-brown)] shadow-xs"
                          />
                          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                        </div>

                        {/* Dropdown Menu (Floats On Top Of All Components with Pristine Rounded Corners & Thin Scrollbar) */}
                        {isCourseDropdownOpen && (
                          <div className="absolute right-0 left-0 top-full mt-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl z-[200] overflow-hidden">
                            <div className="max-h-56 overflow-y-auto custom-scrollbar p-1 divide-y divide-slate-100 dark:divide-zinc-800">
                              {filteredSubjects.length > 0 ? (
                                filteredSubjects.map(subj => (
                                  <button
                                    key={subj.id}
                                    type="button"
                                    onClick={() => {
                                      setResourceForm((s: any) => ({
                                        ...s,
                                        subjectId: subj.id,
                                        title: cleanCourseName(subj.name)
                                      }));
                                      setIsCourseDropdownOpen(false);
                                    }}
                                    className="w-full text-right p-3 hover:bg-stone-50 dark:hover:bg-stone-950/50 flex items-center justify-between transition group cursor-pointer rounded-xl"
                                  >
                                    <div>
                                      <h5 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[var(--color-imamu-accent)] dark:group-hover:text-[var(--color-imamu-accent)]">
                                        {cleanCourseName(subj.name)}
                                      </h5>
                                      <span className="text-[11px] text-slate-400">المستوى {subj.level || 'عام'}</span>
                                    </div>
                                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-stone-50 dark:bg-stone-950/60 text-[var(--color-imamu-accent)] border border-amber-200 dark:border-stone-900/50 rounded-md" dir="ltr">
                                      {subj.code}
                                    </span>
                                  </button>
                                ))
                              ) : (
                                <div className="p-4 text-center text-xs text-slate-400">
                                  لم يتم العثور على مادة تطابق "{courseSearch}"
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Resource Package Title & Description Inputs */}
                  <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 space-y-4">
                    {!selectedCourse && (
                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200">
                          عنوان باقة المصدر / المجموعة *
                        </label>
                        <input
                          type="text"
                          placeholder="مثال: قروب تقنية المعلومات / باقة مصادر عامة..."
                          value={resourceForm.title || ''}
                          onChange={e => setResourceForm((s: any) => ({ ...s, title: e.target.value }))}
                          className="w-full py-3 px-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-imamu-brown)] shadow-xs"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200">
                        الوصف والتفاصيل (اختياري)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="اكتب وصفاً ثرياً ومختصراً يوضح محتويات وأهداف هذه الباقة أو المجموعة..."
                        value={resourceForm.description || ''}
                        onChange={e => setResourceForm((s: any) => ({ ...s, description: e.target.value }))}
                        className="w-full py-3 px-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-imamu-brown)] shadow-xs resize-none"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Storage & WhatsApp Links */}
              {activeStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <ResourceLinksInput 
                    label="مجلدات تخزين الملفات (Google Drive / Box Links)" 
                    value={resourceForm.boxLink || ''} 
                    onChange={val => setResourceForm((s: any) => ({ ...s, boxLink: val }))} 
                  />

                  <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200 flex items-center gap-1.5">
                      <WhatsappIcon className="w-4 h-4 text-emerald-500 fill-current" />
                      رابط مجموعة الواتساب المباشر (WhatsApp Group Link)
                    </label>
                    <input
                      type="text"
                      placeholder="https://chat.whatsapp.com/..."
                      value={resourceForm.whatsappLink || ''}
                      onChange={e => setResourceForm((s: any) => ({ ...s, whatsappLink: e.target.value }))}
                      className="w-full py-3 px-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl text-xs font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
                      dir="ltr"
                    />
                  </div>
                </motion.div>
              )}

              {/* STEP 3: Free & Paid Links */}
              {activeStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <ResourceLinksInput 
                    label="المصادر والشروحات المجانية (Free Resources Links List)" 
                    value={resourceForm.freeResourcesUrl || ''} 
                    onChange={val => setResourceForm((s: any) => ({ ...s, freeResourcesUrl: val }))} 
                  />

                  <ResourceLinksInput 
                    label="المصادر والشروحات المدفوعة (Paid Resources Links List)" 
                    value={resourceForm.paidResourcesUrl || ''} 
                    onChange={val => setResourceForm((s: any) => ({ ...s, paidResourcesUrl: val }))} 
                    color="amber" 
                  />
                </motion.div>
              )}

              {/* STEP 4: Media & Overview */}
              {activeStep === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* WhatsApp Avatar Fetch Action Card */}
                  {resourceForm.whatsappLink && (
                    <div className="bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl p-4 border border-emerald-200 dark:border-emerald-900/60 space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <WhatsappIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 fill-current" />
                          <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                            صورة مجموعة الواتساب المكتشفة
                          </span>
                        </div>
                        <button
                          type="button"
                          disabled={isFetchingWaAvatar}
                          onClick={handleFetchWhatsappAvatar}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                        >
                          {isFetchingWaAvatar ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Download className="w-3.5 h-3.5" />
                          )}
                          <span>{isFetchingWaAvatar ? 'جاري الجلب والتخزين...' : 'جلب صورة الواتساب إلى S3'}</span>
                        </button>
                      </div>

                      {waAvatarMessage && (
                        <p className={`text-[11px] font-bold ${waAvatarMessage.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                          {waAvatarMessage.text}
                        </p>
                      )}
                    </div>
                  )}

                  <ImageUploadInput 
                    label="صورة أفياتار المصدر / اللوجو (Resource Icon / Avatar)" 
                    value={resourceForm.avatarUrl || ''} 
                    onChange={val => setResourceForm((s: any) => ({ ...s, avatarUrl: val }))} 
                    type="avatar" 
                  />

                  <ImageUploadInput 
                    label="صورة الغلاف والبانر (Resource Banner Image)" 
                    value={resourceForm.bannerUrl || ''} 
                    onChange={val => setResourceForm((s: any) => ({ ...s, bannerUrl: val }))} 
                    type="banner" 
                  />

                  <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200">
                      الوصف والملخص الشامل للباقة (Resource Package Overview)
                    </label>
                    <textarea
                      rows={4}
                      placeholder="اكتب ملخص شامل ومحتوى الباقة والمواضيع التي تنطوي عليها..."
                      value={resourceForm.description || ''}
                      onChange={e => setResourceForm((s: any) => ({ ...s, description: e.target.value }))}
                      className="w-full py-3 px-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-imamu-brown)] shadow-xs resize-none"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Action Footer */}
          <motion.div layout className="p-4 px-6 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-900/80 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-[1.04] active:scale-95 cursor-pointer"
            >
              إلغاء
            </button>

            <div className="flex items-center gap-2">
              {activeStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all duration-200 hover:scale-[1.04] active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>
              )}

              {activeStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-2.5 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-light)] text-white text-xs font-bold transition-all duration-200 hover:scale-[1.04] active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span>الخطوة التالية</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSubmitting || !canAdvance}
                  onClick={handleSaveSubmit}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 hover:scale-[1.04] active:scale-95 cursor-pointer flex items-center gap-2 ${
                    canAdvance 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white' 
                      : 'bg-emerald-600/40 text-white/50 cursor-not-allowed'
                  }`}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>{isSubmitting ? 'جاري الحفظ...' : (isEditing ? 'حفظ التعديلات' : 'إنشاء الباقة')}</span>
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
