'use client';

import React from 'react';
import { X } from 'lucide-react';
import {
  formatTo12Hour,
  parseTimeToMinutes,
  DAY_MAP_AR
} from '../lib/schedule-utils';
import { CustomSelect, CustomSelectOption } from './ui/CustomSelect';

export interface ScheduleItem {
  id?: string;
  days: string[]; // e.g. ['Sun', 'Tue'] or ['الأحد', 'الثلاثاء']
  startTime: string; // e.g. '08:20 am'
  endTime: string; // e.g. '09:10 am'
  classroom: string; // e.g. '3027'
  teacher: string; // e.g. 'خالد مسعود اشرف علي'
}

const ALL_DAYS = [
  { key: 'Sun', en: 'Sun', ar: 'الأحد', shortAr: 'أحد' },
  { key: 'Mon', en: 'Mon', ar: 'الاثنين', shortAr: 'اثنين' },
  { key: 'Tue', en: 'Tue', ar: 'الثلاثاء', shortAr: 'ثلاثاء' },
  { key: 'Wed', en: 'Wed', ar: 'الأربعاء', shortAr: 'أربعاء' },
  { key: 'Thu', en: 'Thu', ar: 'الخميس', shortAr: 'خميس' },
];

function generate5MinuteOptions(): string[] {
  const options: string[] = [];
  // 07:00 am (420 mins) to 10:00 pm (1320 mins) in 5-minute intervals
  for (let mins = 7 * 60; mins <= 22 * 60; mins += 5) {
    const hours24 = Math.floor(mins / 60);
    const m = mins % 60;
    const period = hours24 >= 12 ? 'pm' : 'am';
    let hours12 = hours24 % 12;
    if (hours12 === 0) hours12 = 12;
    const formattedHour = String(hours12).padStart(2, '0');
    const formattedMin = String(m).padStart(2, '0');
    options.push(`${formattedHour}:${formattedMin} ${period}`);
  }
  return options;
}

const BASE_TIME_OPTIONS = generate5MinuteOptions();

