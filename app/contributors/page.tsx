import { ContributorsPage } from '../../src/views/ContributorsPage';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'المساهمون وتقدير فريق العمل | مساعد الإمام',
  description: 'لوحة التقدير والشرف لفريق العمل والمساهمين والقائمين على تطوير وتأثيث منصة مساعد الإمام.',
};

export default function Page() {
  return <ContributorsPage />;
}
