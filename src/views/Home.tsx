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

const DynamicConfetti = dynamic(() => import('react-confetti'), { ssr: false });

const features = [
  {
    id: 'gpa',
    name: 'الأدوات الأكاديمية',
    description: 'احسب معدلك الفصلي والتراكمي بدقة متناهية وفق سلم جامعة الإمام، وتعرف على السيناريوهات المستقبلية للرفع من معدلك.',
    icon: Calculator,
    path: '/tools',
    badge: 'الأكثر استخداماً',
    color: 'text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20',
    spotlight: 'rgba(37, 99, 235, 0.15)',
  },
  {
    id: 'resources',
    name: 'المصادر والملفات الطلابية',
    description: 'مكتبة شاملة تحتوي على ملفات PDF، اختبارات سابقة، تجميعات معتمدة، وروابط مجموعات الواتساب الأكاديمية لكل مادة.',
    icon: BookOpen,
    path: '/resources',
    badge: 'تحديثات مستمرة',
    color: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20',
    spotlight: 'rgba(217, 119, 6, 0.15)',
  },
  {
    id: 'calendar',
    name: 'التقويم الأكاديمي',
    description: 'متابعة حية للمواعيد الأكاديمية الرسمية، بداية ونهاية الفصول، فترات الاختبارات النهائية، ومواعيد إيداع المكافأة.',
    icon: Calendar,
    path: '/calendar',
    badge: 'تحديثات مباشرة',
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    spotlight: 'rgba(5, 150, 105, 0.15)',
  },
  {
    id: 'news',
    name: 'أخبار جامعة الإمام',
    description: 'تغطية فورية ومركزة لأهم الإعلانات، والقرارات الأكاديمية، والفعاليات الجامعية مباشرة من المصادر المعتمدة.',
    icon: Newspaper,
    path: '/news',
    badge: 'إعلانات عاجلة',
    color: 'text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/20',
    spotlight: 'rgba(147, 51, 234, 0.15)',
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
  if (!targetDate) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false, isToday: false };
  const difference = targetDate.getTime() - now.getTime();
  const isToday = now.getFullYear() === targetDate.getFullYear() && 
                  now.getMonth() === targetDate.getMonth() && 
                  now.getDate() === targetDate.getDate();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, isToday };
  } else {
    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
      isPast: false,
      isToday
    };
  }
}

const CountdownBox = memo(function CountdownBox({ value, label }: { value: number, label: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-slate-100/90 dark:bg-zinc-900/90 border border-slate-200/80 dark:border-zinc-800/80 backdrop-blur-md rounded-2xl py-3 px-2 sm:py-3.5 sm:px-4 flex-1 min-w-[56px] sm:min-w-[76px] shadow-2xs transition-all duration-300 hover:border-blue-500/40">
      <span className="text-xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white tracking-tight">
        <AnimatedNumber value={value} padZeroes={2} />
      </span>
      <span className="text-[10px] sm:text-xs text-slate-500 dark:text-zinc-400 font-semibold tracking-wider mt-0.5 sm:mt-1">{label}</span>
    </div>
  );
});

const LiveCountdownBoxes = memo(function LiveCountdownBoxes({ targetDate }: { targetDate: Date | null }) {
  const now = useCurrentTime();
  const time = getCountdownValues(now, targetDate);
  return (
    <div className="flex w-full justify-center gap-1.5 sm:gap-3 px-1" dir="rtl">
      <CountdownBox value={time.days} label="أيام" />
      <CountdownBox value={time.hours} label="ساعات" />
      <CountdownBox value={time.minutes} label="دقائق" />
      <CountdownBox value={time.seconds} label="ثواني" />
    </div>
  );
});

