import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
} from '../services/chatService'

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

  // 2. Xử lý query params từ URL (?conversationId=... hoặc ?userId=...)
  useEffect(() => {
    const initChat = async () => {
      const convList = await loadConversations()
      const searchParams = new URLSearchParams(location.search)
      const queryConvId = searchParams.get('conversationId')
      const queryUserId = searchParams.get('userId')

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
  }, [location.search])

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

    const wsUrl = `ws://localhost:8000/api/ws/chat/${activeConversation.id}?token=${encodeURIComponent(token)}`
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
      alert('Không thể gửi tin nhắn. Vui lòng thử lại.')
    } finally {
      setIsSending(false)
      if (textareaRef.current) {
        textareaRef.current.focus()
      }
    }
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
    const name = c.partner.display_name || c.partner.username || ''
    return name.toLowerCase().includes(searchTerm.toLowerCase())
  })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f7ff', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <div
        style={{
          flex: 1,
          maxWidth: '1200px',
          width: '100%',
          margin: '0 auto',
          padding: '20px 16px',
          display: 'flex',
          gap: '20px',
          height: 'calc(100vh - 84px)',
          boxSizing: 'border-box',
        }}
      >
        {/* ========================================================= */}
        {/* CỘT TRÁI: DANH SÁCH CUỘC HỘI THOẠI                        */}
        {/* ========================================================= */}
        <div
          style={{
            width: isMobile ? '100%' : '340px',
            display: isMobile && activeConversation ? 'none' : 'flex',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #ede9fe',
            boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header cột trái */}
          <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1a1a2e', margin: 0 }}>
                Đoạn chat 💬
              </h2>
              <button
                type="button"
                onClick={() => navigate('/connections')}
                style={{
                  background: '#f5f0ff',
                  border: '1px solid #ede9fe',
                  color: '#7c5cbf',
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
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
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
                const partner = conv.partner
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
                      backgroundColor: isActive ? '#f5f0ff' : 'transparent',
                      border: isActive ? '1px solid #ddd6fe' : '1px solid transparent',
                      marginBottom: '4px',
                    }}
                    onMouseOver={(e) => {
                      if (!isActive) e.currentTarget.style.backgroundColor = '#faf9fe'
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
                          border: '2px solid #7c5cbf',
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
                              backgroundColor: '#7c5cbf',
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
            width: isMobile ? '100%' : 'auto',
            display: isMobile && !activeConversation ? 'none' : 'flex',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #ede9fe',
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
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setActiveConversation(null)}
                      style={{
                        background: '#f5f0ff',
                        border: '1px solid #ede9fe',
                        color: '#7c5cbf',
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
                        border: '2px solid #7c5cbf',
                        backgroundColor: '#f5f0ff',
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
                    <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
                      {activeConversation.partner.display_name || activeConversation.partner.username}
                    </h3>
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

                {/* Trạng thái kết nối realtime */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              </div>

              {/* Vùng hiển thị tin nhắn (Message stream) */}
              <div
                style={{
                  flex: 1,
                  padding: '20px',
                  overflowY: 'auto',
                  backgroundColor: '#faf9fe',
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
                              border: '1px solid #ede9fe',
                            }}
                          />
                        )}

                        <div
                          style={{
                            backgroundColor: isMe ? '#7c5cbf' : '#ffffff',
                            color: isMe ? '#ffffff' : '#1a1a2e',
                            padding: '10px 14px',
                            borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            boxShadow: isMe
                              ? '0 2px 8px rgba(124, 92, 191, 0.25)'
                              : '0 2px 8px rgba(0, 0, 0, 0.04)',
                            border: isMe ? 'none' : '1px solid #ede9fe',
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
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Khung nhập tin nhắn */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: '14px 20px',
                  backgroundColor: '#ffffff',
                  borderTop: '1px solid #f3f4f6',
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center',
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
                    backgroundColor: '#7c5cbf',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '10px 18px',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: !inputText.trim() || isSending ? 'not-allowed' : 'pointer',
                    opacity: !inputText.trim() || isSending ? 0.5 : 1,
                    boxShadow: '0 2px 8px rgba(124, 92, 191, 0.3)',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isSending ? 'Đang gửi...' : 'Gửi 🚀'}
                </button>
              </form>
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
                  backgroundColor: '#f5f0ff',
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
                Hộp thư tin nhắn Kindred
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
    </div>
  )
}

