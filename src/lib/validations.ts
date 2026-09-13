import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';

// ==========================================
// Authentication Schemas
// ==========================================

export const sendCodeSchema = z.object({
  email: z.string().min(1, 'البريد الإلكتروني/الرقم الجامعي مطلوب'),
  code: z.string().optional(),
  customCode: z.string().optional(),
});

export const verifyCodeSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  code: z.string().min(1, 'Code is required'),
});

export const registerSchema = z.object({
  email: z.string().min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  code: z.string().min(1, 'Verification code is required'),
  userName: z.string().optional(),
  phone: z.string().optional(),
  studentEmail: z.string().optional(),
  googleEmail: z.string().optional(),
  major: z.string().optional(),
  currentGpa: z.string().optional(),
  completedCourses: z.union([z.array(z.string()), z.string()]).optional(),
});

export const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  userName: z.string().optional(),
  phone: z.string().optional(),
  major: z.string().optional(),
  currentGpa: z.string().optional(),
  finishedHours: z.number().optional(),
  completedCourses: z.union([z.array(z.string()), z.string()]).nullable().optional(),
  profilePicUrl: z.string().nullable().optional(),
});

// ==========================================
// Tools Schemas
// ==========================================

export const createToolSchema = z.object({
  title: z.string().min(1, 'Title and link are required'),
  link: z.string().min(1, 'Title and link are required'),
  description: z.string().default(''),
  icon: z.string().optional(),
  category: z.string().optional(),
});

export const updateToolSchema = z.object({
  title: z.string().min(1).optional(),
  link: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  category: z.string().optional(),
});

// ==========================================
// Resources Schemas
// ==========================================

export const createResourceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  url: z.string().min(1, 'URL is required'),
  subjectId: z.union([z.number(), z.string()]).optional(),
  courseCode: z.string().optional(),
  type: z.string().default('drive'),
  driveLink: z.string().optional(),
  boxLink: z.string().optional(),
  whatsappLink: z.string().optional(),
  freeResourcesUrl: z.string().optional(),
  paidResourcesUrl: z.string().optional(),
  avatarUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  description: z.string().optional(),
  sectionsEnabled: z.boolean().default(true),
}).refine(
  (data) => data.subjectId !== undefined || (data.courseCode !== undefined && data.courseCode.trim().length > 0),
  { message: 'Subject ID or course code is required' }
);

export const updateResourceSchema = z.object({
  title: z.string().min(1).optional(),
  url: z.string().min(1).optional(),
  type: z.string().optional(),
  driveLink: z.string().optional(),
  boxLink: z.string().optional(),
  whatsappLink: z.string().optional(),
  freeResourcesUrl: z.string().optional(),
  paidResourcesUrl: z.string().optional(),
  avatarUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  description: z.string().optional(),
  sectionsEnabled: z.boolean().optional(),
});

// ==========================================
// News Schemas
// ==========================================

export const createNewsSchema = z.object({
  content: z.string().min(1, 'Content is required'),
  title: z.string().optional(),
  excerpt: z.string().optional(),
  category: z.string().optional(),
  source: z.string().optional(),
  authorName: z.string().optional(),
  authorHandle: z.string().optional(),
  authorAvatar: z.string().optional(),
  authorId: z.string().optional(),
  entityId: z.string().optional(),
  imageUrl: z.string().optional(),
  images: z.union([z.array(z.string()), z.string()]).optional(),
  videoUrl: z.string().optional(),
  readTime: z.string().optional(),
  isFeatured: z.boolean().default(false),
  formId: z.string().optional(),
  date: z.string().optional(),
});

// ==========================================
// Generic Validation Middleware
// ==========================================

export function validateBody<T extends z.ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): any => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return res.status(400).json({
        error: firstIssue ? firstIssue.message : 'Invalid input',
        details: result.error.issues,
      });
    }
    req.body = result.data;
    next();
  };
}
