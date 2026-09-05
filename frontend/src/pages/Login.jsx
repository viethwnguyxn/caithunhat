import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import GoogleLoginButton from '../components/GoogleLoginButton'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [form, setForm] = useState({ account: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const from = location.state?.from?.pathname || '/home'

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.account.trim()) {
      setError('Vui lòng nhập Email hoặc Tên đăng nhập.')
      return
    }
    if (!form.password) {
      setError('Vui lòng nhập mật khẩu.')
      return
    }

    setLoading(true)

    try {
      await login(form.account, form.password)
      navigate(from, { replace: true })
    } catch (err) {
      if (err.response && err.response.data) {
        const detail = err.response.data.detail
        if (typeof detail === 'string') {
          setError(detail)
        } else if (Array.isArray(detail)) {
          setError(detail[0]?.msg || 'Dữ liệu không hợp lệ')
        } else {
          setError('Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.')
        }
      } else {
        setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <div className="card">
        {/* Brand header */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 800,
              fontSize: '22px',
              color: '#7c5cbf',
              marginBottom: '6px',
            }}
          >
            <span
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #7c5cbf, #9b7fe8)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
              }}
            >
              ◎
            </span>
            <span>Kindred</span>
          </Link>
          <h1 style={{ fontSize: '22px', margin: '4px 0', color: '#1a1a2e' }}>Chào mừng trở lại!</h1>
          <p style={{ color: '#6b7280', fontSize: '13.5px', margin: 0 }}>
            Đăng nhập để tiếp tục kết nối với những người bạn đồng điệu
          </p>
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="login-account">Email hoặc Tên đăng nhập</label>
            <input
              id="login-account"
              type="text"
              name="account"
              placeholder="you@example.com hoặc username"
              value={form.account}
              onChange={handleChange}
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password">Mật khẩu</label>
            <div className="password-input-wrapper">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? '👁️' : '🔒'}
              </button>
            </div>
          </div>

          <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '8px' }}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ede9fe' }}></div>
          <span style={{ padding: '0 12px', fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>
            hoặc
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#ede9fe' }}></div>
        </div>

        {/* Nút Continue with Google */}
        <GoogleLoginButton onError={(msg) => setError(msg)} />

        <p className="auth-footer">
          Chưa có tài khoản? <Link to="/register">Đăng ký ngay</Link>
        </p>
      </div>
    </div>
  )
}
