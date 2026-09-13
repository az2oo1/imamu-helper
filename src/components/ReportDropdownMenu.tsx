'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, AlertTriangle } from 'lucide-react';
import ReportProblemModal from './ReportProblemModal';

interface ReportDropdownMenuProps {
  targetType: 'tutorial' | 'news' | 'resource' | 'tool' | 'event' | 'general';
  targetId?: string | number;
  targetTitle?: string;
  user?: any;
  buttonClassName?: string;
  iconClassName?: string;
  dropDirection?: 'up' | 'down' | 'auto';
}

export default function ReportDropdownMenu({
  targetType,
  targetId,
  targetTitle,
  user,
  buttonClassName = "p-2 rounded-full hover:bg-neutral-800/80 text-neutral-400 hover:text-white transition cursor-pointer border border-neutral-800/80 shadow-2xs",
  iconClassName = "w-4 h-4",
  dropDirection = "auto",
}: ReportDropdownMenuProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [openUpwards, setOpenUpwards] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (dropdownOpen && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (dropDirection === 'up' || (dropDirection === 'auto' && spaceBelow < 160)) {
        setOpenUpwards(true);
      } else {
        setOpenUpwards(false);
      }
    }
  }, [dropdownOpen, dropDirection]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen]);

  return (
    <div 
      className={`relative inline-block text-right ${dropdownOpen ? 'z-[120]' : 'z-20'}`} 
      ref={menuRef} 
      dir="rtl"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setDropdownOpen((prev) => !prev);
        }}
        className={buttonClassName}
        title="خيارات إضافية"
      >
        <MoreVertical className={iconClassName} />
      </button>

      {dropdownOpen && (
        <div 
          className={`absolute left-0 w-48 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl z-[150] py-1.5 animate-in fade-in zoom-in-95 duration-150 ${
            openUpwards ? 'bottom-full mb-2' : 'top-full mt-2'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDropdownOpen(false);
              setModalOpen(true);
            }}
            className="w-full px-4 py-2.5 text-xs font-bold flex items-center gap-2.5 hover:bg-red-500/10 text-red-500 dark:text-red-400 transition text-right cursor-pointer"
          >
            <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
            <span>الإبلاغ عن مشكلة</span>
          </button>
        </div>
      )}

      {/* Report Problem Popup Modal */}
      <ReportProblemModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        targetType={targetType}
        targetId={targetId}
        targetTitle={targetTitle}
        user={user}
      />
    </div>
  );
}
