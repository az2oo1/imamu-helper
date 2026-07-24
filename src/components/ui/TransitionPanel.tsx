'use client';

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface TransitionPanelProps {
  activeKey: string | number;
  children: React.ReactNode;
  className?: string;
  direction?: 'horizontal' | 'vertical';
}

export function TransitionPanel({
  activeKey,
  children,
  className = '',
  direction = 'horizontal',
}: TransitionPanelProps) {
  const initialOffset = direction === 'horizontal' ? 20 : 10;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeKey}
          initial={{
            opacity: 0,
            x: direction === 'horizontal' ? initialOffset : 0,
            y: direction === 'vertical' ? initialOffset : 0,
            filter: 'blur(4px)',
          }}
          animate={{
            opacity: 1,
            x: 0,
            y: 0,
            filter: 'blur(0px)',
          }}
          exit={{
            opacity: 0,
            x: direction === 'horizontal' ? -initialOffset : 0,
            y: direction === 'vertical' ? -initialOffset : 0,
            filter: 'blur(4px)',
          }}
          transition={{
            type: 'spring',
            stiffness: 350,
            damping: 28,
          }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
