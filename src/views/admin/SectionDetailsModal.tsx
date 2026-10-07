'use client';

import { useState } from 'react';
import { Calendar, Check, Clock, Copy, Users, X } from 'lucide-react';
import { formatScheduleDaysDisplay } from '../../lib/schedule-utils';
import type { SectionItem } from './admin-sections-model';

export function SectionDetailsModal({
  section,
  onClose
}: {
  section: SectionItem;
  onClose: () => void;
}) {
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  const copyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const term = section.term || (
    section.academicYear && section.semester
      ? `${section.academicYear} - ${section.semester}`
      : section.academicYear || section.semester || 'عام / غير محدد'
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" dir="rtl">
      <div className="w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden p-6 space-y-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="flex items-start justify-between border-b pb-4" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-amber-500/10 text-[var(--color-imamu-accent)]">CRN: {section.crn}</span>
            <h3 className="text-base font-bold mt-1" style={{ color: 'var(--text-main)' }}>
              {section.courseTitle || section.courseCode} (شعبة {section.sectionNumber})
            </h3>
            <span className="text-xs text-slate-400 font-mono">{section.courseCode}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition" aria-label="إغلاق">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {[
            ['الفصل والسنة', term],
            ['المحاضر الرئيسي', section.primaryInstructor || section.instructors?.[0]?.name || 'غير محدد'],
            ['المقر', section.campus || 'غير محدد'],
            ['المقاعد المتاحة', section.seatsAvailable !== undefined && section.seatsAvailable !== null
              ? `${section.seatsAvailable} متاح (${section.currentEnrollment ?? 0}/${section.maxEnrollment ?? '—'})`
              : section.instructionalMethod || 'تقليدي']
          ].map(([label, value]) => (
            <div key={label} className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60">
              <span className="text-slate-400 block mb-1">{label}:</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate block">{value}</span>
            </div>
          ))}
        </div>

        {section.instructors?.length ? (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-500" /> أساتذة ومحاضرو الشعبة ({section.instructors.length}):
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {section.instructors.map((instructor, index) => (
                <div key={`${instructor.email || instructor.name}-${index}`} className="p-2.5 rounded-xl border flex items-center justify-between text-xs" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">{instructor.name.slice(0, 1)}</div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5">
                        <span>{instructor.name}</span>
                        <span className={instructor.isPrimary
                          ? 'px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          : 'px-1.5 py-0.2 text-[10px] font-semibold rounded bg-slate-200 dark:bg-zinc-700 text-slate-600 dark:text-zinc-300'}>
                          {instructor.isPrimary ? 'أستاذ رئيسي' : 'أستاذ مشارك'}
                        </span>
                      </div>
                      {instructor.email && <div className="text-[11px] text-slate-400 font-mono truncate dir-ltr text-right">{instructor.email}</div>}
                    </div>
                  </div>
                  {instructor.email && (
                    <button type="button" onClick={() => copyEmail(instructor.email!)} className="p-1.5 rounded-lg border hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 transition shrink-0 ml-2" title="نسخ البريد الإلكتروني">
                      {copiedEmail === instructor.email ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-amber-500" /> أوقات المحاضرات والقاعات:</h4>
          {section.schedules?.length ? (
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {section.schedules.map((schedule, index) => (
                <div key={index} className="p-3 rounded-xl border flex items-center justify-between text-xs" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-100">{formatScheduleDaysDisplay(schedule)} ({schedule.timeRange || 'الموعد غير محدد'})</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{schedule.building ? `${schedule.building} - ` : ''}قاعة: {schedule.room || 'غير محددة'}</div>
                  </div>
                  <span className="px-2 py-1 rounded bg-amber-500/10 text-[var(--color-imamu-accent)] font-bold text-[11px]">{schedule.type || 'محاضرة'}</span>
                </div>
              ))}
            </div>
          ) : <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 text-center text-xs text-slate-400">لا توجد مواعيد مفصلة مسجلة لهذه الشعبة.</div>}
        </div>

        {section.finalExam && (
          <div className="p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 text-xs flex items-center gap-2">
            <Calendar className="w-4 h-4 text-purple-500 shrink-0" />
            <div><span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold block">موعد الاختبار النهائي:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{typeof section.finalExam === 'object' ? `${section.finalExam.examDate || ''} ${section.finalExam.examTime ? `(${section.finalExam.examTime})` : ''}` : String(section.finalExam)}</span>
            </div>
          </div>
        )}

        <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-bold transition">إغلاق</button>
      </div>
    </div>
  );
}
