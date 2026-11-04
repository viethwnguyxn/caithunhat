import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchKeyword.trim()) {
      navigate(`/discover?search=${encodeURIComponent(searchKeyword.trim())}`)
    }
  }

  const isActive = (path) => location.pathname === path

  const navItems = [
    { path: '/home', label: 'Bảng tin', icon: 'dynamic_feed' },
    { path: '/discover', label: 'Khám phá', icon: 'explore' },
    { path: '/connections', label: 'Bạn bè', icon: 'group' },
    { path: '/communities', label: 'Cộng đồng', icon: 'groups' },
    { path: '/messages', label: 'Tin nhắn', icon: 'chat' },
    ...(user?.role === 'admin'
      ? [{ path: '/admin', label: 'Quản trị', icon: 'admin_panel_settings' }]
      : []),
  ]

  const userAvatar =
    user?.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#08090a]/90 backdrop-blur-xl border-b border-[#1a232e]">
      <div className="max-w-7xl mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/home" className="flex items-center gap-3 shrink-0 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#10b981] to-[#00ff88] flex items-center justify-center text-[#08090a] font-extrabold text-lg shadow-[0_0_15px_rgba(0,255,136,0.4)] group-hover:scale-105 transition-transform">
            ✳
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-xl text-[#00ff88] tracking-tight leading-none drop-shadow-[0_0_10px_rgba(0,255,136,0.5)]">
              La Pulga
            </span>
            <span className="text-[11px] text-[#849585] hidden sm:block tracking-wide">
              Kết nối từ sự đồng điệu
            </span>
          </div>
        </Link>

        {/* 4 Main Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center gap-1 bg-[#0d1117] p-1 rounded-xl border border-[#1a232e]">
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30 shadow-[0_0_12px_rgba(0,255,136,0.25)]'
                    : 'text-[#94a3b8] hover:text-[#00ff88] hover:bg-[#11151c]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right Actions: Search + Notification Bell + Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Quick Search */}
          <div className="relative hidden lg:flex items-center">
            <span className="material-symbols-outlined absolute left-3 text-[#64748b] text-[18px] pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={handleSearchSubmit}
              placeholder="Tìm bạn bè, sở thích..."
              className="w-56 xl:w-64 h-9 pl-9 pr-3 rounded-xl bg-[#0d1117] border border-[#1a232e] text-[#f8fafc] placeholder:text-[#64748b] text-xs focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] focus:shadow-[0_0_10px_rgba(0,255,136,0.2)] transition-all"
            />
          </div>

          {/* Notification Bell */}
          <NotificationBell />

          {/* User Profile Avatar with dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 p-1 rounded-full border border-[#1a232e] hover:border-[#00ff88]/50 transition-all focus:outline-none"
              title="Tài khoản cá nhân"
            >
              <div className="relative">
                <img
                  src={userAvatar}
                  alt={user?.username || 'Avatar'}
                  className="w-8 h-8 rounded-full object-cover border border-[#00ff88]/40"
                  onError={(e) => {
                    e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=user`
                  }}
                />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00ff88] border-2 border-[#08090a] shadow-[0_0_6px_#00ff88]" />
              </div>
            </button>

            {/* Profile Menu Dropdown */}
            {profileDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setProfileDropdownOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#11151c] border border-[#1a232e] shadow-[0_10px_30px_rgba(0,0,0,0.7)] p-2 z-50 animate-fadeIn">
                  <div className="px-3 py-2 border-b border-[#1a232e] mb-1">
                    <p className="text-sm font-bold text-[#f8fafc] truncate">
                      {user?.display_name || user?.username}
                    </p>
                    <p className="text-xs text-[#10b981] truncate">@{user?.username}</p>
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#94a3b8] hover:text-[#00ff88] hover:bg-[#161c26] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">account_circle</span>
                    Hồ sơ cá nhân
                  </Link>

                  <Link
                    to="/survey"
                    onClick={() => setProfileDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#94a3b8] hover:text-[#00ff88] hover:bg-[#161c26] transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">quiz</span>
                    Khảo sát đồng điệu
                  </Link>

                  <Link to="/settings" onClick={() => setProfileDropdownOpen(false)} className="flex items-center gap-2 px-3 py-2 mt-1 rounded-lg text-xs font-medium text-[#94a3b8] hover:text-[#00ff88] hover:bg-[#161c26] border-t border-[#1a232e] transition-colors">
                    <span className="material-symbols-outlined text-[16px]">settings</span>Cài đặt & tài khoản
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-[#94a3b8] hover:text-[#00ff88] hover:bg-[#11151c] border border-[#1a232e] transition-all"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-[20px]">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0d1117] border-b border-[#1a232e] px-4 py-3 flex flex-col gap-1.5 shadow-2xl animate-fadeIn">
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2.5 transition-all ${
                  active
                    ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30 shadow-[0_0_10px_rgba(0,255,136,0.2)]'
                    : 'text-[#94a3b8] hover:text-[#00ff88] hover:bg-[#11151c]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}

          <div className="pt-2 mt-1 border-t border-[#1a232e] flex items-center justify-between">
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="text-xs text-[#00ff88] font-semibold"
            >
              Hồ sơ: @{user?.username}
            </Link>
            <Link to="/settings" onClick={() => setMobileMenuOpen(false)} className="text-xs text-[#94a3b8]">Cài đặt</Link>
          </div>
        </div>
      )}
    </header>
  )
}
