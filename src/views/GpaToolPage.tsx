'use client';

import React from 'react';
import { GpaCalculator } from '../components/GpaCalculator';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export function GpaToolPage() {
  return (
    <div className="flex flex-col flex-1 max-w-4xl w-full mx-auto pb-24 px-4 sm:px-6 pt-8 text-right" dir="rtl">
      <Link 
        href="/tools" 
        className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6 w-fit transition self-start" 
        dir="rtl"
      >
        <ArrowLeft className="w-4 h-4 rotate-180 text-blue-600 dark:text-blue-400" />
        <span>العودة إلى الأدوات</span>
      </Link>
      
      <div className="mb-8">
        <span className="text-xs sm:text-sm font-semibold tracking-widest text-blue-600 dark:text-blue-400 uppercase mb-2 block">
          الحسابات الأكاديمية
        </span>
        <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-slate-900 dark:text-white mb-2">
          حاسبة المعدل التراكمي
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl">
          احسب معدلك الفصلي والتراكمي بدقة وفق سلم جامعة الإمام (من 5.00)، وتوقع سيناريوهات معدلك المستقبلي.
        </p>
      </div>

      <div className="w-full">
        <GpaCalculator />
      </div>
    </div>
  );
}
