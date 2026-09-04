'use client';

import React, { useState, useEffect, memo } from 'react';
import { motion } from 'motion/react';
import { 
  Calculator, 
  BookOpen, 
  Calendar, 
  Newspaper, 
  Clock, 
  ChevronLeft, 
  ExternalLink, 
  ArrowUpRight, 
  Award,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { 
  AnimatedNumber, 
  InView, 
  SpotlightCard, 
  TextEffect
} from '../components/ui';
import { 
  parseDate, 
  getCountdown, 
  calculateMokafaaDate, 
  calculateProgressPercent 
} from '../lib/date-utils';

const DynamicConfetti = dynamic(() => import('react-confetti'), { ssr: false });

const features = [
  {
    id: 'gpa',
    name: 'الأدوات الأكاديمية',
    description: 'احسب معدلك الفصلي والتراكمي بدقة متناهية وفق سلم جامعة الإمام، وتعرف على السيناريوهات المستقبلية للرفع من معدلك.',
    icon: Calculator,
    path: '/tools',
    badge: 'الأكثر استخداماً',
    color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    spotlight: 'rgba(245, 158, 11, 0.15)',
  },
  {
    id: 'resources',
    name: 'المصادر والملفات الطلابية',
    description: 'مكتبة شاملة تحتوي على ملفات PDF، اختبارات سابقة، تجميعات معتمدة، وروابط مجموعات الواتساب الأكاديمية لكل مادة.',
    icon: BookOpen,
    path: '/resources',
    badge: 'تحديثات مستمرة',
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    spotlight: 'rgba(99, 102, 241, 0.15)',
  },
  {
    id: 'calendar',
    name: 'التقويم الأكاديمي',
    description: 'متابعة حية للمواعيد الأكاديمية الرسمية، بداية ونهاية الفصول، فترات الاختبارات النهائية، ومواعيد إيداع المكافأة.',
    icon: Calendar,
    path: '/calendar',
    badge: 'تحديثات مباشرة',
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    spotlight: 'rgba(16, 185, 129, 0.15)',
  },
  {
    id: 'news',
    name: 'أخبار جامعة الإمام',
    description: 'تغطية فورية ومركزة لأهم الإعلانات، والقرارات الأكاديمية، والفعاليات الجامعية مباشرة من المصادر المعتمدة.',
    icon: Newspaper,
    path: '/news',
    badge: 'إعلانات عاجلة',
    color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    spotlight: 'rgba(168, 85, 247, 0.15)',
  },
];

function useCurrentTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

function getCountdownValues(now: Date, targetDate: Date | null) {
  return getCountdown(targetDate, now);
}

const CountdownBox = memo(function CountdownBox({ value, label, hoverBorderClass = 'hover:border-[var(--color-imamu-accent)]' }: { value: number, label: string, hoverBorderClass?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center bg-slate-100/90 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/80 backdrop-blur-md rounded-2xl py-2.5 px-1.5 sm:py-3 sm:px-3 flex-1 min-w-[50px] sm:min-w-[70px] shadow-2xs transition-all duration-300 ${hoverBorderClass}`}>
      <span className="text-lg sm:text-2xl font-serif font-extrabold text-slate-900 dark:text-white tracking-tight">
        <AnimatedNumber value={value} padZeroes={2} />
      </span>
      <span className="text-[10px] sm:text-xs text-slate-500 dark:text-zinc-400 font-semibold tracking-wider mt-0.5">{label}</span>
    </div>
  );
});

const LiveCountdownBoxes = memo(function LiveCountdownBoxes({ targetDate, hoverBorderClass = 'hover:border-[var(--color-imamu-accent)]' }: { targetDate: Date | null, hoverBorderClass?: string }) {
  const now = useCurrentTime();
  const time = getCountdown(targetDate, now);
  return (
    <div className="flex w-full justify-center gap-1 sm:gap-2.5 px-1" dir="rtl">
      <CountdownBox value={time.days} label="أيام" hoverBorderClass={hoverBorderClass} />
      <CountdownBox value={time.hours} label="ساعات" hoverBorderClass={hoverBorderClass} />
      <CountdownBox value={time.minutes} label="دقائق" hoverBorderClass={hoverBorderClass} />
      <CountdownBox value={time.seconds} label="ثواني" hoverBorderClass={hoverBorderClass} />
    </div>
  );
});

const VerticalLinesProgressBar = memo(function VerticalLinesProgressBar({ 
  percent, 
  activeColorClass = 'bg-[var(--color-imamu-brown)]',
  lineCount = 30
}: { 
  percent: number; 
  activeColorClass?: string;
  lineCount?: number;
}) {
  const normalizedPercent = Math.min(100, Math.max(0, percent));
  const activeLines = Math.round((normalizedPercent / 100) * lineCount);

  return (
    <div className="w-full mt-3 sm:mt-4 flex flex-col gap-1 px-0.5" dir="rtl">
      <div className="flex items-center gap-2 w-full">
        <span className="font-mono text-[11px] font-extrabold text-slate-500 dark:text-zinc-400 shrink-0 -mb-0.5">
          {Math.round(normalizedPercent)}%
        </span>
        <div className="flex items-center gap-[2px] flex-1 h-[14px] sm:h-[16px]">
          {Array.from({ length: lineCount }).map((_, idx) => {
            const isActive = idx < activeLines;
            return (
              <div
                key={idx}
                className={`flex-1 h-full rounded-[2px] transition-all duration-300 ${
                  isActive 
                    ? `${activeColorClass} shadow-xs scale-y-100` 
                    : 'bg-slate-200 dark:bg-zinc-800 scale-y-80 opacity-50'
                }`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
});

function CountdownsSection() {
  const [settings, setSettings] = useState<{semesterStartDate?: string, semesterEndDate?: string} | null>(null);
  const [nextMokafaaDate, setNextMokafaaDate] = useState<Date | null>(null);
  const [nextHoliday, setNextHoliday] = useState<{ title: string; date: Date; description?: string } | null>(null);
  const [isMokafaaToday, setIsMokafaaToday] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.ok ? r.json() : {}),
      fetch('/api/events').then(r => r.ok ? r.json() : [])
    ]).then(([s, events]) => {
      setSettings(s);
      
      const now = new Date();
      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      
      // Mokafaa Calculation
      const mokafaaEvents = events
        .filter((e: any) => e.title.toLowerCase().includes('mokafaa') || e.title.includes('مكافأة') || e.title.includes('المكافأة'))
        .map((e: any) => parseDate(e.date))
        .filter((d: Date | null): d is Date => d !== null)
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());

      let upcomingMokafaa = mokafaaEvents.find((d: Date) => d >= todayStart);
      
      if (!upcomingMokafaa) {
        upcomingMokafaa = calculateMokafaaDate(now.getFullYear(), now.getMonth());
        if (upcomingMokafaa < todayStart) {
          upcomingMokafaa = calculateMokafaaDate(now.getFullYear(), now.getMonth() + 1);
        }
      }

      setNextMokafaaDate(upcomingMokafaa);
      
      if (upcomingMokafaa && 
          now.getFullYear() === upcomingMokafaa.getFullYear() && 
          now.getMonth() === upcomingMokafaa.getMonth() && 
          now.getDate() === upcomingMokafaa.getDate()) {
        setIsMokafaaToday(true);
        setShowConfetti(true);
      }

      // Next Holiday Calculation (strictly relying on database flags)
      const holidayEvents = events
        .filter((e: any) => e.isHoliday || e.isHolidayEnd || e.isEid || e.isNationalDay)
        .map((e: any) => ({
          title: e.title,
          date: parseDate(e.date),
          description: e.description,
          isEid: !!e.isEid,
          isNationalDay: !!e.isNationalDay,
          isHolidayEnd: !!e.isHolidayEnd
        }))
        .filter((e: any): e is { title: string; date: Date; description?: string; isEid: boolean; isNationalDay: boolean; isHolidayEnd: boolean } => e.date !== null && e.date >= todayStart)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      if (holidayEvents.length > 0) {
        setNextHoliday(holidayEvents[0]);
      } else {
        setNextHoliday(null);
      }

      // Check for Active Celebration (National Day or Eid) strictly by boolean flags
      const hasNationalDay = events.some((e: any) => {
        const d = parseDate(e.date);
        return e.isNationalDay && d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      });

      const hasEid = events.some((e: any) => {
        const d = parseDate(e.date);
        return e.isEid && d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      });

      if (hasNationalDay) setIsNationalDayToday(true);
      if (hasEid) setIsEidToday(true);
      if (hasNationalDay || hasEid) setShowConfetti(true);

      // Semester Start & End Dates Calculation directly from Events table flags
      const startEvents = events
        .filter((e: any) => e.isSemesterStart)
        .map((e: any) => parseDate(e.date))
        .filter((d: Date | null): d is Date => d !== null)
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());

      const endEvents = events
        .filter((e: any) => e.isSemesterEnd)
        .map((e: any) => parseDate(e.date))
        .filter((d: Date | null): d is Date => d !== null)
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());

      // Determine active semester vs break period
      const lastStart = [...startEvents].reverse().find((d: Date) => d <= todayStart) || null;
      const upcomingEnd = endEvents.find((d: Date) => d >= todayStart) || null;
      const upcomingStart = startEvents.find((d: Date) => d > todayStart) || null;

      let calcStart: Date | null = null;
      let calcTarget: Date | null = null;
      let calcLabel = "يبدأ الفصل الدراسي خلال";

      if (lastStart && upcomingEnd && lastStart <= upcomingEnd) {
        // Active Semester: Today is between a start and an end
        calcStart = lastStart;
        calcTarget = upcomingEnd;
        calcLabel = "ينتهي الفصل الدراسي خلال";
      } else if (upcomingStart) {
        // Break Period: Today is between an end and a start
        calcStart = [...endEvents].reverse().find((d: Date) => d < upcomingStart) || null;
        calcTarget = upcomingStart;
        calcLabel = "يبدأ الفصل الدراسي خلال";
      } else if (upcomingEnd) {
        calcTarget = upcomingEnd;
        calcLabel = "ينتهي الفصل الدراسي خلال";
      }

      setSemesterInfo({ start: calcStart, target: calcTarget, label: calcLabel });
    }).catch(() => {});
  }, []);

  const [semesterInfo, setSemesterInfo] = useState<{ start: Date | null; target: Date | null; label: string }>({ 
    start: null, 
    target: null, 
    label: "ينتهي الفصل الدراسي خلال" 
  });
  const [isNationalDayToday, setIsNationalDayToday] = useState(false);
  const [isEidToday, setIsEidToday] = useState(false);

  const semesterTargetDate: Date | null = semesterInfo.target;
  const semesterLabel: string = semesterInfo.label;
  const semesterStartDateObj: Date | null = semesterInfo.start;

  // Calculate Progress Percentages for the Vertical Line Progress Bars
  const nowTime = new Date();

  // 1. Mokafaa Percent (Monthly Payout progress e.g. from 27th of prev month to 27th of target month)
  let mokafaaPercent = 0;
  if (nextMokafaaDate) {
    const prevMokafaaDate = calculateMokafaaDate(nextMokafaaDate.getFullYear(), nextMokafaaDate.getMonth() - 1);
    mokafaaPercent = calculateProgressPercent(prevMokafaaDate, nextMokafaaDate, nowTime);
  }

  // 2. Semester Percent
  let semesterPercent = 0;
  if (semesterStartDateObj && semesterTargetDate) {
    semesterPercent = calculateProgressPercent(semesterStartDateObj, semesterTargetDate, nowTime);
  } else if (semesterTargetDate) {
    // Fallback: estimate progress relative to a 100-day term
    const defaultStart = new Date(semesterTargetDate.getTime() - 100 * 24 * 60 * 60 * 1000);
    semesterPercent = calculateProgressPercent(defaultStart, semesterTargetDate, nowTime);
  }

  // 3. Holiday Percent
  let holidayPercent = 0;
  if (nextHoliday) {
    const holidayTargetTime = nextHoliday.date;
    const holidayStartTime = new Date(holidayTargetTime.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days window
    holidayPercent = calculateProgressPercent(holidayStartTime, holidayTargetTime, nowTime);
  }

  return (
    <>
      {showConfetti && (
        <DynamicConfetti 
          width={windowSize.width} 
          height={windowSize.height} 
          recycle={false} 
          numberOfPieces={350} 
          gravity={0.12}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none' }}
        />
      )}

      {/* Saudi National Day Sticky Edge-to-Edge Info Bar */}
      {isNationalDayToday && (
        <div className="sticky top-16 z-40 w-full bg-gradient-to-r from-emerald-950/95 via-emerald-900/95 to-emerald-950/95 border-b border-emerald-500/40 backdrop-blur-xl px-4 py-3 text-center text-white shadow-xl flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 animate-[fadeIn_0.5s_ease-out]">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl animate-bounce">🇸🇦</span>
            <h2 className="text-xs sm:text-sm font-serif font-black text-emerald-300 tracking-wide">
              نعتز بنهضتنا وهويتنا - نحتفي باليوم الوطني السعودي! 🇸🇦
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-emerald-100 font-medium max-w-xl truncate">
            دمت يا وطني شامخاً عزيزاً، وكل عام والمملكة وشعبها المعطاء في عزة وازدهار.
          </p>
        </div>
      )}

      {/* Eid Celebration Sticky Edge-to-Edge Info Bar */}
      {isEidToday && (
        <div className="sticky top-16 z-40 w-full bg-gradient-to-r from-amber-950/95 via-amber-900/95 to-amber-950/95 border-b border-amber-500/40 backdrop-blur-xl px-4 py-3 text-center text-white shadow-xl flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 animate-[fadeIn_0.5s_ease-out]">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl">🌙</span>
            <h2 className="text-xs sm:text-sm font-serif font-black text-amber-300 tracking-wide">
              تقبل الله منا ومنكم صالح الأعمال - عيد مبارك! ✨
            </h2>
          </div>
          <p className="text-[11px] sm:text-xs text-amber-100 font-medium max-w-xl truncate">
            أسعد الله أيامكم، وكل عام وأنتم وعائلاتكم بألف خير وسعادة.
          </p>
        </div>
      )}

      <InView preset="fade-up" delay={0.15} className="w-full max-w-6xl px-4 mt-12 sm:mt-16 flex flex-col gap-8 sm:gap-10 relative">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-6 w-full" dir="rtl">

        
        {/* Mokafaa Countdown */}
        {nextMokafaaDate && (
          <SpotlightCard 
            spotlightColor="rgba(245, 158, 11, 0.12)"
            className="flex-1 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden w-full"
          >
            <div className="w-full">
              <div className="flex items-center justify-center gap-2.5 mb-4 w-full">
                <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] shrink-0">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">موعد المكافأة القادمة</h3>
              </div>
              
              {isMokafaaToday ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-4 rounded-2xl shadow-2xs relative overflow-hidden flex flex-col items-center justify-center w-full">
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 z-10 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
                    اليوم نزلت المكافأة!
                  </span>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-300 mt-1 font-medium z-10 text-center leading-relaxed">
                    تفقّد حسابك البنكي، تم إيداع المكافأة الرسمية!
                  </p>
                </div>
              ) : (
                <LiveCountdownBoxes targetDate={nextMokafaaDate} hoverBorderClass="hover:border-amber-500/40" />
              )}
            </div>

            {/* Vertical Lines Progress Bar for Mokafaa */}
            <VerticalLinesProgressBar 
              percent={mokafaaPercent} 
              activeColorClass="bg-amber-500 shadow-amber-500/40"
              lineCount={30}
            />
          </SpotlightCard>
        )}

        {/* Semester Countdown */}
        <SpotlightCard 
          spotlightColor="rgba(99, 102, 241, 0.12)"
          className="flex-1 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden w-full"
        >
          <div className="w-full">
            <div className="flex items-center justify-center gap-2.5 mb-4 w-full">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl text-indigo-600 dark:text-indigo-400 shrink-0">
                <Calendar className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={semesterTargetDate ? semesterLabel : "العد التنازلي للفصل الدراسي"}>
                {semesterTargetDate ? semesterLabel : "العد التنازلي للفصل الدراسي"}
              </h3>
            </div>
            {semesterTargetDate ? (
              <LiveCountdownBoxes targetDate={semesterTargetDate} hoverBorderClass="hover:border-indigo-500/40" />
            ) : (
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium py-3">
                {semesterLabel === "يبدأ الفصل الدراسي خلال" && !semesterTargetDate ? "لم يتم تحديد المواعيد الأكاديمية بعد." : semesterLabel}
              </p>
            )}
          </div>

          {/* Vertical Lines Progress Bar for Semester */}
          <VerticalLinesProgressBar 
            percent={semesterPercent} 
            activeColorClass="bg-indigo-600 shadow-indigo-600/40"
            lineCount={30}
          />
        </SpotlightCard>

        {/* Next Holiday Countdown Card */}
        <SpotlightCard 
          spotlightColor="rgba(16, 185, 129, 0.12)"
          className="flex-1 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden w-full"
        >
          <div className="w-full">
            <div className="flex items-center justify-center gap-2.5 mb-4 w-full">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-600 dark:text-emerald-400 shrink-0">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate" title={nextHoliday?.title || "موعد الإجازة القادمة"}>
                {nextHoliday?.title || "موعد الإجازة القادمة"}
              </h3>
            </div>
            {nextHoliday?.date ? (
              <LiveCountdownBoxes targetDate={nextHoliday.date} hoverBorderClass="hover:border-emerald-500/40" />
            ) : (
              <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium py-3">
                لم يتم تحديد موعد الإجازة القادمة في التقويم بعد.
              </p>
            )}
          </div>

          {/* Vertical Lines Progress Bar for Next Holiday */}
          <VerticalLinesProgressBar 
            percent={holidayPercent} 
            activeColorClass="bg-emerald-500 shadow-emerald-500/40"
            lineCount={30}
          />
        </SpotlightCard>

      </div>



      {/* External Student Platforms */}
      <SpotlightCard 
        spotlightColor="color-mix(in srgb, var(--color-imamu-brown) 12%, transparent)"
        className="w-full bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-6 sm:p-7 shadow-sm text-right" 
      >
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-xs font-bold text-[var(--color-imamu-accent)] uppercase tracking-widest flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-[var(--color-imamu-accent)]" /> 
            منصات وأدوات خارجية تهمك
          </h4>
          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--color-imamu-brown)]/10 text-[var(--color-imamu-accent)] border border-[var(--color-imamu-brown)]/20">
            روابط سريعة
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
          {/* Msari */}
          <a 
            href="https://msari.vercel.app/index.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 p-4 bg-slate-50/80 dark:bg-zinc-950/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl hover:border-[var(--color-imamu-accent)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-right w-full"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 p-2 shadow-2xs group-hover:border-emerald-500/50 transition-colors text-emerald-600 dark:text-emerald-400 font-black text-xs">
                مساري
              </div>
              <div className="text-right min-w-0">
                <h5 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-[var(--color-imamu-accent)] dark:group-hover:text-[var(--color-imamu-accent)] transition-colors">منصة مساري</h5>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">خارطة رحلتك الأكاديمية</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-[var(--color-imamu-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </a>

          {/* Qeeem */}
          <a 
            href="https://qeeem.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 p-4 bg-slate-50/80 dark:bg-zinc-950/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl hover:border-[var(--color-imamu-accent)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-right w-full"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shrink-0 border border-slate-200 dark:border-zinc-800 p-2 shadow-2xs group-hover:border-[var(--color-imamu-accent)]/50 transition-colors">
                <img src="https://qeeem.com/logo.svg" className="w-full h-full object-contain" alt="Qeeem Logo" />
              </div>
              <div className="text-right min-w-0">
                <h5 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-[var(--color-imamu-accent)] dark:group-hover:text-[var(--color-imamu-accent)] transition-colors">منصة قيم</h5>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">تقييم ومراجعات الدكاترة</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-[var(--color-imamu-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </a>

          {/* Trtebh */}
          <a 
            href="https://trtebh.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 p-4 bg-slate-50/80 dark:bg-zinc-950/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl hover:border-[var(--color-imamu-accent)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-right w-full"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shrink-0 border border-slate-200 dark:border-zinc-800 p-2 shadow-2xs group-hover:border-[var(--color-imamu-accent)]/50 transition-colors">
                <img src="https://trtebh.com/brand/favicon-32x32.png" className="w-full h-full object-contain rounded" alt="Trtebh Logo" />
              </div>
              <div className="text-right min-w-0">
                <h5 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-[var(--color-imamu-accent)] dark:group-hover:text-[var(--color-imamu-accent)] transition-colors">منصة ترتيبة</h5>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">بناء الجداول التلقائية</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-[var(--color-imamu-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </a>

          {/* Moqraraty */}
          <a 
            href="https://moqraraty.com/ar" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 p-4 bg-slate-50/80 dark:bg-zinc-950/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl hover:border-[var(--color-imamu-accent)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-right w-full"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shrink-0 border border-slate-200 dark:border-zinc-800 p-2 shadow-2xs group-hover:border-[var(--color-imamu-accent)]/50 transition-colors">
                <img src="https://moqraraty.com/logo.png" className="w-full h-full object-contain rounded" alt="Moqraraty Logo" />
              </div>
              <div className="text-right min-w-0">
                <h5 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-[var(--color-imamu-accent)] dark:group-hover:text-[var(--color-imamu-accent)] transition-colors">منصة مقرراتي</h5>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">متابعة الواجبات والغياب</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-[var(--color-imamu-accent)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </a>
        </div>
      </SpotlightCard>
    </InView>
    </>
  );
}

export function Home() {
  return (
    <div className="flex flex-col items-center flex-1 w-full pt-16 sm:pt-28 pb-0 bg-transparent" dir="rtl">
      {/* Hero Section */}
      <div className="text-center max-w-4xl px-4 flex flex-col items-center relative z-10">
        
        {/* Clean Eyebrow Title */}
        <InView preset="fade-down" delay={0.05}>
          <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-zinc-400 mb-5 block">
            منصة طلابية مستقلة غير رسمية لطلاب جامعة الإمام
          </span>
        </InView>

        {/* Staggered Text Effect Title */}
        <TextEffect 
          per="word" 
          preset="slide" 
          delay={0.1}
          className="text-4xl sm:text-6xl md:text-7xl font-serif font-extrabold tracking-tight text-slate-900 dark:text-white mb-8 leading-[1.15] justify-center"
        >
          مسيرتك الأكاديمية، أسهل وأوضح مع مساعد الإمام.
        </TextEffect>

        {/* Subtitle with Clean Connected Arabic Typography */}
        <InView preset="fade-up" delay={0.25} className="max-w-2xl mx-auto mb-12 sm:mb-14 text-center">
          <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-zinc-400 font-medium leading-relaxed sm:leading-loose">
            صُممت المنصة بأيدي الطلاب لتلبي كافة الاحتياجات الأكاديمية. احسب معدلك التراكمي بدقة، تصفح المصادر والاختبارات السابقة، وتتبع التقويم الأكاديمي بيسر وسهولة.
          </p>
        </InView>
        
        {/* Action Buttons Matching Card Radii & Single Line Layout */}
        <InView preset="scale-up" delay={0.35} className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md">
          <Link 
            href="/tools" 
            className="px-6.5 py-3.5 rounded-2xl bg-[var(--color-imamu-brown)] text-[var(--btn-text-primary)] hover:opacity-90 font-bold text-sm sm:text-base shadow-md active:scale-95 transition-all duration-200 w-full sm:w-auto text-center flex items-center justify-center gap-2.5 whitespace-nowrap group"
          >
            <Calculator className="w-4.5 h-4.5 shrink-0" />
            <span>الأدوات وحاسبة المعدل</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform shrink-0" />
          </Link>
          <Link 
            href="/resources" 
            className="px-6.5 py-3.5 rounded-2xl bg-slate-100/90 dark:bg-zinc-900/90 hover:bg-slate-200/80 dark:hover:bg-zinc-800/90 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 font-bold text-sm sm:text-base shadow-2xs backdrop-blur-md active:scale-95 transition-all duration-200 w-full sm:w-auto text-center flex items-center justify-center gap-2.5 whitespace-nowrap group"
          >
            <BookOpen className="w-4 h-4 text-slate-500 dark:text-zinc-400 shrink-0" />
            <span>المصادر والتجميعات</span>
          </Link>
        </InView>
      </div>

      {/* Countdowns & External Tools Section */}
      <CountdownsSection />

      {/* Features Grid */}
      <InView preset="fade-up" delay={0.2} className="w-full max-w-5xl px-4 mt-28 sm:mt-40">
        <div className="flex flex-col items-center text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl font-serif font-extrabold text-slate-900 dark:text-white mb-3">
            جميع الخدمات في مكان واحد
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 max-w-lg leading-relaxed">
            كل ما يحتاجه طالب وطالبة جامعة الإمام في تجربة سلسة ومنظمة.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8" dir="rtl">
          {features.map((feat) => (
            <Link key={feat.id} href={feat.path} className="block group">
              <SpotlightCard 
                spotlightColor={feat.spotlight} 
                className="h-full border border-slate-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl p-7 sm:p-8 hover:border-[var(--color-imamu-accent)] transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 rounded-2xl ${feat.color} border flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform duration-300`}>
                    <feat.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400">
                    {feat.badge}
                  </span>
                </div>
                
                <h3 className="text-xl font-serif font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between group-hover:text-[var(--color-imamu-accent)] dark:group-hover:text-[var(--color-imamu-accent)] transition-colors">
                  <span>{feat.name}</span>
                  <ChevronLeft className="w-5 h-5 text-slate-400 dark:text-zinc-500 group-hover:-translate-x-1 group-hover:text-[var(--color-imamu-accent)] transition-all" />
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {feat.description}
                </p>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      </InView>

    </div>
  );
}
