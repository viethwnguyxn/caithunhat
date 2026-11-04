import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'

const NAV_ITEMS = [
  { path: '/home', label: 'Trang chủ', icon: '⌂' },
  { path: '/discover', label: 'Khám phá', icon: '◉' },
  { path: '/connections', label: 'Bạn bè', icon: '♧' },
  { path: '/messages', label: 'Tin nhắn', icon: '▤' },
  { path: '/communities', label: 'Nhóm cộng đồng', icon: '♧' },
  { path: '/profile', label: 'Trang cá nhân', icon: '◯' },
]

export default function Navbar() {
  const { user } = useAuth()
  const location = useLocation()
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <Link className="app-brand" to="/" aria-label="La Pulga - Giới thiệu">
          <img className="app-brand-mark" src="/logo-lapulga.png" alt="" />
          <span className="app-brand-copy">
            <strong>La Pulga</strong>
            <small>Tâm sự &amp; Chữa lành</small>
          </span>
        </Link>

        <label className="app-search">
          <span aria-hidden="true">⌕</span>
          <input type="search" placeholder="Tìm kiếm nhóm & cộng đồng..." />
        </label>

        <nav className="app-topnav" aria-label="Điều hướng chính">
          {[...NAV_ITEMS, ...(user?.role === 'admin'
            ? [{ path: '/admin', label: 'Quản trị', icon: '⚙' }]
            : [])].map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={location.pathname === item.path ? 'is-active' : ''}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="app-top-actions">
          <Link className="survey-shortcut" to="/survey">
            <span aria-hidden="true">✦</span>
            Khảo sát tâm lý
          </Link>
          <Link className="top-icon-link" to="/messages" aria-label="Tin nhắn" title="Tin nhắn">
            ▤
          </Link>
          <NotificationBell />
          <ThemeToggle className="app-theme-toggle" />
          <Link className="app-avatar" to="/profile" title="Trang cá nhân">
            {(user?.username || '?')[0].toUpperCase()}
          </Link>
        </div>
      </header>
    </div>
  )
}
