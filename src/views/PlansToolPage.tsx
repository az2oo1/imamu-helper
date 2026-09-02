'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { FileText, ArrowLeft, GraduationCap, ExternalLink, Search, ArrowUpRight, Plus, Trash2, Download, Eye, Layers, X, BookOpen, Clock, Sparkles, ChevronDown, Check } from 'lucide-react';
import Link from 'next/link';

interface PdfFileItem {
  id: string;
  title: string;
  url: string;
}

const DEFAULT_FALLBACK_MAJORS = [
  {
    id: 1,
    name: 'علوم الحاسب',
    pdfUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf',
    courses: []
  },
  {
    id: 2,
    name: 'تقنية المعلومات',
    pdfUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf',
    courses: []
  },
  {
    id: 3,
    name: 'نظم المعلومات',
    pdfUrl: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf',
    courses: []
  }
];

export function PlansToolPage() {
  const { user, dbUser } = useAuth();
  const isAdmin = !!(dbUser?.isAdmin || dbUser?.role === 'ADMIN');
  const [majors, setMajors] = useState<any[]>(DEFAULT_FALLBACK_MAJORS);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedMajor, setSelectedMajor] = useState<any | null>(DEFAULT_FALLBACK_MAJORS[0]);
  const [searchQuery, setSearchQuery] = useState('');

  // PDF Viewer & Files State
  const [majorPdfs, setMajorPdfs] = useState<Record<string, PdfFileItem[]>>({});
  const [openPdfIndex, setOpenPdfIndex] = useState<number | null>(0);
  const [isAddPdfOpen, setIsAddPdfOpen] = useState(false);
  const [newPdfTitle, setNewPdfTitle] = useState('');
  const [newPdfUrl, setNewPdfUrl] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadPdf = (pdf: PdfFileItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const pdfIdKey = pdf.id || pdf.title;
    setDownloadingId(pdfIdKey);

    const link = document.createElement('a');
    link.href = pdf.url;
    link.download = `${pdf.title}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingId(null);
    }, 2500);
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/majors').then(r => r.ok ? r.json() : []),
      fetch('/api/subjects').then(r => r.ok ? r.json() : [])
    ]).then(([m, s]) => {
      if (Array.isArray(m) && m.length > 0) {
        setMajors(m);
        setSelectedMajor(m[0]);
      } else {
        setMajors(DEFAULT_FALLBACK_MAJORS);
        setSelectedMajor(DEFAULT_FALLBACK_MAJORS[0]);
      }
      if (Array.isArray(s)) setSubjects(s);
    }).catch(err => {
      console.error("Error fetching data:", err);
      setMajors(DEFAULT_FALLBACK_MAJORS);
      setSelectedMajor(DEFAULT_FALLBACK_MAJORS[0]);
    });
  }, []);

  // Initialize PDF list when selected major changes
  useEffect(() => {
    if (!selectedMajor) return;
    const key = String(selectedMajor.id);
    if (!majorPdfs[key]) {
      const initialPdfs: PdfFileItem[] = [];
      if (selectedMajor.pdfUrl) {
        initialPdfs.push({
          id: 'official-1',
          title: selectedMajor.name,
          url: selectedMajor.pdfUrl
        });
      }
      if (initialPdfs.length === 0) {
        initialPdfs.push({
          id: 'default-1',
          title: `خطة ${selectedMajor.name} (PDF)`,
          url: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/examples/learning/helloworld.pdf'
        });
      }
      setMajorPdfs(prev => ({ ...prev, [key]: initialPdfs }));
    }
    setOpenPdfIndex(0);
  }, [selectedMajor]);

  const currentMajorPdfList = selectedMajor ? (majorPdfs[String(selectedMajor.id)] || []) : [];

  // Calculate course count & total hours for selected major
  const majorSubjectsList = React.useMemo(() => {
    if (!selectedMajor) return [];
    if (selectedMajor.courses && selectedMajor.courses.length > 0) {
      return selectedMajor.courses
        .map((c: any) => subjects.find(s => String(s.id) === String(c.subjectId) || (c.code && s.code.toLowerCase() === c.code.toLowerCase())))
        .filter(Boolean);
    }
    return subjects;
  }, [selectedMajor, subjects]);

  const totalCoursesCount = majorSubjectsList.length || (selectedMajor?.courses?.length || 45);
  const totalCreditHours = majorSubjectsList.reduce((acc: number, curr: any) => acc + (Number(curr.creditHours) || 0), 0) || 135;

  const handleAddPdf = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !selectedMajor || !newPdfUrl.trim()) return;
    const key = String(selectedMajor.id);
    const newItem: PdfFileItem = {
      id: Date.now().toString(),
      title: newPdfTitle.trim() || `ملف خطة إضافي ${currentMajorPdfList.length + 1}`,
      url: newPdfUrl.trim()
    };
    setMajorPdfs(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), newItem]
    }));
    setOpenPdfIndex(currentMajorPdfList.length);
    setNewPdfTitle('');
    setNewPdfUrl('');
    setIsAddPdfOpen(false);
  };

  const handleRemovePdf = (indexToRemove: number) => {
    if (!isAdmin || !selectedMajor) return;
    const key = String(selectedMajor.id);
    const updated = currentMajorPdfList.filter((_, idx) => idx !== indexToRemove);
    setMajorPdfs(prev => ({ ...prev, [key]: updated }));
    setOpenPdfIndex(0);
  };

  const filteredMajors = majors.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const renderPdfPlanViewer = () => {
    if (!selectedMajor) return null;

    return (
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col" dir="rtl">
        {/* Header Card with Masari Button & Tags */}
        <div className="bg-gradient-to-br from-slate-50 via-white to-slate-50/50 dark:from-zinc-900/90 dark:via-zinc-900 dark:to-zinc-950 p-6 md:p-8 border-b border-slate-200 dark:border-zinc-800 flex flex-col gap-4">
          {/* Top Row: Title & Description on Right, Masari Button on Left */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">{selectedMajor.name}</h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 mt-1">استعرض ملفات الخطط الدراسية بجمالية عالية وقم بإضافة ملفات جديدة حسب الحاجة.</p>
            </div>

            {/* Masari Platform Button */}
            <a 
              href="https://msari.vercel.app/index.html" 
              target="_blank" 
              rel="noreferrer" 
              className="btn-rise inline-flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-white bg-[#0E352C] hover:bg-[#13493d] px-4.5 py-2.5 rounded-full border border-[#3DC9B0]/40 shadow-sm shadow-[#0E352C]/30 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
              title="الانتقال إلى منصة مساري لتنظيم الخطة الأكاديمية"
            >
              <Sparkles className="w-4 h-4 text-[#3DC9B0] shrink-0" />
              <span>تعمّق مع مساري</span>
              <ArrowUpRight className="w-4 h-4 text-slate-300 shrink-0" />
            </a>
          </div>

          {/* Tags Section: Hours, Courses, PDF Files in a full line under description & masari button */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* Total Hours Tag */}
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800/90 px-3 py-1.5 rounded-full border border-slate-200 dark:border-zinc-700/80">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>{totalCreditHours} ساعة معتمدة</span>
            </span>

            {/* Total Courses Tag */}
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800/90 px-3 py-1.5 rounded-full border border-slate-200 dark:border-zinc-700/80">
              <BookOpen className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
              <span>{totalCoursesCount} مادة دراسية</span>
            </span>

            {/* PDF Files Tag */}
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800/90 px-3 py-1.5 rounded-full border border-slate-200 dark:border-zinc-700/80">
              <FileText className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
              <span>{currentMajorPdfList.length} ملفات PDF</span>
            </span>
          </div>
        </div>

        {/* PDF Viewer Body - List of PDF Files */}
        <div className="p-6 md:p-8 flex-1 bg-slate-50/50 dark:bg-zinc-950/50 flex flex-col gap-6">
          {/* Header Bar: Section Title & Add File Button */}
          <div className="flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-stone-50 dark:bg-stone-950/60 text-[var(--color-imamu-accent)] flex items-center justify-center border border-amber-200/50 dark:border-stone-900/40 shrink-0">
                <Layers className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">قائمة ملفات الخطة الدراسية</h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400">إجمالي {currentMajorPdfList.length} ملف PDF متاح</p>
              </div>
            </div>

            {/* Add New PDF File Button (Admin Only) */}
            {isAdmin && (
              <button
                onClick={() => setIsAddPdfOpen(true)}
                className="btn-rise flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold transition shadow-2xs cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة ملف PDF</span>
              </button>
            )}
          </div>

          {/* List of PDF File Cards */}
          {currentMajorPdfList.length > 0 ? (
            <div className="flex flex-col gap-4">
              {currentMajorPdfList.map((pdf, idx) => {
                const isOpen = openPdfIndex === idx;

                return (
                  <div 
                    key={pdf.id || idx}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden transition-all duration-200"
                  >
                    {/* PDF Card Header */}
                    <div 
                      onClick={() => setOpenPdfIndex(isOpen ? null : idx)}
                      className="bg-slate-50/80 dark:bg-zinc-950/80 px-5 py-4 flex items-center justify-between gap-4 cursor-pointer select-none hover:bg-slate-100/80 dark:hover:bg-zinc-900/90 transition border-b border-slate-100 dark:border-zinc-800/80"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={`p-1 rounded-lg transition-transform duration-200 ${isOpen ? 'rotate-180 text-[var(--color-imamu-accent)]' : 'text-slate-400 dark:text-zinc-500'}`}>
                          <ChevronDown className="w-4.5 h-4.5" />
                        </div>

                        <div className="w-8 h-8 rounded-xl bg-stone-50 dark:bg-stone-950/60 border border-amber-200/50 dark:border-stone-900/40 flex items-center justify-center text-[var(--color-imamu-accent)] shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate" title={pdf.title}>
                              {pdf.title}
                            </h4>
                            {idx === 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-50 dark:bg-stone-950/80 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] border border-amber-200 dark:border-stone-900/50 shrink-0">
                                الخطة الرئيسية
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Controls */}
                      <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleDownloadPdf(pdf, e)}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                            downloadingId === (pdf.id || pdf.title)
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 scale-105 shadow-2xs'
                              : 'bg-stone-50 dark:bg-stone-950/50 border-amber-200 dark:border-stone-900/50 hover:bg-stone-100 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)]'
                          }`}
                          title="تحميل الملف"
                        >
                          {downloadingId === (pdf.id || pdf.title) ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 animate-bounce" />
                              <span>تم بدء التحميل!</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">تحميل الخطة (PDF)</span>
                              <span className="sm:hidden">تحميل</span>
                            </>
                          )}
                        </button>
                        {isAdmin && currentMajorPdfList.length > 1 && (
                          <button
                            onClick={() => handleRemovePdf(idx)}
                            className="p-1.5 text-slate-400 hover:text-red-500 transition rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                            title="حذف هذا الملف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* PDF iFrame Display (Rendered when open) */}
                    {isOpen && (
                      <div className="relative w-full h-[760px] bg-slate-100 dark:bg-zinc-950">
                        <iframe
                          src={
                            pdf.url?.startsWith('blob:') || pdf.url?.startsWith('data:') || pdf.url?.startsWith('/')
                              ? pdf.url
                              : `https://docs.google.com/viewer?url=${encodeURIComponent(pdf.url)}&embedded=true`
                          }
                          className="w-full h-full border-0"
                          title={pdf.title}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 text-slate-400">
              <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-zinc-600" />
              <p className="font-bold text-sm">لا توجد ملفات PDF متوفرة لهذا التخصص حالياً.</p>
              {isAdmin && (
                <button
                  onClick={() => setIsAddPdfOpen(true)}
                  className="mt-4 px-4 py-2 bg-[var(--color-imamu-brown)] text-white rounded-xl text-xs font-bold cursor-pointer"
                >
                  إضافة ملف PDF الآن
                </button>
              )}
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
        className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-zinc-300 hover:text-[var(--color-imamu-accent)] dark:hover:text-[var(--color-imamu-accent)] mb-6 w-fit transition self-start bg-white dark:bg-zinc-900 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-2xs" 
        dir="rtl"
      >
        <ArrowLeft className="w-4 h-4 rotate-180 text-[var(--color-imamu-accent)]" />
        <span>العودة إلى الأدوات</span>
      </Link>

      <div className="mb-8">
        <span className="text-xs sm:text-sm font-semibold tracking-widest text-[var(--color-imamu-accent)] uppercase mb-2 block">
          التخطيط والتسجيل
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-tight text-slate-900 dark:text-white mb-2">الخطط الدراسية</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl">
          تصفح التخصصات المتاحة لعرض واستعراض الخطط الدراسية وملفات الـ PDF المعتمَدة لكل تخصص.
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
              className="w-full pr-11 pl-4 py-3 bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-stone-100 dark:focus:ring-stone-900 focus:border-[var(--color-imamu-brown)] outline-none shadow-2xs text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500"
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
                      className={`text-right px-4 py-3 rounded-xl transition flex items-center justify-between group cursor-pointer ${
                        isSelected 
                          ? 'bg-stone-50 dark:bg-stone-950/50 border border-amber-200 dark:border-stone-900/50 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] font-bold' 
                          : 'hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      <span className="text-xs sm:text-sm truncate">
                        {m.name}
                      </span>
                      {isSelected && <GraduationCap className="w-4 h-4 text-[var(--color-imamu-accent)] shrink-0 mr-2" />}
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

        {/* Left Column: Study Plan PDF Viewer */}
        <div className="flex-1 w-full min-w-0">
          {selectedMajor ? (
            renderPdfPlanViewer()
          ) : (
            <div className="h-full min-h-[380px] flex items-center justify-center bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-slate-300 dark:border-zinc-800 p-8 text-center">
              <div className="flex flex-col items-center max-w-sm">
                <div className="w-14 h-14 bg-stone-50 dark:bg-stone-950/50 border border-amber-200 dark:border-stone-900/50 rounded-2xl flex items-center justify-center mb-4 text-[var(--color-imamu-accent)]">
                  <FileText className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">اختر تخصصاً لعرض الخطة</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">حدد تخصصاً من القائمة الجانبية لمعاينة خطته الدراسية وملفات الـ PDF المتاحة.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add PDF Modal */}
      {isAdmin && isAddPdfOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative text-right" dir="rtl">
            <button
              onClick={() => setIsAddPdfOpen(false)}
              className="absolute left-5 top-5 text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-2xl bg-stone-50 dark:bg-stone-950/50 border border-amber-200 dark:border-stone-900/50 flex items-center justify-center text-[var(--color-imamu-accent)] shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">إضافة ملف PDF جديد</h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">أضف رابط ملف PDF لخطة {selectedMajor?.name}</p>
              </div>
            </div>

            <form onSubmit={handleAddPdf} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">عنوان الملف</label>
                <input
                  type="text"
                  placeholder="مثال: خطة 1446هـ"
                  value={newPdfTitle}
                  onChange={e => setNewPdfTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm outline-none focus:border-[var(--color-imamu-brown)] text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">رابط ملف الـ PDF (URL)</label>
                <input
                  type="url"
                  required
                  placeholder="https://example.com/plan.pdf"
                  value={newPdfUrl}
                  onChange={e => setNewPdfUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-xs sm:text-sm outline-none focus:border-[var(--color-imamu-brown)] text-slate-900 dark:text-white dir-ltr text-left"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddPdfOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold shadow-md shadow-[var(--color-imamu-brown)/20] transition cursor-pointer"
                >
                  إضافة الملف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
