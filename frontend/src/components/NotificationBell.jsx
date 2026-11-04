import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell,
  BellOff,
  Check,
  Heart,
  MessageCircle,
  Pencil,
  UserRoundPlus,
  UsersRound,
} from 'lucide-react'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/notificationService'

// Format thời gian tương đối thân thiện
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

// Icon tương ứng với từng loại thông báo
function getNotificationIcon(type) {
  switch (type) {
    case 'connection_request':
      return UserRoundPlus
    case 'connection_accepted':
      return Check
    case 'message':
      return MessageCircle
    case 'group_join':
      return UsersRound
    case 'group_post':
      return Pencil
    case 'post_like':
      return Heart
    case 'post_comment':
      return MessageCircle
    default:
      return Bell
  }
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  // Tải danh sách thông báo
  const fetchNotifications = async () => {
    try {
      const data = await getNotifications()
      setNotifications(data.items || [])
      setUnreadCount(data.unread_count || 0)
    } catch (err) {
      console.error('Lỗi khi tải thông báo:', err)
    }
  }

  // Tải lần đầu, lặp polling mỗi 15 giây và lắng nghe sự kiện cập nhật thông báo
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

  // Đóng dropdown khi click ra ngoài
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

  // Xử lý click mở/đóng dropdown
  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications()
    }
    setIsOpen(!isOpen)
  }

  // Đánh dấu tất cả đã đọc
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

  // Click vào 1 thông báo: Đánh dấu đã đọc và điều hướng
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

    // Điều hướng tương ứng
    switch (notif.type) {
      case 'connection_request':
        navigate('/connections?tab=received')
        break
      case 'connection_accepted':
        navigate('/connections?tab=connections')
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
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Nút Chuông */}
      <button
        type="button"
        onClick={handleToggle}
        style={{
          position: 'relative',
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          border: isOpen ? '1.5px solid #245745' : '1px solid #dce8e2',
          backgroundColor: isOpen ? '#e1efe8' : '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          fontSize: '17px',
          color: '#4b5563',
          transition: 'all 0.15s ease',
        }}
        aria-label="Thông báo"
        title="Thông báo"
      >
        <Bell size={18} aria-hidden="true" />

        {/* Badge số lượng chưa đọc */}
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontSize: '11px',
              fontWeight: 700,
              minWidth: '18px',
              height: '18px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 2px 5px rgba(239, 68, 68, 0.4)',
              border: '2px solid #ffffff',
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown danh sách thông báo */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: '360px',
            maxWidth: '90vw',
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 12px 36px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(36, 87, 69, 0.08)',
            border: '1px solid #dce8e2',
            zIndex: 1000,
            overflow: 'hidden',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          {/* Header Dropdown */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderBottom: '1px solid #f3f4f6',
              backgroundColor: '#f1f7f3',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: '#1f2937' }}>
                Thông báo
              </span>
              {unreadCount > 0 && (
                <span
                  style={{
                    backgroundColor: '#dce8e2',
                    color: '#245745',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#245745',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '4px 6px',
                  borderRadius: '6px',
                  transition: 'background 0.15s ease',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#dce8e2')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                Đọc tất cả
              </button>
            )}
          </div>

          {/* List items */}
          <div
            style={{
              maxHeight: '380px',
              overflowY: 'auto',
            }}
          >
            {notifications.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#6b7280',
                }}
              >
                <BellOff size={32} style={{ marginBottom: '8px' }} aria-hidden="true" />
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151' }}>
                  Không có thông báo mới
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px', color: '#9ca3af' }}>
                  Bạn sẽ nhận được thông báo khi có người kết nối hoặc nhắn tin.
                </div>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 16px',
                    borderBottom: '1px solid #f9fafb',
                    backgroundColor: item.is_read ? '#ffffff' : '#f8f5ff',
                    cursor: 'pointer',
                    transition: 'background-color 0.15s ease',
                    position: 'relative',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = item.is_read ? '#f9fafb' : '#f0ebff'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = item.is_read ? '#ffffff' : '#f8f5ff'
                  }}
                >
                  {/* Icon */}
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '10px',
                      backgroundColor: item.is_read ? '#f3f4f6' : '#dce8e2',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {(() => {
                      const NotificationIcon = getNotificationIcon(item.type)
                      return <NotificationIcon size={18} color="#245745" aria-hidden="true" />
                    })()}
                  </div>

                  {/* Nội dung */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        marginBottom: '2px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '13.5px',
                          fontWeight: item.is_read ? 600 : 700,
                          color: item.is_read ? '#374151' : '#1f2937',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.title}
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: '#9ca3af',
                          flexShrink: 0,
                        }}
                      >
                        {formatTimeAgo(item.created_at)}
                      </span>
                    </div>

                    <p
                      style={{
                        margin: 0,
                        fontSize: '12.5px',
                        color: item.is_read ? '#6b7280' : '#4b5563',
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                      }}
                    >
                      {item.content}
                    </p>
                  </div>

                  {/* Chấm tròn chưa đọc */}
                  {!item.is_read && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#245745',
                        flexShrink: 0,
                        marginTop: '6px',
                      }}
                      title="Chưa đọc"
                    />
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
