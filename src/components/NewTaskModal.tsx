import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  ChevronDown,
  SlidersHorizontal,
  MapPin,
  Link2,
  AlignLeft
} from 'lucide-react';
import {
  StudentTask,
  TaskPriority,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  getCourseColor
} from '../lib/task-utils';
import { CourseEntry } from './AddCourseModal';
import { Button } from './ui/Button';
import { CompactDateTimePicker } from './CompactDateTimePicker';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (taskData: Omit<StudentTask, 'id' | 'completed' | 'createdAt'>) => void;
  courses?: CourseEntry[];
  initialCourseCode?: string;
  initialDate?: string;
  taskToEdit?: StudentTask | null;
}

export function NewTaskModal({
  isOpen,
  onClose,
  onSaveTask,
  courses = [],
  initialCourseCode,
  initialDate,
  taskToEdit
}: NewTaskModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [link, setLink] = useState('');
  const [priority, setPriority] = useState<TaskPriority | undefined>(undefined);
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>(initialCourseCode || '');
  const [category, setCategory] = useState<string>('');

  // Accordion state: 'none' | 'datetime' | 'options'
  // Closed in all situations by default, opening one closes the other
  const [activeAccordion, setActiveAccordion] = useState<'none' | 'datetime' | 'options'>('none');

  // Dates and times: default to empty/not added unless editing or provided
  const [dueDate, setDueDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      // Tags accordion and datetime accordion must ALWAYS start closed in all situations
      setActiveAccordion('none');

      if (taskToEdit) {
        setTitle(taskToEdit.title || '');
        setDescription(taskToEdit.description || '');
        setLocation(taskToEdit.location || '');
        setLink(taskToEdit.link || '');
        setPriority(taskToEdit.priority);
        setSelectedCourseCode(taskToEdit.courseCode || '');
        setCategory(taskToEdit.category || '');
        setDueDate(taskToEdit.dueDate || '');
        setEndDate(taskToEdit.endDate || taskToEdit.dueDate || '');
        setDueTime(taskToEdit.dueTime || '');
        setEndTime(taskToEdit.endTime || taskToEdit.dueTime || '');
      } else {
        setTitle('');
        setDescription('');
        setLocation('');
        setLink('');
        setPriority(undefined);
        setSelectedCourseCode(initialCourseCode || '');
        setCategory('');
        // If initialDate is explicitly provided from calendar click, use it; otherwise empty
        setDueDate(initialDate || '');
        setEndDate(initialDate || '');
        setDueTime('');
        setEndTime('');
      }
    }
  }, [isOpen, taskToEdit, initialCourseCode, initialDate]);

  const availableCourses = React.useMemo(() => {
    const list = [...courses];
    if (taskToEdit?.courseCode && !list.some(c => c.courseCode === taskToEdit.courseCode)) {
      list.unshift({
        courseCode: taskToEdit.courseCode,
        courseName: taskToEdit.courseName || taskToEdit.courseCode,
        creditHours: 3,
        crn: '',
        color: taskToEdit.color
      });
    }
    return list;
  }, [courses, taskToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const matchedCourse = availableCourses.find(c => c.courseCode === selectedCourseCode);
    const catObj = TASK_CATEGORIES.find(c => c.key === category);
    const effectiveColor = selectedCourseCode ? getCourseColor(selectedCourseCode, availableCourses) : '#8c6239';

    onSaveTask({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      link: link.trim() || undefined,
      priority: priority || undefined,
      category: category || undefined,
      categoryLabel: catObj ? catObj.label : (category || undefined),
      courseCode: selectedCourseCode || undefined,
      courseName: matchedCourse ? (matchedCourse.courseName || matchedCourse.courseCode) : (taskToEdit?.courseCode === selectedCourseCode ? taskToEdit.courseName : undefined),
      dueDate: dueDate || undefined,
      endDate: (endDate && endDate !== dueDate ? endDate : undefined) || (dueDate || undefined),
      dueTime: dueTime || undefined,
      endTime: (endTime && endTime !== dueTime ? endTime : undefined) || undefined,
      color: effectiveColor,
    });

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center"
      dir="rtl"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Container */}
      <motion.div
        initial={{ opacity: 0, y: 48 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        onClick={e => e.stopPropagation()}
        className="relative w-full sm:max-w-lg bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header (Matching SemesterWizard theme) */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[var(--color-imamu-accent)] uppercase mb-0.5">
              المهام والتقويم
            </p>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              {taskToEdit ? 'تعديل المهمة' : 'إضافة مهمة جديدة'}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          {/* 1. Title Input */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">
              عنوان المهمة <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="مثال: تسليم المشروع النهائي، كويز برمجة..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:ring-2 focus:ring-[var(--color-imamu-accent)]/30 focus:border-[var(--color-imamu-accent)] transition"
            />
          </div>

          {/* 2. Connected Details & Notes System: المعلومات (Location, Link, Description stacked under each other, above Date & Time) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                المعلومات
              </label>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500">اختياري</span>
            </div>

            <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800/80 bg-slate-50 dark:bg-zinc-900 overflow-hidden focus-within:border-[var(--color-imamu-accent)]/50 focus-within:ring-2 focus-within:ring-[var(--color-imamu-accent)]/20 transition">
              {/* Field 1: Location */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="text"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="المكان أو القاعة (مثال: مبنى 324، قاعة 2B)..."
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder-slate-400 dark:placeholder-zinc-500 font-medium"
                />
                {location && (
                  <button
                    type="button"
                    onClick={() => setLocation('')}
                    className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition cursor-pointer"
                    title="مسح المكان"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Field 2: Link */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5">
                <Link2 className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="url"
                  value={link}
                  onChange={e => setLink(e.target.value)}
                  placeholder="الرابط (مثال: https://...)..."
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder-slate-400 dark:placeholder-zinc-500 font-medium dir-ltr text-right"
                />
                {link && (
                  <button
                    type="button"
                    onClick={() => setLink('')}
                    className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition cursor-pointer"
                    title="مسح الرابط"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Field 3: Description / Notes */}
              <div className="flex items-start gap-2.5 px-3.5 py-2.5">
                <AlignLeft className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="أضف أي تفاصيل أو ملاحظات تهمك لهذه المهمة..."
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder-slate-400 dark:placeholder-zinc-500 font-medium resize-none custom-scrollbar"
                />
              </div>
            </div>
          </div>

          {/* 3. Compact Smart Date & Time Selector (Placed below المعلومات) */}
          <CompactDateTimePicker
            isOpen={activeAccordion === 'datetime'}
            onToggle={() => {
              setActiveAccordion(prev => prev === 'datetime' ? 'none' : 'datetime');
            }}
            startDate={dueDate}
            endDate={endDate}
            startTime={dueTime}
            endTime={endTime}
            onChangeDate={(start, end) => {
              setDueDate(start || '');
              setEndDate(end || start || '');
            }}
            onChangeTime={(start, end) => {
              setDueTime(start || '');
              setEndTime(end || start || '');
            }}
          />

          {/* 4. Categorization Options (المقرر، الأهمية، نوع المهمة - Collapsed under one button) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setActiveAccordion(prev => prev === 'options' ? 'none' : 'options');
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                <span>خيارات التصنيف</span>
              </div>

              <div className="flex items-center gap-2">
                {(selectedCourseCode || priority || category) && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-imamu-accent)] truncate max-w-[210px]">
                    {selectedCourseCode && <span>{selectedCourseCode}</span>}
                    {priority && <span>• {TASK_PRIORITIES.find(p => p.key === priority)?.badge}</span>}
                    {category && <span>• {TASK_CATEGORIES.find(c => c.key === category)?.label}</span>}
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    activeAccordion === 'options' ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            <AnimatePresence>
              {activeAccordion === 'options' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden space-y-3 pt-1"
                >
                  {/* Priority Selection */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/60 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        الأهمية
                      </label>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500">اختياري</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {TASK_PRIORITIES.map(p => {
                        const isActive = priority === p.key;
                        return (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => setPriority(prev => prev === p.key ? undefined : p.key)}
                            className={`flex-1 py-1.5 px-2.5 rounded-xl text-xs font-bold transition cursor-pointer border text-center ${
                              isActive
                                ? `${p.bg} ${p.border} ${p.color} ring-1 ring-inset ${p.border} shadow-2xs`
                                : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            {p.badge}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Course Selection */}
                  {availableCourses.length > 0 && (
                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/60 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                          المقرر
                        </label>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">اختياري</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {availableCourses.map(c => {
                          const isActive = selectedCourseCode === c.courseCode;
                          const cColor = getCourseColor(c.courseCode, availableCourses);
                          return (
                            <button
                              key={c.courseCode}
                              type="button"
                              onClick={() => setSelectedCourseCode(prev => prev === c.courseCode ? '' : c.courseCode)}
                              className={`py-1 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer border truncate max-w-[190px] ${
                                isActive
                                  ? 'subject-tag shadow-2xs'
                                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                              }`}
                              style={isActive ? ({
                                '--subject-color': cColor,
                              } as React.CSSProperties) : undefined}
                              title={c.courseName || c.courseCode}
                            >
                              {c.courseName || c.courseCode}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Category Selection */}
                  <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/60 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                        نوع المهمة
                      </label>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500">اختياري</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {TASK_CATEGORIES.map(cat => {
                        const isActive = category === cat.key;
                        return (
                          <button
                            key={cat.key}
                            type="button"
                            onClick={() => {
                              setCategory(prev => (prev === cat.key ? '' : cat.key));
                            }}
                            className={`py-1 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                              isActive
                                ? 'bg-[color-mix(in_srgb,var(--color-imamu-accent)_15%,transparent)] border-[var(--color-imamu-accent)] text-[var(--color-imamu-accent)] shadow-2xs'
                                : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            {cat.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Submit Action Button */}
          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!title.trim()}
              leftIcon={<Check className="w-4 h-4" />}
              className="w-full"
            >
              {taskToEdit ? 'حفظ التعديلات' : 'حفظ المهمة في مهامي وتقويمي'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
