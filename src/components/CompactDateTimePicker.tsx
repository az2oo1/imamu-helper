import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Calendar as CalendarIcon,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Plus,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { ClockStepper } from './TimingEditor';

interface CompactDateTimePickerProps {
  isOpen: boolean;
  onToggle: () => void;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  startTime?: string; // e.g. '10:15 am' or '10:15'
  endTime?: string;   // e.g. '11:10 pm' or '11:10'
  onChangeDate: (start?: string, end?: string) => void;
  onChangeTime: (start?: string, end?: string) => void;
}

const MONTH_NAMES_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const WEEKDAY_NAMES_AR = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];

// Format time string to Arabic 12h display (e.g. "12:30 م")
export function formatTimeArabic(timeStr?: string): string {
  if (!timeStr) return '';
  const raw = timeStr.trim().toLowerCase();
  const match = raw.match(/^(\d{1,2}):(\d{2})\s*(am|pm|ص|م)?$/i);
  if (!match) return timeStr;
  let h = parseInt(match[1], 10);
  const m = match[2];
  let isPM = false;
  if (match[3]) {
    const p = match[3].toLowerCase();
    isPM = p === 'pm' || p === 'م';
  } else {
    isPM = h >= 12;
    if (h > 12) h -= 12;
    else if (h === 0) h = 12;
  }
  return `${h}:${m} ${isPM ? 'م' : 'ص'}`;
}

// Format date string to short Arabic display (e.g. "الأربعاء 7 أكتوبر")
export function formatDateArabic(dateStr?: string, includeDayName = true): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  if (isNaN(d.getTime())) return dateStr;

  const dayName = WEEKDAY_NAMES_AR[d.getDay()];
  const dayNum = parts[2];
  const monthName = MONTH_NAMES_AR[parts[1] - 1];

  if (includeDayName) {
    return `${dayName} ${dayNum} ${monthName}`;
  }
  return `${dayNum} ${monthName}`;
}

