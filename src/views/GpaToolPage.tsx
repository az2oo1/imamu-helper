'use client';

import React from 'react';
import { GpaCalculator } from '../components/GpaCalculator';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import ReportDropdownMenu from '../components/ReportDropdownMenu';
import { useAuth } from '../lib/AuthContext';

export function GpaToolPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col flex-1 max-w-4xl w-full mx-auto pb-24 px-4 sm:px-6 pt-8 text-right" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <Link 
          href="/tools" 
          className="btn-rise inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300 hover:text-[var(--color-imamu-accent)] dark:hover:text-[var(--color-imamu-accent)] hover:bg-slate-50 dark:hover:bg-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700 transition-all duration-200 self-start bg-white dark:bg-zinc-900 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs cursor-pointer active:scale-95" 
          dir="rtl"
        >
          <ArrowLeft className="w-4 h-4 rotate-180 text-[var(--color-imamu-accent)]" />
          <span>العودة إلى الأدوات</span>
        </Link>

        <ReportDropdownMenu
          targetType="tool"
          targetId="gpa"
          targetTitle="حاسبة المعدل والتوقعات"
          user={user}
          buttonClassName="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-[var(--color-imamu-accent)] transition cursor-pointer shadow-2xs flex items-center gap-2"
        />
      </div>
      
      <div className="mb-8">
        <span className="text-xs sm:text-sm font-semibold tracking-widest text-[var(--color-imamu-accent)] uppercase mb-2 block">
          الحسابات الأكاديمية
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900 dark:text-white mb-2">
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
