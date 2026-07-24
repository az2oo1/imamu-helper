'use client';

import React, { useRef } from 'react';
import { motion, useInView, Variants } from 'motion/react';

type PresetType = 'fade-up' | 'fade-down' | 'slide-left' | 'slide-right' | 'scale-up' | 'blur-in';

interface InViewProps {
  children: React.ReactNode;
  preset?: PresetType;
  delay?: number;
  duration?: number;
  className?: string;
  once?: boolean;
  margin?: string;
}

const presetVariants: Record<PresetType, { hidden: any; visible: any }> = {
  'fade-up': {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  },
  'fade-down': {
    hidden: { opacity: 0, y: -30 },
    visible: { opacity: 1, y: 0 },
  },
  'slide-left': {
    hidden: { opacity: 0, x: -40 },
    visible: { opacity: 1, x: 0 },
  },
  'slide-right': {
    hidden: { opacity: 0, x: 40 },
    visible: { opacity: 1, x: 0 },
  },
  'scale-up': {
    hidden: { opacity: 0, scale: 0.92 },
    visible: { opacity: 1, scale: 1 },
  },
  'blur-in': {
    hidden: { opacity: 0, filter: 'blur(12px)', y: 15 },
    visible: { opacity: 1, filter: 'blur(0px)', y: 0 },
  },
};

export function InView({
  children,
  preset = 'fade-up',
  delay = 0,
  duration = 0.5,
  className = '',
  once = true,
  margin = '-50px',
}: InViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once, margin: margin as any });

  const selectedVariants = presetVariants[preset] || presetVariants['fade-up'];

  return (
    <motion.div
      ref={ref}
      className={className}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={selectedVariants}
      transition={{
        duration,
        delay,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
    >
      {children}
    </motion.div>
  );
}
