import { db } from './src/db/index';
import { news_sources } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function test() {
    try {
      await db.delete(news_sources).where(eq(news_sources.handle, '"Error saving record"'));
      console.log('done');
    } catch(e) {
        console.error("ERROR", e);
    }
}
test();