interface TimingEditorProps {
  schedules: ScheduleItem[];
  onChange: (schedules: ScheduleItem[]) => void;
  availableTeachers?: string[];
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

export function TimingEditor({ schedules, onChange, availableTeachers = [], className = '' }: TimingEditorProps) {
  const items = schedules.length > 0 ? schedules : [{
    id: '1',
    days: ['الأحد', 'الثلاثاء'],
    startTime: '08:20 am',
    endTime: '09:10 am',
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
        startTime: '08:20 am',
        endTime: '09:10 am',
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
        startTime: '08:20 am',
        endTime: '09:10 am',
        classroom: items[0]?.classroom || '',
        teacher: items[0]?.teacher || ''
      }
    ]);
  };

  return (
    <div className={`space-y-3 ${className}`} dir="rtl">
      {items.map((item, idx) => {
        const currentStart = item.startTime ? formatTo12Hour(item.startTime) : '08:20 am';
        const currentEnd = item.endTime ? formatTo12Hour(item.endTime) : '09:10 am';

        const startOptions = Array.from(new Set([
          currentStart,
          ...BASE_TIME_OPTIONS
        ])).sort((a, b) => (parseTimeToMinutes(a) ?? 0) - (parseTimeToMinutes(b) ?? 0));

        const endOptions = Array.from(new Set([
          currentEnd,
          ...BASE_TIME_OPTIONS
        ])).sort((a, b) => (parseTimeToMinutes(a) ?? 0) - (parseTimeToMinutes(b) ?? 0));

        const startSelectOptions: CustomSelectOption[] = startOptions.map(t => ({ value: t, label: t }));
        const endSelectOptions: CustomSelectOption[] = endOptions.map(t => ({ value: t, label: t }));

        return (
          <div
            key={item.id || idx}
            className="bg-[#18181b] border border-zinc-800/90 rounded-2xl p-4 shadow-md text-slate-200"
          >
            {/* Day Selector Pills */}
            <div className="flex flex-wrap items-center justify-between gap-1 pb-3 border-b border-zinc-800/80">
              {ALL_DAYS.map(dayDef => {
                const active = isDayActive(item.days, dayDef);
                return (
                  <button
                    key={dayDef.key}
                    type="button"
                    onClick={() => toggleDay(idx, dayDef)}
                    className={`flex-1 sm:flex-initial min-w-[38px] px-1.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer text-center ${
                      active
                        ? 'bg-[var(--color-imamu-brown)] text-white border border-[var(--color-imamu-accent)]/40 shadow-xs'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
                    }`}
                  >
                    <span className="hidden sm:inline">{dayDef.ar}</span>
                    <span className="sm:hidden">{dayDef.shortAr}</span>
                  </button>
                );
              })}
            </div>

            {/* Time row */}
            <div className="flex items-center justify-between py-3 border-b border-zinc-800/60" dir="ltr">
              <span className="text-zinc-400 text-xs font-medium">الوقت / Time</span>
              <div className="flex items-center gap-2">
                <CustomSelect
                  value={currentStart}
                  onChange={val => updateField(idx, 'startTime', val)}
                  options={startSelectOptions}
                  dir="ltr"
                  className="w-[114px]"
                  buttonClassName="!py-1.5 !px-2.5 !text-xs !bg-zinc-900 !border-zinc-800 !text-white hover:!bg-zinc-800 hover:!border-zinc-700 font-medium rounded-xl"
                  menuClassName="!min-w-[114px] !bg-zinc-900 !border-zinc-800 !text-white"
                />

                <span className="text-zinc-500 text-xs shrink-0">→</span>

                <CustomSelect
                  value={currentEnd}
                  onChange={val => updateField(idx, 'endTime', val)}
                  options={endSelectOptions}
                  dir="ltr"
                  className="w-[114px]"
                  buttonClassName="!py-1.5 !px-2.5 !text-xs !bg-zinc-900 !border-zinc-800 !text-white hover:!bg-zinc-800 hover:!border-zinc-700 font-medium rounded-xl"
                  menuClassName="!min-w-[114px] !bg-zinc-900 !border-zinc-800 !text-white"
                />
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
              {availableTeachers && availableTeachers.length > 0 ? (
                <div className="flex items-center gap-1.5">
                  <select
                    value={
                      availableTeachers.includes(item.teacher || '')
                        ? item.teacher
                        : item.teacher
                        ? '__custom__'
                        : ''
                    }
                    onChange={e => {
                      const val = e.target.value;
                      if (val === '__custom__') {
                        updateField(idx, 'teacher', item.teacher || '');
                      } else {
                        updateField(idx, 'teacher', val);
                      }
                    }}
                    className="bg-zinc-900 border border-zinc-800 text-white text-xs text-right font-medium outline-none rounded-xl px-2.5 py-1.5 focus:border-[var(--color-imamu-accent)] cursor-pointer max-w-[180px]"
                  >
                    <option value="">-- اختر من الأساتذة أعلاه --</option>
                    {availableTeachers.map(tName => (
                      <option key={tName} value={tName}>
                        {tName}
                      </option>
                    ))}
                    <option value="__custom__">✏️ إدخال اسم آخر...</option>
                  </select>

                  {(!availableTeachers.includes(item.teacher || '') && item.teacher !== undefined) && (
                    <input
                      type="text"
                      value={item.teacher || ''}
                      onChange={e => updateField(idx, 'teacher', e.target.value)}
                      placeholder="اسم الأستاذ..."
                      className="bg-transparent text-white text-xs text-right font-medium outline-none border-b border-zinc-700 focus:border-[var(--color-imamu-accent)] px-2 py-0.5 max-w-[130px] placeholder-zinc-600"
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={item.teacher || ''}
                  onChange={e => updateField(idx, 'teacher', e.target.value)}
                  placeholder="د. أحمد..."
                  className="bg-transparent text-white text-xs text-right font-medium outline-none border-b border-transparent focus:border-zinc-700 px-2 py-0.5 max-w-[180px] placeholder-zinc-600"
                />
              )}
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
