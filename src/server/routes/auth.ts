import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { eq, desc, and, or, sql } from 'drizzle-orm';
import { users, verification_codes, global_settings } from '../../db/schema';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { sendVerificationEmail } from '../../lib/mailer';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

function sanitizeUser(user: any) {
  if (!user) return user;
  const { passwordHash, ...sanitized } = user;
  return sanitized;
}

export function createAuthRouter(db: any) {
  const router = express.Router();

  // Auth: Send Code
  router.post("/send-code", async (req, res): Promise<any> => {
    try {
      const { email: rawEmail } = req.body;
      const email = rawEmail?.toLowerCase().trim();
      if (!email) return res.status(400).json({ error: "البريد الإلكتروني مطلوب" });

      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60000); // 10 minutes

      await db.insert(verification_codes).values({ email, code, expiresAt });

      let settings: any = null;
      try {
        settings = await db.query.global_settings.findFirst();
      } catch (err: any) {
        console.warn("[Send Code] Settings lookup warning:", err.message || err);
      }

      const sent = await sendVerificationEmail(email, code, {
        smtpHost: settings?.smtpHost,
        smtpPort: settings?.smtpPort,
        smtpUser: settings?.smtpUser,
        smtpPass: settings?.smtpPass,
      });

      if (sent) {
        return res.json({ success: true, message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني" });
      } else {
        console.log(`[AUTH LOG] Verification code generated for ${email}: ${code}`);
        const isTest = process.env.NODE_ENV === 'test';
        return res.json({
          success: true,
          ...(isTest ? { devCode: code } : {}),
          message: "تم إنشاء رمز التحقق بنجاح."
        });
      }
    } catch (error: any) {
      console.error("[Send Code Error]", error);
      res.status(500).json({ error: error.message || "فشل توليد رمز التحقق" });
    }
  });

  // Auth: Register
  router.post("/register", async (req, res): Promise<any> => {
    try {
      const { email: rawEmail, password, phone, userName: rawUserName, studentEmail: rawStudentEmail, googleEmail: rawGoogleEmail, code } = req.body;
      const email = rawEmail?.toLowerCase().trim();
      const userName = rawUserName?.trim();
      let studentEmail = rawStudentEmail?.toLowerCase().trim() || null;
      let googleEmail = rawGoogleEmail?.toLowerCase().trim() || null;

      if (!studentEmail && (email?.endsWith('@imamu.edu.sa') || email?.includes('.imamu.edu.sa'))) {
        studentEmail = email;
      }
      if (!googleEmail && email?.endsWith('@gmail.com')) {
        googleEmail = email;
      }

      if (!email || !password || !userName || !code) return res.status(400).json({ error: "Missing required fields" });

      const existingEmail = await db.select().from(users).where(eq(users.email, email));
      if (existingEmail.length > 0) return res.status(400).json({ error: "Email already registered" });

      const existingUserName = await db.select().from(users).where(
        sql`LOWER(${users.userName}) = LOWER(${userName})`
      );
      if (existingUserName.length > 0) return res.status(400).json({ error: "Username already taken" });

      const codeRecords = await db.select().from(verification_codes).where(eq(verification_codes.email, email)).orderBy(desc(verification_codes.id));
      if (codeRecords.length === 0) return res.status(400).json({ error: "No verification code sent to this email" });

      const latestCode = codeRecords[0];
      if (latestCode.code !== String(code)) return res.status(400).json({ error: "Invalid verification code" });
      if (latestCode.expiresAt < new Date()) return res.status(400).json({ error: "Verification code expired" });

      const hashedPassword = await bcrypt.hash(password, 10);
      const uid = crypto.randomUUID();

      const allUsers = await db.select().from(users);
      const isAdmin = allUsers.length === 0;

      const result = await db.insert(users)
        .values({ uid, email, studentEmail, googleEmail, passwordHash: hashedPassword, phone, userName, isAdmin })
        .returning();

      await db.delete(verification_codes).where(eq(verification_codes.email, email));

      const user = result[0];
      const token = jwt.sign({ uid: user.uid, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: false, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
      res.json({ token, user: sanitizeUser(user) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to register" });
    }
  });

  // Auth: Reset Password
  router.post("/reset-password", async (req, res): Promise<any> => {
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
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Auth: Login
  router.post("/login", async (req, res): Promise<any> => {
    try {
      const rawIdentifier = req.body.identifier || req.body.email || req.body.userName;
      const identifier = rawIdentifier?.toLowerCase().trim();
      const cleanedInput = identifier?.replace(/^@/, '');
      const password = req.body.password;

      if (!identifier || !password) return res.status(400).json({ error: "يرجى إدخال اسم المستخدم/البريد وكلمة المرور" });

      let user = (await db.select().from(users).where(
        or(
          eq(users.email, identifier),
          eq(users.email, cleanedInput),
          sql`LOWER(${users.userName}) = LOWER(${identifier})`,
          sql`LOWER(${users.userName}) = LOWER(${cleanedInput})`,
          sql`LOWER(${users.studentEmail}) = LOWER(${identifier})`,
          sql`LOWER(${users.googleEmail}) = LOWER(${identifier})`,
          eq(users.uid, identifier)
        )
      ))[0];
      let valid = false;

      // Local password check
      if (user && user.passwordHash) {
        valid = await bcrypt.compare(password, user.passwordHash);
      }

      // Cross-App Sync: Optional check for shared PostgreSQL "User" table if explicitly enabled
      if (!valid && process.env.ENABLE_CROSS_APP_SYNC === 'true') {
        try {
          const rawResult: any = await db.execute(
            sql`SELECT id, username, "studentEmail", "googleEmail", "passwordHash", role, name FROM "User" WHERE LOWER(username) = ${cleanedInput} OR LOWER("studentEmail") = ${identifier} OR LOWER("googleEmail") = ${identifier} LIMIT 1`
          );
          const connectUser = rawResult?.rows?.[0] || rawResult?.[0];
          if (connectUser && connectUser.passwordHash) {
            const isMatch = await bcrypt.compare(password, connectUser.passwordHash);
            if (isMatch) {
              valid = true;
              if (!user) {
                const uid = connectUser.id || crypto.randomUUID();
                const isAdmin = connectUser.role === 'ADMIN';
                const result = await db.insert(users).values({ 
                  uid, 
                  email: connectUser.studentEmail || connectUser.googleEmail || identifier, 
                  studentEmail: connectUser.studentEmail || null,
                  googleEmail: connectUser.googleEmail || null,
                  passwordHash: connectUser.passwordHash, 
                  userName: connectUser.username || cleanedInput, 
                  isAdmin 
                }).returning();
                user = result[0];
              } else {
                await db.update(users).set({ passwordHash: connectUser.passwordHash }).where(eq(users.id, user.id));
              }
            }
          }
        } catch (dbErr) {
          console.warn("Cross-app auth lookup notice:", dbErr);
        }
      }

      // IMAP auth fallback if configured
      if (!valid) {
        const settings = await db.query.global_settings.findFirst();
        if (settings?.imapHost && settings?.imapPort) {
          const { verifyImapCredentials } = await import('../../lib/imap-auth');
          valid = await verifyImapCredentials(settings.imapHost as string, settings.imapPort as number, (settings.imapSecure as boolean) ?? true, identifier, password);

          if (valid) {
            if (!user) {
              const uid = crypto.randomUUID();
              const hashedPassword = await bcrypt.hash(password, 10);
              const allUsers = await db.select().from(users);
              const isAdmin = allUsers.length === 0;

              const result = await db.insert(users).values({ 
                uid, email: identifier, passwordHash: hashedPassword, userName: cleanedInput, isAdmin 
              }).returning();
              user = result[0];
            } else {
              const hashedPassword = await bcrypt.hash(password, 10);
              await db.update(users).set({ passwordHash: hashedPassword }).where(eq(users.id, user.id));
            }
          }
        }
      }

      if (!user) {
        return res.status(401).json({ error: "حساب غير موجود. يرجى إنشاء حساب جديد أولاً." });
      }

      if (!valid) {
        return res.status(401).json({ error: "كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى." });
      }

      const token = jwt.sign({ uid: user.uid, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      res.cookie('token', token, { httpOnly: false, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000, sameSite: 'lax' });
      res.json({ token, user: sanitizeUser(user) });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Get current user profile
  router.get("/users/me", requireAuth, async (req: AuthRequest, res): Promise<any> => {
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
  router.get("/check-username", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      const { username } = req.query;
      if (!username || typeof username !== 'string') return res.status(400).json({ error: "Invalid username" });
      const records = await db.select().from(users).where(
        sql`LOWER(${users.userName}) = LOWER(${username})`
      );
      const isAvailable = records.length === 0 || (records.length === 1 && records[0].uid === req.user?.uid);
      res.json({ available: isAvailable });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to check username" });
    }
  });

  // Update user profile
  router.post("/users/me", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    try {
      if (!req.user) return res.status(401).json({ error: "No user" });
      const { phone, major, currentGpa, finishedHours, completedCourses, profilePicUrl, userName } = req.body;

      if (userName) {
        const records = await db.select().from(users).where(
          sql`LOWER(${users.userName}) = LOWER(${userName})`
        );
        const isAvailable = records.length === 0 || (records.length === 1 && records[0].uid === req.user.uid);
        if (!isAvailable) return res.status(400).json({ error: "Username already taken" });
      }

      const result = await db.update(users).set({
        phone, major, currentGpa, finishedHours, completedCourses: completedCourses ? JSON.stringify(completedCourses) : null, profilePicUrl, userName
      }).where(eq(users.uid, req.user.uid)).returning();
      res.json(sanitizeUser(result[0]));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  return router;
}
