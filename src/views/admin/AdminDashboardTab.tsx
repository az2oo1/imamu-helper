import React from 'react';
import { Users, Newspaper, GraduationCap, Calendar, BookOpen, Cpu, ShieldCheck } from 'lucide-react';

interface AdminDashboardTabProps {
  stats: any;
  health: any;
  setSearchUser: (s: string) => void;
  setActiveTab: (t: any) => void;
}

export default function AdminDashboardTab({
  stats,
  health,
  setSearchUser,
  setActiveTab
}: AdminDashboardTabProps) {
  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setActiveTab('users')}
          className="p-5 rounded-2xl border transition cursor-pointer hover:border-slate-400 dark:hover:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/40 group"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>المستخدمون المسجلون</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500 border border-sky-500/20 group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 font-serif" style={{ color: 'var(--text-main)' }}>{stats?.totalUsers ?? stats?.usersCount ?? stats?.users ?? 0}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>الطلاب والمسؤولون في النظام</p>
        </div>

        <div 
          onClick={() => setActiveTab('subjects')}
          className="p-5 rounded-2xl border transition cursor-pointer hover:border-slate-400 dark:hover:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/40 group"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>المقررات الدراسية</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 group-hover:scale-110 transition">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 font-serif" style={{ color: 'var(--text-main)' }}>{stats?.totalSubjects ?? stats?.subjectsCount ?? stats?.subjects ?? 0}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>المقررات الأكاديمية المسجلة</p>
        </div>

        <div 
          onClick={() => setActiveTab('majors')}
          className="p-5 rounded-2xl border transition cursor-pointer hover:border-slate-400 dark:hover:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/40 group"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>التخصصات الأكاديمية</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 group-hover:scale-110 transition">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 font-serif" style={{ color: 'var(--text-main)' }}>{stats?.totalMajors ?? stats?.majorsCount ?? stats?.majors ?? 0}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>الخطط والمخططات الكلية</p>
        </div>

        <div 
          onClick={() => setActiveTab('events')}
          className="p-5 rounded-2xl border transition cursor-pointer hover:border-slate-400 dark:hover:border-zinc-700 hover:bg-slate-100/50 dark:hover:bg-zinc-800/40 group"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>الأحداث والمواعيد الأكاديمية</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 font-serif" style={{ color: 'var(--text-main)' }}>{stats?.totalEvents ?? stats?.eventsCount ?? stats?.events ?? 0}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>الاختبارات والمواعيد والتقويم</p>
        </div>
      </div>

      {/* System Health Status */}
      {health && (
        <div className="p-5 rounded-2xl border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>حالة سلامة النظام وقاعدة البيانات</h4>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border" style={{ borderColor: 'var(--border-color)' }}>
              <span className="block text-[11px] font-semibold text-slate-400">محرك قاعدة البيانات</span>
              <span className="font-mono font-bold mt-0.5 block text-emerald-400">{health.database?.engine || 'PGlite Embedded / CockroachDB'}</span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border" style={{ borderColor: 'var(--border-color)' }}>
              <span className="block text-[11px] font-semibold text-slate-400">استهلاك ذاكرة النظام</span>
              <span className="font-mono font-bold mt-0.5 block text-[var(--color-imamu-accent)]">
                {health.memory?.heapUsed || 0}MB / {health.memory?.heapTotal || 0}MB
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border" style={{ borderColor: 'var(--border-color)' }}>
              <span className="block text-[11px] font-semibold text-slate-400">مدة تشغيل الخادم</span>
              <span className="font-mono font-bold mt-0.5 block text-purple-400">{health.uptime ? `${Math.floor(health.uptime / 60)} دقيقة` : 'نشط'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
