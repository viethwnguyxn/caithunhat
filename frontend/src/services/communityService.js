import api from './api'

const communityService = {
  // Lấy danh sách cộng đồng (có thể lọc theo danh mục)
  getCommunities: async (category) => {
    const params = {}
    if (category && category !== 'Tất cả') {
      params.category = category
    }
    const response = await api.get('/communities', { params })
    return response.data
  },

  // Lấy chi tiết một cộng đồng
  getCommunity: async (communityId) => {
    const response = await api.get(`/communities/${communityId}`)
    return response.data
  },

  // Tạo mới một cộng đồng (tự động tạo nhóm chat riêng)
  createCommunity: async (communityData) => {
    const response = await api.post('/communities', communityData)
    return response.data
  },

  // Tham gia cộng đồng (tự động vào nhóm chat)
  joinCommunity: async (communityId) => {
    const response = await api.post(`/communities/${communityId}/join`)
    return response.data
  },

  // Rời khỏi cộng đồng
  leaveCommunity: async (communityId) => {
    const response = await api.post(`/communities/${communityId}/leave`)
    return response.data
  },

  // Lấy bài viết của một cộng đồng
  getCommunityPosts: async (communityId, params = {}) => {
    const response = await api.get(`/communities/${communityId}/posts`, { params })
    return response.data
  },
}

export default communityService
