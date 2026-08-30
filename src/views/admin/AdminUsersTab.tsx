import React from 'react';
import { Users, Search, Shield, User, Trash2 } from 'lucide-react';

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
  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-display font-bold" style={{ color: 'var(--text-main)' }}>User Management (إدارة المستخدمين)</h3>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Manage registered students, permissions, and roles</p>
        </div>
      </div>

      <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="px-5 py-4 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: 'var(--border-color)' }}>
          <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>Registered Users ({adminUsers.length})</h4>
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search user by email or name..."
              value={searchUser}
              onChange={e => {
                setSearchUser(e.target.value);
                fetchUsers(e.target.value);
              }}
              className="py-1.5 pl-9 pr-3 rounded-xl text-xs border w-full sm:w-64 outline-none"
              style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
            />
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
          {adminUsers.map(u => (
            <div key={u.id || u.uid} className="p-4 flex items-center justify-between gap-4 transition hover:bg-[var(--bg-subtle)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2.5 rounded-xl border shrink-0 ${u.isAdmin ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20'}`}>
                  {u.isAdmin ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm truncate" style={{ color: 'var(--text-main)' }}>{u.userName || u.email}</span>
                    {u.isAdmin && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 uppercase">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{u.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDelete(`/api/admin/users/${u.id || u.uid}`, u.userName || u.email)}
                  className="p-2 rounded-xl transition hover:bg-red-500/10 text-red-400"
                  title="Delete User"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          {adminUsers.length === 0 && (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No users found matching search.</div>
          )}
        </div>
      </div>
    </div>
  );
}
