import { Home } from '../src/views/Home';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <main className="flex-1 w-full flex flex-col min-h-0">
      <Home />
    </main>
  );
}
