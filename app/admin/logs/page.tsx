import { redirect } from 'next/navigation';

export const metadata = {
  title: 'سجلات أحداث النظام - لوحة التحكم والإدارة',
};

export default function AdminLogsRoute() {
  redirect('/admin?tab=logs');
}
