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
          // Sort by date ascending
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
    const endD = new Date(d.getTime() + 60 * 60 * 1000); // 1 hour duration
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
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${ev.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
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

  // Generate WebCal URL for direct Apple Calendar subscription
  const webcalUrl = typeof window !== 'undefined' 
    ? `webcal://${window.location.host}/api/calendar.ics` 
    : '';

  const googleCalendarUrl = typeof window !== 'undefined'
    ? `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(window.location.origin + '/api/calendar.ics')}`
    : '#';

  return (
    <div className="flex flex-col lg:flex-row flex-1 w-full bg-transparent h-full overflow-hidden text-right" dir="rtl">
      
      {/* Sidebar: Upcoming Events */}
      <div className="w-full lg:w-80 lg:shrink-0 border-l border-zinc-800 bg-zinc-900 flex flex-col h-full overflow-y-auto">
        <div className="p-6 pb-5 border-b border-zinc-800 sticky top-0 bg-zinc-900/95 backdrop-blur z-10 text-right">
          <h1 className="text-2xl font-display font-bold text-zinc-50 inline-flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-blue-500" />
            التقويم الدراسي
          </h1>
          <p className="text-xs text-zinc-400 mt-1.5 mb-4 leading-relaxed">تابع المواعيد والتقويم الدراسي لجامعة الإمام بيسر.</p>
          <div className="flex flex-col gap-2">
            <a 
              href={googleCalendarUrl}
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[11px] bg-blue-600 text-white px-3.5 py-2.5 rounded-md font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-blue-700 transition-colors shadow-sm"
              title="مزامنة التقويم بالكامل مع تقويم Google الخاص بك"
            >
              <CalendarPlus className="w-4 h-4" /> ربط بـ تقويم Google
            </a>
            <a 
              href={webcalUrl}
              className="text-[11px] bg-transparent border border-zinc-800 text-zinc-300 px-3.5 py-2.5 rounded-md font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-zinc-850 hover:text-zinc-50 transition-colors shadow-sm"
              title="الاشتراك المباشر والتلقائي في التقويم على أجهزة Apple أو Outlook"
            >
              <CalendarIcon className="w-4 h-4 text-emerald-500" /> الاشتراك في تقويم Apple (iOS)
            </a>
          </div>
        </div>
        
        <div className="p-6 flex-1">
          {selectedEvent && (
            <div className="mb-6 bg-blue-950/20 border border-blue-900/30 rounded-xl p-4.5 relative animate-in fade-in slide-in-from-top-1 duration-200 shadow-sm">
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-3.5 left-3.5 p-1 text-zinc-400 hover:text-zinc-200 rounded-full hover:bg-zinc-800 transition duration-150"
                title="إلغاء التحديد"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> تفاصيل الموعد
              </div>
              <h3 className="font-bold text-zinc-50 text-sm mb-1.5 leading-snug" dir="auto">{selectedEvent.title}</h3>
              <p className="text-[11px] text-zinc-400 mb-4 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 inline text-blue-400" />
                <span>{format(parseISO(selectedEvent.date), 'EEEE، d MMMM yyyy • h:mm a', { locale: ar })}</span>
              </p>
              {selectedEvent.description ? (
                <div className="text-xs text-zinc-300 bg-zinc-950 border border-zinc-800 rounded-xl p-3 leading-relaxed max-h-40 overflow-y-auto mb-3 text-right" dir="auto">
                  {selectedEvent.description}
                </div>
              ) : (
                <span className="text-xs italic text-zinc-500 block pt-1 mb-3">لا يوجد وصف متاح لهذا الموعد.</span>
              )}
              
              {/* Quick Actions for Selected Event */}
              <div className="flex gap-2 border-t border-zinc-800 pt-3 mt-3">
                <a 
                  href={getGoogleCalendarUrl(selectedEvent)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-[10px] bg-transparent border border-zinc-800 text-zinc-300 py-2 px-2.5 rounded-md font-semibold inline-flex items-center justify-center gap-1 hover:bg-zinc-800 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500" /> لتقويم Google
                </a>
                <button 
                  onClick={() => downloadSingleIcs(selectedEvent)}
                  className="flex-1 text-[10px] bg-transparent border border-zinc-800 text-zinc-300 py-2 px-2.5 rounded-md font-semibold inline-flex items-center justify-center gap-1 hover:bg-zinc-800 transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-500" /> تحميل ملف ICS
                </button>
              </div>
            </div>
          )}

          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-5 pr-1">المواعيد القادمة</h2>
          
          {/* Smart Connected Timeline Layout */}
          <div className="relative border-r border-zinc-800 mr-2.5 pl-1 space-y-5">
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
                  className="relative group cursor-pointer pr-5 transition-all duration-205"
                  title="انقر لعرض تفاصيل هذا الموعد"
                >
                  {/* Timeline Connection Bullet */}
                  <div className={`absolute -right-[5px] top-2.5 w-2.5 h-2.5 rounded-full border-2 transition-all duration-300 ${
                    isSelected 
                      ? 'bg-blue-500 border-blue-500 scale-125 shadow-sm shadow-blue-500/30' 
                      : 'bg-zinc-950 border-zinc-700 group-hover:border-blue-500'
                  }`} />

                  {/* Compact Event Item Box */}
                  <div className={`rounded-xl border p-3 transition-all duration-200 ${
                    isSelected
                      ? 'bg-blue-950/20 border-blue-900/30 shadow-none'
                      : 'bg-zinc-950/40 border-zinc-850 group-hover:border-zinc-700 group-hover:bg-zinc-900/40 group-hover:shadow-none'
                  }`}>
                    <div className="flex justify-between items-baseline gap-2 mb-1">
                      <h3 className="text-xs font-bold text-zinc-200 group-hover:text-blue-400 transition-colors truncate max-w-[130px]" title={ev.title}>
                        {ev.title}
                      </h3>
                      <span className="text-[9px] font-bold text-blue-400 bg-blue-950/40 border border-blue-900/30 px-1.5 py-0.5 rounded-md shrink-0">
                        {dayStr} {monthStr}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-zinc-400 font-medium">
                      <Clock className="w-2.5 h-2.5 text-zinc-500" />
                      <span>{timeStr}</span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {upcomingEvents.length === 0 && (
              <div className="text-xs text-zinc-500 text-center py-10 border border-dashed border-zinc-800 rounded-xl bg-zinc-950/20 mr-2.5">
                لا توجد مواعيد قادمة حالياً.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col h-full max-w-full overflow-hidden">
        {/* Calendar Header Constraints */}
        <div className="p-4 sm:p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-display font-bold text-zinc-50 min-w-[200px]">
              {viewState === 'month' 
                ? format(currentDate, 'MMMM yyyy', { locale: ar }) 
                : `${format(weekStart, 'd MMMM', { locale: ar })} - ${format(weekEnd, 'd MMMM yyyy', { locale: ar })}`}
            </h2>
            <div className="flex items-center bg-zinc-950 rounded-xl p-1 border border-zinc-800 shadow-none" dir="ltr">
              {/* Left arrow goes to next period in RTL */}
              <button 
                onClick={nextPeriod}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                title="الفترة القادمة"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={goToday}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  isTodayDate 
                    ? 'text-blue-400 bg-blue-950/40 border border-blue-900/30' 
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'
                }`}
              >
                اليوم
              </button>
              {/* Right arrow goes to previous period in RTL */}
              <button 
                onClick={prevPeriod}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
                title="الفترة السابقة"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button 
              onClick={() => setViewState('month')}
              className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${
                viewState === 'month' 
                  ? 'bg-zinc-900 text-zinc-100 shadow-none border border-zinc-800' 
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> شهر
            </button>
            <button 
              onClick={() => setViewState('week')}
              className={`px-4 py-1.5 text-xs sm:text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${
                viewState === 'week' 
                  ? 'bg-zinc-900 text-zinc-100 shadow-none border border-zinc-800' 
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              <List className="w-4 h-4" /> أسبوع
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col bg-zinc-950/40 overflow-auto">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-zinc-800 bg-zinc-900 shrink-0 sticky top-0 z-10">
            {['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'].map((day, i) => (
              <div key={day} className="py-3 text-center">
                <span className={`text-xs font-bold ${i === 5 || i === 6 ? 'text-zinc-550' : 'text-zinc-400'}`}>
                  {day}
                </span>
              </div>
            ))}
          </div>

          {/* Grid Cells */}
          <div className={`flex-1 grid grid-cols-7 ${viewState === 'month' ? 'auto-rows-[minmax(120px,1fr)]' : 'auto-rows-[minmax(300px,1fr)]'}`}>
            {daysToShow.map((day, idx) => {
              const isCurrMonth = isSameMonth(day, currentDate);
              const isDayToday = isToday(day);
              const dayEvents = getEventsForDay(day);

              return (
                <div 
                  key={day.toString()} 
                  className={`border-l border-b border-zinc-800 p-2 flex flex-col transition-colors duration-250 ${
                    !isCurrMonth && viewState === 'month' ? 'bg-zinc-950/30' : 'bg-zinc-900/10 hover:bg-zinc-800/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span 
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold ${
                        isDayToday 
                          ? 'bg-blue-600 text-white font-bold shadow-sm' 
                          : !isCurrMonth && viewState === 'month'
                          ? 'text-zinc-600' 
                          : 'text-zinc-300'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-zinc-800 pl-1">
                    {dayEvents.map((ev, i) => (
                      <div 
                        key={ev.id || i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                        }}
                        className={`px-2 py-2 rounded-xl border transition-all duration-150 cursor-pointer text-right border-r-3 ${
                          selectedEvent && selectedEvent.title === ev.title && selectedEvent.date === ev.date
                            ? 'bg-blue-600 text-white border-transparent border-r-transparent font-medium scale-[1.01]'
                            : 'border-zinc-800 border-r-blue-500 bg-blue-950/20 text-blue-400 hover:bg-blue-950/40 hover:border-zinc-700 font-semibold'
                        }`}
                        title="انقر لعرض تفاصيل الفعالية"
                      >
                        <div className="font-bold truncate text-[11px] leading-relaxed">{ev.title}</div>
                        <div className="opacity-75 truncate text-[9px] flex items-center gap-1 mt-1">
                          <Clock className="w-3 h-3 inline text-zinc-500" />
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

    </div>
  );
}
