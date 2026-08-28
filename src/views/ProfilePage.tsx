'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, ChevronUp, UserCircle2, Mail, Phone, BookOpen, Calculator, Clock, CheckCircle2, AlertCircle, Loader2, Layers, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    if (start === end) {
      setDisplayValue(end);
      return;
    }
    
    let totalDuration = 1000;
    let startTime: number | null = null;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / totalDuration, 1);
      // Easing function: easeOutExpo (or just linear, let's use a simple linear/easeOut)
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setDisplayValue(Math.floor(easeOutQuart * (end - start) + start));
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(end);
      }
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <>{displayValue}</>;
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

  const [activeTab, setActiveTab] = useState<'profile' | 'progress'>('profile');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [phoneEditable, setPhoneEditable] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!profileForm.userName || profileForm.userName === dbUser?.userName) {
      setUsernameStatus('idle');
      return;
    }
    const checkUsername = async () => {
      setUsernameStatus('checking');
      try {
        const res = await fetch(`/api/check-username?username=${encodeURIComponent(profileForm.userName)}`, {
          headers: { Authorization: `Bearer ${await user?.getIdToken()}` }
        });
        const data = await res.json();
        if (data.available) {
          setUsernameStatus('available');
        } else {
          setUsernameStatus('taken');
        }
      } catch (err) {
        console.error(err);
        setUsernameStatus('idle');
      }
    };
    
    const delay = setTimeout(checkUsername, 500);
    return () => clearTimeout(delay);
  }, [profileForm.userName, dbUser?.userName, user]);

  useEffect(() => {
    fetch('/api/majors', {
      headers: user ? { Authorization: `Bearer ${user.accessToken}` } : {}
    })
    .then(r => {
      if (!r.ok) {
        throw new Error(`HTTP error! status: ${r.status}`);
      }
      const contentType = r.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new TypeError("Received non-JSON response from server");
      }
      return r.json();
    })
    .then(data => {
      if(Array.isArray(data)) setMajors(data);
    }).catch(err => {
      console.error("Error fetching majors in ProfilePage:", err);
    });
    
    fetch('/api/subjects', {
      headers: user ? { Authorization: `Bearer ${user.accessToken}` } : {}
    })
    .then(r => {
      if (!r.ok) {
        throw new Error(`HTTP error! status: ${r.status}`);
      }
      const contentType = r.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new TypeError("Received non-JSON response from server");
      }
      return r.json();
    })
    .then(data => {
      if(Array.isArray(data)) setSubjects(data);
    }).catch(err => {
      console.error("Error fetching subjects in ProfilePage:", err);
    });

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
    if (usernameStatus === 'taken' || usernameStatus === 'checking') return;
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
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 dark:text-white mb-2">الملف الشخصي</h1>
        <p className="text-sm text-slate-500 dark:text-zinc-400">إدارة التفاصيل الشخصية والأكاديمية والتقدم في المواد الدراسية.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 lg:gap-8 items-start">
        {/* Left Side: Avatar & Basics */}
        <div className="w-full md:w-72 lg:w-80 shrink-0 flex flex-col items-center md:items-start text-center md:text-left bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs h-fit">
          <div className="relative mb-6 group cursor-pointer" onClick={() => document.getElementById('pfp-upload')?.click()}>
            <div className="h-32 w-32 bg-slate-100 dark:bg-zinc-800 rounded-full flex items-center justify-center overflow-hidden border-4 border-white dark:border-zinc-900 shadow-md transition group-hover:opacity-80">
              {profileForm.profilePicUrl ? (
                <img src={profileForm.profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="h-16 w-16 text-slate-400 dark:text-zinc-500" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <span className="text-white text-xs font-medium">تغيير</span>
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
                      const MAX_SIZE = 200;
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
                      const newPicUrl = canvas.toDataURL('image/jpeg', 0.8);
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
          <h2 className="text-xl font-display font-bold text-slate-900 dark:text-white truncate w-full" title={dbUser?.userName || user.email?.split('@')[0]}>
            @{dbUser?.userName || user.email?.split('@')[0]}
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-8 flex items-center justify-center md:justify-start gap-2 truncate w-full">
            {user.email}
          </p>
          
          <button 
            onClick={async () => {
              if (window.confirm('هل أنت متأكد أنك تريد تسجيل الخروج؟')) {
                await signOut();
                router.push('/login');
              }
            }}
            className="w-full py-2.5 px-6 text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-xl transition border border-red-200/50 dark:border-red-900/50"
          >
            تسجيل الخروج
          </button>
        </div>

        {/* Right Side: Form & Progress */}
        <div className="w-full flex-1 min-w-0">
          <div className="flex gap-4 border-b border-slate-200 dark:border-zinc-800 mb-8">
            <button 
              onClick={() => setActiveTab('profile')} 
              className={`pb-3 font-bold transition text-sm ${activeTab === 'profile' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'}`}
            >
              إعدادات الحساب
            </button>
            <button 
              onClick={() => setActiveTab('progress')} 
              className={`pb-3 font-bold transition text-sm ${activeTab === 'progress' ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400' : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'}`}
            >
              التقدم والمقررات
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
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                {/* Personal Details */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-4">التفاصيل الشخصية</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">اسم المستخدم</label>
                      <div className="relative">
                        <div className="absolute right-3 top-3 w-5 h-5 text-slate-400 dark:text-zinc-500 font-medium select-none" dir="ltr">@</div>
                        <input 
                          type="text"
                          placeholder="username"
                          value={profileForm.userName}
                          onChange={e => setProfileForm(p => ({...p, userName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '')}))}
                          className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500"
                          dir="ltr"
                        />
                        <div className="absolute left-3 top-3 flex items-center">
                          {usernameStatus === 'checking' && <div className="w-4 h-4 border-2 border-slate-400 dark:border-zinc-500 border-t-transparent rounded-full animate-spin" />}
                          {usernameStatus === 'available' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                          {usernameStatus === 'taken' && (
                            <span title="اسم المستخدم مستخدم مسبقاً">
                              <AlertCircle className="w-5 h-5 text-red-500" />
                            </span>
                          )}
                        </div>
                      </div>
                      {usernameStatus === 'taken' && <p className="text-xs text-red-500 mt-1">اسم المستخدم هذا مستخدم بالفعل.</p>}
                      {usernameStatus === 'available' && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">اسم المستخدم متاح!</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5 flex justify-between items-center">
                        <span>رقم الجوال</span>
                        {!phoneEditable && (
                          <button type="button" onClick={() => setPhoneEditable(true)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold">
                            تعديل
                          </button>
                        )}
                      </label>
                      <div className="relative">
                        <Phone className="absolute right-3 top-3 w-5 h-5 text-slate-400 dark:text-zinc-500" />
                        <input 
                          type="tel"
                          placeholder="05XXXXXXXX"
                          value={profileForm.phone}
                          disabled={!phoneEditable}
                          onChange={e => setProfileForm(p => ({...p, phone: e.target.value}))}
                          className={`w-full pr-10 pl-4 py-2.5 bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 ${!phoneEditable ? 'opacity-70 cursor-not-allowed' : ''}`}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-200 dark:border-zinc-800" />

                {/* Academic Status */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-4">الحالة الأكاديمية</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">التخصص</label>
                        <div className="relative">
                          <BookOpen className="absolute right-3 top-3 w-5 h-5 text-slate-400 dark:text-zinc-500" />
                          <select 
                            value={profileForm.major} 
                            onChange={e => setProfileForm(p => ({...p, major: e.target.value}))}
                            className="w-full pr-10 pl-10 py-2.5 appearance-none bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition text-sm text-slate-900 dark:text-white"
                          >
                            <option value="" className="dark:bg-zinc-900">اختر التخصص...</option>
                            {majors.map(m => (
                              <option key={m.id} value={m.name} className="dark:bg-zinc-900">{m.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">المعدل التراكمي</label>
                        <div className="relative">
                          <Calculator className="absolute right-3 top-3 w-5 h-5 text-slate-400 dark:text-zinc-500" />
                          <input 
                            type="number" step="0.01" min="0" max="5.0"
                            placeholder="مثال 4.5"
                            value={profileForm.currentGpa}
                            onChange={e => setProfileForm(p => ({...p, currentGpa: e.target.value}))}
                            className="w-full pr-10 pl-4 py-2.5 font-mono bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500"
                            dir="ltr"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1.5">الساعات المكتسبة</label>
                        <div className="relative">
                          <Clock className="absolute right-3 top-3 w-5 h-5 text-slate-400 dark:text-zinc-500" />
                          <input 
                            type="number" min="0"
                            placeholder="110"
                            value={profileForm.finishedHours}
                            onChange={e => setProfileForm(p => ({...p, finishedHours: e.target.value}))}
                            className="w-full pr-10 pl-4 py-2.5 font-mono bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-zinc-900 transition text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500"
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
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-4">الخطة الدراسية وتتبع التقدم</h3>
                {!profileForm.major ? (
                  <div className="bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-8 text-center">
                    <p className="text-slate-600 dark:text-zinc-400 text-sm font-medium">يرجى اختيار التخصص في تبويب الإعدادات أولاً.</p>
                  </div>
                ) : subjects.length > 0 ? (
                  <div className="space-y-6">
                    {(() => {
                      const userMajor = majors.find(m => m.name === profileForm.major || m.name?.trim() === profileForm.major?.trim());
                      const displayedSubjects = userMajor && userMajor.courseIds && userMajor.courseIds.length > 0
                        ? subjects.filter(s => userMajor.courseIds.some((cid: any) => String(cid) === String(s.id)))
                        : subjects;
                      
                      const extractPrereqCodes = (description?: string | null): string[] => {
                        if (!description) return [];
                        const match = description.match(/(?:المتطلبات السابقة:|prereq:?)\s*([A-Z0-9,\s\u0600-\u06FF]+)/i);
                        if (!match) return [];
                        const codes = match[1].match(/[A-Z]{2,4}\d{3,4}|عال\d{4}/g);
                        return codes ? Array.from(new Set(codes)) : [];
                      };

                      const groups = (Object.entries(
                        displayedSubjects.reduce((acc, s) => {
                          let g = 'المتطلبات العامة';
                          let reqCount = 0;
                          if (userMajor && userMajor.courses) {
                            const c = userMajor.courses.find((mc:any) => mc.subjectId === s.id);
                            if (c && c.optionalGroup) {
                              g = c.optionalGroup;
                              reqCount = c.optionalGroupReqCount || 0;
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
                        if (profileForm.completedCourses.includes(s.code)) {
                          totalFinishedHours += Number(s.creditHours || 3);
                        }
                      });

                      groups.forEach(([_, groupSubjects]) => {
                        const totalInGroup = groupSubjects.length;
                        const declaredReqCount = groupSubjects[0]?.reqCount || 0;
                        const reqCount = declaredReqCount > 0 ? declaredReqCount : totalInGroup;
                        const selectedInGroup = groupSubjects.filter(s => profileForm.completedCourses.includes(s.code)).length;
                        
                        totalReq += reqCount;
                        totalFinishedInReq += Math.min(selectedInGroup, reqCount);
                      });

                      const percentFinished = totalReq > 0 ? Math.round((totalFinishedInReq / totalReq) * 100) : 0;
                      const allGroupNames = groups.map(g => g[0]);

                      return (
                        <>
                          {/* Progress Header Card */}
                          <div className="mb-6 bg-slate-50 dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 p-5 rounded-3xl shadow-2xs">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-3 mb-3">
                              <div>
                                <span className="text-slate-900 dark:text-white font-bold block text-base sm:text-lg">نسبة إنجاز الخطة الأكاديمية</span>
                                <span className="text-xs text-slate-500 dark:text-zinc-400 font-medium">
                                  اجتزت <AnimatedNumber value={totalFinishedInReq} /> من {totalReq} مقرر (إجمالي <AnimatedNumber value={totalFinishedHours} /> ساعة معتمدة)
                                </span>
                              </div>
                              <span className="text-blue-600 dark:text-blue-400 font-black text-2xl"><AnimatedNumber value={percentFinished} />%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-zinc-800 rounded-full h-3.5 overflow-hidden p-0.5 mb-4">
                              <motion.div 
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-2.5 rounded-full shadow-xs"
                                initial={{ width: 0 }}
                                animate={{ width: `${percentFinished}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                              />
                            </div>

                            {/* Global Accordion Toggle Bar */}
                            <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 dark:border-zinc-800/60 text-xs">
                              <span className="text-slate-500 dark:text-zinc-400 font-medium">إجمالي {groups.length} حزمة ومستوى</span>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextState: Record<string, boolean> = {};
                                    allGroupNames.forEach(n => { nextState[n] = false; });
                                    setCollapsedGroups(nextState);
                                  }}
                                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-900/50"
                                >
                                  توسيع الكل
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const nextState: Record<string, boolean> = {};
                                    allGroupNames.forEach(n => { nextState[n] = true; });
                                    setCollapsedGroups(nextState);
                                  }}
                                  className="text-xs font-bold text-slate-600 dark:text-zinc-400 hover:underline px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700"
                                >
                                  طي الكل
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Groups / Batches Collapsible List (Dual Independent Column Stacks to eliminate empty grid gaps) */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                            {[
                              groups.filter((_, idx) => idx % 2 === 0),
                              groups.filter((_, idx) => idx % 2 === 1)
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

                                  // Default minimised (collapsed) if full OR all courses locked
                                  const isCollapsed = collapsedGroups[groupName] ?? (isGroupFull || allCoursesInGroupLocked);

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
                                      {!isCollapsed && (
                                        <div className="p-4 sm:p-5 pt-0 border-t border-slate-100 dark:border-zinc-800/80 mt-2">
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                                            {groupSubjects.map(s => {
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
                                                    }
                                                  }}
                                                  className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-2 ${
                                                    isChecked 
                                                      ? 'bg-emerald-50/60 border-emerald-300 dark:bg-emerald-950/30 dark:border-emerald-800' 
                                                      : isLocked 
                                                        ? 'bg-slate-100/70 border-slate-200 dark:bg-zinc-950/70 dark:border-zinc-800/80 cursor-not-allowed opacity-75' 
                                                        : 'bg-blue-50/40 border-blue-200 hover:border-blue-400 dark:bg-blue-950/20 dark:border-blue-900/50'
                                                  }`}
                                                >
                                                  <div className="flex items-start gap-2.5">
                                                    <input 
                                                      type="checkbox"
                                                      checked={isChecked}
                                                      disabled={isLocked}
                                                      onChange={(e) => {
                                                        if (isLocked) return;
                                                        const checked = e.target.checked;
                                                        const updatedCourses = checked 
                                                          ? [...profileForm.completedCourses, s.code]
                                                          : profileForm.completedCourses.filter(c => c !== s.code);
                                                        
                                                        let newFinishedHours = 0;
                                                        displayedSubjects.forEach(subj => {
                                                          if (updatedCourses.includes(subj.code)) {
                                                            newFinishedHours += Number(subj.creditHours || 3);
                                                          }
                                                        });

                                                        setProfileForm(p => ({
                                                          ...p,
                                                          completedCourses: updatedCourses,
                                                          finishedHours: newFinishedHours.toString()
                                                        }));
                                                      }}
                                                      className={`mt-1 w-4 h-4 rounded border-slate-300 dark:border-zinc-700 focus:ring-0 ${
                                                        isLocked 
                                                          ? 'cursor-not-allowed opacity-40 text-slate-400 dark:text-zinc-600 bg-slate-200 dark:bg-zinc-800' 
                                                          : 'cursor-pointer text-blue-600 dark:text-blue-500 bg-white dark:bg-zinc-800'
                                                      }`}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                      <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-zinc-200">{s.code}</span>
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
                                                      <span className="inline-flex items-center gap-1 font-bold text-blue-700 dark:text-blue-400">
                                                        <span>متاح للتسجيل</span>
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
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
                className="flex items-center justify-center gap-2 bg-[var(--color-imamu-blue)] text-white font-medium py-3 px-8 rounded-xl hover:bg-[var(--color-imamu-blue-light)] transition disabled:opacity-70 disabled:cursor-not-allowed shadow-sm min-w-[140px]"
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
