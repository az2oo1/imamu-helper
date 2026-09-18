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
  const padded = h12 < 10 ? `0${h12}` : `${h12}`;
  return `${padded}:00 ${period}`;
}

// ─────────────────────────────────────────────
// Component: WeeklySchedule
// ─────────────────────────────────────────────
export function WeeklySchedule({ sections, className = '' }: WeeklyScheduleProps) {
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
      const colorIndex = secIdx % COURSE_CARD_PALETTES.length;
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
      // When there's something: BIGGER (108px)
      // When there's nothing: SMALLER (34px)
      const height = hasClass ? 108 : 34;
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
              {isTodayInSchoolWeek && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>اليوم الدراسي: {activeTodayDay?.label}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-zinc-500">
              {todayClassesCount > 0
                ? `لديك اليوم ${todayClassesCount} محاضرات · المجموع ${totalClassesCount} أسبوعياً`
                : `${totalClassesCount} موعد دراسي مسجل بالأسبوع`}
            </p>
          </div>
        </div>

        {/* Legend / Live Indicator note */}
        <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400">
          {isTodayInSchoolWeek && isCurrentTimeWithinGrid && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[11px] font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span>الوقت الحالي: {formatMinutesToTime(currentTotalMinutes)}</span>
            </div>
          )}
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
            <div className="grid grid-cols-[64px_repeat(5,1fr)] border-b border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/60 sticky top-0 z-20 backdrop-blur-xs">
              {/* Rightmost integrated cell: Time header */}
              <div className="py-3 px-2 text-center border-l border-slate-200/80 dark:border-zinc-800/80 flex items-center justify-center gap-1 text-slate-500 dark:text-zinc-400 font-bold text-xs">
                <Clock className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                <span>الوقت</span>
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
              className="grid grid-cols-[64px_repeat(5,1fr)] relative"
              style={{ height: `${totalGridHeight}px` }}
            >
              {/* ── Integrated Time Column (Right Side - Shares same style and background) ── */}
              <div className="relative border-l border-slate-200/80 dark:border-zinc-800/80 select-none">
                {hourConfigs.hours.map(item => (
                  <div
                    key={item.hour}
                    className={`absolute inset-x-0 flex items-center justify-center transition-colors border-t border-slate-100/80 dark:border-zinc-800/60 ${
                      item.hasClass
                        ? 'pt-2 items-start'
                        : 'bg-slate-50/40 dark:bg-zinc-950/25'
                    }`}
                    style={{ top: `${item.y}px`, height: `${item.height}px` }}
                  >
                    <span
                      className={
                        item.hasClass
                          ? 'text-[11px] font-black text-slate-800 dark:text-zinc-200'
                          : 'text-[10px] font-semibold text-slate-400 dark:text-zinc-600'
                      }
                    >
                      {formatHourLabel(item.hour)}
                    </span>
                  </div>
                ))}

                {/* Live Current Time Badge in Time Column */}
                {isTodayInSchoolWeek && isCurrentTimeWithinGrid && (
                  <div
                    className="absolute inset-x-0 z-20 pointer-events-none flex items-center justify-center -translate-y-1/2"
                    style={{ top: `${currentTimeY}px` }}
                  >
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-rose-500 text-white shadow-xs">
                      {formatMinutesToTime(currentTotalMinutes).replace(/\s+/g, '')}
                    </span>
                  </div>
                )}
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
                    {/* Horizontal Hour Lines & Empty Row Tints */}
                    {hourConfigs.hours.map(item => (
                      <div
                        key={item.hour}
                        className={`absolute inset-x-0 border-t pointer-events-none transition-colors ${
                          item.hasClass
                            ? 'border-slate-100 dark:border-zinc-800/60'
                            : 'border-slate-100/60 dark:border-zinc-800/30 bg-slate-50/30 dark:bg-zinc-950/20'
                        }`}
                        style={{ top: `${item.y}px`, height: `${item.height}px` }}
                      />
                    ))}

                    {/* Subtle Current Time Guideline across all days */}
                    {isCurrentTimeWithinGrid && (
                      <div
                        className="absolute inset-x-0 z-10 pointer-events-none border-t border-rose-500/25"
                        style={{ top: `${currentTimeY}px` }}
                      />
                    )}

                    {/* ── LIVE CURRENT TIME INDICATOR LINE (Across Today Column) ── */}
                    {isToday && isCurrentTimeWithinGrid && (
                      <div
                        className="absolute inset-x-0 z-20 pointer-events-none flex items-center"
                        style={{ top: `${currentTimeY}px` }}
                      >
                        {/* Red Line */}
                        <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />

                        {/* Glowing Red Dot at the Right edge of the column */}
                        <div className="absolute right-0 -translate-y-1/2 translate-x-1.5 w-3 h-3 rounded-full bg-rose-500 border-2 border-white dark:border-zinc-900 shadow-md ring-4 ring-rose-500/25 animate-pulse" />
                      </div>
                    )}

                    {/* ── Positioned Class Cards for This Day ── */}
                    {slots.map(slot => {
                      const top = getY(slot.startMinutes);
                      const bottom = getY(slot.endMinutes);
                      const height = Math.max(42, bottom - top - 4); // 4px margin

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
                          className={`absolute p-2 sm:p-2.5 rounded-2xl border transition-all duration-150 cursor-pointer shadow-xs flex flex-col justify-between overflow-hidden group ${palette.bg} ${palette.border} ${
                            isNowActive ? 'ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-zinc-900 shadow-md' : ''
                          }`}
                          style={{
                            top: `${top + 2}px`,
                            height: `${height}px`,
                            right: `calc(${rightOffsetPercent}% + 2px)`,
                            width: `calc(${widthPercent}% - 4px)`
                          }}
                        >
                          {/* Top: Course code + Now active indicator */}
                          <div className="min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span
                                className="text-xs font-black truncate text-slate-900 dark:text-white"
                                dir="ltr"
                              >
                                {slot.courseCode}
                              </span>

                              {isNowActive ? (
                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[8px] font-black shrink-0 shadow-xs animate-pulse">
                                  <span className="w-1 h-1 rounded-full bg-white" />
                                  الآن
                                </span>
                              ) : slot.sectionNumber ? (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-white/60 dark:bg-zinc-800/60 text-slate-600 dark:text-zinc-300 shrink-0">
                                  ش {slot.sectionNumber}
                                </span>
                              ) : null}
                            </div>

                            {/* Course Title - shown when height is adequate */}
                            {height >= 60 && (
                              <p className="text-[11px] font-semibold text-slate-700 dark:text-zinc-200 truncate leading-tight">
                                {slot.courseTitle}
                              </p>
                            )}
                          </div>

                          {/* Bottom info: Time range & Room */}
                          <div className="pt-0.5 mt-0.5 flex items-center justify-between text-[10px] text-slate-500 dark:text-zinc-400 gap-1 border-t border-black/5 dark:border-white/5">
                            <span className="font-semibold truncate" dir="ltr">
                              {formatMinutesToTime(slot.startMinutes, true)}
                            </span>

                            {slot.room && (
                              <span className="flex items-center gap-0.5 text-slate-700 dark:text-zinc-300 font-bold truncate">
                                <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                                <span>{slot.room}</span>
                              </span>
                            )}
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
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs"
            onClick={() => setSelectedSlot(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2 }}
              onClick={e => e.stopPropagation()}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4"
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
                  <div className="font-bold text-slate-900 dark:text-white text-left" dir="ltr">
                    <span>{selectedSlot.day} · {formatMinutesToTime(selectedSlot.startMinutes, true)} → {formatMinutesToTime(selectedSlot.endMinutes, true)}</span>
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
                              <span className="mr-1.5 px-1.5 py-0.5 text-[10px] font-normal rounded bg-amber-500/10 text-[var(--color-imamu-accent)]">
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
