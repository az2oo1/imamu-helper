'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';
import { BookOpen, Search, ExternalLink, Folder, Plus, Trash2, Pencil, Info, MessageCircle, ChevronDown } from 'lucide-react';
import { InView, SpotlightCard } from '../components/ui';
import { CourseDetailsModal } from '../components/CourseDetailsModal';
import CreateResourceModal from '../components/CreateResourceModal';

interface Resource {
  id: number;
  subjectId?: number;
  title: string;
  courseCode: string;
  courseName: string;
  major: string;
  type: string;
  boxLink?: string;
  whatsappUrl?: string;
  whatsappLink?: string;
  freeResourcesUrl?: string;
  paidResourcesUrl?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  description?: string;
  createdAt: string;
}

interface DriveLinkItem {
  title: string;
  url: string;
}

export function parseDriveLinks(rawVal?: string | null): DriveLinkItem[] {
  if (!rawVal || !rawVal.trim()) return [];
  const text = rawVal.trim();

  // Try JSON Array Format
  if (text.startsWith('[') && text.endsWith(']')) {
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item: any, idx: number) => ({
            title: item.title || item.name || `رابط مصادر ${idx + 1}`,
            url: item.url || item.link || ''
          }))
          .filter(item => Boolean(item.url));
      }
    } catch (_e) {}
  }

  // Try Markdown Format [title](url)
  const links: DriveLinkItem[] = [];
  const mdRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = mdRegex.exec(text)) !== null) {
    links.push({ title: match[1], url: match[2] });
  }
  if (links.length > 0) return links;

  // Split plain URLs by newline or comma
  const plainUrls = text.split(/[\n,;]+/).map(s => s.trim()).filter(s => s.startsWith('http'));
  if (plainUrls.length > 0) {
    return plainUrls.map((url, i) => ({
      title: plainUrls.length === 1 ? 'Box / Drive' : `رابط درايف ${i + 1}`,
      url
    }));
  }

  return [{ title: 'Box / Drive', url: text }];
}

