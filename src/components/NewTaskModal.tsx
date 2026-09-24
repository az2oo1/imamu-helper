import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Calendar, Clock, ChevronDown, Tag, SlidersHorizontal } from 'lucide-react';
import {
  StudentTask,
  TaskPriority,
  TASK_CATEGORIES,
  TASK_PRIORITIES,
  getCourseColor
} from '../lib/task-utils';
import { CourseEntry } from './AddCourseModal';

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
  const [priority, setPriority] = useState<TaskPriority | undefined>(undefined);
  const [selectedCourseCode, setSelectedCourseCode] = useState<string>(initialCourseCode || '');
  const [category, setCategory] = useState<string>('');
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [dueDate, setDueDate] = useState<string>(initialDate || new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState<string>('12:30');

  // Reset or initialize on open
  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title || '');
        setPriority(taskToEdit.priority);
        setSelectedCourseCode(taskToEdit.courseCode || '');
        setCategory(taskToEdit.category || '');
        setIsOptionsOpen(Boolean(taskToEdit.category || taskToEdit.courseCode || taskToEdit.priority));
        setDueDate(taskToEdit.dueDate || new Date().toISOString().split('T')[0]);
        setDueTime(taskToEdit.dueTime || '12:30');
      } else {
        setTitle('');
        setPriority(undefined);
        setSelectedCourseCode(initialCourseCode || '');
        setCategory('');
        setIsOptionsOpen(Boolean(initialCourseCode));
        setDueDate(initialDate || new Date().toISOString().split('T')[0]);
        setDueTime('12:30');
      }
    }
  }, [isOpen, taskToEdit, initialCourseCode, initialDate]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const matchedCourse = courses.find(c => c.courseCode === selectedCourseCode);
    const catObj = TASK_CATEGORIES.find(c => c.key === category);
    const effectiveColor = selectedCourseCode ? getCourseColor(selectedCourseCode, courses) : '#8c6239';

    onSaveTask({
      title: title.trim(),
      priority: priority || undefined,
      category: category || undefined,
      categoryLabel: catObj ? catObj.label : (category || undefined),
      courseCode: selectedCourseCode || undefined,
      courseName: matchedCourse ? (matchedCourse.courseName || matchedCourse.courseCode) : undefined,
      dueDate: dueDate || undefined,
      dueTime: dueTime || undefined,
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
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-900 transition cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4.5">
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

          {/* 2. Date & Time Selection (Placed under Title as requested) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                  <span>تاريخ الاستحقاق</span>
                </label>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">اختياري</span>
              </div>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[var(--color-imamu-accent)]/30 focus:border-[var(--color-imamu-accent)] transition"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                  <span>الوقت</span>
                </label>
                <span className="text-[10px] text-slate-400 dark:text-zinc-500">اختياري</span>
              </div>
              <input
                type="time"
                value={dueTime}
                onChange={e => setDueTime(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-[var(--color-imamu-accent)]/30 focus:border-[var(--color-imamu-accent)] transition"
              />
            </div>
          </div>

          {/* 3. Categorization Options (المقرر، الأهمية، نوع المهمة - Collapsed under one button) */}
          <div className="space-y-2 pt-1">
            <button
              type="button"
              onClick={() => setIsOptionsOpen(prev => !prev)}
              className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700 transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                <span>خيارات التصنيف</span>
              </div>

              <div className="flex items-center gap-2">
                {(selectedCourseCode || priority || category) && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-imamu-accent)]">
                    {selectedCourseCode && <span>{selectedCourseCode}</span>}
                    {priority && <span>• {TASK_PRIORITIES.find(p => p.key === priority)?.badge}</span>}
                    {category && <span>• {TASK_CATEGORIES.find(c => c.key === category)?.label}</span>}
                  </span>
                )}
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                    isOptionsOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            <AnimatePresence>
              {isOptionsOpen && (
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
                  {courses.length > 0 && (
                    <div className="space-y-1.5 p-3 rounded-xl bg-slate-50/60 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                          المقرر
                        </label>
                        <span className="text-[10px] text-slate-400 dark:text-zinc-500">اختياري</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {courses.map(c => {
                          const isActive = selectedCourseCode === c.courseCode;
                          const cColor = getCourseColor(c.courseCode, courses);
                          return (
                            <button
                              key={c.courseCode}
                              type="button"
                              onClick={() => setSelectedCourseCode(prev => prev === c.courseCode ? '' : c.courseCode)}
                              className={`py-1 px-2.5 rounded-lg text-xs font-bold transition cursor-pointer border truncate max-w-[190px] ${
                                isActive
                                  ? 'text-white shadow-2xs'
                                  : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                              }`}
                              style={{
                                backgroundColor: isActive ? cColor : undefined,
                                borderColor: isActive ? cColor : undefined,
                              }}
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
            <button
              type="submit"
              disabled={!title.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{taskToEdit ? 'حفظ التعديلات' : 'حفظ المهمة في مهامي وتقويمي'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
