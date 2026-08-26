'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { FileText, ArrowLeft, BookOpen, GraduationCap, Clock, ExternalLink, Search, Info } from 'lucide-react';
import Link from 'next/link';
import { CourseDetailsModal } from '../components/CourseDetailsModal';

export function PlansToolPage() {
  const { user } = useAuth();
  const [majors, setMajors] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedMajor, setSelectedMajor] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string | number | null>(null);

  useEffect(() => {
    const headers = user ? { Authorization: `Bearer ${user.accessToken}` } : undefined;

    Promise.all([
      fetch('/api/majors', { headers }).then(r => r.ok ? r.json() : []),
      fetch('/api/subjects', { headers }).then(r => r.ok ? r.json() : [])
    ]).then(([m, s]) => {
      if (Array.isArray(m)) setMajors(m);
      if (Array.isArray(s)) setSubjects(s);
    }).catch(err => {
      console.error("Error fetching data:", err);
    });
  }, [user]);

  const filteredMajors = majors.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));


  const renderStudyPlan = () => {
    if (!selectedMajor) return null;

    const groups: Record<string, { reqCount: number, courses: any[] }> = {};
    
    selectedMajor.courses?.forEach((c: any) => {
      const groupName = c.optionalGroup || 'المتطلبات العامة';
      if (!groups[groupName]) {
        groups[groupName] = {
          reqCount: c.optionalGroupReqCount || 1,
          courses: []
        };
      }
      const subjectDetail = subjects.find(s => s.id === c.subjectId);
      if (subjectDetail) {
        groups[groupName].courses.push(subjectDetail);
      }
    });

    const groupKeys = Object.keys(groups).sort((a, b) => {
      const matchA = a.match(/المستوى\s+(\d+)/);
      const matchB = b.match(/المستوى\s+(\d+)/);
      if (matchA && matchB) return parseInt(matchA[1]) - parseInt(matchB[1]);
      if (matchA) return -1;
      if (matchB) return 1;
      return a.localeCompare(b, 'ar');
    });

    return (
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col" dir="rtl">
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-50/80 via-white to-white dark:from-blue-950/30 dark:via-zinc-900 dark:to-zinc-900 p-6 md:p-8 border-b border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 rounded-full text-xs font-bold mb-3">
              <GraduationCap className="w-4 h-4" /> الخطة الرسمية
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{selectedMajor.name}</h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1">راجع هيكل المنهج والمواد المطلوبة لكافة المستويات.</p>
          </div>
          {selectedMajor.pdfUrl && (
            <a 
              href={selectedMajor.pdfUrl} 
              target="_blank" 
              rel="noreferrer" 
              className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 sm:px-5 py-2.5 rounded-xl shadow-md shadow-blue-600/20 transition flex items-center gap-2 text-xs sm:text-sm"
            >
              <FileText className="w-4.5 h-4.5" /> تحميل الخطة PDF
            </a>
          )}
        </div>

        {/* Batches / Groups */}
        <div className="p-6 md:p-8 flex-1 bg-slate-50/50 dark:bg-zinc-950/50">
          {groupKeys.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8 items-start">
              {groupKeys.map(groupName => {
                const group = groups[groupName];
                return (
                  <div key={groupName} className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-2xs">
                    <div className="bg-slate-50 dark:bg-zinc-950 px-5 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between">
                      <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                        <BookOpen className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                        {groupName}
                      </h3>
                      {group.reqCount > 0 && (
                        <span className="text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 px-3 py-1 rounded-full">
                          مطلوب {group.reqCount}
                        </span>
                      )}
                    </div>
                    <div className="p-4 flex flex-col gap-3">
                      {group.courses.map((subj, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => setSelectedCourse(subj.id || subj.code)}
                          className="group p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950/60 hover:bg-white dark:hover:bg-zinc-900 hover:border-blue-400 dark:hover:border-zinc-700 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 px-2 py-0.5 rounded-md break-all leading-tight" dir="ltr">{subj.code}</span>
                              <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md shrink-0">
                                <Clock className="w-3 h-3" /> {subj.creditHours} ساعات
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-2" title={subj.name}>{subj.name}</h4>
                          </div>
                          
                          <div className="flex items-center gap-2 sm:justify-end shrink-0 pt-2 sm:pt-0 border-t border-slate-200 dark:border-zinc-800 sm:border-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedCourse(subj.id || subj.code)}
                              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 transition bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900/50"
                            >
                              <Info className="w-3.5 h-3.5" />
                              <span>تفاصيل المادة</span>
                            </button>

                            {subj.driveLink && (
                              <a href={subj.driveLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-slate-600 dark:text-zinc-400 hover:text-blue-600 flex items-center gap-1 transition bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-700">
                                Drive <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                            {subj.whatsappLink && (
                              <a href={subj.whatsappLink} target="_blank" rel="noreferrer" className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1 transition bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 px-2.5 py-1.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                                واتساب <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 dark:text-zinc-500 flex flex-col items-center gap-2">
              <BookOpen className="w-10 h-10 text-slate-300 dark:text-zinc-600 mb-1" />
              <p className="text-xs sm:text-sm font-bold">لا توجد مواد مضافة لهذا التخصص حالياً.</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto pb-24 px-4 sm:px-6 pt-8 text-right" dir="rtl">
      <Link 
        href="/tools" 
        className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 mb-6 w-fit transition self-start bg-white dark:bg-zinc-900 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs" 
        dir="rtl"
      >
        <ArrowLeft className="w-4 h-4 rotate-180 text-blue-600 dark:text-blue-400" />
        <span>العودة إلى الأدوات</span>
      </Link>

      <div className="mb-8">
        <span className="text-xs sm:text-sm font-semibold tracking-widest text-blue-600 dark:text-blue-400 uppercase mb-2 block">
          التخطيط والتسجيل
        </span>
        <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-slate-900 dark:text-white mb-2">الخطط الدراسية</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl">
          تصفح التخصصات المتاحة لعرض الخطط الدراسية التفصيلية، متطلبات المواد، والمصادر المتوفرة لكل تخصص.
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-6">
        {/* Right Column: Major Selection */}
        <div className="w-full xl:w-80 shrink-0 flex flex-col gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
              <Search className="w-4.5 h-4.5 text-slate-400 dark:text-zinc-500" />
            </div>
            <input 
              type="text" 
              placeholder="البحث عن تخصص..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pr-11 pl-4 py-3 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-600 outline-none shadow-2xs text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500"
            />
          </div>
          
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-2xs p-2 max-h-[60vh] xl:max-h-[calc(100vh-250px)] overflow-y-auto">
            {filteredMajors.length > 0 ? (
              <div className="flex flex-col gap-1">
                {filteredMajors.map(m => {
                  const isSelected = selectedMajor?.id === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMajor(m)}
                      className={`text-right px-4 py-3 rounded-xl transition flex items-center justify-between group ${
                        isSelected 
                          ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 font-bold' 
                          : 'hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <span className="text-xs sm:text-sm truncate">
                        {m.name}
                      </span>
                      {isSelected && <GraduationCap className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mr-2" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 dark:text-zinc-500 font-medium">
                لا توجد تخصصات تطابق البحث.
              </div>
            )}
          </div>
        </div>

        {/* Left Column: Study Plan Details */}
        <div className="flex-1 w-full min-w-0">
          {selectedMajor ? (
            renderStudyPlan()
          ) : (
            <div className="h-full min-h-[380px] flex items-center justify-center bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800 p-8 text-center">
              <div className="flex flex-col items-center max-w-sm">
                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 rounded-2xl flex items-center justify-center mb-4 text-blue-600 dark:text-blue-400">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">اختر تخصصاً لعرض الخطة</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">حدد تخصصاً من القائمة الجانبية لمعاينة خطته الدراسية والمواد والمصادر المتاحة.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <CourseDetailsModal 
        isOpen={!!selectedCourse} 
        onClose={() => setSelectedCourse(null)} 
        courseIdOrCode={selectedCourse} 
      />
    </div>
  );
}

