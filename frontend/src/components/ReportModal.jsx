import { useState, useEffect } from 'react'
import { Flag, X } from 'lucide-react'
import { reportService } from '../services/reportService'

const REPORT_REASONS = [
  'Spam',
  'Quấy rối',
  'Lừa đảo',
  'Nội dung phản cảm',
  'Khác',
]

export default function ReportModal({ targetUser, onClose, onSuccess }) {
  const [reason, setReason] = useState('Spam')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!targetUser) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      await reportService.createReport({
        reported_id: targetUser.id,
        reason,
        description: description.trim() || null,
      })
      if (onSuccess) onSuccess('Báo cáo vi phạm đã được gửi thành công. Ban quản trị sẽ sớm xem xét!')
      onClose()
    } catch (err) {
      console.error('Lỗi khi gửi báo cáo:', err)
      setError(err.response?.data?.detail || 'Không thể gửi báo cáo. Vui lòng thử lại.')
    } finally {
      setSubmitting(false)
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
          maxWidth: '480px',
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
            color: '#9ca3af',
            cursor: 'pointer',
          }}
        >
          <X size={20} aria-hidden="true" />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
          <Flag size={22} color="#ef4444" aria-hidden="true" />
          <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#1a1a2e' }}>
            Báo cáo vi phạm
          </h3>
        </div>

        <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 18px 0', lineHeight: '1.5' }}>
          Bạn đang báo cáo người dùng <strong>{name}</strong> (@{targetUser.username}). Vui lòng cho biết lý do vi phạm:
        </p>

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

        <form onSubmit={handleSubmit}>
          {/* Lý do báo cáo */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>
              Lý do chính <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {REPORT_REASONS.map((r) => (
                <label
                  key={r}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: reason === r ? '1.5px solid #245745' : '1px solid #e5e7eb',
                    backgroundColor: reason === r ? '#f1f7f3' : '#ffffff',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: reason === r ? 600 : 400,
                    color: reason === r ? '#245745' : '#374151',
                  }}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    value={r}
                    checked={reason === r}
                    onChange={(e) => setReason(e.target.value)}
                    style={{ accentColor: '#245745' }}
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Mô tả chi tiết */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#374151', marginBottom: '6px' }}>
              Mô tả chi tiết (tùy chọn)
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Cung cấp thêm ngữ cảnh hoặc dẫn chứng nếu có..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                fontSize: '13px',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary"
              style={{ padding: '10px 18px', fontSize: '13px' }}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 20px',
                fontWeight: 600,
                fontSize: '13px',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.3)',
              }}
            >
              {submitting ? 'Đang gửi...' : 'Gửi báo cáo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
