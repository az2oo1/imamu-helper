'use client';

import React from 'react';
import { ChevronDown, X } from 'lucide-react';
import {
  formatTo12Hour,
  DAY_MAP_AR
} from '../lib/schedule-utils';

export interface ScheduleItem {
  id?: string;
  days: string[]; // e.g. ['Sun', 'Tue'] or ['الأحد', 'الثلاثاء']
  startTime: string; // e.g. '08:25 am'
  endTime: string; // e.g. '09:15 am'
  classroom: string; // e.g. '3027'
  teacher: string; // e.g. 'خالد مسعود اشرف علي'
}

const ALL_DAYS = [
  { key: 'Sun', en: 'Sun', ar: 'الأحد', shortAr: 'أحد' },
  { key: 'Mon', en: 'Mon', ar: 'الاثنين', shortAr: 'اثنين' },
  { key: 'Tue', en: 'Tue', ar: 'الثلاثاء', shortAr: 'ثلاثاء' },
  { key: 'Wed', en: 'Wed', ar: 'الأربعاء', shortAr: 'أربعاء' },
  { key: 'Thu', en: 'Thu', ar: 'الخميس', shortAr: 'خميس' },
  { key: 'Fri', en: 'Fri', ar: 'الجمعة', shortAr: 'جمعة' },
  { key: 'Sat', en: 'Sat', ar: 'السبت', shortAr: 'سبت' },
];

const BASE_TIME_OPTIONS = [
  '08:00 am', '08:25 am', '08:30 am', '09:00 am', '09:15 am', '09:20 am',
  '09:30 am', '10:00 am', '10:10 am', '10:15 am', '10:30 am', '11:05 am',
  '11:10 am', '11:30 am', '11:55 am', '12:00 pm', '12:30 pm', '01:00 pm',
  '01:20 pm', '01:25 pm', '01:30 pm', '02:00 pm', '02:15 pm', '02:20 pm',
  '02:30 pm', '03:00 pm', '03:10 pm', '03:30 pm', '03:40 pm', '04:00 pm',
  '04:30 pm', '04:35 pm', '05:00 pm', '05:25 pm', '05:30 pm', '06:00 pm',
  '06:20 pm', '07:00 pm'
];

interface TimingEditorProps {
  schedules: ScheduleItem[];
  onChange: (schedules: ScheduleItem[]) => void;
  className?: string;
}

function isDayActive(days: string[] = [], dayDef: typeof ALL_DAYS[0]): boolean {
  if (!Array.isArray(days)) return false;
  return days.some(d => {
    const raw = String(d).trim();
    return (
      raw === dayDef.key ||
      raw === dayDef.en ||
      raw === dayDef.ar ||
      raw === dayDef.shortAr ||
      DAY_MAP_AR[raw] === dayDef.ar
    );
  });
}

