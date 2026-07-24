'use client';

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';

interface TextMorphProps {
  children: string;
  className?: string;
  as?: React.ElementType;
}

export function TextMorph({
  children,
  className = '',
  as: Component = 'span',
}: TextMorphProps) {
  const characters = Array.from(children).map((char, index) => ({
    id: `${char}-${index}`,
    char,
  }));

  const MotionComponent = motion.create(Component);

  return (
    <MotionComponent className={`inline-flex overflow-hidden ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        {characters.map((item) => (
          <motion.span
            key={item.id}
            layoutId={item.id}
            initial={{ opacity: 0, y: -12, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 30,
              mass: 0.8,
            }}
            className="inline-block whitespace-pre"
          >
            {item.char}
          </motion.span>
        ))}
      </AnimatePresence>
    </MotionComponent>
  );
}
