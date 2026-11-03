import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './AuthContext'
import CallModal from '../components/CallModal'

const CallContext = createContext(null)

export function CallProvider({ children }) {
  const { user } = useAuth()
  const token = localStorage.getItem('access_token')

  // Trạng thái phiên gọi hiện tại: null hoặc { mode: 'outgoing' | 'incoming', callType: 'audio' | 'video', partner: {...}, conversationId: number, sdp?: any }
  const [callSession, setCallSession] = useState(null)
  const callSessionRef = useRef(null)
  callSessionRef.current = callSession

  const socketRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const pingIntervalRef = useRef(null)

  // Listeners nhận tín hiệu WebRTC Calling trực tiếp từ WebSocket (chống mất gói tin)
  const callSignalListenersRef = useRef(new Set())
  const registerCallSignalListener = useCallback((listener) => {
    callSignalListenersRef.current.add(listener)
    return () => callSignalListenersRef.current.delete(listener)
  }, [])

  // Lắng nghe tín hiệu gọi dự phòng từ socket phòng chat Messages (hai luồng tín hiệu song song đảm bảo 100% không mất tin)
  useEffect(() => {
    const handleSignalEvent = (e) => {
      const data = e.detail
      if (data && data.type && data.type.startsWith('call:') && data.type !== 'call:offer') {
        callSignalListenersRef.current.forEach((listener) => {
          try {
            listener(data)
          } catch (err) {}
        })
      }
    }
    window.addEventListener('call-signal-received', handleSignalEvent)
    return () => window.removeEventListener('call-signal-received', handleSignalEvent)
  }, [])

  // 1. Duy trì kết nối WebSocket toàn cục tới /api/ws/user
  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      return
    }

    let isCancelled = false

    const connectGlobalWs = () => {
      if (isCancelled) return

      const currentToken = localStorage.getItem('access_token')
      if (!currentToken) return

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const wsBaseUrl = apiUrl.replace(/^http/, 'ws')
      const wsUrl = `${wsBaseUrl}/api/ws/user?token=${encodeURIComponent(currentToken)}`

      const ws = new WebSocket(wsUrl)
      socketRef.current = ws

      ws.onopen = () => {
        // Gửi ping định kỳ 25 giây để giữ ấm kết nối qua reverse proxy (Render, Nginx)
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, 25000)
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (!data || !data.type) return

          if (data.type === 'pong') return

          if (data.type.startsWith('call:')) {
            if (data.type === 'call:offer') {
              // Nếu đang trong một cuộc gọi khác -> từ chối bận
              if (callSessionRef.current) {
                // Tránh reject lặp nếu offer lặp từ chính phiên này
                if (callSessionRef.current.conversationId === data.conversation_id) {
                  return
                }
                if (ws.readyState === WebSocket.OPEN) {
                  ws.send(
                    JSON.stringify({
                      type: 'call:reject',
                      call_type: data.call_type,
                      reason: 'busy',
                      target_user_id: data.sender_id,
                      conversation_id: data.conversation_id,
                    })
                  )
                }
                return
              }

              // Nhận cuộc gọi đến dù đang ở bất kỳ trang nào (/home, /discover, /communities, /messages...)!
              setCallSession({
                mode: 'incoming',
                callType: data.call_type || 'audio',
                partner: data.caller || {
                  id: data.sender_id,
                  username: 'Đối phương',
                  display_name: 'Đối phương',
                },
                sdp: data.sdp,
                conversationId: data.conversation_id,
              })
            } else {
              // Chuyển tiếp ngay lập tức đến CallModal
              callSignalListenersRef.current.forEach((listener) => {
                try {
                  listener(data)
                } catch (e) {
                  console.error('Lỗi listener call signal:', e)
                }
              })
            }
          } else if (data.type === 'user_status') {
            window.dispatchEvent(new CustomEvent('user-status-changed', { detail: data }))
          } else if (data.type === 'message') {
            window.dispatchEvent(new CustomEvent('new-chat-message', { detail: data }))
          }
        } catch (e) {
          console.error('Lỗi parse global ws message:', e)
        }
      }

      ws.onclose = () => {
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
        // Tự động kết nối lại sau 3.5 giây nếu user vẫn đăng nhập
        if (!isCancelled && localStorage.getItem('access_token')) {
          reconnectTimeoutRef.current = setTimeout(connectGlobalWs, 3500)
        }
      }

      ws.onerror = (err) => {
        console.warn('Global WebSocket error:', err)
      }
    }

    connectGlobalWs()

    return () => {
      isCancelled = true
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
    }
  }, [token, user?.id])

  // 2. Hàm bắt đầu cuộc gọi tới một người dùng
  const startCall = useCallback((partner, conversationId, callType = 'audio') => {
    if (callSessionRef.current) {
      alert('Bạn đang trong một cuộc gọi khác.')
      return
    }

    setCallSession({
      mode: 'outgoing',
      callType,
      partner,
      conversationId,
    })
  }, [])

  // 3. Gửi tín hiệu WebRTC qua WebSocket toàn cục (có cơ chế hàng đợi retry an toàn nếu socket đang kết nối lại)
  const sendCallSignal = useCallback((payload) => {
    const currentSession = callSessionRef.current
    const enriched = {
      ...payload,
      target_user_id: payload.target_user_id || currentSession?.partner?.id,
      conversation_id: payload.conversation_id || currentSession?.conversationId,
    }

    const trySend = (retries = 6) => {
      const ws = socketRef.current
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(enriched))
      } else if (ws && ws.readyState === WebSocket.CONNECTING && retries > 0) {
        setTimeout(() => trySend(retries - 1), 200)
      } else {
        console.warn('WebSocket toàn cục chưa sẵn sàng để gửi tín hiệu:', enriched.type)
      }
    }

    trySend()
  }, [])

  // 4. Kết thúc phiên gọi
  const endCallSession = useCallback(({ duration, reason } = {}) => {
    setCallSession(null)
    callSessionRef.current = null

    // Phát sự kiện cuộc gọi kết thúc để trang Messages cập nhật lịch sử tin nhắn
    window.dispatchEvent(
      new CustomEvent('call-session-ended', { detail: { duration, reason } })
    )
  }, [])

  return (
    <CallContext.Provider
      value={{
        callSession,
        isCallActive: !!callSession,
        startCall,
        endCallSession,
        sendCallSignal,
        registerCallSignalListener,
      }}
    >
      {children}

      {/* MODAL CUỘC GỌI TOÀN CỤC: Hiển thị trên mọi trang của ứng dụng */}
      {callSession && (
        <CallModal
          callSession={callSession}
          onEndCall={endCallSession}
          onSendSignal={sendCallSignal}
          onRegisterSignalListener={registerCallSignalListener}
        />
      )}
    </CallContext.Provider>
  )
}

export function useCall() {
  const context = useContext(CallContext)
  if (!context) {
    throw new Error('useCall phải được sử dụng bên trong CallProvider')
  }
  return context
}

export default CallContext

