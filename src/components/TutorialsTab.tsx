'use client';

import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { 
  Plus, Trash2, Edit, ChevronUp, ChevronDown, 
  HelpCircle, X, ExternalLink, PlusCircle, ArrowRight,
  Sparkles, FileText, Image, Video, Link, ArrowLeft, Upload, CheckSquare,
  Compass, AlertCircle, Info, Film
} from 'lucide-react';
import { getSectionColorClasses, SECTION_COLOR_PRESETS } from '../lib/section-colors';

interface Section {
  id: any;
  title: string;
  icon: string;
  color: string;
}

interface Tutorial {
  id: any;
  sectionId: any;
  title: string;
  description: string;
  text: string;
  steps: string[];
  videoUrl?: string;
  imageUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
}

function matchSubjectIds(id1: any, id2: any): boolean {
  if (id1 == null || id2 == null || id1 === '' || id2 === '') return false;
  const s1 = String(id1).trim();
  const s2 = String(id2).trim();
  if (s1 === s2) return true;
  const n1 = Number(s1);
  const n2 = Number(s2);
  if (!isNaN(n1) && !isNaN(n2)) {
    return n1 === n2;
  }
  return false;
}

interface Block {
  type: 'text' | 'steps' | 'list' | 'table' | 'media' | 'buttons' | 'callout' | 'alert';
  content?: string;
  title?: string;
  variant?: 'info' | 'warning' | 'danger' | 'success';
  stepsItems?: string[];
  listItems?: string[];
  listType?: 'ordered' | 'unordered';
  tableHeaders?: string[];
  tableRows?: string[][];
  mediaType?: 'image' | 'video';
  mediaUrl?: string;
  mediaUrls?: string[];
  images?: string[];
  videoUrl?: string;
  buttons?: Array<{ label: string; url: string }>;
}

