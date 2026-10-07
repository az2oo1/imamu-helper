'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Check,
  Calendar,
  Sparkles,
  MapPin,
  Link2,
  AlignLeft
} from 'lucide-react';
import { Button } from './ui/Button';
import { CompactDateTimePicker } from './CompactDateTimePicker';

export interface EventFormData {
  id?: number;
  title: string;
  date: string;
  endDate?: string;
  time?: string;
  endTime?: string;
  location?: string;
  link?: string;
  description?: string;
  isHoliday?: boolean;
  isHolidayEnd?: boolean;
  isSemester?: boolean;
  isSemesterStart?: boolean;
  isSemesterEnd?: boolean;
  isEid?: boolean;
  isNationalDay?: boolean;
}

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventForm: EventFormData;
  setEventForm: React.Dispatch<React.SetStateAction<any>>;
  onSave: (data?: EventFormData) => void;
}

export default function CreateEventModal({
  isOpen,
  onClose,
  eventForm,
  setEventForm,
  onSave
}: CreateEventModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [link, setLink] = useState('');
  const [activeAccordion, setActiveAccordion] = useState<'none' | 'datetime'>('none');
  const [dueDate, setDueDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [dueTime, setDueTime] = useState<string>('');
  const [endTime, setEndTime] = useState<string>('');
  const [isHoliday, setIsHoliday] = useState<boolean>(false);
  const [isSemester, setIsSemester] = useState<boolean>(false);
  const [isEid, setIsEid] = useState<boolean>(false);
  const [isNationalDay, setIsNationalDay] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setActiveAccordion('none');
      setTitle(eventForm.title || '');
      setDescription(eventForm.description || '');
      setLocation(eventForm.location || '');
      setLink(eventForm.link || '');
      setDueDate(eventForm.date || '');
      setEndDate(eventForm.endDate || eventForm.date || '');
      setDueTime(eventForm.time || '');
      setEndTime(eventForm.endTime || eventForm.time || '');
      setIsHoliday(!!(eventForm.isHoliday || eventForm.isHolidayEnd));
      setIsSemester(!!(eventForm.isSemester || eventForm.isSemesterStart || eventForm.isSemesterEnd));
      setIsEid(!!eventForm.isEid);
      setIsNationalDay(!!eventForm.isNationalDay);
    }
  }, [isOpen, eventForm]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueDate) return;

    const dataToSave: EventFormData = {
      id: eventForm.id,
      title: title.trim(),
      date: dueDate,
      endDate: endDate && endDate !== dueDate ? endDate : undefined,
      time: dueTime || undefined,
      endTime: (endTime && endTime !== dueTime ? endTime : undefined) || undefined,
      location: location.trim() || undefined,
      link: link.trim() || undefined,
      description: description.trim() || '',
      isHoliday: !!isHoliday,
      isHolidayEnd: false,
      isSemester: !!isSemester,
      isSemesterStart: !!isSemester,
      isSemesterEnd: false,
      isEid: !!isEid,
      isNationalDay: !!isNationalDay,
    };

    setEventForm(dataToSave);
    onSave(dataToSave);
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-[var(--color-imamu-accent)] uppercase mb-0.5">
              التقويم الأكاديمي
            </p>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--color-imamu-accent)]" />
              <span>{eventForm.id ? 'تعديل موعد أكاديمي' : 'إضافة موعد أكاديمي جديد'}</span>
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
              عنوان الموعد الأكاديمي <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="مثال: إجازة الخريف، بداية الدراسة، رصد الدرجات..."
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none focus:ring-2 focus:ring-[var(--color-imamu-accent)]/30 focus:border-[var(--color-imamu-accent)] transition"
            />
          </div>

          {/* 2. Connected Details & Notes System: المعلومات (Location, Link, Description stacked under each other) */}
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
                  placeholder="الوصف أو أي تفاصيل وملاحظات إضافية للموعد الأكاديمي..."
                  className="w-full bg-transparent text-xs text-slate-900 dark:text-white outline-none placeholder-slate-400 dark:placeholder-zinc-500 font-medium resize-none custom-scrollbar"
                />
              </div>
            </div>
          </div>

          {/* 3. Compact Smart Date & Time Selector */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                التاريخ والوقت <span className="text-red-400">*</span>
              </label>
              {!dueDate && (
                <span className="text-[10px] text-amber-500 font-bold">يرجى تحديد التاريخ</span>
              )}
            </div>
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
          </div>

          {/* 4. Academic Special Properties & Celebrations */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                خصائص الموعد والاحتفالات
              </label>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500">اختياري</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {/* Holiday Toggle */}
              <button
                type="button"
                onClick={() => setIsHoliday(prev => !prev)}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isHoliday 
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-2xs ring-2 ring-emerald-500/20' 
                    : 'bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${isHoliday ? 'text-emerald-500' : ''}`} />
                <span>إجازة</span>
              </button>

              {/* Semester Toggle */}
              <button
                type="button"
                onClick={() => setIsSemester(prev => !prev)}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isSemester 
                    ? 'bg-[var(--color-imamu-brown)/15] text-[var(--color-imamu-accent)] border-amber-700/40 shadow-2xs ring-2 ring-[var(--color-imamu-brown)/20]' 
                    : 'bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <Calendar className={`w-3.5 h-3.5 ${isSemester ? 'text-[var(--color-imamu-accent)]' : ''}`} />
                <span>فصل دراسي</span>
              </button>

              {/* Eid Celebration Toggle */}
              <button
                type="button"
                onClick={() => setIsEid(prev => !prev)}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isEid 
                    ? 'bg-amber-500/15 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] border-amber-500/40 shadow-2xs ring-2 ring-amber-500/20' 
                    : 'bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <span>🌙</span>
                <span>احتفال العيد</span>
              </button>

              {/* National Day Toggle */}
              <button
                type="button"
                onClick={() => setIsNationalDay(prev => !prev)}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isNationalDay 
                    ? 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-emerald-600/50 shadow-2xs ring-2 ring-emerald-600/30' 
                    : 'bg-slate-50 dark:bg-zinc-900 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <span>🇸🇦</span>
                <span>اليوم الوطني</span>
              </button>
            </div>
          </div>

          {/* Submit Action Buttons */}
          <div className="pt-2 flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!title.trim() || !dueDate}
              leftIcon={<Check className="w-4 h-4" />}
              className="flex-1"
            >
              {eventForm.id ? 'حفظ التعديلات' : 'إضافة الموعد الأكاديمي'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
