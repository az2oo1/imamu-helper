import type { Metadata } from 'next';
import { CalendarPage } from '../../src/views/CalendarPage';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'التقويم الأكاديمي والفعاليات',
  description: 'التقويم الأكاديمي الرسمي لجامعة الإمام محمد بن سعود الإسلامية - مواعيد بداية ونهاية الفصول، فترات الحذف والإضافة، ومواعيد إيداع المكافأة.',
  openGraph: {
    title: 'التقويم الأكاديمي والفعاليات | مساعد الإمام',
    description: 'التقويم الأكاديمي الرسمي لجامعة الإمام محمد بن سعود الإسلامية.',
    url: '/calendar',
  },
};

export default function Page() {
  return (
    <main className="flex-1 w-full flex flex-col h-[calc(100vh-65px)] max-h-[calc(100vh-65px)] min-h-0 overflow-hidden">
      <CalendarPage />
    </main>
  );
}
