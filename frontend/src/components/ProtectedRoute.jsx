import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="page">
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Đang tải thông tin...</p>
      </div>
    )
  }

  if (!user) {
    // Chuyển hướng sang Login và lưu lại vị trí hiện tại
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
