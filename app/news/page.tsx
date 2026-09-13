import type { Metadata } from 'next';
import { NewsPage } from '../../src/views/NewsPage';

export const metadata: Metadata = {
  title: 'أخبار وفعاليات الجامعة',
  description: 'متابعة حية لآخر أخبار وإعلانات وفعاليات جامعة الإمام محمد بن سعود الإسلامية وقنوات الكليات والنوادي الطلابية.',
  openGraph: {
    title: 'أخبار وفعاليات الجامعة | مساعد الإمام',
    description: 'متابعة حية لآخر أخبار وإعلانات وفعاليات جامعة الإمام محمد بن سعود الإسلامية.',
    url: '/news',
  },
};

export default function Page() {
  return (
    <main className="flex-1 w-full mx-auto flex flex-col max-w-full bg-transparent">
      <NewsPage />
    </main>
  );
}
