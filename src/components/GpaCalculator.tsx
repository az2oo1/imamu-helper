import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Plus, Trash2, Calculator, Award, Search, X, BookOpen, Check, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnimatedNumber } from './ui';

const GRADE_POINTS: Record<string, number> = {
  'A+': 5.0,
  'A': 4.75,
  'B+': 4.5,
  'B': 4.0,
  'C+': 3.5,
  'C': 3.0,
  'D+': 2.5,
  'D': 2.0,
  'F': 1.0,
};

const GRADES = Object.keys(GRADE_POINTS);

function CustomGradeSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={dropdownRef} className={`relative w-full ${isOpen ? 'z-40' : 'z-10'}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 py-2.5 px-2 sm:px-3 text-center rounded-xl focus:ring-2 focus:ring-stone-100 dark:focus:ring-stone-900 focus:border-[var(--color-imamu-brown)] text-xs sm:text-sm text-slate-900 dark:text-white font-bold outline-none cursor-pointer transition flex items-center justify-between gap-1 shadow-2xs hover:bg-slate-100 dark:hover:bg-zinc-900"
      >
        <span className="truncate flex-1 text-center">
          <span dir="ltr" className="inline-flex items-center gap-1 font-bold">
            <span>{value}</span>
            <span className="text-[11px] font-normal text-slate-500 dark:text-zinc-400">({GRADE_POINTS[value]})</span>
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[var(--color-imamu-accent)] font-bold' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="absolute top-full right-0 mt-1.5 min-w-[155px] w-[125%] bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl py-1 z-50 overflow-hidden max-h-48 overflow-y-auto custom-scrollbar"
          >
            {GRADES.map((g) => {
              const isSelected = g === value;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    onChange(g);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3.5 py-2 text-right text-xs sm:text-sm font-bold flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--color-imamu-brown)]/15 text-[var(--color-imamu-accent)] font-extrabold'
                      : 'text-slate-800 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/80'
                  }`}
                >
                  <span dir="ltr" className="inline-flex items-center gap-1.5 font-bold">
                    <span className="font-extrabold text-sm">{g}</span>
                    <span className="text-[11px] font-normal text-slate-500 dark:text-zinc-400">
                      ({GRADE_POINTS[g]})
                    </span>
                  </span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-[var(--color-imamu-accent)] shrink-0" />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function normalizeArabicDigits(str: string): string {
  if (!str) return '';
  return str
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9')
    .replace(/٫/g, '.');
}

