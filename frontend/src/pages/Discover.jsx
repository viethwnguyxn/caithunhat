import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Avatar from '../components/Avatar'
import OnlineStatusDot from '../components/OnlineStatusDot'
import ReportModal from '../components/ReportModal'
import BlockConfirmModal from '../components/BlockConfirmModal'
import CommunityHubContent from '../components/CommunityHubContent'
import { getMatches } from '../services/matchingService'
import {
  sendConnectionRequest,
  getMyConnections,
  getConnectionRequests,
  acceptConnection,
} from '../services/connectionService'

const AGE_FILTER_OPTIONS = [
  'Tất cả độ tuổi',
  'Dưới 18',
  '18-22',
  '23-26',
  '27-35',
  '36-50',
  'Trên 50',
]

const STATUS_FILTER_OPTIONS = [
  'Tất cả tình trạng',
  'Sinh viên',
  'Đang đi làm',
  'Freelancer',
  'Đang tìm việc / Gap year',
]

const CONNECTION_TYPE_OPTIONS = [
  'Tất cả mục tiêu',
  'Kết nối bạn bè 1-1',
  'Nhóm bạn nhỏ cùng chung mục tiêu',
  'Người đồng hành học tập/công việc',
]

export default function Discover() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [matches, setMatches] = useState([])
  const [hasSurvey, setHasSurvey] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Trạng thái kết nối: { [userId]: 'accepted' | 'pending_sent' | 'pending_received' }
  const [connectionStatuses, setConnectionStatuses] = useState({})
  const [incomingRequestMap, setIncomingRequestMap] = useState({})
  const [sendingConnectId, setSendingConnectId] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  // Bộ lọc
  const [selectedAge, setSelectedAge] = useState('Tất cả độ tuổi')
  const [selectedStatus, setSelectedStatus] = useState('Tất cả tình trạng')
  const [selectedConnType, setSelectedConnType] = useState('Tất cả mục tiêu')
  const [searchKeyword, setSearchKeyword] = useState(searchParams.get('search') || '')
  const [discoveryTab, setDiscoveryTab] = useState(
    searchParams.get('tab') === 'groups' ? 'groups' : 'people'
  )

  // Đồng bộ tab và từ khóa tìm kiếm khi URL thay đổi (vd: bấm link hoặc bấm Khám phá trên Navbar)
  useEffect(() => {
    const urlTab = searchParams.get('tab')
    setDiscoveryTab(urlTab === 'groups' ? 'groups' : 'people')
    const urlSearch = searchParams.get('search')
    if (urlSearch !== null) {
      setSearchKeyword(urlSearch)
    }
  }, [searchParams])

  const handleSwitchTab = (tabId) => {
    setDiscoveryTab(tabId)
    if (tabId === 'groups') {
      setSearchParams({ tab: 'groups' }, { replace: true })
    } else {
      const next = new URLSearchParams()
      if (searchKeyword.trim()) {
        next.set('search', searchKeyword.trim())
      }
      setSearchParams(next, { replace: true })
    }
  }

  // Modal xem chi tiết profile
  const [selectedUserForProfile, setSelectedUserForProfile] = useState(null)
  const [reportTargetUser, setReportTargetUser] = useState(null)
  const [blockTargetUser, setBlockTargetUser] = useState(null)
  const [connectToast, setConnectToast] = useState('')

  useEffect(() => {
    if (connectToast) {
      const t = setTimeout(() => setConnectToast(''), 3500)
      return () => clearTimeout(t)
    }
  }, [connectToast])

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
      setHasSurvey(data.has_survey !== false)

      const statusMap = {}
      const reqMap = {}
      conns.forEach((c) => {
        statusMap[c.user.id] = 'accepted'
      })
      reqs.outgoing?.forEach((r) => {
        statusMap[r.user.id] = 'pending_sent'
      })
      reqs.incoming?.forEach((r) => {
        statusMap[r.user.id] = 'pending_received'
        reqMap[r.user.id] = r.id
      })
      setConnectionStatuses(statusMap)
      setIncomingRequestMap(reqMap)
    } catch (err) {
      console.error('Lỗi khi tải matches:', err)
      setError(
        err.response?.data?.detail ||
          'Không thể tải danh sách kết nối. Vui lòng thử lại sau.'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMatches()
  }, [])

  // Đóng modal bằng phím Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSelectedUserForProfile(null)
    }
    if (selectedUserForProfile) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedUserForProfile])

  // Lọc dữ liệu client-side
  const filteredMatches = useMemo(() => {
    return matches.filter((item) => {
      const u = item.user
      if (connectionStatuses[u.id] === 'accepted') return false
      if (selectedAge !== 'Tất cả độ tuổi' && u.age_group !== selectedAge) return false
      if (selectedStatus !== 'Tất cả tình trạng' && u.current_status !== selectedStatus)
        return false
      if (
        selectedConnType !== 'Tất cả mục tiêu' &&
        !u.desired_connection_types?.includes(selectedConnType)
      ) {
        return false
      }
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase()
        const matchName =
          u.display_name?.toLowerCase().includes(kw) ||
          u.username?.toLowerCase().includes(kw)
        const matchInterest = u.interests?.some((i) => i.toLowerCase().includes(kw))
        const matchGoal = u.goals?.some((g) => g.toLowerCase().includes(kw))
        if (!matchName && !matchInterest && !matchGoal) return false
      }
      return true
    })
  }, [matches, connectionStatuses, selectedAge, selectedStatus, selectedConnType, searchKeyword])

  const handleResetFilters = () => {
    setSelectedAge('Tất cả độ tuổi')
    setSelectedStatus('Tất cả tình trạng')
    setSelectedConnType('Tất cả mục tiêu')
    setSearchKeyword('')
  }

  // Gửi lời mời kết nối
  const handleConnect = async (targetUserId) => {
    setSendingConnectId(targetUserId)
    try {
      await sendConnectionRequest(targetUserId)
      setConnectionStatuses((prev) => ({ ...prev, [targetUserId]: 'pending_sent' }))
      setConnectToast('Đã gửi lời mời kết nối thành công!')
    } catch (err) {
      console.error('Lỗi kết nối:', err)
      setConnectToast(err.response?.data?.detail || 'Không thể gửi kết nối.')
    } finally {
      setSendingConnectId(null)
    }
  }

  // Chấp nhận kết bạn trực tiếp
  const handleInlineAccept = async (targetUserId) => {
    const connId = incomingRequestMap[targetUserId]
    if (!connId) return
    setActionLoadingId(targetUserId)
    try {
      await acceptConnection(connId)
      setConnectionStatuses((prev) => ({ ...prev, [targetUserId]: 'accepted' }))
      setConnectToast('Đã trở thành bạn bè! Bây giờ bạn có thể trò chuyện.')
    } catch (err) {
      console.error('Lỗi chấp nhận kết nối:', err)
      setConnectToast(err.response?.data?.detail || 'Không thể chấp nhận lời mời.')
    } finally {
      setActionLoadingId(null)
    }
  }

  return (
    <div className="discover-page app-green-theme min-h-screen text-[#e3e2e3] font-sans antialiased selection:bg-[#00ff88]/30 selection:text-[#00ff88]">
      <Navbar />

      <div className="pt-16">
        {/* Thanh điều hướng cố định giữa Mọi người và Cộng đồng */}
        <div className="w-full bg-[#0d0e0f] border-b border-[#1a232e]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2">
            {[
              { id: 'people', label: 'Mọi người', icon: 'person_search' },
              { id: 'groups', label: 'Cộng đồng', icon: 'groups' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSwitchTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-3 border-b-2 text-sm font-semibold transition-colors cursor-pointer ${
                  discoveryTab === tab.id
                    ? 'border-[#00ff88] text-[#00ff88]'
                    : 'border-transparent text-[#94a3b8] hover:text-[#f8fafc]'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {discoveryTab === 'groups' ? (
          <CommunityHubContent embedded />
        ) : (
        <main className="w-full pt-6 pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Ambient Atmospheric Cyber Glow Blobs */}
          <div className="pointer-events-none fixed -top-24 left-1/4 w-96 h-96 rounded-full bg-[#00ff88]/10 blur-[150px] -z-10" />
          <div className="pointer-events-none fixed top-1/3 right-10 w-80 h-80 rounded-full bg-[#10b981]/10 blur-[140px] -z-10" />

          {/* Toast thông báo */}
          {connectToast && (
            <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#11151c] text-[#00ff88] border border-[#00ff88]/40 px-5 py-3 rounded-2xl shadow-[0_0_25px_rgba(0,255,136,0.3)] animate-fadeIn text-sm font-semibold backdrop-blur-md">
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span>{connectToast}</span>
            </div>
          )}

          {/* 1. Header & Telemetry Overview */}
          <div className="flex flex-col gap-6 mt-2 mb-6">
            <div className="max-w-2xl">
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#f8fafc] tracking-tight">
                Discover & Match
              </h1>
              <p className="text-[#94a3b8] text-sm sm:text-base mt-2 leading-relaxed">
                Tìm kiếm những người bạn cùng tần số, đồng điệu về hoàn cảnh, tư duy và sẵn sàng
                lắng nghe, sẻ chia chân thành nhất.
              </p>
            </div>
          </div>

          <div className="space-y-4">
          {/* Banner nhắc làm khảo sát nếu chưa hoàn thành */}
          {!hasSurvey && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-[#11151c] to-[#0d1117] border border-[#00ff88]/40 shadow-[0_0_25px_rgba(0,255,136,0.15)] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#00ff88]/20 flex items-center justify-center text-[#00ff88] shrink-0">
                  <span className="material-symbols-outlined text-[22px]">bolt</span>
                </div>
                <div>
                  <h3 className="font-bold text-[#f8fafc] text-sm">
                    Bạn chưa hoàn thành Khảo sát đồng điệu
                  </h3>
                  <p className="text-xs text-[#94a3b8] mt-0.5">
                    Làm khảo sát 6 bước để thuật toán gợi ý những người có độ tương đồng chính xác
                    nhất.
                  </p>
                </div>
              </div>
              <Link
                to="/survey"
                className="px-4 py-2 rounded-xl bg-[#00ff88] text-[#08090a] font-bold text-xs shadow-[0_0_15px_rgba(0,255,136,0.4)] hover:bg-[#00e67a] transition-all shrink-0 inline-flex items-center gap-1"
              >
                <span>Làm khảo sát ngay</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            </div>
          )}

          {/* 2. Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 p-3.5 bg-[#11151c]/90 backdrop-blur-xl rounded-2xl border border-[#1a232e] shadow-xl">
            {/* Search Input */}
            <div className="lg:col-span-5 relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-[#64748b] text-[20px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm theo tên, sở thích, mục tiêu, từ khóa..."
                className="w-full h-11 pl-10 pr-4 rounded-xl bg-[#08090a] border border-[#1a232e] text-[#f8fafc] placeholder:text-[#64748b] text-xs focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] focus:shadow-[0_0_12px_rgba(0,255,136,0.2)] transition-all"
              />
            </div>

            {/* Age Dropdown */}
            <div className="lg:col-span-2 relative">
              <select
                value={selectedAge}
                onChange={(e) => setSelectedAge(e.target.value)}
                className="w-full h-11 px-3 appearance-none rounded-xl bg-[#08090a] border border-[#1a232e] text-[#f8fafc] text-xs focus:outline-none focus:border-[#00ff88] cursor-pointer pr-8 transition-all"
              >
                {AGE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-[#11151c] text-[#f8fafc]">
                    {opt}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-3 text-[#64748b] pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>

            {/* Status Dropdown */}
            <div className="lg:col-span-2 relative">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full h-11 px-3 appearance-none rounded-xl bg-[#08090a] border border-[#1a232e] text-[#f8fafc] text-xs focus:outline-none focus:border-[#00ff88] cursor-pointer pr-8 transition-all"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-[#11151c] text-[#f8fafc]">
                    {opt}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-3 text-[#64748b] pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>

            {/* Connection Type Dropdown */}
            <div className="lg:col-span-3 relative">
              <select
                value={selectedConnType}
                onChange={(e) => setSelectedConnType(e.target.value)}
                className="w-full h-11 px-3 appearance-none rounded-xl bg-[#08090a] border border-[#1a232e] text-[#f8fafc] text-xs focus:outline-none focus:border-[#00ff88] cursor-pointer pr-8 transition-all"
              >
                {CONNECTION_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-[#11151c] text-[#f8fafc]">
                    {opt}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-3 text-[#64748b] pointer-events-none text-[18px]">
                expand_more
              </span>
            </div>
          </div>

          {/* Active Filter Tags & Reset */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-[#94a3b8]">
              Hiển thị{' '}
              <span className="text-[#00ff88] font-bold">{filteredMatches.length}</span> người
              phù hợp
            </span>

            {(selectedAge !== 'Tất cả độ tuổi' ||
              selectedStatus !== 'Tất cả tình trạng' ||
              selectedConnType !== 'Tất cả mục tiêu' ||
              searchKeyword) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 text-[#00ff88] hover:underline"
              >
                <span className="material-symbols-outlined text-[16px]">restart_alt</span>
                Đặt lại bộ lọc
              </button>
            )}
          </div>
          </div>

        {/* 3. Loading & Error States */}
        {loading && (
          <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-2 border-[#1a232e] border-t-[#00ff88] rounded-full animate-spin mb-4" />
            <p className="text-sm text-[#94a3b8] font-medium font-mono">
              Đang tính toán ma trận tương quan TF-IDF...
            </p>
          </div>
        )}

        {error && !loading && (
          <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-center my-8">
            <span className="material-symbols-outlined text-3xl mb-2">error</span>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* 4. Match Cards 3-Column Grid */}
        {!loading && !error && (
          <>
            {filteredMatches.length === 0 ? (
              <div className="py-24 text-center rounded-3xl bg-[#11151c]/60 border border-[#1a232e] p-8">
                <span className="material-symbols-outlined text-5xl text-[#64748b] mb-3">
                  person_search
                </span>
                <h3 className="text-base font-bold text-[#f8fafc]">
                  Không tìm thấy người dùng phù hợp với bộ lọc
                </h3>
                <p className="text-xs text-[#94a3b8] mt-1 max-w-md mx-auto">
                  Hãy thử mở rộng tiêu chuẩn tìm kiếm hoặc xóa các từ khóa hiện tại.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30 font-semibold text-xs hover:bg-[#00ff88]/25 transition-all"
                >
                  Xóa tất cả bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMatches.map((item) => {
                  const u = item.user
                  const score = item.match_score
                  const status = connectionStatuses[u.id]
                  return (
                    <div
                      key={u.id}
                      className="group relative flex flex-col justify-between bg-[#11151c]/90 rounded-2xl border border-[#1a232e] hover:border-[#00ff88]/50 transition-all duration-300 p-5 hover:shadow-[0_0_30px_-5px_rgba(0,255,136,0.25)] hover:-translate-y-1"
                    >
                      <div className="flex flex-col gap-3.5">
                        {/* Header: Avatar, Name, % Match Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0 w-12 h-12 sm:w-14 sm:h-14">
                              <Avatar
                                src={u.avatar_url}
                                alt={u.display_name || u.username}
                                className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl object-cover border border-[#1a232e] bg-[#0d1117]"
                              />
                              <OnlineStatusDot
                                isOnline={u.is_online}
                                className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-[#11151c]"
                              />
                            </div>

                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-1.5">
                                <h3 className="font-bold text-sm text-[#f8fafc] truncate">
                                  {u.display_name || u.username}
                                </h3>
                                <span
                                  className="material-symbols-outlined text-[#00ff88] text-[16px]"
                                  title="Đã xác thực"
                                >
                                  verified
                                </span>
                              </div>
                              <span className="text-[11px] text-[#64748b] truncate">
                                @{u.username}
                              </span>
                              <span className="text-[11px] text-[#10b981] mt-0.5 font-medium truncate">
                                {u.age_group || 'Chưa rõ tuổi'} • {u.current_status || 'Cộng đồng'}
                              </span>
                            </div>
                          </div>

                          {/* Match Score Badge */}
                          <div
                            className={`shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-mono font-bold shadow-sm ${
                              score >= 80
                                ? 'bg-[#00ff88]/20 border-[#00ff88]/50 text-[#00ff88] shadow-[0_0_12px_rgba(0,255,136,0.3)]'
                                : score >= 50
                                ? 'bg-[#10b981]/15 border-[#10b981]/40 text-[#10b981]'
                                : 'bg-[#1a232e] border-[#223344] text-[#94a3b8]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {score >= 80 ? 'local_fire_department' : 'bolt'}
                            </span>
                            <span>{score}% Match</span>
                          </div>
                        </div>

                        {/* Bio / Quote */}
                        {u.bio && (
                          <p className="text-xs text-[#94a3b8] line-clamp-2 italic leading-relaxed">
                            "{u.bio}"
                          </p>
                        )}

                        {/* Why You Match Insight Box */}
                        {item.match_reasons && item.match_reasons.length > 0 && (
                          <div className="flex items-start gap-2 p-2.5 rounded-xl bg-[#08090a] border border-[#00ff88]/20 shadow-[0_0_10px_rgba(0,255,136,0.05)]">
                            <span className="material-symbols-outlined text-[#00ff88] text-[16px] shrink-0 mt-0.5">
                              neurology
                            </span>
                            <div className="flex flex-col text-[11px]">
                              <span className="text-[#64748b] uppercase font-semibold tracking-wider">
                                Điểm chạm tương đồng
                              </span>
                              <span className="text-[#00ff88] font-medium leading-snug line-clamp-1">
                                {item.match_reasons[0]}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Common Interest Tags */}
                        {item.common_interests && item.common_interests.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {item.common_interests.slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-2 py-0.5 rounded-md bg-[#0d1117] text-[#94a3b8] text-[11px] border border-[#1a232e] hover:border-[#00ff88]/40 hover:text-[#00ff88] transition-colors"
                              >
                                #{tag}
                              </span>
                            ))}
                            {item.common_interests.length > 3 && (
                              <span className="px-1.5 py-0.5 rounded-md bg-[#0d1117] text-[#64748b] text-[10px]">
                                +{item.common_interests.length - 3}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-4 mt-3 border-t border-[#1a232e]">
                        <button
                          type="button"
                          onClick={() => setSelectedUserForProfile(item)}
                          className="w-full h-9 px-2 rounded-xl bg-[#0d1117] hover:bg-[#161c26] border border-[#1a232e] hover:border-[#00ff88]/40 text-[#94a3b8] hover:text-[#f8fafc] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                        >
                          <span className="material-symbols-outlined text-[15px]">visibility</span>
                          <span>Hồ sơ</span>
                        </button>

                        {/* Connection State Button */}
                        {status === 'accepted' ? (
                          <button
                            type="button"
                            onClick={() => navigate('/messages', { state: { userId: u.id } })}
                            className="w-full h-9 px-2 rounded-xl bg-[#00ff88]/15 hover:bg-[#00ff88]/25 text-[#00ff88] border border-[#00ff88]/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,255,136,0.15)]"
                          >
                            <span className="material-symbols-outlined text-[15px]">chat</span>
                            <span>Nhắn tin</span>
                          </button>
                        ) : status === 'pending_received' ? (
                          <button
                            type="button"
                            onClick={() => handleInlineAccept(u.id)}
                            disabled={actionLoadingId === u.id}
                            className="w-full h-9 px-2 rounded-xl bg-[#00ff88] hover:bg-[#00e67a] text-[#08090a] text-xs font-bold flex items-center justify-center gap-1 shadow-[0_0_15px_rgba(0,255,136,0.3)] transition-all"
                          >
                            <span className="material-symbols-outlined text-[15px]">handshake</span>
                            <span>{actionLoadingId === u.id ? '...' : 'Đồng ý'}</span>
                          </button>
                        ) : status === 'pending_sent' ? (
                          <button
                            type="button"
                            disabled
                            className="w-full h-9 px-2 rounded-xl bg-[#11151c] border border-[#1a232e] text-[#64748b] text-xs font-semibold flex items-center justify-center gap-1 cursor-not-allowed"
                          >
                            <span className="material-symbols-outlined text-[15px]">schedule</span>
                            <span>Đã gửi</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConnect(u.id)}
                            disabled={sendingConnectId === u.id}
                            className="w-full h-9 px-2 rounded-xl bg-[#00ff88] hover:bg-[#00e67a] text-[#08090a] text-xs font-bold flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(0,255,136,0.35)] transition-all"
                          >
                            <span className="material-symbols-outlined text-[15px]">handshake</span>
                            <span>{sendingConnectId === u.id ? 'Đang gửi...' : 'Kết nối'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* 5. Detail Profile Modal (Frosted Cyber Emerald Glass) */}
        {discoveryTab === 'people' && selectedUserForProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#11151c] border border-[#1a232e] shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-6 text-left">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedUserForProfile(null)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#0d1117] border border-[#1a232e] text-[#94a3b8] hover:text-[#f8fafc] flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>

              {/* User Header */}
              <div className="flex items-center gap-4 mb-6">
                <Avatar
                  src={selectedUserForProfile.user.avatar_url}
                  alt={selectedUserForProfile.user.display_name}
                  className="w-16 h-16 rounded-2xl object-cover border-2 border-[#00ff88]/50 shadow-[0_0_15px_rgba(0,255,136,0.3)]"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-[#f8fafc]">
                      {selectedUserForProfile.user.display_name ||
                        selectedUserForProfile.user.username}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full bg-[#00ff88]/20 border border-[#00ff88]/40 text-[#00ff88] text-xs font-mono font-bold">
                      {selectedUserForProfile.match_score}% Match
                    </span>
                  </div>
                  <p className="text-xs text-[#64748b]">
                    @{selectedUserForProfile.user.username} •{' '}
                    <span className="text-[#10b981]">
                      {selectedUserForProfile.user.age_group} •{' '}
                      {selectedUserForProfile.user.current_status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Bio */}
              {selectedUserForProfile.user.bio && (
                <div className="mb-4 p-3.5 rounded-2xl bg-[#08090a] border border-[#1a232e]">
                  <p className="text-xs text-[#94a3b8] italic leading-relaxed">
                    "{selectedUserForProfile.user.bio}"
                  </p>
                </div>
              )}

              {/* Reasons */}
              {selectedUserForProfile.match_reasons?.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-[#00ff88] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">psychology</span>
                    Lý do thuật toán ghép đôi
                  </h4>
                  <ul className="space-y-1.5">
                    {selectedUserForProfile.match_reasons.map((r, i) => (
                      <li
                        key={i}
                        className="text-xs text-[#e3e2e3] bg-[#0d1117] p-2.5 rounded-xl border border-[#1a232e] flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Interests & Goals */}
              <div className="space-y-3 mb-6">
                {selectedUserForProfile.user.interests?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-[#94a3b8] mb-1.5">Chủ đề & Sở thích:</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUserForProfile.user.interests.map((it) => (
                        <span
                          key={it}
                          className="px-2.5 py-1 rounded-lg bg-[#08090a] border border-[#1a232e] text-xs text-[#94a3b8]"
                        >
                          #{it}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedUserForProfile.user.goals?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-[#94a3b8] mb-1.5">
                      Mục tiêu trong cộng đồng:
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedUserForProfile.user.goals.map((g) => (
                        <span
                          key={g}
                          className="px-2.5 py-1 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 text-xs text-[#00ff88] inline-flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">track_changes</span>
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions: Connect + Report/Block */}
              <div className="flex items-center justify-between pt-4 border-t border-[#1a232e]">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReportTargetUser(selectedUserForProfile.user)
                    }}
                    className="text-xs text-[#64748b] hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">flag</span>
                    Báo cáo
                  </button>
                  <span className="text-[#23283b]">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setBlockTargetUser(selectedUserForProfile.user)
                    }}
                    className="text-xs text-[#64748b] hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">block</span>
                    Chặn
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {connectionStatuses[selectedUserForProfile.user.id] === 'accepted' ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserForProfile(null)
                        navigate('/messages', {
                          state: { userId: selectedUserForProfile.user.id },
                        })
                      }}
                      className="px-4 py-2 rounded-xl bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/40 font-bold text-xs"
                    >
                      Nhắn tin ngay
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        handleConnect(selectedUserForProfile.user.id)
                      }}
                      disabled={sendingConnectId === selectedUserForProfile.user.id}
                      className="px-5 py-2 rounded-xl bg-[#00ff88] text-[#08090a] font-bold text-xs shadow-[0_0_15px_rgba(0,255,136,0.3)] hover:bg-[#00e67a] inline-flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">person_add</span>
                      {sendingConnectId === selectedUserForProfile.user.id
                        ? 'Đang gửi...'
                        : 'Gửi kết nối'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Modal Báo Cáo & Chặn */}
        {discoveryTab === 'people' && reportTargetUser && (
          <ReportModal
            user={reportTargetUser}
            onClose={() => setReportTargetUser(null)}
            onSuccess={(msg) => setConnectToast(msg)}
          />
        )}

        {discoveryTab === 'people' && blockTargetUser && (
          <BlockConfirmModal
            user={blockTargetUser}
            onClose={() => setBlockTargetUser(null)}
            onSuccess={handleBlockSuccess}
          />
        )}
        </main>
        )}
      </div>
    </div>
  )
}
