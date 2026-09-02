import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { ensureServerRunning } from './helpers/server-runner';
import { TestApiClient } from './helpers/api-client';

describe('Exhaustive Full Application Endpoints & CRUD Operations Test Suite', () => {
  let baseUrl: string;
  let unauthClient: TestApiClient;
  let userClient: TestApiClient;
  let adminClient: TestApiClient;

  let adminUser: any;
  let regularUser: any;
  let testSubjectId: number;
  let testMajorId: number;
  let testResourceId: number;
  let testNewsSourceHandle: string;
  let testNewsId: number;
  let testEventId: number;
  let testSectionId: number;
  let testTutorialId: number;
  let testFeedbackId: number;
  let testNewbieLinkId: number;
  let testToolId: number;

  before(async () => {
    baseUrl = await ensureServerRunning();
    unauthClient = new TestApiClient(baseUrl);
    userClient = new TestApiClient(baseUrl);
    adminClient = new TestApiClient(baseUrl);
  });

  // 1. System & Health Check
  describe('System & Health Check Endpoints', () => {
    it('GET /api/health - returns status ok', async () => {
      const res = await unauthClient.get('/api/health');
      assert.equal(res.status, 200);
      assert.equal(res.data.status, 'ok');
    });

    it('GET /api/calendar.ics - exports academic calendar ICS', async () => {
      const res = await unauthClient.get('/api/calendar.ics');
      assert.equal(res.status, 200);
    });

    it('GET /api/settings - returns public global settings', async () => {
      const res = await unauthClient.get('/api/settings');
      assert.equal(res.status, 200);
    });
  });

  // 2. Authentication & User Profile CRUD
  describe('Authentication & User Management CRUD', () => {
    const adminEmail = `admin_${Date.now()}@imamu.edu.sa`;
    const userEmail = `user_${Date.now()}@imamu.edu.sa`;
    const password = 'TestPassword123!';

    let adminDevCode: string;
    let userDevCode: string;

    it('POST /api/send-code - requests verification code for admin', async () => {
      const res = await unauthClient.post('/api/send-code', { email: adminEmail });
      assert.equal(res.status, 200);
      assert.ok(res.data.devCode);
      adminDevCode = res.data.devCode;
    });

    it('POST /api/send-code - requests verification code for user', async () => {
      const res = await unauthClient.post('/api/send-code', { email: userEmail });
      assert.equal(res.status, 200);
      assert.ok(res.data.devCode);
      userDevCode = res.data.devCode;
    });

    it('POST /api/register - registers admin user', async () => {
      const res = await unauthClient.post('/api/register', {
        email: adminEmail,
        password,
        userName: `admin_${Date.now()}`,
        code: adminDevCode,
        role: 'ADMIN'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.token);
      assert.ok(res.data.user);
      adminUser = res.data.user;
      adminClient.setToken(res.data.token);
    });

    it('POST /api/register - registers regular user', async () => {
      const res = await unauthClient.post('/api/register', {
        email: userEmail,
        password,
        userName: `user_${Date.now()}`,
        code: userDevCode,
        role: 'USER'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.token);
      assert.ok(res.data.user);
      regularUser = res.data.user;
      userClient.setToken(res.data.token);
    });

    it('POST /api/login - authenticates registered user', async () => {
      const res = await unauthClient.post('/api/login', {
        email: userEmail,
        password
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.token);
    });

    it('GET /api/check-username - checks username availability', async () => {
      const res = await userClient.get(`/api/check-username?username=unique_name_${Date.now()}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.available, true);
    });

    it('GET /api/users/me - fetches current logged in profile', async () => {
      const res = await userClient.get('/api/users/me');
      assert.equal(res.status, 200);
      assert.equal(res.data.email, userEmail);
    });

    it('POST /api/users/me - updates user profile information', async () => {
      const res = await userClient.post('/api/users/me', {
        phone: '0501234567',
        major: 'Computer Science',
        currentGpa: '4.75'
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.phone, '0501234567');
      assert.equal(res.data.major, 'Computer Science');
    });
  });

  // 3. Subjects, Courses & Majors CRUD
  describe('Subjects, Courses & Majors CRUD', () => {
    it('GET /api/subjects - lists all subjects', async () => {
      const res = await unauthClient.get('/api/subjects');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    it('GET /api/courses - lists all courses (alias)', async () => {
      const res = await unauthClient.get('/api/courses');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    it('POST /api/admin/subjects - creates a new subject (Admin)', async () => {
      const res = await adminClient.post('/api/admin/subjects', {
        code: `CS${Math.floor(100 + Math.random() * 900)}`,
        name: 'اختبار برمجة المتقدمة',
        creditHours: 3,
        level: 5,
        description: 'وصف لمادة الاختبار المتقدمة'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
      testSubjectId = res.data.id;
    });

    it('GET /api/subjects/:idOrCode/details - fetches detailed subject view', async () => {
      const res = await unauthClient.get(`/api/subjects/${testSubjectId}/details`);
      assert.equal(res.status, 200);
      assert.ok(res.data.course);
      assert.equal(res.data.course.id, testSubjectId);
    });

    it('POST /api/admin/subjects/deduplicate - cleans up duplicate subjects (Admin)', async () => {
      const res = await adminClient.post('/api/admin/subjects/deduplicate');
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('POST /api/admin/majors - creates a new major (Admin)', async () => {
      const res = await adminClient.post('/api/admin/majors', {
        name: `Major_${Date.now()}`,
        pdfUrl: 'https://example.com/plan.pdf'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
      testMajorId = res.data.id;
    });

    it('GET /api/majors - lists all academic majors', async () => {
      const res = await unauthClient.get('/api/majors');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });
  });

  // 4. Course Resources CRUD
  describe('Course Resources CRUD', () => {
    it('GET /api/resources - lists all course resources', async () => {
      const res = await userClient.get('/api/resources');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    it('POST /api/admin/resources - creates a course resource (Admin)', async () => {
      const res = await adminClient.post('/api/admin/resources', {
        subjectId: testSubjectId,
        title: 'ملخص شامل للمادة',
        type: 'drive',
        url: 'https://drive.google.com/test-resource',
        description: 'رابط درايف للملخصات'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
      testResourceId = res.data.id;
    });

    it('POST /api/admin/subjects/:subjectId/resources - creates subject-bound resource (Admin)', async () => {
      const res = await adminClient.post(`/api/admin/subjects/${testSubjectId}/resources`, {
        title: 'جروب تليجرام للمادة',
        type: 'telegram',
        url: 'https://t.me/test_group',
        description: 'رابط التواصل'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
    });

    it('PUT /api/admin/resources/:id - updates resource details (Admin)', async () => {
      const res = await adminClient.put(`/api/admin/resources/${testResourceId}`, {
        title: 'ملخص معدل للمادة',
        description: 'وصف محين للملخص'
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.title, 'ملخص معدل للمادة');
    });

    it('POST /api/admin/resources - creates a standalone resource without a course/subject and verifies it is returned in GET /api/resources', async () => {
      const res = await adminClient.post('/api/admin/resources', {
        title: 'باقة مصادر عامة بدون مادة',
        type: 'drive',
        url: 'https://drive.google.com/standalone-resource',
        description: 'مصادر تخصصية عامة'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
      const standaloneId = res.data.id;

      // Verify GET /api/resources returns the standalone resource
      const listRes = await userClient.get('/api/resources');
      assert.equal(listRes.status, 200);
      assert.ok(Array.isArray(listRes.data));
      const found = listRes.data.find((r: any) => String(r.id) === String(standaloneId));
      assert.ok(found, 'Standalone resource without a course must be returned in GET /api/resources');
      assert.equal(found.title, 'باقة مصادر عامة بدون مادة');

      // Cleanup
      await adminClient.delete(`/api/admin/resources/${standaloneId}`);
    });

    it('DELETE /api/admin/resources/:id - deletes course resource (Admin)', async () => {
      const res = await adminClient.delete(`/api/admin/resources/${testResourceId}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('DELETE /api/admin/resources/:id - deletes synthetic subject resource >= 10000 (Admin)', async () => {
      const synthId = testSubjectId * 10000;
      const res = await adminClient.delete(`/api/admin/resources/${synthId}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });
  });

  // 5. News, Likes, Comments & Events CRUD
  describe('News, Events & Sources CRUD', () => {
    it('POST /api/admin/news_sources - creates news source (Admin)', async () => {
      testNewsSourceHandle = `source_${Date.now()}`;
      const res = await adminClient.post('/api/admin/news_sources', {
        handle: testNewsSourceHandle,
        profilePicUrl: 'https://example.com/avatar.jpg',
        isActive: true
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
    });

    it('GET /api/admin/news_sources - lists news sources (Admin)', async () => {
      const res = await adminClient.get('/api/admin/news_sources');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    it('POST /api/admin/news - creates news item (Admin)', async () => {
      const res = await adminClient.post('/api/admin/news', {
        content: 'إعلان هام بخصوص الاختبارات النهائية',
        source: testNewsSourceHandle,
        authorName: 'عمادة القبول والتسجيل',
        date: new Date().toISOString().split('T')[0]
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
      testNewsId = res.data.id;
    });

    it('GET /api/news - lists published news', async () => {
      const res = await unauthClient.get('/api/news');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    it('POST /api/news/:id/like - toggles like on news item', async () => {
      const res = await userClient.post(`/api/news/${testNewsId}/like`);
      assert.equal(res.status, 200);
      assert.equal(typeof res.data.liked, 'boolean');
    });

    it('POST /api/news/:id/comments - adds comment to news item', async () => {
      const res = await userClient.post(`/api/news/${testNewsId}/comments`, {
        content: 'تعليق تجريبي ممتاز على الخبر'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
      assert.equal(res.data.content, 'تعليق تجريبي ممتاز على الخبر');
    });

    it('GET /api/news/:id/comments - retrieves comments for news item', async () => {
      const res = await unauthClient.get(`/api/news/${testNewsId}/comments`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
      assert.ok(res.data.length > 0);
    });

    it('POST /api/admin/events - creates calendar event (Admin)', async () => {
      const res = await adminClient.post('/api/admin/events', {
        title: 'بداية الاختبارات النهائية',
        date: '2026-12-15',
        description: 'جدول الاختبارات الرسمية'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
      testEventId = res.data.id;
    });

    it('POST /api/admin/events/generate-mokafaa - generates allowance deposit events (Admin)', async () => {
      const res = await adminClient.post('/api/admin/events/generate-mokafaa');
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('GET /api/events - lists all calendar events', async () => {
      const res = await unauthClient.get('/api/events');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    it('DELETE /api/admin/news/:id - deletes news item (Admin)', async () => {
      const res = await adminClient.delete(`/api/admin/news/${testNewsId}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('DELETE /api/admin/events/:id - deletes calendar event (Admin)', async () => {
      const res = await adminClient.delete(`/api/admin/events/${testEventId}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('DELETE /api/admin/news_sources/:id - deletes news source (Admin)', async () => {
      const listRes = await adminClient.get('/api/admin/news_sources');
      const found = listRes.data.find((s: any) => s.handle === testNewsSourceHandle);
      if (found) {
        const res = await adminClient.delete(`/api/admin/news_sources/${found.id}`);
        assert.equal(res.status, 200);
        assert.equal(res.data.success, true);
      }
    });

    it('DELETE /api/admin/subjects/:id - deletes subject/course (Admin)', async () => {
      const res = await adminClient.delete(`/api/admin/subjects/${testSubjectId}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('DELETE /api/admin/majors/:id - deletes major (Admin)', async () => {
      const res = await adminClient.delete(`/api/admin/majors/${testMajorId}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });
  });

  // 6. Tutorials, Sections & Feedback CRUD
  describe('Tutorials, Sections, Feedback & Comments CRUD', () => {
    it('POST /api/admin/tutorials/sections - creates tutorial section (Admin)', async () => {
      const res = await adminClient.post('/api/admin/tutorials/sections', {
        title: 'شروحات البلاك بورد',
        icon: 'book',
        color: '#3b82f6'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
      testSectionId = res.data.id;
    });

    it('PUT /api/admin/tutorials/sections/:id - updates tutorial section (Admin)', async () => {
      const res = await adminClient.put(`/api/admin/tutorials/sections/${testSectionId}`, {
        title: 'شروحات الخدمات الإلكترونية والبلاك بورد',
        icon: 'laptop',
        color: '#10b981'
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.title, 'شروحات الخدمات الإلكترونية والبلاك بورد');
    });

    it('GET /api/tutorials/sections - lists all tutorial sections', async () => {
      const res = await unauthClient.get('/api/tutorials/sections');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    it('POST /api/admin/tutorials - creates tutorial (Admin)', async () => {
      const res = await adminClient.post('/api/admin/tutorials', {
        sectionId: testSectionId,
        title: 'طريقة تسجيل المواد',
        description: 'خطوات تسجيل المقررات عبر نظام التظلمات والخدمات الذاتية',
        text: 'تفاصيل الشرح الكاملة',
        steps: ['الخطوة 1: تسجيل الدخول', 'الخطوة 2: اختيار المقررات']
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
      testTutorialId = res.data.id;
    });

    it('PUT /api/admin/tutorials/:id - updates tutorial details (Admin)', async () => {
      const res = await adminClient.put(`/api/admin/tutorials/${testTutorialId}`, {
        sectionId: testSectionId,
        title: 'طريقة تسجيل المواد والجدول الدراسي',
        description: 'خطوات مفصلة ومحدثة لتسجيل المقررات',
        steps: ['الخطوة 1: تسجيل الدخول', 'الخطوة 2: إدخال الأرقام المرجعية']
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.title, 'طريقة تسجيل المواد والجدول الدراسي');
    });

    it('GET /api/tutorials - lists tutorials', async () => {
      const res = await unauthClient.get('/api/tutorials');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    it('GET /api/tutorials/:id - gets single tutorial with feedback', async () => {
      const res = await unauthClient.get(`/api/tutorials/${testTutorialId}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.id, testTutorialId);
    });

    it('POST /api/tutorials/:id/feedback - submits feedback on tutorial', async () => {
      const res = await userClient.post(`/api/tutorials/${testTutorialId}/feedback`, {
        isHelpful: true,
        comment: 'شرح مفيد جداً ومبسط'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
      testFeedbackId = res.data.id;
    });

    it('GET /api/admin/tutorials/feedback - lists all tutorial feedback (Admin)', async () => {
      const res = await adminClient.get('/api/admin/tutorials/feedback');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    it('POST /api/feedback/:id/comments - posts reply comment on feedback', async () => {
      const res = await userClient.post(`/api/feedback/${testFeedbackId}/comments`, {
        content: 'شكراً لتقييمك الإيجابي'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
    });

    it('GET /api/feedback/:id/comments - retrieves comments for feedback', async () => {
      const res = await unauthClient.get(`/api/feedback/${testFeedbackId}/comments`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    it('POST /api/tutorials/:id/comments - posts public comment on tutorial', async () => {
      const res = await userClient.post(`/api/tutorials/${testTutorialId}/comments`, {
        content: 'هل هناك استثناءات للحذف والإضافة؟'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
    });

    it('GET /api/tutorials/:id/comments - retrieves public tutorial comments', async () => {
      const res = await unauthClient.get(`/api/tutorials/${testTutorialId}/comments`);
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    it('DELETE /api/admin/tutorials/:id - deletes tutorial (Admin)', async () => {
      const res = await adminClient.delete(`/api/admin/tutorials/${testTutorialId}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('DELETE /api/admin/tutorials/sections/:id - deletes section (Admin)', async () => {
      const res = await adminClient.delete(`/api/admin/tutorials/sections/${testSectionId}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });
  });

  // 7. Newbie Portal Links CRUD
  describe('Newbie Links CRUD', () => {
    it('POST /api/admin/newbie/links - creates newbie link (Admin)', async () => {
      const res = await adminClient.post('/api/admin/newbie/links', {
        title: 'موقع الجامعة الرسمي',
        url: 'https://imamu.edu.sa',
        description: 'رابط البوابة الرئيسية'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
      testNewbieLinkId = res.data.id;
    });

    it('PUT /api/admin/newbie/links/:id - updates newbie link (Admin)', async () => {
      const res = await adminClient.put(`/api/admin/newbie/links/${testNewbieLinkId}`, {
        title: 'بوابة جامعة الإمام الإسلامية',
        url: 'https://imamu.edu.sa',
        description: 'البوابة الرسمية الرئيسية'
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.title, 'بوابة جامعة الإمام الإسلامية');
    });

    it('GET /api/newbie/links - fetches newbie links list', async () => {
      const res = await unauthClient.get('/api/newbie/links');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    it('DELETE /api/admin/newbie/links/:id - deletes newbie link (Admin)', async () => {
      const res = await adminClient.delete(`/api/admin/newbie/links/${testNewbieLinkId}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });
  });

  // 8. Tools CRUD
  describe('Tools CRUD', () => {
    it('POST /api/admin/tools - creates academic tool (Admin)', async () => {
      const res = await adminClient.post('/api/admin/tools', {
        title: 'حاسبة المعدل التراكمي',
        link: 'https://example.com/gpa-calculator',
        category: 'أدوات حسابية',
        description: 'أداة لحساب المعدل التراكمي والفصلي'
      });
      assert.equal(res.status, 200);
      assert.ok(res.data.id);
      testToolId = res.data.id;
    });

    it('PUT /api/admin/tools/:id - updates academic tool (Admin)', async () => {
      const res = await adminClient.put(`/api/admin/tools/${testToolId}`, {
        title: 'حاسبة المعدل التفاعلية المتقدمة',
        category: 'أدوات دراسية'
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.title, 'حاسبة المعدل التفاعلية المتقدمة');
    });

    it('GET /api/tools - lists academic tools', async () => {
      const res = await unauthClient.get('/api/tools');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    it('DELETE /api/admin/tools/:id - deletes academic tool (Admin)', async () => {
      const res = await adminClient.delete(`/api/admin/tools/${testToolId}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });
  });

  // 9. Admin User Management CRUD
  describe('Admin User Management CRUD', () => {
    it('GET /api/admin/users - lists registered users (Admin)', async () => {
      const res = await adminClient.get('/api/admin/users');
      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.data));
    });

    it('PUT /api/admin/users/:id - updates user details (Admin)', async () => {
      const targetId = regularUser?.id || regularUser?.uid;
      if (!targetId) return;
      const res = await adminClient.put(`/api/admin/users/${targetId}`, {
        phone: '0599999999',
        major: 'Information Technology'
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.phone, '0599999999');
    });

    it('PUT /api/admin/users/:id/toggle-admin - toggles admin status (Admin)', async () => {
      const targetId = regularUser?.id || regularUser?.uid;
      if (!targetId) return;
      const res = await adminClient.put(`/api/admin/users/${targetId}/toggle-admin`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.user.isAdmin, true);
    });

    it('DELETE /api/admin/users/:id - deletes user account (Admin)', async () => {
      const targetId = regularUser?.id || regularUser?.uid;
      if (!targetId) return;
      const res = await adminClient.delete(`/api/admin/users/${targetId}`);
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });
  });

  // 10. Admin Activity Logs, Stats & Global Settings
  describe('Admin Activity Logs, Stats & Settings CRUD', () => {
    it('GET /api/admin/logs - lists activity logs (Admin)', async () => {
      const res = await adminClient.get('/api/admin/logs');
      assert.equal(res.status, 200);
      assert.ok(res.data.logs);
    });

    it('GET /api/admin/logs/stats - lists activity log statistics (Admin)', async () => {
      const res = await adminClient.get('/api/admin/logs/stats');
      assert.equal(res.status, 200);
      assert.ok(typeof res.data.total === 'number');
    });

    it('DELETE /api/admin/logs/clear - clears activity logs (Admin)', async () => {
      const res = await adminClient.delete('/api/admin/logs/clear');
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
    });

    it('GET /api/admin/global_settings - gets global settings (Admin)', async () => {
      const res = await adminClient.get('/api/admin/global_settings');
      assert.equal(res.status, 200);
    });

    it('PUT /api/admin/global_settings - updates global settings (Admin)', async () => {
      const res = await adminClient.put('/api/admin/global_settings', {
        fetchRangeDays: 60,
        autoDeleteDays: 45
      });
      assert.equal(res.status, 200);
      assert.equal(res.data.success, true);
      assert.equal(res.data.settings.fetchRangeDays, 60);
    });

    it('GET /api/admin/stats - returns dashboard summary statistics (Admin)', async () => {
      const res = await adminClient.get('/api/admin/stats');
      assert.equal(res.status, 200);
      assert.ok(typeof res.data.usersCount === 'number');
    });

    it('GET /api/admin/health - returns admin health metrics (Admin)', async () => {
      const res = await adminClient.get('/api/admin/health');
      assert.equal(res.status, 200);
      assert.equal(res.data.status, 'ok');
    });

    it('GET /api/admin/export-db - exports database backup zip archive (Admin)', async () => {
      const res = await adminClient.get('/api/admin/export-db');
      assert.equal(res.status, 200);
    });
  });

  // 11. Security Authorization Boundary Verification
  describe('Security Boundary & Permission Verification', () => {
    it('Blocks unauthenticated user from protected routes (401 Unauthorized)', async () => {
      const pureUnauthClient = new TestApiClient(baseUrl);
      const res = await pureUnauthClient.get('/api/users/me');
      assert.equal(res.status, 401);
    });

    it('Blocks non-admin user from admin routes (403 Forbidden)', async () => {
      // Create a fresh regular user token
      const freshUserEmail = `fresh_user_${Date.now()}@imamu.edu.sa`;
      const sendRes = await unauthClient.post('/api/send-code', { email: freshUserEmail });
      const regRes = await unauthClient.post('/api/register', {
        email: freshUserEmail,
        password: 'Password123!',
        userName: `fresh_${Date.now()}`,
        code: sendRes.data.devCode,
        role: 'USER'
      });
      const freshUserClient = new TestApiClient(baseUrl);
      freshUserClient.setToken(regRes.data.token);

      const res = await freshUserClient.get('/api/admin/stats');
      assert.equal(res.status, 403);
    });
  });
});
