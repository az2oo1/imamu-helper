import React, { useState } from 'react';
import { 
  Users, Search, Shield, User, Trash2, Eye, Ban, ShieldAlert, CheckCircle2, 
  X, MessageSquare, ThumbsUp, GraduationCap, Clock, Phone, Mail, Award, Check, Settings, Copy
} from 'lucide-react';

export const ALL_ADMIN_PERMISSIONS = [
  { id: 'users', label: 'إدارة المستخدمين والحسابات', desc: 'عرض وتعديل وصلاحيات وحظر حسابات المستخدمين' },
  { id: 'courses', label: 'إدارة التخصصات والمقررات', desc: 'تعديل التخصصات وتوزيع المقررات والأكاديميا' },
  { id: 'resources', label: 'إدارة المصادر ومجموعات المواد', desc: 'تعديل بنك الملفات ورابط مجموعات الواتساب' },
  { id: 'dates', label: 'إدارة التقويم والمواعيد والأحداث', desc: 'تعديل الأحداث الأكاديمية وعداد المكافأة' },
  { id: 'news', label: 'إدارة الأخبار وقنوات تليقرام', desc: 'استخراج الأخبار وتحديث القنوات الرسمية' },
  { id: 'tutorials', label: 'إدارة الشروحات والأدلة', desc: 'إضافة وتعديل أدلة الشروحات الطلابية' },
  { id: 'newbie', label: 'إدارة المستجدين والأدوات', desc: 'تعديل روابط المستجدين والأدوات الأكاديمية' },
  { id: 'logs', label: 'سجل الأنشطة والمراقبة', desc: 'عرض سجل الأحداث والتحركات والمراقبة الكاملة' },
];

