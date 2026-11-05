import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import {
  getConnectionRequests,
  getMyConnections,
  sendConnectionRequest,
} from '../services/connectionService'
import { getPublicProfile } from '../services/profileService'

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 1100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  backgroundColor: 'rgba(17, 24, 39, 0.55)',
  backdropFilter: 'blur(3px)',
}

const cardStyle = {
  width: '100%',
  maxWidth: '560px',
  maxHeight: '90vh',
  overflowY: 'auto',
  padding: '28px',
  borderRadius: '20px',
  backgroundColor: '#ffffff',
  boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
}

export default function AdminUserProfileModal({
  targetUser,
  currentUserId,
  onClose,
  onNotify,
}) {
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState('checking')
  const [connectionError, setConnectionError] = useState('')
  const [sending, setSending] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      setProfile(null)
      setProfileError('')
      setConnectionStatus('checking')
      setConnectionError('')

      const [profileResult, connectionsResult, requestsResult] =
        await Promise.allSettled([
          getPublicProfile(targetUser.id),
          getMyConnections(),
          getConnectionRequests(),
        ])

      if (cancelled) return

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value)
      } else {
        console.error('Không thể tải hồ sơ người dùng:', profileResult.reason)
        setProfileError(
          profileResult.reason.response?.data?.detail ||
            'Không thể tải hồ sơ này. Vui lòng thử lại.'
        )
      }

      if (
        connectionsResult.status === 'fulfilled' &&
        requestsResult.status === 'fulfilled'
      ) {
        const targetId = Number(targetUser.id)
        const isConnected = connectionsResult.value.some(
          (connection) => Number(connection.user?.id) === targetId
        )
        const hasOutgoingRequest = (requestsResult.value.outgoing || []).some(
          (request) => Number(request.user?.id) === targetId
        )
        const hasIncomingRequest = (requestsResult.value.incoming || []).some(
          (request) => Number(request.user?.id) === targetId
        )

        setConnectionStatus(
          isConnected
            ? 'accepted'
            : hasOutgoingRequest
            ? 'pending_sent'
            : hasIncomingRequest
            ? 'pending_received'
            : 'none'
        )
      } else {
        const reason =
          connectionsResult.status === 'rejected'
            ? connectionsResult.reason
            : requestsResult.reason
        console.error('Không thể tải trạng thái kết nối:', reason)
        setConnectionError(
          reason.response?.data?.detail ||
            'Không thể kiểm tra trạng thái kết nối. Hãy thử tải lại.'
        )
        setConnectionStatus('unavailable')
      }
    }

    loadProfile()
    return () => {
      cancelled = true
    }
  }, [targetUser.id, reloadKey])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleSendRequest = async () => {
    setSending(true)
    setConnectionError('')
    try {
      await sendConnectionRequest(targetUser.id)
      setConnectionStatus('pending_sent')
      onNotify(`Đã gửi lời mời kết nối tới @${targetUser.username}.`)
    } catch (error) {
      console.error('Không thể gửi lời mời kết nối:', error)
      setConnectionError(
        error.response?.data?.detail || 'Không thể gửi lời mời kết nối.'
      )
    } finally {
      setSending(false)
    }
  }

  const displayName =
    profile?.display_name || targetUser.display_name || targetUser.username
  const canSendRequest =
    Number(currentUserId) !== Number(targetUser.id) &&
    targetUser.is_active &&
    connectionStatus === 'none'

  return (
    <div style={overlayStyle} onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-profile-title"
        style={cardStyle}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: '16px',
            marginBottom: '22px',
          }}
        >
          <div>
            <h2
              id="admin-user-profile-title"
              style={{ margin: 0, color: '#1a1a2e', fontSize: '20px' }}
            >
              Hồ sơ thành viên
            </h2>
            <p style={{ margin: '5px 0 0', color: '#6b7280', fontSize: '13px' }}>
              Xem hồ sơ công khai và quản lý kết nối.
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng hồ sơ"
            onClick={onClose}
            style={{
              border: 0,
              borderRadius: '8px',
              padding: '6px 10px',
              color: '#4b5563',
              backgroundColor: '#f3f4f6',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Avatar
            src={profile?.avatar_url || targetUser.avatar_url}
            alt={displayName}
            style={{
              width: '76px',
              height: '76px',
              flexShrink: 0,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '3px solid #ede9fe',
            }}
          />
          <div>
            <h3
              style={{
                margin: '0 0 4px',
                color: '#1a1a2e',
                fontSize: '19px',
                fontWeight: 800,
              }}
            >
              {displayName}
            </h3>
            <div style={{ color: '#6b7280', fontSize: '13px' }}>
              @{targetUser.username}
            </div>
            {!targetUser.is_active && (
              <div style={{ color: '#dc2626', fontSize: '12px', marginTop: '6px' }}>
                Tài khoản đang bị khóa
              </div>
            )}
          </div>
        </div>

        {profileError ? (
          <div
            role="alert"
            style={{
              marginTop: '22px',
              padding: '14px',
              borderRadius: '10px',
              color: '#b91c1c',
              backgroundColor: '#fef2f2',
              fontSize: '13px',
            }}
          >
            {profileError}
          </div>
        ) : !profile ? (
          <div
            role="status"
            style={{ padding: '32px 0', textAlign: 'center', color: '#6b7280' }}
          >
            Đang tải hồ sơ...
          </div>
        ) : (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '12px',
                marginTop: '22px',
              }}
            >
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#f9fafb',
                }}
              >
                <div style={{ color: '#6b7280', fontSize: '11px' }}>Độ tuổi</div>
                <div style={{ color: '#1f2937', fontSize: '13px', fontWeight: 600 }}>
                  {profile.age_group || 'Chưa cập nhật'}
                </div>
              </div>
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#f9fafb',
                }}
              >
                <div style={{ color: '#6b7280', fontSize: '11px' }}>
                  Trạng thái hiện tại
                </div>
                <div style={{ color: '#1f2937', fontSize: '13px', fontWeight: 600 }}>
                  {profile.current_status || 'Chưa cập nhật'}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: '14px',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#faf9fe',
                color: '#374151',
                fontSize: '13px',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
              }}
            >
              <strong style={{ display: 'block', marginBottom: '4px' }}>
                Giới thiệu
              </strong>
              {profile.bio || 'Thành viên chưa cập nhật phần giới thiệu.'}
            </div>
          </>
        )}

        {connectionError && (
          <div
            role="alert"
            style={{
              marginTop: '14px',
              padding: '12px',
              borderRadius: '10px',
              color: '#b91c1c',
              backgroundColor: '#fef2f2',
              fontSize: '13px',
            }}
          >
            {connectionError}
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              style={{
                marginLeft: '8px',
                border: 0,
                background: 'none',
                color: '#7c3aed',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            marginTop: '22px',
          }}
        >
          {Number(currentUserId) === Number(targetUser.id) ? (
            <span style={{ color: '#6b7280', fontSize: '12px' }}>
              Đây là tài khoản admin đang đăng nhập.
            </span>
          ) : connectionStatus === 'accepted' ? (
            <span style={{ color: '#059669', fontSize: '13px', fontWeight: 700 }}>
              ✓ Đã là bạn bè
            </span>
          ) : connectionStatus === 'pending_sent' ? (
            <span style={{ color: '#b45309', fontSize: '13px', fontWeight: 700 }}>
              Đã gửi lời mời · Đang chờ phản hồi
            </span>
          ) : connectionStatus === 'pending_received' ? (
            <>
              <span style={{ color: '#b45309', fontSize: '13px', fontWeight: 700 }}>
                Người này đã gửi lời mời cho bạn
              </span>
              <Link
                to="/connections"
                onClick={onClose}
                style={{
                  padding: '9px 14px',
                  borderRadius: '9px',
                  color: '#ffffff',
                  backgroundColor: '#7c5cbf',
                  textDecoration: 'none',
                  fontSize: '13px',
                  fontWeight: 700,
                }}
              >
                Xem lời mời
              </Link>
            </>
          ) : connectionStatus === 'checking' ? (
            <span style={{ color: '#6b7280', fontSize: '13px' }}>
              Đang kiểm tra kết nối...
            </span>
          ) : canSendRequest ? (
            <button
              type="button"
              disabled={sending || !profile}
              onClick={handleSendRequest}
              style={{
                padding: '10px 16px',
                border: 0,
                borderRadius: '9px',
                color: '#ffffff',
                backgroundColor: sending || !profile ? '#a78bca' : '#7c5cbf',
                fontSize: '13px',
                fontWeight: 700,
                cursor: sending || !profile ? 'not-allowed' : 'pointer',
              }}
            >
              {sending ? 'Đang gửi...' : '＋ Gửi lời mời kết bạn'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: '9px',
              color: '#374151',
              backgroundColor: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Đóng
          </button>
        </div>
        <p
          style={{
            margin: '12px 0 0',
            color: '#9ca3af',
            fontSize: '11px',
            textAlign: 'right',
          }}
        >
          Lời mời được gửi bằng tài khoản quản trị đang đăng nhập.
        </p>
      </section>
    </div>
  )
}
