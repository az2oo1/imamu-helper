import React, { useState, useEffect } from 'react';
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
  if (!text) return [];
  const links: Link[] = [];
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  let hasMatches = false;
  while ((match = regex.exec(text)) !== null) {
    hasMatches = true;
    links.push({ name: match[1], url: match[2] });
  }
  if (!hasMatches && text.trim()) {
    const urls = text.split(/\s+/).filter(Boolean);
    urls.forEach((url, i) => {
      links.push({ name: `Resource ${i + 1}`, url });
    });
  }
  return links;
}

function serializeMarkdownLinks(links: Link[]): string {
  return links.filter(l => l.name && l.url).map(l => `[${l.name}](${l.url})`).join('\n');
}

export default function ResourceLinksInput({ label, value, onChange, color = 'primary' }: Props) {
  const [links, setLinks] = useState<Link[]>([]);

  useEffect(() => {
    setLinks(parseMarkdownLinks(value));
  }, [value]);

  const updateLink = (index: number, field: 'name' | 'url', val: string) => {
    const newLinks = [...links];
    newLinks[index][field] = val;
    setLinks(newLinks);
    onChange(serializeMarkdownLinks(newLinks));
  };

  const addLink = () => {
    const newLinks = [...links, { name: '', url: '' }];
    setLinks(newLinks);
    onChange(serializeMarkdownLinks(newLinks));
  };

  const removeLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    setLinks(newLinks);
    onChange(serializeMarkdownLinks(newLinks));
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</label>
        <button 
          type="button" 
          onClick={addLink}
          className="text-xs font-bold flex items-center gap-1 text-blue-500 hover:text-blue-400"
        >
          <Plus className="w-3.5 h-3.5" /> + Add Link
        </button>
      </div>
      
      <div className="space-y-2">
        {links.length === 0 && (
          <div className="text-xs italic py-1" style={{ color: 'var(--text-muted)' }}>No extra links added yet. Click "+ Add Link" above.</div>
        )}
        {links.map((link, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Title (e.g. Box / Drive / PDF)"
              value={link.name}
              onChange={e => updateLink(i, 'name', e.target.value)}
              className="flex-1 py-1.5 px-2.5 rounded-lg text-xs border"
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
            <input
              type="url"
              placeholder="https://..."
              value={link.url}
              onChange={e => updateLink(i, 'url', e.target.value)}
              className="flex-1 py-1.5 px-2.5 rounded-lg text-xs border"
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
            <button
              type="button"
              onClick={() => removeLink(i)}
              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
