CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"date" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "global_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"fetch_range_days" integer DEFAULT 30,
	"auto_delete_days" integer DEFAULT 30,
	"smtp_host" text,
	"smtp_port" integer,
	"smtp_user" text,
	"smtp_pass" text,
	"imap_host" text,
	"imap_port" integer,
	"imap_secure" boolean DEFAULT true,
	"semester_start_date" text,
	"semester_end_date" text,
	"api_token" text
);
--> statement-breakpoint
CREATE TABLE "major_courses" (
	"id" serial PRIMARY KEY NOT NULL,
	"major_id" integer NOT NULL,
	"subject_id" integer NOT NULL,
	"optional_group" text,
	"optional_group_req_count" integer
);
--> statement-breakpoint
CREATE TABLE "majors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"pdf_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "news" (
	"id" serial PRIMARY KEY NOT NULL,
	"content" text NOT NULL,
	"source" text,
	"author_name" text,
	"author_handle" text,
	"author_avatar" text,
	"image_url" text,
	"video_url" text,
	"date" text NOT NULL,
	"tweet_id" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "news_tweet_id_unique" UNIQUE("tweet_id")
);
--> statement-breakpoint
CREATE TABLE "news_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"news_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "news_likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"news_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "news_likes_user_id_news_id_unique" UNIQUE("user_id","news_id")
);
--> statement-breakpoint
CREATE TABLE "news_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"handle" text NOT NULL,
	"is_active" boolean DEFAULT true,
	"profile_pic_url" text,
	"last_fetched" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "news_sources_handle_unique" UNIQUE("handle")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"drive_link" text,
	"whatsapp_link" text,
	"credit_hours" integer DEFAULT 3,
	"level" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"uid" text NOT NULL,
	"user_name" text,
	"email" text NOT NULL,
	"password_hash" text,
	"phone" text,
	"major" text,
	"current_gpa" varchar(10),
	"finished_hours" integer,
	"completed_courses" text,
	"is_admin" boolean DEFAULT false,
	"profile_pic_url" text,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_uid_unique" UNIQUE("uid"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification_codes" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "major_courses" ADD CONSTRAINT "major_courses_major_id_majors_id_fk" FOREIGN KEY ("major_id") REFERENCES "public"."majors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "major_courses" ADD CONSTRAINT "major_courses_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_comments" ADD CONSTRAINT "news_comments_news_id_news_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news_likes" ADD CONSTRAINT "news_likes_news_id_news_id_fk" FOREIGN KEY ("news_id") REFERENCES "public"."news"("id") ON DELETE cascade ON UPDATE no action;