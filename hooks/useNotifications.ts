"use client";

export function useNotifications(userId: number) {
  return {
    notifications: [],
    unreadCount: 0,
  };
}