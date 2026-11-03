import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService'

function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) return 'Vừa xong'
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`
  const diffInHours = Math.floor(diffInSeconds / 60)
  if (diffInHours < 24) return `${diffInHours} giờ trước`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays} ngày trước`
  return date.toLocaleDateString('vi-VN')
}

function getNotificationIcon(type) {
  switch (type) {
    case 'connection_request':
      return 'handshake'
    case 'connection_accepted':
      return 'celebration'
    case 'message':
      return 'chat'
    case 'group_join':
      return 'groups'
    case 'group_post':
      return 'article'
    case 'post_like':
      return 'favorite'
    case 'post_comment':
      return 'forum'
    default:
      return 'notifications'
  }
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  const fetchNotifications = async () => {
    try {
      const data = await getNotifications()
      setNotifications(data.items || [])
      setUnreadCount(data.unread_count || 0)
    } catch (err) {
      console.error('Lỗi khi tải thông báo:', err)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchNotifications()
      }
    }, 15000)

    const handleNotificationsUpdated = () => {
      fetchNotifications()
    }
    window.addEventListener('notifications-updated', handleNotificationsUpdated)

    return () => {
      clearInterval(interval)
      window.removeEventListener('notifications-updated', handleNotificationsUpdated)
    }
  }, [])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications()
    }
    setIsOpen(!isOpen)
  }

  const handleMarkAllRead = async (e) => {
    e.stopPropagation()
    try {
      setLoading(true)
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Lỗi đánh dấu tất cả đã đọc:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleItemClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await markNotificationAsRead(notif.id)
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (err) {
        console.error('Lỗi đánh dấu đã đọc:', err)
      }
    }

    setIsOpen(false)

    switch (notif.type) {
      case 'connection_request':
      case 'connection_accepted':
        navigate('/connections')
        break
      case 'message':
        if (notif.related_id) {
          navigate('/messages', { state: { conversationId: notif.related_id } })
        } else {
          navigate('/messages')
        }
        break
      case 'group_join':
      case 'group_post':
      case 'post_like':
      case 'post_comment':
        if (notif.related_id) {
          navigate('/communities', { state: { postId: notif.related_id } })
        } else {
          navigate('/communities')
        }
        break
      default:
        break
    }
  }

  return (
    <div ref={dropdownRef} className="relative inline-block">
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`relative w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${
          isOpen
            ? 'bg-[#11151c] border-[#00ff88] text-[#00ff88] shadow-[0_0_12px_rgba(0,255,136,0.3)]'
            : 'bg-[#0d1117] border-[#1a232e] text-[#94a3b8] hover:text-[#00ff88] hover:border-[#00ff88]/40'
        }`}
        aria-label="Thông báo"
        title="Thông báo"
      >
        <span className="material-symbols-outlined text-[19px]">notifications</span>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#00ff88] text-[#08090a] text-[10px] font-extrabold flex items-center justify-center border-2 border-[#08090a] shadow-[0_0_8px_#00ff88]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#11151c] border border-[#1a232e] shadow-[0_15px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a232e] bg-[#0d1117]/80">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#f8fafc]">Thông báo</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30 text-[11px] font-bold">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-xs font-semibold text-[#00ff88] hover:underline"
              >
                Đọc tất cả
              </button>
            )}
          </div>

          {/* List items */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#1a232e]/50">
            {notifications.length === 0 ? (
              <div className="py-10 px-4 text-center text-[#94a3b8]">
                <span className="material-symbols-outlined text-3xl mb-2 text-[#64748b]">
                  notifications_off
                </span>
                <p className="text-sm font-semibold text-[#f8fafc]">Không có thông báo mới</p>
                <p className="text-xs text-[#64748b] mt-1">
                  Bạn sẽ nhận được thông báo khi có người kết nối hoặc gửi tin nhắn.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    item.is_read
                      ? 'bg-[#11151c] hover:bg-[#161c26]'
                      : 'bg-[#00ff88]/5 hover:bg-[#00ff88]/10'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                      item.is_read
                        ? 'bg-[#0d1117] border-[#1a232e] text-[#64748b]'
                        : 'bg-[#00ff88]/15 border-[#00ff88]/30 text-[#00ff88]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {getNotificationIcon(item.type)}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <span
                        className={`text-xs truncate ${
                          item.is_read
                            ? 'font-medium text-[#f8fafc]'
                            : 'font-bold text-[#00ff88]'
                        }`}
                      >
                        {item.title}
                      </span>
                      <span className="text-[10px] text-[#64748b] shrink-0">
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>
                    <p className="text-xs text-[#94a3b8] line-clamp-2 leading-relaxed">
                      {item.content}
                    </p>
                  </div>

                  {!item.is_read && (
                    <span className="w-2 h-2 rounded-full bg-[#00ff88] shrink-0 mt-1.5 shadow-[0_0_6px_#00ff88]" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
