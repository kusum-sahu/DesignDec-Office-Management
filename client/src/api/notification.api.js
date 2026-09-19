import apiClient from "./client";

export const notificationApi = {
  /**
   * Get all notifications for current user (includes unread count)
   */
  getMyNotifications: () => apiClient.get("/notifications"),

  /**
   * Mark single notification as read
   */
  markRead: (id) => apiClient.patch(`/notifications/${id}/read`),

  /**
   * Mark all notifications as read
   */
  markAllRead: () => apiClient.patch("/notifications/mark-all-read"),
};

export default notificationApi;
