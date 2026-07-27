'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';
import { BookOpen, Search, Download, ExternalLink, Filter, Folder, FileText, CheckCircle2, MessageCircle, Info } from 'lucide-react';
import { InView, SpotlightCard } from '../components/ui';
import { CourseDetailsModal } from '../components/CourseDetailsModal';

interface Resource {
  id: number;
  title: string;
  courseCode: string;
  courseName: string;
  major: string;
  type: string;
  fileUrl: string;
  driveUrl?: string;
  whatsappUrl?: string;
  telegramUrl?: string;
  createdAt: string;
}

export function Resources() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [resources, setResources] = useState<Resource[]>([]);
  const [majors, setMajors] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string | number | null>(null);


  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    const token = localStorage.getItem('token');
    fetch('/api/resources', {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => {
        if (res.status === 401) {
          router.push('/login');
          return [];
        }
        if (!res.ok) return [];
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return res.json();
        }
        return [];
      })
      .then(data => {
        if (Array.isArray(data)) {
          setResources(data);
          const uniqueMajors = Array.from(new Set(data.map((r: Resource) => r.major).filter(Boolean))) as string[];
          setMajors(uniqueMajors);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load resources:', err);
        setLoading(false);
      });
  }, [authLoading, user, router]);

  const filteredResources = resources.filter(r => {
    const matchesSearch = 
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.courseCode.toLowerCase().includes(search.toLowerCase()) ||
      r.courseName.toLowerCase().includes(search.toLowerCase());
    
    const matchesMajor = selectedMajor === 'all' || r.major === selectedMajor;
    const matchesType = selectedType === 'all' || r.type === selectedType;

    return matchesSearch && matchesMajor && matchesType;
  });

  return (
    <div className="flex flex-col flex-1 w-full pb-24 px-4 sm:px-6 lg:px-8 pt-8 relative max-w-7xl mx-auto min-h-screen text-right" dir="rtl">
      
      {/* Header */}
      <div className="mb-8 relative z-10">
        <span className="text-xs sm:text-sm font-semibold tracking-widest text-blue-600 dark:text-blue-400 uppercase mb-2 block">
          المكتبة الأكاديمية الرقمية
        </span>
        <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-slate-900 dark:text-white mb-2">المصادر والتجميعات الطلابية</h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl">
          اختبارات سابقة، ملخصات، وروابط المجموعات الطلابية مرتبة حسب المواد والتخصصات.
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-2xs mb-8 flex flex-col md:flex-row gap-4">
        
        {/* Search Input */}
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
            <Search className="w-4.5 h-4.5 text-slate-400 dark:text-zinc-500" />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث برمز المادة أو اسمها..."
            className="w-full pr-11 pl-4 py-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-600 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500"
          />
        </div>

        {/* Major Select */}
        <div className="w-full md:w-56">
          <select
            value={selectedMajor}
            onChange={e => setSelectedMajor(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
          >
            <option value="all">جميع التخصصات</option>
            {majors.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {/* Type Select */}
        <div className="w-full md:w-48">
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900"
          >
            <option value="all">جميع أنواع الملفات</option>
            <option value="exam">اختبارات سابقة</option>
            <option value="summary">ملخصات ودراسات</option>
            <option value="group">مجموعات التواصل</option>
          </select>
        </div>
      </div>

      {/* Resources Grid */}
      <InView preset="fade-up" delay={0.1} className="w-full">
        {loading ? (
          <div className="text-center py-20 text-xs text-slate-400 dark:text-zinc-500 font-medium">جاري تحميل المصادر...</div>
        ) : filteredResources.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center gap-3 text-slate-500 dark:text-zinc-400">
            <BookOpen className="w-10 h-10 text-slate-300 dark:text-zinc-600" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">لم يتم العثور على مصادر تطابق البحث.</h3>
            <p className="text-xs max-w-xs leading-relaxed">تأكد من رمز المادة أو حدد جميع التخصصات لعرض كافة المصادر.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((item) => (
              <SpotlightCard
                key={item.id}
                className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                      {item.courseCode}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">{item.major}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5 leading-snug">
                    {item.title}
                  </h3>
                  
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6 line-clamp-2 leading-relaxed">
                    {item.courseName}
                  </p>
                </div>

                {/* Resource Links */}
                <div className="flex flex-wrap gap-2 border-t border-slate-100 dark:border-zinc-800 pt-4 mt-auto">
                  <button
                    onClick={() => setSelectedCourse(item.courseCode || item.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 text-xs font-bold transition"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>تفاصيل المادة</span>
                  </button>

                  {item.driveUrl && (
                    <a
                      href={item.driveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 text-xs font-bold transition"
                    >
                      <Folder className="w-3.5 h-3.5" />
                      <span>Drive</span>
                    </a>
                  )}

                  {item.whatsappUrl && (
                    <a
                      href={item.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 text-xs font-bold transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>واتساب</span>
                    </a>
                  )}
                </div>
              </SpotlightCard>
            ))}
          </div>
        )}
      </InView>

      <CourseDetailsModal 
        isOpen={!!selectedCourse} 
        onClose={() => setSelectedCourse(null)} 
        courseIdOrCode={selectedCourse} 
      />
    </div>
  );
}

