import type { Metadata } from 'next';
import { AnaPage } from '../../src/views/AnaPage';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'لوحتي الأكاديمية',
  description: 'لوحتك الأكاديمية الشخصية — جدولك، موادك، أساتذتك، ومواعيد الامتحانات في مكان واحد.',
  openGraph: {
    title: 'أنا | مساعد الإمام',
    description: 'لوحتك الأكاديمية الشخصية على مساعد الإمام.',
    url: '/ana',
  },
};

export default function Page() {
  return (
    <main className="flex-1 w-full mx-auto flex flex-col" dir="rtl">
      <AnaPage />
    </main>
  );
}
