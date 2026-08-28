import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ensureServerRunning, stopServer } from './helpers/server-runner.js';
import { TestApiClient } from './helpers/api-client.js';

describe('Tier 4: Real-World Application Scenarios', () => {
  let baseUrl: string;
  let client: TestApiClient;

  before(async () => {
    baseUrl = await ensureServerRunning(3001);
    client = new TestApiClient(baseUrl);
  });

  after(() => {
    stopServer();
  });

  it('T4.1: Full Student Onboarding & Registration Lifecycle', async () => {
    const id = Date.now().toString().slice(-6);
    const studentEmail = `student_journey_${id}@imamu.edu.sa`;
    const userName = `studentjourney_${id}`;

    // Step 1: Request Verification Code
    const codeRes = await client.post('/api/auth/send-code', { email: studentEmail });
    assert.equal(codeRes.status, 200);
    const verificationCode = codeRes.data.devCode;
    assert.ok(verificationCode, 'Expected devCode for testing environment');

    // Step 2: Register Account
    const regRes = await client.post('/api/auth/register', {
      email: studentEmail,
      userName: userName,
      password: 'StudentPass123!',
      code: verificationCode,
      phone: '0567891234',
    });
    assert.equal(regRes.status, 200);
    assert.ok(regRes.data.token);
    assert.equal(regRes.data.user.email, studentEmail);

    // Step 3: Rehydrate Session & Verify Profile
    client.setToken(regRes.data.token);
    const meRes = await client.get('/api/users/me');
    assert.equal(meRes.status, 200);
    assert.equal(meRes.data.email, studentEmail);
    assert.equal(meRes.data.userName, userName);

    // Step 4: Update Profile Information (Major, GPA, Finished Hours)
    const updateRes = await client.post('/api/users/me', {
      major: 'الهندسة',
      currentGpa: 4.9,
      finishedHours: 72,
    });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.data.major, 'الهندسة');
    assert.equal(Number(updateRes.data.currentGpa), 4.9);

    // Step 5: Access Protected Academic Resources
    const resRes = await client.get('/api/resources');
    assert.equal(resRes.status, 200);
    assert.ok(Array.isArray(resRes.data));

    // Step 6: Logout / Clear Auth and verify protection restored
    client.clearAuth();
    const protectedCheck = await client.get('/api/users/me');
    assert.equal(protectedCheck.status, 401);
  });

  it('T4.2: Full Account Recovery & Password Reset Journey', async () => {
    const id = Date.now().toString().slice(-6);
    const email = `recovery_journey_${id}@imamu.edu.sa`;
    const userName = `recuser_${id}`;

    // Step 1: Initial setup & registration
    const codeRes = await client.post('/api/auth/send-code', { email });
    await client.post('/api/auth/register', {
      email,
      userName,
      password: 'OriginalPassword123!',
      code: codeRes.data.devCode,
    });

    // Step 2: Forgotten password attempt (Fails with 401)
    const badLogin = await client.post('/api/auth/login', {
      email,
      password: 'WrongForgottenPassword!',
    });
    assert.equal(badLogin.status, 401);

    // Step 3: Request Password Reset Code
    const resetCodeRes = await client.post('/api/auth/send-code', { email });
    assert.equal(resetCodeRes.status, 200);
    const resetCode = resetCodeRes.data.devCode;

    // Step 4: Attempt Reset with Invalid Code (Fails with 400)
    const badResetRes = await client.post('/api/auth/reset-password', {
      email,
      code: '999999',
      newPassword: 'RecoveredPassword123!',
    });
    assert.equal(badResetRes.status, 400);

    // Step 5: Perform Reset with Valid Code (Succeeds with 200)
    const validResetRes = await client.post('/api/auth/reset-password', {
      email,
      code: resetCode,
      newPassword: 'RecoveredPassword123!',
    });
    assert.equal(validResetRes.status, 200);
    assert.equal(validResetRes.data.success, true);

    // Step 6: Login with New Password (Succeeds with 200)
    const newLoginRes = await client.post('/api/auth/login', {
      email,
      password: 'RecoveredPassword123!',
    });
    assert.equal(newLoginRes.status, 200);
    assert.ok(newLoginRes.data.token);
  });

  it('T4.3: High Concurrency & Parallel Session Rehydration', async () => {
    const id = Date.now().toString().slice(-6);
    const email = `concurrent_${id}@imamu.edu.sa`;
    const userName = `concurrent_${id}`;

    // Register user
    const codeRes = await client.post('/api/auth/send-code', { email });
    const regRes = await client.post('/api/auth/register', {
      email,
      userName,
      password: 'Password123!',
      code: codeRes.data.devCode,
    });
    assert.equal(regRes.status, 200);
    const token = regRes.data.token;

    // Fire 10 simultaneous parallel requests fetching /api/users/me
    const requests = Array.from({ length: 10 }).map(async () => {
      const parallelClient = new TestApiClient(baseUrl);
      parallelClient.setToken(token);
      return parallelClient.get('/api/users/me');
    });

    const results = await Promise.all(requests);

    // Verify every single request returned 200 OK without race conditions
    for (const res of results) {
      assert.equal(res.status, 200);
      assert.equal(res.data.email, email);
      assert.equal(res.data.userName, userName);
    }
  });

  it('T4.4: Protected Route Auth Guards Matrix Simulation', async () => {
    const unauthenticatedClient = new TestApiClient(baseUrl);

    // 1. Unauthenticated State
    const meUnauth = await unauthenticatedClient.get('/api/users/me');
    assert.equal(meUnauth.status, 401);

    const resUnauth = await unauthenticatedClient.get('/api/resources');
    assert.equal(resUnauth.status, 401);

    const checkUnauth = await unauthenticatedClient.get('/api/check-username?username=test');
    assert.equal(checkUnauth.status, 401);

    // 2. Authenticated Student State
    const id = Date.now().toString().slice(-6);
    const email = `guard_student_${id}@imamu.edu.sa`;
    const userName = `guard_${id}`;

    const codeRes = await client.post('/api/auth/send-code', { email });
    const regRes = await client.post('/api/auth/register', {
      email,
      userName,
      password: 'Password123!',
      code: codeRes.data.devCode,
    });
    assert.equal(regRes.status, 200);

    const studentClient = new TestApiClient(baseUrl);
    studentClient.setToken(regRes.data.token);

    const meAuth = await studentClient.get('/api/users/me');
    assert.equal(meAuth.status, 200);
    assert.equal(meAuth.data.userName, userName);

    const resAuth = await studentClient.get('/api/resources');
    assert.equal(resAuth.status, 200);

    const checkAuth = await studentClient.get('/api/check-username?username=testname');
    assert.equal(checkAuth.status, 200);
  });
});
