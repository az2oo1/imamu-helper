import React from 'react';
import { GpaCalculator } from '../components/GpaCalculator';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export function GpaToolPage() {
  return (
    <div className="flex flex-col flex-1 max-w-4xl w-full mx-auto pb-24">
      <Link to="/tools" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 mb-8 w-fit transition" dir="rtl">
        <ArrowLeft className="w-4 h-4" /> العودة إلى الأدوات
      </Link>
      
      <div className="mb-8" dir="rtl">
        <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">حاسبة المعدل التراكمي</h1>
        <p className="text-gray-500">احسب معدلك الفصلي بناءً على ملفك الشخصي والمواد الجديدة.</p>
      </div>

      <div dir="rtl">
        <GpaCalculator />
      </div>
    </div>
  );
}
