'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useRouter } from 'next/navigation';
import { Lock, Mail, Phone, LockKeyhole, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AuthPage() {
  const { user, loading: authLoading, signUpWithEmail, signInWithEmail } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/profile');
    }
  }, [user, authLoading, router]);
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [repeatPassword, setRepeatPassword] = useState('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    userName: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isLogin && !formData.email.includes('@')) {
      return setError('يرجى إدخال بريد إلكتروني صحيح للإنشاء.');
    }

    try {
      if (isForgotPassword) {
        if (!codeSent) {
          return handleSendCode();
        }
        if (!code) return setError('رمز التحقق مطلوب.');
        if (formData.password !== repeatPassword) return setError('كلمات المرور غير متطابقة.');
        if (formData.password.length < 6) return setError('يجب أن تكون كلمة المرور 6 خانات على الأقل.');
        
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, code, newPassword: formData.password })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'فشل إعادة ضبط كلمة المرور');
        }
        setIsForgotPassword(false);
        setCodeSent(false);
        setCode('');
        setRepeatPassword('');
        return setError('تم إعادة ضبط كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.');
      }

      if (isLogin) {
        await signInWithEmail(formData.email, formData.password);
        router.push('/');
      } else {
        if (!codeSent) {
          return handleSendCode();
        }
        if (!formData.phone) {
          return setError('رقم الجوال مطلوب للتحقق من هوية الطالب.');
        }
        if (!formData.userName) {
          return setError('اسم المستخدم مطلوب.');
        }
        if (!code) {
          return setError('رمز التحقق مطلوب.');
        }
        await signUpWithEmail(formData.email, formData.password, formData.phone, formData.userName, code);
        router.push('/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'حدث خطأ أثناء عملية المصادقة.');
    }
  };

  const handleSendCode = async () => {
    if (!formData.email.includes('@')) {
      return setError('يرجى إدخال بريد إلكتروني صحيح.');
    }
    setSendingCode(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إرسال رمز التحقق');
      }
      setCodeSent(true);
      if (data.devCode) {
        alert(data.message + "\n\nالرمز: " + data.devCode);
        setCode(data.devCode);
        setError('تم إنشاء رمز التحقق في وضع التطوير.');
      } else {
        setError('تم إرسال رمز التحقق إلى بريدك الإلكتروني.');
      }
    } catch (err: any) {
      setError(err.message || 'فشل إرسال رمز التحقق.');
    }
    setSendingCode(false);
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50/50 dark:bg-zinc-950/50 min-h-[calc(100vh-80px)]" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-slate-200/80 dark:border-zinc-800 shadow-xl dark:shadow-2xl text-right"
      >
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-blue-50 dark:bg-blue-950/60 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 shadow-2xs">
            <Lock className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 dark:text-white">
            {isForgotPassword ? 'إعادة ضبط كلمة المرور' : (isLogin ? 'مرحباً بعودتك' : 'إنشاء حساب جديد')}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
            {isForgotPassword ? 'أدخل بريدك الإلكتروني الجامعي لإعادة ضبط كلمة المرور' : (isLogin 
              ? 'سجّل الدخول باستخدام بياناتك الجامعية' 
              : 'سجّل باستخدام بريدك الإلكتروني الجامعي ورقم الجوال')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-sm border border-red-100 dark:border-red-900/40 text-right">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-right">
              {isLogin ? 'البريد الإلكتروني / الرقم الجامعي / اسم المستخدم' : 'البريد الإلكتروني الجامعي'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
              </div>
              <input
                type={isLogin ? "text" : "email"}
                required
                value={formData.email}
                onChange={x => setFormData({ ...formData, email: x.target.value })}
                className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                placeholder={isLogin ? "447013338 أو student@imamu.edu.sa" : "student@imamu.edu.sa"}
                dir="ltr"
              />
            </div>
          </div>

          <AnimatePresence>
            {isForgotPassword && codeSent && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden px-1 -mx-1"
              >
                <div className="pt-1 pb-1 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-right">
                      رمز التحقق
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
                      </div>
                      <input
                        type="text"
                        required={isForgotPassword && codeSent}
                        value={code}
                        onChange={x => setCode(x.target.value)}
                        className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                        placeholder="123456"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-right">
                      تأكيد كلمة المرور
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                        <LockKeyhole className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
                      </div>
                      <input
                        type="password"
                        required={isForgotPassword && codeSent}
                        value={repeatPassword}
                        onChange={x => setRepeatPassword(x.target.value)}
                        className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {!isLogin && !isForgotPassword && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden px-1 -mx-1"
              >
                <div className="pt-1 pb-1 space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-right">
                      اسم المستخدم
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
                      </div>
                      <input
                        type="text"
                        required={!isLogin}
                        value={formData.userName}
                        onChange={x => setFormData({ ...formData, userName: x.target.value })}
                        className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                        placeholder="طالب_الجامعة"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-right">
                      رقم الجوال
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
                      </div>
                      <input
                        type="tel"
                        required={!isLogin}
                        value={formData.phone}
                        onChange={x => setFormData({ ...formData, phone: x.target.value })}
                        className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                        placeholder="05X XXX XXXX"
                      />
                    </div>
                    <p className="mt-1 text-xs text-slate-500 dark:text-zinc-400 text-right">سيتم اعتماد الرقم تلقائياً فور انضمامك للمجموعة.</p>
                  </div>
                  
                  {codeSent && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-right">
                      رمز التحقق
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
                      </div>
                      <input
                        type="text"
                        required={!isLogin && codeSent}
                        value={code}
                        onChange={x => setCode(x.target.value)}
                        className="w-full pr-11 pl-4 py-3 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-600 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 outline-none transition text-right"
                        placeholder="123456"
                      />
                    </div>
                  </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {(!isForgotPassword || codeSent) && (
          <div className={isForgotPassword ? "mt-5" : ""}>
            <label className="block text-sm font-medium text-slate-700 dark:text-zinc-300 mb-1 text-right">
              {isForgotPassword ? 'كلمة المرور الجديدة' : 'كلمة المرور'}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                <LockKeyhole className="h-5 w-5 text-slate-400 dark:text-zinc-500" />
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
          )}

          {isLogin && !isForgotPassword && (
            <div className="flex justify-start">
              <button 
                type="button" 
                onClick={() => { setIsForgotPassword(true); setError(''); setCodeSent(false); }}
                className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={sendingCode}
            className="btn-rise w-full flex justify-center py-3.5 px-4 rounded-xl text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 shadow-sm font-bold transition disabled:opacity-50 cursor-pointer"
          >
            {isForgotPassword 
              ? (codeSent ? 'إعادة ضبط كلمة المرور' : (sendingCode ? 'جاري إرسال الرمز...' : 'إرسال رمز التحقق'))
              : (isLogin ? 'تسجيل الدخول' : (codeSent ? 'إنشاء الحساب' : (sendingCode ? 'جاري إرسال الرمز...' : 'إرسال رمز التحقق')))
            }
          </button>
        </form>

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
              }
              setError('');
            }}
            className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
          >
            {isForgotPassword ? 'تسجيل الدخول' : (isLogin ? 'إنشاء حساب' : 'تسجيل الدخول')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
