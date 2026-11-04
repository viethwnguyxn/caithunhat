import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ReportModal from '../components/ReportModal'
import BlockConfirmModal from '../components/BlockConfirmModal'
import { useAuth } from '../contexts/AuthContext'
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
} from '../services/chatService'
import { reportService } from '../services/reportService'
import { markConversationNotificationsAsRead } from '../services/notificationService'
import { getPublicProfile } from '../services/profileService'
import { useCall } from '../contexts/CallContext'

function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) return 'vừa xong'
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} giờ trước`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays} ngày trước`
  return date.toLocaleDateString('vi-VN')
}

export default function Messages() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Danh sách cuộc trò chuyện
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [loadingConversations, setLoadingConversations] = useState(true)

  // Tin nhắn của cuộc trò chuyện hiện tại
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)

  // Trạng thái kết nối WebSocket: 'connecting' | 'connected' | 'disconnected' | 'error'
  const [wsStatus, setWsStatus] = useState('disconnected')

  // Search filter cho danh sách chat bên trái
  const [searchTerm, setSearchTerm] = useState('')

  // Trạng thái modal Báo cáo & Chặn
  const [showReportModal, setShowReportModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)
  const [unblocking, setUnblocking] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Trạng thái xem hồ sơ đối phương
  const [partnerProfileModal, setPartnerProfileModal] = useState(null)
  const [loadingPartnerProfile, setLoadingPartnerProfile] = useState(false)
  const [isHoveringPartner, setIsHoveringPartner] = useState(false)

  // Quản lý cuộc gọi toàn cục qua CallContext
  const { startCall } = useCall()

  // Tự động tải lại lịch sử tin nhắn khi cuộc gọi kết thúc để cập nhật dòng log cuộc gọi
  useEffect(() => {
    const handleCallEnded = () => {
      if (activeConversation?.id) {
        setTimeout(() => {
          getMessages(activeConversation.id)
            .then((history) => {
              if (history) setMessages(history)
            })
            .catch(() => {})
        }, 500)
      }
    }
    window.addEventListener('call-session-ended', handleCallEnded)
    return () => window.removeEventListener('call-session-ended', handleCallEnded)
  }, [activeConversation?.id])

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [toastMessage])

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = () => setShowChatMenu(false)
    if (showChatMenu) {
      window.addEventListener('click', handleClickOutside)
      return () => window.removeEventListener('click', handleClickOutside)
    }
  }, [showChatMenu])

  // Xem thông tin chi tiết hồ sơ đối phương
  const handleOpenPartnerProfile = async () => {
    if (!activeConversation?.partner) return
    const partner = activeConversation.partner
    setPartnerProfileModal({
      ...partner,
      bio: partner.bio || '',
      age_group: partner.age_group || '',
      current_status: partner.current_status || '',
      story: partner.story || '',
      interests: partner.interests || [],
    })
    setLoadingPartnerProfile(true)
    try {
      const fullProfile = await getPublicProfile(partner.id)
      if (fullProfile) {
        setPartnerProfileModal((prev) => ({
          ...prev,
          ...fullProfile,
          display_name: fullProfile.display_name || prev?.display_name,
          avatar_url: fullProfile.avatar_url || prev?.avatar_url,
          bio: fullProfile.bio || prev?.bio,
          age_group: fullProfile.age_group || prev?.age_group,
          current_status: fullProfile.current_status || prev?.current_status,
          story: fullProfile.story || prev?.story,
          interests: fullProfile.interests || prev?.interests,
        }))
      }
    } catch (err) {
      console.warn('Không thể tải profile chi tiết:', err)
    } finally {
      setLoadingPartnerProfile(false)
    }
  }

  // Đóng modal profile khi bấm phím Escape
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape') setPartnerProfileModal(null)
    }
    if (partnerProfileModal) {
      window.addEventListener('keydown', handleEscKey)
    }
    return () => window.removeEventListener('keydown', handleEscKey)
  }, [partnerProfileModal])

  // Hỗ trợ responsive cho mobile
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Refs
  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  // Tự động cuộn xuống tin nhắn mới nhất
  const scrollToBottom = (smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end',
      })
    }
  }

  useEffect(() => {
    scrollToBottom(true)
  }, [messages])

  // 1. Tải danh sách cuộc hội thoại ban đầu
  const loadConversations = async () => {
    setLoadingConversations(true)
    try {
      const data = await getConversations()
      setConversations(data || [])
      return data || []
    } catch (err) {
      console.error('Lỗi tải danh sách hội thoại:', err)
      return []
    } finally {
      setLoadingConversations(false)
    }
  }

  // 2. Xử lý query params hoặc state từ URL (?conversationId=... hoặc state.conversationId)
  useEffect(() => {
    const initChat = async () => {
      const convList = await loadConversations()
      const searchParams = new URLSearchParams(location.search)
      const queryConvId = location.state?.conversationId || searchParams.get('conversationId')
      const queryUserId = location.state?.userId || searchParams.get('userId')

      // Nếu có query param trên URL, chuẩn hóa URL về /messages để đồng nhất
      if (searchParams.get('conversationId') || searchParams.get('userId')) {
        navigate('/messages', {
          replace: true,
          state: {
            conversationId: queryConvId ? parseInt(queryConvId, 10) : undefined,
            userId: queryUserId ? parseInt(queryUserId, 10) : undefined,
          },
        })
      }

      if (queryConvId) {
        const found = convList.find((c) => c.id === parseInt(queryConvId, 10))
        if (found) {
          setActiveConversation(found)
          return
        }
      }

      if (queryUserId) {
        try {
          const conv = await getOrCreateConversation(parseInt(queryUserId, 10))
          setActiveConversation(conv)
          // Cập nhật lại danh sách hội thoại nếu chưa có
          setConversations((prev) => {
            if (!prev.some((c) => c.id === conv.id)) {
              return [conv, ...prev]
            }
            return prev
          })
        } catch (err) {
          console.error('Lỗi mở hội thoại với user:', err)
        }
      }
    }

    initChat()
  }, [location.search, location.state])

  // 3. Quản lý WebSocket và tải tin nhắn khi đổi activeConversation
  useEffect(() => {
    if (!activeConversation) return

    let isMounted = true
    setLoadingMessages(true)
    setWsStatus('connecting')

    // 3.1. Tải lịch sử tin nhắn qua REST
    getMessages(activeConversation.id)
      .then((history) => {
        if (isMounted) {
          setMessages(history || [])
          setTimeout(() => scrollToBottom(false), 50)
          // Đánh dấu đã đọc các thông báo của cuộc hội thoại này và làm mới biểu tượng chuông
          markConversationNotificationsAsRead(activeConversation.id)
            .then(() => {
              window.dispatchEvent(new CustomEvent('notifications-updated'))
            })
            .catch(() => {})
        }
      })
      .catch((err) => {
        console.error('Lỗi tải lịch sử tin nhắn:', err)
      })
      .finally(() => {
        if (isMounted) setLoadingMessages(false)
      })

    // 3.2. Đóng WebSocket cũ nếu đang mở
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }

    // 3.3. Mở kết nối WebSocket mới
    const token = localStorage.getItem('access_token')
    if (!token) {
      setWsStatus('error')
      return
    }

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const wsBaseUrl = apiUrl.replace(/^http/, 'ws')
    const wsUrl = `${wsBaseUrl}/api/ws/chat/${activeConversation.id}?token=${encodeURIComponent(token)}`
    const ws = new WebSocket(wsUrl)
    socketRef.current = ws

    ws.onopen = () => {
      if (isMounted) {
        setWsStatus('connected')
      }
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'message' && data.message) {
          const newMsg = data.message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) {
              return prev
            }
            return [...prev, newMsg]
          })

          // Cập nhật last_message trong danh sách hội thoại bên trái
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id === activeConversation.id) {
                return {
                  ...c,
                  last_message: newMsg,
                }
              }
              return c
            })
          )

          // Tự động xóa thông báo vì đang mở xem cuộc trò chuyện này
          markConversationNotificationsAsRead(activeConversation.id)
            .then(() => {
              window.dispatchEvent(new CustomEvent('notifications-updated'))
            })
            .catch(() => {})
        } else if (data.type === 'user_status') {
          const { user_id, is_online, last_seen } = data
          setActiveConversation((prev) => {
            if (prev && prev.partner && prev.partner.id === user_id) {
              return {
                ...prev,
                partner: {
                  ...prev.partner,
                  is_online,
                  last_seen: last_seen !== undefined ? last_seen : prev.partner.last_seen,
                },
              }
            }
            return prev
          })

          setConversations((prev) =>
            prev.map((c) => {
              if (c.partner && c.partner.id === user_id) {
                return {
                  ...c,
                  partner: {
                    ...c.partner,
                    is_online,
                    last_seen: last_seen !== undefined ? last_seen : c.partner.last_seen,
                  },
                }
              }
              return c
            })
          )
        } else if (data.type && data.type.startsWith('call:')) {
          // Chuyển tiếp tín hiệu gọi WebRTC vào CallContext qua CustomEvent (dự phòng song song đảm bảo không mất gói tin)
          window.dispatchEvent(new CustomEvent('call-signal-received', { detail: data }))

          if (data.type === 'call:end' || data.type === 'call:reject') {
            setTimeout(() => {
              getMessages(activeConversation.id)
                .then((history) => {
                  if (history) setMessages(history)
                })
                .catch(() => {})
            }, 500)
          }
        } else if (data.type === 'error') {
          setToastMessage(data.message || 'Lỗi gửi tin nhắn')
        }
      } catch (err) {
        console.error('Lỗi phân tích tin nhắn WebSocket:', err)
      }
    }

    ws.onclose = () => {
      if (isMounted) {
        setWsStatus('disconnected')
      }
    }

    ws.onerror = (err) => {
      console.error('Lỗi WebSocket:', err)
      if (isMounted) {
        setWsStatus('error')
      }
    }

    // Dọn dẹp khi unmount hoặc đổi activeConversation
    return () => {
      isMounted = false
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }
  }, [activeConversation?.id])

  // 4. Gửi tin nhắn (ưu tiên WebSocket, fallback REST)
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault()
    if (activeConversation?.is_blocked) {
      setToastMessage('Cuộc trò chuyện đã bị chặn, không thể gửi tin nhắn.')
      return
    }
    const content = inputText.trim()
    if (!content || !activeConversation || isSending) return

    setIsSending(true)
    const ws = socketRef.current

    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Gửi qua WebSocket
        ws.send(
          JSON.stringify({
            type: 'message',
            content,
          })
        )
        setInputText('')
      } else {
        // Fallback gửi qua REST API nếu WebSocket bị gián đoạn
        const sentMsg = await sendMessage(activeConversation.id, content)
        setMessages((prev) => [...prev, sentMsg])
        setInputText('')
      }
    } catch (err) {
      console.error('Lỗi khi gửi tin nhắn:', err)
      const detail = err.response?.data?.detail
      setToastMessage(detail || 'Không thể gửi tin nhắn. Vui lòng thử lại.')
    } finally {
      setIsSending(false)
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
  }

  // 5. Mở chặn người dùng
  const handleUnblock = async () => {
    if (!activeConversation?.partner) return
    setUnblocking(true)
    try {
      await reportService.unblockUser(activeConversation.partner.id)
      setActiveConversation((prev) => ({
        ...prev,
        is_blocked: false,
        blocked_by_me: false,
      }))
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, is_blocked: false, blocked_by_me: false }
            : c
        )
      )
      setToastMessage(`Đã bỏ chặn ${activeConversation.partner.display_name || activeConversation.partner.username}`)
    } catch (err) {
      alert(err.response?.data?.detail || 'Không thể bỏ chặn người dùng')
    } finally {
      setUnblocking(false)
    }
  }

  // 6. Xử lý sau khi chặn thành công
  const handleBlockSuccess = (msg) => {
    setActiveConversation((prev) => ({
      ...prev,
      is_blocked: true,
      blocked_by_me: true,
    }))
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? { ...c, is_blocked: true, blocked_by_me: true }
          : c
      )
    )
    setToastMessage(msg)
  }

  // 7. Bắt đầu cuộc gọi (Voice / Video Call qua CallContext toàn cục)
  const handleStartCall = (callType) => {
    if (activeConversation?.is_blocked) {
      setToastMessage('Cuộc hội thoại này đã bị chặn. Không thể thực hiện cuộc gọi.')
      return
    }
    if (!activeConversation?.partner || !activeConversation?.id) {
      setToastMessage('Vui lòng chọn một cuộc trò chuyện để bắt đầu cuộc gọi.')
      return
    }
    startCall(activeConversation.partner, activeConversation.id, callType)
  }

  // Xử lý bấm phím: Enter gửi, Shift+Enter xuống dòng
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  // Lọc danh sách hội thoại theo từ khóa tìm kiếm
  const filteredConversations = conversations.filter((c) => {
    const name = c?.partner?.display_name || c?.partner?.username || ''
    return name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        backgroundColor: '#f7faf8',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Navbar />

      <div
        style={{
          flex: 1,
          minHeight: 0,
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          padding: '16px 16px 20px',
          display: 'flex',
          gap: '20px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* ========================================================= */}
        {/* CỘT TRÁI: DANH SÁCH CUỘC HỘI THOẠI                        */}
        {/* ========================================================= */}
        <div
          style={{
            width: isMobile ? '100%' : '340px',
            height: '100%',
            minHeight: 0,
            display: isMobile && activeConversation ? 'none' : 'flex',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #dce8e2',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header cột trái */}
          <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1a1a2e', margin: 0 }}>
                Đoạn chat 💬
              </h2>
              <button
                type="button"
                onClick={() => navigate('/connections')}
                style={{
                  background: '#e1efe8',
                  border: '1px solid #dce8e2',
                  color: '#245745',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '6px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                }}
              >
                + Bạn bè
              </button>
            </div>

            {/* Ô tìm kiếm */}
            <input
              type="text"
              placeholder="Tìm bạn bè, cuộc trò chuyện..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                backgroundColor: '#f9fafb',
                fontSize: '13px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Danh sách hội thoại */}
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px' }}>
            {loadingConversations ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280', fontSize: '14px' }}>
                Đang tải hội thoại...
              </div>
            ) : filteredConversations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 16px', color: '#6b7280' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✉️</div>
                <p style={{ fontSize: '14px', margin: '0 0 12px 0' }}>Chưa có cuộc hội thoại nào.</p>
                <button
                  type="button"
                  onClick={() => navigate('/connections')}
                  className="btn-primary"
                  style={{ fontSize: '13px', padding: '8px 16px' }}
                >
                  Kết nối bạn bè ngay
                </button>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const partner = conv.partner || { username: 'user', display_name: 'Người dùng' }
                const isActive = activeConversation?.id === conv.id
                const lastMsg = conv.last_message

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConversation(conv)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      backgroundColor: isActive ? '#e1efe8' : 'transparent',
                      border: isActive ? '1px solid #ddd6fe' : '1px solid transparent',
                      marginBottom: '4px',
                    }}
                    onMouseOver={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = '#f3f7f4'
                    }}
                    onMouseOut={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                    }}
                  >
                    <div style={{ position: 'relative', width: '46px', height: '46px', flexShrink: 0 }}>
                      <img
                        src={
                          partner.avatar_url ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(partner.username)}`
                        }
                        alt={partner.display_name || partner.username}
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #245745',
                          backgroundColor: '#f3f4f6',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '0px',
                          right: '0px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: partner.is_online ? '#10b981' : '#d1d5db',
                          border: '2px solid #ffffff',
                          boxShadow: partner.is_online ? '0 0 4px rgba(16, 185, 129, 0.4)' : 'none',
                        }}
                        title={partner.is_online ? 'Đang hoạt động' : 'Offline'}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <h4
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: '#1a1a2e',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {partner.display_name || partner.username}
                        </h4>
                        {lastMsg && (
                          <span style={{ fontSize: '11px', color: '#9ca3af', flexShrink: 0, marginLeft: '6px' }}>
                            {new Date(lastMsg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                        <p
                          style={{
                            fontSize: '12px',
                            color: isActive ? '#6b21a8' : '#6b7280',
                            margin: 0,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {lastMsg ? (
                            <span>
                              {lastMsg.sender_id === user?.id ? 'Bạn: ' : ''}
                              {lastMsg.content}
                            </span>
                          ) : (
                            <span style={{ fontStyle: 'italic' }}>Chưa có tin nhắn nào</span>
                          )}
                        </p>

                        {conv.unread_count > 0 && !isActive && (
                          <span
                            style={{
                              backgroundColor: '#245745',
                              color: '#ffffff',
                              borderRadius: '10px',
                              padding: '1px 6px',
                              fontSize: '11px',
                              fontWeight: 700,
                              marginLeft: '6px',
                              flexShrink: 0,
                            }}
                          >
                            {conv.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* CỘT PHẢI: CỬA SỔ TRÒ CHUYỆN (CHAT WINDOW)                  */}
        {/* ========================================================= */}
        <div
          style={{
            flex: 1,
            height: '100%',
            minHeight: 0,
            width: isMobile ? '100%' : 'auto',
            display: isMobile && !activeConversation ? 'none' : 'flex',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #dce8e2',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {activeConversation ? (
            <>
              {/* Top bar của phòng chat */}
              <div
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid #f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#ffffff',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setActiveConversation(null)}
                      style={{
                        background: '#e1efe8',
                        border: '1px solid #dce8e2',
                        color: '#245745',
                        borderRadius: '8px',
                        padding: '6px 10px',
                        fontWeight: 700,
                        fontSize: '14px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      aria-label="Quay lại danh sách hội thoại"
                    >
                      ←
                    </button>
                  )}
                  {/* Khung thông tin đối phương: hover hoặc nhấp để xem profile */}
                  <div
                    onClick={handleOpenPartnerProfile}
                    onMouseEnter={() => setIsHoveringPartner(true)}
                    onMouseLeave={() => setIsHoveringPartner(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '12px',
                      transition: 'all 0.15s ease',
                      backgroundColor: isHoveringPartner ? '#e1efe8' : 'transparent',
                    }}
                    title="Nhấp để xem hồ sơ cá nhân"
                  >
                    <div style={{ position: 'relative', width: '44px', height: '44px', flexShrink: 0 }}>
                      <img
                        src={
                          activeConversation.partner.avatar_url ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                            activeConversation.partner.username
                          )}`
                        }
                        alt={activeConversation.partner.display_name || activeConversation.partner.username}
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '2px solid #245745',
                          backgroundColor: '#e1efe8',
                          transition: 'transform 0.15s ease',
                          transform: isHoveringPartner ? 'scale(1.06)' : 'scale(1)',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '0px',
                          right: '0px',
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: activeConversation.partner.is_online ? '#10b981' : '#d1d5db',
                          border: '2px solid #ffffff',
                          boxShadow: activeConversation.partner.is_online ? '0 0 4px rgba(16, 185, 129, 0.4)' : 'none',
                        }}
                        title={activeConversation.partner.is_online ? 'Đang hoạt động' : 'Offline'}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3
                          style={{
                            fontSize: '16px',
                            fontWeight: 700,
                            color: isHoveringPartner ? '#245745' : '#1a1a2e',
                            margin: 0,
                            transition: 'color 0.15s ease',
                          }}
                        >
                          {activeConversation.partner.display_name || activeConversation.partner.username}
                        </h3>
                        {/* Nút Xem hồ sơ hiển thị trực quan */}
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            backgroundColor: isHoveringPartner ? '#245745' : '#dce8e2',
                            color: isHoveringPartner ? '#ffffff' : '#245745',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            transition: 'all 0.15s ease',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          👤 Xem hồ sơ
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: activeConversation.partner.is_online ? '#059669' : '#6b7280',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: activeConversation.partner.is_online ? '#10b981' : '#9ca3af',
                              display: 'inline-block',
                            }}
                          />
                          {activeConversation.partner.is_online
                            ? 'Đang hoạt động'
                            : activeConversation.partner.last_seen
                            ? `Hoạt động ${formatTimeAgo(activeConversation.partner.last_seen)}`
                            : 'Offline'}
                        </span>
                        {activeConversation.partner.current_status && (
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                            • {activeConversation.partner.current_status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trạng thái kết nối realtime & Menu tùy chọn */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '9px',
                        height: '9px',
                        borderRadius: '50%',
                        backgroundColor:
                          wsStatus === 'connected'
                            ? '#10b981'
                            : wsStatus === 'connecting'
                            ? '#f59e0b'
                            : '#ef4444',
                        display: 'inline-block',
                        boxShadow: wsStatus === 'connected' ? '0 0 8px #10b981' : 'none',
                      }}
                    />
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                      {wsStatus === 'connected'
                        ? 'Realtime 🟢'
                        : wsStatus === 'connecting'
                        ? 'Đang kết nối...'
                        : 'Ngoại tuyến'}
                    </span>
                  </div>

                  {/* Nút Gọi thoại & Gọi video */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleStartCall('audio')}
                      disabled={activeConversation.is_blocked}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        border: '1px solid #dce8e2',
                        backgroundColor: activeConversation.is_blocked ? '#f3f4f6' : '#e1efe8',
                        color: activeConversation.is_blocked ? '#9ca3af' : '#245745',
                        fontSize: '16px',
                        cursor: activeConversation.is_blocked ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      title={activeConversation.is_blocked ? 'Cuộc hội thoại đã bị chặn' : 'Gọi thoại'}
                      onMouseOver={(e) => {
                        if (!activeConversation.is_blocked) e.currentTarget.style.backgroundColor = '#dce8e2'
                      }}
                      onMouseOut={(e) => {
                        if (!activeConversation.is_blocked) e.currentTarget.style.backgroundColor = '#e1efe8'
                      }}
                    >
                      📞
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartCall('video')}
                      disabled={activeConversation.is_blocked}
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        border: '1px solid #dce8e2',
                        backgroundColor: activeConversation.is_blocked ? '#f3f4f6' : '#e1efe8',
                        color: activeConversation.is_blocked ? '#9ca3af' : '#245745',
                        fontSize: '16px',
                        cursor: activeConversation.is_blocked ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      title={activeConversation.is_blocked ? 'Cuộc hội thoại đã bị chặn' : 'Gọi video'}
                      onMouseOver={(e) => {
                        if (!activeConversation.is_blocked) e.currentTarget.style.backgroundColor = '#dce8e2'
                      }}
                      onMouseOut={(e) => {
                        if (!activeConversation.is_blocked) e.currentTarget.style.backgroundColor = '#e1efe8'
                      }}
                    >
                      📹
                    </button>
                  </div>

                  {/* Menu dấu ba chấm (...) */}
                  <div style={{ position: 'relative' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowChatMenu((prev) => !prev)
                      }}
                      style={{
                        background: 'none',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        width: '32px',
                        height: '32px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        color: '#4b5563',
                        cursor: 'pointer',
                        transition: 'background 0.15s ease',
                      }}
                      title="Tùy chọn cuộc hội thoại"
                    >
                      ⋮
                    </button>

                    {showChatMenu && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: '38px',
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                          border: '1px solid #f3f4f6',
                          minWidth: '170px',
                          zIndex: 100,
                          padding: '6px',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Xem hồ sơ đối phương */}
                        <button
                          type="button"
                          onClick={() => {
                            setShowChatMenu(false)
                            handleOpenPartnerProfile()
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            background: 'none',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#374151',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <span>👤</span>
                          <span>Xem hồ sơ</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowChatMenu(false)
                            setShowReportModal(true)
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 12px',
                            background: 'none',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            color: '#374151',
                            cursor: 'pointer',
                            textAlign: 'left',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <span>🚩</span>
                          <span>Báo cáo vi phạm</span>
                        </button>

                        {activeConversation.is_blocked && activeConversation.blocked_by_me ? (
                          <button
                            type="button"
                            onClick={() => {
                              setShowChatMenu(false)
                              handleUnblock()
                            }}
                            disabled={unblocking}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              background: 'none',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '13px',
                              color: '#059669',
                              cursor: unblocking ? 'not-allowed' : 'pointer',
                              textAlign: 'left',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#ecfdf5')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <span>🔓</span>
                            <span>{unblocking ? 'Đang bỏ chặn...' : 'Bỏ chặn'}</span>
                          </button>
                        ) : !activeConversation.is_blocked ? (
                          <button
                            type="button"
                            onClick={() => {
                              setShowChatMenu(false)
                              setShowBlockModal(true)
                            }}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px 12px',
                              background: 'none',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '13px',
                              color: '#dc2626',
                              cursor: 'pointer',
                              textAlign: 'left',
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <span>🚫</span>
                            <span>Chặn người dùng</span>
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Vùng hiển thị tin nhắn (Message stream - chỉ cuộn độc lập vùng này) */}
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  padding: '20px',
                  overflowY: 'auto',
                  backgroundColor: '#f3f7f4',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {loadingMessages ? (
                  <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280', fontSize: '14px' }}>
                    Đang tải lịch sử tin nhắn...
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', margin: 'auto', color: '#6b7280' }}>
                    <div style={{ fontSize: '44px', marginBottom: '12px' }}>👋</div>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 6px 0' }}>
                      Bắt đầu cuộc trò chuyện!
                    </h4>
                    <p style={{ fontSize: '13px', margin: 0, maxWidth: '300px' }}>
                      Gửi lời chào đầu tiên tới {activeConversation.partner.display_name || activeConversation.partner.username}.
                    </p>
                  </div>
                ) : (
                  messages.map((m, idx) => {
                    const isCallLog = m.content && (m.content.startsWith('📞') || m.content.startsWith('📹'))
                    if (isCallLog) {
                      return (
                        <div
                          key={m.id || idx}
                          style={{
                            alignSelf: 'center',
                            margin: '6px 0',
                            textAlign: 'center',
                          }}
                        >
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 14px',
                              borderRadius: '20px',
                              backgroundColor: '#f1f5f9',
                              color: '#475569',
                              fontSize: '12px',
                              fontWeight: 600,
                              border: '1px solid #e2e8f0',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                            }}
                          >
                            <span>{m.content}</span>
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                              • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      )
                    }

                    const isMe = m.sender_id === user?.id
                    return (
                      <div
                        key={m.id || idx}
                        style={{
                          display: 'flex',
                          flexDirection: isMe ? 'row-reverse' : 'row',
                          alignItems: 'flex-end',
                          gap: '8px',
                          maxWidth: '75%',
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                        }}
                      >
                        {!isMe && (
                          <img
                            src={
                              activeConversation.partner.avatar_url ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                                activeConversation.partner.username
                              )}`
                            }
                            alt="Avatar"
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              marginBottom: '4px',
                              backgroundColor: '#ffffff',
                              border: '1px solid #dce8e2',
                            }}
                          />
                        )}

                        <div
                          style={{
                            backgroundColor: isMe ? '#245745' : '#ffffff',
                            color: isMe ? '#ffffff' : '#1a1a2e',
                            padding: '10px 14px',
                            borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            boxShadow: isMe
                              ? '0 2px 8px rgba(36, 87, 69, 0.25)'
                              : '0 2px 8px rgba(0, 0, 0, 0.04)',
                            border: isMe ? 'none' : '1px solid #dce8e2',
                            wordBreak: 'break-word',
                          }}
                        >
                          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.45', whiteSpace: 'pre-wrap' }}>
                            {m.content}
                          </p>
                          <div
                            style={{
                              fontSize: '10px',
                              marginTop: '4px',
                              textAlign: 'right',
                              color: isMe ? 'rgba(255,255,255,0.75)' : '#9ca3af',
                            }}
                          >
                            {new Date(m.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                            {isMe && m.read_at && (
                              <div
                                style={{
                                  marginTop: '2px',
                                  color: 'rgba(255,255,255,0.9)',
                                  fontWeight: 600,
                                }}
                              >
                                Đã đọc lúc{' '}
                                {new Date(m.read_at).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Khung nhập tin nhắn HOẶC Thông báo đã bị chặn */}
              {activeConversation.is_blocked ? (
                <div
                  style={{
                    padding: '16px 20px',
                    backgroundColor: '#fef2f2',
                    borderTop: '1px solid #fee2e2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991b1b', fontSize: '13px' }}>
                    <span style={{ fontSize: '18px' }}>🔒</span>
                    <span>
                      {activeConversation.blocked_by_me
                        ? 'Bạn đã chặn người dùng này. Cuộc trò chuyện đã bị vô hiệu hóa.'
                        : 'Cuộc trò chuyện này đã bị chặn. Bạn không thể gửi tin nhắn mới.'}
                    </span>
                  </div>
                  {activeConversation.blocked_by_me && (
                    <button
                      type="button"
                      onClick={handleUnblock}
                      disabled={unblocking}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #ef4444',
                        color: '#ef4444',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: unblocking ? 'not-allowed' : 'pointer',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      {unblocking ? 'Đang bỏ chặn...' : 'Bỏ chặn'}
                    </button>
                  )}
                </div>
              ) : (
                <form
                  onSubmit={handleSendMessage}
                  style={{
                    padding: '14px 20px',
                    backgroundColor: '#ffffff',
                    borderTop: '1px solid #f3f4f6',
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Nhập tin nhắn... (Enter để gửi, Shift+Enter xuống dòng)"
                    rows={1}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '12px',
                      border: '1px solid #d1d5db',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'none',
                      maxHeight: '100px',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                    }}
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    style={{
                      backgroundColor: '#245745',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '10px 18px',
                      fontWeight: 600,
                      fontSize: '14px',
                      cursor: !inputText.trim() || isSending ? 'not-allowed' : 'pointer',
                      opacity: !inputText.trim() || isSending ? 0.5 : 1,
                      boxShadow: '0 2px 8px rgba(36, 87, 69, 0.3)',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isSending ? 'Đang gửi...' : 'Gửi 🚀'}
                  </button>
                </form>
              )}
            </>
          ) : (
            // Empty state khi chưa chọn cuộc hội thoại nào
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                textAlign: 'center',
                color: '#6b7280',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  backgroundColor: '#e1efe8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '36px',
                  marginBottom: '16px',
                }}
              >
                💬
              </div>
              <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1a1a2e', marginBottom: '8px' }}>
                Hộp thư tin nhắn La Pulga
              </h3>
              <p style={{ fontSize: '14px', maxWidth: '380px', margin: '0 0 20px 0', lineHeight: '1.5' }}>
                Chọn một người bạn ở danh sách bên trái hoặc ghé thăm trang Kết nối để bắt đầu trò chuyện realtime ngay!
              </p>
              <button
                type="button"
                onClick={() => navigate('/connections')}
                className="btn-primary"
                style={{ fontSize: '14px', padding: '10px 20px' }}
              >
                Xem danh sách bạn bè 🤝
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast thông báo */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#1f2937',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 1200,
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>ℹ️</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal Báo cáo vi phạm */}
      {showReportModal && activeConversation?.partner && (
        <ReportModal
          targetUser={activeConversation.partner}
          onClose={() => setShowReportModal(false)}
          onSuccess={(msg) => setToastMessage(msg)}
        />
      )}

      {/* Modal Xác nhận chặn */}
      {showBlockModal && activeConversation?.partner && (
        <BlockConfirmModal
          targetUser={activeConversation.partner}
          onClose={() => setShowBlockModal(false)}
          onSuccess={handleBlockSuccess}
        />
      )}


      {/* Modal Xem Hồ Sơ Người Dùng */}
      {partnerProfileModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
            animation: 'fadeIn 0.2s ease-in-out',
          }}
          onClick={() => setPartnerProfileModal(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng */}
            <button
              type="button"
              onClick={() => setPartnerProfileModal(null)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'none',
                border: 'none',
                fontSize: '22px',
                color: '#9ca3af',
                cursor: 'pointer',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f3f4f6')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              title="Đóng (Esc)"
            >
              ✕
            </button>

            {/* Header: Avatar & Tên */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  border: '2px solid #245745',
                  backgroundColor: '#e1efe8',
                  overflow: 'hidden',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={
                    partnerProfileModal.avatar_url ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                      partnerProfileModal.username
                    )}`
                  }
                  alt={partnerProfileModal.display_name || partnerProfileModal.username}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1a1a2e', margin: '0 0 4px 0' }}>
                  {partnerProfileModal.display_name || partnerProfileModal.username}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', color: '#6b7280' }}>@{partnerProfileModal.username}</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: partnerProfileModal.is_online ? '#ecfdf5' : '#f3f4f6',
                      color: partnerProfileModal.is_online ? '#059669' : '#6b7280',
                    }}
                  >
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: partnerProfileModal.is_online ? '#10b981' : '#9ca3af',
                      }}
                    />
                    {partnerProfileModal.is_online ? 'Đang online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>

            {loadingPartnerProfile && (
              <div style={{ fontSize: '12px', color: '#245745', marginBottom: '12px', fontStyle: 'italic' }}>
                Đang tải chi tiết hồ sơ...
              </div>
            )}

            {/* Thông tin cơ bản: Tuổi & Hoàn cảnh */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
              {partnerProfileModal.age_group && (
                <span
                  style={{
                    backgroundColor: '#e1efe8',
                    color: '#245745',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  🎂 {partnerProfileModal.age_group}
                </span>
              )}
              {partnerProfileModal.current_status && (
                <span
                  style={{
                    backgroundColor: '#dce8e2',
                    color: '#6b21a8',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  💼 {partnerProfileModal.current_status}
                </span>
              )}
            </div>

            {/* Giới thiệu bản thân (Bio) */}
            <div style={{ marginBottom: '18px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Giới thiệu
              </h4>
              <p
                style={{
                  fontSize: '14px',
                  color: '#4b5563',
                  lineHeight: '1.6',
                  backgroundColor: '#f3f7f4',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  margin: 0,
                }}
              >
                {partnerProfileModal.bio || 'Chưa cập nhật tiểu sử giới thiệu.'}
              </p>
            </div>

            {/* Câu chuyện cá nhân (Story) nếu có */}
            {partnerProfileModal.story && (
              <div style={{ marginBottom: '18px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Câu chuyện chia sẻ
                </h4>
                <p
                  style={{
                    fontSize: '13.5px',
                    color: '#4b5563',
                    lineHeight: '1.6',
                    backgroundColor: '#f9fafb',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    margin: 0,
                    fontStyle: 'italic',
                  }}
                >
                  "{partnerProfileModal.story}"
                </p>
              </div>
            )}

            {/* Sở thích / Chủ đề quan tâm */}
            {Array.isArray(partnerProfileModal.interests) && partnerProfileModal.interests.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Sở thích & Chủ đề
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {partnerProfileModal.interests.map((it, idx) => (
                    <span
                      key={idx}
                      style={{
                        fontSize: '12px',
                        backgroundColor: '#f3f4f6',
                        color: '#4b5563',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontWeight: 500,
                      }}
                    >
                      #{it}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Nút hành động */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
              <button
                type="button"
                onClick={() => setPartnerProfileModal(null)}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: '#f9fafb',
                  color: '#4b5563',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>

              {!activeConversation?.is_blocked && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setPartnerProfileModal(null)
                      handleStartCall('audio')
                    }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: '1px solid #dce8e2',
                      backgroundColor: '#e1efe8',
                      color: '#245745',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    📞 Gọi thoại
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPartnerProfileModal(null)
                      handleStartCall('video')
                    }}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#245745',
                      color: '#ffffff',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 8px rgba(36, 87, 69, 0.3)',
                    }}
                  >
                    📹 Gọi video
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
