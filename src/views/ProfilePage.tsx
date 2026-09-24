'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useTheme, COLOR_PRESETS } from '../lib/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, UserCircle2, Mail, Phone, BookOpen, Calculator, Clock, CheckCircle2, AlertCircle, Loader2, Camera, GraduationCap, Settings, Sparkles, ArrowUpRight, Palette, Check, Sun, Moon, ExternalLink } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AnimatedNumber } from '../components/ui';



export function ProfilePage() {
  const { user, dbUser, signOut, refreshToken, loading: authLoading } = useAuth();
  const { theme, toggleTheme, colorPreset, setColorPreset } = useTheme();
  const router = useRouter();
  const [majors, setMajors] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);
  
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const [profileForm, setProfileForm] = useState({
    phone: dbUser?.phone || '',
    major: dbUser?.major || '',
    currentGpa: dbUser?.currentGpa || '',
    finishedHours: dbUser?.finishedHours || '',
    completedCourses: [] as string[],
    profilePicUrl: (dbUser as any)?.profilePicUrl || '',
    userName: dbUser?.userName || '',
  });

  const [activeTab, setActiveTab] = useState<'profile'>('profile');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [phoneEditable, setPhoneEditable] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'progress') {
        router.replace('/ana?tab=progress');
      }
    }
  }, [router]);

  // Username check removed as display names are non-unique

  useEffect(() => {
    const authHeader: Record<string, string> = (user as any)?.accessToken ? { Authorization: `Bearer ${(user as any).accessToken}` } : {};

    Promise.all([
      fetch('/api/majors', { headers: authHeader }).then(r => r.ok && r.headers.get("content-type")?.includes("application/json") ? r.json() : []),
      fetch('/api/subjects', { headers: authHeader }).then(r => r.ok && r.headers.get("content-type")?.includes("application/json") ? r.json() : [])
    ]).then(([majorsData, subjectsData]) => {
      if (Array.isArray(majorsData)) setMajors(majorsData);
      if (Array.isArray(subjectsData)) setSubjects(subjectsData);
    }).catch(err => console.error("Error fetching initial data in ProfilePage:", err));

    if (dbUser) {
      let parsedCourses: string[] = [];
      if ((dbUser as any).completedCourses) {
        try { parsedCourses = JSON.parse((dbUser as any).completedCourses); } catch(e){}
      }
      setProfileForm({
        phone: dbUser.phone || '',
        major: dbUser.major || '',
        currentGpa: dbUser.currentGpa || '',
        finishedHours: dbUser.finishedHours || '',
        completedCourses: parsedCourses,
        profilePicUrl: (dbUser as any).profilePicUrl || '',
        userName: dbUser.userName || '',
      });
      setUsernameStatus('idle');
    }
  }, [dbUser, user]);

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] w-full py-20" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-imamu-accent)] mb-3" />
        <p className="text-sm font-bold text-slate-600 dark:text-zinc-400">جاري التحقق من الجلسة...</p>
      </div>
    );
  }

  if (!user) return null;

  const saveProfile = async (overrides?: any) => {
    if(!user) return;
    setIsSaving(true);
    setFeedback(null);
    const token = await user.getIdToken();
    try {
      const res = await fetch('/api/users/me', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          phone: overrides?.phone ?? profileForm.phone,
          major: overrides?.major ?? profileForm.major,
          currentGpa: overrides?.currentGpa ?? profileForm.currentGpa,
          finishedHours: (overrides?.finishedHours ?? profileForm.finishedHours) ? parseInt((overrides?.finishedHours ?? profileForm.finishedHours) as string) || null : null,
          completedCourses: overrides?.completedCourses ?? profileForm.completedCourses,
          profilePicUrl: overrides?.profilePicUrl ?? profileForm.profilePicUrl,
          userName: overrides?.userName ?? profileForm.userName,
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to update profile');
      }

      await refreshToken();
      setFeedback({ type: 'success', message: 'تم تحديث الملف الشخصي بنجاح!' });
      setPhoneEditable(false);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'خطأ في حفظ الملف الشخصي. يرجى المحاولة مرة أخرى.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 max-w-6xl w-full mx-auto pb-24 px-4 sm:px-6" dir="rtl">
      <div className="mb-8 text-right">
        <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 dark:text-white mb-2">الملف الشخصي</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400">إدارة التفاصيل الشخصية والأكاديمية والتقدم في المواد الدراسية.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
        {/* Left Side: Avatar & Basics */}
        <div className="w-full md:w-72 shrink-0 flex flex-col items-center text-center py-2">
          <div className="relative group cursor-pointer" onClick={() => document.getElementById('pfp-upload')?.click()}>
            <div className="h-32 w-32 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden border-4 border-white dark:border-zinc-800 shadow-md transition group-hover:opacity-90">
              {profileForm.profilePicUrl ? (
                <img src={profileForm.profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="h-16 w-16 text-slate-400 dark:text-zinc-500" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <Camera className="w-6 h-6 text-white" />
            </div>
            <input 
              type="file" 
              id="pfp-upload"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  try {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('category', 'pfp');
                    const token = user ? await user.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
                    const res = await fetch('/api/upload', {
                      method: 'POST',
                      headers: token ? { Authorization: `Bearer ${token}` } : {},
                      body: formData
                    });
                    if (res.ok) {
                      const data = await res.json().catch(() => ({}));
                      const newPicUrl = data.url || data.urls?.[0];
                      if (newPicUrl) {
                        setProfileForm(p => ({ ...p, profilePicUrl: newPicUrl }));
                        saveProfile({ profilePicUrl: newPicUrl });
                      }
                    }
                  } catch (uploadErr) {
                    console.error('Failed to upload profile picture to storage:', uploadErr);
                  }
                }
              }}
            />
          </div>


          <button 
            type="button"
            onClick={() => document.getElementById('pfp-upload')?.click()}
            className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-imamu-accent)] bg-stone-50 dark:bg-stone-950/50 hover:bg-stone-100 dark:hover:bg-stone-900/60 px-4 py-2 rounded-xl border border-slate-200/80 dark:border-zinc-700/80 transition shadow-2xs cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>تغيير الصورة الشخصية</span>
          </button>

          <div className="mt-4 flex flex-col items-center">
            <h2 className="text-xl font-serif font-bold text-slate-900 dark:text-white" dir="ltr">
              {dbUser?.userName || profileForm.userName || (user?.email ? user.email.split('@')[0] : 'user')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-1" dir="ltr">
              {user?.email || ''}
            </p>
          </div>
          
          <button 
            onClick={async () => {
              if (window.confirm('هل أنت متأكد أنك تريد تسجيل الخروج؟')) {
                await signOut();
                router.push('/login');
              }
            }}
            className="mt-6 w-full max-w-[220px] py-2.5 px-6 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50/80 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-xl transition border border-red-200/60 dark:border-red-900/40 cursor-pointer"
          >
            تسجيل الخروج
          </button>
        </div>

        {/* Right Side: Form & Progress */}
        <div className="w-full flex-1 min-w-0">
          {/* Animated Tab Bar with Icons & Direct Link to Ana */}
          <div className="relative flex items-center gap-1 border-b border-slate-200 dark:border-zinc-800/80 mb-8 pb-0" dir="rtl">
            <button 
              type="button"
              className="relative pb-3.5 px-4 font-bold text-sm flex items-center gap-2 select-none cursor-pointer text-[var(--color-imamu-accent)]"
            >
              <Settings className="w-4.5 h-4.5 text-[var(--color-imamu-accent)]" />
              <span>إعدادات الحساب</span>
              <motion.div
                layoutId="profileActiveTabUnderline"
                className="absolute bottom-0 right-0 left-0 h-0.5 bg-[var(--color-imamu-brown)] dark:bg-[var(--color-imamu-brown)] rounded-full shadow-xs shadow-[var(--color-imamu-brown)/20]"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            </button>

            <button 
              type="button"
              onClick={() => router.push('/ana?tab=progress')} 
              className="relative pb-3.5 px-4 font-bold transition-colors duration-200 text-sm flex items-center gap-2 select-none cursor-pointer text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200 group"
            >
              <GraduationCap className="w-4.5 h-4.5 text-slate-400 dark:text-zinc-500 group-hover:text-slate-800 dark:group-hover:text-zinc-200 transition-colors" />
              <span>التقدم والمقررات</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 group-hover:text-slate-800 dark:group-hover:text-zinc-200 transition-colors -mr-1" />
            </button>
          </div>

          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="overflow-hidden"
              >
                <div className={`p-4 rounded-xl flex items-center gap-3 text-sm font-medium ${
                  feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  {feedback.message}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form className="space-y-6" onSubmit={e => { e.preventDefault(); saveProfile(); }}>
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Personal Details Section (No Card Box) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-zinc-800/60">
                    <UserCircle2 className="w-5 h-5 text-[var(--color-imamu-accent)]" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">التفاصيل الشخصية</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">الاسم</label>
                      <div className="relative flex items-center">
                        <UserCircle2 className="absolute right-3.5 w-4.5 h-4.5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                        <input 
                          type="text"
                          placeholder="الاسم"
                          value={profileForm.userName}
                          onChange={e => {
                            const val = e.target.value;
                            setProfileForm(p => ({...p, userName: val}));
                          }}
                          onBlur={() => saveProfile()}
                          className="w-full pr-10 pl-4 py-3 bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-4 focus:ring-[var(--color-imamu-brown)]/10 focus:border-[var(--color-imamu-brown)] transition text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600"
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">رقم الجوال</label>
                        {!phoneEditable && (
                          <button type="button" onClick={() => setPhoneEditable(true)} className="text-[var(--color-imamu-accent)] hover:underline text-xs font-bold transition">
                            تعديل
                          </button>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <Phone className="absolute right-3.5 w-4.5 h-4.5 text-slate-400 dark:text-zinc-500" />
                        <input 
                          type="tel"
                          placeholder="05XXXXXXXX"
                          value={profileForm.phone}
                          disabled={!phoneEditable}
                          onChange={e => setProfileForm(p => ({...p, phone: e.target.value}))}
                          onBlur={() => saveProfile()}
                          className={`w-full pr-10 pl-4 py-3 bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-4 focus:ring-[var(--color-imamu-brown)]/10 focus:border-[var(--color-imamu-brown)] transition text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 ${!phoneEditable ? 'opacity-65 cursor-not-allowed bg-slate-100/60 dark:bg-zinc-900/40' : ''}`}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Academic Status Section (No Card Box) */}
                <div className="space-y-4 pt-4 border-t border-slate-200/60 dark:border-zinc-800/60">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-zinc-800/60">
                    <BookOpen className="w-5 h-5 text-[var(--color-imamu-accent)]" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">الحالة الأكاديمية</h3>
                  </div>

                  <div className="grid grid-cols-1 gap-5">
                    {/* Major Select */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">التخصص الأكاديمي</label>
                      <div className="relative flex items-center">
                        <BookOpen className="absolute right-3.5 w-4.5 h-4.5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                        <select 
                          value={profileForm.major} 
                          onChange={e => {
                            const newMajor = e.target.value;
                            setProfileForm(p => ({...p, major: newMajor}));
                            saveProfile({ major: newMajor });
                          }}
                          className="w-full pr-10 pl-10 py-3 appearance-none bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-4 focus:ring-[var(--color-imamu-brown)]/10 focus:border-[var(--color-imamu-brown)] transition text-sm text-slate-900 dark:text-white cursor-pointer"
                        >
                          <option value="" className="dark:bg-zinc-900">اختر التخصص...</option>
                          {majors.map(m => (
                            <option key={m.id} value={m.name} className="dark:bg-zinc-900">{m.name}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute left-3.5 w-4.5 h-4.5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* GPA */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">المعدل التراكمي (GPA)</label>
                        <div className="relative flex items-center">
                          <Calculator className="absolute right-3.5 w-4.5 h-4.5 text-slate-400 dark:text-zinc-500" />
                          <input 
                            type="number" step="0.01" min="0" max="5.0"
                            placeholder="مثال 4.5"
                            value={profileForm.currentGpa}
                            onChange={e => setProfileForm(p => ({...p, currentGpa: e.target.value}))}
                            onBlur={() => saveProfile()}
                            className="w-full pr-10 pl-4 py-3 font-mono bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-4 focus:ring-[var(--color-imamu-brown)]/10 focus:border-[var(--color-imamu-brown)] transition text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      {/* Finished Hours */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-2">الساعات المكتسبة</label>
                        <div className="relative flex items-center">
                          <Clock className="absolute right-3.5 w-4.5 h-4.5 text-slate-400 dark:text-zinc-500" />
                          <input 
                            type="number" min="0"
                            placeholder="110"
                            value={profileForm.finishedHours}
                            onChange={e => setProfileForm(p => ({...p, finishedHours: e.target.value}))}
                            onBlur={() => saveProfile()}
                            className="w-full pr-10 pl-4 py-3 font-mono bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-4 focus:ring-[var(--color-imamu-brown)]/10 focus:border-[var(--color-imamu-brown)] transition text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick navigation to Academic Progress in Ana */}
                    <div className="p-4 rounded-2xl bg-[var(--color-imamu-brown)]/5 border border-[var(--color-imamu-brown)]/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-[var(--color-imamu-brown)]/10 text-[var(--color-imamu-accent)]">
                          <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">الخطة الأكاديمية والتقدم في المواد</h4>
                          <p className="text-[11px] text-slate-500 dark:text-zinc-400">انتقلت متابعة الخطة والمواد المنجزة إلى صفحتك الشخصية (أنا).</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => router.push('/ana?tab=progress')}
                        className="btn-rise inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[var(--color-imamu-accent)] text-white hover:opacity-90 transition cursor-pointer self-start sm:self-auto shrink-0 shadow-2xs"
                      >
                        <span>عرض التقدم والمقررات</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Theme Appearance & Color Presets Section */}
                <div className="space-y-5 pt-4 border-t border-slate-200/60 dark:border-zinc-800/60">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-zinc-800/60">
                    <Palette className="w-5 h-5 text-[var(--color-imamu-accent)]" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">طابع الألوان والمظهر</h3>
                  </div>

                  {/* Dark Mode / Light Mode Switcher */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-200/60 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                        {theme === 'dark' ? <Moon className="w-5 h-5 text-[var(--color-imamu-accent)]" /> : <Sun className="w-5 h-5 text-amber-600" />}
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">نمط الشاشة</span>
                        <span className="text-[11px] text-slate-500 dark:text-zinc-400">النمط الحالي: {theme === 'dark' ? 'داكن' : 'فاتح'}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={toggleTheme}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 shadow-2xs hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
                    >
                      {theme === 'dark' ? 'التحويل للوضع الفاتح' : 'التحويل للوضع الداكن'}
                    </button>
                  </div>

                  {/* Color Presets Grid */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-3 text-right">اختر طابع لون الموقع المفضّل</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {COLOR_PRESETS.map((preset) => {
                        const isSelected = preset.id === colorPreset;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => setColorPreset(preset.id)}
                            className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-bold transition-all cursor-pointer select-none text-right ${
                              isSelected
                                ? 'bg-[var(--color-imamu-brown)]/10 text-[var(--color-imamu-accent)] border-[var(--color-imamu-brown)] shadow-xs'
                                : 'bg-slate-50/80 dark:bg-zinc-950/60 text-slate-700 dark:text-zinc-300 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div 
                                className="w-4.5 h-4.5 rounded-full shadow-xs shrink-0 ring-1 ring-black/10 dark:ring-white/20" 
                                style={{ background: preset.bgGradient }} 
                              />
                              <span>{preset.name}</span>
                            </div>
                            {isSelected && (
                              <Check className="w-4 h-4 text-[var(--color-imamu-accent)] stroke-[3]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

            <div className="flex justify-end pt-4">
              <button 
                type="submit"
                disabled={isSaving || usernameStatus === 'taken' || usernameStatus === 'checking'}
                className="btn-rise flex items-center justify-center gap-2 bg-[var(--color-imamu-brown)] text-white font-medium py-3 px-8 rounded-xl hover:bg-[var(--color-imamu-brown-light)] transition disabled:opacity-70 disabled:cursor-not-allowed shadow-sm min-w-[140px] cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'حفظ التغييرات'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