export function TimingEditor({ schedules, onChange, className = '' }: TimingEditorProps) {
  const items = schedules.length > 0 ? schedules : [{
    id: '1',
    days: ['الأحد', 'الثلاثاء'],
    startTime: '08:25 am',
    endTime: '09:15 am',
    classroom: '',
    teacher: ''
  }];

  const toggleDay = (idx: number, dayDef: typeof ALL_DAYS[0]) => {
    const next = [...items];
    const item = { ...next[idx] };
    const currentDays = Array.isArray(item.days) ? item.days : [];
    if (isDayActive(currentDays, dayDef)) {
      item.days = currentDays.filter(d => {
        const raw = String(d).trim();
        return (
          raw !== dayDef.key &&
          raw !== dayDef.en &&
          raw !== dayDef.ar &&
          raw !== dayDef.shortAr &&
          DAY_MAP_AR[raw] !== dayDef.ar
        );
      });
    } else {
      item.days = [...currentDays, dayDef.ar];
    }
    next[idx] = item;
    onChange(next);
  };

  const updateField = (idx: number, field: keyof ScheduleItem, val: any) => {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };

  const removeItem = (idx: number) => {
    if (items.length <= 1) {
      onChange([{
        id: String(Date.now()),
        days: ['الأحد'],
        startTime: '08:25 am',
        endTime: '09:15 am',
        classroom: '',
        teacher: ''
      }]);
      return;
    }
    const next = items.filter((_, i) => i !== idx);
    onChange(next);
  };

  const addItem = () => {
    onChange([
      ...items,
      {
        id: String(Date.now()),
        days: ['الأحد', 'الثلاثاء'],
        startTime: '08:25 am',
        endTime: '09:15 am',
        classroom: items[0]?.classroom || '',
        teacher: items[0]?.teacher || ''
      }
    ]);
  };

  return (
    <div className={`space-y-3 ${className}`} dir="rtl">
      {items.map((item, idx) => {
        const currentStart = item.startTime ? formatTo12Hour(item.startTime) : '08:25 am';
        const currentEnd = item.endTime ? formatTo12Hour(item.endTime) : '09:15 am';

        const startOptions = Array.from(new Set([
          currentStart,
          ...BASE_TIME_OPTIONS
        ]));

        const endOptions = Array.from(new Set([
          currentEnd,
          ...BASE_TIME_OPTIONS
        ]));

        return (
          <div
            key={item.id || idx}
            className="bg-[#18181b] border border-zinc-800/90 rounded-2xl p-4 shadow-md text-slate-200"
          >
            {/* Day Selector Pills */}
            <div className="flex items-center justify-between gap-1 pb-3 border-b border-zinc-800/80">
              {ALL_DAYS.map(dayDef => {
                const active = isDayActive(item.days, dayDef);
                return (
                  <button
                    key={dayDef.key}
                    type="button"
                    onClick={() => toggleDay(idx, dayDef)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      active
                        ? 'bg-[var(--color-imamu-brown)] text-white border border-[var(--color-imamu-accent)]/40 shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    {dayDef.ar}
                  </button>
                );
              })}
            </div>

            {/* Time row */}
            <div className="flex items-center justify-between py-3 border-b border-zinc-800/60" dir="ltr">
              <span className="text-zinc-400 text-xs font-medium">الوقت / Time</span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={currentStart}
                    onChange={e => updateField(idx, 'startTime', e.target.value)}
                    className="appearance-none bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white text-xs rounded-xl px-3 py-1.5 pr-7 font-medium outline-none cursor-pointer focus:border-[var(--color-imamu-accent)]"
                  >
                    {startOptions.map(t => (
                      <option key={t} value={t} className="bg-zinc-900 text-white">{t}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                <span className="text-zinc-500 text-xs">→</span>

                <div className="relative">
                  <select
                    value={currentEnd}
                    onChange={e => updateField(idx, 'endTime', e.target.value)}
                    className="appearance-none bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white text-xs rounded-xl px-3 py-1.5 pr-7 font-medium outline-none cursor-pointer focus:border-[var(--color-imamu-accent)]"
                  >
                    {endOptions.map(t => (
                      <option key={t} value={t} className="bg-zinc-900 text-white">{t}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Classroom row */}
            <div className="flex items-center justify-between py-3 border-b border-zinc-800/60">
              <span className="text-zinc-400 text-xs font-medium">القاعة الدراسية</span>
              <input
                type="text"
                value={item.classroom || ''}
                onChange={e => updateField(idx, 'classroom', e.target.value)}
                placeholder="2168"
                className="bg-transparent text-white text-xs text-right font-medium outline-none border-b border-transparent focus:border-zinc-700 px-2 py-0.5 max-w-[140px] placeholder-zinc-600"
              />
            </div>

            {/* Teacher row */}
            <div className="flex items-center justify-between py-3 border-b border-zinc-800/60">
              <span className="text-zinc-400 text-xs font-medium">اسم الأستاذ</span>
              <input
                type="text"
                value={item.teacher || ''}
                onChange={e => updateField(idx, 'teacher', e.target.value)}
                placeholder="د. أحمد..."
                className="bg-transparent text-white text-xs text-right font-medium outline-none border-b border-transparent focus:border-zinc-700 px-2 py-0.5 max-w-[180px] placeholder-zinc-600"
              />
            </div>

            {/* Remove item button */}
            {items.length > 1 && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="flex items-center gap-1 text-[11px] text-rose-400 hover:text-rose-300 font-medium cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  حذف هذا الموعد
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Add another meeting slot button */}
      <button
        type="button"
        onClick={addItem}
        className="w-full py-2.5 rounded-xl border border-dashed border-zinc-700 hover:border-[var(--color-imamu-accent)] text-zinc-400 hover:text-[var(--color-imamu-accent)] text-xs font-semibold transition cursor-pointer"
      >
        + إضافة موعد آخر لهذه الشعبة
      </button>
    </div>
  );
}
