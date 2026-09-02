import 'dotenv/config';
import { getDb } from '../src/db/index';
import { events, global_settings } from '../src/db/schema';

async function main() {
  const db = await getDb();
  
  const allSettings = await db.select().from(global_settings);
  console.log('=== GLOBAL SETTINGS TABLE ===');
  console.log(allSettings);

  const allEvents = await db.select().from(events);
  console.log('\n=== ALL EVENTS IN DB ===');
  for (const e of allEvents) {
    console.log(`ID: ${e.id} | Title: "${e.title}" | Date: "${e.date}" | isStart: ${e.isSemesterStart} | isEnd: ${e.isSemesterEnd}`);
  }

  process.exit(0);
}

main().catch(console.error);
