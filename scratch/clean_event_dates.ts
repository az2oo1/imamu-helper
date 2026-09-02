import 'dotenv/config';
import { getDb } from '../src/db/index';
import { events } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  const allEvents = await db.select().from(events);
  console.log(`Found ${allEvents.length} events in DB.`);

  for (const e of allEvents) {
    const desc = e.description || '';
    const matches = Array.from(desc.matchAll(/\((\d{2}\/\d{2}\/\d{4})م?\)/g)).map(m => m[1]);
    
    if (matches.length >= 2) {
      const cleanRange = `${matches[0]} - ${matches[1]}`;
      console.log(`Updating Event #${e.id}: "${e.title}"`);
      console.log(`  Old Desc: "${desc}"`);
      console.log(`  New Date Range: "${cleanRange}"`);

      // Clear the verbose Hijri description and set clean date string if appropriate
      let newDesc = desc;
      if (desc.includes('من ') && desc.includes('إلى ')) {
        // Strip the verbose Hijri period prefix and keep any actual extra notes, or replace
        newDesc = desc.replace(/من\s+[^)]+\)\s+إلى\s+[^)]+\)/g, '').replace(/-\s*الفصل\s+الدراسي\s+[^\s]+/g, '').trim();
      }

      await db.update(events).set({
        date: cleanRange,
        description: newDesc || null
      }).where(eq(events.id, e.id));
    }
  }

  console.log('Database events updated successfully.');
  process.exit(0);
}

main().catch(console.error);
