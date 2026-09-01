'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Lock, Mail, Phone, LockKeyhole, User, Loader2, 
  ChevronRight, ChevronLeft, Check, GraduationCap, 
  Calculator, BookOpen, CheckCircle2, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AuthPage() {
  const { user, loading: authLoading, signUpWithEmail, signInWithEmail } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  // Auth Mode: Login vs Signup vs Forgot Password
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [signupStep, setSignupStep] = useState<number>(1);

  // General state
  const [error, setError] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // Forgot password state
  const [forgotCodeSent, setForgotCodeSent] = useState(false);
  const [forgotCode, setForgotCode] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');

  // Main Form Data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    userName: '', // Full Name / Display Name
    major: '',
    currentGpa: '',
  });

  // OTP 6-box state
  const [otpBoxes, setOtpBoxes] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Majors & Subjects data
  const [majorsList, setMajorsList] = useState<any[]>([]);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<string[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // Helper to format student ID to email
  const resolveEmailOrStudentId = (input: string): string => {
    let val = input.trim().toLowerCase();
    val = val.replace(/^s(?=\d{7,10})/i, '');
    if (/^\d{7,10}$/.test(val)) {
      return `${val}@sm.imamu.edu.sa`;
    }
    return val;
  };

  // Fetch Majors list
  const fetchMajors = async () => {
    if (majorsList.length > 0) return;
    try {
      setLoadingData(true);
      const res = await fetch('/api/majors');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setMajorsList(data);
      }
    } catch (e) {
      console.error("Failed to fetch majors", e);
    } finally {
      setLoadingData(false);
    }
  };

  // Fetch Subjects list
  const fetchSubjects = async () => {
    if (subjectsList.length > 0) return;
    try {
      setLoadingData(true);
      const res = await fetch('/api/subjects');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setSubjectsList(data);
      }
    } catch (e) {
      console.error("Failed to fetch subjects", e);
    } finally {
      setLoadingData(false);
    }
  };

  // Handle Send Code for Signup Step 1 or Forgot Password
  const handleSendCode = async () => {
    const resolvedEmail = resolveEmailOrStudentId(formData.email);
    if (!resolvedEmail.includes('@')) {
      setError('يرجى إدخال بريد إلكتروني أو رقم جامعي صحيح.');
      return false;
    }
    setLoadingAction(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resolvedEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إرسال رمز التحقق');
      }

      if (isForgotPassword) {
        setForgotCodeSent(true);
      }

      if (data.devCode) {
        alert(data.message + "\n\nرمز التحقق الخاص بك هو: " + data.devCode);
        const codeStr = String(data.devCode).slice(0, 6);
        const boxes = codeStr.split('');
        while (boxes.length < 6) boxes.push('');
        setOtpBoxes(boxes);
      }
      return true;
    } catch (err: any) {
      setError(err.message || 'فشل إرسال رمز التحقق.');
      return false;
    } finally {
      setLoadingAction(false);
    }
  };

  // OTP Box Change Handler
  const handleOtpChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '');
    if (!cleanVal) {
      const newBoxes = [...otpBoxes];
      newBoxes[index] = '';
      setOtpBoxes(newBoxes);
      return;
    }

    const digit = cleanVal.slice(-1);
    const newBoxes = [...otpBoxes];
    newBoxes[index] = digit;
    setOtpBoxes(newBoxes);

    if (index < 5 && digit) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // OTP Box Keydown Handler
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpBoxes[index] && index > 0) {
        const newBoxes = [...otpBoxes];
        newBoxes[index - 1] = '';
        setOtpBoxes(newBoxes);
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    } else if (e.key === 'ArrowRight' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // OTP Paste Handler
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const digits = pastedText.replace(/\D/g, '').slice(0, 6);
    if (!digits) return;

    const newBoxes = [...otpBoxes];
    for (let i = 0; i < 6; i++) {
      newBoxes[i] = digits[i] || '';
    }
    setOtpBoxes(newBoxes);

    const targetFocus = Math.min(digits.length, 5);
    otpInputRefs.current[targetFocus]?.focus();
  };

  // Handle Login submission
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const resolvedEmail = resolveEmailOrStudentId(formData.email);
    if (!formData.email || !formData.password) {
      return setError('يرجى إدخال اسم المستخدم/البريد وكلمة المرور');
    }
    setLoadingAction(true);
    try {
      await signInWithEmail(resolvedEmail, formData.password);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء تسجيل الدخول');
    } finally {
      setLoadingAction(false);
    }
  };

  // Handle Reset Password submission
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const resolvedEmail = resolveEmailOrStudentId(formData.email);

    if (!forgotCodeSent) {
      await handleSendCode();
      return;
    }

    if (!forgotCode) return setError('رمز التحقق مطلوب.');
    if (formData.password !== repeatPassword) return setError('كلمات المرور غير متطابقة.');
    if (formData.password.length < 6) return setError('يجب أن تكون كلمة المرور 6 خانات على الأقل.');

    setLoadingAction(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resolvedEmail, code: forgotCode, newPassword: formData.password })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'فشل إعادة ضبط كلمة المرور');
      }
      setIsForgotPassword(false);
      setForgotCodeSent(false);
      setForgotCode('');
      setRepeatPassword('');
      setError('تم إعادة ضبط كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.');
    } catch (err: any) {
      setError(err.message || 'فشل إعادة ضبط كلمة المرور');
    } finally {
      setLoadingAction(false);
    }
  };

  // Step 1 -> Step 2
  const handleNextStep1 = async () => {
    setError('');
    const resolvedEmail = resolveEmailOrStudentId(formData.email);
    if (!resolvedEmail.includes('@')) {
      return setError('يرجى إدخال بريد إلكتروني أو رقم جامعي صحيح.');
    }
    if (!formData.password || formData.password.length < 6) {
      return setError('كلمة المرور يجب أن لا تقل عن 6 خانات.');
    }
    if (formData.password !== formData.confirmPassword) {
      return setError('كلمات المرور غير متطابقة.');
    }

    const sent = await handleSendCode();
    if (sent) {
      setSignupStep(2);
    }
  };

  // Step 2 -> Step 3
  const handleNextStep2 = async () => {
    setError('');
    const codeStr = otpBoxes.join('');
    if (codeStr.length < 6) {
      return setError('يرجى إدخال رمز التحقق المكون من 6 أرقام كاملة.');
    }
    await fetchMajors();
    setSignupStep(3);
  };

  // Step 3 (Combined: Name, Phone, Major, GPA) -> Step 4 or Finalize
  const handleNextStep3 = async () => {
    setError('');
    if (!formData.userName.trim()) {
      return setError('يرجى إدخال الاسم الكامل.');
    }
    if (!formData.phone.trim()) {
      return setError('يرجى إدخال رقم الجوال.');
    }

    if (formData.major) {
      await fetchSubjects();
      setSignupStep(4);
    } else {
      await finalizeRegistration();
    }
  };

  const finalizeRegistration = async () => {
    setError('');
    setLoadingAction(true);
    const resolvedEmail = resolveEmailOrStudentId(formData.email);
    const codeStr = otpBoxes.join('');

    try {
      await signUpWithEmail(
        resolvedEmail,
        formData.password,
        formData.phone,
        formData.userName.trim(),
        codeStr,
        {
          major: formData.major || undefined,
          currentGpa: formData.currentGpa || undefined,
          completedCourses: selectedCourses.length > 0 ? selectedCourses : undefined,
        }
      );
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'فشل إنشاء الحساب. يرجى التأكد من البيانات ورمز التحقق.');
    } finally {
      setLoadingAction(false);
    }
  };

  const getCoursesForMajor = () => {
    if (!formData.major || subjectsList.length === 0) return subjectsList;
    const matchedMajor = majorsList.find(m => m.name === formData.major || m.name?.trim() === formData.major?.trim());
    if (matchedMajor && matchedMajor.courseIds && matchedMajor.courseIds.length > 0) {
      return subjectsList.filter(s => matchedMajor.courseIds.some((cid: any) => String(cid) === String(s.id)));
    }
    return subjectsList;
  };

  const stepConfig = [
    { num: 1, label: 'البيانات', icon: Lock },
    { num: 2, label: 'الرمز', icon: Mail },
    { num: 3, label: 'الملف', icon: User },
    { num: 4, label: 'المواد', icon: BookOpen }
  ];

  return (
    <div className="flex-1 flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8 bg-slate-50/50 dark:bg-zinc-950/50 min-h-[calc(100vh-80px)]" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-zinc-800 shadow-xl dark:shadow-2xl text-right overflow-hidden"
      >
        {/* Header Icon & Title */}
        <div className="text-center mb-6">
          <motion.div 
            key={isLogin ? 'login-icon' : `step-icon-${signupStep}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className="mx-auto h-14 w-14 bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-blue-950/80 dark:to-indigo-950/80 rounded-2xl flex items-center justify-center mb-3 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shadow-sm"
          >
            {!isLogin ? (
              signupStep === 4 ? <GraduationCap className="h-7 w-7 text-blue-600 dark:text-blue-400" /> :
              signupStep === 3 ? <Sparkles className="h-7 w-7 text-blue-600 dark:text-blue-400" /> :
              signupStep === 2 ? <Mail className="h-7 w-7 text-blue-600 dark:text-blue-400" /> :
              <Lock className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            ) : (
              <Lock className="h-7 w-7 text-blue-600 dark:text-blue-400" />
            )}
          </motion.div>
          
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
            {isForgotPassword ? 'إعادة ضبط كلمة المرور' : (isLogin ? 'مرحباً بعودتك' : 'إنشاء حساب جديد')}
          </h2>

          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
            {isForgotPassword 
              ? 'أدخل بريدك الإلكتروني الجامعي لإعادة ضبط كلمة المرور' 
              : (isLogin 
                ? 'سجّل الدخول باستخدام بياناتك الجامعية' 
                : `الخطوة ${signupStep} من 4`)}
          </p>
        </div>

        {/* Wizard Step Progress Bar with Lines and Icons underneath */}
        {!isLogin && !isForgotPassword && (
          <div className="mb-6">
            <div className="flex items-center justify-between gap-1.5 mb-2.5">
              {[1, 2, 3, 4].map((stepNum) => {
                const isActive = signupStep === stepNum;
                const isCompleted = signupStep > stepNum;
                return (
                  <div 
                    key={stepNum}
                    className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                      isCompleted ? 'bg-blue-600 dark:bg-blue-500' :
                      isActive ? 'bg-blue-600 dark:bg-blue-400 ring-2 ring-blue-500/20' :
                      'bg-slate-200 dark:bg-zinc-800'
                    }`}
                  />
                );
              })}
            </div>
            
            <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-zinc-400 px-0.5">
              {stepConfig.map((step) => {
                const StepIcon = step.icon;
                const isActive = signupStep === step.num;
                const isCompleted = signupStep > step.num;
                return (
                  <div 
                    key={step.num} 
                    className={`flex items-center gap-1 transition-colors ${
                      isActive || isCompleted ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-zinc-500'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 stroke-[3]" />
                    ) : (
                      <StepIcon className="w-3.5 h-3.5" />
                    )}
                    <span>{step.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Feedback Alert */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 p-3.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs sm:text-sm border border-red-100 dark:border-red-900/40 text-right font-medium"
          >
            {error}
          </motion.div>
        )}

        {/* FORGOT PASSWORD FORM */}
        {isForgotPassword && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-right">
                البريد الإلكتروني الجامعي / الرقم الجامعي
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.email}
                  onChange={x => setFormData({ ...formData, email: x.target.value })}
                  className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                  placeholder="44xxxxxxx@sm.imamu.edu.sa"
                  dir="ltr"
                />
              </div>
            </div>

            {forgotCodeSent && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-right">
                    رمز التحقق
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotCode}
                    onChange={x => setForgotCode(x.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-center font-mono text-lg tracking-widest"
                    placeholder="123456"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-right">
                    كلمة المرور الجديدة
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                      <LockKeyhole className="h-5 w-5" />
                    </div>
                    <input
                      type="password"
                      required
                      value={formData.password}
                      onChange={x => setFormData({ ...formData, password: x.target.value })}
                      className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-right">
                    تأكيد كلمة المرور
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                      <LockKeyhole className="h-5 w-5" />
                    </div>
                    <input
                      type="password"
                      required
                      value={repeatPassword}
                      onChange={x => setRepeatPassword(x.target.value)}
                      className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loadingAction}
              className="btn-rise w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm font-bold transition disabled:opacity-50 cursor-pointer mt-4"
            >
              {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : (forgotCodeSent ? 'إعادة ضبط كلمة المرور' : 'إرسال رمز التحقق')}
            </button>
          </form>
        )}

        {/* LOGIN FORM */}
        {isLogin && !isForgotPassword && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-right">
                البريد الإلكتروني الجامعي / الرقم الجامعي
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.email}
                  onChange={x => setFormData({ ...formData, email: x.target.value })}
                  className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                  placeholder="44xxxxxxx@sm.imamu.edu.sa"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-right">
                كلمة المرور
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={formData.password}
                  onChange={x => setFormData({ ...formData, password: x.target.value })}
                  className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex justify-start">
              <button 
                type="button" 
                onClick={() => { setIsForgotPassword(true); setError(''); setForgotCodeSent(false); }}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
              >
                نسيت كلمة المرور؟
              </button>
            </div>

            <button
              type="submit"
              disabled={loadingAction}
              className="btn-rise w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm font-bold transition disabled:opacity-50 cursor-pointer mt-4"
            >
              {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تسجيل الدخول'}
            </button>
          </form>
        )}

        {/* SIGNUP WIZARD STEPS */}
        {!isLogin && !isForgotPassword && (
          <div>
            <AnimatePresence mode="wait">
              {/* STEP 1: EMAIL & PASSWORD */}
              {signupStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-right">
                      البريد الإلكتروني الجامعي / الرقم الجامعي
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                        <Mail className="h-5 w-5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={formData.email}
                        onChange={x => setFormData({ ...formData, email: x.target.value })}
                        className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                        placeholder="44xxxxxxx@sm.imamu.edu.sa"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-right">
                      كلمة المرور
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                        <LockKeyhole className="h-5 w-5" />
                      </div>
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={x => setFormData({ ...formData, password: x.target.value })}
                        className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-right">
                      تأكيد كلمة المرور
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                        <LockKeyhole className="h-5 w-5" />
                      </div>
                      <input
                        type="password"
                        required
                        value={formData.confirmPassword}
                        onChange={x => setFormData({ ...formData, confirmPassword: x.target.value })}
                        className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextStep1}
                    disabled={loadingAction}
                    className="btn-rise w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm font-bold transition disabled:opacity-50 cursor-pointer mt-5"
                  >
                    {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        <span>إرسال رمز التحقق والمتابعة</span>
                        <ChevronLeft className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {/* STEP 2: 6-BOX OTP CODE INPUT WITH PASTE SUPPORT */}
              {signupStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-5"
                >
                  <div className="text-center">
                    <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-2">
                      أدخل رمز التحقق المكون من 6 أرقام
                    </label>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">
                      تم إرسال الرمز إلى: <span className="font-mono font-bold text-slate-700 dark:text-zinc-300" dir="ltr">{resolveEmailOrStudentId(formData.email)}</span>
                    </p>

                    <div className="flex justify-center gap-2 sm:gap-2.5 my-4" dir="ltr">
                      {otpBoxes.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={el => { otpInputRefs.current[idx] = el; }}
                          type="text"
                          maxLength={1}
                          inputMode="numeric"
                          value={digit}
                          onChange={e => handleOtpChange(idx, e.target.value)}
                          onKeyDown={e => handleOtpKeyDown(idx, e)}
                          onPaste={handleOtpPaste}
                          className="w-10 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono bg-slate-50 dark:bg-zinc-950 border-2 border-slate-200 dark:border-zinc-800 rounded-xl focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 text-slate-900 dark:text-white outline-none transition"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={loadingAction}
                      className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      {loadingAction ? 'جاري إعادة الإرسال...' : 'إعادة إرسال رمز التحقق'}
                    </button>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSignupStep(1)}
                      className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>السابق</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextStep2}
                      className="flex-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>المتابعة</span>
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 3: COMBINED ALL-IN-ONE (الاسم، الجوال، التخصص، والمعدل) */}
              {signupStep === 3 && (
                <motion.div
                  key="step3-combined"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  {/* Card 1: البيانات الشخصية */}
                  <div className="bg-slate-50/70 dark:bg-zinc-950/70 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 space-y-3.5">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60 dark:border-zinc-800/80">
                      <div className="p-1 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                        <User className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">البيانات الشخصية</h4>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 text-right">
                        الاسم الكامل
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                          <User className="h-4 w-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={formData.userName}
                          onChange={x => setFormData({ ...formData, userName: x.target.value })}
                          className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                          placeholder="أحمد محمد"
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 text-right">
                        رقم الجوال
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                          <Phone className="h-4 w-4" />
                        </div>
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={x => setFormData({ ...formData, phone: x.target.value })}
                          className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                          placeholder="05XXXXXXXX"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Card 2: المعلومات الأكاديمية */}
                  <div className="bg-slate-50/70 dark:bg-zinc-950/70 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 space-y-3.5">
                    <div className="flex items-center gap-2 pb-1.5 border-b border-slate-200/60 dark:border-zinc-800/80">
                      <div className="p-1 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">المعلومات الأكاديمية</h4>
                    </div>

                    {/* Major */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 text-right">
                        التخصص الأكاديمي
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <select
                          value={formData.major}
                          onChange={x => setFormData({ ...formData, major: x.target.value })}
                          className="w-full pr-10 pl-4 py-2.5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-sm text-slate-900 dark:text-white outline-none transition text-right cursor-pointer"
                        >
                          <option value="" className="dark:bg-zinc-900">اختر التخصص (اختياري)...</option>
                          {majorsList.map(m => (
                            <option key={m.id} value={m.name} className="dark:bg-zinc-900">{m.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* GPA */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1 text-right">
                        المعدل التراكمي (GPA)
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400 dark:text-zinc-500">
                          <Calculator className="h-4 w-4" />
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="5.0"
                          value={formData.currentGpa}
                          onChange={x => setFormData({ ...formData, currentGpa: x.target.value })}
                          className="w-full pr-10 pl-4 py-2.5 font-mono bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                          placeholder="مثال 4.5"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSignupStep(2)}
                      className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>السابق</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleNextStep3}
                      disabled={loadingAction || loadingData}
                      className="flex-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        formData.major ? (
                          <>
                            <span>التالي (المواد المنجزة)</span>
                            <ChevronLeft className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            <span>إكمال التسجيل</span>
                            <Check className="w-4 h-4" />
                          </>
                        )
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 4: COMPLETED COURSES */}
              {signupStep === 4 && (
                <motion.div
                  key="step4-courses"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="text-right">
                    <label className="block text-sm font-bold text-slate-900 dark:text-white mb-1">
                      المواد الدراسية التي اجتزتها
                    </label>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mb-3">
                      حدد المواد التي قمت باجتيازها بنجاح لمتابعة خطتك الدراسية. يمكنك تخطي هذه الخطوة أو تعديلها لاحقاً من الملف الشخصي.
                    </p>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2 p-1 border border-slate-200/80 dark:border-zinc-800 rounded-2xl bg-slate-50/50 dark:bg-zinc-950/50">
                    {getCoursesForMajor().length === 0 ? (
                      <div className="text-center py-6 text-xs text-slate-500 dark:text-zinc-400">
                        جاري تحميل قائمة المواد...
                      </div>
                    ) : (
                      getCoursesForMajor().map(s => {
                        const isChecked = selectedCourses.includes(s.code);
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              if (isChecked) {
                                setSelectedCourses(selectedCourses.filter(c => c !== s.code));
                              } else {
                                setSelectedCourses([...selectedCourses, s.code]);
                              }
                            }}
                            className={`p-3 rounded-xl border transition-all duration-200 flex items-center justify-between cursor-pointer select-none ${
                              isChecked
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-700'
                                : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:border-blue-400'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                                isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 dark:border-zinc-700'
                              }`}>
                                {isChecked && <Check className="w-3.5 h-3.5" />}
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-xs text-slate-900 dark:text-white block">{s.name}</span>
                                <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400">{s.code} ({s.creditHours || 3} ساعات)</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSignupStep(3)}
                      className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-zinc-800 font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer flex items-center justify-center gap-1"
                    >
                      <ChevronRight className="w-4 h-4" />
                      <span>السابق</span>
                    </button>

                    <button
                      type="button"
                      onClick={finalizeRegistration}
                      disabled={loadingAction}
                      className="flex-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-sm cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                      {loadingAction ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                          <span>إكمال إنشاء الحساب</span>
                          <CheckCircle2 className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Footer switch between Login / Signup */}
        <div className="mt-8 text-center text-sm text-slate-500 dark:text-zinc-400 border-t border-slate-100 dark:border-zinc-800 pt-6">
          <span>
            {isForgotPassword ? "تذكرت كلمة المرور؟ " : (isLogin ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ ")}
          </span>
          <button 
            type="button"
            onClick={() => {
              if (isForgotPassword) {
                setIsForgotPassword(false);
                setIsLogin(true);
              } else {
                setIsLogin(!isLogin);
                setSignupStep(1);
              }
              setError('');
            }}
            className="text-blue-600 dark:text-blue-400 font-bold hover:underline cursor-pointer"
          >
            {isForgotPassword ? 'تسجيل الدخول' : (isLogin ? 'إنشاء حساب' : 'تسجيل الدخول')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
