'use client';

import React from 'react';

export function Footer() {
  return (
    <footer className="mt-8 sm:mt-12 w-full border-t border-slate-200/80 dark:border-zinc-800/80 bg-transparent shrink-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-zinc-400">
        <div className="flex items-center gap-2.5">
          <img src="/logo_dark.png" alt="مساعد الإمام" className="h-7 sm:h-8 w-auto object-contain dark:hidden" />
          <img src="/logo_light.png" alt="مساعد الإمام" className="h-7 sm:h-8 w-auto object-contain hidden dark:block" />
          <span className="font-serif font-bold text-slate-800 dark:text-zinc-200 text-xs sm:text-sm">مساعد الإمام</span>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
          <a href="/contributors" className="text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-[var(--color-imamu-accent)] transition flex items-center gap-1">
            <span>🌟 فريق العمل والمساهمون</span>
          </a>
          <p className="font-medium text-slate-600 dark:text-zinc-400">
            تطوير وتصميم <a href="https://gassem.me" target="_blank" rel="noopener noreferrer" className="text-[var(--color-imamu-accent)] hover:underline font-bold transition-colors">عبدالعزيز القاسم</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
