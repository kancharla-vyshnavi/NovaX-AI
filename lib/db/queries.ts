import { and, eq, gt } from "drizzle-orm";
import { isDbConfigured, db } from "./drizzle";
import { emergencyContacts, tasks, users, notifications } from "./schema";
import fs from "fs";
import path from "path";

const LOCAL_DB_PATH = path.join(process.cwd(), "lib/db/local-db.json");

function getLocalDb() {
	if (!fs.existsSync(LOCAL_DB_PATH)) {
		const defaultDb = {
			users: [
				{
					user_id: 1,
					name: "NovaX AI User",
					email: "friend@voicecare.ai",
					phone_number: "+1555123456",
				},
			],
			tasks: [],
			notifications: [],
			emergencyContacts: [],
		};
		fs.mkdirSync(path.dirname(LOCAL_DB_PATH), { recursive: true });
		fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(defaultDb, null, 2));
		return defaultDb;
	}
	const content = fs.readFileSync(LOCAL_DB_PATH, "utf-8");
	try {
		return JSON.parse(content);
	} catch (e) {
		console.error("Failed to parse local db JSON, resetting...", e);
		return {
			users: [
				{
					user_id: 1,
					name: "NovaX AI User",
					email: "friend@voicecare.ai",
					phone_number: "+1555123456",
				},
			],
			tasks: [],
			notifications: [],
			emergencyContacts: [],
		};
	}
}

function saveLocalDb(data: any) {
	fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(data, null, 2));
}

type TaskInput = {
	user_id: number;
	type: "reminder" | "appointment";
	title: string;
	event_time: Date;
	notification_time: Date;
};

// Type for emergency contact creation
type EmergencyContactInput = {
	user_id: number;
	name: string;
	phone_number: string;
	email?: string;
};

export async function getUserById(userId: number) {
	if (isDbConfigured) {
		const result = await db.select().from(users).where(eq(users.user_id, userId));
		return result[0] || null;
	} else {
		const localDb = getLocalDb();
		return localDb.users.find((u: any) => u.user_id === userId) || null;
	}
}

export async function getTaskById(taskId: number) {
	if (isDbConfigured) {
		const result = await db.select().from(tasks).where(eq(tasks.task_id, taskId));
		return result[0] || null;
	} else {
		const localDb = getLocalDb();
		return localDb.tasks.find((t: any) => t.task_id === taskId) || null;
	}
}

export async function insertTask({
	user_id,
	type,
	title,
	event_time,
	notification_time,
}: TaskInput) {
	if (isDbConfigured) {
		try {
			const result = await db
				.insert(tasks)
				.values({
					user_id,
					type,
					title,
					event_time,
					notification_time,
				})
				.returning();

			return result[0];
		} catch (error) {
			console.error("Error inserting task:", error);
			throw new Error("Failed to create task");
		}
	} else {
		const localDb = getLocalDb();
		const newId =
			localDb.tasks.length > 0
				? Math.max(...localDb.tasks.map((t: any) => t.task_id)) + 1
				: 1;
		const newTask = {
			task_id: newId,
			user_id,
			type,
			title,
			event_time: event_time.toISOString(),
			notification_time: notification_time.toISOString(),
		};
		localDb.tasks.push(newTask);
		saveLocalDb(localDb);
		return {
			...newTask,
			event_time: new Date(newTask.event_time),
			notification_time: new Date(newTask.notification_time),
		};
	}
}

export async function getTasksByUser(userId: number) {
	if (isDbConfigured) {
		try {
			const result = await db
				.select()
				.from(tasks)
				.where(eq(tasks.user_id, userId))
				.orderBy(tasks.event_time); // Sort by event time

			return result;
		} catch (error) {
			console.error("Error fetching tasks:", error);
			throw new Error("Failed to fetch tasks");
		}
	} else {
		const localDb = getLocalDb();
		return localDb.tasks
			.filter((t: any) => t.user_id === userId)
			.map((t: any) => ({
				...t,
				event_time: new Date(t.event_time),
				notification_time: new Date(t.notification_time),
			}))
			.sort((a: any, b: any) => a.event_time.getTime() - b.event_time.getTime());
	}
}

