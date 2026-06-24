import React, { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, LayoutGrid, List, X, Info, ExternalLink, Download } from 'lucide-react';
import { 
  format, parseISO, addMonths, subMonths, startOfWeek, endOfWeek, 
  startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, 
  isSameDay, isToday, addWeeks, subWeeks, isAfter, startOfDay
} from 'date-fns';

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

  return (
    <div className="flex flex-col lg:flex-row flex-1 w-full bg-white h-full overflow-hidden">
      
      {/* Sidebar: Upcoming Events */}
      <div className="w-full lg:w-80 lg:shrink-0 border-r border-gray-100 bg-gray-50/50 flex flex-col h-full overflow-y-auto">
        <div className="p-6 pb-4 border-b border-gray-100 sticky top-0 bg-gray-50/95 backdrop-blur z-10">
          <h1 className="text-2xl font-display font-bold text-gray-900 inline-flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-[var(--color-imamu-blue)]" />
            Calendar
          </h1>
          <p className="text-xs text-gray-500 mt-1 mb-3">Academic events & activities</p>
          <div className="flex flex-col gap-2">
            <a 
              href={`https://calendar.google.com/calendar/render?cid=${encodeURIComponent(window.location.origin + '/api/calendar.ics')}`}
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-[11px] bg-sky-50 text-[var(--color-imamu-blue)] border border-sky-200/50 px-3 py-2 rounded-lg font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-sky-100/80 transition-all shadow-sm"
              title="Subscribe to the entire campus calendar live in your Google Calendar"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Connect to Google Calendar
            </a>
            <a 
              href="/api/calendar.ics" 
              download 
              className="text-[11px] bg-white text-gray-700 border border-gray-200 px-3 py-2 rounded-lg font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-gray-50 hover:border-gray-250 transition-all shadow-sm"
              title="Download universal ICS file for Apple Calendar, Outlook, etc."
            >
              <Download className="w-3.5 h-3.5 text-gray-400" /> Export iCal Feed (ICS)
            </a>
          </div>
        </div>
        
        <div className="p-6 flex-1">
          {selectedEvent && (
            <div className="mb-6 bg-[var(--color-imamu-blue)]/5 border border-[var(--color-imamu-blue)]/20 rounded-xl p-4 relative animate-in fade-in slide-in-from-top-1 duration-200">
              <button 
                onClick={() => setSelectedEvent(null)}
                className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="text-[10px] font-bold text-[var(--color-imamu-blue)] uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Event Preview
              </div>
              <h3 className="font-semibold text-gray-900 text-sm mb-1" dir="auto">{selectedEvent.title}</h3>
              <p className="text-[11px] text-gray-500 mb-2.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 inline text-[var(--color-imamu-blue)]" />
                <span>{format(parseISO(selectedEvent.date), 'PPPP • h:mm a')}</span>
              </p>
              {selectedEvent.description ? (
                <div className="text-xs text-gray-600 bg-white border border-gray-150/60 rounded-lg p-2.5 leading-relaxed max-h-40 overflow-y-auto" dir="auto">
                  {selectedEvent.description}
                </div>
              ) : (
                <span className="text-xs italic text-gray-400 block pt-1">No description available</span>
              )}
            </div>
          )}

          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Upcoming Events</h2>
          <div className="space-y-4">
            {upcomingEvents.map((ev, i) => {
              const d = parseISO(ev.date);
              const dayStr = format(d, 'dd');
              const monthStr = format(d, 'MMM').toUpperCase();
              const timeStr = format(d, 'h:mm a');

              return (
                <div 
                  key={ev.id || i} 
                  onClick={() => {
                    setCurrentDate(d);
                    setSelectedEvent(ev);
                  }}
                  className={`group rounded-xl border p-3.5 transition-all duration-200 flex gap-3 cursor-pointer items-start ${
                    selectedEvent && selectedEvent.title === ev.title && selectedEvent.date === ev.date
                      ? 'bg-[var(--color-imamu-blue)]/5 border-[var(--color-imamu-blue)]/30 shadow-sm'
                      : 'bg-white border-gray-200/80 hover:border-gray-350 hover:shadow-md'
                  }`}
                  title="Click to view details"
                >
                  {/* Modern academic date badge */}
                  <div className="flex flex-col items-center justify-center shrink-0 w-12 h-12 rounded-lg bg-[var(--color-imamu-blue)]/5 border border-[var(--color-imamu-blue)]/10 text-[var(--color-imamu-blue)] group-hover:bg-[var(--color-imamu-blue)] group-hover:text-white group-hover:border-transparent transition-all duration-300">
                    <span className="text-[10px] uppercase font-bold tracking-widest leading-none mb-0.5 opacity-80 group-hover:opacity-100">
                      {monthStr}
                    </span>
                    <span className="text-lg font-display font-semibold leading-none tracking-tight">
                      {dayStr}
                    </span>
                  </div>

                  {/* Main Event Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[var(--color-imamu-blue-light)] transition-colors leading-snug truncate" title={ev.title}>
                      {ev.title}
                    </h3>
                    <div className="flex items-center gap-1 mt-0.5 mb-1 text-[10px] text-gray-400 font-medium">
                      <Clock className="w-3 h-3 text-gray-400 group-hover:text-[var(--color-imamu-blue-light)] transition-colors" />
                      <span>{timeStr}</span>
                    </div>
                    {ev.description ? (
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 pr-1" dir="auto">
                        {ev.description}
                      </p>
                    ) : (
                      <span className="text-xs italic text-gray-400">No details provided</span>
                    )}
                  </div>
                </div>
              );
            })}
            {upcomingEvents.length === 0 && (
              <div className="text-xs text-gray-400 text-center py-10 border border-dashed border-gray-200 rounded-xl bg-white/50">
                No upcoming events.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col h-full max-w-full overflow-hidden">
        {/* Calendar Header Constraints */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-display font-semibold text-gray-900 min-w-[200px]">
              {viewState === 'month' ? format(currentDate, 'MMMM yyyy') : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`}
            </h2>
            <div className="flex items-center bg-gray-50 rounded-lg p-1 border border-gray-200 shadow-sm">
              <button 
                onClick={prevPeriod}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white rounded-md transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={goToday}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${isTodayDate ? 'text-[var(--color-imamu-blue)] bg-[rgba(11,50,96,0.06)]' : 'text-gray-600 hover:bg-white hover:text-gray-900'}`}
              >
                Today
              </button>
              <button 
                onClick={nextPeriod}
                className="p-1.5 text-gray-500 hover:text-gray-900 hover:bg-white rounded-md transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
            <button 
              onClick={() => setViewState('month')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition ${viewState === 'month' ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <LayoutGrid className="w-4 h-4" /> Month
            </button>
            <button 
              onClick={() => setViewState('week')}
              className={`px-4 py-1.5 text-sm font-medium rounded-md flex items-center gap-2 transition ${viewState === 'week' ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <List className="w-4 h-4" /> Week
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 flex flex-col bg-gray-50/30 overflow-auto">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b border-gray-100 bg-white shrink-0 sticky top-0 z-10">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
              <div key={day} className="py-3 text-center">
                <span className={`text-xs font-bold uppercase tracking-wider ${i === 0 || i === 6 ? 'text-gray-400' : 'text-gray-500'}`}>
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
                  className={`border-r border-b border-gray-100/80 p-2 flex flex-col ${
                    !isCurrMonth && viewState === 'month' ? 'bg-gray-50/50' : 'bg-white hover:bg-gray-50/30'
                  } transition-colors duration-200`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span 
                      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm ${
                        isDayToday 
                          ? 'bg-[var(--color-imamu-blue)] text-white font-bold shadow-sm' 
                          : !isCurrMonth && viewState === 'month'
                          ? 'text-gray-400' 
                          : 'text-gray-700 font-medium'
                      }`}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-gray-200 pr-1">
                    {dayEvents.map((ev, i) => (
                      <div 
                        key={ev.id || i}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(ev);
                        }}
                        className={`px-2 py-1.5 rounded-md text-xs border transition-all duration-150 cursor-pointer text-left ${
                          selectedEvent && selectedEvent.title === ev.title && selectedEvent.date === ev.date
                            ? 'bg-[var(--color-imamu-blue)] text-white border-transparent font-medium shadow'
                            : 'border-[rgba(11,50,96,0.12)] bg-[rgba(11,50,96,0.04)] text-[var(--color-imamu-blue)] hover:bg-[rgba(11,50,96,0.08)] hover:border-[rgba(11,50,96,0.2)] font-medium'
                        }`}
                        title="Click to view full preview"
                      >
                        <div className="font-semibold truncate">{ev.title}</div>
                        <div className="opacity-80 truncate text-[10px] flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 inline" />
                          {format(parseISO(ev.date), 'h:mm a')}
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
