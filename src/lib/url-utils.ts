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
  
  // Strip parenthetical text (e.g. "(...)" )
  cleaned = cleaned.replace(/\s*\([^)]*\)/g, '').trim();
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
 * Parses markdown formatted URLs like "[Title](https://domain.com)" or raw URLs.
 */
export function parseResourceUrl(input?: string): { title?: string; url: string } {
  if (!input) return { url: '#' };
  const str = input.trim();
  const mdMatch = str.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
  if (mdMatch) {
    return { title: mdMatch[1].trim(), url: cleanUrlProtocol(mdMatch[2]) };
  }
  return { url: cleanUrlProtocol(str) };
}

/**
 * Domain check to identify WhatsApp URLs.
 */
export function isWhatsappUrl(url?: string): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return u.includes('chat.whatsapp.com') || u.includes('wa.me') || u.includes('whatsapp.com');
}
