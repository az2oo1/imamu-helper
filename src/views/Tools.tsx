'use client';

import React from 'react';
import { Calculator, FileText, ChevronLeft, LayoutGrid } from 'lucide-react';
import Link from 'next/link';
import { InView, SpotlightCard } from '../components/ui';

export function Tools() {
  const allTools = [
    {
      id: "gpa",
      name: "حاسبة المعدل والتوقعات",
      description: "حساب دقيق للمعدل الفصلي والتراكمي وفق سلم جامعة الإمام، ومعاينة التوقعات المستقبلية.",
      category: "الحسابات الأكاديمية",
      icon: <Calculator className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      link: "/tools/gpa",
    },
    {
      id: "plans",
      name: "الخطط والشجرات الدراسية",
      description: "تصفح وتحميل الخطط الدراسية الرسمية والمستندات لكافة تخصصات الكليات.",
      category: "التخطيط والتسجيل",
      icon: <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      link: "/tools/plans",
    }
  ];

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto pb-24 px-4 sm:px-6 pt-8 text-right" dir="rtl">
      {/* Compact Header */}
      <div className="mb-8">
        <span className="text-xs font-semibold tracking-widest text-blue-600 dark:text-blue-400 uppercase mb-1.5 block">
          الأدوات الأكاديمية
        </span>
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-slate-900 dark:text-white mb-2">
          الأدوات والخدمات الطلابية
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-lg">
          أدوات وحاسبات منظمة مخصصة لتسهيل تجربتك الأكاديمية بجامعة الإمام.
        </p>
      </div>

      {/* Sleek Compact Grid */}
      <InView preset="fade-up" className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allTools.map(tool => (
            <Link 
              key={tool.id} 
              href={tool.link}
              className="block group"
            >
              <SpotlightCard className="h-full border border-slate-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl p-5 hover:border-blue-500/40 transition-all duration-250 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                      {tool.icon}
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400">
                      {tool.category}
                    </span>
                  </div>

                  <h3 className="text-base font-display font-bold text-slate-900 dark:text-white mb-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {tool.name}
                  </h3>
                  
                  <p className="text-xs text-slate-600 dark:text-zinc-400 mb-5 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:-translate-x-1 transition-transform border-t border-slate-100 dark:border-zinc-800/80 pt-3 mt-auto">
                  <span>دخول الأداة</span>
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                </div>
              </SpotlightCard>
            </Link>
          ))}
        </div>
      </InView>
    </div>
  );
}
