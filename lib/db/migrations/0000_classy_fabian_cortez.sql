CREATE TYPE "public"."task_type" AS ENUM('reminder', 'appointment');--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"contact_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"name" text NOT NULL,
	"phone_number" text NOT NULL,
	"email" text
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"task_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"type" "task_type" NOT NULL,
	"title" text NOT NULL,
	"event_time" timestamp NOT NULL,
	"notification_time" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"user_id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone_number" text
);
--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;