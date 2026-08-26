'use client';

import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, LayoutGrid, List, X, Info, ExternalLink, Download, CalendarPlus } from 'lucide-react';
import { 
  format, parseISO, addMonths, subMonths, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday, addWeeks, subWeeks, isAfter, startOfDay
} from 'date-fns';
import { ar } from 'date-fns/locale';

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
          data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
    return events.filter(e => isSameDay(parseISO(e.date), day));
  };

  const upcomingEvents = events.filter(e => isAfter(parseISO(e.date), startOfDay(new Date()))).slice(0, 5);

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
          <span className="text-xs sm:text-sm font-semibold tracking-widest text-blue-600 dark:text-blue-400 uppercase mb-2 block">
            المواعيد الرسمية
          </span>
          <h1 className="text-2xl font-display font-bold text-slate-900 dark:text-white inline-flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
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
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2.5 rounded-xl font-bold inline-flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              title="مزامنة التقويم بالكامل مع تقويم Google"
            >
              <CalendarPlus className="w-4 h-4" /> ربط بـ تقويم Google
            </a>
            <a 
              href={webcalUrl}
              className="text-xs bg-slate-100 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 text-slate-800 dark:text-zinc-200 px-3.5 py-2.5 rounded-xl font-bold inline-flex items-center justify-center gap-1.5 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors shadow-2xs"
              title="الاشتراك التلقائي في التقويم على أجهزة Apple"
            >
              <CalendarIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> الاشتراك في تقويم Apple
            </a>
          </div>
        </div>
        
        <div className="p-6 flex-1">
          {selectedEvent && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-2xl p-4.5 relative shadow-sm">
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-3.5 left-3.5 p-1 text-slate-400 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 rounded-full hover:bg-slate-200 dark:hover:bg-zinc-800 transition"
                title="إلغاء التحديد"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> تفاصيل الموعد
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1.5 leading-snug" dir="auto">{selectedEvent.title}</h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mb-3 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 inline text-blue-500" />
                <span>{format(parseISO(selectedEvent.date), 'EEEE، d MMMM yyyy • h:mm a', { locale: ar })}</span>
              </p>
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

          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-4 pr-1">المواعيد القادمة</h2>
          
          <div className="relative border-r border-slate-200 dark:border-zinc-800 mr-2.5 pl-1 space-y-4">
            {upcomingEvents.map((ev, i) => {
              const d = parseISO(ev.date);
              const dayStr = format(d, 'd');
              const monthStr = format(d, 'MMM', { locale: ar });
              const timeStr = format(d, 'h:mm a', { locale: ar });
              const isSelected = selectedEvent && selectedEvent.title === ev.title && selectedEvent.date === ev.date;

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
                      ? 'bg-blue-600 border-blue-600 scale-125 shadow-xs' 
                      : 'bg-slate-300 dark:bg-zinc-800 border-white dark:border-zinc-950 group-hover:border-blue-500'
                  }`} />

                  <div className={`rounded-2xl border p-3.5 transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-900/50 shadow-2xs'
                      : 'bg-slate-50 dark:bg-zinc-950/60 border-slate-200 dark:border-zinc-800/80 hover:border-blue-400 dark:hover:border-zinc-700'
                  }`}>
                    <div className="flex justify-between items-baseline gap-2 mb-1">
                      <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate max-w-[130px]">
                        {ev.title}
                      </h3>
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 px-2 py-0.5 rounded-lg shrink-0">
                        {dayStr} {monthStr}
                      </span>
                    </div>
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
        
        {/* Calendar Navigation Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-zinc-900 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-display font-extrabold text-slate-900 dark:text-white min-w-[200px]">
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
                    ? 'text-blue-600 dark:text-blue-400 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 shadow-2xs' 
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
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-2xs border border-slate-200 dark:border-zinc-700' 
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> شهر
            </button>
            <button 
              onClick={() => setViewState('week')}
              className={`px-4 py-1.5 text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 transition-colors ${
                viewState === 'week' 
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-2xs border border-slate-200 dark:border-zinc-700' 
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
              <span className={`text-xs font-bold ${i === 5 || i === 6 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-zinc-300'}`}>
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
                    : 'bg-white dark:bg-zinc-900/40 hover:bg-blue-50/40 dark:hover:bg-zinc-900/80'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <span 
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-xl text-xs font-bold ${
                      isDayToday 
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-black' 
                        : !isCurrMonth && viewState === 'month'
                        ? 'text-slate-400 dark:text-zinc-500 font-semibold' 
                        : 'text-slate-800 dark:text-zinc-200 font-bold'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
                  {dayEvents.map((ev, i) => (
                    <div 
                      key={ev.id || i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedEvent(ev);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl border transition-all duration-150 cursor-pointer text-right border-r-3 ${
                        selectedEvent && selectedEvent.title === ev.title && selectedEvent.date === ev.date
                          ? 'bg-blue-600 text-white border-transparent shadow-sm'
                          : 'border-blue-200 dark:border-blue-900/60 border-r-blue-600 bg-blue-50/90 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/80 font-bold'
                      }`}
                      title="انقر لعرض تفاصيل الفعالية"
                    >
                      <div className="font-bold truncate text-[11px] leading-relaxed">{ev.title}</div>
                      <div className="opacity-80 truncate text-[9px] flex items-center gap-1 mt-0.5">
                        <Clock className="w-2.5 h-2.5 inline text-blue-500 dark:text-blue-400" />
                        {format(parseISO(ev.date), 'h:mm a', { locale: ar })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
