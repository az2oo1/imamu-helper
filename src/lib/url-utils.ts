/**
 * Shared URL and String Utilities for Resources, Subjects, and Links
 */

/**
 * Sanitizes course and resource titles by removing:
 * - Redundant "مصادر مادة مادة" / "مصادر مادة" / "مادة" prefixes
 * - Parenthetical expressions like (أساسيات الحوسبة والأخلاقيات)
 */
export function cleanCourseName(rawName?: string): string {
  if (!rawName) return '';
  let cleaned = rawName
    .replace(/^مصادر مادة\s+مادة\s*/gi, '')
    .replace(/^مصادر مادة\s*/gi, '')
    .replace(/^مادة\s*/gi, '')
    .trim();
  
  const withoutParens = cleaned.replace(/\s*\([^)]*\)/g, '').trim();
  if (withoutParens.length > 0) {
    cleaned = withoutParens;
  }
  return cleaned;
}

/**
 * Ensures proper URL protocol:
 * - Fixes single-slash typos like "https:/t.me" -> "https://t.me"
 * - Adds "https://" if protocol is missing
 */
export function cleanUrlProtocol(url?: string): string {
  if (!url) return '#';
  let u = url.trim();
  if (u.startsWith('https:/') && !u.startsWith('https://')) {
    u = u.replace(/^https:\/*/, 'https://');
  }
  if (u.startsWith('http:/') && !u.startsWith('http://')) {
    u = u.replace(/^http:\/*/, 'http://');
  }
  if (!u.startsWith('http://') && !u.startsWith('https://') && !u.startsWith('#')) {
    u = 'https://' + u;
  }
  return u;
}

/**
 * Parses single or multiline markdown formatted URLs like "[Title](https://domain.com)" or raw URLs.
 * Supports discount codes in title or format: "Title - URL - CODE" or "[Title](URL) - CODE".
 */
export function parseAllResourceLinks(input?: string): { title?: string; url: string; code?: string; discount?: string }[] {
  if (!input || typeof input !== 'string') return [];

  const text = input.trim();
  if (!text) return [];

  const results: { title?: string; url: string; code?: string; discount?: string }[] = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const extractCodeAndDiscount = (rawCodeStr?: string): { code?: string; discount?: string } => {
    if (!rawCodeStr) return {};
    let str = rawCodeStr.trim();
    
    // Check if format is CODE (discount) or CODE - discount or CODE [discount]
    const discountMatch = str.match(/([A-Z0-9_\-]+)\s*(?:[\(\[\-\s]+([^()\]\s]+(?:%|\s*ريال|\s*SAR)?)[\]\)\s]*)?/i);
    if (discountMatch) {
      const code = discountMatch[1].trim();
      let discount: string | undefined = discountMatch[2]?.trim();
      if (discount && (discount === code || /^[\-\:\s]+$/.test(discount))) discount = undefined;
      return { code, discount };
    }
    return { code: str };
  };

  for (const line of lines) {
    // 1. Check for markdown pattern [Title](URL) optionally followed by code or containing code
    const mdMatch = line.match(/\[([^\]]*)\]\(([^)]+)\)(?:\s*(?:-|كود|code|خصم)?\s*[:\-\s]*([^\n]+))?/i);
    if (mdMatch) {
      let rawTitle = mdMatch[1].trim();
      const rawUrl = mdMatch[2].trim();
      let rawCodePart = mdMatch[3]?.trim();

      let parsedCodeInfo = extractCodeAndDiscount(rawCodePart);

      if (!parsedCodeInfo.code) {
        const codeInTitleMatch = rawTitle.match(/(?:كود|كود الخصم|code|خصم)\s*[:\-\s]*([A-Z0-9_\-]+)(?:\s*[\(\-]?\s*(\d+%\s*|\d+\s*ريال)?[\)]?)?/i);
        if (codeInTitleMatch) {
          parsedCodeInfo = {
            code: codeInTitleMatch[1],
            discount: codeInTitleMatch[2]?.trim()
          };
          rawTitle = rawTitle.replace(/(?:كود|كود الخصم|code|خصم)\s*[:\-\s]*[^\n]+/gi, '').replace(/[\(\)\[\]\-\|]+$/, '').trim();
        }
      }

      if (rawUrl) {
        results.push({
          title: rawTitle || undefined,
          url: cleanUrlProtocol(rawUrl),
          code: parsedCodeInfo.code || undefined,
          discount: parsedCodeInfo.discount || undefined
        });
      }
      continue;
    }

    // 2. Check for plain line format: "Title - URL - CODE (20%)" or "URL - CODE"
    const urlMatch = line.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      const url = cleanUrlProtocol(urlMatch[1]);
      let beforeUrl = line.substring(0, urlMatch.index).trim().replace(/[\-\|\:]+$/, '').trim();
      let afterUrl = line.substring(urlMatch.index! + urlMatch[0].length).trim();

      let parsedCodeInfo: { code?: string; discount?: string } = {};

      const codeMatch = (afterUrl + ' ' + beforeUrl).match(/(?:كود|كود الخصم|code|خصم)\s*[:\-\s]*([A-Z0-9_\-]+)(?:\s*[\(\-]?\s*(\d+%\s*|\d+\s*ريال)?[\)]?)?/i);
      if (codeMatch) {
        parsedCodeInfo = {
          code: codeMatch[1],
          discount: codeMatch[2]?.trim()
        };
        if (afterUrl.includes(codeMatch[0])) {
          afterUrl = afterUrl.replace(codeMatch[0], '').replace(/^[\-\|\:\s]+/, '').trim();
        }
      } else if (afterUrl) {
        const cleanAfter = afterUrl.replace(/^[\-\|\:\s]+/, '').trim();
        parsedCodeInfo = extractCodeAndDiscount(cleanAfter);
      }

      results.push({
        title: beforeUrl || undefined,
        url,
        code: parsedCodeInfo.code || undefined,
        discount: parsedCodeInfo.discount || undefined
      });
    }
  }

  return results;
}

export function parseResourceUrl(input?: string): { title?: string; url: string } {
  const all = parseAllResourceLinks(input);
  return all[0] || { url: '#' };
}

/**
 * Domain check to identify WhatsApp URLs.
 */
export function isWhatsappUrl(url?: string): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.includes('chat.whatsapp.com') || u.includes('wa.me') || u.includes('whatsapp.com');
}
