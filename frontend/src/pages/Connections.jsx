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
  )

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
  const [actionLoading, setActionLoading] = useState(null)
  const [toastMessage, setToastMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterOnlineOnly, setFilterOnlineOnly] = useState(false)

  // Modals for Report & Block
  const [reportTargetUser, setReportTargetUser] = useState(null)
  const [blockTargetUser, setBlockTargetUser] = useState(null)
  const [openMenuUserId, setOpenMenuUserId] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 4000)
  }

  // Close menus on outside click
  useEffect(() => {
    const handleOutside = () => setOpenMenuUserId(null)
    if (openMenuUserId) {
      window.addEventListener('click', handleOutside)
      return () => window.removeEventListener('click', handleOutside)
    }
  }, [openMenuUserId])

  const loadData = async () => {
    setLoading(true)
    try {
      const [connsData, reqsData] = await Promise.allSettled([
        getMyConnections(),
        getConnectionRequests(),
      ])

      if (connsData.status === 'fulfilled' && connsData.value) {
        setConnections(connsData.value)
      }
      if (reqsData.status === 'fulfilled' && reqsData.value) {
        setReceivedRequests(reqsData.value.incoming || [])
        setSentRequests(reqsData.value.outgoing || [])
      }
    } catch (err) {
      console.error('Lỗi tải dữ liệu kết nối:', err)
      showToast('Không thể tải danh sách kết nối. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Accept Request
  const handleAccept = async (conn) => {
    setActionLoading(conn.id)
    try {
      await acceptConnection(conn.id)
      setReceivedRequests((prev) => prev.filter((item) => item.id !== conn.id))
      setConnections((prev) => [
        { ...conn, status: 'accepted', updated_at: new Date().toISOString() },
        ...prev,
      ])
      showToast(`Đã trở thành bạn bè với ${conn.user.display_name || conn.user.username}! 🎉`)
    } catch (err) {
      console.error('Lỗi khi chấp nhận kết nối:', err)
      showToast(err.response?.data?.detail || 'Không thể chấp nhận lời mời.')
    } finally {
      setActionLoading(null)
    }
  }

  // Reject Request
  const handleReject = async (conn) => {
    if (
      !window.confirm(
        `Bạn có chắc muốn từ chối lời mời từ ${conn.user.display_name || conn.user.username}?`
      )
    ) {
      return
    }
    setActionLoading(conn.id)
    try {
      await rejectConnection(conn.id)
      setReceivedRequests((prev) => prev.filter((item) => item.id !== conn.id))
      showToast(`Đã từ chối lời mời kết nối.`)
    } catch (err) {
      console.error('Lỗi khi từ chối kết nối:', err)
      showToast(err.response?.data?.detail || 'Không thể từ chối lời mời.')
    } finally {
      setActionLoading(null)
    }
  }

  // Filter connections
  const filteredConnections = connections.filter((conn) => {
    const u = conn.user
    if (!u) return false
    const matchQuery =
      !searchQuery.trim() ||
      (u.display_name && u.display_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.bio && u.bio.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchQuery
  })

  return (
    <div className="app-green-theme bg-[#08090a] min-h-screen text-[#e3e2e3] font-sans antialiased selection:bg-[#00ff88] selection:text-[#00210c]">
      <Navbar />

      <main className="w-full pt-20 min-h-[calc(100vh-80px)] pb-16">
        {/* Toast Feedback */}
        {toastMessage && (
          <div className="fixed top-24 right-6 z-50 animate-bounce">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#00ff88]/50 bg-[#11151c]/95 text-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.3)] backdrop-blur-md">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span className="text-sm font-medium">{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Ambient HUD Glows */}
        <div className="relative w-full max-w-[1440px] mx-auto px-4 md:px-8 pt-6 pb-12">
          <div className="absolute top-10 left-1/4 w-96 h-96 bg-[#00ff88]/5 rounded-full blur-3xl pointer-events-none -z-10"></div>
          <div className="absolute top-40 right-10 w-80 h-80 bg-[#44fb8a]/5 rounded-full blur-3xl pointer-events-none -z-10"></div>

          {/* 1. HEADER SECTION */}
          <div className="flex flex-col gap-4 mb-8">
            <div className="space-y-1">
              <h1 className="text-3xl md:text-4xl font-extrabold text-[#f1ffef] tracking-tight">
                Mạng lưới & Bạn bè
              </h1>
              <p className="text-sm md:text-base text-[#b9cbb9] max-w-2xl">
                Quản lý bạn bè và lời mời kết nối của bạn.
              </p>
            </div>

            {/* Search & Filters Toolbar */}
            <div className="mt-2 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#11151c] border border-[#1a232e] p-2.5 rounded-xl shadow-md">
              <div className="relative flex-1">
                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#849585] text-[20px] pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm trong danh sách bạn bè, username, sở thích..."
                  className="w-full h-11 pl-11 pr-14 rounded-lg bg-[#08090a] text-[#f1ffef] placeholder:text-[#849585] text-sm focus:outline-none focus:ring-1 focus:ring-[#00ff88] border border-[#1a232e] transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-2 py-0.5 rounded bg-[#181d26] text-[11px] font-mono text-[#849585] pointer-events-none">
                  <span>⌘</span>
                  <span>K</span>
                </div>
              </div>

              {/* Filter Chips */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setFilterOnlineOnly(!filterOnlineOnly)}
                  className={`flex items-center gap-1.5 h-11 px-4 rounded-lg transition-all ${
                    filterOnlineOnly
                      ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/40 shadow-[0_0_12px_rgba(0,255,136,0.2)]'
                      : 'bg-[#181d26] text-[#b9cbb9] hover:bg-[#1f2021]'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]"></span>
                  <span>Đang online</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('')
                    setFilterOnlineOnly(false)
                  }}
                  className="h-11 px-3 rounded-lg bg-[#181d26] hover:bg-[#1f2021] text-[#b9cbb9] hover:text-[#f1ffef] transition-all"
                  title="Đặt lại bộ lọc"
                >
                  <span className="material-symbols-outlined text-[20px]">restart_alt</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. MAIN NAVIGATION TABS (HUD Switcher) */}
          <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-[#08090a] border border-[#1a232e] w-fit max-w-full overflow-x-auto mb-8 shadow-inner">
            {/* Tab 1: Friends */}
            <button
              type="button"
              onClick={() => setActiveTab('connections')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'connections'
                  ? 'bg-[#00ff88]/15 text-[#00ff88] shadow-[0_0_16px_rgba(0,255,136,0.18)] border border-[#00ff88]/30'
                  : 'text-[#b9cbb9] hover:text-[#f1ffef] hover:bg-[#11151c]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">group</span>
              <span>Bạn bè của tôi ({connections.length})</span>
            </button>

            {/* Tab 2: Received Requests */}
            <button
              type="button"
              onClick={() => setActiveTab('received')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'received'
                  ? 'bg-[#00ff88]/15 text-[#00ff88] shadow-[0_0_16px_rgba(0,255,136,0.18)] border border-[#00ff88]/30'
                  : 'text-[#b9cbb9] hover:text-[#f1ffef] hover:bg-[#11151c]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">inbox</span>
              <span>Lời mời đã nhận</span>
              {receivedRequests.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#00ff88] text-[#00210c] text-[11px] font-bold shadow-[0_0_10px_rgba(0,255,136,0.6)]">
                  {receivedRequests.length}
                </span>
              )}
            </button>

            {/* Tab 3: Sent Requests */}
            <button
              type="button"
              onClick={() => setActiveTab('sent')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'sent'
                  ? 'bg-[#00ff88]/15 text-[#00ff88] shadow-[0_0_16px_rgba(0,255,136,0.18)] border border-[#00ff88]/30'
                  : 'text-[#b9cbb9] hover:text-[#f1ffef] hover:bg-[#11151c]'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">outbox</span>
              <span>Lời mời đã gửi ({sentRequests.length})</span>
            </button>
          </div>

          {/* 3. PRIORITY INBOX: INCOMING REQUESTS TRAY (Shows if any incoming or on Tab 2) */}
          {(activeTab === 'received' || (receivedRequests.length > 0 && activeTab === 'connections')) && (
            <div className="mb-8 bg-[#11151c] border border-[#1a232e] rounded-xl p-6 shadow-xl relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-[#00ff88]/5 rounded-full blur-3xl pointer-events-none"></div>

              {/* Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 mb-4 border-b border-[#1a232e]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#181d26] flex items-center justify-center text-[#00ff88] shadow-[0_0_12px_rgba(0,255,136,0.3)]">
                    <span className="material-symbols-outlined text-[20px]">move_to_inbox</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-[#f1ffef] flex items-center gap-2">
                      Lời mời kết nối mới
                      <span className="px-2 py-0.5 rounded-full bg-[#181d26] text-[#44fb8a] text-[11px] font-mono">
                        {receivedRequests.length} chờ xử lý
                      </span>
                    </h2>
                  </div>
                </div>

                {activeTab !== 'received' && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('received')}
                    className="text-xs font-mono text-[#00ff88] hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                  >
                    Xem tất cả lời mời
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                )}
              </div>

              {/* Pending Request Cards Row */}
              {receivedRequests.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {receivedRequests.map((req) => {
                    const u = req.user || {}
                    const avatar =
                      u.avatar_url ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                        u.username || 'user'
                      )}`
                    return (
                      <div
                        key={req.id}
                        className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl bg-[#181d26] border border-[#1a232e] hover:border-[#00ff88]/30 transition-all shadow-sm"
                      >
                        <div className="relative shrink-0 w-14 h-14">
                          <img
                            src={avatar}
                            alt={u.username}
                            className="w-14 h-14 rounded-xl object-cover border border-[#00ff88]/30 bg-[#08090a]"
                            onError={(e) => {
                              e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                                u.username || 'user'
                              )}`
                            }}
                          />
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]"></span>
                        </div>

                        <div className="flex-1 min-w-0 flex flex-col justify-between gap-2">
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="font-bold text-[#f1ffef] text-sm truncate">
                                  {u.display_name || u.username}
                                </span>
                                <span
                                  className="material-symbols-outlined text-[#00ff88] text-[16px]"
                                  style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                  verified
                                </span>
                                <span className="text-xs text-[#849585] font-mono truncate">
                                  @{u.username}
                                </span>
                              </div>
                              <span className="text-[11px] font-mono text-[#849585] shrink-0">
                                Mới đây
                              </span>
                            </div>

                            <p className="text-xs text-[#44fb8a] font-mono mt-0.5">
                              {u.current_status || 'Thành viên mới'} • {u.age_group || '20-25 tuổi'}
                            </p>

                            <p className="text-xs text-[#e3e2e3] mt-2 italic bg-[#08090a]/80 p-2 rounded-lg line-clamp-2 border border-[#1a232e]">
                              “{u.bio || 'Muốn kết nối và cùng nhau trao đổi góc nhìn cuộc sống.'}”
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => handleAccept(req)}
                              disabled={actionLoading === req.id}
                              className="flex-1 h-9 px-3 rounded-lg bg-[#00ff88] hover:bg-[#44fb8a] text-[#00210c] text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_14px_rgba(0,255,136,0.35)] cursor-pointer disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[17px]">
                                handshake
                              </span>
                              <span>Chấp nhận</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleReject(req)}
                              disabled={actionLoading === req.id}
                              className="h-9 px-3 rounded-lg bg-[#08090a] hover:bg-red-500/20 text-[#b9cbb9] hover:text-red-400 text-xs font-medium flex items-center justify-center gap-1 transition-all border border-[#1a232e] cursor-pointer disabled:opacity-50"
                            >
                              <span className="material-symbols-outlined text-[17px]">close</span>
                              <span>Từ chối</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-[#849585]">
                  Hiện tại không có lời mời kết nối nào đang chờ.
                </div>
              )}
            </div>
          )}

          {/* 4. TAB 1: FRIENDS LIST GRID */}
          {activeTab === 'connections' && (
            <div className="mb-12">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-[#f1ffef] flex items-center gap-2">
                  <span>Danh sách bạn bè đang kết nối</span>
                  <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#181d26] text-[#b9cbb9]">
                    {filteredConnections.length} người
                  </span>
                </h2>
                <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#849585]">
                  <span className="w-2 h-2 rounded-full bg-[#00ff88]"></span>
                  <span>Mạng lưới Peer-to-Peer E2EE</span>
                </div>
              </div>

              {loading ? (
                <div className="py-20 text-center text-[#849585] font-mono text-sm">
                  Đang tải danh sách kết nối...
                </div>
              ) : filteredConnections.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredConnections.map((conn) => {
                    const u = conn.user || {}
                    const avatar =
                      u.avatar_url ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                        u.username || 'user'
                      )}`
                    return (
                      <div
                        key={conn.id}
                        className="group relative rounded-xl bg-[#11151c] border border-[#1a232e] p-5 flex flex-col justify-between gap-4 transition-all duration-300 hover:border-[#00ff88]/40 hover:bg-[#141922] shadow-lg"
                      >
                        <div className="flex items-start gap-4">
                          <div className="relative shrink-0">
                            <img
                              src={avatar}
                              alt={u.username}
                              className="w-16 h-16 rounded-xl object-cover border border-[#00ff88]/30 bg-[#08090a]"
                              onError={(e) => {
                                e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                                  u.username || 'user'
                                )}`
                              }}
                            />
                            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#00ff88] shadow-[0_0_10px_#00ff88]"></span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 truncate">
                                <span className="text-base font-bold text-[#f1ffef] truncate group-hover:text-[#00ff88] transition-colors">
                                  {u.display_name || u.username}
                                </span>
                                <span
                                  className="material-symbols-outlined text-[#00ff88] text-[18px]"
                                  style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                  verified
                                </span>
                              </div>

                              {/* Match Pill */}
                              <span className="shrink-0 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#00ff88] to-[#44fb8a] text-[#00210c] text-[11px] font-bold font-mono shadow-[0_0_10px_rgba(0,255,136,0.35)]">
                                95% Tương thích
                              </span>
                            </div>

                            <div className="flex items-center gap-2 mt-0.5 text-xs font-mono">
                              <span className="text-[#849585]">@{u.username}</span>
                              <span className="text-[#849585]">•</span>
                              <span className="text-[#44fb8a]">Đang trực tuyến</span>
                            </div>

                            <p className="text-xs text-[#b9cbb9] mt-1 truncate">
                              {u.current_status || 'Thành viên'} • {u.age_group || '21-25 tuổi'}
                            </p>
                          </div>
                        </div>

                        {/* Bio quote */}
                        <p className="text-xs md:text-sm text-[#e3e2e3] line-clamp-2 italic bg-[#08090a]/50 p-2.5 rounded-lg border border-[#1a232e]">
                          “{u.bio || 'Chào bạn! Mình mong muốn kết nối và chia sẻ góc nhìn cùng bạn.'}”
                        </p>

                        {/* Bottom Actions */}
                        <div className="flex items-center justify-between pt-1 border-t border-[#1a232e]">
                          <div className="flex items-center gap-2 flex-1 mr-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/messages?user=${u.id}`)}
                              className="flex-1 h-9 px-4 rounded-lg bg-[#00ff88] hover:bg-[#44fb8a] text-[#00210c] text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_14px_rgba(0,255,136,0.25)] cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[17px]">chat</span>
                              <span>Nhắn tin</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => navigate(`/messages?user=${u.id}&call=audio`)}
                              className="h-9 w-9 rounded-lg bg-[#08090a] hover:bg-[#1f2021] text-[#00ff88] flex items-center justify-center transition-all border border-[#1a232e] cursor-pointer"
                              title="Gọi thoại WebRTC"
                            >
                              <span className="material-symbols-outlined text-[18px]">call</span>
                            </button>
                          </div>

                          {/* Menu dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOpenMenuUserId(openMenuUserId === u.id ? null : u.id)
                              }}
                              className="h-9 w-9 rounded-lg bg-[#08090a] hover:bg-[#1f2021] text-[#849585] hover:text-[#f1ffef] flex items-center justify-center transition-all border border-[#1a232e] cursor-pointer"
                              title="Tùy chọn khác"
                            >
                              <span className="material-symbols-outlined text-[18px]">more_vert</span>
                            </button>

                            {openMenuUserId === u.id && (
                              <div className="absolute right-0 bottom-full mb-1 w-44 rounded-xl bg-[#11151c] border border-[#1a232e] shadow-2xl p-1 z-30 animate-fadeIn">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReportTargetUser(u)
                                    setOpenMenuUserId(null)
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#b9cbb9] hover:text-amber-400 hover:bg-[#181d26] flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-[16px]">flag</span>
                                  <span>Báo cáo vi phạm</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBlockTargetUser(u)
                                    setOpenMenuUserId(null)
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-lg text-xs text-red-400 hover:bg-red-500/15 flex items-center gap-2"
                                >
                                  <span className="material-symbols-outlined text-[16px]">block</span>
                                  <span>Chặn người dùng</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-[#11151c] border border-[#1a232e] space-y-4">
                  <span className="material-symbols-outlined text-[#00ff88] text-[40px]">
                    person_search
                  </span>
                  <h3 className="text-lg font-bold text-[#f1ffef]">Chưa có kết nối nào</h3>
                  <p className="text-sm text-[#b9cbb9] max-w-md mx-auto">
                    Hãy truy cập mục Khám phá để tìm những người bạn có điểm tương đồng cao và gửi lời
                    mời kết nối!
                  </p>
                  <Link
                    to="/discover"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00ff88] text-[#00210c] text-xs font-bold shadow-[0_0_16px_rgba(0,255,136,0.3)] hover:shadow-[0_0_22px_rgba(0,255,136,0.6)] transition-all"
                  >
                    <span>Khám phá bạn mới</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 5. TAB 3: SENT REQUESTS */}
          {activeTab === 'sent' && (
            <div className="mb-12">
              <h2 className="text-xl font-bold text-[#f1ffef] mb-4 flex items-center gap-2">
                <span>Lời mời kết nối đã gửi</span>
                <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-[#181d26] text-[#b9cbb9]">
                  {sentRequests.length} người
                </span>
              </h2>

              {sentRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {sentRequests.map((req) => {
                    const u = req.user || {}
                    const avatar =
                      u.avatar_url ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                        u.username || 'user'
                      )}`
                    return (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-[#11151c] border border-[#1a232e]"
                      >
                        <div className="flex items-center gap-3 truncate mr-3">
                          <img
                            src={avatar}
                            alt={u.username}
                            className="w-12 h-12 rounded-xl object-cover border border-[#1a232e] bg-[#08090a]"
                            onError={(e) => {
                              e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                                u.username || 'user'
                              )}`
                            }}
                          />
                          <div className="truncate">
                            <h4 className="text-sm font-bold text-[#f1ffef] truncate">
                              {u.display_name || u.username}
                            </h4>
                            <p className="text-xs font-mono text-[#849585]">@{u.username}</p>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-full bg-[#181d26] text-[#4edea3] text-[11px] font-mono border border-[#4edea3]/20 flex items-center gap-1.5 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse"></span>
                          <span>Đang chờ duyệt</span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-[#11151c] border border-[#1a232e] text-[#849585] text-sm">
                  Bạn chưa gửi lời mời kết nối nào gần đây.
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modals for Reporting and Blocking */}
      {reportTargetUser && (
        <ReportModal
          targetUser={reportTargetUser}
          onClose={() => setReportTargetUser(null)}
          onSuccess={(msg) => {
            showToast(msg)
            setReportTargetUser(null)
          }}
        />
      )}

      {blockTargetUser && (
        <BlockConfirmModal
          targetUser={blockTargetUser}
          onClose={() => setBlockTargetUser(null)}
          onSuccess={(msg) => {
            setConnections((prev) => prev.filter((c) => c.user?.id !== blockTargetUser.id))
            showToast(msg)
            setBlockTargetUser(null)
          }}
        />
      )}
    </div>
  )
}
