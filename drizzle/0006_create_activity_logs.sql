CREATE TABLE IF NOT EXISTS "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" varchar(20) DEFAULT 'info' NOT NULL,
	"category" varchar(50) DEFAULT 'SYSTEM' NOT NULL,
	"action" text NOT NULL,
	"message" text NOT NULL,
	"user_id" text,
	"user_email" text,
	"ip_address" text,
	"user_agent" text,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
