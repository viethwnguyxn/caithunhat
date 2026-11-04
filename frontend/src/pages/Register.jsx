import { useState } from 'react'
import {
  AlertTriangle,
  Eye,
  EyeOff,
  MessageCircleHeart,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Check,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import GoogleLoginButton from '../components/GoogleLoginButton'
import { rememberAccount } from '../services/rememberedAccount'
import ThemeToggle from '../components/ThemeToggle'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [rememberAccountOnDevice, setRememberAccountOnDevice] = useState(true)

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (error) setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // Validate phía client trước
    if (form.username.trim().length < 3) {
      setError('Tên đăng nhập phải có ít nhất 3 ký tự.')
      return
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email.trim())) {
      setError('Định dạng email không hợp lệ.')
      return
    }
    if (form.password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.')
      return
    }

    setLoading(true)
    try {
      await api.post('/api/auth/register', form)
      if (rememberAccountOnDevice) {
        rememberAccount(form.email)
      }
      setSuccess(true)
      try {
        await login(form.email, form.password)
        navigate('/survey', { replace: true })
      } catch (loginError) {
        console.error('Không thể tự động đăng nhập sau khi tạo tài khoản:', loginError)
        setError('Tài khoản đã được tạo nhưng chưa thể đăng nhập tự động. Vui lòng đăng nhập để làm khảo sát.')
      }
    } catch (err) {
      if (err.response && err.response.data) {
        const detail = err.response.data.detail
        if (typeof detail === 'string') {
          setError(detail)
        } else if (Array.isArray(detail)) {
          setError(detail[0]?.msg || 'Dữ liệu không hợp lệ')
        } else {
          setError('Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.')
        }
      } else {
        setError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page auth-screen">
      <main className="auth-layout">
        <ThemeToggle className="auth-theme-toggle" />
        <section className="auth-story">
          <div>
            <span className="auth-story-badge"><Sparkles size={14} aria-hidden="true" /> Nơi mọi cảm xúc đều được lắng nghe</span>
            <h1>Chào mừng bạn đến với <span>La Pulga</span></h1>
            <p>
              Không phán xét, không định kiến. Tìm thấy những tâm hồn đồng điệu và tự do sống thật
              với chính mình.
            </p>
            <div className="auth-benefits">
              <span><ShieldCheck size={16} aria-hidden="true" /> Ẩn danh an toàn, bảo mật dữ liệu riêng tư</span>
              <span><UsersRound size={16} aria-hidden="true" /> Kết nối bạn bè đồng điệu theo cảm xúc</span>
              <span><MessageCircleHeart size={16} aria-hidden="true" /> Chia sẻ câu chuyện trong không gian an yên</span>
            </div>
          </div>
          <blockquote className="auth-quote">
            “Đôi khi, chỉ cần có người lắng nghe cũng đủ khiến một ngày trở nên nhẹ nhàng hơn.”
          </blockquote>
        </section>
        <div className="card auth-card">
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
              color: '#245745',
              marginBottom: '6px',
            }}
          >
            <img className="auth-logo" src="/logo-lapulga.png" alt="" />
            <span>La Pulga</span>
          </Link>
          <h1 style={{ fontSize: '22px', margin: '4px 0', color: '#1a1a2e' }}>Tạo tài khoản mới</h1>
          <p style={{ color: '#6b7280', fontSize: '13.5px', margin: 0 }}>
            Bắt đầu hành trình tìm kiếm những người hiểu bạn hôm nay
          </p>
        </div>

        {error && <div className="alert alert-error"><AlertTriangle size={16} aria-hidden="true" /> {error}</div>}
        {success && (
          <div className="alert alert-success">
            <Check size={16} aria-hidden="true" /> Đăng ký thành công!
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="reg-username">Tên đăng nhập (Username)</label>
            <input
              id="reg-username"
              type="text"
              name="username"
              placeholder="vd: hoang_nam"
              value={form.username}
              onChange={handleChange}
              minLength={3}
              maxLength={30}
              disabled={loading || success}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={handleChange}
              disabled={loading || success}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-password">Mật khẩu (tối thiểu 8 ký tự)</label>
            <div className="password-input-wrapper">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                placeholder="Ít nhất 8 ký tự"
                value={form.password}
                onChange={handleChange}
                disabled={loading || success}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <label className="remember-account">
            <input
              type="checkbox"
              checked={rememberAccountOnDevice}
              onChange={(e) => setRememberAccountOnDevice(e.target.checked)}
              disabled={loading || success}
            />
            <span>Lưu email trên thiết bị này để đăng nhập nhanh (không lưu mật khẩu)</span>
          </label>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || success}
            style={{ marginTop: '8px' }}
          >
            {loading ? 'Đang xử lý...' : 'Tạo tài khoản'}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#dce8e2' }}></div>
          <span style={{ padding: '0 12px', fontSize: '12px', color: '#9ca3af', textTransform: 'uppercase', fontWeight: 600 }}>
            hoặc
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#dce8e2' }}></div>
        </div>

        {/* Nút Continue with Google */}
        <GoogleLoginButton onError={(msg) => setError(msg)} />

        <p className="auth-footer">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
        </div>
      </main>
    </div>
  )
}
