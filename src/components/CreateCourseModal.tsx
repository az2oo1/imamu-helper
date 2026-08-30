import React from 'react';
import { X, BookOpen, Check } from 'lucide-react';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectForm: {
    id?: number;
    code: string;
    name: string;
    creditHours: string;
    level: string;
    whatsappLink: string;
    driveLink: string;
    description: string;
    syllabus: string;
    freeResourcesUrl: string;
    paidResourcesUrl: string;
    avatarUrl: string;
    bannerUrl: string;
    tags: string;
  };
  setSubjectForm: React.Dispatch<React.SetStateAction<any>>;
  onSave: () => void;
}

export default function CreateCourseModal({
  isOpen,
  onClose,
  subjectForm,
  setSubjectForm,
  onSave
}: CreateCourseModalProps) {
  if (!isOpen) return null;

  const isEditing = !!subjectForm.id;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {isEditing ? `Edit Course: ${subjectForm.code}` : 'Create New Course (إضافة مقرر جديد)'}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Basic course metadata (code, name, credit hours, level, tags)
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

        {/* Modal Body - Basic Info Only */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Course Code (رمز المادة) *</label>
              <input 
                type="text" 
                placeholder="e.g. CS101 or عال101" 
                value={subjectForm.code} 
                onChange={e => setSubjectForm((s: any) => ({ ...s, code: e.target.value }))} 
                className="py-2 px-3 rounded-xl text-sm border outline-none" 
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Course Name (اسم المادة) *</label>
              <input 
                type="text" 
                placeholder="e.g. Introduction to Computer Science" 
                value={subjectForm.name} 
                onChange={e => setSubjectForm((s: any) => ({ ...s, name: e.target.value }))} 
                className="py-2 px-3 rounded-xl text-sm border outline-none" 
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Credit Hours (الساعات)</label>
              <input 
                type="number" 
                placeholder="3" 
                value={subjectForm.creditHours} 
                onChange={e => setSubjectForm((s: any) => ({ ...s, creditHours: e.target.value }))} 
                className="py-2 px-3 rounded-xl text-sm border outline-none" 
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Level (المستوى)</label>
              <input 
                type="number" 
                placeholder="e.g. 1" 
                value={subjectForm.level} 
                onChange={e => setSubjectForm((s: any) => ({ ...s, level: e.target.value }))} 
                className="py-2 px-3 rounded-xl text-sm border outline-none" 
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Tags (التصنيفات)</label>
              <input 
                type="text" 
                placeholder="e.g. CS, Core, Math" 
                value={subjectForm.tags} 
                onChange={e => setSubjectForm((s: any) => ({ ...s, tags: e.target.value }))} 
                className="py-2 px-3 rounded-xl text-sm border outline-none" 
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-2 bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-[var(--bg-card)] transition"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave();
              onClose();
            }}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--color-imamu-blue)] text-white hover:bg-[var(--color-imamu-blue-light)] transition flex items-center gap-1.5 shadow-md"
          >
            <Check className="w-4 h-4" />
            <span>{isEditing ? 'Save Changes' : 'Create Course'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
