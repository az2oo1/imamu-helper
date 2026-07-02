CREATE TABLE "tutorial_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"tutorial_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"user_name" text,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "tutorial_comments" ADD CONSTRAINT "tutorial_comments_tutorial_id_tutorials_id_fk" FOREIGN KEY ("tutorial_id") REFERENCES "public"."tutorials"("id") ON DELETE cascade ON UPDATE no action;