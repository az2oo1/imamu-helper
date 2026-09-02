import React, { useState, useEffect } from 'react';
import { 
  Users, Search, Plus, Trash2, Edit3, Eye, Shield, Award, 
  Linkedin, Instagram, Twitter, Github, Mail, Globe, Check, X, Sparkles, HeartHandshake, Link2, Copy, UserCircle2, User, Upload
} from 'lucide-react';

function ContributorAvatar({ src, alt, className = "w-12 h-12 rounded-2xl" }: { src?: string; alt: string; className?: string }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const hasValidPhoto = src && src.trim() !== '' && src !== '/logo_dark.png' && !imgError;

  return (
    <div className={`${className} overflow-hidden border border-amber-500/30 bg-slate-200 dark:bg-zinc-800 shrink-0 flex items-center justify-center text-slate-400 dark:text-zinc-500`}>
      {hasValidPhoto ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <User className="w-6 h-6 text-slate-400 dark:text-zinc-500 stroke-[1.75]" />
      )}
    </div>
  );
}

export const CONTRIBUTOR_CATEGORIES = [
  { id: 'all', label: 'جميع المساهمين' },
  { id: 'founder', label: 'المؤسس والقائمون' },
  { id: 'resources', label: 'فريق ومحدّثو المصادر' },
  { id: 'tools', label: 'مصممو ومطورو الأدوات' },
  { id: 'dalilah', label: 'فريق إجابات الدليلة' },
  { id: 'other', label: 'مساهمات أخرى' },
];

