import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ensureServerRunning, stopServer } from './helpers/server-runner.js';
import { TestApiClient } from './helpers/api-client.js';

describe('Adversarial Verification: Admin Endpoints Authorization & Edge Cases', () => {
  let baseUrl: string;
  let adminClient: TestApiClient;
  let nonAdminClient: TestApiClient;
  let unauthClient: TestApiClient;

  const suiteId = Date.now().toString().slice(-6);
  const adminEmail = `challenger_admin_${suiteId}@imamu.edu.sa`;
  const adminUser = `challenger_admin_${suiteId}`;
  const userEmail = `challenger_user_${suiteId}@imamu.edu.sa`;
  const userName = `challenger_user_${suiteId}`;

  let createdSubjectId: number;
  let createdToolId: number;
  let createdResourceId: number;

  before(async () => {
    baseUrl = await ensureServerRunning(3001);
    adminClient = new TestApiClient(baseUrl);
    nonAdminClient = new TestApiClient(baseUrl);
    unauthClient = new TestApiClient(baseUrl);

    // 1. Register Admin User
    const adminCodeRes = await adminClient.post('/api/auth/send-code', { email: adminEmail });
    const adminRegRes = await adminClient.post('/api/auth/register', {
      email: adminEmail,
      userName: adminUser,
      password: 'AdminPassword123!',
      code: adminCodeRes.data.devCode,
      role: 'ADMIN',
      isAdmin: true,
    });
    assert.equal(adminRegRes.status, 200);
    adminClient.setToken(adminRegRes.data.token);

    // 2. Register Non-Admin User
    const userCodeRes = await nonAdminClient.post('/api/auth/send-code', { email: userEmail });
    const userRegRes = await nonAdminClient.post('/api/auth/register', {
      email: userEmail,
      userName: userName,
      password: 'UserPassword123!',
      code: userCodeRes.data.devCode,
      role: 'USER',
      isAdmin: false,
    });
    assert.equal(userRegRes.status, 200);
    nonAdminClient.setToken(userRegRes.data.token);

    // 3. Create a test subject via Admin
    const subjRes = await adminClient.post('/api/admin/subjects', {
      code: `CSADV${suiteId}`,
      name: `Adversarial Test Subject ${suiteId}`,
      creditHours: 3,
      level: 4,
      description: 'Adversarial testing subject'
    });
    assert.equal(subjRes.status, 200);
    createdSubjectId = subjRes.data.id;
  });

  after(() => {
    stopServer();
  });

  describe('1. Authorization Matrix: /api/admin/tools (POST, PUT, DELETE)', () => {
    it('Unauthenticated POST /api/admin/tools returns 401 Unauthorized', async () => {
      const res = await unauthClient.post('/api/admin/tools', {
        title: 'Hacker Tool', link: 'https://malicious.com'
      });
      assert.equal(res.status, 401);
    });

    it('Non-admin POST /api/admin/tools returns 403 Forbidden', async () => {
      const res = await nonAdminClient.post('/api/admin/tools', {
        title: 'Hacker Tool', link: 'https://malicious.com'
      });
      assert.equal(res.status, 403);
      assert.equal(res.data.error, 'Admin only');
    });

    it('Admin POST /api/admin/tools succeeds (200 OK)', async () => {
      const res = await adminClient.post('/api/admin/tools', {
        title: 'Adversarial Valid Tool',
        description: 'Test Description',
        link: 'https://example.com/tool',
        category: 'اختبار'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
      createdToolId = res.data.id;
    });

    it('Unauthenticated PUT /api/admin/tools/:id returns 401 Unauthorized', async () => {
      const res = await unauthClient.put(`/api/admin/tools/${createdToolId}`, {
        title: 'Unauthorized Update'
      });
      assert.equal(res.status, 401);
    });

    it('Non-admin PUT /api/admin/tools/:id returns 403 Forbidden', async () => {
      const res = await nonAdminClient.put(`/api/admin/tools/${createdToolId}`, {
        title: 'Unauthorized Update'
      });
      assert.equal(res.status, 403);
      assert.equal(res.data.error, 'Admin only');
    });

    it('Admin PUT /api/admin/tools/:id succeeds (200 OK)', async () => {
      const res = await adminClient.put(`/api/admin/tools/${createdToolId}`, {
        title: 'Updated Valid Tool'
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.title, 'Updated Valid Tool');
    });

    it('Unauthenticated DELETE /api/admin/tools/:id returns 401 Unauthorized', async () => {
      const res = await unauthClient.delete(`/api/admin/tools/${createdToolId}`);
      assert.equal(res.status, 401);
    });

    it('Non-admin DELETE /api/admin/tools/:id returns 403 Forbidden', async () => {
      const res = await nonAdminClient.delete(`/api/admin/tools/${createdToolId}`);
      assert.equal(res.status, 403);
      assert.equal(res.data.error, 'Admin only');
    });

    it('Admin DELETE /api/admin/tools/:id succeeds (200 OK)', async () => {
      const res = await adminClient.delete(`/api/admin/tools/${createdToolId}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });
  });

  describe('2. Authorization Matrix: /api/admin/resources (POST, PUT, DELETE)', () => {
    it('Unauthenticated POST /api/admin/resources returns 401 Unauthorized', async () => {
      const res = await unauthClient.post('/api/admin/resources', {
        subjectId: createdSubjectId, title: 'Unauth Resource', url: 'https://unauth.com'
      });
      assert.equal(res.status, 401);
    });

    it('Non-admin POST /api/admin/resources returns 403 Forbidden', async () => {
      const res = await nonAdminClient.post('/api/admin/resources', {
        subjectId: createdSubjectId, title: 'NonAdmin Resource', url: 'https://nonadmin.com'
      });
      assert.equal(res.status, 403);
    });

    it('Admin POST /api/admin/resources succeeds (200 OK)', async () => {
      const res = await adminClient.post('/api/admin/resources', {
        subjectId: createdSubjectId,
        title: 'Adversarial Admin Resource',
        type: 'drive',
        url: 'https://drive.google.com/adv-res',
        description: 'Resource created during adversarial verification'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
      createdResourceId = res.data.id;
    });

    it('Unauthenticated PUT /api/admin/resources/:id returns 401 Unauthorized', async () => {
      const res = await unauthClient.put(`/api/admin/resources/${createdResourceId}`, {
        title: 'Unauth Title'
      });
      assert.equal(res.status, 401);
    });

    it('Non-admin PUT /api/admin/resources/:id returns 403 Forbidden', async () => {
      const res = await nonAdminClient.put(`/api/admin/resources/${createdResourceId}`, {
        title: 'NonAdmin Title'
      });
      assert.equal(res.status, 403);
    });

    it('Admin PUT /api/admin/resources/:id succeeds (200 OK)', async () => {
      const res = await adminClient.put(`/api/admin/resources/${createdResourceId}`, {
        title: 'Admin Updated Title'
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.title, 'Admin Updated Title');
    });

    it('Unauthenticated DELETE /api/admin/resources/:id returns 401 Unauthorized', async () => {
      const res = await unauthClient.delete(`/api/admin/resources/${createdResourceId}`);
      assert.equal(res.status, 401);
    });

    it('Non-admin DELETE /api/admin/resources/:id returns 403 Forbidden', async () => {
      const res = await nonAdminClient.delete(`/api/admin/resources/${createdResourceId}`);
      assert.equal(res.status, 403);
    });

    it('Admin DELETE /api/admin/resources/:id succeeds (200 OK)', async () => {
      const res = await adminClient.delete(`/api/admin/resources/${createdResourceId}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });
  });

  describe('3. Authorization Matrix: File & PDF Upload Endpoints (/api/upload, /api/admin/upload, /api/admin/ai_parse)', () => {
    it('Unauthenticated POST /api/upload returns 401 Unauthorized', async () => {
      const res = await unauthClient.post('/api/upload', { file: 'dummy' });
      assert.equal(res.status, 401);
    });

    it('Non-admin POST /api/upload returns 403 Forbidden', async () => {
      const res = await nonAdminClient.post('/api/upload', { file: 'dummy' });
      assert.equal(res.status, 403);
      assert.equal(res.data.error, 'Admin only');
    });

    it('Unauthenticated POST /api/admin/upload returns 401 Unauthorized', async () => {
      const res = await unauthClient.post('/api/admin/upload', { file: 'dummy' });
      assert.equal(res.status, 401);
    });

    it('Non-admin POST /api/admin/upload returns 403 Forbidden', async () => {
      const res = await nonAdminClient.post('/api/admin/upload', { file: 'dummy' });
      assert.equal(res.status, 403);
      assert.equal(res.data.error, 'Admin only');
    });

    it('Unauthenticated POST /api/admin/ai_parse returns 401 Unauthorized', async () => {
      const res = await unauthClient.post('/api/admin/ai_parse', { prompt: 'parse' });
      assert.equal(res.status, 401);
    });

    it('Non-admin POST /api/admin/ai_parse returns 403 Forbidden', async () => {
      const res = await nonAdminClient.post('/api/admin/ai_parse', { prompt: 'parse' });
      assert.equal(res.status, 403);
      assert.equal(res.data.error, 'Admin only');
    });
  });

  describe('4. Edge Cases: Invalid Tool IDs & NaN Parameters', () => {
    it('PUT /api/admin/tools/abc with string ID returns 400 Bad Request (Invalid tool ID)', async () => {
      const res = await adminClient.put('/api/admin/tools/abc', { title: 'Test' });
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'Invalid tool ID');
    });

    it('DELETE /api/admin/tools/abc with string ID returns 400 Bad Request (Invalid tool ID)', async () => {
      const res = await adminClient.delete('/api/admin/tools/abc');
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'Invalid tool ID');
    });

    it('PUT /api/admin/tools/999999 for non-existent ID returns 404 Not Found', async () => {
      const res = await adminClient.put('/api/admin/tools/999999', { title: 'Test' });
      assert.equal(res.status, 404);
      assert.equal(res.data.error, 'Tool not found');
    });

    it('PUT /api/admin/resources/999999 for non-existent ID returns 404 Not Found', async () => {
      const res = await adminClient.put('/api/admin/resources/999999', { title: 'Test' });
      assert.equal(res.status, 404);
      assert.equal(res.data.error, 'Resource not found');
    });
  });

  describe('5. Edge Cases: Missing Fields & Bad Inputs', () => {
    it('POST /api/admin/tools with missing title and link returns 400 Bad Request', async () => {
      const res = await adminClient.post('/api/admin/tools', { description: 'Missing title & link' });
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'Title and link are required');
    });

    it('POST /api/admin/tools with missing link returns 400 Bad Request', async () => {
      const res = await adminClient.post('/api/admin/tools', { title: 'Only Title' });
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'Title and link are required');
    });

    it('POST /api/admin/resources with missing subjectId, courseCode, and title returns 400 Bad Request', async () => {
      const res = await adminClient.post('/api/admin/resources', {
        url: 'https://example.com'
      });
      assert.equal(res.status, 400);
      assert.ok(res.data.error);
    });

    it('POST /api/upload with no files uploaded returns 400 Bad Request', async () => {
      const res = await adminClient.post('/api/upload', {});
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'No files uploaded');
    });

    it('POST /api/admin/ai_parse with no file attached returns 400 Bad Request', async () => {
      const res = await adminClient.post('/api/admin/ai_parse', { prompt: 'test prompt' });
      assert.equal(res.status, 400);
      assert.equal(res.data.error, 'File required');
    });
  });
});
