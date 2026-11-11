import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getSurvey } from '../services/surveyService'

export default function GoogleLoginButton({ onError }) {
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [googleReady, setGoogleReady] = useState(false)
  const buttonContainerRef = useRef(null)
  const onErrorRef = useRef(onError)
  const credentialHandlerRef = useRef(null)

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
  const hasClientId = Boolean(clientId && !clientId.startsWith('your_'))
  onErrorRef.current = onError

  credentialHandlerRef.current = async (response) => {
    const idToken = response.credential
    if (!idToken) return

    setLoading(true)
    try {
      await loginWithGoogle(idToken)
      let destination = '/home'
      try {
        const survey = await getSurvey()
        if (!survey) destination = '/survey'
      } catch (surveyError) {
        console.error('Không thể kiểm tra trạng thái khảo sát:', surveyError)
      }
      navigate(destination, { replace: true })
    } catch (err) {
      console.error('Google login failed:', err)
      const msg = err.response?.data?.detail || 'Đăng nhập bằng Google thất bại.'
      if (onErrorRef.current) onErrorRef.current(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!hasClientId) {
      return
    }

    const initializeGoogleSignIn = () => {
      if (window.google?.accounts?.id && buttonContainerRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => credentialHandlerRef.current?.(response),
          auto_select: false,
          button_auto_select: false,
        })

        const container = buttonContainerRef.current
        container.replaceChildren()
        const width = Math.min(Math.max(Math.floor(container.getBoundingClientRect().width), 120), 400)
        window.google.accounts.id.renderButton(container, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          width,
          logo_alignment: 'left',
        })
        setGoogleReady(true)
        return true
      }

      return false
    }

    if (initializeGoogleSignIn()) return

    const interval = setInterval(() => {
      if (initializeGoogleSignIn()) clearInterval(interval)
    }, 300)
    return () => clearInterval(interval)
  }, [clientId, hasClientId])

  const handlePlaceholderClick = () => {
    const msg = hasClientId
      ? 'Google Login chưa sẵn sàng. Vui lòng thử lại sau.'
      : 'Bạn cần cấu hình VITE_GOOGLE_CLIENT_ID trong file frontend/.env để kích hoạt Google Login thực tế.'
    if (onErrorRef.current) onErrorRef.current(msg)
  }

  return (
    <div style={{ width: '100%', marginTop: '8px' }}>
      {loading && (
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
          Đang xác thực Google...
        </p>
      )}

      {hasClientId && (
        <div
          ref={buttonContainerRef}
          aria-hidden={!googleReady}
          style={{
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            visibility: googleReady ? 'visible' : 'hidden',
            height: googleReady ? 'auto' : 0,
            overflow: 'hidden',
          }}
        />
      )}
      {(!hasClientId || !googleReady) && (
        <button
          type="button"
          onClick={handlePlaceholderClick}
          className="btn-secondary google-login-button"
          disabled={loading || (hasClientId && !googleReady)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            color: '#374151',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          Đăng nhập với Google
        </button>
      )}
    </div>
  )
}
