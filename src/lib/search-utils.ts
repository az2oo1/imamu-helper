/**
 * Universal Arabic-aware Fuzzy Search Engine for IMAMU Helper
 * 
 * Provides:
 * 1. Comprehensive Arabic character normalization (alef variants, teh marbuta, alef maksura, hamzas)
 * 2. Diacritics (tashkeel/harakat) and tatweel/kashida stripping
 * 3. Space sensitivity elimination (collapses whitespace, order-independent token matching)
 * 4. University abbreviation expansion (e.g. "تال" <-> "تقنية المعلومات", "عال" <-> "علوم الحاسب", "ريض" <-> "الرياضيات")
 * 5. Definite article "ال" and conjunction "و / وال" prefix resilience
 */

import { decodeHtmlEntities } from './textHelpers';

/**
 * Normalizes Arabic text by unifying character variations and stripping decorative marks.
 */
export function normalizeArabic(text?: string | null): string {
  if (!text) return '';
  
  let str = decodeHtmlEntities(String(text));
  
  return str
    .toLowerCase()
    // Remove zero-width characters and LTR/RTL marks
    .replace(/[\u200B-\u200F\uFEFF]/g, '')
    // Remove Arabic Tashkeel / Harakat (Fathah, Dammah, Kasrah, Sukun, Shaddah, Tanween, etc.)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    // Remove Tatweel / Kashida
    .replace(/[\u0640ـ]/g, '')
    // Normalize Alef variations (أ, إ, آ, ٱ -> ا)
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    // Normalize Teh Marbuta to Heh (ة -> ه)
    .replace(/\u0629/g, '\u0647')
    // Normalize Alef Maksura to Yaa (ى -> ي)
    .replace(/\u0649/g, '\u064A')
    // Normalize Hamza characters (ؤ -> و, ئ -> ي, standalone hamza -> empty)
    .replace(/\u0624/g, '\u0648')
    .replace(/\u0626/g, '\u064A')
    .replace(/\u0621/g, '')
    // Replace non-word, non-Arabic, non-digit punctuation with space
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    // Collapse multiple spaces into a single space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Common Saudi / IMAMU University course and department colloquial abbreviations & synonyms.
 */
export const ACADEMIC_SYNONYMS: Record<string, string[]> = {
  // Information Technology (IT) - "تال"
  'تال': ['تقنية المعلومات', 'تقنيه المعلومات', 'it'],
  'it': ['تقنية المعلومات', 'تقنيه المعلومات', 'تال'],
  'تقنية المعلومات': ['تال', 'it'],
  'تقنيه المعلومات': ['تال', 'it'],

  // Computer Science (CS) - "عال"
  'عال': ['علوم الحاسب', 'علوم حاسب', 'cs'],
  'cs': ['علوم الحاسب', 'علوم حاسب', 'عال'],
  'علوم الحاسب': ['عال', 'cs'],

  // Information Systems (IS) - "نال"
  'نال': ['نظم المعلومات', 'نظم معلومات', 'is'],
  'is': ['نظم المعلومات', 'نظم معلومات', 'نال'],
  'نظم المعلومات': ['نال', 'is'],

  // Software Engineering (SE) - "هاب"
  'هاب': ['هندسة البرمجيات', 'هندسه البرمجيات', 'se'],
  'se': ['هندسة البرمجيات', 'هندسه البرمجيات', 'هاب'],
  'هندسة البرمجيات': ['هاب', 'se'],

  // Mathematics (MATH) - "ريض"
  'ريض': ['الرياضيات', 'رياضيات', 'حساب التفاضل', 'math', 'mat'],
  'mat': ['الرياضيات', 'رياضيات', 'ريض'],
  'math': ['الرياضيات', 'رياضيات', 'ريض'],
  'الرياضيات': ['ريض', 'math', 'mat'],
  'رياضيات': ['ريض', 'math', 'mat'],

  // Physics (PHYS) - "فيز"
  'فيز': ['الفيزياء', 'فيزياء', 'phys', 'phy'],
  'phys': ['الفيزياء', 'فيزياء', 'فيز'],
  'الفيزياء': ['فيز', 'phys'],
  'فيزياء': ['فيز', 'phys'],

  // Statistics (STAT) - "احص"
  'احص': ['الإحصاء', 'احصاء', 'stat'],
  'stat': ['الإحصاء', 'احصاء', 'احص'],
  'الإحصاء': ['احص', 'stat'],
  'احصاء': ['احص', 'stat'],

  // Islamic Studies (ISLM / IC) - "سلم"
  'سلم': ['الدراسات الإسلامية', 'دراسات اسلامية', 'دراسات اسلاميه', 'ثقافة اسلامية', 'islm', 'ic'],
  'islm': ['الدراسات الإسلامية', 'سلم'],
  'ic': ['الدراسات الإسلامية', 'سلم'],
  'الدراسات الإسلامية': ['سلم', 'islm'],

  // Arabic Language (ARAB) - "عرب"
  'عرب': ['اللغة العربية', 'لغة عربية', 'لغه عربيه', 'عربي', 'arab'],
  'arab': ['اللغة العربية', 'عرب'],
  'اللغة العربية': ['عرب', 'arab'],

  // English Language (ENG) - "نجم"
  'نجم': ['اللغة الإنجليزية', 'لغة انجليزية', 'لغه انجليزيه', 'انجليزي', 'eng'],
  'eng': ['اللغة الإنجليزية', 'نجم'],
  'اللغة الإنجليزية': ['نجم', 'eng'],

  // Accounting (ACCT) - "حسب"
  'حسب': ['المحاسبة', 'محاسبة', 'محاسبه', 'acct'],
  'acct': ['المحاسبة', 'حسب'],
  'المحاسبة': ['حسب', 'acct'],

  // Economics (ECON) - "قصد"
  'قصد': ['الاقتصاد', 'اقتصاد', 'econ'],
  'econ': ['الاقتصاد', 'قصد'],
  'الاقتصاد': ['قصد', 'econ'],

  // Business / Management (BUS / MGMT) - "ادر"
  'ادر': ['إدارة الأعمال', 'ادارة الاعمال', 'ادارة', 'إدارة', 'bus', 'mgmt'],
  'bus': ['إدارة الأعمال', 'ادر'],
  'mgmt': ['إدارة الأعمال', 'ادر'],
  'إدارة الأعمال': ['ادر', 'bus', 'mgmt'],

  // Finance (FIN) - "مال"
  'مال': ['المالية', 'مالية', 'ماليه', 'التمويل', 'تمويل', 'fin'],
  'fin': ['المالية', 'مال'],
  'المالية': ['مال', 'fin'],

  // Chemistry (CHEM) - "كيم"
  'كيم': ['الكيمياء', 'كيمياء', 'chem'],
  'chem': ['الكيمياء', 'كيم'],
  'الكيمياء': ['كيم', 'chem']
};

/**
 * Enriches target text with university department abbreviations and synonyms.
 */
export function enrichSearchableText(rawText: string): string {
  const norm = normalizeArabic(rawText);
  if (!norm) return '';

  let extra = '';

  if (norm.includes('تقنيه المعلومات') || norm.includes('it')) extra += ' تال it ';
  if (norm.includes('علوم الحاسب') || norm.includes('cs')) extra += ' عال cs ';
  if (norm.includes('نظم المعلومات') || norm.includes('is')) extra += ' نال is ';
  if (norm.includes('هندسه البرمجيات') || norm.includes('se')) extra += ' هاب se ';
  if (norm.includes('الرياضيات') || norm.includes('رياضيات') || norm.includes('تفاضل') || norm.includes('math')) extra += ' ريض math mat ';
  if (norm.includes('الفيزياء') || norm.includes('فيزياء') || norm.includes('phys')) extra += ' فيز phys ';
  if (norm.includes('احصاء') || norm.includes('stat')) extra += ' احص stat ';
  if (norm.includes('اسلامي') || norm.includes('islm') || norm.includes('سلم')) extra += ' سلم islm ic ';
  if (norm.includes('عرب') || norm.includes('arab')) extra += ' عرب arab ';
  if (norm.includes('انجليز') || norm.includes('eng')) extra += ' نجم eng ';
  if (norm.includes('محاسب') || norm.includes('acct')) extra += ' حسب acct ';
  if (norm.includes('اقتصاد') || norm.includes('econ')) extra += ' قصد econ ';
  if (norm.includes('اداره') || norm.includes('bus') || norm.includes('mgmt')) extra += ' ادر bus mgmt ';
  if (norm.includes('مالي') || norm.includes('تمويل') || norm.includes('fin')) extra += ' مال fin ';
  if (norm.includes('كيمياء') || norm.includes('chem')) extra += ' كيم chem ';

  // Add spaceless variant for joined course codes (e.g. CS1111 -> cs 1111)
  const spaced = norm
    .replace(/([a-zA-Z\u0600-\u06FF])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z\u0600-\u06FF])/g, '$1 $2');

  return `${norm} ${spaced} ${normalizeArabic(extra)}`.trim();
}

