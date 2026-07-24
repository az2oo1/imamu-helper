'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  useEffect(() => {
    const saved = localStorage.getItem('imamu_theme') as Theme | null;
    let initialTheme: Theme = 'light';
    if (saved === 'dark' || saved === 'light') {
      initialTheme = saved;
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      initialTheme = 'dark';
    }
    setThemeState(initialTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(initialTheme);
  }, []);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(next);
      localStorage.setItem('imamu_theme', next);
      return next;
    });
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(newTheme);
    localStorage.setItem('imamu_theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
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
