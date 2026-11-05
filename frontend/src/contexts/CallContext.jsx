import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import CallModal from '../components/CallModal'
import api from '../services/api'

const CallContext = createContext(null)

export function CallProvider({ children }) {
  const { user } = useAuth()
  const token = localStorage.getItem('access_token')
  const [callSession, setCallSession] = useState(null)
  const [stringeeClient, setStringeeClient] = useState(null)
  const [stringeeError, setStringeeError] = useState('')
  const callSessionRef = useRef(null)
  const stringeeClientRef = useRef(null)
  const socketRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const pingIntervalRef = useRef(null)

  const updateCallSession = useCallback((session) => {
    callSessionRef.current = session
    setCallSession(session)
  }, [])

  useEffect(() => {
    if (!token || !user) {
      setStringeeClient(null)
      stringeeClientRef.current = null
      setStringeeError('')
      updateCallSession(null)
      return
    }

    let isCancelled = false
    let client = null
    setStringeeError('')

    const initializeClient = async () => {
      try {
        const { StringeeClient } = await import('stringee')
        if (isCancelled) return

        client = new StringeeClient()
        stringeeClientRef.current = client

        const fetchTokenAndConnect = async () => {
          try {
            const { data } = await api.get('/api/calls/stringee-token')
            if (!isCancelled) client.connect(data.access_token)
          } catch (error) {
            if (!isCancelled) {
              const message =
                error.response?.data?.detail || 'Không thể xác thực dịch vụ gọi Stringee.'
              console.error('Không thể lấy Stringee access token:', error)
              setStringeeError(message)
            }
          }
        }

        const rejectIncomingCall = (call, message) => {
          call.reject((result) => {
            if (result?.r !== 0) {
              console.error('Không thể từ chối cuộc gọi Stringee:', result, message)
            }
          })
        }

        const handleIncomingCall = async (call, callType) => {
          if (isCancelled) {
            rejectIncomingCall(call, 'Không thể nhận cuộc gọi trong phiên hiện tại.')
            return
          }
          if (callSessionRef.current) {
            rejectIncomingCall(call, 'Đang bận với cuộc gọi khác.')
            return
          }

          const callerId = Number.parseInt(call.fromNumber, 10)
          if (!Number.isSafeInteger(callerId) || callerId < 1) {
            rejectIncomingCall(call, 'Không nhận diện được người gọi.')
            return
          }

          try {
            const { data: conversations } = await api.get('/api/conversations')
            if (isCancelled) {
              rejectIncomingCall(call, 'Không thể nhận cuộc gọi trong phiên hiện tại.')
              return
            }
            const conversation = conversations.find((item) => item.partner?.id === callerId)
            if (!conversation || conversation.is_blocked) {
              rejectIncomingCall(call, 'Không có quyền nhận cuộc gọi này.')
              return
            }

            if (typeof call.ringing === 'function') {
              call.ringing((result) => {
                if (result?.r !== 0) {
                  console.error('Không thể báo chuông cuộc gọi Stringee:', result)
                }
              })
            }
            updateCallSession({
              mode: 'incoming',
              callType,
              partner: conversation.partner,
              conversationId: conversation.id,
              stringeeCall: call,
            })
          } catch (error) {
            console.error('Không thể xác minh người gọi Stringee:', error)
            rejectIncomingCall(call, 'Không thể xác minh người gọi.')
          }
        }

        client.on('authen', (result) => {
          if (isCancelled) return
          if (result?.r === 0) {
            setStringeeError('')
            setStringeeClient(client)
          } else {
            const message = result?.message || 'Stringee từ chối xác thực tài khoản.'
            console.error('Stringee xác thực thất bại:', result)
            setStringeeError(message)
          }
        })
        client.on('disconnect', () => {
          if (!isCancelled) setStringeeClient(null)
        })
        client.on('incomingcall', (call) => handleIncomingCall(call, 'audio'))
        client.on('incomingcall2', (call) => handleIncomingCall(call, 'video'))
        client.on('requestnewtoken', fetchTokenAndConnect)
        await fetchTokenAndConnect()
      } catch (error) {
        if (!isCancelled) {
          console.error('Không thể tải Stringee Web SDK:', error)
          setStringeeError('Không thể tải thư viện gọi Stringee.')
        }
      }
    }

    void initializeClient()

    return () => {
      isCancelled = true
      if (stringeeClientRef.current === client) {
        stringeeClientRef.current = null
      }
      client?.disconnect()
      setStringeeClient((current) => (current === client ? null : current))
    }
  }, [token, user?.id, updateCallSession])

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
          if (!data || !data.type || data.type === 'pong') return

          if (data.type === 'user_status') {
            window.dispatchEvent(new CustomEvent('user-status-changed', { detail: data }))
          } else if (data.type === 'message') {
            window.dispatchEvent(new CustomEvent('new-chat-message', { detail: data }))
          }
        } catch (error) {
          console.error('Lỗi parse global ws message:', error)
        }
      }

      ws.onclose = () => {
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current)
        if (!isCancelled && localStorage.getItem('access_token')) {
          reconnectTimeoutRef.current = setTimeout(connectGlobalWs, 3500)
        }
      }

      ws.onerror = (error) => {
        console.warn('Global WebSocket error:', error)
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

  const startCall = useCallback(
    (partner, conversationId, callType = 'audio') => {
      if (callSessionRef.current) {
        alert('Bạn đang trong một cuộc gọi khác.')
        return
      }

      updateCallSession({
        mode: 'outgoing',
        callType,
        partner,
        conversationId,
      })
    },
    [updateCallSession]
  )

  const endCallSession = useCallback(
    ({ duration, reason } = {}) => {
      updateCallSession(null)
      window.dispatchEvent(
        new CustomEvent('call-session-ended', { detail: { duration, reason } })
      )
    },
    [updateCallSession]
  )

  return (
    <CallContext.Provider
      value={{
        callSession,
        isCallActive: !!callSession,
        startCall,
        endCallSession,
      }}
    >
      {children}
      {callSession && (
        <CallModal
          callSession={callSession}
          callClient={stringeeClient}
          currentUserId={user?.id}
          callError={stringeeError}
          onEndCall={endCallSession}
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
