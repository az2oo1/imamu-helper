export function decodeHtmlEntities(str: string = ''): string {
  if (!str) return '';
  return str
    .replace(/&rlm;/gi, '')
    .replace(/&lrm;/gi, '')
    .replace(/&amp;rlm;/gi, '')
    .replace(/&amp;lrm;/gi, '')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&ndash;/gi, '-')
    .replace(/&mdash;/gi, '—')
    .replace(/\u200F/g, '')
    .replace(/\u200E/g, '')
    .trim();
}

export function stripHtmlAndMarkdown(text: string = ''): string {
  if (!text) return '';
  const cleanStr = decodeHtmlEntities(text);
  return cleanStr
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/https?:\/\/\S+/gi, '') // remove http/https URLs
    .replace(/www\.\S+/gi, '') // remove www URLs
    .replace(/!\[.*?\]\(.*?\)/g, '') // remove markdown images
    .replace(/\[(.*?)\]\(.*?\)/g, '$1') // remove markdown links, keeping text
    .replace(/#{1,6}\s?/g, '') // remove headers
    .replace(/(\*\*|__)(.*?)\1/g, '$2') // remove bold
    .replace(/(\*|_)(.*?)\1/g, '$2') // remove italics
    .replace(/`{1,3}(.*?)\`{1,3}/g, '$1') // remove inline code & codeblocks
    .replace(/>\s?/g, '') // remove blockquotes
    .replace(/[-*+]\s+/g, '') // remove list items
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
}

export function getContentWithoutTitle(content: string = '', title: string = ''): string {
  if (!content) return '';
  if (!title) return content;

  const cleanTitleStr = decodeHtmlEntities(title)
    .replace(/&rlm;/gi, '')
    .replace(/&lrm;/gi, '')
    .replace(/\u200F/g, '')
    .replace(/\u200E/g, '')
    .replace(/\.\.\.$/, '')
    .trim();
  
  if (!cleanTitleStr) return content;

  const lines = content.split('\n');
  if (lines.length === 0) return content;

  const firstLineClean = decodeHtmlEntities(lines[0])
    .replace(/&rlm;/gi, '')
    .replace(/&lrm;/gi, '')
    .replace(/\u200F/g, '')
    .replace(/\u200E/g, '')
    .replace(/^#+\s*/, '')
    .trim();

  if (!firstLineClean) return lines.slice(1).join('\n').trim();

  const minLen = Math.min(18, Math.min(cleanTitleStr.length, firstLineClean.length));
  if (minLen >= 4) {
    const titleSnippet = cleanTitleStr.slice(0, minLen);
    const lineSnippet = firstLineClean.slice(0, minLen);
    if (titleSnippet === lineSnippet || firstLineClean.startsWith(cleanTitleStr) || cleanTitleStr.startsWith(firstLineClean)) {
      return lines.slice(1).join('\n').trim();
    }
  }

  return content;
}

export function getArabicCategoryLabel(cat?: string, tag?: string, content?: string, title?: string): string {
  const textToScan = `${title || ''} ${content || ''} ${cat || ''} ${tag || ''}`.toLowerCase();
  
  if (textToScan.includes('فعالي') || textToScan.includes('معرض') || textToScan.includes('لقاء') || textToScan.includes('دوري') || textToScan.includes('ورشة') || textToScan.includes('مبادرة') || textToScan.includes('هايب') || textToScan.includes('حفل') || textToScan.includes('تطوع') || textToScan.includes('تسجيل')) {
    return 'فعاليات';
  }
  if (textToScan.includes('إرشاد') || textToScan.includes('أكاديم') || textToScan.includes('جدول') || textToScan.includes('قبول') || textToScan.includes('دراسي') || textToScan.includes('اختبار')) {
    return 'أكاديمي';
  }
  if (textToScan.includes('تنبيه') || textToScan.includes('عاجل') || textToScan.includes('إغلاق') || textToScan.includes('هام')) {
    return 'تنبيهات عاجلة';
  }
  if (textToScan.includes('جامع') || textToScan.includes('عمادة') || textToScan.includes('كلية')) {
    return 'جامعي';
  }

  const raw = (cat || tag || '').trim();
  const c = raw.toLowerCase();
  if (c === 'general' || c.includes('عام')) return 'أخبار عامة';
  if (c.includes('event') || c.includes('فعالي')) return 'فعاليات';
  if (c.includes('acad') || c.includes('أكاديم')) return 'أكاديمي';
  if (c.includes('camp') || c.includes('جامع')) return 'جامعي';
  if (c.includes('announc') || c.includes('تنبيه')) return 'تنبيهات عاجلة';
  return raw || 'أخبار الجامعة';
}

export function calculateReadTime(content: string = ''): string {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

export function deriveArticleTitle(title?: string, content?: string): string {
  if (title && title.trim()) return title.trim();
  if (!content) return 'خبر جديد';
  const firstLine = content.trim().split('\n')[0].replace(/^#+\s*/, '').trim();
  if (!firstLine) return 'خبر جديد';
  return firstLine.length > 90 ? firstLine.slice(0, 87) + '...' : firstLine;
}

export function parseImageList(images?: any, photoUrl?: string): string[] {
  let list: string[] = [];
  if (Array.isArray(images)) {
    list = images.map(String).filter(Boolean);
  } else if (typeof images === 'string' && images.trim()) {
    try {
      const parsed = JSON.parse(images);
      if (Array.isArray(parsed)) list = parsed.map(String).filter(Boolean);
    } catch {}
  }
  if (list.length === 0 && photoUrl) {
    list = [photoUrl];
  }
  return list;
}


