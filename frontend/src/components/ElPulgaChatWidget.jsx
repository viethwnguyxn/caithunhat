import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  clearAiHistory,
  getAiHistory,
  getAiQuickPrompts,
  sendAiMessage,
} from '../services/aiService'

export default function ElPulgaChatWidget() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [quickPrompts, setQuickPrompts] = useState([])
  const [displayName, setDisplayName] = useState('')
  const [hasSurvey, setHasSurvey] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(true)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  // Tự động tắt tooltip sau 8 giây
  useEffect(() => {
    const timer = setTimeout(() => setTooltipVisible(false), 8000)
    return () => clearTimeout(timer)
  }, [])

  // Tải lịch sử tin nhắn & gợi ý mở lời khi mở widget
  useEffect(() => {
    if (!user || !isOpen) return

    let isMounted = true
    const fetchData = async () => {
      try {
        const [historyRes, promptsRes] = await Promise.all([
          getAiHistory().catch(() => ({ messages: [], display_name: '', has_survey: false })),
          getAiQuickPrompts().catch(() => ({ prompts: [] })),
        ])

        if (isMounted) {
          setMessages(historyRes.messages || [])
          setDisplayName(historyRes.display_name || user.username || 'bạn')
          setHasSurvey(Boolean(historyRes.has_survey))
          setQuickPrompts(promptsRes.prompts || [])
        }
      } catch (err) {
        console.warn('Lỗi khi tải dữ liệu El Pulga:', err)
      }
    }

    fetchData()
    return () => {
      isMounted = false
    }
  }, [user, isOpen])

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, isOpen])

  // Focus ô nhập khi mở widget
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200)
    }
  }, [isOpen])

  if (!user) return null

  const handleSend = async (textToSend) => {
    const text = (textToSend || input).trim()
    if (!text || loading) return

    const userMsg = {
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const res = await sendAiMessage(text)
      const botMsg = {
        role: 'assistant',
        content: res.reply,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, botMsg])
    } catch (err) {
      const errorMsg = {
        role: 'assistant',
        content: 'El Pulga đang gặp chút trục trặc kết nối hoặc tạm thời bận. Bạn hãy thử lại sau ít giây nhé!',
        created_at: new Date().toISOString(),
        isError: true,
      }
      setMessages((prev) => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearChat = async () => {
    if (!window.confirm('Bạn có chắc muốn xóa lịch sử trò chuyện với El Pulga để bắt đầu lại?')) return
    try {
      await clearAiHistory()
      setMessages([])
    } catch (err) {
      console.error('Không thể xóa lịch sử:', err)
    }
  }

  return (
    <aside aria-label="Trợ lý tâm lý El Pulga" className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* CỬA SỔ CHAT EL PULGA */}
      {isOpen && (
        <div className="w-[370px] sm:w-[420px] h-[600px] max-h-[82vh] bg-[#131b15]/95 backdrop-blur-2xl border border-[#2f4234] rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.65)] flex flex-col overflow-hidden mb-4 animate-in fade-in slide-in-from-bottom-6 duration-300">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-[#18261d] to-[#121c15] border-b border-[#29392d] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#3fa876] to-[#c5f36a] flex items-center justify-center shadow-lg shadow-[#3fa876]/20">
                  <span className="material-symbols-outlined text-[#0e1711] text-2xl font-bold">
                    psychology
                  </span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#4edea3] border-2 border-[#131b15] rounded-full animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[#f0f6f1] text-[15px] leading-tight">El Pulga</h3>
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-[#273a2c] text-[#a4ef7b] rounded-full border border-[#3b5542]">
                    AI Companion
                  </span>
                </div>
                <p className="text-[11px] text-[#93a797] leading-tight mt-0.5">
                  Lắng nghe & thấu cảm tâm lý
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleClearChat}
                title="Làm mới cuộc trò chuyện"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8e9f92] hover:text-[#f0f6f1] hover:bg-[#202d24] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Thu nhỏ"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-[#8e9f92] hover:text-[#f0f6f1] hover:bg-[#202d24] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">expand_more</span>
              </button>
            </div>
          </div>

          {/* Vùng tin nhắn */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-[#2a382e]">
            {/* Lời chào mở đầu */}
            {messages.length === 0 && (
              <div className="p-4 rounded-2xl bg-[#1a251e]/80 border border-[#2b3a2f] text-center space-y-2 mt-2">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#27372b] flex items-center justify-center text-[#a8f17e]">
                  <span className="material-symbols-outlined text-2xl">favorite</span>
                </div>
                <h4 className="font-semibold text-sm text-[#eff6f0]">
                  Chào {displayName}! Mình là El Pulga.
                </h4>
                <p className="text-xs text-[#a1b3a5] leading-relaxed">
                  {hasSurvey
                    ? 'Mình đã đọc qua những tâm tư trong bài khảo sát của bạn. Bất cứ khi nào bạn thấy mệt mỏi hay muốn sẻ chia, mình luôn ở đây lắng nghe mà không phán xét.'
                    : 'Mình luôn ở đây như một người bạn tri kỷ để bạn giãi bày mọi cảm xúc trong lòng. Hôm nay bạn thế nào?'}
                </p>

                {/* Gợi ý mở lời */}
                {quickPrompts.length > 0 && (
                  <div className="pt-3 border-t border-[#29392e] space-y-1.5 text-left">
                    <p className="text-[11px] font-semibold text-[#8ca090] uppercase tracking-wider">
                      Gợi ý mở lời nhanh:
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {quickPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(prompt)}
                          className="text-left text-xs text-[#d2e0d5] bg-[#212f25] hover:bg-[#2b3e31] hover:text-[#b4f68c] px-3 py-2 rounded-xl transition-all border border-[#2f4234] flex items-center justify-between group"
                        >
                          <span className="line-clamp-1">{prompt}</span>
                          <span className="material-symbols-outlined text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            arrow_forward
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Danh sách tin nhắn */}
            {messages.map((msg, idx) => {
              const isUser = msg.role === 'user'
              return (
                <div
                  key={idx}
                  className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#3fa876] to-[#c5f36a] flex items-center justify-center text-[#0e1711] shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-sm font-bold">psychology</span>
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed break-words ${
                      isUser
                        ? 'bg-[#2b4b35] text-[#f2faf3] rounded-tr-sm shadow-md'
                        : msg.isError
                        ? 'bg-[#3b1e1e] text-[#fca5a5] border border-[#582929] rounded-tl-sm'
                        : 'bg-[#1b251f] text-[#dce7de] border border-[#2b3a2f] rounded-tl-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  </div>
                </div>
              )
            })}

            {/* Hiệu ứng gõ chữ / suy nghĩ */}
            {loading && (
              <div className="flex items-center gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#3fa876] to-[#c5f36a] flex items-center justify-center text-[#0e1711] shrink-0">
                  <span className="material-symbols-outlined text-sm font-bold">psychology</span>
                </div>
                <div className="px-4 py-3 bg-[#1b251f] border border-[#2b3a2f] rounded-2xl rounded-tl-sm flex items-center gap-1.5 text-xs text-[#9eb2a3]">
                  <span className="inline-block w-2 h-2 rounded-full bg-[#4edea3] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="inline-block w-2 h-2 rounded-full bg-[#4edea3] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="inline-block w-2 h-2 rounded-full bg-[#4edea3] animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="ml-1 text-[11px] text-[#8aa090]">El Pulga đang lắng nghe...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Ô nhập tin nhắn */}
          <div className="p-3 bg-[#131b15] border-t border-[#26372b]">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-center gap-2 bg-[#1b261f] border border-[#304334] rounded-2xl px-3 py-2 focus-within:border-[#4edea3] transition-colors"
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tâm sự cùng El Pulga..."
                disabled={loading}
                className="flex-1 bg-transparent text-[#eff6f0] text-xs placeholder-[#7c9081] resize-none outline-none max-h-24 py-1"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-xl bg-[#c5f36a] hover:bg-[#d8faa0] disabled:bg-[#253328] disabled:text-[#6a7c6e] text-[#102015] flex items-center justify-center transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
                title="Gửi tin nhắn"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </form>
            <p className="text-[10px] text-center text-[#748779] mt-2">
              Bảo mật 100% • Tự động thấu hiểu từ khảo sát của bạn
            </p>
          </div>
        </div>
      )}

      {/* NÚT BẤM NỔI (FAB) */}
      <div className="relative group">
        {/* Tooltip mời trò chuyện */}
        {tooltipVisible && !isOpen && (
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-[#1b2720] border border-[#374e3d] text-[#e3f0e5] text-xs px-3.5 py-2 rounded-2xl shadow-xl whitespace-nowrap flex items-center gap-2 animate-in fade-in slide-in-from-right-3 duration-300">
            <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-ping" />
            <span>Tâm sự cùng <strong>El Pulga</strong> nhé?</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setTooltipVisible(false)
              }}
              className="text-[#879b8c] hover:text-white ml-1 text-sm font-bold"
            >
              ×
            </button>
          </div>
        )}

        <button
          onClick={() => {
            setIsOpen((prev) => !prev)
            setTooltipVisible(false)
          }}
          className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-[0_8px_30px_rgba(78,222,163,0.3)] transition-all duration-300 transform hover:scale-105 active:scale-95 ${
            isOpen
              ? 'bg-[#202e24] text-[#eff6f0] border border-[#3b5341]'
              : 'bg-gradient-to-tr from-[#3fa876] via-[#65d388] to-[#c5f36a] text-[#0d1a12]'
          }`}
          title="Mở trợ lý tâm lý El Pulga"
        >
          {isOpen ? (
            <span className="material-symbols-outlined text-2xl">close</span>
          ) : (
            <div className="relative flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl font-bold">psychology</span>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#4edea3] border-2 border-[#131b15] rounded-full animate-pulse" />
            </div>
          )}
        </button>
      </div>
    </aside>
  )
}
