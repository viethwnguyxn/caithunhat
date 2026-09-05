import api from './api'

/**
 * Lấy danh sách các cuộc hội thoại của người dùng hiện tại
 */
export const getConversations = async () => {
  const response = await api.get('/api/conversations')
  return response.data
}

/**
 * Tạo mới hoặc lấy cuộc hội thoại 1-1 với userId
 * @param {number} userId
 */
export const getOrCreateConversation = async (userId) => {
  const response = await api.post(`/api/conversations/${userId}`)
  return response.data
}

/**
 * Lấy lịch sử tin nhắn của cuộc hội thoại
 * @param {number} conversationId
 */
export const getMessages = async (conversationId) => {
  const response = await api.get(`/api/conversations/${conversationId}/messages`)
  return response.data
}

/**
 * Gửi tin nhắn qua REST API (fallback)
 * @param {number} conversationId
 * @param {string} content
 */
export const sendMessage = async (conversationId, content) => {
  const response = await api.post(`/api/conversations/${conversationId}/messages`, {
    content,
  })
  return response.data
}

/**
 * Đánh dấu tin nhắn đã đọc
 * @param {number} messageId
 */
export const markMessageRead = async (messageId) => {
  const response = await api.put(`/api/messages/${messageId}/read`)
  return response.data
}

