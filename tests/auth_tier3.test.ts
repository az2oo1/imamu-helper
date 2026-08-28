import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ensureServerRunning, stopServer } from './helpers/server-runner.js';
import { TestApiClient } from './helpers/api-client.js';

describe('Tier 3: Cross-Feature & Infrastructure Tests', () => {
  let baseUrl: string;
  let client: TestApiClient;
  const suiteId = Date.now().toString().slice(-6);
  const tier3Email = `tier3_user_${suiteId}@imamu.edu.sa`;
  const tier3User = `tier3user_${suiteId}`;

  before(async () => {
    baseUrl = await ensureServerRunning(3001);
    client = new TestApiClient(baseUrl);

    // Register a test user for Tier 3 flows
    const sendCodeRes = await client.post('/api/auth/send-code', {
      email: tier3Email,
    });
    const devCode = sendCodeRes.data.devCode;

    await client.post('/api/auth/register', {
      email: tier3Email,
      userName: tier3User,
      password: 'Tier3Password123!',
      code: devCode,
    });
  });

  after(() => {
    stopServer();
  });

  it('T3.1a: Session rehydration via Authorization Bearer token header', async () => {
    const loginRes = await client.post('/api/auth/login', {
      email: tier3Email,
      password: 'Tier3Password123!',
    });
    assert.equal(loginRes.status, 200);

    const bearerClient = new TestApiClient(baseUrl);
    bearerClient.setToken(loginRes.data.token);

    const meRes = await bearerClient.get('/api/users/me');
    assert.equal(meRes.status, 200);
    assert.equal(meRes.data.email, tier3Email);
  });

  it('T3.1b: Session rehydration via Cookie header', async () => {
    const loginRes = await client.post('/api/auth/login', {
      email: tier3Email,
      password: 'Tier3Password123!',
    });
    assert.equal(loginRes.status, 200);

    // Create client that ONLY passes cookie (no Bearer token set)
    const cookieClient = new TestApiClient(baseUrl);
    cookieClient.setCookie(`token=${loginRes.data.token}`);

    const meRes = await cookieClient.get('/api/users/me');
    assert.equal(meRes.status, 200);
    assert.equal(meRes.data.email, tier3Email);
  });

  it('T3.2: 401 Recovery without infinite redirects or server crashes', async () => {
    const invalidClient = new TestApiClient(baseUrl);
    invalidClient.setToken('invalid_token_sample');

    const meRes = await invalidClient.get('/api/users/me');
    assert.equal(meRes.status, 401);
    assert.ok(meRes.data.error);

    // Client clears invalid token and logs in cleanly
    invalidClient.clearAuth();
    const loginRes = await invalidClient.post('/api/auth/login', {
      email: tier3Email,
      password: 'Tier3Password123!',
    });

    assert.equal(loginRes.status, 200);
    invalidClient.setToken(loginRes.data.token);

    const meResRecovered = await invalidClient.get('/api/users/me');
    assert.equal(meResRecovered.status, 200);
    assert.equal(meResRecovered.data.userName, tier3User);
  });

  it('T3.3: Dual DB resilience & schema compatibility during login cross-app query', async () => {
    // Attempting login for unknown user triggers cross-app SQL fallback cleanly without throwing 500 error
    const res = await client.post('/api/auth/login', {
      email: `nonexistent_${suiteId}@imamu.edu.sa`,
      password: 'SomePassword123!',
    });

    // Should gracefully return 401 rather than 500 DB error
    assert.equal(res.status, 401);
    assert.equal(res.data.error, 'حساب غير موجود. يرجى إنشاء حساب جديد أولاً.');
  });

  it('T3.4: Complete password reset lifecycle (invalidation of old credentials & re-authentication)', async () => {
    const resetEmail = `tier3_reset_${suiteId}@imamu.edu.sa`;
    const resetUser = `resetuser_${suiteId}`;

    // Register temporary account
    const sendCodeRes = await client.post('/api/auth/send-code', {
      email: resetEmail,
    });
    const code = sendCodeRes.data.devCode;

    await client.post('/api/auth/register', {
      email: resetEmail,
      userName: resetUser,
      password: 'InitialPassword123!',
      code: code,
    });

    // Request reset code
    const resetCodeRes = await client.post('/api/auth/send-code', {
      email: resetEmail,
    });
    const resetCode = resetCodeRes.data.devCode;

    // Reset password
    const resetRes = await client.post('/api/auth/reset-password', {
      email: resetEmail,
      code: resetCode,
      newPassword: 'BrandNewPassword999!',
    });
    assert.equal(resetRes.status, 200);

    // Verify initial password rejected
    const oldLogin = await client.post('/api/auth/login', {
      email: resetEmail,
      password: 'InitialPassword123!',
    });
    assert.equal(oldLogin.status, 401);

    // Verify new password accepted
    const newLogin = await client.post('/api/auth/login', {
      email: resetEmail,
      password: 'BrandNewPassword999!',
    });
    assert.equal(newLogin.status, 200);
    assert.ok(newLogin.data.token);
  });

  it('T3.5: Username availability checking endpoint GET /api/check-username', async () => {
    const loginRes = await client.post('/api/auth/login', {
      email: tier3Email,
      password: 'Tier3Password123!',
    });
    client.setToken(loginRes.data.token);

    // Check taken username
    const checkTaken = await client.get(`/api/check-username?username=${tier3User}`);
    assert.equal(checkTaken.status, 200);
    assert.equal(checkTaken.data.available, true); // True for current user

    const otherEmail = `other_user_${suiteId}@imamu.edu.sa`;
    const otherUser = `otheruser_${suiteId}`;

    // Register another user
    const sendCodeRes = await client.post('/api/auth/send-code', {
      email: otherEmail,
    });
    await client.post('/api/auth/register', {
      email: otherEmail,
      userName: otherUser,
      password: 'Password123!',
      code: sendCodeRes.data.devCode,
    });

    // Current user checks other user
    const checkOther = await client.get(`/api/check-username?username=${otherUser}`);
    assert.equal(checkOther.status, 200);
    assert.equal(checkOther.data.available, false);

    // Check completely unused username
    const checkUnused = await client.get(`/api/check-username?username=totally_unique_name_${suiteId}`);
    assert.equal(checkUnused.status, 200);
    assert.equal(checkUnused.data.available, true);
  });
});
