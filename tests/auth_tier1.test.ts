import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ensureServerRunning, stopServer } from './helpers/server-runner.js';
import { TestApiClient } from './helpers/api-client.js';

describe('Tier 1: Feature Coverage Tests', () => {
  let baseUrl: string;
  let client: TestApiClient;
  const suiteId = Date.now().toString().slice(-4) + Math.random().toString(36).slice(2, 6);
  const studentEmail = `tier1_student_${suiteId}@imamu.edu.sa`;
  const userName = `tier1student_${suiteId}`;
  const googleEmail = `tier1_google_${suiteId}@gmail.com`;
  const googleUser = `tier1google_${suiteId}`;

  before(async () => {
    baseUrl = await ensureServerRunning(3001);
    client = new TestApiClient(baseUrl);
  });

  after(() => {
    stopServer();
  });

  it('T1.1: Health check endpoint GET /api/health', async () => {
    const { status, data } = await client.get('/api/health');
    assert.equal(status, 200);
    assert.equal(data.status, 'ok');
  });

  it('T1.2: Request verification code via POST /api/auth/send-code', async () => {
    const { status, data } = await client.post('/api/auth/send-code', {
      email: studentEmail,
    });
    assert.equal(status, 200);
    assert.equal(data.success, true);
    assert.ok(data.devCode || data.message);
  });

  it('T1.3a: Register user with studentEmail (imamu.edu.sa domain)', async () => {
    const sendCodeRes = await client.post('/api/auth/send-code', {
      email: studentEmail,
    });
    const devCode = sendCodeRes.data.devCode;

    const { status, data } = await client.post('/api/auth/register', {
      email: studentEmail,
      userName: userName,
      password: 'Password123!',
      code: devCode,
      phone: '0551112233',
    });

    assert.equal(status, 200);
    assert.ok(data.token);
    assert.ok(data.user);
    assert.equal(data.user.email, studentEmail);
    assert.equal(data.user.userName, userName);
  });

  it('T1.3b: Register user with googleEmail (gmail.com domain)', async () => {
    const sendCodeRes = await client.post('/api/auth/send-code', {
      email: googleEmail,
    });
    const devCode = sendCodeRes.data.devCode;

    const { status, data } = await client.post('/api/auth/register', {
      email: googleEmail,
      userName: googleUser,
      password: 'GooglePassword123!',
      code: devCode,
    });

    assert.equal(status, 200);
    assert.ok(data.token);
    assert.ok(data.user);
    assert.equal(data.user.email, googleEmail);
  });

  it('T1.4: Login using registered Email', async () => {
    const { status, data } = await client.post('/api/auth/login', {
      email: studentEmail,
      password: 'Password123!',
    });

    assert.equal(status, 200);
    assert.ok(data.token);
    assert.equal(data.user.email, studentEmail);
    assert.ok(client.getCookie('token'));
  });

  it('T1.5: Login using registered Username', async () => {
    const { status, data } = await client.post('/api/auth/login', {
      email: userName,
      password: 'Password123!',
    });

    assert.equal(status, 200);
    assert.ok(data.token);
    assert.equal(data.user.userName, userName);
  });

  it('T1.5b: Login with mixed-case username vs lowercase input', async () => {
    const mixedCaseEmail = `tier1_mixed_${suiteId}@imamu.edu.sa`;
    const mixedCaseUser = `MixedCaseUser_${suiteId}`;
    
    const sendCodeRes = await client.post('/api/auth/send-code', {
      email: mixedCaseEmail,
    });
    const devCode = sendCodeRes.data.devCode;

    const regRes = await client.post('/api/auth/register', {
      email: mixedCaseEmail,
      userName: mixedCaseUser,
      password: 'MixedPassword123!',
      code: devCode,
    });
    assert.equal(regRes.status, 200);

    // Login using lowercase input for mixed-case registered username
    const { status, data } = await client.post('/api/auth/login', {
      email: mixedCaseUser.toLowerCase(),
      password: 'MixedPassword123!',
    });

    assert.equal(status, 200);
    assert.ok(data.token);
    assert.equal(data.user.userName, mixedCaseUser);
  });

  it('T1.6: Fetch user profile via GET /api/users/me with Auth token', async () => {
    // Login to get token
    const loginRes = await client.post('/api/auth/login', {
      email: userName,
      password: 'Password123!',
    });
    client.setToken(loginRes.data.token);

    const { status, data } = await client.get('/api/users/me');
    assert.equal(status, 200);
    assert.ok(data);
    assert.equal(data.userName, userName);
    assert.equal(data.email, studentEmail);
  });

  it('T1.7: Update profile via POST /api/users/me', async () => {
    const loginRes = await client.post('/api/auth/login', {
      email: userName,
      password: 'Password123!',
    });
    client.setToken(loginRes.data.token);

    const updateRes = await client.post('/api/users/me', {
      phone: '0509998877',
      major: 'علوم الحاسب',
      currentGpa: 4.85,
      finishedHours: 45,
    });

    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.data.phone, '0509998877');
    assert.equal(updateRes.data.major, 'علوم الحاسب');
  });

  it('T1.8: Password reset flow (request code -> reset -> verify new login)', async () => {
    const sendCodeRes = await client.post('/api/auth/send-code', {
      email: studentEmail,
    });
    const code = sendCodeRes.data.devCode;

    const resetRes = await client.post('/api/auth/reset-password', {
      email: studentEmail,
      code: code,
      newPassword: 'UpdatedPassword789!',
    });

    assert.equal(resetRes.status, 200);
    assert.equal(resetRes.data.success, true);

    // Verify old password fails
    const oldLoginRes = await client.post('/api/auth/login', {
      email: studentEmail,
      password: 'Password123!',
    });
    assert.equal(oldLoginRes.status, 401);

    // Verify new password succeeds
    const newLoginRes = await client.post('/api/auth/login', {
      email: studentEmail,
      password: 'UpdatedPassword789!',
    });
    assert.equal(newLoginRes.status, 200);
    assert.ok(newLoginRes.data.token);
  });

  it('T1.9: Fetch protected resources via GET /api/resources', async () => {
    const loginRes = await client.post('/api/auth/login', {
      email: googleEmail,
      password: 'GooglePassword123!',
    });
    client.setToken(loginRes.data.token);

    const { status, data } = await client.get('/api/resources');
    assert.equal(status, 200);
    assert.ok(Array.isArray(data));
  });
});
