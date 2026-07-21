'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/AuthContext';
import { LogIn, LogOut, Settings, GraduationCap, Menu, X, UserCircle2, Home, Calculator, BookOpen, Calendar, Newspaper, HelpCircle } from 'lucide-react';
import clsx from 'clsx';
import { motion, AnimatePresence } from 'motion/react';

export function TopBar() {
  const { user, dbUser, signOut } = useAuth();
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
      <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/80 backdrop-blur-md" dir="rtl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-x-4 md:gap-x-8">
            <button 
              className="md:hidden p-2 -mr-2 text-gray-500 hover:text-gray-900 rounded-md"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link href="/" className="flex items-center gap-2 text-[var(--color-imamu-blue)] font-display font-bold text-xl tracking-tight">
              <GraduationCap className="h-6 w-6 text-[var(--color-imamu-gold)]" />
              <span className="hidden sm:inline">مساعد الإمام</span>
            </Link>
            
            <nav className="hidden md:flex gap-x-6 h-full items-center text-sm font-medium">
              {navLinks.map((link) => {
                const isActive = pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    className={clsx(
                      "relative h-16 flex items-center gap-2 px-1 transition-colors hover:text-[var(--color-imamu-blue)]",
                      isActive ? "text-[var(--color-imamu-blue)]" : "text-gray-500"
                    )}
                  >
                    <link.icon className="w-4 h-4" />
                    {link.name}
                    {isActive && (
                      <div
                        className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--color-imamu-blue)] rounded-t-full"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {dbUser?.isAdmin && (
              <Link href="/admin" className="p-2 text-gray-500 hover:text-[var(--color-imamu-blue)] transition-colors rounded-full hover:bg-gray-100">
                <Settings className="w-5 h-5" />
              </Link>
            )}

            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 focus:outline-none"
                >
                  <div className="hidden sm:flex flex-col items-end hover:opacity-80 transition-opacity">
                    <span className="text-sm font-medium text-gray-900 leading-tight">@{dbUser?.userName || user.email?.split('@')[0]}</span>
                    <span className="text-xs text-gray-500">{dbUser?.major || 'Student'}</span>
                  </div>
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200 shadow-sm transition hover:ring-2 hover:ring-[var(--color-imamu-blue)] hover:ring-offset-2">
                    {(dbUser as any)?.profilePicUrl ? (
                      <img src={(dbUser as any).profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle2 className="w-8 h-8 text-gray-400" />
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
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-48 bg-zinc-950 rounded-xl shadow-none border border-zinc-800 py-2 z-50"
                      >
                        <Link 
                          href="/profile" 
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-zinc-50 transition"
                          dir="rtl"
                        >
                          <Settings className="w-4 h-4 text-zinc-400" />
                          إعدادات الملف الشخصي
                        </Link>
                        <hr className="my-1 border-zinc-800" />
                        <button
                          onClick={() => {
                            signOut();
                            setProfileMenuOpen(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-950/20 transition"
                          dir="rtl"
                        >
                          <LogOut className="w-4 h-4 text-red-400" />
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
                className="flex items-center gap-2 rounded-full bg-[var(--color-imamu-blue)] px-4 sm:px-5 py-2 text-sm font-medium text-white transition hover:bg-[var(--color-imamu-blue-light)] shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">تسجيل الدخول</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-gray-900/50 backdrop-blur-sm md:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="fixed inset-y-0 right-0 w-64 z-[70] bg-white shadow-2xl flex flex-col md:hidden"
              dir="rtl"
            >
               <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 text-[var(--color-imamu-blue)] font-display font-bold text-lg">
                  <GraduationCap className="h-6 w-6 text-[var(--color-imamu-gold)]" />
                  <span>مساعد الإمام</span>
                </Link>
                <button 
                  className="p-2 text-gray-400 hover:text-gray-900 rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex flex-col p-4 gap-2 flex-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.path;
                  return (
                    <Link
                      key={link.path}
                      href={link.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={clsx(
                        "px-4 py-3 rounded-xl flex items-center gap-3 text-base font-medium transition-colors",
                        isActive ? "bg-sky-50 text-[var(--color-imamu-blue)]" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      )}
                    >
                      <link.icon className={clsx("w-5 h-5", isActive ? "text-[var(--color-imamu-blue)]" : "text-gray-400")} />
                      {link.name}
                    </Link>
                  );
                })}
              </nav>
              {user && (
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 shrink-0">
                      {(dbUser as any)?.profilePicUrl ? (
                        <img src={(dbUser as any).profilePicUrl} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <UserCircle2 className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-sm font-medium text-gray-900 mb-0.5 truncate">{user.email?.split('@')[0]}</span>
                      <span className="text-xs text-gray-500 truncate">{dbUser?.major || 'Student'}</span>
                    </div>
                  </div>
                  <Link 
                    href="/profile" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center px-4 py-2 mb-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    View Profile
                  </Link>
                  <button
                    onClick={() => { signOut(); setMobileMenuOpen(false); }}
                    className="flex w-full justify-center items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-300"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
