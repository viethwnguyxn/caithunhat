import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function GoogleLoginButton({ onError }) {
  const { loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const buttonRef = useRef(null)
  const [loading, setLoading] = useState(false)

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

  useEffect(() => {
    // Nếu chưa cấu hình Client ID thực thì không init Google SDK button
    if (!clientId || clientId.startsWith('your_')) {
      return
    }

    const initializeGoogleSignIn = () => {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          button_auto_select: false,
        })

        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signin_with',
            shape: 'rectangular',
            logo_alignment: 'left',
          })
        }
      }
    }

    // Nếu script đã tải xong thì gọi ngay, nếu chưa thì đợi
    if (window.google?.accounts?.id) {
      initializeGoogleSignIn()
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval)
          initializeGoogleSignIn()
        }
      }, 300)
      return () => clearInterval(interval)
    }
  }, [clientId])

  const handleCredentialResponse = async (response) => {
    const idToken = response.credential
    if (!idToken) return

    setLoading(true)
    try {
      await loginWithGoogle(idToken)
      navigate('/home', { replace: true })
    } catch (err) {
      console.error('Google login failed:', err)
      const msg = err.response?.data?.detail || 'Đăng nhập bằng Google thất bại.'
      if (onError) onError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Nếu người dùng chưa cấu hình VITE_GOOGLE_CLIENT_ID trong .env
  const handlePlaceholderClick = () => {
    const msg =
      'Bạn cần cấu hình VITE_GOOGLE_CLIENT_ID trong file frontend/.env để kích hoạt Google Login thực tế.'
    if (onError) onError(msg)
  }

  return (
    <div style={{ width: '100%', marginTop: '8px' }}>
      {loading && (
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280', marginBottom: '8px' }}>
          Đang xác thực Google...
        </p>
      )}

      {clientId && !clientId.startsWith('your_') ? (
        <div ref={buttonRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}></div>
      ) : (
        <button
          type="button"
          onClick={handlePlaceholderClick}
          className="btn-secondary"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            backgroundColor: '#ffffff',
            borderColor: '#e5e7eb',
            color: '#374151',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          Continue with Google
        </button>
      )}
    </div>
  )
}
