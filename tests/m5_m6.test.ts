import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ensureServerRunning, stopServer } from './helpers/server-runner.js';
import { TestApiClient } from './helpers/api-client.js';

describe('Milestone 5 & Milestone 6 Tests', () => {
  let baseUrl: string;
  let client: TestApiClient;
  let adminClient: TestApiClient;
  const suiteId = Date.now().toString().slice(-6);

  const regularEmail = `user_m56_${suiteId}@imamu.edu.sa`;
  const regularUser = `user_m56_${suiteId}`;

  const adminEmail = `admin_m56_${suiteId}@imamu.edu.sa`;
  const adminUser = `admin_m56_${suiteId}`;

  let createdToolId: number | string;

  before(async () => {
    baseUrl = await ensureServerRunning(3001);
    client = new TestApiClient(baseUrl);
    adminClient = new TestApiClient(baseUrl);

    // 1. Register Admin User
    const codeAdmin = (await adminClient.post('/api/auth/send-code', { email: adminEmail })).data.devCode;
    const adminReg = await adminClient.post('/api/auth/register', {
      email: adminEmail,
      userName: adminUser,
      password: 'AdminPassword123!',
      code: codeAdmin,
      role: 'ADMIN',
      isAdmin: true,
    });
    adminClient.setToken(adminReg.data.token);

    // 2. Register Regular User
    const codeUser = (await client.post('/api/auth/send-code', { email: regularEmail })).data.devCode;
    const userReg = await client.post('/api/auth/register', {
      email: regularEmail,
      userName: regularUser,
      password: 'UserPassword123!',
      code: codeUser,
      role: 'USER',
      isAdmin: false,
    });
    client.setToken(userReg.data.token);
  });

  after(() => {
    stopServer();
  });

  it('GET /api/tools is public and returns array of tools', async () => {
    const res = await client.get('/api/tools');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.data));
  });

  it('POST /api/upload returns 403 Forbidden for non-admin user', async () => {
    const res = await client.post('/api/upload', { dummy: 'data' });
    assert.equal(res.status, 403);
    assert.equal(res.data.error, 'Admin only');
  });

  it('POST /api/admin/tools returns 403 Forbidden for non-admin user', async () => {
    const res = await client.post('/api/admin/tools', {
      title: 'Forbidden Tool',
      link: 'https://example.com'
    });
    assert.equal(res.status, 403);
    assert.equal(res.data.error, 'Admin only');
  });

  it('POST /api/admin/tools creates tool when user is admin', async () => {
    const res = await adminClient.post('/api/admin/tools', {
      title: 'حاسبة الساعات الدراسية',
      description: 'أداة لحساب عدد الساعات المنجزة',
      category: 'خدمات أكاديمية',
      link: 'https://example.com/hours'
    });
    assert.equal(res.status, 200);
    assert.ok(res.data.id);
    assert.equal(res.data.title, 'حاسبة الساعات الدراسية');
    createdToolId = res.data.id;
  });

  it('PUT /api/admin/tools/:id updates tool when user is admin', async () => {
    assert.ok(createdToolId);
    const res = await adminClient.request(`/api/admin/tools/${createdToolId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'حاسبة الساعات الدراسية (محدث)',
        description: 'وصف جديد'
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.title, 'حاسبة الساعات الدراسية (محدث)');
  });

  it('DELETE /api/admin/tools/:id deletes tool when user is admin', async () => {
    assert.ok(createdToolId);
    const res = await adminClient.delete(`/api/admin/tools/${createdToolId}`);
    assert.equal(res.status, 200);
    assert.equal(res.data.success, true);
  });
});
