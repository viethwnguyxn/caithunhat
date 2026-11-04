import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'
import GoogleLoginButton from '../components/GoogleLoginButton'

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
    <div className="min-h-screen bg-[#F8F7FA] text-[#292631] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 antialiased selection:bg-[#E9E1F3] selection:text-[#7C5CBF]">
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-[#E9E1F3] shadow-[0_16px_40px_rgba(124,92,191,0.08)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
        {/* Left Side: Storytelling */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#7C5CBF] to-[#906CD9] p-10 flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white text-[#7C5CBF] flex items-center justify-center font-bold text-lg shadow-sm">
                ◎
              </div>
              <span className="text-xl font-extrabold tracking-tight">Kindred</span>
            </Link>
          </div>

          <div className="relative z-10 space-y-4 my-auto py-8">
            <span className="px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm border border-white/20 inline-block">
              🌟 Bắt đầu hành trình mới
            </span>
            <h2 className="text-2xl font-bold leading-snug">
              Tìm thấy người bạn thực sự thấu cảm bạn
            </h2>
            <p className="text-xs text-white/85 leading-relaxed">
              Tạo tài khoản chỉ mất chưa đầy 1 phút. Hoàn tất khảo sát ngắn để mở khóa mạng lưới kết nối sâu sắc và chân thực.
            </p>
          </div>

          <div className="relative z-10 text-[11px] text-white/70">
            Cam kết bảo vệ dữ liệu cá nhân & Không chứa quảng cáo làm phiền.
          </div>
        </div>

        {/* Right Side: Register Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 md:p-12 flex flex-col justify-center">
          <div className="lg:hidden text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2 text-xl font-bold text-[#7C5CBF]">
              <span className="w-8 h-8 rounded-lg bg-[#7C5CBF] text-white flex items-center justify-center text-sm">
                ◎
              </span>
              <span>Kindred</span>
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#292631]">Tạo tài khoản mới</h1>
            <p className="text-xs sm:text-sm text-[#77717F] mt-1">
              Điền thông tin cơ bản để bắt đầu tham gia cộng đồng.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
              <span>Đăng ký thành công! Đang chuyển hướng sang đăng nhập...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group !mb-0">
              <label htmlFor="reg-username">Tên người dùng (Username)</label>
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
                className="kindred-input"
              />
            </div>

            <div className="form-group !mb-0">
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
                className="kindred-input"
              />
            </div>

            <div className="form-group !mb-0">
              <label htmlFor="reg-password">Mật khẩu (tối thiểu 8 ký tự)</label>
              <div className="password-input-wrapper">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Ít nhất 8 ký tự"
                  value={form.password}
                  onChange={handleChange}
                  minLength={8}
                  disabled={loading || success}
                  autoComplete="new-password"
                  className="kindred-input"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full !py-3 !text-sm mt-2 shadow-md cursor-pointer"
              disabled={loading || success}
            >
              {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản Kindred'}
            </button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 h-[1px] bg-[#E9E1F3]"></div>
            <span className="px-3 text-[11px] font-semibold text-[#A19AA8] uppercase">
              hoặc
            </span>
            <div className="flex-1 h-[1px] bg-[#E9E1F3]"></div>
          </div>

          <GoogleLoginButton onError={(msg) => setError(msg)} />

          <p className="mt-6 text-[11px] text-[#A19AA8] text-center leading-relaxed">
            Bằng việc đăng ký, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của Kindred.
          </p>

          <p className="mt-4 text-center text-xs text-[#77717F]">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-bold text-[#7C5CBF] hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
