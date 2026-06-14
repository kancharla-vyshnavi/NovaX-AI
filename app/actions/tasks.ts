"use server";

import { insertTask, insertNotification, getTasksByUser, deleteTask } from "@/lib/db/queries";
import { Client } from "@upstash/qstash";
import { isDbConfigured } from "@/lib/db/drizzle";

// Only initialize QStash if token is available
let qstashClient: Client | null = null;
if (process.env.QSTASH_TOKEN) {
	qstashClient = new Client({
		token: process.env.QSTASH_TOKEN,
	});
}

export async function createTask(data: {
	user_id: number;
	type: "reminder" | "appointment";
	title: string;
	event_time: Date;
	notification_time: Date;
}) {
	if (!isDbConfigured) {
		return { success: false, error: "Database not configured" };
	}
	try {
		// 1. Insert task into database using query helper
		const task = await insertTask(data);

		// Calculate delay in seconds from now until notification_time
		const delaySeconds = Math.max(
			0,
			(new Date(data.notification_time).getTime() - Date.now()) / 1000
		);

		let scheduleId = "local-timeout";

		// 2. Schedule notification with QStash or local fallback
		if (qstashClient) {
			try {
				const scheduleResponse = await qstashClient.publishJSON({
					url: `${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/task`,
					body: {
						task_id: task.task_id,
						type: task.type,
						title: task.title,
						user_id: task.user_id,
					},
					delay: delaySeconds,
				});
				scheduleId = scheduleResponse.messageId;
			} catch (qstashError) {
				console.warn("Failed to publish to QStash, falling back to local timer.", qstashError);
				scheduleLocalTimeout(task, delaySeconds);
			}
		} else {
			scheduleLocalTimeout(task, delaySeconds);
		}

		return {
			success: true,
			task,
			scheduleId,
		};
	} catch (error) {
		console.error("Error creating task:", error);
		return { success: false, error: "Failed to create task" };
	}
}

export async function fetchTasks(userId: number) {
	if (!isDbConfigured) {
		return { success: false, error: "Database not configured", tasks: [] };
	}
	try {
		const tasks = await getTasksByUser(userId);
		return { success: true, tasks };
	} catch (error) {
		console.error("Error fetching tasks:", error);
		return { success: false, tasks: [] };
	}
}

function scheduleLocalTimeout(task: any, delaySeconds: number) {
	const delayMs = delaySeconds * 1000;
	console.log(`[Local Scheduler] Scheduled notification in ${delaySeconds} seconds for task: ${task.title}`);

	setTimeout(async () => {
		try {
			console.log(`[Local Scheduler] Triggering notification for task: ${task.title}`);
			await insertNotification({
				user_id: task.user_id,
				task_id: task.task_id,
				type: task.type,
				title: task.title,
				read: false,
				created_at: new Date(),
			});
		} catch (error) {
			console.error("[Local Scheduler] Error saving task notification:", error);
		}
	}, delayMs);
}

export async function removeTask(taskId: number) {
	if (!isDbConfigured) {
		return { success: false, error: "Database not configured" };
	}
	try {
		await deleteTask(taskId);
		return { success: true };
	} catch (error) {
		console.error("Error deleting task:", error);
		return { success: false };
	}
}