function CountdownsSection() {
  const [settings, setSettings] = useState<{semesterStartDate?: string, semesterEndDate?: string} | null>(null);
  const [nextMokafaaDate, setNextMokafaaDate] = useState<Date | null>(null);
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
      now.setHours(0,0,0,0);
      
      const mokafaaEvents = events
        .filter((e: any) => e.title.toLowerCase().includes('mokafaa') || e.title.includes('مكافأة') || e.title.includes('المكافأة'))
        .map((e: any) => new Date(e.date))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());

      let upcomingMokafaa = mokafaaEvents.find((d: Date) => d >= now);
      
      if (!upcomingMokafaa) {
        upcomingMokafaa = new Date(now.getFullYear(), now.getMonth(), 25);
        if (upcomingMokafaa < now) {
          upcomingMokafaa.setMonth(upcomingMokafaa.getMonth() + 1);
        }
      }

      setNextMokafaaDate(upcomingMokafaa);
      
      const today = new Date();
      if (upcomingMokafaa && 
          today.getFullYear() === upcomingMokafaa.getFullYear() && 
          today.getMonth() === upcomingMokafaa.getMonth() && 
          today.getDate() === upcomingMokafaa.getDate()) {
        setIsMokafaaToday(true);
        setShowConfetti(true);
      }
    }).catch(() => {});
  }, []);

  let semesterTargetDate: Date | null = null;
  let semesterLabel = "يبدأ الفصل الدراسي خلال";
  
  if (settings?.semesterStartDate || settings?.semesterEndDate) {
    const start = settings.semesterStartDate ? new Date(settings.semesterStartDate) : null;
    const end = settings.semesterEndDate ? new Date(settings.semesterEndDate) : null;
    const today = new Date();
    
    if (start && today < start) {
      semesterTargetDate = start;
      semesterLabel = "يبدأ الفصل الدراسي خلال";
    } else if (end && today <= end) {
      semesterTargetDate = end;
      semesterLabel = "ينتهي الفصل الدراسي خلال";
    } else if (start && !end && today >= start) {
      semesterLabel = "بدأ الفصل الدراسي";
    } else if (end && today > end) {
      semesterLabel = "انتهى الفصل الدراسي";
    }
  }

  return (
    <InView preset="fade-up" delay={0.15} className="w-full max-w-5xl px-4 mt-24 sm:mt-36 flex flex-col gap-8 sm:gap-10 relative">
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
      
      <div className="flex flex-col md:flex-row gap-6 sm:gap-8 w-full" dir="rtl">
        {/* Mokafaa Countdown */}
        {nextMokafaaDate && (
          <SpotlightCard 
            spotlightColor="rgba(245, 158, 11, 0.12)"
            className="flex-1 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-5 sm:p-7 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden w-full"
          >
            <div className="flex items-center justify-center gap-2.5 mb-4 sm:mb-5 w-full">
              <div className="p-2 sm:p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-600 dark:text-amber-400 shrink-0">
                <Clock className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
              </div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">موعد المكافأة القادمة</h3>
            </div>
            
            {isMokafaaToday ? (
              <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-5 rounded-2xl shadow-2xs relative overflow-hidden flex flex-col items-center justify-center max-w-sm">
                <span className="text-base font-bold text-emerald-700 dark:text-emerald-400 z-10 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-500 animate-pulse" />
                  اليوم نزلت المكافأة!
                </span>
                <p className="text-xs text-emerald-600 dark:text-emerald-300 mt-1 font-medium z-10 text-center leading-relaxed">
                  تفقّد حسابك البنكي، تم إيداع المكافأة الرسمية!
                </p>
              </div>
            ) : (
              <LiveCountdownBoxes targetDate={nextMokafaaDate} />
            )}
          </SpotlightCard>
        )}

        {/* Semester Countdown */}
        <SpotlightCard 
          spotlightColor="rgba(37, 99, 235, 0.12)"
          className="flex-1 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-5 sm:p-7 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden w-full"
        >
          <div className="flex items-center justify-center gap-2.5 mb-4 sm:mb-5 w-full">
            <div className="p-2 sm:p-2.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-600 dark:text-blue-400 shrink-0">
              <Calendar className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{semesterTargetDate ? semesterLabel : "العد التنازلي للفصل الدراسي"}</h3>
          </div>
          {semesterTargetDate ? (
            <LiveCountdownBoxes targetDate={semesterTargetDate} />
          ) : (
            <p className="text-sm text-slate-500 dark:text-zinc-400 font-medium">
              {semesterLabel === "يبدأ الفصل الدراسي خلال" && !semesterTargetDate ? "لم يتم تحديد المواعيد الأكاديمية بعد." : semesterLabel}
            </p>
          )}
        </SpotlightCard>
      </div>

      {/* External Student Platforms */}
      <SpotlightCard 
        spotlightColor="rgba(99, 102, 241, 0.10)"
        className="w-full bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-zinc-800/80 rounded-3xl p-6 sm:p-7 shadow-sm text-right" 
      >
        <div className="flex items-center justify-between mb-5">
          <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" /> 
            منصات وأدوات خارجية تهمك
          </h4>
          <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            روابط سريعة
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
          {/* Msari */}
          <a 
            href="https://msari.vercel.app/index.html" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-rise group flex items-center justify-between gap-3 p-4 bg-[#0E352C] border border-[#3DC9B0]/40 rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg shadow-[#0E352C]/20 active:translate-y-0 active:scale-[0.98] text-right w-full text-white"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-[#3DC9B0]/20 border border-[#3DC9B0]/40 flex items-center justify-center shrink-0 p-2 shadow-2xs group-hover:scale-105 transition-transform overflow-hidden text-[#3DC9B0] font-black text-xs">
                مساري
              </div>
              <div className="text-right min-w-0">
                <h5 className="font-bold text-xs text-white">منصة مساري</h5>
                <p className="text-[11px] text-emerald-100/70 mt-0.5 truncate">خارطة رحلتك الأكاديمية</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-[#3DC9B0] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </a>

          {/* Qeeem */}
          <a 
            href="https://qeeem.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 p-4 bg-slate-50/80 dark:bg-zinc-950/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl hover:border-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-right w-full"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shrink-0 border border-slate-200 dark:border-zinc-800 p-2 shadow-2xs group-hover:border-blue-500/30 transition-colors">
                <img src="https://qeeem.com/logo.svg" className="w-full h-full object-contain" alt="Qeeem Logo" />
              </div>
              <div className="text-right min-w-0">
                <h5 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">منصة قيم</h5>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">تقييم ومراجعات الدكاترة</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </a>

          {/* Trtebh */}
          <a 
            href="https://trtebh.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 p-4 bg-slate-50/80 dark:bg-zinc-950/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl hover:border-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-right w-full"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shrink-0 border border-slate-200 dark:border-zinc-800 p-2 shadow-2xs group-hover:border-blue-500/30 transition-colors">
                <img src="https://trtebh.com/brand/favicon-32x32.png" className="w-full h-full object-contain rounded" alt="Trtebh Logo" />
              </div>
              <div className="text-right min-w-0">
                <h5 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">منصة ترتيبة</h5>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">بناء الجداول التلقائية</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </a>

          {/* Moqraraty */}
          <a 
            href="https://moqraraty.com/ar" 
            target="_blank" 
            rel="noopener noreferrer"
            className="group flex items-center justify-between gap-3 p-4 bg-slate-50/80 dark:bg-zinc-950/80 border border-slate-200/80 dark:border-zinc-800/80 rounded-2xl hover:border-blue-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-right w-full"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-white dark:bg-zinc-900 flex items-center justify-center shrink-0 border border-slate-200 dark:border-zinc-800 p-2 shadow-2xs group-hover:border-blue-500/30 transition-colors">
                <img src="https://moqraraty.com/logo.png" className="w-full h-full object-contain rounded" alt="Moqraraty Logo" />
              </div>
              <div className="text-right min-w-0">
                <h5 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">منصة مقرراتي</h5>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 truncate">متابعة الواجبات والغياب</p>
              </div>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-400 dark:text-zinc-500 group-hover:text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          </a>
        </div>
      </SpotlightCard>
    </InView>
  );
}

export function Home() {
  return (
    <div className="flex flex-col items-center flex-1 w-full pt-16 sm:pt-28 pb-32 sm:pb-48 bg-transparent" dir="rtl">
      {/* Hero Section */}
      <div className="text-center max-w-4xl px-4 flex flex-col items-center relative z-10">
        
        {/* Clean Eyebrow Title */}
        <InView preset="fade-down" delay={0.05}>
          <span className="text-xs sm:text-sm font-semibold tracking-widest text-blue-600 dark:text-blue-400 uppercase mb-5 block">
            منصة طلابية مستقلة غير رسمية لطلاب جامعة الإمام
          </span>
        </InView>

        {/* Staggered Text Effect Title */}
        <TextEffect 
          per="word" 
          preset="slide" 
          delay={0.1}
          className="text-4xl sm:text-6xl md:text-7xl font-display font-extrabold tracking-tight text-slate-900 dark:text-white mb-8 leading-[1.15] justify-center"
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
            className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm sm:text-base shadow-md shadow-blue-600/20 active:scale-95 transition-all duration-200 w-full sm:w-auto text-center flex items-center justify-center gap-2.5 whitespace-nowrap group border border-blue-500/30"
          >
            <Calculator className="w-4 h-4 text-blue-200 shrink-0" />
            <span>الأدوات وحاسبة المعدل</span>
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform shrink-0" />
          </Link>
          <Link 
            href="/resources" 
            className="px-6 py-3.5 rounded-2xl bg-slate-100 dark:bg-zinc-900/90 hover:bg-slate-200/80 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-800 text-slate-800 dark:text-zinc-200 font-bold text-sm sm:text-base shadow-2xs backdrop-blur-md active:scale-95 transition-all duration-200 w-full sm:w-auto text-center flex items-center justify-center gap-2.5 whitespace-nowrap group"
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
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900 dark:text-white mb-3">
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
                className="h-full border border-slate-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl p-7 sm:p-8 hover:border-blue-500/40 transition-all duration-300"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-12 h-12 rounded-2xl ${feat.color} border flex items-center justify-center shadow-2xs group-hover:scale-110 transition-transform duration-300`}>
                    <feat.icon className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400">
                    {feat.badge}
                  </span>
                </div>
                
                <h3 className="text-xl font-display font-bold text-slate-900 dark:text-white mb-2 flex items-center justify-between group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  <span>{feat.name}</span>
                  <ChevronLeft className="w-5 h-5 text-slate-400 dark:text-zinc-500 group-hover:-translate-x-1 group-hover:text-blue-500 transition-all" />
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                  {feat.description}
                </p>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      </InView>

      {/* Footer Section */}
      <footer className="mt-32 sm:mt-48 w-full max-w-5xl px-4 border-t border-slate-200/80 dark:border-zinc-800/80 pt-14 pb-10 flex flex-col items-center justify-center text-center text-xs sm:text-sm text-slate-500 dark:text-zinc-500 space-y-4">
        <div className="flex items-center gap-2">
          <Award className="w-4.5 h-4.5 text-blue-500" />
          <p className="leading-relaxed font-medium">
            تم التطوير والتصميم بواسطة <a href="https://gassem.me" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline font-bold transition-colors">قاسم</a>
          </p>
        </div>
        <p className="text-[11px] sm:text-xs text-slate-400 dark:text-zinc-500 max-w-xl leading-relaxed">
          مساعد الإمام هو مشروع طلابي مستقل غير رسمي، يهدف لخدمة الطلاب والطالبات وتسهيل مسيرتهم الأكاديمية، ولا يمثل الجهات الرسمية لجامعة الإمام محمد بن سعود الإسلامية.
        </p>
      </footer>
    </div>
  );
}
