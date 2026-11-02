import api from './api'

/**
 * Lấy danh sách thông báo và số lượng chưa đọc của người dùng hiện tại
 */
export const getNotifications = async () => {
  const response = await api.get('/api/notifications')
  return response.data
}

/**
 * Đánh dấu một thông báo là đã đọc
 * @param {number} notificationId
 */
export const markNotificationAsRead = async (notificationId) => {
  const response = await api.put(`/api/notifications/${notificationId}/read`)
  return response.data
}

/**
 * Đánh dấu tất cả thông báo là đã đọc
 */
export const markAllNotificationsAsRead = async () => {
  const response = await api.put('/api/notifications/read-all')
  return response.data
}

/**
 * Đánh dấu tất cả thông báo tin nhắn của một cuộc trò chuyện là đã đọc
 * @param {number} conversationId
 */
export const markConversationNotificationsAsRead = async (conversationId) => {
  const response = await api.put(`/api/notifications/conversations/${conversationId}/read`)
  return response.data
}

