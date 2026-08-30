import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ensureServerRunning, stopServer } from './helpers/server-runner.js';
import { TestApiClient } from './helpers/api-client.js';

describe('Milestones 7 & 8: Resource Backend/Frontend CRUD & Whole-App Admin Protection', () => {
  let baseUrl: string;
  let adminClient: TestApiClient;
  let nonAdminClient: TestApiClient;
  let unauthClient: TestApiClient;

  const suiteId = Date.now().toString().slice(-4) + Math.random().toString(36).slice(2, 6);
  const adminEmail = `admin_m78_${suiteId}@imamu.edu.sa`;
  const adminUser = `adminm78_${suiteId}`;
  const userEmail = `user_m78_${suiteId}@imamu.edu.sa`;
  const userName = `userm78_${suiteId}`;

  let createdSubjectId: number;
  let createdResourceId: number;

  before(async () => {
    baseUrl = await ensureServerRunning(3001);
    adminClient = new TestApiClient(baseUrl);
    nonAdminClient = new TestApiClient(baseUrl);
    unauthClient = new TestApiClient(baseUrl);

    // 1. Register first user -> becomes ADMIN automatically
    const adminCodeRes = await adminClient.post('/api/auth/send-code', { email: adminEmail });
    const adminRegRes = await adminClient.post('/api/auth/register', {
      email: adminEmail,
      userName: adminUser,
      password: 'AdminPassword123!',
      code: adminCodeRes.data.devCode,
      role: 'ADMIN'
    });
    assert.equal(adminRegRes.status, 200);
    assert.ok(adminRegRes.data.token);
    assert.equal(adminRegRes.data.user.isAdmin, true);
    adminClient.setToken(adminRegRes.data.token);

    // 2. Register second user -> becomes regular USER (non-admin)
    const userCodeRes = await nonAdminClient.post('/api/auth/send-code', { email: userEmail });
    const userRegRes = await nonAdminClient.post('/api/auth/register', {
      email: userEmail,
      userName: userName,
      password: 'UserPassword123!',
      code: userCodeRes.data.devCode
    });
    assert.equal(userRegRes.status, 200);
    assert.ok(userRegRes.data.token);
    assert.equal(userRegRes.data.user.isAdmin, false);
    nonAdminClient.setToken(userRegRes.data.token);

    // 3. Create a test subject via Admin for resource testing
    const subjRes = await adminClient.post('/api/admin/subjects', {
      code: `CS${suiteId}`,
      name: `Test Subject ${suiteId}`,
      creditHours: 3,
      level: 5,
      description: 'Integration test subject'
    });
    assert.equal(subjRes.status, 200);
    createdSubjectId = subjRes.data.id;
  });

  after(() => {
    stopServer();
  });

  describe('Resource CRUD API Endpoints with Admin Guarding', () => {
    it('Admin user can create a resource via POST /api/admin/resources', async () => {
      const res = await adminClient.post('/api/admin/resources', {
        subjectId: createdSubjectId,
        title: 'Initial Test Resource',
        type: 'drive',
        url: 'https://drive.google.com/test-resource',
        description: 'Resource created by admin'
      });

      assert.equal(res.status, 200);
      assert.ok(res.data.id);
      assert.equal(res.data.title, 'Initial Test Resource');
      assert.equal(res.data.subjectId, createdSubjectId);
      createdResourceId = res.data.id;
    });

    it('Authenticated users can fetch resources via GET /api/resources', async () => {
      const res = await nonAdminClient.get('/api/resources');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
      const found = res.data.find((item: any) => item.id === createdResourceId || item.title === 'Initial Test Resource');
      assert.ok(found);
    });

    it('Admin user can update a resource via PUT /api/admin/resources/:id', async () => {
      const res = await adminClient.put(`/api/admin/resources/${createdResourceId}`, {
        title: 'Updated Test Resource Title',
        type: 'summary',
        url: 'https://drive.google.com/updated-resource',
        description: 'Updated description'
      });

      assert.equal(res.status, 200);
      assert.equal(res.data.id, createdResourceId);
      assert.equal(res.data.title, 'Updated Test Resource Title');
      assert.equal(res.data.type, 'summary');
    });

    it('Non-admin user cannot create a resource (403 Forbidden)', async () => {
      const res = await nonAdminClient.post('/api/admin/resources', {
        subjectId: createdSubjectId,
        title: 'Unauthorized Resource Attempt',
        type: 'drive',
        url: 'https://drive.google.com/unauthorized'
      });

      assert.equal(res.status, 403);
      assert.ok(res.data.error);
    });

    it('Unauthenticated user cannot create a resource (401 Unauthorized)', async () => {
      const res = await unauthClient.post('/api/admin/resources', {
        subjectId: createdSubjectId,
        title: 'Unauthenticated Resource Attempt',
        type: 'drive',
        url: 'https://drive.google.com/unauth'
      });

      assert.equal(res.status, 401);
    });

    it('Non-admin user cannot update a resource (403 Forbidden)', async () => {
      const res = await nonAdminClient.put(`/api/admin/resources/${createdResourceId}`, {
        title: 'Hacked Title'
      });

      assert.equal(res.status, 403);
      assert.ok(res.data.error);
    });

    it('Unauthenticated user cannot update a resource (401 Unauthorized)', async () => {
      const res = await unauthClient.put(`/api/admin/resources/${createdResourceId}`, {
        title: 'Hacked Title'
      });

      assert.equal(res.status, 401);
    });

    it('Non-admin user cannot delete a resource (403 Forbidden)', async () => {
      const res = await nonAdminClient.delete(`/api/admin/resources/${createdResourceId}`);
      assert.equal(res.status, 403);
      assert.ok(res.data.error);
    });

    it('Unauthenticated user cannot delete a resource (401 Unauthorized)', async () => {
      const res = await unauthClient.delete(`/api/admin/resources/${createdResourceId}`);
      assert.equal(res.status, 401);
    });

    it('Admin user can delete a resource via DELETE /api/admin/resources/:id', async () => {
      const res = await adminClient.delete(`/api/admin/resources/${createdResourceId}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);

      // Verify deletion in list
      const listRes = await adminClient.get('/api/resources');
      const found = listRes.data.find((item: any) => item.id === createdResourceId);
      assert.equal(found, undefined);
    });
  });

  describe('Whole-App Admin Route Protection Verification', () => {
    it('Guards GET /api/admin/logs against non-admin users (403 Forbidden)', async () => {
      const res = await nonAdminClient.get('/api/admin/logs');
      assert.equal(res.status, 403);
    });

    it('Guards GET /api/admin/logs/stats against non-admin users (403 Forbidden)', async () => {
      const res = await nonAdminClient.get('/api/admin/logs/stats');
      assert.equal(res.status, 403);
    });

    it('Guards DELETE /api/admin/logs/clear against non-admin users (403 Forbidden)', async () => {
      const res = await nonAdminClient.delete('/api/admin/logs/clear');
      assert.equal(res.status, 403);
    });

    it('Guards POST /api/admin/news_sources against non-admin users (403 Forbidden)', async () => {
      const res = await nonAdminClient.post('/api/admin/news_sources', { handle: 'fake_source' });
      assert.equal(res.status, 403);
    });

    it('Guards POST /api/admin/majors against non-admin users (403 Forbidden)', async () => {
      const res = await nonAdminClient.post('/api/admin/majors', { name: 'Fake Major' });
      assert.equal(res.status, 403);
    });

    it('Guards POST /api/admin/subjects against non-admin users (403 Forbidden)', async () => {
      const res = await nonAdminClient.post('/api/admin/subjects', { code: 'CS9999', name: 'Fake Subject' });
      assert.equal(res.status, 403);
    });

    it('Guards POST /api/admin/tools against non-admin users (403 Forbidden)', async () => {
      const res = await nonAdminClient.post('/api/admin/tools', { title: 'Fake Tool', link: 'https://example.com' });
      assert.equal(res.status, 403);
    });

    it('Guards PUT /api/admin/tools/1 against non-admin users (403 Forbidden)', async () => {
      const res = await nonAdminClient.put('/api/admin/tools/1', { title: 'Updated Fake Tool' });
      assert.equal(res.status, 403);
    });

    it('Guards DELETE /api/admin/tools/1 against non-admin users (403 Forbidden)', async () => {
      const res = await nonAdminClient.delete('/api/admin/tools/1');
      assert.equal(res.status, 403);
    });

    it('Guards POST /api/admin/newbie/links against non-admin users (403 Forbidden)', async () => {
      const res = await nonAdminClient.post('/api/admin/newbie/links', { title: 'Fake Link', url: 'https://example.com' });
      assert.equal(res.status, 403);
    });

    it('Admin user can successfully access admin endpoints (200 OK)', async () => {
      const logsRes = await adminClient.get('/api/admin/logs');
      assert.equal(logsRes.status, 200);

      const statsRes = await adminClient.get('/api/admin/logs/stats');
      assert.equal(statsRes.status, 200);
      assert.ok(statsRes.data.total !== undefined);
    });
  });
});
