import {
	boolean,
	integer,
	pgEnum,
	pgTable,
	serial,
	text,
	timestamp,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	user_id: serial("user_id").primaryKey(),
	name: text("name").notNull(),
	email: text("email"),
	phone_number: text("phone_number"),
});

export const taskType = pgEnum("task_type", ["reminder", "appointment"]);

export const tasks = pgTable("tasks", {
	task_id: serial("task_id").primaryKey(),
	user_id: integer("user_id").references(() => users.user_id),
	type: taskType("type").notNull(),
	title: text("title").notNull(),
	event_time: timestamp("event_time", { mode: "date" }).notNull(),
	notification_time: timestamp("notification_time", { mode: "date" }).notNull(),
});

export const emergencyContacts = pgTable("emergency_contacts", {
	contact_id: serial("contact_id").primaryKey(),
	user_id: integer("user_id").references(() => users.user_id),
	name: text("name").notNull(),
	phone_number: text("phone_number").notNull(),
	email: text("email"),
});

export const notifications = pgTable("notifications", {
	notification_id: serial("notification_id").primaryKey(),
	user_id: integer("user_id").references(() => users.user_id),
	task_id: integer("task_id").references(() => tasks.task_id),
	type: taskType("type").notNull(),
	title: text("title").notNull(),
	read: boolean("read").default(false),
	created_at: timestamp("created_at").defaultNow(),
});

export type Task = typeof tasks.$inferSelect;
export type EmergencyContact = typeof emergencyContacts.$inferSelect;
