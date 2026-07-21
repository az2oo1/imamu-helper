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
  engineering: 'bg-orange-50/60 border-orange-200 text-orange-850 border-r-4 border-r-orange-500 shadow-sm scale-[1.01]',
  ccis: 'bg-blue-50/60 border-blue-200 text-blue-850 border-r-4 border-r-blue-500 shadow-sm scale-[1.01]',
  science: 'bg-purple-50/60 border-purple-200 text-purple-850 border-r-4 border-r-purple-500 shadow-sm scale-[1.01]',
  economics: 'bg-emerald-50/60 border-emerald-200 text-emerald-850 border-r-4 border-r-emerald-500 shadow-sm scale-[1.01]',
  sharia: 'bg-indigo-50/60 border-indigo-200 text-indigo-850 border-r-4 border-r-indigo-500 shadow-sm scale-[1.01]',
  languages: 'bg-rose-50/60 border-rose-200 text-rose-850 border-r-4 border-r-rose-500 shadow-sm scale-[1.01]',
  deanships: 'bg-amber-50/70 border-amber-200 text-amber-850 border-r-4 border-r-amber-500 shadow-sm scale-[1.01]'
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
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[var(--color-imamu-blue)] transition font-semibold mb-6 bg-gray-50 hover:bg-gray-100 py-2.5 px-4 rounded-xl border border-gray-250/50 self-start"
      >
        <ArrowLeft className="w-4 h-4 rotate-180" /> العودة إلى الدليلة
      </button>

      {/* Header Directory Info */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-3 mb-2.5">
          <div className="w-10 h-10 bg-emerald-50 border border-emerald-100/50 rounded-2xl flex items-center justify-center shadow-sm">
            <Mail className="w-5.5 h-5.5 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-955">دليل البريد الإلكتروني لكليات الجامعة</h1>
        </div>
        <p className="text-sm text-gray-450 mr-13 font-semibold leading-relaxed">
          الدليل الموحد للتواصل مع منسوبي ومسؤولي الكليات، المرشدين الأكاديميين، والأقسام العلمية بجامعة الإمام.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Left/Right Selector: Colleges list */}
        <div className="md:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5 px-1">
            <Building className="w-4 h-4" /> اختر الكلية
          </h3>
          <div className="flex flex-col gap-2.5">
            {/* General University & Deanships Button */}
            <button
              onClick={() => {
                setSelectedCollegeId('deanships');
                setSearchQuery('');
              }}
              className={`p-4 rounded-2xl border text-right transition-all duration-305 flex flex-col gap-1 w-full ${
                selectedCollegeId === 'deanships'
                  ? 'bg-amber-50/70 border-amber-200 text-amber-850 border-r-4 border-r-amber-500 shadow-sm'
                  : 'bg-gray-50 border-gray-200/50 text-gray-750 hover:bg-gray-100/50 hover:border-gray-300'
              }`}
            >
              <span className="text-xs font-bold">العمادات والخدمات المشتركة 🏛️</span>
              <span className="text-[10px] leading-relaxed text-gray-400">
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
                className={`p-4 rounded-2xl border text-right transition-all duration-350 flex flex-col gap-1 w-full ${
                  selectedCollegeId === college.id 
                    ? (collegeThemes[college.id] || 'bg-blue-50/70 border-blue-200 text-blue-800 border-r-4 border-r-blue-500 shadow-sm') 
                    : 'bg-white border-gray-150 text-gray-700 hover:bg-gray-50/50 hover:border-gray-250'
                }`}
              >
                <span className="text-xs font-bold">{college.name}</span>
                <span className={`text-[10px] leading-relaxed ${selectedCollegeId === college.id ? 'text-gray-600' : 'text-gray-400'}`}>
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
              <Search className="w-4.5 h-4.5 text-gray-400" />
            </div>
            <input 
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="ابحث عن قسم، مسؤول أو إيميل..."
              className="w-full pr-11 pl-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[var(--color-imamu-blue)] focus:border-transparent outline-none transition shadow-sm text-xs"
            />
          </div>

          {/* Emails Results */}
          <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm">
            <div className="flex justify-between items-center border-b pb-4 mb-4">
              <h3 className="text-sm font-bold text-gray-955">{selectedCollege.name}</h3>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2.5 py-1 rounded-full font-bold">
                {filteredEmails.length} إيميل معتمد
              </span>
            </div>

            {filteredEmails.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="bg-gray-50/50 border-b border-gray-150 text-gray-450 font-bold">
                    <tr>
                      <th className="p-3">القسم / المسؤول</th>
                      <th className="p-3 text-right">البريد الإلكتروني الرسمي</th>
                      <th className="p-3 text-center w-20">تواصل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-650">
                    {filteredEmails.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition">
                        <td className="p-3 font-semibold text-gray-900">{item.role}</td>
                        <td className="p-3 font-mono text-gray-605" dir="ltr">{item.email}</td>
                        <td className="p-3 text-center">
                          <a 
                            href={`mailto:${item.email}`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition"
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
              <div className="text-center py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
                <Mail className="w-10 h-10 text-gray-300" />
                <h4 className="text-sm font-bold text-gray-900">لا توجد نتائج مطابقة للبحث</h4>
                <p className="text-[11px] leading-relaxed max-w-xs">تأكد من كتابة الكلمة بشكل صحيح أو حدد كلية أخرى.</p>
              </div>
            )}
          </div>

          {/* Quick Notice Tip */}
          <div className="bg-amber-50/30 border border-amber-150 p-4.5 rounded-2xl flex gap-3 text-right">
            <span className="text-amber-600 font-bold text-lg select-none">💡</span>
            <p className="text-[11px] text-gray-600 leading-relaxed">
              <strong>توجيه هام:</strong> يرجى مراسلة الكليات والعمادات باستخدام <strong>بريدك الإلكتروني الجامعي الأكاديمي</strong> الرسمي لضمان الحصول على رد وتفادي تصنيف رسالتك كبريد غير هام.
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
