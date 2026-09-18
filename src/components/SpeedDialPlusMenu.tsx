'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { Plus, BookOpen, GraduationCap, CheckSquare, CalendarPlus } from 'lucide-react';

interface SpeedDialPlusMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onAddCourse: () => void;
  onAddSemester: () => void;
  onAddTask: () => void;
  onAddExam: () => void;
}

interface ActionItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  onClick: () => void;
}

export function SpeedDialPlusMenu({
  isOpen,
  onToggle,
  onClose,
  onAddCourse,
  onAddSemester,
  onAddTask,
  onAddExam,
}: SpeedDialPlusMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const items: ActionItem[] = [
    {
      id: 'course',
      label: 'إضافة مادة',
      icon: <BookOpen className="w-4 h-4 text-amber-400" />,
      iconBg: 'bg-amber-500/15 text-amber-400 group-hover:bg-amber-500/25',
      onClick: () => {
        onClose();
        onAddCourse();
      },
    },
    {
      id: 'semester',
      label: 'إضافة فصل دراسي',
      icon: <GraduationCap className="w-4 h-4 text-emerald-400" />,
      iconBg: 'bg-emerald-500/15 text-emerald-400 group-hover:bg-emerald-500/25',
      onClick: () => {
        onClose();
        onAddSemester();
      },
    },
    {
      id: 'task',
      label: 'إضافة مهمة جديدة',
      icon: <CheckSquare className="w-4 h-4 text-sky-400" />,
      iconBg: 'bg-sky-500/15 text-sky-400 group-hover:bg-sky-500/25',
      onClick: () => {
        onClose();
        onAddTask();
      },
    },
    {
      id: 'exam',
      label: 'إضافة موعد أو اختبار',
      icon: <CalendarPlus className="w-4 h-4 text-purple-400" />,
      iconBg: 'bg-purple-500/15 text-purple-400 group-hover:bg-purple-500/25',
      onClick: () => {
        onClose();
        onAddExam();
      },
    },
  ];

  // Arrowhead positions (< pointing to the left):
  // 4 items arranged along an arrow head:
  // Item 0 (إضافة مادة): top wing
  // Item 1 (إضافة فصل دراسي): tip of the arrow (furthest left)
  // Item 2 (إضافة مهمة جديدة): lower middle tip
  // Item 3 (إضافة موعد أو اختبار): bottom wing
  // Increased vertical separation (38px gap between rows) to completely prevent overlapping
  // With distinctive horizontal offsets forming a clear '<' arrow pointing left:
  const arrowTargets = [
    { x: -16, y: -62 },  // Top wing: sits closer to button
    { x: -44, y: -21 },  // Arrow tip: projects boldly to the left
    { x: -44, y: 21 },   // Arrow tip: projects boldly to the left
    { x: -16, y: 62 },   // Bottom wing: sits closer to button
  ];

  const itemVariants: Variants = {
    closed: {
      opacity: 0,
      scale: 0.2,
      x: 20, // Originates from inside the trigger button
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 450,
        damping: 30,
      },
    },
    open: (i: number) => ({
      opacity: 1,
      scale: 1,
      x: arrowTargets[i]?.x ?? -20,
      y: arrowTargets[i]?.y ?? 0,
      transition: {
        type: 'spring' as const,
        stiffness: 380,
        damping: 24,
        mass: 0.7,
        delay: i * 0.035,
      },
    }),
  };

  return (
    <>
      {/* Subtle backdrop overlay to focus attention and allow clicking outside to close */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px]"
          />
        )}
      </AnimatePresence>

      <div className="relative" ref={containerRef}>
        {/* Central Plus/Close Trigger Button */}
        <button
          type="button"
          onClick={onToggle}
          className={`relative z-50 flex items-center justify-center w-10 h-10 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0 ${
            isOpen
              ? 'bg-[#8a532d] hover:bg-[#724424] text-white ring-2 ring-amber-500/40 shadow-amber-900/40'
              : 'bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white'
          }`}
          title={isOpen ? 'إغلاق' : 'إضافة...'}
          aria-expanded={isOpen}
        >
          <motion.div
            animate={{ rotate: isOpen ? 45 : 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 22 }}
          >
            <Plus className="w-5 h-5" />
          </motion.div>
        </button>

        {/* Action Buttons: emerge from inside plus button into an arrow shape (<) to the left */}
        <AnimatePresence>
          {isOpen && (
            <div className="absolute inset-0 pointer-events-none z-40" dir="rtl">
              {items.map((item, idx) => (
                <motion.button
                  key={item.id}
                  custom={idx}
                  variants={itemVariants}
                  initial="closed"
                  animate="open"
                  exit="closed"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={item.onClick}
                  className="absolute pointer-events-auto h-8.5 px-3 bg-[#18181b] hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold text-slate-200 hover:text-white transition-colors duration-150 cursor-pointer whitespace-nowrap group focus:outline-hidden"
                  style={{
                    right: '100%',
                    top: '50%',
                    marginTop: '-17px', // half of 34px height
                  }}
                  title={item.label}
                >
                  <div
                    className={`w-5.5 h-5.5 rounded-lg flex items-center justify-center shrink-0 transition-colors ${item.iconBg}`}
                  >
                    {item.icon}
                  </div>
                  <span className="leading-none">{item.label}</span>
                </motion.button>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
