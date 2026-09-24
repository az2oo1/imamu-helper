import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Sparkles,
  X,
  ExternalLink
} from 'lucide-react';
import { WhatsappIcon } from './WhatsappIcon';
import {
  parseScheduleDays,
  parseTimeToMinutes,
  formatMinutesToTime,
  parseTimeRange,
  DAY_MAP_AR,
  SCHEDULE_DAYS_LIST,
  COURSE_CARD_PALETTES,
  type CoursePalette
} from '../lib/schedule-utils';
import { COURSE_HEX_COLORS } from '../lib/task-utils';

export { parseTimeToMinutes, formatMinutesToTime, COURSE_CARD_PALETTES, type CoursePalette };

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export interface ScheduleSlotRaw {
  type?: string;
  days?: string[] | string;
  daysString?: string;
  startTime?: string;
  endTime?: string;
  timeRange?: string;
  room?: string;
  building?: string;
  instructor?: string;
}

export interface SectionDataForSchedule {
  id: number | string;
  crn: string;
  sectionNumber?: string;
  courseCode: string;
  courseTitle: string;
  primaryInstructor?: string;
  instructors?: { name: string; email?: string; isPrimary?: boolean }[];
  schedules?: ScheduleSlotRaw[];
  whatsappLink?: string;
  color?: string;
}

export interface PositionedSlot {
  id: string;
  section?: SectionDataForSchedule;
  sectionId?: number | string;
  colorIndex: number;
  day: string;
  startTimeStr: string;
  endTimeStr: string;
  startMinutes: number;
  endMinutes: number;
  room?: string;
  building?: string;
  colIndex: number;
  totalCols: number;
  courseCode: string;
  courseTitle: string;
  sectionNumber?: string;
  crn?: string;
  primaryInstructor?: string;
  instructors?: { name: string; email?: string; isPrimary?: boolean }[];
  whatsappLink?: string;
}

interface WeeklyScheduleProps {
  sections: SectionDataForSchedule[];
  className?: string;
  loading?: boolean;
}

// ─────────────────────────────────────────────
// Day Configuration: IMAMU University School Week (Sunday - Thursday)
// ─────────────────────────────────────────────
export const SCHEDULE_DAYS = SCHEDULE_DAYS_LIST;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
export function formatHourLabel(hour: number): string {
  const isPm = hour >= 12;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const period = isPm ? 'م' : 'ص';
  return `${h12}${period}`;
}

