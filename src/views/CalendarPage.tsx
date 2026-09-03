'use client';

import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, LayoutGrid, List, X, Info, ExternalLink, Download, CalendarPlus, Search, Loader2 } from 'lucide-react';
import { 
  format, parseISO, addMonths, subMonths, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday, addWeeks, subWeeks, isAfter, startOfDay
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { parseDate, formatDate, formatHijriDate, formatHijriMonthDay, getCountdown, getEventCategoryMeta } from '../lib/date-utils';

export function CalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewState, setViewState] = useState<'month' | 'week'>('month');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [expandedSidebarEventId, setExpandedSidebarEventId] = useState<string | null>(null);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    fetch('/api/events')
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP error! status: ${r.status}`);
        }
        const contentType = r.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new TypeError("Received non-JSON response from server");
        }
        return r.json();
      })
      .then(data => {
        if(Array.isArray(data)) {
          data.sort((a, b) => (parseDate(a.date)?.getTime() || 0) - (parseDate(b.date)?.getTime() || 0));
          setEvents(data);
        }
      }).catch(err => {
        console.error("Error fetching events:", err);
      });
  }, []);

  const nextPeriod = () => {
    setCurrentDate(viewState === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1));
  };
  const prevPeriod = () => {
    setCurrentDate(viewState === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1));
  };
  const goToday = () => setCurrentDate(new Date());

  const formatGoogleCalendarDate = (dateString: string) => {
    const d = parseISO(dateString);
    const formatDatePart = (dateObj: Date) => {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      const seconds = String(dateObj.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };
    
    const startStr = formatDatePart(d);
    const endD = new Date(d.getTime() + 60 * 60 * 1000);
    const endStr = formatDatePart(endD);
    return `${startStr}/${endStr}`;
  };

  const getGoogleCalendarUrl = (ev: any) => {
    const datesStr = formatGoogleCalendarDate(ev.date);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(ev.title)}&dates=${datesStr}&details=${encodeURIComponent(ev.description || '')}&sf=true&output=xml`;
  };

  const downloadSingleIcs = (ev: any) => {
    const d = parseISO(ev.date);
    const formatDatePart = (dateObj: Date) => {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      const hours = String(dateObj.getHours()).padStart(2, '0');
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      const seconds = String(dateObj.getSeconds()).padStart(2, '0');
      return `${year}${month}${day}T${hours}${minutes}${seconds}`;
    };
    
    const startStr = formatDatePart(d);
    const endD = new Date(d.getTime() + 60 * 60 * 1000);
    const endStr = formatDatePart(endD);
    const stampStr = formatDatePart(new Date()) + 'Z';

    const cleanTitle = ev.title.replace(/[\\,;]/g, '\\$&');
    const cleanDesc = (ev.description || '').replace(/\n/g, '\\n').replace(/[\\,;]/g, '\\$&');

    const icsText = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Imam University Student Hub//EN',
      'BEGIN:VEVENT',
      `UID:${ev.id || Math.random().toString(36).substring(2)}@imam-hub`,
      `DTSTAMP:${stampStr}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${cleanTitle}`,
      `DESCRIPTION:${cleanDesc}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsText], { type: 'text/calendar;charset=utf-8' });
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

  const daysToShow = viewState === 'month' 
    ? eachDayOfInterval({ start: startDateMonth, end: endDateMonth })
    : eachDayOfInterval({ start: weekStart, end: weekEnd });

  const isTodayDate = isToday(currentDate);

  const getEventsForDay = (day: Date) => {
    return events.filter(e => {
      const d = parseDate(e.date);
      return d ? isSameDay(d, day) : false;
    });
  };

  const [searchQuery, setSearchQuery] = useState('');

  const upcomingEvents = events
    .map(e => ({ ...e, parsedDate: parseDate(e.date) }))
    .filter(e => {
      if (!e.parsedDate) return false;
      const matchesSearch = !searchQuery.trim() || 
        e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (e.description && e.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (searchQuery.trim()) return matchesSearch;
      return isAfter(e.parsedDate, startOfDay(new Date())) || isSameDay(e.parsedDate, new Date());
    })
    .sort((a, b) => (a.parsedDate?.getTime() || 0) - (b.parsedDate?.getTime() || 0));

  const displayedUpcomingEvents = upcomingEvents;
  const hasMoreUpcomingEvents = false;

  useEffect(() => {
    setVisibleCount(8);
  }, [searchQuery]);

  const handleUpcomingScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 25 && hasMoreUpcomingEvents && !isLoadingMore) {
      setIsLoadingMore(true);
      setTimeout(() => {
        setVisibleCount(prev => Math.min(prev + 5, upcomingEvents.length));
        setIsLoadingMore(false);
      }, 500);
    }
  };

  const webcalUrl = typeof window !== 'undefined' 
    ? `webcal://${window.location.host}/api/calendar.ics` 
    : '';

  const googleCalendarUrl = typeof window !== 'undefined'
    ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(window.location.origin + '/api/calendar.ics')}`
    : '#';

  return (
    <div className="flex flex-col md:flex-row flex-1 w-full bg-white dark:bg-zinc-950 items-stretch h-full max-h-[calc(100vh-65px)] min-h-0 overflow-hidden text-right" dir="rtl">
      
      {/* Sidebar: Upcoming Events & Sync Options */}
      <div className="w-full md:w-80 md:shrink-0 border-b md:border-b-0 md:border-l border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col self-stretch max-h-[calc(100vh-65px)] min-h-0 overflow-hidden">
        <div className="p-4 pb-3 border-b border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur z-10 text-right shrink-0">
          <span className="text-xs font-semibold tracking-widest text-[var(--color-imamu-accent)] uppercase mb-1 block">
            المواعيد الرسمية
          </span>
          <h1 className="text-xl font-serif font-bold text-slate-900 dark:text-white inline-flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-[var(--color-imamu-accent)]" />
            التقويم الأكاديمي
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 mb-3 leading-relaxed">
            تابع المواعيد الأكاديمية والجدول التقويمي لجامعة الإمام.
          </p>
          
          <div className="flex flex-col gap-1.5">
            <a 
              href={googleCalendarUrl}
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-rise text-xs bg-[var(--color-imamu-accent)] text-white dark:text-zinc-950 hover:opacity-95 px-3 py-2 rounded-xl font-bold inline-flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm cursor-pointer border border-amber-500/30"
              title="مزامنة التقويم بالكامل مع تقويم Google"
            >
              <CalendarPlus className="w-3.5 h-3.5" /> ربط بتقويم قوقل
            </a>
            <a 
              href={webcalUrl}
              className="btn-rise text-xs bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 text-slate-800 dark:text-zinc-200 px-3 py-2 rounded-xl font-bold inline-flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all duration-200 shadow-2xs cursor-pointer"
              title="الاشتراك التلقائي في التقويم على جميع الهواتف والأجهزة"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> ربط بتقويم الجوال
            </a>
          </div>
        </div>
        
        <div className="p-3 flex-1 flex flex-col min-h-0 overflow-hidden">

          <div className="mb-2.5 relative shrink-0">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute right-3 text-slate-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="ابحث في المواعيد أو الانتقال..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-[var(--color-imamu-brown)] transition placeholder:text-slate-400 dark:placeholder:text-zinc-600"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-2 px-1 shrink-0">
            {searchQuery ? `نتائج البحث (${upcomingEvents.length})` : 'المواعيد القادمة'}
          </h2>
          
          {/* Scrollable Invisible Box Container to Sidebar Edges */}
          <div 
            onScroll={handleUpcomingScroll}
            onWheel={(e) => {
              e.stopPropagation();
              e.currentTarget.scrollTop += e.deltaY;
            }}
            className="flex-1 min-h-0 max-h-full overflow-y-auto overscroll-contain space-y-2.5 px-0.5 scrollbar-none"
          >
            {displayedUpcomingEvents.map((ev, i) => {
              const d = parseISO(ev.date);
              const dayStr = format(d, 'd');
              const monthStr = format(d, 'MMM', { locale: ar });
              const timeStr = format(d, 'h:mm a', { locale: ar });
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
                    setCurrentDate(d);
                  }}
                  className={`w-full rounded-2xl border transition-all duration-300 ease-out cursor-pointer text-right p-3.5 shadow-none animate-in fade-in slide-in-from-bottom-2 ${
                    isExpanded
                      ? 'bg-slate-50 dark:bg-zinc-950/90 border-[var(--color-imamu-brown)] dark:border-[var(--color-imamu-accent)]'
                      : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800/80 hover:border-slate-300 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="flex justify-between items-baseline gap-2 mb-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[170px]">
                      {ev.title}
                    </h3>
                    <span className="text-[10px] font-bold text-[var(--color-imamu-brown)] dark:text-[var(--color-imamu-accent)] bg-[var(--color-imamu-brown)]/10 dark:bg-zinc-900 border border-[var(--color-imamu-brown)]/20 dark:border-zinc-800 px-2 py-0.5 rounded-lg shrink-0">
                      {dayStr} {monthStr}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 overflow-hidden">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-zinc-400 font-medium shrink-0">
                      <Clock className="w-3 h-3 opacity-80 shrink-0" />
                      <span className="shrink-0">{timeStr}</span>
                      <span className="opacity-40 shrink-0">•</span>
                      <span className="shrink-0">{formatHijriMonthDay(ev.date)}</span>
                    </div>
                    {meta && (
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border shrink-0 truncate max-w-[110px] ${meta.badgeClass}`}>
                        {meta.label}
                      </span>
                    )}
                  </div>

                  {/* Smooth Expandable Content Container */}
                  <div 
                    className={`grid transition-all duration-300 ease-in-out ${
                      isExpanded ? 'grid-rows-[1fr] opacity-100 mt-3 pt-3 border-t border-[var(--color-imamu-brown)]/20 dark:border-zinc-800' : 'grid-rows-[0fr] opacity-0 mt-0 pt-0 border-t-0'
                    }`}
                  >
                    <div className="overflow-hidden p-0.5">
                      {ev.description ? (
                        <div className="text-[11px] text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-2.5 leading-relaxed mb-3 text-right" dir="auto">
                          {ev.description}
                        </div>
                      ) : (
                        <span className="text-[11px] italic text-slate-400 dark:text-zinc-500 block mb-3">لا يوجد وصف متاح لهذا الموعد.</span>
                      )}

                      <div className="flex gap-2 px-0.5 pt-0.5 pb-0.5">
                        <a 
                          href={getGoogleCalendarUrl(ev)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="btn-rise flex-1 text-[10px] bg-[var(--color-imamu-accent)] text-white dark:text-zinc-950 hover:opacity-95 py-1.5 px-2 rounded-xl font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
                        >
                          <ExternalLink className="w-3 h-3 text-white dark:text-zinc-950" /> ربط بتقويم قوقل
                        </a>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadSingleIcs(ev);
                          }}
                          className="btn-rise flex-1 text-[10px] bg-slate-200 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 py-1.5 px-2 rounded-xl font-bold inline-flex items-center justify-center gap-1 hover:bg-slate-300 dark:hover:bg-zinc-700 transition cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> ICS
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Load More Button */}
            {hasMoreUpcomingEvents && (
              <div className="pt-2 pb-1 text-center">
                <button
                  onClick={() => {
                    if (isLoadingMore) return;
                    setIsLoadingMore(true);
                    setTimeout(() => {
                      setVisibleCount(prev => Math.min(prev + 10, upcomingEvents.length));
                      setIsLoadingMore(false);
                    }, 500);
                  }}
                  disabled={isLoadingMore}
                  className="btn-rise w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-300 bg-slate-100 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-[var(--color-imamu-brown)] hover:text-white dark:hover:bg-[var(--color-imamu-accent)] dark:hover:text-zinc-950 flex items-center justify-center gap-2 cursor-pointer shadow-2xs disabled:opacity-70"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[var(--color-imamu-brown)] dark:text-[var(--color-imamu-accent)]" />
                      <span>جاري تحميل المواعيد...</span>
                    </>
                  ) : (
                    <>
                      <span>عرض المزيد من المواعيد ({upcomingEvents.length - visibleCount})</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {upcomingEvents.length === 0 && (
              <div className="text-xs text-slate-400 dark:text-zinc-500 text-center py-6 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl bg-slate-50 dark:bg-zinc-950/40">
                لا توجد مواعيد قادمة حالياً.
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
                onClick={nextPeriod}
                className="btn-rise p-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                title="الفترة القادمة"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button 
                onClick={goToday}
                className={`btn-rise px-3 py-1 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                  isTodayDate 
                    ? 'text-[var(--color-imamu-accent)] bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-2xs' 
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
                }`}
              >
                اليوم
              </button>
              <button 
                onClick={prevPeriod}
                className="btn-rise p-1.5 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
                title="الفترة السابقة"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex bg-slate-100 dark:bg-zinc-950 p-1 rounded-2xl border border-slate-200 dark:border-zinc-800 shrink-0">
            <button 
              onClick={() => setViewState('month')}
              className={`btn-rise px-3 py-1 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewState === 'month' 
                  ? 'bg-white dark:bg-zinc-800 text-[var(--color-imamu-accent)] shadow-2xs border border-slate-200 dark:border-zinc-700' 
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> شهر
            </button>
            <button 
              onClick={() => setViewState('week')}
              className={`btn-rise px-3 py-1 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer ${
                viewState === 'week' 
                  ? 'bg-white dark:bg-zinc-800 text-[var(--color-imamu-accent)] shadow-2xs border border-slate-200 dark:border-zinc-700' 
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-3.5 h-3.5" /> أسبوع
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/90 shrink-0">
          {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day, i) => (
            <div key={day} className="py-2 text-center">
              <span className={`text-xs font-bold ${i === 5 || i === 6 ? 'text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)]' : 'text-slate-700 dark:text-zinc-300'}`}>
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar Grid Cells - Stretched 5 Rows to 100% Height */}
        <div 
          className={`flex-1 grid grid-cols-7 bg-white dark:bg-zinc-950 h-full min-h-0 overflow-hidden ${
            viewState === 'month' ? '' : 'auto-rows-[minmax(280px,1fr)] overflow-y-auto'
          }`}
          style={viewState === 'month' ? { height: '100%', gridTemplateRows: `repeat(${Math.ceil(daysToShow.length / 7)}, minmax(0, 1fr))` } : undefined}
        >
          {daysToShow.map((day) => {
            const isCurrMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);
            const dayEvents = getEventsForDay(day);

            return (
              <div 
                key={day.toString()} 
                className={`border-l border-b border-slate-200 dark:border-zinc-800/80 p-2 flex flex-col transition-colors duration-200 ${
                  !isCurrMonth && viewState === 'month' 
                    ? 'bg-slate-50/70 dark:bg-zinc-950/90 opacity-75' 
                    : 'bg-white dark:bg-zinc-900/40 hover:bg-stone-50/40 dark:hover:bg-zinc-900/80'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span 
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-bold ${
                      isDayToday 
                        ? 'bg-[var(--color-imamu-brown)] text-white shadow-md shadow-[var(--color-imamu-brown)/20] font-black' 
                        : !isCurrMonth && viewState === 'month'
                        ? 'text-slate-400 dark:text-zinc-500 font-semibold' 
                        : 'text-slate-800 dark:text-zinc-200 font-bold'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                
                <div className="flex-1 overflow-x-hidden overflow-y-auto space-y-1.5 pr-0.5 min-h-0 scrollbar-none">
                  {dayEvents.map((ev, i) => {
                    const eventKey = ev.id || `${ev.title}-${ev.date}`;
                    const isModalSelected = selectedEvent && selectedEvent.title === ev.title && selectedEvent.date === ev.date;
                    const isSidebarHighlighted = highlightedEventId === eventKey;
                    const isHighlighted = isModalSelected || isSidebarHighlighted;
                    const meta = getEventCategoryMeta(ev);
                    
                    let lineAccentClass = 'border-r-amber-600/70 dark:border-amber-500/60';
                    let badgeColor = 'text-amber-700 dark:text-amber-400';
                    let activeHighlightClass = 'bg-[var(--color-imamu-accent)] text-white dark:text-zinc-950 border-r-[var(--color-imamu-brown-dark)] dark:border-r-[var(--color-imamu-accent)] font-bold shadow-sm';

                    if (ev.isHoliday || ev.isHolidayEnd || ev.isNationalDay) {
                      lineAccentClass = 'border-r-emerald-600/70 dark:border-emerald-500/60';
                      badgeColor = 'text-emerald-700 dark:text-emerald-400';
                      activeHighlightClass = 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 border-r-emerald-700 dark:border-r-emerald-400 font-bold shadow-sm';
                    } else if (ev.isSemesterStart || ev.isSemesterEnd) {
                      lineAccentClass = 'border-r-indigo-600/70 dark:border-indigo-500/60';
                      badgeColor = 'text-indigo-700 dark:text-indigo-400';
                      activeHighlightClass = 'bg-indigo-600 dark:bg-indigo-500 text-white dark:text-zinc-950 border-r-indigo-700 dark:border-r-indigo-400 font-bold shadow-sm';
                    } else if (ev.title?.includes('مكافأة') || ev.title?.includes('المكافأة') || ev.title?.includes('إيداع')) {
                      lineAccentClass = 'border-r-blue-600/70 dark:border-blue-500/60';
                      badgeColor = 'text-blue-700 dark:text-blue-400';
                      activeHighlightClass = 'bg-blue-600 dark:bg-blue-500 text-white dark:text-zinc-950 border-r-blue-700 dark:border-r-blue-400 font-bold shadow-sm';
                    }

                    return (
                      <div 
                        key={ev.id || i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                        }}
                        className={`w-full py-1 px-2 pr-2.5 rounded-r-none rounded-l-lg border-r-3 transition-all duration-200 cursor-pointer text-right overflow-hidden ${
                          isHighlighted
                            ? activeHighlightClass
                            : `${lineAccentClass} bg-slate-100/70 dark:bg-zinc-900/60 hover:bg-slate-200/80 dark:hover:bg-zinc-800/80 text-slate-800 dark:text-zinc-200`
                        }`}
                        title="انقر لعرض تفاصيل الفعالية"
                      >
                        <div className="font-bold truncate text-[11px] leading-snug">{ev.title}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[9.5px] truncate opacity-90">
                          <span className="inline-flex items-center gap-0.5 shrink-0">
                            <Clock className="w-2.5 h-2.5 inline" />
                            {format(parseISO(ev.date), 'h:mm a', { locale: ar })}
                          </span>
                          {meta && (
                            <>
                              <span className="opacity-40">•</span>
                              <span className={`font-semibold truncate ${isHighlighted ? 'text-white dark:text-zinc-950 font-bold' : badgeColor}`}>
                                {meta.label}
                              </span>
                            </>
                          )}
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setSelectedEvent(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative text-right animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
            dir="rtl"
          >
            <button 
              onClick={() => setSelectedEvent(null)}
              className="btn-rise absolute top-4 left-4 p-1.5 text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer z-10"
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
                return meta ? (
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${meta.badgeClass}`}>
                    {meta.label}
                  </span>
                ) : null;
              })()}
            </div>

            <h3 className="font-serif font-extrabold text-slate-900 dark:text-white text-lg mb-3 leading-snug" dir="auto">
              {selectedEvent.title}
            </h3>

            <div className="text-xs text-slate-600 dark:text-zinc-300 mb-4 bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 font-medium">
                <Clock className="w-4 h-4 text-[var(--color-imamu-accent)] shrink-0" />
                <span>{formatDate(selectedEvent.date, 'ar-full')}</span>
              </div>
              <div className="text-xs text-slate-400 dark:text-zinc-500 mr-6">
                {formatHijriDate(selectedEvent.date)}
              </div>
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

            <div className="flex gap-2.5 border-t border-slate-200 dark:border-zinc-800 pt-4 mt-2">
              <a 
                href={getGoogleCalendarUrl(selectedEvent)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-rise flex-1 text-xs bg-[var(--color-imamu-accent)] text-white dark:text-zinc-950 hover:opacity-95 py-2.5 px-3 rounded-xl font-bold inline-flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-white dark:text-zinc-950" /> ربط بتقويم قوقل
              </a>
              <button 
                onClick={() => downloadSingleIcs(selectedEvent)}
                className="btn-rise flex-1 text-xs bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 py-2.5 px-3 rounded-xl font-bold inline-flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-400 dark:text-zinc-400" /> ICS
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