export function TutorialsTab({ 
  user, 
  sections, 
  tutorials, 
  onRefresh 
}: { 
  user: any; 
  sections: Section[]; 
  tutorials: Tutorial[]; 
  onRefresh: () => void; 
}) {
  // Navigation states
  const [editingTutorial, setEditingTutorial] = useState<Tutorial | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showSectionForm, setShowSectionForm] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);

  // Section form state
  const [secTitle, setSecTitle] = useState('');
  const [secIcon, setSecIcon] = useState('GraduationCap');
  const [secColor, setSecColor] = useState('brown');
  const [iconSearchQuery, setIconSearchQuery] = useState('');

  // Tutorial form states
  const [tutTitle, setTutTitle] = useState('');
  const [tutDescription, setTutDescription] = useState('');
  const [tutSectionId, setTutSectionId] = useState<any>('');
  const [tutLinkUrl, setTutLinkUrl] = useState('');
  const [tutLinkTitle, setTutLinkTitle] = useState('');
  const [tutImageUrl, setTutImageUrl] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'edit' | 'preview'>('edit');
  const [uploadingBlockIdx, setUploadingBlockIdx] = useState<number | null>(null);

  // Section presets for easy selection
  const colorOptions = SECTION_COLOR_PRESETS;

  const curatedIcons = [
    'GraduationCap', 'BookOpen', 'FileText', 'Compass', 'HelpCircle', 'Phone', 'Mail', 
    'Award', 'Calendar', 'Briefcase', 'User', 'Settings', 'Shield', 'Activity', 'Bell', 
    'Bookmark', 'Building', 'Clock', 'Database', 'Download', 'Eye', 'Folder', 'Globe', 
    'Heart', 'Home', 'Info', 'Key', 'Laptop', 'MapPin', 'MessageSquare', 'Search', 
    'Share2', 'Star', 'Tag', 'Trash2', 'Users', 'Video', 'AlertCircle', 'CheckCircle', 
    'Play', 'CheckSquare', 'Lock', 'Unlock', 'Gift', 'HeartHandshake', 'Flame', 'Sparkles'
  ];

  // Get all Lucide icons dynamically from import * as Icons
  const allLucideIcons = React.useMemo(() => {
    return Object.keys(Icons).filter(
      key => /^[A-Z]/.test(key) && key !== 'default' && typeof (Icons as any)[key] !== 'undefined'
    );
  }, []);

  // Filter icons based on query
  const filteredIcons = React.useMemo(() => {
    if (!iconSearchQuery.trim()) {
      return curatedIcons;
    }
    const query = iconSearchQuery.toLowerCase();
    return allLucideIcons.filter(name => name.toLowerCase().includes(query));
  }, [iconSearchQuery, allLucideIcons]);

  // Load section for edit
  const startEditSection = (sec: Section) => {
    setEditingSection(sec);
    setSecTitle(sec.title);
    setSecIcon(sec.icon);
    setSecColor(sec.color);
    setShowSectionForm(true);
  };

  // Reset section form
  const resetSectionForm = () => {
    setEditingSection(null);
    setSecTitle('');
    setSecIcon('GraduationCap');
    setSecColor('brown');
    setIconSearchQuery('');
    setShowSectionForm(false);
  };

  // Save section
  const handleSaveSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secTitle.trim()) return;

    try {
      const token = await user?.getIdToken();
      const method = editingSection ? 'PUT' : 'POST';
      const url = editingSection ? `/api/admin/tutorials/sections/${editingSection.id}` : '/api/admin/tutorials/sections';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: secTitle.trim(),
          icon: secIcon,
          color: secColor
        })
      });

      if (res.ok) {
        onRefresh();
        resetSectionForm();
      } else {
        alert('Failed to save section');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving section');
    }
  };

  // Delete section
  const handleDeleteSection = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع الشروحات التابعة له تلقائياً.')) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/tutorials/sections/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert('Failed to delete section');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Load tutorial for edit
  const startEditTutorial = (tut: Tutorial) => {
    setEditingTutorial(tut);
    setIsCreating(false);
    setTutTitle(tut.title);
    setTutDescription(tut.description);
    const matchedSec = sections.find(s => matchSubjectIds(s.id, tut.sectionId));
    setTutSectionId(matchedSec ? matchedSec.id : (tut.sectionId || ''));
    setTutLinkUrl(tut.linkUrl || '');
    setTutLinkTitle(tut.linkTitle || '');
    setTutImageUrl(tut.imageUrl || '');

    // Parse blocks from text column
    try {
      if (tut.text.trim().startsWith('[')) {
        setBlocks(JSON.parse(tut.text));
      } else {
        // Fallback: create a single text block + steps block if existing steps exist
        const initialBlocks: Block[] = [{ type: 'text', content: tut.text }];
        if (tut.steps && tut.steps.length > 0) {
          initialBlocks.push({ type: 'steps', stepsItems: tut.steps });
        }
        setBlocks(initialBlocks);
      }
    } catch (e) {
      const initialBlocks: Block[] = [{ type: 'text', content: tut.text }];
      if (tut.steps && tut.steps.length > 0) {
        initialBlocks.push({ type: 'steps', stepsItems: tut.steps });
      }
      setBlocks(initialBlocks);
    }
    setActiveSubTab('edit');
  };

  // Start new tutorial
  const startNewTutorial = () => {
    setEditingTutorial(null);
    setIsCreating(true);
    setTutTitle('');
    setTutDescription('');
    setTutSectionId(sections[0]?.id || '');
    setTutLinkUrl('');
    setTutLinkTitle('');
    setTutImageUrl('');
    setBlocks([{ type: 'text', content: '' }]);
    setActiveSubTab('edit');
  };

  // Block management helpers
  const addBlock = (type: Block['type']) => {
    let newBlock: Block;
    if (type === 'text') newBlock = { type: 'text', content: '' };
    else if (type === 'callout' || type === 'alert') newBlock = { type: 'callout', title: '⚠️ تنبيه مهم:', variant: 'warning', content: '' };
    else if (type === 'steps') newBlock = { type: 'steps', stepsItems: [''] };
    else if (type === 'list') newBlock = { type: 'list', listItems: [''], listType: 'unordered' };
    else if (type === 'table') newBlock = { type: 'table', tableHeaders: ['العنوان ١', 'العنوان ٢'], tableRows: [['', '']] };
    else if (type === 'media') newBlock = { type: 'media', mediaType: 'image', mediaUrl: '', mediaUrls: [], videoUrl: '' };
    else newBlock = { type: 'buttons', buttons: [{ label: '', url: '' }] };

    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (index: number, fields: Partial<Block>) => {
    setBlocks(prev => prev.map((b, idx) => idx === index ? { ...b, ...fields } : b));
  };

  const deleteBlock = (index: number) => {
    setBlocks(prev => prev.filter((_, idx) => idx !== index));
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const newBlocks = [...blocks];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newBlocks.length) return;

    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIdx];
    newBlocks[targetIdx] = temp;
    setBlocks(newBlocks);
  };

  // Save tutorial
  const handleSaveTutorial = async () => {
    if (!tutTitle.trim() || !tutDescription.trim() || !tutSectionId) {
      alert('الرجاء ملء الحقول الأساسية: العنوان، الوصف والقسم.');
      return;
    }

    // Extract all steps from steps blocks to store in the standard steps array column
    const extractedSteps: string[] = [];
    blocks.forEach(b => {
      if (b.type === 'steps' && b.stepsItems) {
        b.stepsItems.forEach(s => {
          if (s.trim()) extractedSteps.push(s.trim());
        });
      }
    });

    let primaryImageUrl = tutImageUrl.trim() || null;
    let primaryVideoUrl: string | null = null;
    blocks.forEach(b => {
      if (b.type === 'media') {
        const imgs = b.mediaUrls || (b.mediaUrl && b.mediaType === 'image' ? [b.mediaUrl] : []);
        if (!primaryImageUrl && imgs.length > 0) primaryImageUrl = imgs[0];
        if (!primaryVideoUrl && b.videoUrl) primaryVideoUrl = b.videoUrl;
      }
    });

    const matchedSec = sections.find(s => matchSubjectIds(s.id, tutSectionId));
    const payload = {
      sectionId: matchedSec ? matchedSec.id : tutSectionId,
      title: tutTitle.trim(),
      description: tutDescription.trim(),
      text: JSON.stringify(blocks),
      steps: extractedSteps,
      linkUrl: tutLinkUrl.trim() || null,
      linkTitle: tutLinkTitle.trim() || null,
      videoUrl: primaryVideoUrl,
      imageUrl: primaryImageUrl
    };

    try {
      const token = await user?.getIdToken();
      const method = editingTutorial ? 'PUT' : 'POST';
      const url = editingTutorial ? `/api/admin/tutorials/${editingTutorial.id}` : '/api/admin/tutorials';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        onRefresh();
        setEditingTutorial(null);
        setIsCreating(false);
      } else {
        alert('فشل حفظ الشرح. الرجاء التحقق من البيانات.');
      }
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء الاتصال بالخادم.');
    }
  };

  // Delete tutorial
  const handleDeleteTutorial = async (id: number) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الشرح؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/admin/tutorials/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        onRefresh();
      } else {
        alert('Failed to delete tutorial');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getDynamicIcon = (iconName: string) => {
    const IconComp = (Icons as any)[iconName];
    return IconComp ? <IconComp className="w-5 h-5" /> : <HelpCircle className="w-5 h-5" />;
  };

  // Render Section and Tutorials List Dashboard
  if (!editingTutorial && !isCreating) {
    return (
      <div className="space-y-10 text-right bg-transparent" dir="rtl">
        {/* Top Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6" style={{ borderColor: 'var(--border-color)' }}>
          <div>
            <h3 className="text-xl font-serif font-bold mb-1" style={{ color: 'var(--text-main)' }}>إدارة شروحات الدليلة</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>إضافة وتعديل الأقسام ومكونات الشروحات التوضيحية للطلاب.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSectionForm(true)}
              className="border px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 hover:bg-[var(--bg-subtle)]"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            >
              <Plus className="w-4 h-4" /> إضافة تصنيف جديد
            </button>
            <button
              onClick={startNewTutorial}
              className="bg-[var(--color-imamu-brown)] text-white hover:bg-[var(--color-imamu-brown-light)] px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" /> إضافة شرح جديد
            </button>
          </div>
        </div>

        {/* Modern Modal backdrop */}
        {showSectionForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Box */}
            <form 
              onSubmit={handleSaveSection}
              className="border rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 text-right" 
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="p-5 border-b flex items-center justify-between" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[var(--color-imamu-accent)]" />
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>
                    {editingSection ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={resetSectionForm}
                  className="p-1.5 rounded-lg transition hover:bg-[var(--bg-card)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. Live Preview - Single Centered Catalog Card */}
                <div className="p-5 rounded-2xl flex flex-col items-center justify-center space-y-3" style={{ background: 'var(--bg-subtle)' }}>
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>معاينة التصنيف في الدليل</span>
                  <div className="w-full max-w-sm border rounded-xl p-4 flex items-start gap-3 text-right" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                    {(() => {
                      const colorStyle = getSectionColorClasses(secColor);
                      return (
                        <div className={`p-2.5 rounded-xl border shrink-0 flex items-center justify-center ${colorStyle.container}`}>
                          {React.createElement((Icons as any)[secIcon] || HelpCircle, { className: "w-5 h-5" })}
                        </div>
                      );
                    })()}
                    <div className="flex-1 min-w-0 pr-1 text-right">
                      <h3 className="text-xs font-bold truncate" style={{ color: 'var(--text-main)' }}>
                        {secTitle || 'اسم التصنيف الجديد'}
                      </h3>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        هنا ستظهر الشروحات الأكاديمية التابعة له...
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Category Title Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>اسم التصنيف:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: الخدمات الأكاديمية، المكافآت..."
                    value={secTitle}
                    onChange={e => setSecTitle(e.target.value)}
                    className="rounded-xl py-3 px-4 outline-none text-xs transition animate-none"
                  />
                </div>

                {/* 3. Color Picker Swatches */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>لون التصنيف المميز:</label>
                    <span className="text-[10px] font-bold" style={{ color: 'var(--text-main)' }}>
                      {getSectionColorClasses(secColor).name}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 p-3.5 rounded-2xl border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                    {SECTION_COLOR_PRESETS.map((preset) => {
                      const isSelected = getSectionColorClasses(secColor).id === preset.id;
                      return (
                        <button
                          type="button"
                          key={preset.id}
                          onClick={() => setSecColor(preset.value)}
                          className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${
                            isSelected 
                              ? `bg-[var(--bg-card)] ${preset.swatchBorder} ring-2 ring-amber-500/30 scale-105 shadow-xs` 
                              : 'border-transparent hover:bg-[var(--bg-card)]'
                          }`}
                          title={preset.name}
                        >
                          <div className={`w-5 h-5 rounded-full ${preset.swatchBg} border ${preset.swatchBorder} shadow-2xs`} />
                          <span className="text-[9px] font-bold truncate max-w-full" style={{ color: isSelected ? 'var(--text-main)' : 'var(--text-muted)' }}>
                            {preset.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Icon Search Engine */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>أيقونة التصنيف:</label>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>اختر أيقونة معبرة من محرك البحث</span>
                  </div>
                  
                  {/* Search Input field */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ابحث عن أيقونة... (مثال: book, cap, phone, card)"
                      value={iconSearchQuery}
                      onChange={e => setIconSearchQuery(e.target.value)}
                      className="w-full pr-4 pl-10 py-2.5 rounded-xl outline-none text-xs transition"
                    />
                    <Icons.Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-400" />
                    {iconSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setIconSearchQuery('')}
                        className="absolute left-10 top-3 text-zinc-400 hover:text-zinc-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Icons Grid with Pagination/Limit */}
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-2.5 max-h-48 overflow-y-auto p-3.5 rounded-2xl border" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                    {filteredIcons.slice(0, 80).map(icoName => {
                      const IconComponent = (Icons as any)[icoName];
                      const isSelected = secIcon === icoName;
                      if (!IconComponent) return null;
                      return (
                        <button
                          type="button"
                          key={icoName}
                          onClick={() => setSecIcon(icoName)}
                          className={`p-3 rounded-xl flex items-center justify-center border transition-all ${
                            isSelected 
                              ? 'bg-[var(--color-imamu-brown)]/10 border-amber-700 text-[var(--color-imamu-accent)] scale-105 shadow-inner' 
                              : 'hover:bg-[var(--bg-card)]'
                          }`}
                          style={!isSelected ? { background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-muted)' } : {}}
                          title={icoName}
                        >
                          <IconComponent className="w-4.5 h-4.5" />
                        </button>
                      );
                    })}
                    {filteredIcons.length === 0 && (
                      <div className="col-span-full py-8 text-center text-xs italic" style={{ color: 'var(--text-muted)' }}>
                        لا توجد أيقونات تطابق البحث
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t flex justify-end gap-3" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-subtle)' }}>
                <button
                  type="button"
                  onClick={resetSectionForm}
                  className="px-5 py-2.5 border rounded-xl text-xs font-bold transition hover:bg-[var(--bg-card)]"
                  style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!secTitle.trim()}
                  className="btn-rise px-6 py-2.5 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-light)] disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
                >
                  {editingSection ? 'حفظ التعديلات' : 'إنشاء التصنيف'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sections List Sidebar */}
          <div className="space-y-4">
            <h4 className="font-bold text-sm pr-1" style={{ color: 'var(--text-main)' }}>قائمة التصنيفات ({sections.length})</h4>
            <div className="divide-y border rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              {sections.map(sec => {
                const colorStyle = getSectionColorClasses(sec.color);
                const count = tutorials.filter(t => matchSubjectIds(t.sectionId, sec.id)).length;
                return (
                  <div key={sec.id} className="p-4 flex items-center justify-between group hover:bg-[var(--bg-subtle)] transition">
                    <div className="flex items-center gap-3">
                      <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center shrink-0 border ${colorStyle.container}`}>
                        {getDynamicIcon(sec.icon)}
                      </div>
                      <div>
                        <div className="font-bold text-xs" style={{ color: 'var(--text-main)' }}>{sec.title}</div>
                        <div className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{count} شروحات</div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition">
                      <button
                        onClick={() => startEditSection(sec)}
                        className="p-1 hover:text-[var(--color-imamu-accent)] rounded border border-transparent hover:border-[var(--border-color)]"
                      >
                        <Edit className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      </button>
                      <button
                        onClick={() => handleDeleteSection(sec.id)}
                        className="p-1 hover:text-red-400 rounded border border-transparent hover:border-[var(--border-color)]"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400 opacity-70 hover:opacity-100" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {sections.length === 0 && (
                <div className="p-8 text-center text-xs italic" style={{ color: 'var(--text-muted)' }}>لا توجد تصنيفات بعد.</div>
              )}
            </div>
          </div>

          {/* Tutorials List main panel */}
          <div className="lg:col-span-2 space-y-6">
            <h4 className="font-bold text-sm pr-1" style={{ color: 'var(--text-main)' }}>قائمة الشروحات المتوفرة ({tutorials.length})</h4>
            <div className="space-y-4">
              {sections.map(sec => {
                const secTuts = tutorials.filter(t => matchSubjectIds(t.sectionId, sec.id));
                if (secTuts.length === 0) return null;

                return (
                  <div key={sec.id} className="space-y-2.5">
                    <div className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5 pr-1" style={{ color: 'var(--text-muted)' }}>
                      <span className={`p-1 rounded-md border ${getSectionColorClasses(sec.color).container}`}>
                        {getDynamicIcon(sec.icon)}
                      </span>
                      <span>{sec.title}</span>
                    </div>
                    
                    <div className="divide-y border rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                      {secTuts.map(tut => (
                        <div key={tut.id} className="p-4 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition gap-4">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-xs truncate" style={{ color: 'var(--text-main)' }}>{tut.title}</h5>
                            <p className="text-[11px] mt-1 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{tut.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditTutorial(tut)}
                              className="px-3 py-1.5 border rounded-lg text-[10px] font-bold transition hover:bg-[var(--bg-subtle)]"
                              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                            >
                              تعديل الشرح
                            </button>
                            <button
                              onClick={() => handleDeleteTutorial(tut.id)}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Orphan / Uncategorized Tutorials */}
              {(() => {
                const orphanTuts = tutorials.filter(t => !sections.some(sec => matchSubjectIds(sec.id, t.sectionId)));
                if (orphanTuts.length === 0) return null;

                return (
                  <div className="space-y-2.5">
                    <div className="text-[10px] uppercase tracking-wider font-bold flex items-center gap-1.5 pr-1" style={{ color: 'var(--text-muted)' }}>
                      <span className="p-1 rounded-md border bg-amber-500/10 text-amber-500 border-amber-500/20">
                        <HelpCircle className="w-4 h-4" />
                      </span>
                      <span>شروحات عامة / غير مصنفة ({orphanTuts.length})</span>
                    </div>

                    <div className="divide-y border rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
                      {orphanTuts.map(tut => (
                        <div key={tut.id} className="p-4 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition gap-4">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-xs truncate" style={{ color: 'var(--text-main)' }}>{tut.title}</h5>
                            <p className="text-[11px] mt-1 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{tut.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditTutorial(tut)}
                              className="px-3 py-1.5 border rounded-lg text-[10px] font-bold transition hover:bg-[var(--bg-subtle)]"
                              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                            >
                              تعديل الشرح
                            </button>
                            <button
                              onClick={() => handleDeleteTutorial(tut.id)}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {tutorials.length === 0 && (
                <div className="py-20 text-center border border-dashed rounded-2xl italic text-xs" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                  لا توجد شروحات مضافة حالياً. اضغط على "إضافة شرح جديد" للبدء.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Tutorial Builder / Form Editor
  return (
    <div className="space-y-8 text-right bg-transparent" dir="rtl">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b pb-5" style={{ borderColor: 'var(--border-color)' }}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingTutorial(null);
              setIsCreating(false);
            }}
            className="w-8 h-8 rounded-xl border flex items-center justify-center transition hover:bg-[var(--bg-subtle)]"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
          >
            <ArrowRight className="w-4.5 h-4.5" />
          </button>
          <div>
            <h3 className="text-lg font-serif font-bold" style={{ color: 'var(--text-main)' }}>
              {isCreating ? 'إضافة شرح جديد' : 'تعديل الشرح'}
            </h3>
            <p className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>{tutTitle || 'مخطط شرح الدليلة'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub Tab switcher */}
          <div className="border p-1 rounded-xl flex gap-1" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
            <button
              onClick={() => setActiveSubTab('edit')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs"
              style={{
                background: activeSubTab === 'edit' ? 'var(--bg-card)' : 'transparent',
                color: activeSubTab === 'edit' ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              التحرير (Editor)
            </button>
            <button
              onClick={() => setActiveSubTab('preview')}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs"
              style={{
                background: activeSubTab === 'preview' ? 'var(--bg-card)' : 'transparent',
                color: activeSubTab === 'preview' ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              معاينة الشرح (Preview)
            </button>
          </div>

          <button
            onClick={handleSaveTutorial}
            className="btn-rise bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
          >
            حفظ الشرح
          </button>
        </div>
      </div>

      {activeSubTab === 'edit' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel: Info & Meta Fields */}
          <div className="space-y-6">
            <div className="border rounded-2xl p-5 space-y-4 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <h4 className="font-bold text-xs border-b pb-2 flex items-center gap-1.5" style={{ color: 'var(--text-main)', borderColor: 'var(--border-color)' }}>
                <Sparkles className="w-4 h-4 text-emerald-500" />
                بيانات الشرح الأساسية
              </h4>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>العنوان:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: كيفية حذف وإضافة مادة"
                  value={tutTitle}
                  onChange={e => setTutTitle(e.target.value)}
                  className="rounded-xl py-2 px-3 text-xs text-right font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>وصف الشرح مختصر:</label>
                <textarea
                  required
                  placeholder="اكتب وصفاً موجزاً يظهر للطلاب في قائمة الشروحات..."
                  value={tutDescription}
                  onChange={e => setTutDescription(e.target.value)}
                  className="rounded-xl py-2 px-3 text-xs text-right font-normal resize-none h-20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>التصنيف / القسم:</label>
                <select
                  value={sections.find(s => matchSubjectIds(s.id, tutSectionId))?.id || tutSectionId}
                  onChange={e => setTutSectionId(e.target.value)}
                  className="rounded-xl py-2 px-3 text-xs font-semibold"
                >
                  <option value="" disabled>اختر التصنيف المناسب</option>
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Right panel: Structured Block-based Canvas Editor */}
          <div className="md:col-span-2 space-y-6">
            {/* Block Toolbar Add buttons */}
            <div className="border p-4 rounded-2xl flex flex-wrap gap-2 items-center justify-between shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>إضافة مكونات إلى الشرح:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => addBlock('text')}
                  className="px-3 py-1.5 border hover:bg-[var(--bg-subtle)] text-xs rounded-xl transition flex items-center gap-1.5 font-bold shadow-xs"
                  style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                >
                  <FileText className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" /> نص توضيحي
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('callout')}
                  className="px-3 py-1.5 border hover:bg-[var(--bg-subtle)] text-xs rounded-xl transition flex items-center gap-1.5 font-bold shadow-xs"
                  style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" /> تنبيه / إرشاد
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('steps')}
                  className="px-3 py-1.5 border hover:bg-[var(--bg-subtle)] text-xs rounded-xl transition flex items-center gap-1.5 font-bold shadow-xs"
                  style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[var(--color-imamu-accent)]" /> خطوات
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('list')}
                  className="px-3 py-1.5 border hover:bg-[var(--bg-subtle)] text-xs rounded-xl transition flex items-center gap-1.5 font-bold shadow-xs"
                  style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                >
                  <Compass className="w-3.5 h-3.5 text-purple-500" /> قائمة
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('table')}
                  className="px-3 py-1.5 border hover:bg-[var(--bg-subtle)] text-xs rounded-xl transition flex items-center gap-1.5 font-bold shadow-xs"
                  style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-500" /> جدول
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('media')}
                  className="px-3 py-1.5 border hover:bg-[var(--bg-subtle)] text-xs rounded-xl transition flex items-center gap-1.5 font-bold shadow-xs"
                  style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                >
                  <Image className="w-3.5 h-3.5 text-rose-500" /> وسائط (صور وفيديو)
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('buttons')}
                  className="px-3 py-1.5 border hover:bg-[var(--bg-subtle)] text-xs rounded-xl transition flex items-center gap-1.5 font-bold shadow-xs"
                  style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-500" /> أزرار توجيه
                </button>
              </div>
            </div>

            {/* Block Canvas Card List */}
            <div className="space-y-4">
              {blocks.map((block, blockIdx) => (
                <div 
                  key={blockIdx}
                  className="border rounded-2xl overflow-hidden shadow-sm flex flex-col transition duration-200"
                  style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                >
                  {/* Block Header */}
                  <div className="border-b px-4 py-3 flex items-center justify-between" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>#{blockIdx + 1}</span>
                      <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                        {block.type === 'text' && <><FileText className="w-4 h-4 text-[var(--color-imamu-accent)]" /> نص توضيحي</>}
                        {(block.type === 'callout' || block.type === 'alert') && <><AlertCircle className="w-4 h-4 text-amber-500" /> تنبيه / صندوق إرشادي</>}
                        {block.type === 'steps' && <><CheckSquare className="w-4 h-4 text-[var(--color-imamu-accent)]" /> خطوات الشرح التوضيحي</>}
                        {block.type === 'list' && <><Compass className="w-4 h-4 text-purple-500" /> عناصر القائمة النقطية</>}
                        {block.type === 'table' && <><PlusCircle className="w-4 h-4 text-emerald-500" /> جدول بيانات</>}
                        {block.type === 'media' && <><Image className="w-4 h-4 text-rose-500" /> وسائط (صور وفيديو)</>}
                        {block.type === 'buttons' && <><ExternalLink className="w-4 h-4 text-indigo-500" /> أزرار توجيه للطلاب</>}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Reorder Buttons */}
                      <button
                        type="button"
                        onClick={() => moveBlock(blockIdx, 'up')}
                        disabled={blockIdx === 0}
                        className="p-1 rounded disabled:opacity-30 transition hover:bg-[var(--bg-card)]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(blockIdx, 'down')}
                        disabled={blockIdx === blocks.length - 1}
                        className="p-1 rounded disabled:opacity-30 transition hover:bg-[var(--bg-card)]"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <span className="w-px h-4 mx-1.5 opacity-40" style={{ background: 'var(--border-color)' }} />
                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => deleteBlock(blockIdx)}
                        className="p-1 text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Block Editor Content */}
                  <div className="p-4" style={{ background: 'var(--bg-card)' }}>
                    {/* TEXT BLOCK */}
                    {block.type === 'text' && (
                      <textarea
                        className="w-full text-xs sm:text-sm rounded-lg p-3 outline-none text-right font-normal resize-none"
                        rows={4}
                        placeholder="اكتب محتوى الفقرة هنا..."
                        value={block.content || ''}
                        onChange={(e) => updateBlock(blockIdx, { content: e.target.value })}
                      />
                    )}

                    {/* CALLOUT / ALERT BLOCK */}
                    {(block.type === 'callout' || block.type === 'alert') && (
                      <div className="space-y-3 text-right">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="sm:col-span-2 flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>عنوان التنبيه:</label>
                            <input
                              type="text"
                              className="text-xs rounded-xl p-2.5 px-3 text-right font-bold"
                              value={block.title || ''}
                              placeholder="مثال: ⚠️ شروط قبول الآيبان البنكي:"
                              onChange={(e) => updateBlock(blockIdx, { title: e.target.value })}
                            />
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <label className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>نوع التنبيه:</label>
                            <select
                              className="text-xs rounded-xl p-2.5 px-3 font-semibold"
                              value={block.variant || 'warning'}
                              onChange={(e) => updateBlock(blockIdx, { variant: e.target.value as any })}
                            >
                              <option value="warning">⚠️ تنبيه (Warning - أصفر)</option>
                              <option value="info">💡 إرشادي (Info - أزرق)</option>
                              <option value="danger">🚨 تحذير هام (Danger - أحمر)</option>
                              <option value="success">✅ نجاح / معتمد (Success - أخضر)</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-slate-400">اكتب كل نقطة أو شرط في سطر مستقل لتبدو مرتبة ومنفصلة</span>
                            <label className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>محتوى وأسطر التنبيه:</label>
                          </div>
                          <textarea
                            rows={4}
                            className="text-xs rounded-xl p-3 text-right font-normal resize-y leading-relaxed"
                            value={block.content || ''}
                            placeholder={"1. يجب أن يكون الحساب البنكي باسم الطالب/الطالبة حصراً.\n2. التأكد من أن الحساب نشط وغير مجمد لدى البنك.\n3. يبدأ الآيبان السعودي دائماً بالرمز SA متبوعاً بـ 22 رقماً."}
                            onChange={(e) => updateBlock(blockIdx, { content: e.target.value })}
                          />
                        </div>
                      </div>
                    )}

                    {/* STEPS BLOCK */}
                    {block.type === 'steps' && (
                      <div className="space-y-3">
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                          {(block.stepsItems || []).map((step, sIdx) => (
                            <div key={sIdx} className="flex gap-2 items-start">
                              <span className="text-xs font-bold pt-2.5 shrink-0" style={{ color: 'var(--text-muted)' }}>{sIdx + 1}.</span>
                              <textarea
                                className="flex-1 text-xs rounded-xl p-2.5 text-right outline-none resize-none"
                                rows={2}
                                value={step}
                                placeholder="اكتب تفاصيل الخطوة هنا..."
                                onChange={(e) => {
                                  const newSteps = [...(block.stepsItems || [])];
                                  newSteps[sIdx] = e.target.value;
                                  updateBlock(blockIdx, { stepsItems: newSteps });
                                }}
                              />
                              <button
                                type="button"
                                className="p-2.5 border rounded-xl hover:bg-[var(--bg-subtle)] shrink-0 mt-1 transition"
                                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                                onClick={() => {
                                  const newSteps = (block.stepsItems || []).filter((_, idx) => idx !== sIdx);
                                  updateBlock(blockIdx, { stepsItems: newSteps });
                                }}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="text-[11px] border font-bold px-3 py-2 rounded-xl transition hover:bg-[var(--bg-subtle)]"
                          style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                          onClick={() => {
                            const newSteps = [...(block.stepsItems || []), ''];
                            updateBlock(blockIdx, { stepsItems: newSteps });
                          }}
                        >
                          + إضافة خطوة جديدة
                        </button>
                      </div>
                    )}

                    {/* LIST BLOCK */}
                    {block.type === 'list' && (
                      <div className="space-y-3">
                        <div className="flex gap-4 items-center mb-2">
                          <label className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>نوع القائمة:</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className={`px-3 py-1.5 text-xs rounded-xl font-bold border transition ${block.listType === 'ordered' ? 'bg-[var(--color-imamu-brown)] border-[var(--color-imamu-brown)] text-white' : 'hover:bg-[var(--bg-subtle)]'}`}
                              style={block.listType !== 'ordered' ? { background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' } : {}}
                              onClick={() => updateBlock(blockIdx, { listType: 'ordered' })}
                            >
                              قائمة مرقمة (1, 2, 3)
                            </button>
                            <button
                              type="button"
                              className={`px-3 py-1.5 text-xs rounded-xl font-bold border transition ${block.listType === 'unordered' ? 'bg-[var(--color-imamu-brown)] border-[var(--color-imamu-brown)] text-white' : 'hover:bg-[var(--bg-subtle)]'}`}
                              style={block.listType !== 'unordered' ? { background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' } : {}}
                              onClick={() => updateBlock(blockIdx, { listType: 'unordered' })}
                            >
                              قائمة نقطية (•)
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                          {(block.listItems || []).map((item, iIdx) => (
                            <div key={iIdx} className="flex gap-2 items-center">
                              <input
                                type="text"
                                className="flex-1 text-xs rounded-xl p-2 px-3 text-right"
                                value={item}
                                placeholder="اكتب عنصر القائمة هنا..."
                                onChange={(e) => {
                                  const newItems = [...(block.listItems || [])];
                                  newItems[iIdx] = e.target.value;
                                  updateBlock(blockIdx, { listItems: newItems });
                                }}
                              />
                              <button
                                type="button"
                                className="p-2.5 border rounded-xl hover:bg-[var(--bg-subtle)] shrink-0 transition"
                                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                                onClick={() => {
                                  const newItems = (block.listItems || []).filter((_, idx) => idx !== iIdx);
                                  updateBlock(blockIdx, { listItems: newItems });
                                }}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="text-[11px] border font-bold px-3 py-2 rounded-xl transition hover:bg-[var(--bg-subtle)]"
                          style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                          onClick={() => {
                            const newItems = [...(block.listItems || []), ''];
                            updateBlock(blockIdx, { listItems: newItems });
                          }}
                        >
                          + إضافة عنصر جديد
                        </button>
                      </div>
                    )}

                    {/* TABLE BLOCK */}
                    {block.type === 'table' && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <label className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>عدد الأعمدة في الجدول:</label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-[var(--bg-subtle)] font-bold transition"
                              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                              onClick={() => {
                                const currentCols = block.tableHeaders?.length || 1;
                                if (currentCols <= 1) return;
                                const newHeaders = (block.tableHeaders || []).slice(0, -1);
                                const newRows = (block.tableRows || []).map(row => row.slice(0, -1));
                                updateBlock(blockIdx, { tableHeaders: newHeaders, tableRows: newRows });
                              }}
                            >
                              -
                            </button>
                            <span className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>{block.tableHeaders?.length || 0}</span>
                            <button
                              type="button"
                              className="w-8 h-8 rounded-lg border flex items-center justify-center hover:bg-[var(--bg-subtle)] font-bold transition"
                              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                              onClick={() => {
                                const newHeaders = [...(block.tableHeaders || []), `عنوان العمود ${ (block.tableHeaders?.length || 0) + 1 }`];
                                const newRows = (block.tableRows || []).map(row => [...row, '']);
                                updateBlock(blockIdx, { tableHeaders: newHeaders, tableRows: newRows });
                              }}
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Table headers input */}
                        <div className="grid gap-2 border p-2.5 rounded-xl" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', gridTemplateColumns: `repeat(${block.tableHeaders?.length || 1}, minmax(0, 1fr))` }}>
                          {(block.tableHeaders || []).map((header, hIdx) => (
                            <input
                              key={hIdx}
                              type="text"
                              className="text-xs rounded-lg p-2 text-right font-bold"
                              value={header}
                              placeholder={`العنوان ${hIdx + 1}`}
                              onChange={(e) => {
                                const newHeaders = [...(block.tableHeaders || [])];
                                newHeaders[hIdx] = e.target.value;
                                updateBlock(blockIdx, { tableHeaders: newHeaders });
                              }}
                            />
                          ))}
                        </div>

                        {/* Table Rows input */}
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                          {(block.tableRows || []).map((row, rIdx) => (
                            <div key={rIdx} className="flex gap-2 items-center">
                              <div className="flex-1 grid gap-2" style={{ gridTemplateColumns: `repeat(${block.tableHeaders?.length || 1}, minmax(0, 1fr))` }}>
                                {row.map((cell, cIdx) => (
                                  <input
                                    key={cIdx}
                                    type="text"
                                    className="text-xs rounded-lg p-2 text-right"
                                    value={cell}
                                    placeholder="خلية البيانات..."
                                    onChange={(e) => {
                                      const newRows = [...(block.tableRows || [])];
                                      newRows[rIdx] = [...newRows[rIdx]];
                                      newRows[rIdx][cIdx] = e.target.value;
                                      updateBlock(blockIdx, { tableRows: newRows });
                                    }}
                                  />
                                ))}
                              </div>
                              <button
                                type="button"
                                className="p-2 border rounded-xl hover:bg-[var(--bg-subtle)] shrink-0 transition"
                                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                                onClick={() => {
                                  const newRows = (block.tableRows || []).filter((_, idx) => idx !== rIdx);
                                  updateBlock(blockIdx, { tableRows: newRows });
                                }}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          className="text-[11px] border font-bold px-3 py-2 rounded-xl transition hover:bg-[var(--bg-subtle)]"
                          style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                          onClick={() => {
                            const colsCount = block.tableHeaders?.length || 1;
                            const newRow = Array(colsCount).fill('');
                            const newRows = [...(block.tableRows || []), newRow];
                            updateBlock(blockIdx, { tableRows: newRows });
                          }}
                        >
                          + إضافة صف جديد
                        </button>
                      </div>
                    )}

                    {/* MEDIA BLOCK */}
                    {block.type === 'media' && (() => {
                      const currentImages: string[] = [
                        ...(block.mediaUrls || []),
                        ...(block.images || []),
                        ...(block.mediaType === 'image' && block.mediaUrl ? [block.mediaUrl] : [])
                      ].filter(Boolean);
                      const uniqueImages = Array.from(new Set(currentImages));
                      const currentVideo = block.videoUrl || (block.mediaType === 'video' ? block.mediaUrl : '');

                      return (
                        <div className="space-y-5 text-right">
                          {/* 1. Images Gallery Section */}
                          <div className="border rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                                <Image className="w-4 h-4 text-rose-500" />
                                صور الشرح والإنفوجرافيك ({uniqueImages.length}/10 صور)
                              </span>
                              <span className="text-[10px] text-slate-400">يدعم حتى 10 صور بدقة عالية</span>
                            </div>

                            {/* Upload Button */}
                            <div className="flex flex-wrap items-center gap-3">
                              <label className={`cursor-pointer border font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition hover:bg-[var(--bg-card)] shadow-xs ${uploadingBlockIdx === blockIdx ? 'opacity-50 pointer-events-none' : ''}`} style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                                <Upload className="w-4 h-4 text-[var(--color-imamu-accent)]" />
                                {uploadingBlockIdx === blockIdx ? "جاري رفع الصور إلى التخزين السحابي..." : "اختر صوراً لرفعها (يمكن اختيار عدة صور)"}
                                <input
                                  type="file"
                                  className="hidden"
                                  multiple
                                  accept="image/*"
                                  disabled={uploadingBlockIdx !== null}
                                  onChange={async (e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length === 0) return;
                                    setUploadingBlockIdx(blockIdx);

                                    try {
                                      const token = await user?.getIdToken();
                                      const uploadedUrls: string[] = [];

                                      for (const file of files) {
                                        const formData = new FormData();
                                        formData.append('files', file);
                                        formData.append('category', 'tutorials');

                                        const res = await fetch('/api/admin/upload', {
                                          method: 'POST',
                                          headers: { Authorization: `Bearer ${token}` },
                                          body: formData
                                        }).then(r => r.json());

                                        if (res.success && res.urls && res.urls.length > 0) {
                                          uploadedUrls.push(...res.urls);
                                        } else if (res.url) {
                                          uploadedUrls.push(res.url);
                                        } else if (res.files && res.files[0]?.url) {
                                          uploadedUrls.push(res.files[0].url);
                                        }
                                      }

                                      if (uploadedUrls.length > 0) {
                                        const combined = Array.from(new Set([...uniqueImages, ...uploadedUrls])).slice(0, 10);
                                        updateBlock(blockIdx, { mediaUrls: combined, mediaType: 'image' });
                                      } else {
                                        alert("فشل رفع الصور. يرجى التأكد من الحجم والصيغة.");
                                      }
                                    } catch (err) {
                                      console.error(err);
                                      alert("خطأ أثناء الاتصال بالخادم لرفع الصور.");
                                    } finally {
                                      setUploadingBlockIdx(null);
                                      e.target.value = '';
                                    }
                                  }}
                                />
                              </label>
                            </div>

                            {/* Images Grid Preview */}
                            {uniqueImages.length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 pt-2">
                                {uniqueImages.map((imgUrl, imgIdx) => (
                                  <div 
                                    key={imgIdx} 
                                    className="relative group border rounded-xl overflow-hidden aspect-square bg-white dark:bg-zinc-900 p-1 flex items-center justify-center shadow-xs"
                                    style={{ borderColor: 'var(--border-color)' }}
                                  >
                                    <img src={imgUrl} alt={`صورة ${imgIdx + 1}`} className="w-full h-full object-contain rounded-lg" />
                                    
                                    {/* Actions overlay */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 p-1">
                                      {imgIdx > 0 && (
                                        <button
                                          type="button"
                                          title="تقديم الصورة"
                                          className="p-1 rounded bg-white/20 hover:bg-white/40 text-white text-xs"
                                          onClick={() => {
                                            const arr = [...uniqueImages];
                                            const tmp = arr[imgIdx];
                                            arr[imgIdx] = arr[imgIdx - 1];
                                            arr[imgIdx - 1] = tmp;
                                            updateBlock(blockIdx, { mediaUrls: arr });
                                          }}
                                        >
                                          ▶
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        title="حذف الصورة"
                                        className="p-1.5 rounded-full bg-red-500 hover:bg-red-600 text-white transition shadow-sm"
                                        onClick={() => {
                                          const filtered = uniqueImages.filter((_, idx) => idx !== imgIdx);
                                          updateBlock(blockIdx, { mediaUrls: filtered });
                                        }}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                      {imgIdx < uniqueImages.length - 1 && (
                                        <button
                                          type="button"
                                          title="تأخير الصورة"
                                          className="p-1 rounded bg-white/20 hover:bg-white/40 text-white text-xs"
                                          onClick={() => {
                                            const arr = [...uniqueImages];
                                            const tmp = arr[imgIdx];
                                            arr[imgIdx] = arr[imgIdx + 1];
                                            arr[imgIdx + 1] = tmp;
                                            updateBlock(blockIdx, { mediaUrls: arr });
                                          }}
                                        >
                                          ◀
                                        </button>
                                      )}
                                    </div>
                                    <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] font-mono px-1 rounded">
                                      #{imgIdx + 1}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* 2. Video Section */}
                          <div className="border rounded-2xl p-4 space-y-3" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                                <Film className="w-4 h-4 text-purple-500" />
                                مقطع فيديو للشرح (اختياري - يدعم فيديو واحد)
                              </span>
                              {currentVideo && (
                                <button
                                  type="button"
                                  onClick={() => updateBlock(blockIdx, { videoUrl: '', mediaUrl: '' })}
                                  className="text-[11px] text-red-500 hover:underline flex items-center gap-1"
                                >
                                  <X className="w-3.5 h-3.5" /> حذف الفيديو
                                </button>
                              )}
                            </div>

                            {currentVideo ? (
                              <div className="rounded-xl border p-2 bg-white dark:bg-zinc-900 flex items-center justify-between gap-3 text-xs" style={{ borderColor: 'var(--border-color)' }}>
                                <div className="flex items-center gap-2 truncate">
                                  <Video className="w-4 h-4 text-purple-500 shrink-0" />
                                  <span className="truncate font-mono text-[11px] dir-ltr text-left" style={{ color: 'var(--text-main)' }}>{currentVideo}</span>
                                </div>
                                <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0 text-[10px]">جاهز للعرض ✓</span>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex flex-wrap items-center gap-3">
                                  <label className="cursor-pointer border font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition hover:bg-[var(--bg-card)] shadow-xs" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                                    <Upload className="w-4 h-4 text-purple-500" />
                                    رفع ملف فيديو مباشر (MP4)
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept="video/mp4,video/*"
                                      disabled={uploadingBlockIdx !== null}
                                      onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setUploadingBlockIdx(blockIdx);
                                        const formData = new FormData();
                                        formData.append('files', file);
                                        formData.append('category', 'tutorials');

                                        try {
                                          const token = await user?.getIdToken();
                                          const res = await fetch('/api/admin/upload', {
                                            method: 'POST',
                                            headers: { Authorization: `Bearer ${token}` },
                                            body: formData
                                          }).then(r => r.json());

                                          const vidUrl = res.urls?.[0] || res.url || res.files?.[0]?.url;
                                          if (vidUrl) {
                                            updateBlock(blockIdx, { videoUrl: vidUrl });
                                          } else {
                                            alert("فشل رفع الفيديو. الرجاء التأكد من حجم الملف.");
                                          }
                                        } catch (err) {
                                          console.error(err);
                                          alert("خطأ أثناء رفع ملف الفيديو.");
                                        } finally {
                                          setUploadingBlockIdx(null);
                                          e.target.value = '';
                                        }
                                      }}
                                    />
                                  </label>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                  <label className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>أو رابط فيديو خارجي (YouTube / Embed URL):</label>
                                  <input
                                    type="text"
                                    className="text-xs rounded-xl py-2 px-3 text-left outline-none"
                                    value={currentVideo}
                                    placeholder="https://www.youtube.com/watch?v=... أو رابط MP4 مباشر"
                                    onChange={(e) => updateBlock(blockIdx, { videoUrl: e.target.value })}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* BUTTONS BLOCK */}
                    {block.type === 'buttons' && (
                      <div className="space-y-3">
                        <div className="space-y-2.5">
                          {(block.buttons || []).map((btn, btnIdx) => (
                            <div key={btnIdx} className="flex gap-2 items-center border p-3.5 rounded-2xl" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)' }}>
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>اسم الزر (Label):</label>
                                  <input
                                    type="text"
                                    className="text-xs rounded-xl p-2 px-3"
                                    value={btn.label}
                                    placeholder="مثال: التقديم الفوري"
                                    onChange={(e) => {
                                      const newBtns = [...(block.buttons || [])];
                                      newBtns[btnIdx] = { ...newBtns[btnIdx], label: e.target.value };
                                      updateBlock(blockIdx, { buttons: newBtns });
                                    }}
                                  />
                                </div>
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] font-bold" style={{ color: 'var(--text-muted)' }}>رابط التوجيه (URL):</label>
                                  <input
                                    type="text"
                                    className="text-xs rounded-xl p-2 px-3 text-left"
                                    value={btn.url}
                                    placeholder="https://..."
                                    onChange={(e) => {
                                      const newBtns = [...(block.buttons || [])];
                                      newBtns[btnIdx] = { ...newBtns[btnIdx], url: e.target.value };
                                      updateBlock(blockIdx, { buttons: newBtns });
                                    }}
                                  />
                                </div>
                              </div>
                              <button
                                type="button"
                                className="p-2.5 border rounded-xl hover:bg-[var(--bg-card)] mt-4 shrink-0 transition"
                                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
                                onClick={() => {
                                  const newBtns = (block.buttons || []).filter((_, idx) => idx !== btnIdx);
                                  updateBlock(blockIdx, { buttons: newBtns });
                                }}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="text-[11px] border font-bold px-3 py-2 rounded-xl transition hover:bg-[var(--bg-subtle)]"
                          style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                          onClick={() => {
                            const newBtns = [...(block.buttons || []), { label: '', url: '' }];
                            updateBlock(blockIdx, { buttons: newBtns });
                          }}
                        >
                          + إضافة زر جديد
                        </button>

                        {/* Live Button Feedback Preview */}
                        {(block.buttons || []).filter(b => b.label && b.url).length > 0 && (
                          <div className="pt-3 border-t mt-3" style={{ borderColor: 'var(--border-color)' }}>
                            <span className="text-[10px] font-bold block mb-2" style={{ color: 'var(--text-muted)' }}>معاينة تفاعل واستجابة الأزرار للطلاب:</span>
                            <div className="flex flex-wrap gap-2.5 justify-start">
                              {block.buttons?.filter(b => b.label && b.url).map((btn, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="btn-rise inline-flex items-center gap-2 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md shadow-[var(--color-imamu-brown)/20] transition duration-200 cursor-pointer"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 shrink-0" /> {btn.label}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {blocks.length === 0 && (
                <div className="py-20 text-center border border-dashed rounded-2xl italic text-xs" style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}>
                  لا توجد مكونات في الشرح حتى الآن. الرجاء اختيار نوع المكون المراد إضافته من الأعلى.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Real-time Preview matching HowToPage 1-to-1 */
        <div className="w-full max-w-4xl mx-auto space-y-6">
          <div className="border rounded-2xl p-6 sm:p-8 shadow-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            {/* Header section preview */}
            <div className="mb-6">
              {(() => {
                const section = sections.find(s => s.id === Number(tutSectionId));
                const colorStyle = getSectionColorClasses(section?.color);
                return (
                  <span className={`text-[10px] font-bold px-3 py-1 rounded-md uppercase tracking-wider mb-4 inline-block border ${colorStyle.badge}`}>
                    {section?.title || 'التصنيف المختار'}
                  </span>
                );
              })()}
              <h1 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: 'var(--text-main)' }}>{tutTitle || 'عنوان الشرح التجريبي'}</h1>
              <p className="text-xs sm:text-sm leading-relaxed mb-6 font-normal" style={{ color: 'var(--text-muted)' }}>{tutDescription || 'هذا الجزء مخصص لعرض نبذة قصيرة ومختصرة عن محتويات الشرح الأكاديمي...'}</p>
              
              <div className="h-px w-full mb-6" style={{ background: 'var(--border-color)' }} />

              {/* Body Content rendering preview */}
              <div className="space-y-6 text-right font-normal text-xs sm:text-sm" dir="rtl" style={{ color: 'var(--text-main)' }}>
                {blocks.map((block, blockIdx) => {
                  if (block.type === 'text') {
                    return (
                      <p key={blockIdx} className="text-xs sm:text-sm leading-relaxed mb-3 whitespace-pre-line" style={{ color: 'var(--text-main)' }}>
                        {block.content || '... نص الفقرة فارغ حالياً ...'}
                      </p>
                    );
                  }

                  if (block.type === 'callout') {
                    const variant = (block.variant as string) || 'info';
                    const isWarning = variant === 'warning';
                    const isDanger = variant === 'danger' || variant === 'error';
                    const isSuccess = variant === 'success';

                    const rawContent = (block.content || (block as any).text || '').trim();
                    let lines: string[] = [];
                    if (rawContent.includes('\n')) {
                      lines = rawContent.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
                    } else if (/(\d+[\.\)]\s+)/.test(rawContent)) {
                      lines = rawContent.split(/(?=(?:^|\s+)\d+[\.\)]\s+)/).map((l: string) => l.trim()).filter(Boolean);
                    } else {
                      lines = [rawContent];
                    }

                    return (
                      <div 
                        key={blockIdx} 
                        className={`p-4 sm:p-5 rounded-2xl border flex items-start gap-3.5 my-5 shadow-2xs ${
                          isWarning ? 'bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200' :
                          isDanger ? 'bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200' :
                          isSuccess ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200' :
                          'bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-200'
                        }`}
                      >
                        {isDanger || isWarning ? (
                          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <Info className="w-5 h-5 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                        )}
                        <div className="flex-1 min-w-0 text-right font-normal">
                          {block.title && (
                            <h4 className="font-bold text-xs sm:text-sm mb-2 text-slate-900 dark:text-white flex items-center gap-1.5">
                              {block.title}
                            </h4>
                          )}
                          {lines.length > 1 ? (
                            <div className="space-y-2 mt-1">
                              {lines.map((line, lIdx) => (
                                <div key={lIdx} className="text-xs sm:text-sm leading-relaxed flex items-start gap-2">
                                  <span className="opacity-60 text-xs mt-1 shrink-0">•</span>
                                  <div className="flex-1 min-w-0">{line}</div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                              {rawContent}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }
                  
                  if (block.type === 'steps') {
                    const stepsItems = block.stepsItems || [];
                    return (
                      <div key={blockIdx} className="space-y-6 my-6 text-right" dir="rtl">
                        {stepsItems.map((rawStep: any, sIdx: number) => {
                          const isLast = sIdx === stepsItems.length - 1;
                          let stepText = '';
                          let stepImg: string | null = null;
                          if (typeof rawStep === 'string') {
                            if (rawStep.includes('|||')) {
                              const parts = rawStep.split('|||');
                              stepText = parts[0].trim();
                              stepImg = parts[1].trim();
                            } else {
                              stepText = rawStep;
                            }
                          } else if (rawStep && typeof rawStep === 'object') {
                            stepText = rawStep.text || '';
                            stepImg = rawStep.image || rawStep.imageUrl || null;
                          }

                          return (
                            <div key={sIdx} className="relative flex items-start gap-4">
                              <div className="relative flex flex-col items-center shrink-0 w-7">
                                <span className="w-7 h-7 rounded-full bg-[var(--color-imamu-brown)] text-white text-xs font-bold flex items-center justify-center shadow-xs z-10 shrink-0">
                                  {sIdx + 1}
                                </span>
                                {!isLast && (
                                  <span className="absolute top-7 bottom-0 right-1/2 translate-x-1/2 w-0.5 -mb-6" style={{ background: 'var(--border-color)' }} />
                                )}
                              </div>
                              <div className="flex-1 pt-0.5 min-w-0">
                                <p className="text-xs sm:text-sm font-normal leading-relaxed" style={{ color: 'var(--text-main)' }}>{stepText || 'محتوى الخطوة فارغ...'}</p>
                                {stepImg && (
                                  <div className="mt-3 rounded-xl overflow-hidden border max-w-md p-1.5 shadow-2xs" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-subtle)' }}>
                                    <img 
                                      src={stepImg} 
                                      alt={`خطوة ${sIdx + 1}`} 
                                      className="w-full h-auto max-h-[260px] object-contain rounded-lg mx-auto"
                                    />
                                    <span className="text-[10px] block text-center mt-1" style={{ color: 'var(--text-muted)' }}>صورة الخطوة الإرشادية</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  if (block.type === 'list') {
                    const items = block.listItems || [];
                    if (block.listType === 'ordered') {
                      return (
                        <ol key={blockIdx} className="list-decimal list-inside space-y-1.5 my-3 pr-2 text-xs sm:text-sm" style={{ color: 'var(--text-main)' }}>
                          {items.map((it, idx) => <li key={idx}>{it || 'عنصر فارغ...'}</li>)}
                        </ol>
                      );
                    } else {
                      return (
                        <ul key={blockIdx} className="list-disc list-inside space-y-1.5 my-3 pr-2 text-xs sm:text-sm" style={{ color: 'var(--text-main)' }}>
                          {items.map((it, idx) => <li key={idx}>{it || 'عنصر فارغ...'}</li>)}
                        </ul>
                      );
                    }
                  }

                  if (block.type === 'table') {
                    const headers = block.tableHeaders || [];
                    const rows = block.tableRows || [];
                    return (
                      <div key={blockIdx} className="overflow-x-auto my-4 border rounded-2xl" style={{ borderColor: 'var(--border-color)' }}>
                        <table className="w-full text-right border-collapse text-xs">
                          <thead className="border-b font-bold" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                            <tr>
                              {headers.map((h, idx) => (
                                <th key={idx} className="p-3.5 text-right font-bold">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
                            {rows.map((row, rowIdx) => (
                              <tr key={rowIdx} className="hover:bg-[var(--bg-subtle)] transition">
                                {row.map((cell, cellIdx) => (
                                  <td key={cellIdx} className="p-3.5">{cell || '-'}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  }

                  if (block.type === 'media') {
                    const images: string[] = [
                      ...(block.mediaUrls || []),
                      ...(block.images || []),
                      ...(block.mediaType === 'image' && block.mediaUrl ? [block.mediaUrl] : [])
                    ].filter(Boolean);
                    const uniqueImages = Array.from(new Set(images));
                    const video = block.videoUrl || (block.mediaType === 'video' ? block.mediaUrl : null);

                    if (uniqueImages.length === 0 && !video) {
                      return (
                        <div key={blockIdx} className="w-full max-w-xl aspect-video rounded-2xl border border-dashed flex items-center justify-center my-4 mx-auto text-xs italic" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
                          لم يتم تحديد ملف وسائط بعد
                        </div>
                      );
                    }

                    return (
                      <div key={blockIdx} className="my-6 space-y-4">
                        {video && (
                          <div className="rounded-2xl overflow-hidden border bg-black max-w-2xl mx-auto shadow-md" style={{ borderColor: 'var(--border-color)' }}>
                            {video.includes('youtube.com') || video.includes('youtu.be') ? (
                              <div className="aspect-video w-full">
                                <iframe 
                                  src={video.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')} 
                                  className="w-full h-full border-0" 
                                  allowFullScreen 
                                />
                              </div>
                            ) : (
                              <video src={video} controls className="w-full max-h-[460px] object-contain mx-auto" />
                            )}
                          </div>
                        )}

                        {uniqueImages.length === 1 ? (
                          <div className="rounded-2xl overflow-hidden border p-2 text-center max-w-2xl mx-auto shadow-xs" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-subtle)' }}>
                            <img 
                              src={uniqueImages[0]} 
                              alt="صورة توضيحية للشرح" 
                              className="w-full h-auto max-h-[480px] object-contain rounded-xl mx-auto"
                            />
                            <span className="text-[10px] block text-center mt-2" style={{ color: 'var(--text-muted)' }}>صورة توضيحية للشرح</span>
                          </div>
                        ) : uniqueImages.length > 1 ? (
                          <div className="border rounded-2xl p-4" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-subtle)' }}>
                            <span className="text-xs font-bold block mb-3" style={{ color: 'var(--text-main)' }}>🖼️ معرض الصور التوضيحية ({uniqueImages.length} صور):</span>
                            <div className={`grid gap-3 ${uniqueImages.length === 2 ? 'grid-cols-2' : uniqueImages.length === 3 ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'}`}>
                              {uniqueImages.map((imgUrl, imgIdx) => (
                                <div 
                                  key={imgIdx} 
                                  className="group relative rounded-xl overflow-hidden border cursor-pointer shadow-2xs aspect-4/3 flex items-center justify-center p-1"
                                  style={{ borderColor: 'var(--border-color)', background: 'var(--bg-card)' }}
                                >
                                  <img 
                                    src={imgUrl} 
                                    alt={`صورة توضيحية ${imgIdx + 1}`} 
                                    className="w-full h-full object-contain rounded-lg"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  }

                  if (block.type === 'buttons') {
                    const btns = block.buttons || [];
                    return (
                      <div key={blockIdx} className="pt-2 my-6">
                        <span className="text-xs font-bold block mb-3" style={{ color: 'var(--text-muted)' }}>🔗 روابط ومنصات الشرح المعتمدة:</span>
                        <div className="flex flex-wrap gap-2.5 justify-start" dir="rtl">
                          {btns.map((btn, btnIdx) => {
                            if (!btn.label || !btn.url) return null;
                            return (
                              <a
                                key={btnIdx}
                                href={btn.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-rise inline-flex items-center gap-2 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] active:scale-95 text-white font-bold py-3 px-5 rounded-xl text-xs shadow-md shadow-[var(--color-imamu-brown)/20] transition duration-200 cursor-pointer"
                              >
                                <ExternalLink className="w-4 h-4 shrink-0" /> {btn.label}
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
