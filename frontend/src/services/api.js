import axios from 'axios'

// Axios instance — tất cả API calls đi qua đây
const api = axios.create({
  baseURL: 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: Tự động đính kèm token vào Header Authorization
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor: Xử lý khi token bị hết hạn hoặc không hợp lệ (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Nếu đang gọi endpoint /api/auth/login thì không tự xóa để Login component hiện lỗi
      if (!error.config.url.includes('/api/auth/login')) {
        localStorage.removeItem('access_token')
        // Có thể redirect nếu cần
      }
    }
    return Promise.reject(error)
  }
)

export default api
