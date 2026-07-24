'use client';

import React from 'react';
import { motion } from 'motion/react';
import clsx from 'clsx';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  badge?: string | number;
}

interface AnimatedTabsProps {
  tabs: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  layoutId?: string;
  pillColor?: string;
  activeTextColor?: string;
  inactiveTextColor?: string;
}

export function AnimatedTabs({
  tabs,
  activeId,
  onChange,
  className = '',
  layoutId = 'active-pill',
  pillColor = 'bg-blue-600',
  activeTextColor = 'text-white font-semibold',
  inactiveTextColor = 'text-zinc-400 hover:text-zinc-100',
}: AnimatedTabsProps) {
  return (
    <div className={clsx('relative flex items-center gap-1 rounded-xl bg-zinc-900/80 p-1.5 border border-zinc-800/80 backdrop-blur-md', className)}>
      {tabs.map((tab) => {
        const isActive = tab.id === activeId;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={clsx(
              'relative flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors focus:outline-none z-10',
              isActive ? activeTextColor : inactiveTextColor
            )}
          >
            {isActive && (
              <motion.div
                layoutId={layoutId}
                className={clsx('absolute inset-0 rounded-lg shadow-md -z-10', pillColor)}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                }}
              />
            )}
            {Icon && <Icon className="w-4 h-4" />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={clsx('px-1.5 py-0.5 text-xs rounded-full font-mono', isActive ? 'bg-white/20 text-white' : 'bg-zinc-800 text-zinc-400')}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
