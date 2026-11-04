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
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} giờ trước`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays} ngày trước`
  return date.toLocaleDateString('vi-VN')
}

function getNotificationIcon(type) {
  switch (type) {
    case 'connection_request':
      return { icon: 'person_add', color: 'text-[#7C5CBF] bg-[#F5F0FA]' }
    case 'connection_accepted':
      return { icon: 'verified', color: 'text-[#10B981] bg-[#ECFDF5]' }
    case 'message':
      return { icon: 'chat', color: 'text-[#3B82F6] bg-[#EFF6FF]' }
    case 'post_like':
      return { icon: 'favorite', color: 'text-[#EC4899] bg-[#FDF2F8]' }
    case 'post_comment':
      return { icon: 'comment', color: 'text-[#F59E0B] bg-[#FFFBEB]' }
    default:
      return { icon: 'notifications', color: 'text-[#7C5CBF] bg-[#F5F0FA]' }
  }
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
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
    const interval = setInterval(fetchNotifications, 15000)

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
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const handleNotificationClick = async (notif) => {
    if (!notif.is_read) {
      try {
        await markNotificationAsRead(notif.id)
        setNotifications((prev) =>
          prev.map((item) => (item.id === notif.id ? { ...item, is_read: true } : item))
        )
        setUnreadCount((prev) => Math.max(0, prev - 1))
      } catch (err) {
        console.error('Lỗi khi đánh dấu đã đọc:', err)
      }
    }

    setIsOpen(false)
    if (notif.type === 'connection_request') {
      navigate('/connections?tab=received')
    } else if (notif.type === 'connection_accepted') {
      navigate('/connections?tab=connections')
    } else if (notif.type === 'message') {
      if (notif.data && notif.data.conversation_id) {
        navigate('/messages', { state: { conversationId: notif.data.conversation_id } })
      } else {
        navigate('/messages')
      }
    } else if (notif.type === 'post_like' || notif.type === 'post_comment') {
      navigate('/communities')
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })))
      setUnreadCount(0)
    } catch (err) {
      console.error('Lỗi khi đánh dấu tất cả đã đọc:', err)
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-10 h-10 rounded-full border border-[#E9E1F3] hover:border-[#7C5CBF]/40 bg-white hover:bg-[#F5F0FA] text-[#77717F] hover:text-[#7C5CBF] flex items-center justify-center transition-all cursor-pointer shadow-sm"
        aria-label="Thông báo"
      >
        <span className="material-symbols-outlined text-[20px]">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] rounded-full bg-[#7C5CBF] text-white text-[10px] font-bold flex items-center justify-center shadow-md animate-scaleUp">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Drawer */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-[#E9E1F3] shadow-[0_12px_36px_rgba(124,92,191,0.14)] overflow-hidden z-50 animate-fadeIn">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#F2EFF5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#292631]">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#F5F0FA] text-[#7C5CBF] text-[11px] font-bold">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-[#7C5CBF] hover:underline cursor-pointer"
              >
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#F2EFF5]">
            {notifications.length > 0 ? (
              notifications.map((notif) => {
                const { icon, color } = getNotificationIcon(notif.type)
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 flex items-start gap-3 cursor-pointer transition-colors ${
                      notif.is_read ? 'hover:bg-[#F8F7FA]' : 'bg-[#F5F0FA]/50 hover:bg-[#F5F0FA]'
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-xs ${notif.is_read ? 'text-[#292631]' : 'text-[#292631] font-semibold'} line-clamp-2`}>
                        {notif.content}
                      </p>
                      <span className="text-[10px] text-[#A19AA8] mt-1 block font-medium">
                        {formatTimeAgo(notif.created_at)}
                      </span>
                    </div>

                    {!notif.is_read && (
                      <span className="w-2 h-2 rounded-full bg-[#7C5CBF] shrink-0 mt-1.5"></span>
                    )}
                  </div>
                )
              })
            ) : (
              <div className="py-10 text-center text-xs text-[#77717F]">
                Bạn chưa có thông báo nào.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
