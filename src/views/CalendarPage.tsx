'use client';

import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, LayoutGrid, List, X, Info, ExternalLink, Download, CalendarPlus, Search } from 'lucide-react';
import { 
  format, parseISO, addMonths, subMonths, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday, addWeeks, subWeeks, isAfter, startOfDay
} from 'date-fns';
import { ar } from 'date-fns/locale';
import { parseDate, formatDate, formatHijriDate, getCountdown, getEventCategoryMeta } from '../lib/date-utils';

export function CalendarPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewState, setViewState] = useState<'month' | 'week'>('month');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

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

  const webcalUrl = typeof window !== 'undefined' 
    ? `webcal://${window.location.host}/api/calendar.ics` 
    : '';

  const googleCalendarUrl = typeof window !== 'undefined'
    ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(window.location.origin + '/api/calendar.ics')}`
    : '#';

  return (
    <div className="flex flex-col lg:flex-row flex-1 w-full bg-transparent min-h-screen text-right" dir="rtl">
      
      {/* Sidebar: Upcoming Events & Sync Options */}
      <div className="w-full lg:w-80 lg:shrink-0 border-b lg:border-b-0 lg:border-l border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-y-auto">
        <div className="p-6 pb-5 border-b border-slate-200 dark:border-zinc-800 sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur z-10 text-right">
          <span className="text-xs sm:text-sm font-semibold tracking-widest text-[var(--color-imamu-accent)] uppercase mb-2 block">
            المواعيد الرسمية
          </span>
          <h1 className="text-2xl font-serif font-bold text-slate-900 dark:text-white inline-flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-[var(--color-imamu-accent)]" />
            التقويم الأكاديمي
          </h1>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 mb-4 leading-relaxed">
            تابع المواعيد الأكاديمية والجدول التقويمي لجامعة الإمام.
          </p>
          
          <div className="flex flex-col gap-2">
            <a 
              href={googleCalendarUrl}
              target="_blank" 
              rel="noopener noreferrer" 
              className="btn-rise text-xs bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white px-3.5 py-2.5 rounded-xl font-bold inline-flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm cursor-pointer border border-amber-700/30"
              title="مزامنة التقويم بالكامل مع تقويم Google"
            >
              <CalendarPlus className="w-4 h-4" /> ربط بـ تقويم Google
            </a>
            <a 
              href={webcalUrl}
              className="btn-rise text-xs bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 text-slate-800 dark:text-zinc-200 px-3.5 py-2.5 rounded-xl font-bold inline-flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-all duration-200 shadow-2xs cursor-pointer"
              title="الاشتراك التلقائي في التقويم على أجهزة Apple"
            >
              <CalendarIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> الاشتراك في تقويم Apple
            </a>
          </div>
        </div>
        
        <div className="p-6 flex-1">
          {selectedEvent && (
            <div className="mb-6 bg-stone-50 dark:bg-stone-950/30 border border-amber-200 dark:border-stone-900/50 rounded-2xl p-4.5 relative shadow-sm">
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-3.5 left-3.5 p-1 text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800 transition"
                title="إلغاء التحديد"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="text-[10px] font-bold text-[var(--color-imamu-accent)] uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> تفاصيل الموعد
                </div>
                {(() => {
                  const meta = getEventCategoryMeta(selectedEvent);
                  return meta ? (
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${meta.badgeClass}`}>
                      {meta.label}
                    </span>
                  ) : null;
                })()}
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1.5 leading-snug" dir="auto">{selectedEvent.title}</h3>
              <div className="text-[11px] text-slate-500 dark:text-zinc-400 mb-3 flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 inline text-[var(--color-imamu-accent)]" />
                  <span>{formatDate(selectedEvent.date, 'ar-full')}</span>
                </div>
                <div className="text-[10px] text-slate-400 dark:text-zinc-500 mr-5">
                  {formatHijriDate(selectedEvent.date)}
                </div>
              </div>
              {selectedEvent.description ? (
                <div className="text-xs text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl p-3 leading-relaxed max-h-40 overflow-y-auto mb-3 text-right" dir="auto">
                  {selectedEvent.description}
                </div>
              ) : (
                <span className="text-xs italic text-slate-400 dark:text-zinc-500 block pt-1 mb-3">لا يوجد وصف متاح لهذا الموعد.</span>
              )}
              
              <div className="flex gap-2 border-t border-slate-200 dark:border-zinc-800 pt-3 mt-3">
                <a 
                  href={getGoogleCalendarUrl(selectedEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-[11px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 py-2 px-2.5 rounded-xl font-bold inline-flex items-center justify-center gap-1 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" /> Google
                </a>
                <button 
                  onClick={() => downloadSingleIcs(selectedEvent)}
                  className="flex-1 text-[11px] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 py-2 px-2.5 rounded-xl font-bold inline-flex items-center justify-center gap-1 hover:bg-slate-50 dark:hover:bg-zinc-800 transition"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" /> ICS
                </button>
              </div>
            </div>
          )}

          <div className="mb-4 relative">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute right-3 text-slate-400 dark:text-zinc-500 pointer-events-none" />
              <input
                type="text"
                placeholder="ابحث في المواعيد أو الانتقال..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pr-8 pl-3 py-2 bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:border-[var(--color-imamu-brown)] transition placeholder:text-slate-400 dark:placeholder:text-zinc-600"
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

          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-4 pr-1">
            {searchQuery ? `نتائج البحث (${upcomingEvents.length})` : 'المواعيد القادمة'}
          </h2>
          
          <div className="relative border-r border-slate-200 dark:border-zinc-800 mr-2.5 pl-1 space-y-4">
            {upcomingEvents.map((ev, i) => {
              const d = parseISO(ev.date);
              const dayStr = format(d, 'd');
              const monthStr = format(d, 'MMM', { locale: ar });
              const timeStr = format(d, 'h:mm a', { locale: ar });
              const isSelected = selectedEvent && selectedEvent.title === ev.title && selectedEvent.date === ev.date;
              const meta = getEventCategoryMeta(ev);

              return (
                <div 
                  key={ev.id || i} 
                  onClick={() => {
                    setCurrentDate(d);
                    setSelectedEvent(ev);
                  }}
                  className="relative group cursor-pointer pr-5 transition-all duration-200"
                >
                  <div className={`absolute -right-[5px] top-3 w-2.5 h-2.5 rounded-full border-2 transition-all duration-300 ${
                    isSelected 
                      ? 'bg-[var(--color-imamu-brown)] border-[var(--color-imamu-brown)] scale-125 shadow-xs' 
                      : 'bg-slate-300 dark:bg-zinc-800 border-white dark:border-zinc-950 group-hover:border-amber-700'
                  }`} />

                  <div className={`rounded-2xl border p-3.5 transition-all duration-200 ${
                    isSelected
                      ? 'bg-stone-50 dark:bg-stone-950/30 border-amber-200 dark:border-stone-900/50 shadow-2xs'
                      : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800/80 hover:border-amber-700 dark:hover:border-zinc-700'
                  }`}>
                    <div className="flex justify-between items-baseline gap-2 mb-1">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[var(--color-imamu-accent)] dark:group-hover:text-[var(--color-imamu-accent)] transition-colors truncate max-w-[130px]">
                        {ev.title}
                      </h3>
                      <span className="text-[10px] font-bold text-[var(--color-imamu-accent)] bg-stone-50 dark:bg-stone-950/50 border border-amber-200 dark:border-stone-900/50 px-2 py-0.5 rounded-lg shrink-0">
                        {dayStr} {monthStr}
                      </span>
                    </div>

                    {meta && (
                      <div className="mb-1.5">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border inline-block ${meta.badgeClass}`}>
                          {meta.label}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                      <Clock className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
                      <span>{timeStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {upcomingEvents.length === 0 && (
              <div className="text-xs text-slate-400 dark:text-zinc-500 text-center py-8 border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-slate-50 dark:bg-zinc-950/40 mr-2.5">
                لا توجد مواعيد قادمة حالياً.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Calendar Section */}
      <div className="flex-1 flex flex-col h-full max-w-full overflow-hidden bg-white dark:bg-zinc-950">
        
        {/* Calendar Navigation Header & Filter Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-4 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-serif font-extrabold text-slate-900 dark:text-white min-w-[200px]">
              {viewState === 'month' 
                ? format(currentDate, 'MMMM yyyy', { locale: ar }) 
                : `${format(weekStart, 'd MMMM', { locale: ar })} - ${format(weekEnd, 'd MMMM yyyy', { locale: ar })}`}
            </h2>
            
            <div className="flex items-center bg-slate-100 dark:bg-zinc-950 rounded-2xl p-1 border border-slate-200 dark:border-zinc-800" dir="ltr">
              <button 
                onClick={nextPeriod}
                className="p-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                title="الفترة القادمة"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={goToday}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-colors ${
                  isTodayDate 
                    ? 'text-[var(--color-imamu-accent)] bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-2xs' 
                    : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-800'
                }`}
              >
                اليوم
              </button>
              <button 
                onClick={prevPeriod}
                className="p-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                title="الفترة السابقة"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex bg-slate-100 dark:bg-zinc-950 p-1 rounded-2xl border border-slate-200 dark:border-zinc-800">
            <button 
              onClick={() => setViewState('month')}
              className={`px-4 py-1.5 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 transition-colors ${
                viewState === 'month' 
                  ? 'bg-white dark:bg-zinc-800 text-[var(--color-imamu-accent)] shadow-2xs border border-slate-200 dark:border-zinc-700' 
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> شهر
            </button>
            <button 
              onClick={() => setViewState('week')}
              className={`px-4 py-1.5 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 transition-colors ${
                viewState === 'week' 
                  ? 'bg-white dark:bg-zinc-800 text-[var(--color-imamu-accent)] shadow-2xs border border-slate-200 dark:border-zinc-700' 
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <List className="w-4 h-4" /> أسبوع
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/90 shrink-0">
          {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day, i) => (
            <div key={day} className="py-3 text-center">
              <span className={`text-xs font-bold ${i === 5 || i === 6 ? 'text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)]' : 'text-slate-700 dark:text-zinc-300'}`}>
                {day}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar Grid Cells */}
        <div className={`flex-1 grid grid-cols-7 bg-white dark:bg-zinc-950 overflow-auto ${viewState === 'month' ? 'auto-rows-[minmax(110px,1fr)]' : 'auto-rows-[minmax(280px,1fr)]'}`}>
          {daysToShow.map((day) => {
            const isCurrMonth = isSameMonth(day, currentDate);
            const isDayToday = isToday(day);
            const dayEvents = getEventsForDay(day);

            return (
              <div 
                key={day.toString()} 
                className={`border-l border-b border-slate-200 dark:border-zinc-800/80 p-2 flex flex-col transition-colors duration-200 ${
                  !isCurrMonth && viewState === 'month' 
                    ? 'bg-slate-50/70 dark:bg-zinc-950/90' 
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
                
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                  {dayEvents.map((ev, i) => {
                    const isSelected = selectedEvent && selectedEvent.title === ev.title && selectedEvent.date === ev.date;
                    const meta = getEventCategoryMeta(ev);
                    
                    // Distinct category colors for calendar pills
                    let borderClass = 'border-r-amber-600 border-amber-200 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/60 text-amber-900 dark:text-amber-100';
                    if (ev.isHoliday || ev.isHolidayEnd || ev.isNationalDay) {
                      borderClass = 'border-r-emerald-600 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/90 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-100';
                    } else if (ev.isSemesterStart || ev.isSemesterEnd) {
                      borderClass = 'border-r-indigo-600 border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/90 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-100';
                    } else if (ev.title?.includes('مكافأة') || ev.title?.includes('المكافأة')) {
                      borderClass = 'border-r-amber-500 border-amber-200 dark:border-amber-900/60 bg-amber-50/90 dark:bg-amber-950/60 text-amber-900 dark:text-amber-100';
                    }

                    return (
                      <div 
                        key={ev.id || i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                        }}
                        className={`px-2.5 py-1.5 rounded-xl border transition-all duration-150 cursor-pointer text-right border-r-3 ${
                          isSelected
                            ? 'bg-[var(--color-imamu-brown)] text-white dark:text-white border-transparent shadow-sm'
                            : `${borderClass} hover:opacity-90`
                        }`}
                        title="انقر لعرض تفاصيل الفعالية"
                      >
                        {meta && (
                          <div className="text-[9px] font-extrabold mb-0.5 opacity-90 truncate">
                            {meta.label}
                          </div>
                        )}
                        <div className="font-bold truncate text-[11px] leading-relaxed text-slate-900 dark:text-white">{ev.title}</div>
                        <div className="opacity-80 truncate text-[9px] flex items-center gap-1 mt-0.5 text-slate-600 dark:text-zinc-300">
                          <Clock className="w-2.5 h-2.5 inline text-slate-500 dark:text-zinc-300" />
                          {format(parseISO(ev.date), 'h:mm a', { locale: ar })}
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

    </div>
  );
}
