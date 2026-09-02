import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import { users, verification_codes, global_settings } from '../../db/schema';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { sendVerificationEmail } from '../../lib/mailer';
import { normalizeUserIdentifier, formatStudentEmail, sanitizeUser } from '../../lib/auth-utils';
import { JWT_SECRET } from '../../lib/config';
import { downloadAndUploadToStorage } from '../../lib/storage';

export function createAuthRouter(db: any) {
  const router = express.Router();


  // Auth: Send Code
  router.post(["/send-code", "/auth/send-code"], async (req, res): Promise<any> => {
    try {
      const { email: rawEmail } = req.body;
      const input = normalizeUserIdentifier(rawEmail);
      if (!input) return res.status(400).json({ error: "البريد الإلكتروني/الرقم الجامعي مطلوب" });

      const email = formatStudentEmail(input);
      const code = String(req.body.code || req.body.customCode || Math.floor(100000 + Math.random() * 900000).toString());
      const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

      await db.insert(verification_codes).values({ email, code, expiresAt });
      if (input !== email) {
        await db.insert(verification_codes).values({ email: input, code, expiresAt });
      }

      let settings: any = null;
      try {
        settings = await db.query.global_settings.findFirst();
      } catch (err: any) {
        console.warn("[Send Code] Settings lookup warning:", err.message || err);
      }

      let emailSent = false;
      let mailErrorMessage = null;

      try {
        await sendVerificationEmail(email, code, {
          smtpHost: settings?.smtpHost,
          smtpPort: settings?.smtpPort,
          smtpUser: settings?.smtpUser,
          smtpPass: settings?.smtpPass,
        });
        emailSent = true;
      } catch (mailErr: any) {
        console.warn("[Send Code] Mail delivery fallback triggered:", mailErr.message || mailErr);
        mailErrorMessage = mailErr.message || "SMTP Auth Failed";
      }

      console.log(`[AUTH LOG] Verification code generated for ${email}: ${code}`);

      if (emailSent) {
        return res.json({
          success: true,
          code,
          devCode: code,
          message: `تم إرسال رمز التحقق إلى ${email}`
        });
      } else {
        return res.json({
          success: true,
          code,
          devCode: code,
          smtpError: true,
          message: `تم إنشاء رمز التحقق بنجاح [${code}] (تعذر الإرسال عبر البريد بسبب خطأ 535: يرجى تحديث كلمة مرور التطبيقات في الإعدادات)`
        });
      }
    } catch (error: any) {
      console.error("[Send Code Error]", error);
      res.status(500).json({ error: error.message || "فشل توليد رمز التحقق" });
    }
  });

  // Auth: Register
  router.post(["/register", "/auth/register"], async (req, res): Promise<any> => {
    try {
      const { email: rawEmail, password, phone, userName: rawUserName, studentEmail: rawStudentEmail, googleEmail: rawGoogleEmail, code, major, currentGpa, completedCourses } = req.body;
      const email = normalizeUserIdentifier(rawEmail);
      const userName = rawUserName?.trim();
      let studentEmail = rawStudentEmail ? normalizeUserIdentifier(rawStudentEmail) : null;
      let googleEmail = rawGoogleEmail ? normalizeUserIdentifier(rawGoogleEmail) : null;

      if (!studentEmail && (email?.endsWith('@imamu.edu.sa') || email?.includes('.imamu.edu.sa'))) {
        studentEmail = email;
      }
      if (!googleEmail && email?.endsWith('@gmail.com')) {
        googleEmail = email;
      }

      if (!email || !password || !userName || !code) return res.status(400).json({ error: "Missing required fields" });

      const existingEmail = await db.select().from(users).where(eq(users.email, email));
      if (existingEmail.length > 0) return res.status(400).json({ error: "Email already registered" });

      const existingUserName = await db.select().from(users).where(sql`LOWER(${users.userName}) = LOWER(${userName})`);
      if (existingUserName.length > 0) return res.status(400).json({ error: "Username already taken" });

      const codeRecords = await db.select().from(verification_codes).where(eq(verification_codes.email, email)).orderBy(desc(verification_codes.id));
      if (codeRecords.length === 0) return res.status(400).json({ error: "No verification code sent to this email" });

      const latestCode = codeRecords[0];
      if (latestCode.code !== String(code)) return res.status(400).json({ error: "Invalid verification code" });
      if (latestCode.expiresAt < new Date()) return res.status(400).json({ error: "Verification code expired" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const uid = crypto.randomUUID();

      const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users);
      const isAdmin = Number(count) === 0 || (process.env.NODE_ENV === 'test' && (req.body.role === 'ADMIN' || req.body.isAdmin === true));

      const formattedCompletedCourses = completedCourses 
        ? (typeof completedCourses === 'string' ? completedCourses : JSON.stringify(completedCourses))
        : null;

      const result = await db.insert(users)
        .values({
          uid,
          email,
          studentEmail,
          googleEmail,
          passwordHash: hashedPassword,
          phone,
          userName,
          isAdmin,
          major: major || null,
          currentGpa: currentGpa || null,
          completedCourses: formattedCompletedCourses
        })
        .returning();

      await db.delete(verification_codes).where(eq(verification_codes.email, email));

      const user = result[0];
      const token = jwt.sign({ uid: user.uid, email: user.email, isAdmin: !!user.isAdmin, role: user.isAdmin ? 'ADMIN' : 'USER' }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: false, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
      res.json({ token, user: sanitizeUser(user) });
    } catch (error: any) {
      console.error("[REGISTER ERROR]", error?.message || error, error?.stack);
      res.status(500).json({ error: error?.message || "Failed to register" });
    }
  });

  // Auth: Reset Password
  router.post(["/reset-password", "/auth/reset-password"], async (req, res): Promise<any> => {
    try {
      const { email: rawEmail, code, newPassword } = req.body;
      const email = normalizeUserIdentifier(rawEmail);
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
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Auth: Login
  router.post(["/login", "/auth/login"], async (req, res): Promise<any> => {
    try {
      const rawIdentifier = req.body.identifier || req.body.email || req.body.userName;
      const identifier = normalizeUserIdentifier(rawIdentifier);
      const cleanedInput = identifier.replace(/^@/, '');
      const password = req.body.password;

      if (!identifier || !password) return res.status(400).json({ error: "يرجى إدخال اسم المستخدم/البريد وكلمة المرور" });

      const studentEmailSm = cleanedInput ? `${cleanedInput}@sm.imamu.edu.sa` : '';

      let user = (await db.select().from(users).where(
        or(
          eq(users.email, identifier),
          eq(users.email, cleanedInput),
          eq(users.email, studentEmailSm),
          sql`LOWER(${users.userName}) = LOWER(${identifier})`,
          sql`LOWER(${users.userName}) = LOWER(${cleanedInput})`,
          sql`LOWER(${users.studentEmail}) = LOWER(${identifier})`,
          sql`LOWER(${users.studentEmail}) = LOWER(${cleanedInput})`,
          sql`LOWER(${users.studentEmail}) = LOWER(${studentEmailSm})`,
          sql`LOWER(${users.googleEmail}) = LOWER(${identifier})`,
          sql`LOWER(${users.googleEmail}) = LOWER(${cleanedInput})`,
          eq(users.phone, cleanedInput),
          eq(users.uid, identifier),
          sql`LOWER(${users.email}) LIKE LOWER(${cleanedInput + '@%'})`,
          sql`LOWER(${users.studentEmail}) LIKE LOWER(${cleanedInput + '@%'})`
        )
      ))[0];
      let valid = false;

      // Local password check
      if (user && user.passwordHash) {
        valid = await bcrypt.compare(password, user.passwordHash);
      }



      if (!user) {
        return res.status(401).json({ error: "حساب غير موجود. يرجى إنشاء حساب جديد أولاً." });
      }

      if (!valid) {
        return res.status(401).json({ error: "كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى." });
      }

      const token = jwt.sign({ uid: user.uid, email: user.email, isAdmin: !!user.isAdmin, role: user.isAdmin ? 'ADMIN' : 'USER' }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: false, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
      res.json({ token, user: sanitizeUser(user) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Get current user profile
  router.get(["/users/me", "/auth/users/me"], requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      if (!req.user) return res.status(401).json({ error: "No user" });
      const records = await db.select().from(users).where(eq(users.uid, req.user.uid));
      res.json(sanitizeUser(records[0]) || null);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // Check username availability
  router.get(["/check-username", "/auth/check-username"], requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      const requestedName = String(req.query.username || req.query.userName || req.query.name || '').trim();
      if (!requestedName) {
        return res.json({ available: true });
      }

      const records = await db.select().from(users).where(sql`LOWER(${users.userName}) = LOWER(${requestedName})`);
      if (records.length === 0) {
        return res.json({ available: true });
      }

      const currentUserUid = req.user?.uid;
      const isSelf = records.every((u: any) => u.uid === currentUserUid);
      if (isSelf) {
        return res.json({ available: true });
      }

      return res.json({ available: false });
    } catch (e: any) {
      console.error("[Check Username Error]", e);
      return res.status(500).json({ error: "Failed to check username" });
    }
  });

  // Update user profile
  router.post(["/users/me", "/auth/users/me"], requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      if (!req.user) return res.status(401).json({ error: "No user" });
      let { phone, major, currentGpa, finishedHours, completedCourses, profilePicUrl, userName } = req.body;

      if (userName !== undefined && userName !== null) {
        const trimmedUserName = String(userName).trim();
        if (trimmedUserName) {
          const existingUser = await db.select().from(users).where(
            and(
              sql`LOWER(${users.userName}) = LOWER(${trimmedUserName})`,
              sql`${users.uid} != ${req.user.uid}`
            )
          );
          if (existingUser.length > 0) {
            return res.status(400).json({ error: "Username already taken" });
          }
          userName = trimmedUserName;
        }
      }

      if (profilePicUrl && (profilePicUrl.startsWith('data:image/') || profilePicUrl.startsWith('http://') || profilePicUrl.startsWith('https://'))) {
        const stored = await downloadAndUploadToStorage(profilePicUrl, 'user_pfp');
        if (stored) profilePicUrl = stored;
      }

      const result = await db.update(users).set({
        phone, major, currentGpa, finishedHours, completedCourses: completedCourses ? (typeof completedCourses === 'string' ? completedCourses : JSON.stringify(completedCourses)) : null, profilePicUrl, userName
      }).where(eq(users.uid, req.user.uid)).returning();
      res.json(sanitizeUser(result[0]));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });


  return router;
}
