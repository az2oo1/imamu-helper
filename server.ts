import 'dotenv/config';
import express from "express";
import path from "path";
import fs from "fs";
import next from "next";
import { getDb } from "./src/db/index";
import { users, majors, subjects, events, news, majorCourses, newsLikes, newsComments, news_sources, global_settings, verification_codes, tutorial_sections, tutorials, tutorial_feedback, feedback_comments, newbie_links, tutorial_comments } from "./src/db/schema";
import { eq, desc, and, sql, inArray, ilike } from "drizzle-orm";
import { requireAuth, AuthRequest } from "./src/middleware/auth";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import multer from "multer";
import * as cheerio from "cheerio";
import nodemailer from "nodemailer";
// @ts-ignore
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import AdmZip from 'adm-zip';

import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
} as any);


const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

async function startServer() {
  // Wait for DB to be fully initialized (PGlite WASM + migrations)
  const db = await getDb();

  const app = express();
  const PORT = 3000;

  // Make sure public/uploads folder exists
  const uploadsDir = path.join(process.cwd(), 'public/uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));

  app.use(express.json({ limit: '50mb' }));

  // Seed default tutorials & sections if empty
  (async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    try {
      const existingSections = await db.select().from(tutorial_sections);
      if (existingSections.length === 0) {
        console.log('[DB] Seeding default tutorial sections and tutorials...');
        const [secAcademic] = await db.insert(tutorial_sections).values({
          title: 'الحياة الأكاديمية والتسجيل',
          icon: 'GraduationCap',
          color: 'text-blue-600 bg-blue-50 border-blue-100/50'
        }).returning();

        const [secServices] = await db.insert(tutorial_sections).values({
          title: 'الخدمات والمكافآت',
          icon: 'CreditCard',
          color: 'text-emerald-600 bg-emerald-50 border-emerald-100/50'
        }).returning();

        await db.insert(tutorials).values([
          {
            sectionId: secAcademic.id,
            title: 'كيف تسجل المواد في الخدمة الذاتية؟',
            description: 'شرح مبسط لكيفية إعداد جدولك الأكاديمي وتسجيل المواد عبر نظام الخدمة الذاتية (Banner).',
            text: 'تسجيل المواد يفتح عادة في فترات محددة حسب جدول التسجيل المقر من عمادة القبول والتسجيل، وتتأثر الأولويات بالمعدل التراكمي وعدد الساعات المنجزة.',
            steps: JSON.stringify([
              'ادخل إلى نظام الخدمة الذاتية باستخدام رقمك الجامعي وكلمة المرور الخاصة بك.',
              'اختر صفحة "التسجيل" ثم اضغط على "التسجيل وتنزيل المواد".',
              'اختر الفصل الدراسي المناسب (مثال: الفصل الدراسي الأول 1448 هـ).',
              'أدخل الرموز المرجعية للمواد (CRN) التي قمت بإعدادها مسبقاً، واضغط على "إضافة إلى الجدول".',
              'تأكد من الضغط على زر "تقديم / Submit" في أسفل اليسار لتثبيت المواد وضمان تسجيلها.'
            ]),
            linkUrl: 'https://bstss.imamu.edu.sa/StudentSelfService',
            linkTitle: 'بوابة الخدمة الذاتية (Banner)'
          },
          {
            sectionId: secAcademic.id,
            title: 'كيف أحسب معدلي التراكمي؟',
            description: 'دليل خطوة بخطوة لاستخدام حاسبة المعدل التراكمي والفصلي بفعالية.',
            text: 'تتيح لك حاسبة المعدل التنبؤ بمعدلك التراكمي والفصلي بدقة، مما يساعدك على تخطيط درجاتك في الفصول القادمة للحفاظ على معدل مرتفع أو تفادي الإنذارات الأكاديمية.',
            steps: JSON.stringify([
              'انتقل إلى قسم الأدوات من القائمة الرئيسية، ثم اختر "حاسبة المعدل".',
              'أدخل معدلك الحالي التراكمي وعدد الساعات المكتسبة الحالية (تجدها في سجلك الأكاديمي).',
              'أدخل درجات المواد المتوقعة للفصل الحالي وعدد الساعات المعتمدة لكل مادة.',
              'اضغط على زر "احسب" للحصول على النتيجة وملاحظات الأداء فوراً.'
            ]),
            linkUrl: '/tools',
            linkTitle: 'حاسبة المعدل التراكمي'
          },
          {
            sectionId: secAcademic.id,
            title: 'كيف أصل لمصادر ومجموعات المواد؟',
            description: 'دليل تصفح قسم المصادر للحصول على الملفات الدراسية، الاختبارات السابقة، ومجموعات التواصل.',
            text: 'يحتوي قسم المصادر على ملفات هامة يشاركها زملاؤك الطلاب، بالإضافة إلى روابط مجموعات الواتساب الرسمية لكل مادة لتسهيل التواصل والتعاون الأكاديمي.',
            steps: JSON.stringify([
              'توجه إلى قسم "المصادر" من القائمة العلوية للمنصة.',
              'استخدم مربع البحث السريع أو الفلاتر لتحديد مستواك الدراسي.',
              'انقر على بطاقة المادة التي ترغب في تصفحها.',
              'ستظهر لك روابط مجموعات الواتساب وملفات جوجل درايف الخاصة بالمادة لتحميلها.'
            ]),
            linkUrl: '/resources',
            linkTitle: 'بنك المصادر الأكاديمية'
          },
          {
            sectionId: secAcademic.id,
            title: 'كيف أحول من تخصص إلى آخر؟',
            description: 'شروط وضوابط التحويل بين التخصصات والكليات داخل جامعة الإمام والمواعيد المعتادة.',
            text: 'يتاح التحويل نهاية كل فصل دراسي عبر الخدمة الذاتية، ويعتمد قبول طلبك بشكل أساسي على توفر المقاعد ومعدلك التراكمي مقارنة بالطلاب المتقدمين الآخرين.',
            steps: JSON.stringify([
              'تأكد من استيفائك لشروط التحويل الخاصة بالكلية المستهدفة (مثل اجتياز ساعات محددة أو حد أدنى للمعدل).',
              'ادخل للخدمة الذاتية خلال فترة التقديم المعلنة في التقويم الدراسي.',
              'انتقل إلى "الخدمات الأكاديمية" ثم اختر "طلب التحويل الداخلي".',
              'حدد الكلية والتخصص المطلوب كأولوية أولى، وقم بتقديم طلبك.',
              'تابع حالة الطلب بانتظام عبر النظام لمعرفة قرار اللجنة الأكاديمية.'
            ]),
            linkUrl: 'https://bstss.imamu.edu.sa/StudentSelfService',
            linkTitle: 'تقديم طلب تحويل بالخدمة الذاتية'
          },
          {
            sectionId: secServices.id,
            title: 'كيف أتتبع موعد نزول المكافأة؟',
            description: 'طريقة التحقق من العد التنازلي وتاريخ نزول المكافآت الجامعية شهرياً.',
            text: 'تنزل المكافأة الجامعية لطلاب جامعة الإمام عادة في اليوم 27 من كل شهر ميلادي، ما لم يصادف عطلة نهاية الأسبوع حيث يتم تقديمها أو تأخيرها يوماً واحداً.',
            steps: JSON.stringify([
              'افتح الصفحة الرئيسية لمنصة مساعد الإمام.',
              'شاهد قسم العدادات التنازلية مباشرة أسفل قسم الترحيب.',
              'ستجد عداداً مخصصاً يوضح الأيام والساعات المتبقية لنزول مكافأتك القادمة بدقة.',
              'في يوم نزول المكافأة، ستشاهد إشعاراً ترحيبياً خاصاً يخبرك بنزول المكافأة في حسابك.'
            ]),
            linkUrl: '/',
            linkTitle: 'الرئيسية (عداد المكافأة)'
          },
          {
            sectionId: secServices.id,
            title: 'كيف أستخرج بطاقتي الجامعية والمصرفية؟',
            description: 'خطوات إصدار البطاقة الجامعية الذكية لجامعة الإمام واستلام بطاقة الصراف الآلي للمكافآت.',
            text: 'البطاقة الجامعية ضرورية للدخول للحرم الجامعي وحضور الاختبارات والاستفادة من خدمات المكتبة المركزية، بينما بطاقة الصراف تمكنك من سحب مكافأتك الأكاديمية.',
            steps: JSON.stringify([
              'لالبطاقة الجامعية: قم برفع صورتك الشخصية والملف الشخصي عبر بوابة الخدمة الذاتية.',
              'بعد الموافقة الإلكترونية، توجه لعمادة شؤون الطلاب (مبنى 309 للطلاب) لاستلام البطاقة المطبوعة.',
              'لالبطاقة المصرفية: عند إصدار رقم الآيبان الأكاديمي، ستصلك رسالة نصية من مصرف الراجحي.',
              'توجه لفرع المصرف داخل المدينة الجامعية لاستلام بطاقة صراف الطلاب الخاصة بك وتفعيلها.'
            ]),
            linkUrl: 'https://bstss.imamu.edu.sa/StudentSelfService',
            linkTitle: 'رفع الصورة الشخصية (Banner)'
          }
        ]);

        // Seed newbie links
        const existingLinks = await db.select().from(newbie_links);
        if (existingLinks.length === 0) {
          console.log('[DB] Seeding default newbie links...');
          await db.insert(newbie_links).values([
            {
              title: 'بوابة الخدمات الذاتية (Banner)',
              url: 'https://bstss.imamu.edu.sa/StudentSelfService',
              description: 'البوابة الرسمية لتسجيل المقررات، إعداد الجداول، ومعرفة المعدل التراكمي والسجل الأكاديمي.'
            },
            {
              title: 'نظام التعليم الإلكتروني (Blackboard)',
              url: 'https://lms.imamu.edu.sa',
              description: 'منصة التعليم الإلكتروني الرسمية لحضور المحاضرات الافتراضية، وحل الواجبات، ومتابعة الاختبارات.'
            },
            {
              title: 'بوابة البريد الإلكتروني الجامعي',
              url: 'https://mail.imamu.edu.sa/imamowa/',
              description: 'الوصول لبريدك الأكاديمي الرسمي وتفعيل الحساب الجامعي واستقبال الإعلانات الهامة.'
            },
            {
              title: 'الموقع الرسمي لجامعة الإمام',
              url: 'https://imamu.edu.sa',
              description: 'موقع الجامعة الإلكتروني للاطلاع على أخبار العمادات، الكليات، والتقويم الدراسي المعتمد.'
            }
          ]);
        }

        // Force update webmail url override
        await db.update(newbie_links)
          .set({ url: 'https://mail.imamu.edu.sa/imamowa/' })
          .where(eq(newbie_links.title, 'بوابة البريد الإلكتروني الجامعي'));

        console.log('[DB] Seeding completed.');
      }
    } catch (e) {
      console.error('[DB] Seeding failed, likely due to migration in progress:', e);
    }
  })();

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/auth/send-code", async (req, res) => {
    try {
      const { email: rawEmail } = req.body;
      const email = rawEmail?.toLowerCase().trim();
      if (!email) return res.status(400).json({ error: "Email required" });
      
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes
      
      await db.insert(verification_codes).values({ email, code, expiresAt });
      
      const settings = await db.query.global_settings.findFirst();
      const smtpHost = settings?.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
      const smtpPort = settings?.smtpPort || Number(process.env.SMTP_PORT) || 587;
      const smtpUser = settings?.smtpUser || process.env.SMTP_USER;
      const smtpPass = settings?.smtpPass || process.env.SMTP_PASS;

      if (smtpUser) {
          const dynamicTransporter = nodemailer.createTransport({
            host: smtpHost,
            port: smtpPort,
            secure: smtpPort === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          } as any);
          
          await dynamicTransporter.sendMail({
            from: `"IMAMU App" <${smtpUser}>`,
            to: email,
            subject: "Your Verification Code",
            text: `Your verification code is: ${code}`,
            html: `<b>Your verification code is: ${code}</b>`,
          });
          res.json({ success: true });
      } else {
          console.log(`[DEV MODE] Verification code for ${email}: ${code}`);
          res.json({ success: true, devCode: code, message: "SMTP not configured. Use this code to continue." });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to send code" });
    }
  });

  // Auth: Register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email: rawEmail, password, phone, userName, code } = req.body;
      const email = rawEmail?.toLowerCase().trim();
      if (!email || !password || !userName || !code) return res.status(400).json({ error: "Missing required fields" });
      
      const existing = await db.select().from(users).where(eq(users.email, email));
      if (existing.length > 0) return res.status(400).json({ error: "Email already registered" });

      const codeRecords = await db.select().from(verification_codes).where(eq(verification_codes.email, email)).orderBy(desc(verification_codes.createdAt));
      if (codeRecords.length === 0) return res.status(400).json({ error: "No verification code sent to this email" });
      
      const latestCode = codeRecords[0];
      if (latestCode.code !== code) return res.status(400).json({ error: "Invalid verification code" });
      if (latestCode.expiresAt < new Date()) return res.status(400).json({ error: "Verification code expired" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const uid = crypto.randomUUID();

      const allUsers = await db.select().from(users);
      const isAdmin = allUsers.length === 0;

      const result = await db.insert(users)
        .values({ uid, email, passwordHash: hashedPassword, phone, userName, isAdmin })
        .returning();
      
      const user = result[0];
      const token = jwt.sign({ uid: user.uid, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  // Auth: Reset Password
  app.post("/api/auth/reset-password", async (req, res): Promise<any> => {
    try {
      const { email: rawEmail, code, newPassword } = req.body;
      const email = rawEmail?.toLowerCase().trim();
      if (!email || !code || !newPassword) return res.status(400).json({ error: "Missing fields" });

      const vc = await db.query.verification_codes.findFirst({
        where: and(eq(verification_codes.email, email), eq(verification_codes.code, code))
      });

      if (!vc) return res.status(400).json({ error: "Invalid verification code" });
      if (new Date() > new Date(vc.expiresAt)) return res.status(400).json({ error: "Code expired" });

      const user = await db.query.users.findFirst({ where: eq(users.email, email) });
      if (!user) return res.status(400).json({ error: "User not found" });

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await db.update(users).set({ passwordHash: hashedPassword }).where(eq(users.id, user.id));

      await db.delete(verification_codes).where(eq(verification_codes.id, vc.id));

      res.json({ success: true, message: "Password reset successful" });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email: rawEmail, password } = req.body;
      const email = rawEmail?.toLowerCase().trim();
      if (!email || !password) return res.status(400).json({ error: "Missing email or password" });

      let user = (await db.select().from(users).where(eq(users.email, email)))[0];
      let valid = false;

      // Try local auth first
      if (user && user.passwordHash) {
        valid = await bcrypt.compare(password, user.passwordHash);
      }

      // If local auth fails or no user, try IMAP if configured
      if (!valid) {
        const settings = await db.query.global_settings.findFirst();
        if (settings?.imapHost && settings?.imapPort) {
          const { verifyImapCredentials } = await import('./src/lib/imap-auth');
          valid = await verifyImapCredentials(settings.imapHost as string, settings.imapPort as number, (settings.imapSecure as boolean) ?? true, email, password);
          
          if (valid) {
            // IMAP succeeded. If user doesn't exist, create them.
            if (!user) {
              const uid = crypto.randomUUID();
              const hashedPassword = await bcrypt.hash(password, 10);
              const allUsers = await db.select().from(users);
              const isAdmin = allUsers.length === 0;

              const result = await db.insert(users).values({ 
                uid, email, passwordHash: hashedPassword, userName: email.split('@')[0], isAdmin 
              }).returning();
              user = result[0];
            } else {
              // Update their local password so they can login without IMAP next time if IMAP is slow
              const hashedPassword = await bcrypt.hash(password, 10);
              await db.update(users).set({ passwordHash: hashedPassword }).where(eq(users.id, user.id));
            }
          }
        }
      }

      if (!valid || !user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign({ uid: user.uid, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.json({ token, user });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.get("/api/users/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "No user" });
      const records = await db.select().from(users).where(eq(users.uid, req.user.uid));
      res.json(records[0] || null);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.get("/api/check-username", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { username } = req.query;
      if (!username || typeof username !== 'string') return res.status(400).json({ error: "Invalid username" });
      const records = await db.select().from(users).where(eq(users.userName, username));
      // It's available if no records found, or the only record is the current user
      const isAvailable = records.length === 0 || (records.length === 1 && records[0].uid === req.user?.uid);
      res.json({ available: isAvailable });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to check username" });
    }
  });

  app.post("/api/users/me", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user) return res.status(401).json({ error: "No user" });
      const { phone, major, currentGpa, finishedHours, completedCourses, profilePicUrl, userName } = req.body;
      
      if (userName) {
        const records = await db.select().from(users).where(eq(users.userName, userName));
        const isAvailable = records.length === 0 || (records.length === 1 && records[0].uid === req.user.uid);
        if (!isAvailable) return res.status(400).json({ error: "Username already taken" });
      }

      const result = await db.update(users).set({
        phone, major, currentGpa, finishedHours, completedCourses: completedCourses ? JSON.stringify(completedCourses) : null, profilePicUrl, userName
      }).where(eq(users.uid, req.user.uid)).returning();
      res.json(result[0]);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Subjects (protected to prevent stealing)
  app.get("/api/subjects", requireAuth, async (req: AuthRequest, res) => {
    try {
      const allSubjects = await db.select().from(subjects);
      const allMajorCourses = await db.select().from(majorCourses);
      
      const mapped = allSubjects.map(s => {
        const related = allMajorCourses.filter(mc => mc.subjectId === s.id);
        return {
          ...s,
          majorId: related[0]?.majorId || null
        };
      });
      
      res.json(mapped);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch subjects" });
    }
  });

  // Majors
  app.get("/api/majors", requireAuth, async (req: AuthRequest, res) => {
    try {
      const records = await db.select().from(majors);
      const allMajorCourses = await db.select().from(majorCourses);
      const mapped = records.map(m => {
         const courseIds = allMajorCourses.filter(mc => mc.majorId === m.id).map(mc => mc.subjectId);
         const courses = allMajorCourses.filter(mc => mc.majorId === m.id).map(mc => ({ subjectId: mc.subjectId, optionalGroup: mc.optionalGroup, optionalGroupReqCount: mc.optionalGroupReqCount }));
         return {
           ...m,
           courseIds,
           courses
         };
      });
      res.json(mapped);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch majors" });
    }
  });

  // Events
  app.get("/api/events", async (req, res) => {
    try {
      const records = await db.select().from(events);
      res.json(records);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // News
  app.get("/api/news", async (req, res) => {
    try {
      let currentUserId = null;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        try {
          const decodedToken: any = jwt.verify(token, JWT_SECRET);
          currentUserId = decodedToken.uid;
        } catch (e) {}
      }

      const limit = Number(req.query.limit) || 9;
      const offset = Number(req.query.offset) || 0;

      const records = await db
        .select({
          id: news.id,
          content: news.content,
          source: news.source,
          imageUrl: news.imageUrl,
          videoUrl: news.videoUrl,
          date: news.date,
          createdAt: news.createdAt,
          authorName: news.authorName,
          authorHandle: news.authorHandle,
          authorAvatar: news.authorAvatar,
          profilePicUrl: news_sources.profilePicUrl
        })
        .from(news)
        .leftJoin(news_sources, eq(news.source, news_sources.handle))
        .orderBy(desc(news.date), desc(news.createdAt))
        .limit(limit)
        .offset(offset);

      const recordIds = records.map(r => r.id);
      let allLikes: any[] = [];
      let allComments: any[] = [];
      
      if (recordIds.length > 0) {
          allLikes = await db.select().from(newsLikes).where(inArray(newsLikes.newsId, recordIds));
          allComments = await db.select().from(newsComments).where(inArray(newsComments.newsId, recordIds));
      }

      const mapped = records.map(record => {
        const likes = allLikes.filter(l => l.newsId === record.id);
        const comments = allComments.filter(c => c.newsId === record.id);
        const userLiked = currentUserId ? likes.some(l => l.userId === currentUserId) : false;
        
        return {
          ...record,
          likesCount: likes.length,
          commentsCount: comments.length,
          userLiked
        };
      });

      res.json(mapped);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.post("/api/news/:id/like", requireAuth, async (req: AuthRequest, res) => {
    try {
      const newsId = parseInt(req.params.id);
      const userId = req.user.uid;
      
      const existing = await db.select().from(newsLikes).where(and(eq(newsLikes.userId, userId), eq(newsLikes.newsId, newsId)));
      if (existing.length > 0) {
        await db.delete(newsLikes).where(eq(newsLikes.id, existing[0].id));
        return res.json({ liked: false });
      } else {
        await db.insert(newsLikes).values({ userId, newsId });
        return res.json({ liked: true });
      }
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/news/:id/comments", async (req, res) => {
    try {
      const newsId = parseInt(req.params.id);
      const comments = await db.select({
          id: newsComments.id,
          content: newsComments.content,
          createdAt: newsComments.createdAt,
          userId: users.uid,
          userName: users.userName,
          profilePic: users.profilePicUrl
        })
        .from(newsComments)
        .where(eq(newsComments.newsId, newsId))
        .leftJoin(users, eq(newsComments.userId, users.uid))
        .orderBy(desc(newsComments.createdAt));
      res.json(comments);
    } catch (e) {
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/news/:id/comments", requireAuth, async (req: AuthRequest, res) => {
    try {
      const newsId = parseInt(req.params.id);
      const userId = req.user.uid;
      const { content } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ error: "Empty comment" });
      
      const [newComment] = await db.insert(newsComments).values({ userId, newsId, content: content.trim() }).returning();
      
      const userRec = await db.select().from(users).where(eq(users.uid, userId));
      
      res.json({
         id: newComment.id,
         content: newComment.content,
         createdAt: newComment.createdAt,
         userId: userRec[0].uid,
         userName: userRec[0].userName || userRec[0].email?.split('@')[0],
         profilePic: userRec[0].profilePicUrl
      });
    } catch (e) {
      res.status(500).json({ error: "Server error" });
    }
  });


  // ==========================================
  // TUTORIALS & SECTIONS API
  // ==========================================

  // Get all newbie links
  app.get("/api/newbie/links", async (req, res) => {
    try {
      const list = await db.select().from(newbie_links).orderBy(newbie_links.id);
      res.json(list);
    } catch (e) {
      console.error(e);
      res.status(550).json({ error: "Server error" });
    }
  });

  // Create newbie link (Admin)
  app.post("/api/admin/newbie/links", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const { title, url, description } = req.body;
      if (!title || !url) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const [newLink] = await db.insert(newbie_links).values({ title, url, description }).returning();
      res.json(newLink);
    } catch (e) {
      console.error(e);
      res.status(550).json({ error: "Server error" });
    }
  });

  // Update newbie link (Admin)
  app.put("/api/admin/newbie/links/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const id = parseInt(req.params.id);
      const { title, url, description } = req.body;
      const [updated] = await db.update(newbie_links)
        .set({ title, url, description })
        .where(eq(newbie_links.id, id))
        .returning();
      if (!updated) {
        return res.status(404).json({ error: "Link not found" });
      }
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(550).json({ error: "Server error" });
    }
  });

  // Delete newbie link (Admin)
  app.delete("/api/admin/newbie/links/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ error: "Unauthorized" });
      }
      const id = parseInt(req.params.id);
      await db.delete(newbie_links).where(eq(newbie_links.id, id));
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(550).json({ error: "Server error" });
    }
  });

  // Get all sections
  app.get("/api/tutorials/sections", async (req, res) => {
    try {
      const sectionsList = await db.select().from(tutorial_sections);
      res.json(sectionsList);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get all tutorials
  app.get("/api/tutorials", async (req, res) => {
    try {
      const { sectionId } = req.query;
      let query = db.select().from(tutorials).$dynamic();
      if (sectionId) {
        query = query.where(eq(tutorials.sectionId, parseInt(sectionId as string)));
      }
      const list = await query;
      res.json(list.map((t: any) => ({
        ...t,
        steps: JSON.parse(t.steps)
      })));
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get single tutorial with feedback
  app.get("/api/tutorials/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [tutorial] = await db.select().from(tutorials).where(eq(tutorials.id, id));
      if (!tutorial) return res.status(404).json({ error: "Tutorial not found" });

      const feedbackList = await db.select().from(tutorial_feedback).where(eq(tutorial_feedback.tutorialId, id));

      const feedbackWithUser = await Promise.all(feedbackList.map(async (fb: any) => {
        const [userRec] = await db.select().from(users).where(eq(users.uid, fb.userId));
        return {
          ...fb,
          userName: userRec ? (userRec.userName || userRec.email?.split('@')[0]) : 'طالب',
          profilePicUrl: userRec?.profilePicUrl
        };
      }));

      res.json({
        ...tutorial,
        steps: JSON.parse(tutorial.steps),
        feedback: feedbackWithUser
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Submit feedback
  app.post("/api/tutorials/:id/feedback", requireAuth, async (req: AuthRequest, res) => {
    try {
      const tutorialId = parseInt(req.params.id);
      const userId = req.user.uid;
      const { isHelpful, comment } = req.body;

      const existing = await db.select().from(tutorial_feedback).where(
        and(
          eq(tutorial_feedback.tutorialId, tutorialId),
          eq(tutorial_feedback.userId, userId)
        )
      );

      let feedbackRecord;
      if (existing.length > 0) {
        [feedbackRecord] = await db.update(tutorial_feedback)
          .set({ isHelpful, comment: comment || null })
          .where(eq(tutorial_feedback.id, existing[0].id))
          .returning();
      } else {
        [feedbackRecord] = await db.insert(tutorial_feedback)
          .values({ tutorialId, userId, isHelpful, comment: comment || null })
          .returning();
      }

      res.json(feedbackRecord);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get comments for specific feedback
  app.get("/api/feedback/:id/comments", async (req, res) => {
    try {
      const feedbackId = parseInt(req.params.id);
      const commentsList = await db.select().from(feedback_comments).where(eq(feedback_comments.feedbackId, feedbackId));
      
      const enriched = await Promise.all(commentsList.map(async (c: any) => {
        const [userRec] = await db.select().from(users).where(eq(users.uid, c.userId));
        return {
          ...c,
          userName: userRec ? (userRec.userName || userRec.email?.split('@')[0]) : (c.userName || 'طالب'),
          profilePicUrl: userRec?.profilePicUrl
        };
      }));

      res.json(enriched);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Post a comment/reply on feedback
  app.post("/api/feedback/:id/comments", requireAuth, async (req: AuthRequest, res) => {
    try {
      const feedbackId = parseInt(req.params.id);
      const userId = req.user.uid;
      const { content } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ error: "Comment text required" });

      const [userRec] = await db.select().from(users).where(eq(users.uid, userId));
      const userName = userRec ? (userRec.userName || userRec.email?.split('@')[0]) : 'طالب';

      const [newComment] = await db.insert(feedback_comments)
        .values({
          feedbackId,
          userId,
          userName,
          content: content.trim()
        })
        .returning();

      res.json({
        ...newComment,
        profilePicUrl: userRec?.profilePicUrl
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get public comments for specific tutorial
  app.get("/api/tutorials/:id/comments", async (req, res) => {
    try {
      const tutorialId = parseInt(req.params.id);
      const commentsList = await db.select().from(tutorial_comments).where(eq(tutorial_comments.tutorialId, tutorialId));
      
      const enriched = await Promise.all(commentsList.map(async (c: any) => {
        const [userRec] = await db.select().from(users).where(eq(users.uid, c.userId));
        return {
          ...c,
          userName: userRec ? (userRec.userName || userRec.email?.split('@')[0]) : (c.userName || 'طالب'),
          profilePicUrl: userRec?.profilePicUrl
        };
      }));

      res.json(enriched);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Post a public comment on specific tutorial
  app.post("/api/tutorials/:id/comments", requireAuth, async (req: AuthRequest, res) => {
    try {
      const tutorialId = parseInt(req.params.id);
      const userId = req.user.uid;
      const { content } = req.body;
      if (!content || !content.trim()) return res.status(400).json({ error: "Comment text required" });

      const [userRec] = await db.select().from(users).where(eq(users.uid, userId));
      const userName = userRec ? (userRec.userName || userRec.email?.split('@')[0]) : 'طالب';

      const [newComment] = await db.insert(tutorial_comments)
        .values({
          tutorialId,
          userId,
          userName,
          content: content.trim()
        })
        .returning();

      res.json({
        ...newComment,
        profilePicUrl: userRec?.profilePicUrl
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Get all feedback
  app.get("/api/admin/tutorials/feedback", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const allFeedback = await db.select().from(tutorial_feedback);
      const enriched = await Promise.all(allFeedback.map(async (fb: any) => {
        const [userRec] = await db.select().from(users).where(eq(users.uid, fb.userId));
        const [tut] = await db.select().from(tutorials).where(eq(tutorials.id, fb.tutorialId));
        return {
          ...fb,
          tutorialTitle: tut ? tut.title : 'شرح محذوف',
          userName: userRec ? (userRec.userName || userRec.email?.split('@')[0]) : 'طالب',
          userEmail: userRec?.email,
          profilePicUrl: userRec?.profilePicUrl
        };
      }));
      res.json(enriched);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Manage Sections
  app.post("/api/admin/tutorials/sections", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { title, icon, color } = req.body;
      if (!title) return res.status(400).json({ error: "Title required" });
      const [newSection] = await db.insert(tutorial_sections).values({ title, icon, color }).returning();
      res.json(newSection);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/admin/tutorials/sections/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const id = parseInt(req.params.id);
      const { title, icon, color } = req.body;
      const [updated] = await db.update(tutorial_sections)
        .set({ title, icon, color })
        .where(eq(tutorial_sections.id, id))
        .returning();
      res.json(updated);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/admin/tutorials/sections/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const id = parseInt(req.params.id);
      await db.delete(tutorial_sections).where(eq(tutorial_sections.id, id));
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: Manage Tutorials
  app.post("/api/admin/tutorials", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const { sectionId, title, description, text: fullText, steps = [], videoUrl, imageUrl, linkUrl, linkTitle } = req.body;
      if (!sectionId || !title || !description || !fullText) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const [newTutorial] = await db.insert(tutorials).values({
        sectionId: parseInt(sectionId),
        title,
        description,
        text: fullText,
        steps: JSON.stringify(steps),
        videoUrl: videoUrl || null,
        imageUrl: imageUrl || null,
        linkUrl: linkUrl || null,
        linkTitle: linkTitle || null
      }).returning();
      res.json({
        ...newTutorial,
        steps: JSON.parse(newTutorial.steps)
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/admin/tutorials/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const id = parseInt(req.params.id);
      const { sectionId, title, description, text: fullText, steps = [], videoUrl, imageUrl, linkUrl, linkTitle } = req.body;
      const [updated] = await db.update(tutorials)
        .set({
          sectionId: parseInt(sectionId),
          title,
          description,
          text: fullText,
          steps: JSON.stringify(steps),
          videoUrl: videoUrl || null,
          imageUrl: imageUrl || null,
          linkUrl: linkUrl || null,
          linkTitle: linkTitle || null
        })
        .where(eq(tutorials.id, id))
        .returning();
      res.json({
        ...updated,
        steps: JSON.parse(updated.steps)
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/admin/tutorials/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      const id = parseInt(req.params.id);
      await db.delete(tutorials).where(eq(tutorials.id, id));
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });


  // Calendar ICS Export
  app.get("/api/calendar.ics", async (req, res) => {
    try {
      const records = await db.select().from(events);
      let icsContent = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//IMAMU App//EN\r\n";
      for (const ev of records) {
        // Very basic ICS formatting
        const start = new Date(ev.date).toISOString().replace(/[-:]/g, '').split('.')[0] + "Z";
        icsContent += `BEGIN:VEVENT\r\nUID:${ev.id}@imamu.edu\r\nDTSTAMP:${start}\r\nDTSTART:${start}\r\nSUMMARY:${ev.title}\r\nDESCRIPTION:${ev.description || ''}\r\nEND:VEVENT\r\n`;
      }
      icsContent += "END:VCALENDAR\r\n";
      res.setHeader('Content-Type', 'text/calendar');
      res.setHeader('Content-Disposition', 'attachment; filename="calendar.ics"');
      res.send(icsContent);
    } catch (error) {
      console.error(error);
      res.status(500).send("Error generating ICS");
    }
  });

  // Admin routes
  // Implement a checkAdmin helper inside
  const checkAdmin = async (req: AuthRequest) => {
    if(!req.user) return false;
    const user = await db.select().from(users).where(eq(users.uid, req.user.uid));
    return user[0]?.isAdmin === true;
  };

  // Configure disk storage for uploaded media files
  const diskStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(process.cwd(), 'public/uploads'));
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const diskUpload = multer({ 
    storage: diskStorage,
    limits: { fileSize: 50 * 1024 * 1024 } // limit to 50MB
  });

  app.post("/api/admin/upload", requireAuth, diskUpload.array("files", 10), async (req: AuthRequest & { files?: Express.Multer.File[] }, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }
      const urls = req.files.map(f => `/uploads/${f.filename}`);
      res.json({ success: true, urls });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/admin/subjects/deduplicate", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      const allSubjects = await db.query.subjects.findMany();
      
      const byCode: Record<string, any[]> = {};
      for (const s of allSubjects) {
         const code = (s.code as string)?.trim().toLowerCase();
         if (!code) continue;
         if(!byCode[code]) byCode[code] = [];
         byCode[code].push(s);
      }
      
      for (const code of Object.keys(byCode)) {
         const list = byCode[code];
         if (list.length > 1) {
            list.sort((a, b) => {
               const scoreA = (a.driveLink ? 1 : 0) + (a.whatsappLink ? 1 : 0);
               const scoreB = (b.driveLink ? 1 : 0) + (b.whatsappLink ? 1 : 0);
               if (scoreA !== scoreB) return scoreB - scoreA;
               return (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0);
            });
            
            const bestId = list[0].id;
            for (let i = 1; i < list.length; i++) {
               const duplicateId = list[i].id;
               await db.update(majorCourses).set({ subjectId: bestId }).where(eq(majorCourses.subjectId, duplicateId));
               await db.delete(subjects).where(eq(subjects.id, duplicateId));
            }
         }
      }
      
      res.json({success:true});
    } catch(e) { console.error(e); res.status(500).json({error:"Error"}); }
  });

  app.post("/api/admin/subjects", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      const { code, name, driveLink, whatsappLink, majorId, creditHours, level } = req.body;
      const inserted = await db.insert(subjects).values({ 
        code, 
        name, 
        driveLink, 
        whatsappLink, 
        creditHours: creditHours ? parseInt(creditHours) : 3, 
        level: level ? parseInt(level) : null
      }).returning();
      if(majorId) {
        await db.insert(majorCourses).values({ majorId: parseInt(majorId), subjectId: inserted[0].id });
      }
      res.json({success:true});
    } catch(e) { console.error(e); res.status(500).json({error:"Error"}); }
  });

  app.put("/api/admin/subjects/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      const { code, name, driveLink, whatsappLink, majorId, creditHours, level } = req.body;
      const updated = await db.update(subjects)
        .set({ 
          code, 
          name, 
          driveLink, 
          whatsappLink, 
          creditHours: creditHours ? parseInt(creditHours) : 3, 
          level: level ? parseInt(level) : null
        })
        .where(eq(subjects.id, parseInt(req.params.id)))
        .returning();
        
      if (updated.length === 0) {
        return res.status(404).json({error: "Subject not found"});
      }
      
      if(majorId) {
        const existing = await db.select().from(majorCourses).where(and(eq(majorCourses.subjectId, parseInt(req.params.id)), eq(majorCourses.majorId, parseInt(majorId))));
        if(existing.length === 0) {
          await db.insert(majorCourses).values({ majorId: parseInt(majorId), subjectId: parseInt(req.params.id) });
        }
      }
      res.json({success:true});
    } catch(e) { console.error(e); res.status(500).json({error:"Error"}); }
  });

  app.delete("/api/admin/subjects/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      await db.delete(subjects).where(eq(subjects.id, parseInt(req.params.id)));
      res.json({success:true});
    } catch(e) { res.status(500).json({error:"Error"}); }
  });

  app.post("/api/admin/majors", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      const { name, pdfUrl, courses, batches } = req.body;
      const inserted = await db.insert(majors).values({ name, pdfUrl }).returning();
      if (courses && Array.isArray(courses)) {
        const batchMap = new Map<string, number>();
        if (batches && Array.isArray(batches)) {
          batches.forEach(b => {
             if (b.name) batchMap.set(b.name, parseInt(b.reqCount) || 1);
          });
        }
        
        const allSubjects = await db.select().from(subjects);
        const normalizeCode = (code: string) => {
          if (!code) return '';
          const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
          let str = code.toLowerCase().replace(/\s+/g,'').replace(/-/g, '').replace(/_/g, '').trim();
          for (let n = 0; n < 10; n++) {
            str = str.replace(new RegExp(arabicNumbers[n], 'g'), n.toString());
          }
          return str;
        };
        for(const c of courses) {
          let sId = c.subjectId;
          if (!sId && c.subjectCode) {
            let found = allSubjects.find(s => normalizeCode(s.code) === normalizeCode(c.subjectCode));
            if (!found) {
               const newSub = await db.insert(subjects).values({ code: c.subjectCode, name: "Unknown Subject (" + c.subjectCode + ")", creditHours: 3 }).returning();
               found = newSub[0];
               allSubjects.push(found);
            }
            if (found) sId = found.id;
          }
          if (sId) {
            let reqCount = c.optionalGroupReqCount ? parseInt(c.optionalGroupReqCount) : 1;
            if (c.optionalGroup && !c.optionalGroupReqCount && batchMap.has(c.optionalGroup)) {
               reqCount = batchMap.get(c.optionalGroup) || 1;
            }
            await db.insert(majorCourses).values({ 
              majorId: inserted[0].id, 
              subjectId: sId,
              optionalGroup: c.optionalGroup || null,
              optionalGroupReqCount: reqCount
            });
          }
        }
      }
      res.json({success:true});
    } catch(e) { console.error(e); res.status(500).json({error:"Error"}); }
  });

  app.put("/api/admin/majors/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      const { name, pdfUrl, courses, batches } = req.body;
      const updated = await db.update(majors).set({ name, pdfUrl }).where(eq(majors.id, parseInt(req.params.id))).returning();
      if (updated.length === 0) {
        return res.status(404).json({error: "Major not found"});
      }
      if (courses && Array.isArray(courses)) {
        await db.delete(majorCourses).where(eq(majorCourses.majorId, parseInt(req.params.id)));
        
        const batchMap = new Map<string, number>();
        if (batches && Array.isArray(batches)) {
          batches.forEach(b => {
             if (b.name) batchMap.set(b.name, parseInt(b.reqCount) || 1);
          });
        }
        
        const allSubjects = await db.select().from(subjects);
        const normalizeCode = (code: string) => {
          if (!code) return '';
          const arabicNumbers = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
          let str = code.toLowerCase().replace(/\s+/g,'').replace(/-/g, '').replace(/_/g, '').trim();
          for (let n = 0; n < 10; n++) {
            str = str.replace(new RegExp(arabicNumbers[n], 'g'), n.toString());
          }
          return str;
        };
        for(const c of courses) {
          let sId = c.subjectId;
          if (!sId && c.subjectCode) {
            let found = allSubjects.find(s => normalizeCode(s.code) === normalizeCode(c.subjectCode));
            if (!found) {
               const newSub = await db.insert(subjects).values({ code: c.subjectCode, name: "Unknown Subject (" + c.subjectCode + ")", creditHours: 3 }).returning();
               found = newSub[0];
               allSubjects.push(found);
            }
            if (found) sId = found.id;
          }
          if (sId) {
            let reqCount = c.optionalGroupReqCount ? parseInt(c.optionalGroupReqCount) : 1;
            if (c.optionalGroup && !c.optionalGroupReqCount && batchMap.has(c.optionalGroup)) {
               reqCount = batchMap.get(c.optionalGroup) || 1;
            }
            await db.insert(majorCourses).values({ 
              majorId: parseInt(req.params.id), 
              subjectId: sId,
              optionalGroup: c.optionalGroup || null,
              optionalGroupReqCount: reqCount
            });
          }
        }
      }
      res.json({success:true});
    } catch(e) { console.error(e); res.status(500).json({error:"Error"}); }
  });

  app.delete("/api/admin/majors/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      await db.delete(majors).where(eq(majors.id, parseInt(req.params.id)));
      res.json({success:true});
    } catch(e) { res.status(500).json({error:"Error"}); }
  });
  
  app.post("/api/admin/events", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      const { title, date, description } = req.body;
      const existing = await db.select().from(events).where(and(eq(events.title, title), eq(events.date, date)));
      if (existing.length > 0) {
        const currentDesc = existing[0].description || "";
        const newDesc = description || "";
        const parts = [currentDesc.trim(), newDesc.trim()].filter(Boolean);
        const uniqueParts = Array.from(new Set(parts));
        const mergedDesc = uniqueParts.join(" • ");
        await db.update(events).set({ description: mergedDesc }).where(eq(events.id, existing[0].id));
      } else {
        await db.insert(events).values({ title, date, description });
      }
      res.json({success:true});
    } catch(e) { res.status(500).json({error:"Error"}); }
  });

  app.post("/api/admin/events/generate-mokafaa", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      // First, delete any existing mokafaa events to avoid duplicates if generated multiple times
      await db.delete(events).where(ilike(events.title, '%Mokafaa%'));

      const now = new Date();
      const eventsToInsert: any[] = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 25);
        // Format as YYYY-MM-DD
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-25`;
        eventsToInsert.push({
          title: "Mokafaa (Student Allowance)",
          date: dateStr,
          description: "Monthly student allowance disbursement."
        });
      }
      await db.insert(events).values(eventsToInsert);
      res.json({success: true, message: "Generated 12 Mokafaa events."});
    } catch(e) { res.status(500).json({error:"Error"}); }
  });

  app.put("/api/admin/events/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      const { title, date, description } = req.body;
      const targetId = parseInt(req.params.id);
      const existing = await db.select().from(events).where(eq(events.id, targetId));
      if (existing.length > 0) {
        // If updating an event, merge incoming description with the existing one (ignoring exact duplicates)
        const currentDesc = existing[0].description || "";
        const newDesc = description || "";
        const parts = [currentDesc.trim(), newDesc.trim()].filter(Boolean);
        const uniqueParts = Array.from(new Set(parts));
        const mergedDesc = uniqueParts.join(" • ");
        await db.update(events).set({ title, date, description: mergedDesc }).where(eq(events.id, targetId));
      } else {
        await db.update(events).set({ title, date, description }).where(eq(events.id, targetId));
      }
      res.json({success:true});
    } catch(e) { res.status(500).json({error:"Error"}); }
  });

  app.delete("/api/admin/events/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      await db.delete(events).where(eq(events.id, parseInt(req.params.id)));
      res.json({success:true});
    } catch(e) { res.status(500).json({error:"Error"}); }
  });

  app.post("/api/admin/news", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      const { content, source, imageUrl, date } = req.body;
      await db.insert(news).values({ content, source, imageUrl, date });
      res.json({success:true});
    } catch(e) { res.status(500).json({error:"Error"}); }
  });

  app.get("/api/admin/news_sources", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      const records = await db.select().from(news_sources);
      
      const counts = await db.select({
        source: news.source,
        count: sql<number>`count(*)`
      }).from(news).groupBy(news.source);
      
      const countsMap = new Map(counts.map(c => [c.source, Number(c.count)]));
      
      const enrichedRecords = records.map(s => ({
        ...s,
        newsCount: countsMap.get(s.handle) || 0
      }));
      res.json(enrichedRecords);
    } catch(e: any) { 
      console.error("GET /api/admin/news_sources Error:", e);
      res.status(500).json({error: e.message || "Error"}); 
    }
  });

  app.post("/api/admin/news_sources", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      const handle = req.body.handle?.trim();
      if (!handle) return res.status(400).json({ error: "Handle is required" });
      await db.insert(news_sources).values({ handle }).onConflictDoNothing();
      res.json({success:true});
    } catch(e: any) { 
      console.error(e); 
      if (e.code === '23505' || e.message?.includes('unique constraint')) {
        return res.status(400).json({error: "Source already exists"});
      }
      res.status(500).json({error: e.message || "Error"}); 
    }
  });

const OFFICIAL_IMAMU_AVATAR = 'https://upload.wikimedia.org/wikipedia/ar/e/e0/%D8%B4%D8%B9%D8%A7%D8%B1_%D8%AC%D8%A7%D9%85%D8%B9%D8%A9_%D8%A7%D9%84%D8%A5%D9%85%D8%A7%D9%85_%D9%85%D8%AD%D9%85%D8%AF_%D8%A8%D9%86_%D8%B3%D8%B9%D9%88%D8%AF_%D8%A7%D9%84%D8%A5%D8%B3%D9%84%D8%A7%D9%85%D9%8A%D8%A9.png';

async function resolveArticleMedia(articleUrl: string) {
  try {
    const res = await fetch(articleUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html'
      },
      signal: AbortSignal.timeout(4000)
    });
    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);
      
      let img = $('meta[property="og:image"]').attr('content') ||
                $('meta[name="twitter:image"]').attr('content') ||
                $('meta[property="twitter:image"]').attr('content') ||
                $('article img').first().attr('src') ||
                $('img[src*="pbs.twimg.com"]').attr('src') || '';

      const vid = $('meta[property="og:video"]').attr('content') ||
                  $('meta[property="og:video:url"]').attr('content') ||
                  $('iframe[src*="youtube.com"]').attr('src') ||
                  $('iframe[src*="vimeo.com"]').attr('src') ||
                  $('video source').attr('src') ||
                  $('video').attr('src') || '';

      if (img.includes('googleusercontent.com') || img.includes('gstatic.com') || img.includes('favicon')) {
        img = '';
      }

      const imageUrl = img ? (img.startsWith('//') ? `https:${img}` : img) : '';
      const videoUrl = vid ? (vid.startsWith('//') ? `https:${vid}` : vid) : '';

      return { imageUrl, videoUrl };
    }
  } catch (err) {}
  return { imageUrl: '', videoUrl: '' };
}

async function fetchTweetsFromGoogleNews(handle: string) {
  try {
    const cleanHandle = handle.replace(/^@/, '');
    const isCcis = cleanHandle.toLowerCase().includes('ccis');
    const isNews = cleanHandle.toLowerCase().includes('news');
    
    let authorName = 'جامعة الإمام محمد بن سعود الإسلامية';
    if (isCcis) authorName = 'كلية علوم الحاسب والمعلومات - جامعة الإمام';
    else if (isNews) authorName = 'أخبار جامعة الإمام';

    const searchTerm = isCcis
      ? 'كلية الحاسب جامعة الإمام OR CCIS IMAMU'
      : 'جامعة الإمام محمد بن سعود';

    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(searchTerm)}&hl=ar&gl=SA&ceid=SA:ar`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });

    if (res.ok) {
      const xml = await res.text();
      const $ = cheerio.load(xml, { xmlMode: true });
      const items = $('item');
      const rawItems: any[] = [];

      items.slice(0, 40).each((i, el) => {
        const rawTitle = $(el).find('title').text().trim();
        const link = $(el).find('link').text().trim();
        const pubDate = $(el).find('pubDate').text().trim();

        const cleanedContent = rawTitle
          .replace(/^عام\s*\/\s*/, '')
          .replace(/\s*-\s*(وكالة الأنباء السعودية|صحيفة سبق الإلكترونية|صحيفة سويفت نيوز|صحيفة شفق الإلكترونية|صحيفة النهار السعودية|alyaum|صحيفة عكاظ|صحيفة الرياض).*/i, '')
          .trim();

        let tweetId = '';
        const match = link.match(/[?&]id=([^&]+)/) || link.match(/\/articles\/([^?]+)/);
        if (match) {
          tweetId = match[1];
        } else {
          tweetId = `gnews_${Buffer.from(cleanedContent).toString('hex').slice(0, 16)}`;
        }

        if (cleanedContent) {
          rawItems.push({
            cleanedContent,
            link,
            pubDate,
            tweetId
          });
        }
      });

      // Expanded pool of 12 distinct high-res university campus and tech lab photos
      const universityImages = isCcis ? [
        'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1531482615713-2afd69097998?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?q=80&w=1000&auto=format&fit=crop'
      ] : [
        'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?q=80&w=1000&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=1000&auto=format&fit=crop'
      ];

      const tweets = await Promise.all(
        rawItems.map(async (item, idx) => {
          const media = await resolveArticleMedia(item.link);
          const finalImage = media.imageUrl || universityImages[idx % universityImages.length];

          return {
            content: item.cleanedContent,
            date: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            imageUrl: finalImage ? JSON.stringify([finalImage]) : "",
            videoUrl: media.videoUrl || "",
            tweetId: item.tweetId,
            authorName,
            authorHandle: `@${cleanHandle}`,
            authorAvatar: OFFICIAL_IMAMU_AVATAR
          };
        })
      );

      if (tweets.length > 0) {
        return { tweets, profilePicUrl: OFFICIAL_IMAMU_AVATAR };
      }
    }
  } catch (err) {
    console.error('Google News fetch error:', err);
  }
  return { tweets: [], profilePicUrl: OFFICIAL_IMAMU_AVATAR };
}

async function fetchTweetsFromNitter(handle: string, dbAuthToken?: string, dbCt0?: string) {
    return await fetchTweetsFromGoogleNews(handle);
}

  app.get("/api/settings", async (req, res): Promise<any> => {
    try {
      const settings = await db.query.global_settings.findFirst();
      res.json({
        semesterStartDate: settings?.semesterStartDate || null,
        semesterEndDate: settings?.semesterEndDate || null,
      });
    } catch(e) { res.status(500).json({error:"Error"}); }
  });

  // External APIs protected by apiToken
  app.get("/api/external/check-phone", async (req, res): Promise<any> => {
    try {
      const authHeader = req.headers.authorization;
      const settings = await db.query.global_settings.findFirst();
      if (!settings?.apiToken || authHeader !== `Bearer ${settings.apiToken}`) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { phone } = req.query;
      if (!phone || typeof phone !== 'string') return res.status(400).json({ error: "Phone number required" });

      // Clean the phone string (remove +, spaces, leading zeros or 966)
      const cleanPhone = phone.replace(/\D/g, '');
      let basePhone = cleanPhone;
      if (cleanPhone.startsWith('966')) basePhone = cleanPhone.substring(3);
      if (basePhone.startsWith('0')) basePhone = basePhone.substring(1);

      // Now basePhone should be the 9 digit KSA number (e.g. 5xxxxxxxx).
      // Let's check users.
      const allUsers = await db.query.users.findMany({ columns: { phone: true } });
      const exists = allUsers.some(u => {
        if (!u.phone) return false;
        let uPhone = u.phone.replace(/\D/g, '');
        if (uPhone.startsWith('966')) uPhone = uPhone.substring(3);
        if (uPhone.startsWith('0')) uPhone = uPhone.substring(1);
        return uPhone === basePhone;
      });

      res.json({ exists });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/external/notify-phone-change", async (req, res): Promise<any> => {
    try {
      const authHeader = req.headers.authorization;
      const settings = await db.query.global_settings.findFirst();
      if (!settings?.apiToken || authHeader !== `Bearer ${settings.apiToken}`) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { oldPhone, newPhone } = req.body;
      if (!oldPhone || !newPhone) return res.status(400).json({ error: "Missing phone numbers" });

      // For now just logging it, later could be expanded
      console.log(`[EXTERNAL_API] Phone changed from ${oldPhone} to ${newPhone}`);

      res.json({ success: true, message: "Notification received" });
    } catch(e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/admin/global_settings", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      let settings = await db.query.global_settings.findFirst();
      if (!settings) {
        settings = (await db.insert(global_settings).values({ fetchRangeDays: 30, autoDeleteDays: 30 }).returning())[0];
      }
      res.json(settings);
    } catch(e) { res.status(500).json({error:"Error"}); }
  });

  app.put("/api/admin/global_settings", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      const { fetchRangeDays, autoDeleteDays, smtpHost, smtpPort, smtpUser, smtpPass, imapHost, imapPort, imapSecure, semesterStartDate, semesterEndDate, apiToken } = req.body;
      let settings = await db.query.global_settings.findFirst();
      if (!settings) {
        await db.insert(global_settings).values({ fetchRangeDays, autoDeleteDays, smtpHost, smtpPort, smtpUser, smtpPass, imapHost, imapPort, imapSecure, semesterStartDate, semesterEndDate, apiToken });
      } else {
        await db.update(global_settings).set({ fetchRangeDays, autoDeleteDays, smtpHost, smtpPort, smtpUser, smtpPass, imapHost, imapPort, imapSecure, semesterStartDate, semesterEndDate, apiToken }).where(eq(global_settings.id, Number(settings.id)));
      }
      res.json({success:true});
    } catch(e) { res.status(500).json({error:"Error"}); }
  });

  app.get("/api/admin/export-db", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      const allSettings = await db.query.global_settings.findMany();
      const allUsers = await db.query.users.findMany({
        columns: {
          id: true,
          uid: true,
          email: true,
          phone: true,
          userName: true,
          isAdmin: true,
          major: true,
          currentGpa: true,
          finishedHours: true,
          profilePicUrl: true,
          createdAt: true
        }
      });
      const allMajors = await db.query.majors.findMany();
      const allSubjects = await db.query.subjects.findMany();
      const allEvents = await db.query.events.findMany();
      const allNews = await db.query.news.findMany();
      const allNewsSources = await db.query.news_sources.findMany();
      const allTutorialSections = await db.query.tutorial_sections.findMany();
      const allTutorials = await db.query.tutorials.findMany();
      const allTutorialFeedback = await db.query.tutorial_feedback.findMany();
      const allFeedbackComments = await db.query.feedback_comments.findMany();
      const allNewbieLinks = await db.query.newbie_links.findMany();

      const backupData = {
        exportDate: new Date(),
        data: {
          settings: allSettings,
          users: allUsers,
          majors: allMajors,
          subjects: allSubjects,
          events: allEvents,
          news: allNews,
          newsSources: allNewsSources,
          tutorialSections: allTutorialSections,
          tutorials: allTutorials,
          tutorialFeedback: allTutorialFeedback,
          feedbackComments: allFeedbackComments,
          newbieLinks: allNewbieLinks
        }
      };

      const zip = new AdmZip();
      
      // Add DB export JSON entry
      zip.addFile('db_export.json', Buffer.from(JSON.stringify(backupData, null, 2), 'utf-8'));

      // Add uploads directory files if it exists
      const uploadsDir = path.join(process.cwd(), 'public/uploads');
      if (fs.existsSync(uploadsDir)) {
        zip.addLocalFolder(uploadsDir, 'uploads');
      }

      const zipBuffer = zip.toBuffer();

      res.attachment(`imamu_backup_${new Date().toISOString().split('T')[0]}.zip`);
      res.send(zipBuffer);
    } catch(e) {
      console.error(e);
      res.status(500).json({error: "Failed to export DB"});
    }
  });

  const importUpload = multer({ limits: { fileSize: 100 * 1024 * 1024 } });

  app.post("/api/admin/import-db", requireAuth, importUpload.single("file"), async (req: AuthRequest & { file?: Express.Multer.File }, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      if (!req.file) return res.status(400).json({error: "No file uploaded"});

      const zip = new AdmZip(req.file.buffer);
      const zipEntries = zip.getEntries();

      // Find db_export.json
      const dbEntry = zipEntries.find(e => e.entryName === 'db_export.json');
      if (!dbEntry) return res.status(400).json({error: "Invalid backup: missing db_export.json"});

      const dbData = JSON.parse(dbEntry.getData().toString('utf-8'));
      const data = dbData.data || dbData;

      // Extract uploads
      const uploadsDir = path.join(process.cwd(), 'public/uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      zipEntries.forEach(entry => {
        if (entry.entryName.startsWith('uploads/') && !entry.isDirectory) {
          const fileName = entry.entryName.substring(8); // Remove 'uploads/' prefix
          if (fileName) {
            const destPath = path.join(uploadsDir, fileName);
            fs.writeFileSync(destPath, entry.getData());
          }
        }
      });

      // We need to carefully insert or overwrite tables.
      // Usually an import replaces everything, but we should be careful.
      // For simplicity, we can delete existing records and insert new ones, or just insert new ones (ignoring conflicts).
      
      if (data.settings && data.settings.length > 0) {
        await db.delete(global_settings);
        await db.insert(global_settings).values(data.settings);
      }
      
      if (data.majors && data.majors.length > 0) {
        const mapped = data.majors.map((item: any) => ({
          ...item,
          createdAt: item.createdAt ? new Date(item.createdAt) : null
        }));
        await db.delete(majors);
        await db.insert(majors).values(mapped);
      }
      
      if (data.subjects && data.subjects.length > 0) {
        const mapped = data.subjects.map((item: any) => ({
          ...item,
          createdAt: item.createdAt ? new Date(item.createdAt) : null
        }));
        await db.delete(subjects);
        await db.insert(subjects).values(mapped);
      }
      
      if (data.events && data.events.length > 0) {
        const mapped = data.events.map((item: any) => ({
          ...item,
          createdAt: item.createdAt ? new Date(item.createdAt) : null
        }));
        await db.delete(events);
        await db.insert(events).values(mapped);
      }
      
      if (data.newsSources && data.newsSources.length > 0) {
        const mapped = data.newsSources.map((item: any) => ({
          ...item,
          createdAt: item.createdAt ? new Date(item.createdAt) : null,
          lastFetched: item.lastFetched ? new Date(item.lastFetched) : null
        }));
        await db.delete(news_sources);
        await db.insert(news_sources).values(mapped);
      }
      
      if (data.news && data.news.length > 0) {
        const mapped = data.news.map((item: any) => ({
          ...item,
          createdAt: item.createdAt ? new Date(item.createdAt) : null
        }));
        await db.delete(news);
        await db.insert(news).values(mapped);
      }

      if (data.tutorialSections && data.tutorialSections.length > 0) {
        await db.delete(tutorial_sections);
        await db.insert(tutorial_sections).values(data.tutorialSections);
      }

      if (data.tutorials && data.tutorials.length > 0) {
        await db.delete(tutorials);
        await db.insert(tutorials).values(data.tutorials);
      }

      if (data.tutorialFeedback && data.tutorialFeedback.length > 0) {
        const mapped = data.tutorialFeedback.map((item: any) => ({
          ...item,
          createdAt: item.createdAt ? new Date(item.createdAt) : null
        }));
        await db.delete(tutorial_feedback);
        await db.insert(tutorial_feedback).values(mapped);
      }

      if (data.feedbackComments && data.feedbackComments.length > 0) {
        const mapped = data.feedbackComments.map((item: any) => ({
          ...item,
          createdAt: item.createdAt ? new Date(item.createdAt) : null
        }));
        await db.delete(feedback_comments);
        await db.insert(feedback_comments).values(mapped);
      }

      if (data.newbieLinks && data.newbieLinks.length > 0) {
        const mapped = data.newbieLinks.map((item: any) => ({
          ...item,
          createdAt: item.createdAt ? new Date(item.createdAt) : null
        }));
        await db.delete(newbie_links);
        await db.insert(newbie_links).values(mapped);
      }
      
      // Note: We avoid importing users to prevent overwriting existing passwords and auth data, unless specifically requested.

      res.json({ message: "Import successful" });
    } catch(e) {
      console.error(e);
      res.status(500).json({error: "Failed to import DB"});
    }
  });

  app.post("/api/admin/news_sources/fetch-all", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      const sources = await db.query.news_sources.findMany();
      let settings = await db.query.global_settings.findFirst();
      const fDays = settings?.fetchRangeDays || 30;
      const aDays = settings?.autoDeleteDays || 30;
      let totalFetched = 0;
      
      for (const source of sources) {
        try {
          const { tweets, profilePicUrl } = await fetchTweetsFromNitter(String(source.handle));

          let count = 0;
          const fDaysNum = Number(fDays) || 30;
          const aDaysNum = Number(aDays) || 30;
          const rangeDate = new Date();
          rangeDate.setDate(rangeDate.getDate() - fDaysNum);

          for (const p of tweets) {
            if (p.content && p.date) {
               const postDate = new Date(p.date as string);
               if (postDate >= rangeDate) {
                 await db.insert(news).values({
                   content: String(p.content),
                   source: String(source.handle),
                   imageUrl: p.imageUrl ? String(p.imageUrl) : "",
                   videoUrl: p.videoUrl ? String(p.videoUrl) : "",
                   date: String(p.date),
                   tweetId: p.tweetId ? String(p.tweetId) : null,
                   authorName: p.authorName ? String(p.authorName) : "",
                   authorHandle: p.authorHandle ? String(p.authorHandle) : "",
                   authorAvatar: p.authorAvatar ? String(p.authorAvatar) : ""
                  }).onConflictDoUpdate({
                    target: news.tweetId,
                    set: {
                      imageUrl: p.imageUrl ? String(p.imageUrl) : sql`news.image_url`,
                      videoUrl: p.videoUrl ? String(p.videoUrl) : sql`news.video_url`,
                      content: String(p.content),
                      authorName: p.authorName ? String(p.authorName) : sql`news.author_name`
                    }
                  });
                 count++;
               }
            }
          }
          
          await db.update(news_sources).set({ 
             lastFetched: new Date(),
             ...profilePicUrl ? { profilePicUrl: String(profilePicUrl) } : {}
          }).where(eq(news_sources.id, Number(source.id)));

          const autoDeleteDateStr = new Date(new Date().setDate(new Date().getDate() - aDaysNum)).toISOString();
          await db.execute(sql`DELETE FROM news WHERE source = ${source.handle} AND date < ${autoDeleteDateStr}`);
          
          totalFetched += count;
        } catch(e) { console.error(`Error fetching for ${source.handle}:`, e); }
      }
      
      res.json({ success: true, fetchedCount: totalFetched });
    } catch(e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch all news", message: e.message });
    }
  });

  app.post("/api/admin/news_sources/:handle/fetch", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      const handle = req.params.handle;
      const source = await db.query.news_sources.findFirst({ where: eq(news_sources.handle, handle) });
      let settings = await db.query.global_settings.findFirst();
      const fDays = settings?.fetchRangeDays || 30;
      const aDays = settings?.autoDeleteDays || 30;
      const fDaysNum = Number(fDays) || 30;
      const aDaysNum = Number(aDays) || 30;
      
      const { tweets, profilePicUrl } = await fetchTweetsFromNitter(handle);

      let count = 0;
      const rangeDate = new Date();
      rangeDate.setDate(rangeDate.getDate() - fDaysNum);

      for (const p of tweets) {
        if (p.content && p.date) {
           const postDate = new Date(p.date);
             await db.insert(news).values({
               content: p.content,
               source: handle,
                imageUrl: p.imageUrl || "",
                videoUrl: p.videoUrl || "",
                date: p.date,
                tweetId: p.tweetId || null,
                authorName: p.authorName || "",
                authorHandle: p.authorHandle || "",
                authorAvatar: p.authorAvatar || ""
              }).onConflictDoUpdate({
                target: news.tweetId,
                set: {
                  imageUrl: p.imageUrl ? String(p.imageUrl) : sql`news.image_url`,
                  videoUrl: p.videoUrl ? String(p.videoUrl) : sql`news.video_url`,
                  content: String(p.content),
                  authorName: p.authorName ? String(p.authorName) : sql`news.author_name`
                }
              });
             count++;
        }
      }
      
      if (source) {
        await db.update(news_sources).set({ 
           lastFetched: new Date(),
           ...profilePicUrl ? { profilePicUrl } : {}
        }).where(eq(news_sources.id, source.id));

        const autoDeleteDateStr = new Date(new Date().setDate(new Date().getDate() - aDaysNum)).toISOString();
        await db.execute(sql`DELETE FROM news WHERE source = ${source.handle} AND date < ${autoDeleteDateStr}`);
      }
      
      res.json({ success: true, fetchedCount: count });
    } catch(e: any) {
      console.error(e);
      res.status(500).json({ error: "Failed to fetch top news", message: e.message });
    }
  });

  app.delete("/api/admin/news_sources/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      await db.delete(news_sources).where(eq(news_sources.id, parseInt(req.params.id)));
      res.json({success:true});
    } catch(e) { res.status(500).json({error:"Error"}); }
  });

  app.delete("/api/admin/news_sources/:handle/posts", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      const handle = req.params.handle;
      await db.execute(sql`DELETE FROM news WHERE source = ${handle}`);
      res.json({success:true});
    } catch(e) { res.status(500).json({error:"Error"}); }
  });

  app.delete("/api/admin/news/:id", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      await db.delete(news).where(eq(news.id, parseInt(req.params.id)));
      res.json({success:true});
    } catch(e) { res.status(500).json({error:"Error"}); }
  });


const upload = multer({ limits: { fileSize: 10 * 1024 * 1024 } });

app.post("/api/admin/ai_parse", requireAuth, upload.single("file"), async (req: AuthRequest & { file?: Express.Multer.File }, res): Promise<any> => {
  if (!(await checkAdmin(req))) return res.status(403).json({ error: "Admin only" });
  try {
    const { prompt, type } = req.body;
    let text = req.body.text || "";
    const contents: any[] = [];
    
    let schemaProperties: any = {};
    if (type === 'subjects') {
      schemaProperties = {
        code: { type: Type.STRING },
        name: { type: Type.STRING },
        creditHours: { type: Type.INTEGER }
      };
    } else if (type === 'majors') {
      schemaProperties = {
        name: { type: Type.STRING },
        pdfUrl: { type: Type.STRING },
        courses: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              subjectCode: { type: Type.STRING },
              optionalGroup: { type: Type.STRING },
              optionalGroupReqCount: { type: Type.INTEGER }
            }
          }
        },
        batches: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              reqCount: { type: Type.STRING }
            }
          }
        }
      };
    } else if (type === 'events') {
      schemaProperties = {
        title: { type: Type.STRING },
        date: { type: Type.STRING, description: "Format: YYYY-MM-DD" },
        description: { type: Type.STRING }
      };
    }

    const basePrompt = `Extract a JSON array of items based on the provided document or text content, matching the requested schema. Instructions:
${prompt}

Formatting and parsing guidelines for this document:
- For 'events' (academic calendar dates): Carefully locate each row/event in the tables. 
- Look for start date (بداية المدة) and end date (نهاية المدة) columns. If both start and end dates are present for an academic calendar event, please create a calendar entry for the start date and another for the end date, or represent them cleanly so every critical date is kept.
- Convert dates to English Gregorian format: YYYY-MM-DD (e.g., 2025-08-24). Note that the table displays both Hijri (هـ) and Gregorian (م) dates side by side. Ensure you ONLY extract the Gregorian date (matching 2025 or 2026).
- Keep titles in Arabic exactly as shown in the document (e.g. "إجازة اليوم الوطني" or "بداية الدراسة") to match local reference, and make descriptions descriptive.
- For 'subjects' or 'courses': Ensure you handle glued Arabic codes like "نحو١٠٠١اصل١٠٠١" by splitting them into separate subjects (e.g., "نحو١٠٠١" and "اصل١٠٠١"). If course names are missing, infer them based on standard Saudi university names if possible, but the code is the most important part. Extract all of them.
- For 'majors': the 'pdfUrl' SHOULD ALWAYS BE left empty (""). Do not invent URLs or place comments in it. 'batches' represent ANY grouping of courses in the major plan - this includes required levels (e.g. "المستوى الأول", "المستوى الثاني"), tracks, optional packages, and university requirements (e.g. "اختياري-الحوسبة", "اختياري-شبكات الحاس", "اختياري-الأمن السيبر", "متطلب جامعي اجباري", "المعارف والقيم الاس", "قيم تاريخية ووطنية", "المهارات المهنية وسوق", "المهارات التواصلية وا", "متطلب جامعي ٥", "مقررات حرة لكلية"). You MUST extract EVERY single one of these as a distinct 'batch' object if they appear in the file, with its 'name' and the 'reqCount'. CRITICAL: SCROLL THROUGH THE ENTIRE PDF/TEXT and extract EVERY single batch mentioned. For 'courses', map EVERY course to the EXACT SAME name of the batch/level/section it belongs to using 'optionalGroup'. CRITICAL: If the document contains multiple different programs or degrees, you MUST extract them as COMPLETELY SEPARATE major objects.
- Ensure the output strictly conforms to the requested JSON array schema. Your output MUST ONLY contain valid JSON. Do not add any conversational text, reasoning, or markdown outside the JSON block.`;

    if (req.file) {
      const mime = req.file.mimetype;
      if (mime === "application/pdf" || mime.startsWith("image/")) {
        contents.push({
          inlineData: {
            mimeType: mime,
            data: req.file.buffer.toString("base64")
          }
        });
        contents.push({ text: basePrompt });
      } else {
        text = req.file.buffer.toString("utf-8");
        contents.push({ text: `${basePrompt}\n\nTEXT:\n${text.substring(0, 30000)}` });
      }
    } else if (text) {
      contents.push({ text: `${basePrompt}\n\nTEXT:\n${text.substring(0, 30000)}` });
    } else {
      return res.status(400).json({ error: "No text or file provided" });
    }

    let response;
    try {
      response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: schemaProperties
            }
          }
        }
      });
    } catch (primaryErr: any) {
      const errMsg = primaryErr?.message || "";
      const isQuotaOrDemand = errMsg.includes("429") || errMsg.includes("503") || errMsg.includes("quota") || errMsg.includes("RESOURCE_EXHAUSTED");
      
      if (isQuotaOrDemand) {
        console.warn("Primary model gemini-2.5-flash failed (quota/demand limit). Trying fallback model gemini-1.5-flash...", primaryErr);
        try {
          response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents,
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: schemaProperties
                }
              }
            }
          });
        } catch (fallbackErr: any) {
          throw new Error(`The AI service is experiencing high demand or quota limits. Please retry in 10-15 seconds or link a billing account to your project if you hit daily limits.`);
        }
      } else {
        throw primaryErr;
      }
    }

    let resultsArr: any[] = [];
    try {
      resultsArr = JSON.parse(response.text?.trim() || "[]");
    } catch (e) { }

    if (type === 'events' && Array.isArray(resultsArr)) {
      const mergedEvents: any[] = [];
      for (const item of resultsArr) {
        if (!item || typeof item !== 'object') continue;
        const normTitle = String(item.title || "").trim();
        const normDate = String(item.date || "").trim();
        const existing = mergedEvents.find(e => {
          return String(e.title || "").trim() === normTitle && String(e.date || "").trim() === normDate;
        });

        if (existing) {
          const desc1 = String(existing.description || "").trim();
          const desc2 = String(item.description || "").trim();
          const parts = [desc1, desc2].filter(Boolean);
          const uniqueParts = Array.from(new Set(parts));
          existing.description = uniqueParts.join(" • ");
        } else {
          mergedEvents.push(item);
        }
      }
      resultsArr = mergedEvents;
    }

    res.json({ success: true, count: resultsArr.length, data: resultsArr });
  } catch (e: any) {
    console.error(e);
    res.status(200).json({ success: false, error: "AI Parsing Failed", message: e.message });
  }
});



  const dev = process.env.NODE_ENV !== "production";
  const nextApp = next({ dev });
  const handle = nextApp.getRequestHandler();
  await nextApp.prepare();

  app.all('*', (req, res) => {
    return handle(req, res);
  });

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Express Error:", err);
    if (req.path.startsWith('/api/')) {
      res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
    } else {
      next(err);
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
