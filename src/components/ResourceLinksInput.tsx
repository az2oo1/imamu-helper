import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Tag, Percent } from 'lucide-react';
import { Button } from './ui/Button';

export interface Link {
  name: string;
  url: string;
  code?: string;
  discount?: string;
}

interface Props {
  label: string;
  value: string;
  onChange: (val: string) => void;
  color?: 'primary' | 'amber';
  showDiscountCode?: boolean;
}

function extractCodeAndDiscount(rawCodeStr?: string): { code?: string; discount?: string } {
  if (!rawCodeStr) return {};
  let str = rawCodeStr.trim().replace(/^[\-\:\s]+/, '');
  if (!str) return {};

  // 1. Format: CODE (discount) or CODE [discount] or CODE - discount
  const codeDiscountMatch = str.match(/^([A-Z0-9_\-]+)\s*(?:[\(\[\-\s]+([^()\]\s]+(?:%|\s*ريال|\s*SAR)?)[\]\)\s]*)?$/i);
  if (codeDiscountMatch) {
    const code = codeDiscountMatch[1].trim();
    let discount: string | undefined = codeDiscountMatch[2]?.trim();
    if (discount && (discount === code || /^[\-\:\s]+$/.test(discount))) discount = undefined;
    return { code, discount };
  }

  // 2. Standalone discount: "(20%)", "20%", "خصم 15%", "50 ريال", "(50 ريال)"
  const onlyDiscountMatch = str.match(/^\(?\s*(?:خصم\s*)?(\d+\s*%(?:\s*خصم)?|\d+\s*(?:ريال|SAR)?)\s*\)?$/i);
  if (onlyDiscountMatch) {
    return { discount: onlyDiscountMatch[1].trim() };
  }

  // 3. Fallback: contains (discount) in parenthesis
  const parenDiscountMatch = str.match(/^(.*?)\s*[\(\[]\s*([^()\]]+(?:%|ريال|SAR|خصم)[^()\]]*)\s*[\)\]]$/i);
  if (parenDiscountMatch) {
    const code = parenDiscountMatch[1].replace(/[\-\:\s]+$/, '').trim();
    const discount = parenDiscountMatch[2].trim();
    return { code: code || undefined, discount };
  }

  return { code: str };
}

