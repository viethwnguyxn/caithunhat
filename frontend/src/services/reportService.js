import api from './api'

export const reportService = {
  // Gửi báo cáo vi phạm
  createReport: async ({ reported_id, reason, description }) => {
    const response = await api.post('/api/reports', {
      reported_id,
      reason,
      description,
    })
    return response.data
  },

  // Chặn người dùng
  blockUser: async (userId) => {
    const response = await api.post(`/api/blocks/${userId}`)
    return response.data
  },

  // Bỏ chặn người dùng
  unblockUser: async (userId) => {
    const response = await api.delete(`/api/blocks/${userId}`)
    return response.data
  },

  // Lấy danh sách người đã chặn
  getBlockedUsers: async () => {
    const response = await api.get('/api/blocks')
    return response.data
  },
}

export default reportService

