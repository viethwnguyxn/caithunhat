import api from './api'

export const getAiHistory = async () => {
  const response = await api.get('/api/ai/history')
  return response.data
}

export const sendAiMessage = async (message) => {
  const response = await api.post('/api/ai/chat', { message })
  return response.data
}

export const clearAiHistory = async () => {
  const response = await api.delete('/api/ai/history')
  return response.data
}

export const getAiQuickPrompts = async () => {
  const response = await api.get('/api/ai/quick-prompts')
  return response.data
}
