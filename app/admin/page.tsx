import { AdminPage } from '../../src/views/AdminPage';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <main className="flex-1 w-full mx-auto flex flex-col max-w-full p-4 sm:p-6 lg:p-8">
      <AdminPage />
    </main>
  );
}