export function parseMarkdownLinks(text: string): Link[] {
  if (!text || !text.trim()) return [];
  const links: Link[] = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // 1. Standard markdown: [Title](URL) optionally followed by code/discount
    const mdMatch = line.match(/^\[([^\]]*)\]\(([^)]*)\)(?:\s*(?:-|كود|code|خصم)?\s*[:\-\s]*([^\n]+))?/i);
    if (mdMatch) {
      let rawTitle = mdMatch[1].trim();
      let rawUrl = mdMatch[2].trim();
      const rawCodePart = mdMatch[3]?.trim();

      const { code, discount } = extractCodeAndDiscount(rawCodePart);

      // Clean brackets or parens from URL if mistakenly present
      rawUrl = rawUrl.replace(/^[\[\(]+/, '').replace(/[\]\)]+$/, '').trim();

      // If user put URL into the title brackets and left parens empty, e.g. [https://google.com]()
      if (!rawUrl && (rawTitle.startsWith('http://') || rawTitle.startsWith('https://') || rawTitle.startsWith('www.') || rawTitle.includes('.com') || rawTitle.includes('.edu') || rawTitle.includes('.sa'))) {
        rawUrl = rawTitle;
        rawTitle = '';
      }

      links.push({
        name: rawTitle,
        url: rawUrl,
        code: code || '',
        discount: discount || ''
      });
      continue;
    }

    // 2. Bracketed without parens: [https://...] or [Title]
    const bracketMatch = line.match(/^\[([^\]]+)\]$/);
    if (bracketMatch) {
      const inner = bracketMatch[1].trim();
      if (inner.startsWith('http://') || inner.startsWith('https://') || inner.startsWith('www.') || inner.includes('.com') || inner.includes('.net') || inner.includes('.org') || inner.includes('.edu') || inner.includes('.sa')) {
        links.push({ name: '', url: inner, code: '', discount: '' });
      } else {
        links.push({ name: inner, url: '', code: '', discount: '' });
      }
      continue;
    }

    // 3. Raw URL line: "https://..." or "Title https://..."
    const urlMatch = line.match(/(https?:\/\/[^\s]+|www\.[^\s]+)/i);
    if (urlMatch) {
      const url = urlMatch[1].replace(/^[\[\(]+/, '').replace(/[\]\)]+$/, '').trim();
      const titlePart = line.substring(0, urlMatch.index).trim().replace(/^[\[\(]+/, '').replace(/[\]\)\-\:\s]+$/, '').trim();
      const afterPart = line.substring(urlMatch.index! + urlMatch[0].length).trim().replace(/^[\]\)\-\:\s]+/, '').trim();

      const { code, discount } = extractCodeAndDiscount(afterPart);

      links.push({
        name: titlePart,
        url: url,
        code: code || '',
        discount: discount || ''
      });
      continue;
    }

    // 4. Fallback line
    const cleaned = line.replace(/^[\[\(]+/, '').replace(/[\]\)]+$/, '').trim();
    if (cleaned) {
      if (cleaned.startsWith('http') || cleaned.startsWith('www') || cleaned.includes('.com') || cleaned.includes('/')) {
        links.push({ name: '', url: cleaned, code: '', discount: '' });
      } else {
        links.push({ name: cleaned, url: '', code: '', discount: '' });
      }
    }
  }

  return links;
}

function serializeMarkdownLinks(links: Link[]): string {
  return links
    .filter(l => l.url?.trim() || l.name?.trim())
    .map(l => {
      const name = (l.name ?? '').trim();
      const url = (l.url ?? '').trim();
      const code = (l.code ?? '').trim();
      const discount = (l.discount ?? '').trim();

      let suffix = '';
      if (code && discount) {
        suffix = ` - ${code} (${discount})`;
      } else if (code) {
        suffix = ` - ${code}`;
      } else if (discount) {
        suffix = ` - (${discount})`;
      }

      return `[${name}](${url})${suffix}`;
    })
    .join('\n');
}

