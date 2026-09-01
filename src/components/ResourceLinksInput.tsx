import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Tag } from 'lucide-react';

export interface Link {
  name: string;
  url: string;
  code?: string;
}

interface Props {
  label: string;
  value: string;
  onChange: (val: string) => void;
  color?: 'primary' | 'amber';
  showDiscountCode?: boolean;
}

export function parseMarkdownLinks(text: string): Link[] {
  if (!text || !text.trim()) return [];
  const links: Link[] = [];
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    const regex = /\[([^\]]*)\]\(([^)]+)\)(?:\s*(?:-|كود|code|خصم)?\s*[:\-\s]*([A-Z0-9_\-]+))?/i;
    const match = line.match(regex);
    if (match) {
      let rawTitle = match[1].trim();
      const rawUrl = match[2].trim();
      let extractedCode = match[3]?.trim();

      if (!extractedCode) {
        const codeInTitleMatch = rawTitle.match(/(?:كود|كود الخصم|code|خصم)\s*[:\-\s]*([A-Z0-9_\-]+)/i);
        if (codeInTitleMatch) {
          extractedCode = codeInTitleMatch[1];
          rawTitle = rawTitle.replace(/(?:كود|كود الخصم|code|خصم)\s*[:\-\s]*[A-Z0-9_\-]+/gi, '').replace(/[\(\)\[\]\-\|]+$/, '').trim();
        }
      }

      links.push({ name: rawTitle, url: rawUrl, code: extractedCode || '' });
    } else {
      const parts = line.split(/\s+/).filter(Boolean);
      if (parts[0]) {
        links.push({ name: `رابط ${links.length + 1}`, url: parts[0] });
      }
    }
  }

  return links;
}

function serializeMarkdownLinks(links: Link[]): string {
  return links
    .filter(l => l.url?.trim() || l.name?.trim())
    .map(l => {
      const name = l.name ?? '';
      const url = l.url ?? '';
      const code = l.code?.trim() ? ` - ${l.code.trim()}` : '';
      return `[${name}](${url})${code}`;
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

  const updateLink = (index: number, field: 'name' | 'url' | 'code', val: string) => {
    const updated = links.map((item, i) => (i === index ? { ...item, [field]: val } : item));
    setLinks(updated);
    onChange(serializeMarkdownLinks(updated));
  };

  const addLink = () => {
    const updated = [...links, { name: '', url: '', code: '' }];
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
        <button 
          type="button" 
          onClick={addLink}
          className={`text-xs font-bold flex items-center gap-1 transition cursor-pointer hover:scale-[1.03] active:scale-95 ${
            isPaidColor ? 'text-amber-600 hover:text-amber-500 dark:text-amber-400' : 'text-blue-600 hover:text-blue-500 dark:text-blue-400'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ إضافة رابط جديد</span>
        </button>
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
                        ? 'border-red-500 bg-red-50/60 dark:bg-red-950/30 text-red-900 dark:text-red-200 focus:ring-1 focus:ring-red-500' 
                        : 'focus:border-blue-500'
                    }`}
                    style={!isNameEmpty ? { background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' } : {}}
                  />
                  {isNameEmpty && (
                    <span className="text-[10px] font-bold text-red-500 mt-1 block px-1">
                      اسم المصدر مطلوب
                    </span>
                  )}
                </div>

                {/* Link URL Input */}
                <div className="flex-1 w-full">
                  <input
                    type="url"
                    placeholder="الرابط https://..."
                    value={link.url}
                    onChange={e => updateLink(i, 'url', e.target.value)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs border outline-none transition font-mono ${
                      isUrlEmpty 
                        ? 'border-red-500 bg-red-50/60 dark:bg-red-950/30 text-red-900 dark:text-red-200 focus:ring-1 focus:ring-red-500' 
                        : 'focus:border-blue-500'
                    }`}
                    style={!isUrlEmpty ? { background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' } : {}}
                  />
                  {isUrlEmpty && (
                    <span className="text-[10px] font-bold text-red-500 mt-1 block px-1">
                      الرابط مطلوب
                    </span>
                  )}
                </div>

                {/* Discount Code Input (for paid links) */}
                {isPaidColor && (
                  <div className="w-full sm:w-36 shrink-0">
                    <input
                      type="text"
                      placeholder="كود الخصم (اختياري)"
                      value={link.code || ''}
                      onChange={e => updateLink(i, 'code', e.target.value)}
                      className="w-full py-2.5 px-3 rounded-xl text-xs border outline-none transition font-mono font-bold uppercase text-amber-900 dark:text-amber-200 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/60 focus:border-amber-400 placeholder-amber-400/60 dark:placeholder-amber-600/60"
                      dir="ltr"
                    />
                  </div>
                )}

                {/* Delete Button */}
                <button
                  type="button"
                  onClick={() => removeLink(i)}
                  className="p-2 text-red-400 hover:bg-red-500/10 hover:text-red-600 rounded-xl shrink-0 transition self-start mt-0.5 cursor-pointer"
                  title="حذف هذا الرابط"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
