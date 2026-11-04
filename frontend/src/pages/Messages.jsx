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
  if (diffInMinutes < 60) return `${diffInMinutes}p`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours}h`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays}d`
  return date.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' })
}

export default function Messages() {
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  // Conversations
  const [conversations, setConversations] = useState([])
  const [activeConversation, setActiveConversation] = useState(null)
  const [loadingConversations, setLoadingConversations] = useState(true)

  // Messages
  const [messages, setMessages] = useState([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)

  // WebSocket status: 'connecting' | 'connected' | 'disconnected' | 'error'
  const [wsStatus, setWsStatus] = useState('disconnected')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false)

  // Modals
  const [showReportModal, setShowReportModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [showChatMenu, setShowChatMenu] = useState(false)
  const [unblocking, setUnblocking] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  // Partner profile modal
  const [partnerProfileModal, setPartnerProfileModal] = useState(null)
  const [loadingPartnerProfile, setLoadingPartnerProfile] = useState(false)

  // CallContext hook
  const { startCall } = useCall()

  // Mobile drawer toggle
  const [isMobileListOpen, setIsMobileListOpen] = useState(false)

  const socketRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 4000)
  }

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

  // Load conversations
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

  // Handle query params
  useEffect(() => {
    const initChat = async () => {
      const convList = await loadConversations()
      const searchParams = new URLSearchParams(location.search)
      const queryConvId = location.state?.conversationId || searchParams.get('conversationId')
      const queryUserId = location.state?.userId || searchParams.get('userId') || searchParams.get('user')
      const queryCall = searchParams.get('call')

      if (queryConvId) {
        const found = convList.find((c) => c.id === parseInt(queryConvId, 10))
        if (found) {
          setActiveConversation(found)
          if (queryCall && found.partner) {
            startCall(found.partner, queryCall === 'video')
          }
          return
        }
      }

      if (queryUserId) {
        try {
          const conv = await getOrCreateConversation(parseInt(queryUserId, 10))
          setActiveConversation(conv)
          setConversations((prev) => {
            if (!prev.some((c) => c.id === conv.id)) {
              return [conv, ...prev]
            }
            return prev
          })
          if (queryCall && conv.partner) {
            startCall(conv.partner, queryCall === 'video')
          }
        } catch (err) {
          console.error('Lỗi mở hội thoại với user:', err)
        }
      } else if (convList.length > 0 && !activeConversation) {
        setActiveConversation(convList[0])
      }
    }

    initChat()
  }, [location.search, location.state])

  // WebSocket & Messages
  useEffect(() => {
    if (!activeConversation) return

    let isMounted = true
    setLoadingMessages(true)
    setWsStatus('connecting')

    getMessages(activeConversation.id)
      .then((history) => {
        if (isMounted) {
          setMessages(history || [])
          setTimeout(() => scrollToBottom(false), 50)
          markConversationNotificationsAsRead(activeConversation.id)
            .then(() => window.dispatchEvent(new CustomEvent('notifications-updated')))
            .catch(() => {})
        }
      })
      .catch((err) => console.error('Lỗi tải tin nhắn:', err))
      .finally(() => {
        if (isMounted) setLoadingMessages(false)
      })

    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }

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
      if (isMounted) setWsStatus('connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'message' && data.message) {
          const newMsg = data.message
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })
          setConversations((prev) =>
            prev.map((c) => (c.id === activeConversation.id ? { ...c, last_message: newMsg } : c))
          )
          markConversationNotificationsAsRead(activeConversation.id)
            .then(() => window.dispatchEvent(new CustomEvent('notifications-updated')))
            .catch(() => {})
        } else if (data.type === 'user_status') {
          const { user_id, is_online, last_seen } = data
          setActiveConversation((prev) => {
            if (prev?.partner?.id === user_id) {
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
        } else if (data.type && data.type.startsWith('call:')) {
          window.dispatchEvent(new CustomEvent('call-signal-received', { detail: data }))
        } else if (data.type === 'error') {
          showToast(data.message || 'Lỗi tin nhắn')
        }
      } catch (err) {
        console.error('Lỗi websocket:', err)
      }
    }

    ws.onclose = () => {
      if (isMounted) setWsStatus('disconnected')
    }
    ws.onerror = () => {
      if (isMounted) setWsStatus('error')
    }

    return () => {
      isMounted = false
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
    }
  }, [activeConversation?.id])

  // Send message
  const handleSendMessage = async (e) => {
    if (e) e.preventDefault()
    if (activeConversation?.is_blocked) {
      showToast('Cuộc trò chuyện đã bị chặn, không thể gửi tin nhắn.')
      return
    }
    const content = inputText.trim()
    if (!content || !activeConversation || isSending) return

    setIsSending(true)
    const ws = socketRef.current

    try {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'message', content }))
        setInputText('')
      } else {
        const sentMsg = await sendMessage(activeConversation.id, content)
        setMessages((prev) => [...prev, sentMsg])
        setInputText('')
      }
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err)
      showToast('Không thể gửi tin nhắn. Vui lòng thử lại.')
    } finally {
      setIsSending(false)
      inputRef.current?.focus()
    }
  }

  // Unblock
  const handleUnblock = async () => {
    if (!activeConversation?.partner) return
    setUnblocking(true)
    try {
      await reportService.unblockUser(activeConversation.partner.id)
      setActiveConversation((prev) => ({
        ...prev,
        is_blocked: false,
        blocked_by: null,
      }))
      showToast(`Đã mở chặn @${activeConversation.partner.username}`)
    } catch (err) {
      showToast('Không thể mở chặn.')
    } finally {
      setUnblocking(false)
    }
  }

  // Open partner profile modal
  const handleOpenPartnerProfile = async () => {
    if (!activeConversation?.partner) return
    const partner = activeConversation.partner
    setPartnerProfileModal(partner)
    setLoadingPartnerProfile(true)
    try {
      const fullProfile = await getPublicProfile(partner.id)
      if (fullProfile) {
        setPartnerProfileModal((prev) => ({ ...prev, ...fullProfile }))
      }
    } catch (err) {
      console.warn('Không thể tải profile chi tiết:', err)
    } finally {
      setLoadingPartnerProfile(false)
    }
  }

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const p = c.partner
    if (!p) return false
    const matchSearch =
      !searchTerm.trim() ||
      (p.display_name && p.display_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.username && p.username.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchSearch
  })

  const partner = activeConversation?.partner
  const partnerAvatar =
    partner?.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(partner?.username || 'user')}`

  return (
    <div className="bg-[#08090a] min-h-screen text-[#e3e2e3] font-sans antialiased selection:bg-[#00ff88] selection:text-[#00210c] flex flex-col justify-between">
      <Navbar />

      <main className="w-full pt-20 flex-1 flex flex-col">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-24 right-6 z-50 animate-bounce">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#00ff88]/50 bg-[#11151c]/95 text-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.3)] backdrop-blur-md">
              <span className="material-symbols-outlined text-[20px]">info</span>
              <span className="text-sm font-medium">{toastMessage}</span>
            </div>
          </div>
        )}

        <div className="max-w-[1440px] w-full mx-auto px-2 sm:px-6 py-4 flex-1 flex flex-col">
          {/* Main Messages & WebRTC Workspace Canvas */}
          <div className="relative w-full h-[calc(100vh-7.5rem)] flex flex-col overflow-hidden rounded-2xl bg-[#0d0e0f] border border-[#1a232e] shadow-2xl">
            {/* Tactical Subheader Strip */}
            <div className="h-10 px-4 bg-[#11151c] border-b border-[#1a232e] flex items-center justify-between shrink-0 select-none text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#181d26] text-[#00ff88] border border-[#00ff88]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse shadow-[0_0_8px_#00ff88]"></span>
                  <span>E2EE PROTOCOL ACTIVE</span>
                </span>
                <span className="text-[#849585] hidden sm:inline">NODES: SG-04 • STATUS: {wsStatus}</span>
              </div>
              <div className="flex items-center gap-4 text-[#849585]">
                <span className="flex items-center gap-1 text-[#00ff88]">
                  <span className="material-symbols-outlined text-[14px]">lock</span>
                  WebRTC AES-256
                </span>
                <span className="hidden md:inline text-[#4edea3]">PEER_SYNC_OK</span>
              </div>
            </div>

            {/* Main Workspace Split Pane */}
            <div className="flex-1 flex overflow-hidden relative">
              {/* LEFT SIDEBAR: Conversations List (~360px) */}
              <aside
                className={`w-full md:w-[360px] lg:w-[380px] shrink-0 flex flex-col bg-[#11151c] border-r border-[#1a232e] z-10 transition-all ${
                  isMobileListOpen ? 'block absolute inset-0 z-20' : 'hidden md:flex'
                }`}
              >
                {/* Header */}
                <div className="p-4 pb-3 flex flex-col gap-3 border-b border-[#1a232e]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-[#f1ffef]">Tin nhắn</h2>
                      <span className="px-2 py-0.5 rounded-full bg-[#181d26] text-[11px] font-mono text-[#00ff88]">
                        {conversations.length}
                      </span>
                    </div>

                    {isMobileListOpen && (
                      <button
                        type="button"
                        onClick={() => setIsMobileListOpen(false)}
                        className="md:hidden p-1.5 rounded-lg bg-[#181d26] text-[#b9cbb9]"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    )}
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#849585] text-[18px] pointer-events-none">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tìm kiếm cuộc trò chuyện..."
                      className="w-full h-9 pl-9 pr-3 bg-[#08090a] text-[#f1ffef] placeholder:text-[#849585] text-xs rounded-lg outline-none border border-[#1a232e] focus:border-[#00ff88]/50 transition-all"
                    />
                  </div>
                </div>

                {/* Conversations Scrollable Area */}
                <div className="flex-1 overflow-y-auto space-y-1 p-2">
                  {loadingConversations ? (
                    <div className="py-10 text-center text-[#849585] text-xs font-mono">
                      Đang tải hội thoại...
                    </div>
                  ) : filteredConversations.length > 0 ? (
                    filteredConversations.map((c) => {
                      const p = c.partner || {}
                      const isActive = activeConversation?.id === c.id
                      const avatar =
                        p.avatar_url ||
                        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                          p.username || 'user'
                        )}`

                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setActiveConversation(c)
                            setIsMobileListOpen(false)
                          }}
                          className={`group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                            isActive
                              ? 'bg-[#181d26] border border-[#00ff88]/30 shadow-[0_0_12px_rgba(0,255,136,0.1)]'
                              : 'hover:bg-[#181d26]/60 border border-transparent'
                          }`}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-2 bottom-2 w-1 bg-[#00ff88] rounded-r-full shadow-[0_0_10px_#00ff88]"></div>
                          )}

                          <div className="relative shrink-0">
                            <img
                              src={avatar}
                              alt={p.username}
                              className="w-11 h-11 rounded-xl object-cover border border-[#1a232e] bg-[#08090a]"
                              onError={(e) => {
                                e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                                  p.username || 'user'
                                )}`
                              }}
                            />
                            {p.is_online && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]"></span>
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-xs md:text-sm font-bold text-[#f1ffef] truncate group-hover:text-[#00ff88] transition-colors">
                                {p.display_name || p.username}
                              </span>
                              <span className="text-[10px] font-mono text-[#849585]">
                                {formatTimeAgo(c.last_message?.created_at || c.updated_at)}
                              </span>
                            </div>
                            <p className="text-xs text-[#849585] truncate font-medium">
                              {c.last_message?.content || 'Chưa có tin nhắn'}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="py-12 text-center text-[#849585] text-xs font-mono">
                      Không tìm thấy cuộc trò chuyện nào.
                    </div>
                  )}
                </div>
              </aside>

              {/* RIGHT MAIN CHAT AREA */}
              {activeConversation ? (
                <div className="flex-1 flex flex-col bg-[#08090a] overflow-hidden">
                  {/* Chat Header */}
                  <div className="h-16 px-4 border-b border-[#1a232e] bg-[#11151c] flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setIsMobileListOpen(true)}
                        className="md:hidden p-2 rounded-lg bg-[#181d26] text-[#b9cbb9]"
                      >
                        <span className="material-symbols-outlined text-[18px]">menu</span>
                      </button>

                      <div
                        className="relative cursor-pointer"
                        onClick={handleOpenPartnerProfile}
                        title="Xem hồ sơ chi tiết"
                      >
                        <img
                          src={partnerAvatar}
                          alt={partner?.username}
                          className="w-10 h-10 rounded-xl object-cover border border-[#00ff88]/30 bg-[#08090a]"
                        />
                        {partner?.is_online && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#00ff88] shadow-[0_0_6px_#00ff88]"></span>
                        )}
                      </div>

                      <div onClick={handleOpenPartnerProfile} className="cursor-pointer">
                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm font-bold text-[#f1ffef] hover:text-[#00ff88] transition-colors">
                            {partner?.display_name || partner?.username}
                          </h3>
                          <span
                            className="material-symbols-outlined text-[#00ff88] text-[16px]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            verified
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#849585]">
                          <span>@{partner?.username}</span>
                          <span>•</span>
                          <span className={partner?.is_online ? 'text-[#00ff88]' : 'text-[#849585]'}>
                            {partner?.is_online ? 'Đang trực tuyến' : 'Ngoại tuyến'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Calling & Menu Controls */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startCall(partner, false)}
                        className="h-9 px-3 rounded-xl bg-[#181d26] hover:bg-[#1f2021] text-[#00ff88] border border-[#00ff88]/20 flex items-center gap-1.5 text-xs font-mono transition-all cursor-pointer shadow-[0_0_10px_rgba(0,255,136,0.15)]"
                        title="Gọi thoại WebRTC HD"
                      >
                        <span className="material-symbols-outlined text-[18px]">call</span>
                        <span className="hidden sm:inline">Gọi thoại</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => startCall(partner, true)}
                        className="h-9 px-3 rounded-xl bg-[#181d26] hover:bg-[#1f2021] text-[#44fb8a] border border-[#44fb8a]/20 flex items-center gap-1.5 text-xs font-mono transition-all cursor-pointer shadow-[0_0_10px_rgba(68,251,138,0.15)]"
                        title="Gọi Video WebRTC HD"
                      >
                        <span className="material-symbols-outlined text-[18px]">videocam</span>
                        <span className="hidden sm:inline">Video Call</span>
                      </button>

                      {/* Dropdown Menu */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowChatMenu(!showChatMenu)
                          }}
                          className="w-9 h-9 rounded-xl bg-[#181d26] hover:bg-[#1f2021] text-[#849585] hover:text-[#f1ffef] flex items-center justify-center transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[18px]">more_vert</span>
                        </button>

                        {showChatMenu && (
                          <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-[#11151c] border border-[#1a232e] shadow-2xl p-1 z-30 animate-fadeIn">
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenPartnerProfile()
                                setShowChatMenu(false)
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#b9cbb9] hover:text-[#f1ffef] hover:bg-[#181d26] flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[16px]">person</span>
                              <span>Xem hồ sơ</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setShowReportModal(true)
                                setShowChatMenu(false)
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs text-amber-400 hover:bg-amber-500/15 flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[16px]">flag</span>
                              <span>Báo cáo vi phạm</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setShowBlockModal(true)
                                setShowChatMenu(false)
                              }}
                              className="w-full text-left px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/15 flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[16px]">block</span>
                              <span>Chặn người dùng</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Messages Stream */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {/* E2EE Info banner */}
                    <div className="max-w-md mx-auto py-2 px-4 rounded-xl bg-[#11151c]/70 border border-[#1a232e] text-center text-[11px] font-mono text-[#849585]">
                      🔒 Mọi tin nhắn và cuộc gọi đều được mã hóa đầu cuối với giao thức E2EE của
                      lapulga.
                    </div>

                    {loadingMessages ? (
                      <div className="py-20 text-center text-[#849585] text-xs font-mono">
                        Đang đồng bộ tin nhắn bảo mật...
                      </div>
                    ) : messages.length > 0 ? (
                      messages.map((msg) => {
                        const isMe = msg.sender_id === user?.id
                        return (
                          <div
                            key={msg.id}
                            className={`flex items-start gap-2.5 max-w-2xl ${
                              isMe ? 'ml-auto flex-row-reverse' : ''
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold ${
                                isMe
                                  ? 'bg-[#00ff88] text-[#00210c] shadow-[0_0_10px_#00ff88]'
                                  : 'bg-[#181d26] text-[#00ff88] border border-[#00ff88]/30'
                              }`}
                            >
                              {isMe ? 'ME' : partner?.username?.slice(0, 2).toUpperCase() || 'U'}
                            </div>

                            <div className={`flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                              <div
                                className={`p-3.5 rounded-2xl text-xs md:text-sm leading-relaxed max-w-md whitespace-pre-wrap break-words ${
                                  isMe
                                    ? 'bg-[#181d26] text-[#f1ffef] border border-[#00ff88]/30 rounded-tr-sm shadow-[0_0_12px_rgba(0,255,136,0.1)]'
                                    : 'bg-[#11151c] text-[#e3e2e3] border border-[#1a232e] rounded-tl-sm'
                                }`}
                              >
                                {msg.content}
                              </div>
                              <div className="flex items-center gap-1.5 px-1 text-[10px] font-mono text-[#849585]">
                                <span>{formatTimeAgo(msg.created_at)}</span>
                                {isMe && (
                                  <span className="material-symbols-outlined text-[14px] text-[#00ff88]">
                                    done_all
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="py-16 text-center text-xs text-[#849585] font-mono">
                        Bắt đầu cuộc trò chuyện với {partner?.display_name || partner?.username}!
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Chat Input Dock */}
                  <div className="p-3 sm:p-4 bg-[#11151c] border-t border-[#1a232e]">
                    {activeConversation.is_blocked ? (
                      <div className="p-3 rounded-xl bg-[#08090a] border border-red-500/30 flex items-center justify-between">
                        <span className="text-xs text-red-400">
                          Cuộc trò chuyện này đang bị chặn.
                        </span>
                        <button
                          type="button"
                          onClick={handleUnblock}
                          disabled={unblocking}
                          className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30 transition-all cursor-pointer"
                        >
                          {unblocking ? 'Đang mở...' : 'Mở chặn'}
                        </button>
                      </div>
                    ) : (
                      <form onSubmit={handleSendMessage} className="space-y-1.5">
                        <div className="flex items-center gap-2 p-1.5 bg-[#08090a] rounded-2xl border border-[#1a232e] focus-within:border-[#00ff88]/50 focus-within:shadow-[0_0_16px_rgba(0,255,136,0.15)] transition-all">
                          <input
                            ref={inputRef}
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Nhập tin nhắn bảo mật... (nhấn Enter để gửi)"
                            className="flex-1 bg-transparent px-3 py-2 text-[#f1ffef] placeholder:text-[#849585] text-xs md:text-sm outline-none min-w-0"
                          />

                          <button
                            type="submit"
                            disabled={!inputText.trim() || isSending}
                            className="w-10 h-10 rounded-xl bg-[#00ff88] hover:bg-[#44fb8a] text-[#00210c] flex items-center justify-center font-bold shadow-[0_0_16px_rgba(0,255,136,0.4)] hover:shadow-[0_0_24px_rgba(0,255,136,0.6)] active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                          >
                            <span className="material-symbols-outlined text-[19px]">send</span>
                          </button>
                        </div>
                        <div className="flex items-center justify-between px-2 text-[10px] font-mono text-[#849585]">
                          <span>E2EE Active</span>
                          <span>Enter để gửi • WebRTC AES-256</span>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#849585]">
                  <span className="material-symbols-outlined text-[48px] text-[#00ff88] mb-3">
                    chat
                  </span>
                  <h3 className="text-base font-bold text-[#f1ffef]">Chọn một cuộc hội thoại</h3>
                  <p className="text-xs max-w-xs mt-1">
                    Chọn bạn bè từ danh sách bên trái hoặc ghé thăm mục Khám phá để bắt đầu kết nối.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Partner Profile Modal */}
      {partnerProfileModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={() => setPartnerProfileModal(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#11151c] border border-[#1a232e] p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#1a232e]">
              <h3 className="text-base font-bold text-[#f1ffef]">Hồ sơ người dùng</h3>
              <button
                type="button"
                onClick={() => setPartnerProfileModal(null)}
                className="p-1 rounded-lg hover:bg-[#181d26] text-[#849585] hover:text-[#f1ffef]"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              <img
                src={
                  partnerProfileModal.avatar_url ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                    partnerProfileModal.username || 'user'
                  )}`
                }
                alt=""
                className="w-16 h-16 rounded-xl object-cover border border-[#00ff88]/30 bg-[#08090a]"
              />
              <div>
                <h4 className="text-base font-bold text-[#f1ffef]">
                  {partnerProfileModal.display_name || partnerProfileModal.username}
                </h4>
                <p className="text-xs font-mono text-[#00ff88]">@{partnerProfileModal.username}</p>
                <p className="text-xs text-[#849585] mt-0.5">
                  {partnerProfileModal.current_status || 'Thành viên'} •{' '}
                  {partnerProfileModal.age_group || '21-25 tuổi'}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#08090a] border border-[#1a232e] text-xs italic text-[#e3e2e3]">
              “{partnerProfileModal.bio || 'Chưa cập nhật tiểu sử cá nhân.'}”
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setPartnerProfileModal(null)}
                className="px-4 py-2 rounded-xl bg-[#181d26] hover:bg-[#1f2021] text-xs font-semibold text-[#f1ffef]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && partner && (
        <ReportModal
          targetUser={partner}
          onClose={() => setShowReportModal(false)}
          onSuccess={(msg) => {
            showToast(msg)
            setShowReportModal(false)
          }}
        />
      )}

      {/* Block Modal */}
      {showBlockModal && partner && (
        <BlockConfirmModal
          targetUser={partner}
          onClose={() => setShowBlockModal(false)}
          onSuccess={(msg) => {
            setActiveConversation((prev) => ({
              ...prev,
              is_blocked: true,
              blocked_by: user?.id,
            }))
            showToast(msg)
            setShowBlockModal(false)
          }}
        />
      )}
    </div>
  )
}
