import api from './api'

/**
 * Gửi lời mời kết nối tới user
 * @param {number} userId
 */
export const sendConnectionRequest = async (userId) => {
  const response = await api.post(`/api/connections/${userId}`)
  return response.data
}

/**
 * Lấy danh sách bạn bè đã kết nối (accepted)
 */
export const getMyConnections = async () => {
  const response = await api.get('/api/connections')
  return response.data
}

/**
 * Lấy danh sách lời mời kết nối (incoming & outgoing)
 */
export const getConnectionRequests = async () => {
  const response = await api.get('/api/connections/requests')
  return response.data
}

/**
 * Chấp nhận lời mời kết nối
 * @param {number} connectionId
 */
export const acceptConnection = async (connectionId) => {
  const response = await api.put(`/api/connections/${connectionId}/accept`)
  return response.data
}

/**
 * Từ chối lời mời kết nối
 * @param {number} connectionId
 */
export const rejectConnection = async (connectionId) => {
  const response = await api.put(`/api/connections/${connectionId}/reject`)
  return response.data
}

