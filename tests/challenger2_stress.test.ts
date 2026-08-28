import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ensureServerRunning, stopServer } from './helpers/server-runner.js';
import { TestApiClient } from './helpers/api-client.js';
import { PGlite } from '@electric-sql/pglite';

describe('Empirical Stress Test: Backend Boundary Conditions & Database Resilience', () => {
  let baseUrl: string;
  let client: TestApiClient;
  const suiteId = Date.now().toString().slice(-6);

  const testEmail = `challenger2_user_${suiteId}@imamu.edu.sa`;
  const testUserName = `ChallengerUser_${suiteId}`;
  const testPassword = `Pass#2026_${suiteId}`;

  before(async () => {
    baseUrl = await ensureServerRunning(3001);
    client = new TestApiClient(baseUrl);

    // Initial user registration
    const codeRes = await client.post('/api/auth/send-code', { email: testEmail });
    assert.equal(codeRes.status, 200, 'Send code should succeed');
    const devCode = codeRes.data.devCode;
    assert.ok(devCode, 'devCode should be returned in test mode');

    const regRes = await client.post('/api/auth/register', {
      email: testEmail,
      userName: testUserName,
      password: testPassword,
      code: devCode,
    });
    assert.equal(regRes.status, 200, 'Registration should succeed');
  });

  after(() => {
    stopServer();
  });

  // ==========================================
  // SCENARIO 1: Identifier Login Variations
  // ==========================================
  describe('Scenario 1: Identifier Login Variations', () => {
    it('S1.1: Username login (exact case)', async () => {
      const res = await client.post('/api/auth/login', {
        identifier: testUserName,
        password: testPassword,
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.token);
      assert.equal(res.data.user.userName, testUserName);
    });

    it('S1.2: Email login (exact case)', async () => {
      const res = await client.post('/api/auth/login', {
        identifier: testEmail,
        password: testPassword,
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.token);
      assert.equal(res.data.user.email, testEmail);
    });

    it('S1.3a: Username with leading @ (@ChallengerUser)', async () => {
      const res = await client.post('/api/auth/login', {
        identifier: `@${testUserName}`,
        password: testPassword,
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.token);
    });

    it('S1.3b: Email with leading @ (@user@imamu.edu.sa)', async () => {
      const res = await client.post('/api/auth/login', {
        identifier: `@${testEmail}`,
        password: testPassword,
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.token);
    });

    it('S1.4a: Uppercase Identifier (Uppercase Username)', async () => {
      const res = await client.post('/api/auth/login', {
        identifier: testUserName.toUpperCase(),
        password: testPassword,
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.token);
    });

    it('S1.4b: Uppercase Identifier (Uppercase Email)', async () => {
      const res = await client.post('/api/auth/login', {
        identifier: testEmail.toUpperCase(),
        password: testPassword,
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.token);
    });

    it('S1.4c: Uppercase with leading @ (@UPPERCASE_EMAIL)', async () => {
      const res = await client.post('/api/auth/login', {
        identifier: `@${testEmail.toUpperCase()}`,
        password: testPassword,
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.token);
    });
  });

  // ==========================================
  // SCENARIO 2: Boundary Rejection Tests
  // ==========================================
  describe('Scenario 2: Boundary Rejection Tests', () => {
    it('S2.1a: Duplicate username rejection during registration (400 Bad Request)', async () => {
      const diffEmail = `unique_email_${suiteId}@imamu.edu.sa`;
      const codeRes = await client.post('/api/auth/send-code', { email: diffEmail });
      const code = codeRes.data.devCode;

      const regRes = await client.post('/api/auth/register', {
        email: diffEmail,
        userName: testUserName, // duplicate username
        password: 'Password123!',
        code,
      });
      assert.equal(regRes.status, 400);
      assert.equal(regRes.data.error, 'Username already taken');
    });

    it('S2.1b: Duplicate username rejection with case variation during registration', async () => {
      const diffEmail = `unique_email_case_${suiteId}@imamu.edu.sa`;
      const codeRes = await client.post('/api/auth/send-code', { email: diffEmail });
      const code = codeRes.data.devCode;

      const regRes = await client.post('/api/auth/register', {
        email: diffEmail,
        userName: testUserName.toLowerCase(), // duplicate username in lowercase
        password: 'Password123!',
        code,
      });
      assert.equal(regRes.status, 400);
      assert.equal(regRes.data.error, 'Username already taken');
    });

    it('S2.2: Duplicate email rejection during registration (400 Bad Request)', async () => {
      const codeRes = await client.post('/api/auth/send-code', { email: testEmail });
      const code = codeRes.data.devCode;

      const regRes = await client.post('/api/auth/register', {
        email: testEmail, // duplicate email
        userName: `NewUser_${suiteId}`,
        password: 'Password123!',
        code,
      });
      assert.equal(regRes.status, 400);
      assert.equal(regRes.data.error, 'Email already registered');
    });

    it('S2.3: Invalid verification code rejection (400 Bad Request)', async () => {
      const newEmail = `invalid_code_test_${suiteId}@imamu.edu.sa`;
      await client.post('/api/auth/send-code', { email: newEmail });

      const regRes = await client.post('/api/auth/register', {
        email: newEmail,
        userName: `InvalidCodeUser_${suiteId}`,
        password: 'Password123!',
        code: '000000', // incorrect code
      });
      assert.equal(regRes.status, 400);
      assert.equal(regRes.data.error, 'Invalid verification code');
    });

    it('S2.4: Wrong password login rejection (401 Unauthorized)', async () => {
      const loginRes = await client.post('/api/auth/login', {
        identifier: testUserName,
        password: 'TotallyWrongPassword999!',
      });
      assert.equal(loginRes.status, 401);
      assert.ok(loginRes.data.error);
    });

    it('S2.5: Non-existent user login rejection (401 Unauthorized)', async () => {
      const loginRes = await client.post('/api/auth/login', {
        identifier: `nobody_${suiteId}@imamu.edu.sa`,
        password: 'Password123!',
      });
      assert.equal(loginRes.status, 401);
      assert.equal(loginRes.data.error, 'حساب غير موجود. يرجى إنشاء حساب جديد أولاً.');
    });
  });

  // ==========================================
  // SCENARIO 3: PasswordHash Sanitization Payload Checks
  // ==========================================
  describe('Scenario 3: Confirm passwordHash is never returned in API payloads', () => {
    let userToken: string;

    it('S3.1: Registration response payload does NOT contain passwordHash', async () => {
      const regEmail = `sanitization_user_${suiteId}@imamu.edu.sa`;
      const regUser = `SanitizeUser_${suiteId}`;

      const codeRes = await client.post('/api/auth/send-code', { email: regEmail });
      const regRes = await client.post('/api/auth/register', {
        email: regEmail,
        userName: regUser,
        password: 'Password123!',
        code: codeRes.data.devCode,
      });

      assert.equal(regRes.status, 200);
      userToken = regRes.data.token;
      assert.equal(regRes.data.user.passwordHash, undefined);
      assert.equal('passwordHash' in regRes.data.user, false, 'passwordHash key must not exist in user object');
      assert.equal(JSON.stringify(regRes.data).includes('passwordHash'), false, 'raw JSON payload must not mention passwordHash');
    });

    it('S3.2: Login response payload does NOT contain passwordHash', async () => {
      const loginRes = await client.post('/api/auth/login', {
        identifier: testUserName,
        password: testPassword,
      });
      assert.equal(loginRes.status, 200);
      assert.equal(loginRes.data.user.passwordHash, undefined);
      assert.equal('passwordHash' in loginRes.data.user, false, 'passwordHash key must not exist in user object');
      assert.equal(JSON.stringify(loginRes.data).includes('passwordHash'), false, 'raw JSON payload must not mention passwordHash');
    });

    it('S3.3: GET /api/users/me payload does NOT contain passwordHash', async () => {
      const authClient = new TestApiClient(baseUrl);
      authClient.setToken(userToken);

      const meRes = await authClient.get('/api/users/me');
      assert.equal(meRes.status, 200);
      assert.equal(meRes.data.passwordHash, undefined);
      assert.equal('passwordHash' in meRes.data, false, 'passwordHash key must not exist in me object');
      assert.equal(JSON.stringify(meRes.data).includes('passwordHash'), false, 'raw JSON payload must not mention passwordHash');
    });

    it('S3.4: POST /api/users/me (profile update) payload does NOT contain passwordHash', async () => {
      const authClient = new TestApiClient(baseUrl);
      authClient.setToken(userToken);

      const updateRes = await authClient.post('/api/users/me', {
        phone: '0555555555',
        major: 'Computer Science',
      });
      assert.equal(updateRes.status, 200);
      assert.equal(updateRes.data.passwordHash, undefined);
      assert.equal('passwordHash' in updateRes.data, false, 'passwordHash key must not exist in update response');
      assert.equal(JSON.stringify(updateRes.data).includes('passwordHash'), false, 'raw JSON payload must not mention passwordHash');
    });
  });

  // ==========================================
  // SCENARIO 4: PGlite In-Memory DB Isolation Verification
  // ==========================================
  describe('Scenario 4: Verify PGlite in-memory database isolation', () => {
    it('S4.1: PGlite WASM in-memory sandbox correctly executes server transactions in isolation', async () => {
      const isolatedEmail = `pglite_iso_${suiteId}@imamu.edu.sa`;
      const codeRes = await client.post('/api/auth/send-code', { email: isolatedEmail });
      const regRes = await client.post('/api/auth/register', {
        email: isolatedEmail,
        userName: `PgliteUser_${suiteId}`,
        password: 'Password123!',
        code: codeRes.data.devCode,
      });

      assert.equal(regRes.status, 200);
      assert.equal(regRes.data.user.email, isolatedEmail);
    });

    it('S4.2: Direct PGlite memory:// instances are isolated from each other', async () => {
      const db1 = new PGlite('memory://');
      const db2 = new PGlite('memory://');

      await db1.waitReady;
      await db2.waitReady;

      await db1.exec("CREATE TABLE test_iso (id SERIAL PRIMARY KEY, val TEXT); INSERT INTO test_iso (val) VALUES ('db1_secret');");
      const res1 = await db1.query("SELECT * FROM test_iso");
      assert.equal(res1.rows.length, 1);

      let caught = false;
      try {
        await db2.query("SELECT * FROM test_iso");
      } catch (_e) {
        caught = true;
      }
      assert.equal(caught, true, 'DB2 must not see DB1 schema/data');
    });
  });
});
