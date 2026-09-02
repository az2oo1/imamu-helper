'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Mail, Search, ChevronLeft,
  Building, BookOpen, Compass, ShieldAlert,
  Send, ExternalLink, HelpCircle
} from 'lucide-react';

interface College {
  id: string;
  name: string;
  description: string;
  emails: { role: string; email: string }[];
}

const colleges: College[] = [
  {
    id: 'engineering',
    name: 'كلية الهندسة ⚙️',
    description: 'الأقسام العلمية، الإرشاد الأكاديمي، ومسجلو الكلية.',
    emails: [
      { role: 'عميد الكلية', email: 'eng-dean@imamu.edu.sa' },
      { role: 'وكيل الكلية للشؤون التعليمية', email: 'eng-academic@imamu.edu.sa' },
      { role: 'مسجل شؤون الطلاب', email: 'eng-reg@imamu.edu.sa' },
      { role: 'قسم الهندسة الكهربائية', email: 'eng-ee@imamu.edu.sa' },
      { role: 'قسم الهندسة الميكانيكية', email: 'eng-me@imamu.edu.sa' },
      { role: 'قسم الهندسة المدنية', email: 'eng-ce@imamu.edu.sa' },
      { role: 'قسم الهندسة الكيميائية', email: 'eng-che@imamu.edu.sa' },
      { role: 'مكتب الإرشاد الأكاديمي', email: 'eng-advising@imamu.edu.sa' },
      { role: 'لجنة التدريب التعاوني', email: 'eng-training@imamu.edu.sa' }
    ]
  },
  {
    id: 'ccis',
    name: 'كلية علوم الحاسب والمعلومات 💻',
    description: 'أقسام علوم وهندسة الحاسب ونظم وتقنية المعلومات.',
    emails: [
      { role: 'عميد الكلية', email: 'ccis-dean@imamu.edu.sa' },
      { role: 'وكيل الكلية للشؤون التعليمية', email: 'ccis-academic@imamu.edu.sa' },
      { role: 'مسجل شؤون الطلاب (القبول والتسجيل)', email: 'ccis-reg@imamu.edu.sa' },
      { role: 'قسم علوم الحاسب (CS)', email: 'ccis-cs@imamu.edu.sa' },
      { role: 'قسم نظم المعلومات (IS)', email: 'ccis-is@imamu.edu.sa' },
      { role: 'قسم تقنية المعلومات (IT)', email: 'ccis-it@imamu.edu.sa' },
      { role: 'قسم هندسة الحاسب (CE)', email: 'ccis-ce@imamu.edu.sa' },
      { role: 'وحدة الإرشاد الأكاديمي والطلابي', email: 'ccis-advising@imamu.edu.sa' },
      { role: 'سكرتارية الكلية والدعم الأكاديمي', email: 'ccis-support@imamu.edu.sa' }
    ]
  },
  {
    id: 'science',
    name: 'كلية العلوم 🔬',
    description: 'أقسام الرياضيات، الفيزياء، الكيمياء، والأحياء.',
    emails: [
      { role: 'عميد كلية العلوم', email: 'sci-dean@imamu.edu.sa' },
      { role: 'وكيل الشؤون التعليمية', email: 'sci-academic@imamu.edu.sa' },
      { role: 'قسم الرياضيات والإحصاء', email: 'sci-math@imamu.edu.sa' },
      { role: 'قسم الفيزياء', email: 'sci-phys@imamu.edu.sa' },
      { role: 'قسم الكيمياء', email: 'sci-chem@imamu.edu.sa' },
      { role: 'قسم الأحياء', email: 'sci-bio@imamu.edu.sa' },
      { role: 'شؤون الطلاب والتسجيل بالكلية', email: 'sci-students@imamu.edu.sa' }
    ]
  },
  {
    id: 'economics',
    name: 'كلية الاقتصاد والعلوم الإدارية 📈',
    description: 'أقسام المحاسبة، التمويل، إدارة الأعمال، والاقتصاد.',
    emails: [
      { role: 'عميد الكلية', email: 'eco-dean@imamu.edu.sa' },
      { role: 'وكيل الكلية للشؤون التعليمية', email: 'eco-academic@imamu.edu.sa' },
      { role: 'شؤون طلاب كلية الاقتصاد', email: 'eco-students@imamu.edu.sa' },
      { role: 'قسم إدارة الأعمال', email: 'eco-bus@imamu.edu.sa' },
      { role: 'قسم المحاسبة', email: 'eco-acc@imamu.edu.sa' },
      { role: 'قسم التمويل والاستثمار', email: 'eco-fin@imamu.edu.sa' },
      { role: 'قسم الاقتصاد', email: 'eco-econ@imamu.edu.sa' }
    ]
  },
  {
    id: 'sharia',
    name: 'كلية الشريعة والدراسات الإسلامية ⚖️',
    description: 'الفقه وأصوله، الأنظمة، ومكاتب تسجيل الطلاب.',
    emails: [
      { role: 'عميد كلية الشريعة', email: 'sharia-dean@imamu.edu.sa' },
      { role: 'مسجل الكلية وشؤون الطلاب', email: 'sharia-reg@imamu.edu.sa' },
      { role: 'قسم الفقه', email: 'sharia-fiqh@imamu.edu.sa' },
      { role: 'قسم أصول الفقه', email: 'sharia-roots@imamu.edu.sa' },
      { role: 'قسم الأنظمة (القانون)', email: 'sharia-law@imamu.edu.sa' }
    ]
  },
  {
    id: 'languages',
    name: 'كلية اللغات والترجمة 🗣️',
    description: 'قسم اللغة الإنجليزية والترجمة، ومستشارو الطلاب.',
    emails: [
      { role: 'عميد كلية اللغات', email: 'lang-dean@imamu.edu.sa' },
      { role: 'وكيل الشؤون التعليمية', email: 'lang-academic@imamu.edu.sa' },
      { role: 'قسم اللغة الإنجليزية وآدابها', email: 'lang-eng@imamu.edu.sa' },
      { role: 'وحدة الترجمة واللغات الأخرى', email: 'lang-translation@imamu.edu.sa' },
      { role: 'شؤون وتسجيل طلاب الكلية', email: 'lang-students@imamu.edu.sa' }
    ]
  },
  {
    id: 'deanships',
    name: 'السنة التحضيرية والعمادات المساندة 🎓',
    description: 'القبول والتسجيل، شؤون الطلاب، والتعليم الإلكتروني.',
    emails: [
      { role: 'عمادة القبول والتسجيل (الاستفسارات الأكاديمية)', email: 'dar@imamu.edu.sa' },
      { role: 'عمادة شؤون الطلاب (المكافآت والأنشطة)', email: 'dsa@imamu.edu.sa' },
      { role: 'عمادة التعليم الإلكتروني (دعم البلاك بورد)', email: 'del@imamu.edu.sa' },
      { role: 'وحدة دعم مكافآت الطلاب والبطاقات البنكية', email: 'rewards@imamu.edu.sa' },
      { role: 'الدعم التعليمي لمسارات السنة التحضيرية', email: 'py-support@imamu.edu.sa' },
      { role: 'الدعم التقني الرئيسي لتقنية المعلومات', email: 'it@imamu.edu.sa' }
    ]
  }
];

