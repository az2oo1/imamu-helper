'use client';

import React from 'react';
import { motion, Variants, TargetAndTransition } from 'motion/react';

type PresetType = 'fade' | 'slide' | 'scale' | 'blur';
type PerType = 'char' | 'word' | 'line';

interface TextEffectProps {
  children: string;
  per?: PerType;
  preset?: PresetType;
  delay?: number;
  duration?: number;
  staggerDuration?: number;
  className?: string;
  as?: React.ElementType;
  onAnimationComplete?: () => void;
}

const defaultContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: (i: number = 1) => ({
    opacity: 1,
    transition: { staggerChildren: 0.05 * i, delayChildren: 0.02 },
  }),
};

const defaultItemVariants: Record<PresetType, { hidden: TargetAndTransition; visible: TargetAndTransition }> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.3 } },
  },
  slide: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', damping: 20, stiffness: 300 } },
  },
  scale: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { type: 'spring', damping: 18, stiffness: 250 } },
  },
  blur: {
    hidden: { opacity: 0, filter: 'blur(10px)', y: 10 },
    visible: { opacity: 1, filter: 'blur(0px)', y: 0, transition: { duration: 0.4 } },
  },
};

export function TextEffect({
  children,
  per = 'word',
  preset = 'slide',
  delay = 0,
  staggerDuration,
  className = '',
  as: Component = 'div',
  onAnimationComplete,
}: TextEffectProps) {
  const itemVariant = defaultItemVariants[preset] || defaultItemVariants.slide;

  const container: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDuration ?? (per === 'char' ? 0.02 : 0.08),
        delayChildren: delay,
      },
    },
  };

  const splitText = (text: string, type: PerType): string[] => {
    if (type === 'char') return Array.from(text);
    if (type === 'line') return text.split('\n');
    return text.split(' ');
  };

  const tokens = splitText(children, per);

  const MotionComponent = motion.create(Component);

  return (
    <MotionComponent
      className={`inline-flex flex-wrap whitespace-pre-wrap ${className}`}
      variants={container}
      initial="hidden"
      animate="visible"
      onAnimationComplete={onAnimationComplete}
    >
      {tokens.map((token, index) => (
        <motion.span
          key={`${token}-${index}`}
          variants={itemVariant}
          className="inline-block"
        >
          {token}
          {per === 'word' && index < tokens.length - 1 ? '\u00A0' : ''}
        </motion.span>
      ))}
    </MotionComponent>
  );
}
