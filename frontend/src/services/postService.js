import api from './api'

export const postService = {
  // Tạo bài viết / khoảnh khắc mới
  createPost: async ({ category, content, image_url, mood }) => {
    const response = await api.post('/api/posts', {
      category,
      content,
      image_url: image_url || null,
      mood: mood || null,
    })
    return response.data
  },

  // Lấy danh sách bảng tin cộng đồng
  getFeed: async ({ category = '', limit = 50, offset = 0 } = {}) => {
    const params = { limit, offset }
    if (category && category !== 'Tất cả' && category !== 'all') {
      params.category = category
    }
    const response = await api.get('/api/posts', { params })
    return response.data
  },

  // Xem chi tiết bài viết kèm bình luận
  getPostDetail: async (postId) => {
    const response = await api.get(`/api/posts/${postId}`)
    return response.data
  },

  // Xóa bài viết
  deletePost: async (postId) => {
    const response = await api.delete(`/api/posts/${postId}`)
    return response.data
  },

  // Thả tim / Bỏ thả tim bài viết (Toggle)
  toggleLike: async (postId) => {
    const response = await api.post(`/api/posts/${postId}/like`)
    return response.data
  },

  setReaction: async (postId, reaction) => {
    const response = await api.put(`/api/posts/${postId}/reaction`, { reaction })
    return response.data
  },

  // Đăng bình luận
  addComment: async (postId, content) => {
    const response = await api.post(`/api/posts/${postId}/comments`, { content })
    return response.data
  },

  // Lấy danh sách bình luận của bài viết
  getComments: async (postId) => {
    const response = await api.get(`/api/posts/${postId}/comments`)
    return response.data
  },

  getMentions: async () => {
    const response = await api.get('/api/posts/mentions')
    return response.data
  },

  // Xóa bình luận
  deleteComment: async (commentId) => {
    const response = await api.delete(`/api/comments/${commentId}`)
    return response.data
  },
}

export default postService
