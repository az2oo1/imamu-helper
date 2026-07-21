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
      .then(r => r.json())
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
        className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-[var(--color-imamu-blue-light)] transition font-semibold mb-6 bg-zinc-900/40 hover:bg-zinc-800/40 py-2.5 px-4 rounded-xl border border-zinc-800 self-start"
      >
        <ArrowLeft className="w-4 h-4 rotate-180" /> العودة إلى الدليلة
      </button>

      {/* Hero Premium Banner - Styled "Like the old way" but as a beautiful Page Header */}
      <div className="w-full bg-gradient-to-br from-[var(--color-imamu-blue)] via-[var(--color-imamu-blue)] to-[var(--color-imamu-blue-light)] rounded-3xl p-8 sm:p-10 text-white shadow-lg relative overflow-hidden mb-8 text-right border border-white/10">
        {/* Glowing absolute background accent */}
        <div className="absolute -right-10 -top-10 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-0 bottom-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5 flex-col sm:flex-row text-center sm:text-right">
            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 border border-white/20 shadow-inner group-hover:rotate-3 transition duration-300">
              <GraduationCap className="w-9 h-9 text-[var(--color-imamu-gold-light)]" />
            </div>
            <div>
              <span className="bg-white/15 text-[var(--color-imamu-gold-light)] text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider">دليل المستجدين الأكاديمي</span>
              <h1 className="text-2xl sm:text-3xl font-display font-bold mt-1.5">دليل الطلاب المستجدين (عش آل إمام) 🎓</h1>
              <p className="text-xs text-white/80 mt-1.5 font-medium max-w-2xl leading-relaxed">
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
          className={`flex flex-col items-center justify-center text-center p-5 rounded-xl border transition-all duration-200 ${
            newbieTab === 'about' 
              ? 'bg-blue-950/40 border-blue-900/50 text-blue-400 shadow-sm' 
              : 'bg-zinc-900/40 text-zinc-400 border-zinc-800 hover:bg-zinc-800/50 hover:text-zinc-100'
          }`}
        >
          <Compass className={`w-6 h-6 mb-2 ${newbieTab === 'about' ? 'text-blue-400' : 'text-zinc-500'}`} />
          <span className="text-xs font-bold">الحياة الجامعية والكليات</span>
        </button>

        <button 
          onClick={() => setNewbieTab('systems')}
          className={`flex flex-col items-center justify-center text-center p-5 rounded-xl border transition-all duration-200 ${
            newbieTab === 'systems' 
              ? 'bg-indigo-950/40 border-indigo-900/50 text-indigo-400 shadow-sm' 
              : 'bg-zinc-900/40 text-zinc-400 border-zinc-800 hover:bg-zinc-800/50 hover:text-zinc-100'
          }`}
        >
          <Laptop className={`w-6 h-6 mb-2 ${newbieTab === 'systems' ? 'text-indigo-400' : 'text-zinc-500'}`} />
          <span className="text-xs font-bold">الخدمة الذاتية والأنظمة</span>
        </button>

        <button 
          onClick={() => setNewbieTab('services')}
          className={`flex flex-col items-center justify-center text-center p-5 rounded-xl border transition-all duration-200 ${
            newbieTab === 'services' 
              ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-400 shadow-sm' 
              : 'bg-zinc-900/40 text-zinc-400 border-zinc-800 hover:bg-zinc-800/50 hover:text-zinc-100'
          }`}
        >
          <CreditCard className={`w-6 h-6 mb-2 ${newbieTab === 'services' ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <span className="text-xs font-bold">البطاقات والخدمات العامة</span>
        </button>

        <button 
          onClick={() => setNewbieTab('checklist')}
          className={`flex flex-col items-center justify-center text-center p-5 rounded-xl border transition-all duration-200 ${
            newbieTab === 'checklist' 
              ? 'bg-amber-950/40 border-amber-900/50 text-amber-400 shadow-sm' 
              : 'bg-zinc-900/40 text-zinc-400 border-zinc-800 hover:bg-zinc-800/50 hover:text-zinc-100'
          }`}
        >
          <CheckSquare className={`w-6 h-6 mb-2 ${newbieTab === 'checklist' ? 'text-amber-400' : 'text-zinc-500'}`} />
          <span className="text-xs font-bold">قائمة مهام المستجد ({completedCount}/{checklistItems.length})</span>
        </button>
      </div>

      {/* Tab Contents Card */}
      <div className="w-full bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm overflow-hidden text-right relative mb-8 min-h-[300px]">
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
                <h3 className="text-base font-bold text-zinc-100 mb-2">🏫 كليات المدينة الجامعية والسنة التحضيرية</h3>
                <p className="text-xs leading-relaxed text-zinc-300">
                  تتميز المدينة الجامعية لجامعة الإمام بالرياض (حي الفلاح) بمساحتها الكبيرة وتكامل مرافقها الأكاديمية والرياضية والصحية والخدمية.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-zinc-800 p-5 rounded-xl bg-zinc-950/40">
                  <h4 className="font-bold text-zinc-100 mb-2 flex items-center gap-1.5">🎓 السنة التحضيرية ومسارات القبول</h4>
                  <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                    تمثل السنة التحضيرية ركيزة البداية لتطوير المهارات الرياضية واللغوية والإنجليزية للطلاب.
                    <br /><br />
                    • <strong>المسار العلمي والهندسي:</strong> لطلاب كليات الحاسب والمعلومات، كلية الهندسة، وكلية العلوم. يركز المسار على الرياضيات التمهيدية واللغة الإنجليزية المكثفة والفيزياء.
                    <br /><br />
                    • <strong>المسار الإنساني والأدبي:</strong> لطلاب كليات اللغات والترجمة، الاقتصاد والعلوم الإدارية، الشريعة، والدراسات الإسلامية والتربية. يركز على مهارات الاتصال، الحاسب الآلي، ومبادئ العلوم الإنسانية.
                  </p>
                </div>

                <div className="border border-zinc-800 p-5 rounded-xl bg-zinc-950/40">
                  <h4 className="font-bold text-zinc-100 mb-2 flex items-center gap-1.5">🗺️ مخطط المباني وكيفية الوصول</h4>
                  <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                    تقسم الكليات بالمدينة الجامعية للطلاب إلى مبانٍ رئيسية مرقمة لسهولة التنقل والوصول:
                    <br /><br />
                    • <strong>مبنى 309:</strong> عمادة شؤون الطلاب، عمادة القبول والتسجيل، وكلية علوم الحاسب والمعلومات (طلاب).
                    <br /><br />
                    • <strong>مبنى 310:</strong> كلية الهندسة.
                    <br /><br />
                    • <strong>مبنى 311:</strong> كلية العلوم.
                    <br /><br />
                    • <strong>مبنى 312:</strong> كلية الاقتصاد والعلوم الإدارية.
                    <br /><br />
                    • <strong>مكتبة الأمير نايف (المكتبة المركزية):</strong> توفر قاعات للمطالعة، غرفاً للدراسة الجماعية، وقواعد بيانات رقمية ضخمة.
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
                <h3 className="text-base font-bold text-zinc-100 mb-2">💻 الأنظمة الرقمية وبوابات الخدمات الذاتية</h3>
                <p className="text-xs leading-relaxed text-zinc-300">
                  تعتمد دراستك وحضورك واستخراج سجلاتك الأكاديمية على ثلاث بوابات رسمية تابعة لعمادة تقنية المعلومات:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border border-zinc-800 p-5 rounded-xl bg-zinc-950/40 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-zinc-100 mb-2 flex items-center gap-1.5">🖥️ الخدمة الذاتية (Banner)</h4>
                    <p className="text-[11px] text-zinc-300 leading-relaxed font-normal">
                      نظام إلكتروني أكاديمي كامل يُستخدم في إعداد الجداول الدراسية الأسبوعية، تسجيل المواد وحذفها وإضافتها وتعديل شعبها، معرفة الغيابات والإنذارات ونسبة الحرمان الأكاديمي، واستخراج السجل والدرجات النهائية.
                    </p>
                  </div>
                  <a href="https://bstss.imamu.edu.sa/StudentSelfService" target="_blank" rel="noreferrer" className="text-xs text-[var(--color-imamu-blue-light)] font-bold flex items-center gap-1 mt-4 hover:underline">
                    تسجيل دخول البوابة <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="border border-zinc-800 p-5 rounded-xl bg-zinc-950/40 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-zinc-100 mb-2 flex items-center gap-1.5">📧 البريد الجامعي الأكاديمي</h4>
                    <p className="text-[11px] text-zinc-300 leading-relaxed font-normal">
                      بريد إلكتروني رسمي للطلاب بنطاق الجامعة (<span className="font-sans text-[10px]">@sm.imamu.edu.sa</span>) يعتمد على باقة مايكروسوفت Office 365. يُستخدم لتلقي إعلانات الكلية، والتواصل الرسمي مع الأساتذة والدعم الفني.
                    </p>
                  </div>
                  <a href="https://mail.imamu.edu.sa/imamowa/" target="_blank" rel="noreferrer" className="text-xs text-[var(--color-imamu-blue-light)] font-bold flex items-center gap-1 mt-4 hover:underline">
                    تسجيل دخول البريد <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="border border-zinc-800 p-5 rounded-xl bg-zinc-950/40 shadow-sm flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-zinc-100 mb-2 flex items-center gap-1.5">📖 بلاك بورد (Blackboard)</h4>
                    <p className="text-[11px] text-zinc-300 leading-relaxed font-normal">
                      منصة الفصول الافتراضية والتعليم الإلكتروني الرسمية بالجامعة. تحتوي على الملفات والمذكرات والشرائح لكل مادة، الواجبات والأنشطة الأسبوعية، الاختبارات القصيرة، والتواصل المباشر للمحاضرات عن بعد.
                    </p>
                  </div>
                  <a href="https://lms.imamu.edu.sa" target="_blank" rel="noreferrer" className="text-xs text-[var(--color-imamu-blue-light)] font-bold flex items-center gap-1 mt-4 hover:underline">
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
                <h3 className="text-base font-bold text-zinc-100 mb-2">💳 الخدمات العامة، البطاقات، والمكافآت المالية</h3>
                <p className="text-xs leading-relaxed text-zinc-300">
                  تفاصيل استلام البطاقة الجامعية وبطاقة المكافأة، والرعاية الصحية والسكن الجامعي:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-zinc-800 p-5 rounded-xl bg-zinc-950/40">
                  <h4 className="font-bold text-zinc-100 mb-2">💳 بطاقات الصراف للمكافأة والبطاقة الذكية</h4>
                  <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                    • <strong>البطاقة الجامعية:</strong> يتم رفع صورة شخصية إلكترونياً من خلال تحديث ملف الطالب بالخدمة الذاتية، وبعد الموافقة يتم طباعتها وتوزيعها بالتنسيق مع عمادة شؤون الطلاب (مبنى 309 للطلاب).
                    <br /><br />
                    • <strong>المكافأة وصراف الطلاب:</strong> يُصرف لجميع الطلاب السعوديين والمنح مكافأة شهرية (990 ريالاً للتخصصات العلمية، 840 ريالاً للتخصصات الإنسانية). تصدر الجامعة بطاقات جارية للطلاب المقبولين الجدد بالتنسيق مع مصرف الراجحي، ويتم استلامها من فرع الراجحي بالجامعة بمبنى الخدمات الطبية.
                  </p>
                </div>

                <div className="border border-zinc-800 p-5 rounded-xl bg-zinc-950/40">
                  <h4 className="font-bold text-zinc-100 mb-2">🏥 الخدمات الطبية والسكن الطلابي</h4>
                  <p className="text-xs text-zinc-300 leading-relaxed font-normal">
                    • <strong>المركز الطبي الجامعي:</strong> يوفر المركز رعاية طبية متكاملة لجميع منسوبي الجامعة والطلاب مجاناً. يشتمل على عيادات عامة وعيادات أسنان وصيدلية للحصول على الأدوية مجاناً بموجب بطاقتك الجامعية.
                    <br /><br />
                    • <strong>السكن الجامعي:</strong> توفر الجامعة سكناً مجهزاً للطلاب المقبولين القادمين من خارج مدينة الرياض لضمان استقرارهم الدراسي. يتم التقديم ورفع الطلبات إلكترونياً في بداية كل فصل دراسي.
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
                <span className="text-xs font-semibold text-zinc-400">أكمل قائمة المهام لتجهيز ملفك الجامعي بالكامل:</span>
                <span className="text-xs font-bold text-[var(--color-imamu-blue-light)]">نسبة الإنجاز: {progressPercent}%</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-zinc-950 h-2.5 rounded-full overflow-hidden border border-zinc-850">
                <div 
                  className="bg-blue-600 h-full transition-all duration-500 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex flex-col gap-3 mt-4">
                {checklistItems.map(item => (
                  <label 
                    key={item.key}
                    className={`flex items-start gap-3 p-3.5 rounded-xl border transition cursor-pointer select-none ${
                      checklist[item.key]
                        ? 'bg-emerald-950/20 border-emerald-900/50 text-emerald-400 shadow-sm'
                        : 'bg-zinc-950/40 border-zinc-800 text-zinc-300 hover:bg-zinc-800/30'
                    }`}
                  >
                    <input 
                      type="checkbox"
                      checked={checklist[item.key]}
                      onChange={() => toggleChecklistItem(item.key)}
                      className="mt-0.5 rounded border-zinc-800 bg-zinc-900 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className={`text-xs sm:text-sm font-semibold leading-relaxed ${checklist[item.key] ? 'line-through text-zinc-500 font-medium' : ''}`}>{item.label}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* University Contact Directories Links */}
      <div className="w-full bg-zinc-900/40 border border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm mb-8 text-right">
        <h3 className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2 pr-1">
          <Compass className="w-4.5 h-4.5 text-blue-500" /> وسائل الاتصال بالجامعة 📞
        </h3>
        <p className="text-xs text-zinc-400 mb-6 mr-7">
          يمكنك تصفح أدلة الاتصال المعتمدة بالجامعة للبحث عن أرقام الهواتف أو البريد الإلكتروني الرسمي مباشرة:
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* 1. Phone Numbers Directory Button */}
          <button 
            onClick={() => router.push('/numbers')}
            className="flex items-center justify-between p-4 bg-zinc-950/40 hover:bg-zinc-850/40 border border-zinc-800 rounded-xl transition text-right group w-full"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-950/40 text-blue-400 border border-blue-900/50 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-zinc-100 group-hover:text-blue-450 transition-colors">دليل الأرقام الهاتفية والتحويلات</h4>
                <p className="text-[10px] text-zinc-400 mt-0.5">أرقام الكليات، العمادات، وخطوط الطوارئ والسلامة.</p>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-zinc-400 group-hover:text-blue-500 transition-colors rotate-180" />
          </button>

          {/* 2. College Emails Directory Button */}
          <button 
            onClick={() => router.push('/emails')}
            className="flex items-center justify-between p-4 bg-zinc-950/40 hover:bg-zinc-850/40 border border-zinc-800 rounded-xl transition text-right group w-full"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-900/50 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-zinc-100 group-hover:text-emerald-455 transition-colors">دليل البريد الإلكتروني الأكاديمي</h4>
                <p className="text-[10px] text-zinc-400 mt-0.5">إيميلات شؤون الطلاب، العميد، ومسؤولي التخصصات.</p>
              </div>
            </div>
            <ChevronLeft className="w-4 h-4 text-zinc-400 group-hover:text-emerald-500 transition-colors rotate-180" />
          </button>
        </div>
      </div>

      {/* Dynamic Newbie Links Grid Section */}
      <div className="w-full relative z-10 text-right">
        <h3 className="text-sm font-bold text-zinc-100 mb-4 flex items-center gap-2 pr-1">
          <ExternalLink className="w-4.5 h-4.5 text-blue-500" /> روابط ومنصات هامة للمستجدين
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {newbieLinks.map(link => (
            <a 
              key={link.id} 
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="bg-zinc-900/40 border border-zinc-800 p-5 rounded-xl hover:bg-zinc-900/80 hover:border-zinc-700 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0">
                      {getLinkIcon(link.title, link.url)}
                    </div>
                    <h4 className="font-bold text-sm text-zinc-100 group-hover:text-[var(--color-imamu-blue-light)] transition-colors">
                      {link.title}
                    </h4>
                  </div>
                  <ChevronLeft className="w-4.5 h-4.5 text-zinc-400 group-hover:text-[var(--color-imamu-blue)] transition-colors rotate-180" />
                </div>
                {link.description && (
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {link.description}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-zinc-500 font-mono mt-3 truncate block">
                {link.url}
              </span>
            </a>
          ))}
          {newbieLinks.length === 0 && (
            <p className="text-xs text-zinc-400 italic py-4 col-span-2">لا توجد روابط مضافة حالياً.</p>
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
    return <GraduationCap className="w-5 h-5 text-blue-400" />;
  }
  if (u.includes('mail') || u.includes('imamowa') || t.includes('بريد') || t.includes('إيميل')) {
    return <Mail className="w-5 h-5 text-emerald-400" />;
  }
  return <ExternalLink className="w-5 h-5 text-zinc-400" />;
}
