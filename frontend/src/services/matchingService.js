import api from './api'

export const getMatches = async (limit = 20) => {
  const response = await api.get('/api/matches', {
    params: { limit },
  })
  return response.data
}
