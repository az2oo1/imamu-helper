import type { Metadata } from 'next';
import { Resources } from '../../src/views/Resources';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'المصادر والملفات الطلابية',
  description: 'المكتبة الأكاديمية الشاملة لمواد جامعة الإمام - اختبارات سابقة، ملخصات معتمدة، سلايدات، وروابط مجموعات التليجرام والواتساب.',
  openGraph: {
    title: 'المصادر والملفات الطلابية | مساعد الإمام',
    description: 'المكتبة الأكاديمية الشاملة لمواد جامعة الإمام - اختبارات سابقة، ملخصات معتمدة، وسلايدات.',
    url: '/resources',
  },
};

export default function Page() {
  return (
    <main className="flex-1 w-full mx-auto flex flex-col max-w-7xl p-4 sm:p-6 lg:p-8">
      <Resources />
    </main>
  );
}
