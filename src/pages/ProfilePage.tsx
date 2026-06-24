import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, UserCircle2, Mail, Phone, BookOpen, Calculator, Clock, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ProfilePage() {
  const { user, dbUser, refreshToken, signOut } = useAuth();
  const navigate = useNavigate();
  const [majors, setMajors] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  
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
    if (!user) {
      navigate('/login');
      return;
    }
  }, [user, navigate]);

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
      setFeedback({ type: 'success', message: 'Profile updated successfully!' });
      setPhoneEditable(false);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      console.error(err);
      setFeedback({ type: 'error', message: err.message || 'Error saving profile. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex flex-col flex-1 max-w-4xl w-full mx-auto pb-24">
      <div className="mb-10 text-left">
        <h1 className="text-4xl font-display font-bold text-gray-900 mb-2">My Profile</h1>
        <p className="text-gray-500">Manage your personal and academic details.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-12 lg:gap-24">
        {/* Left Side: Avatar & Basics */}
        <div className="w-full md:w-1/3 flex flex-col items-center md:items-start text-center md:text-left">
          <div className="relative mb-6 group cursor-pointer" onClick={() => document.getElementById('pfp-upload')?.click()}>
            <div className="h-32 w-32 bg-gray-50 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-sm transition group-hover:opacity-80">
              {profileForm.profilePicUrl ? (
                <img src={profileForm.profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <UserCircle2 className="h-16 w-16 text-gray-400" />
              )}
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <span className="text-white text-xs font-medium">Change</span>
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
          <h2 className="text-2xl font-display font-bold text-gray-900 truncate w-full" title={dbUser?.userName || user.email?.split('@')[0]}>
            @{dbUser?.userName || user.email?.split('@')[0]}
          </h2>
          <p className="text-sm text-gray-500 mb-8 flex items-center justify-center md:justify-start gap-2 truncate w-full">
            {user.email}
          </p>
          
          <button 
            onClick={async () => {
              if (window.confirm('Are you sure you want to log out?')) {
                await signOut();
                navigate('/login');
              }
            }}
            className="w-full md:w-auto py-2.5 px-6 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition"
          >
            Log Out
          </button>
        </div>

        {/* Right Side: Form */}
        <div className="w-full md:w-2/3">
          <div className="flex gap-4 border-b border-gray-200 mb-8">
            <button 
              onClick={() => setActiveTab('profile')} 
              className={`pb-3 font-medium transition ${activeTab === 'profile' ? 'text-[var(--color-imamu-blue)] border-b-2 border-[var(--color-imamu-blue)]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Profile Settings
            </button>
            <button 
              onClick={() => setActiveTab('progress')} 
              className={`pb-3 font-medium transition ${activeTab === 'progress' ? 'text-[var(--color-imamu-blue)] border-b-2 border-[var(--color-imamu-blue)]' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Progress & Courses
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
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Personal Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                      <div className="relative">
                        <div className="absolute left-3 top-3 w-5 h-5 text-gray-400 font-medium select-none">@</div>
                        <input 
                          type="text"
                          placeholder="username"
                          value={profileForm.userName}
                          onChange={e => setProfileForm(p => ({...p, userName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '')}))}
                          className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)] focus:bg-white transition text-sm text-gray-900"
                        />
                        <div className="absolute right-3 top-3 flex items-center">
                          {usernameStatus === 'checking' && <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />}
                          {usernameStatus === 'available' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                          {usernameStatus === 'taken' && <AlertCircle className="w-5 h-5 text-red-500" title="Username taken" />}
                        </div>
                      </div>
                      {usernameStatus === 'taken' && <p className="text-xs text-red-500 mt-1">This username is already taken.</p>}
                      {usernameStatus === 'available' && <p className="text-xs text-green-600 mt-1">Username available!</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between items-center">
                        <span>Phone Number</span>
                        {!phoneEditable && (
                          <button type="button" onClick={() => setPhoneEditable(true)} className="text-[var(--color-imamu-blue)] hover:underline text-xs">
                            Edit
                          </button>
                        )}
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input 
                          type="tel"
                          placeholder="05XXXXXXXX"
                          value={profileForm.phone}
                          disabled={!phoneEditable}
                          onChange={e => setProfileForm(p => ({...p, phone: e.target.value}))}
                          className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)] focus:bg-white transition text-sm text-gray-900 ${!phoneEditable ? 'opacity-70 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* Academic Status */}
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Academic Status</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Major</label>
                        <div className="relative">
                          <BookOpen className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                          <select 
                            value={profileForm.major} 
                            onChange={e => setProfileForm(p => ({...p, major: e.target.value}))}
                            className="w-full pl-10 pr-10 py-2.5 appearance-none bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)] focus:bg-white transition text-sm text-gray-900"
                          >
                            <option value="">Select a Major...</option>
                            {majors.map(m => (
                              <option key={m.id} value={m.name}>{m.name}</option>
                            ))}
                            {!majors.length && <option value="Computer Science">Computer Science</option>}
                            {!majors.length && <option value="Information Systems">Information Systems</option>}
                            {!majors.length && <option value="Information Technology">Information Technology</option>}
                          </select>
                          <ChevronDown className="absolute right-3 top-3.5 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Current GPA</label>
                        <div className="relative">
                          <Calculator className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                          <input 
                            type="number" step="0.01" min="0" max="5.0"
                            placeholder="e.g. 4.5"
                            value={profileForm.currentGpa}
                            onChange={e => setProfileForm(p => ({...p, currentGpa: e.target.value}))}
                            className="w-full pl-10 pr-4 py-2.5 font-mono bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)] focus:bg-white transition text-sm text-gray-900"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Completed Hours</label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                          <input 
                            type="number" min="0"
                            placeholder="110"
                            value={profileForm.finishedHours}
                            onChange={e => setProfileForm(p => ({...p, finishedHours: e.target.value}))}
                            className="w-full pl-10 pr-4 py-2.5 font-mono bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[var(--color-imamu-blue)] focus:bg-white transition text-sm text-gray-900"
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
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Course Progress</h3>
                {!profileForm.major ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
                    <p className="text-gray-500 font-medium">Please select a major in the Profile tab first.</p>
                  </div>
                ) : subjects.length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(
                      (() => {
                        const userMajor = majors.find(m => m.name === profileForm.major);
                        const displayedSubjects = userMajor ? subjects.filter(s => userMajor.courseIds?.includes(s.id)) : subjects;
                        return displayedSubjects.reduce((acc, s) => {
                          let g = 'General Requirements';
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
                        }, {} as Record<string, any[]>);
                      })()
                    ).sort((a, b) => a[0] === 'General Requirements' ? -1 : b[0] === 'General Requirements' ? 1 : 0)
                    .map(([groupName, groupSubjects]: [string, any[]]) => {
                      const totalInGroup = groupSubjects.length;
                      const declaredReqCount = groupSubjects[0]?.reqCount || 0;
                      const reqCount = declaredReqCount > 0 ? declaredReqCount : totalInGroup;
                      
                      const selectedInGroup = groupSubjects.filter(s => profileForm.completedCourses.includes(s.code)).length;
                      const isGroupFull = selectedInGroup >= reqCount;

                      return (
                        <div key={groupName} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                          <div className="flex justify-between items-end mb-3">
                            <h4 className="font-semibold text-gray-900">{groupName}</h4>
                            <span className="text-xs font-medium bg-purple-100 text-purple-800 px-2.5 py-1 rounded-md">
                              Completed: {selectedInGroup} / {reqCount}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {groupSubjects.map(s => {
                              const isChecked = profileForm.completedCourses.includes(s.code);
                              const isDisabled = !isChecked && isGroupFull;
                              return (
                                <label key={s.id} className={`flex items-center gap-2 cursor-pointer p-2 rounded-lg transition ${isDisabled ? 'opacity-50 grayscale' : 'hover:bg-white bg-gray-50/50'}`}>
                                  <input 
                                    type="checkbox"
                                    checked={isChecked}
                                    disabled={isDisabled}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setProfileForm(p => ({
                                        ...p,
                                        completedCourses: checked 
                                          ? [...p.completedCourses, s.code]
                                          : p.completedCourses.filter(c => c !== s.code)
                                      }));
                                    }}
                                    className="w-4 h-4 text-[var(--color-imamu-blue)] rounded border-gray-300 focus:ring-0 disabled:text-gray-400"
                                  />
                                  <span className="text-sm font-medium text-gray-700">{s.code}</span>
                                  <span className="text-xs text-gray-500 truncate" title={s.name}>{s.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
                    No subjects found for progress tracking.
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
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
