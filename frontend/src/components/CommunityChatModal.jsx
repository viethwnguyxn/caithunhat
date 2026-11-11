import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getMessages, sendMessage } from '../services/chatService'
import { getCommunityAvatarUrl } from '../data/communities'
import brandMark from '../assets/lapulga-mark.svg'

function formatTime(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

export default function CommunityChatModal({ isOpen, onClose, community }) {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [loading, setLoading] = useState(true)
  const [wsStatus, setWsStatus] = useState('disconnected')

  const messagesEndRef = useRef(null)
  const socketRef = useRef(null)

  const conversationId = community?.conversation_id

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 1. Tải lịch sử tin nhắn
  useEffect(() => {
    if (!isOpen || !conversationId) return

    setLoading(true)
    getMessages(conversationId)
      .then((history) => {
        setMessages(history || [])
        setTimeout(scrollToBottom, 100)
      })
      .catch((err) => {
        console.error('Lỗi tải tin nhắn nhóm chat cộng đồng:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isOpen, conversationId])

  // 2. Mở kết nối WebSocket realtime tới nhóm chat
  useEffect(() => {
    if (!isOpen || !conversationId) return

    const token = localStorage.getItem('access_token')
    if (!token) return

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const wsBaseUrl = apiUrl.replace(/^http/, 'ws')
    const wsUrl = `${wsBaseUrl}/api/ws/chat/${conversationId}?token=${encodeURIComponent(token)}`

    const ws = new WebSocket(wsUrl)
    socketRef.current = ws

    ws.onopen = () => {
      setWsStatus('connected')
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === 'message' && data.message) {
          setMessages((prev) => {
            // Tránh duplicate tin nhắn nếu đã có id
            if (prev.some((m) => m.id === data.message.id)) {
              return prev
            }
            return [...prev, data.message]
          })
          setTimeout(scrollToBottom, 50)
        }
      } catch (err) {
        console.error('Lỗi phân tích WebSocket message:', err)
      }
    }

    ws.onclose = () => {
      setWsStatus('disconnected')
    }

    ws.onerror = () => {
      setWsStatus('error')
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close()
      }
      socketRef.current = null
    }
  }, [isOpen, conversationId])

  // 3. Gửi tin nhắn
  const handleSendMessage = async (e) => {
    e?.preventDefault()
    const content = inputText.trim()
    if (!content || !conversationId) return

    setInputText('')

    const ws = socketRef.current
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'message', content }))
    } else {
      // Fallback REST API
      try {
        const newMsg = await sendMessage(conversationId, content)
        setMessages((prev) => [...prev, newMsg])
        setTimeout(scrollToBottom, 50)
      } catch (err) {
        console.error('Lỗi gửi tin nhắn qua REST API:', err)
      }
    }
  }

  if (!isOpen || !community) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-2xl h-[85vh] max-h-[720px] rounded-2xl bg-[#0f131a] border border-[#1a232e] shadow-2xl flex flex-col overflow-hidden text-[#e3e2e3]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Nhóm Chat */}
        <div className="p-4 px-5 border-b border-[#1a232e] bg-[#11151c] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={getCommunityAvatarUrl(community)}
              alt={community.name}
              onError={(e) => {
                e.currentTarget.src = brandMark
              }}
              className="w-11 h-11 rounded-xl bg-[#181d26] border border-[#00ff88]/30 object-cover shadow-[0_0_12px_rgba(0,255,136,0.15)] shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#f1ffef] line-clamp-1">
                  {community.name}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30 shrink-0">
                  Nhóm Chat
                </span>
              </div>
              <p className="text-xs text-[#849585] font-mono flex items-center gap-2">
                <span>{community.members_count || 1} thành viên</span>
                <span>•</span>
                <span className="flex items-center gap-1 text-[#00ff88]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse"></span>
                  Realtime
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút mở toàn màn hình tại trang Tin nhắn */}
            <button
              type="button"
              onClick={() => {
                onClose()
                navigate(`/messages?conv=${conversationId}`)
              }}
              className="p-2 rounded-xl text-[#849585] hover:text-[#00ff88] hover:bg-[#181d26] transition-all cursor-pointer flex items-center gap-1 text-xs font-mono"
              title="Mở toàn màn hình tại trang Tin nhắn"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              <span className="hidden sm:inline">Toàn màn hình</span>
            </button>

            {/* Nút đóng */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-[#849585] hover:text-[#f1ffef] hover:bg-[#181d26] transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Khung tin nhắn cuộn */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4 bg-[#08090a]/50">
          {loading ? (
            <div className="h-full flex items-center justify-center text-xs font-mono text-[#849585]">
              <span className="animate-pulse">Đang tải lịch sử trò chuyện...</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-[#849585] space-y-2.5">
              <img
                src={getCommunityAvatarUrl(community)}
                alt={community.name}
                onError={(e) => {
                  e.currentTarget.src = brandMark
                }}
                className="w-14 h-14 rounded-2xl object-cover border border-[#00ff88]/30 bg-[#181d26]"
              />
              <p className="text-sm font-semibold text-[#f1ffef]">Chưa có tin nhắn nào</p>
              <p className="text-xs max-w-sm text-[#849585]">
                Hãy là người đầu tiên bắt đầu cuộc trò chuyện trong nhóm {community.name}!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === user?.id
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-2 mb-1 text-[11px] font-mono text-[#849585]">
                    {!isMe && (
                      <span className="text-[#00ff88] font-bold">
                        {msg.sender?.display_name || msg.sender?.username || 'Thành viên'}
                      </span>
                    )}
                    <span>{formatTime(msg.created_at)}</span>
                  </div>

                  <div
                    className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      isMe
                        ? 'bg-[#00ff88] text-[#00210c] font-medium rounded-br-none shadow-[0_0_12px_rgba(0,255,136,0.2)]'
                        : 'bg-[#181d26] text-[#e3e2e3] border border-[#1a232e] rounded-bl-none'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Ô nhập tin nhắn */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 md:p-4 bg-[#11151c] border-t border-[#1a232e] flex items-center gap-2 shrink-0"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Nhắn tin vào nhóm ${community.name}... (Enter để gửi)`}
            className="flex-1 h-11 px-4 rounded-xl bg-[#08090a] border border-[#1a232e] text-sm text-[#f1ffef] placeholder:text-[#849585] focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] transition-all"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="h-11 px-5 rounded-xl bg-[#00ff88] text-[#00210c] text-sm font-bold shadow-[0_0_12px_rgba(0,255,136,0.3)] hover:shadow-[0_0_18px_rgba(0,255,136,0.5)] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            <span className="hidden sm:inline">Gửi</span>
          </button>
        </form>
      </div>
    </div>
  )
}