export default function ResourceLinksInput({ label, value, onChange, color, showDiscountCode = false }: Props) {
  const isPaidColor = color === 'amber' || showDiscountCode;
  const [links, setLinks] = useState<Link[]>(() => parseMarkdownLinks(value));

  useEffect(() => {
    const currentSerialized = serializeMarkdownLinks(links);
    if (value !== currentSerialized) {
      setLinks(parseMarkdownLinks(value));
    }
  }, [value]);

  const updateLink = (index: number, field: 'name' | 'url' | 'code' | 'discount', val: string) => {
    const updated = links.map((item, i) => {
      if (i !== index) return item;

      // Smart auto-detection: If user pastes a URL in the name field while URL is empty, move it to url!
      if (field === 'name' && !item.url.trim()) {
        const trimmed = val.trim();
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('www.')) {
          return { ...item, name: '', url: trimmed };
        }
      }

      return { ...item, [field]: val };
    });
    setLinks(updated);
    onChange(serializeMarkdownLinks(updated));
  };

  const addLink = () => {
    const updated = [...links, { name: '', url: '', code: '', discount: '' }];
    setLinks(updated);
    onChange(serializeMarkdownLinks(updated));
  };

  const removeLink = (index: number) => {
    const updated = links.filter((_, i) => i !== index);
    setLinks(updated);
    onChange(serializeMarkdownLinks(updated));
  };

  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-bold" style={{ color: 'var(--text-muted)' }}>{label}</label>
        <Button 
          type="button" 
          variant={isPaidColor ? "outline" : "secondary"}
          size="xs"
          onClick={addLink}
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          className={isPaidColor ? "text-amber-600 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10" : "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"}
        >
          إضافة رابط جديد
        </Button>
      </div>

      {isPaidColor && (
        <p className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal leading-relaxed opacity-60 px-0.5 select-none">
          * استخدام أكواد الخصم عند الاشتراك يساهم في دعم وتمويل المنصة للاستمرار والتطوير والصيانة.
        </p>
      )}
      
      <div className="space-y-2.5">
        {links.length === 0 && (
          <div className="text-xs italic py-2.5 px-3 rounded-xl border border-dashed text-center" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
            لم يتم إضافة روابط بعد. انقر على "+ إضافة رابط جديد" أعلاه.
          </div>
        )}
        <AnimatePresence>
          {links.map((link, i) => {
            const isNameEmpty = !link.name.trim() && Boolean(link.url.trim());
            const isUrlEmpty = !link.url.trim() && Boolean(link.name.trim());

            return (
              <motion.div 
                key={i} 
                layout
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -6 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col sm:flex-row gap-2 items-start"
              >
                {/* Link Name Input */}
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    placeholder="اسم الملف / المصدر *"
                    value={link.name}
                    onChange={e => updateLink(i, 'name', e.target.value)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs border outline-none transition ${
                      isNameEmpty 
                        ? 'border-amber-400/80 bg-amber-50/30 dark:bg-amber-950/20 text-slate-900 dark:text-white focus:ring-1 focus:ring-amber-500' 
                        : 'focus:border-[var(--color-imamu-brown)]'
                    }`}
                    style={!isNameEmpty ? { background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' } : {}}
                  />
                </div>

                {/* Link URL Input */}
                <div className="flex-1 w-full">
                  <input
                    type="url"
                    placeholder="الرابط https://..."
                    value={link.url}
                    onChange={e => updateLink(i, 'url', e.target.value)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs border outline-none transition ${
                      isUrlEmpty 
                        ? 'border-red-500 bg-red-50/60 dark:bg-red-950/30 text-red-900 dark:text-red-200 focus:ring-1 focus:ring-red-500' 
                        : 'focus:border-[var(--color-imamu-brown)]'
                    }`}
                    style={!isUrlEmpty ? { background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' } : {}}
                    dir="ltr"
                  />
                  {isUrlEmpty && (
                    <span className="text-[10px] font-bold text-red-500 mt-1 block px-1">
                      الرابط مطلوب
                    </span>
                  )}
                </div>

                {/* Discount Code Input (for paid links) */}
                {isPaidColor && (
                  <div className="w-full sm:w-28 shrink-0">
                    <input
                      type="text"
                      placeholder="كود الخصم"
                      value={link.code || ''}
                      onChange={e => updateLink(i, 'code', e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl text-xs border outline-none transition font-bold uppercase text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/60 focus:border-amber-400 placeholder-amber-400/60 dark:placeholder-amber-600/60"
                      dir="ltr"
                      title="كود الخصم (اختياري)"
                    />
                  </div>
                )}

                {/* Percentage or Price Discount Input (for paid links) */}
                {isPaidColor && (
                  <div className="w-full sm:w-36 shrink-0">
                    <input
                      type="text"
                      placeholder="الخصم (مثال: 15% أو 50 ريال)"
                      value={link.discount || ''}
                      onChange={e => updateLink(i, 'discount', e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl text-xs border outline-none transition font-bold text-amber-700 dark:text-amber-300 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/60 focus:border-amber-400 placeholder-amber-400/60 dark:placeholder-amber-600/60"
                      dir="rtl"
                      title="نسبة الخصم مثل 20% أو قيمة الخصم مثل 50 ريال (اختياري)"
                    />
                  </div>
                )}

                {/* Delete Button */}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon-sm"
                  onClick={() => removeLink(i)}
                  title="حذف هذا الرابط"
                  className="shrink-0 self-start mt-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
