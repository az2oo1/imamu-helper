'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

function InstagramIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

function XIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function TikTokIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 1 1-5.2-1.74 2.89 2.89 0 0 1 2.31-2.83V7.63a6.34 6.34 0 1 0 6.34 6.34V9.4a8.16 8.16 0 0 0 4.77 1.52V7.47a4.85 4.85 0 0 1-1-.78z"/>
    </svg>
  );
}

function LinkedInIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
    </svg>
  );
}

export function Footer() {
  const pathname = usePathname();
  
  if (pathname === '/calendar') {
    return null;
  }

  return (
    <footer className="w-full border-t border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 shrink-0">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:grid md:grid-cols-3 items-center justify-between gap-4 text-xs text-slate-500 dark:text-zinc-400">
        {/* Right Side in RTL (Logo) */}
        <div className="flex items-center justify-center md:justify-start">
          <img src="/logo_dark.png" alt="مساعد الإمام" className="h-9 sm:h-10 w-auto object-contain dark:hidden" />
          <img src="/logo_light.png" alt="مساعد الإمام" className="h-9 sm:h-10 w-auto object-contain hidden dark:block" />
        </div>

        {/* Center / Middle Column (Contributors + Social Icons) */}
        <div className="flex items-center justify-center gap-3 text-slate-400 dark:text-zinc-500 flex-wrap">
          <a 
            href="/contributors" 
            className="text-xs font-bold text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] hover:underline transition-colors flex items-center gap-1 shrink-0"
          >
            <span>فريق العمل والمساهمون</span>
          </a>

          <span className="text-slate-300 dark:text-zinc-700 select-none font-light">|</span>

          <div className="flex items-center gap-1.5 shrink-0">
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="Instagram"
              className="p-1 hover:text-[var(--color-imamu-accent)] dark:hover:text-[var(--color-imamu-accent)] hover:scale-110 transition-all cursor-pointer"
            >
              <InstagramIcon className="w-4 h-4" />
            </a>
            <a 
              href="https://x.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="X"
              className="p-1 hover:text-[var(--color-imamu-accent)] dark:hover:text-[var(--color-imamu-accent)] hover:scale-110 transition-all cursor-pointer"
            >
              <XIcon className="w-3.5 h-3.5" />
            </a>
            <a 
              href="https://tiktok.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="TikTok"
              className="p-1 hover:text-[var(--color-imamu-accent)] dark:hover:text-[var(--color-imamu-accent)] hover:scale-110 transition-all cursor-pointer"
            >
              <TikTokIcon className="w-3.5 h-3.5" />
            </a>
            <a 
              href="https://linkedin.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              aria-label="LinkedIn"
              className="p-1 hover:text-[var(--color-imamu-accent)] dark:hover:text-[var(--color-imamu-accent)] hover:scale-110 transition-all cursor-pointer"
            >
              <LinkedInIcon className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Left Side in RTL (Author Credit) */}
        <div className="flex items-center justify-center md:justify-end">
          <p className="font-medium text-slate-600 dark:text-zinc-400">
            تطوير وتصميم <a href="https://gassem.me" target="_blank" rel="noopener noreferrer" className="text-[var(--color-imamu-accent)] hover:underline font-bold transition-colors">عبدالعزيز القاسم</a>
          </p>
        </div>
      </div>
    </footer>
  );
}
