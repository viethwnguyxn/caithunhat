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

  // Modals
  const [reportTargetUser, setReportTargetUser] = useState(null)
  const [blockTargetUser, setBlockTargetUser] = useState(null)
  const [openMenuUserId, setOpenMenuUserId] = useState(null)

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 4000)
  }

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
    <div className="min-h-screen bg-[#F8F7FA] text-[#292631] font-sans antialiased selection:bg-[#E9E1F3] selection:text-[#7C5CBF] pb-20 md:pb-12">
      <Navbar />

      <main className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 animate-bounce">
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-[#E9E1F3] shadow-md text-[#7C5CBF] font-semibold text-xs">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* 1. Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F0FA] border border-[#E9E1F3] text-[#7C5CBF] text-xs font-bold mb-2">
              <span>🤝 Quản lý mạng lưới</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#292631] tracking-tight">
              Mạng lưới & Bạn bè
            </h1>
            <p className="text-xs sm:text-sm text-[#77717F] mt-1">
              Quản lý danh sách bạn bè đồng điệu và những lời mời kết nối của bạn.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-[#7C5CBF] bg-[#F5F0FA] px-3.5 py-2 rounded-xl border border-[#E9E1F3] self-start sm:self-auto">
            <span>{connections.length} Bạn bè đã kết nối</span>
          </div>
        </div>

        {/* 2. Tabs Switcher & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-2xl bg-white border border-[#E9E1F3] shadow-sm overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('connections')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'connections'
                  ? 'bg-[#7C5CBF] text-white shadow-sm font-bold'
                  : 'text-[#77717F] hover:text-[#292631]'
              }`}
            >
              Bạn bè của tôi ({connections.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('received')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'received'
                  ? 'bg-[#7C5CBF] text-white shadow-sm font-bold'
                  : 'text-[#77717F] hover:text-[#292631]'
              }`}
            >
              <span>Lời mời đã nhận</span>
              {receivedRequests.length > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    activeTab === 'received' ? 'bg-white text-[#7C5CBF]' : 'bg-[#7C5CBF] text-white'
                  }`}
                >
                  {receivedRequests.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('sent')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'sent'
                  ? 'bg-[#7C5CBF] text-white shadow-sm font-bold'
                  : 'text-[#77717F] hover:text-[#292631]'
              }`}
            >
              Lời mời đã gửi ({sentRequests.length})
            </button>
          </div>

          {activeTab === 'connections' && (
            <div className="relative w-full sm:w-64">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#77717F] text-[18px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm bạn bè..."
                className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#E9E1F3] bg-white text-xs outline-none focus:border-[#7C5CBF]"
              />
            </div>
          )}
        </div>

        {/* 3. Tab 1: Connections List */}
        {activeTab === 'connections' && (
          <div className="space-y-4">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="p-5 rounded-2xl bg-white border border-[#E9E1F3] space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl skeleton"></div>
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-1/2 skeleton"></div>
                        <div className="h-3 w-1/3 skeleton"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredConnections.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="p-5 rounded-2xl bg-white border border-[#E9E1F3] shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="relative shrink-0">
                          <img
                            src={avatar}
                            alt=""
                            className="w-13 h-13 rounded-2xl object-cover bg-[#F5F0FA] border border-[#E9E1F3]"
                          />
                          <span className="pulse-dot absolute -bottom-0.5 -right-0.5"></span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-[#292631] truncate">
                              {u.display_name || u.username}
                            </h3>
                            <span className="text-[10px] font-mono text-[#A19AA8]">
                              Bạn bè
                            </span>
                          </div>
                          <p className="text-[11px] text-[#77717F]">@{u.username}</p>
                          <p className="text-xs text-[#77717F] mt-1 line-clamp-1 italic">
                            “{u.bio || 'Chưa cập nhật tiểu sử'}”
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#F2EFF5] flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <button
                            type="button"
                            onClick={() => navigate(`/messages?user=${u.id}`)}
                            className="flex-1 py-1.5 px-3 rounded-xl bg-[#F5F0FA] text-[#7C5CBF] hover:bg-[#E9E1F3] text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">chat</span>
                            <span>Nhắn tin</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => navigate(`/messages?user=${u.id}&call=audio`)}
                            className="p-1.5 rounded-xl bg-[#F5F0FA] text-[#7C5CBF] hover:bg-[#E9E1F3] transition-colors cursor-pointer"
                            title="Gọi thoại WebRTC"
                          >
                            <span className="material-symbols-outlined text-[18px]">call</span>
                          </button>
                        </div>

                        {/* Dropdown Menu */}
                        <div className="relative ml-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setOpenMenuUserId(openMenuUserId === u.id ? null : u.id)
                            }}
                            className="p-1.5 rounded-xl hover:bg-[#F5F0FA] text-[#77717F] cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[18px]">more_vert</span>
                          </button>

                          {openMenuUserId === u.id && (
                            <div className="absolute right-0 bottom-full mb-1 w-44 rounded-2xl bg-white border border-[#E9E1F3] shadow-xl p-1 z-30 animate-fadeIn">
                              <button
                                type="button"
                                onClick={() => {
                                  setReportTargetUser(u)
                                  setOpenMenuUserId(null)
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs text-[#77717F] hover:text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                              >
                                <span className="material-symbols-outlined text-[16px]">flag</span>
                                <span>Báo cáo</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setBlockTargetUser(u)
                                  setOpenMenuUserId(null)
                                }}
                                className="w-full text-left px-3 py-2 rounded-xl text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
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
              <div className="py-16 text-center rounded-3xl bg-white border border-[#E9E1F3] space-y-3">
                <span className="material-symbols-outlined text-[40px] text-[#A19AA8]">
                  people_outline
                </span>
                <h3 className="text-base font-bold text-[#292631]">Chưa có người bạn nào</h3>
                <p className="text-xs text-[#77717F] max-w-sm mx-auto">
                  Hãy ghé thăm mục Khám phá để tìm những người có tần số tương đồng và gửi lời chào!
                </p>
                <Link to="/discover" className="btn-primary !py-2 !px-4 text-xs inline-flex">
                  Khám phá ngay
                </Link>
              </div>
            )}
          </div>
        )}

        {/* 4. Tab 2: Received Requests */}
        {activeTab === 'received' && (
          <div className="space-y-4">
            {receivedRequests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="p-5 rounded-2xl bg-white border border-[#E9E1F3] shadow-sm space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={avatar}
                          alt=""
                          className="w-12 h-12 rounded-2xl object-cover bg-[#F5F0FA] border border-[#E9E1F3]"
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-[#292631] truncate">
                            {u.display_name || u.username}
                          </h4>
                          <p className="text-[11px] text-[#77717F]">@{u.username}</p>
                          <p className="text-xs text-[#292631] mt-1 bg-[#F8F7FA] p-2.5 rounded-xl border border-[#E9E1F3] italic line-clamp-2">
                            “{u.bio || 'Mong muốn kết nối cùng bạn!'}”
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-[#F2EFF5]">
                        <button
                          type="button"
                          onClick={() => handleAccept(req)}
                          disabled={actionLoading === req.id}
                          className="flex-1 py-2 rounded-xl bg-[#7C5CBF] hover:bg-[#6949A8] text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                        >
                          Chấp nhận
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(req)}
                          disabled={actionLoading === req.id}
                          className="px-4 py-2 rounded-xl border border-[#E9E1F3] text-[#77717F] hover:text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                        >
                          Từ chối
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-16 text-center rounded-3xl bg-white border border-[#E9E1F3] text-xs text-[#77717F]">
                Không có lời mời kết nối nào đang chờ.
              </div>
            )}
          </div>
        )}

        {/* 5. Tab 3: Sent Requests */}
        {activeTab === 'sent' && (
          <div className="space-y-4">
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
                      className="p-5 rounded-2xl bg-white border border-[#E9E1F3] shadow-sm flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 truncate mr-3">
                        <img
                          src={avatar}
                          alt=""
                          className="w-11 h-11 rounded-xl object-cover bg-[#F5F0FA]"
                        />
                        <div className="truncate">
                          <h4 className="text-sm font-bold text-[#292631] truncate">
                            {u.display_name || u.username}
                          </h4>
                          <p className="text-xs text-[#77717F]">@{u.username}</p>
                        </div>
                      </div>

                      <span className="px-3 py-1 rounded-full bg-[#F5F0FA] text-[#7C5CBF] text-xs font-semibold border border-[#E9E1F3] shrink-0">
                        Đang chờ duyệt
                      </span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="py-16 text-center rounded-3xl bg-white border border-[#E9E1F3] text-xs text-[#77717F]">
                Bạn chưa gửi lời mời kết nối nào gần đây.
              </div>
            )}
          </div>
        )}
      </main>

      {/* Safety Modals */}
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