/**
 * Returns possible token variants (stemming 'ال', 'و', 'وال', and mapping abbreviations).
 */
export function getTokenVariants(token: string): string[] {
  const norm = normalizeArabic(token);
  if (!norm) return [];

  const variants = new Set<string>([norm]);

  // Strip "ال" prefix if token has > 3 letters (e.g. "المعلومات" -> "معلومات")
  if (norm.startsWith('ال') && norm.length > 3) {
    variants.add(norm.slice(2));
  }

  // Strip "وال" prefix (e.g. "والتكامل" -> "تكامل", "التكامل")
  if (norm.startsWith('وال') && norm.length > 4) {
    variants.add(norm.slice(1)); // "التكامل"
    variants.add(norm.slice(3)); // "تكامل"
  } else if (norm.startsWith('و') && norm.length > 3) {
    variants.add(norm.slice(1));
  }

  // Check synonym mappings
  const syns = ACADEMIC_SYNONYMS[norm];
  if (syns) {
    for (const s of syns) {
      const normS = normalizeArabic(s);
      variants.add(normS);
      normS.split(' ').forEach(w => {
        if (w) variants.add(w);
      });
    }
  }

  return Array.from(variants);
}

/**
 * Universal Arabic search matcher.
 * Matches multi-word queries independent of word order, handles extra spaces,
 * normalizes Arabic characters, and supports department abbreviations.
 * 
 * @param target String or Array of strings representing target content (e.g. [title, code, description])
 * @param query Search query from user
 */
