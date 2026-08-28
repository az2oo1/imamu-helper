import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ensureServerRunning, stopServer } from './helpers/server-runner.js';
import { TestApiClient } from './helpers/api-client.js';

describe('Tier 2: Boundary & Edge Cases Tests', () => {
  let baseUrl: string;
  let client: TestApiClient;
  const suiteId = Date.now().toString().slice(-6);
  const baseEmail = `tier2_base_${suiteId}@imamu.edu.sa`;
  const baseUser = `tier2base_${suiteId}`;

  before(async () => {
    baseUrl = await ensureServerRunning(3001);
    client = new TestApiClient(baseUrl);

    // Register a base user for boundary testing
    const sendCodeRes = await client.post('/api/auth/send-code', {
      email: baseEmail,
    });
    const devCode = sendCodeRes.data.devCode;

    await client.post('/api/auth/register', {
      email: baseEmail,
      userName: baseUser,
      password: 'BasePassword123!',
      code: devCode,
    });
  });

  after(() => {
    stopServer();
  });

  it('T2.1: Rejects registration with missing required fields (400 Bad Request)', async () => {
    // Missing userName
    const res1 = await client.post('/api/auth/register', {
      email: `missing_user_${suiteId}@imamu.edu.sa`,
      password: 'Password123!',
      code: '123456',
    });
    assert.equal(res1.status, 400);

    // Missing code
    const res2 = await client.post('/api/auth/register', {
      email: `missing_code_${suiteId}@imamu.edu.sa`,
      userName: `nocode_${suiteId}`,
      password: 'Password123!',
    });
    assert.equal(res2.status, 400);
  });

  it('T2.2: Rejects registration with invalid verification code (400 Bad Request)', async () => {
    const badCodeEmail = `bad_code_${suiteId}@imamu.edu.sa`;
    await client.post('/api/auth/send-code', { email: badCodeEmail });
    
    const res = await client.post('/api/auth/register', {
      email: badCodeEmail,
      userName: `badcode_${suiteId}`,
      password: 'Password123!',
      code: '000000', // Invalid code
    });

    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'Invalid verification code');
  });

  it('T2.3a: Rejects duplicate email registration (400 Bad Request)', async () => {
    const sendCodeRes = await client.post('/api/auth/send-code', {
      email: baseEmail,
    });
    const devCode = sendCodeRes.data.devCode;

    const res = await client.post('/api/auth/register', {
      email: baseEmail,
      userName: `diffuser_${suiteId}`,
      password: 'Password123!',
      code: devCode,
    });

    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'Email already registered');
  });

  it('T2.3c: Rejects duplicate registration with case-differing username (400 Bad Request)', async () => {
    const diffCaseEmail = `tier2_diffcase_${suiteId}@imamu.edu.sa`;
    const sendCodeRes = await client.post('/api/auth/send-code', {
      email: diffCaseEmail,
    });
    const devCode = sendCodeRes.data.devCode;

    const res = await client.post('/api/auth/register', {
      email: diffCaseEmail,
      userName: baseUser.toUpperCase(),
      password: 'Password123!',
      code: devCode,
    });

    assert.equal(res.status, 400);
    assert.equal(res.data.error, 'Username already taken');
  });

  it('T2.3b: Rejects taken username during profile update (400 Bad Request)', async () => {
    const user2Email = `tier2_user2_${suiteId}@imamu.edu.sa`;
    const user2Name = `tier2user2_${suiteId}`;

    // Register second user
    const sendCodeRes = await client.post('/api/auth/send-code', {
      email: user2Email,
    });
    const devCode = sendCodeRes.data.devCode;

    const regRes = await client.post('/api/auth/register', {
      email: user2Email,
      userName: user2Name,
      password: 'Password123!',
      code: devCode,
    });

    client.setToken(regRes.data.token);

    // Attempt to update username to baseUser which belongs to baseEmail
    const updateRes = await client.post('/api/users/me', {
      userName: baseUser,
    });

    assert.equal(updateRes.status, 400);
    assert.equal(updateRes.data.error, 'Username already taken');
  });

  it('T2.4: Rejects login with wrong password (401 Unauthorized)', async () => {
    const res = await client.post('/api/auth/login', {
      email: baseEmail,
      password: 'WrongPassword999!',
    });

    assert.equal(res.status, 401);
    assert.ok(res.data.error);
  });

  it('T2.5: Rejects login for non-existent user (401 Unauthorized)', async () => {
    const res = await client.post('/api/auth/login', {
      email: `nonexistent_${suiteId}@imamu.edu.sa`,
      password: 'Password123!',
    });

    assert.equal(res.status, 401);
    assert.ok(res.data.error);
  });

  it('T2.6: Protected endpoint guards return 401 for unauthenticated requests', async () => {
    const unauthClient = new TestApiClient(baseUrl);

    const meRes = await unauthClient.get('/api/users/me');
    assert.equal(meRes.status, 401);

    const resRes = await unauthClient.get('/api/resources');
    assert.equal(resRes.status, 401);
  });

  it('T2.7: Rejects request with tampered/invalid JWT token (401 Unauthorized)', async () => {
    const badTokenClient = new TestApiClient(baseUrl);
    badTokenClient.setToken('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.signature');

    const res = await badTokenClient.get('/api/users/me');
    assert.equal(res.status, 401);
    assert.equal(res.data.error, 'Unauthorized: Invalid token');
  });

  it('T2.8: Ensures passwordHash is sanitized and never exposed in API responses', async () => {
    // Check login response
    const loginRes = await client.post('/api/auth/login', {
      email: baseEmail,
      password: 'BasePassword123!',
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.data.user.passwordHash, undefined);

    // Check GET /api/users/me response
    client.setToken(loginRes.data.token);
    const meRes = await client.get('/api/users/me');
    assert.equal(meRes.status, 200);
    assert.equal(meRes.data.passwordHash, undefined);
  });

  it('T2.9: Handles email/username normalization (case-insensitivity, leading @ trimming)', async () => {
    // Login with uppercase email and whitespace
    const uppercaseRes = await client.post('/api/auth/login', {
      email: ` ${baseEmail.toUpperCase()} `,
      password: 'BasePassword123!',
    });
    assert.equal(uppercaseRes.status, 200);

    // Login with @ prefix on username
    const atUsernameRes = await client.post('/api/auth/login', {
      email: `@${baseUser}`,
      password: 'BasePassword123!',
    });
    assert.equal(atUsernameRes.status, 200);
  });
});
