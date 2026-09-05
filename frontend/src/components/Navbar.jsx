import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  const navItems = [
    { path: '/home', label: 'Trang chủ', icon: '🏠' },
    { path: '/discover', label: 'Khám phá', icon: '✨' },
    { path: '/communities', label: 'Cộng đồng', icon: '🌟' },
    { path: '/connections', label: 'Kết nối', icon: '🤝' },
    { path: '/messages', label: 'Tin nhắn', icon: '💬' },
    { path: '/profile', label: 'Hồ sơ', icon: '👤' },
  ]

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderBottom: '1px solid #ede9fe',
        boxShadow: '0 2px 10px rgba(124, 92, 191, 0.04)',
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <Link
          to="/home"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 800,
            fontSize: '20px',
            color: '#7c5cbf',
            letterSpacing: '-0.5px',
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

        {/* Desktop Navigation Links */}
        <nav className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  padding: '8px 14px',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#7c5cbf' : '#4b5563',
                  backgroundColor: active ? '#f5f0ff' : 'transparent',
                  border: active ? '1px solid #ede9fe' : '1px solid transparent',
                  transition: 'all 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Right Actions: Notification Bell + User info (Desktop) / Hamburger (Mobile) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <NotificationBell />

          {/* Desktop User Info & Logout */}
          <div className="nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  backgroundColor: '#f5f0ff',
                  border: '1.5px solid #7c5cbf',
                  color: '#7c5cbf',
                  fontWeight: 700,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {(user?.username || '?')[0].toUpperCase()}
              </span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>
                @{user?.username}
              </span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #fee2e2',
                backgroundColor: '#fff5f5',
                color: '#ef4444',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#fecaca'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#fff5f5'
              }}
            >
              Đăng xuất
            </button>
          </div>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            className="nav-mobile-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              background: '#f5f0ff',
              border: '1px solid #ede9fe',
              color: '#7c5cbf',
              borderRadius: '10px',
              padding: '8px 12px',
              fontSize: '18px',
              cursor: 'pointer',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div
          className="nav-mobile-drawer"
          style={{
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #ede9fe',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
            animation: 'fadeIn 0.2s ease-in-out',
          }}
        >
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: active ? 700 : 500,
                  color: active ? '#7c5cbf' : '#374151',
                  backgroundColor: active ? '#f5f0ff' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}

          <div
            style={{
              borderTop: '1px solid #f3f4f6',
              paddingTop: '12px',
              marginTop: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span style={{ fontSize: '13px', color: '#6b7280' }}>
              Đăng nhập với @{user?.username}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                backgroundColor: '#fff5f5',
                color: '#ef4444',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
