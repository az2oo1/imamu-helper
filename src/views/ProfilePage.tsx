'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, UserCircle2, Mail, Phone, BookOpen, Calculator, Clock, CheckCircle2, AlertCircle, Loader2, Camera, GraduationCap, Settings, Sparkles, ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { AnimatedNumber } from '../components/ui';

function extractPrereqCodes(description?: string | null): string[] {
  if (!description) return [];
  const match = description.match(/(?:المتطلبات السابقة:|prereq:?)\s*([A-Z0-9,\s\u0600-\u06FF]+)/i);
  if (!match) return [];
  const codes = match[1].match(/[A-Z]{2,4}\d{3,4}|عال\d{4}/g);
  return codes ? Array.from(new Set(codes)) : [];
}

function computeAcademicProgress(majors: any[], subjects: any[], majorName: string, completedCourses: string[]) {
  const userMajor = majors.find(m => m.name === majorName || m.name?.trim() === majorName?.trim());
  const displayedSubjects = userMajor && userMajor.courseIds && userMajor.courseIds.length > 0
    ? subjects.filter(s => userMajor.courseIds.some((cid: any) => String(cid) === String(s.id)))
    : subjects;

  const groups = (Object.entries(
    displayedSubjects.reduce((acc, s) => {
      let g = s.level ? `المستوى ${s.level}` : 'المتطلبات العامة';
      let reqCount = 0;
      if (userMajor && userMajor.courses) {
        const c = userMajor.courses.find((mc: any) => String(mc.subjectId) === String(s.id));
        if (c && c.optionalGroup && c.optionalGroup !== 'المتطلبات العامة') {
          g = c.optionalGroup;
          reqCount = Number(c.optionalGroupReqCount) || 0;
        } else if (c && c.optionalGroupReqCount) {
          reqCount = Number(c.optionalGroupReqCount) || 0;
        }
      }
      if (!acc[g]) acc[g] = [];
      acc[g].push({...s, reqCount});
      return acc;
    }, {} as Record<string, any[]>)
  ) as [string, any[]][]).sort((a, b) => {
    const matchA = a[0].match(/المستوى\s+(\d+)/);
    const matchB = b[0].match(/المستوى\s+(\d+)/);
    if (matchA && matchB) return parseInt(matchA[1]) - parseInt(matchB[1]);
    if (matchA) return -1;
    if (matchB) return 1;
    return a[0].localeCompare(b[0], 'ar');
  });

  let totalReq = 0;
  let totalFinishedInReq = 0;
  let totalFinishedHours = 0;

  displayedSubjects.forEach(s => {
    if (completedCourses.includes(s.code)) {
      totalFinishedHours += Number(s.creditHours || 3);
    }
  });

  groups.forEach(([groupName, groupSubjects]) => {
    const totalInGroup = groupSubjects.length;
    const declaredReqCount = Number(groupSubjects[0]?.reqCount) || 0;
    const isLevelGroup = groupName.startsWith('المستوى');
    const reqCount = (declaredReqCount > 0 && !isLevelGroup) ? declaredReqCount : totalInGroup;
    const selectedInGroup = groupSubjects.filter(s => completedCourses.includes(s.code)).length;
    
    totalReq += Number(reqCount);
    totalFinishedInReq += Math.min(selectedInGroup, Number(reqCount));
  });

  const percentFinished = totalReq > 0 ? Math.round((totalFinishedInReq / totalReq) * 100) : 0;
  const allGroupNames = groups.map(g => g[0]);

  return {
    userMajor,
    displayedSubjects,
    groups,
    totalReq,
    totalFinishedInReq,
    totalFinishedHours,
    percentFinished,
    allGroupNames
  };
}

