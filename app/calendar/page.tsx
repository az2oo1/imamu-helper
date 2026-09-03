import { CalendarPage } from '../../src/views/CalendarPage';

export default function Page() {
  return (
    <main className="flex-1 w-full flex flex-col h-[calc(100vh-65px)] max-h-[calc(100vh-65px)] min-h-0 overflow-hidden">
      <CalendarPage />
    </main>
  );
}
