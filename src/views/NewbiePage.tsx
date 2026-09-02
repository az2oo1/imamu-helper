'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { 
  GraduationCap, ArrowLeft, CheckSquare, 
  BookOpen, CreditCard, ChevronLeft, 
  ExternalLink, Laptop, Phone, Mail, Compass, Send
} from 'lucide-react';

interface NewbieLink {
  id: number;
  title: string;
  url: string;
  description?: string;
}

export function NewbiePage() {
  const router = useRouter();
  const [newbieTab, setNewbieTab] = useState<'about' | 'systems' | 'services' | 'checklist'>('about');
  const [newbieLinks, setNewbieLinks] = useState<NewbieLink[]>([]);

  // Fetch newbie links from database
  useEffect(() => {
    fetch('/api/newbie/links')
      .then(r => r.ok && r.headers.get('content-type')?.includes('application/json') ? r.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setNewbieLinks(data);
        }
      })
      .catch(e => console.error("Error fetching newbie links:", e));
  }, []);

  // Newbie Checklist state persisted in localStorage
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    email: false,
    studentCard: false,
    bankAccount: false,
    blackboard: false,
    schedule: false,
    medical: false,
    resources: false,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('newbie_checklist');
    if (saved) {
      try {
        setChecklist(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('newbie_checklist', JSON.stringify(checklist));
    }
  }, [checklist, isLoaded]);

  const toggleChecklistItem = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const checklistItems = [
    { key: 'email', label: 'تفعيل البريد الإلكتروني الجامعي عبر بوابة الخدمات الذاتية' },
    { key: 'studentCard', label: 'رفع الصورة الشخصية واستخراج البطاقة الجامعية الذكية من عمادة شؤون الطلاب (مبنى 309)' },
    { key: 'bankAccount', label: 'استلام بطاقة صراف الطلاب للمكافآت وتثبيت الآيبان بالخدمة الذاتية' },
    { key: 'blackboard', label: 'تسجيل الدخول الأول وتفعيل حساب البلاك بورد لمتابعة المحاضرات والواجبات' },
    { key: 'schedule', label: 'طباعة وحفظ الجدول الدراسي الأسبوعي من نظام الخدمة الذاتية (Banner)' },
    { key: 'medical', label: 'فتح الملف الطبي بالمركز الطبي الجامعي للخدمات الطبية بالجامعة' },
    { key: 'resources', label: 'الانضمام لمجموعات المصادر بمساعد الإمام لكل مادة في جدولك الدراسي' },
  ];

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / checklistItems.length) * 100);

  return (
    <div className="flex flex-col flex-1 w-full pb-24 px-4 sm:px-6 lg:px-8 pt-8 relative max-w-4xl mx-auto min-h-screen text-right" dir="rtl">
      {/* Back Button */}
      <button 
        onClick={() => router.push('/how-to')}
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400 hover:text-[var(--color-imamu-accent)] dark:hover:text-[var(--color-imamu-accent)] transition font-semibold mb-6 bg-white dark:bg-zinc-900/40 hover:bg-slate-50 dark:hover:bg-zinc-800/40 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs self-start"
      >
        <ArrowLeft className="w-4 h-4 rotate-180" /> العودة إلى الدليلة
      </button>

      {/* Hero Premium Banner */}
      <div className="w-full bg-gradient-to-br from-amber-800 via-amber-900 to-indigo-700 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden mb-8 text-right border border-amber-700/30">
        {/* Glowing absolute background accent */}
        <div className="absolute -right-10 -top-10 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-0 bottom-0 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5 flex-col sm:flex-row text-center sm:text-right">
            <div className="w-16 h-16 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/25 shadow-inner transition duration-300">
              <GraduationCap className="w-9 h-9 text-amber-300" />
            </div>
            <div>
              <span className="bg-white/20 text-amber-300 text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider backdrop-blur-xs">دليل المستجدين الأكاديمي</span>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold mt-2">دليل الطلاب المستجدين (عش آل إمام) 🎓</h1>
              <p className="text-xs text-stone-50 mt-1.5 font-medium max-w-2xl leading-relaxed">
                مرحبًا بك في جامعة الإمام. دليل متكامل وموثق لمساعدتك في بدء رحلتك الجامعية وتفعيل كافة الأنظمة والبطاقات الأكاديمية والمصرفية بيسر وسهولة.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Menu Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <button 
          onClick={() => setNewbieTab('about')}
          className={`flex flex-col items-center justify-center text-center p-5 rounded-2xl border transition-all duration-200 ${
            newbieTab === 'about' 
              ? 'bg-stone-50 dark:bg-stone-950/40 border-amber-200 dark:border-stone-900/50 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] shadow-xs font-bold' 
              : 'bg-white dark:bg-zinc-900/40 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-zinc-100 shadow-xs'
          }`}
        >
          <Compass className={`w-6 h-6 mb-2 ${newbieTab === 'about' ? 'text-[var(--color-imamu-accent)]' : 'text-slate-400 dark:text-zinc-500'}`} />
          <span className="text-xs font-bold">الحياة الجامعية والكليات</span>
        </button>

        <button 
          onClick={() => setNewbieTab('systems')}
          className={`flex flex-col items-center justify-center text-center p-5 rounded-2xl border transition-all duration-200 ${
            newbieTab === 'systems' 
              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-400 shadow-xs font-bold' 
              : 'bg-white dark:bg-zinc-900/40 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-zinc-100 shadow-xs'
          }`}
        >
          <Laptop className={`w-6 h-6 mb-2 ${newbieTab === 'systems' ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-zinc-500'}`} />
          <span className="text-xs font-bold">الخدمة الذاتية والأنظمة</span>
        </button>

        <button 
          onClick={() => setNewbieTab('services')}
          className={`flex flex-col items-center justify-center text-center p-5 rounded-2xl border transition-all duration-200 ${
            newbieTab === 'services' 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold' 
              : 'bg-white dark:bg-zinc-900/40 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-zinc-100 shadow-xs'
          }`}
        >
          <CreditCard className={`w-6 h-6 mb-2 ${newbieTab === 'services' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-zinc-500'}`} />
          <span className="text-xs font-bold">البطاقات والخدمات العامة</span>
        </button>

        <button 
          onClick={() => setNewbieTab('checklist')}
          className={`flex flex-col items-center justify-center text-center p-5 rounded-2xl border transition-all duration-200 ${
            newbieTab === 'checklist' 
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/50 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] shadow-xs font-bold' 
              : 'bg-white dark:bg-zinc-900/40 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-zinc-100 shadow-xs'
          }`}
        >
          <CheckSquare className={`w-6 h-6 mb-2 ${newbieTab === 'checklist' ? 'text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)]' : 'text-slate-400 dark:text-zinc-500'}`} />
          <span className="text-xs font-bold">قائمة مهام المستجد ({completedCount}/{checklistItems.length})</span>
        </button>
      </div>

      {/* Tab Contents Card */}
      <div className="w-full bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs overflow-hidden text-right relative mb-8 min-h-[300px]">
        <AnimatePresence mode="wait">
          {newbieTab === 'about' && (
            <motion.div 
              key="about"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-2">🏫 كليات المدينة الجامعية والسنة التحضيرية</h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                  تتميز المدينة الجامعية لجامعة الإمام بالرياض (حي الفلاح) بمساحتها الكبيرة وتكامل مرافقها الأكاديمية والرياضية والصحية والخدمية.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-slate-200/90 dark:border-zinc-800 p-5 rounded-2xl bg-slate-50/70 dark:bg-zinc-950/40 shadow-xs">
                  <h4 className="font-bold text-slate-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">🎓 السنة التحضيرية ومسارات القبول</h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-normal">
                    تمثل السنة التحضيرية ركيزة البداية لتطوير المهارات الرياضية واللغوية والإنجليزية للطلاب.
                    <br /><br />
                    • <strong className="text-slate-900 dark:text-zinc-100">المسار العلمي والهندسي:</strong> لطلاب كليات الحاسب والمعلومات، كلية الهندسة، وكلية العلوم. يركز المسار على الرياضيات التمهيدية واللغة الإنجليزية المكثفة والفيزياء.
                    <br /><br />
                    • <strong className="text-slate-900 dark:text-zinc-100">المسار الإنساني والأدبي:</strong> لطلاب كليات اللغات والترجمة، الاقتصاد والعلوم الإدارية، الشريعة، والدراسات الإسلامية والتربية. يركز على مهارات الاتصال، الحاسب الآلي، ومبادئ العلوم الإنسانية.
                  </p>
                </div>

                <div className="border border-slate-200/90 dark:border-zinc-800 p-5 rounded-2xl bg-slate-50/70 dark:bg-zinc-950/40 shadow-xs">
                  <h4 className="font-bold text-slate-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">🗺️ مخطط المباني وكيفية الوصول</h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-normal">
                    تقسم الكليات بالمدينة الجامعية للطلاب إلى مبانٍ رئيسية مرقمة لسهولة التنقل والوصول:
                    <br /><br />
                    • <strong className="text-slate-900 dark:text-zinc-100">مبنى 309:</strong> عمادة شؤون الطلاب، عمادة القبول والتسجيل، وكلية علوم الحاسب والمعلومات (طلاب).
                    <br /><br />
                    • <strong className="text-slate-900 dark:text-zinc-100">مبنى 310:</strong> كلية الهندسة.
                    <br /><br />
                    • <strong className="text-slate-900 dark:text-zinc-100">مبنى 311:</strong> كلية العلوم.
                    <br /><br />
                    • <strong className="text-slate-900 dark:text-zinc-100">مبنى 312:</strong> كلية الاقتصاد والعلوم الإدارية.
                    <br /><br />
                    • <strong className="text-slate-900 dark:text-zinc-100">مكتبة الأمير نايف (المكتبة المركزية):</strong> توفر قاعات للمطالعة، غرفاً للدراسة الجماعية، وقواعد بيانات رقمية ضخمة.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {newbieTab === 'systems' && (
            <motion.div 
              key="systems"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-2">💻 الأنظمة الرقمية وبوابات الخدمات الذاتية</h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                  تعتمد دراستك وحضورك واستخراج سجلاتك الأكاديمية على ثلاث بوابات رسمية تابعة لعمادة تقنية المعلومات:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border border-slate-200/90 dark:border-zinc-800 p-5 rounded-2xl bg-slate-50/70 dark:bg-zinc-950/40 shadow-xs flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">🖥️ الخدمة الذاتية (Banner)</h4>
                    <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed font-normal">
                      نظام إلكتروني أكاديمي كامل يُستخدم في إعداد الجداول الدراسية الأسبوعية، تسجيل المواد وحذفها وإضافتها وتعديل شعبها، معرفة الغيابات والإنذارات ونسبة الحرمان الأكاديمي، واستخراج السجل والدرجات النهائية.
                    </p>
                  </div>
                  <a href="https://bstss.imamu.edu.sa/StudentSelfService" target="_blank" rel="noreferrer" className="text-xs text-[var(--color-imamu-accent)] font-bold flex items-center gap-1 mt-4 hover:underline">
                    تسجيل دخول البوابة <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="border border-slate-200/90 dark:border-zinc-800 p-5 rounded-2xl bg-slate-50/70 dark:bg-zinc-950/40 shadow-xs flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">📧 البريد الجامعي الأكاديمي</h4>
                    <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed font-normal">
                      بريد إلكتروني رسمي للطلاب بنطاق الجامعة (<span className="font-sans text-[10px]">@sm.imamu.edu.sa</span>) يعتمد على باقة مايكروسوفت Office 365. يُستخدم لتلقي إعلانات الكلية، والتواصل الرسمي مع الأساتذة والدعم الفني.
                    </p>
                  </div>
                  <a href="https://mail.imamu.edu.sa/imamowa/" target="_blank" rel="noreferrer" className="text-xs text-[var(--color-imamu-accent)] font-bold flex items-center gap-1 mt-4 hover:underline">
                    تسجيل دخول البريد <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="border border-slate-200/90 dark:border-zinc-800 p-5 rounded-2xl bg-slate-50/70 dark:bg-zinc-950/40 shadow-xs flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-zinc-100 mb-2 flex items-center gap-1.5">📖 بلاك بورد (Blackboard)</h4>
                    <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed font-normal">
                      منصة الفصول الافتراضية والتعليم الإلكتروني الرسمية بالجامعة. تحتوي على الملفات والمذكرات والشرائح لكل مادة، الواجبات والأنشطة الأسبوعية، الاختبارات القصيرة، والتواصل المباشر للمحاضرات عن بعد.
                    </p>
                  </div>
                  <a href="https://lms.imamu.edu.sa" target="_blank" rel="noreferrer" className="text-xs text-[var(--color-imamu-accent)] font-bold flex items-center gap-1 mt-4 hover:underline">
                    تسجيل دخول المنصة <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </motion.div>
          )}

          {newbieTab === 'services' && (
            <motion.div 
              key="services"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-zinc-100 mb-2">💳 الخدمات العامة، البطاقات، والمكافآت المالية</h3>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-zinc-300">
                  تفاصيل استلام البطاقة الجامعية وبطاقة المكافأة، والرعاية الصحية والسكن الجامعي:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-slate-200/90 dark:border-zinc-800 p-5 rounded-2xl bg-slate-50/70 dark:bg-zinc-950/40 shadow-xs">
                  <h4 className="font-bold text-slate-900 dark:text-zinc-100 mb-2">💳 بطاقات الصراف للمكافأة والبطاقة الذكية</h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-normal">
                    • <strong className="text-slate-900 dark:text-zinc-100">البطاقة الجامعية:</strong> يتم رفع صورة شخصية إلكترونياً من خلال تحديث ملف الطالب بالخدمة الذاتية، وبعد الموافقة يتم طباعتها وتوزيعها بالتنسيق مع عمادة شؤون الطلاب (مبنى 309 للطلاب).
                    <br /><br />
                    • <strong className="text-slate-900 dark:text-zinc-100">المكافأة وصراف الطلاب:</strong> يُصرف لجميع الطلاب السعوديين والمنح مكافأة شهرية (990 ريالاً للتخصصات العلمية، 840 ريالاً للتخصصات الإنسانية). تصدر الجامعة بطاقات جارية للطلاب المقبولين الجدد بالتنسيق مع مصرف الراجحي، ويتم استلامها من فرع الراجحي بالجامعة بمبنى الخدمات الطبية.
                  </p>
                </div>

                <div className="border border-slate-200/90 dark:border-zinc-800 p-5 rounded-2xl bg-slate-50/70 dark:bg-zinc-950/40 shadow-xs">
                  <h4 className="font-bold text-slate-900 dark:text-zinc-100 mb-2">🏥 الخدمات الطبية والسكن الطلابي</h4>
                  <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed font-normal">
                    • <strong className="text-slate-900 dark:text-zinc-100">المركز الطبي الجامعي:</strong> يوفر المركز رعاية طبية متكاملة لجميع منسوبي الجامعة والطلاب مجاناً. يشتمل على عيادات عامة وعيادات أسنان وصيدلية للحصول على الأدوية مجاناً بموجب بطاقتك الجامعية.
                    <br /><br />
                    • <strong className="text-slate-900 dark:text-zinc-100">السكن الجامعي:</strong> توفر الجامعة سكناً مجهزاً للطلاب المقبولين القادمين من خارج مدينة الرياض لضمان استقرارهم الدراسي. يتم التقديم ورفع الطلبات إلكترونياً في بداية كل فصل دراسي.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {newbieTab === 'checklist' && (
            <motion.div 
              key="checklist"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">أكمل قائمة المهام لتجهيز ملفك الجامعي بالكامل:</span>
                <span className="text-xs font-bold text-[var(--color-imamu-accent)]">نسبة الإنجاز: {progressPercent}%</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-slate-100 dark:bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-slate-200 dark:border-zinc-800">
                <div 
                  className="bg-[var(--color-imamu-brown)] h-full transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex flex-col gap-3 mt-4">
                {checklistItems.map(item => (
                  <div 
                    key={item.key}
                    onClick={() => toggleChecklistItem(item.key)}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer select-none ${
                      checklist[item.key]
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400 shadow-xs'
                        : 'bg-slate-50/70 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800/30'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      checklist[item.key] ? 'bg-emerald-600 text-white' : 'border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                    }`}>
                      {checklist[item.key] && <span className="text-[10px] font-bold">✓</span>}
                    </span>
                    <span className={`text-xs sm:text-sm font-semibold leading-relaxed ${checklist[item.key] ? 'line-through text-slate-400 dark:text-zinc-500 font-medium' : ''}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* University Contact Directories Links */}
      <div className="w-full bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs mb-8 text-right">
        <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mb-2 flex items-center gap-2 pr-1">
          <Compass className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400" /> وسائل الاتصال بالجامعة 📞
        </h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6 mr-7">
          يمكنك تصفح أدلة الاتصال المعتمدة بالجامعة للبحث عن أرقام الهواتف أو البريد الإلكتروني الرسمي مباشرة:
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* 1. Phone Numbers Directory Button */}
          <button 
            onClick={() => router.push('/numbers')}
            className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-slate-100/80 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 hover:border-emerald-500/40 rounded-xl transition text-right group w-full shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-8.5 h-8.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">دليل الأرقام الهاتفية والتحويلات</h4>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">أرقام الكليات، العمادات، وخطوط الطوارئ والسلامة.</p>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 dark:text-zinc-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors rotate-180" />
          </button>

          {/* 2. College Emails Directory Button */}
          <button 
            onClick={() => router.push('/emails')}
            className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-slate-100/80 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 hover:border-blue-500/40 rounded-xl transition text-right group w-full shadow-xs hover:shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="w-8.5 h-8.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">دليل البريد الإلكتروني الأكاديمي</h4>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5">إيميلات شؤون الطلاب، العميد، ومسؤولي التخصصات.</p>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-slate-400 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors rotate-180" />
          </button>
        </div>
      </div>

      {/* Dynamic Newbie Links Grid Section */}
      <div className="w-full relative z-10 text-right">
        <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100 mb-4 flex items-center gap-2 pr-1">
          <ExternalLink className="w-4.5 h-4.5 text-[var(--color-imamu-accent)]" /> روابط ومنصات هامة للمستجدين
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {newbieLinks.map(link => (
            <a 
              key={link.id} 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-900/80 hover:border-slate-300 dark:hover:border-zinc-700 transition-all group flex flex-col justify-between shadow-xs hover:shadow-sm"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center justify-center shrink-0">
                      {getLinkIcon(link.title, link.url)}
                    </div>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-zinc-100 group-hover:text-[var(--color-imamu-accent)] dark:group-hover:text-[var(--color-imamu-accent)] transition-colors">
                      {link.title}
                    </h4>
                  </div>
                  <ChevronLeft className="w-4.5 h-4.5 text-slate-400 dark:text-zinc-400 group-hover:text-[var(--color-imamu-accent)] dark:group-hover:text-[var(--color-imamu-accent)] transition-colors rotate-180" />
                </div>
                {link.description && (
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                    {link.description}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-3 truncate block">
                {link.url}
              </span>
            </a>
          ))}
          {newbieLinks.length === 0 && (
            <p className="text-xs text-slate-500 dark:text-zinc-400 italic py-4 col-span-2">لا توجد روابط مضافة حالياً.</p>
          )}
        </div>
      </div>

    </div>
  );
}

function getLinkIcon(title: string, url: string) {
  const t = title.toLowerCase();
  const u = url.toLowerCase();
  if (u.includes('lms') || t.includes('blackboard') || t.includes('بلاك')) {
    return <BookOpen className="w-5 h-5 text-indigo-400" />;
  }
  if (u.includes('bstss') || t.includes('banner') || t.includes('ذاتية') || t.includes('خدمة')) {
    return <GraduationCap className="w-5 h-5 text-[var(--color-imamu-accent)]" />;
  }
  if (u.includes('mail') || u.includes('imamowa') || t.includes('بريد') || t.includes('إيميل')) {
    return <Mail className="w-5 h-5 text-emerald-400" />;
  }
  return <ExternalLink className="w-5 h-5 text-zinc-400" />;
}
