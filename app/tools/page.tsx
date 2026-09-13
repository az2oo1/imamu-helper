import type { Metadata } from 'next';
import { Tools } from '../../src/views/Tools';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'الأدوات والخدمات الطلابية',
  description: 'مجموعة من الأدوات الطلابية الذكية لجامعة الإمام - حاسبة المعدل الفصلي والتراكمي، حاسبة الساعات المنجزة، والروابط السريعة.',
  openGraph: {
    title: 'الأدوات والخدمات الطلابية | مساعد الإمام',
    description: 'مجموعة من الأدوات الطلابية الذكية لجامعة الإمام - حاسبة المعدل الفصلي والتراكمي، حاسبة الساعات المنجزة.',
    url: '/tools',
  },
};

export default function Page() {
  return (
    <main className="flex-1 w-full mx-auto flex flex-col max-w-7xl p-4 sm:p-6 lg:p-8">
      <Tools />
    </main>
  );
}
