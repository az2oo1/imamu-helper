import React, { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { 
  Plus, Trash2, Edit, ChevronUp, ChevronDown, 
  HelpCircle, X, ExternalLink, PlusCircle, ArrowRight,
  Sparkles, FileText, Image, Video, Link, ArrowLeft, Upload, CheckSquare,
  Compass
} from 'lucide-react';

interface Section {
  id: number;
  title: string;
  icon: string;
  color: string;
}

interface Tutorial {
  id: number;
  sectionId: number;
  title: string;
  description: string;
  text: string;
  steps: string[];
  videoUrl?: string;
  imageUrl?: string;
  linkUrl?: string;
  linkTitle?: string;
}

interface Block {
  type: 'text' | 'steps' | 'list' | 'table' | 'media' | 'buttons';
  content?: string;
  stepsItems?: string[];
  listItems?: string[];
  listType?: 'ordered' | 'unordered';
  tableHeaders?: string[];
  tableRows?: string[][];
  mediaType?: 'image' | 'video';
  mediaUrl?: string;
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
  const [secColor, setSecColor] = useState('text-blue-400 bg-blue-950/40 border-blue-900/50');
  const [iconSearchQuery, setIconSearchQuery] = useState('');

  // Tutorial form states
  const [tutTitle, setTutTitle] = useState('');
  const [tutDescription, setTutDescription] = useState('');
  const [tutSectionId, setTutSectionId] = useState<number | ''>('');
  const [tutLinkUrl, setTutLinkUrl] = useState('');
  const [tutLinkTitle, setTutLinkTitle] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'edit' | 'preview'>('edit');
  const [uploadingBlockIdx, setUploadingBlockIdx] = useState<number | null>(null);

  // Section presets for easy selection
  const colorOptions = [
    { name: 'blue', label: 'أزرق', value: 'text-blue-400 bg-blue-950/40 border border-blue-900/50' },
    { name: 'amber', label: 'ذهبي', value: 'text-amber-400 bg-amber-950/40 border border-amber-900/50' },
    { name: 'emerald', label: 'أخضر', value: 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/50' },
    { name: 'purple', label: 'بنفسجي', value: 'text-purple-400 bg-purple-950/40 border border-purple-900/50' }
  ];

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
    setSecColor('text-blue-400 bg-blue-950/40 border border-blue-900/50');
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
    setTutSectionId(tut.sectionId);
    setTutLinkUrl(tut.linkUrl || '');
    setTutLinkTitle(tut.linkTitle || '');

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
    setBlocks([{ type: 'text', content: '' }]);
    setActiveSubTab('edit');
  };

  // Block management helpers
  const addBlock = (type: Block['type']) => {
    let newBlock: Block;
    if (type === 'text') newBlock = { type: 'text', content: '' };
    else if (type === 'steps') newBlock = { type: 'steps', stepsItems: [''] };
    else if (type === 'list') newBlock = { type: 'list', listItems: [''], listType: 'unordered' };
    else if (type === 'table') newBlock = { type: 'table', tableHeaders: ['العنوان ١', 'العنوان ٢'], tableRows: [['', '']] };
    else if (type === 'media') newBlock = { type: 'media', mediaType: 'image', mediaUrl: '' };
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

    const payload = {
      sectionId: Number(tutSectionId),
      title: tutTitle.trim(),
      description: tutDescription.trim(),
      text: JSON.stringify(blocks),
      steps: extractedSteps,
      linkUrl: tutLinkUrl.trim() || null,
      linkTitle: tutLinkTitle.trim() || null,
      videoUrl: null,
      imageUrl: null
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <h3 className="text-xl font-display font-bold text-zinc-100 mb-1">إدارة شروحات الدليلة</h3>
            <p className="text-xs text-zinc-400">إضافة وتعديل الأقسام ومكونات الشروحات التوضيحية للطلاب.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSectionForm(true)}
              className="bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> إضافة تصنيف جديد
            </button>
            <button
              onClick={startNewTutorial}
              className="bg-[var(--color-imamu-blue)] text-white hover:bg-[var(--color-imamu-blue-light)] px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" /> إضافة شرح جديد
            </button>
          </div>
        </div>

        {/* Modern Modal backdrop */}
        {showSectionForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-in fade-in duration-200">
            {/* Modal Box */}
            <form 
              onSubmit={handleSaveSection}
              className="bg-zinc-900 border border-zinc-800/40 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 text-right" 
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-zinc-800/30 flex items-center justify-between bg-zinc-950/40">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                  <h3 className="text-base font-bold text-zinc-100">
                    {editingSection ? 'تعديل التصنيف' : 'إضافة تصنيف جديد'}
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={resetSectionForm}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* 1. Live Preview - Single Centered Catalog Card */}
                <div className="bg-zinc-950/20 p-5 rounded-2xl flex flex-col items-center justify-center space-y-3">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">معاينة التصنيف في الدليل</span>
                  <div className="w-full max-w-sm bg-zinc-900/40 border border-zinc-800/30 rounded-xl p-4 flex items-start gap-3 text-right">
                    <div className={`p-2 rounded-md shrink-0 border ${secColor.split(' ').slice(1).join(' ')}`}>
                      <span className={secColor.split(' ')[0]}>
                        {React.createElement((Icons as any)[secIcon] || HelpCircle, { className: "w-5 h-5" })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 pr-1 text-right">
                      <h3 className="text-xs font-bold text-zinc-100 truncate">
                        {secTitle || 'اسم التصنيف الجديد'}
                      </h3>
                      <p className="text-[10px] text-zinc-400 mt-0.5">
                        هنا ستظهر الشروحات الأكاديمية التابعة له...
                      </p>
                    </div>
                  </div>
                </div>

                {/* 2. Category Title Input */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-zinc-350 font-bold">اسم التصنيف:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: الخدمات الأكاديمية، المكافآت..."
                    value={secTitle}
                    onChange={e => setSecTitle(e.target.value)}
                    className="bg-zinc-950 border border-zinc-800/40 focus:border-zinc-700/50 text-zinc-100 rounded-xl py-3 px-4 outline-none text-xs transition animate-none"
                  />
                </div>

                {/* 3. Color Slider */}
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-zinc-350 font-bold">لون التصنيف:</label>
                    <span className="text-[10px] text-zinc-400 font-bold">
                      {colorOptions.find(o => o.value === secColor)?.label || 'أزرق'}
                    </span>
                  </div>
                  <div className="relative flex items-center bg-zinc-950 p-4 rounded-2xl border border-zinc-800/30">
                    <input
                      type="range"
                      min="0"
                      max="3"
                      step="1"
                      value={Math.max(0, colorOptions.findIndex(o => o.value === secColor))}
                      onChange={(e) => {
                        const idx = parseInt(e.target.value, 10);
                        setSecColor(colorOptions[idx].value);
                      }}
                      className="w-full h-1.5 bg-gradient-to-r from-blue-500 via-amber-500 via-emerald-500 to-purple-500 rounded-lg appearance-none cursor-pointer outline-none accent-zinc-200"
                    />
                  </div>
                </div>

                {/* 3. Icon Search Engine */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-zinc-350 font-bold">أيقونة التصنيف:</label>
                    <span className="text-[10px] text-zinc-550 font-medium">اختر أيقونة معبرة من محرك البحث</span>
                  </div>
                  
                  {/* Search Input field */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="ابحث عن أيقونة... (مثال: book, cap, phone, card)"
                      value={iconSearchQuery}
                      onChange={e => setIconSearchQuery(e.target.value)}
                      className="w-full pr-4 pl-10 py-2.5 bg-zinc-950 border border-zinc-800/40 focus:border-zinc-700/50 text-zinc-150 rounded-xl outline-none text-xs transition"
                    />
                    <Icons.Search className="absolute left-3.5 top-3 w-4 h-4 text-zinc-500" />
                    {iconSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setIconSearchQuery('')}
                        className="absolute left-10 top-3 text-zinc-500 hover:text-zinc-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Icons Grid with Pagination/Limit */}
                  <div className="grid grid-cols-6 sm:grid-cols-8 gap-2.5 max-h-48 overflow-y-auto p-3.5 bg-zinc-950 rounded-2xl border border-zinc-800/20">
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
                              ? 'bg-blue-600/10 border border-blue-500/50 text-blue-400 scale-105 shadow-inner' 
                              : 'bg-zinc-900/40 border border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                          }`}
                          title={icoName}
                        >
                          <IconComponent className="w-4.5 h-4.5" />
                        </button>
                      );
                    })}
                    {filteredIcons.length === 0 && (
                      <div className="col-span-full py-8 text-center text-xs text-zinc-500 italic">
                        لا توجد أيقونات تطابق البحث
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="p-5 border-t border-zinc-800/30 flex justify-end gap-3 bg-zinc-950/40">
                <button
                  type="button"
                  onClick={resetSectionForm}
                  className="px-5 py-2.5 bg-zinc-900 border border-zinc-800/50 text-zinc-300 rounded-xl hover:bg-zinc-800 text-xs font-bold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={!secTitle.trim()}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none text-white rounded-xl text-xs font-bold transition shadow-md"
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
            <h4 className="font-bold text-sm text-zinc-200 pr-1">قائمة التصنيفات ({sections.length})</h4>
            <div className="divide-y divide-zinc-800/50 border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/10">
              {sections.map(sec => (
                <div key={sec.id} className="p-4 flex items-center justify-between group hover:bg-zinc-900/30 transition">
                  <div className="flex items-center gap-3">
                    <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center shrink-0 border ${sec.color.split(' ').slice(1).join(' ')}`}>
                      <span className={sec.color.split(' ')[0]}>{getDynamicIcon(sec.icon)}</span>
                    </div>
                    <div>
                      <div className="font-bold text-zinc-200 text-xs">{sec.title}</div>
                      <div className="text-[10px] text-zinc-500 font-semibold">{tutorials.filter(t => t.sectionId === sec.id).length} شروحات</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition">
                    <button
                      onClick={() => startEditSection(sec)}
                      className="p-1 hover:text-blue-400 hover:bg-zinc-950/40 rounded border border-transparent hover:border-zinc-800"
                    >
                      <Edit className="w-3.5 h-3.5 text-zinc-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteSection(sec.id)}
                      className="p-1 hover:text-red-400 hover:bg-zinc-955/40 rounded border border-transparent hover:border-zinc-800"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                  </div>
                </div>
              ))}
              {sections.length === 0 && (
                <div className="p-8 text-center text-xs text-zinc-500 italic">لا توجد تصنيفات بعد.</div>
              )}
            </div>
          </div>

          {/* Tutorials List main panel */}
          <div className="lg:col-span-2 space-y-6">
            <h4 className="font-bold text-sm text-zinc-200 pr-1">قائمة الشروحات المتوفرة ({tutorials.length})</h4>
            <div className="space-y-4">
              {sections.map(sec => {
                const secTuts = tutorials.filter(t => t.sectionId === sec.id);
                if (secTuts.length === 0) return null;

                return (
                  <div key={sec.id} className="space-y-2.5">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 flex items-center gap-1.5 pr-1">
                      <span className={sec.color.split(' ')[0]}>{getDynamicIcon(sec.icon)}</span>
                      <span>{sec.title}</span>
                    </div>
                    
                    <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-2xl bg-zinc-900/10 overflow-hidden">
                      {secTuts.map(tut => (
                        <div key={tut.id} className="p-4 flex items-center justify-between hover:bg-zinc-900/20 transition gap-4">
                          <div className="flex-1 min-w-0">
                            <h5 className="font-bold text-xs text-zinc-100 truncate">{tut.title}</h5>
                            <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1">{tut.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEditTutorial(tut)}
                              className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-zinc-300 hover:bg-zinc-900 hover:text-white rounded-lg text-[10px] font-bold transition"
                            >
                              تعديل الشرح
                            </button>
                            <button
                              onClick={() => handleDeleteTutorial(tut.id)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded-lg border border-transparent hover:border-red-900/35 transition"
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

              {tutorials.length === 0 && (
                <div className="py-20 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500 italic text-xs">
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
      <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingTutorial(null);
              setIsCreating(false);
            }}
            className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 flex items-center justify-center text-zinc-400 hover:text-zinc-150 transition"
          >
            <ArrowRight className="w-4.5 h-4.5" />
          </button>
          <div>
            <h3 className="text-lg font-display font-bold text-zinc-150">
              {isCreating ? 'إضافة شرح جديد' : 'تعديل الشرح'}
            </h3>
            <p className="text-[10px] text-zinc-500 font-semibold">{tutTitle || 'مخطط شرح الدليلة'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub Tab switcher */}
          <div className="bg-zinc-950 border border-zinc-800/80 p-1 rounded-xl flex gap-1">
            <button
              onClick={() => setActiveSubTab('edit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubTab === 'edit' ? 'bg-zinc-850 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              التحرير (Editor)
            </button>
            <button
              onClick={() => setActiveSubTab('preview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeSubTab === 'preview' ? 'bg-zinc-850 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'}`}
            >
              المعاينة الحية (Live Preview)
            </button>
          </div>

          <button
            onClick={handleSaveTutorial}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-md"
          >
            حفظ الشرح
          </button>
        </div>
      </div>

      {activeSubTab === 'edit' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left panel: Info & Meta Fields */}
          <div className="space-y-6">
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <h4 className="font-bold text-xs text-zinc-300 border-b border-zinc-850 pb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                بيانات الشرح الأساسية
              </h4>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-zinc-450 font-bold">العنوان:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: كيفية حذف وإضافة مادة"
                  value={tutTitle}
                  onChange={e => setTutTitle(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl py-2 px-3 outline-none text-xs text-right font-medium"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-zinc-455 font-bold">وصف الشرح مختصر:</label>
                <textarea
                  required
                  placeholder="اكتب وصفاً موجزاً يظهر للطلاب في قائمة الشروحات..."
                  value={tutDescription}
                  onChange={e => setTutDescription(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-150 rounded-xl py-2 px-3 outline-none text-xs text-right font-normal resize-none h-20"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-zinc-455 font-bold">التصنيف / القسم:</label>
                <select
                  value={tutSectionId}
                  onChange={e => setTutSectionId(Number(e.target.value))}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-xl py-2 px-3 outline-none text-xs font-semibold"
                >
                  <option value="" disabled>اختر التصنيف المناسب</option>
                  {sections.map(sec => (
                    <option key={sec.id} value={sec.id}>{sec.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* External Links Info */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 space-y-4">
              <h4 className="font-bold text-xs text-zinc-300 border-b border-zinc-850 pb-2 flex items-center gap-1.5">
                <Link className="w-4 h-4 text-blue-400" />
                زر رابط خارجي اختياري (Call to Action)
              </h4>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-zinc-450 font-bold">رابط التوجيه المباشر:</label>
                <input
                  type="text"
                  placeholder="https://selfservice.imamu.edu..."
                  value={tutLinkUrl}
                  onChange={e => setTutLinkUrl(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-150 rounded-xl py-2 px-3 outline-none text-xs text-left"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] text-zinc-450 font-bold">عنوان الزر:</label>
                <input
                  type="text"
                  placeholder="مثال: الانتقال للخدمة الذاتية 🔗"
                  value={tutLinkTitle}
                  onChange={e => setTutLinkTitle(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-100 rounded-xl py-2 px-3 outline-none text-xs"
                />
              </div>
            </div>
          </div>

          {/* Right panel: Structured Block-based Canvas Editor */}
          <div className="md:col-span-2 space-y-6">
            {/* Block Toolbar Add buttons */}
            <div className="bg-zinc-950 border border-zinc-800/80 p-4 rounded-2xl flex flex-wrap gap-2 items-center justify-between shadow-sm">
              <span className="text-xs text-zinc-400 font-bold">إضافة مكونات إلى الشرح:</span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => addBlock('text')}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-250 text-xs rounded-xl transition flex items-center gap-1 font-bold"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" /> نص فقرة
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('steps')}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-250 text-xs rounded-xl transition flex items-center gap-1 font-bold"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-amber-400" /> خطوات
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('list')}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-250 text-xs rounded-xl transition flex items-center gap-1 font-bold"
                >
                  <Compass className="w-3.5 h-3.5 text-purple-400" /> قائمة
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('table')}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-250 text-xs rounded-xl transition flex items-center gap-1 font-bold"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-400" /> جدول
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('media')}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-250 text-xs rounded-xl transition flex items-center gap-1 font-bold"
                >
                  <Image className="w-3.5 h-3.5 text-rose-400" /> صورة / فيديو
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('buttons')}
                  className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-250 text-xs rounded-xl transition flex items-center gap-1 font-bold"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-indigo-400" /> أزرار روابط
                </button>
              </div>
            </div>

            {/* Block Canvas Card List */}
            <div className="space-y-4">
              {blocks.map((block, blockIdx) => (
                <div 
                  key={blockIdx}
                  className="bg-zinc-900/40 border border-zinc-800/90 rounded-2xl overflow-hidden shadow-inner flex flex-col transition hover:border-zinc-750 duration-200"
                >
                  {/* Block Header */}
                  <div className="bg-zinc-950/60 border-b border-zinc-850 px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500 font-mono text-xs font-semibold">#{blockIdx + 1}</span>
                      <span className="text-xs font-bold text-zinc-350 flex items-center gap-1.5">
                        {block.type === 'text' && <><FileText className="w-4 h-4 text-blue-400" /> نص توضيحي</>}
                        {block.type === 'steps' && <><CheckSquare className="w-4 h-4 text-amber-400" /> خطوات الشرح التوضيحي</>}
                        {block.type === 'list' && <><Compass className="w-4 h-4 text-purple-400" /> عناصر القائمة النقطية</>}
                        {block.type === 'table' && <><PlusCircle className="w-4 h-4 text-emerald-400" /> جدول بيانات</>}
                        {block.type === 'media' && <><Image className="w-4 h-4 text-rose-400" /> وسائط (صورة أو فيديو)</>}
                        {block.type === 'buttons' && <><ExternalLink className="w-4 h-4 text-indigo-400" /> أزرار توجيه للطلاب</>}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Reorder Buttons */}
                      <button
                        type="button"
                        onClick={() => moveBlock(blockIdx, 'up')}
                        disabled={blockIdx === 0}
                        className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded disabled:opacity-30 transition"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveBlock(blockIdx, 'down')}
                        disabled={blockIdx === blocks.length - 1}
                        className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 rounded disabled:opacity-30 transition"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      <span className="w-px h-4 bg-zinc-800 mx-1.5" />
                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => deleteBlock(blockIdx)}
                        className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-950/20 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Block Editor Content */}
                  <div className="p-4 bg-zinc-900/10">
                    {/* TEXT BLOCK */}
                    {block.type === 'text' && (
                      <textarea
                        className="w-full text-xs sm:text-sm bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-lg p-3 outline-none text-right font-normal resize-none focus:ring-1 focus:ring-zinc-700"
                        rows={4}
                        placeholder="اكتب محتوى الفقرة هنا..."
                        value={block.content || ''}
                        onChange={(e) => updateBlock(blockIdx, { content: e.target.value })}
                      />
                    )}

                    {/* STEPS BLOCK */}
                    {block.type === 'steps' && (
                      <div className="space-y-3">
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                          {(block.stepsItems || []).map((step, sIdx) => (
                            <div key={sIdx} className="flex gap-2 items-start">
                              <span className="text-zinc-500 text-xs font-bold pt-2.5 shrink-0">{sIdx + 1}.</span>
                              <textarea
                                className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2.5 text-right outline-none resize-none focus:ring-1 focus:ring-zinc-750"
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
                                className="text-zinc-500 hover:text-red-450 p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl hover:bg-zinc-900 shrink-0 mt-1"
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
                          className="text-[11px] bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-bold px-3 py-2 rounded-xl transition"
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
                          <label className="text-xs text-zinc-400">نوع القائمة:</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className={`px-3 py-1.5 text-xs rounded-xl font-bold border transition ${block.listType === 'ordered' ? 'bg-blue-900 border-blue-800 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}
                              onClick={() => updateBlock(blockIdx, { listType: 'ordered' })}
                            >
                              قائمة مرقمة (1, 2, 3)
                            </button>
                            <button
                              type="button"
                              className={`px-3 py-1.5 text-xs rounded-xl font-bold border transition ${block.listType === 'unordered' ? 'bg-blue-900 border-blue-800 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}
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
                                className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2 px-3 text-right focus:ring-1 focus:ring-zinc-750"
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
                                className="text-zinc-500 hover:text-red-450 p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl hover:bg-zinc-900 shrink-0"
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
                          className="text-[11px] bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-bold px-3 py-2 rounded-xl transition"
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
                          <label className="text-xs text-zinc-400">عدد الأعمدة في الجدول:</label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 flex items-center justify-center hover:bg-zinc-900 font-bold"
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
                            <span className="text-sm font-bold text-zinc-100">{block.tableHeaders?.length || 0}</span>
                            <button
                              type="button"
                              className="w-8 h-8 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 flex items-center justify-center hover:bg-zinc-900 font-bold"
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
                        <div className="grid gap-2 border border-zinc-850 p-2.5 rounded-xl bg-zinc-950/40" style={{ gridTemplateColumns: `repeat(${block.tableHeaders?.length || 1}, minmax(0, 1fr))` }}>
                          {(block.tableHeaders || []).map((header, hIdx) => (
                            <input
                              key={hIdx}
                              type="text"
                              className="bg-zinc-950 border border-zinc-800 text-zinc-150 text-xs rounded-lg p-2 text-right font-bold focus:ring-1 focus:ring-zinc-700"
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
                                    className="bg-zinc-950 border border-zinc-850 text-zinc-200 text-xs rounded-lg p-2 text-right focus:ring-1 focus:ring-zinc-700"
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
                                className="text-zinc-500 hover:text-red-450 p-2 bg-zinc-950 border border-zinc-800 rounded-xl hover:bg-zinc-900 shrink-0"
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
                          className="text-[11px] bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-bold px-3 py-2 rounded-xl transition"
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
                    {block.type === 'media' && (
                      <div className="space-y-3 text-right">
                        <div className="flex gap-4 items-center">
                          <label className="text-xs text-zinc-400">نوع الوسائط:</label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className={`px-3 py-1.5 text-xs rounded-xl font-bold border transition ${block.mediaType === 'image' ? 'bg-blue-900 border-blue-800 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}
                              onClick={() => updateBlock(blockIdx, { mediaType: 'image' })}
                            >
                              صورة توضيحية
                            </button>
                            <button
                              type="button"
                              className={`px-3 py-1.5 text-xs rounded-xl font-bold border transition ${block.mediaType === 'video' ? 'bg-blue-900 border-blue-800 text-white' : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:bg-zinc-900'}`}
                              onClick={() => updateBlock(blockIdx, { mediaType: 'video' })}
                            >
                              مقطع مرئي (فيديو)
                            </button>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-[11px] text-zinc-450 font-bold">رابط الملف أو رابط التضمين المباشر:</label>
                          <input
                            type="text"
                            className="bg-zinc-950 border border-zinc-800 text-zinc-150 text-xs rounded-xl py-2 px-3 text-left outline-none focus:ring-1 focus:ring-zinc-700"
                            value={block.mediaUrl || ''}
                            placeholder={block.mediaType === 'video' ? "أدخل رابط فيديو YouTube Embed أو رابط MP4 مباشر..." : "أدخل رابط الصورة التوضيحية المباشر..."}
                            onChange={(e) => updateBlock(blockIdx, { mediaUrl: e.target.value })}
                          />
                        </div>

                        <div className="flex items-center gap-3 pt-1">
                          <label className="cursor-pointer bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-200 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition">
                            <Upload className="w-3.5 h-3.5 text-zinc-400" />
                            {uploadingBlockIdx === blockIdx ? "جاري الرفع..." : "اختر ملفاً لرفعه للخادم"}
                            <input
                              type="file"
                              className="hidden"
                              accept={block.mediaType === 'video' ? 'video/*' : 'image/*'}
                              disabled={uploadingBlockIdx !== null}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadingBlockIdx(blockIdx);
                                const formData = new FormData();
                                formData.append('files', file);

                                try {
                                  const token = await user?.getIdToken();
                                  const res = await fetch('/api/admin/upload', {
                                    method: 'POST',
                                    headers: { Authorization: `Bearer ${token}` },
                                    body: formData
                                  }).then(r => r.json());

                                  if (res.success && res.urls && res.urls.length > 0) {
                                    updateBlock(blockIdx, { mediaUrl: res.urls[0] });
                                  } else {
                                    alert("فشل رفع الملف. الرجاء التأكد من الحجم (الحد الأقصى 50 ميجا).");
                                  }
                                } catch (err) {
                                  console.error(err);
                                  alert("خطأ أثناء الاتصال بالخادم لرفع الملف.");
                                } finally {
                                  setUploadingBlockIdx(null);
                                }
                              }}
                            />
                          </label>
                          <span className="text-[10px] text-zinc-500 font-semibold">يدعم الصيغ القياسية للصور والفيديوهات</span>
                        </div>
                      </div>
                    )}

                    {/* BUTTONS BLOCK */}
                    {block.type === 'buttons' && (
                      <div className="space-y-3">
                        <div className="space-y-2.5">
                          {(block.buttons || []).map((btn, btnIdx) => (
                            <div key={btnIdx} className="flex gap-2 items-center bg-zinc-950 border border-zinc-850 p-3.5 rounded-2xl">
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
                                <div className="flex flex-col gap-1">
                                  <label className="text-[10px] text-zinc-500 font-bold">اسم الزر (Label):</label>
                                  <input
                                    type="text"
                                    className="bg-zinc-900 border border-zinc-800 text-zinc-150 text-xs rounded-xl p-2 px-3 focus:ring-1 focus:ring-zinc-700"
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
                                  <label className="text-[10px] text-zinc-500 font-bold">رابط التوجيه (URL):</label>
                                  <input
                                    type="text"
                                    className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-xl p-2 px-3 text-left focus:ring-1 focus:ring-zinc-700"
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
                                className="text-zinc-550 hover:text-red-400 p-2.5 bg-zinc-900 border border-zinc-800 rounded-xl hover:bg-zinc-850 mt-4 shrink-0"
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
                          className="text-[11px] bg-zinc-950 border border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-bold px-3 py-2 rounded-xl transition"
                          onClick={() => {
                            const newBtns = [...(block.buttons || []), { label: '', url: '' }];
                            updateBlock(blockIdx, { buttons: newBtns });
                          }}
                        >
                          + إضافة زر جديد
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {blocks.length === 0 && (
                <div className="py-20 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500 italic text-xs">
                  لا توجد مكونات في الشرح حتى الآن. الرجاء اختيار نوع المكون المراد إضافته من الأعلى.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Real-time split/full Preview */
        <div className="w-full max-w-4xl mx-auto space-y-6">
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
            {/* Header section preview */}
            <div className="mb-6">
              {(() => {
                const section = sections.find(s => s.id === Number(tutSectionId));
                return (
                  <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider mb-4 inline-block ${section ? section.color : 'text-zinc-350 bg-zinc-900 border border-zinc-800'}`}>
                    {section?.title || 'التصنيف المختير'}
                  </span>
                );
              })()}
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 mb-3">{tutTitle || 'عنوان الشرح التجريبي'}</h1>
              <p className="text-zinc-350 text-xs leading-relaxed mb-6 font-normal">{tutDescription || 'هذا الجزء مخصص لعرض نبذة قصيرة ومختصرة عن محتويات الشرح الأكاديمي...'}</p>
              
              <div className="h-px bg-zinc-800 w-full mb-6" />

              {/* Body Content rendering preview */}
              <div className="space-y-5 text-right font-normal text-xs sm:text-sm text-zinc-200" dir="rtl">
                {blocks.map((block, blockIdx) => {
                  if (block.type === 'text') {
                    return (
                      <p key={blockIdx} className="text-zinc-200 text-xs sm:text-sm leading-relaxed mb-3 whitespace-pre-line">
                        {block.content || '... نص الفقرة فارغ حالياً ...'}
                      </p>
                    );
                  }
                  
                  if (block.type === 'steps') {
                    const stepsItems = block.stepsItems || [];
                    return (
                      <div key={blockIdx} className="relative border-r-2 border-zinc-800 mr-3 pr-6 space-y-6 my-6 text-right">
                        {stepsItems.map((step, sIdx) => (
                          <div key={sIdx} className="relative flex flex-col gap-1">
                            <span className="absolute -right-[35px] top-0.5 flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-blue-950/40 border border-blue-900/50 text-blue-400 text-[10px] font-bold shadow-sm z-10">
                              {sIdx + 1}
                            </span>
                            <p className="text-xs sm:text-sm text-zinc-200 font-normal leading-relaxed pt-0.5">{step || 'محتوى الخطوة فارغ...'}</p>
                          </div>
                        ))}
                      </div>
                    );
                  }

                  if (block.type === 'list') {
                    const items = block.listItems || [];
                    if (block.listType === 'ordered') {
                      return (
                        <ol key={blockIdx} className="list-decimal list-inside space-y-1.5 my-3 pr-2 text-zinc-300 text-xs sm:text-sm">
                          {items.map((it, idx) => <li key={idx}>{it || 'عنصر فارغ...'}</li>)}
                        </ol>
                      );
                    } else {
                      return (
                        <ul key={blockIdx} className="list-disc list-inside space-y-1.5 my-3 pr-2 text-zinc-300 text-xs sm:text-sm">
                          {items.map((it, idx) => <li key={idx}>{it || 'عنصر فارغ...'}</li>)}
                        </ul>
                      );
                    }
                  }

                  if (block.type === 'table') {
                    const headers = block.tableHeaders || [];
                    const rows = block.tableRows || [];
                    return (
                      <div key={blockIdx} className="overflow-x-auto my-4 border border-zinc-800 rounded-2xl">
                        <table className="w-full text-right border-collapse text-xs">
                          <thead className="bg-zinc-950 border-b border-zinc-800 font-bold text-zinc-100">
                            <tr>
                              {headers.map((h, idx) => (
                                <th key={idx} className="p-3.5 text-right font-bold">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800 text-zinc-300">
                            {rows.map((row, rowIdx) => (
                              <tr key={rowIdx} className="hover:bg-zinc-900/50 transition">
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
                    if (!block.mediaUrl) {
                      return (
                        <div key={blockIdx} className="w-full max-w-xl aspect-video rounded-2xl border border-dashed border-zinc-800 flex items-center justify-center text-zinc-550 my-4 mx-auto text-xs italic bg-zinc-950/20">
                          لم يتم تحديد ملف وسائط بعد
                        </div>
                      );
                    }
                    if (block.mediaType === 'video') {
                      return (
                        <div key={blockIdx} className="w-full max-w-xl aspect-video rounded-2xl border border-zinc-800 shadow-sm overflow-hidden bg-zinc-950 relative flex items-center justify-center my-4 mx-auto">
                          <iframe 
                            src={block.mediaUrl} 
                            title="Walkthrough Video"
                            className="w-full h-full border-0"
                            allowFullScreen
                          />
                        </div>
                      );
                    } else {
                      return (
                        <a key={blockIdx} href={block.mediaUrl} target="_blank" rel="noreferrer" className="w-full max-w-xl aspect-video rounded-2xl border border-zinc-800 shadow-sm overflow-hidden bg-zinc-900 block relative hover:opacity-90 transition my-4 mx-auto">
                          <img 
                            src={block.mediaUrl} 
                            alt="Screenshot" 
                            className="w-full h-full object-cover"
                          />
                        </a>
                      );
                    }
                  }

                  if (block.type === 'buttons') {
                    const btns = block.buttons || [];
                    return (
                      <div key={blockIdx} className="flex flex-wrap gap-3 my-6 justify-center" dir="rtl">
                        {btns.map((btn, btnIdx) => {
                          if (!btn.label || !btn.url) return null;
                          return (
                            <a
                              key={btnIdx}
                              href={btn.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4.5 rounded-md text-xs transition shadow-sm w-full sm:w-auto justify-center"
                            >
                              <ExternalLink className="w-4 h-4 shrink-0" /> {btn.label}
                            </a>
                          );
                        })}
                      </div>
                    );
                  }

                  return null;
                })}
              </div>

              {/* Action Link button preview */}
              {tutLinkUrl && (
                <div className="mt-8 mb-2 text-right border-t border-zinc-850 pt-6">
                  <a 
                    href={tutLinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4.5 rounded-md text-xs transition shadow-sm w-full sm:w-auto justify-center"
                  >
                    <ExternalLink className="w-4 h-4 shrink-0" /> {tutLinkTitle || 'الانتقال للرابط المذكور'}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
