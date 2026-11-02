import api from './api'

export const adminService = {
  // Lấy số liệu thống kê tổng quan
  getStats: async () => {
    const response = await api.get('/api/admin/stats')
    return response.data
  },

  // Lấy danh sách người dùng
  getUsers: async ({ search = '', role = '' } = {}) => {
    const params = {}
    if (search) params.search = search
    if (role) params.role = role
    const response = await api.get('/api/admin/users', { params })
    return response.data
  },

  // Khóa / Mở khóa tài khoản
  toggleUserStatus: async (userId) => {
    const response = await api.put(`/api/admin/users/${userId}/toggle-status`)
    return response.data
  },

  // Lấy danh sách báo cáo vi phạm
  getReports: async (statusFilter = '') => {
    const params = {}
    if (statusFilter && statusFilter !== 'all') params.status = statusFilter
    const response = await api.get('/api/admin/reports', { params })
    return response.data
  },

  // Cập nhật trạng thái báo cáo vi phạm
  updateReport: async (reportId, { status, lock_reported_user = false }) => {
    const response = await api.put(`/api/admin/reports/${reportId}`, {
      status,
      lock_reported_user,
    })
    return response.data
  },
}

export default adminService

