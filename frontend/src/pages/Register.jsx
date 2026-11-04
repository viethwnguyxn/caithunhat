import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import GoogleLoginButton from '../components/GoogleLoginButton'
import brandMark from '../assets/lapulga-mark.svg'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

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
      setSuccess(true)
      // Chuyển hướng sau 1.5 giây
      setTimeout(() => {
        navigate('/login')
      }, 1500)
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
    <main className="lp-auth-page lp-register-page">
      <section className="lp-auth-panel">
        <div className="lp-auth-form-wrap lp-auth-register-wrap">
          <Link to="/" className="lp-auth-brand lp-auth-register-brand"><img src={brandMark} alt="" className="lp-auth-mark" /><span>La Pulga</span></Link>
          <span className="lp-auth-kicker lp-auth-register-kicker">BẮT ĐẦU HÀNH TRÌNH</span>
          <h2>Tạo tài khoản</h2>
          <p className="lp-auth-intro">Gia nhập La Pulga và tìm thấy những kết nối đồng điệu.</p>
          {error && <div className="alert alert-error">⚠️ {error}</div>}
          {success && <div className="alert alert-success">✓ Đăng ký thành công! Đang chuyển hướng sang đăng nhập...</div>}
          <form onSubmit={handleSubmit} className="lp-auth-form">
            <div className="form-group"><label htmlFor="reg-username">Tên đăng nhập</label><input id="reg-username" type="text" name="username" placeholder="vd: hoang_nam" value={form.username} onChange={handleChange} minLength={3} maxLength={30} disabled={loading || success} autoComplete="username" /></div>
            <div className="form-group"><label htmlFor="reg-email">Email</label><input id="reg-email" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange} disabled={loading || success} autoComplete="email" /></div>
            <div className="form-group"><label htmlFor="reg-password">Mật khẩu (tối thiểu 8 ký tự)</label><div className="password-input-wrapper"><input id="reg-password" type={showPassword ? 'text' : 'password'} name="password" placeholder="Ít nhất 8 ký tự" value={form.password} onChange={handleChange} disabled={loading || success} autoComplete="new-password" /><button type="button" className="password-toggle-btn" onClick={() => setShowPassword(!showPassword)} tabIndex="-1" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? '👁️' : '🔒'}</button></div></div>
            <button type="submit" className="lp-auth-submit" disabled={loading || success}>{loading ? 'Đang xử lý...' : 'Tạo tài khoản miễn phí'} <span>→</span></button>
          </form>
          <div className="lp-auth-divider"><span>hoặc tiếp tục với</span></div>
          <GoogleLoginButton onError={(msg) => setError(msg)} />
          <p className="lp-auth-footer">Đã có tài khoản? <Link to="/login">Đăng nhập</Link></p>
          <Link to="/" className="lp-auth-back">← Quay lại trang chủ</Link>
        </div>
      </section>
    </main>
  )
}
