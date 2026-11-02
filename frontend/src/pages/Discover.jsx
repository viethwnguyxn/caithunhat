import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ReportModal from '../components/ReportModal'
import BlockConfirmModal from '../components/BlockConfirmModal'
import { getMatches } from '../services/matchingService'
import {
  sendConnectionRequest,
  getMyConnections,
  getConnectionRequests,
} from '../services/connectionService'

const AGE_FILTER_OPTIONS = [
  'Tất cả độ tuổi',
  'Under 18',
  '18–20',
  '21–24',
  '25–29',
  '30–39',
  '40–49',
  '50+',
]

const STATUS_FILTER_OPTIONS = [
  'Tất cả tình trạng',
  'Sinh viên',
  'Đang đi làm',
  'Freelancer',
  'Đang tìm việc / Gap year',
]

const CONNECTION_TYPE_OPTIONS = [
  'Tất cả kiểu kết nối',
  'Kết nối bạn bè 1-1',
  'Nhóm bạn nhỏ cùng chung mục tiêu',
  'Người đồng hành học tập/công việc',
]

function Discover() {
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Trạng thái kết nối: { [userId]: 'accepted' | 'pending_sent' | 'pending_received' }
  const [connectionStatuses, setConnectionStatuses] = useState({})
  const [sendingConnectId, setSendingConnectId] = useState(null)

  // Bộ lọc
  const [selectedAge, setSelectedAge] = useState('Tất cả độ tuổi')
  const [selectedStatus, setSelectedStatus] = useState('Tất cả tình trạng')
  const [selectedConnType, setSelectedConnType] = useState('Tất cả kiểu kết nối')
  const [searchKeyword, setSearchKeyword] = useState('')

  // Modal xem chi tiết profile
  const [selectedUserForProfile, setSelectedUserForProfile] = useState(null)
  const [reportTargetUser, setReportTargetUser] = useState(null)
  const [blockTargetUser, setBlockTargetUser] = useState(null)

  // Thông báo khi bấm Kết nối hoặc Chặn
  const [connectToast, setConnectToast] = useState('')

  const handleBlockSuccess = (msg) => {
    if (blockTargetUser) {
      const blockedId = blockTargetUser.id
      setMatches((prev) => prev.filter((m) => m.user.id !== blockedId))
      setSelectedUserForProfile(null)
    }
    setBlockTargetUser(null)
    setConnectToast(msg)
  }

  const fetchMatches = async () => {
    setLoading(true)
    setError('')
    try {
      const [data, conns, reqs] = await Promise.all([
        getMatches(30),
        getMyConnections().catch(() => []),
        getConnectionRequests().catch(() => ({ incoming: [], outgoing: [] })),
      ])
      setMatches(data.matches || [])

      // Tạo map trạng thái kết nối
      const statusMap = {}
      conns.forEach((c) => {
        statusMap[c.user.id] = 'accepted'
      })
      reqs.outgoing?.forEach((r) => {
        statusMap[r.user.id] = 'pending_sent'
      })
      reqs.incoming?.forEach((r) => {
        statusMap[r.user.id] = 'pending_received'
      })
      setConnectionStatuses(statusMap)
    } catch (err) {
      console.error('Lỗi khi tải matches:', err)
      setError(
        err.response?.data?.detail ||
          'Không thể tải danh sách kết nối. Bạn hãy chắc chắn rằng đã hoàn thành Onboarding Survey!'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatches()
  }, [])

  // Phím Esc để đóng modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedUserForProfile(null)
      }
    }
    if (selectedUserForProfile) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedUserForProfile])

  // Lọc dữ liệu client-side nhanh chóng
  const filteredMatches = useMemo(() => {
    return matches.filter((item) => {
      const u = item.user
      // Lọc tuổi
      if (selectedAge !== 'Tất cả độ tuổi' && u.age_group !== selectedAge) {
        return false
      }
      // Lọc tình trạng
      if (selectedStatus !== 'Tất cả tình trạng' && u.current_status !== selectedStatus) {
        return false
      }
      // Lọc kiểu kết nối mong muốn
      if (
        selectedConnType !== 'Tất cả kiểu kết nối' &&
        !u.desired_connection_types?.includes(selectedConnType)
      ) {
        return false
      }
      // Lọc từ khóa tìm kiếm (theo tên, sở thích, mục tiêu)
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase()
        const matchName =
          u.display_name?.toLowerCase().includes(kw) ||
          u.username?.toLowerCase().includes(kw)
        const matchInterest = u.interests?.some((i) => i.toLowerCase().includes(kw))
        const matchGoal = u.goals?.some((g) => g.toLowerCase().includes(kw))
        if (!matchName && !matchInterest && !matchGoal) {
          return false
        }
      }
      return true
    })
  }, [matches, selectedAge, selectedStatus, selectedConnType, searchKeyword])

  const handleResetFilters = () => {
    setSelectedAge('Tất cả độ tuổi')
    setSelectedStatus('Tất cả tình trạng')
    setSelectedConnType('Tất cả kiểu kết nối')
    setSearchKeyword('')
  }

  const handleConnectClick = async (targetUser) => {
    setSendingConnectId(targetUser.id)
    try {
      await sendConnectionRequest(targetUser.id)
      setConnectionStatuses((prev) => ({
        ...prev,
        [targetUser.id]: 'pending_sent',
      }))
      setConnectToast(`Đã gửi lời mời kết nối tới ${targetUser.display_name || targetUser.username}! 🎉`)
      setTimeout(() => setConnectToast(''), 4000)
    } catch (err) {
      console.error('Lỗi khi gửi kết nối:', err)
      alert(err.response?.data?.detail || 'Không thể gửi lời mời kết nối. Vui lòng thử lại.')
    } finally {
      setSendingConnectId(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f7ff' }}>
      <Navbar />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>
        {/* Banner tiêu đề */}
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1a1a2e', marginBottom: '8px' }}>
            Khám phá những người <span style={{ color: '#7c5cbf' }}>đồng điệu</span>
          </h1>
          <p style={{ color: '#6b7280', fontSize: '15px', maxWidth: '600px', margin: '0 auto' }}>
            Hệ thống phân tích hồ sơ và khảo sát của bạn để tìm ra những người có hoàn cảnh, mục tiêu và sở thích tương đồng nhất.
          </p>
        </div>

        {/* Thông báo kết nối nhanh */}
        {connectToast && (
          <div className="alert alert-success" style={{ maxWidth: '600px', margin: '0 auto 20px auto', textAlign: 'center' }}>
            {connectToast}
          </div>
        )}

        {/* BỘ LỌC (Filter Bar) */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '32px',
            boxShadow: '0 2px 12px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          {/* Ô tìm kiếm từ khóa */}
          <div style={{ flex: '1 1 220px' }}>
            <input
              type="text"
              placeholder="Tìm theo tên, sở thích, mục tiêu..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid #e5e7eb',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Lọc nhóm tuổi */}
          <select
            value={selectedAge}
            onChange={(e) => setSelectedAge(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1.5px solid #e5e7eb',
              fontSize: '14px',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
            }}
          >
            {AGE_FILTER_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          {/* Lọc tình trạng */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1.5px solid #e5e7eb',
              fontSize: '14px',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
            }}
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          {/* Lọc kiểu kết nối */}
          <select
            value={selectedConnType}
            onChange={(e) => setSelectedConnType(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '10px',
              border: '1.5px solid #e5e7eb',
              fontSize: '14px',
              backgroundColor: '#ffffff',
              cursor: 'pointer',
            }}
          >
            {CONNECTION_TYPE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          {/* Nút reset */}
          {(selectedAge !== 'Tất cả độ tuổi' ||
            selectedStatus !== 'Tất cả tình trạng' ||
            selectedConnType !== 'Tất cả kiểu kết nối' ||
            searchKeyword.trim()) && (
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                padding: '10px 14px',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: '#f3f4f6',
                color: '#4b5563',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Đặt lại
            </button>
          )}
        </div>

        {/* 1. TRẠNG THÁI: LOADING */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid #e5e7eb',
                borderTop: '3px solid #7c5cbf',
                borderRadius: '50%',
                margin: '0 auto 16px auto',
                animation: 'spin 1s linear infinite',
              }}
            ></div>
            <p style={{ color: '#6b7280', fontSize: '15px' }}>
              Đang phân tích sở thích và tìm kiếm người phù hợp với bạn...
            </p>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* 2. TRẠNG THÁI: ERROR */}
        {!loading && error && (
          <div className="card" style={{ maxWidth: '500px', margin: '40px auto', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Không thể tải danh sách</h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>{error}</p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <Link to="/survey">
                <button className="btn-primary" style={{ padding: '10px 16px' }}>
                  Làm khảo sát Onboarding
                </button>
              </Link>
              <button
                type="button"
                onClick={fetchMatches}
                className="btn-secondary"
                style={{ padding: '10px 16px' }}
              >
                Thử lại
              </button>
            </div>
          </div>
        )}

        {/* 3. TRẠNG THÁI: EMPTY */}
        {!loading && !error && filteredMatches.length === 0 && (
          <div className="card" style={{ maxWidth: '540px', margin: '40px auto', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
              Không tìm thấy người phù hợp
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
              {matches.length === 0
                ? 'Hiện chưa có đủ người dùng hoàn thành khảo sát để gợi ý kết đôi. Hãy mời thêm bạn bè tham gia nhé!'
                : 'Không có ai khớp với các tiêu chí lọc hiện tại. Thử nới lỏng hoặc xóa bộ lọc xem sao!'}
            </p>
            {matches.length > 0 && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-primary"
                style={{ maxWidth: '200px', margin: '0 auto' }}
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        )}

        {/* 4. TRẠNG THÁI: NORMAL (Danh sách các thẻ kết nối) */}
        {!loading && !error && filteredMatches.length > 0 && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredMatches.map((item) => {
              const u = item.user
              const isHighMatch = item.match_score >= 60

              return (
                <div
                  key={u.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    padding: '24px',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: '1px solid #f3f4f6',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  <div>
                    {/* Header Thẻ: Avatar + Tên + Badge Tương đồng */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        {/* Avatar */}
                        <div
                          style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '50%',
                            backgroundColor: '#f5f0ff',
                            border: '2px solid #7c5cbf',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            fontSize: '20px',
                            fontWeight: 700,
                            color: '#7c5cbf',
                            flexShrink: 0,
                          }}
                        >
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt={u.display_name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              onError={(e) => { e.target.style.display = 'none' }}
                            />
                          ) : (
                            (u.display_name || u.username)[0].toUpperCase()
                          )}
                        </div>

                        {/* Tên & Username */}
                        <div>
                          <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
                            {u.display_name || u.username}
                          </h3>
                          <span style={{ fontSize: '13px', color: '#6b7280' }}>
                            @{u.username}
                          </span>
                        </div>
                      </div>

                      {/* Match Percentage Badge */}
                      <div
                        style={{
                          padding: '6px 12px',
                          borderRadius: '20px',
                          background: isHighMatch
                            ? 'linear-gradient(135deg, #7c5cbf, #9b7fe8)'
                            : '#f3f4f6',
                          color: isHighMatch ? '#ffffff' : '#374151',
                          fontSize: '13px',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          boxShadow: isHighMatch ? '0 2px 8px rgba(124, 92, 191, 0.3)' : 'none',
                        }}
                      >
                        <span>{item.match_score}%</span>
                        <span style={{ fontSize: '11px', opacity: 0.9 }}>Match</span>
                      </div>
                    </div>

                    {/* Tags: Độ tuổi & Tình trạng */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                      {u.age_group && (
                        <span
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#4b5563',
                          }}
                        >
                          {u.age_group}
                        </span>
                      )}
                      {u.current_status && (
                        <span
                          style={{
                            padding: '4px 10px',
                            backgroundColor: '#f3f4f6',
                            borderRadius: '12px',
                            fontSize: '12px',
                            color: '#4b5563',
                          }}
                        >
                          {u.current_status}
                        </span>
                      )}
                    </div>

                    {/* Bio ngắn gọn */}
                    {u.bio && (
                      <p
                        style={{
                          fontSize: '13px',
                          color: '#4b5563',
                          lineHeight: '1.5',
                          marginBottom: '14px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        "{u.bio}"
                      </p>
                    )}

                    {/* Lý do kết nối (Match reasons) */}
                    {item.match_reasons?.length > 0 && (
                      <div
                        style={{
                          backgroundColor: '#faf8ff',
                          border: '1px solid #f0ebfa',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          marginBottom: '14px',
                        }}
                      >
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c5cbf', textTransform: 'uppercase' }}>
                          Điểm tương đồng
                        </span>
                        <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px', fontSize: '12px', color: '#4b5563' }}>
                          {item.match_reasons.slice(0, 3).map((r, idx) => (
                            <li key={idx} style={{ marginBottom: '2px' }}>
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Sở thích chung (Common Interests) */}
                    {item.common_interests?.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '6px' }}>
                          Sở thích chung:
                        </span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {item.common_interests.map((ci, idx) => (
                            <span
                              key={idx}
                              style={{
                                padding: '3px 8px',
                                backgroundColor: '#f5f0ff',
                                border: '1px solid #e9d5ff',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 500,
                                color: '#7c5cbf',
                              }}
                            >
                              ★ {ci}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Hành động: Xem hồ sơ & Kết nối */}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f3f4f6' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedUserForProfile(item)}
                      className="btn-secondary"
                      style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                    >
                      Xem hồ sơ
                    </button>

                    {connectionStatuses[u.id] === 'accepted' ? (
                      <button
                        type="button"
                        disabled
                        style={{
                          flex: 1,
                          padding: '10px',
                          fontSize: '13px',
                          borderRadius: '8px',
                          border: '1px solid #a7f3d0',
                          backgroundColor: '#ecfdf5',
                          color: '#059669',
                          fontWeight: 600,
                          cursor: 'default',
                        }}
                      >
                        ✓ Bạn bè
                      </button>
                    ) : connectionStatuses[u.id] === 'pending_sent' ? (
                      <button
                        type="button"
                        disabled
                        style={{
                          flex: 1,
                          padding: '10px',
                          fontSize: '13px',
                          borderRadius: '8px',
                          border: '1px solid #fde68a',
                          backgroundColor: '#fef3c7',
                          color: '#b45309',
                          fontWeight: 600,
                          cursor: 'default',
                        }}
                      >
                        ⏳ Đang chờ
                      </button>
                    ) : connectionStatuses[u.id] === 'pending_received' ? (
                      <Link
                        to="/connections"
                        style={{
                          flex: 1,
                          padding: '10px',
                          fontSize: '13px',
                          borderRadius: '8px',
                          border: '1px solid #ddd6fe',
                          backgroundColor: '#f5f0ff',
                          color: '#7c5cbf',
                          fontWeight: 600,
                          textAlign: 'center',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        📬 Nhận lời mời
                      </Link>
                    ) : (
                      <button
                        type="button"
                        disabled={sendingConnectId === u.id}
                        onClick={() => handleConnectClick(u)}
                        className="btn-primary"
                        style={{ flex: 1, padding: '10px', fontSize: '13px', marginTop: 0 }}
                      >
                        {sendingConnectId === u.id ? 'Đang gửi...' : 'Kết nối'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL: XEM HỒ SƠ PUBLIC CỦA USER */}
      {selectedUserForProfile && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
          onClick={() => setSelectedUserForProfile(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '32px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng */}
            <button
              type="button"
              onClick={() => setSelectedUserForProfile(null)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                fontSize: '22px',
                color: '#9ca3af',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>

            {/* Avatar & Tên trong Modal */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '68px',
                  height: '68px',
                  borderRadius: '50%',
                  backgroundColor: '#f5f0ff',
                  border: '2px solid #7c5cbf',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  fontSize: '26px',
                  fontWeight: 700,
                  color: '#7c5cbf',
                  flexShrink: 0,
                }}
              >
                {selectedUserForProfile.user.avatar_url ? (
                  <img
                    src={selectedUserForProfile.user.avatar_url}
                    alt="Avatar"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  (selectedUserForProfile.user.display_name || selectedUserForProfile.user.username)[0].toUpperCase()
                )}
              </div>

              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>
                  {selectedUserForProfile.user.display_name || selectedUserForProfile.user.username}
                </h2>
                <div style={{ color: '#6b7280', fontSize: '14px', marginTop: '2px' }}>
                  @{selectedUserForProfile.user.username}
                </div>
                <div
                  style={{
                    display: 'inline-block',
                    marginTop: '6px',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: '#f5f0ff',
                    color: '#7c5cbf',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  {selectedUserForProfile.match_score}% Độ tương đồng với bạn
                </div>
              </div>
            </div>

            {/* Thông tin cơ bản */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {selectedUserForProfile.user.age_group && (
                <span style={{ padding: '6px 12px', borderRadius: '10px', backgroundColor: '#f3f4f6', fontSize: '13px' }}>
                  Độ tuổi: <strong>{selectedUserForProfile.user.age_group}</strong>
                </span>
              )}
              {selectedUserForProfile.user.current_status && (
                <span style={{ padding: '6px 12px', borderRadius: '10px', backgroundColor: '#f3f4f6', fontSize: '13px' }}>
                  Tình trạng: <strong>{selectedUserForProfile.user.current_status}</strong>
                </span>
              )}
            </div>

            {/* Giới thiệu (Bio) */}
            {selectedUserForProfile.user.bio && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Giới thiệu
                </h4>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', margin: 0 }}>
                  {selectedUserForProfile.user.bio}
                </p>
              </div>
            )}

            {/* Mục tiêu trong cộng đồng */}
            {selectedUserForProfile.user.goals?.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Mục tiêu tham gia
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedUserForProfile.user.goals.map((g, idx) => (
                    <span key={idx} style={{ padding: '4px 10px', borderRadius: '8px', backgroundColor: '#eef2ff', color: '#4338ca', fontSize: '12px' }}>
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tất cả sở thích & chủ đề */}
            {selectedUserForProfile.user.interests?.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '13px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Sở thích & Chủ đề quan tâm
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {selectedUserForProfile.user.interests.map((it, idx) => {
                    const isCommon = selectedUserForProfile.common_interests?.includes(it)
                    return (
                      <span
                        key={idx}
                        style={{
                          padding: '5px 10px',
                          borderRadius: '12px',
                          backgroundColor: isCommon ? '#f5f0ff' : '#f3f4f6',
                          border: isCommon ? '1px solid #c084fc' : '1px solid transparent',
                          color: isCommon ? '#7c5cbf' : '#4b5563',
                          fontSize: '12px',
                          fontWeight: isCommon ? 600 : 400,
                        }}
                      >
                        {isCommon ? `★ ${it}` : it}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Nút Kết nối từ trong Modal */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setSelectedUserForProfile(null)}
                className="btn-secondary"
                style={{ flex: 1, padding: '12px' }}
              >
                Đóng
              </button>

              {connectionStatuses[selectedUserForProfile.user.id] === 'accepted' ? (
                <button
                  type="button"
                  disabled
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #a7f3d0',
                    backgroundColor: '#ecfdf5',
                    color: '#059669',
                    fontWeight: 600,
                    cursor: 'default',
                  }}
                >
                  ✓ Đã kết nối bạn bè
                </button>
              ) : connectionStatuses[selectedUserForProfile.user.id] === 'pending_sent' ? (
                <button
                  type="button"
                  disabled
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #fde68a',
                    backgroundColor: '#fef3c7',
                    color: '#b45309',
                    fontWeight: 600,
                    cursor: 'default',
                  }}
                >
                  ⏳ Đang chờ phản hồi
                </button>
              ) : connectionStatuses[selectedUserForProfile.user.id] === 'pending_received' ? (
                <Link
                  to="/connections"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #ddd6fe',
                    backgroundColor: '#f5f0ff',
                    color: '#7c5cbf',
                    fontWeight: 600,
                    textAlign: 'center',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  📬 Trả lời lời mời
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={sendingConnectId === selectedUserForProfile.user.id}
                  onClick={async () => {
                    await handleConnectClick(selectedUserForProfile.user)
                    setSelectedUserForProfile(null)
                  }}
                  className="btn-primary"
                  style={{ flex: 1, padding: '12px', marginTop: 0 }}
                >
                  {sendingConnectId === selectedUserForProfile.user.id ? 'Đang gửi...' : 'Kết nối ngay'}
                </button>
              )}
            </div>

            {/* Tùy chọn an toàn: Báo cáo & Chặn */}
            <div
              style={{
                marginTop: '16px',
                paddingTop: '14px',
                borderTop: '1px solid #f3f4f6',
                display: 'flex',
                justifyContent: 'center',
                gap: '16px',
              }}
            >
              <button
                type="button"
                onClick={() => setReportTargetUser(selectedUserForProfile.user)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6b7280',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>🚩</span>
                <span>Báo cáo vi phạm</span>
              </button>
              <span style={{ color: '#d1d5db' }}>•</span>
              <button
                type="button"
                onClick={() => setBlockTargetUser(selectedUserForProfile.user)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>🚫</span>
                <span>Chặn người này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Báo cáo */}
      {reportTargetUser && (
        <ReportModal
          targetUser={reportTargetUser}
          onClose={() => setReportTargetUser(null)}
          onSuccess={(msg) => setConnectToast(msg)}
        />
      )}

      {/* Modal Xác nhận Chặn */}
      {blockTargetUser && (
        <BlockConfirmModal
          targetUser={blockTargetUser}
          onClose={() => setBlockTargetUser(null)}
          onSuccess={handleBlockSuccess}
        />
      )}
    </div>
  )
}

export default Discover
