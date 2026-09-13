'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../../src/lib/AuthContext';
import { Shield, Loader2, Lock, UserPlus, Trash2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { EntityDashboardHeader } from '../../../../../src/components/EntityDashboardHeader';

export const dynamic = 'force-dynamic';

interface ConnectedUser {
  id?: number;
  uid: string;
  userName?: string;
  email?: string;
  profilePicUrl?: string;
}

export default function AccountDashboardManagersPage() {
  const params = useParams();
  const router = useRouter();
  const handleParam = params?.handle as string;

  const { user, dbUser, loading: authLoading } = useAuth();
  const [account, setAccount] = useState<any>(null);
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([]);
  const [newUserUid, setNewUserUid] = useState('');
  const [loading, setLoading] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [error, setError] = useState('');

  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

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
        fetchConnectedUsers(data.id || data.handle);
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

  const fetchConnectedUsers = async (accountParam: string | number) => {
    setIsLoadingUsers(true);
    try {
      const token = user ? await user.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const res = await fetch(`/api/authenticated-accounts/${accountParam}/users`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setConnectedUsers(data.users || []);
      }
    } catch (e) {
      console.error('Failed to fetch connected users', e);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserUid.trim()) return;
    setIsAddingUser(true);
    try {
      const token = user ? await user.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const accountParam = account.id || account.handle;

      const res = await fetch(`/api/authenticated-accounts/${accountParam}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ userUid: newUserUid.trim() })
      });

      if (res.ok) {
        setNewUserUid('');
        fetchConnectedUsers(accountParam);
        showToast('success', 'تمت إضافة المدير بنجاح إلى إدارة حساب الجهة!');
      } else {
        const err = await res.json().catch(() => ({}));
        showToast('error', err.error || 'فشل إضافة المستخدم');
      }
    } catch (err: any) {
      showToast('error', err.message || 'حدث خطأ أثناء إضافة المستخدم');
    } finally {
      setIsAddingUser(false);
    }
  };

  const promptRemoveUser = (userUid: string) => {
    setConfirmModal({
      title: 'إزالة مدير الحساب',
      message: `هل أنت متأكد من إزالة المستخدم (${userUid}) من قائمة مدراء حساب الجهة؟`,
      onConfirm: () => executeRemoveUser(userUid)
    });
  };

  const executeRemoveUser = async (userUid: string) => {
    try {
      const token = user ? await user.getIdToken() : (localStorage.getItem('token') || localStorage.getItem('imamu_token') || '');
      const accountParam = account.id || account.handle;

      const res = await fetch(`/api/authenticated-accounts/${accountParam}/users/${encodeURIComponent(userUid)}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        fetchConnectedUsers(accountParam);
        showToast('success', 'تمت إزالة المدير بنجاح');
      } else {
        showToast('error', 'فشل إزالة المستخدم');
      }
    } catch (err) {
      console.error(err);
      showToast('error', 'حدث خطأ أثناء إزالة المستخدم');
    }
  };

  if (authLoading || loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[var(--color-imamu-brown)] animate-spin" />
          <span className="text-xs text-neutral-400 font-medium">جاري تحميل إدارة المدراء...</span>
        </div>
      </main>
    );
  }

  if (error || !account) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8 text-right" dir="rtl">
        <div className="text-center max-w-md bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-neutral-800 text-neutral-400 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">حساب الجهة غير موجود</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">{error || 'تعذر العثور على هذا الحساب.'}</p>
          <button
            onClick={() => router.push('/news')}
            className="px-6 py-2.5 bg-[var(--color-imamu-brown)] text-white font-bold text-xs rounded-xl hover:bg-[var(--color-imamu-brown-dark)] transition cursor-pointer"
          >
            العودة للأخبار
          </button>
        </div>
      </main>
    );
  }

  const isManager = !!(
    account.isManager ||
    dbUser?.isAdmin ||
    dbUser?.role === 'ADMIN' ||
    (user?.uid && Array.isArray(account.assignedUsers) && account.assignedUsers.includes(user.uid))
  );

  if (!isManager) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center p-8 text-right" dir="rtl">
        <div className="text-center max-w-md bg-neutral-900 border border-neutral-800 p-8 rounded-3xl space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">غير مصرح بالوصول</h2>
          <p className="text-xs text-neutral-400 leading-relaxed">
            هذه اللوحة خاصة بمدراء حساب الجهة (@{account.handle}) فقط.
          </p>
          <button
            onClick={() => router.push(`/@/${encodeURIComponent(account.handle.replace(/^@/, ''))}`)}
            className="px-5 py-2.5 bg-[var(--color-imamu-brown)] text-white font-bold text-xs rounded-xl hover:bg-[var(--color-imamu-brown-dark)] transition cursor-pointer"
          >
            عرض الصفحة العامة
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6 text-right" dir="rtl">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-none">
          <div className={`px-5 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-bold flex items-center gap-2.5 backdrop-blur-xl ${
            toast.type === 'success' ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800/80' :
            toast.type === 'error' ? 'bg-red-950/90 text-red-300 border-red-800/80' :
            'bg-sky-950/90 text-sky-300 border-sky-800/80'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />}
            {toast.type === 'info' && <Info className="w-4 h-4 shrink-0 text-sky-400" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-white">{confirmModal.title}</h4>
              <p className="text-xs text-neutral-400 leading-relaxed">{confirmModal.message}</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition cursor-pointer"
              >
                نعم، إزالة
              </button>
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold text-xs transition cursor-pointer"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Page Navigation Buttons */}
      <EntityDashboardHeader
        account={account}
        activePage="managers"
        publishedCount={Array.isArray(account.articles) ? account.articles.length : 0}
      />

      {/* User Management Body */}
      <div className="bg-neutral-900/60 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6 animate-in fade-in duration-200">
        <div className="p-4 rounded-2xl bg-neutral-900/50 border border-neutral-800 space-y-1">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--color-imamu-accent)]" />
            <span>مدراء حساب الجهة (Entity Account Managers)</span>
          </h4>
          <p className="text-xs text-neutral-400">
            يمكن للمستخدمين المضافين هنا الوصول إلى لوحة تحكم هذا الحساب وتعديل بياناته ونشر الأخبار باسمه باستخدام الـ User UID الخاص بهم.
          </p>
        </div>

        {/* Add User Section */}
        <div className="space-y-3 pt-2">
          <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">
            إضافة مدير جديد بالمعرف (User UID)
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="أدخل User UID الخاص بالمستخدم (e.g. Firebase Auth UID)"
              value={newUserUid}
              onChange={(e) => setNewUserUid(e.target.value)}
              className="flex-1 bg-neutral-900/70 border border-neutral-800 rounded-2xl px-4 py-3 text-white text-xs font-mono outline-none focus:border-[var(--color-imamu-accent)] transition"
            />
            <button
              type="button"
              onClick={handleAddUser}
              disabled={isAddingUser || !newUserUid.trim()}
              className="bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white font-bold text-xs px-6 py-3 rounded-2xl transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
            >
              {isAddingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              <span>إضافة مدير</span>
            </button>
          </div>
        </div>

        {/* Connected Users List */}
        <div className="space-y-3 pt-4 border-t border-neutral-800">
          <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            المدراء المتصلون حالياً ({connectedUsers.length})
          </h4>

          {isLoadingUsers ? (
            <div className="py-12 flex justify-center text-neutral-500">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--color-imamu-accent)]" />
            </div>
          ) : connectedUsers.length === 0 ? (
            <div className="p-8 text-center bg-neutral-900/40 rounded-3xl border border-neutral-800 text-xs text-neutral-500">
              لا يوجد مدراء معينون لهذا الحساب حالياً. يمكنك استخدام User UID لإضافة مدراء.
            </div>
          ) : (
            <div className="space-y-2">
              {connectedUsers.map((u) => (
                <div key={u.uid} className="flex items-center justify-between p-4 bg-neutral-900/70 border border-neutral-800 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center font-bold text-white overflow-hidden shrink-0">
                      {u.profilePicUrl ? (
                        <img src={u.profilePicUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        u.userName?.charAt(0) || 'U'
                      )}
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-white block">{u.userName || 'مستخدم'}</span>
                      <span className="text-[10px] text-neutral-400 font-mono">{u.email || u.uid}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => promptRemoveUser(u.uid)}
                    className="p-2 text-neutral-400 hover:text-red-400 hover:bg-neutral-800 rounded-xl transition cursor-pointer"
                    title="إزالة المدير"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
