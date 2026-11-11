import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Avatar from '../components/Avatar'
import OnlineStatusDot from '../components/OnlineStatusDot'
import AdminUserProfileModal from '../components/AdminUserProfileModal'
import { useAuth } from '../contexts/AuthContext'
import { adminService } from '../services/adminService'

const REPORT_FILTER_TABS = [
  { key: 'pending', label: 'Chờ xử lý', icon: 'hourglass_empty' },
  { key: 'resolved', label: 'Đã xử lý vi phạm', icon: 'check_circle' },
  { key: 'dismissed', label: 'Đã bác bỏ', icon: 'close' },
  { key: 'all', label: 'Tất cả đơn', icon: 'list_alt' },
]

function ReportStatusBadge({ status }) {
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold whitespace-nowrap">
        <span className="material-symbols-outlined text-[14px]">hourglass_empty</span>
        Chờ xử lý
      </span>
    )
  }
  if (status === 'resolved') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00ff88]/15 border border-[#00ff88]/30 text-[#00ff88] text-xs font-semibold whitespace-nowrap">
        <span className="material-symbols-outlined text-[14px]">check_circle</span>
        Đã xử lý vi phạm
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#181d26] border border-[#1a232e] text-[#94a3b8] text-xs font-semibold whitespace-nowrap">
      <span className="material-symbols-outlined text-[14px]">close</span>
      Đã bác bỏ
    </span>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('users')

  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)

  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('')
  const [togglingUserId, setTogglingUserId] = useState(null)
  const [selectedUserForProfile, setSelectedUserForProfile] = useState(null)

  const [reports, setReports] = useState([])
  const [loadingReports, setLoadingReports] = useState(true)
  const [reportStatusFilter, setReportStatusFilter] = useState('pending')
  const [processingReportId, setProcessingReportId] = useState(null)

  const [selectedReportForAction, setSelectedReportForAction] = useState(null)
  const [lockReportedUserCheck, setLockReportedUserCheck] = useState(true)

  const [toastMsg, setToastMsg] = useState('')
  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 4000)
  }

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

  useEffect(() => {
    if (activeTab === 'users' && user && user.role === 'admin') {
      const timer = setTimeout(() => {
        loadUsers()
      }, 350)
      return () => clearTimeout(timer)
    }
  }, [userSearch])

  useEffect(() => {
    if (!selectedReportForAction) return
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setSelectedReportForAction(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedReportForAction])

  const handleRefreshAll = () => {
    loadStats()
    if (activeTab === 'users') loadUsers()
    else loadReports()
  }

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

  if (user && user.role !== 'admin') {
    return (
      <div className="app-green-theme bg-[#08090a] min-h-screen text-[#e3e2e3] font-sans antialiased">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 pt-28 pb-16">
          <div className="bg-[#11151c] border border-[#1a232e] rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <span className="material-symbols-outlined text-[32px]">block</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#f8fafc] mb-2">
              Truy cập bị từ chối
            </h2>
            <p className="text-sm text-[#94a3b8] leading-relaxed mb-6">
              Trang này chỉ dành riêng cho Quản trị viên hệ thống (Admin). Tài khoản hiện tại của bạn không có quyền truy cập.
            </p>
            <button
              type="button"
              onClick={() => navigate('/home')}
              className="w-full py-3 rounded-xl bg-[#00ff88] text-[#00210c] font-bold text-sm hover:opacity-90 transition cursor-pointer"
            >
              Trở về Trang chủ
            </button>
          </div>
        </div>
      </div>
    )
  }

  const statItems = [
    {
      label: 'Tổng người dùng',
      value: loadingStats ? '...' : stats?.total_users ?? 0,
      sub: 'Tài khoản đã đăng ký',
      icon: 'group',
      iconBox: 'bg-[#00ff88]/15 border-[#00ff88]/30 text-[#00ff88]',
      valueClass: 'text-[#f8fafc]',
    },
    {
      label: 'Đang hoạt động',
      value: loadingStats ? '...' : stats?.active_users ?? 0,
      sub: 'Tài khoản mở bình thường',
      icon: 'check_circle',
      iconBox: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300',
      valueClass: 'text-[#00ff88]',
    },
    {
      label: 'Tài khoản bị khóa',
      value: loadingStats ? '...' : stats?.locked_users ?? 0,
      sub: 'Đã hạn chế truy cập',
      icon: 'lock',
      iconBox: 'bg-red-500/15 border-red-500/30 text-red-400',
      valueClass: 'text-red-400',
    },
    {
      label: 'Vi phạm chờ duyệt',
      value: loadingStats ? '...' : stats?.pending_reports ?? 0,
      sub: `Tổng ${loadingStats ? '...' : stats?.total_reports ?? 0} đơn báo cáo`,
      icon: 'flag',
      iconBox: 'bg-amber-500/15 border-amber-500/30 text-amber-300',
      valueClass: 'text-amber-300',
    },
  ]

  return (
    <div className="app-green-theme bg-[#08090a] min-h-screen text-[#e3e2e3] font-sans antialiased selection:bg-[#00ff88]/30 selection:text-[#00ff88]">
      <Navbar />

      <main className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-6 border-b border-[#1a232e]">
          <div>
            <div className="flex items-center gap-2 text-[#00ff88] text-xs font-mono font-bold tracking-widest uppercase mb-1.5">
              <span className="material-symbols-outlined text-[16px]">admin_panel_settings</span>
              <span>La Pulga • Admin Console</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f8fafc] tracking-tight">
              Hệ thống Quản trị viên
            </h1>
            <p className="text-sm text-[#94a3b8] mt-1">
              Quản lý tài khoản thành viên, theo dõi trạng thái hoạt động và kiểm duyệt an toàn cộng đồng La Pulga.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleRefreshAll}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#0d1117] border border-[#1a232e] text-xs font-semibold text-[#e3e2e3] hover:border-[#00ff88]/40 hover:text-[#00ff88] transition cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
              Làm mới dữ liệu
            </button>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00ff88]/15 border border-[#00ff88]/30 text-[#00ff88] text-xs font-bold">
              <span className="material-symbols-outlined text-[16px]">verified_user</span>
              <span>Quyền: Administrator</span>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <section
          aria-label="Thống kê hệ thống"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6"
        >
          {statItems.map((item) => (
            <div
              key={item.label}
              className="bg-[#11151c] border border-[#1a232e] rounded-2xl p-5 flex items-center gap-4 shadow-lg"
            >
              <div
                className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${item.iconBox}`}
              >
                <span className="material-symbols-outlined text-[24px]">{item.icon}</span>
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-[#94a3b8]">
                  {item.label}
                </div>
                <div className={`text-2xl font-extrabold leading-tight mt-0.5 ${item.valueClass}`}>
                  {item.value}
                </div>
                <div className="text-xs text-[#64748b] mt-0.5 truncate">{item.sub}</div>
              </div>
            </div>
          ))}
        </section>

        {/* Main Navigation Tabs */}
        <div className="bg-[#0d1117] border border-[#1a232e] p-1.5 rounded-2xl flex flex-col sm:flex-row gap-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/35 shadow-[0_0_16px_rgba(0,255,136,0.12)]'
                : 'text-[#94a3b8] border border-transparent hover:text-[#f8fafc] hover:bg-[#11151c]'
            }`}
          >
            <span className="material-symbols-outlined text-[19px]">group</span>
            <span>Quản lý Người dùng</span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                activeTab === 'users'
                  ? 'bg-[#00ff88]/20 text-[#00ff88]'
                  : 'bg-[#181d26] text-[#94a3b8]'
              }`}
            >
              {stats?.total_users ?? 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/35 shadow-[0_0_16px_rgba(0,255,136,0.12)]'
                : 'text-[#94a3b8] border border-transparent hover:text-[#f8fafc] hover:bg-[#11151c]'
            }`}
          >
            <span className="material-symbols-outlined text-[19px]">flag</span>
            <span>Báo cáo Vi phạm</span>
            {(stats?.pending_reports ?? 0) > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold">
                {stats.pending_reports} mới
              </span>
            )}
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: QUẢN LÝ NGƯỜI DÙNG                                  */}
        {/* ========================================================= */}
        {activeTab === 'users' && (
          <section className="w-full bg-[#11151c] border border-[#1a232e] rounded-2xl p-5 sm:p-6 shadow-xl">
            {/* Search & Filter Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-5">
              <div className="flex flex-col sm:flex-row flex-1 gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748b] text-[18px] pointer-events-none">
                    search
                  </span>
                  <input
                    type="text"
                    placeholder="Tìm theo username hoặc email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full h-11 pl-10 pr-10 rounded-xl bg-[#0d1117] border border-[#1a232e] text-sm text-[#f8fafc] placeholder:text-[#64748b] focus:outline-none focus:border-[#00ff88] transition"
                  />
                  {userSearch && (
                    <button
                      type="button"
                      aria-label="Xóa từ khóa"
                      onClick={() => setUserSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#f8fafc] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  )}
                </div>

                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="h-11 px-4 rounded-xl bg-[#0d1117] border border-[#1a232e] text-sm text-[#f8fafc] focus:outline-none focus:border-[#00ff88] cursor-pointer min-w-[210px]"
                >
                  <option value="">Tất cả vai trò</option>
                  <option value="user">Thành viên (User)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                </select>
              </div>

              <div className="text-xs font-mono text-[#94a3b8] bg-[#0d1117] border border-[#1a232e] px-3.5 py-2.5 rounded-xl self-start lg:self-auto whitespace-nowrap">
                Hiển thị <strong className="text-[#00ff88]">{users.length}</strong> tài khoản
              </div>
            </div>

            {loadingUsers ? (
              <div className="py-16 text-center text-sm text-[#94a3b8]">
                Đang tải danh sách người dùng...
              </div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center text-sm text-[#94a3b8]">
                Không tìm thấy người dùng nào phù hợp.
              </div>
            ) : (
              <div className="w-full overflow-x-auto rounded-xl border border-[#1a232e]">
                <table className="w-full min-w-[880px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-[#0d1117] border-b border-[#1a232e] text-xs uppercase tracking-wider text-[#94a3b8]">
                      <th className="py-3.5 px-4 font-bold">Người dùng</th>
                      <th className="py-3.5 px-4 font-bold">Email & Đăng nhập</th>
                      <th className="py-3.5 px-4 font-bold">Vai trò</th>
                      <th className="py-3.5 px-4 font-bold">Trạng thái</th>
                      <th className="py-3.5 px-4 font-bold">Ngày tham gia</th>
                      <th className="py-3.5 px-4 font-bold text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a232e]">
                    {users.map((u) => {
                      const isMe = u.id === user?.id
                      return (
                        <tr
                          key={u.id}
                          className="hover:bg-[#181d26]/65 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3 min-w-[200px]">
                              <div className="relative shrink-0">
                                <Avatar
                                  src={u.avatar_url}
                                  alt={u.username}
                                  className="w-10 h-10 rounded-full object-cover border border-[#00ff88]/40 bg-[#08090a]"
                                />
                                <OnlineStatusDot
                                  isOnline={u.is_online}
                                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-[#11151c]"
                                />
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-[#f8fafc] flex items-center gap-1.5 flex-wrap">
                                  <span className="truncate max-w-[190px]">
                                    {u.display_name || u.username}
                                  </span>
                                  {isMe && (
                                    <span className="px-1.5 py-0.5 rounded bg-[#00ff88]/15 text-[#00ff88] text-[10px] font-bold">
                                      Tôi
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-[#94a3b8] font-mono truncate">
                                  @{u.username}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="text-[#e3e2e3] break-all">{u.email}</div>
                            <div className="text-[11px] text-[#64748b] mt-0.5">
                              {u.auth_provider === 'google' ? 'Google OAuth' : 'Email / Mật khẩu'}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {u.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#00ff88]/15 border border-[#00ff88]/30 text-[#00ff88] text-xs font-bold">
                                <span className="material-symbols-outlined text-[14px]">shield_person</span>
                                Admin
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#0d1117] border border-[#1a232e] text-[#cbd5e1] text-xs font-medium">
                                Thành viên
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex flex-col items-start gap-1">
                              {u.is_active ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                  Hoạt động
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-semibold">
                                  <span className="material-symbols-outlined text-[14px]">lock</span>
                                  Bị khóa
                                </span>
                              )}
                              <span className="text-[11px] text-[#64748b]">
                                {u.is_online ? 'Đang trực tuyến' : 'Ngoại tuyến'}
                              </span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-xs font-mono text-[#94a3b8] whitespace-nowrap">
                            {new Date(u.created_at).toLocaleDateString('vi-VN')}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setSelectedUserForProfile(u)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#1a232e] text-xs font-semibold text-[#e3e2e3] hover:border-[#00ff88]/50 hover:text-[#00ff88] transition cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[15px]">person</span>
                                Xem hồ sơ
                              </button>
                              {!isMe && (
                                <button
                                  type="button"
                                  disabled={togglingUserId === u.id}
                                  onClick={() => handleToggleUserStatus(u)}
                                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                                    u.is_active
                                      ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
                                      : 'bg-[#00ff88]/15 border-[#00ff88]/35 text-[#00ff88] hover:bg-[#00ff88]/25'
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-[15px]">
                                    {u.is_active ? 'lock' : 'lock_open'}
                                  </span>
                                  {togglingUserId === u.id
                                    ? 'Đang xử lý...'
                                    : u.is_active
                                    ? 'Khóa tài khoản'
                                    : 'Mở khóa'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ========================================================= */}
        {/* TAB 2: KIỂM DUYỆT BÁO CÁO VI PHẠM (REPORTS MODERATION)      */}
        {/* ========================================================= */}
        {activeTab === 'reports' && (
          <section className="w-full bg-[#11151c] border border-[#1a232e] rounded-2xl p-5 sm:p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex flex-wrap gap-2">
                {REPORT_FILTER_TABS.map((tab) => {
                  const active = reportStatusFilter === tab.key
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setReportStatusFilter(tab.key)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                        active
                          ? 'bg-[#00ff88]/15 border-[#00ff88]/40 text-[#00ff88]'
                          : 'bg-[#0d1117] border-[#1a232e] text-[#94a3b8] hover:text-[#f8fafc] hover:border-[#334155]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                      <span>{tab.label}</span>
                    </button>
                  )
                })}
              </div>

              <div className="text-xs font-mono text-[#94a3b8] bg-[#0d1117] border border-[#1a232e] px-3.5 py-2 rounded-xl self-start sm:self-auto whitespace-nowrap">
                Tổng <strong className="text-[#00ff88]">{reports.length}</strong> đơn báo cáo
              </div>
            </div>

            {loadingReports ? (
              <div className="py-16 text-center text-sm text-[#94a3b8]">
                Đang tải danh sách báo cáo...
              </div>
            ) : reports.length === 0 ? (
              <div className="py-16 text-center text-sm text-[#94a3b8]">
                <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#00ff88]/10 border border-[#00ff88]/25 flex items-center justify-center text-[#00ff88]">
                  <span className="material-symbols-outlined text-[26px]">verified</span>
                </div>
                Không có đơn báo cáo vi phạm nào trong danh mục này.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {reports.map((r) => {
                  const isPending = r.status === 'pending'
                  return (
                    <article
                      key={r.id}
                      className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition ${
                        isPending
                          ? 'bg-[#0d1117] border-amber-500/35 hover:border-amber-400/50'
                          : 'bg-[#0d1117] border-[#1a232e]'
                      }`}
                    >
                      <div className="flex flex-col gap-3.5">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-bold">
                              <span className="material-symbols-outlined text-[14px]">flag</span>
                              {r.reason}
                            </span>
                            <span className="text-xs font-mono text-[#94a3b8]">
                              Đơn #{r.id} • {new Date(r.created_at).toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <ReportStatusBadge status={r.status} />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div className="p-3 rounded-xl bg-[#11151c] border border-[#1a232e] flex items-center gap-2.5">
                            <Avatar
                              src={r.reporter?.avatar_url}
                              alt={r.reporter?.username}
                              className="w-8 h-8 rounded-full object-cover border border-[#1a232e] shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-[11px] text-[#94a3b8]">Người báo cáo</div>
                              <div className="font-bold text-[#f8fafc] truncate">
                                {r.reporter?.display_name || r.reporter?.username} (@{r.reporter?.username})
                              </div>
                            </div>
                          </div>

                          <div className="p-3 rounded-xl bg-[#11151c] border border-[#1a232e] flex items-center gap-2.5">
                            <Avatar
                              src={r.reported?.avatar_url}
                              alt={r.reported?.username}
                              className="w-8 h-8 rounded-full object-cover border border-red-500/40 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="text-[11px] text-[#94a3b8]">Người bị tố cáo</div>
                              <div className="font-bold text-red-300 truncate">
                                {r.reported?.display_name || r.reported?.username} (@{r.reported?.username})
                                {!r.reported?.is_active && (
                                  <span className="ml-1.5 text-[10px] text-red-400">(Đã khóa)</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {r.description && (
                          <div className="p-3.5 rounded-xl bg-[#11151c] border border-[#1a232e] text-sm text-[#cbd5e1] leading-relaxed">
                            <span className="font-bold text-[#f8fafc] mr-1.5">Mô tả:</span>
                            {r.description}
                          </div>
                        )}
                      </div>

                      {isPending && (
                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#1a232e]">
                          <button
                            type="button"
                            disabled={processingReportId === r.id}
                            onClick={() => handleDismissReport(r)}
                            className="px-4 py-2 rounded-xl bg-[#11151c] border border-[#1a232e] text-xs font-semibold text-[#cbd5e1] hover:border-[#475569] hover:text-[#f8fafc] transition cursor-pointer disabled:opacity-50"
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
                            className="px-4 py-2 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                          >
                            Xác nhận vi phạm
                          </button>
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </main>

      {selectedUserForProfile && (
        <AdminUserProfileModal
          targetUser={selectedUserForProfile}
          currentUserId={user?.id}
          onClose={() => setSelectedUserForProfile(null)}
          onNotify={showToast}
        />
      )}

      {/* MODAL XÁC NHẬN XỬ LÝ VI PHẠM */}
      {selectedReportForAction && (
        <div
          className="fixed inset-0 z-[1100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedReportForAction(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md bg-[#11151c] border border-[#1a232e] rounded-2xl p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-extrabold text-[#f8fafc] mb-2">
              Xác nhận xử lý vi phạm #{selectedReportForAction.id}
            </h3>
            <p className="text-sm text-[#94a3b8] leading-relaxed mb-4">
              Bạn đang xác nhận tài khoản{' '}
              <strong className="text-[#f8fafc]">
                @{selectedReportForAction.reported.username}
              </strong>{' '}
              có hành vi vi phạm ({selectedReportForAction.reason}).
            </p>

            <label className="flex items-center gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 cursor-pointer mb-6">
              <input
                type="checkbox"
                checked={lockReportedUserCheck}
                onChange={(e) => setLockReportedUserCheck(e.target.checked)}
                className="w-4 h-4 accent-red-500"
              />
              <span className="text-xs font-semibold text-red-300">
                Khóa luôn tài khoản của người vi phạm này
              </span>
            </label>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedReportForAction(null)}
                className="px-4 py-2.5 rounded-xl bg-[#0d1117] border border-[#1a232e] text-xs font-semibold text-[#cbd5e1] hover:text-[#f8fafc] cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                disabled={processingReportId === selectedReportForAction.id}
                className="px-5 py-2.5 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {processingReportId ? 'Đang duyệt...' : 'Xác nhận xử lý'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[1200] bg-[#11151c] border border-[#00ff88]/40 text-[#f8fafc] px-4 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2.5">
          <span className="material-symbols-outlined text-[#00ff88] text-[18px]">info</span>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  )
}
