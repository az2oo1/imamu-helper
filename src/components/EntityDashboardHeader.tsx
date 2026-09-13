'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Edit3, Newspaper, Users, Shield, ExternalLink, BadgeCheck, ArrowRight, Layout, LayoutList, ChevronLeft
} from 'lucide-react';
import { SpotlightCard } from './ui/SpotlightCard';

interface EntityDashboardHeaderProps {
  account: {
    id: number;
    handle: string;
    displayName?: string;
    bio?: string;
    bannerUrl?: string;
    profilePicUrl?: string;
    followersCount?: number;
    articles?: any[];
  };
  activePage: 'grid' | 'settings' | 'composer' | 'articles' | 'managers';
  publishedCount?: number;
}

export function EntityDashboardHeader({
  account,
  activePage,
  publishedCount = 0
}: EntityDashboardHeaderProps) {
  const router = useRouter();
  const cleanHandle = account.handle.replace(/^@/, '');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const apps = [
    {
      id: 'settings',
      href: `/@/${encodeURIComponent(cleanHandle)}/dashboard/settings`,
      title: 'إعدادات الملف الشخصي',
      description: 'تعديل الشعار، الغلاف، النبذة والروابط',
      icon: Edit3,
      badgeCount: undefined,
      gradient: 'from-[var(--color-imamu-brown)] via-[#784d28] to-[#5c3a1e]'
    },
    {
      id: 'composer',
      href: `/@/${encodeURIComponent(cleanHandle)}/dashboard/composer`,
      title: 'محرر المقالات',
      description: 'صياغة ونشر الأخبار والتحديثات',
      icon: Newspaper,
      badgeCount: undefined,
      gradient: 'from-[var(--color-imamu-brown-dark)] via-[#6b4725] to-[var(--color-imamu-brown)]'
    },
    {
      id: 'articles',
      href: `/@/${encodeURIComponent(cleanHandle)}/dashboard/articles`,
      title: 'المنشورات المقالية',
      description: `الأخبار والمقالات المنشورة (${publishedCount})`,
      icon: LayoutList,
      badgeCount: publishedCount > 0 ? publishedCount : undefined,
      gradient: 'from-[#6e4624] via-[var(--color-imamu-brown)] to-[#966b40]'
    },
    {
      id: 'managers',
      href: `/@/${encodeURIComponent(cleanHandle)}/dashboard/managers`,
      title: 'إدارة المدراء',
      description: 'تعيين وتحديد المدراء المصرح لهم',
      icon: Users,
      badgeCount: undefined,
      gradient: 'from-[#52351b] via-[var(--color-imamu-brown-dark)] to-[#7e552f]'
    }
  ];

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Top Banner & Profile Info Card (Only shown on main Grid home view) */}
      {activePage === 'grid' && (
        <div className="relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-2xl">
          {/* Cover Banner */}
          <div className="relative h-48 sm:h-64 w-full bg-neutral-950 overflow-hidden">
            {account.bannerUrl ? (
              <img src={account.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-amber-950/60 via-neutral-900 to-amber-900/60 flex items-center justify-center">
                <Layout className="w-16 h-16 text-neutral-700 opacity-40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/40 to-transparent" />

            {/* Toast Notification */}
            {toastMessage && (
              <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[100] py-2.5 px-4 rounded-full bg-neutral-900/95 border border-[var(--color-imamu-accent)]/50 text-[var(--color-imamu-accent)] text-xs font-bold shadow-2xl backdrop-blur-xl animate-in fade-in duration-200">
                <span>{toastMessage}</span>
              </div>
            )}

            {/* Top Actions */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <button
                onClick={() => router.push('/news')}
                className="flex items-center gap-2.5 px-5 py-2.5 bg-neutral-900/90 hover:bg-neutral-800 text-white text-xs sm:text-sm font-bold rounded-2xl backdrop-blur-md transition border border-neutral-700/60 shadow-lg cursor-pointer"
              >
                <ArrowRight className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                <span>العودة للأخبار</span>
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={`/@/${encodeURIComponent(cleanHandle)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold rounded-xl shadow-lg transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>زيارة الصفحة العامة</span>
                </a>
              </div>
            </div>
          </div>

          {/* Profile Info Row Overlapping Cover Banner */}
          <div className="p-6 pt-0 relative z-10 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-12 sm:-mt-14">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              {/* Avatar */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-neutral-900 bg-neutral-950 overflow-hidden shadow-2xl shrink-0 flex items-center justify-center">
                {account.profilePicUrl ? (
                  <img src={account.profilePicUrl} alt="PFP" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white">{(account.displayName || account.handle).charAt(0)}</span>
                )}
              </div>

              {/* Name & Handle */}
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-serif font-bold text-white flex items-center gap-2">
                  <span>{account.displayName || account.handle}</span>
                  <BadgeCheck className="w-6 h-6 text-[var(--color-imamu-accent)] shrink-0" />
                </h1>
                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                  <span>@{cleanHandle}</span>
                  <span className="w-1 h-1 rounded-full bg-neutral-700" />
                  <span>{account.followersCount || 0} متابع</span>
                  <span className="w-1 h-1 rounded-full bg-neutral-700" />
                  <span>{publishedCount} خبر منشور</span>
                </div>
              </div>
            </div>

            {/* Badge */}
            <div className="shrink-0 bg-neutral-800/80 border border-neutral-700/70 px-4 py-2 rounded-2xl flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--color-imamu-accent)]" />
              <span className="text-xs font-bold text-white">لوحة تحكم إدارة الحساب</span>
            </div>
          </div>
        </div>
      )}

      {/* Smartphone App Grid or Back Navigation Bar */}
      {activePage === 'grid' ? (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-imamu-brown)] shadow-sm" />
              <span>تطبيقات وأدوات الحساب</span>
            </h2>
            <span className="text-xs text-neutral-400 font-medium bg-neutral-900/80 px-3.5 py-1 rounded-full border border-neutral-800">
              تطبيقات النظام
            </span>
          </div>

          {/* Resources Style App Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {apps.map((app) => {
              const IconComponent = app.icon;
              return (
                <SpotlightCard
                  key={app.id}
                  className="border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900/90 p-5 sm:p-6 flex flex-col justify-between relative group cursor-pointer h-full"
                >
                  <a href={app.href} className="flex flex-col justify-between h-full w-full">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-stone-50 dark:bg-stone-950/50 text-[var(--color-imamu-accent)] dark:text-[var(--color-imamu-accent)] border border-slate-200/80 dark:border-zinc-700/80">
                          تطبيق نظام
                        </span>
                        <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700/60 flex items-center justify-center text-[var(--color-imamu-accent)] group-hover:scale-105 transition-transform shadow-xs">
                          <IconComponent className="w-5 h-5" />
                        </div>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1.5 leading-snug group-hover:text-[var(--color-imamu-accent)] transition-colors">
                        {app.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-4">
                        {app.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80 pt-3.5 mt-auto w-full relative z-20">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 group-hover:bg-slate-200 dark:group-hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 text-xs font-bold transition-all duration-200 shadow-xs">
                        <span>فتح التطبيق</span>
                        <ChevronLeft className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" />
                      </span>
                      {app.badgeCount !== undefined && (
                        <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/90 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-zinc-700">
                          {app.badgeCount} عنصر
                        </span>
                      )}
                    </div>
                  </a>
                </SpotlightCard>
              );
            })}
          </div>
        </div>
      ) : (
        /* Sub-page Navigation Header with Back Button */
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-neutral-800 bg-neutral-900/80 rounded-3xl shadow-xl">
          <button
            onClick={() => router.push(`/@/${encodeURIComponent(cleanHandle)}/dashboard`)}
            className="flex items-center justify-center gap-2.5 px-5 py-2.5 bg-neutral-900/90 hover:bg-neutral-800 text-white font-bold text-xs sm:text-sm rounded-2xl transition border border-neutral-700/60 cursor-pointer shadow-lg shrink-0"
          >
            <ArrowRight className="w-4 h-4 text-[var(--color-imamu-accent)]" />
            <span>العودة لتطبيقات الحساب</span>
          </button>

          {/* Quick tab switcher bar */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
            {apps.map((app) => {
              const IconComp = app.icon;
              const isActive = activePage === app.id;
              return (
                <a
                  key={app.id}
                  href={app.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap border ${
                    isActive
                      ? 'bg-[var(--color-imamu-brown)] text-white border-[var(--color-imamu-brown)] shadow-md'
                      : 'bg-neutral-900/90 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-800'
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{app.title}</span>
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default EntityDashboardHeader;
