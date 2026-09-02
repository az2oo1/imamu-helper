'use client';

import React, { useState, useEffect } from 'react';
import { 
  Award, HeartHandshake, Sparkles, Shield, GraduationCap, 
  Wrench, MessageSquare, Linkedin, Instagram, Twitter, Github, 
  Mail, Globe, ExternalLink, Lock, CheckCircle2, FileText, ChevronLeft, X, User, UserCircle2
} from 'lucide-react';
import { InView, SpotlightCard } from '../components/ui';

function ContributorAvatar({ src, alt, className = "w-16 h-16 rounded-2xl" }: { src?: string; alt: string; className?: string }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const hasValidPhoto = src && src.trim() !== '' && src !== '/logo_dark.png' && !imgError;

  return (
    <div className={`${className} overflow-hidden border-2 border-amber-500/30 shadow-md bg-slate-200 dark:bg-zinc-800 shrink-0 flex items-center justify-center text-slate-400 dark:text-zinc-500`}>
      {hasValidPhoto ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <User className="w-8 h-8 text-slate-400 dark:text-zinc-500 stroke-[1.75]" />
      )}
    </div>
  );
}

interface ContributorItem {
  id: number;
  name: string;
  role: string;
  category: string;
  photoUrl: string;
  userId?: string | null;
  bio?: string;
  socialLinks?: {
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    github?: string;
    email?: string;
    website?: string;
  };
  linkedMajor?: string;
  linkedTools?: string[];
  isPrivateAccount?: boolean;
  linkedUser?: {
    uid: string;
    userName?: string;
    major?: string;
    profilePicUrl?: string;
  } | null;
  stats?: {
    resourcesShared: number;
    answersProvided: number;
    totalContributions: number;
  };
}