export default function AdminContributorsTab() {
  const [contributorsList, setContributorsList] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteModalId, setDeleteModalId] = useState<number | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Form State
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formCategory, setFormCategory] = useState('founder');
  const [formPhotoUrl, setFormPhotoUrl] = useState('');
  const [formUserId, setFormUserId] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formLinkedMajor, setFormLinkedMajor] = useState('');
  const [formLinkedTools, setFormLinkedTools] = useState('');
  const [formDisplayOrder, setFormDisplayOrder] = useState('0');
  const [formIsPublic, setFormIsPublic] = useState(true);

  // Social Links Form
  const [socialLinkedin, setSocialLinkedin] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialTwitter, setSocialTwitter] = useState('');
  const [socialGithub, setSocialGithub] = useState('');
  const [socialEmail, setSocialEmail] = useState('');
  const [socialWebsite, setSocialWebsite] = useState('');

  const [submitting, setSubmitting] = useState(false);

  const fetchContributors = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('imamu_token') || '';
      const res = await fetch('/api/admin/contributors', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setContributorsList(data);
      }
    } catch (e) {
      console.error('Failed to fetch contributors', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchRegisteredUsers = async () => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('imamu_token') || '';
      const res = await fetch('/api/admin/users?limit=200', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.users)) setRegisteredUsers(data.users);
        else if (Array.isArray(data)) setRegisteredUsers(data);
      }
    } catch (e) {
      console.error('Failed to fetch registered users for dropdown', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchContributors();
    fetchRegisteredUsers();
  }, []);

  const openCreateModal = () => {
    fetchRegisteredUsers();
    setEditingId(null);
    setFormName('');
    setFormRole('');
    setFormCategory('founder');
    setFormPhotoUrl('');
    setFormUserId('');
    setFormBio('');
    setFormLinkedMajor('');
    setFormLinkedTools('');
    setFormDisplayOrder('0');
    setFormIsPublic(true);

    setSocialLinkedin('');
    setSocialInstagram('');
    setSocialTwitter('');
    setSocialGithub('');
    setSocialEmail('');
    setSocialWebsite('');

    setIsModalOpen(true);
  };

  const openEditModal = (c: any) => {
    fetchRegisteredUsers();
    setEditingId(c.id);
    setFormName(c.name || '');
    setFormRole(c.role || '');
    setFormCategory(c.category || 'other');
    setFormPhotoUrl(c.photoUrl || '');
    setFormUserId(c.userId || '');
    setFormBio(c.bio || '');
    setFormLinkedMajor(c.linkedMajor || '');
    setFormDisplayOrder(String(c.displayOrder || 0));
    setFormIsPublic(c.isPublic !== false);

    let toolsStr = '';
    try {
      if (c.linkedTools) {
        const parsed = typeof c.linkedTools === 'string' ? JSON.parse(c.linkedTools) : c.linkedTools;
        if (Array.isArray(parsed)) toolsStr = parsed.join(', ');
      }
    } catch (e) {}
    setFormLinkedTools(toolsStr);

    let social: any = {};
    try {
      if (c.socialLinks) {
        social = typeof c.socialLinks === 'string' ? JSON.parse(c.socialLinks) : c.socialLinks;
      }
    } catch (e) {}

    setSocialLinkedin(social.linkedin || '');
    setSocialInstagram(social.instagram || '');
    setSocialTwitter(social.twitter || '');
    setSocialGithub(social.github || '');
    setSocialEmail(social.email || '');
    setSocialWebsite(social.website || '');

    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formRole.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('imamu_token') || '';
      
      const socialLinksObj = {
        linkedin: socialLinkedin.trim() || undefined,
        instagram: socialInstagram.trim() || undefined,
        twitter: socialTwitter.trim() || undefined,
        github: socialGithub.trim() || undefined,
        email: socialEmail.trim() || undefined,
        website: socialWebsite.trim() || undefined,
      };

      const toolsArr = formLinkedTools
        .split(',')
        .map(t => t.trim())
        .filter(Boolean);

      const payload = {
        name: formName.trim(),
        role: formRole.trim(),
        category: formCategory,
        photoUrl: formPhotoUrl.trim() || '',
        userId: formUserId.trim() || null,
        bio: formBio.trim() || null,
        linkedMajor: formLinkedMajor.trim() || null,
        linkedTools: toolsArr,
        socialLinks: socialLinksObj,
        displayOrder: Number(formDisplayOrder) || 0,
        isPublic: formIsPublic
      };

      const url = editingId ? `/api/admin/contributors/${editingId}` : '/api/admin/contributors';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        fetchContributors();
        setIsModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to submit contributor', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('imamu_token') || '';
      const res = await fetch(`/api/admin/contributors/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setContributorsList(prev => prev.filter(c => c.id !== id));
        setDeleteModalId(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = contributorsList.filter(c => {
    const matchCat = activeCategory === 'all' || c.category === activeCategory;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.role.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HeartHandshake className="w-7 h-7 text-[var(--color-imamu-accent)]" />
            <span>لوحة تقدير المساهمين وفريق العمل</span>
          </h3>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            إضافة وإدارة قائمة المساهمين والقائمين على صيانة المنصة والمحتوى والأدوات وإجابات الدليلة.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="btn-rise px-4 py-2.5 rounded-2xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold shadow-md shadow-[var(--color-imamu-brown)/20] flex items-center justify-center gap-2 transition cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة مساهم جديد</span>
        </button>
      </div>

      {/* Category Tabs & Search Bar */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-zinc-800 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            {CONTRIBUTOR_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeCategory === cat.id
                    ? 'bg-[var(--color-imamu-brown)] text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute right-3.5 top-3 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="البحث باسم المساهم أو المسمى..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20"
            />
          </div>
        </div>

        {/* Contributors Cards Grid */}
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">جاري تحميل المساهمين...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 italic">لا يوجد مساهمون مطابقون لبحثك.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filtered.map((c) => {
              let social: any = {};
              try {
                if (c.socialLinks) social = typeof c.socialLinks === 'string' ? JSON.parse(c.socialLinks) : c.socialLinks;
              } catch (e) {}

              return (
                <div key={c.id} className="p-5 rounded-2xl bg-slate-50/70 dark:bg-zinc-950/70 border border-slate-200/80 dark:border-zinc-800/80 flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <ContributorAvatar src={c.photoUrl} alt={c.name} className="w-12 h-12 rounded-2xl" />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</h4>
                            {c.isPublic === false && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-slate-500">خاص</span>}
                          </div>
                          <div className="text-xs font-semibold text-[var(--color-imamu-accent)] flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span>{c.role}</span>
                            {c.linkedMajor && (
                              <span className="text-slate-500 dark:text-zinc-400 font-medium">• {c.linkedMajor}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer"
                          title="تعديل"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModalId(c.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {c.bio && (
                      <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">{c.bio}</p>
                    )}

                    {/* Meta info tags */}
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      {c.userId && (
                        <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-900/60 text-stone-700 dark:text-stone-300 font-mono border border-stone-200 dark:border-stone-800 flex items-center gap-1">
                          <Link2 className="w-3 h-3 text-[var(--color-imamu-accent)]" />
                          <span>UID: {c.userId}</span>
                        </span>
                      )}
                      {c.linkedMajor && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-900/40">
                          🎓 {c.linkedMajor}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Social media icons toolbar */}
                  <div className="pt-3 border-t border-slate-200/60 dark:border-zinc-800/80 flex items-center gap-2 text-slate-400">
                    {social.linkedin && (
                      <a href={social.linkedin} target="_blank" rel="noreferrer" className="hover:text-blue-600 transition" title="LinkedIn">
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    {social.instagram && (
                      <a href={social.instagram} target="_blank" rel="noreferrer" className="hover:text-pink-600 transition" title="Instagram">
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {social.twitter && (
                      <a href={social.twitter} target="_blank" rel="noreferrer" className="hover:text-sky-500 transition" title="X / Twitter">
                        <Twitter className="w-4 h-4" />
                      </a>
                    )}
                    {social.github && (
                      <a href={social.github} target="_blank" rel="noreferrer" className="hover:text-slate-900 dark:hover:text-white transition" title="GitHub">
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                    {social.email && (
                      <a href={`mailto:${social.email}`} className="hover:text-amber-600 transition" title="البريد الإلكتروني">
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* CREATE / EDIT CONTRIBUTOR MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-xs animate-fadeIn">
          <div 
            className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-[var(--color-imamu-accent)] border border-amber-500/20 flex items-center justify-center font-bold">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingId ? 'تعديل بيانات المساهم' : 'إضافة مساهم جديد'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">أدخل تفاصيل ومسؤوليات المساهم وروابط التواصل الاجتماعي المتاحة.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-right">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Photo Upload Component (Object Storage) */}
                <div className="sm:col-span-2 p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-2">
                    الصورة الشخصية (رفع مباشر إلى Object Storage)
                  </label>
                  
                  <div className="flex items-center gap-4">
                    {/* Preview Avatar */}
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-amber-500/30 bg-slate-200 dark:bg-zinc-800 shrink-0 flex items-center justify-center relative group">
                      {formPhotoUrl ? (
                        <img src={formPhotoUrl} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8 text-slate-400 dark:text-zinc-500 stroke-[1.75]" />
                      )}
                      {uploadingPhoto && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>

                    {/* File Input & Upload Action */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <label className="btn-rise px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-[var(--color-imamu-brown)] dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer flex items-center gap-2">
                          <Upload className="w-4 h-4" />
                          <span>{uploadingPhoto ? 'جاري رفع الصورة...' : formPhotoUrl ? 'تغيير الصورة' : 'اختر صورة من جهازك لرفعها'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingPhoto}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingPhoto(true);
                              try {
                                const token = localStorage.getItem('token') || localStorage.getItem('imamu_token') || '';
                                const formData = new FormData();
                                formData.append('file', file);
                                const res = await fetch('/api/admin/upload', {
                                  method: 'POST',
                                  headers: { Authorization: `Bearer ${token}` },
                                  body: formData
                                });
                                if (!res.ok) throw new Error('فشل رفع الصورة');
                                const data = await res.json();
                                if (data.url) {
                                  setFormPhotoUrl(data.url);
                                }
                              } catch (err: any) {
                                alert(err.message || 'حدث خطأ أثناء رفع الصورة');
                              } finally {
                                setUploadingPhoto(false);
                              }
                            }}
                          />
                        </label>
                        {formPhotoUrl && (
                          <button
                            type="button"
                            onClick={() => setFormPhotoUrl('')}
                            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition border border-rose-200 dark:border-rose-900/30 cursor-pointer"
                            title="حذف الصورة"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                        يتم رفع الملف مباشرة وحفظه في وحدة التخزين الرئيسية (Object Storage).
                      </p>
                    </div>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">اسم المساهم الكامل *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: عبدالملك القاسم"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">فئة المساهمة *</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20"
                  >
                    <option value="founder">المؤسس والقائمون على المنصة</option>
                    <option value="resources">فريق ومحدثو المصادر</option>
                    <option value="tools">مصممو ومطورو الأدوات</option>
                    <option value="dalilah">فريق إجابات الدليلة</option>
                    <option value="other">مساهمات عامة أخرى</option>
                  </select>
                </div>

                {/* Role Title */}
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">المسمى الوظيفي / دور المساهم التفصيلي *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: المؤسس والقائم على تطوير المنصة / مطور ومحدث مصادر كلية الحاسب"
                    value={formRole}
                    onChange={e => setFormRole(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20"
                  />
                </div>

                {/* User ID (UID / ID) link */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">رقم المعرف المولد (User UID) بالقاعدة</label>
                  <input
                    type="text"
                    placeholder="رقم المعرف المولد (UID) للمستخدم بالقاعدة"
                    value={formUserId}
                    onChange={e => setFormUserId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20 font-mono"
                  />
                </div>

                {/* Linked Major */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">التخصص الأكاديمي المرتبط</label>
                  <input
                    type="text"
                    placeholder="مثال: علوم الحاسب"
                    value={formLinkedMajor}
                    onChange={e => setFormLinkedMajor(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20"
                  />
                </div>

                {/* Display Order */}
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">ترتيب الظهور</label>
                  <input
                    type="number"
                    value={formDisplayOrder}
                    onChange={e => setFormDisplayOrder(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">نبذة تعريفية ومجالات المساهمة</label>
                <textarea
                  rows={3}
                  placeholder="اكتب نبذة مختصرة عن المساهمات والإنجازات..."
                  value={formBio}
                  onChange={e => setFormBio(e.target.value)}
                  className="w-full p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20 resize-none"
                />
              </div>

              {/* Linked Tools */}
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-300 block mb-1.5">الأدوات البرمجية المرتبطة (مفصولة بفواصل)</label>
                <input
                  type="text"
                  placeholder="مثال: حاسبة المعدل التراكمي، المخطط الأكاديمي، بنك المصادر"
                  value={formLinkedTools}
                  onChange={e => setFormLinkedTools(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white outline-hidden focus:ring-2 focus:ring-[var(--color-imamu-brown)]/20"
                />
              </div>

              {/* Social Links Sub-Section */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">روابط وسائل التواصل الاجتماعي</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <input
                    type="url"
                    placeholder="رابط لينكد إن LinkedIn"
                    value={socialLinkedin}
                    onChange={e => setSocialLinkedin(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-hidden"
                  />
                  <input
                    type="url"
                    placeholder="رابط إنستغرام Instagram"
                    value={socialInstagram}
                    onChange={e => setSocialInstagram(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-hidden"
                  />
                  <input
                    type="url"
                    placeholder="رابط إكس / تويتر X (Twitter)"
                    value={socialTwitter}
                    onChange={e => setSocialTwitter(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-hidden"
                  />
                  <input
                    type="url"
                    placeholder="رابط جيت هب GitHub"
                    value={socialGithub}
                    onChange={e => setSocialGithub(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-hidden"
                  />
                  <input
                    type="email"
                    placeholder="البريد الإلكتروني"
                    value={socialEmail}
                    onChange={e => setSocialEmail(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-hidden"
                  />
                  <input
                    type="url"
                    placeholder="الموقع الشخصي"
                    value={socialWebsite}
                    onChange={e => setSocialWebsite(e.target.value)}
                    className="px-3 py-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white outline-hidden"
                  />
                </div>
              </div>

              {/* Public Visibility Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">ظهور البطاقة في صفحة التقدير والمساهمين العامة</span>
                <input
                  type="checkbox"
                  checked={formIsPublic}
                  onChange={e => setFormIsPublic(e.target.checked)}
                  className="w-4 h-4 accent-[var(--color-imamu-brown)] cursor-pointer"
                />
              </div>

              {/* Footer Buttons */}
              <div className="pt-4 border-t border-slate-200 dark:border-zinc-800 flex gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                  className="btn-rise flex-1 py-3 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold text-xs transition cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-rise flex-1 py-3 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white font-bold text-xs shadow-md shadow-[var(--color-imamu-brown)/20] transition cursor-pointer"
                >
                  {submitting ? 'جاري الحفظ...' : 'حفظ البيانات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteModalId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 border border-slate-200 dark:border-zinc-800 text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">حذف المساهم</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mb-6 leading-relaxed">
              هل أنت متأكد من حذف هذا المساهم من القائمة؟ لن يؤثر الحذف على حساب المستخدم الأصلي.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteModalId(null)} className="btn-rise flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-bold text-xs">إلغاء</button>
              <button onClick={() => handleDelete(deleteModalId)} className="btn-rise flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-600/20">تأكيد الحذف</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
