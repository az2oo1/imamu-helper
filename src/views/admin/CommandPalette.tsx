'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Users, Shield, BookOpen, GraduationCap,
  Folder, HelpCircle, Calendar, Command
} from 'lucide-react';

export type Tab = 'dashboard' | 'users' | 'contributors' | 'news_sources' | 'majors' | 'events' | 'subjects' | 'sections' | 'teachers' | 'resources' | 'tutorials' | 'feedback' | 'settings';

export interface SearchResultItem {
  id: string;
  categoryLabel: string;
  categoryIcon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onSelectTab: (tab: Tab) => void;
  tabs: { id: Tab; label: string; icon: React.ReactNode }[];
  users?: any[];
  newsSources?: any[];
  majors?: any[];
  subjects?: any[];
  resources?: any[];
  tutorials?: any[];
  events?: any[];
  onSelectUser?: (user: any) => void;
  onSelectEntity?: (source: any) => void;
  onSelectSubject?: (subject: any) => void;
  onSelectMajor?: (major: any) => void;
  onSelectResource?: (resource: any) => void;
  onSelectTutorial?: (tutorial: any) => void;
  onSelectEvent?: (event: any) => void;
  onSearchUsersBackend?: (query: string) => void;
}

export function CommandPalette({
  open,
  onClose,
  onSelectTab,
  tabs,
  users = [],
  newsSources = [],
  majors = [],
  subjects = [],
  resources = [],
  tutorials = [],
  events = [],
  onSelectUser,
  onSelectEntity,
  onSelectSubject,
  onSelectMajor,
  onSelectResource,
  onSelectTutorial,
  onSelectEvent,
  onSearchUsersBackend,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (query.trim().length > 1 && onSearchUsersBackend) {
      onSearchUsersBackend(query.trim());
    }
  }, [query, onSearchUsersBackend]);

  if (!open) return null;

  const q = query.trim().toLowerCase();
  const results: SearchResultItem[] = [];

  if (q) {
    // 1. Admin Tabs
    tabs.forEach((t) => {
      if (t.label.toLowerCase().includes(q)) {
        results.push({
          id: `tab-${t.id}`,
          categoryLabel: 'أقسام لوحة التحكم',
          categoryIcon: <LayoutDashboard className="w-4 h-4 text-purple-400" />,
          title: t.label,
          subtitle: 'الانتقال إلى قسم الإدارة',
          onSelect: () => {
            onSelectTab(t.id);
            onClose();
          },
        });
      }
    });

    // 2. Users
    users.forEach((u) => {
      const name = u.userName || u.displayName || u.email || '';
      const email = u.email || '';
      const handle = u.handle || u.username || '';
      const uid = u.uid || u.id || '';
      if (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        handle.toLowerCase().includes(q) ||
        String(uid).toLowerCase().includes(q)
      ) {
        results.push({
          id: `user-${uid || name}`,
          categoryLabel: 'المستخدمون والطلاب',
          categoryIcon: <Users className="w-4 h-4 text-sky-400" />,
          title: name || 'مستخدم بدون اسم',
          subtitle: email ? `${email}${u.role ? ` • (${u.role})` : ''}` : `UID: ${uid}`,
          badge: u.isAdmin ? 'مسؤول' : undefined,
          onSelect: () => {
            if (onSelectUser) onSelectUser(u);
            else onSelectTab('users');
            onClose();
          },
        });
      }
    });

    // 3. Entity Accounts
    newsSources.forEach((s) => {
      const name = s.displayName || s.handle || '';
      const handle = s.handle || '';
      const bio = s.bio || '';
      if (
        name.toLowerCase().includes(q) ||
        handle.toLowerCase().includes(q) ||
        bio.toLowerCase().includes(q)
      ) {
        results.push({
          id: `entity-${s.id || handle}`,
          categoryLabel: 'حسابات الجهات الرسمية (Entity Accounts)',
          categoryIcon: <Shield className="w-4 h-4 text-amber-400" />,
          title: name,
          subtitle: `@${handle}${bio ? ` • ${bio.slice(0, 40)}...` : ''}`,
          badge: 'جهة موثقة',
          onSelect: () => {
            if (onSelectEntity) onSelectEntity(s);
            else onSelectTab('news_sources');
            onClose();
          },
        });
      }
    });

    // 4. Subjects & Courses
    subjects.forEach((subj) => {
      const code = subj.code || '';
      const name = subj.name || '';
      if (code.toLowerCase().includes(q) || name.toLowerCase().includes(q)) {
        results.push({
          id: `subj-${subj.id || code}`,
          categoryLabel: 'المقررات والمواد الدراسية',
          categoryIcon: <BookOpen className="w-4 h-4 text-emerald-400" />,
          title: `${code ? `${code} - ` : ''}${name}`,
          subtitle: subj.level
            ? `المستوى ${subj.level} • ${subj.creditHours || 3} ساعات`
            : `${subj.creditHours || 3} ساعات معتمدة`,
          badge: code || undefined,
          onSelect: () => {
            if (onSelectSubject) onSelectSubject(subj);
            else onSelectTab('subjects');
            onClose();
          },
        });
      }
    });

    // 5. Majors
    majors.forEach((m) => {
      const name = typeof m === 'string' ? m : m.name || '';
      if (name.toLowerCase().includes(q)) {
        results.push({
          id: `major-${m.id || name}`,
          categoryLabel: 'التخصصات الأكاديمية',
          categoryIcon: <GraduationCap className="w-4 h-4 text-indigo-400" />,
          title: name,
          subtitle: 'تخصص أكاديمي معتمد',
          onSelect: () => {
            if (onSelectMajor) onSelectMajor(m);
            else onSelectTab('majors');
            onClose();
          },
        });
      }
    });

    // 6. Resources
    resources.forEach((r) => {
      const title = r.title || '';
      const desc = r.description || r.courseName || '';
      const code = r.courseCode || '';
      if (
        title.toLowerCase().includes(q) ||
        desc.toLowerCase().includes(q) ||
        code.toLowerCase().includes(q)
      ) {
        results.push({
          id: `res-${r.id}`,
          categoryLabel: 'المصادر والمراجع',
          categoryIcon: <Folder className="w-4 h-4 text-teal-400" />,
          title: title,
          subtitle: desc ? desc.slice(0, 50) : r.major || 'مصدر أكاديمي',
          badge: code || undefined,
          onSelect: () => {
            if (onSelectResource) onSelectResource(r);
            else onSelectTab('resources');
            onClose();
          },
        });
      }
    });

    // 7. Tutorials
    tutorials.forEach((tut) => {
      const title = tut.title || '';
      const desc = tut.description || '';
      if (title.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) {
        results.push({
          id: `tut-${tut.id}`,
          categoryLabel: 'شروحات الدليلة',
          categoryIcon: <HelpCircle className="w-4 h-4 text-orange-400" />,
          title: title,
          subtitle: desc ? desc.slice(0, 50) : 'شرح أكاديمي',
          onSelect: () => {
            if (onSelectTutorial) onSelectTutorial(tut);
            else onSelectTab('tutorials');
            onClose();
          },
        });
      }
    });

    // 8. Events
    events.forEach((ev) => {
      const title = ev.title || '';
      const desc = ev.description || '';
      if (title.toLowerCase().includes(q) || desc.toLowerCase().includes(q)) {
        results.push({
          id: `event-${ev.id}`,
          categoryLabel: 'التقويم والمواعيد',
          categoryIcon: <Calendar className="w-4 h-4 text-rose-400" />,
          title: title,
          subtitle: ev.date || desc.slice(0, 40),
          onSelect: () => {
            if (onSelectEvent) onSelectEvent(ev);
            else onSelectTab('events');
            onClose();
          },
        });
      }
    });
  } else {
    // Default view when input is empty
    tabs.forEach((t) => {
      results.push({
        id: `tab-${t.id}`,
        categoryLabel: 'أقسام لوحة التحكم',
        categoryIcon: <LayoutDashboard className="w-4 h-4 text-purple-400" />,
        title: t.label,
        subtitle: 'الانتقال المباشر للقسم',
        onSelect: () => {
          onSelectTab(t.id);
          onClose();
        },
      });
    });
  }

  // Group results by categoryLabel
  const groupedResults: Record<string, SearchResultItem[]> = {};
  results.forEach((item) => {
    if (!groupedResults[item.categoryLabel]) {
      groupedResults[item.categoryLabel] = [];
    }
    groupedResults[item.categoryLabel].push(item);
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, results.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + results.length) % Math.max(1, results.length));
    } else if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault();
      const item = results[Math.min(selectedIndex, results.length - 1)];
      if (item) item.onSelect();
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-start justify-center pt-[12vh] p-4 font-sans text-right" onClick={onClose} dir="rtl">
      <div className="absolute inset-0 bg-slate-950/80 dark:bg-black/85 backdrop-blur-md" />
      <div
        className="relative w-full max-w-xl bg-white dark:bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[75vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-zinc-800 shrink-0">
          <Command className="w-5 h-5 text-[var(--color-imamu-accent)] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="ابحث في المستخدمين، التخصصات، المقررات، المصادر، حسابات الجهات..."
            className="flex-1 bg-transparent outline-none text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500"
            onKeyDown={handleKeyDown}
          />
          <kbd className="text-[10px] font-mono px-2 py-0.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400">
            ESC
          </kbd>
        </div>

        {/* Results List Area */}
        <div className="max-h-[60vh] overflow-y-auto custom-scrollbar p-3 space-y-4">
          {results.length > 0 ? (
            Object.entries(groupedResults).map(([catLabel, items]) => (
              <div key={catLabel} className="space-y-1">
                <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                  {items[0]?.categoryIcon}
                  <span>
                    {catLabel} ({items.length})
                  </span>
                </div>
                {items.map((item) => {
                  const globalIdx = results.findIndex((r) => r.id === item.id);
                  const isSelected = globalIdx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={item.onSelect}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                      className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-medium transition-all text-right cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--color-imamu-brown)] text-white shadow-md'
                          : 'hover:bg-slate-100 dark:hover:bg-zinc-800/70 text-slate-900 dark:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-xl shrink-0 ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400'
                          }`}
                        >
                          {item.categoryIcon}
                        </div>
                        <div className="min-w-0 text-right">
                          <div className="font-bold truncate">{item.title}</div>
                          {item.subtitle && (
                            <div
                              className={`text-[11px] truncate ${
                                isSelected ? 'text-white/80' : 'text-slate-400 dark:text-zinc-500'
                              }`}
                            >
                              {item.subtitle}
                            </div>
                          )}
                        </div>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl shrink-0 border ${
                            isSelected
                              ? 'bg-white/20 text-white border-white/30'
                              : 'bg-stone-100 dark:bg-zinc-800 text-[var(--color-imamu-accent)] border-slate-200 dark:border-zinc-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-xs text-slate-400 dark:text-zinc-500 font-medium italic">
              لم يتم العثور على نتائج تطابق "{query}"
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
