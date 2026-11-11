import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import {
  getConnectionRequests,
  getMyConnections,
  sendConnectionRequest,
} from '../services/connectionService'
import { getPublicProfile } from '../services/profileService'

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
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-profile-title"
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-7 rounded-2xl bg-[#11151c] border border-[#1a232e] shadow-2xl text-[#e3e2e3]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-4 mb-5">
          <div>
            <h2
              id="admin-user-profile-title"
              className="text-xl font-extrabold text-[#f8fafc] m-0"
            >
              Hồ sơ thành viên
            </h2>
            <p className="mt-1 text-xs text-[#94a3b8]">
              Xem hồ sơ công khai và quản lý kết nối.
            </p>
          </div>
          <button
            type="button"
            aria-label="Đóng hồ sơ"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#0d1117] border border-[#1a232e] text-[#94a3b8] hover:text-[#f8fafc] hover:border-[#00ff88]/40 flex items-center justify-center cursor-pointer transition"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="flex items-center gap-4">
          <Avatar
            src={profile?.avatar_url || targetUser.avatar_url}
            alt={displayName}
            className="w-[74px] h-[74px] shrink-0 rounded-full object-cover border-2 border-[#00ff88]/50 bg-[#08090a]"
          />
          <div className="min-w-0">
            <h3 className="m-0 mb-1 text-lg font-extrabold text-[#f8fafc] truncate">
              {displayName}
            </h3>
            <div className="text-xs font-mono text-[#94a3b8]">
              @{targetUser.username}
            </div>
            {!targetUser.is_active && (
              <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold">
                <span className="material-symbols-outlined text-[13px]">lock</span>
                Tài khoản đang bị khóa
              </div>
            )}
          </div>
        </div>

        {profileError ? (
          <div
            role="alert"
            className="mt-5 p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs"
          >
            {profileError}
          </div>
        ) : !profile ? (
          <div
            role="status"
            className="py-8 text-center text-sm text-[#94a3b8]"
          >
            Đang tải hồ sơ...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
              <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#1a232e]">
                <div className="text-[11px] text-[#94a3b8] mb-0.5">Độ tuổi</div>
                <div className="text-sm font-semibold text-[#f8fafc]">
                  {profile.age_group || 'Chưa cập nhật'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#0d1117] border border-[#1a232e]">
                <div className="text-[11px] text-[#94a3b8] mb-0.5">
                  Trạng thái hiện tại
                </div>
                <div className="text-sm font-semibold text-[#f8fafc]">
                  {profile.current_status || 'Chưa cập nhật'}
                </div>
              </div>
            </div>

            <div className="mt-3.5 p-4 rounded-xl bg-[#0d1117] border border-[#1a232e] text-sm text-[#cbd5e1] leading-relaxed whitespace-pre-wrap">
              <strong className="block text-[#f8fafc] text-xs uppercase tracking-wider mb-1.5">
                Giới thiệu
              </strong>
              {profile.bio || 'Thành viên chưa cập nhật phần giới thiệu.'}
            </div>
          </>
        )}

        {connectionError && (
          <div
            role="alert"
            className="mt-3.5 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs"
          >
            {connectionError}
            <button
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
              className="ml-2 text-[#00ff88] font-bold hover:underline cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        )}

        <div className="flex justify-end items-center flex-wrap gap-2.5 mt-6">
          {Number(currentUserId) === Number(targetUser.id) ? (
            <span className="text-xs text-[#94a3b8]">
              Đây là tài khoản admin đang đăng nhập.
            </span>
          ) : connectionStatus === 'accepted' ? (
            <span className="inline-flex items-center gap-1 text-[#00ff88] text-xs font-bold">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Đã là bạn bè
            </span>
          ) : connectionStatus === 'pending_sent' ? (
            <span className="text-amber-300 text-xs font-bold">
              Đã gửi lời mời · Đang chờ phản hồi
            </span>
          ) : connectionStatus === 'pending_received' ? (
            <>
              <span className="text-amber-300 text-xs font-bold">
                Người này đã gửi lời mời cho bạn
              </span>
              <Link
                to="/connections"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-[#00ff88] text-[#00210c] text-xs font-bold hover:opacity-90 transition"
              >
                Xem lời mời
              </Link>
            </>
          ) : connectionStatus === 'checking' ? (
            <span className="text-xs text-[#94a3b8]">
              Đang kiểm tra kết nối...
            </span>
          ) : canSendRequest ? (
            <button
              type="button"
              disabled={sending || !profile}
              onClick={handleSendRequest}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00ff88] text-[#00210c] text-xs font-bold hover:opacity-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              {sending ? 'Đang gửi...' : 'Gửi lời mời kết bạn'}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#0d1117] border border-[#1a232e] text-xs font-semibold text-[#cbd5e1] hover:text-[#f8fafc] hover:border-[#475569] transition cursor-pointer"
          >
            Đóng
          </button>
        </div>

        <p className="mt-3 text-right text-[11px] text-[#64748b]">
          Lời mời được gửi bằng tài khoản quản trị đang đăng nhập.
        </p>
      </section>
    </div>
  )
}
