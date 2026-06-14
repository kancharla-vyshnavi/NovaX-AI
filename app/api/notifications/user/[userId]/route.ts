import { getUnreadNotificationsByUser, markNotificationAsRead } from "@/lib/db/queries";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
	req: NextRequest,
	{ params }: { params: any }
) {
	try {
		// Await params in case it's a Promise in Next.js 15
		const resolvedParams = await params;
		const userId = parseInt(resolvedParams.userId);

		if (isNaN(userId)) {
			return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
		}

		// Fetch unread notifications
		const unreadNotifications = await getUnreadNotificationsByUser(userId);

		// Mark them as read in the background
		if (unreadNotifications.length > 0) {
			for (const notif of unreadNotifications) {
				await markNotificationAsRead(notif.notification_id);
			}
		}

		return NextResponse.json({
			success: true,
			notifications: unreadNotifications,
		});
	} catch (error) {
		console.error("Error fetching user notifications:", error);
		return NextResponse.json(
			{ error: "Failed to fetch notifications" },
			{ status: 500 }
		);
	}
}
