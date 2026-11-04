import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'
import {
  Compass,
  Home,
  MessageSquare,
  Search,
  Settings,
  Sparkles,
  UserRound,
  Users,
  UsersRound,
  X,
  MessageCircleHeart,
  HeartHandshake,
  Leaf,
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/home', label: 'Trang chủ', icon: Home },
  { path: '/discover', label: 'Khám phá', icon: Compass },
  { path: '/connections', label: 'Bạn bè', icon: UsersRound },
  { path: '/messages', label: 'Tin nhắn', icon: MessageSquare },
  { path: '/communities', label: 'Nhóm cộng đồng', icon: Users },
  { path: '/activity', label: 'Trang cá nhân', icon: UserRound },
]

export default function Navbar() {
  const { user } = useAuth()
  const location = useLocation()
  const [introOpen, setIntroOpen] = useState(false)
  return (
    <div className="app-shell">
      <header className="app-topbar">
        <button
          type="button"
          className="app-brand app-brand-button"
          onClick={() => setIntroOpen(true)}
          aria-label="Giới thiệu về La Pulga"
        >
          <img className="app-brand-mark" src="/logo-lapulga.png" alt="" />
          <span className="app-brand-copy">
            <strong>La Pulga</strong>
            <small>Tâm sự &amp; Chữa lành</small>
          </span>
        </button>

        <label className="app-search">
          <Search size={16} aria-hidden="true" />
          <input type="search" placeholder="Tìm kiếm nhóm & cộng đồng..." />
        </label>

        <nav className="app-topnav" aria-label="Điều hướng chính">
          {[
            ...NAV_ITEMS,
            ...(user?.role === 'admin'
              ? [{ path: '/admin', label: 'Quản trị', icon: Settings }]
              : []),
          ].map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={location.pathname === item.path ? 'is-active' : ''}
            >
              <item.icon size={16} aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="app-top-actions">
          <Link className="survey-shortcut" to="/survey">
            <Sparkles size={14} aria-hidden="true" />
            Khảo sát tâm lý
          </Link>
          <NotificationBell />
          <ThemeToggle className="app-theme-toggle" />
          <Link className="app-avatar" to="/profile" title="Thông tin cá nhân" aria-label="Thông tin cá nhân">
            {(user?.username || '?')[0].toUpperCase()}
          </Link>
        </div>
      </header>
      {introOpen && (
        <div className="intro-overlay" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIntroOpen(false)
        }}>
          <section className="intro-dialog" role="dialog" aria-modal="true" aria-labelledby="intro-title">
            <button
              type="button"
              className="intro-close"
              onClick={() => setIntroOpen(false)}
              aria-label="Đóng giới thiệu"
            >
              <X size={20} aria-hidden="true" />
            </button>
            <img className="intro-logo" src="/logo-lapulga.png" alt="" />
            <span className="intro-eyebrow">Tâm sự &amp; Chữa lành</span>
            <h2 id="intro-title">La Pulga — nơi bạn được lắng nghe</h2>
            <p>
              Một cộng đồng an toàn để chia sẻ tâm sự, lưu lại cảm xúc mỗi ngày và tìm thấy
              những người đồng điệu. Không phán xét — chỉ có sự thấu hiểu và kết nối chân thành.
            </p>
            <div className="intro-highlights">
              <span><MessageCircleHeart size={16} aria-hidden="true" /> Chia sẻ và đồng cảm cùng cộng đồng</span>
              <span><Leaf size={16} aria-hidden="true" /> Bài tập thư giãn chăm sóc tinh thần</span>
              <span><HeartHandshake size={16} aria-hidden="true" /> Kết nối với những người cùng tần số</span>
            </div>
            <button type="button" className="home-post-button" onClick={() => setIntroOpen(false)}>
              Tiếp tục sử dụng La Pulga
            </button>
          </section>
        </div>
      )}
    </div>
  )
}
