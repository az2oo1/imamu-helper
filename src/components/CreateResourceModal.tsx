import React, { useState, useRef, useEffect } from 'react';
import { X, Folder, Link2, Image as ImageIcon, FileText, Check, ArrowRight, ArrowLeft, Search, BookOpen, ChevronDown, Loader2 } from 'lucide-react';
import ImageUploadInput from './ImageUploadInput';
import ResourceLinksInput from './ResourceLinksInput';

interface CreateResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceForm: {
    id?: number;
    subjectId?: number;
    title: string;
    type: string;
    url: string;
    driveLink?: string;
    boxLink?: string;
    whatsappLink?: string;
    freeResourcesUrl?: string;
    paidResourcesUrl?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    description?: string;
  };
  setResourceForm: React.Dispatch<React.SetStateAction<any>>;
  subjects: any[];
  onSave: () => void | Promise<any>;
}

export default function CreateResourceModal({
  isOpen,
  onClose,
  resourceForm,
  setResourceForm,
  subjects,
  onSave
}: CreateResourceModalProps) {
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [courseSearch, setCourseSearch] = useState('');
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside handler to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCourseDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const isEditing = !!resourceForm.id;
  const selectedCourse = subjects.find(s => s.id === resourceForm.subjectId);

  const filteredSubjects = subjects.filter(s => 
    !courseSearch || 
    s.code?.toLowerCase().includes(courseSearch.toLowerCase()) || 
    s.name?.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const handleNext = () => {
    if (activeStep === 1) {
      if (!resourceForm.subjectId && !resourceForm.title?.trim()) {
        alert('Please select a course or enter a resource title');
        return;
      }
    }
    if (activeStep < 4) {
      setActiveStep((s) => (s + 1) as any);
    }
  };

  const handleBack = () => {
    if (activeStep > 1) {
      setActiveStep((s) => (s - 1) as any);
    }
  };

  const canAdvance = !!(resourceForm.subjectId || resourceForm.title?.trim());

  const handleSaveSubmit = async () => {
    if (!canAdvance) {
      alert('الرجاء اختيار المادة الأكاديمية أو إدخال عنوان المصدر');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await onSave();
      if (res !== false) {
        onClose();
      }
    } catch (e) {
      console.error('Error saving resource:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {isEditing ? `Edit Resource: ${resourceForm.title}` : 'Resource Package Wizard (إضافة باقة مصادر جديدة)'}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Multi-step wizard to attach Box, WhatsApp, Free/Paid links, media & overview
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[var(--bg-subtle)] transition"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Wizard Stepper Tabs */}
        <div className="flex border-b px-6 gap-1 bg-[var(--bg-subtle)] text-xs font-semibold overflow-x-auto" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setActiveStep(1)}
            className={`py-3 px-2.5 border-b-2 transition flex items-center gap-1.5 shrink-0 ${activeStep === 1 ? 'border-emerald-500 text-emerald-500 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <span className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px]">1</span>
            <span>Course & Title</span>
          </button>
          <button
            onClick={() => {
              if (canAdvance) setActiveStep(2);
            }}
            className={`py-3 px-2.5 border-b-2 transition flex items-center gap-1.5 shrink-0 ${activeStep === 2 ? 'border-emerald-500 text-emerald-500 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <span className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px]">2</span>
            <span>Box & Groups</span>
          </button>
          <button
            onClick={() => {
              if (canAdvance) setActiveStep(3);
            }}
            className={`py-3 px-2.5 border-b-2 transition flex items-center gap-1.5 shrink-0 ${activeStep === 3 ? 'border-emerald-500 text-emerald-500 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <span className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px]">3</span>
            <span>Free & Paid Links</span>
          </button>
          <button
            onClick={() => {
              if (canAdvance) setActiveStep(4);
            }}
            className={`py-3 px-2.5 border-b-2 transition flex items-center gap-1.5 shrink-0 ${activeStep === 4 ? 'border-emerald-500 text-emerald-500 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            <span className="w-4 h-4 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[10px]">4</span>
            <span>Media & Overview</span>
          </button>
        </div>

        {/* Wizard Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* STEP 1: Course & Title */}
          {activeStep === 1 && (
            <div className="space-y-4 animate-fadeIn">
              {/* Search Engine Style Target Course Picker */}
              <div className="flex flex-col gap-1.5 relative" ref={dropdownRef}>
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Target Course (المادة الأكاديمية - محرك بحث)</label>
                
                {selectedCourse ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3.5 rounded-xl border bg-blue-500/10 border-blue-500/30">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-blue-500 text-white">
                          {selectedCourse.code}
                        </span>
                        <div>
                          <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>{selectedCourse.name}</span>
                          {selectedCourse.level && (
                            <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>المستوى {selectedCourse.level}</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setResourceForm((s: any) => ({ ...s, subjectId: undefined, title: '' }));
                          setCourseSearch('');
                          setIsCourseDropdownOpen(false);
                        }}
                        className="text-xs font-bold text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Change Course</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative flex items-center">
                      <Search className="w-4 h-4 absolute left-3 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search by course code or name... (e.g. CS101, عال101)"
                        value={courseSearch}
                        onFocus={() => setIsCourseDropdownOpen(true)}
                        onChange={e => {
                          setCourseSearch(e.target.value);
                          setIsCourseDropdownOpen(true);
                        }}
                        className="w-full pl-9 pr-8 py-2.5 rounded-xl text-sm border outline-none transition focus:border-blue-500"
                        style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                      />
                      {isCourseDropdownOpen && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsCourseDropdownOpen(false);
                            setCourseSearch('');
                          }}
                          className="absolute right-2.5 p-1 rounded-lg hover:bg-[var(--bg-subtle)] text-slate-400 hover:text-slate-200 transition"
                          title="Close list"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    {isCourseDropdownOpen && (
                      <div 
                        className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto rounded-xl border shadow-xl z-50 divide-y animate-fadeIn"
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
                      >
                        {filteredSubjects.length > 0 ? (
                          filteredSubjects.map(subj => (
                            <button
                              key={subj.id}
                              type="button"
                              onClick={() => {
                                const defaultTitle = `مصادر مادة ${subj.code} - ${subj.name}`;
                                setResourceForm((s: any) => ({ 
                                  ...s, 
                                  subjectId: subj.id,
                                  title: defaultTitle 
                                }));
                                setIsCourseDropdownOpen(false);
                                setCourseSearch('');
                              }}
                              className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-[var(--bg-subtle)] transition"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  {subj.code}
                                </span>
                                <span className="text-sm font-medium" style={{ color: 'var(--text-main)' }}>{subj.name}</span>
                              </div>
                              {subj.level && (
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Level {subj.level}</span>
                              )}
                            </button>
                          ))
                        ) : (
                          <div className="py-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                            No courses match "{courseSearch}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Show Resource Package Title Input ONLY IF NO COURSE IS SELECTED */}
              {!selectedCourse && (
                <div className="flex flex-col gap-1 animate-fadeIn">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    Resource Package Title (عنوان باقة المصدر) *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. باقة مصادر عامة / تجميعات تخصص"
                    value={resourceForm.title || ''}
                    onChange={e => setResourceForm((s: any) => ({ ...s, title: e.target.value }))}
                    className="w-full py-2.5 px-3 rounded-xl text-sm border outline-none"
                    style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Storage & Group Links */}
          {activeStep === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Box Storage Link (مجلد Box / Cloud Storage)</label>
                <input
                  type="text"
                  placeholder="https://app.box.com/s/..."
                  value={resourceForm.boxLink || ''}
                  onChange={e => setResourceForm((s: any) => ({ ...s, boxLink: e.target.value }))}
                  className="w-full py-2.5 px-3 rounded-xl text-sm border outline-none font-mono"
                  style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>WhatsApp Group Link (رابط جروب الواتساب)</label>
                <input
                  type="text"
                  placeholder="https://chat.whatsapp.com/..."
                  value={resourceForm.whatsappLink || ''}
                  onChange={e => setResourceForm((s: any) => ({ ...s, whatsappLink: e.target.value }))}
                  className="w-full py-2.5 px-3 rounded-xl text-sm border outline-none font-mono"
                  style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>
            </div>
          )}

          {/* STEP 3: Free & Paid Links */}
          {activeStep === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <ResourceLinksInput 
                label="Free Resource Links List (المصادر المجانية - متعدد)" 
                value={resourceForm.freeResourcesUrl || ''} 
                onChange={val => setResourceForm((s: any) => ({ ...s, freeResourcesUrl: val }))} 
              />

              <ResourceLinksInput 
                label="Paid Resource Links List (المصادر المدفوعة - متعدد)" 
                value={resourceForm.paidResourcesUrl || ''} 
                onChange={val => setResourceForm((s: any) => ({ ...s, paidResourcesUrl: val }))} 
                color="amber" 
              />
            </div>
          )}

          {/* STEP 4: Media & Overview */}
          {activeStep === 4 && (
            <div className="space-y-4 animate-fadeIn">
              <ImageUploadInput 
                label="Resource Icon / Avatar Image (صورة المصدر / اللوجو)" 
                value={resourceForm.avatarUrl || ''} 
                onChange={val => setResourceForm((s: any) => ({ ...s, avatarUrl: val }))} 
                type="avatar" 
              />

              <ImageUploadInput 
                label="Resource Banner Image (صورة البانر والغلاف)" 
                value={resourceForm.bannerUrl || ''} 
                onChange={val => setResourceForm((s: any) => ({ ...s, bannerUrl: val }))} 
                type="banner" 
              />

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Resource Package Overview & Description (الوصف والملخص الشامل)</label>
                <textarea
                  rows={5}
                  placeholder="Comprehensive overview, syllabus summary, notes, and topics covered in this resource package..."
                  value={resourceForm.description || ''}
                  onChange={e => setResourceForm((s: any) => ({ ...s, description: e.target.value }))}
                  className="w-full py-2.5 px-3 rounded-xl text-sm border outline-none resize-none"
                  style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3 bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold text-emerald-500">Step {activeStep} of 4</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-[var(--bg-card)] transition"
              style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            {activeStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-[var(--bg-card)] transition"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
              >
                Back
              </button>
            )}
            {activeStep < 4 && (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-[var(--bg-card)] transition"
                style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
              >
                <span>Next Step</span>
              </button>
            )}
            <button
              type="button"
              disabled={isSubmitting || !canAdvance}
              onClick={handleSaveSubmit}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-md ${
                canAdvance 
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer' 
                  : 'bg-emerald-600/40 text-white/50 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>{isSubmitting ? 'جاري الحفظ...' : (isEditing ? 'Save Changes' : 'Create Resource')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
