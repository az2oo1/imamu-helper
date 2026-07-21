'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../lib/AuthContext';
import { Plus, Trash2, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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

  // Load from dbUser context into local state to allow override
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
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col md:flex-row">
      <div className="p-8 flex-1 border-b md:border-b-0 md:border-r border-gray-100">
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-display font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[var(--color-imamu-blue)]" />
              مواد الفصل الدراسي
            </h2>
            <p className="text-sm text-gray-500">حساب النقاط بناءً على مقياس جامعة الإمام 5.0.</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-12 gap-3 text-sm font-medium text-gray-500 px-1">
            <div className="col-span-5">اسم المادة</div>
            <div className="col-span-3 text-center">ساعات</div>
            <div className="col-span-3 text-center">التقدير</div>
            <div className="col-span-1"></div>
          </div>
          
          <AnimatePresence>
            {courses.map((course, i) => (
              <motion.div 
                key={course.id}
                initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-12 gap-3 items-center relative"
              >
                <div className="col-span-5">
                  <input
                    type="text"
                    placeholder={`المادة ${i + 1}`}
                    value={course.name}
                    onChange={e => updateCourse(course.id, 'name', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 py-2.5 px-3 rounded-xl focus:ring-2 focus:ring-[var(--color-imamu-blue)] focus:ring-inset outline-none text-sm transition"
                  />
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={course.credits}
                    onChange={e => updateCourse(course.id, 'credits', Number(e.target.value))}
                    className="w-full bg-gray-50 border border-gray-200 py-2.5 px-3 text-center rounded-xl focus:ring-2 focus:ring-[var(--color-imamu-blue)] focus:ring-inset outline-none text-sm transition"
                  />
                </div>
                <div className="col-span-3">
                  <select
                    value={course.grade}
                    onChange={e => updateCourse(course.id, 'grade', e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 py-2.5 px-1 sm:px-3 text-center rounded-xl focus:ring-2 focus:ring-[var(--color-imamu-blue)] focus:ring-inset outline-none text-sm transition appearance-none cursor-pointer"
                  >
                    {GRADES.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button 
                    onClick={() => removeCourse(course.id)}
                    disabled={courses.length <= 1}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gray-400"
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
          className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 text-gray-700 hover:bg-gray-100 font-medium rounded-xl border border-gray-200 border-dashed transition"
        >
          <Plus className="w-4 h-4" /> إضافة مادة
        </button>
      </div>

      <div className="p-8 w-full md:w-72 bg-gray-50/50 flex flex-col items-center justify-center flex-shrink-0 relative overflow-hidden">
        {/* Prior GPA Settings */}
        <div className="w-full mb-8 pt-4 border-b border-gray-200/60 pb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4 text-center">السجل الأكاديمي السابق</h3>
          <div className="grid grid-cols-2 gap-3">
             <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">المعدل السابق</label>
              <input 
                type="number" step="0.01" min="0" max="5.0" placeholder="مثال 4.5"
                value={prevGpa} onChange={e => setPrevGpa(e.target.value)}
                className="w-full bg-white border border-gray-200 py-2 px-3 text-center rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--color-imamu-blue)]"
              />
            </div>
            <div>
               <label className="block text-xs font-medium text-gray-600 mb-1">الساعات المجتازة</label>
              <input 
                type="number" min="0" placeholder="مثال 85"
                value={prevHours} onChange={e => setPrevHours(e.target.value)}
                className="w-full bg-white border border-gray-200 py-2 px-3 text-center rounded-lg text-sm outline-none focus:ring-1 focus:ring-[var(--color-imamu-blue)]"
              />
            </div>
          </div>
          {!dbUser && <p className="text-[10px] text-gray-400 mt-2 text-center">سجل الدخول لحفظ هذا تلقائياً.</p>}
        </div>

        {/* Results */}
        <div className="text-center w-full">
          <h3 className="text-sm font-medium text-gray-500 mb-1">المعدل الفصلي</h3>
          <div className="text-5xl font-display font-bold text-[var(--color-imamu-blue)] mb-2">
            {calculations.semesterGpa}
          </div>
          <p className="text-xs text-gray-400 font-medium tracking-wide mb-6" dir="rtl">
            من {calculations.semesterCredits} ساعات
          </p>

          <h3 className="text-sm font-medium text-gray-500 mb-1">المعدل التراكمي الجديد</h3>
          <div className="text-3xl font-display font-bold text-gray-900 mb-1">
            {Number(prevHours) > 0 ? calculations.newCumulativeGpa : calculations.semesterGpa}
          </div>
          <p className="text-xs text-gray-400 font-medium tracking-wide" dir="rtl">
            إجمالي {calculations.totalCredits} ساعات
          </p>
        </div>
      </div>
    </div>
  );
}
