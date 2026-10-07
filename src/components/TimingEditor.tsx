'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, User, Pencil, Check, Trash2, Clock, ChevronDown, ArrowLeft } from 'lucide-react';
import {
  formatTo12Hour,
  parseTimeToMinutes,
  formatMinutesToTime,
  DAY_MAP_AR
} from '../lib/schedule-utils';
import { Button } from './ui/Button';

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


interface Time12State {
  hour: number;
  minute: number;
  period: 'am' | 'pm';
}

function parseTo12State(timeStr?: string | null): Time12State {
  if (!timeStr) return { hour: 8, minute: 0, period: 'am' };
  const raw = timeStr.trim().toLowerCase();
  const match = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm|ص|م)?$/i);
  if (!match) return { hour: 8, minute: 0, period: 'am' };
  let h = parseInt(match[1], 10);
  let m = parseInt(match[2], 10);
  let p: 'am' | 'pm' = 'am';
  if (match[3]) {
    const periodStr = match[3].toLowerCase();
    if (periodStr === 'pm' || periodStr === 'م') {
      p = 'pm';
    }
  } else {
    if (h >= 12) {
      p = 'pm';
      if (h > 12) h -= 12;
    } else if (h === 0) {
      h = 12;
    }
  }
  if (h <= 0) h = 12;
  if (h > 12) h = 12;
  if (m < 0) m = 0;
  if (m > 59) m = 59;
  return { hour: h, minute: m, period: p };
}

function format12State(state: Time12State): string {
  const hStr = String(state.hour).padStart(2, '0');
  const mStr = String(state.minute).padStart(2, '0');
  return `${hStr}:${mStr} ${state.period}`;
}