export function ContributorsPage() {
  const [contributors, setContributors] = useState<ContributorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [selectedContributor, setSelectedContributor] = useState<ContributorItem | null>(null);

  const categories = [
    { id: 'all', label: 'جميع المساهمين', icon: <HeartHandshake className="w-4 h-4" /> },
    { id: 'founder', label: 'المؤسس والقائمون', icon: <Shield className="w-4 h-4 text-amber-500" /> },
    { id: 'resources', label: 'فريق المصادر والمحتوى', icon: <FileText className="w-4 h-4 text-emerald-500" /> },
    { id: 'tools', label: 'مطورو الأدوات', icon: <Wrench className="w-4 h-4 text-sky-500" /> },
    { id: 'dalilah', label: 'فريق إجابات الدليلة', icon: <MessageSquare className="w-4 h-4 text-purple-500" /> },
  ];

  const fetchContributors = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/contributors');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setContributors(data);
      }
    } catch (e) {
      console.error('Failed to fetch public contributors', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContributors();
  }, []);

  const filteredContributors = activeCategory === 'all'
    ? contributors
    : contributors.filter(c => c.category === activeCategory);

  return (
    <div className="flex flex-col flex-1 w-full pb-24 px-4 sm:px-6 lg:px-8 pt-8 relative max-w-7xl mx-auto text-right min-h-screen" dir="rtl">
      
      {/* Hero Header */}
      <InView preset="fade-up" delay={0.1} className="mb-10 text-right">
        <span className="text-xs sm:text-sm font-bold tracking-widest text-[var(--color-imamu-accent)] uppercase mb-2 block flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>لوحة الشرف وتقدير فريق العمل</span>
        </span>
        <h1 className="text-3xl sm:text-5xl font-serif font-bold tracking-tight text-slate-900 dark:text-white mb-4 leading-tight">
          المساهمون والقائمون على منصة مساعد الإمام 🌟
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-3xl leading-relaxed">
          نفخر ونشيد بكوكبة من الطلاب والطالبات المتميزين الذين بذلوا جهودهم في التأسيس، تطوير الأدوات الحاسوبية، إعداد وتحديث بنك المصادر، والإجابة على استفسارات الطلاب عبر الدليلة.
        </p>
      </InView>

      {/* Category Pills Filter */}
      <InView preset="fade-up" delay={0.2} className="mb-8 w-full">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`btn-rise px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shrink-0 border ${
                activeCategory === cat.id
                  ? 'bg-[var(--color-imamu-brown)] text-white border-amber-700/50 shadow-md shadow-[var(--color-imamu-brown)]/30'
                  : 'bg-white dark:bg-zinc-900/90 text-slate-700 dark:text-zinc-300 border-slate-300 dark:border-zinc-700/80 hover:bg-amber-500/10 hover:text-amber-800 dark:hover:bg-amber-500/15 dark:hover:text-amber-300 hover:border-amber-500/40 dark:hover:border-amber-500/40'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </InView>

      {/* Contributors Grid */}
      <InView preset="fade-up" delay={0.3} className="w-full">
        {loading ? (
          <div className="py-24 text-center text-xs text-slate-400">جاري تحميل قائمة المساهمين...</div>
        ) : filteredContributors.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-slate-200 dark:border-zinc-800 p-8">
            <HeartHandshake className="w-12 h-12 text-slate-300 dark:text-zinc-700 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-zinc-200 mb-1">لا يوجد مساهمون في هذه الفئة حالياً</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-500">سيتم إضافة المزيد من المساهمين والأبطال قريباً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredContributors.map((item) => (
              <SpotlightCard
                key={item.id}
                onClick={() => setSelectedContributor(item)}
                className="cursor-pointer border border-slate-300 dark:border-zinc-700/80 bg-white dark:bg-zinc-900/90 p-6 hover:border-amber-500/60 dark:hover:border-amber-500/50 transition duration-300 shadow-sm hover:shadow-md flex flex-col justify-between rounded-3xl"
              >
                <div>
                  {/* Top Avatar & Category Badge */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <ContributorAvatar
                      src={item.photoUrl}
                      alt={item.name}
                      className="w-16 h-16 rounded-2xl"
                    />

                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-[var(--color-imamu-accent)] border border-amber-500/30 shrink-0">
                      {item.category === 'founder' ? '👑 المؤسس' : item.category === 'resources' ? '📚 فريق المصادر' : item.category === 'tools' ? '🛠️ مطور أدوات' : item.category === 'dalilah' ? '💡 فريق الدليلة' : '🌟 مساهم'}
                    </span>
                  </div>

                  {/* Standalone Name */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                    {item.name}
                  </h3>

                  {/* Sub-line under Name: Position • Major */}
                  <div className="text-xs font-semibold text-[var(--color-imamu-accent)] mb-3 flex items-center gap-2 flex-wrap">
                    <span>{item.role}</span>
                    {item.linkedMajor && (
                      <>
                        <span className="text-slate-400 dark:text-zinc-500 font-normal text-xs">•</span>
                        <span className="text-slate-600 dark:text-zinc-400 font-medium flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.linkedMajor}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Tool Tags directly under Line 2 */}
                  {item.linkedTools && item.linkedTools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3.5">
                      {item.linkedTools.map((t, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-zinc-800/90 text-[#D49A6A] dark:text-[#E2A676] text-[11px] font-bold flex items-center gap-1 border border-amber-300/60 dark:border-zinc-700/80 shadow-2xs">
                          <Wrench className="w-3 h-3 text-[#D49A6A] dark:text-[#E2A676]" />
                          <span>{t}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {item.bio && (
                    <p className="text-xs text-slate-600 dark:text-zinc-400 line-clamp-3 leading-relaxed mb-4">
                      {item.bio}
                    </p>
                  )}
                </div>

                {/* Footer: Social Icons & Contributions summary */}
                <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-slate-400">
                    {item.socialLinks?.linkedin && (
                      <a 
                        href={item.socialLinks.linkedin} 
                        target="_blank" 
                        rel="noreferrer" 
                        onClick={e => e.stopPropagation()}
                        className="hover:text-blue-600 transition" 
                        title="LinkedIn"
                      >
                        <Linkedin className="w-4 h-4" />
                      </a>
                    )}
                    {item.socialLinks?.instagram && (
                      <a 
                        href={item.socialLinks.instagram} 
                        target="_blank" 
                        rel="noreferrer" 
                        onClick={e => e.stopPropagation()}
                        className="hover:text-pink-600 transition" 
                        title="Instagram"
                      >
                        <Instagram className="w-4 h-4" />
                      </a>
                    )}
                    {item.socialLinks?.twitter && (
                      <a 
                        href={item.socialLinks.twitter} 
                        target="_blank" 
                        rel="noreferrer" 
                        onClick={e => e.stopPropagation()}
                        className="hover:text-sky-500 transition" 
                        title="X (Twitter)"
                      >
                        <Twitter className="w-4 h-4" />
                      </a>
                    )}
                    {item.socialLinks?.github && (
                      <a 
                        href={item.socialLinks.github} 
                        target="_blank" 
                        rel="noreferrer" 
                        onClick={e => e.stopPropagation()}
                        className="hover:text-slate-900 dark:hover:text-white transition" 
                        title="GitHub"
                      >
                        <Github className="w-4 h-4" />
                      </a>
                    )}
                    {item.socialLinks?.email && (
                      <a 
                        href={`mailto:${item.socialLinks.email}`} 
                        onClick={e => e.stopPropagation()}
                        className="hover:text-amber-600 transition" 
                        title="البريد الإلكتروني"
                      >
                        <Mail className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  <button className="text-xs font-bold text-[#C48B57] dark:text-[#E2A676] hover:text-[#D49A6A] dark:hover:text-[#F0B88A] hover:underline flex items-center gap-1 transition-colors">
                    <span>التفاصيل والمساهمات</span>
                    <ChevronLeft className="w-3.5 h-3.5 text-[#C48B57] dark:text-[#E2A676]" />
                  </button>
                </div>
              </SpotlightCard>
            ))}
          </div>
        )}
      </InView>

      {/* CONTRIBUTOR DETAILS MODAL */}
      {selectedContributor && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setSelectedContributor(null)}
        >
          <div 
            className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh] text-right"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <ContributorAvatar
                  src={selectedContributor.photoUrl}
                  alt={selectedContributor.name}
                  className="w-16 h-16 rounded-2xl"
                />
                <div>
                  {/* Standalone Name */}
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    {selectedContributor.name}
                  </h3>

                  {/* Sub-line under Name: Position • Major */}
                  <div className="text-xs font-semibold text-[var(--color-imamu-accent)] mb-2.5 flex items-center gap-2 flex-wrap">
                    <span>{selectedContributor.role}</span>
                    {selectedContributor.linkedMajor && (
                      <>
                        <span className="text-slate-400 dark:text-zinc-500 font-normal text-xs">•</span>
                        <span className="text-slate-600 dark:text-zinc-400 font-medium flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                          <span>{selectedContributor.linkedMajor}</span>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Tool Tags directly under Line 2 */}
                  {selectedContributor.linkedTools && selectedContributor.linkedTools.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedContributor.linkedTools.map((tool, idx) => (
                        <span key={idx} className="px-2.5 py-1 rounded-xl bg-stone-100 dark:bg-zinc-800/90 text-[#D49A6A] dark:text-[#E2A676] text-[11px] font-bold flex items-center gap-1 border border-amber-300/60 dark:border-zinc-700/80 shadow-2xs">
                          <Wrench className="w-3.5 h-3.5 text-[#D49A6A] dark:text-[#E2A676]" />
                          <span>{tool}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedContributor(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">

              {/* Social Media Links at TOP */}
              {selectedContributor.socialLinks && Object.values(selectedContributor.socialLinks).some(Boolean) && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">روابط التواصل والتواجد</h4>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {selectedContributor.socialLinks.linkedin && (
                      <a href={selectedContributor.socialLinks.linkedin} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-900/40 flex items-center gap-1.5 hover:opacity-90 transition">
                        <Linkedin className="w-4 h-4" />
                        <span>LinkedIn</span>
                      </a>
                    )}
                    {selectedContributor.socialLinks.instagram && (
                      <a href={selectedContributor.socialLinks.instagram} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-pink-50 dark:bg-pink-950/30 text-pink-700 dark:text-pink-300 font-bold border border-pink-200 dark:border-pink-900/40 flex items-center gap-1.5 hover:opacity-90 transition">
                        <Instagram className="w-4 h-4" />
                        <span>Instagram</span>
                      </a>
                    )}
                    {selectedContributor.socialLinks.twitter && (
                      <a href={selectedContributor.socialLinks.twitter} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 font-bold border border-sky-200 dark:border-sky-900/40 flex items-center gap-1.5 hover:opacity-90 transition">
                        <Twitter className="w-4 h-4" />
                        <span>X (Twitter)</span>
                      </a>
                    )}
                    {selectedContributor.socialLinks.github && (
                      <a href={selectedContributor.socialLinks.github} target="_blank" rel="noreferrer" className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-900 dark:text-white font-bold border border-slate-300 dark:border-zinc-700 flex items-center gap-1.5 hover:opacity-90 transition">
                        <Github className="w-4 h-4" />
                        <span>GitHub</span>
                      </a>
                    )}
                    {selectedContributor.socialLinks.email && (
                      <a href={`mailto:${selectedContributor.socialLinks.email}`} className="px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-900/40 flex items-center gap-1.5 hover:opacity-90 transition">
                        <Mail className="w-4 h-4" />
                        <span>البريد الإلكتروني</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
              
              {selectedContributor.bio && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">عن المساهم والمجال</h4>
                  <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                    {selectedContributor.bio}
                  </p>
                </div>
              )}

              {/* Contributions & Tagged Activity */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-3">سجل المساهمات والأنشطة الإضافية</h4>
                
                {selectedContributor.isPrivateAccount || !selectedContributor.userId ? (
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 flex items-center gap-3 text-slate-500 dark:text-zinc-400">
                    <div className="p-2.5 rounded-xl bg-slate-200/60 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 block mb-0.5">مساهمات الحساب خاصة 🔒</span>
                      <span className="text-[11px] leading-relaxed block">
                        المساهمات غير مرئية للعموم أو أن المساهم يفضل عدم ربط النشاط بشكل علني مع التقدير الكامل لجهوده.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 text-right">
                      <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                        {selectedContributor.stats?.resourcesShared || 0}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">مصدر أكاديمي متاح</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 text-right">
                      <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 block mb-1">
                        {selectedContributor.stats?.answersProvided || 0}
                      </span>
                      <span className="text-xs text-slate-600 dark:text-zinc-400 font-medium">إجابة واستفسار بالدليلة</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
