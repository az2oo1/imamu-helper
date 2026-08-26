ALTER TABLE "global_settings" ADD COLUMN IF NOT EXISTS "twitter_auth_token" text;
--> statement-breakpoint
ALTER TABLE "global_settings" ADD COLUMN IF NOT EXISTS "twitter_ct0" text;
--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "description" text;
--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "syllabus" text;
--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "free_resources_url" text;
--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "paid_resources_url" text;
--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "avatar_url" text;
--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "banner_url" text;
--> statement-breakpoint
ALTER TABLE "subjects" ADD COLUMN IF NOT EXISTS "tags" text;
