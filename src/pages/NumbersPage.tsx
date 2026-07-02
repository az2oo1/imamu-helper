import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
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

export function NumbersPage() {
  const navigate = useNavigate();
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
        onClick={() => navigate('/how-to')}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-[var(--color-imamu-blue)] transition font-semibold mb-6 bg-gray-50 hover:bg-gray-100 py-2.5 px-4 rounded-xl border border-gray-250/50 self-start"
      >
        <ArrowLeft className="w-4 h-4 rotate-180" /> العودة إلى الدليلة
      </button>

      {/* Header Info */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-3 mb-2.5">
          <div className="w-10 h-10 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-center shadow-sm text-zinc-400">
            <Phone className="w-5 h-5" />
          </div>
          <h1 className="text-3xl font-display font-bold text-gray-955">دليل الأرقام الهاتفية والتحويلات</h1>
        </div>
        <p className="text-sm text-gray-450 mr-13 font-semibold leading-relaxed">
          الأرقام والخطوط الهاتفية الرسمية المعتمدة للتواصل المباشر مع إدارات وكليات جامعة الإمام بالرياض.
        </p>
      </div>

      {/* Categories and Filters Grid */}
      <div className="flex flex-wrap gap-2.5 mb-6">
        <button 
          onClick={() => setActiveCategory('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
            activeCategory === 'all' 
              ? 'bg-[var(--color-imamu-blue)] border-transparent text-white shadow-sm' 
              : 'bg-white border-gray-150 text-gray-600 hover:bg-gray-50'
          }`}
        >
          الكل
        </button>
        <button 
          onClick={() => setActiveCategory('core')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
            activeCategory === 'core' 
              ? 'bg-[var(--color-imamu-blue)] border-transparent text-white shadow-sm' 
              : 'bg-white border-gray-150 text-gray-600 hover:bg-gray-50'
          }`}
        >
          العمادات والخدمات الرئيسية
        </button>
        <button 
          onClick={() => setActiveCategory('colleges')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
            activeCategory === 'colleges' 
              ? 'bg-[var(--color-imamu-blue)] border-transparent text-white shadow-sm' 
              : 'bg-white border-gray-150 text-gray-600 hover:bg-gray-50'
          }`}
        >
          إدارات الكليات
        </button>
        <button 
          onClick={() => setActiveCategory('safety')}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${
            activeCategory === 'safety' 
              ? 'bg-[var(--color-imamu-blue)] border-transparent text-white shadow-sm' 
              : 'bg-white border-gray-150 text-gray-600 hover:bg-gray-50'
          }`}
        >
          الأمن والسلامة والطوارئ
        </button>
      </div>

      {/* Search Input */}
      <div className="relative w-full mb-6">
        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
          <Search className="w-4.5 h-4.5 text-gray-400" />
        </div>
        <input 
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="ابحث عن كلية، قسم، مسؤول أو رقم..."
          className="w-full pr-11 pl-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[var(--color-imamu-blue)] focus:border-transparent outline-none transition shadow-sm text-xs"
        />
      </div>

      {/* Numbers Catalog Table Card */}
      <div className="bg-white border border-gray-150 rounded-3xl p-6 shadow-sm overflow-hidden">
        {filteredContacts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead className="bg-gray-50/50 border-b border-gray-150 text-gray-450 font-bold">
                <tr>
                  <th className="p-3.5">الجهة / القسم</th>
                  <th className="p-3.5 text-right">رقم التواصل المباشر</th>
                  <th className="p-3.5 text-center w-20">اتصال</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-650">
                {filteredContacts.map((contact, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition">
                    <td className="p-3.5 font-bold text-gray-900 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        contact.category === 'safety' ? 'bg-red-500' :
                        contact.category === 'colleges' ? 'bg-indigo-500' : 'bg-blue-500'
                      }`} />
                      {contact.department}
                    </td>
                    <td className="p-3.5 font-mono text-gray-600 text-sm" dir="ltr">{contact.number}</td>
                    <td className="p-3.5 text-center">
                      <a 
                        href={`tel:${contact.number}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition shadow-sm"
                        title="اتصال مباشر"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Phone className="w-10 h-10 text-gray-300" />
            <h4 className="text-sm font-bold text-gray-900">لا توجد نتائج مطابقة</h4>
            <p className="text-[11px] leading-relaxed max-w-xs">تأكد من كتابة الكلمة بشكل صحيح، أو ابحث في تصنيف آخر.</p>
          </div>
        )}
      </div>

    </div>
  );
}
