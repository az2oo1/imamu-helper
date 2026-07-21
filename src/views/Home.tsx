'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calculator, BookOpen, Calendar, Newspaper, ArrowLeft, Clock, Sparkles, Award } from 'lucide-react';
import Link from 'next/link';
import Confetti from 'react-confetti';

const features = [
  {
    name: 'حاسبة المعدل والخطط',
    description: 'احسب معدلك بدقة وحمل الخطط الدراسية لكل تخصص.',
    icon: Calculator,
    path: '/tools',
    color: 'bg-blue-950/40 text-blue-400 border border-blue-900/50',
  },
  {
    name: 'المصادر الطلابية',
    description: 'احصل على ملفات PDF، واختبارات سابقة، ومجموعات واتساب لكل مادة.',
    icon: BookOpen,
    path: '/resources',
    color: 'bg-amber-950/40 text-amber-400 border border-amber-900/50',
  },
  {
    name: 'التقويم الجامعي',
    description: 'ابق على اطلاع بأهم الفعاليات الجامعية والمواعيد الأكاديمية.',
    icon: Calendar,
    path: '/calendar',
    color: 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/50',
  },
  {
    name: 'أخبار جامعة الإمام',
    description: 'آخر التحديثات والإعلانات مباشرة من مصادر الجامعة الرسمية.',
    icon: Newspaper,
    path: '/news',
    color: 'bg-purple-950/40 text-purple-400 border border-purple-900/50',
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

function CountdownBox({ value, label }: { value: number, label: string }) {
  return (
    <div className="flex flex-col items-center bg-zinc-950 border border-zinc-850 rounded-lg p-4 min-w-[75px] sm:min-w-[85px] shadow-sm transition-all duration-200 hover:shadow-md">
      <span className="text-2xl sm:text-3xl font-display font-bold text-zinc-50">{String(value).padStart(2, '0')}</span>
      <span className="text-[10px] sm:text-xs text-zinc-400 font-medium tracking-wider mt-1">{label}</span>
    </div>
  );
}

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

  const now = useCurrentTime();
  let semesterTargetDate: Date | null = null;
  let semesterLabel = "يبدأ الفصل الدراسي خلال";
  
  if (settings?.semesterStartDate || settings?.semesterEndDate) {
    const start = settings.semesterStartDate ? new Date(settings.semesterStartDate) : null;
    const end = settings.semesterEndDate ? new Date(settings.semesterEndDate) : null;
    
    if (start && now < start) {
      semesterTargetDate = start;
      semesterLabel = "يبدأ الفصل الدراسي خلال";
    } else if (end && now <= end) {
      semesterTargetDate = end;
      semesterLabel = "ينتهي الفصل الدراسي خلال";
    } else if (start && !end && now >= start) {
      semesterLabel = "بدأ الفصل الدراسي";
    } else if (end && now > end) {
      semesterLabel = "انتهى الفصل الدراسي";
    }
  }

  const semesterTime = getCountdownValues(now, semesterTargetDate);
  const mokafaaTime = getCountdownValues(now, nextMokafaaDate);

  return (
    <div className="w-full max-w-5xl px-4 mt-12 flex flex-col gap-6 relative">
      {showConfetti && (
        <Confetti 
          width={windowSize.width} 
          height={windowSize.height} 
          recycle={false} 
          numberOfPieces={350} 
          gravity={0.12}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, pointerEvents: 'none' }}
        />
      )}
      
      <div className="flex flex-col md:flex-row gap-6 w-full">
        {/* Semester Countdown */}
        <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-5">
            <div className="p-2 bg-zinc-800 rounded-md">
              <Clock className="w-5 h-5 text-zinc-100" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-200">{semesterTargetDate ? semesterLabel : "العد التنازلي للفصل الدراسي"}</h3>
          </div>
          {semesterTargetDate ? (
            <div className="flex gap-3 sm:gap-4" dir="ltr">
              <CountdownBox value={semesterTime.days} label="أيام" />
              <CountdownBox value={semesterTime.hours} label="ساعات" />
              <CountdownBox value={semesterTime.minutes} label="دقائق" />
              <CountdownBox value={semesterTime.seconds} label="ثواني" />
            </div>
          ) : (
            <p className="text-sm text-zinc-300 font-medium">
              {semesterLabel === "يبدأ الفصل الدراسي خلال" && !semesterTargetDate ? "لم يتم تحديد المواعيد الأكاديمية بعد." : semesterLabel}
            </p>
          )}
        </div>

        {/* Mokafaa Countdown */}
        {nextMokafaaDate && (
          <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
            <div className="flex items-center gap-2 mb-5">
              <div className="p-2 bg-zinc-800 rounded-md">
                <Sparkles className="w-5 h-5 text-zinc-100" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-200">المكافأة القادمة</h3>
            </div>
            
            {isMokafaaToday ? (
              <div className="bg-zinc-900 backdrop-blur-md px-6 py-5 rounded-md border border-emerald-500/20 shadow-sm relative overflow-hidden flex flex-col items-center justify-center max-w-sm">
                <div className="absolute inset-0 bg-emerald-500/5 animate-pulse pointer-events-none" />
                <span className="text-lg font-bold text-emerald-500 z-10 flex items-center gap-2">
                  🎉 اليوم تنزل المكافأة! 🎉
                </span>
                <p className="text-xs text-emerald-400 mt-2 font-medium z-10 leading-relaxed">
                  شيك حسابك البنكي، نزلت المكافأة! دلع نفسك!
                </p>
              </div>
            ) : (
              <div className="flex gap-3 sm:gap-4" dir="ltr">
                <CountdownBox value={mokafaaTime.days} label="أيام" />
                <CountdownBox value={mokafaaTime.hours} label="ساعات" />
                <CountdownBox value={mokafaaTime.minutes} label="دقائق" />
                <CountdownBox value={mokafaaTime.seconds} label="ثواني" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* External Student Platforms */}
      <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 sm:p-7 shadow-sm text-right">
        <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2 pr-1">
          <Sparkles className="w-4 h-4 text-blue-500" /> منصات وأدوات خارجية تهمك 🚀
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Qeeem */}
          <a 
            href="https://qeeem.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 p-4 bg-zinc-950 border border-zinc-800 rounded-lg hover:shadow-sm hover:border-zinc-700 transition text-right group w-full"
          >
            <div className="w-9 h-9 rounded-md bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-850 overflow-hidden p-1">
              <img src="https://qeeem.com/logo.svg" className="w-full h-full object-contain" alt="Qeeem Logo" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-zinc-100 group-hover:text-zinc-50 transition-colors">منصة قيم 📝</h5>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">لمشاهدة وتقييم أعضاء هيئة التدريس والمحاضرين بالجامعة.</p>
            </div>
          </a>

          {/* Trtebh */}
          <a 
            href="https://trtebh.com/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 p-4 bg-zinc-950 border border-zinc-800 rounded-lg hover:shadow-sm hover:border-zinc-700 transition text-right group w-full"
          >
            <div className="w-9 h-9 rounded-md bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-850 overflow-hidden p-1">
              <img src="https://trtebh.com/brand/favicon-32x32.png" className="w-full h-full object-contain rounded" alt="Trtebh Logo" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-zinc-100 group-hover:text-zinc-50 transition-colors">منصة ترتيبة 📅</h5>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">أداتك الذكية لبناء الجدول الدراسي المثالي. اختر موادك المفضلة، وسيقوم النظام بترتيب آلاف الاحتمالات لتختار الأنسب.</p>
            </div>
          </a>

          {/* Moqraraty */}
          <a 
            href="https://moqraraty.com/ar" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-3.5 p-4 bg-zinc-950 border border-zinc-800 rounded-lg hover:shadow-sm hover:border-zinc-700 transition text-right group w-full"
          >
            <div className="w-9 h-9 rounded-md bg-zinc-900 flex items-center justify-center shrink-0 border border-zinc-850 overflow-hidden p-1">
              <img src="https://moqraraty.com/logo.png" className="w-full h-full object-contain rounded" alt="Moqraraty Logo" />
            </div>
            <div>
              <h5 className="font-bold text-xs text-zinc-100 group-hover:text-zinc-50 transition-colors">منصة مقرراتي 📚</h5>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed">منصّتك لتنظيم الجدول الأكاديمي، تسجيل المهام، متابعة الغيابات، وحساب المعدل بكل سهولة.</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

export function Home() {
  return (
    <div className="flex flex-col items-center flex-1 w-full pt-12 pb-16 bg-transparent" dir="rtl">
      {/* Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center max-w-3xl px-4"
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-zinc-100 mb-6 leading-tight">
          مسيرتك الأكاديمية،<br />
          <span className="text-blue-500">أسهل مع مساعد الإمام.</span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 mb-10 leading-relaxed font-light max-w-2xl mx-auto">
          منصة ذكية صممت من قبل الطلاب لخدمة طلاب جامعة الإمام. احسب معدلك التراكمي، وابحث عن المصادر الأساسية، وتتبع التقويم الأكاديمي بيسر وسهولة.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/tools" className="px-8 py-3.5 rounded-full bg-blue-600 text-white font-medium shadow-sm hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 w-full sm:w-auto text-center">
            اكتشف الأدوات
          </Link>
          <Link href="/resources" className="px-8 py-3.5 rounded-full bg-transparent border border-zinc-700 text-zinc-200 font-medium hover:bg-zinc-800/50 hover:text-zinc-50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 w-full sm:w-auto text-center">
            تصفح المصادر
          </Link>
        </div>
      </motion.div>

      {/* Countdowns Panel */}
      <CountdownsSection />

      {/* Features Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-20 w-full max-w-5xl px-4"
      >
        {features.map((feat) => (
          <Link 
            key={feat.name} 
            href={feat.path} 
            className="group relative bg-zinc-900/50 rounded-xl p-8 shadow-sm border border-zinc-800 hover:shadow-md hover:border-zinc-750 hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className={`w-12 h-12 rounded-lg ${feat.color} flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110`}>
              <feat.icon className="w-5.5 h-5.5" />
            </div>
            <h3 className="text-xl font-display font-bold text-zinc-100 mb-2.5">{feat.name}</h3>
            <p className="text-sm text-zinc-400 leading-relaxed pr-1">{feat.description}</p>
            <div className="absolute bottom-8 left-8 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
              <ArrowLeft className="w-5 h-5 text-zinc-450" />
            </div>
          </Link>
        ))}
      </motion.div>

      {/* Footer Section */}
      <footer className="mt-24 w-full max-w-5xl px-4 border-t border-zinc-800/80 pt-8 pb-4 flex flex-col items-center justify-center text-center text-xs text-zinc-500">
        <p className="mb-2 leading-relaxed">
          تم التطوير والتصميم بكل ❤️ بواسطة <a href="https://gassem.me" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-semibold transition-colors duration-200">قاسم</a>
        </p>
        <p className="text-[10px] text-gray-400/70">
          مساعد الإمام هو مشروع طلابي مستقل غير رسمي، ولا يمثل الجهات الرسمية لجامعة الإمام محمد بن سعود الإسلامية.
        </p>
      </footer>
    </div>
  );
}
