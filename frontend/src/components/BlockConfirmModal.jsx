import { useState, useEffect } from 'react'
import { reportService } from '../services/reportService'

export default function BlockConfirmModal({ targetUser, onClose, onSuccess }) {
  const [blocking, setBlocking] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!targetUser) return null

  const handleBlock = async () => {
    setBlocking(true)
    setError('')

    try {
      await reportService.blockUser(targetUser.id)
      if (onSuccess) onSuccess(`Đã chặn người dùng @${targetUser.username} thành công.`)
      onClose()
    } catch (err) {
      console.error('Lỗi khi chặn người dùng:', err)
      setError(err.response?.data?.detail || 'Không thể chặn người dùng. Vui lòng thử lại.')
    } finally {
      setBlocking(false)
    }
  }

  const name = targetUser.display_name || targetUser.username

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1100,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          maxWidth: '440px',
          width: '100%',
          padding: '28px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'none',
            border: 'none',
            fontSize: '20px',
            color: '#9ca3af',
            cursor: 'pointer',
          }}
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              margin: '0 auto 12px auto',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: '#dc2626' }}>
              block
            </span>
          </div>
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 6px 0', color: '#1a1a2e' }}>
            Xác nhận chặn người dùng?
          </h3>
          <p style={{ fontSize: '14px', color: '#4b5563', margin: 0, lineHeight: '1.5' }}>
            Bạn có chắc chắn muốn chặn <strong>{name}</strong> (@{targetUser.username}) không?
          </p>
        </div>

        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fee2e2',
            borderRadius: '12px',
            padding: '12px 14px',
            fontSize: '12px',
            color: '#991b1b',
            lineHeight: '1.5',
            marginBottom: '20px',
          }}
        >
          <ul style={{ margin: 0, paddingLeft: '18px' }}>
            <li>Người này sẽ không thấy hồ sơ của bạn trên Khám phá.</li>
            <li>Hai bạn sẽ không thể gửi kết nối hay nhắn tin cho nhau.</li>
            <li>Chỉ bạn mới có thể mở khóa chặn này sau này.</li>
          </ul>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={blocking}
            className="btn-secondary"
            style={{ padding: '10px 18px', fontSize: '13px', flex: 1 }}
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleBlock}
            disabled={blocking}
            style={{
              flex: 1,
              backgroundColor: '#ef4444',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '10px 18px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: blocking ? 'not-allowed' : 'pointer',
              opacity: blocking ? 0.6 : 1,
              boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
            }}
          >
            {blocking ? 'Đang chặn...' : 'Chặn người này'}
          </button>
        </div>
      </div>
    </div>
  )
}

