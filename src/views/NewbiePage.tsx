'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { 
  GraduationCap, ArrowLeft, CheckSquare, 
  BookOpen, CreditCard, ChevronDown, 
  ExternalLink, Laptop, Phone, Mail, Compass, 
  Search, HelpCircle, AlertCircle, Sparkles, 
  Check, Copy, ChevronUp, Clock, Building, Calendar,
  ShieldCheck, MessageSquare
} from 'lucide-react';

interface NewbieLink {
  id: number | string;
  title: string;
  url: string;
  description?: string;
}

interface FAQItem {
  id: string;
  category: 'schedule' | 'reward' | 'systems' | 'absence' | 'campus';
  categoryLabel: string;
  question: string;
  summary: string;
  points: string[];
  actionLink?: {
    label: string;
    url: string;
  };
}

const FAQ_DATA: FAQItem[] = [
  {
    id: 'schedule-auto',
    category: 'schedule',
    categoryLabel: 'الجداول والتسجيل',
    question: 'هل الطالب المستجد يسجل مواده بنفسه، أم ينزل الجدول تلقائياً؟',
    summary: 'ينزل جدولك الدراسي في أول فصل دراسي تلقائياً بالكامل من عمادة القبول والتسجيل دون الحاجة لأي تدخل منك.',
    points: [
      'تُسجل لك جميع مقررات المستوى الأول وفق الخطة الدراسية المعتمدة لقسمك وتخصصك.',
      'لا يُسمح للمستجد بالحذف أو الإضافة أو تعديل الشعب في الفصل الأول لضمان سير الخطة الأكاديمية بانتظام.',
      'تظهر المواد ومواعيد المحاضرات والقاعات في نظام الخدمة الذاتية (Banner) قبل انطلاق الفصل الدراسي بأيام قليلة.'
    ],
    actionLink: {
      label: 'بوابة الخدمة الذاتية (Banner)',
      url: 'https://bstss.imamu.edu.sa/StudentSelfService'
    }
  },
  {
    id: 'schedule-timing',
    category: 'schedule',
    categoryLabel: 'الجداول والتسجيل',
    question: 'متى ينزل الجدول الدراسي للطالب المستجد؟',
    summary: 'تُتاح الجداول عادةً قبل بداية الفصل الدراسي بـ 3 إلى 7 أيام، وتصدر على دفعات.',
    points: [
      'تتم معالجة الجداول آلياً من قِبل عمادة القبول والتسجيل لكافة الدفعات المقبولة.',
      'إذا دخلت ووجدت الجدول فارغاً قبل بداية الدراسة بأيام، فالأمر طبيعي جداً ويعني أن تسجيل كليتك قيد التوزيع.',
      'تابع إعلانات عمادة القبول والتسجيل وقناة التلجرام الرسمية للجامعة لمعرفة موعد إتاحة جداول المستجدين.'
    ]
  },
  {
    id: 'campus-rooms',
    category: 'campus',
    categoryLabel: 'الكليات والمباني',
    question: 'كيف أقرأ رمز القاعة والمبنى من الجدول الدراسي؟',
    summary: 'رمز القاعة في جدول الخدمة الذاتية يُكتب دائماً بالترتيب: (رقم المبنى - رقم الدور - رقم القاعة).',
    points: [
      'مثال: رمز القاعة (312-2-045) يعني: مبنى كلية الاقتصاد 312، الدور الثاني، قاعة رقم 45.',
      'مباني الطلاب بالمدينة الجامعية (حي الفلاح): مبنى 309 (الحاسب والعمادات)، مبنى 310 (الهندسة)، مبنى 311 (العلوم)، مبنى 312 (الاقتصاد والعلوم الإدارية)، ومباني الشريعة واللغات والعلوم الاجتماعية بالمنطقة المركزية.',
      'مدينة الملك عبدالله للطالبات: مقسمة إلى مباني تعليمية مرقمة بوضوح مع توفر باصات النقل الترددي الداخلي المجانية بين المحطات.'
    ]
  },
  {
    id: 'prep-year',
    category: 'schedule',
    categoryLabel: 'الجداول والتسجيل',
    question: 'هل يوجد سنة تحضيرية عامة بجامعة الإمام حالياً؟',
    summary: 'تم إلغاء نظام السنة التحضيرية الموحدة في معظم كليات الجامعة، وأصبح القبول مباشراً في الأقسام والتخصصات.',
    points: [
      'يبدأ الطالب دراسة مقررات خطته الدراسية التخصصية والعامة من الفصل الدراسي الأول مباشرة.',
      'بعض الكليات تتضمن خطتها مقررات إعداد عام وتأسيس (مثل الإنجليزي والرياضيات التمهيدية) مدمجة ضمن المستوى الأول والثاني دون مسار تحضيري منفصل.'
    ]
  },
  {
    id: 'reward-date',
    category: 'reward',
    categoryLabel: 'المكافأة والآيبان',
    question: 'متى تُصرف المكافأة الشهرية للمستجدين، وكم يبلغ مقدارها؟',
    summary: 'تُصرف المكافأة يوم 27 من كل شهر ميلادي لجميع الطلاب السعوديين وطلاب المنح المنتظمين.',
    points: [
      'التخصصات العلمية والصحية: 990 ريالاً شهرياً.',
      'التخصصات النظرية والإنسانية: 840 ريالاً شهرياً.',
      'يُستقطع 10 ريالات شهرياً لصندوق الطلاب وفق اللائحة الموحدة.',
      'المستجدون قد تتأخر مكافأتهم في أول شهر فقط نظراً لإجراءات ربط الحسابات البنكية بالمسيرات، وتُصرف حينها بأثر رجعي كامل.'
    ]
  },
  {
    id: 'reward-iban',
    category: 'reward',
    categoryLabel: 'المكافأة والآيبان',
    question: 'كيف أربط رقم الآيبان (IBAN) لاستلام المكافأة، وهل يلزم بنك محدد؟',
    summary: 'الربط يتم إلكترونياً بالكامل عبر الخدمة الذاتية، ويمكنك استخدام حسابك في أي بنك سعودي معتمد.',
    points: [
      'افتح حساباً جارياً باسمك الشخصي في أي بنك محلي أونلاين بهويتك الوطنية.',
      'ادخل إلى بوابة الخدمة الذاتية (Banner) > قسم الحسابات والمكافآت > تحديث رقم الآيبان.',
      'أدخل رقم الآيبان كاملاً (المبتدئ بـ SA) وتأكد من مطابقة اسمك الرسمي المسجل في البنك مع سجلك الجامعي لتفادي رفض الحوالة.'
    ],
    actionLink: {
      label: 'تحديث الآيبان بالخدمة الذاتية',
      url: 'https://bstss.imamu.edu.sa/StudentSelfService'
    }
  },
  {
    id: 'systems-credentials',
    category: 'systems',
    categoryLabel: 'الأنظمة والحسابات',
    question: 'ما هو اسم المستخدم وكلمة المرور للأنظمة والبريد الجامعي؟',
    summary: 'حسابك الجامعي الموحد هو مفتاح الدخول لكافة منصات الجامعة الأكاديمية والتعليمية.',
    points: [
      'اسم المستخدم: رقمك الجامعي فقط (مثال: 447012345).',
      'البريد الجامعي: رقمك_الجامعي@sm.imamu.edu.sa وتستطيع فتحه عبر Microsoft Outlook (Office 365).',
      'كلمة المرور: الكلمة الافتراضية المرسلة لك في إشعار القبول برسالة نصية، ويمكنك إعادة تعيينها عبر بوابة نفاذ أو بوابة تفعيل الحسابات الجامعية.'
    ],
    actionLink: {
      label: 'تسجيل دخول بريد الطلاب (Outlook)',
      url: 'https://outlook.office.com'
    }
  },
  {
    id: 'systems-banner-vs-bb',
    category: 'systems',
    categoryLabel: 'الأنظمة والحسابات',
    question: 'ما هو الفرق بين البلاك بورد (Blackboard) والخدمة الذاتية (Banner)؟',
    summary: 'هما نظامان مختلفان تماماً؛ أحدهما إداري أكاديمي والآخر تعليمي فصلي.',
    points: [
      'الخدمة الذاتية (Banner): خاص بالسجلات الإدارية (طباعة الجدول، معرفة السجل الأكاديمي، كشف الدرجات النهائية، رصد الغياب والحرمان، وحركات الحذف والتأجيل).',
      'البلاك بورد (Blackboard): خاص بالدراسة اليومية (تحميل المذكرات وسلايدات المحاضرات، تسليم الواجبات والتكاليف، الاختبارات القصيرة، والتواصل المباشر مع أساتذة المقررات).'
    ],
    actionLink: {
      label: 'منصة البلاك بورد (Blackboard)',
      url: 'https://lms.imamu.edu.sa'
    }
  },
  {
    id: 'absence-dn',
    category: 'absence',
    categoryLabel: 'الغياب والأعذار',
    question: 'كم نسبة الغياب المسموح بها وما هو الحرمان الأكاديمي (DN)؟',
    summary: 'الحد الأقصى للغياب بدون عذر هو 25% من إجمالي الساعات الفعلية للمقرر خلال الفصل.',
    points: [
      'إذا بلغت نسبة غيابك 25% يُصدر لك النظام آلياً حرمان (DN) وتُمنع من دخول الاختبار النهائي.',
      'درجة الحرمان (DN) تُحسب كرسوب بصفر في المعدل التراكمي وتؤثر بشدة على سجلك.',
      'يصلك إنذار غياب أول عند بلوغ 10%، وإنذار ثانٍ عند بلوغ 20%، فاحرص على متابعة سجل غيابك بالخدمة الذاتية.'
    ]
  },
  {
    id: 'absence-excuse',
    category: 'absence',
    categoryLabel: 'الغياب والأعذار',
    question: 'إذا غبت بعذر طبي، ما هي الطريقة الرسمية لتقديمه وقبوله؟',
    summary: 'تعتمد الجامعة الإجازات المرضية الصادرة إلكترونياً من تطبيق "صحتي (Sehhaty)" والمصدقة من وزارة الصحة.',
    points: [
      'استخرج تقرير الإجازة المرضية بصيغة PDF من تطبيق صحتي وتأكد من وجود رمز التحقق المعتمد.',
      'ارفع التقرير عبر بوابة تواصل الموحدة إلى وحدة الشؤون التعليمية بكليتك خلال 5 أيام عمل كحد أقصى من تاريخ العودة.',
      'اللائحة تمنع قبول أي أعذار ورقية غير معتمدة أو أعذار تُقدم بعد انقضاء مهلة الـ 5 أيام.'
    ],
    actionLink: {
      label: 'بوابة تواصل الموحدة لرفع الأعذار',
      url: 'https://tawasol.imamu.edu.sa'
    }
  },
  {
    id: 'campus-card',
    category: 'campus',
    categoryLabel: 'الكليات والمباني',
    question: 'هل يلزمني استخراج بطاقة جامعية بلاستيكية لدخول الحرم الجامعي؟',
    summary: 'لا يلزم ذلك نهائياً؛ فالبطاقة الرقمية في هاتفك معتمدة رسمياً في كافة بوابات ومرافق الجامعة.',
    points: [
      'تستطيع إبراز هويتك وبطاقتك الرقمية من خلال بوابة الخدمات الذاتية أو التطبيق الرسمي للجامعة.',
      'تتيح لك البطاقة الرقمية الدخول من البوابات الأمنية والاستفادة من المكتبة المركزية والمركز الطبي ومرافق الأنشطة.',
      'للراغبين في استخراج بطاقة بلاستيكية تذكارية، يتم الإعلان عن فترات استلامها من عمادة شؤون الطلاب بعد رفع الصورة في ملفك الإلكتروني.'
    ]
  },
  {
    id: 'schedule-transfer',
    category: 'schedule',
    categoryLabel: 'الجداول والتسجيل',
    question: 'متى يحق للطالب المستجد التحويل من تخصصه إلى تخصص آخر؟',
    summary: 'يُتاح التقديم على التحويل الداخلي بعد إتمام فصل دراسي واحد على الأقل داخل الجامعة.',
    points: [
      'يشترط اجتياز عدد من الساعات المعتمدة (غالباً بين 12 إلى 15 ساعة) دون انقطاع أو اعتذار.',
      'يجب تحقيق المعدل التراكمي المشترط للكلية والتخصص المستهدف (التحويل تنافسي وفق المقاعد المتاحة).',
      'يُفتح التقديم على التحويل إلكترونياً عبر الخدمة الذاتية في الفترات المحددة بالتقويم الأكاديمي نهاية كل فصل.'
    ]
  },
  {
    id: 'campus-housing',
    category: 'campus',
    categoryLabel: 'الكليات والمباني',
    question: 'كيف أقدم على السكن الجامعي للطلاب أو الطالبات؟',
    summary: 'السكن الجامعي مخصص للطلاب المقبولين القادمين من خارج الرياض (ممن تبعد مقار إقامتهم أكثر من 80 كم).',
    points: [
      'يُفتح التقديم إلكترونياً عبر بوابة الإسكان الطلابي قبل انطلاق كل فصل دراسي.',
      'تتم المفاضلة والقبول بناءً على بُعد المسافة وتاريخ التقديم واكتمال المستندات المطلوبة.',
      'يوفر السكن بيئة مجهزة بالخدمات الغذائية والإنترنت والمكتبات وقاعات الأنشطة والمواصلات للكليات.'
    ]
  },
  {
    id: 'campus-parking',
    category: 'campus',
    categoryLabel: 'الكليات والمباني',
    question: 'هل الدخول ومواقف السيارات بالجامعة تتطلب تصريحاً أو رسوماً؟',
    summary: 'المواقف العامة المحيطة بمباني الكليات مجانية ومتاحة لجميع الطلاب بدون تصريح خاص.',
    points: [
      'يمكن للطلاب الدخول بسياراتهم عبر البوابات الرئيسية (مثل بوابة 1، بوابة 2، وبوابة 3) بحي الفلاح.',
      'يُشترط فقط الالتزام بالوقوف النظامي داخل الخطوط وتجنب إغلاق المسارات أو الوقوف بمواقف ذوي الإعاقة لتفادي المخالفات.'
    ]
  },
  {
    id: 'campus-books',
    category: 'campus',
    categoryLabel: 'الكليات والمباني',
    question: 'متى أشتري الكتب والمذكرات الدراسية ومن أين؟',
    summary: 'تريّث ولا تستعجل بشراء أي كتاب أو مذكرة قبل حضور المحاضرة الأولى وسماع توجيه دكتور المقرر.',
    points: [
      'كثير من أساتذة المقررات يكتفون بالسلايدات والمذكرات الإلكترونية المرفوعة على البلاك بورد أو منصة مساعد الإمام.',
      'الكتب المعتمدة رسمياً تتوفر في مكتبات الجامعة بمجمع الخدمات الطلابية أو المكتبات المحيطة بالجامعة.'
    ]
  },
  {
    id: 'systems-tawasol',
    category: 'systems',
    categoryLabel: 'الأنظمة والحسابات',
    question: 'ما هي بوابة "تواصل" وما الخدمات التي تقدمها لي كطالب؟',
    summary: 'بوابة تواصل هي نظام التذاكر والدعم الأكاديمي والإداري الرسمي بين الطالب وكافة عمادات وكليات الجامعة.',
    points: [
      'تُستخدم لرفع طلبات الأعذار الطبية، والاستفسارات الأكاديمية، والاعتراض على الرصد، وطلبات الإفادات الرسمية.',
      'تضمن لك البوابة توثيق طلبك برقم تذكرة رسمي ومتابعة ردود المسؤولين ورؤساء الأقسام المختصة مباشرة.'
    ],
    actionLink: {
      label: 'فتح بوابة تواصل الرسمية',
      url: 'https://tawasol.imamu.edu.sa'
    }
  }
];

