import { integer, bigint, pgTable, serial, text, timestamp, boolean, varchar, unique, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or Custom UUID
  userName: text('user_name'),
  email: text('email').notNull().unique(), // SHA-256 hash of normalized user email
  studentEmail: text('student_email'),
  googleEmail: text('google_email'),
  passwordHash: text('password_hash'),
  phone: text('phone'),
  major: text('major'),
  currentGpa: varchar('current_gpa', { length: 10 }),
  finishedHours: integer('finished_hours'),
  completedCourses: text('completed_courses'), // JSON array of course codes
  isAdmin: boolean('is_admin').default(false),
  isBanned: boolean('is_banned').default(false),
  adminPermissions: text('admin_permissions'), // JSON array string of granted permission keys
  profilePicUrl: text('profile_pic_url'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  idxUsersUserName: index('idx_users_user_name').on(table.userName),
  idxUsersEmail: index('idx_users_email').on(table.email),
  idxUsersStudentEmail: index('idx_users_student_email').on(table.studentEmail),
  idxUsersGoogleEmail: index('idx_users_google_email').on(table.googleEmail),
}));

export const majors = pgTable('majors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  pdfUrl: text('pdf_url'), // Link to plan PDF
  createdAt: timestamp('created_at').defaultNow(),
});

export const subjects = pgTable('subjects', {
  id: serial('id').primaryKey(),
  code: text('code').notNull(),
  name: text('name').notNull(),
  driveLink: text('drive_link'),
  whatsappLink: text('whatsapp_link'),
  creditHours: integer('credit_hours').default(3),
  level: integer('level'),
  description: text('description'),
  syllabus: text('syllabus'),
  freeResourcesUrl: text('free_resources_url'),
  paidResourcesUrl: text('paid_resources_url'),
  avatarUrl: text('avatar_url'),
  bannerUrl: text('banner_url'),
  tags: text('tags'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const course_resources = pgTable('course_resources', {
  id: serial('id').primaryKey(),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  type: text('type').notNull().default('drive'),
  url: text('url').notNull(),
  driveLink: text('drive_link'),
  boxLink: text('box_link'),
  whatsappLink: text('whatsapp_link'),
  freeResourcesUrl: text('free_resources_url'),
  paidResourcesUrl: text('paid_resources_url'),
  avatarUrl: text('avatar_url'),
  bannerUrl: text('banner_url'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const majorCourses = pgTable('major_courses', {
  id: serial('id').primaryKey(),
  majorId: integer('major_id').references(() => majors.id, { onDelete: 'cascade' }).notNull(),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
  optionalGroup: text('optional_group'),
  optionalGroupReqCount: integer('optional_group_req_count'),
  prereq: text('prereq'),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  date: text('date').notNull(), // Date string YYYY-MM-DD or ISO
  description: text('description'),
  isHoliday: boolean('is_holiday').default(false),
  isHolidayEnd: boolean('is_holiday_end').default(false),
  isSemesterStart: boolean('is_semester_start').default(false),
  isSemesterEnd: boolean('is_semester_end').default(false),
  isEid: boolean('is_eid').default(false),
  isNationalDay: boolean('is_national_day').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});



export const news = pgTable('news', {
  id: serial('id').primaryKey(),
  content: text('content').notNull(),
  source: text('source'), // e.g. @IMAMU_News
  authorName: text('author_name'),
  authorHandle: text('author_handle'),
  authorAvatar: text('author_avatar'),
  imageUrl: text('image_url'),
  videoUrl: text('video_url'),
  date: text('date').notNull(),
  tweetId: text('tweet_id').unique(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const global_settings = pgTable('global_settings', {
  id: serial('id').primaryKey(),
  fetchRangeDays: integer('fetch_range_days').default(30),
  autoDeleteDays: integer('auto_delete_days').default(30),
  smtpHost: text('smtp_host'),
  smtpPort: integer('smtp_port'),
  smtpUser: text('smtp_user'),
  smtpPass: text('smtp_pass'),
  imapHost: text('imap_host'),
  imapPort: integer('imap_port'),
  imapSecure: boolean('imap_secure').default(true),
  semesterStartDate: text('semester_start_date'),
  semesterEndDate: text('semester_end_date'),
  apiToken: text('api_token'),
});

export const newsLikes = pgTable('news_likes', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  newsId: bigint('news_id', { mode: 'number' }).references(() => news.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  unq: unique().on(t.userId, t.newsId)
}));

export const newsComments = pgTable('news_comments', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  newsId: bigint('news_id', { mode: 'number' }).references(() => news.id, { onDelete: 'cascade' }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const news_sources = pgTable('news_sources', {
  id: serial('id').primaryKey(),
  handle: text('handle').notNull().unique(), // e.g. IMAMU_News
  isActive: boolean('is_active').default(true),
  profilePicUrl: text('profile_pic_url'),
  lastFetched: timestamp('last_fetched'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const verification_codes = pgTable('verification_codes', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(), // SHA-256 hash of normalized user email
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tutorial_sections = pgTable('tutorial_sections', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  icon: text('icon').notNull().default('GraduationCap'),
  color: text('color').notNull().default('text-[var(--color-imamu-accent)] bg-stone-50 border-stone-100/50'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tutorials = pgTable('tutorials', {
  id: serial('id').primaryKey(),
  sectionId: integer('section_id').references(() => tutorial_sections.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  text: text('text').notNull(),
  steps: text('steps').notNull(), // JSON string array of steps
  videoUrl: text('video_url'),
  imageUrl: text('image_url'),
  linkUrl: text('link_url'),
  linkTitle: text('link_title'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tutorial_feedback = pgTable('tutorial_feedback', {
  id: serial('id').primaryKey(),
  tutorialId: integer('tutorial_id').references(() => tutorials.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').notNull(),
  isHelpful: boolean('is_helpful').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const feedback_comments = pgTable('feedback_comments', {
  id: serial('id').primaryKey(),
  feedbackId: integer('feedback_id').references(() => tutorial_feedback.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const newbie_links = pgTable('newbie_links', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  url: text('url').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tutorial_comments = pgTable('tutorial_comments', {
  id: serial('id').primaryKey(),
  tutorialId: integer('tutorial_id').references(() => tutorials.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').notNull(),
  userName: text('user_name'),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const activity_logs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  level: varchar('level', { length: 20 }).notNull().default('info'),
  category: varchar('category', { length: 50 }).notNull().default('SYSTEM'),
  action: text('action').notNull(),
  message: text('message').notNull(),
  userId: text('user_id'),
  userEmail: text('user_email'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: text('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const tools = pgTable('tools', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  link: text('link').notNull(),
  icon: text('icon'),
  category: text('category'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const contributors = pgTable('contributors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  category: text('category').notNull().default('other'),
  photoUrl: text('photo_url'),
  userId: text('user_id'),
  bio: text('bio'),
  socialLinks: text('social_links'),
  linkedMajor: text('linked_major'),
  linkedTools: text('linked_tools'),
  isPublic: boolean('is_public').default(true),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});