export function ProfilePage() {
  const { user, dbUser, signOut, refreshToken, loading: authLoading } = useAuth();
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

  const [activeTab, setActiveTab] = useState<'profile' | 'progress'>('progress');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [phoneEditable, setPhoneEditable] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'profile' || tabParam === 'progress') {
        setActiveTab(tabParam);
      }
    }
  }, []);

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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400 mb-3" />
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


  const progressData = computeAcademicProgress(majors, subjects, profileForm.major, profileForm.completedCourses);

  return (
    <div className="flex flex-col flex-1 max-w-6xl w-full mx-auto pb-24 px-4 sm:px-6" dir="rtl">
      <div className="mb-8 text-right">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white mb-2">الملف الشخصي</h1>
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
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    const img = new Image();
                    img.onload = () => {
                      const canvas = document.createElement('canvas');
                      const MAX_SIZE = 250;
                      let width = img.width;
                      let height = img.height;
                      if (width > height) {
                        if (width > MAX_SIZE) {
                          height *= MAX_SIZE / width;
                          width = MAX_SIZE;
                        }
                      } else {
                        if (height > MAX_SIZE) {
                          width *= MAX_SIZE / height;
                          height = MAX_SIZE;
                        }
                      }
                      canvas.width = width;
                      canvas.height = height;
                      const ctx = canvas.getContext('2d');
                      ctx?.drawImage(img, 0, 0, width, height);
                      const newPicUrl = canvas.toDataURL('image/jpeg', 0.85);
                      setProfileForm(p => ({ ...p, profilePicUrl: newPicUrl }));
                      saveProfile({ profilePicUrl: newPicUrl });
                    };
                    img.src = ev.target?.result as string;
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>

          <button 
            type="button"
            onClick={() => document.getElementById('pfp-upload')?.click()}
            className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-4 py-2 rounded-xl border border-blue-200 dark:border-blue-900/50 transition shadow-2xs cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>تغيير الصورة الشخصية</span>
          </button>

          <div className="mt-4 flex flex-col items-center">
            <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white" dir="ltr">
              @{dbUser?.userName || profileForm.userName || (user?.email ? user.email.split('@')[0] : 'user')}
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
          {/* Animated Tab Bar with Icons & Sliding Indicator */}
          <div className="relative flex items-center gap-1 border-b border-slate-200 dark:border-zinc-800/80 mb-8 pb-0" dir="rtl">
            <button 
              type="button"
              onClick={() => setActiveTab('progress')} 
              className={`relative pb-3.5 px-4 font-bold transition-colors duration-200 text-sm flex items-center gap-2 select-none cursor-pointer ${
                activeTab === 'progress' 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <GraduationCap className={`w-4.5 h-4.5 transition-colors ${activeTab === 'progress' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-zinc-500'}`} />
              <span>التقدم والمقررات</span>
              {activeTab === 'progress' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 right-0 left-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full shadow-xs shadow-blue-500/50"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
            </button>

            <button 
              type="button"
              onClick={() => setActiveTab('profile')} 
              className={`relative pb-3.5 px-4 font-bold transition-colors duration-200 text-sm flex items-center gap-2 select-none cursor-pointer ${
                activeTab === 'profile' 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
              }`}
            >
              <Settings className={`w-4.5 h-4.5 transition-colors ${activeTab === 'profile' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-zinc-500'}`} />
              <span>إعدادات الحساب</span>
              {activeTab === 'profile' && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 right-0 left-0 h-0.5 bg-blue-600 dark:bg-blue-400 rounded-full shadow-xs shadow-blue-500/50"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
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
            {activeTab === 'profile' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Personal Details Section (No Card Box) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-zinc-800/60">
                    <UserCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
                          className="w-full pr-10 pl-4 py-3 bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600"
                        />
                      </div>
                    </div>

                    {/* Phone Number */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">رقم الجوال</label>
                        {!phoneEditable && (
                          <button type="button" onClick={() => setPhoneEditable(true)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold transition">
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
                          className={`w-full pr-10 pl-4 py-3 bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 ${!phoneEditable ? 'opacity-65 cursor-not-allowed bg-slate-100/60 dark:bg-zinc-900/40' : ''}`}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Academic Status Section (No Card Box) */}
                <div className="space-y-4 pt-4 border-t border-slate-200/60 dark:border-zinc-800/60">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-zinc-800/60">
                    <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
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
                          className="w-full pr-10 pl-10 py-3 appearance-none bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition text-sm text-slate-900 dark:text-white cursor-pointer"
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
                            className="w-full pr-10 pl-4 py-3 font-mono bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600"
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
                            className="w-full pr-10 pl-4 py-3 font-mono bg-slate-50/80 dark:bg-zinc-950/60 border border-slate-200 dark:border-zinc-800 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                {!profileForm.major ? (
                  <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
                    <p className="text-slate-600 dark:text-zinc-400 text-sm font-medium">يرجى اختيار التخصص في تبويب الإعدادات أولاً.</p>
                  </div>
                ) : subjects.length > 0 ? (
                  <div className="space-y-6">
                    {/* Progress Header - Seamless Page Integration (No Box / Border / Gradient) */}
                    <div className="mb-8 space-y-4">
                      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3">
                        <div>
                          <span className="text-slate-900 dark:text-white font-bold block text-base sm:text-lg">نسبة إنجاز الخطة الأكاديمية</span>
                          <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                            اجتزت <AnimatedNumber value={progressData.totalFinishedInReq} /> من {progressData.totalReq} مقرر (إجمالي <AnimatedNumber value={progressData.totalFinishedHours} /> ساعة معتمدة)
                          </span>
                        </div>
                        <span className="text-blue-600 dark:text-blue-400 font-black text-2xl"><AnimatedNumber value={progressData.percentFinished} />%</span>
                      </div>

                      {/* Solid Color Progress Bar (No Gradient) */}
                      <div className="w-full bg-slate-200/80 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
                        <motion.div 
                          className="bg-blue-600 dark:bg-blue-500 h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${progressData.percentFinished}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>

                      {/* Global Accordion Toggle Bar with Msari Button */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
                        <span className="text-slate-500 dark:text-zinc-400 font-medium">إجمالي {progressData.groups.length} حزمة ومستوى</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href="https://msari.vercel.app/index.html"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-rise inline-flex items-center gap-2 text-xs font-bold text-white bg-[#0E352C] hover:bg-[#13493d] px-4 py-2 rounded-full border border-[#3DC9B0]/40 shadow-sm shadow-[#0E352C]/30 transition-all cursor-pointer shrink-0"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-[#3DC9B0] shrink-0" />
                            <span>تعمّق مع مساري</span>
                            <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                          </a>

                          <button
                            type="button"
                            onClick={() => {
                              const nextState: Record<string, boolean> = {};
                              progressData.allGroupNames.forEach(n => { nextState[n] = false; });
                              setCollapsedGroups(nextState);
                            }}
                            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/50 cursor-pointer"
                          >
                            توسيع الكل
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const nextState: Record<string, boolean> = {};
                              progressData.allGroupNames.forEach(n => { nextState[n] = true; });
                              setCollapsedGroups(nextState);
                            }}
                            className="text-xs font-bold text-slate-600 dark:text-zinc-400 hover:underline px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/80 dark:border-zinc-700/80 cursor-pointer"
                          >
                            طي الكل
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Groups / Batches Collapsible List */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                      {[
                        progressData.groups.filter((_, idx) => idx % 2 === 0),
                        progressData.groups.filter((_, idx) => idx % 2 === 1)
                      ].map((columnGroups, colIdx) => (
                        <div key={colIdx} className="flex flex-col gap-4 w-full">
                          {columnGroups.map(([groupName, groupSubjects]: [string, any[]]) => {
                            const totalInGroup = groupSubjects.length;
                            const declaredReqCount = groupSubjects[0]?.reqCount || 0;
                            const isLevelGroup = groupName.startsWith('المستوى');
                            const reqCount = (declaredReqCount > 0 && !isLevelGroup) ? declaredReqCount : totalInGroup;
                            
                            const selectedInGroup = groupSubjects.filter(s => profileForm.completedCourses.includes(s.code)).length;
                            const isGroupFull = selectedInGroup >= reqCount;

                            // Calculate if ALL courses in this batch are locked
                            const allCoursesInGroupLocked = groupSubjects.length > 0 && groupSubjects.every(s => {
                              if (profileForm.completedCourses.includes(s.code)) return false;
                              const prereqs = extractPrereqCodes(s.description);
                              return prereqs.length > 0 && prereqs.some(p => !profileForm.completedCourses.includes(p));
                            });

                            // Calculate batch completion ratio
                            const completionRatio = totalInGroup > 0 ? selectedInGroup / totalInGroup : 0;
                            const isAtLeast33Percent = completionRatio >= 0.33;

                            const defaultCollapsed = isGroupFull || allCoursesInGroupLocked || !isAtLeast33Percent;

                            const isCollapsed = collapsedGroups[groupName] ?? defaultCollapsed;

                            return (
                              <div 
                                key={groupName} 
                                className={`border rounded-2xl overflow-hidden transition-all duration-300 h-fit ${
                                  isGroupFull 
                                    ? 'bg-emerald-50/30 border-emerald-200/80 dark:bg-emerald-950/15 dark:border-emerald-900/40' 
                                    : allCoursesInGroupLocked
                                      ? 'bg-slate-100/50 dark:bg-zinc-950/40 border-slate-200 dark:border-zinc-800/60 opacity-85'
                                      : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800'
                                }`}
                              >
                                {/* Collapsible Accordion Header */}
                                <div 
                                  onClick={() => setCollapsedGroups(prev => ({ ...prev, [groupName]: !isCollapsed }))}
                                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                    <div className={`p-1 rounded-lg text-slate-400 dark:text-zinc-500 shrink-0 transition-transform duration-200 ${!isCollapsed ? 'rotate-180' : ''}`}>
                                      <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 dark:text-zinc-400" />
                                    </div>
                                    <h4 className={`font-bold text-xs sm:text-sm leading-snug truncate flex items-center gap-1.5 ${isGroupFull ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`} title={groupName}>
                                      <span className="truncate">{groupName}</span>
                                      {isGroupFull && <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                                    </h4>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                                    {allCoursesInGroupLocked && !isGroupFull && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 border border-slate-300/60 dark:border-zinc-700 whitespace-nowrap flex items-center gap-1">
                                        🔒 مغلقة
                                      </span>
                                    )}
                                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                                      isGroupFull 
                                        ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                                        : 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50'
                                    }`}>
                                      المنجز: {selectedInGroup} / {reqCount}
                                    </span>
                                  </div>
                                </div>

                                {/* Accordion Body */}
                                <AnimatePresence initial={false}>
                                  {!isCollapsed && (
                                    <motion.div
                                      key="accordion-body"
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                                      className="overflow-hidden"
                                    >
                                      <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-zinc-800/80 mt-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                                          {groupSubjects.map((s: any) => {
                                            const isChecked = profileForm.completedCourses.includes(s.code);
                                            const prereqCodes = extractPrereqCodes(s.description);
                                            const unmetPrereqs = prereqCodes.filter(p => !profileForm.completedCourses.includes(p));
                                            const isLocked = !isChecked && unmetPrereqs.length > 0;

                                            return (
                                              <div 
                                                key={s.id} 
                                                onClick={() => {
                                                  if (isLocked) {
                                                    setFeedback({
                                                      type: 'error',
                                                      message: `لا يمكن تحديد المادة (${s.code}) قبل اجتياز المتطلبات السابقة: ${unmetPrereqs.join(', ')}`
                                                    });
                                                    return;
                                                  }
                                                  const checked = !isChecked;
                                                  const updatedCourses = checked 
                                                    ? [...profileForm.completedCourses, s.code]
                                                    : profileForm.completedCourses.filter(c => c !== s.code);
                                                  
                                                  let newFinishedHours = 0;
                                                  progressData.displayedSubjects.forEach((subj: any) => {
                                                    if (updatedCourses.includes(subj.code)) {
                                                      newFinishedHours += Number(subj.creditHours || 3);
                                                    }
                                                  });

                                                  const newHoursStr = newFinishedHours.toString();
                                                  setProfileForm(p => ({
                                                    ...p,
                                                    completedCourses: updatedCourses,
                                                    finishedHours: newHoursStr
                                                  }));
                                                  saveProfile({
                                                    completedCourses: updatedCourses,
                                                    finishedHours: newHoursStr
                                                  });
                                                }}
                                                className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between gap-2.5 select-none ${
                                                  isChecked 
                                                    ? 'bg-emerald-50/70 border-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-700 shadow-xs cursor-pointer hover:bg-emerald-100/60 dark:hover:bg-emerald-900/50' 
                                                    : isLocked 
                                                      ? 'bg-slate-100/70 border-slate-200 dark:bg-zinc-950/70 dark:border-zinc-800/80 cursor-not-allowed opacity-75' 
                                                      : 'bg-white border-slate-200/90 hover:border-blue-400 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-700 cursor-pointer shadow-2xs hover:shadow-sm'
                                                }`}
                                              >
                                                <div className="flex items-start justify-between gap-2">
                                                  <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-1">
                                                      <span className="font-mono text-[11px] font-bold text-blue-600 dark:text-blue-400">{s.code}</span>
                                                      <span className="text-[10px] text-slate-400 dark:text-zinc-500">•</span>
                                                      <span className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400">{s.creditHours || 3} س</span>
                                                    </div>
                                                    <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1" title={s.name}>{s.name}</h5>
                                                  </div>
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-zinc-800/60 text-[11px]">
                                                  {isChecked ? (
                                                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400">
                                                      <CheckCircle2 className="w-3.5 h-3.5" /> تم الاجتياز
                                                    </span>
                                                  ) : isLocked ? (
                                                    <span className="inline-flex items-center gap-1 font-bold text-amber-700 dark:text-amber-400 truncate" title={`يتطلب اجتياز: ${unmetPrereqs.join(', ')}`}>
                                                      <span>🔒 يتطلب: {unmetPrereqs.join(', ')}</span>
                                                    </span>
                                                  ) : (
                                                    <span className="inline-flex items-center gap-1 font-bold text-slate-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400">
                                                      <span>انقر لتحديد المادة</span>
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 text-sm">
                    لم يتم العثور على مقررات لتتبع التقدم.
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button 
                type="submit"
                disabled={isSaving || usernameStatus === 'taken' || usernameStatus === 'checking'}
                className="btn-rise flex items-center justify-center gap-2 bg-[var(--color-imamu-blue)] text-white font-medium py-3 px-8 rounded-xl hover:bg-[var(--color-imamu-blue-light)] transition disabled:opacity-70 disabled:cursor-not-allowed shadow-sm min-w-[140px] cursor-pointer"
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
