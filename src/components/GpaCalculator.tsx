'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Plus, Trash2, Calculator, Award } from 'lucide-react';
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

export function GpaCalculator() {
  const { dbUser } = useAuth();
  
  const [courses, setCourses] = useState([
    { id: 1, name: '', credits: 3, grade: 'A+' }
  ]);

  const [prevGpa, setPrevGpa] = useState<string>('');
  const [prevHours, setPrevHours] = useState<string>('');

  useEffect(() => {
    if (dbUser) {
      if (dbUser.currentGpa) setPrevGpa(dbUser.currentGpa);
      if (dbUser.finishedHours) setPrevHours(dbUser.finishedHours.toString());
    }
  }, [dbUser]);

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
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200/90 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col md:flex-row" dir="rtl">
      
      {/* Course Input Section */}
      <div className="p-6 sm:p-8 flex-1 border-b md:border-b-0 md:border-l border-slate-200/90 dark:border-zinc-800">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-lg sm:text-xl font-display font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 rounded-xl text-blue-600 dark:text-blue-400">
                <Calculator className="w-5 h-5" />
              </div>
              <span>مواد الفصل الدراسي</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 mt-1">حساب النقاط بناءً على سلم جامعة الإمام (من 5.00)</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-12 gap-3 text-xs font-bold text-slate-500 dark:text-zinc-400 px-2 uppercase tracking-wider">
            <div className="col-span-5">اسم المادة</div>
            <div className="col-span-3 text-center">الساعات</div>
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
                className="grid grid-cols-12 gap-2.5 items-center overflow-hidden"
              >
                <div className="col-span-5">
                  <input
                    type="text"
                    placeholder={`مادة ${i + 1}`}
                    value={course.name}
                    onChange={e => updateCourse(course.id, 'name', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 py-2.5 px-3.5 rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-600 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={course.credits}
                    onChange={e => updateCourse(course.id, 'credits', Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 py-2.5 px-3 text-center rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-600 text-xs sm:text-sm text-slate-900 dark:text-white font-bold outline-none transition"
                  />
                </div>
                <div className="col-span-3">
                  <select
                    value={course.grade}
                    onChange={e => updateCourse(course.id, 'grade', e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 py-2.5 px-2 sm:px-3 text-center rounded-xl focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-600 text-xs sm:text-sm text-slate-900 dark:text-white font-bold outline-none cursor-pointer transition"
                  >
                    {GRADES.map(g => (
                      <option key={g} value={g} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">{g} ({GRADE_POINTS[g]})</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1 flex justify-center">
                  <button 
                    onClick={() => removeCourse(course.id)}
                    disabled={courses.length <= 1}
                    className="p-2 text-slate-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition disabled:opacity-30 disabled:hover:bg-transparent"
                    title="حذف المادة"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <button 
          onClick={addCourse}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-50/50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-bold text-xs rounded-2xl border border-dashed border-blue-200 dark:border-blue-900/60 transition active:scale-[0.99]"
        >
          <Plus className="w-4 h-4" /> إضافة مادة جديدة
        </button>
      </div>

      {/* Results Sidebar */}
      <div className="p-6 sm:p-8 w-full md:w-80 bg-slate-50/80 dark:bg-zinc-950/80 flex flex-col items-center justify-between flex-shrink-0 relative overflow-hidden">
        <div className="w-full">
          {/* Prior GPA Settings */}
          <div className="w-full mb-6 pb-6 border-b border-slate-200 dark:border-zinc-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-3.5 flex items-center justify-center gap-1.5">
              <Award className="w-4 h-4 text-blue-600 dark:text-blue-400" /> السجل الأكاديمي السابق
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">المعدل السابق</label>
                <input 
                  type="number" step="0.01" min="0" max="5.0" placeholder="4.50"
                  value={prevGpa} onChange={e => setPrevGpa(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 py-2 px-3 text-center rounded-xl text-sm text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-zinc-400 mb-1">الساعات المجتازة</label>
                <input 
                  type="number" min="0" placeholder="85"
                  value={prevHours} onChange={e => setPrevHours(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 py-2 px-3 text-center rounded-xl text-sm text-slate-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-600"
                />
              </div>
            </div>
            {!dbUser && <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-2 text-center">سجل الدخول لحفظ بياناتك تلقائياً.</p>}
          </div>

          {/* Results Display */}
          <div className="text-center w-full py-2">
            <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 mb-1">المعدل الفصلي</h3>
            <div className="text-4xl sm:text-5xl font-display font-black text-blue-600 dark:text-blue-400 mb-1 tracking-tight">
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
              <div className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white mb-1">
                <AnimatedNumber
                  value={parseFloat(Number(prevHours) > 0 ? calculations.newCumulativeGpa : calculations.semesterGpa)}
                  format={(val) => val.toFixed(2)}
                />
              </div>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                إجمالي <span className="text-blue-600 dark:text-blue-400 font-bold">{calculations.totalCredits}</span> ساعة أكاديمية
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