export function GpaCalculator() {
  const { dbUser } = useAuth();
  
  const [courses, setCourses] = useState<Array<{ id: number; name: string; credits: number | string; grade: string }>>([
    { id: 1, name: '', credits: 3, grade: 'A+' }
  ]);

  const [prevGpa, setPrevGpa] = useState<string>('');
  const [prevHours, setPrevHours] = useState<string>('');

  // Course Catalog Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [targetRowId, setTargetRowId] = useState<number | null>(null);

  useEffect(() => {
    if (dbUser) {
      if (dbUser.currentGpa) setPrevGpa(normalizeArabicDigits(dbUser.currentGpa));
      if (dbUser.finishedHours) setPrevHours(normalizeArabicDigits(dbUser.finishedHours.toString()));
    }
  }, [dbUser]);

  // Fetch subjects catalog when search drawer is opened
  useEffect(() => {
    if (isSearchOpen && allSubjects.length === 0) {
      setLoadingSubjects(true);
      fetch('/api/subjects')
        .then(res => res.ok ? res.json() : [])
        .then(data => {
          if (Array.isArray(data)) {
            setAllSubjects(data);
          }
        })
        .catch(err => console.error('Failed to load subjects', err))
        .finally(() => setLoadingSubjects(false));
    }
  }, [isSearchOpen, allSubjects.length]);

  const addCourse = () => {
    setCourses([...courses, { id: Date.now(), name: '', credits: 3, grade: 'A+' }]);
  };

  const removeCourse = (id: number) => {
    if (courses.length > 1) {
      setCourses(courses.filter(c => c.id !== id));
    }
  };

  const updateCourse = (id: number, field: string, value: any) => {
    setCourses(courses.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSelectSubject = (subj: any) => {
    const formattedName = `${subj.code ? subj.code + ' - ' : ''}${subj.name}`;
    const hours = Number(subj.creditHours || subj.hours || 3);

    if (targetRowId !== null) {
      // Update specific target row
      setCourses(courses.map(c => c.id === targetRowId ? { ...c, name: formattedName, credits: hours } : c));
    } else {
      // Check if there is an empty row at the end to populate, else append
      const emptyRow = courses.find(c => !c.name.trim());
      if (emptyRow) {
        setCourses(courses.map(c => c.id === emptyRow.id ? { ...c, name: formattedName, credits: hours } : c));
      } else {
        setCourses([...courses, { id: Date.now(), name: formattedName, credits: hours, grade: 'A+' }]);
      }
    }

    setIsSearchOpen(false);
    setTargetRowId(null);
  };

  const filteredSubjects = useMemo(() => {
    if (!searchQuery.trim()) return allSubjects.slice(0, 30);
    const q = searchQuery.trim().toLowerCase();
    return allSubjects.filter(s => 
      (s.name && s.name.toLowerCase().includes(q)) ||
      (s.code && s.code.toLowerCase().includes(q))
    ).slice(0, 40);
  }, [allSubjects, searchQuery]);

  const calculations = useMemo(() => {
    let semesterPoints = 0;
    let semesterCredits = 0;

    courses.forEach(course => {
      const credits = Number(course.credits) || 0;
      const points = GRADE_POINTS[course.grade] || 0;
      
      semesterCredits += credits;
      semesterPoints += credits * points;
    });

    const semesterGpaValue = semesterCredits > 0 ? (semesterPoints / semesterCredits).toFixed(2) : '0.00';

    let newCumulativeGpa = '0.00';
    const priorHours = Number(prevHours) || 0;
    const priorGpa = Number(prevGpa) || 0;

    if (priorHours > 0 || semesterCredits > 0) {
      const totalPoints = (priorHours * priorGpa) + semesterPoints;
      const totalCredits = priorHours + semesterCredits;
      if (totalCredits > 0) {
        newCumulativeGpa = (totalPoints / totalCredits).toFixed(2);
      }
    }

    return {
      semesterGpa: semesterGpaValue,
      semesterCredits,
      newCumulativeGpa,
      totalCredits: (Number(prevHours) || 0) + semesterCredits,
    };
  }, [courses, prevGpa, prevHours]);

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col md:flex-row relative" dir="rtl">
      
      {/* Course Input Section */}
      <div className="p-6 sm:p-8 flex-1 border-b md:border-b-0 md:border-l border-slate-200/90 dark:border-zinc-800">
        <div className="mb-6">
          <h2 className="text-lg sm:text-xl font-serif font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-600 dark:text-amber-400">
              <Calculator className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span>مواد الفصل الدراسي</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">حساب النقاط بناءً على سلم جامعة الإمام (من 5.00)</p>
        </div>

        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-12 gap-2 text-xs font-bold text-slate-500 dark:text-zinc-400 px-2 uppercase tracking-wider">
            <div className="col-span-6">اسم المادة</div>
            <div className="col-span-2 text-center">الساعات</div>
            <div className="col-span-3 text-center">التقدير</div>
            <div className="col-span-1"></div>
          </div>
          
          <AnimatePresence>
            {courses.map((course, i) => (
              <motion.div 
                key={course.id}
                layout="position"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="grid grid-cols-12 gap-2 items-center"
              >
                <div className="col-span-6">
                  <input
                    type="text"
                    placeholder={`مادة ${i + 1}`}
                    value={course.name}
                    onChange={e => updateCourse(course.id, 'name', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 py-2.5 px-3.5 rounded-xl focus:ring-2 focus:ring-stone-100 dark:focus:ring-stone-900 focus:border-[var(--color-imamu-brown)] text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="3"
                    value={course.credits === '' ? '' : course.credits}
                    onChange={e => {
                      const norm = normalizeArabicDigits(e.target.value).replace(/[^0-9]/g, '');
                      updateCourse(course.id, 'credits', norm === '' ? '' : Math.min(10, Number(norm)));
                    }}
                    className={`w-full bg-slate-50 dark:bg-zinc-950 border py-2.5 px-1 sm:px-2 text-center rounded-xl text-xs sm:text-sm font-bold outline-none transition ${
                      (course.credits === '' || Number(course.credits) <= 0)
                        ? 'border-red-500 dark:border-red-500/80 focus:ring-2 focus:ring-red-500/30'
                        : 'border-slate-300 dark:border-zinc-800 focus:ring-2 focus:ring-stone-100 dark:focus:ring-stone-900 focus:border-[var(--color-imamu-brown)] text-slate-900 dark:text-white'
                    }`}
                  />
                </div>
                <div className="col-span-3">
                  <CustomGradeSelect
                    value={course.grade}
                    onChange={val => updateCourse(course.id, 'grade', val)}
                  />
                </div>
                <div className="col-span-1 flex justify-center">
                  <button 
                    onClick={() => removeCourse(course.id)}
                    disabled={courses.length <= 1}
                    className="p-2 text-slate-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                    title="حذف المادة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button 
            onClick={addCourse}
            className="btn-rise flex-1 w-full flex items-center justify-center gap-1.5 py-3 bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200 font-bold text-xs rounded-2xl border border-slate-300 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 transition cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4 text-slate-600 dark:text-zinc-300" />
            <span>إضافة مادة جديدة</span>
          </button>
          <button
            onClick={() => {
              setTargetRowId(null);
              setIsSearchOpen(true);
            }}
            className="btn-rise flex-1 w-full flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white border border-[var(--color-imamu-brown-dark)] font-bold text-xs transition cursor-pointer shadow-sm"
          >
            <Search className="w-4 h-4 text-white" />
            <span>البحث واختيار مقرر من الكتالوج</span>
          </button>
        </div>
      </div>

      {/* Results Sidebar */}
      <div className="p-6 sm:p-8 w-full md:w-80 bg-slate-50/80 dark:bg-zinc-950/80 flex flex-col items-center justify-between flex-shrink-0 relative overflow-hidden">
        <div className="w-full">
          {/* Prior GPA Settings */}
          <div className="w-full mb-6 pb-6 border-b border-slate-200 dark:border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-imamu-accent)] mb-3.5 flex items-center justify-center gap-1.5">
              <Award className="w-4 h-4 text-[var(--color-imamu-accent)]" /> السجل الأكاديمي السابق
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">المعدل السابق</label>
                <input 
                  type="text"
                  inputMode="decimal"
                  placeholder="4.50"
                  value={prevGpa}
                  onChange={e => {
                    const norm = normalizeArabicDigits(e.target.value).replace(/[^0-9.]/g, '');
                    setPrevGpa(norm);
                  }}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 py-2 px-3 text-center rounded-xl text-sm text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-stone-100 dark:focus:ring-stone-900 focus:border-[var(--color-imamu-brown)]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">الساعات المجتازة</label>
                <input 
                  type="text"
                  inputMode="numeric"
                  placeholder="85"
                  value={prevHours}
                  onChange={e => {
                    const norm = normalizeArabicDigits(e.target.value).replace(/[^0-9]/g, '');
                    setPrevHours(norm);
                  }}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 py-2 px-3 text-center rounded-xl text-sm text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-stone-100 dark:focus:ring-stone-900 focus:border-[var(--color-imamu-brown)]"
                />
              </div>
            </div>
            {!dbUser && <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2 text-center">سجل الدخول لحفظ بياناتك تلقائياً.</p>}
          </div>

          {/* Results Display */}
          <div className="text-center w-full py-2">
            <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1">المعدل الفصلي</h3>
            <div className="text-4xl sm:text-5xl font-serif font-black text-[var(--color-imamu-accent)] mb-1 tracking-tight">
              <AnimatedNumber
                value={parseFloat(calculations.semesterGpa)}
                format={(val) => val.toFixed(2)}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-medium tracking-wide mb-6">
              من أصل <span className="text-slate-900 dark:text-white font-bold">{calculations.semesterCredits}</span> ساعات
            </p>

            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xs">
              <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1">المعدل التراكمي المتوقع</h3>
              <div className="text-2xl sm:text-3xl font-serif font-black text-slate-900 dark:text-white mb-1">
                <AnimatedNumber
                  value={parseFloat(Number(prevHours) > 0 ? calculations.newCumulativeGpa : calculations.semesterGpa)}
                  format={(val) => val.toFixed(2)}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                إجمالي <span className="text-[var(--color-imamu-accent)] font-bold">{calculations.totalCredits}</span> ساعة أكاديمية
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-over Course Catalog Search Drawer (animates from middle to left) */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden flex justify-start">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSearchOpen(false)}
              className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs"
            />

            {/* Slide Panel */}
            <motion.div
              initial={{ x: '50%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '50%', opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative z-10 w-full max-w-md bg-white dark:bg-zinc-900 h-full shadow-2xl flex flex-col border-r border-slate-200 dark:border-zinc-800"
              dir="rtl"
            >
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[var(--color-imamu-brown)]/15 text-[var(--color-imamu-accent)] border border-[var(--color-imamu-brown)]/30 flex items-center justify-center font-bold">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">دليل المقررات الأكاديمية</h3>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400">اختر مادة لإدراج الاسم وعدد الساعات تلقائياً</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Search Box */}
              <div className="p-4 border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    autoFocus
                    placeholder="ابحث بالاسم أو الرمز (مثال: عال 111، تفاضل، فيز، سلم)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pr-10 pl-8 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-[var(--color-imamu-brown)] transition"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Results List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2.5">
                {loadingSubjects ? (
                  <div className="py-16 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-[var(--color-imamu-accent)] border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري تحميل المقررات...</span>
                  </div>
                ) : filteredSubjects.length === 0 ? (
                  <div className="py-16 text-center text-xs text-slate-400 italic">
                    {searchQuery ? 'لا توجد مقررات تطابق البحث' : 'اكتب اسم المادة أو رمزها للبحث'}
                  </div>
                ) : (
                  filteredSubjects.map((subj) => (
                    <button
                      key={subj.id}
                      onClick={() => handleSelectSubject(subj)}
                      className="w-full p-3.5 rounded-2xl bg-slate-50 hover:bg-[var(--color-imamu-brown)]/10 dark:bg-zinc-950/80 dark:hover:bg-[var(--color-imamu-brown)]/15 border border-slate-200 dark:border-zinc-800 hover:border-[var(--color-imamu-accent)] text-right transition flex items-center justify-between group cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-[var(--color-imamu-accent)] transition">
                            {subj.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                          {subj.code && <span className="font-mono bg-slate-200/60 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-[10px]">{subj.code}</span>}
                          {subj.level && <span>المستوى {subj.level}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="px-2.5 py-1 rounded-xl bg-[var(--color-imamu-brown)]/15 text-[var(--color-imamu-accent)] font-bold text-xs border border-[var(--color-imamu-brown)]/30">
                          {subj.creditHours || subj.hours || 3} ساعات
                        </span>
                        <Plus className="w-4 h-4 text-[var(--color-imamu-accent)] group-hover:scale-110 transition" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
