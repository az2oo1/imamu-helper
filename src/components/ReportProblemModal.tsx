'use client';

import React, { useState } from 'react';
import { X, Send, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

interface ReportProblemModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: 'tutorial' | 'news' | 'resource' | 'tool' | 'event' | 'general';
  targetId?: string | number;
  targetTitle?: string;
  user?: any;
  onSuccess?: () => void;
}

export default function ReportProblemModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
  user: propUser,
  onSuccess
}: ReportProblemModalProps) {
  const { user: contextUser, dbUser } = useAuth();
  const activeUser = propUser || contextUser;

  const [feedbackType, setFeedbackType] = useState<string>('bug_report');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      if (activeUser) {
        try {
          const token = await activeUser.getIdToken();
          if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch (e) {}
      }

      const userEmail = activeUser?.email || dbUser?.studentEmail || dbUser?.googleEmail || undefined;
      const userName = dbUser?.userName || activeUser?.displayName || dbUser?.name || (activeUser?.uid ? `طالب (${activeUser.uid.slice(0, 8)})` : 'زائر المنصة');
      const userId = activeUser?.uid || (dbUser?.id ? String(dbUser.id) : undefined);

      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetType,
          targetId: targetId ? String(targetId) : undefined,
          targetTitle: targetTitle || undefined,
          feedbackType,
          comment: comment.trim(),
          userEmail,
          userName,
          userId,
        })
      });

      if (res.ok) {
        setSuccessMsg(true);
        setTimeout(() => {
          setSuccessMsg(false);
          setComment('');
          onSuccess?.();
          onClose();
        }, 1800);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.error || 'تعذر إرسال البلاغ. يرجى المحاولة لاحقاً.');
      }
    } catch (e) {
      setErrorMsg('حدث خطأ في الاتصال بالسيرفر.');
    } finally {
      setSubmitting(false);
    }
  };

  const getTargetTypeLabel = () => {
    switch (targetType) {
      case 'tutorial': return 'شرح / الدليلة';
      case 'news': return 'خبر / مقال';
      case 'resource': return 'مصدر دراسي';
      case 'tool': return 'أداة';
      case 'event': return 'موعد تقويم';
      default: return 'ملاحظة عامة';
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200" 
      dir="rtl"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 text-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-zinc-800/80 text-amber-400 border border-zinc-700/50">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">الإبلاغ عن مشكلة / إرسال ملاحظة</h3>
              <p className="text-[11px] mt-0.5 text-zinc-400">{getTargetTypeLabel()} {targetTitle ? `• ${targetTitle}` : ''}</p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="btn-rise p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        {successMsg ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-base text-emerald-400">تم إرسال بلاغك بنجاح!</h4>
            <p className="text-xs text-zinc-400">شكراً لمساعدتك في تحسين المنصة. سيتولى فريق الإشراف مراجعة البلاغ وحل المشكلة.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            {/* Select Feedback / Issue Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400">نوع البلاغ / المشكلة:</label>
              <select
                value={feedbackType}
                onChange={e => setFeedbackType(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl text-xs font-bold border border-zinc-800 bg-zinc-900 text-white outline-none cursor-pointer focus:border-blue-500 transition shadow-2xs"
              >
                <option value="bug_report">⚠️ مشكلة فنية / خطأ برمجي</option>
                <option value="broken_link">🔗 رابط عاطل / لا يعمل</option>
                <option value="wrong_info">📝 معلومات غير دقيقة / قديمة</option>
                <option value="unhelpful">👎 الشرح غير واضح / يحتاج تفاصيل أكثر</option>
                <option value="suggestion">💡 اقتراح تحسين أو إضافة</option>
              </select>
            </div>

            {/* Comment Text Area */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-zinc-400">تفاصيل المشكلة أو الملاحظة:</label>
              <textarea
                required
                rows={4}
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="يرجى كتابة تفاصيل المشكلة الملاحظة لمساعدتنا على معالجتها بسرعة..."
                className="w-full p-3 rounded-xl text-xs border border-zinc-800 bg-zinc-900 text-white outline-none resize-none placeholder-zinc-500 focus:border-blue-500 transition shadow-2xs"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-800/80">
              <button
                type="button"
                onClick={onClose}
                className="btn-rise px-4 py-2.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={submitting || !comment.trim()}
                className="btn-rise bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{submitting ? 'جاري الإرسال...' : 'إرسال البلاغ'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
