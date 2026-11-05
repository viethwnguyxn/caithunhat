import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import { adminService } from '../services/adminService'
import Avatar from '../components/Avatar'

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Tabs: 'users' | 'reports'
  const [activeTab, setActiveTab] = useState('users')

  // Stats
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  // Users Tab state
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [togglingUserId, setTogglingUserId] = useState(null)

  // Reports Tab state
  const [reports, setReports] = useState([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [reportStatusFilter, setReportStatusFilter] = useState('pending') // 'pending' | 'resolved' | 'dismissed' | 'all'
  const [processingReportId, setProcessingReportId] = useState(null)

  // Modal xử lý vi phạm
  const [selectedReportForAction, setSelectedReportForAction] = useState(null)
  const [lockReportedUserCheck, setLockReportedUserCheck] = useState(true)

  // Thông báo toast
  const [toastMsg, setToastMsg] = useState('')
  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4000)
  }

  // 1. Tải Stats
  const loadStats = async () => {
    setLoadingStats(true)
    try {
      const data = await adminService.getStats()
      setStats(data)
    } catch (err) {
      console.error('Lỗi khi tải thống kê:', err)
    } finally {
      setLoadingStats(false)
    }
  }

  // 2. Tải danh sách Người dùng
  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const data = await adminService.getUsers({
        search: userSearch,
        role: userRoleFilter,
      })
      setUsers(data || [])
    } catch (err) {
      console.error('Lỗi tải danh sách người dùng:', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  // 3. Tải danh sách Báo cáo vi phạm
  const loadReports = async () => {
    setLoadingReports(true)
    try {
      const data = await adminService.getReports(reportStatusFilter)
      setReports(data || [])
    } catch (err) {
      console.error('Lỗi tải danh sách báo cáo:', err)
    } finally {
      setLoadingReports(false)
    }
  }

  useEffect(() => {
    if (user && user.role === 'admin') {
      loadStats()
    }
  }, [user])

  useEffect(() => {
    if (user && user.role === 'admin') {
      if (activeTab === 'users') {
        loadUsers()
      } else {
        loadReports()
      }
    }
  }, [activeTab, userRoleFilter, reportStatusFilter, user])

  // Xử lý tìm kiếm với debounce nhỏ
  useEffect(() => {
    if (activeTab === 'users' && user && user.role === 'admin') {
      const timer = setTimeout(() => {
        loadUsers()
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [userSearch])

  // Khóa / Mở khóa người dùng
  const handleToggleUserStatus = async (targetUser) => {
    if (targetUser.id === user?.id) {
      alert('Bạn không thể tự khóa tài khoản của chính mình!')
      return
    }

    const actionText = targetUser.is_active ? 'KHÓA' : 'MỞ KHÓA'
    if (!window.confirm(`Bạn có chắc muốn ${actionText} tài khoản @${targetUser.username}?`)) {
      return
    }

    setTogglingUserId(targetUser.id)
    try {
      const res = await adminService.toggleUserStatus(targetUser.id)
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, is_active: res.is_active } : u))
      )
      loadStats()
      showToast(res.message)
    } catch (err) {
      alert(err.response?.data?.detail || 'Không thể thay đổi trạng thái tài khoản')
    } finally {
      setTogglingUserId(null)
    }
  }

  // Bác bỏ báo cáo
  const handleDismissReport = async (report) => {
    if (!window.confirm(`Bác bỏ đơn báo cáo #${report.id}?`)) return
    setProcessingReportId(report.id)
    try {
      await adminService.updateReport(report.id, {
        status: 'dismissed',
        lock_reported_user: false,
      })
      setReports((prev) =>
        prev.map((r) => (r.id === report.id ? { ...r, status: 'dismissed' } : r))
      )
      loadStats()
      showToast(`Đã bác bỏ báo cáo #${report.id}.`)
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi khi xử lý báo cáo')
    } finally {
      setProcessingReportId(null)
    }
  }

  // Xác nhận xử lý vi phạm (Resolved)
  const handleConfirmResolve = async () => {
    if (!selectedReportForAction) return
    setProcessingReportId(selectedReportForAction.id)
    try {
      await adminService.updateReport(selectedReportForAction.id, {
        status: 'resolved',
        lock_reported_user: lockReportedUserCheck,
      })
      setReports((prev) =>
        prev.map((r) =>
          r.id === selectedReportForAction.id ? { ...r, status: 'resolved' } : r
        )
      )
      setSelectedReportForAction(null)
      loadStats()
      showToast(`Đã xử lý vi phạm báo cáo #${selectedReportForAction.id} thành công!`)
    } catch (err) {
      alert(err.response?.data?.detail || 'Lỗi khi xử lý báo cáo')
    } finally {
      setProcessingReportId(null)
    }
  }

  // GUARD: Nếu không phải Admin
  if (user && user.role !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#f8f7ff' }}>
        <Navbar />
        <div style={{ maxWidth: '520px', margin: '80px auto', padding: '0 16px', textAlign: 'center' }}>
          <div className="card" style={{ padding: '40px 24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1a1a2e', marginBottom: '8px' }}>
              Truy cập bị từ chối
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              Trang này chỉ dành riêng cho Quản trị viên hệ thống (Admin). Tài khoản hiện tại của bạn không có quyền truy cập.
            </p>
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="btn-primary"
              style={{ width: '100%', padding: '12px' }}
            >
              Trở về Trang chủ
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f7ff' }}>
      <Navbar />

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 16px' }}>
        {/* Banner tiêu đề */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '22px' }}>⚙️</span>
              <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1a1a2e', margin: 0 }}>
                Hệ thống Quản trị viên (Admin)
              </h1>
            </div>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
              Quản lý tài khoản người dùng và kiểm duyệt an toàn cộng đồng Kindred
            </p>
          </div>

          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '20px',
              backgroundColor: '#faf5ff',
              border: '1px solid #d8b4fe',
              color: '#7c5cbf',
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <span>👑 Quyền: Administrator</span>
          </div>
        </div>

        {/* THẺ THỐNG KÊ (STATS CARDS) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#f5f0ff', color: '#7c5cbf', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
              👥
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                Tổng Người Dùng
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a2e', marginTop: '2px' }}>
                {loadingStats ? '...' : stats?.total_users ?? 0}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
              🟢
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                Đang Hoạt Động
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#059669', marginTop: '2px' }}>
                {loadingStats ? '...' : stats?.active_users ?? 0}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#fef2f2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
              🔒
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                Tài Khoản Bị Khóa
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>
                {loadingStats ? '...' : stats?.locked_users ?? 0}
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', backgroundColor: '#fffbeb', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
              🚩
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                Vi Phạm Chờ Duyệt
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#b45309', marginTop: '2px' }}>
                {loadingStats ? '...' : stats?.pending_reports ?? 0}
              </div>
            </div>
          </div>
        </div>

        {/* THANH CHUYỂN TAB CHÍNH */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#ffffff',
            padding: '6px',
            borderRadius: '16px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
            marginBottom: '24px',
            border: '1px solid #ede9fe',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: activeTab === 'users' ? '#7c5cbf' : 'transparent',
              color: activeTab === 'users' ? '#ffffff' : '#6b7280',
              transition: 'all 0.2s ease',
            }}
          >
            <span>👥 Quản lý Người dùng</span>
            <span
              style={{
                backgroundColor: activeTab === 'users' ? 'rgba(255,255,255,0.2)' : '#f3f4f6',
                color: activeTab === 'users' ? '#ffffff' : '#4b5563',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '12px',
              }}
            >
              {stats?.total_users ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '12px',
              border: 'none',
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: activeTab === 'reports' ? '#7c5cbf' : 'transparent',
              color: activeTab === 'reports' ? '#ffffff' : '#6b7280',
              transition: 'all 0.2s ease',
            }}
          >
            <span>🚩 Báo cáo Vi phạm</span>
            {(stats?.pending_reports ?? 0) > 0 && (
              <span
                style={{
                  backgroundColor: activeTab === 'reports' ? '#ef4444' : '#fee2e2',
                  color: activeTab === 'reports' ? '#ffffff' : '#b91c1c',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                {stats.pending_reports} mới
              </span>
            )}
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: QUẢN LÝ NGƯỜI DÙNG                                  */}
        {/* ========================================================= */}
        {activeTab === 'users' && (
          <div className="card" style={{ padding: '24px' }}>
            {/* Bộ lọc & tìm kiếm */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
                <input
                  type="text"
                  placeholder="Tìm theo username hoặc email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid #d1d5db',
                    fontSize: '13px',
                    backgroundColor: '#ffffff',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="">Tất cả vai trò</option>
                  <option value="user">Thành viên (User)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                </select>
              </div>
            </div>

            {/* Bảng danh sách người dùng */}
            {loadingUsers ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                Đang tải danh sách người dùng...
              </div>
            ) : users.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                Không tìm thấy người dùng nào phù hợp.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #ede9fe', color: '#6b7280' }}>
                      <th style={{ padding: '12px 14px' }}>Người dùng</th>
                      <th style={{ padding: '12px 14px' }}>Email</th>
                      <th style={{ padding: '12px 14px' }}>Vai trò</th>
                      <th style={{ padding: '12px 14px' }}>Trạng thái</th>
                      <th style={{ padding: '12px 14px' }}>Ngày tham gia</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const isMe = u.id === user?.id
                      return (
                        <tr
                          key={u.id}
                          style={{
                            borderBottom: '1px solid #f3f4f6',
                            transition: 'background 0.15s ease',
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#faf9fe')}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <Avatar
                                src={u.avatar_url}
                                alt={u.username}
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '1.5px solid #7c5cbf',
                                }}
                              />
                              <div>
                                <div style={{ fontWeight: 700, color: '#1a1a2e' }}>
                                  {u.display_name || u.username} {isMe && <span style={{ color: '#7c5cbf', fontSize: '11px' }}>(Tôi)</span>}
                                </div>
                                <div style={{ color: '#6b7280', fontSize: '12px' }}>@{u.username}</div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '12px 14px', color: '#4b5563' }}>{u.email}</td>

                          <td style={{ padding: '12px 14px' }}>
                            {u.role === 'admin' ? (
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  backgroundColor: '#faf5ff',
                                  border: '1px solid #d8b4fe',
                                  color: '#7c5cbf',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                }}
                              >
                                👑 Admin
                              </span>
                            ) : (
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  backgroundColor: '#f3f4f6',
                                  color: '#4b5563',
                                  fontSize: '11px',
                                }}
                              >
                                Thành viên
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '12px 14px' }}>
                            {u.is_active ? (
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  backgroundColor: '#ecfdf5',
                                  color: '#059669',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }}
                              >
                                ✓ Hoạt động
                              </span>
                            ) : (
                              <span
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '8px',
                                  backgroundColor: '#fee2e2',
                                  color: '#dc2626',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }}
                              >
                                🔒 Bị khóa
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '12px 14px', color: '#6b7280', fontSize: '12px' }}>
                            {new Date(u.created_at).toLocaleDateString('vi-VN')}
                          </td>

                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            {isMe ? (
                              <span style={{ fontSize: '12px', color: '#9ca3af' }}>Tài khoản của bạn</span>
                            ) : (
                              <button
                                type="button"
                                disabled={togglingUserId === u.id}
                                onClick={() => handleToggleUserStatus(u)}
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  border: u.is_active ? '1px solid #fee2e2' : '1px solid #a7f3d0',
                                  backgroundColor: u.is_active ? '#fff5f5' : '#ecfdf5',
                                  color: u.is_active ? '#dc2626' : '#059669',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  cursor: togglingUserId === u.id ? 'not-allowed' : 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                {togglingUserId === u.id
                                  ? 'Đang xử lý...'
                                  : u.is_active
                                  ? 'Khóa tài khoản'
                                  : 'Mở khóa'}
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: KIỂM DUYỆT BÁO CÁO VI PHẠM (REPORTS MODERATION)      */}
        {/* ========================================================= */}
        {activeTab === 'reports' && (
          <div className="card" style={{ padding: '24px' }}>
            {/* Lọc theo trạng thái báo cáo */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[
                { key: 'pending', label: '⏳ Chờ xử lý' },
                { key: 'resolved', label: '✓ Đã xử lý vi phạm' },
                { key: 'dismissed', label: '✕ Đã bác bỏ' },
                { key: 'all', label: 'Tất cả đơn' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setReportStatusFilter(tab.key)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '10px',
                    border: '1px solid',
                    borderColor: reportStatusFilter === tab.key ? '#7c5cbf' : '#e5e7eb',
                    backgroundColor: reportStatusFilter === tab.key ? '#f5f0ff' : '#ffffff',
                    color: reportStatusFilter === tab.key ? '#7c5cbf' : '#4b5563',
                    fontSize: '13px',
                    fontWeight: reportStatusFilter === tab.key ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {loadingReports ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                Đang tải danh sách báo cáo...
              </div>
            ) : reports.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
                <p style={{ margin: 0 }}>Không có đơn báo cáo vi phạm nào trong danh mục này.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {reports.map((r) => {
                  const isPending = r.status === 'pending'
                  const isResolved = r.status === 'resolved'
                  const isDismissed = r.status === 'dismissed'

                  return (
                    <div
                      key={r.id}
                      style={{
                        padding: '18px',
                        borderRadius: '14px',
                        border: '1px solid #f3f4f6',
                        backgroundColor: isPending ? '#faf8ff' : '#ffffff',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span
                            style={{
                              padding: '4px 10px',
                              borderRadius: '8px',
                              backgroundColor: '#fee2e2',
                              color: '#b91c1c',
                              fontSize: '12px',
                              fontWeight: 700,
                            }}
                          >
                            🚩 {r.reason}
                          </span>
                          <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                            Đơn #{r.id} • {new Date(r.created_at).toLocaleString('vi-VN')}
                          </span>
                        </div>

                        <div>
                          {isPending && (
                            <span style={{ padding: '3px 8px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#b45309', fontSize: '11px', fontWeight: 600 }}>
                              ⏳ Chờ xử lý
                            </span>
                          )}
                          {isResolved && (
                            <span style={{ padding: '3px 8px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', fontSize: '11px', fontWeight: 600 }}>
                              ✓ Đã xử lý vi phạm
                            </span>
                          )}
                          {isDismissed && (
                            <span style={{ padding: '3px 8px', borderRadius: '8px', backgroundColor: '#f3f4f6', color: '#6b7280', fontSize: '11px', fontWeight: 600 }}>
                              ✕ Đã bác bỏ
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Thông tin 2 bên */}
                      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px' }}>
                        <div>
                          <span style={{ color: '#6b7280' }}>Người báo cáo: </span>
                          <strong style={{ color: '#1a1a2e' }}>
                            {r.reporter.display_name || r.reporter.username} (@{r.reporter.username})
                          </strong>
                        </div>
                        <div>
                          <span style={{ color: '#6b7280' }}>Người bị tố cáo: </span>
                          <strong style={{ color: '#dc2626' }}>
                            {r.reported.display_name || r.reported.username} (@{r.reported.username})
                          </strong>
                          {!r.reported.is_active && (
                            <span style={{ marginLeft: '6px', fontSize: '11px', color: '#ef4444' }}>(Đang bị khóa)</span>
                          )}
                        </div>
                      </div>

                      {/* Chi tiết nội dung vi phạm */}
                      {r.description && (
                        <div
                          style={{
                            padding: '10px 14px',
                            borderRadius: '10px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #f3f4f6',
                            fontSize: '13px',
                            color: '#374151',
                            lineHeight: '1.5',
                          }}
                        >
                          <strong>Mô tả:</strong> {r.description}
                        </div>
                      )}

                      {/* Nút thao tác của Admin */}
                      {isPending && (
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                          <button
                            type="button"
                            disabled={processingReportId === r.id}
                            onClick={() => handleDismissReport(r)}
                            className="btn-secondary"
                            style={{ padding: '8px 16px', fontSize: '12.5px' }}
                          >
                            Bác bỏ báo cáo
                          </button>

                          <button
                            type="button"
                            disabled={processingReportId === r.id}
                            onClick={() => {
                              setSelectedReportForAction(r)
                              setLockReportedUserCheck(true)
                            }}
                            style={{
                              backgroundColor: '#ef4444',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '8px 16px',
                              fontWeight: 600,
                              fontSize: '12.5px',
                              cursor: 'pointer',
                              boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)',
                            }}
                          >
                            Xác nhận vi phạm
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL XÁC NHẬN XỬ LÝ VI PHẠM */}
      {selectedReportForAction && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
            padding: '16px',
          }}
          onClick={() => setSelectedReportForAction(null)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '460px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px 0', color: '#1a1a2e' }}>
              Xác nhận xử lý vi phạm #{selectedReportForAction.id}
            </h3>
            <p style={{ fontSize: '14px', color: '#4b5563', lineHeight: '1.5', margin: '0 0 16px 0' }}>
              Bạn đang xác nhận tài khoản <strong>@{selectedReportForAction.reported.username}</strong> có hành vi vi phạm ({selectedReportForAction.reason}).
            </p>

            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px',
                borderRadius: '10px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fee2e2',
                cursor: 'pointer',
                marginBottom: '24px',
              }}
            >
              <input
                type="checkbox"
                checked={lockReportedUserCheck}
                onChange={(e) => setLockReportedUserCheck(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#ef4444' }}
              />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#991b1b' }}>
                Khóa luôn tài khoản của người vi phạm này
              </span>
            </label>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setSelectedReportForAction(null)}
                className="btn-secondary"
                style={{ padding: '10px 18px', fontSize: '13px' }}
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                disabled={processingReportId === selectedReportForAction.id}
                style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '10px 20px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {processingReportId ? 'Đang duyệt...' : 'Xác nhận xử lý'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST THÔNG BÁO */}
      {toastMsg && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#1f2937',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            zIndex: 1200,
            fontSize: '14px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span>ℹ️</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  )
}
