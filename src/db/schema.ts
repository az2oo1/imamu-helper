import { integer, pgTable, serial, text, timestamp, boolean, varchar, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID or Custom UUID
  userName: text('user_name'),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  phone: text('phone'),
  major: text('major'),
  currentGpa: varchar('current_gpa', { length: 10 }),
  finishedHours: integer('finished_hours'),
  completedCourses: text('completed_courses'), // JSON array of course codes
  isAdmin: boolean('is_admin').default(false),
  profilePicUrl: text('profile_pic_url'),
  createdAt: timestamp('created_at').defaultNow(),
});

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
  createdAt: timestamp('created_at').defaultNow(),
});

export const majorCourses = pgTable('major_courses', {
  id: serial('id').primaryKey(),
  majorId: integer('major_id').references(() => majors.id, { onDelete: 'cascade' }).notNull(),
  subjectId: integer('subject_id').references(() => subjects.id, { onDelete: 'cascade' }).notNull(),
  optionalGroup: text('optional_group'),
  optionalGroupReqCount: integer('optional_group_req_count'),
});

export const events = pgTable('events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  date: text('date').notNull(), // Date string YYYY-MM-DD or ISO
  description: text('description'),
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
});

export const newsLikes = pgTable('news_likes', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  newsId: integer('news_id').references(() => news.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (t) => ({
  unq: unique().on(t.userId, t.newsId)
}));

export const newsComments = pgTable('news_comments', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  newsId: integer('news_id').references(() => news.id, { onDelete: 'cascade' }).notNull(),
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
  email: text('email').notNull(),
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});
