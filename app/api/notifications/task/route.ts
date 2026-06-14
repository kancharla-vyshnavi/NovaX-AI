import { getTaskById, getUserById, insertNotification } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
	try {
		const body = await req.json();
		const { task_id, type, title, user_id } = body;

		// 1. Get task and user details using helper queries
		const task = await getTaskById(task_id);
		const user = await getUserById(user_id);

		if (!task || !user) {
			throw new Error("Task or user not found");
		}

		// 2. Store notification in notifications table/JSON
		await insertNotification({
			user_id,
			task_id,
			type,
			title,
			read: false,
			created_at: new Date(),
		});

		return NextResponse.json({
			success: true,
			message: `Notification stored for ${type}: ${title}`,
		});
	} catch (error) {
		console.error("Error processing notification:", error);
		return NextResponse.json(
			{ error: "Failed to process notification" },
			{ status: 500 }
		);
	}
}
