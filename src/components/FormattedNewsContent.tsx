'use client';

import React from 'react';
import { ExternalLink, Hash } from 'lucide-react';

interface FormattedNewsContentProps {
  content: string;
  className?: string;
  truncateLines?: number;
}

/**
 * Platform icon helper for link badges (X/Twitter, LinkedIn, Telegram, Default)
 */
function PlatformIcon({ url }: { url: string }) {
  const lowerUrl = url.toLowerCase();
  
  if (lowerUrl.includes('x.com') || lowerUrl.includes('twitter.com')) {
    return (
      <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    );
  }
  
  if (lowerUrl.includes('linkedin.com') || lowerUrl.includes('lnkd.in')) {
    return (
      <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.74a1.64 1.64 0 1 0 0 3.28 1.64 1.64 0 0 0 0-3.28z" />
      </svg>
    );
  }
  
  if (lowerUrl.includes('t.me') || lowerUrl.includes('telegram')) {
    return (
      <svg className="w-3.5 h-3.5 fill-current shrink-0" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .24z" />
      </svg>
    );
  }
  
  return <ExternalLink className="w-3.5 h-3.5 shrink-0" />;
}

/**
 * Cleans ugly scraper query strings attached to text/hashtags
 */
export function cleanNewsText(text: string): string {
  if (!text) return '';
  return text
    .replace(/&rlm;/gi, '')
    .replace(/&lrm;/gi, '')
    .replace(/&amp;rlm;/gi, '')
    .replace(/&amp;lrm;/gi, '')
    .replace(/\u200F/g, '')
    .replace(/\u200E/g, '')
    .replace(/\s*\(\?q=[^)]+\)/gi, '')
    .replace(/\s*\(\?q=%23[^)]+\)/gi, '')
    .replace(/\s*\?q=%23[^\s)]+/gi, '')
    .replace(/(\B#[\w\u0600-\u06FF]+)\s*\([^)]*https?:\/\/[^)]*\)/gi, '$1') // remove url parens directly following hashtags
    .trim();
}

export function FormattedNewsContent({ content, className = '', truncateLines }: FormattedNewsContentProps) {
  const cleanedText = cleanNewsText(content);

  // Parse text into structured tokens (Markdown links [text](url), parenthesized links Text (url), raw URLs, Hashtags, and normal text)
  const parseTokens = (raw: string) => {
    const lines = raw.split('\n');

    return lines.map((line, lineIdx) => {
      const lineTokens: React.ReactNode[] = [];
      let cursor = 0;

      // Master regex matching tokens in order
      const regex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(?:([A-Za-z0-9\u0600-\u06FF\s🔗✨💼🚀👀⏳]{1,35})\s*\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s)]+)|(\B#[\w\u0600-\u06FF]+)/g;
      
      let m: RegExpExecArray | null;
      while ((m = regex.exec(line)) !== null) {
        if (m.index > cursor) {
          lineTokens.push(line.slice(cursor, m.index));
        }

        if (m[1] && m[2]) {
          // Markdown link [Label](URL)
          const label = m[1].trim();
          const url = m[2];
          lineTokens.push(
            <a
              key={`${lineIdx}-${m.index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 my-0.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs hover:bg-blue-100 dark:hover:bg-blue-900/80 transition-all shadow-2xs group"
            >
              <PlatformIcon url={url} />
              <span>{label}</span>
            </a>
          );
        } else if (m[3] && m[4]) {
          // Parenthesized link Label (URL)
          const label = m[3].trim();
          const url = m[4];
          lineTokens.push(
            <a
              key={`${lineIdx}-${m.index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 my-0.5 rounded-lg bg-slate-100 dark:bg-zinc-800/90 border border-slate-200/80 dark:border-zinc-700/80 text-slate-800 dark:text-zinc-200 font-bold text-xs hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 transition-all shadow-2xs group"
            >
              <PlatformIcon url={url} />
              <span>{label}</span>
            </a>
          );
        } else if (m[5]) {
          // Bare URL
          const url = m[5];
          const displayDomain = url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
          lineTokens.push(
            <a
              key={`${lineIdx}-${m.index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-0.5 my-0.5 rounded-md bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium text-xs hover:underline ltr"
              dir="ltr"
            >
              <PlatformIcon url={url} />
              <span>{displayDomain}</span>
            </a>
          );
        } else if (m[6]) {
          // Hashtag #tag - Clean inline colored text style (no big box)
          const tag = m[6];
          lineTokens.push(
            <span
              key={`${lineIdx}-${m.index}`}
              className="font-extrabold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline cursor-pointer transition-colors px-0.5"
            >
              {tag}
            </span>
          );
        }

        cursor = regex.lastIndex;
      }

      if (cursor < line.length) {
        lineTokens.push(line.slice(cursor));
      }

      return (
        <React.Fragment key={lineIdx}>
          {lineTokens}
          {lineIdx < lines.length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <div 
      className={`leading-relaxed text-right font-sans ${truncateLines ? `line-clamp-${truncateLines}` : ''} ${className}`}
      dir="rtl"
    >
      {parseTokens(cleanedText)}
    </div>
  );
}