export function NewbiePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'faq' | 'checklist' | 'systems' | 'links'>('faq');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(['schedule-auto']));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newbieLinks, setNewbieLinks] = useState<NewbieLink[]>([]);

  // Fetch dynamic newbie links
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
    banner: false,
    iban: false,
    blackboard: false,
    digitalCard: false,
    campusRoom: false,
    tawasol: false
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('newbie_checklist_v2');
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
      localStorage.setItem('newbie_checklist_v2', JSON.stringify(checklist));
    }
  }, [checklist, isLoaded]);

  const toggleChecklistItem = (key: string) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const checklistItems = [
    { key: 'email', label: 'تفعيل البريد الجامعي عبر Microsoft Outlook (رقمك@sm.imamu.edu.sa)' },
    { key: 'banner', label: 'تسجيل الدخول الأول للخدمة الذاتية (Banner) واستعراض الجدول الدراسي التلقائي' },
    { key: 'iban', label: 'إدخال وتثبيت رقم الآيبان البنكي (IBAN) بالخدمة الذاتية لاستلام المكافأة الشهرية' },
    { key: 'blackboard', label: 'الدخول لمنصة البلاك بورد (Blackboard) والتأكد من ظهور مقررات المستوى الأول' },
    { key: 'digitalCard', label: 'حفظ صورة البطاقة الجامعية الرقمية وإشعار القبول على هاتفك لإبرازها عند الدخول' },
    { key: 'campusRoom', label: 'معرفة رقم مبنى كليتك وقاعاتك المحددة في جدولك قبل انطلاق اليوم الأول' },
    { key: 'tawasol', label: 'التعرف على بوابة تواصل لحفظ وسيلة تواصل رسمية مع كليتك عند الحاجة' }
  ];

  const completedCount = Object.values(checklist).filter(Boolean).length;
  const progressPercent = Math.round((completedCount / checklistItems.length) * 100);

  // FAQ accordion toggles
  const toggleFAQ = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(filteredFAQs.map(f => f.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const copyAnswer = (item: FAQItem) => {
    const text = item.question + '\n\n' + item.summary + '\n\n• ' + item.points.join('\n• ') + '\n\n(المصدر: مساعد جامعة الإمام)';
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Categories
  const categories = [
    { id: 'all', label: 'جميع الأسئلة' },
    { id: 'schedule', label: 'الجداول والتسجيل' },
    { id: 'reward', label: 'المكافأة والآيبان' },
    { id: 'systems', label: 'الأنظمة والبريد' },
    { id: 'absence', label: 'الغياب والأعذار' },
    { id: 'campus', label: 'الكليات والمباني' }
  ];

  // Filtered FAQ Items
  const filteredFAQs = useMemo(() => {
    return FAQ_DATA.filter(item => {
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCat) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.question.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.points.some(p => p.toLowerCase().includes(q))
      );
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div className="flex flex-col flex-1 w-full pb-24 px-4 sm:px-6 lg:px-8 pt-8 relative max-w-4xl mx-auto min-h-screen text-right font-sans" dir="rtl">
      {/* Back Button */}
      <button 
        onClick={() => router.push('/how-to')}
        className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-zinc-400 hover:text-[var(--color-imamu-accent)] dark:hover:text-[var(--color-imamu-accent)] transition font-bold mb-6 bg-white dark:bg-zinc-900/50 hover:bg-slate-50 dark:hover:bg-zinc-800/50 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs self-start cursor-pointer active:scale-95"
      >
        <ArrowLeft className="w-4 h-4 rotate-180" /> العودة إلى مركز الشروحات
      </button>

      {/* Hero Header Banner */}
      <div 
        className="w-full relative overflow-hidden rounded-3xl p-6 sm:p-8 mb-8 text-right border transition-all duration-300 shadow-2xs"
        style={{
          background: 'var(--bg-card)',
          borderColor: 'var(--border-color)'
        }}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4 text-center sm:text-right flex-col sm:flex-row">
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs"
              style={{
                background: 'color-mix(in srgb, var(--color-imamu-brown) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--color-imamu-brown) 25%, transparent)',
                color: 'var(--color-imamu-accent)'
              }}
            >
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold mb-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                <Sparkles className="w-3 h-3" /> دليل موثق ومحدث للدفعة المستجدة
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold transition-colors text-slate-900 dark:text-white">
                دليل الطلاب المستجدين 🎓
              </h1>
              <p className="text-xs sm:text-sm mt-1.5 font-normal max-w-xl leading-relaxed text-slate-600 dark:text-zinc-400">
                إجابات مباشرة ومؤكدة على كافة تساؤلات المستجدين: الجداول، المكافآت، الأنظمة الأكاديمية، والغياب دون أي معلومات مغلوطة.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-slate-200 dark:border-zinc-800">
        <button
          onClick={() => setActiveTab('faq')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'faq'
              ? 'bg-[var(--color-imamu-brown)] text-white shadow-xs'
              : 'bg-white dark:bg-zinc-900/60 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
          }`}
        >
          <HelpCircle className="w-4 h-4" /> الأسئلة الأكثر شيوعاً ({FAQ_DATA.length})
        </button>

        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'checklist'
              ? 'bg-[var(--color-imamu-brown)] text-white shadow-xs'
              : 'bg-white dark:bg-zinc-900/60 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" /> قائمة مهام المستجد ({completedCount}/{checklistItems.length})
        </button>

        <button
          onClick={() => setActiveTab('systems')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'systems'
              ? 'bg-[var(--color-imamu-brown)] text-white shadow-xs'
              : 'bg-white dark:bg-zinc-900/60 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
          }`}
        >
          <Laptop className="w-4 h-4" /> البوابات والأنظمة الرسمية
        </button>

        <button
          onClick={() => setActiveTab('links')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
            activeTab === 'links'
              ? 'bg-[var(--color-imamu-brown)] text-white shadow-xs'
              : 'bg-white dark:bg-zinc-900/60 text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800'
          }`}
        >
          <Phone className="w-4 h-4" /> الأدلة والاتصال
        </button>
      </div>

      {/* TAB 1: FAQ ACCORDION (MAIN USER REQUEST) */}
      {activeTab === 'faq' && (
        <div className="space-y-6">
          {/* Search Bar & Controls */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في أسئلة المستجدين (مثل: مكافأة، جدول، غياب، بلاك بورد)..."
                className="w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl py-2.5 pr-10 pl-4 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[var(--color-imamu-accent)] transition shadow-2xs"
              />
              <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 font-bold"
                >
                  مسح
                </button>
              )}
            </div>

            {/* Expand / Collapse All Controls */}
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={expandAll}
                className="px-3 py-2 rounded-lg text-[11px] font-bold text-slate-600 dark:text-zinc-400 hover:text-[var(--color-imamu-accent)] border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                توسيع الكل
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-3 py-2 rounded-lg text-[11px] font-bold text-slate-600 dark:text-zinc-400 hover:text-[var(--color-imamu-accent)] border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 transition hover:bg-slate-50 cursor-pointer shadow-2xs"
              >
                طي الكل
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map(cat => {
              const count = cat.id === 'all' 
                ? FAQ_DATA.length 
                : FAQ_DATA.filter(f => f.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer border ${
                    selectedCategory === cat.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs'
                      : 'bg-white dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>

          {/* FAQ Accordion List */}
          <div className="space-y-3">
            {filteredFAQs.map((item) => {
              const isExpanded = expandedIds.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                    isExpanded
                      ? 'border-amber-500/40 bg-amber-500/[0.02] dark:bg-zinc-900/80 shadow-xs'
                      : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  {/* Header Row / Question Bar */}
                  <div
                    onClick={() => toggleFAQ(item.id)}
                    className="p-4 sm:p-5 flex items-start sm:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                      <div 
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 transition-colors ${
                          isExpanded 
                            ? 'bg-[var(--color-imamu-brown)] text-white' 
                            : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                        }`}
                      >
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md border bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-zinc-800">
                            {item.categoryLabel}
                          </span>
                        </div>
                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                          {item.question}
                        </h3>
                      </div>
                    </div>

                    {/* Expand/Collapse Chevron Button */}
                    <button
                      type="button"
                      aria-label="توسيع أو طي الإجابة"
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-all duration-200 ${
                        isExpanded
                          ? 'bg-[var(--color-imamu-brown)] text-white border-transparent rotate-180 shadow-xs'
                          : 'bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700 hover:bg-slate-100'
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Expandable Body / Small Answer */}
                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        key="content"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="px-4 pb-5 sm:px-5 sm:pb-6 pt-1 border-t border-slate-100 dark:border-zinc-800/80">
                          {/* Short Direct Summary Callout */}
                          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 dark:text-emerald-300 text-xs sm:text-sm font-semibold mb-3 flex items-start gap-2.5">
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <div className="flex-1 leading-relaxed">
                              {item.summary}
                            </div>
                          </div>

                          {/* Concise Verified Points */}
                          <ul className="space-y-2 pr-2 text-xs sm:text-sm text-slate-700 dark:text-zinc-300 leading-relaxed font-normal">
                            {item.points.map((pt, pIdx) => (
                              <li key={pIdx} className="flex items-start gap-2.5">
                                <span className="text-[var(--color-imamu-accent)] font-bold text-xs mt-1 shrink-0">•</span>
                                <span className="flex-1">{pt}</span>
                              </li>
                            ))}
                          </ul>

                          {/* Action Link & Copy Buttons */}
                          <div className="flex items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-zinc-800 flex-wrap">
                            {item.actionLink ? (
                              <a
                                href={item.actionLink.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-imamu-accent)] hover:underline"
                              >
                                {item.actionLink.label} <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            ) : <div />}

                            <button
                              type="button"
                              onClick={() => copyAnswer(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-[11px] font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition cursor-pointer shadow-2xs"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-500" /> تم نسخ الإجابة
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" /> نسخ الإجابة
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

            {filteredFAQs.length === 0 && (
              <div className="text-center py-12 border border-dashed rounded-2xl p-6 bg-slate-50 dark:bg-zinc-950/50 border-slate-200 dark:border-zinc-800">
                <HelpCircle className="w-8 h-8 mx-auto text-slate-400 dark:text-zinc-600 mb-2" />
                <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200">لم يتم العثور على سؤال مطابق</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1">جرب البحث بكلمات أخرى مثل "مكافأة"، "آيبان"، "جدول"، أو "حرمان".</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: INTERACTIVE CHECKLIST */}
      {activeTab === 'checklist' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xs">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">📋 قائمة مهام الطالب المستجد</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">أكمل الخطوات التالية لضمان تفعيل حساباتك وبطاقاتك وجدولك بدون تعثر:</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                نسبة الإنجاز: {progressPercent}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 dark:bg-zinc-950 h-3 rounded-full overflow-hidden border border-slate-200 dark:border-zinc-800 mb-6">
              <div 
                className="bg-[var(--color-imamu-brown)] h-full transition-all duration-500 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="flex flex-col gap-3">
              {checklistItems.map(item => (
                <div 
                  key={item.key}
                  onClick={() => toggleChecklistItem(item.key)}
                  className={`flex items-start gap-3.5 p-4 rounded-xl border transition cursor-pointer select-none shadow-2xs ${
                    checklist[item.key]
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-300'
                      : 'bg-slate-50/70 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-100/70 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                    checklist[item.key] ? 'bg-emerald-600 text-white shadow-xs' : 'border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                  }`}>
                    {checklist[item.key] && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </span>
                  <span className={`text-xs sm:text-sm font-semibold leading-relaxed ${checklist[item.key] ? 'line-through text-slate-400 dark:text-zinc-500 font-medium' : ''}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: OFFICIAL SYSTEMS */}
      {activeTab === 'systems' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Banner */}
            <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-2xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-[var(--color-imamu-accent)] border border-amber-500/20 flex items-center justify-center mb-3">
                  <Laptop className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">الخدمة الذاتية (Banner)</h4>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-normal mb-4">
                  البوابة الإدارية الرسمية لاستعراض وحفظ الجدول الدراسي، متابعة المعدل التراكمي والسجل الأكاديمي، وتحديث رقم الآيبان البنكي للمكافأة.
                </p>
              </div>
              <a 
                href="https://bstss.imamu.edu.sa/StudentSelfService" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-rise inline-flex items-center justify-center gap-2 bg-[var(--color-imamu-brown)] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs hover:shadow-md transition"
              >
                دخول الخدمة الذاتية <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Blackboard */}
            <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-2xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-3">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">منصة البلاك بورد (Blackboard)</h4>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-normal mb-4">
                  المنصة التعليمية اليومية لتحميل السلايدات والمذكرات، تسليم الواجبات والتكاليف، إجراء الاختبارات القصيرة، والتواصل مع أساتذة المواد.
                </p>
              </div>
              <a 
                href="https://lms.imamu.edu.sa" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-rise inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs hover:shadow-md transition"
              >
                دخول البلاك بورد <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Microsoft 365 Outlook */}
            <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-2xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center mb-3">
                  <Mail className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">بريد الطلاب (Microsoft Outlook)</h4>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-normal mb-4">
                  بريدك الأكاديمي الرسمي عبر Office 365 (رقمك@sm.imamu.edu.sa) لاستلام تعاميم الكلية وإشعارات الحصص والتواصل مع الأساتذة.
                </p>
              </div>
              <a 
                href="https://outlook.office.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-rise inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs hover:shadow-md transition"
              >
                دخول بريد Outlook <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Tawasol */}
            <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 p-5 rounded-2xl shadow-2xs flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-3">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-2">بوابة تواصل الموحدة (Tawasol)</h4>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-normal mb-4">
                  بوابة رفع التذاكر الرسمية لتقديم الأعذار الطبية الصادرة من تطبيق صحتي، حل مشكلات التسجيل الأكاديمي، ورفع الاستفسارات لكليتك.
                </p>
              </div>
              <a 
                href="https://tawasol.imamu.edu.sa" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn-rise inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-xs hover:shadow-md transition"
              >
                فتح بوابة تواصل <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: DIRECTORIES & LINKS */}
      {activeTab === 'links' && (
        <div className="space-y-6">
          {/* University Phone & Email Directories */}
          <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xs">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
              <Compass className="w-4.5 h-4.5 text-[var(--color-imamu-accent)]" /> أدلة الاتصال الرسمية بالجامعة 📞
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6">
              تصفح أدلة الهواتف والبريد الإلكتروني للوصول السريع إلى شؤون الطلاب، العمادات، والأقسام الأكاديمية:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button 
                onClick={() => router.push('/numbers')}
                className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-slate-100/80 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 rounded-xl transition text-right group w-full shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">دليل الأرقام الهاتفية والتحويلات</h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">أرقام الكليات، العمادات، وخطوط الطوارئ والسلامة.</p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90 group-hover:text-emerald-600 transition" />
              </button>

              <button 
                onClick={() => router.push('/emails')}
                className="flex items-center justify-between p-4 bg-slate-50/80 hover:bg-slate-100/80 dark:bg-zinc-950/40 dark:hover:bg-zinc-800/60 border border-slate-200 dark:border-zinc-800 rounded-xl transition text-right group w-full shadow-2xs cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center shrink-0">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">دليل البريد الإلكتروني الأكاديمي</h4>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">إيميلات شؤون الطلاب، العميد، ومسؤولي التخصصات.</p>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90 group-hover:text-blue-600 transition" />
              </button>
            </div>
          </div>

          {/* Dynamic Newbie Links from DB */}
          {newbieLinks.length > 0 && (
            <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <ExternalLink className="w-4.5 h-4.5 text-[var(--color-imamu-accent)]" /> روابط ومنصات هامة للمستجدين
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {newbieLinks.map(link => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-950/30 hover:border-slate-300 dark:hover:border-zinc-700 transition flex items-start justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[var(--color-imamu-accent)] transition-colors">
                        {link.title}
                      </h4>
                      {link.description && (
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          {link.description}
                        </p>
                      )}
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono mt-2 block truncate">
                        {link.url}
                      </span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-[var(--color-imamu-accent)] shrink-0 mt-0.5" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
