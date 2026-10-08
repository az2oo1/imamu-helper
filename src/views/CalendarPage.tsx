'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { 
  Clock, ChevronLeft, ChevronRight, LayoutGrid, List, X, 
  Info, ExternalLink, Download, Search, Trash2, Plus
} from 'lucide-react';
import { 
  format, addMonths, subMonths, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday, addWeeks, subWeeks, isAfter, startOfDay 
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  parseDate, formatDate, formatHijriDate, formatHijriMonthDay, 
  getEventCategoryMeta, formatIcsFloating, getEventDateTimeBounds, escapeIcs 
} from '../lib/date-utils';
import { AnimatePresence } from 'motion/react';
import ReportDropdownMenu from '../components/ReportDropdownMenu';
import CalendarSelector from '../components/CalendarSelector';
import { NewTaskModal } from '../components/NewTaskModal';
import { formatTimeArabic } from '../components/CompactDateTimePicker';
import { useSWR } from '../lib/swr';
import { StudentTask, TASK_CATEGORIES, getCourseColor } from '../lib/task-utils';
import { matchArabicSearch } from '../lib/search-utils';
import { Button, ButtonLink } from '../components/ui';

export function CalendarPage() {
  const [taskEvents, setTaskEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewState, setViewState] = useState<'month' | 'week'>('month');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [expandedSidebarEventId, setExpandedSidebarEventId] = useState<string | null>(null);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');

  // New Task Modal State & registered courses
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [registeredCourses, setRegisteredCourses] = useState<any[]>([]);

  const [visibleCalendars, setVisibleCalendars] = useState<Record<'academic' | 'entity' | 'user', boolean>>({
    academic: true,
    entity: true,
    user: true,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem('imamu_calendar_visibility');
      if (saved) {
        setVisibleCalendars(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const handleToggleCalendar = (id: 'academic' | 'entity' | 'user') => {
    setVisibleCalendars(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('imamu_calendar_visibility', JSON.stringify(next));
      }
      return next;
    });
  };

  const handleShowOnlyCalendar = (id: 'academic' | 'entity' | 'user') => {
    const next = { academic: false, entity: false, user: false, [id]: true };
    setVisibleCalendars(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('imamu_calendar_visibility', JSON.stringify(next));
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem('imamu_my_semesters');
      if (!raw) {
        setRegisteredCourses([]);
        return;
      }
      const sems = JSON.parse(raw);
      const activeSemId = localStorage.getItem('imamu_active_semester_id');
      const active = sems.find((s: any) => s.id === activeSemId) || sems[0];
      setRegisteredCourses(active?.courses || []);
    } catch {
      setRegisteredCourses([]);
    }
  }, [isTaskModalOpen]);

  const loadTaskEvents = () => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('imamu_student_tasks');
      if (!saved) {
        setTaskEvents([]);
        return;
      }
      const tasks: StudentTask[] = JSON.parse(saved);
      const evs = (Array.isArray(tasks) ? tasks : [])
        .filter(t => t.dueDate && !t.completed)
        .map(t => {
          const dateTime = t.dueTime ? `${t.dueDate}T${t.dueTime}` : t.dueDate;
          const isPersonalEvent = t.category === 'Event' || t.category === 'موعد شخصي';
          const categoryObj = TASK_CATEGORIES.find(c => c.key === t.category);
          const catLabel = categoryObj ? categoryObj.label : (t.categoryLabel || t.category || (isPersonalEvent ? 'موعد شخصي' : 'مهمة'));
          return {
            id: `task-${t.id}`,
            taskId: t.id,
            title: `${t.title}${t.courseName ? ` – ${t.courseName}` : ''}`,
            date: dateTime,
            time: t.dueTime || undefined,
            endDate: t.endDate,
            endTime: t.endTime,
            location: t.location,
            link: t.link,
            description: t.description || `${catLabel}${t.courseName ? ` | مقرر: ${t.courseName}` : ''}${t.priority ? ` [أهمية: ${t.priority}]` : ''}`,
            calendarType: 'user' as const,
            color: t.color || (t.courseCode ? getCourseColor(t.courseCode) : '#0284c7'),
            isTask: !isPersonalEvent,
            priority: t.priority,
            category: catLabel,
            courseCode: t.courseCode
          };
        });
      setTaskEvents(evs);
    } catch {
      setTaskEvents([]);
    }
  };

  useEffect(() => {
    loadTaskEvents();
    const handleUpdate = () => {
      loadTaskEvents();
    };
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('imamu_tasks_updated', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('imamu_tasks_updated', handleUpdate);
    };
  }, []);

  const { data: eventsData, mutate } = useSWR<any[]>('/api/events');

  // Combined all events sorted by date
  const allEvents = useMemo(() => {
    const combined = [...(Array.isArray(eventsData) ? eventsData : [])];
    taskEvents.forEach(te => {
      if (!combined.some(e => e.id === te.id)) {
        combined.push(te);
      }
    });
    return combined.sort((a, b) => (parseDate(a.date)?.getTime() || 0) - (parseDate(b.date)?.getTime() || 0));
  }, [eventsData, taskEvents]);

  // Filter by calendar visibility
  const filteredEvents = useMemo(() => {
    return allEvents.filter(e => {
      const type = e.calendarType || 'academic';
      if (type === 'academic') return visibleCalendars.academic;
      if (type === 'entity') return visibleCalendars.entity;
      if (type === 'user') return visibleCalendars.user;
      return true;
    });
  }, [allEvents, visibleCalendars]);

  // Index events by YYYY-MM-DD for instant O(1) day lookups
  const eventsByDayKey = useMemo(() => {
    const map = new Map<string, any[]>();
    const addEvent = (key: string, ev: any) => {
      const existing = map.get(key);
      if (existing) {
        existing.push(ev);
      } else {
        map.set(key, [ev]);
      }
    };

    for (const ev of filteredEvents) {
      const startD = parseDate(ev.date);
      if (startD && !isNaN(startD.getTime())) {
        const startKey = format(startD, 'yyyy-MM-dd');
        addEvent(startKey, { ...ev, isStart: true });
      }

      // Add deadline marker if there's a distinct end date
      if (ev.endDate) {
        const endD = parseDate(ev.endDate);
        if (endD && !isNaN(endD.getTime())) {
          const endKey = format(endD, 'yyyy-MM-dd');
          if (startD && !isSameDay(startD, endD)) {
            addEvent(endKey, { ...ev, isDeadline: true });
          }
        }
      }
    }

    return map;
  }, [filteredEvents]);

  // Filtered upcoming events with instant search
  const upcomingEvents = useMemo(() => {
    const todayStart = startOfDay(new Date());
    const query = searchQuery.trim();

    return filteredEvents
      .map(e => ({ ...e, parsedDate: parseDate(e.date) }))
      .filter(e => {
        if (!e.parsedDate || isNaN(e.parsedDate.getTime())) return false;
        if (query) {
          return matchArabicSearch([e.title, e.description, e.entityName], query);
        }
        return isAfter(e.parsedDate, todayStart) || isSameDay(e.parsedDate, todayStart);
      })
      .sort((a, b) => (a.parsedDate?.getTime() || 0) - (b.parsedDate?.getTime() || 0));
  }, [filteredEvents, searchQuery]);

  const displayedUpcomingEvents = useMemo(() => {
    return searchQuery.trim() ? upcomingEvents : upcomingEvents.slice(0, visibleCount);
  }, [upcomingEvents, visibleCount, searchQuery]);

  const hasMoreUpcomingEvents = !searchQuery.trim() && upcomingEvents.length > visibleCount;

  useEffect(() => {
    setVisibleCount(10);
  }, [searchQuery]);

  const handleSaveNewTask = (taskData: Omit<StudentTask, 'id' | 'completed' | 'createdAt'>) => {
    try {
      const raw = localStorage.getItem('imamu_student_tasks');
      const prev: StudentTask[] = raw ? JSON.parse(raw) : [];
      const newTask: StudentTask = {
        id: Date.now().toString(),
        ...taskData,
        completed: false,
        createdAt: new Date().toISOString()
      };
      const updated = [newTask, ...prev];
      localStorage.setItem('imamu_student_tasks', JSON.stringify(updated));

      const token = localStorage.getItem('token') || localStorage.getItem('imamu_token') || '';
      if (token) {
        fetch('/api/user-tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ tasks: updated })
        }).catch(() => {});

        if ((newTask.category === 'Event' || newTask.category === 'موعد شخصي') && newTask.dueDate) {
          const dateTime = newTask.dueTime ? `${newTask.dueDate}T${newTask.dueTime}` : newTask.dueDate;
          fetch('/api/user-events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              title: newTask.title,
              date: dateTime,
              description: newTask.description || '',
              location: newTask.location || ''
            })
          }).then(() => mutate()).catch(() => {});
        }
      }

      window.dispatchEvent(new Event('imamu_tasks_updated'));
      window.dispatchEvent(new Event('storage'));
      loadTaskEvents();
    } catch {}
  };

  const nextPeriod = () => {
    setCurrentDate(viewState === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
  };
  const prevPeriod = () => {
    setCurrentDate(viewState === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  const getGoogleCalendarUrl = (ev: any) => {
    const bounds = getEventDateTimeBounds(ev);
    if (!bounds) return '#';

    let datesStr = '';
    if (bounds.hasTime && bounds.endD) {
      datesStr = `${formatIcsFloating(bounds.startD)}/${formatIcsFloating(bounds.endD)}`;
    } else {
      const startStr = formatDate(bounds.startBase, 'iso-date').replace(/-/g, '');
      const endBase = ev.endDate ? (parseDate(ev.endDate) || bounds.startBase) : bounds.startBase;
      const nextDay = new Date(endBase.getTime() + 24 * 60 * 60 * 1000);
      const endStr = formatDate(nextDay, 'iso-date').replace(/-/g, '');
      datesStr = `${startStr}/${endStr}`;
    }

    let details = ev.description || '';
    if (ev.link) {
      details = details ? `${details}\n\nالرابط: ${ev.link}` : `الرابط: ${ev.link}`;
    }

    let url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${datesStr}&details=${encodeURIComponent(details)}&sf=true&output=xml`;
    if (ev.location) {
      url += `&location=${encodeURIComponent(ev.location)}`;
    }
    return url;
  };

  const downloadSingleIcs = (ev: any) => {
    const bounds = getEventDateTimeBounds(ev);
    if (!bounds) return;

    const stampStr = formatIcsFloating(new Date()) + 'Z';
    const cleanTitle = escapeIcs(ev.title);

    let descText = ev.description || '';
    if (ev.link) {
      descText = descText ? `${descText}\n\nالرابط: ${ev.link}` : `الرابط: ${ev.link}`;
    }
    const cleanDesc = escapeIcs(descText);

    let dateLines = '';
    if (bounds.hasTime && bounds.endD) {
      dateLines = `DTSTART:${formatIcsFloating(bounds.startD)}\r\nDTEND:${formatIcsFloating(bounds.endD)}`;
    } else {
      const dtstart = formatDate(bounds.startBase, 'iso-date').replace(/-/g, '');
      const endBase = ev.endDate ? (parseDate(ev.endDate) || bounds.startBase) : bounds.startBase;
      const nextDay = new Date(endBase.getTime() + 24 * 60 * 60 * 1000);
      const dtend = formatDate(nextDay, 'iso-date').replace(/-/g, '');
      dateLines = `DTSTART;VALUE=DATE:${dtstart}\r\nDTEND;VALUE=DATE:${dtend}`;
    }

    const icsLines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//IMAMU Helper//AR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-TIMEZONE:Asia/Riyadh',
      'BEGIN:VEVENT',
      `UID:${ev.id || Math.random().toString(36).substring(2)}@imamu-helper`,
      `DTSTAMP:${stampStr}`,
      `LAST-MODIFIED:${stampStr}`,
      `SEQUENCE:0`,
      `STATUS:CONFIRMED`,
      dateLines,
      `SUMMARY:${cleanTitle}`,
      cleanDesc ? `DESCRIPTION:${cleanDesc}` : '',
      ev.location ? `LOCATION:${escapeIcs(ev.location)}` : '',
      ev.link ? `URL:${ev.link}` : '',
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');

    const blob = new Blob([icsLines], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${ev.title}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDateMonth = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDateMonth = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });

  const daysToShow = useMemo(() => {
    return viewState === 'month' 
      ? eachDayOfInterval({ start: startDateMonth, end: endDateMonth })
      : eachDayOfInterval({ start: weekStart, end: weekEnd });
  }, [viewState, startDateMonth, endDateMonth, weekStart, weekEnd]);

  const isTodayDate = isToday(currentDate);

  const getEventVisualClasses = (ev: any) => {
    if (ev.calendarType === 'entity') {
      return {
        lineAccent: 'border-r-emerald-500',
        badgeColor: 'text-emerald-700 dark:text-emerald-400',
        activeHighlight: 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 border-r-emerald-700 dark:border-r-emerald-400 font-bold shadow-sm',
      };
    }
    if (ev.calendarType === 'user') {
      if (ev.isTask && ev.color) {
        return {
          lineAccent: '',
          badgeColor: '',
          activeHighlight: 'text-white dark:text-zinc-950 font-bold shadow-sm',
        };
      }
      return {
        lineAccent: 'border-r-sky-500',
        badgeColor: 'text-sky-700 dark:text-sky-400',
        activeHighlight: 'bg-sky-600 dark:bg-sky-500 text-white dark:text-zinc-950 border-r-sky-700 dark:border-r-sky-400 font-bold shadow-sm',
      };
    }

    const meta = getEventCategoryMeta(ev);
    if (meta) {
      if (meta.label.includes('الوطني') || meta.label.includes('التأسيس')) {
        return {
          lineAccent: 'border-r-emerald-600',
          badgeColor: 'text-emerald-700 dark:text-emerald-300',
          activeHighlight: 'bg-emerald-700 dark:bg-emerald-600 text-white dark:text-zinc-950 border-r-emerald-800 dark:border-r-emerald-400 font-bold shadow-sm',
        };
      }
      if (meta.label.includes('العيد')) {
        return {
          lineAccent: 'border-r-purple-500',
          badgeColor: 'text-purple-700 dark:text-purple-400',
          activeHighlight: 'bg-purple-600 dark:bg-purple-500 text-white dark:text-zinc-950 border-r-purple-700 dark:border-r-purple-400 font-bold shadow-sm',
        };
      }
      if (meta.label.includes('اختبار')) {
        return {
          lineAccent: 'border-r-rose-500',
          badgeColor: 'text-rose-700 dark:text-rose-400',
          activeHighlight: 'bg-rose-600 dark:bg-rose-500 text-white dark:text-zinc-950 border-r-rose-700 dark:border-r-rose-400 font-bold shadow-sm',
        };
      }
      if (meta.label.includes('حركة')) {
        return {
          lineAccent: 'border-r-sky-500',
          badgeColor: 'text-sky-700 dark:text-sky-400',
          activeHighlight: 'bg-sky-600 dark:bg-sky-500 text-white dark:text-zinc-950 border-r-sky-700 dark:border-r-sky-400 font-bold shadow-sm',
        };
      }
      if (meta.label.includes('إجازة')) {
        return {
          lineAccent: 'border-r-emerald-600/70 dark:border-emerald-500/60',
          badgeColor: 'text-emerald-700 dark:text-emerald-400',
          activeHighlight: 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 border-r-emerald-700 dark:border-r-emerald-400 font-bold shadow-sm',
        };
      }
      if (meta.label.includes('فصل')) {
        return {
          lineAccent: 'border-r-indigo-600/70 dark:border-indigo-500/60',
          badgeColor: 'text-indigo-700 dark:text-indigo-400',
          activeHighlight: 'bg-indigo-600 dark:bg-indigo-500 text-white dark:text-zinc-950 border-r-indigo-700 dark:border-r-indigo-400 font-bold shadow-sm',
        };
      }
      if (meta.label.includes('مكافأة')) {
        return {
          lineAccent: 'border-r-blue-600/70 dark:border-blue-500/60',
          badgeColor: 'text-blue-700 dark:text-blue-400',
          activeHighlight: 'bg-blue-600 dark:bg-blue-500 text-white dark:text-zinc-950 border-r-blue-700 dark:border-r-blue-400 font-bold shadow-sm',
        };
      }
    }

    return {
      lineAccent: 'border-r-amber-600/70 dark:border-amber-500/60',
      badgeColor: 'text-amber-700 dark:text-amber-400',
      activeHighlight: 'bg-[var(--color-imamu-accent)] text-white dark:text-zinc-950 border-r-[var(--color-imamu-brown-dark)] dark:border-r-[var(--color-imamu-accent)] font-bold shadow-sm',
    };
  };

  const handleDeletePersonalEvent = async (ev: any) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الموعد؟')) return;
    try {
      const evIdStr = String(ev.id || '');
      const evTaskIdStr = String(ev.taskId || '');
      const evDateOnly = String(ev.date || '').split('T')[0];

      // If it's an exam task, record in dismissed exam list
      if (evIdStr.startsWith('task-exam-') || evIdStr.startsWith('exam-') || evTaskIdStr.startsWith('exam-')) {
        try {
          const rawDismissed = localStorage.getItem('imamu_dismissed_exam_tasks');
          const dismissed: string[] = rawDismissed ? JSON.parse(rawDismissed) : [];
          const targetKey = evTaskIdStr.startsWith('exam-')
            ? evTaskIdStr
            : evIdStr.startsWith('task-')
            ? evIdStr.slice(5)
            : evIdStr;
          if (!dismissed.includes(targetKey)) {
            dismissed.push(targetKey);
            localStorage.setItem('imamu_dismissed_exam_tasks', JSON.stringify(dismissed));
          }
        } catch {}
      }

      // 1. Clean from unified student tasks & personal events
      try {
        const rawTasks = localStorage.getItem('imamu_student_tasks');
        if (rawTasks) {
          const parsed = JSON.parse(rawTasks);
          if (Array.isArray(parsed)) {
            const remaining = parsed.filter((t: any) => {
              const tId = String(t.id || '');
              if (tId === evIdStr || `task-${tId}` === evIdStr) return false;
              if (evTaskIdStr && (tId === evTaskIdStr || `task-${tId}` === evTaskIdStr)) return false;
              if (t.title === ev.title && t.dueDate === evDateOnly) return false;
              if (ev.title && t.courseName && (ev.title.includes(t.courseName) || ev.title.includes(t.title)) && t.dueDate === evDateOnly) return false;
              return true;
            });
            localStorage.setItem('imamu_student_tasks', JSON.stringify(remaining));
            setTaskEvents(prev => prev.filter(t => t.id !== evIdStr && t.taskId !== evTaskIdStr));
            window.dispatchEvent(new Event('imamu_tasks_updated'));
            window.dispatchEvent(new Event('storage'));

            const token = localStorage.getItem('token') || localStorage.getItem('imamu_token') || '';
            if (token) {
              fetch('/api/user-tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ tasks: remaining })
              }).catch(() => {});
            }
          }
        }
      } catch {}

      // 2. Clean from server DB
      const numId = Number(ev.id);
      if (!isNaN(numId) && numId > 0 && !evIdStr.startsWith('task-') && !evIdStr.startsWith('exam-')) {
        const token = localStorage.getItem('token') || localStorage.getItem('imamu_token') || '';
        try {
          await fetch(`/api/user-events/${numId}`, {
            method: 'DELETE',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
        } catch {}
      }

      setSelectedEvent(null);
      mutate();
    } catch {
      setSelectedEvent(null);
    }
  };

  return (
    <div className="flex flex-col md:flex-row flex-1 w-full bg-white dark:bg-zinc-950 items-stretch h-full max-h-[calc(100vh-65px)] min-h-0 overflow-hidden text-right" dir="rtl">
      
      {/* Sidebar: Upcoming Events & Calendar Selector */}
      <div className="w-full md:w-80 md:shrink-0 border-b md:border-b-0 md:border-l border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col self-stretch max-h-[calc(100vh-65px)] min-h-0 overflow-hidden">
        
        {/* Streamlined Calendar Selector */}
        <CalendarSelector
          visibleCalendars={visibleCalendars}
          onToggleCalendar={handleToggleCalendar}
          onShowOnlyCalendar={handleShowOnlyCalendar}
          onOpenAddEvent={() => setIsTaskModalOpen(true)}
          onEventCreated={() => {
            mutate();
            loadTaskEvents();
          }}
        />
        
        <div className="p-3 flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Search Box */}
          <div className="mb-2.5 relative shrink-0">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute right-3 text-slate-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="ابحث في المواعيد والفعاليات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-8 pl-8 py-1.5 bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-[var(--color-imamu-brown)] transition placeholder:text-slate-400 dark:placeholder:text-zinc-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-full cursor-pointer"
                  title="مسح البحث"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2 px-1 shrink-0">
            {searchQuery ? `نتائج البحث (${upcomingEvents.length})` : 'المواعيد القادمة'}
          </h2>
          
          {/* Scrollable Events List */}
          <div className="flex-1 min-h-0 max-h-full overflow-y-auto space-y-2 px-0.5 scrollbar-thin">
            {displayedUpcomingEvents.map((ev, i) => {
              const d = ev.parsedDate || parseDate(ev.date);
              const isValidDate = !!(d && !isNaN(d.getTime()));
              const dayStr = isValidDate ? format(d, 'd') : '-';
              const monthStr = isValidDate ? format(d, 'MMM', { locale: ar }) : '';
              const hasSpecificTime = !!(ev.time || (typeof ev.date === 'string' && (ev.date.includes('T') || ev.date.includes(':'))));
              const timeStr = ev.time 
                ? formatTimeArabic(ev.time) 
                : (isValidDate && (ev.date.includes('T') || ev.date.includes(':')) ? format(d, 'h:mm a', { locale: ar }) : '');
              const meta = getEventCategoryMeta(ev);
              const eventKey = ev.id || `${ev.title}-${ev.date}`;
              const isExpanded = expandedSidebarEventId === eventKey;

              return (
                <div 
                  key={eventKey || i} 
                  onClick={() => {
                    const willExpand = !isExpanded;
                    setExpandedSidebarEventId(willExpand ? eventKey : null);
                    setHighlightedEventId(willExpand ? eventKey : null);
                    if (isValidDate) {
                      setCurrentDate(d);
                    }
                  }}
                  className={`w-full rounded-2xl border transition-all duration-200 cursor-pointer text-right p-3 ${
                    isExpanded
                      ? 'bg-slate-50 dark:bg-zinc-950/90 border-[var(--color-imamu-brown)] dark:border-[var(--color-imamu-accent)]'
                      : 'bg-slate-50/70 dark:bg-zinc-950/50 border-slate-200/90 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex justify-between items-baseline gap-2 mb-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[170px]">
                      {ev.title}
                    </h3>
                    <span className="text-[10px] font-bold text-[var(--color-imamu-brown)] dark:text-[var(--color-imamu-accent)] bg-[var(--color-imamu-brown)]/10 dark:bg-zinc-900 border border-[var(--color-imamu-brown)]/20 dark:border-zinc-800 px-2 py-0.5 rounded-xl shrink-0">
                      {dayStr} {monthStr}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-zinc-400 font-medium shrink-0">
                      {hasSpecificTime && (
                        <>
                          <Clock className="w-3 h-3 opacity-80 shrink-0" />
                          <span className="shrink-0">{timeStr}</span>
                          <span className="opacity-40 shrink-0">•</span>
                        </>
                      )}
                      <span className="shrink-0">{formatHijriMonthDay(ev.date)}</span>
                    </div>
                    {meta ? (
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border shrink-0 truncate max-w-[110px] ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
                    ) : ev.calendarType === 'entity' ? (
                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold border shrink-0 truncate max-w-[110px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                        {ev.entityName || 'فعالية جهة'}
                      </span>
                    ) : ev.calendarType === 'user' ? (
                      <span 
                        className={`px-2 py-0.5 rounded-md text-[9px] font-bold border shrink-0 truncate max-w-[110px] ${
                          ev.isTask && ev.color ? '' : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
                        }`}
                        style={ev.isTask && ev.color ? { backgroundColor: `${ev.color}15`, color: ev.color, borderColor: `${ev.color}40` } : undefined}
                      >
                        {ev.isTask ? (ev.category || 'مهمة دراسية') : 'موعد شخصي'}
                      </span>
                    ) : null}
                  </div>

                  {/* Expandable Details Container */}
                  {isExpanded && (
                    <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-zinc-800 animate-in fade-in duration-150">
                      {ev.description ? (
                        <div className="text-[11px] text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 leading-relaxed mb-2.5 text-right" dir="auto">
                          {ev.description}
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-slate-400 dark:text-zinc-500 block mb-2.5">
                          لا يوجد وصف إضافي متاح.
                        </span>
                      )}

                      {ev.location && (
                        <div className="text-[11px] text-slate-600 dark:text-zinc-400 mb-2 flex items-center gap-1.5 font-medium">
                          <span>📍</span>
                          <span>{ev.location}</span>
                        </div>
                      )}

                      {ev.link && (
                        <div className="text-[11px] text-sky-600 dark:text-sky-400 mb-2.5">
                          <a 
                            href={ev.link.startsWith('http') ? ev.link : `https://${ev.link}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline inline-flex items-center gap-1 font-medium"
                          >
                            <span>🔗</span>
                            <span className="truncate max-w-[200px]">{ev.link}</span>
                          </a>
                        </div>
                      )}

                      <div className="flex gap-2 items-center">
                        <ButtonLink
                          href={getGoogleCalendarUrl(ev)}
                          target="_blank" 
                          rel="noopener noreferrer" 
                          onClick={(e) => e.stopPropagation()}
                          variant="primary"
                          size="xs"
                          className="flex-1 text-[10px]"
                        >
                          <ExternalLink className="w-3 h-3" /> ربط بتقويم Google
                        </ButtonLink>
                        <Button
                          type="button"
                          variant="secondary"
                          size="xs"
                          className="flex-1 text-[10px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadSingleIcs(ev);
                          }}
                        >
                          <Download className="w-3 h-3" /> تحميل ICS
                        </Button>
                        <ReportDropdownMenu
                          targetType="event"
                          targetId={ev.id}
                          targetTitle={ev.title}
                          buttonClassName="p-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-200 dark:bg-zinc-800 text-slate-400 hover:text-white transition cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Show More Button (Instant, No fake spinner) */}
            {hasMoreUpcomingEvents && (
              <div className="pt-1 pb-1 text-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount(prev => Math.min(prev + 10, upcomingEvents.length))}
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold transition-colors bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  عرض المزيد ({upcomingEvents.length - visibleCount})
                </button>
              </div>
            )}

            {upcomingEvents.length === 0 && (
              <div className="text-xs text-slate-400 dark:text-zinc-500 text-center py-6 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-zinc-950/40">
                لا توجد مواعيد قادمة مطابقة.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Calendar Section */}
      <div className="flex-1 flex flex-col self-stretch max-h-[calc(100vh-65px)] max-w-full min-h-0 overflow-hidden bg-white dark:bg-zinc-950">
        
        {/* Calendar Navigation Header & Filter Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-serif font-extrabold text-slate-900 dark:text-white shrink-0">
              {viewState === 'month' 
                ? format(currentDate, 'MMMM yyyy', { locale: ar }) 
                : `${format(weekStart, 'd MMMM', { locale: ar })} - ${format(weekEnd, 'd MMMM yyyy', { locale: ar })}`}
            </h2>
            
            <div className="flex items-center bg-slate-100 dark:bg-zinc-950 rounded-2xl p-1 border border-slate-200 dark:border-zinc-800 shrink-0" dir="ltr">
              <button 
                type="button"
                onClick={nextPeriod}
                className="p-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                title="الشهر القادم"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={goToday}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                  isTodayDate 
                    ? 'text-[var(--color-imamu-accent)] bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-2xs' 
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
                }`}
              >
                اليوم
              </button>
              <button 
                type="button"
                onClick={prevPeriod}
                className="p-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                title="الشهر السابق"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* New Task Button */}
            <Button
              onClick={() => setIsTaskModalOpen(true)}
              variant="secondary"
              size="sm"
              className="shrink-0"
              leftIcon={<Plus className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />}
              title="إضافة مهمة جديدة"
            >
              مهمة جديدة
            </Button>

            {/* View Switcher: شهر | أسبوع */}
            <div className="flex bg-slate-100 dark:bg-zinc-950 p-1 rounded-2xl border border-slate-200 dark:border-zinc-800 shrink-0">
              <button 
                type="button"
                onClick={() => setViewState('month')}
                className={`px-3 py-1 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewState === 'month' 
                    ? 'bg-white dark:bg-zinc-800 text-[var(--color-imamu-accent)] shadow-2xs border border-slate-200 dark:border-zinc-700' 
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> شهر
              </button>
              <button 
                type="button"
                onClick={() => setViewState('week')}
                className={`px-3 py-1 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewState === 'week' 
                    ? 'bg-white dark:bg-zinc-800 text-[var(--color-imamu-accent)] shadow-2xs border border-slate-200 dark:border-zinc-700' 
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" /> أسبوع
              </button>
            </div>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/90 shrink-0">
          {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day, i) => (
            <div key={day} className="py-2 text-center">
              <span className={`text-xs font-bold ${i === 5 || i === 6 ? 'text-[var(--color-imamu-accent)]' : 'text-slate-700 dark:text-zinc-300'}`}>
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar Grid Cells */}
        <div 
          className={`flex-1 grid grid-cols-7 bg-white dark:bg-zinc-950 h-full min-h-0 overflow-hidden ${
            viewState === 'month' ? '' : 'auto-rows-[minmax(280px,1fr)] overflow-y-auto'
          }`}
          style={viewState === 'month' ? { height: '100%', gridTemplateRows: `repeat(${Math.ceil(daysToShow.length / 7)}, minmax(0, 1fr))` } : undefined}
        >
          {daysToShow.map((day) => {
            const isCurrMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);
            const dayKey = format(day, 'yyyy-MM-dd');
            const dayEvents = eventsByDayKey.get(dayKey) || [];

            return (
              <div 
                key={dayKey} 
                className={`border-l border-b border-slate-200 dark:border-zinc-800/80 p-1.5 sm:p-2 flex flex-col transition-colors duration-150 ${
                  !isCurrMonth && viewState === 'month' 
                    ? 'bg-slate-50/70 dark:bg-zinc-950/90 opacity-70' 
                    : 'bg-white dark:bg-zinc-900/40 hover:bg-stone-50/40 dark:hover:bg-zinc-900/80'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span 
                    className={`inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-xl text-xs font-bold ${
                      isDayToday 
                        ? 'bg-[var(--color-imamu-brown)] text-white shadow-xs font-black' 
                        : !isCurrMonth && viewState === 'month'
                        ? 'text-slate-400 dark:text-zinc-500 font-semibold' 
                        : 'text-slate-800 dark:text-zinc-200 font-bold'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                
                {/* Events in cell */}
                <div className="flex-1 overflow-x-hidden overflow-y-auto space-y-1 pr-0.5 min-h-0 scrollbar-none">
                  {dayEvents.map((ev, i) => {
                    const eventKey = ev.id || `${ev.title}-${ev.date}`;
                    const isModalSelected = selectedEvent && selectedEvent.title === ev.title && selectedEvent.date === ev.date;
                    const isSidebarHighlighted = highlightedEventId === eventKey;
                    const isHighlighted = isModalSelected || isSidebarHighlighted;
                    const meta = getEventCategoryMeta(ev);
                    const { lineAccent: lineAccentClass, badgeColor, activeHighlight: activeHighlightClass } = getEventVisualClasses(ev);

                    return (
                      <div 
                        key={ev.id ? `${ev.id}-${ev.isDeadline ? 'dl' : 'st'}` : i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                        }}
                        style={
                          ev.isTask && ev.color
                            ? isHighlighted
                              ? { backgroundColor: ev.color, borderRightColor: ev.color }
                              : { borderRightColor: ev.color }
                            : undefined
                        }
                        className={`w-full py-1 px-2 rounded-l-lg border-r-3 transition-all duration-150 cursor-pointer text-right overflow-hidden ${
                          isHighlighted
                            ? activeHighlightClass
                            : `${lineAccentClass} bg-slate-100/70 dark:bg-zinc-900/60 hover:bg-slate-200/80 dark:hover:bg-zinc-800/80 text-slate-800 dark:text-zinc-200`
                        }`}
                      >
                        <div className="font-bold truncate text-[11px] leading-snug">
                          {ev.isDeadline ? `⚠️ آخر موعد: ${ev.title}` : ev.title}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[9.5px] truncate opacity-90">
                          {(() => {
                            let displayTime = '';
                            if (ev.time) {
                              displayTime = formatTimeArabic(ev.time);
                            } else if (typeof ev.date === 'string' && (ev.date.includes('T') || ev.date.includes(':'))) {
                              const evD = parseDate(ev.date);
                              if (evD && !isNaN(evD.getTime())) {
                                displayTime = format(evD, 'h:mm a', { locale: ar });
                              }
                            }
                            if (!displayTime) return null;
                            return (
                              <span className="inline-flex items-center gap-0.5 shrink-0 font-medium">
                                <Clock className="w-2.5 h-2.5 inline" />
                                {displayTime}
                              </span>
                            );
                          })()}
                          {meta ? (
                            <>
                              <span className="opacity-40">•</span>
                              <span className={`font-semibold truncate ${isHighlighted ? 'text-white dark:text-zinc-950 font-bold' : badgeColor}`}>
                                {meta.label}
                              </span>
                            </>
                          ) : ev.calendarType === 'entity' ? (
                            <>
                              <span className="opacity-40">•</span>
                              <span className={`font-semibold truncate ${isHighlighted ? 'text-white dark:text-zinc-950 font-bold' : badgeColor}`}>
                                {ev.entityName || 'جهة'}
                              </span>
                            </>
                          ) : ev.calendarType === 'user' ? (
                            <>
                              <span className="opacity-40">•</span>
                              <span 
                                className={`font-semibold truncate ${isHighlighted ? 'text-white dark:text-zinc-950 font-bold' : badgeColor}`}
                                style={!isHighlighted && ev.isTask && ev.color ? { color: ev.color } : undefined}
                              >
                                {ev.isTask ? (ev.category || 'مهمة') : 'شخصي'}
                              </span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details Popup Modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-right animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <button 
              type="button"
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 left-4 p-1.5 text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer z-10"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between gap-2 mb-3 pl-10">
              <div className="text-xs font-bold text-[var(--color-imamu-accent)] uppercase tracking-wider flex items-center gap-1.5">
                <Info className="w-4 h-4" /> تفاصيل الموعد
              </div>
              {(() => {
                const meta = getEventCategoryMeta(selectedEvent);
                if (meta) {
                  return (
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                  );
                }
                if (selectedEvent.calendarType === 'entity') {
                  return (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold border bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                      🏛️ {selectedEvent.entityName || 'فعالية جهة'}
                    </span>
                  );
                }
                if (selectedEvent.calendarType === 'user') {
                  return (
                    <span 
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        selectedEvent.isTask && selectedEvent.color ? '' : 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30'
                      }`}
                      style={
                        selectedEvent.isTask && selectedEvent.color
                          ? { backgroundColor: `${selectedEvent.color}15`, color: selectedEvent.color, borderColor: `${selectedEvent.color}40` }
                          : undefined
                      }
                    >
                      {selectedEvent.isTask ? `📋 ${selectedEvent.category || 'مهمة دراسية'}` : '👤 موعد شخصي'}
                    </span>
                  );
                }
                return null;
              })()}
            </div>

            <h3 className="font-serif font-extrabold text-slate-900 dark:text-white text-lg mb-3 leading-snug" dir="auto">
              {selectedEvent.title}
            </h3>

            <div className="text-xs text-slate-600 dark:text-zinc-300 mb-4 bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 font-medium flex-wrap">
                <Clock className="w-4 h-4 text-[var(--color-imamu-accent)] shrink-0" />
                <span>{formatDate(selectedEvent.date, 'ar-full')}</span>
                {selectedEvent.endDate && selectedEvent.endDate !== selectedEvent.date && (
                  <span> إلى {formatDate(selectedEvent.endDate, 'ar-full')}</span>
                )}
                {selectedEvent.time && (
                  <span className="text-[var(--color-imamu-accent)] font-semibold">
                    • {formatTimeArabic(selectedEvent.time)}{selectedEvent.endTime && selectedEvent.endTime !== selectedEvent.time ? ` - ${formatTimeArabic(selectedEvent.endTime)}` : ''}
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-400 dark:text-zinc-500 mr-6">
                {formatHijriDate(selectedEvent.date)}
              </div>
              {selectedEvent.location && (
                <div className="text-xs text-slate-500 dark:text-zinc-400 mr-6 pt-1">
                  📍 {selectedEvent.location}
                </div>
              )}
              {selectedEvent.link && (
                <div className="text-xs text-sky-600 dark:text-sky-400 mr-6 pt-1">
                  <a
                    href={selectedEvent.link.startsWith('http') ? selectedEvent.link : `https://${selectedEvent.link}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 hover:underline font-medium"
                  >
                    <span>🔗</span>
                    <span className="truncate max-w-[200px]">{selectedEvent.link}</span>
                  </a>
                </div>
              )}
            </div>

            {selectedEvent.description ? (
              <div className="text-xs text-slate-700 dark:text-zinc-300 bg-slate-50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800 rounded-2xl p-3.5 leading-relaxed max-h-44 overflow-y-auto mb-5 text-right" dir="auto">
                {selectedEvent.description}
              </div>
            ) : (
              <div className="text-xs italic text-slate-400 dark:text-zinc-500 block mb-5">
                لا يوجد وصف متاح لهذا الموعد.
              </div>
            )}

            <div className="flex gap-2.5 border-t border-slate-200 dark:border-zinc-800 pt-4 mt-2 items-center">
              <ButtonLink
                href={getGoogleCalendarUrl(selectedEvent)}
                target="_blank" 
                rel="noopener noreferrer" 
                variant="primary"
                size="sm"
                className="flex-1 text-xs"
              >
                <ExternalLink className="w-4 h-4" /> ربط بتقويم Google
              </ButtonLink>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => downloadSingleIcs(selectedEvent)}
              >
                <Download className="w-4 h-4 text-slate-400 dark:text-zinc-400" /> تحميل ICS
              </Button>
              {selectedEvent.calendarType === 'user' && (
                <button
                  type="button"
                  onClick={() => handleDeletePersonalEvent(selectedEvent)}
                  className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition cursor-pointer"
                  title="حذف هذا الموعد الشخصي"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <ReportDropdownMenu
                targetType="event"
                targetId={selectedEvent.id}
                targetTitle={selectedEvent.title}
                buttonClassName="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-800 text-slate-400 hover:text-white transition cursor-pointer"
              />
            </div>

          </div>
        </div>
      )}

      {/* New Task Modal (Task Maker) */}
      <AnimatePresence>
        {isTaskModalOpen && (
          <NewTaskModal
            isOpen={isTaskModalOpen}
            onClose={() => setIsTaskModalOpen(false)}
            onSaveTask={handleSaveNewTask}
            courses={registeredCourses}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
