'use client';

import React from 'react';
import { Calendar, Sparkles, X } from 'lucide-react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventForm: {
    id?: number;
    title: string;
    date: string;
    description: string;
    isHoliday?: boolean;
    isHolidayEnd?: boolean;
    isSemesterStart?: boolean;
    isSemesterEnd?: boolean;
    isEid?: boolean;
    isNationalDay?: boolean;
  };
  setEventForm: React.Dispatch<React.SetStateAction<any>>;
  onSave: () => void;
}


export default function CreateEventModal({
  isOpen,
  onClose,
  eventForm,
  setEventForm,
  onSave
}: CreateEventModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
      <div 
        className="w-full max-w-lg rounded-3xl p-6 sm:p-7 border shadow-2xl space-y-5 relative overflow-hidden"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        dir="rtl"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Calendar className="w-5 h-5 text-blue-500" />
            <span>{eventForm.id ? 'تعديل موعد أكاديمي' : 'إضافة موعد أكاديمي جديد'}</span>
          </h3>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5 text-right">
            <label className="text-xs font-bold text-slate-600 dark:text-zinc-300">عنوان المناسبة / الموعد *</label>
            <input 
              type="text" 
              placeholder="مثال: بداية إجازة الخريف، بداية الدراسة..." 
              value={eventForm.title} 
              onChange={e => setEventForm(s => ({ ...s, title: e.target.value }))} 
              className="py-2.5 px-3.5 rounded-xl text-sm border font-medium w-full" 
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
            />
          </div>

          <div className="flex flex-col gap-1.5 text-right">
            <label className="text-xs font-bold text-slate-600 dark:text-zinc-300">تاريخ الموعد *</label>
            <input 
              type="date" 
              value={eventForm.date} 
              onChange={e => setEventForm(s => ({ ...s, date: e.target.value }))} 
              className="py-2.5 px-3.5 rounded-xl text-sm border font-medium w-full" 
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
            />
          </div>

          <div className="flex flex-col gap-1.5 text-right">
            <label className="text-xs font-bold text-slate-600 dark:text-zinc-300">الوصف أو التفاصيل (اختياري)</label>
            <textarea 
              placeholder="تفاصيل الموعد الأكاديمي..." 
              value={eventForm.description || ''} 
              onChange={e => setEventForm(s => ({ ...s, description: e.target.value }))} 
              className="py-2.5 px-3.5 rounded-xl min-h-[80px] text-sm border font-medium w-full" 
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
            />
          </div>

          {/* Special Category Toggle Buttons */}
          <div className="flex flex-col gap-2 pt-2 border-t text-right" style={{ borderColor: 'var(--border-color)' }}>
            <label className="text-xs font-bold text-slate-600 dark:text-zinc-300 mb-1">تصنيف الموعد الخاص والاحتفالات:</label>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Holiday Start Toggle */}
              <button
                type="button"
                onClick={() => setEventForm((s: any) => ({ ...s, isHoliday: !s.isHoliday }))}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  eventForm.isHoliday 
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-xs ring-2 ring-emerald-500/20' 
                    : 'bg-slate-100/80 dark:bg-zinc-800/80 text-slate-500 border-slate-200 dark:border-zinc-700'
                }`}
              >
                <Sparkles className={`w-4 h-4 ${eventForm.isHoliday ? 'text-emerald-500' : ''}`} />
                <span>بداية إجازة</span>
              </button>

              {/* Holiday End Toggle */}
              <button
                type="button"
                onClick={() => setEventForm((s: any) => ({ ...s, isHolidayEnd: !s.isHolidayEnd }))}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  eventForm.isHolidayEnd 
                    ? 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/40 shadow-xs ring-2 ring-teal-500/20' 
                    : 'bg-slate-100/80 dark:bg-zinc-800/80 text-slate-500 border-slate-200 dark:border-zinc-700'
                }`}
              >
                <Sparkles className={`w-4 h-4 ${eventForm.isHolidayEnd ? 'text-teal-500' : ''}`} />
                <span>نهاية إجازة</span>
              </button>

              {/* Start of Semester Toggle */}
              <button
                type="button"
                onClick={() => setEventForm((s: any) => ({ ...s, isSemesterStart: !s.isSemesterStart }))}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  eventForm.isSemesterStart 
                    ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40 shadow-xs ring-2 ring-blue-500/20' 
                    : 'bg-slate-100/80 dark:bg-zinc-800/80 text-slate-500 border-slate-200 dark:border-zinc-700'
                }`}
              >
                <Calendar className={`w-4 h-4 ${eventForm.isSemesterStart ? 'text-blue-500' : ''}`} />
                <span>بداية الفصل</span>
              </button>

              {/* End of Semester Toggle */}
              <button
                type="button"
                onClick={() => setEventForm((s: any) => ({ ...s, isSemesterEnd: !s.isSemesterEnd }))}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  eventForm.isSemesterEnd 
                    ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/40 shadow-xs ring-2 ring-purple-500/20' 
                    : 'bg-slate-100/80 dark:bg-zinc-800/80 text-slate-500 border-slate-200 dark:border-zinc-700'
                }`}
              >
                <Calendar className={`w-4 h-4 ${eventForm.isSemesterEnd ? 'text-purple-500' : ''}`} />
                <span>نهاية الفصل</span>
              </button>

              {/* Eid Celebration Toggle */}
              <button
                type="button"
                onClick={() => setEventForm((s: any) => ({ ...s, isEid: !s.isEid }))}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  eventForm.isEid 
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs ring-2 ring-amber-500/20' 
                    : 'bg-slate-100/80 dark:bg-zinc-800/80 text-slate-500 border-slate-200 dark:border-zinc-700'
                }`}
              >
                <span>🌙</span>
                <span>احتفال العيد</span>
              </button>

              {/* National Day Toggle */}
              <button
                type="button"
                onClick={() => setEventForm((s: any) => ({ ...s, isNationalDay: !s.isNationalDay }))}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                  eventForm.isNationalDay 
                    ? 'bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 border-emerald-600/50 shadow-xs ring-2 ring-emerald-600/30' 
                    : 'bg-slate-100/80 dark:bg-zinc-800/80 text-slate-500 border-slate-200 dark:border-zinc-700'
                }`}
              >
                <span>🇸🇦</span>
                <span>اليوم الوطني</span>
              </button>
            </div>
          </div>

        </div>

        {/* Modal Action Buttons */}
        <div className="flex items-center gap-3 pt-3">
          <button
            type="button"
            disabled={!eventForm.title || !eventForm.date}
            onClick={() => {
              onSave();
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition cursor-pointer disabled:opacity-50"
          >
            {eventForm.id ? 'حفظ التعديلات' : 'إضافة الموعد'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="py-3 px-5 rounded-xl border font-bold text-sm text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            style={{ borderColor: 'var(--border-color)' }}
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
