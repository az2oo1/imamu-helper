'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { LogIn, LogOut, Settings, GraduationCap, Menu, X, UserCircle2, Home, Calculator, BookOpen, Calendar, Newspaper, HelpCircle, Sun, Moon, Activity, Shield } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';

export function TopBar() {
  const { user, dbUser, signOut } = useAuth();
  const isAdmin = !!(dbUser?.isAdmin || dbUser?.role === 'ADMIN');
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'الرئيسية', path: '/', icon: Home },
    { name: 'الأدوات', path: '/tools', icon: Calculator },
    { name: 'المصادر', path: '/resources', icon: BookOpen },
    { name: 'التقويم', path: '/calendar', icon: Calendar },
    { name: 'الأخبار', path: '/news', icon: Newspaper },
    { name: 'الدليلة', path: '/how-to', icon: HelpCircle },
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl transition-all" dir="rtl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          
          {/* Logo & Navigation */}
          <div className="flex items-center gap-x-6 md:gap-x-10">
            <button 
              className="md:hidden p-2 -mr-2 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-900 transition"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="القائمة"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Brand Logo */}
            <Link href="/" className="flex items-center group shrink-0 py-1">
              <img 
                src="/logo_dark.png" 
                alt="مساعد الإمام" 
                className="h-12 sm:h-14 w-auto object-contain dark:hidden group-hover:scale-105 transition-transform duration-200" 
              />
              <img 
                src="/logo_light.png" 
                alt="مساعد الإمام" 
                className="h-12 sm:h-14 w-auto object-contain hidden dark:block group-hover:scale-105 transition-transform duration-200" 
              />
            </Link>
            
            {/* Nav Tabs */}
            <LayoutGroup id="topbar-nav">
              <motion.nav 
                layoutRoot
                className="hidden md:flex gap-x-1 h-full items-center text-sm font-semibold relative"
              >
                {navLinks.map((link) => {
                  const isActive = pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      href={link.path}
                      className={clsx(
                        "relative h-9 px-3.5 rounded-full flex items-center gap-2 transition-colors duration-200",
                        isActive 
                          ? "text-slate-900 dark:text-white font-bold" 
                          : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-zinc-900/80"
                      )}
                    >
                      <link.icon className={clsx("w-4 h-4 transition-colors", isActive ? "text-[var(--color-imamu-accent)]" : "text-slate-400 dark:text-zinc-500")} />
                      <span>{link.name}</span>
                      {isActive && (
                        <motion.div
                          layoutId="active-topbar-pill"
                          initial={false}
                          className="absolute inset-0 bg-[var(--color-imamu-brown)/10] dark:bg-[var(--color-imamu-brown)]/15 border border-amber-700/30 rounded-full -z-10"
                          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                        />
                      )}
                    </Link>
                  );
                })}
              </motion.nav>
            </LayoutGroup>
          </div>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button (Desktop only, mobile accesses via burger menu) */}
            <button
              onClick={toggleTheme}
              className="hidden md:flex items-center justify-center w-9 h-9 rounded-full border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 active:scale-95 transition-all"
              title={theme === 'dark' ? 'التحويل إلى الوضع الفاتح' : 'التحويل إلى الوضع الداكن'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4.5 h-4.5 text-[var(--color-imamu-accent)]" />
              ) : (
                <Moon className="w-4.5 h-4.5 text-slate-700" />
              )}
            </button>

            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center justify-center p-1 rounded-full border border-slate-200/80 dark:border-zinc-800/80 bg-slate-50/80 dark:bg-zinc-900/80 hover:bg-slate-100 dark:hover:bg-zinc-800 transition active:scale-95 focus:outline-none cursor-pointer"
                  title={dbUser?.userName || user.displayName || 'الحساب الشخصي'}
                >
                  <div className="w-8.5 h-8.5 rounded-full overflow-hidden bg-slate-200 dark:bg-zinc-800 flex items-center justify-center border border-slate-300/80 dark:border-zinc-700/80 shrink-0">
                    {(dbUser as any)?.profilePicUrl ? (
                      <img src={(dbUser as any).profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle2 className="w-6 h-6 text-slate-400 dark:text-zinc-400" />
                    )}
                  </div>
                </button>

                <AnimatePresence>
                  {profileMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setProfileMenuOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute left-0 mt-2 w-52 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/80 dark:border-zinc-800/80 py-2 z-50 overflow-hidden"
                      >
                        <div className="px-4 py-2 border-b border-slate-100 dark:border-zinc-800 mb-1 text-right">
                          <p className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">الحساب الشخصي</p>
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{dbUser?.userName || 'طالب'}</p>
                        </div>
                        <Link 
                          href="/profile" 
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition text-right"
                          dir="rtl"
                        >
                          <UserCircle2 className="w-4 h-4 text-slate-400 dark:text-zinc-400" />
                          إعدادات الملف الشخصي
                        </Link>
                        {isAdmin && (
                          <>
                            <Link 
                              href="/admin" 
                              onClick={() => setProfileMenuOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-[var(--color-imamu-accent)] hover:bg-slate-50 dark:hover:bg-zinc-800 transition text-right"
                              dir="rtl"
                            >
                              <Shield className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                              لوحة تحكم المسؤول
                            </Link>
                            <Link 
                              href="/admin/logs" 
                              onClick={() => setProfileMenuOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-zinc-800 transition text-right"
                              dir="rtl"
                            >
                              <Activity className="w-4 h-4 text-emerald-500" />
                              سجلات أحداث النظام
                            </Link>
                          </>
                        )}
                        <hr className="my-1 border-slate-100 dark:border-zinc-800" />
                        <button
                          onClick={() => {
                            signOut();
                            setProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition text-right"
                          dir="rtl"
                        >
                          <LogOut className="w-4 h-4 text-red-500" />
                          تسجيل الخروج
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-full bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white px-5 py-2 text-xs font-bold transition-all shadow-md shadow-[var(--color-imamu-brown)/20] active:scale-95"
              >
                <LogIn className="w-4 h-4" />
                <span>تسجيل الدخول</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-slate-900/40 dark:bg-black/70 backdrop-blur-xs md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="fixed inset-y-0 right-0 w-72 z-[70] bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-l border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col md:hidden"
              dir="rtl"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center py-1">
                  <img 
                    src="/logo_dark.png" 
                    alt="مساعد الإمام" 
                    className="h-11 w-auto object-contain dark:hidden" 
                  />
                  <img 
                    src="/logo_light.png" 
                    alt="مساعد الإمام" 
                    className="h-11 w-auto object-contain hidden dark:block" 
                  />
                </Link>
                <button 
                  className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-900"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex flex-col p-4 gap-1.5 flex-1 overflow-y-auto">
                {navLinks.map((link) => {
                  const isActive = pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      href={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={clsx(
                        "px-4 py-3 rounded-2xl flex items-center gap-3 text-sm font-semibold transition-all",
                        isActive 
                          ? "bg-[var(--color-imamu-brown)/10] text-[var(--color-imamu-accent)] border border-amber-700/30 font-bold" 
                          : "text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-900 hover:text-slate-900 dark:hover:text-white"
                      )}
                    >
                      <link.icon className={clsx("w-4 h-4", isActive ? "text-[var(--color-imamu-accent)]" : "text-slate-400 dark:text-zinc-500")} />
                      {link.name}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 flex flex-col gap-3">
                <button
                  onClick={toggleTheme}
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-800 dark:text-zinc-200"
                >
                  <span>النمط ({theme === 'dark' ? 'داكن' : 'فاتح'})</span>
                  {theme === 'dark' ? <Sun className="w-4 h-4 text-[var(--color-imamu-accent)]" /> : <Moon className="w-4 h-4 text-slate-700" />}
                </button>

                {user && (
                  <>
                    <div className="flex items-center gap-3 mt-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-200 dark:bg-zinc-800 border border-slate-300 dark:border-zinc-700 shrink-0">
                        {(dbUser as any)?.profilePicUrl ? (
                          <img src={(dbUser as any).profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <UserCircle2 className="w-10 h-10 text-slate-400" />
                        )}
                      </div>
                      <div className="flex flex-col overflow-hidden text-right">
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{dbUser?.userName || user.displayName || 'طالب'}</span>
                        <span className="text-xs text-slate-500 dark:text-zinc-400 truncate">{dbUser?.major || 'طالب'}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => { signOut(); setMobileMenuOpen(false); }}
                      className="flex w-full justify-center items-center gap-2 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 px-4 py-2.5 text-xs font-bold text-red-600 dark:text-red-400 transition hover:bg-red-100"
                    >
                      <LogOut className="w-4 h-4" />
                      تسجيل الخروج
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
