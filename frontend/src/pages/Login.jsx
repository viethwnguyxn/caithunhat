import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import GoogleLoginButton from '../components/GoogleLoginButton'
import brandMark from '../assets/lapulga-mark.svg'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const transitionClass = location.state?.authTransition === 'register-to-login'
    ? ' lp-auth-transition-from-register'
    : ''
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
    if (!form.account.trim()) return setError('Vui lòng nhập Email hoặc Tên đăng nhập.')
    if (!form.password) return setError('Vui lòng nhập mật khẩu.')
    setLoading(true)
    try {
      await login(form.account, form.password)
      navigate(from, { replace: true })
    } catch (err) {
      if (err.response?.data) {
        const detail = err.response.data.detail
        if (typeof detail === 'string') setError(detail)
        else if (Array.isArray(detail)) setError(detail[0]?.msg || 'Dữ liệu không hợp lệ')
        else setError('Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.')
      } else setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={`lp-login-screen${transitionClass}`}>
      <div className="lp-login-shell">
        <section className="lp-login-form-panel">
          <div className="lp-login-form-inner">
            <Link to="/" className="lp-login-brand">
              <img src={brandMark} alt="" className="lp-login-logo" />
              <span>La Pulga</span>
            </Link>
            <span className="lp-login-welcome">Chào mừng bạn trở lại</span>
            <p className="lp-login-subtitle">Đăng nhập để tiếp tục kết nối với cộng đồng của bạn.</p>

            {error && <div className="alert alert-error" role="alert">⚠ {error}</div>}

            <div className="lp-login-google"><GoogleLoginButton onError={(msg) => setError(msg)} /></div>
            <div className="lp-login-or"><span>HOẶC ĐĂNG NHẬP VỚI EMAIL</span></div>

            <form onSubmit={handleSubmit} className="lp-login-form">
              <div className="lp-login-field">
                <label htmlFor="login-account">Email hoặc Tên người dùng</label>
                <div className="lp-login-input-wrap"><span aria-hidden="true">@</span><input id="login-account" type="text" name="account" placeholder="tenban@lapulga.vn" value={form.account} onChange={handleChange} disabled={loading} autoComplete="username" /></div>
              </div>
              <div className="lp-login-field">
                <div className="lp-login-label-row"><label htmlFor="login-password">Mật khẩu</label><span className="lp-login-forgot">Quên mật khẩu?</span></div>
                <div className="lp-login-input-wrap"><span aria-hidden="true">♙</span><input id="login-password" type={showPassword ? 'text' : 'password'} name="password" placeholder="Nhập mật khẩu an toàn" value={form.password} onChange={handleChange} disabled={loading} autoComplete="current-password" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? 'Ẩ·' : '◎'}</button></div>
              </div>
              <label className="lp-login-remember"><input type="checkbox" /> <span>Ghi nhớ đăng nhập 30 ngày</span></label>
              <button type="submit" className="lp-login-submit" disabled={loading}>{loading ? 'Đang đăng nhập...' : 'Đăng nhập'} <span>→</span></button>
            </form>

            <p className="lp-login-signup">Chưa có tài khoản? <Link to="/register" state={{ authTransition: 'login-to-register' }}>Đăng ký ngay</Link></p>
            <div className="lp-login-legal"><span>Điều khoản dịch vụ</span><i>·</i><span>Chính sách bảo mật</span><i>·</i><span>Trợ giúp</span></div>
          </div>
        </section>
      </div>
    </main>
  )
}
