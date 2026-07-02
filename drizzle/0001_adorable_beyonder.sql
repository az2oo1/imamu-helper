CREATE TABLE "feedback_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"feedback_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tutorial_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"tutorial_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"is_helpful" boolean NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tutorial_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"icon" text DEFAULT 'GraduationCap' NOT NULL,
	"color" text DEFAULT 'text-blue-600 bg-blue-50 border-blue-100/50' NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tutorials" (
	"id" serial PRIMARY KEY NOT NULL,
	"section_id" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"text" text NOT NULL,
	"steps" text NOT NULL,
	"video_url" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "feedback_comments" ADD CONSTRAINT "feedback_comments_feedback_id_tutorial_feedback_id_fk" FOREIGN KEY ("feedback_id") REFERENCES "public"."tutorial_feedback"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorial_feedback" ADD CONSTRAINT "tutorial_feedback_tutorial_id_tutorials_id_fk" FOREIGN KEY ("tutorial_id") REFERENCES "public"."tutorials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorials" ADD CONSTRAINT "tutorials_section_id_tutorial_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."tutorial_sections"("id") ON DELETE cascade ON UPDATE no action;