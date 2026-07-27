import React, { useState } from 'react';
import { X, BookOpen, Link2, Image as ImageIcon, Sparkles, Check } from 'lucide-react';
import ResourceLinksInput from './ResourceLinksInput';
import ImageUploadInput from './ImageUploadInput';

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
  const [activeTab, setActiveTab] = useState<'info' | 'details' | 'links' | 'media'>('info');

  if (!isOpen) return null;

  const isEditing = !!subjectForm.id;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border"
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
                Fill out course metadata, syllabus breakdown, and resource links
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

        {/* Tab Navigation */}
        <div className="flex border-b px-6 gap-2 bg-[var(--bg-subtle)] text-xs font-semibold" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 px-3 border-b-2 transition ${activeTab === 'info' ? 'border-blue-500 text-blue-500 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            1. Basic Info
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-3 border-b-2 transition ${activeTab === 'details' ? 'border-blue-500 text-blue-500 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            2. Overview & Syllabus
          </button>
          <button
            onClick={() => setActiveTab('links')}
            className={`py-3 px-3 border-b-2 transition ${activeTab === 'links' ? 'border-blue-500 text-blue-500 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            3. Resources & Links
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`py-3 px-3 border-b-2 transition ${activeTab === 'media' ? 'border-blue-500 text-blue-500 font-bold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
          >
            4. Avatar & Banner
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'info' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Course Code (رمز المادة) *</label>
                  <input 
                    type="text" 
                    placeholder="e.g. CS101 or عال101" 
                    value={subjectForm.code} 
                    onChange={e => setSubjectForm((s: any) => ({ ...s, code: e.target.value }))} 
                    className="py-2 px-3 rounded-xl text-sm border" 
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
                    className="py-2 px-3 rounded-xl text-sm border" 
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
                    className="py-2 px-3 rounded-xl text-sm border" 
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
                    className="py-2 px-3 rounded-xl text-sm border" 
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
                    className="py-2 px-3 rounded-xl text-sm border" 
                    style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Overview / Description (الوصف والملخص)</label>
                <textarea 
                  rows={4} 
                  placeholder="Brief summary of the course objectives and content..." 
                  value={subjectForm.description} 
                  onChange={e => setSubjectForm((s: any) => ({ ...s, description: e.target.value }))} 
                  className="py-2 px-3 rounded-xl text-sm border resize-none" 
                  style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Course Syllabus (توصيف المقرر والمنهج)</label>
                <textarea 
                  rows={4} 
                  placeholder="Detailed weekly or modular syllabus breakdown..." 
                  value={subjectForm.syllabus} 
                  onChange={e => setSubjectForm((s: any) => ({ ...s, syllabus: e.target.value }))} 
                  className="py-2 px-3 rounded-xl text-sm border resize-none" 
                  style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
                />
              </div>
            </div>
          )}

          {activeTab === 'links' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>WhatsApp Group Link (جروب الواتساب)</label>
                  <input 
                    type="text" 
                    placeholder="https://chat.whatsapp.com/..." 
                    value={subjectForm.whatsappLink} 
                    onChange={e => setSubjectForm((s: any) => ({ ...s, whatsappLink: e.target.value }))} 
                    className="py-2 px-3 rounded-xl text-sm border" 
                    style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Drive / Box Storage Link (مجلد درايف / بوكس)</label>
                  <input 
                    type="text" 
                    placeholder="https://drive.google.com/... or https://app.box.com/..." 
                    value={subjectForm.driveLink} 
                    onChange={e => setSubjectForm((s: any) => ({ ...s, driveLink: e.target.value }))} 
                    className="py-2 px-3 rounded-xl text-sm border" 
                    style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
                  />
                </div>
              </div>

              <div className="border-t pt-3 space-y-4" style={{ borderColor: 'var(--border-color)' }}>
                <ResourceLinksInput 
                  label="Free Resources Links (المصادر المجانية - متعدد)" 
                  value={subjectForm.freeResourcesUrl} 
                  onChange={val => setSubjectForm((s: any) => ({ ...s, freeResourcesUrl: val }))} 
                />

                <ResourceLinksInput 
                  label="Paid Resources Links (المصادر المدفوعة - متعدد)" 
                  value={subjectForm.paidResourcesUrl} 
                  onChange={val => setSubjectForm((s: any) => ({ ...s, paidResourcesUrl: val }))} 
                  color="amber" 
                />
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-5 animate-fadeIn">
              <ImageUploadInput 
                label="Course Avatar Image (صورة المادة / الشعار)" 
                value={subjectForm.avatarUrl} 
                onChange={val => setSubjectForm((s: any) => ({ ...s, avatarUrl: val }))} 
                type="avatar" 
              />

              <ImageUploadInput 
                label="Course Banner Image (صورة الغلاف / البانر)" 
                value={subjectForm.bannerUrl} 
                onChange={val => setSubjectForm((s: any) => ({ ...s, bannerUrl: val }))} 
                type="banner" 
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3 bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold text-blue-500">Step {activeTab === 'info' ? 1 : activeTab === 'details' ? 2 : activeTab === 'links' ? 3 : 4} of 4</span>
          </div>

          <div className="flex gap-2">
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
    </div>
  );
}
