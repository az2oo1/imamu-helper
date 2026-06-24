import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calculator, BookOpen, Calendar, Newspaper, ArrowLeft, Clock, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Confetti from 'react-confetti';

const features = [
  {
    name: 'حاسبة المعدل والخطط',
    description: 'احسب معدلك بدقة وحمل الخطط الدراسية لكل تخصص.',
    icon: Calculator,
    path: '/tools',
    color: 'bg-sky-50 text-[var(--color-imamu-blue)]',
  },
  {
    name: 'المصادر الطلابية',
    description: 'احصل على ملفات PDF، واختبارات سابقة، ومجموعات واتساب لكل مادة.',
    icon: BookOpen,
    path: '/resources',
    color: 'bg-amber-50 text-amber-700',
  },
  {
    name: 'التقويم الجامعي',
    description: 'ابق على اطلاع بأهم الفعاليات الجامعية والمواعيد الأكاديمية.',
    icon: Calendar,
    path: '/calendar',
    color: 'bg-emerald-50 text-emerald-700',
  },
  {
    name: 'أخبار جامعة الإمام',
    description: 'آخر التحديثات والإعلانات مباشرة من مصادر الجامعة الرسمية.',
    icon: Newspaper,
    path: '/news',
    color: 'bg-purple-50 text-purple-700',
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
    <div className="flex flex-col items-center bg-white border border-gray-100 rounded-2xl p-4 min-w-[80px] shadow-sm">
      <span className="text-3xl font-display font-bold text-gray-900">{String(value).padStart(2, '0')}</span>
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">{label}</span>
    </div>
  );
}

function CountdownsSection() {
  const [settings, setSettings] = useState<{semesterStartDate?: string, semesterEndDate?: string} | null>(null);
  const [nextMokafaaDate, setNextMokafaaDate] = useState<Date | null>(null);
  const [isMokafaaToday, setIsMokafaaToday] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/settings').then(r => r.ok ? r.json() : {}),
      fetch('/api/events').then(r => r.ok ? r.json() : [])
    ]).then(([s, events]) => {
      setSettings(s);
      
      const now = new Date();
      now.setHours(0,0,0,0);
      
      const mokafaaEvents = events
        .filter((e: any) => e.title.toLowerCase().includes('mokafaa'))
        .map((e: any) => new Date(e.date))
        .sort((a: Date, b: Date) => a.getTime() - b.getTime());

      let upcomingMokafaa = mokafaaEvents.find((d: Date) => d >= now);
      
      if (!upcomingMokafaa) {
        // Fallback if no event found: compute next 25th
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
    });
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
    <div className="w-full max-w-5xl px-4 mt-8 flex flex-col lg:flex-row gap-6 relative">
      {showConfetti && <Confetti recycle={false} numberOfPieces={500} gravity={0.15} />}
      
      {/* Semester Countdown */}
      <div className="flex-1 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-blue-900">{semesterTargetDate ? semesterLabel : "العد التنازلي للفصل الدراسي"}</h3>
        </div>
        {semesterTargetDate ? (
          <div className="flex gap-4" dir="ltr">
            <CountdownBox value={semesterTime.days} label="أيام" />
            <CountdownBox value={semesterTime.hours} label="ساعات" />
            <CountdownBox value={semesterTime.minutes} label="دقائق" />
            <CountdownBox value={semesterTime.seconds} label="ثواني" />
          </div>
        ) : (
          <p className="text-sm text-blue-800 font-medium">
            {semesterLabel === "يبدأ الفصل الدراسي خلال" && !semesterTargetDate ? "لم يتم الإعلان عن تواريخ الفصل الدراسي بعد." : semesterLabel}
          </p>
        )}
      </div>

      {/* Mokafaa Countdown */}
      {nextMokafaaDate && (
        <div className="flex-1 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-3xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-medium text-emerald-900">المكافأة القادمة</h3>
          </div>
          
          {isMokafaaToday ? (
            <div className="bg-white px-6 py-4 rounded-2xl border border-emerald-200 shadow-sm animate-bounce">
              <span className="text-xl font-bold text-emerald-600">🎉 اليوم تنزل المكافأة! 🎉</span>
              <p className="text-sm text-emerald-800 mt-2 font-medium">شيك حسابك البنكي، نزلت المكافأة! دلع نفسك!</p>
            </div>
          ) : (
            <div className="flex gap-4" dir="ltr">
              <CountdownBox value={mokafaaTime.days} label="أيام" />
              <CountdownBox value={mokafaaTime.hours} label="ساعات" />
              <CountdownBox value={mokafaaTime.minutes} label="دقائق" />
              <CountdownBox value={mokafaaTime.seconds} label="ثواني" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Home() {
  return (
    <div className="flex flex-col items-center flex-1 w-full pt-16 pb-24" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center max-w-3xl px-4"
      >
        <h1 className="text-5xl md:text-6xl font-display font-bold tracking-tight text-gray-900 mb-6">
          مسيرتك الأكاديمية،<br />
          <span className="text-[var(--color-imamu-blue)]">أسهل مع مساعد الإمام.</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 leading-relaxed font-light">
          منصة بديهية صممت من قبل الطلاب، للطلاب. احسب معدلك التراكمي، وابحث عن المصادر الأساسية، وابق على تواصل مع فعاليات جامعة الإمام.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link to="/tools" className="px-8 py-4 rounded-full bg-[var(--color-imamu-blue)] text-white font-medium shadow-lg shadow-[var(--color-imamu-blue)]/10 hover:bg-[var(--color-imamu-blue-light)] transition px-8 py-3 w-full sm:w-auto text-center">
            اكتشف الأدوات
          </Link>
          <Link to="/resources" className="px-8 py-4 rounded-full bg-white text-gray-900 border border-gray-200 font-medium hover:bg-gray-50 transition w-full sm:w-auto text-center">
            تصفح المصادر
          </Link>
        </div>
      </motion.div>

      <CountdownsSection />

      <motion.div 
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-24 w-full max-w-5xl px-4"
      >
        {features.map((feat) => (
          <Link key={feat.name} to={feat.path} className="group relative bg-white rounded-3xl p-8 shadow-sm border border-gray-100 hover:shadow-xl hover:border-gray-200 transition-all duration-300">
            <div className={`w-14 h-14 rounded-2xl ${feat.color} flex items-center justify-center mb-6`}>
              <feat.icon className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-display font-semibold text-gray-900 mb-3">{feat.name}</h3>
            <p className="text-gray-500 leading-relaxed">{feat.description}</p>
            <div className="absolute bottom-8 left-8 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
              <ArrowLeft className="w-6 h-6 text-gray-400" />
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