export function CompactDateTimePicker({
  isOpen,
  onToggle,
  startDate,
  endDate,
  startTime,
  endTime,
  onChangeDate,
  onChangeTime
}: CompactDateTimePickerProps) {
  // Calendar viewing state (month & year)
  const initialViewDate = useMemo(() => {
    if (startDate) {
      const parts = startDate.split('-').map(Number);
      if (parts.length >= 3 && !isNaN(parts[0])) {
        return new Date(parts[0], parts[1] - 1, parts[2]);
      }
    }
    return new Date();
  }, [startDate]);

  const [viewYear, setViewYear] = useState<number>(initialViewDate.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(initialViewDate.getMonth());

  // Focus target when clicking dates: 'start' | 'end'
  const [pickingTarget, setPickingTarget] = useState<'start' | 'end'>('start');

  // Today ISO
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  const jumpToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  // Build grid of days for viewMonth & viewYear
  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0);
    const startDayOfWeek = firstDay.getDay(); // 0 is Sunday
    const totalDays = lastDay.getDate();

    const days: {
      dayNum: number;
      dateISO: string;
      isCurrentMonth: boolean;
      hijriDay: string;
      hijriMonthText?: string;
    }[] = [];

    // Days from previous month for padding
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dNum = prevMonthLastDay - i;
      const prevDate = new Date(viewYear, viewMonth - 1, dNum);
      const iso = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      let hijri = '';
      try {
        hijri = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric' }).format(prevDate);
      } catch {}
      days.push({
        dayNum: dNum,
        dateISO: iso,
        isCurrentMonth: false,
        hijriDay: hijri
      });
    }

    // Days of current month
    for (let d = 1; d <= totalDays; d++) {
      const curDate = new Date(viewYear, viewMonth, d);
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      let hijri = '';
      let hijriMonthText: string | undefined = undefined;
      try {
        hijri = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric' }).format(curDate);
        if (hijri === '1') {
          hijriMonthText = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { month: 'short' }).format(curDate);
        }
      } catch {}
      days.push({
        dayNum: d,
        dateISO: iso,
        isCurrentMonth: true,
        hijriDay: hijri,
        hijriMonthText
      });
    }

    // Days of next month to complete the row
    const remaining = (7 - (days.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      const nextDate = new Date(viewYear, viewMonth + 1, n);
      const iso = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
      let hijri = '';
      try {
        hijri = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric' }).format(nextDate);
      } catch {}
      days.push({
        dayNum: n,
        dateISO: iso,
        isCurrentMonth: false,
        hijriDay: hijri
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  // Click on a calendar day:
  // If target is 'start', set both start and end to that same date!
  // If target is 'end', update the 'to' date!
  const handleSelectDay = (dateISO: string) => {
    if (pickingTarget === 'start') {
      onChangeDate(dateISO, dateISO);
    } else {
      if (startDate && dateISO < startDate) {
        onChangeDate(dateISO, startDate);
        setPickingTarget('end');
      } else {
        onChangeDate(startDate || dateISO, dateISO);
      }
    }
  };

  // Add date button if empty: sets both boxes to today
  const handleEnableDate = () => {
    const defaultDate = todayISO;
    onChangeDate(defaultDate, defaultDate);
    setPickingTarget('start');
  };

  // Remove date button
  const handleRemoveDate = () => {
    onChangeDate(undefined, undefined);
    setPickingTarget('start');
  };

  // Add time button if empty: starts at 10:00 am
  const handleEnableTime = () => {
    onChangeTime('10:00 am', '10:00 am');
  };

  // Remove time button
  const handleRemoveTime = () => {
    onChangeTime(undefined, undefined);
  };

  // Summary label when collapsed
  const summaryLabel = useMemo(() => {
    if (!startDate && !startTime) return null;
    let text = '';
    if (startDate) {
      if (endDate && endDate !== startDate) {
        text = `${formatDateArabic(startDate, false)} - ${formatDateArabic(endDate, false)}`;
      } else {
        text = formatDateArabic(startDate, true);
      }
    }
    if (startTime) {
      const timePart = endTime && endTime !== startTime
        ? `${formatTimeArabic(startTime)} - ${formatTimeArabic(endTime)}`
        : formatTimeArabic(startTime);
      text = text ? `${text} • ${timePart}` : timePart;
    }
    return text;
  }, [startDate, endDate, startTime, endTime]);

  const effectiveEndDate = endDate || startDate;

  return (
    <div className="space-y-2">
      {/* 1. Collapsed Accordion Trigger Button */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700 transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
          <span>التاريخ والوقت</span>
        </div>

        <div className="flex items-center gap-2">
          {summaryLabel ? (
            <span className="text-xs font-bold text-[var(--color-imamu-accent)] truncate max-w-[210px]" dir="rtl">
              {summaryLabel}
            </span>
          ) : (
            <span className="text-xs text-slate-400 dark:text-zinc-500">
              غير محدد
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* 2. Expanded Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden space-y-3 pt-1"
          >
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50/70 dark:bg-zinc-900/40 border border-slate-200/80 dark:border-zinc-800/80 space-y-3">
              {/* Mini Calendar Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                    {MONTH_NAMES_AR[viewMonth]} {viewYear}
                  </span>
                  <button
                    type="button"
                    onClick={jumpToToday}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-600 dark:text-zinc-400 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:text-[var(--color-imamu-accent)] transition cursor-pointer"
                  >
                    اليوم
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={prevMonth}
                    className="p-1 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition cursor-pointer"
                    title="الشهر السابق"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={nextMonth}
                    className="p-1 rounded-lg text-slate-500 dark:text-zinc-400 hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition cursor-pointer"
                    title="الشهر التالي"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Weekday Row */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {WEEKDAY_NAMES_AR.map(w => (
                  <span
                    key={w}
                    className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 py-0.5"
                  >
                    {w}
                  </span>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((item, idx) => {
                  const isStart = startDate === item.dateISO;
                  const isEnd = effectiveEndDate === item.dateISO;
                  const isSameDayRange = isStart && isEnd;
                  const inRange = Boolean(
                    startDate &&
                    effectiveEndDate &&
                    startDate !== effectiveEndDate &&
                    item.dateISO > startDate &&
                    item.dateISO < effectiveEndDate
                  );
                  const isToday = item.dateISO === todayISO;

                  let cellClass = 'relative h-9 flex flex-col items-center justify-center transition cursor-pointer select-none ';

                  if (!item.isCurrentMonth) {
                    cellClass += 'opacity-25 hover:opacity-50 ';
                  }

                  if (isSameDayRange) {
                    cellClass += 'rounded-xl bg-[var(--color-imamu-accent)] text-white shadow-xs font-bold ';
                  } else if (isStart) {
                    cellClass += 'rounded-r-xl rounded-l-none bg-[var(--color-imamu-accent)] text-white shadow-xs font-bold ';
                  } else if (isEnd) {
                    cellClass += 'rounded-l-xl rounded-r-none bg-[var(--color-imamu-accent)] text-white shadow-xs font-bold ';
                  } else if (inRange) {
                    cellClass += 'bg-[color-mix(in_srgb,var(--color-imamu-accent)_15%,transparent)] text-[var(--color-imamu-accent)] font-semibold ';
                  } else {
                    cellClass += 'rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 ';
                    if (isToday) {
                      cellClass += 'ring-1 ring-inset ring-[var(--color-imamu-accent)] font-bold text-[var(--color-imamu-accent)] ';
                    }
                  }

                  return (
                    <button
                      key={`${item.dateISO}-${idx}`}
                      type="button"
                      onClick={() => handleSelectDay(item.dateISO)}
                      className={cellClass}
                    >
                      <span className="text-[11px] leading-tight font-medium">
                        {item.dayNum}
                      </span>
                      <span
                        className={`text-[8px] leading-tight ${
                          isStart || isEnd
                            ? 'text-white/80'
                            : 'text-slate-400 dark:text-zinc-500'
                        }`}
                      >
                        {item.hijriMonthText ? item.hijriMonthText : item.hijriDay}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Divider */}
              <div className="h-px bg-slate-200/80 dark:bg-zinc-800/80 my-1" />

              {/* Date Selection Summary & Actions */}
              <div className="space-y-2">
                {/* Date Row: Two boxes that start as the same date twice unless the 'to' date is changed */}
                <div className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-zinc-950/50 border border-slate-200/80 dark:border-zinc-800/80">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <CalendarIcon className="w-4 h-4 text-[var(--color-imamu-accent)] shrink-0" />
                    
                    {!startDate ? (
                      <button
                        type="button"
                        onClick={handleEnableDate}
                        className="flex items-center gap-1 text-xs font-bold text-[var(--color-imamu-accent)] hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة تاريخ</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {/* Box 1: Start Date */}
                        <button
                          type="button"
                          onClick={() => setPickingTarget('start')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            pickingTarget === 'start'
                              ? 'bg-[color-mix(in_srgb,var(--color-imamu-accent)_15%,transparent)] border-[var(--color-imamu-accent)] text-[var(--color-imamu-accent)] ring-1 ring-[var(--color-imamu-accent)]/20'
                              : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300'
                          }`}
                          title="تاريخ البداية (تغييره يضبط التاريخين معاً)"
                        >
                          {formatDateArabic(startDate)}
                        </button>

                        {/* Arrow */}
                        <ArrowLeft className="w-3.5 h-3.5 text-slate-400 shrink-0" />

                        {/* Box 2: To Date (Starts as same date, unless clicked and changed) */}
                        <button
                          type="button"
                          onClick={() => setPickingTarget('end')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                            pickingTarget === 'end'
                              ? 'bg-[color-mix(in_srgb,var(--color-imamu-accent)_15%,transparent)] border-[var(--color-imamu-accent)] text-[var(--color-imamu-accent)] ring-1 ring-[var(--color-imamu-accent)]/20'
                              : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300'
                          }`}
                          title="تاريخ النهاية (انقر لتعديله لنطاق مختلف)"
                        >
                          {formatDateArabic(effectiveEndDate)}
                        </button>
                      </div>
                    )}
                  </div>

                  {startDate && (
                    <button
                      type="button"
                      onClick={handleRemoveDate}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer shrink-0"
                      title="إزالة التاريخ"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Time Row (Fully RTL: Start time on the right -> Arrow pointing left <- -> End time on the left) */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-zinc-950/50 border border-slate-200/80 dark:border-zinc-800/80 gap-2 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-1 min-w-0">
                    <Clock className="w-4 h-4 text-[var(--color-imamu-accent)] shrink-0" />

                    {!startTime ? (
                      <button
                        type="button"
                        onClick={handleEnableTime}
                        className="flex items-center gap-1 text-xs font-bold text-[var(--color-imamu-accent)] hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة وقت</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap min-w-0">
                        {/* Box 1: Start Time (Right side in RTL) */}
                        <div title="وقت البدء">
                          <ClockStepper
                            value={startTime}
                            onChange={(newStart) => {
                              if (endTime === startTime || !endTime) {
                                onChangeTime(newStart, newStart);
                              } else {
                                onChangeTime(newStart, endTime);
                              }
                            }}
                          />
                        </div>

                        {/* Arrow pointing left (from start to end in RTL) */}
                        <ArrowLeft className="w-4 h-4 text-slate-400 dark:text-zinc-500 shrink-0" />

                        {/* Box 2: End Time (Left side in RTL) */}
                        <div title="وقت الانتهاء">
                          <ClockStepper
                            value={endTime || startTime}
                            onChange={(newEnd) => {
                              onChangeTime(startTime, newEnd);
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {startTime && (
                    <button
                      type="button"
                      onClick={handleRemoveTime}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer shrink-0"
                      title="إزالة الوقت"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
