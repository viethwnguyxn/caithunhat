import api from './api'

export const getSurvey = async () => {
  try {
    const response = await api.get('/api/survey/me')
    return response.data
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return null
    }
    throw error
  }
}

export const submitSurvey = async (surveyData) => {
  const response = await api.post('/api/survey', surveyData)
  return response.data
}
