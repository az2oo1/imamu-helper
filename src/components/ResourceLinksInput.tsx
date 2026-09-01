import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2 } from 'lucide-react';

export interface Link {
  name: string;
  url: string;
}

interface Props {
  label: string;
  value: string;
  onChange: (val: string) => void;
  color?: 'primary' | 'amber';
}

export function parseMarkdownLinks(text: string): Link[] {
  if (!text || !text.trim()) return [];
  const links: Link[] = [];
  const regex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  let hasMatches = false;
  while ((match = regex.exec(text)) !== null) {
    hasMatches = true;
    links.push({ name: match[1], url: match[2] });
  }
  if (!hasMatches && text.trim()) {
    const urls = text.split(/\s+/).filter(Boolean);
    urls.forEach((url, i) => {
      links.push({ name: `رابط ${i + 1}`, url });
    });
  }
  return links;
}

function serializeMarkdownLinks(links: Link[]): string {
  return links
    .filter(l => l.url?.trim() || l.name?.trim())
    .map(l => `[${l.name ?? ''}](${l.url ?? ''})`)
    .join('\n');
}

export default function ResourceLinksInput({ label, value, onChange }: Props) {
  const [links, setLinks] = useState<Link[]>(() => parseMarkdownLinks(value));

  // Sync from external value prop only when it differs from current serialized state
  useEffect(() => {
    const currentSerialized = serializeMarkdownLinks(links);
    if (value !== currentSerialized) {
      setLinks(parseMarkdownLinks(value));
    }
  }, [value]);

  const updateLink = (index: number, field: 'name' | 'url', val: string) => {
    const updated = links.map((item, i) => (i === index ? { ...item, [field]: val } : item));
    setLinks(updated);
    onChange(serializeMarkdownLinks(updated));
  };

  const addLink = () => {
    const updated = [...links, { name: '', url: '' }];
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
          className="text-xs font-bold flex items-center gap-1 text-blue-600 hover:text-blue-500 dark:text-blue-400 transition cursor-pointer hover:scale-[1.03] active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ إضافة رابط جديد</span>
        </button>
      </div>
      
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
                className="flex gap-2 items-start"
              >
                {/* Link Name Input */}
                <div className="flex-1">
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
                <div className="flex-1">
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