function DriveLinkButton({ boxLink, freeResourcesUrl }: { boxLink?: string; freeResourcesUrl?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const links = React.useMemo(() => {
    const combined = [
      ...parseDriveLinks(boxLink),
      ...parseDriveLinks(freeResourcesUrl)
    ];
    const uniqueMap = new Map<string, DriveLinkItem>();
    combined.forEach(l => {
      if (l.url && !uniqueMap.has(l.url)) {
        uniqueMap.set(l.url, l);
      }
    });
    return Array.from(uniqueMap.values());
  }, [boxLink, freeResourcesUrl]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  if (links.length === 0) return null;

  // Single link -> direct click opens URL
  if (links.length === 1) {
    return (
      <a
        href={links[0].url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 text-xs font-bold transition"
      >
        <Folder className="w-3.5 h-3.5 text-blue-500" />
        <span>{links[0].title || 'Box / Drive'}</span>
      </a>
    );
  }

  // Multiple links -> dropdown popup menu
  return (
    <div className="relative inline-block text-right" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 text-xs font-bold transition cursor-pointer shadow-sm"
      >
        <Folder className="w-3.5 h-3.5" />
        <span>روابط درايف ({links.length})</span>
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 bottom-full mb-2 w-56 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 py-1.5"
          dir="rtl"
        >
          <div className="px-3 py-1.5 border-b border-slate-100 dark:border-zinc-800 text-[11px] font-bold text-slate-400 dark:text-zinc-500">
            اختر رابط المصدر ({links.length}):
          </div>
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800/50">
            {links.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex items-center justify-between px-3.5 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-xs font-semibold text-slate-800 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 transition"
              >
                <div className="flex items-center gap-2 truncate">
                  <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span className="truncate">{link.title}</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 opacity-70" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function Resources() {
  const router = useRouter();
  const { user, dbUser, loading: authLoading, logout, signOut } = useAuth();
  const isAdmin = !!(dbUser?.isAdmin || dbUser?.role === 'ADMIN');
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [majors, setMajors] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string | number | null>(null);

  // Admin Resource Wizard Form State
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false);
  const [resourceForm, setResourceForm] = useState<any>({
    title: '',
    type: 'course_hub',
    url: '',
    boxLink: '',
    whatsappLink: '',
    freeResourcesUrl: '',
    paidResourcesUrl: '',
    avatarUrl: '',
    bannerUrl: '',
    description: ''
  });

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    const token = localStorage.getItem('token');
    const headers: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {};

    Promise.all([
      fetch('/api/subjects', { headers }).then(res => res.ok ? res.json() : []),
      fetch('/api/resources', { headers }).then(async res => {
        if (res.status === 401) {
          if (logout) await logout();
          else if (signOut) await signOut();
          else {
            localStorage.removeItem('token');
            localStorage.removeItem('user_uid');
            localStorage.removeItem('user_email');
          }
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
    ]).then(([subData, resData]) => {
      if (Array.isArray(subData)) setSubjects(subData);
      if (Array.isArray(resData)) {
        setResources(resData);
        const uniqueMajors = Array.from(new Set(resData.map((r: Resource) => r.major).filter(Boolean))) as string[];
        setMajors(uniqueMajors);
      }
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load resources:', err);
      setLoading(false);
    });
  }, [authLoading, user, router, logout, signOut]);

  const handleDeleteResource = async (id: number) => {
    if (!isAdmin) return;
    if (!window.confirm('هل أنت متأكد من حذف هذا المصدر؟')) return;
    const token = user ? await user.getIdToken() : localStorage.getItem('token');
    try {
      const res = await fetch(`/api/admin/resources/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setResources(prev => prev.filter(r => r.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete resource', err);
    }
  };

  const handleSaveResource = async () => {
    if (!isAdmin) {
      alert('إضافة وتعديل المصادر متاحة فقط لحسابات المدراء والأدمن');
      return false;
    }
    if (!resourceForm.subjectId && !resourceForm.title?.trim()) {
      alert('الرجاء اختيار المادة الأكاديمية أو إدخال عنوان المصدر');
      return false;
    }
    const token = user ? await user.getIdToken() : localStorage.getItem('token');
    const selectedSubj = subjects.find(s => s.id === resourceForm.subjectId);
    const cleanName = selectedSubj ? selectedSubj.name.replace(/\s*\(([^)]+)\)/g, (match: string, p1: string) => {
      const mainText = selectedSubj.name.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
      const innerText = p1.trim().toLowerCase();
      return (mainText.includes(innerText) || innerText.includes(mainText)) ? '' : match;
    }).trim() : '';
    const finalTitle = resourceForm.title?.trim() || (selectedSubj ? `مصادر مادة ${selectedSubj.code} - ${cleanName || selectedSubj.name}` : 'باقة مصادر مادة');
    const payload = { ...resourceForm, title: finalTitle };

    const url = resourceForm.id ? `/api/admin/resources/${resourceForm.id}` : '/api/admin/resources';
    const method = resourceForm.id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const fetchRes = await fetch('/api/resources', {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        if (fetchRes.ok) {
          const data = await fetchRes.json();
          if (Array.isArray(data)) setResources(data);
        }
        setIsAddResourceOpen(false);
        setResourceForm({ title: '', type: 'course_hub', url: '', description: '', boxLink: '', whatsappLink: '', freeResourcesUrl: '', paidResourcesUrl: '', avatarUrl: '', bannerUrl: '' });
        return true;
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || err.message || 'فشل حفظ المصدر');
        return false;
      }
    } catch (err) {
      console.error('Failed to save resource', err);
      alert('حدث خطأ في الاتصال أثناء حفظ المصدر');
      return false;
    }
  };

  const openEditModal = (r: Resource) => {
    if (!isAdmin) return;
    setResourceForm({
      id: r.id,
      subjectId: r.subjectId,
      title: r.title || '',
      type: r.type || 'course_hub',
      url: r.boxLink || r.whatsappLink || r.whatsappUrl || '',
      boxLink: r.boxLink || '',
      whatsappLink: r.whatsappLink || r.whatsappUrl || '',
      freeResourcesUrl: r.freeResourcesUrl || '',
      paidResourcesUrl: r.paidResourcesUrl || '',
      avatarUrl: r.avatarUrl || '',
      bannerUrl: r.bannerUrl || '',
      description: r.description || ''
    });
    setIsAddResourceOpen(true);
  };

  const filteredResources = resources.filter(r => {
    const matchesSearch = 
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.courseCode.toLowerCase().includes(search.toLowerCase()) ||
      r.courseName.toLowerCase().includes(search.toLowerCase());
    
    const matchesMajor = selectedMajor === 'all' || 
      r.major === selectedMajor || 
      (r.major && r.major.includes(selectedMajor)) ||
      (Array.isArray((r as any).majors) && (r as any).majors.includes(selectedMajor));
    const matchesType = selectedType === 'all' || r.type === selectedType;

    return matchesSearch && matchesMajor && matchesType;
  });

  return (
    <div className="flex flex-col flex-1 w-full pb-24 px-4 sm:px-6 lg:px-8 pt-8 relative max-w-7xl mx-auto min-h-screen text-right" dir="rtl">
      
      {/* Header */}
      <div className="mb-8 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs sm:text-sm font-semibold tracking-widest text-blue-600 dark:text-blue-400 uppercase mb-2 block">
            المكتبة الأكاديمية الرقمية
          </span>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-slate-900 dark:text-white mb-2">المصادر والتجميعات الطلابية</h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl">
            اختبارات سابقة، ملخصات، وروابط المجموعات الطلابية مرتبة حسب المواد والتخصصات.
          </p>
        </div>

        {/* Admin Add Resource Button */}
        {isAdmin && (
          <button
            onClick={() => setIsAddResourceOpen(true)}
            className="btn-rise flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-600/20 cursor-pointer shrink-0 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة مصدر جديد</span>
          </button>
        )}
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
                className="border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50">
                      {item.courseCode}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">{item.major}</span>
                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(item)}
                            className="p-1 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition cursor-pointer"
                            title="تعديل هذا المصدر"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteResource(item.id)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition cursor-pointer"
                            title="حذف هذا المصدر"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
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
                    onClick={() => setSelectedCourse(item.subjectId || item.courseCode || item.id)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 text-xs font-bold transition"
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>تفاصيل المادة</span>
                  </button>

                  <DriveLinkButton boxLink={item.boxLink} freeResourcesUrl={item.freeResourcesUrl} />

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

      {/* Unified 4-Step Resource Package Wizard Modal */}
      <CreateResourceModal
        isOpen={isAddResourceOpen}
        onClose={() => setIsAddResourceOpen(false)}
        resourceForm={resourceForm}
        setResourceForm={setResourceForm}
        subjects={subjects}
        onSave={handleSaveResource}
      />
    </div>
  );
}


