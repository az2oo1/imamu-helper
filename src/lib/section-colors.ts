export interface SectionColorPreset {
  id: string;
  name: string;
  value: string;
  container: string;
  badge: string;
  spotlight: string;
  swatchBg: string;
  swatchBorder: string;
}

export const SECTION_COLOR_PRESETS: SectionColorPreset[] = [
  {
    id: 'brown',
    name: 'بني دافئ',
    value: 'brown',
    container: 'text-[#8C6239] dark:text-[#D4A373] bg-[#8C6239]/10 dark:bg-[#8C6239]/25 border-[#8C6239]/30 dark:border-[#8C6239]/40',
    badge: 'text-[#8C6239] dark:text-[#D4A373] bg-[#8C6239]/10 dark:bg-[#8C6239]/25 border-[#8C6239]/30 dark:border-[#8C6239]/40',
    spotlight: 'rgba(140, 98, 57, 0.15)',
    swatchBg: 'bg-[#8C6239]',
    swatchBorder: 'border-[#6E4A28]'
  },
  {
    id: 'amber',
    name: 'ذهبي دافئ',
    value: 'amber',
    container: 'text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 border-amber-300/80 dark:border-amber-800/60',
    badge: 'text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-950/60 border-amber-300/80 dark:border-amber-800/60',
    spotlight: 'rgba(180, 120, 32, 0.15)',
    swatchBg: 'bg-amber-700',
    swatchBorder: 'border-amber-800'
  },
  {
    id: 'emerald',
    name: 'أخضر',
    value: 'emerald',
    container: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900/50',
    badge: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900/50',
    spotlight: 'rgba(16, 185, 129, 0.12)',
    swatchBg: 'bg-emerald-500',
    swatchBorder: 'border-emerald-600'
  },
  {
    id: 'blue',
    name: 'أزرق',
    value: 'blue',
    container: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900/50',
    badge: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-900/50',
    spotlight: 'rgba(59, 130, 246, 0.12)',
    swatchBg: 'bg-blue-500',
    swatchBorder: 'border-blue-600'
  },
  {
    id: 'purple',
    name: 'بنفسجي',
    value: 'purple',
    container: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-900/50',
    badge: 'text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-200 dark:border-purple-900/50',
    spotlight: 'rgba(168, 85, 247, 0.12)',
    swatchBg: 'bg-purple-500',
    swatchBorder: 'border-purple-600'
  },
  {
    id: 'rose',
    name: 'وردي / أحمر',
    value: 'rose',
    container: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/50',
    badge: 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/50',
    spotlight: 'rgba(244, 63, 94, 0.12)',
    swatchBg: 'bg-rose-500',
    swatchBorder: 'border-rose-600'
  },
  {
    id: 'teal',
    name: 'توازي',
    value: 'teal',
    container: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-900/50',
    badge: 'text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-900/50',
    spotlight: 'rgba(20, 184, 166, 0.12)',
    swatchBg: 'bg-teal-500',
    swatchBorder: 'border-teal-600'
  },
  {
    id: 'indigo',
    name: 'نيلي',
    value: 'indigo',
    container: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-900/50',
    badge: 'text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-900/50',
    spotlight: 'rgba(99, 102, 241, 0.12)',
    swatchBg: 'bg-indigo-500',
    swatchBorder: 'border-indigo-600'
  }
];

export function getSectionColorClasses(colorRaw?: string): SectionColorPreset {
  if (!colorRaw) {
    return SECTION_COLOR_PRESETS[0];
  }

  const c = colorRaw.toLowerCase().trim();

  for (const preset of SECTION_COLOR_PRESETS) {
    if (c === preset.id || c === preset.value) {
      return preset;
    }
  }

  if (c.includes('emerald') || c.includes('green')) return SECTION_COLOR_PRESETS.find(p => p.id === 'emerald')!;
  if (c.includes('purple')) return SECTION_COLOR_PRESETS.find(p => p.id === 'purple')!;
  if (c.includes('blue') || c.includes('sky')) return SECTION_COLOR_PRESETS.find(p => p.id === 'blue')!;
  if (c.includes('amber') || c.includes('gold') || c.includes('yellow')) return SECTION_COLOR_PRESETS.find(p => p.id === 'amber')!;
  if (c.includes('rose') || c.includes('red')) return SECTION_COLOR_PRESETS.find(p => p.id === 'rose')!;
  if (c.includes('teal') || c.includes('cyan')) return SECTION_COLOR_PRESETS.find(p => p.id === 'teal')!;
  if (c.includes('indigo')) return SECTION_COLOR_PRESETS.find(p => p.id === 'indigo')!;

  if (c.includes(' ') || c.includes('border') || c.includes('bg-')) {
    return {
      id: 'custom',
      name: 'مخصص',
      value: colorRaw,
      container: colorRaw,
      badge: colorRaw,
      spotlight: 'rgba(139, 94, 60, 0.12)',
      swatchBg: 'bg-amber-600',
      swatchBorder: 'border-amber-700'
    };
  }

  return SECTION_COLOR_PRESETS[0];
}
