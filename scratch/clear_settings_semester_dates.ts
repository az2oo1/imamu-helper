import 'dotenv/config';
import { getDb } from '../src/db/index';
import { global_settings } from '../src/db/schema';

async function main() {
  const db = await getDb();
  await db.update(global_settings).set({
    semesterStartDate: null,
    semesterEndDate: null
  });
  console.log('Successfully cleared semesterStartDate and semesterEndDate from global_settings.');
  process.exit(0);
}

main().catch(console.error);
