'use client';

import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'motion/react';

interface AnimatedNumberProps {
  value: number;
  className?: string;
  springOptions?: {
    bounce?: number;
    damping?: number;
    stiffness?: number;
    mass?: number;
  };
  padZeroes?: number;
  format?: (value: number) => string;
}

export function AnimatedNumber({
  value,
  className = '',
  springOptions = { damping: 25, stiffness: 200 },
  padZeroes = 0,
  format,
}: AnimatedNumberProps) {
  const spring = useSpring(value, springOptions);

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  const displayValue = useTransform(spring, (latest) => {
    if (format) {
      return format(latest);
    }
    const rounded = Math.round(latest);
    if (padZeroes > 0) {
      return String(rounded).padStart(padZeroes, '0');
    }
    return String(rounded);
  });

  const [renderedValue, setRenderedValue] = useState(() => {
    if (format) return format(value);
    const rounded = Math.round(value);
    return padZeroes > 0 ? String(rounded).padStart(padZeroes, '0') : String(rounded);
  });

  useEffect(() => {
    const unsubscribe = displayValue.on('change', (v) => {
      setRenderedValue(v);
    });
    return () => unsubscribe();
  }, [displayValue]);

  return <motion.span className={className}>{renderedValue}</motion.span>;
}