const collegeThemes: Record<string, string> = {
  engineering: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50 text-orange-900 dark:text-orange-300 border-r-4 border-r-orange-500 shadow-xs',
  ccis: 'bg-stone-50 dark:bg-stone-950/30 border-amber-200 dark:border-stone-900/50 text-stone-900 dark:text-[var(--color-imamu-accent)] border-r-4 border-r-amber-700 shadow-xs',
  science: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-900/50 text-purple-900 dark:text-purple-300 border-r-4 border-r-purple-500 shadow-xs',
  economics: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-300 border-r-4 border-r-emerald-500 shadow-xs',
  sharia: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 text-indigo-900 dark:text-indigo-300 border-r-4 border-r-indigo-500 shadow-xs',
  languages: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-900 dark:text-rose-300 border-r-4 border-r-rose-500 shadow-xs',
  deanships: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-[var(--color-imamu-accent)] dark:text-amber-300 border-r-4 border-r-amber-500 shadow-xs'
};

export function EmailsPage() {
  const router = useRouter();
  const [selectedCollegeId, setSelectedCollegeId] = useState<string>('engineering');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const selectedCollege = colleges.find(c => c.id === selectedCollegeId) || colleges[0];

  // Filter emails based on search query
  const filteredEmails = selectedCollege.emails.filter(item => 
    item.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col flex-1 w-full pb-24 px-4 sm:px-6 lg:px-8 pt-8 relative max-w-5xl mx-auto min-h-screen text-right" dir="rtl">
      
      {/* Back Button */}
      <button 
        onClick={() => router.push('/how-to')}
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400 hover:text-[var(--color-imamu-accent)] dark:hover:text-[var(--color-imamu-accent)] transition font-semibold mb-6 bg-white dark:bg-zinc-900/40 hover:bg-slate-50 dark:hover:bg-zinc-800/40 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs self-start"
      >
        <ArrowLeft className="w-4 h-4 rotate-180" /> العودة إلى الدليلة
      </button>

      {/* Header Directory Info */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-3 mb-2.5">
          <div className="w-10 h-10 bg-emerald-50 dark:bg-zinc-900 border border-emerald-200 dark:border-zinc-800 rounded-2xl flex items-center justify-center shadow-xs">
            <Mail className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-zinc-100">دليل البريد الإلكتروني لكليات الجامعة</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mr-13 font-semibold leading-relaxed">
          الدليل الموحد للتواصل مع منسوبي ومسؤولي الكليات، المرشدين الأكاديميين، والأقسام العلمية بجامعة الإمام.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left/Right Selector: Colleges list */}
        <div className="md:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 px-1">
            <Building className="w-4 h-4" /> اختر الكلية
          </h3>
          <div className="flex flex-col gap-2.5">
            {/* General University & Deanships Button */}
            <button
              onClick={() => {
                setSelectedCollegeId('deanships');
                setSearchQuery('');
              }}
              className={`p-4 rounded-2xl border text-right transition-all duration-300 flex flex-col gap-1 w-full ${
                selectedCollegeId === 'deanships'
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-[var(--color-imamu-accent)] dark:text-amber-300 border-r-4 border-r-amber-500 shadow-xs'
                  : 'bg-slate-50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:border-slate-300 dark:hover:border-zinc-700'
              }`}
            >
              <span className="text-xs font-bold">العمادات والخدمات المشتركة 🏛️</span>
              <span className="text-[10px] leading-relaxed text-slate-500 dark:text-zinc-500">
                القبول والتسجيل، شؤون الطلاب، المكافآت، والتعليم الإلكتروني.
              </span>
            </button>

            {colleges.filter(c => c.id !== 'deanships').map(college => (
              <button
                key={college.id}
                onClick={() => {
                  setSelectedCollegeId(college.id);
                  setSearchQuery('');
                }}
                className={`p-4 rounded-2xl border text-right transition-all duration-300 flex flex-col gap-1 w-full ${
                  selectedCollegeId === college.id 
                    ? (collegeThemes[college.id] || 'bg-stone-50 dark:bg-stone-950/30 border-amber-200 dark:border-stone-900/50 text-stone-900 dark:text-[var(--color-imamu-accent)] border-r-4 border-r-amber-700 shadow-xs') 
                    : 'bg-slate-50 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <span className="text-xs font-bold">{college.name}</span>
                <span className={`text-[10px] leading-relaxed ${selectedCollegeId === college.id ? 'text-slate-600 dark:text-zinc-400' : 'text-slate-400 dark:text-zinc-500'}`}>
                  {college.description}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right/Left Contents: Selected College Emails */}
        <div className="md:col-span-2 space-y-4">
          
          {/* Search bar */}
          <div className="relative w-full">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
            </div>
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث عن قسم، مسؤول أو إيميل..."
              className="w-full pr-11 pl-4 py-3 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-700 rounded-2xl outline-none transition shadow-xs text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-[var(--color-imamu-brown)] dark:focus:border-[var(--color-imamu-brown)] focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20"
            />
          </div>

          {/* Emails Results */}
          <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-4 mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">{selectedCollege.name}</h3>
              <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] px-2.5 py-1 rounded-full font-bold border border-emerald-100 dark:border-emerald-900/50">
                {filteredEmails.length} إيميل معتمد
              </span>
            </div>

            {filteredEmails.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="bg-slate-50/80 dark:bg-zinc-950/60 border-b border-slate-100 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-bold">
                    <tr>
                      <th className="p-3">القسم / المسؤول</th>
                      <th className="p-3 text-right">البريد الإلكتروني الرسمي</th>
                      <th className="p-3 text-center w-20">تواصل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-slate-700 dark:text-zinc-300">
                    {filteredEmails.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/30 transition">
                        <td className="p-3 font-semibold text-slate-900 dark:text-zinc-100">{item.role}</td>
                        <td className="p-3 font-mono text-slate-500 dark:text-zinc-400" dir="ltr">{item.email}</td>
                        <td className="p-3 text-center">
                          <a 
                            href={`mailto:${item.email}`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 dark:bg-zinc-800 border border-emerald-200 dark:border-zinc-700 text-emerald-600 dark:text-zinc-300 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 dark:hover:text-white hover:border-transparent transition shadow-xs"
                            title="إرسال بريد إلكتروني"
                          >
                            <Send className="w-3 h-3 rotate-180" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-14 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-zinc-500">
                <Mail className="w-10 h-10 text-slate-300 dark:text-zinc-600" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300">لا توجد نتائج مطابقة للبحث</h4>
                <p className="text-[11px] leading-relaxed max-w-xs">تأكد من كتابة الكلمة بشكل صحيح أو حدد كلية أخرى.</p>
              </div>
            )}
          </div>

          {/* Quick Notice Tip */}
          <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-2xl flex gap-3 text-right">
            <span className="text-[var(--color-imamu-accent)] font-bold text-lg select-none">💡</span>
            <p className="text-[11px] text-slate-700 dark:text-zinc-300 leading-relaxed">
              <strong className="text-slate-900 dark:text-zinc-100">توجيه هام:</strong> يرجى مراسلة الكليات والعمادات باستخدام <strong className="text-slate-900 dark:text-zinc-100">بريدك الإلكتروني الجامعي الأكاديمي</strong> الرسمي لضمان الحصول على رد وتفادي تصنيف رسالتك كبريد غير هام.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
