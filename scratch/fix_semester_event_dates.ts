import 'dotenv/config';
import { getDb } from '../src/db/index';
import { events } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  const allEvents = await db.select().from(events);
  
  for (const e of allEvents) {
    if (e.isSemesterStart || e.isSemesterEnd) {
      console.log(`Checking Semester Event #${e.id}: "${e.title}" | Current Date: "${e.date}"`);
      if (e.date && e.date.includes('/')) {
        const firstPart = e.date.split('-')[0].trim();
        const parts = firstPart.split('/');
        if (parts.length === 3) {
          const isoDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          console.log(`  Converting "${e.date}" -> ISO Date: "${isoDate}"`);
          await db.update(events).set({ date: isoDate }).where(eq(events.id, e.id));
        }
      }
    }
  }

  console.log('Finished updating semester events dates.');
  process.exit(0);
}

main().catch(console.error);