// ─────────────────────────────────────────────
// Component: WeeklySchedule
// ─────────────────────────────────────────────
export function WeeklySchedule({ sections, className = '', loading = false }: WeeklyScheduleProps) {
  const [selectedSlot, setSelectedSlot] = useState<PositionedSlot | null>(null);
  const [now, setNow] = useState<Date>(new Date());
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Live timer tick every 60s
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 1. Extract all raw slots from sections
  const { allSlots, minTime, maxTime } = useMemo(() => {
    const slots: {
      section: SectionDataForSchedule;
      colorIndex: number;
      day: string;
      startTimeStr: string;
      endTimeStr: string;
      startMinutes: number;
      endMinutes: number;
      room?: string;
      building?: string;
    }[] = [];

    let overallMin = 8 * 60;   // default 8:00 AM
    let overallMax = 14 * 60;  // default 2:00 PM

    sections.forEach((sec, secIdx) => {
      const matchedIdx = sec.color ? COURSE_HEX_COLORS.indexOf(sec.color) : -1;
      const colorIndex = (matchedIdx >= 0 ? matchedIdx : secIdx) % COURSE_CARD_PALETTES.length;
      const schedList = Array.isArray(sec.schedules) ? sec.schedules : [];

      schedList.forEach(sch => {
        const rawDays = parseScheduleDays(sch);
        const { startTime, endTime, startMinutes, endMinutes } = parseTimeRange(
          sch.timeRange,
          sch.startTime || '08:00 am',
          sch.endTime || '09:50 am'
        );

        overallMin = Math.min(overallMin, startMinutes);
        overallMax = Math.max(overallMax, endMinutes);

        rawDays.forEach(d => {
          const mappedDay = DAY_MAP_AR[d] || d;
          if (mappedDay && SCHEDULE_DAYS.some(sd => sd.key === mappedDay)) {
            slots.push({
              section: sec,
              colorIndex,
              day: mappedDay,
              startTimeStr: startTime,
              endTimeStr: endTime,
              startMinutes,
              endMinutes,
              room: sch.room,
              building: sch.building
            });
          }
        });
      });
    });

    return {
      allSlots: slots,
      minTime: overallMin,
      maxTime: overallMax
    };
  }, [sections]);

  // Dynamic startHour & endHour for grid bounds
  const minClassHour = Math.floor(minTime / 60);
  const maxClassHour = Math.ceil(maxTime / 60);
  const startHour = Math.min(8, minClassHour);
  const endHour = Math.max(14, maxClassHour + 1);

  // 2. Dynamic Hour Configurations (Bigger when active, smaller when empty)
  // Active hours (hours where ANY class exists): 108px
  // Empty hours (hours with NO class on any day): 34px
  const hourConfigs = useMemo(() => {
    const hours: { hour: number; hasClass: boolean; height: number; y: number }[] = [];
    let currentY = 0;
    for (let h = startHour; h < endHour; h++) {
      const hasClass = allSlots.some(
        s => s.startMinutes < (h + 1) * 60 && s.endMinutes > h * 60
      );
      // When there's something: BIGGER (90px)
      // When there's nothing: SMALLER (16px)
      const height = hasClass ? 90 : 16;
      hours.push({
        hour: h,
        hasClass,
        height,
        y: currentY
      });
      currentY += height;
    }
    return {
      hours,
      totalHeight: currentY
    };
  }, [startHour, endHour, allSlots]);

  const totalGridHeight = hourConfigs.totalHeight;

  // getY mapping function to translate any minute of the day to vertical pixel offset
  const getY = useCallback(
    (minutes: number): number => {
      if (minutes <= startHour * 60) return 0;
      if (minutes >= endHour * 60) return hourConfigs.totalHeight;

      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      const config = hourConfigs.hours.find(item => item.hour === h);
      if (!config) return 0;

      return config.y + (m / 60) * config.height;
    },
    [startHour, endHour, hourConfigs]
  );

  // 3. Position and compute overlapping columns for each day
  const dayPositionedSlots = useMemo(() => {
    const result: Record<string, PositionedSlot[]> = {};
    SCHEDULE_DAYS.forEach(d => {
      result[d.key] = [];
    });

    SCHEDULE_DAYS.forEach(sd => {
      const daySlots = allSlots
        .filter(s => s.day === sd.key)
        .sort((a, b) => a.startMinutes - b.startMinutes || (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes));

      // Overlap clustering algorithm
      const clusters: (typeof daySlots)[] = [];
      let currentCluster: typeof daySlots = [];
      let clusterEnd = -1;

      daySlots.forEach(slot => {
        if (currentCluster.length === 0) {
          currentCluster.push(slot);
          clusterEnd = slot.endMinutes;
        } else if (slot.startMinutes < clusterEnd) {
          currentCluster.push(slot);
          clusterEnd = Math.max(clusterEnd, slot.endMinutes);
        } else {
          clusters.push(currentCluster);
          currentCluster = [slot];
          clusterEnd = slot.endMinutes;
        }
      });
      if (currentCluster.length > 0) {
        clusters.push(currentCluster);
      }

      // Assign column index within each cluster
      clusters.forEach(cluster => {
        const columns: (typeof daySlots)[] = [];

        cluster.forEach(slot => {
          let placedCol = -1;
          for (let col = 0; col < columns.length; col++) {
            const lastSlotInCol = columns[col][columns[col].length - 1];
            if (lastSlotInCol.endMinutes <= slot.startMinutes) {
              columns[col].push(slot);
              placedCol = col;
              break;
            }
          }
          if (placedCol === -1) {
            columns.push([slot]);
            placedCol = columns.length - 1;
          }
        });

        const totalCols = columns.length;
        columns.forEach((colSlots, colIdx) => {
          colSlots.forEach(slot => {
            const sec = slot.section;
            result[sd.key].push({
              id: `${sec.id}_${slot.day}_${slot.startMinutes}_${colIdx}`,
              section: sec,
              sectionId: sec.id,
              courseCode: sec.courseCode,
              courseTitle: sec.courseTitle || sec.courseCode,
              sectionNumber: sec.sectionNumber,
              crn: sec.crn,
              primaryInstructor: sec.primaryInstructor,
              instructors: sec.instructors,
              whatsappLink: sec.whatsappLink,
              room: slot.room,
              building: slot.building,
              startTimeStr: slot.startTimeStr,
              endTimeStr: slot.endTimeStr,
              startMinutes: slot.startMinutes,
              endMinutes: slot.endMinutes,
              colorIndex: slot.colorIndex,
              day: sd.key,
              colIndex: colIdx,
              totalCols
            });
          });
        });
      });
    });

    return result;
  }, [allSlots]);

  // Current real-time line info
  const currentDayOfWeek = now.getDay(); // 0: Sun, 1: Mon, ... 4: Thu
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
  const isTodayInSchoolWeek = currentDayOfWeek >= 0 && currentDayOfWeek <= 4;
  const isCurrentTimeWithinGrid =
    currentTotalMinutes >= startHour * 60 && currentTotalMinutes <= endHour * 60;
  const currentTimeY = getY(currentTotalMinutes);

  // Active today day object
  const activeTodayDay = SCHEDULE_DAYS.find(sd => sd.dayOfWeek === currentDayOfWeek);

  // Quick stats
  const totalClassesCount = allSlots.length;
  const todayClassesCount = activeTodayDay ? dayPositionedSlots[activeTodayDay.key]?.length || 0 : 0;

  // Compute real gaps between consecutive classes/clusters for each day
  // Uses accurate pixel coordinates (top, height) rather than grid hour cells
  const dayGaps = useMemo(() => {
    const result: Record<string, { top: number; height: number; durationStr: string }[]> = {};
    SCHEDULE_DAYS.forEach(sd => {
      result[sd.key] = [];
      const slots = dayPositionedSlots[sd.key] || [];
      if (slots.length <= 1) return;

      // Merge overlapping or concurrent slot time intervals to find true free time
      const intervals = slots
        .map(s => ({ start: s.startMinutes, end: s.endMinutes }))
        .sort((a, b) => a.start - b.start);

      const merged: { start: number; end: number }[] = [];
      intervals.forEach(curr => {
        if (merged.length === 0) {
          merged.push({ ...curr });
        } else {
          const last = merged[merged.length - 1];
          if (curr.start < last.end) {
            last.end = Math.max(last.end, curr.end);
          } else {
            merged.push({ ...curr });
          }
        }
      });

      // Gaps between consecutive merged intervals
      for (let i = 0; i < merged.length - 1; i++) {
        const gapStart = merged[i].end;
        const gapEnd = merged[i + 1].start;
        const gapMinutes = gapEnd - gapStart;
        if (gapMinutes > 10) {
          const top = getY(gapStart);
          const bottom = getY(gapEnd);
          const height = bottom - top;
          const hrs = Math.floor(gapMinutes / 60);
          const mins = gapMinutes % 60;
          let durationStr = '';
          if (hrs > 0 && mins > 0) {
            durationStr = `${hrs}س ${mins}د`;
          } else if (hrs > 0) {
            if (hrs === 1) durationStr = 'ساعة';
            else if (hrs === 2) durationStr = 'ساعتان';
            else if (hrs >= 3 && hrs <= 10) durationStr = `${hrs} ساعات`;
            else durationStr = `${hrs} ساعة`;
          } else {
            durationStr = `${mins} دقيقة`;
          }

          result[sd.key].push({
            top,
            height,
            durationStr
          });
        }
      }
    });
    return result;
  }, [dayPositionedSlots, getY]);

  // ── Skeleton loading ──
  if (loading) {
    return (
      <div className={`mb-8 space-y-3 ${className}`} dir="rtl">
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 animate-pulse" />
          <div className="space-y-1.5">
            <div className="w-28 h-3.5 rounded-md bg-slate-100 dark:bg-zinc-800 animate-pulse" />
            <div className="w-20 h-2.5 rounded-md bg-slate-100 dark:bg-zinc-800 animate-pulse" />
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden">
          <div className="grid grid-cols-[36px_repeat(5,1fr)] border-b border-slate-200 dark:border-zinc-800">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="py-4 px-2 border-l border-slate-200/80 dark:border-zinc-800/80">
                <div className="h-3 rounded bg-slate-100 dark:bg-zinc-800 animate-pulse mx-auto w-3/4" />
                <div className="h-2 rounded bg-slate-100 dark:bg-zinc-800 animate-pulse mx-auto w-1/2 mt-1.5" />
              </div>
            ))}
          </div>
          <div className="p-4 grid grid-cols-[36px_repeat(5,1fr)] gap-2 min-h-[240px]">
            {[...Array(6)].map((_, col) => (
              <div key={col} className="flex flex-col gap-2 pt-2">
                {col === 0 ? (
                  [8, 9, 10, 11].map(h => (
                    <div key={h} className="text-[10px] text-slate-300 dark:text-zinc-700 font-bold text-center animate-pulse">{h}ص</div>
                  ))
                ) : (
                  [...Array(Math.floor(Math.random() * 2) + 1)].map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl animate-pulse"
                      style={{
                        height: `${60 + i * 20}px`,
                        background: 'linear-gradient(90deg, rgb(var(--color-skeleton-from, 241 245 249)) 25%, rgb(var(--color-skeleton-to, 226 232 240)) 50%, rgb(var(--color-skeleton-from, 241 245 249)) 75%)',
                      }}
                    />
                  ))
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (sections.length === 0 || allSlots.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-10 text-center mb-6 shadow-xs">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-stone-100 dark:bg-stone-900/60 border border-[var(--color-imamu-accent)]/20 text-[var(--color-imamu-accent)] flex items-center justify-center">
          <Calendar className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200 mb-1">
          لا توجد مواعيد دراسية مسجلة بعد في الجدول
        </h3>
        <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-md mx-auto leading-relaxed">
          أضف موادك بالـ CRN أو من دليل المقررات لتظهر أوقات المحاضرات، القاعات، والخط الزمني التفاعلي تلقائياً.
        </p>
      </div>
    );
  }

  return (
    <div className={`mb-8 space-y-3 ${className}`} dir="rtl">
      {/* ─── Schedule Header Bar ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-stone-100 dark:bg-stone-900/80 border border-[var(--color-imamu-accent)]/20 text-[var(--color-imamu-accent)] shadow-xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                الجدول الأسبوعي
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500">
              {todayClassesCount > 0
                ? `لديك اليوم ${todayClassesCount} محاضرات · المجموع ${totalClassesCount} أسبوعياً`
                : `${totalClassesCount} موعد دراسي مسجل بالأسبوع`}
            </p>
          </div>
        </div>

      </div>

      {/* ─── Main Timetable Frame with Seamlessly Integrated Time Axis ─── */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm">
        {/* Horizontal Scroll Area for Smaller Screens */}
        <div
          ref={gridContainerRef}
          className="overflow-x-auto custom-scrollbar relative select-none"
        >
          <div className="min-w-[760px]">
            {/* ─── 1. Day Column Headers + Integrated Time Header ─── */}
            <div className="grid grid-cols-[36px_repeat(5,1fr)] border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/60 sticky top-0 z-20 backdrop-blur-xs">
              {/* Rightmost integrated cell: Time header */}
              <div className="py-3 border-l border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-center">
                <Clock className="w-3 h-3 text-[var(--color-imamu-accent)]" />
              </div>

              {/* 5 Day Headers */}
              {SCHEDULE_DAYS.map(sd => {
                const isToday = isTodayInSchoolWeek && sd.dayOfWeek === currentDayOfWeek;
                const count = dayPositionedSlots[sd.key]?.length || 0;
                return (
                  <div
                    key={sd.key}
                    className={`py-3 px-2 text-center border-l border-slate-200/80 dark:border-zinc-800/80 transition-colors ${
                      isToday
                        ? 'bg-[var(--color-imamu-brown)]/10 dark:bg-[var(--color-imamu-brown)]/20'
                        : ''
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          isToday
                            ? 'text-[var(--color-imamu-brown)] dark:text-[var(--color-imamu-accent)]'
                            : 'text-slate-800 dark:text-zinc-200'
                        }`}
                      >
                        {sd.label}
                      </span>
                      {isToday && (
                        <span className="px-1.5 py-0.2 rounded-md bg-[var(--color-imamu-accent)] text-stone-950 font-bold text-[9px] shadow-xs">
                          اليوم
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-0.5">
                      {count > 0 ? `${count} محاضرات` : 'لا توجد محاضرات'}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* ─── 2. Grid Body: Integrated Time Column + 5 Day Columns ─── */}
            <div
              className="grid grid-cols-[36px_repeat(5,1fr)] relative"
              style={{ height: `${totalGridHeight}px` }}
            >
              {/* ── Integrated Time Column (Right Side - Shares same style and background) ── */}
              <div className="relative border-l border-slate-200/80 dark:border-zinc-800/80 select-none">
                {hourConfigs.hours.map(item => (
                  <div
                    key={item.hour}
                    className={`absolute inset-x-0 flex items-center justify-center transition-colors ${
                      item.hasClass ? 'pt-1.5 items-start border-t border-slate-100/80 dark:border-zinc-800/60' : ''
                    }`}
                    style={{ top: `${item.y}px`, height: `${item.height}px` }}
                  >
                    {item.hasClass && (
                      <span className="text-[10px] font-black text-slate-700 dark:text-zinc-300 leading-none">
                        {formatHourLabel(item.hour)}
                      </span>
                    )}
                  </div>
                ))}


              </div>

              {/* ── 5 Day Columns ── */}
              {SCHEDULE_DAYS.map(sd => {
                const isToday = isTodayInSchoolWeek && sd.dayOfWeek === currentDayOfWeek;
                const slots = dayPositionedSlots[sd.key] || [];

                return (
                  <div
                    key={sd.key}
                    className={`relative border-l border-slate-200/80 dark:border-zinc-800/80 transition-colors ${
                      isToday
                        ? 'bg-stone-50/30 dark:bg-stone-950/15'
                        : 'hover:bg-slate-50/20 dark:hover:bg-zinc-800/5'
                    }`}
                  >
                    {/* Horizontal Hour Lines */}
                    {hourConfigs.hours.map(item => (
                      <div
                        key={item.hour}
                        className={`absolute inset-x-0 pointer-events-none transition-colors ${
                          item.hasClass
                            ? 'border-t border-slate-100 dark:border-zinc-800/60'
                            : ''
                        }`}
                        style={{ top: `${item.y}px`, height: `${item.height}px` }}
                      />
                    ))}

                    {/* Gap text between consecutive classes */}
                    {(dayGaps[sd.key] || []).map((gap, gIdx) => (
                      <div
                        key={`gap_${gIdx}`}
                        className="absolute inset-x-0 flex items-center justify-center pointer-events-none z-10"
                        style={{ top: `${gap.top}px`, height: `${gap.height}px` }}
                      >
                        <span className="text-[11px] font-bold text-slate-400/90 dark:text-zinc-500 tabular-nums select-none tracking-wide">
                          {gap.durationStr}
                        </span>
                      </div>
                    ))}

                    {/* ── LIVE CURRENT TIME LINE (solid for today, very transparent for other days) ── */}
                    {isCurrentTimeWithinGrid && (
                      <div
                        className="absolute inset-x-0 z-20 pointer-events-none"
                        style={{ top: `${currentTimeY}px` }}
                      >
                        <div
                          className={`w-full h-px ${
                            isToday ? 'bg-rose-500' : 'bg-rose-500/20'
                          }`}
                        />
                      </div>
                    )}

                    {/* ── Positioned Class Cards for This Day ── */}
                    {slots.map(slot => {
                      const top = getY(slot.startMinutes);
                      const bottom = getY(slot.endMinutes);
                      const height = Math.max(58, bottom - top - 4); // min 58px so card always looks good

                      const palette = COURSE_CARD_PALETTES[slot.colorIndex];
                      const widthPercent = 100 / slot.totalCols;
                      const rightOffsetPercent = slot.colIndex * widthPercent;

                      // Is class occurring right now?
                      const isNowActive =
                        isToday &&
                        currentTotalMinutes >= slot.startMinutes &&
                        currentTotalMinutes <= slot.endMinutes;

                      return (
                        <motion.div
                          key={slot.id}
                          whileHover={{ scale: 1.015, zIndex: 30 }}
                          whileTap={{ scale: 0.985 }}
                          onClick={() => setSelectedSlot(slot)}
                          className={`absolute p-2 sm:p-2.5 rounded-2xl border transition-all duration-150 cursor-pointer shadow-xs flex flex-col justify-between overflow-hidden group ${palette.bg} ${palette.border}`}
                          style={{
                            top: `${top + 2}px`,
                            height: `${height}px`,
                            right: `calc(${rightOffsetPercent}% + 2px)`,
                            width: `calc(${widthPercent}% - 4px)`
                          }}
                        >
                          {/* Start time → physical LEFT (justify-end in RTL flex) */}
                          <div className="flex justify-end">
                            <span className="text-[9px] font-bold tabular-nums leading-tight opacity-80" dir="ltr">
                              {formatMinutesToTime(slot.startMinutes, true)}
                            </span>
                          </div>

                          {/* Course Title — always shown */}
                          <p className="text-[10px] font-bold leading-tight line-clamp-2 flex-1 mt-0.5">
                            {slot.courseTitle}
                          </p>

                          {/* Bottom: Room → physical RIGHT (first in RTL flex), End time → physical LEFT (last) */}
                          <div className="flex items-center justify-between gap-1 mt-auto">
                            {slot.room ? (
                              <span className="flex items-center gap-0.5 text-[9px] font-bold opacity-80 truncate">
                                <MapPin className="w-2 h-2 shrink-0" />
                                <span>{slot.room}</span>
                              </span>
                            ) : <span />}
                            <span className="text-[9px] font-semibold tabular-nums opacity-70 shrink-0" dir="ltr">
                              {formatMinutesToTime(slot.endMinutes, true)}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Interactive Lecture Detail Modal ─── */}
      <AnimatePresence>
        {selectedSlot && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            dir="rtl"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 dark:bg-black/70 backdrop-blur-sm cursor-pointer"
              onClick={() => setSelectedSlot(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 48 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full sm:max-w-sm bg-white dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl space-y-4 z-10"
              dir="rtl"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 border ${COURSE_CARD_PALETTES[selectedSlot.colorIndex].bg} ${COURSE_CARD_PALETTES[selectedSlot.colorIndex].border} ${COURSE_CARD_PALETTES[selectedSlot.colorIndex].accent}`}
                  >
                    {selectedSlot.courseCode.slice(0, 3)}
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
                      {selectedSlot.courseTitle}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                      <span className="font-bold text-[var(--color-imamu-accent)]" dir="ltr">
                        {selectedSlot.courseCode}
                      </span>
                      {selectedSlot.sectionNumber && (
                        <span>· شعبة {selectedSlot.sectionNumber}</span>
                      )}
                      {selectedSlot.crn && <span>· CRN: {selectedSlot.crn}</span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Details Grid */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/80 dark:border-zinc-800 space-y-3 text-xs">
                {/* Day & Timing */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                    <Clock className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                    <span>الموعد واليوم:</span>
                  </div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 text-xs">
                    <span>{selectedSlot.day}</span>
                    <span className="text-slate-400 font-normal">·</span>
                    <span className="inline-flex items-center gap-1" dir="ltr">
                      <span>{formatMinutesToTime(selectedSlot.startMinutes, true)}</span>
                      <span className="text-slate-400 font-normal">→</span>
                      <span>{formatMinutesToTime(selectedSlot.endMinutes, true)}</span>
                    </span>
                  </div>
                </div>

                {/* Duration */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                    <Sparkles className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                    <span>المدة الزمنية:</span>
                  </div>
                  <span className="font-bold text-slate-700 dark:text-zinc-300">
                    {selectedSlot.endMinutes - selectedSlot.startMinutes} دقيقة
                  </span>
                </div>

                {/* Classroom / Location */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                    <MapPin className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                    <span>الموقع والقاعة:</span>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {selectedSlot.room ? `قاعة ${selectedSlot.room}` : 'غير محددة'}
                    {selectedSlot.building ? ` (مبنى ${selectedSlot.building})` : ''}
                  </span>
                </div>

                {/* Instructor */}
                <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                    <User className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                    <span className="font-semibold">
                      {selectedSlot.instructors && selectedSlot.instructors.length > 1 ? 'أساتذة المادة:' : 'أستاذ المادة:'}
                    </span>
                  </div>
                  {selectedSlot.instructors && selectedSlot.instructors.length > 0 ? (
                    <div className="flex flex-col gap-1.5 pr-6">
                      {selectedSlot.instructors.map((inst, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-900 dark:text-white">
                            {inst.name}
                            {inst.isPrimary && selectedSlot.instructors!.length > 1 && (
                              <span
                                className="mr-1.5 px-1.5 py-0.5 text-[10px] font-normal rounded text-[var(--color-imamu-accent)]"
                                style={{ backgroundColor: 'color-mix(in srgb, var(--color-imamu-accent) 15%, transparent)' }}
                              >
                                رئيسي
                              </span>
                            )}
                          </span>
                          {inst.email && (
                            <span className="text-[11px] text-slate-400 font-mono dir-ltr">{inst.email}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="font-bold text-slate-900 dark:text-white pr-6 text-xs">
                      {selectedSlot.primaryInstructor || 'غير مسجل'}
                    </span>
                  )}
                </div>
              </div>

              {/* WhatsApp Link button if present */}
              {selectedSlot.whatsappLink ? (
                <a
                  href={selectedSlot.whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <WhatsappIcon className="w-4 h-4 fill-current" />
                  <span>انضمام لقروب واتساب الشعبة</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectedSlot(null)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold transition cursor-pointer"
                >
                  إغلاق
                </button>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
