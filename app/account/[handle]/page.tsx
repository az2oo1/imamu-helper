'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AuthenticatedAccountProfileModal } from '../../../src/components/AuthenticatedAccountProfileModal';
import { useAuth } from '../../../src/lib/AuthContext';
import { Shield, Loader2, ArrowRight } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function StandaloneAccountPage() {
  const params = useParams();
  const router = useRouter();
  const handleParam = params?.handle as string;

  const { user, dbUser } = useAuth();
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (handleParam) {
      fetchAccount();
    }
  }, [handleParam]);

  const fetchAccount = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('imamu_token') || '';
      const res = await fetch(`/api/authenticated-accounts/${encodeURIComponent(handleParam)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        setAccount(data);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'تعذر العثور على حساب الجهة المطلوب');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--color-imamu-brown)] animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">جاري تحميل صفحة حساب الجهة...</span>
        </div>
      </main>
    );
  }

  if (error || !account) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8 text-right" dir="rtl">
        <div className="text-center max-w-md bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">حساب الجهة غير موجود</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">{error || 'تعذر العثور على هذا الحساب أو قد يكون تم حذفه.'}</p>
          <button
            onClick={() => router.push('/news')}
            className="px-6 py-2.5 bg-neutral-900/90 hover:bg-neutral-800 text-white font-bold text-xs rounded-2xl border border-neutral-700/60 shadow-lg flex items-center justify-center gap-2 mx-auto transition cursor-pointer"
          >
            <ArrowRight className="w-4 h-4 text-[var(--color-imamu-accent)]" />
            <span>العودة للأخبار</span>
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white w-full">
      <AuthenticatedAccountProfileModal
        isOpen={true}
        onClose={() => router.push('/news')}
        account={account}
        currentUser={user}
        dbUser={dbUser}
        isStandalonePage={true}
        onAccountUpdate={fetchAccount}
      />
    </main>
  );
}
