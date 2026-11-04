import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'
import brandMark from '../assets/lapulga-mark.svg'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchKeyword, setSearchKeyword] = useState('')
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const handleSearchSubmit = (e) => {
    if (e.key === 'Enter' && searchKeyword.trim()) {
      navigate(`/discover?search=${encodeURIComponent(searchKeyword.trim())}`)
    }
  }

  const isActive = (path) => location.pathname === path

  const navItems = [
    { path: '/home', label: 'Trang chủ', icon: 'home' },
    { path: '/discover', label: 'Khám phá', icon: 'explore' },
    { path: '/connections', label: 'Bạn bè', icon: 'group' },
    { path: '/messages', label: 'Tin nhắn', icon: 'chat' },
    { path: '/settings', label: 'Cài đặt', icon: 'settings' },
    ...(user?.role === 'admin'
      ? [{ path: '/admin', label: 'Quản trị', icon: 'admin_panel_settings' }]
      : []),
  ]

  const userAvatar =
    user?.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#08090a]/90 backdrop-blur-xl border-b border-[#1a232e]">
      <div className="max-w-[1600px] mx-auto h-16 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link to="/home" className="flex items-center gap-3 shrink-0 group">
          <img
            src={brandMark}
            alt=""
            className="w-10 h-10 rounded-xl shadow-[0_0_18px_rgba(197,243,106,0.18)] group-hover:scale-105 transition-transform"
          />
          <div className="flex flex-col">
            <span className="font-extrabold text-xl text-[#f5f2eb] tracking-tight leading-none">
              La Pulga
            </span>
            <span className="text-[11px] text-[#aaa3b2] hidden sm:block tracking-wide">
              Kết nối từ sự đồng điệu
            </span>
          </div>
        </Link>

        {/* 4 Main Navigation Links (Desktop) */}
        <nav className="navbar-scrollbar flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto bg-[#0d1117] p-1 rounded-xl border border-[#1a232e]">
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={`whitespace-nowrap min-w-0 flex-1 justify-center px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${
                  active
                    ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30 shadow-[0_0_12px_rgba(0,255,136,0.25)]'
                    : 'text-[#94a3b8] hover:text-[#00ff88] hover:bg-[#11151c]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right Actions: Search + Notification Bell + Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Quick Search */}
          <div className="relative hidden 2xl:flex items-center">
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

        </div>
      </div>
    </header>
  )
}
