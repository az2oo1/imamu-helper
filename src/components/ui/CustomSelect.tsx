'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Check } from 'lucide-react';

export interface CustomSelectOption {
  value: string;
  label: string;
}

export interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  dir?: 'rtl' | 'ltr';
  placement?: 'bottom' | 'top' | 'auto';
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'اختر...',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  dir = 'rtl',
  placement = 'auto',
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [actualPlacement, setActualPlacement] = useState<'top' | 'bottom'>('bottom');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (placement === 'top') {
      setActualPlacement('top');
      return;
    }
    if (placement === 'bottom') {
      setActualPlacement('bottom');
      return;
    }

    if (dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const scrollParent = dropdownRef.current.closest('.overflow-y-auto') || dropdownRef.current.closest('.overflow-auto');

      let spaceBelow = window.innerHeight - rect.bottom;
      let spaceAbove = rect.top;

      if (scrollParent) {
        const parentRect = scrollParent.getBoundingClientRect();
        spaceBelow = Math.min(spaceBelow, parentRect.bottom - rect.bottom);
        spaceAbove = Math.min(spaceAbove, rect.top - parentRect.top);
      }

      if (spaceBelow < 230 && spaceAbove > 130) {
        setActualPlacement('top');
      } else {
        setActualPlacement('bottom');
      }
    }
  }, [isOpen, placement]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value) || options[0];
  const hasWidthClass = className.includes('w-') || className.includes('max-w-');
  const containerWidth = hasWidthClass ? '' : 'w-full';
  const isUp = actualPlacement === 'top';

  return (
    <div ref={dropdownRef} className={`relative block ${dir === 'ltr' ? 'text-left' : 'text-right'} ${containerWidth} ${isOpen ? 'z-50' : 'z-10'} ${className}`} dir={dir}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 py-2.5 px-3.5 rounded-xl focus:ring-2 focus:ring-[var(--color-imamu-accent)]/30 focus:border-[var(--color-imamu-accent)] text-xs font-bold text-slate-900 dark:text-white outline-none cursor-pointer transition flex items-center justify-between gap-2.5 shadow-2xs hover:bg-slate-100 dark:hover:bg-zinc-900 ${
          buttonClassName || ''
        }`}
        style={
          isOpen
            ? { borderColor: 'var(--color-imamu-accent)' }
            : {}
        }
      >
        <span className={`truncate flex-1 ${dir === 'ltr' ? 'text-left' : 'text-right'}`}>{selectedOption?.label || placeholder}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[var(--color-imamu-accent)] font-bold' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: isUp ? -4 : 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isUp ? -4 : 4, scale: 0.97 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className={`absolute ${isUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} ${dir === 'ltr' ? 'left-0' : 'right-0'} min-w-[140px] w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl py-1 z-50 overflow-hidden max-h-56 overflow-y-auto custom-scrollbar ${menuClassName}`}
            dir={dir}
          >
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3.5 py-2 ${dir === 'ltr' ? 'text-left' : 'text-right'} text-xs sm:text-sm font-bold flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-imamu-accent)]/15 text-[var(--color-imamu-accent)] font-extrabold'
                      : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/80'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && (
                    <Check className={`w-3.5 h-3.5 text-[var(--color-imamu-accent)] shrink-0 ${dir === 'ltr' ? 'ml-1.5' : 'mr-1.5'}`} />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
