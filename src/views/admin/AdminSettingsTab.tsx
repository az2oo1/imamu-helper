'use client';

import React, { useState } from 'react';
import { Upload, Download, Mail, Send, RefreshCw, Server } from 'lucide-react';

interface HealthInfo {
  uptime: number;
  memory?: { rss: number; heapUsed: number; heapTotal: number };
  memoryUsage?: { rss: number; heapUsed: number; heapTotal: number };
  dbStatus?: string;
  storageStatus?: string;
  nodeVersion?: string;
  platform?: string;
}

interface AdminSettingsTabProps {
  globalSettings: any;
  setGlobalSettings: React.Dispatch<React.SetStateAction<any>>;
  getToken: () => Promise<string | null>;
  toast: (type: 'success' | 'error' | 'info' | 'warning', message: string) => void;
  handlePostWithMethod: (url: string, method: string, data: any, onSuccess?: () => void) => Promise<void>;
  health: HealthInfo | null;
}

export default function AdminSettingsTab({
  globalSettings,
  setGlobalSettings,
  getToken,
  toast,
  handlePostWithMethod,
  health,
}: AdminSettingsTabProps) {
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testEmailCode, setTestEmailCode] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient || !testEmailRecipient.trim()) {
      toast('error', 'يرجى كتابة البريد الإلكتروني أو الرقم الجامعي');
      return;
    }
    setIsSendingTestEmail(true);
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: testEmailRecipient.trim(),
          customCode: testEmailCode.trim() || undefined
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast('success', data.message || 'تم إرسال رمز التحقق بنجاح!');
      } else {
        toast('error', data.error || 'فشل إرسال رمز التحقق');
      }
    } catch (_e: any) {
      toast('error', 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-serif font-bold" style={{ color: 'var(--text-main)' }}>Global Settings</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Configure database backups, schedules, and mailing setups</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="space-y-4">
          <div className="rounded-2xl p-5 border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>Database Utilities</h4>
            <div className="flex flex-col gap-3">
              <label className="bg-[var(--color-imamu-brown)] text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 cursor-pointer text-sm hover:bg-[var(--color-imamu-brown-light)] transition w-full">
                <Upload className="w-4 h-4" /> Import Database
                <input type="file" accept=".json,.zip" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (!window.confirm('WARNING: This will overwrite the current database. Are you sure?')) return;
                  try {
                    const t = await getToken();
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await fetch('/api/admin/import-db', { method: 'POST', headers: { Authorization: `Bearer ${t}` }, body: formData });
                    if (!res.ok) throw new Error('Failed');
                    toast('success', 'Database imported! Reloading...');
                    setTimeout(() => window.location.reload(), 1000);
                  } catch { toast('error', 'Error importing database'); }
                  e.target.value = '';
                }} />
              </label>
              <button
                onClick={async () => {
                  try {
                    const t = await getToken();
                    const res = await fetch('/api/admin/export-db', { headers: { Authorization: `Bearer ${t}` } });
                    if (!res.ok) throw new Error('Failed');
                    const blob = await res.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `imamu_backup_${new Date().toISOString().split('T')[0]}.zip`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    toast('success', 'Database exported successfully');
                  } catch { toast('error', 'Error exporting database'); }
                }}
                className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium flex items-center justify-center gap-2 text-sm hover:bg-emerald-700 transition w-full"
              >
                <Download className="w-4 h-4" /> Export Database
              </button>
            </div>
          </div>

          <div className="rounded-2xl p-5 border space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>External API Settings</h4>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>API Endpoint Token</label>
              <input type="text" value={globalSettings.apiToken || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, apiToken: e.target.value }))} placeholder="super_secret_token_123" className="py-2 px-3 rounded-xl text-sm border w-full" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
            </div>
          </div>

          <div className="rounded-2xl p-5 border space-y-3" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h4 className="font-semibold text-sm" style={{ color: 'var(--text-main)' }}>تحديث أخبار التليجرام (Telegram Fetcher)</h4>
            <label className="flex items-start justify-between gap-3 cursor-pointer text-xs">
              <div className="flex flex-col gap-1">
                <span className="font-bold" style={{ color: 'var(--text-main)' }}>تفعيل السحب التلقائي لأخبار القنوات</span>
                <span className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>عند التفعيل، سيقوم السيرفر دورياً بسحب التحديثات من القنوات العامة المضافة كل 30 دقيقة (معطل افتراضياً).</span>
              </div>
              <input
                type="checkbox"
                checked={!!globalSettings.autoFetchTelegram}
                onChange={e => setGlobalSettings((s: any) => ({ ...s, autoFetchTelegram: e.target.checked }))}
                className="w-4 h-4 rounded border mt-0.5 cursor-pointer accent-[var(--color-imamu-brown)] shrink-0"
              />
            </label>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl p-6 border space-y-6" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div>
              <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-main)' }}>IMAP Configuration (Direct Email Auth)</h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Enable students to log in directly via university credentials.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b pb-5" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>IMAP Host</label>
                <input type="text" value={globalSettings.imapHost || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, imapHost: e.target.value }))} placeholder="outlook.office365.com" className="py-2 px-3 rounded-xl text-sm border w-full" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>IMAP Port</label>
                <input type="number" value={globalSettings.imapPort || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, imapPort: parseInt(e.target.value) || undefined }))} placeholder="993" className="py-2 px-3 rounded-xl text-sm border w-full" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col justify-end pb-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs" style={{ color: 'var(--text-muted)' }}>
                  <input type="checkbox" checked={globalSettings.imapSecure !== false} onChange={e => setGlobalSettings((s: any) => ({ ...s, imapSecure: e.target.checked }))} className="rounded" />
                  <span>Use Secure TLS</span>
                </label>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-sm mb-1" style={{ color: 'var(--text-main)' }}>SMTP Configuration (Verification Mails)</h4>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Required for email verifications and passcodes.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>SMTP Host</label>
                <input type="text" value={globalSettings.smtpHost || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, smtpHost: e.target.value }))} placeholder="smtp.gmail.com" className="py-2 px-3 rounded-xl text-sm border w-full" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>SMTP Port</label>
                <input type="number" value={globalSettings.smtpPort || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, smtpPort: parseInt(e.target.value) || undefined }))} placeholder="587" className="py-2 px-3 rounded-xl text-sm border w-full" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>SMTP Username</label>
                <input type="text" value={globalSettings.smtpUser || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, smtpUser: e.target.value }))} placeholder="example@gmail.com" className="py-2 px-3 rounded-xl text-sm border w-full" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>SMTP Password</label>
                <input type="password" value={globalSettings.smtpPass || ''} onChange={e => setGlobalSettings((s: any) => ({ ...s, smtpPass: e.target.value }))} placeholder="App Password" className="py-2 px-3 rounded-xl text-sm border w-full" style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }} />
              </div>
            </div>

            {/* Send Verification Code (Main Route: /api/auth/send-code) */}
            <div className="pt-6 mt-6 border-t space-y-4" style={{ borderColor: 'var(--border-color)' }}>
              <div>
                <h4 className="font-semibold text-sm mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                  <Mail className="w-4 h-4 text-[var(--color-imamu-accent)]" /> إرسال رمز التحقق عبر المسار الرئيسي (/api/auth/send-code)
                </h4>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>اختبار إرسال الرموز عبر المسار الرئيسي المعتمد بإنشاء الحسابات وتأكيد إعدادات SMTP.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>البريد الإلكتروني / الرقم الجامعي (Recipient) *</label>
                  <input
                    type="text"
                    value={testEmailRecipient}
                    onChange={e => setTestEmailRecipient(e.target.value)}
                    placeholder="441000000 أو student@sm.imamu.edu.sa"
                    className="py-2 px-3 rounded-xl text-sm border w-full"
                    style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>رمز مخصص (Custom Code - اختياري)</label>
                  <input
                    type="text"
                    value={testEmailCode}
                    onChange={e => setTestEmailCode(e.target.value)}
                    placeholder="توليد تلقائي 6 أرقام أو أدخل رمزك"
                    className="py-2 px-3 rounded-xl text-sm border w-full"
                    style={{ background: 'var(--bg-subtle)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div className="flex justify-start">
                <button
                  type="button"
                  disabled={isSendingTestEmail || !testEmailRecipient.trim()}
                  onClick={handleSendTestEmail}
                  className="flex items-center gap-2 bg-[var(--color-imamu-brown)] hover:bg-[var(--color-imamu-brown-dark)] text-white px-5 py-2 rounded-xl font-bold text-xs sm:text-sm transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSendingTestEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري إرسال الرمز...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال رمز التحقق</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end" style={{ borderColor: 'var(--border-color)' }}>
              <button
                className="btn-rise bg-[var(--color-imamu-brown)] text-white px-5 py-2 rounded-xl font-medium text-sm hover:bg-[var(--color-imamu-brown-light)] transition cursor-pointer"
                onClick={() => handlePostWithMethod('/api/admin/global_settings', 'PUT', globalSettings, () => toast('success', 'Settings saved!'))}
              >
                Save All Settings
              </button>
            </div>
          </div>

          {/* System Health Panel */}
          {health && (
            <div className="rounded-2xl p-5 border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <h4 className="font-semibold text-sm flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <Server className="w-4 h-4 text-[var(--color-imamu-accent)]" /> System Information
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Node Version</span>
                  <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-main)' }}>{health.nodeVersion || 'N/A'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Platform</span>
                  <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-main)' }}>{health.platform || 'N/A'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>RSS Memory</span>
                  <span className="text-sm font-mono font-medium" style={{ color: 'var(--text-main)' }}>
                    {health.memory?.rss !== undefined 
                      ? `${health.memory.rss} MB` 
                      : health.memoryUsage?.rss !== undefined 
                      ? `${Math.round(health.memoryUsage.rss / (1024 * 1024))} MB` 
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
