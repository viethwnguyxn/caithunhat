import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ReportModal from '../components/ReportModal'
import BlockConfirmModal from '../components/BlockConfirmModal'
import {
  getMyConnections,
  getConnectionRequests,
  acceptConnection,
  rejectConnection,
  removeConnection,
} from '../services/connectionService'

export default function Connections() {
  const navigate = useNavigate()
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const initialTab = searchParams.get('tab') || location.state?.tab
  const [activeTab, setActiveTab] = useState(
    initialTab === 'received' || initialTab === 'sent' || initialTab === 'connections'
      ? initialTab
      : 'connections'
  ) // 'connections' | 'received' | 'sent'

  // Đồng bộ activeTab khi query param trên URL thay đổi (ví dụ điều hướng từ /discover sang ?tab=received)
  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab') || location.state?.tab
    if (tab && (tab === 'received' || tab === 'sent' || tab === 'connections')) {
      setActiveTab(tab)
    }
  }, [location.search, location.state])
  const [connections, setConnections] = useState([])
  const [receivedRequests, setReceivedRequests] = useState([])
  const [sentRequests, setSentRequests] = useState([])

  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null) // id đang xử lý
  const [error, setError] = useState('')
  const [toastMessage, setToastMessage] = useState('')

  // Modal Báo cáo & Chặn
  const [reportTargetUser, setReportTargetUser] = useState(null)
  const [blockTargetUser, setBlockTargetUser] = useState(null)
  const [openMenuUserId, setOpenMenuUserId] = useState(null)

  // Modal thông báo nhắn tin
  const [chatNoticeUser, setChatNoticeUser] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 4000)
  }

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const handleOutside = () => setOpenMenuUserId(null)
    if (openMenuUserId) {
      window.addEventListener('click', handleOutside)
      return () => window.removeEventListener('click', handleOutside)
    }
  }, [openMenuUserId])

  const handleBlockSuccess = (msg) => {
    if (blockTargetUser) {
      const blockedId = blockTargetUser.id
      setConnections((prev) => prev.filter((c) => c.user.id !== blockedId))
    }
    setBlockTargetUser(null)
    showToast(msg)
  }

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [connsData, reqsData] = await Promise.all([
        getMyConnections(),
        getConnectionRequests(),
      ])
      setConnections(connsData || [])
      setReceivedRequests(reqsData.incoming || [])
      setSentRequests(reqsData.outgoing || [])
    } catch (err) {
      console.error('Lỗi tải dữ liệu kết nối:', err)
      setError(
        err.response?.data?.detail || 'Không thể tải danh sách kết nối. Vui lòng thử lại sau.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Chấp nhận lời mời
  const handleAccept = async (conn) => {
    setActionLoading(conn.id)
    try {
      await acceptConnection(conn.id)
      // Cập nhật state lạc quan (optimistic update)
      setReceivedRequests((prev) => prev.filter((item) => item.id !== conn.id))
      setConnections((prev) => [
        { ...conn, status: 'accepted', updated_at: new Date().toISOString() },
        ...prev,
      ])
      showToast(`Đã trở thành bạn bè với ${conn.user.display_name || conn.user.username}! 🎉`)
    } catch (err) {
      console.error('Lỗi khi chấp nhận kết nối:', err)
      alert(err.response?.data?.detail || 'Không thể chấp nhận lời mời. Vui lòng thử lại.')
    } finally {
      setActionLoading(null)
    }
  }

  // Từ chối lời mời
  const handleReject = async (conn) => {
    if (!window.confirm(`Bạn có chắc muốn từ chối lời mời từ ${conn.user.display_name || conn.user.username}?`)) {
      return
    }
    setActionLoading(conn.id)
    try {
      await rejectConnection(conn.id)
      setReceivedRequests((prev) => prev.filter((item) => item.id !== conn.id))
      showToast(`Đã từ chối lời mời kết nối từ ${conn.user.display_name || conn.user.username}.`)
    } catch (err) {
      console.error('Lỗi khi từ chối kết nối:', err)
      alert(err.response?.data?.detail || 'Không thể từ chối lời mời. Vui lòng thử lại.')
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemoveFriend = async (conn) => {
    const name = conn.user.display_name || conn.user.username
    setOpenMenuUserId(null)
    if (!window.confirm(`Gỡ ${name} khỏi danh sách bạn bè? Người này sẽ không nhận được thông báo.`)) {
      return
    }

    setActionLoading(conn.id)
    try {
      await removeConnection(conn.id)
      setConnections((current) => current.filter((item) => item.id !== conn.id))
      showToast(`Đã gỡ ${name} khỏi danh sách bạn bè.`)
    } catch (err) {
      console.error('Lỗi khi gỡ bạn bè:', err)
      alert(err.response?.data?.detail || 'Không thể gỡ bạn bè. Vui lòng thử lại.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f7faf8' }}>
      <Navbar />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 16px' }}>
        {/* Banner tiêu đề */}
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1a1a2e', marginBottom: '8px' }}>
            Kết nối & <span style={{ color: '#245745' }}>Bạn bè</span>
          </h1>
          <p style={{ color: '#6b7280', fontSize: '15px' }}>
            Quản lý mạng lưới bạn bè đồng điệu và những lời mời kết nối của bạn.
          </p>
        </div>

        {/* Toast thông báo nhanh */}
        {toastMessage && (
          <div
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: '12px',
              marginBottom: '20px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'fadeIn 0.3s ease-in-out',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500, fontSize: '14px' }}>
              <span>✓</span>
              <span>{toastMessage}</span>
            </div>
            <button
              onClick={() => setToastMessage('')}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Thông báo lỗi nếu có */}
        {error && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '16px',
              borderRadius: '12px',
              marginBottom: '24px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>{error}</span>
            <button
              onClick={loadData}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Tabs chuyển đổi */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            backgroundColor: '#ffffff',
            padding: '6px',
            borderRadius: '16px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            marginBottom: '24px',
            border: '1px solid #dce8e2',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('connections')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: activeTab === 'connections' ? '#245745' : 'transparent',
              color: activeTab === 'connections' ? '#ffffff' : '#6b7280',
            }}
          >
            <span>Bạn bè</span>
            <span
              style={{
                backgroundColor: activeTab === 'connections' ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                color: activeTab === 'connections' ? '#ffffff' : '#374151',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '12px',
              }}
            >
              {connections.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('received')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: activeTab === 'received' ? '#245745' : 'transparent',
              color: activeTab === 'received' ? '#ffffff' : '#6b7280',
            }}
          >
            <span>Lời mời nhận được</span>
            {receivedRequests.length > 0 && (
              <span
                style={{
                  backgroundColor: activeTab === 'received' ? '#ef4444' : '#fee2e2',
                  color: activeTab === 'received' ? '#ffffff' : '#b91c1c',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {receivedRequests.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sent')}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: activeTab === 'sent' ? '#245745' : 'transparent',
              color: activeTab === 'sent' ? '#ffffff' : '#6b7280',
            }}
          >
            <span>Đã gửi</span>
            <span
              style={{
                backgroundColor: activeTab === 'sent' ? 'rgba(255,255,255,0.25)' : '#e5e7eb',
                color: activeTab === 'sent' ? '#ffffff' : '#374151',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '12px',
              }}
            >
              {sentRequests.length}
            </span>
          </button>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              border: '1px solid #dce8e2',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '4px solid #dce8e2',
                borderTop: '4px solid #245745',
                borderRadius: '50%',
                margin: '0 auto 16px',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ color: '#6b7280', fontSize: '15px' }}>Đang tải danh sách kết nối...</p>
          </div>
        )}

        {/* NỘI DUNG TỪNG TAB */}
        {!loading && (
          <div>
            {/* TAB 1: BẠN BÈ (MY CONNECTIONS) */}
            {activeTab === 'connections' && (
              <div>
                {connections.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '60px 20px',
                      backgroundColor: '#ffffff',
                      borderRadius: '20px',
                      border: '1px solid #dce8e2',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤝</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>
                      Chưa có bạn bè nào
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '420px', margin: '0 auto 20px' }}>
                      Bạn chưa kết nối với ai. Hãy vào trang Khám phá để tìm những người bạn có cùng hoàn cảnh và sở thích nhé!
                    </p>
                    <Link
                      to="/discover"
                      className="btn-primary"
                      style={{
                        display: 'inline-block',
                        padding: '10px 24px',
                        fontSize: '14px',
                        textDecoration: 'none',
                      }}
                    >
                      Khám phá ngay ✨
                    </Link>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: '16px' }}>
                    {connections.map((item) => {
                      const u = item.user
                      return (
                        <div
                          key={item.id}
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            padding: '20px',
                            border: '1px solid #dce8e2',
                            boxShadow: '0 4px 16px rgba(36, 87, 69, 0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
                              <img
                                src={
                                  u.avatar_url ||
                                  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.username)}`
                                }
                                alt={u.display_name || u.username}
                                style={{
                                  width: '56px',
                                  height: '56px',
                                  borderRadius: '50%',
                                  border: '2px solid #245745',
                                  objectFit: 'cover',
                                  backgroundColor: '#e1efe8',
                                }}
                              />
                              <div>
                                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
                                  {u.display_name || u.username}
                                </h3>
                                <p style={{ fontSize: '13px', color: '#6b7280', margin: '2px 0 0 0' }}>
                                  @{u.username}
                                </p>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#059669',
                                    backgroundColor: '#ecfdf5',
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    marginTop: '4px',
                                  }}
                                >
                                  ✓ Đã kết nối
                                </span>
                              </div>
                            </div>

                            {/* Thông tin thêm */}
                            {(u.age_group || u.current_status) && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                                {u.age_group && (
                                  <span
                                    style={{
                                      fontSize: '12px',
                                      backgroundColor: '#f3f4f6',
                                      color: '#4b5563',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                    }}
                                  >
                                    🎂 {u.age_group}
                                  </span>
                                )}
                                {u.current_status && (
                                  <span
                                    style={{
                                      fontSize: '12px',
                                      backgroundColor: '#eff6ff',
                                      color: '#2563eb',
                                      padding: '3px 8px',
                                      borderRadius: '6px',
                                    }}
                                  >
                                    💼 {u.current_status}
                                  </span>
                                )}
                              </div>
                            )}

                            {u.bio && (
                              <p
                                style={{
                                  fontSize: '13px',
                                  color: '#4b5563',
                                  lineHeight: '1.4',
                                  margin: '0 0 16px 0',
                                  fontStyle: 'italic',
                                }}
                              >
                                "{u.bio}"
                              </p>
                            )}
                          </div>

                          {/* Nút hành động */}
                          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '14px', display: 'flex', gap: '8px', position: 'relative' }}>
                            <button
                              type="button"
                              onClick={() => navigate(`/messages?userId=${u.id}`)}
                              style={{
                                flex: 1,
                                padding: '10px',
                                borderRadius: '10px',
                                border: '1px solid #245745',
                                backgroundColor: '#245745',
                                color: '#ffffff',
                                fontWeight: 600,
                                fontSize: '13px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 2px 8px rgba(36, 87, 69, 0.25)',
                              }}
                            >
                              <span>💬</span>
                              <span>Nhắn tin</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuUserId(openMenuUserId === u.id ? null : u.id)
                              }}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: '1px solid #e5e7eb',
                                backgroundColor: '#ffffff',
                                color: '#4b5563',
                                fontSize: '16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Tùy chọn an toàn"
                            >
                              ⋮
                            </button>

                            {openMenuUserId === u.id && (
                              <div
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  bottom: '50px',
                                  backgroundColor: '#ffffff',
                                  borderRadius: '12px',
                                  boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
                                  border: '1px solid #f3f4f6',
                                  minWidth: '160px',
                                  zIndex: 50,
                                  padding: '6px',
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  disabled={actionLoading === item.id}
                                  onClick={() => handleRemoveFriend(item)}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    background: 'none',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    color: '#b45309',
                                    cursor: actionLoading === item.id ? 'wait' : 'pointer',
                                    textAlign: 'left',
                                    opacity: actionLoading === item.id ? 0.6 : 1,
                                  }}
                                  onMouseOver={(e) => {
                                    if (actionLoading !== item.id) e.currentTarget.style.backgroundColor = '#fffbeb'
                                  }}
                                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <span>👋</span>
                                  <span>Gỡ bạn bè</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuUserId(null)
                                    setReportTargetUser(u)
                                  }}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    background: 'none',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    color: '#374151',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                  }}
                                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <span>🚩</span>
                                  <span>Báo cáo</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenMenuUserId(null)
                                    setBlockTargetUser(u)
                                  }}
                                  style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '8px 12px',
                                    background: 'none',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '13px',
                                    color: '#dc2626',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                  }}
                                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                  <span>🚫</span>
                                  <span>Chặn bạn này</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: LỜI MỜI NHẬN ĐƯỢC (REQUESTS RECEIVED) */}
            {activeTab === 'received' && (
              <div>
                {receivedRequests.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '60px 20px',
                      backgroundColor: '#ffffff',
                      borderRadius: '20px',
                      border: '1px solid #dce8e2',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>
                      Không có lời mời nào
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                      Hiện tại không có lời mời kết nối nào đang chờ bạn duyệt.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {receivedRequests.map((item) => {
                      const u = item.user
                      const isProcessing = actionLoading === item.id
                      return (
                        <div
                          key={item.id}
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            padding: '20px',
                            border: '1px solid #dce8e2',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '16px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <img
                              src={
                                u.avatar_url ||
                                `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.username)}`
                              }
                              alt={u.display_name || u.username}
                              style={{
                                width: '54px',
                                height: '54px',
                                borderRadius: '50%',
                                border: '2px solid #245745',
                                objectFit: 'cover',
                                backgroundColor: '#e1efe8',
                              }}
                            />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
                                  {u.display_name || u.username}
                                </h4>
                                <span style={{ fontSize: '13px', color: '#6b7280' }}>@{u.username}</span>
                              </div>
                              <p style={{ fontSize: '13px', color: '#4b5563', margin: '4px 0 0 0' }}>
                                {u.bio || (u.current_status ? `Tình trạng: ${u.current_status}` : 'Muốn kết nối cùng bạn')}
                              </p>
                              <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                Gửi lúc: {new Date(item.created_at).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          </div>

                          {/* Nút Accept & Reject */}
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleReject(item)}
                              style={{
                                padding: '8px 18px',
                                borderRadius: '10px',
                                border: '1px solid #d1d5db',
                                backgroundColor: '#ffffff',
                                color: '#4b5563',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                opacity: isProcessing ? 0.6 : 1,
                              }}
                            >
                              Từ chối
                            </button>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleAccept(item)}
                              style={{
                                padding: '8px 20px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: '#245745',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                opacity: isProcessing ? 0.6 : 1,
                                boxShadow: '0 2px 8px rgba(36, 87, 69, 0.3)',
                              }}
                            >
                              {isProcessing ? 'Đang xử lý...' : 'Chấp nhận'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ĐÃ GỬI (REQUESTS SENT) */}
            {activeTab === 'sent' && (
              <div>
                {sentRequests.length === 0 ? (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '60px 20px',
                      backgroundColor: '#ffffff',
                      borderRadius: '20px',
                      border: '1px solid #dce8e2',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    }}
                  >
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>📤</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>
                      Chưa gửi lời mời nào
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
                      Bạn chưa gửi lời mời kết nối nào đang chờ phản hồi.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {sentRequests.map((item) => {
                      const u = item.user
                      return (
                        <div
                          key={item.id}
                          style={{
                            backgroundColor: '#ffffff',
                            borderRadius: '16px',
                            padding: '20px',
                            border: '1px solid #dce8e2',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '16px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <img
                              src={
                                u.avatar_url ||
                                `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.username)}`
                              }
                              alt={u.display_name || u.username}
                              style={{
                                width: '54px',
                                height: '54px',
                                borderRadius: '50%',
                                border: '2px solid #cbd5e1',
                                objectFit: 'cover',
                                backgroundColor: '#f8fafc',
                              }}
                            />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
                                  {u.display_name || u.username}
                                </h4>
                                <span style={{ fontSize: '13px', color: '#6b7280' }}>@{u.username}</span>
                              </div>
                              <p style={{ fontSize: '13px', color: '#4b5563', margin: '4px 0 0 0' }}>
                                {u.bio || (u.current_status ? `Tình trạng: ${u.current_status}` : 'Đã gửi lời mời')}
                              </p>
                              <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                Gửi lúc: {new Date(item.created_at).toLocaleDateString('vi-VN')}
                              </span>
                            </div>
                          </div>

                          {/* Badge trạng thái Pending */}
                          <div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                backgroundColor: '#fffbeb',
                                border: '1px solid #fef3c7',
                                color: '#b45309',
                                fontSize: '13px',
                                fontWeight: 600,
                              }}
                            >
                              <span
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  backgroundColor: '#f59e0b',
                                }}
                              />
                              Đang chờ phản hồi
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL THÔNG BÁO TÍNH NĂNG NHẮN TIN (TASK 11) */}
      {chatNoticeUser && (
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
          onClick={() => setChatNoticeUser(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
              textAlign: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: '#e1efe8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                margin: '0 auto 16px',
              }}
            >
              💬
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#1a1a2e', marginBottom: '8px' }}>
              Trò chuyện cùng {chatNoticeUser.display_name || chatNoticeUser.username}
            </h3>

            <p style={{ color: '#4b5563', fontSize: '14px', lineHeight: '1.6', marginBottom: '20px' }}>
              Hai bạn đã kết nối thành công! Tính năng <strong>Nhắn tin Realtime 1-1 qua WebSocket</strong> đang được hoàn thiện ở <strong>TASK 11</strong> theo đúng lộ trình sản phẩm.
            </p>

            <div
              style={{
                backgroundColor: '#faf5ff',
                borderRadius: '12px',
                padding: '14px',
                marginBottom: '24px',
                border: '1px dashed #c084fc',
                fontSize: '13px',
                color: '#6b21a8',
                textAlign: 'left',
              }}
            >
              🚀 <strong>Sắp ra mắt tại Task 11:</strong>
              <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                <li>Trò chuyện trực tiếp realtime qua WebSocket</li>
                <li>Lịch sử tin nhắn được lưu trữ bảo mật</li>
                <li>Thông báo trạng thái đọc / nhận tin nhắn</li>
              </ul>
            </div>

            <button
              type="button"
              onClick={() => setChatNoticeUser(null)}
              className="btn-primary"
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
            >
              Tuyệt vời, tôi đã hiểu!
            </button>
          </div>
        </div>
      )}

      {/* Modal Báo cáo vi phạm */}
      {reportTargetUser && (
        <ReportModal
          targetUser={reportTargetUser}
          onClose={() => setReportTargetUser(null)}
          onSuccess={(msg) => showToast(msg)}
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
