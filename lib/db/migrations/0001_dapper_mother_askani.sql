CREATE TABLE "notifications" (
	"notification_id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"task_id" integer,
	"type" "task_type" NOT NULL,
	"title" text NOT NULL,
	"read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_task_id_tasks_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("task_id") ON DELETE no action ON UPDATE no action;