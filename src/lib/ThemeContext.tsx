'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

export type ColorPresetId = 
  | 'classic-wood' 
  | 'royal-gold' 
  | 'emerald-cedar' 
  | 'royal-crimson' 
  | 'royal-sapphire';

export interface ColorPreset {
  id: ColorPresetId;
  name: string;
  nameEn: string;
  primary: string;       // main brand color (buttons, highlights)
  primaryLight: string;  // hover / light shade
  primaryDark: string;   // active / dark shade
  accentLight: string;   // text highlight in light theme
  accentDark: string;    // text highlight in dark theme
  btnTextLight: string;  // button text color in light theme
  btnTextDark: string;   // button text color in dark theme
  textMainLight: string;
  textMutedLight: string;
  textMainDark: string;
  textMutedDark: string;
  bgCanvasLight: string;
  bgCanvasDark: string;
  bgCardLight: string;
  bgCardDark: string;
  borderColorLight: string;
  borderColorDark: string;
  bgGradient: string;    // CSS preview gradient
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'classic-wood',
    name: 'خشبي أساسي',
    nameEn: 'Classic Wood',
    primary: '#B46B32',
    primaryLight: '#C87F42',
    primaryDark: '#8F4E1D',
    accentLight: '#A35B27',
    accentDark: '#F3B880',
    btnTextLight: '#FFFFFF',
    btnTextDark: '#FFFFFF',
    textMainLight: '#1F150C',
    textMutedLight: '#6C5744',
    textMainDark: '#F7F2EC',
    textMutedDark: '#BFAEA0',
    bgCanvasLight: '#F6F2EC',
    bgCanvasDark: '#000000',
    bgCardLight: '#FCFAF6',
    bgCardDark: '#0D0B0A',
    borderColorLight: '#E0D5C7',
    borderColorDark: '#261F1A',
    bgGradient: 'linear-gradient(135deg, #B46B32 0%, #783E16 100%)',
  },
  {
    id: 'royal-gold',
    name: 'ملكي',
    nameEn: 'Royal Gold',
    primary: '#B8860B',
    primaryLight: '#D4A32A',
    primaryDark: '#8B6508',
    accentLight: '#996515',
    accentDark: '#F5D061',
    btnTextLight: '#FFFFFF',
    btnTextDark: '#000000',
    textMainLight: '#1C170A',
    textMutedLight: '#6B5C35',
    textMainDark: '#FAF6ED',
    textMutedDark: '#C9BD97',
    bgCanvasLight: '#F8F5EE',
    bgCanvasDark: '#000000',
    bgCardLight: '#FDFBF7',
    bgCardDark: '#0E0D0A',
    borderColorLight: '#E3DAC6',
    borderColorDark: '#282417',
    bgGradient: 'linear-gradient(135deg, #D4A32A 0%, #8B6508 100%)',
  },
  {
    id: 'emerald-cedar',
    name: 'وطني',
    nameEn: 'National Green',
    primary: '#1E5631',
    primaryLight: '#2D7A47',
    primaryDark: '#12381E',
    accentLight: '#1A4B2B',
    accentDark: '#62D389',
    btnTextLight: '#FFFFFF',
    btnTextDark: '#FFFFFF',
    textMainLight: '#0A1C11',
    textMutedLight: '#3A5C46',
    textMainDark: '#F0F8F3',
    textMutedDark: '#9EC0AA',
    bgCanvasLight: '#EEF5F1',
    bgCanvasDark: '#000000',
    bgCardLight: '#F5FAF7',
    bgCardDark: '#0A140D',
    borderColorLight: '#C6DBCF',
    borderColorDark: '#162C1D',
    bgGradient: 'linear-gradient(135deg, #2D7A47 0%, #12381E 100%)',
  },
  {
    id: 'royal-crimson',
    name: 'عنابي زهري',
    nameEn: 'Crimson Rose',
    primary: '#800020',
    primaryLight: '#A01B3A',
    primaryDark: '#580016',
    accentLight: '#75001D',
    accentDark: '#F2879D',
    btnTextLight: '#FFFFFF',
    btnTextDark: '#FFFFFF',
    textMainLight: '#1C060C',
    textMutedLight: '#6C3946',
    textMainDark: '#FAF0F3',
    textMutedDark: '#CBA2AD',
    bgCanvasLight: '#F8F0F2',
    bgCanvasDark: '#000000',
    bgCardLight: '#FDF7F8',
    bgCardDark: '#0E080A',
    borderColorLight: '#E5CBD2',
    borderColorDark: '#28141A',
    bgGradient: 'linear-gradient(135deg, #A01B3A 0%, #580016 100%)',
  },
  {
    id: 'royal-sapphire',
    name: 'أزرق',
    nameEn: 'Sapphire Blue',
    primary: '#1E3A8A',
    primaryLight: '#2563EB',
    primaryDark: '#172554',
    accentLight: '#1A337A',
    accentDark: '#6BB1FF',
    btnTextLight: '#FFFFFF',
    btnTextDark: '#FFFFFF',
    textMainLight: '#091126',
    textMutedLight: '#3E4D75',
    textMainDark: '#F0F4FC',
    textMutedDark: '#A0B0D6',
    bgCanvasLight: '#EEF3FA',
    bgCanvasDark: '#000000',
    bgCardLight: '#F5F8FE',
    bgCardDark: '#080E1C',
    borderColorLight: '#C6D4EC',
    borderColorDark: '#16233F',
    bgGradient: 'linear-gradient(135deg, #2563EB 0%, #172554 100%)',
  },
];

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  colorPreset: ColorPresetId;
  setColorPreset: (presetId: ColorPresetId) => void;
  activeColorPreset: ColorPreset;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [colorPreset, setColorPresetState] = useState<ColorPresetId>('classic-wood');

  const activeColorPreset = COLOR_PRESETS.find(p => p.id === colorPreset) || COLOR_PRESETS[0];

  const applyColorVariables = (preset: ColorPreset, currentTheme: Theme) => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    root.classList.remove('light', 'dark');
    root.classList.add(currentTheme);

    root.style.setProperty('--color-imamu-brown', preset.primary);
    root.style.setProperty('--color-imamu-brown-light', preset.primaryLight);
    root.style.setProperty('--color-imamu-brown-dark', preset.primaryDark);
    
    const targetBg = currentTheme === 'dark' ? '#000000' : preset.bgCanvasLight;
    root.style.backgroundColor = targetBg;
    if (document.body) document.body.style.backgroundColor = targetBg;

    // Update all theme-color meta tags synchronously
    const metaTags = document.querySelectorAll('meta[name="theme-color"]');
    if (metaTags.length > 0) {
      metaTags.forEach(meta => meta.setAttribute('content', targetBg));
    } else {
      let metaTag = document.createElement('meta');
      metaTag.setAttribute('name', 'theme-color');
      metaTag.setAttribute('content', targetBg);
      document.head.appendChild(metaTag);
    }

    // Update apple status bar style
    let appleMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleMeta) {
      appleMeta.setAttribute('content', currentTheme === 'dark' ? 'black-translucent' : 'default');
    }

    if (currentTheme === 'dark') {
      root.style.setProperty('--color-imamu-accent', preset.accentDark);
      root.style.setProperty('--btn-text-primary', preset.btnTextDark);
      root.style.setProperty('--text-main', preset.textMainDark);
      root.style.setProperty('--text-muted', preset.textMutedDark);
      root.style.setProperty('--bg-canvas', preset.bgCanvasDark);
      root.style.setProperty('--bg-card', preset.bgCardDark);
      root.style.setProperty('--border-color', preset.borderColorDark);
    } else {
      root.style.setProperty('--color-imamu-accent', preset.accentLight);
      root.style.setProperty('--btn-text-primary', preset.btnTextLight);
      root.style.setProperty('--text-main', preset.textMainLight);
      root.style.setProperty('--text-muted', preset.textMutedLight);
      root.style.setProperty('--bg-canvas', preset.bgCanvasLight);
      root.style.setProperty('--bg-card', preset.bgCardLight);
      root.style.setProperty('--border-color', preset.borderColorLight);
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem('imamu_theme') as Theme | null;
    let initialTheme: Theme = 'light';
    if (savedTheme === 'dark' || savedTheme === 'light') {
      initialTheme = savedTheme;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      initialTheme = 'dark';
    }
    setThemeState(initialTheme);

    const savedPreset = localStorage.getItem('imamu_color_preset') as ColorPresetId | null;
    if (savedPreset && COLOR_PRESETS.some(p => p.id === savedPreset)) {
      setColorPresetState(savedPreset);
      const presetObj = COLOR_PRESETS.find(p => p.id === savedPreset)!;
      applyColorVariables(presetObj, initialTheme);
    } else {
      applyColorVariables(COLOR_PRESETS[0], initialTheme);
    }
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setThemeState(next);
    localStorage.setItem('imamu_theme', next);
    if (typeof document !== 'undefined') {
      applyColorVariables(activeColorPreset, next);
    }
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('imamu_theme', newTheme);
    if (typeof document !== 'undefined') {
      applyColorVariables(activeColorPreset, newTheme);
    }
  };

  const setColorPreset = (presetId: ColorPresetId) => {
    const target = COLOR_PRESETS.find(p => p.id === presetId);
    if (!target) return;
    setColorPresetState(presetId);
    localStorage.setItem('imamu_color_preset', presetId);
    if (typeof document !== 'undefined') {
      applyColorVariables(target, theme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, colorPreset, setColorPreset, activeColorPreset }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