export function matchArabicSearch(
  target: string | (string | undefined | null)[] | undefined | null,
  query: string | undefined | null
): boolean {
  if (!query || !query.trim()) return true;

  const rawTargetString = Array.isArray(target)
    ? target.filter(Boolean).join(' ')
    : (target || '');

  const enrichedTarget = enrichSearchableText(rawTargetString);
  if (!enrichedTarget) return false;

  // Split query into separated tokens (handling cases like CS1111 -> ['cs', '1111'] or 'تال1111' -> ['تال', '1111'])
  const cleanQuery = normalizeArabic(query)
    .replace(/([a-zA-Z\u0600-\u06FF])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z\u0600-\u06FF])/g, '$1 $2');

  const tokens = cleanQuery.split(' ').filter(Boolean);
  if (tokens.length === 0) return true;

  // EVERY token in the query must have at least one variant present in the target
  return tokens.every(token => {
    const variants = getTokenVariants(token);
    return variants.some(variant => enrichedTarget.includes(variant));
  });
}

/**
 * Helper to filter arrays of items with arbitrary searchable fields.
 */
export function filterByArabicSearch<T>(
  items: T[],
  query: string | undefined | null,
  getSearchableFields: (item: T) => (string | undefined | null)[]
): T[] {
  if (!query || !query.trim()) return items;
  return items.filter(item => matchArabicSearch(getSearchableFields(item), query));
}
