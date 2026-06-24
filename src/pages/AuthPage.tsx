import React, { useState } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, Phone, LockKeyhole, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function AuthPage() {
  const { signUpWithEmail, signInWithEmail } = useAuth();
  const navigate = useNavigate();
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

    // Mild validation for college email (Optional but helps enforce intention)
    // If not strict, at least check if it's an email
    if (!formData.email.includes('@')) {
      return setError('Please enter a valid email address.');
    }

    try {
      if (isForgotPassword) {
        if (!codeSent) {
          return handleSendCode();
        }
        if (!code) return setError('Verification code is required.');
        if (formData.password !== repeatPassword) return setError('Passwords do not match.');
        if (formData.password.length < 6) return setError('Password must be at least 6 characters.');
        
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: formData.email, code, newPassword: formData.password })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to reset password');
        }
        setIsForgotPassword(false);
        setCodeSent(false);
        setCode('');
        setRepeatPassword('');
        return setError('Password reset successfully. You can now log in.');
      }

      if (isLogin) {
        await signInWithEmail(formData.email, formData.password);
        navigate('/');
      } else {
        if (!codeSent) {
          return handleSendCode();
        }
        if (!formData.phone) {
          return setError('Phone number is required for student verification.');
        }
        if (!formData.userName) {
          return setError('Username is required.');
        }
        if (!code) {
          return setError('Verification code is required.');
        }
        await signUpWithEmail(formData.email, formData.password, formData.phone, formData.userName, code);
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during authentication.');
    }
  };

  const handleSendCode = async () => {
    if (!formData.email.includes('@')) {
      return setError('Please enter a valid email address.');
    }
    setSendingCode(true);
    setError('');
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to send code');
      }
      setCodeSent(true);
      setError('Verification code sent to your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code.');
    }
    setSendingCode(false);
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-100 shadow-xl"
      >
        <div className="text-center mb-10">
          <div className="mx-auto h-16 w-16 bg-[rgba(11,50,96,0.06)] rounded-2xl flex items-center justify-center mb-4">
            <Lock className="h-8 w-8 text-[var(--color-imamu-blue)]" />
          </div>
          <h2 className="text-3xl font-display font-bold text-gray-900">
            {isForgotPassword ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Create Account')}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {isForgotPassword ? 'Enter your email to reset your password' : (isLogin 
              ? 'Sign in with your university credentials' 
              : 'Sign up using your college email and phone number')}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">College Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                value={formData.email}
                onChange={x => setFormData({ ...formData, email: x.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-imamu-blue)] outline-none transition"
                placeholder="student@imamu.edu.sa"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        required={isForgotPassword && codeSent}
                        value={code}
                        onChange={x => setCode(x.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-imamu-blue)] outline-none transition"
                        placeholder="123456"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Repeat Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LockKeyhole className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="password"
                        required={isForgotPassword && codeSent}
                        value={repeatPassword}
                        onChange={x => setRepeatPassword(x.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-imamu-blue)] outline-none transition"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        required={!isLogin}
                        value={formData.userName}
                        onChange={x => setFormData({ ...formData, userName: x.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-imamu-blue)] outline-none transition"
                        placeholder="coolstudent123"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Phone className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="tel"
                        required={!isLogin}
                        value={formData.phone}
                        onChange={x => setFormData({ ...formData, phone: x.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-imamu-blue)] outline-none transition"
                        placeholder="05X XXX XXXX"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">The bot will approve the number immediately when you join the group.</p>
                  </div>
                  
                  {codeSent && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Mail className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        required={!isLogin && codeSent}
                        value={code}
                        onChange={x => setCode(x.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-imamu-blue)] outline-none transition"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">{isForgotPassword ? 'New Password' : 'Password'}</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <LockKeyhole className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                required
                value={formData.password}
                onChange={x => setFormData({ ...formData, password: x.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[var(--color-imamu-blue)] outline-none transition"
                placeholder="••••••••"
              />
            </div>
          </div>
          )}

          {isLogin && !isForgotPassword && (
            <div className="flex justify-end">
              <button 
                type="button" 
                onClick={() => { setIsForgotPassword(true); setError(''); setCodeSent(false); }}
                className="text-sm font-medium text-[var(--color-imamu-blue)] hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={sendingCode}
            className="w-full flex justify-center py-3.5 px-4 rounded-xl text-white bg-[var(--color-imamu-blue)] hover:bg-[var(--color-imamu-blue-light)] shadow-sm font-medium transition disabled:opacity-50"
          >
            {isForgotPassword 
              ? (codeSent ? 'Reset Password' : (sendingCode ? 'Sending Code...' : 'Send Reset Code'))
              : (isLogin ? 'Sign In' : (codeSent ? 'Create Account' : (sendingCode ? 'Sending Code...' : 'Send Verification Code')))
            }
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500 border-t border-gray-100 pt-6">
          {isForgotPassword ? "Remember your password? " : (isLogin ? "Don't have an account? " : "Already have an account? ")}
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
            className="text-[var(--color-imamu-blue)] font-medium hover:underline"
          >
            {isForgotPassword ? 'Sign In' : (isLogin ? 'Sign Up' : 'Sign In')}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
