import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('access_token'))
  const [loading, setLoading] = useState(true)
  const [loginEventId, setLoginEventId] = useState(0)

  useEffect(() => {
    async function loadUser() {
      const savedToken = localStorage.getItem('access_token')
      if (savedToken) {
        try {
          const res = await api.get('/api/users/me')
          setUser(res.data)
        } catch (err) {
          console.error('Không thể xác thực token lưu trữ:', err)
          localStorage.removeItem('access_token')
          setToken(null)
          setUser(null)
        }
      }
      setLoading(false)
    }

    loadUser()
  }, [])

  const login = async (account, password) => {
    const res = await api.post('/api/auth/login', { account, password })
    const { access_token } = res.data
    localStorage.setItem('access_token', access_token)
    setToken(access_token)

    // Lấy thông tin user ngay sau khi login
    const userRes = await api.get('/api/users/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    setUser(userRes.data)
    setLoginEventId((current) => current + 1)
    return userRes.data
  }

  const loginWithGoogle = async (idToken) => {
    const res = await api.post('/api/auth/google', { id_token: idToken })
    const { access_token } = res.data
    localStorage.setItem('access_token', access_token)
    setToken(access_token)

    // Lấy thông tin user
    const userRes = await api.get('/api/users/me', {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    setUser(userRes.data)
    setLoginEventId((current) => current + 1)
    return userRes.data
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, logout, loginEventId }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
