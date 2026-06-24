import { db } from './src/db/index';
import { news, news_sources } from './src/db/schema';
import { sql } from 'drizzle-orm';

async function query() {
      const records = await db.select().from(news_sources);
      console.log('RECORDS:', records);
}
query();
