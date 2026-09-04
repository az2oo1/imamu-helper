import { Home } from '../src/views/Home';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <main className="flex-1 w-full mx-auto flex flex-col max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <Home />
    </main>
  );
}
