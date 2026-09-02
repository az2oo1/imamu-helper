'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Phone, Search, ChevronLeft,
  Building, ShieldAlert, Send
} from 'lucide-react';

interface PhoneContact {
  department: string;
  number: string;
  category: 'core' | 'colleges' | 'safety';
}

const phoneContacts: PhoneContact[] = [
  { department: 'سنترال الجامعة الرئيسي', number: '0112580000', category: 'core' },
  { department: 'عمادة القبول والتسجيل', number: '0112580145', category: 'core' },
  { department: 'عمادة شؤون الطلاب', number: '0112580156', category: 'core' },
  { department: 'كلية علوم الحاسب والمعلومات', number: '0112586666', category: 'colleges' },
  { department: 'كلية الهندسة', number: '0112587777', category: 'colleges' },
  { department: 'كلية العلوم', number: '0112585555', category: 'colleges' },
  { department: 'كلية الاقتصاد والعلوم الإدارية', number: '0112583333', category: 'colleges' },
  { department: 'كلية اللغات والترجمة', number: '0112584444', category: 'colleges' },
  { department: 'كلية الشريعة', number: '0112582211', category: 'colleges' },
  { department: 'المركز الطبي الجامعي (المستوصف)', number: '0112581111', category: 'core' },
  { department: 'طوارئ السلامة والحرائق والإنقاذ', number: '0112589999', category: 'safety' },
  { department: 'إدارة الأمن الجامعي والمتابعة', number: '0112582222', category: 'safety' }
];

const filterTabs: { key: 'all' | 'core' | 'colleges' | 'safety'; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'core', label: 'العمادات والخدمات الرئيسية' },
  { key: 'colleges', label: 'إدارات الكليات' },
  { key: 'safety', label: 'الأمن والسلامة والطوارئ' },
];

export function NumbersPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'core' | 'colleges' | 'safety'>('all');

  // Filter contacts
  const filteredContacts = phoneContacts.filter(contact => {
    const matchesSearch = contact.department.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          contact.number.includes(searchQuery);
    const matchesCategory = activeCategory === 'all' || contact.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col flex-1 w-full pb-24 px-4 sm:px-6 lg:px-8 pt-8 relative max-w-5xl mx-auto min-h-screen text-right" dir="rtl">
      
      {/* Back Button */}
      <button 
        onClick={() => router.push('/how-to')}
        className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-zinc-400 hover:text-[var(--color-imamu-accent)] dark:hover:text-[var(--color-imamu-accent)] transition font-semibold mb-6 bg-white dark:bg-zinc-900/40 hover:bg-slate-50 dark:hover:bg-zinc-800/40 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-xs self-start"
      >
        <ArrowLeft className="w-4 h-4 rotate-180" /> العودة إلى الدليلة
      </button>

      {/* Header Info */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-3 mb-2.5">
          <div className="w-10 h-10 bg-stone-50 dark:bg-zinc-900 border border-amber-200 dark:border-zinc-800 rounded-xl flex items-center justify-center shadow-xs text-[var(--color-imamu-accent)] dark:text-zinc-400">
            <Phone className="w-5 h-5" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900 dark:text-zinc-100">دليل الأرقام الهاتفية والتحويلات</h1>
        </div>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mr-13 font-semibold leading-relaxed">
          الأرقام والخطوط الهاتفية الرسمية المعتمدة للتواصل المباشر مع إدارات وكليات جامعة الإمام بالرياض.
        </p>
      </div>

      {/* Categories and Filters Grid */}
      <div className="flex flex-wrap gap-2.5 mb-6">
        {filterTabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveCategory(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 ${
              activeCategory === tab.key
                ? 'bg-[var(--color-imamu-brown)] border-transparent text-white shadow-sm'
                : 'bg-white dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:text-slate-900 dark:hover:text-zinc-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative w-full mb-6">
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-slate-400 dark:text-zinc-500" />
        </div>
        <input 
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="ابحث عن كلية، قسم، مسؤول أو رقم..."
          className="w-full pr-11 pl-4 py-3 bg-white dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-700 rounded-2xl outline-none transition shadow-xs text-xs text-slate-900 dark:text-zinc-100 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:border-[var(--color-imamu-brown)] dark:focus:border-[var(--color-imamu-brown)] focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20"
        />
      </div>

      {/* Numbers Catalog Table Card */}
      <div className="bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm overflow-hidden">
        {filteredContacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-slate-50/80 dark:bg-zinc-950/60 border-b border-slate-150 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 font-bold">
                <tr>
                  <th className="p-3.5">الجهة / القسم</th>
                  <th className="p-3.5 text-right">رقم التواصل المباشر</th>
                  <th className="p-3.5 text-center w-20">اتصال</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/60 text-slate-700 dark:text-zinc-300">
                {filteredContacts.map((contact, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/30 transition">
                    <td className="p-3.5 font-bold text-slate-900 dark:text-zinc-100 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        contact.category === 'safety' ? 'bg-red-500' :
                        contact.category === 'colleges' ? 'bg-indigo-500' : 'bg-[var(--color-imamu-brown)]'
                      }`} />
                      {contact.department}
                    </td>
                    <td className="p-3.5 font-mono text-slate-500 dark:text-zinc-400 text-sm" dir="ltr">{contact.number}</td>
                    <td className="p-3.5 text-center">
                      <a 
                        href={`tel:${contact.number}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-stone-50 dark:bg-zinc-800 border border-amber-200 dark:border-zinc-700 text-[var(--color-imamu-accent)] dark:text-zinc-300 hover:bg-[var(--color-imamu-brown)] hover:text-white dark:hover:bg-[var(--color-imamu-brown)] dark:hover:text-white hover:border-transparent transition shadow-xs"
                        title="اتصال مباشر"
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-14 flex flex-col items-center justify-center gap-3 text-slate-400 dark:text-zinc-500">
            <Phone className="w-10 h-10 text-slate-300 dark:text-zinc-600" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300">لا توجد نتائج مطابقة</h4>
            <p className="text-[11px] leading-relaxed max-w-xs">تأكد من كتابة الكلمة بشكل صحيح، أو ابحث في تصنيف آخر.</p>
          </div>
        )}
      </div>

    </div>
  );
}
