'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import ReportProblemModal from './ReportProblemModal';
import { buttonVariants } from './ui/Button';

interface ReportDropdownMenuProps {
  targetType: 'tutorial' | 'news' | 'resource' | 'tool' | 'event' | 'general';
  targetId?: string | number;
  targetTitle?: string;
  user?: any;
  buttonClassName?: string;
  iconClassName?: string;
  dropDirection?: 'up' | 'down' | 'auto';
  onEdit?: () => void;
  onDelete?: () => void;
}

export default function ReportDropdownMenu({
  targetType,
  targetId,
  targetTitle,
  user,
  buttonClassName,
  iconClassName = "w-4 h-4",
  dropDirection = "auto",
  onEdit,
  onDelete,
}: ReportDropdownMenuProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [menuPositionReady, setMenuPositionReady] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = () => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger || !menu) return;

    const triggerRect = trigger.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 8;
    const spaceBelow = window.innerHeight - triggerRect.bottom - gap;
    const spaceAbove = triggerRect.top - gap;
    const shouldOpenUp =
      dropDirection === 'up' ||
      (dropDirection === 'auto' && spaceBelow < menuRect.height && spaceAbove > spaceBelow);
    const top = shouldOpenUp
      ? Math.max(viewportPadding, triggerRect.top - menuRect.height - gap)
      : Math.min(window.innerHeight - menuRect.height - viewportPadding, triggerRect.bottom + gap);
    const left = Math.min(
      Math.max(viewportPadding, triggerRect.right - menuRect.width),
      window.innerWidth - menuRect.width - viewportPadding
    );

    setMenuPosition({ top, left });
    setMenuPositionReady(true);
  };

  useEffect(() => {
    if (!dropdownOpen) return;
    const frame = window.requestAnimationFrame(updateMenuPosition);
    const handleViewportChange = () => updateMenuPosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [dropdownOpen, dropDirection]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
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
      className="relative inline-block text-right z-20"
      dir="rtl"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setMenuPositionReady(false);
          setDropdownOpen((prev) => !prev);
        }}
        className={buttonVariants({
          variant: 'ghost',
          size: 'icon-sm',
          rounded: 'xl',
          className: `text-slate-400 hover:text-slate-900 dark:hover:text-white ${buttonClassName || ''}`
        })}
        title="خيارات إضافية"
        aria-haspopup="menu"
        aria-expanded={dropdownOpen}
      >
        <MoreVertical className={iconClassName} />
      </button>

      {dropdownOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed w-40 rounded-2xl border shadow-2xl z-[9999] py-1.5 origin-top-right overflow-hidden"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            opacity: menuPositionReady ? 1 : 0,
            pointerEvents: menuPositionReady ? 'auto' : 'none',
            background: 'var(--bg-card)',
            borderColor: 'var(--border-color)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {onEdit && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setDropdownOpen(false);
                onEdit();
              }}
              className={buttonVariants({ variant: 'ghost', size: 'sm', rounded: 'lg', className: 'w-full justify-start rounded-none px-3 text-[var(--text-main)] hover:bg-[var(--color-imamu-brown)]/10 hover:text-[var(--color-imamu-accent)]' })}
            >
              <Pencil className="w-4 h-4 shrink-0" />
              <span>تعديل</span>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setDropdownOpen(false);
                onDelete();
              }}
              className={buttonVariants({ variant: 'ghost', size: 'sm', rounded: 'lg', className: 'w-full justify-start rounded-none px-3 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600' })}
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span>حذف</span>
            </button>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={(e) => {
              e.stopPropagation();
              setDropdownOpen(false);
              setModalOpen(true);
            }}
            className={buttonVariants({ variant: 'ghost', size: 'sm', rounded: 'lg', className: 'w-full justify-start rounded-none px-3 text-rose-500 hover:bg-rose-500/10 hover:text-rose-600' })}
          >
            <AlertTriangle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
            <span>الإبلاغ عن مشكلة</span>
          </button>
        </div>,
        document.body
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
