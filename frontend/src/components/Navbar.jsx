import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  const navItems = [
    { path: '/home', label: 'Trang chủ', icon: 'home' },
    { path: '/discover', label: 'Khám phá', icon: 'explore' },
    { path: '/communities', label: 'Cộng đồng', icon: 'groups' },
    { path: '/connections', label: 'Kết nối', icon: 'diversity_3' },
    { path: '/messages', label: 'Tin nhắn', icon: 'chat_bubble' },
  ]

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const avatarUrl =
    user?.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`

  return (
    <>
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-[#E9E1F3] shadow-[0_2px_12px_rgba(124,92,191,0.04)]">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link to="/home" className="flex items-center gap-2.5 group select-none">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#7C5CBF] to-[#906CD9] flex items-center justify-center text-white shadow-[0_2px_10px_rgba(124,92,191,0.3)] group-hover:scale-105 transition-transform">
                <span className="text-lg font-bold">◎</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold text-[#292631] tracking-tight group-hover:text-[#7C5CBF] transition-colors leading-none">
                  Kindred
                </span>
                <span className="text-[10px] text-[#77717F] font-medium hidden sm:block tracking-wide mt-0.5">
                  Find people who understand you
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-[#F5F0FA] text-[#7C5CBF] shadow-sm font-bold'
                        : 'text-[#77717F] hover:text-[#292631] hover:bg-[#F8F7FA]'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-3">
            {/* Notification Bell Component */}
            <NotificationBell />

            {/* User Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full border border-[#E9E1F3] hover:border-[#7C5CBF]/40 bg-[#FFFFFF] hover:bg-[#F5F0FA]/60 transition-all cursor-pointer shadow-sm"
              >
                <div className="relative">
                  <img
                    src={avatarUrl}
                    alt={user?.username}
                    className="w-8 h-8 rounded-full object-cover border border-[#E9E1F3] bg-[#F5F0FA]"
                    onError={(e) => {
                      e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                        user?.username || 'user'
                      )}`
                    }}
                  />
                  <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#10B981] ring-2 ring-white"></span>
                </div>
                <span className="text-xs font-semibold text-[#292631] hidden lg:inline max-w-[100px] truncate">
                  {user?.display_name || user?.username}
                </span>
                <span className="material-symbols-outlined text-[18px] text-[#77717F]">
                  expand_more
                </span>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white border border-[#E9E1F3] shadow-[0_10px_30px_rgba(124,92,191,0.12)] p-2 z-50 animate-fadeIn">
                  {/* User info header */}
                  <div className="px-3 py-2.5 border-b border-[#F2EFF5] mb-1">
                    <p className="text-xs font-bold text-[#292631] truncate">
                      {user?.display_name || user?.username}
                    </p>
                    <p className="text-[11px] text-[#77717F] truncate">@{user?.username}</p>
                    {user?.role === 'admin' && (
                      <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F5F0FA] text-[#7C5CBF] border border-[#E9E1F3]">
                        Quản trị viên
                      </span>
                    )}
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#292631] hover:bg-[#F5F0FA] hover:text-[#7C5CBF] transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">person</span>
                    <span>Hồ sơ cá nhân</span>
                  </Link>

                  <Link
                    to="/survey"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#292631] hover:bg-[#F5F0FA] hover:text-[#7C5CBF] transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">quiz</span>
                    <span>Cập nhật khảo sát</span>
                  </Link>

                  {user?.role === 'admin' && (
                    <Link
                      to="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#7C5CBF] hover:bg-[#F5F0FA] transition-all"
                    >
                      <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                      <span>Trang quản trị</span>
                    </Link>
                  )}

                  <div className="h-[1px] bg-[#F2EFF5] my-1"></div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-all text-left cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">logout</span>
                    <span>Đăng xuất</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E9E1F3] px-2 py-1.5 flex items-center justify-around shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
        {navItems.map((item) => {
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all ${
                active ? 'text-[#7C5CBF] font-bold' : 'text-[#77717F]'
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
