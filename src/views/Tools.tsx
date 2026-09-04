'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calculator, FileText, ChevronLeft, Wrench, Plus, Edit2, Trash2, X, Sparkles, Globe, Link as LinkIcon 
} from 'lucide-react';
import Link from 'next/link';
import { InView, SpotlightCard } from '../components/ui';
import { useAuth } from '../lib/AuthContext';

interface ApiTool {
  id: number | string;
  title?: string;
  name?: string;
  description?: string;
  category?: string;
  link: string;
  icon?: string;
}

interface ToolItem {
  id: string;
  rawId?: number | string;
  name: string;
  title: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  iconName?: string;
  link: string;
  isStatic: boolean;
}

function renderToolIcon(iconName?: string | React.ReactNode) {
  if (React.isValidElement(iconName)) return iconName;
  switch (iconName) {
    case 'Calculator':
      return <Calculator className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
    case 'FileText':
      return <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    case 'Sparkles':
      return <Sparkles className="w-5 h-5 text-violet-600 dark:text-violet-400" />;
    case 'Globe':
      return <Globe className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />;
    case 'Link':
      return <LinkIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    default:
      return <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
  }
}

export function Tools() {
  const { user, dbUser } = useAuth();
  const isAdmin = !!(dbUser?.isAdmin || dbUser?.role === 'ADMIN');

  const [dynamicTools, setDynamicTools] = useState<ApiTool[]>([]);

  // Modal & form states for Admin CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ApiTool | null>(null);
  const [toolForm, setToolForm] = useState({
    title: '',
    description: '',
    link: '',
    category: 'خدمات إضافية',
    icon: 'Wrench'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchDynamicTools = useCallback(async () => {
    try {
      const res = await fetch('/api/tools');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDynamicTools(data);
      }
    } catch (err) {
      console.error('Failed to load tools:', err);
    }
  }, []);

  useEffect(() => {
    fetchDynamicTools();
  }, [fetchDynamicTools]);

  const defaultTools: ToolItem[] = [
    {
      id: "gpa",
      name: "حاسبة المعدل والتوقعات",
      title: "حاسبة المعدل والتوقعات",
      description: "حساب دقيق للمعدل الفصلي والتراكمي وفق سلم جامعة الإمام، ومعاينة التوقعات المستقبلية.",
      category: "الحسابات الأكاديمية",
      icon: <Calculator className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      link: "/tools/gpa",
      isStatic: true
    },
    {
      id: "plans",
      name: "الخطط الدراسية",
      title: "الخطط الدراسية",
      description: "تصفح وتحميل الخطط الدراسية الرسمية والمستندات لكافة تخصصات الكليات.",
      category: "التخطيط والتسجيل",
      icon: <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      link: "/tools/plans",
      isStatic: true
    }
  ];

  const openAddModal = () => {
    setEditingTool(null);
    setToolForm({
      title: '',
      description: '',
      link: '',
      category: 'خدمات إضافية',
      icon: 'Wrench'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (tool: any) => {
    setEditingTool(tool);
    setToolForm({
      title: tool.title || tool.name || '',
      description: tool.description || '',
      link: tool.link || '',
      category: tool.category || 'خدمات إضافية',
      icon: tool.icon || 'Wrench'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveTool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!toolForm.title.trim() || !toolForm.link.trim()) {
      setFormError('عنوان الأداة والرابط مطلوبان');
      return;
    }

    setIsSubmitting(true);
    setFormError('');
    try {
      const token = user ? await user.getIdToken() : '';
      const url = editingTool?.id ? `/api/admin/tools/${editingTool.id}` : '/api/admin/tools';
      const method = editingTool?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(toolForm)
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchDynamicTools();
      } else {
        const err = await res.json().catch(() => ({}));
        setFormError(err.error || err.message || 'فشلت العملية');
      }
    } catch (err) {
      console.error(err);
      setFormError('حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTool = async (id: number | string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الأداة؟')) return;
    try {
      const token = user ? await user.getIdToken() : '';
      const res = await fetch(`/api/admin/tools/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.ok) {
        fetchDynamicTools();
      } else {
        alert('فشل حذف الأداة');
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ في الاتصال بالخادم');
    }
  };

  const allTools: ToolItem[] = [
    ...defaultTools,
    ...dynamicTools.map(dt => ({
      id: String(dt.id),
      rawId: dt.id,
      name: dt.title || dt.name || 'أداة جديدة',
      title: dt.title || dt.name || 'أداة جديدة',
      description: dt.description || 'أداة أكاديمية مخصصة للطلاب.',
      category: dt.category || 'خدمات إضافية',
      icon: renderToolIcon(dt.icon),
      iconName: dt.icon,
      link: dt.link,
      isStatic: false
    }))
  ];

  return (
    <div className="flex flex-col flex-1 w-full max-w-5xl mx-auto pb-24 px-4 sm:px-6 pt-8 text-right" dir="rtl">
      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-semibold tracking-widest text-[var(--color-imamu-accent)] uppercase mb-1.5 block">
          الأدوات الأكاديمية
        </span>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold tracking-tight text-slate-900 dark:text-white mb-2">
          الأدوات والخدمات الطلابية
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-lg">
          أدوات وحاسبات منظمة مخصصة لتسهيل تجربتك الأكاديمية بجامعة الإمام.
        </p>
      </div>

      {/* Grid */}
      <InView preset="fade-up" className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allTools.map(tool => {
            const isExternal = tool.link.startsWith('http');
            return (
              <div key={tool.id} className="relative group">
                <Link 
                  href={tool.link}
                  target={isExternal ? '_blank' : '_self'}
                  className="block h-full"
                >
                  <SpotlightCard className="h-full border border-slate-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/90 backdrop-blur-xl p-5 transition-all duration-250 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-3.5">
                        <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center group-hover:scale-105 transition-transform">
                          {tool.icon}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-500 dark:text-zinc-400">
                            {tool.category}
                          </span>
                          {isAdmin && !tool.isStatic && (
                            <div className="flex items-center gap-1 z-20" onClick={e => e.preventDefault()}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openEditModal({
                                    id: tool.rawId,
                                    title: tool.title,
                                    description: tool.description,
                                    link: tool.link,
                                    category: tool.category,
                                    icon: tool.iconName || 'Wrench'
                                  });
                                }}
                                className="p-1 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-[var(--color-imamu-accent)] dark:hover:text-[var(--color-imamu-accent)] transition"
                                title="تعديل"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (tool.rawId) handleDeleteTool(tool.rawId);
                                }}
                                className="p-1 rounded bg-slate-100 dark:bg-zinc-800 text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition"
                                title="حذف"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-serif font-bold text-slate-900 dark:text-white mb-1.5 group-hover:text-[var(--color-imamu-accent)] dark:group-hover:text-[var(--color-imamu-accent)] transition-colors">
                        {tool.name}
                      </h3>
                      
                      <p className="text-xs text-slate-600 dark:text-zinc-400 mb-5 leading-relaxed">
                        {tool.description}
                      </p>
                    </div>

                    <div className="flex items-center text-xs font-bold text-[var(--color-imamu-accent)] group-hover:-translate-x-1 transition-transform border-t border-slate-100 dark:border-zinc-800/80 pt-3 mt-auto">
                      <span>دخول الأداة</span>
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    </div>
                  </SpotlightCard>
                </Link>
              </div>
            );
          })}
        </div>
      </InView>

      {/* Admin Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl p-6 relative">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingTool ? 'تعديل الأداة' : 'إضافة أداة جديدة'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveTool} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">اسم الأداة *</label>
                <input
                  type="text"
                  required
                  value={toolForm.title}
                  onChange={(e) => setToolForm({ ...toolForm, title: e.target.value })}
                  placeholder="مثال: حاسبة التحويل"
                  className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-imamu-brown)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">الرابط *</label>
                <input
                  type="text"
                  required
                  value={toolForm.link}
                  onChange={(e) => setToolForm({ ...toolForm, link: e.target.value })}
                  placeholder="مثال: https://... أو /tools/gpa"
                  className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-imamu-brown)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">الفئة</label>
                <input
                  type="text"
                  value={toolForm.category}
                  onChange={(e) => setToolForm({ ...toolForm, category: e.target.value })}
                  placeholder="مثال: خدمات إضافية"
                  className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-imamu-brown)]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">الأيقونة</label>
                <select
                  value={toolForm.icon}
                  onChange={(e) => setToolForm({ ...toolForm, icon: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-imamu-brown)]"
                >
                  <option value="Wrench">Wrench</option>
                  <option value="Calculator">Calculator</option>
                  <option value="FileText">FileText</option>
                  <option value="Sparkles">Sparkles</option>
                  <option value="Globe">Globe</option>
                  <option value="Link">Link</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">الوصف</label>
                <textarea
                  rows={3}
                  value={toolForm.description}
                  onChange={(e) => setToolForm({ ...toolForm, description: e.target.value })}
                  placeholder="وصف الأداة..."
                  className="w-full px-3 py-2 rounded-xl text-sm border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[var(--color-imamu-brown)]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? 'جاري الحفظ...' : editingTool ? 'تحديث' : 'إضافة'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 font-bold text-xs sm:text-sm hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

