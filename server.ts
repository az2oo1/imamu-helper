import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { db } from "./src/db/index";
import { users, majors, subjects, events, news, majorCourses, newsLikes, newsComments, news_sources, global_settings, verification_codes } from "./src/db/schema";
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
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

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
          valid = await verifyImapCredentials(settings.imapHost, settings.imapPort, settings.imapSecure ?? true, email, password);
          
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
      const eventsToInsert = [];
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

async function fetchTweetsFromNitter(handle: string) {
    const res = await fetch(`https://nitter.cz/${handle}`);
    if (!res.ok) throw new Error(`Failed to fetch from nitter: ${res.statusText}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    let profilePicUrl = "";
    const avatarSrc = $('.profile-card-avatar img').attr('src');
    if (avatarSrc) {
       profilePicUrl = "https://nitter.cz" + avatarSrc;
    }

    const tweets: any[] = [];
    $('.timeline-item').each((i, el) => {
        const isRetweet = $(el).find('.retweet-header').length > 0;
        if (isRetweet) return;

        const content = $(el).find('.tweet-content').text().trim();
        if(!content) return;
        
        const authorName = $(el).find('.tweet-name-row .fullname').text().trim() || handle;
        const authorHandle = $(el).find('.tweet-name-row .username').text().trim() || `@${handle}`;
        let authorAvatar = $(el).find('.tweet-avatar img').attr('src');
        if (authorAvatar) authorAvatar = "https://nitter.cz" + authorAvatar;

        const tweetLink = $(el).find('.tweet-link').attr('href');
        let tweetId = "";
        if (tweetLink) {
           const match = tweetLink.match(/\/status\/(\d+)/);
           if (match) tweetId = match[1];
        }

        const dateAttr = $(el).find('.tweet-date a').attr('title'); // "Jul 10, 2023 · 9:15 AM UTC"
        let dateObj = new Date();
        if(dateAttr) {
            dateObj = new Date(dateAttr.replace('·', ''));
        }
        
        let imageUrls: string[] = [];
        $(el).find('.attachments img, .attachment img').each((j, img) => {
            let s = $(img).closest('a').attr('href') || $(img).attr('src');
            if(s && s.includes('/pic/')) {
                const fixed = decodeURIComponent(s).replace('name=small', 'name=orig').replace('%3Fname%3Dsmall', '%3Fname%3Dorig');
                imageUrls.push("https://nitter.cz" + fixed);
            }
        });
        let imageUrl = imageUrls.length > 0 ? JSON.stringify(imageUrls) : "";

        let videoUrl = "";
        const videoHref = $(el).find('.tweet-body .attachment a.video-download').attr('href');
        if (videoHref) {
            videoUrl = "https://nitter.cz" + videoHref;
        }
        
        tweets.push({
            content,
            date: isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString(),
            imageUrl,
            videoUrl,
            tweetId,
            authorName,
            authorHandle,
            authorAvatar
        });
    });
    return { tweets, profilePicUrl };
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

      res.json({
        exportDate: new Date(),
        data: {
          settings: allSettings,
          users: allUsers,
          majors: allMajors,
          subjects: allSubjects,
          events: allEvents,
          news: allNews,
          newsSources: allNewsSources
        }
      });
    } catch(e) {
      console.error(e);
      res.status(500).json({error: "Failed to export DB"});
    }
  });

  app.post("/api/admin/import-db", requireAuth, async (req: AuthRequest, res): Promise<any> => {
    if (!(await checkAdmin(req))) return res.status(403).json({error: "Admin only"});
    try {
      const data = req.body;
      if (!data) return res.status(400).json({error: "No data provided"});

      // We need to carefully insert or overwrite tables.
      // Usually an import replaces everything, but we should be careful.
      // For simplicity, we can delete existing records and insert new ones, or just insert new ones (ignoring conflicts).
      
      if (data.settings && data.settings.length > 0) {
        await db.delete(global_settings);
        await db.insert(global_settings).values(data.settings);
      }
      
      if (data.majors && data.majors.length > 0) {
        await db.delete(majors);
        await db.insert(majors).values(data.majors);
      }
      
      if (data.subjects && data.subjects.length > 0) {
        await db.delete(subjects);
        await db.insert(subjects).values(data.subjects);
      }
      
      if (data.events && data.events.length > 0) {
        await db.delete(events);
        await db.insert(events).values(data.events);
      }
      
      if (data.newsSources && data.newsSources.length > 0) {
        await db.delete(news_sources);
        await db.insert(news_sources).values(data.newsSources);
      }
      
      if (data.news && data.news.length > 0) {
        await db.delete(news);
        await db.insert(news).values(data.news);
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
                 }).onConflictDoNothing({ target: news.tweetId });
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
           if (postDate >= rangeDate) {
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
              }).onConflictDoNothing({ target: news.tweetId });
             count++;
           }
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

    let resultsArr = [];
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



  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

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
