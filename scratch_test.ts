import { getDb } from './src/db/index';
import { users, verification_codes } from './src/db/schema';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

async function testRegister() {
  const db = await getDb();
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  try {
    const email = `test_reg_${Date.now()}@imamu.edu.sa`;
    const code = '123456';
    
    console.log('1. Inserting verification code...');
    await db.insert(verification_codes).values({
      email,
      code,
      expiresAt: new Date(Date.now() + 10 * 60000),
    });
    console.log('Verification code inserted.');
    
    console.log('2. Querying verification codes...');
    const codeRecords = await db.select().from(verification_codes)
      .where(eq(verification_codes.email, email))
      .orderBy(desc(verification_codes.createdAt));
    console.log('Query succeeded. Records found:', codeRecords.length);
    
    if (codeRecords.length > 0) {
      const latestCode = codeRecords[0];
      console.log('latestCode.expiresAt value:', latestCode.expiresAt);
      console.log('latestCode.expiresAt type:', typeof latestCode.expiresAt, latestCode.expiresAt instanceof Date ? 'is Date' : 'not Date');
    }
    
    console.log('3. Inserting user...');
    await db.insert(users).values({
      uid: crypto.randomUUID(),
      email,
      passwordHash: 'hash',
      phone: '0500000000',
      userName: 'testregister',
    });
    console.log('User inserted successfully.');
    
  } catch (err: any) {
    console.error('REGISTER FLOW FAILED:', err.stack || err);
  }
  process.exit(0);
}

testRegister();
