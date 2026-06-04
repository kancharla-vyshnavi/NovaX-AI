"use client";

import { useEffect, useState } from "react";

export function useNotifications(userId: number) {
	const [notifications, setNotifications] = useState<any[]>([]);
	const [unreadCount, setUnreadCount] = useState<number>(0);
	const [isPollingEnabled, setIsPollingEnabled] = useState(true);

	// Re-enable polling if userId changes
	useEffect(() => {
		setIsPollingEnabled(true);
	}, [userId]);

	useEffect(() => {
		if (!isPollingEnabled) return;

		const pollNotifications = async () => {
			try {
				const response = await fetch(`/api/notifications/user/${userId}`);
				if (!response.ok) {
					throw new Error(`HTTP error! status: ${response.status}`);
				}
				const data = await response.json();

				if (data.success && data.notifications) {
					setNotifications(data.notifications);
					setUnreadCount(data.notifications.length);
				} else {
					setNotifications([]);
					setUnreadCount(0);
				}
			} catch (error) {
				if (process.env.NODE_ENV === "development") {
					console.error("Error polling notifications:", error);
				}
				// Disable polling if API fails
				setIsPollingEnabled(false);
				
				// Use fallback
				setNotifications([]);
				setUnreadCount(0);
			}
		};

		// Run initial check
		pollNotifications();

		// Poll every 15 seconds
		const interval = setInterval(pollNotifications, 15000);
		
		return () => clearInterval(interval);
	}, [userId, isPollingEnabled]);

	return { notifications, unreadCount };
}
