'use client';

import React, { useRef, useState } from 'react';
import { motion, useMotionTemplate, useMotionValue } from 'motion/react';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColor?: string;
  hoverBorderColor?: string;
  onClick?: () => void;
}

export function SpotlightCard({
  children,
  className = '',
  spotlightColor,
  hoverBorderColor,
  onClick,
}: SpotlightCardProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const { left, top } = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  }

  // Use dynamic theme color if spotlightColor isn't explicitly set
  const effectiveSpotlight = spotlightColor 
    ? (spotlightColor.startsWith('var(') ? `color-mix(in srgb, ${spotlightColor} 15%, transparent)` : spotlightColor)
    : 'color-mix(in srgb, var(--color-imamu-brown) 12%, transparent)';

  const background = useMotionTemplate`radial-gradient(350px circle at ${mouseX}px ${mouseY}px, ${effectiveSpotlight}, transparent 80%)`;

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{ borderColor: hoverBorderColor || 'var(--color-imamu-accent)' }}
      transition={{ duration: 0.2 }}
      className={`relative rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-2xs ${className}`}
    >
      {/* Radial Spotlight overlay */}
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-300"
        style={{
          opacity: isHovered ? 1 : 0,
          background,
        }}
      />
      {/* Content wrapper */}
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}
