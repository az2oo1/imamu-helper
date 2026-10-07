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
    college?: string;
    department?: string;
    prereq?: string;
    whatsappLink: string;
    description: string;
    syllabus: string;
    freeResourcesUrl: string;
    paidResourcesUrl: string;
    avatarUrl: string;
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn" dir="rtl">
      <div 
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-[var(--color-imamu-accent)] border border-amber-700/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight">
                {isEditing ? `تعديل المقرر: ${subjectForm.code}` : 'إضافة مقرر دراسي جديد'}
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                البيانات الأساسية للمقرر الأكاديمي
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[var(--bg-subtle)] transition cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>رمز المقرر *</label>
              <input 
                type="text" 
                placeholder="مثال: عال101 أو CS101" 
                value={subjectForm.code} 
                onChange={e => setSubjectForm((s: any) => ({ ...s, code: e.target.value }))} 
                className="py-2 px-3 rounded-xl text-sm border outline-none" 
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>اسم المقرر *</label>
              <input 
                type="text" 
                placeholder="مثال: مقدمة في علوم الحاسب" 
                value={subjectForm.name} 
                onChange={e => setSubjectForm((s: any) => ({ ...s, name: e.target.value }))} 
                className="py-2 px-3 rounded-xl text-sm border outline-none" 
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>الكلية</label>
              <input 
                type="text" 
                placeholder="مثال: كلية علوم الحاسب والمعلومات" 
                value={subjectForm.college || ''} 
                onChange={e => setSubjectForm((s: any) => ({ ...s, college: e.target.value }))} 
                className="py-2 px-3 rounded-xl text-sm border outline-none" 
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>القسم الأكاديمي</label>
              <input 
                type="text" 
                placeholder="مثال: علوم الحاسب" 
                value={subjectForm.department || ''} 
                onChange={e => setSubjectForm((s: any) => ({ ...s, department: e.target.value }))} 
                className="py-2 px-3 rounded-xl text-sm border outline-none" 
                style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>
              المتطلبات السابقة
            </label>
            <input 
              type="text" 
              placeholder="مثال: عال140 (البرمجة كينونية التوجه)" 
              value={subjectForm.prereq || ''} 
              onChange={e => setSubjectForm((s: any) => ({ ...s, prereq: e.target.value }))} 
              className="py-2 px-3 rounded-xl text-sm border outline-none" 
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
            />
          </div>

          <div className="flex flex-col gap-1 sm:w-1/2">
            <label className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>عدد الساعات المعتمدة</label>
            <input 
              type="number" 
              placeholder="3" 
              value={subjectForm.creditHours} 
              onChange={e => setSubjectForm((s: any) => ({ ...s, creditHours: e.target.value }))} 
              className="py-2 px-3 rounded-xl text-sm border outline-none" 
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} 
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-2 bg-[var(--bg-subtle)]" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold border hover:bg-[var(--bg-card)] transition cursor-pointer"
            style={{ borderColor: 'var(--border-color)', color: 'var(--text-muted)' }}
          >
            إلغاء
          </button>
          <button
            onClick={() => {
              onSave();
              onClose();
            }}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--color-imamu-brown)] text-white hover:bg-[var(--color-imamu-brown-dark)] transition flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>{isEditing ? 'حفظ التغييرات' : 'إضافة المقرر'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