export async function insertEmergencyContact({
	user_id,
	name,
	phone_number,
	email,
}: EmergencyContactInput) {
	if (isDbConfigured) {
		try {
			const result = await db
				.insert(emergencyContacts)
				.values({
					user_id,
					name,
					phone_number,
					email,
				})
				.returning();

			return result[0];
		} catch (error) {
			console.error("Error inserting emergency contact:", error);
			throw new Error("Failed to create emergency contact");
		}
	} else {
		const localDb = getLocalDb();
		const newId =
			localDb.emergencyContacts.length > 0
				? Math.max(...localDb.emergencyContacts.map((c: any) => c.contact_id)) + 1
				: 1;
		const newContact = {
			contact_id: newId,
			user_id,
			name,
			phone_number,
			email: email || null,
		};
		localDb.emergencyContacts.push(newContact);
		saveLocalDb(localDb);
		return newContact;
	}
}

export async function getEmergencyContactsByUser(userId: number) {
	if (isDbConfigured) {
		try {
			const result = await db
				.select()
				.from(emergencyContacts)
				.where(eq(emergencyContacts.user_id, userId));

			return result;
		} catch (error) {
			console.error("Error fetching emergency contacts:", error);
			throw new Error("Failed to fetch emergency contacts");
		}
	} else {
		const localDb = getLocalDb();
		return localDb.emergencyContacts.filter((c: any) => c.user_id === userId);
	}
}

export async function getUpcomingTasks(userId: number) {
	if (isDbConfigured) {
		try {
			const now = new Date();
			const result = await db
				.select()
				.from(tasks)
				.where(and(eq(tasks.user_id, userId), gt(tasks.event_time, now)))
				.orderBy(tasks.event_time)
				.limit(5);

			return result;
		} catch (error) {
			console.error("Error fetching upcoming tasks:", error);
			throw new Error("Failed to fetch upcoming tasks");
		}
	} else {
		const localDb = getLocalDb();
		const now = new Date();
		return localDb.tasks
			.filter((t: any) => t.user_id === userId && new Date(t.event_time) > now)
			.map((t: any) => ({
				...t,
				event_time: new Date(t.event_time),
				notification_time: new Date(t.notification_time),
			}))
			.sort((a: any, b: any) => a.event_time.getTime() - b.event_time.getTime())
			.slice(0, 5);
	}
}

export async function insertNotification(data: {
	user_id: number;
	task_id: number;
	type: "reminder" | "appointment";
	title: string;
	read: boolean;
	created_at: Date;
}) {
	if (isDbConfigured) {
		await db.insert(notifications).values(data);
	} else {
		const localDb = getLocalDb();
		const newId =
			localDb.notifications.length > 0
				? Math.max(...localDb.notifications.map((n: any) => n.notification_id)) + 1
				: 1;
		const newNotif = {
			notification_id: newId,
			user_id: data.user_id,
			task_id: data.task_id,
			type: data.type,
			title: data.title,
			read: data.read,
			created_at: data.created_at.toISOString(),
		};
		localDb.notifications.push(newNotif);
		saveLocalDb(localDb);
	}
}

export async function getUnreadNotificationsByUser(userId: number) {
	if (isDbConfigured) {
		const result = await db
			.select()
			.from(notifications)
			.where(and(eq(notifications.user_id, userId), eq(notifications.read, false)));
		return result;
	} else {
		const localDb = getLocalDb();
		return localDb.notifications
			.filter((n: any) => n.user_id === userId && n.read === false)
			.map((n: any) => ({
				...n,
				created_at: new Date(n.created_at),
			}));
	}
}

export async function markNotificationAsRead(notificationId: number) {
	if (isDbConfigured) {
		await db
			.update(notifications)
			.set({ read: true })
			.where(eq(notifications.notification_id, notificationId));
	} else {
		const localDb = getLocalDb();
		const notif = localDb.notifications.find(
			(n: any) => n.notification_id === notificationId
		);
		if (notif) {
			notif.read = true;
			saveLocalDb(localDb);
		}
	}
}

export async function deleteTask(taskId: number) {
	if (isDbConfigured) {
		await db.delete(tasks).where(eq(tasks.task_id, taskId));
	} else {
		const localDb = getLocalDb();
		localDb.tasks = localDb.tasks.filter((t: any) => t.task_id !== taskId);
		saveLocalDb(localDb);
	}
}

