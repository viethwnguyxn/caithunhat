import api from './api'

export const getProfile = async () => {
  const response = await api.get('/api/profile/me')
  return response.data
}

export const updateProfile = async (profileData) => {
  const response = await api.put('/api/profile/me', profileData)
  return response.data
}

export const getPublicProfile = async (userId) => {
  const response = await api.get(`/api/profile/${userId}`)
  return response.data
}

export default {
  getProfile,
  updateProfile,
  getPublicProfile,
}
