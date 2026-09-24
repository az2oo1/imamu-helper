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
  Download,
  Users,
  Phone,
  User,
  Plus,
  Trash2,
  Settings,
  Edit3,
  Clock
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
    resourceKind?: 'course' | 'manual';
    subjectId?: number;
    title: string;
    type: string;
    major?: string;
    url?: string;
    driveLink?: string;
    boxLink?: string;
    whatsappLink?: string;
    freeResourcesUrl?: string;
    paidResourcesUrl?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    description?: string;
    sectionsEnabled?: boolean;
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
  const [activeStep, setActiveStep] = useState<number>(1);
  const [courseSearch, setCourseSearch] = useState('');
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingWaAvatar, setIsFetchingWaAvatar] = useState(false);
  const [waAvatarMessage, setWaAvatarMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [resourceKind, setResourceKind] = useState<'course' | 'manual'>(
    resourceForm.resourceKind || (resourceForm.subjectId ? 'course' : (resourceForm.id ? 'manual' : 'course'))
  );

  useEffect(() => {
    if (isOpen) {
      if (resourceForm.resourceKind) {
        setResourceKind(resourceForm.resourceKind);
      } else if (resourceForm.subjectId) {
        setResourceKind('course');
      } else if (resourceForm.id) {
        setResourceKind('manual');
      } else {
        setResourceKind('course');
      }
      setActiveStep(1);
    }
  }, [isOpen, resourceForm.id, resourceForm.subjectId, resourceForm.resourceKind]);

  // Section Links Management in Step 6 (Mirroring official DB sections)
  const [sections, setSections] = useState<any[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<number | null>(null);
  const [editWaLink, setEditWaLink] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isUpdatingLink, setIsUpdatingLink] = useState(false);

  const selectedCourse = subjects.find(s => 
    Boolean(resourceForm.subjectId) && String(s.id) === String(resourceForm.subjectId)
  );

  useEffect(() => {
    if (isOpen && resourceKind === 'course' && (resourceForm.subjectId || selectedCourse?.code)) {
      const target = resourceForm.subjectId || selectedCourse?.code;
      fetch(`/api/subjects/${encodeURIComponent(String(target))}/sections`)
        .then(res => res.ok ? res.json() : [])
        .then(data => { if (Array.isArray(data)) setSections(data); })
        .catch(() => {});
    } else if (resourceKind === 'manual') {
      setSections([]);
    }
  }, [isOpen, resourceKind, resourceForm.subjectId, selectedCourse]);

  const handleOpenEditSectionLink = (sec: any) => {
    setEditingSectionId(sec.id);
    setEditWaLink(sec.whatsappLink || '');
    setEditPhone(sec.phone || '');
  };

  const handleSaveSectionLink = async (secId: number) => {
    setIsUpdatingLink(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/sections/${secId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          whatsappLink: editWaLink.trim() || null,
          phone: editPhone.trim() || null,
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setSections(prev => prev.map(s => s.id === secId ? { ...s, whatsappLink: updated.whatsappLink, phone: updated.phone } : s));
        setEditingSectionId(null);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'فشل حفظ رابط الشعبة');
      }
    } catch (e) {
      console.error(e);
      alert('حدث خطأ أثناء حفظ الرابط');
    } finally {
      setIsUpdatingLink(false);
    }
  };

  const handleDeleteSectionLink = async (secId: number) => {
    if (!confirm('هل أنت متأكد من حذف رابط الواتساب ورقم التواصل لهذه الشعبة؟ (لن يتم حذف الشعبة نفسها من النظام)')) return;
    setIsUpdatingLink(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/sections/${secId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          whatsappLink: null,
          phone: null,
        })
      });
      if (res.ok) {
        setSections(prev => prev.map(s => s.id === secId ? { ...s, whatsappLink: null, phone: null } : s));
      } else {
        alert('فشل حذف الرابط');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdatingLink(false);
    }
  };

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

  const filteredSubjects = subjects.filter(s => 
    !courseSearch || 
    s.code?.toLowerCase().includes(courseSearch.toLowerCase()) || 
    s.name?.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const canAdvance = resourceKind === 'course'
    ? Boolean(resourceForm.subjectId || selectedCourse)
    : Boolean(resourceForm.title?.trim());

  const courseSteps = [
    { id: 1, title: 'المادة والعنوان', icon: BookOpen },
    { id: 2, title: 'المجلدات والواتساب', icon: FolderGit2 },
    { id: 3, title: 'المصادر المجانية والمدفوعة', icon: Sparkles },
    { id: 4, title: 'الوسائط والوصف', icon: FileText },
    { id: 5, title: 'إعدادات وخيارات', icon: Settings },
    { id: 6, title: 'الشعب', icon: Users }
  ];

  const manualSteps = [
    { id: 1, title: 'العنوان والتصنيف', icon: Users },
    { id: 2, title: 'روابط التواصل والمجلدات', icon: FolderGit2 },
    { id: 3, title: 'مصادر إضافية', icon: Sparkles },
    { id: 4, title: 'الصورة والوصف', icon: FileText },
    { id: 5, title: 'خيارات الحفظ', icon: Settings }
  ];

  const steps = resourceKind === 'manual' ? manualSteps : courseSteps;
  const totalSteps = steps.length;

  const handleNext = () => {
    if (activeStep === 1 && !canAdvance) {
      if (resourceKind === 'course') {
        alert('الرجاء اختيار المادة الأكاديمية المستهدفة للمقرر');
      } else {
        alert('الرجاء إدخال عنوان المصدر أو القروب المستقل');
      }
      return;
    }
    if (activeStep < totalSteps) {
      setActiveStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 1) {
      setActiveStep((s) => s - 1);
    }
  };

  const handleSaveSubmit = async () => {
    if (!canAdvance) {
      alert(resourceKind === 'course' ? 'الرجاء اختيار المادة الأكاديمية' : 'الرجاء إدخال عنوان المصدر');
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

  // Calculate track fill width for completed steps
  const lineProgressWidth = ((activeStep - 1) / (totalSteps - 1)) * 100;

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
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ 
            type: "spring", 
            stiffness: 380, 
            damping: 32,
            layout: { type: "spring", stiffness: 350, damping: 28 } 
          }}
          className="relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col z-10 text-slate-900 dark:text-white max-h-[88vh]"
        >
          {/* Header */}
          <div className="p-6 bg-slate-50/80 dark:bg-zinc-900/90 border-b border-slate-200/80 dark:border-zinc-800 relative shrink-0">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-950/60 border border-slate-200/80 dark:border-zinc-700/80 text-white shadow-xs">
                  <Folder className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                    {isEditing ? `تعديل المصدر: ${cleanCourseName(resourceForm.title || selectedCourse?.name)}` : 'إضافة باقة مصادر جديدة'}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-medium">
                    {resourceKind === 'course' ? 'إضافة وتنسيق باقة مصادر لمقرر دراسي معتمد' : 'إضافة وإدارة مجموعة أو مصدر يدوي مستقل'}
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

            {/* Horizontal Progress Stepper */}
            <div className="relative pt-1 px-4">
              {/* Background Track Line */}
              <div className={`absolute top-4 ${resourceKind === 'manual' ? 'right-[10%] left-[10%]' : 'right-[8.33%] left-[8.33%]'} h-0.5 bg-slate-200 dark:bg-zinc-800 -z-0 overflow-hidden`}>
                {/* Animated Completed Track Line */}
                <motion.div
                  className="h-full bg-emerald-500 rounded-full origin-right"
                  initial={false}
                  animate={{ width: `${lineProgressWidth}%` }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>

              {/* Step Circle Nodes Grid */}
              <div className={`relative z-10 grid ${resourceKind === 'manual' ? 'grid-cols-5' : 'grid-cols-6'} w-full`}>
                {steps.map((step) => {
                  const isCompleted = activeStep > step.id;
                  const isActive = activeStep === step.id;

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        if (step.id === 1 || canAdvance) setActiveStep(step.id);
                      }}
                      className="flex flex-col items-center gap-1.5 cursor-pointer group text-center w-full"
                    >
                      {/* Circle Node */}
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
              {/* STEP 1: Two Distinct Choices - Course Resource VS Standalone Manual Thing */}
              {activeStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Two Choices Switcher */}
                  <div className="bg-slate-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-slate-200/80 dark:border-zinc-700/80">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setResourceKind('course');
                          setResourceForm((s: any) => ({ ...s, resourceKind: 'course' }));
                        }}
                        className={`flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                          resourceKind === 'course'
                            ? 'bg-white dark:bg-zinc-900 text-[var(--color-imamu-accent)] shadow-xs border border-slate-200/80 dark:border-zinc-700'
                            : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>مقرر دراسي معتمد</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setResourceKind('manual');
                          setResourceForm((s: any) => ({ 
                            ...s, 
                            resourceKind: 'manual', 
                            subjectId: undefined,
                            sectionsEnabled: false
                          }));
                          setCourseSearch('');
                          if (activeStep > 5) setActiveStep(5);
                        }}
                        className={`flex items-center justify-center gap-2 py-3 px-3 sm:px-4 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                          resourceKind === 'manual'
                            ? 'bg-white dark:bg-zinc-900 text-[var(--color-imamu-accent)] shadow-xs border border-slate-200/80 dark:border-zinc-700'
                            : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Users className="w-4 h-4" />
                        <span>مصدر / قروب يدوي مستقل</span>
                      </button>
                    </div>
                  </div>

                  {resourceKind === 'course' ? (
                    /* 📚 1. OFFICIAL COURSE RESOURCE FLOW */
                    <>
                      <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 space-y-4">
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200">
                          المادة الأكاديمية المستهدفة (اختر من قائمة المواد المعتمدة) *
                        </label>

                        {selectedCourse ? (
                          <div className="flex items-center justify-between p-3.5 bg-stone-50/70 dark:bg-stone-950/40 border border-slate-200/80 dark:border-zinc-700/80 rounded-2xl">
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
                                className="w-full py-3 pr-10 pl-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-imamu-accent)]/40 focus:border-[var(--color-imamu-accent)] shadow-xs"
                              />
                              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
                            </div>

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
                                        <span className="text-xs font-mono font-bold px-2 py-0.5 bg-stone-50 dark:bg-stone-950/60 text-[var(--color-imamu-accent)] border border-slate-200/80 dark:border-zinc-700/80 rounded-md" dir="ltr">
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

                      <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 space-y-4">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200">
                            عنوان باقة المقرر (تلقائي من المقرر أو مخصص)
                          </label>
                          <input
                            type="text"
                            placeholder="مثال: باقة مصادر أساسيات الحوسبة..."
                            value={resourceForm.title || ''}
                            onChange={e => setResourceForm((s: any) => ({ ...s, title: e.target.value }))}
                            className="w-full py-3 px-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-imamu-accent)]/40 focus:border-[var(--color-imamu-accent)] shadow-xs"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200">
                            الوصف والتفاصيل (اختياري)
                          </label>
                          <textarea
                            rows={3}
                            placeholder="اكتب وصفاً ثرياً ومختصراً يوضح محتويات وأهداف هذه المادة الأكاديمية..."
                            value={resourceForm.description || ''}
                            onChange={e => setResourceForm((s: any) => ({ ...s, description: e.target.value }))}
                            className="w-full py-3 px-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-imamu-accent)]/40 focus:border-[var(--color-imamu-accent)] shadow-xs resize-none"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    /* 👥 2. STANDALONE MANUAL RESOURCE FLOW (COMPLETELY ISOLATED FROM COURSES) */
                    <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 space-y-4">
                      <div className="p-3 bg-[var(--color-imamu-brown)]/10 dark:bg-[var(--color-imamu-brown)]/20 border border-[var(--color-imamu-brown)]/30 rounded-xl text-xs text-[var(--color-imamu-accent)] font-medium">
                        💡 هذا المسار مخصص للمصادر المستقلة (مثل قروبات الدفعات، قنوات التيليجرام العامة، والمجتمعات الطلابية)، وهو مفصول تماماً عن قائمة المقررات الدراسية.
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200">
                          عنوان المصدر أو القروب المستقل *
                        </label>
                        <input
                          type="text"
                          placeholder="مثال: قروب علوم الحاسب دفعة 48 / قناة التوجيه الأكاديمي..."
                          value={resourceForm.title || ''}
                          onChange={e => setResourceForm((s: any) => ({ ...s, title: e.target.value }))}
                          className="w-full py-3 px-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-imamu-accent)]/40 focus:border-[var(--color-imamu-accent)] shadow-xs"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200">
                            تصنيف ونوع المصدر
                          </label>
                          <select
                            value={resourceForm.type || 'group'}
                            onChange={e => setResourceForm((s: any) => ({ ...s, type: e.target.value }))}
                            className="w-full py-2.5 px-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                          >
                            <option value="group">مجموعة طلابية / قروب دفعة (Group)</option>
                            <option value="whatsapp">مجموعة واتساب (WhatsApp Group)</option>
                            <option value="telegram">قناة تيليجرام (Telegram Channel)</option>
                            <option value="drive">مجلد درايف عام (Drive Storage)</option>
                            <option value="summary">ملخصات ومذكرات (Summary)</option>
                            <option value="other">منصة / رابط مفيد (General Link)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200">
                            التخصص المستهدف أو الفئة
                          </label>
                          <input
                            type="text"
                            placeholder="مثال: علوم الحاسب / عام لجميع الطلاب"
                            value={resourceForm.major || ''}
                            onChange={e => setResourceForm((s: any) => ({ ...s, major: e.target.value }))}
                            className="w-full py-2.5 px-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200">
                          الوصف والتفاصيل (اختياري)
                        </label>
                        <textarea
                          rows={3}
                          placeholder="اكتب وصفاً ثرياً يوضح أهداف المجموعة أو الفئة المستهدفة..."
                          value={resourceForm.description || ''}
                          onChange={e => setResourceForm((s: any) => ({ ...s, description: e.target.value }))}
                          className="w-full py-3 px-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-imamu-accent)]/40 focus:border-[var(--color-imamu-accent)] shadow-xs resize-none"
                        />
                      </div>
                    </div>
                  )}
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
                      className="w-full py-3 px-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--color-imamu-accent)]/40 focus:border-[var(--color-imamu-accent)] shadow-xs resize-none"
                    />
                  </div>
                </motion.div>
              )}

              {/* STEP 5: Advanced Options & Save Confirmation */}
              {activeStep === 5 && (
                <motion.div
                  key="step5"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 space-y-4">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                      <span>{resourceKind === 'course' ? 'إعدادات وخيارات المقرر الأكاديمي' : 'خيارات وتأكيد حفظ المصدر المستقل'}</span>
                    </h4>
                    
                    {resourceKind === 'course' ? (
                      <>
                        {/* Toggle Sections Feature */}
                        <div className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl">
                          <div>
                            <h5 className="text-xs font-bold text-slate-900 dark:text-white">تفعيل قسم الشعب للمقرر ({sections.length} شعب)</h5>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400">السماح للطلاب بعرض وإضافة الشعب وروابط الواتساب للمادة</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer shrink-0">
                            <input
                              type="checkbox"
                              checked={resourceForm.sectionsEnabled !== false}
                              onChange={e => setResourceForm((s: any) => ({ ...s, sectionsEnabled: e.target.checked }))}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                          </label>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200">نوع الباقة الأساسي</label>
                          <select
                            value={resourceForm.type || 'course_hub'}
                            onChange={e => setResourceForm((s: any) => ({ ...s, type: e.target.value }))}
                            className="w-full py-2.5 px-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                          >
                            <option value="course_hub">باقة مصادر شاملة (Course Hub)</option>
                            <option value="drive">تخزين درايف (Drive Storage)</option>
                            <option value="box">تخزين بوكس (Box Link)</option>
                            <option value="whatsapp">مجموعة واتساب (WhatsApp Group)</option>
                            <option value="summary">ملخصات ومذكرات (Summary)</option>
                          </select>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-1">
                          <h5 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            جاهز لحفظ المصدر اليدوي المستقل
                          </h5>
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                            سيتم نشر هذا المصدر أو القروب بشكل مستقل بشارة "مجموعة طلابية" مع حفظ كامل الروابط دون أي ربط بالمقررات الأكاديمية.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-200">نوع المصدر المستقل</label>
                          <select
                            value={resourceForm.type || 'group'}
                            onChange={e => setResourceForm((s: any) => ({ ...s, type: e.target.value }))}
                            className="w-full py-2.5 px-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none"
                          >
                            <option value="group">مجموعة طلابية / قروب دفعة (Group)</option>
                            <option value="whatsapp">مجموعة واتساب (WhatsApp Group)</option>
                            <option value="telegram">قناة تيليجرام (Telegram Channel)</option>
                            <option value="drive">مجلد درايف عام (Drive Storage)</option>
                            <option value="summary">ملخصات ومذكرات (Summary)</option>
                            <option value="other">منصة / رابط عام (General Link)</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}

              {/* STEP 6: Course Sections (الشعب) */}
              {activeStep === 6 && (
                <motion.div
                  key="step6"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="bg-slate-50 dark:bg-zinc-800/50 rounded-2xl p-5 border border-slate-200/80 dark:border-zinc-800 space-y-4">
                    {/* Toggle Header for Step 6 */}
                    <div className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 rounded-2xl">
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                          <span>تفعيل وتخصيص شعب المادة ({sections.length})</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">يمكنك تعطيل أو تفعيل تبويب الشعب لهذه الباقة في أي وقت</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={resourceForm.sectionsEnabled !== false}
                          onChange={e => setResourceForm((s: any) => ({ ...s, sectionsEnabled: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    {resourceForm.sectionsEnabled === false ? (
                      <div className="p-5 bg-amber-50/70 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/50 text-center text-xs font-bold text-amber-700 dark:text-amber-400">
                        تنبيه: قسم الشعب معطّل حالياً لهذه الباقة. قم بتفعيل المفتاح اعلاه لتمكين الطلاب من استعراض الشعب والروابط.
                      </div>
                    ) : (
                      <>
                        {/* Informative Header */}
                        <div className="p-3.5 sm:p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed flex items-start gap-2.5">
                          <Users className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">الشعب الرسمية المعتمدة لهذا المقرر:</p>
                            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                              هذه الشعب مستخرجة مباشرة من نظام الجامعة وتطابق قاعدة البيانات. يمكنك إضافة أو تعديل أو حذف روابط مجموعات الواتساب وأرقام التواصل المخصصة لكل شعبة.
                            </p>
                          </div>
                        </div>

                        {/* Section Cards List */}
                        {sections.length === 0 ? (
                          <p className="text-xs text-slate-400 dark:text-zinc-500 italic bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 text-center">
                            لا توجد شعب مسجلة رسمياً لهذا المقرر في قاعدة البيانات حالياً.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-2.5">
                            {sections.map((sec, idx) => {
                              const isEditing = editingSectionId === sec.id;
                              const sectionTitle = sec.sectionNumber 
                                ? `شعبة ${sec.sectionNumber}` 
                                : (sec.sectionName || (sec.crn ? `شعبة ${sec.crn}` : 'شعبة دراسية'));
                              const hasLinks = Boolean(sec.whatsappLink || sec.phone);

                              return (
                                <div
                                  key={sec.id || idx}
                                  className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 transition-all space-y-3"
                                >
                                  {/* Header with section badges & actions */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="px-2.5 py-1 bg-[var(--color-imamu-brown)] text-white text-xs font-bold rounded-xl shadow-xs">
                                        {sectionTitle}
                                      </span>
                                      {sec.crn && (
                                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-200/60 dark:border-zinc-700/60" title="الرقم المرجعي للشعبة">
                                          CRN: {sec.crn}
                                        </span>
                                      )}
                                      {sec.campus && (
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                                          {sec.campus}
                                        </span>
                                      )}
                                    </div>

                                    {/* Action Buttons */}
                                    {!isEditing && (
                                      <div className="flex items-center gap-2 shrink-0">
                                        {sec.whatsappLink && (
                                          <a
                                            href={sec.whatsappLink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer shadow-xs"
                                          >
                                            <WhatsappIcon className="w-3.5 h-3.5 fill-current" />
                                            <span>واتساب</span>
                                          </a>
                                        )}
                                        {hasLinks ? (
                                          <div className="flex items-center gap-1">
                                            <button
                                              type="button"
                                              onClick={() => handleOpenEditSectionLink(sec)}
                                              className="px-2.5 py-1.5 rounded-xl text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 text-xs font-bold transition cursor-pointer flex items-center gap-1 border border-slate-200 dark:border-zinc-700"
                                              title="تعديل رابط الواتساب ورقم التواصل"
                                            >
                                              <Edit3 className="w-3.5 h-3.5" />
                                              <span className="hidden sm:inline">تعديل</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteSectionLink(sec.id)}
                                              disabled={isUpdatingLink}
                                              className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                                              title="حذف رابط الواتساب ورقم التواصل لهذه الشعبة"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEditSectionLink(sec)}
                                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-stone-100 dark:bg-stone-900 text-[var(--color-imamu-accent)] hover:bg-stone-200 dark:hover:bg-stone-800 text-xs font-bold transition cursor-pointer border border-stone-200/80 dark:border-zinc-700"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>إضافة قروب واتساب</span>
                                          </button>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Details: Instructor & Schedule */}
                                  {(sec.primaryInstructor || sec.scheduleSummary || sec.phone) && (
                                    <div className="text-xs text-slate-600 dark:text-zinc-400 space-y-1 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
                                      {sec.primaryInstructor && (
                                        <p className="flex items-center gap-1.5 font-medium">
                                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span>أستاذ المادة: <strong className="text-slate-800 dark:text-zinc-200">{sec.primaryInstructor}</strong></span>
                                        </p>
                                      )}
                                      {sec.scheduleSummary && (
                                        <p className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
                                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span>{sec.scheduleSummary}</span>
                                        </p>
                                      )}
                                      {sec.phone && (
                                        <p className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-zinc-300">
                                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                          <span>رقم التواصل: <span className="font-mono font-bold" dir="ltr">{sec.phone}</span></span>
                                        </p>
                                      )}
                                    </div>
                                  )}

                                  {/* Inline Edit Form for this section */}
                                  {isEditing && (
                                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 space-y-3 pt-3">
                                      <h6 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                        <WhatsappIcon className="w-3.5 h-3.5 fill-emerald-600" />
                                        <span>إضافة / تعديل رابط الواتساب لـ ({sectionTitle})</span>
                                      </h6>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div>
                                          <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">رابط مجموعة الواتساب</label>
                                          <input
                                            type="text"
                                            placeholder="https://chat.whatsapp.com/..."
                                            value={editWaLink}
                                            onChange={e => setEditWaLink(e.target.value)}
                                            className="w-full py-2 px-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                            dir="ltr"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">رقم الهاتف / منسق الشعبة (اختياري)</label>
                                          <input
                                            type="text"
                                            placeholder="050xxxxxxx"
                                            value={editPhone}
                                            onChange={e => setEditPhone(e.target.value)}
                                            className="w-full py-2 px-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                            dir="ltr"
                                          />
                                        </div>
                                      </div>
                                      <div className="flex items-center justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => setEditingSectionId(null)}
                                          className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                                        >
                                          إلغاء
                                        </button>
                                        <button
                                          type="button"
                                          disabled={isUpdatingLink}
                                          onClick={() => handleSaveSectionLink(sec.id)}
                                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                                        >
                                          {isUpdatingLink ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                          <span>حفظ الرابط</span>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    )}
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

              {activeStep < totalSteps ? (
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
                  <span>{isSubmitting ? 'جاري الحفظ...' : (isEditing ? 'حفظ التعديلات' : (resourceKind === 'manual' ? 'إنشاء المصدر المستقل' : 'إنشاء باقة المقرر'))}</span>
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
