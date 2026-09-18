'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Check, MoreVertical, Calendar as CalendarIcon, 
  ExternalLink, Smartphone, Plus, Eye, X, Loader2, Sparkles, Building2, User
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export interface CalendarInfo {
  id: 'academic' | 'entity' | 'user';
  name: string;
  subtitle: string;
  color: string; // Hex color for checkbox and badge
  icon: React.ComponentType<{ className?: string }>;
}

interface CalendarSelectorProps {
  visibleCalendars: Record<'academic' | 'entity' | 'user', boolean>;
  onToggleCalendar: (id: 'academic' | 'entity' | 'user') => void;
  onShowOnlyCalendar: (id: 'academic' | 'entity' | 'user') => void;
  onOpenAddEvent?: () => void;
  onEventCreated?: () => void;
}

export default function CalendarSelector({
  visibleCalendars,
  onToggleCalendar,
  onShowOnlyCalendar,
  onOpenAddEvent,
  onEventCreated
}: CalendarSelectorProps) {
  const { user, dbUser } = useAuth();
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    if (activeMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeMenuId]);

  const isAuthed = !!(user || dbUser);
  const resolvedUserId = (user?.uid || dbUser?.uid || (dbUser?.id ? String(dbUser.id) : '') || '').trim();
  const userName = isAuthed
    ? (dbUser?.userName || user?.displayName || 'التقويم الشخصي')
    : 'التقويم الشخصي';

  const calendars: CalendarInfo[] = [
    {
      id: 'academic',
      name: 'التقويم الأكاديمي',
      subtitle: 'المواعيد الرسمية للجامعة',
      color: '#d97706', // Warm Amber / Imam brand color
      icon: CalendarIcon,
    },
    {
      id: 'entity',
      name: 'فعاليات الجهات والأندية',
      subtitle: 'أنشطة الأندية والجهات المعتمدة',
      color: '#10b981', // Emerald Green (matching Birthdays in GCal)
      icon: Building2,
    },
    ...(isAuthed ? [{
      id: 'user' as const,
      name: userName,
      subtitle: 'التقويم الشخصي والمهام',
      color: '#0284c7', // Sky / Royal Blue (matching user in GCal)
      icon: User,
    }] : [])
  ];

  const getDirectIcsUrl = (calId: 'academic' | 'entity' | 'user', download = false) => {
    if (typeof window === 'undefined') return '#';
    const origin = window.location.origin;
    let url = `${origin}/api/calendar.ics?type=${calId}`;
    if (calId === 'user' && resolvedUserId) {
      url += `&userId=${encodeURIComponent(resolvedUserId)}`;
    }
    if (download) {
      url += '&download=true';
    }
    return url;
  };

  const getGoogleCalendarUrl = (calId: 'academic' | 'entity' | 'user') => {
    const icsUrl = getDirectIcsUrl(calId, false);
    return `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(icsUrl)}`;
  };

  const getWebcalUrl = (calId: 'academic' | 'entity' | 'user') => {
    if (typeof window === 'undefined') return '#';
    const host = window.location.host;
    let url = `webcal://${host}/api/calendar.ics?type=${calId}`;
    if (calId === 'user' && resolvedUserId) {
      url += `&userId=${encodeURIComponent(resolvedUserId)}`;
    }
    return url;
  };



  return (
    <div className="p-3 border-b border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur z-10 text-right shrink-0" dir="rtl">
      
      {/* Header section with title */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-zinc-500 flex items-center gap-1.5">
          <CalendarIcon className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
          التقاويم
        </span>
      </div>

      {/* Calendar List (Google Calendar Style) */}
      <div className="space-y-1" ref={menuRef}>
        {calendars.map((cal) => {
          const isChecked = visibleCalendars[cal.id] ?? true;
          const isMenuOpen = activeMenuId === cal.id;

          return (
            <div
              key={cal.id}
              className={`group relative flex items-center justify-between px-2 py-1.5 rounded-xl transition-colors duration-150 select-none ${
                isMenuOpen ? 'bg-slate-100 dark:bg-zinc-800' : 'hover:bg-slate-100/80 dark:hover:bg-zinc-800/60'
              }`}
            >
              {/* Left/Right Clickable Row: Checkbox + Label */}
              <div 
                onClick={() => onToggleCalendar(cal.id)}
                className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer py-0.5"
              >
                {/* Custom Google Calendar Checkbox */}
                <div
                  className={`w-4 h-4 rounded-[4px] flex items-center justify-center transition-all duration-150 shrink-0 ${
                    isChecked 
                      ? 'shadow-2xs' 
                      : 'border-2 hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: isChecked ? cal.color : 'transparent',
                    borderColor: cal.color,
                  }}
                  role="checkbox"
                  aria-checked={isChecked}
                >
                  {isChecked && (
                    <Check className="w-3 h-3 text-white stroke-[3.5]" />
                  )}
                </div>

                {/* Calendar Title & Subtitle */}
                <div className="flex flex-col min-w-0">
                  <span className={`text-xs font-bold leading-tight truncate transition-colors ${
                    isChecked ? 'text-slate-800 dark:text-zinc-100' : 'text-slate-400 dark:text-zinc-500'
                  }`}>
                    {cal.name}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate leading-tight mt-0.5">
                    {cal.subtitle}
                  </span>
                </div>
              </div>

              {/* Three-dots Menu Trigger (⋮) */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveMenuId(isMenuOpen ? null : cal.id);
                  }}
                  className={`p-1 rounded-lg transition-opacity duration-150 cursor-pointer ${
                    isMenuOpen 
                      ? 'opacity-100 bg-slate-200 dark:bg-zinc-700 text-slate-900 dark:text-white' 
                      : 'opacity-40 group-hover:opacity-100 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                  }`}
                  title={`خيارات ${cal.name}`}
                  aria-label={`خيارات ${cal.name}`}
                >
                  <MoreVertical className="w-3.5 h-3.5" />
                </button>

                {/* Dropdown Menu */}
                {isMenuOpen && (
                  <div 
                    className="absolute left-0 mt-1.5 w-52 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl py-1.5 z-50 text-right animate-in fade-in zoom-in-95 duration-150"
                    dir="rtl"
                  >
                    {/* Menu Header with indicator */}
                    <div className="px-3 py-1.5 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2 mb-1">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cal.color }} />
                      <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {cal.name}
                      </span>
                    </div>

                    {/* Subscription options */}
                    {cal.id === 'user' && !isAuthed ? (
                      <div className="px-3 py-2 text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/20 border-b border-slate-100 dark:border-zinc-800">
                        سجّل الدخول للحصول على رابط سحابي خاص بك للمزامنة
                      </div>
                    ) : (
                      <>
                        <a
                          href={getGoogleCalendarUrl(cal.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setActiveMenuId(null)}
                          className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <ExternalLink className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <div className="flex flex-col text-right">
                              <span>اشتراك في تقويم Google</span>
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">
                                مزامنة وتحديث تلقائي
                              </span>
                            </div>
                          </div>
                        </a>

                        <a
                          href={getWebcalUrl(cal.id)}
                          onClick={() => setActiveMenuId(null)}
                          className="flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <Smartphone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <div className="flex flex-col text-right">
                              <span>أشتراك في تقويم الجهاز</span>
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">
                                للآيفون، الآيباد، الماك، وOutlook
                              </span>
                            </div>
                          </div>
                        </a>
                      </>
                    )}

                    {/* Action: Show Only This Calendar */}
                    <button
                      type="button"
                      onClick={() => {
                        onShowOnlyCalendar(cal.id);
                        setActiveMenuId(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer text-right border-t border-slate-100 dark:border-zinc-800"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>عرض هذا التقويم فقط</span>
                    </button>

                    {/* If Personal Calendar: Add Event */}
                    {cal.id === 'user' && (
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMenuId(null);
                          if (onOpenAddEvent) {
                            onOpenAddEvent();
                          }
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-[var(--color-imamu-accent)] hover:bg-[var(--color-imamu-accent)]/10 transition cursor-pointer text-right border-t border-slate-100 dark:border-zinc-800 mt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة موعد شخصي</span>
                      </button>
                    )}

                    {/* If Entity Calendar: Link to entity dashboard */}
                    {cal.id === 'entity' && (
                      <a
                        href="/news"
                        onClick={() => setActiveMenuId(null)}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer border-t border-slate-100 dark:border-zinc-800 mt-1"
                      >
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>استعراض جهات الجامعة</span>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