export const parseUserPermissions = (permVal: any): string[] => {
  if (!permVal) return ALL_ADMIN_PERMISSIONS.map(p => p.id);
  if (Array.isArray(permVal)) return permVal;
  try {
    const parsed = JSON.parse(permVal);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {}
  return ALL_ADMIN_PERMISSIONS.map(p => p.id);
};

interface AdminUsersTabProps {
  adminUsers: any[];
  searchUser: string;
  setSearchUser: (s: string) => void;
  fetchUsers: (s: string) => void;
  handleDelete: (url: string, name: string) => void;
}

export default function AdminUsersTab({
  adminUsers,
  searchUser,
  setSearchUser,
  fetchUsers,
  handleDelete
}: AdminUsersTabProps) {
  // Modal states
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userDetails, setUserDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [copiedUid, setCopiedUid] = useState<string | null>(null);

  // Permissions Modal state
  const [permissionsModalUser, setPermissionsModalUser] = useState<any | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<string[]>([]);
  const [savingPermissions, setSavingPermissions] = useState<boolean>(false);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState<{
    type: 'toggle-admin' | 'toggle-ban' | 'delete-user';
    title: string;
    message: string;
    action: () => Promise<void>;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Open view user modal and fetch extra details & interactions
  const openUserViewModal = async (u: any) => {
    setSelectedUser(u);
    setUserDetails(null);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/admin/users/${u.id || u.uid}/details`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('imamu_token') || ''}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUserDetails(data);
      }
    } catch (e) {
      console.error("Failed to load user details:", e);
    } finally {
      setLoadingDetails(false);
    }
  };

  // Open permissions configuration modal
  const openPermissionsModal = (u: any) => {
    const currentPerms = parseUserPermissions(u.adminPermissions);
    setEditingPermissions(currentPerms);
    setPermissionsModalUser(u);
  };

  const handleSavePermissions = async () => {
    if (!permissionsModalUser) return;
    setSavingPermissions(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('imamu_token') || '';
      const isCurrentlyAdmin = permissionsModalUser.isAdmin;

      const endpoint = isCurrentlyAdmin 
        ? `/api/admin/users/${permissionsModalUser.uid || permissionsModalUser.id}/permissions`
        : `/api/admin/users/${permissionsModalUser.uid || permissionsModalUser.id}/toggle-admin`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ permissions: editingPermissions })
      });

      if (res.ok) {
        const data = await res.json();
        fetchUsers(searchUser);
        if (selectedUser && (selectedUser.id === permissionsModalUser.id || selectedUser.uid === permissionsModalUser.uid)) {
          setSelectedUser((prev: any) => ({
            ...prev,
            isAdmin: true,
            adminPermissions: JSON.stringify(editingPermissions)
          }));
        }
        setPermissionsModalUser(null);
      }
    } catch (e) {
      console.error("Failed to save permissions:", e);
    } finally {
      setSavingPermissions(false);
    }
  };

  // Action Execution Handlers
  const executeToggleAdmin = async (targetUser: any, permissionsList?: string[]) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${targetUser.uid || targetUser.id}/toggle-admin`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('imamu_token') || ''}`
        },
        body: JSON.stringify({ permissions: permissionsList || ALL_ADMIN_PERMISSIONS.map(p => p.id) })
      });
      if (res.ok) {
        fetchUsers(searchUser);
        if (selectedUser && (selectedUser.id === targetUser.id || selectedUser.uid === targetUser.uid)) {
          setSelectedUser((prev: any) => ({ ...prev, isAdmin: !prev.isAdmin }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
      setConfirmModal(null);
    }
  };

  const executeToggleBan = async (targetUser: any) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${targetUser.uid || targetUser.id}/toggle-ban`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('imamu_token') || ''}`
        }
      });
      if (res.ok) {
        fetchUsers(searchUser);
        if (selectedUser && (selectedUser.id === targetUser.id || selectedUser.uid === targetUser.uid)) {
          setSelectedUser((prev: any) => ({ ...prev, isBanned: !prev.isBanned }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
      setConfirmModal(null);
    }
  };

  const executeDeleteUser = async (targetUser: any) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${targetUser.uid || targetUser.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || localStorage.getItem('imamu_token') || ''}`
        }
      });
      if (res.ok) {
        fetchUsers(searchUser);
        setSelectedUser(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
      setConfirmModal(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-serif font-bold text-slate-900 dark:text-white">إدارة حسابات وصلاحيات الطلاب</h3>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            إدارة الحسابات المسجلة، منح وتحديد الصلاحيات الإدارية الدقيقة، ومعاينة تفاصيل التخصص والأنشطة.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-xs border border-slate-200 dark:border-zinc-800 space-y-4">
        <div className="relative">
          <Search className="w-5 h-5 absolute right-4 top-3.5 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="البحث باسم المستخدم، البريد الرئيسي أو البريد الجامعي..."
            value={searchUser}
            onChange={e => { setSearchUser(e.target.value); fetchUsers(e.target.value); }}
            className="w-full pr-12 pl-4 py-3 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[var(--color-imamu-brown)] transition"
          />
        </div>

        {/* Users Table / Cards */}
        <div className="divide-y divide-slate-100 dark:divide-zinc-800">
          {adminUsers.map((u: any) => (
            <div key={u.id || u.uid} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-zinc-950/40 p-3 rounded-2xl transition">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base border shrink-0 ${
                  u.isBanned 
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 border-rose-200 dark:border-rose-900/50' 
                    : u.isAdmin 
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-[var(--color-imamu-accent)] border-amber-200 dark:border-amber-900/50' 
                    : 'bg-stone-50 dark:bg-stone-950/50 text-[var(--color-imamu-accent)] border-amber-200 dark:border-stone-900/50'
                }`}>
                  {u.userName ? u.userName.charAt(0).toUpperCase() : 'ط'}
                </div>

                <div className="min-w-0 text-right">
                  <div className="flex items-center gap-[3px] flex-wrap">
                    <span className="font-bold text-sm text-slate-900 dark:text-white truncate">{u.userName || u.email}</span>
                    
                    {u.isAdmin && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-[var(--color-imamu-accent)] border border-amber-500/20">
                        👑 مسؤول
                      </span>
                    )}
                    {u.isBanned && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        🔴 محظور
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-zinc-400 mt-1 flex-wrap">
                    {u.userName && u.email && <span>{u.email}</span>}
                    {u.major && <span className="text-[11px] font-medium bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded">{u.major}</span>}
                    {u.finishedHours !== undefined && u.finishedHours !== null && (
                      <span className="text-[11px] font-medium text-slate-600 dark:text-zinc-400">{u.finishedHours} ساعة مجتازة</span>
                    )}
                  </div>
                </div>
              </div>

              {/* View Action Button */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => openUserViewModal(u)}
                  className="btn-rise px-3.5 py-2 rounded-xl text-xs font-bold bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white shadow-md shadow-[var(--color-imamu-brown)/20] border border-amber-700/30 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-white shrink-0" />
                  <span>معاينة وتفاصيل الحساب</span>
                </button>
              </div>
            </div>
          ))}

          {adminUsers.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-400 dark:text-zinc-500">لا يوجد مستخدمون مطابقون لبحثك.</div>
          )}
        </div>
      </div>

      {/* USER DETAILS MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/80 backdrop-blur-xs animate-fadeIn">
          <div 
            className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-950">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border ${
                  selectedUser.isBanned 
                    ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 border-rose-200 dark:border-rose-900/50' 
                    : selectedUser.isAdmin 
                    ? 'bg-amber-50 dark:bg-amber-950/50 text-[var(--color-imamu-accent)] border-amber-200 dark:border-amber-900/50' 
                    : 'bg-stone-50 dark:bg-stone-950/50 text-[var(--color-imamu-accent)] border-amber-200 dark:border-stone-900/50'
                }`}>
                  {selectedUser.userName ? selectedUser.userName.charAt(0).toUpperCase() : 'ط'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedUser.userName || 'طالب بدون اسم'}</h3>
                    {selectedUser.isAdmin && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-[var(--color-imamu-accent)] border border-amber-500/20">👑 مسؤول</span>}
                    {selectedUser.isBanned && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">🔴 محظور</span>}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">{selectedUser.email}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedUser(null)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-right">
              
              {/* User Basic Info Grid (WITHOUT GPA!) */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-3">بيانات المستخدم والتخصص</h4>
                
                {/* User UID Copy Card */}
                <div className="p-3.5 mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 block mb-0.5">معرّف الحساب (User UID) لربط المساهمات:</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white font-mono dir-ltr block text-right select-all">{selectedUser.uid || selectedUser.id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const uVal = selectedUser.uid || selectedUser.id;
                      navigator.clipboard.writeText(uVal);
                      setCopiedUid(uVal);
                      setTimeout(() => setCopiedUid(null), 2000);
                    }}
                    className="btn-rise px-3.5 py-2 rounded-xl bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs"
                  >
                    {copiedUid === (selectedUser.uid || selectedUser.id) ? <Check className="w-4 h-4 text-emerald-400 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedUid === (selectedUser.uid || selectedUser.id) ? 'تم النسخ!' : 'نسخ المعرف'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mb-1">اسم المستخدم:</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{selectedUser.userName || 'غير مسجل'}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mb-1">البريد الإلكتروني:</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white dir-ltr text-right block truncate">{selectedUser.email}</span>
                  </div>

                  {selectedUser.studentEmail && selectedUser.studentEmail !== selectedUser.email && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mb-1">البريد الجامعي الإضافي:</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white dir-ltr text-right block truncate">{selectedUser.studentEmail}</span>
                    </div>
                  )}

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mb-1">التخصص الأكاديمي:</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{selectedUser.major || 'لم يحدد تخصصاً بعد'}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                    <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mb-1">الساعات المجتازة:</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {selectedUser.finishedHours !== undefined && selectedUser.finishedHours !== null ? `${selectedUser.finishedHours} ساعة` : 'غير مدخلة'}
                    </span>
                  </div>

                  {selectedUser.phone && (
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                      <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mb-1">رقم الجوال:</span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white dir-ltr text-right block">{selectedUser.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Permissions Badge Section */}
              {selectedUser.isAdmin && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span>الصلاحيات الإدارية الممنوحة</span>
                    </h4>
                    <button
                      onClick={() => openPermissionsModal(selectedUser)}
                      className="btn-rise text-xs font-bold text-[var(--color-imamu-brown)] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>تعديل الصلاحيات</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {parseUserPermissions(selectedUser.adminPermissions).map(permKey => {
                      const permInfo = ALL_ADMIN_PERMISSIONS.find(p => p.id === permKey);
                      return (
                        <span key={permKey} className="px-2.5 py-1 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 text-[11px] font-bold flex items-center gap-1">
                          <Check className="w-3 h-3 text-amber-600" />
                          <span>{permInfo?.label || permKey}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Activity & Interaction Stats */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-3">سجل التفاعل والتعليقات</h4>
                
                {loadingDetails ? (
                  <div className="text-center py-6 text-xs text-slate-400">جاري تحميل سجل التفاعلات...</div>
                ) : userDetails ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-amber-500/10 text-[var(--color-imamu-accent)]">
                          <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">إجمالي التعليقات:</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{userDetails.totalComments || 0} تعليق</span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/30 flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600">
                          <ThumbsUp className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">إجمالي الإعجابات:</span>
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{userDetails.totalLikes || 0} إعجاب</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">لا توجد بيانات تفاعل مسجلة.</div>
                )}
              </div>
            </div>

            {/* Action Buttons Toolbar with Confirmations */}
            <div className="p-6 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex flex-wrap gap-3 items-center justify-between">
              
              <div className="flex flex-wrap gap-3">
                {/* 1. Make/Remove Admin Button */}
                <button
                  onClick={() => {
                    if (selectedUser.isAdmin) {
                      setConfirmModal({
                        type: 'toggle-admin',
                        title: 'سحب صلاحية المسؤول',
                        message: `هل أنت متأكد من سحب صلاحيات المسؤول من (${selectedUser.userName || selectedUser.email})؟`,
                        action: () => executeToggleAdmin(selectedUser)
                      });
                    } else {
                      openPermissionsModal(selectedUser);
                    }
                  }}
                  className={`btn-rise px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    selectedUser.isAdmin
                      ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                      : 'bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white shadow-md shadow-[var(--color-imamu-brown)/20] border border-amber-700/30'
                  }`}
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>{selectedUser.isAdmin ? 'سحب صلاحية المسؤول' : 'منح صلاحية المسؤول'}</span>
                </button>

                {/* 2. Ban / Unban User Button */}
                <button
                  onClick={() => setConfirmModal({
                    type: 'toggle-ban',
                    title: selectedUser.isBanned ? 'إلغاء حظر المستخدم' : 'حظر المستخدم',
                    message: `هل أنت متأكد من ${selectedUser.isBanned ? 'إلغاء حظر' : 'حظر'} المستخدم (${selectedUser.userName || selectedUser.email}) ومنعه من الدخول للمنصة؟`,
                    action: () => executeToggleBan(selectedUser)
                  })}
                  className={`btn-rise px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer ${
                    selectedUser.isBanned
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 border border-emerald-500/30'
                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                  }`}
                >
                  <Ban className="w-4 h-4 shrink-0" />
                  <span>{selectedUser.isBanned ? 'إلغاء حظر المستخدم' : 'حظر المستخدم'}</span>
                </button>
              </div>

              {/* 3. Delete User Button */}
              <button
                onClick={() => setConfirmModal({
                  type: 'delete-user',
                  title: 'حذف حساب المستخدم نهائياً',
                  message: `هل أنت متأكد من حذف حساب (${selectedUser.userName || selectedUser.email}) نهائياً من القاعدة؟ لن تتمكن من التراجع عن هذه الخطوة.`,
                  action: () => executeDeleteUser(selectedUser)
                })}
                className="btn-rise px-4 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition flex items-center gap-1.5 cursor-pointer border border-rose-500/30"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>حذف المستخدم</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GRANULAR PERMISSIONS MODAL */}
      {permissionsModalUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/90 backdrop-blur-xs animate-fadeIn">
          <div 
            className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl border border-slate-200 dark:border-zinc-800 text-right flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-[var(--color-imamu-accent)] border border-amber-500/20 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">تخصيص الصلاحيات الإدارية</h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                    اختر أقسام النظام المسموح للمسؤول ({permissionsModalUser.userName || permissionsModalUser.email}) للوصول إليها وتعديلها.
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setPermissionsModalUser(null)} 
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Permissions Checkbox Grid */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">قائمة الصلاحيات المتاحة:</span>
                <div className="flex gap-3 text-xs">
                  <button 
                    onClick={() => setEditingPermissions(ALL_ADMIN_PERMISSIONS.map(p => p.id))}
                    className="text-[var(--color-imamu-brown)] hover:underline font-bold"
                  >
                    تحديد الكل
                  </button>
                  <button 
                    onClick={() => setEditingPermissions([])}
                    className="text-slate-400 hover:underline"
                  >
                    إلغاء الكل
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {ALL_ADMIN_PERMISSIONS.map((perm) => {
                  const isChecked = editingPermissions.includes(perm.id);
                  return (
                    <div
                      key={perm.id}
                      onClick={() => {
                        if (isChecked) {
                          setEditingPermissions(prev => prev.filter(p => p !== perm.id));
                        } else {
                          setEditingPermissions(prev => [...prev, perm.id]);
                        }
                      }}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer flex items-start gap-3 ${
                        isChecked 
                          ? 'bg-amber-500/10 border-amber-500/40 text-slate-900 dark:text-white shadow-2xs' 
                          : 'bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-400 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center shrink-0 transition ${
                        isChecked 
                          ? 'bg-[var(--color-imamu-brown)] border-[var(--color-imamu-brown)] text-white' 
                          : 'border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900'
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      <div>
                        <div className="text-xs font-bold leading-snug">{perm.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-500 mt-1 leading-relaxed">{perm.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Bar */}
            <div className="p-6 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 flex gap-3">
              <button 
                disabled={savingPermissions}
                onClick={() => setPermissionsModalUser(null)}
                className="btn-rise flex-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold py-3 rounded-xl text-xs transition cursor-pointer"
              >
                إلغاء
              </button>

              <button 
                disabled={savingPermissions}
                onClick={handleSavePermissions}
                className="btn-rise flex-1 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white font-bold py-3 rounded-xl text-xs shadow-md shadow-[var(--color-imamu-brown)/20] transition cursor-pointer"
              >
                {savingPermissions ? 'جاري الحفظ...' : 'حفظ وإسناد الصلاحيات'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CONFIRMATION MESSAGE DIALOG */}
      {confirmModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/90 backdrop-blur-xs animate-fadeIn">
          <div 
            className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-6 border border-slate-200 dark:border-zinc-800 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 border ${
              confirmModal.type === 'delete-user' || confirmModal.type === 'toggle-ban'
                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 border-rose-200 dark:border-rose-900/50'
                : 'bg-stone-50 dark:bg-stone-950/50 text-[var(--color-imamu-accent)] border-amber-200 dark:border-stone-900/50'
            }`}>
              {confirmModal.type === 'delete-user' && <Trash2 className="w-7 h-7" />}
              {confirmModal.type === 'toggle-ban' && <Ban className="w-7 h-7" />}
              {confirmModal.type === 'toggle-admin' && <ShieldAlert className="w-7 h-7" />}
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">{confirmModal.title}</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 mb-6 leading-relaxed font-normal">{confirmModal.message}</p>

            <div className="flex gap-3">
              <button 
                disabled={actionLoading}
                onClick={() => setConfirmModal(null)}
                className="btn-rise flex-1 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 font-bold py-2.5 rounded-xl text-xs transition cursor-pointer"
              >
                إلغاء
              </button>

              <button 
                disabled={actionLoading}
                onClick={confirmModal.action}
                className={`btn-rise flex-1 font-bold py-2.5 rounded-xl text-xs transition text-white shadow-md cursor-pointer ${
                  confirmModal.type === 'delete-user' || confirmModal.type === 'toggle-ban'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] shadow-[var(--color-imamu-brown)/20]'
                }`}
              >
                {actionLoading ? 'جاري التنفيذ...' : 'تأكيد الإجراء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
