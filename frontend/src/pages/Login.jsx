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
    <div className="min-h-screen bg-[#F8F7FA] text-[#292631] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-10 antialiased selection:bg-[#E9E1F3] selection:text-[#7C5CBF]">
      {/* Main Split Screen Container */}
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-[#E9E1F3] shadow-[0_16px_40px_rgba(124,92,191,0.08)] overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* Left Side: Brand Storytelling (Desktop Only) */}
        <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#7C5CBF] to-[#906CD9] p-10 flex-col justify-between text-white relative overflow-hidden">
          {/* Subtle Ambient Shapes */}
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
              ✨ Nền tảng kết nối người đồng điệu
            </span>
            <h2 className="text-2xl font-bold leading-snug">
              “Find people who understand you.”
            </h2>
            <p className="text-xs text-white/85 leading-relaxed">
              Mỗi chúng ta đều có câu chuyện riêng. Đăng nhập để tiếp tục gặp gỡ những người bạn cùng chia sẻ góc nhìn và mục tiêu cuộc sống.
            </p>
          </div>

          <div className="relative z-10 text-[11px] text-white/70">
            © {new Date().getFullYear()} Kindred Community. An toàn & Bảo mật.
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 md:p-12 flex flex-col justify-center">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-6">
            <Link to="/" className="inline-flex items-center gap-2 text-xl font-bold text-[#7C5CBF]">
              <span className="w-8 h-8 rounded-lg bg-[#7C5CBF] text-white flex items-center justify-center text-sm">
                ◎
              </span>
              <span>Kindred</span>
            </Link>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold text-[#292631]">Chào mừng trở lại!</h1>
            <p className="text-xs sm:text-sm text-[#77717F] mt-1">
              Đăng nhập để kết nối với những người bạn đồng điệu của bạn.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group !mb-0">
              <label htmlFor="login-account">Email hoặc Tên đăng nhập</label>
              <div className="relative">
                <input
                  id="login-account"
                  type="text"
                  name="account"
                  placeholder="you@example.com hoặc username"
                  value={form.account}
                  onChange={handleChange}
                  disabled={loading}
                  autoComplete="username"
                  className="kindred-input"
                />
              </div>
            </div>

            <div className="form-group !mb-0">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="login-password" className="!mb-0">
                  Mật khẩu
                </label>
              </div>
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
              disabled={loading}
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập vào Kindred'}
            </button>
          </form>

          {/* Social Google Login Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-[1px] bg-[#E9E1F3]"></div>
            <span className="px-3 text-[11px] font-semibold text-[#A19AA8] uppercase">
              hoặc
            </span>
            <div className="flex-1 h-[1px] bg-[#E9E1F3]"></div>
          </div>

          <GoogleLoginButton onError={(msg) => setError(msg)} />

          <p className="mt-8 text-center text-xs text-[#77717F]">
            Chưa có tài khoản Kindred?{' '}
            <Link to="/register" className="font-bold text-[#7C5CBF] hover:underline">
              Đăng ký miễn phí ngay
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