export function ClockStepper({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const state = parseTo12State(value);

  const update = (partial: Partial<Time12State>) => {
    const next = { ...state, ...partial };
    onChange(format12State(next));
  };

  const incrementHour = () => {
    const nextH = state.hour === 12 ? 1 : state.hour + 1;
    update({ hour: nextH });
  };

  const decrementHour = () => {
    const nextH = state.hour === 1 ? 12 : state.hour - 1;
    update({ hour: nextH });
  };

  const incrementMinute = () => {
    const nextM = (Math.floor(state.minute / 5) * 5 + 5) % 60;
    update({ minute: nextM });
  };

  const decrementMinute = () => {
    const nextM = (Math.ceil(state.minute / 5) * 5 - 5 + 60) % 60;
    update({ minute: nextM });
  };

  const togglePeriod = () => {
    update({ period: state.period === 'am' ? 'pm' : 'am' });
  };

  return (
    <div className="flex items-center gap-1" dir="ltr">
      {/* Hours Column */}
      <div className="w-9 bg-white dark:bg-zinc-900 rounded-xl flex flex-col items-center select-none border border-slate-200 dark:border-zinc-700/80 shrink-0">
        <button
          type="button"
          onClick={incrementHour}
          className="w-full h-5 flex items-center justify-center text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-t-[11px] transition cursor-pointer text-xs font-bold leading-none active:scale-90"
          title="زيادة الساعة"
        >
          +
        </button>
        <div className="w-full py-0.5 border-y border-slate-100 dark:border-zinc-800 text-center font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white select-none cursor-default">
          {String(state.hour).padStart(2, '0')}
        </div>
        <button
          type="button"
          onClick={decrementHour}
          className="w-full h-5 flex items-center justify-center text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-b-[11px] transition cursor-pointer text-xs font-bold leading-none active:scale-90"
          title="تقليل الساعة"
        >
          −
        </button>
      </div>

      {/* Separator Colon */}
      <span className="font-mono font-bold text-xs sm:text-sm text-slate-400 dark:text-zinc-500 select-none px-0.5 shrink-0">
        :
      </span>

      {/* Minutes Column */}
      <div className="w-9 bg-white dark:bg-zinc-900 rounded-xl flex flex-col items-center select-none border border-slate-200 dark:border-zinc-700/80 shrink-0">
        <button
          type="button"
          onClick={incrementMinute}
          className="w-full h-5 flex items-center justify-center text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-t-[11px] transition cursor-pointer text-xs font-bold leading-none active:scale-90"
          title="زيادة الدقائق (+5)"
        >
          +
        </button>
        <div className="w-full py-0.5 border-y border-slate-100 dark:border-zinc-800 text-center font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white select-none cursor-default">
          {String(state.minute).padStart(2, '0')}
        </div>
        <button
          type="button"
          onClick={decrementMinute}
          className="w-full h-5 flex items-center justify-center text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-b-[11px] transition cursor-pointer text-xs font-bold leading-none active:scale-90"
          title="تقليل الدقائق (-5)"
        >
          −
        </button>
      </div>

      {/* AM / PM Toggle Pill */}
      <button
        type="button"
        onClick={togglePeriod}
        className="ml-1 px-2.5 py-1.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700/80 hover:border-[var(--color-imamu-accent)] text-slate-900 dark:text-white font-mono font-bold text-xs transition cursor-pointer shadow-2xs active:scale-95 select-none shrink-0"
        title="تبديل صباحاً / مساءً"
      >
        {state.period.toUpperCase()}
      </button>
    </div>
  );
}

interface TimingEditorProps {
  schedules: ScheduleItem[];
  onChange: (schedules: ScheduleItem[]) => void;
  availableTeachers?: string[];
  className?: string;
  activeIdx?: number | null;
  onActiveIdxChange?: (idx: number | null) => void;
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

export function TimingEditor({
  schedules,
  onChange,
  availableTeachers = [],
  className = '',
  activeIdx: controlledActiveIdx,
  onActiveIdxChange
}: TimingEditorProps) {
  const items = schedules.length > 0 ? schedules : [{
    id: '1',
    days: ['الأحد', 'الثلاثاء'],
    startTime: '08:20 am',
    endTime: '09:10 am',
    classroom: '',
    teacher: ''
  }];

  const [internalActiveIdx, setInternalActiveIdx] = useState<number | null>(() => {
    return controlledActiveIdx !== undefined ? controlledActiveIdx : null;
  });

  useEffect(() => {
    if (controlledActiveIdx !== undefined) {
      setInternalActiveIdx(controlledActiveIdx);
    }
  }, [controlledActiveIdx]);

  const activeIdx = controlledActiveIdx !== undefined ? controlledActiveIdx : internalActiveIdx;
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const teacherDropdownRef = useRef<HTMLDivElement>(null);

  const prevActiveIdxRef = useRef<number | null>(null);
  const baselineRef = useRef<ScheduleItem | null>(null);

  if (activeIdx !== prevActiveIdxRef.current) {
    prevActiveIdxRef.current = activeIdx;
    if (activeIdx !== null && items[activeIdx]) {
      baselineRef.current = JSON.parse(JSON.stringify(items[activeIdx]));
    } else {
      baselineRef.current = null;
    }
  }

  useEffect(() => {
    if (!isTeacherDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (teacherDropdownRef.current && !teacherDropdownRef.current.contains(e.target as Node)) {
        setIsTeacherDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isTeacherDropdownOpen]);

  const setActiveIdx = (idx: number | null) => {
    setIsTeacherDropdownOpen(false);
    setInternalActiveIdx(idx);
    onActiveIdxChange?.(idx);
  };

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
      setActiveIdx(0);
      return;
    }
    const next = items.filter((_, i) => i !== idx);
    onChange(next);
    setActiveIdx(null);
  };

  const addItem = () => {
    const newIdx = items.length;
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
    setActiveIdx(newIdx);
  };

  return (
    <div className={`space-y-3 ${className}`} dir="rtl">
      {items.map((item, idx) => {
        const isActive = activeIdx === idx;
        const currentStart = item.startTime ? formatTo12Hour(item.startTime) : '08:20 am';
        const currentEnd = item.endTime ? formatTo12Hour(item.endTime) : '09:10 am';

        if (!isActive) {
          return (
            <div
              key={item.id || idx}
              onClick={() => setActiveIdx(idx)}
              className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-[var(--color-imamu-accent)]/60 transition cursor-pointer flex items-center justify-between gap-3 group shadow-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                <div className="flex gap-1 shrink-0">
                  {item.days.map(d => (
                    <span
                      key={d}
                      className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-900/50 text-[var(--color-imamu-accent)] font-bold text-[10px]"
                    >
                      {d}
                    </span>
                  ))}
                </div>

                <span className="text-slate-700 dark:text-zinc-300 font-semibold text-xs" dir="ltr">
                  {currentStart} → {currentEnd}
                </span>

                {item.classroom && (
                  <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1 text-[11px]">
                    <MapPin className="w-3 h-3 text-[var(--color-imamu-accent)]" />
                    القاعة: {item.classroom}
                  </span>
                )}

                {item.teacher && (
                  <span className="text-slate-500 dark:text-zinc-400 flex items-center gap-1 text-[11px]">
                    <User className="w-3 h-3 text-[var(--color-imamu-accent)]" />
                    {item.teacher}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIdx(idx);
                  }}
                  leftIcon={<Pencil className="w-3 h-3" />}
                >
                  تعديل
                </Button>

                {items.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(idx);
                    }}
                    className="text-slate-400 hover:text-rose-500"
                    title="حذف هذا الموعد"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        }

        const hasChanged = (() => {
          const baseline = baselineRef.current;
          if (!baseline) return false;
          const d1 = [...(item.days || [])].sort().join(',');
          const d2 = [...(baseline.days || [])].sort().join(',');
          if (d1 !== d2) return true;
          if ((item.startTime || '').trim() !== (baseline.startTime || '').trim()) return true;
          if ((item.endTime || '').trim() !== (baseline.endTime || '').trim()) return true;
          if ((item.classroom || '').trim() !== (baseline.classroom || '').trim()) return true;
          if ((item.teacher || '').trim() !== (baseline.teacher || '').trim()) return true;
          return false;
        })();

        return (
          <div
            key={item.id || idx}
            className="bg-white dark:bg-zinc-900 border-2 border-[var(--color-imamu-accent)]/50 rounded-2xl p-4 sm:p-5 shadow-md space-y-4 animate-in fade-in duration-150"
          >
            {/* Header with Save / Cancel button(s) */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                <span>تعديل الموعد ({idx + 1})</span>
              </span>

              <div className="flex items-center gap-2">
                {hasChanged ? (
                  <>
                    <Button
                      type="button"
                      variant="primary"
                      size="xs"
                      onClick={() => {
                        baselineRef.current = null;
                        setActiveIdx(null);
                      }}
                      leftIcon={<Check className="w-3.5 h-3.5" />}
                    >
                      حفظ الموعد
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="xs"
                      onClick={() => {
                        if (baselineRef.current) {
                          const next = [...items];
                          next[idx] = JSON.parse(JSON.stringify(baselineRef.current));
                          onChange(next);
                        }
                        baselineRef.current = null;
                        setActiveIdx(null);
                      }}
                      leftIcon={<X className="w-3.5 h-3.5" />}
                    >
                      إلغاء
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="xs"
                    onClick={() => {
                      baselineRef.current = null;
                      setActiveIdx(null);
                    }}
                    leftIcon={<X className="w-3.5 h-3.5" />}
                  >
                    إلغاء
                  </Button>
                )}
              </div>
            </div>

            {/* Day Selector Pills */}
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-slate-600 dark:text-zinc-400 block">
                أيام المحاضرة
              </span>
              <div className="grid grid-cols-5 gap-1.5">
                {ALL_DAYS.map(dayDef => {
                  const active = isDayActive(item.days, dayDef);
                  return (
                    <button
                      key={dayDef.key}
                      type="button"
                      onClick={() => toggleDay(idx, dayDef)}
                      className={`py-2 rounded-xl text-xs font-bold transition cursor-pointer text-center border ${
                        active
                          ? 'bg-[var(--color-imamu-brown)] border-[var(--color-imamu-accent)] text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-zinc-800/60 border-slate-200 dark:border-zinc-700/60 text-slate-600 dark:text-zinc-400 hover:border-slate-300 dark:hover:border-zinc-600'
                      }`}
                    >
                      <span className="hidden sm:inline">{dayDef.ar}</span>
                      <span className="sm:hidden">{dayDef.shortAr}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time section: Side-by-side with arrow pointer */}
            <div className="py-2.5 border-y border-slate-200 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 shrink-0">
                <Clock className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                  الوقت
                </span>
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0" dir="rtl">
                <div title="وقت البدء">
                  <ClockStepper
                    value={item.startTime}
                    onChange={(newStart) => {
                      const sMin = parseTimeToMinutes(newStart) ?? 0;
                      const eMin = parseTimeToMinutes(item.endTime) ?? 0;
                      let newEnd = item.endTime;
                      if (eMin <= sMin) {
                        newEnd = formatMinutesToTime(sMin + 50, false);
                      }
                      const next = [...items];
                      next[idx] = { ...next[idx], startTime: newStart, endTime: newEnd };
                      onChange(next);
                    }}
                  />
                </div>

                <ArrowLeft className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />

                <div title="وقت الانتهاء">
                  <ClockStepper
                    value={item.endTime}
                    onChange={(newEnd) => {
                      const next = [...items];
                      next[idx] = { ...next[idx], endTime: newEnd };
                      onChange(next);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Classroom & Teacher inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                  <span>القاعة الدراسية</span>
                </label>
                <input
                  type="text"
                  value={item.classroom || ''}
                  onChange={e => updateField(idx, 'classroom', e.target.value)}
                  placeholder="مثال: 3027"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-white text-xs font-medium focus:border-[var(--color-imamu-accent)] outline-none transition placeholder-slate-400 dark:placeholder-zinc-500 h-[40px]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-zinc-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                  <span>اسم الدكتور</span>
                </label>
                {availableTeachers && availableTeachers.length > 0 ? (
                  <div ref={teacherDropdownRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsTeacherDropdownOpen(prev => !prev)}
                      className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-white text-xs font-bold rounded-xl px-3.5 py-2 flex items-center justify-between gap-2 shadow-xs transition hover:border-[var(--color-imamu-accent)]/80 cursor-pointer h-[40px]"
                    >
                      <span className="truncate">{item.teacher || '-- اختر الدكتور --'}</span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-zinc-400 transition-transform duration-200 ${isTeacherDropdownOpen ? 'rotate-180 text-[var(--color-imamu-accent)]' : ''}`} />
                    </button>

                    {isTeacherDropdownOpen && (
                      <div className="absolute top-full right-0 left-0 mt-1.5 z-50 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-700 shadow-xl max-h-52 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/80 custom-scrollbar animate-in fade-in zoom-in-95 duration-100 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            updateField(idx, 'teacher', '');
                            setIsTeacherDropdownOpen(false);
                          }}
                          className="w-full px-3.5 py-2.5 text-xs font-bold text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/80 flex items-center justify-between transition cursor-pointer text-right"
                        >
                          <span>-- بدون تحديد --</span>
                          {!item.teacher && <Check className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />}
                        </button>

                        {availableTeachers.map(tName => {
                          const isSelected = item.teacher === tName;
                          return (
                            <button
                              key={tName}
                              type="button"
                              onClick={() => {
                                updateField(idx, 'teacher', tName);
                                setIsTeacherDropdownOpen(false);
                              }}
                              className={`w-full px-3.5 py-2.5 text-xs font-bold flex items-center justify-between transition cursor-pointer text-right ${
                                isSelected
                                  ? 'bg-[var(--color-imamu-accent)]/15 text-[var(--color-imamu-accent)]'
                                  : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/80'
                              }`}
                            >
                              <span className="truncate">{tName}</span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[var(--color-imamu-accent)] shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={item.teacher || ''}
                    onChange={e => updateField(idx, 'teacher', e.target.value)}
                    placeholder="مثال: د. أحمد..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-white text-xs font-medium focus:border-[var(--color-imamu-accent)] outline-none transition placeholder-slate-400 dark:placeholder-zinc-500 h-[40px]"
                  />
                )}
              </div>
            </div>


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
