import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import ReportModal from '../components/ReportModal'
import BlockConfirmModal from '../components/BlockConfirmModal'
import { getMatches } from '../services/matchingService'
import {
  sendConnectionRequest,
  getMyConnections,
  getConnectionRequests,
  acceptConnection,
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

export default function Discover() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState([])
  const [hasSurvey, setHasSurvey] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Trạng thái kết nối: { [userId]: 'accepted' | 'pending_sent' | 'pending_received' }
  const [connectionStatuses, setConnectionStatuses] = useState({})
  const [incomingRequestMap, setIncomingRequestMap] = useState({})
  const [actionLoadingId, setActionLoadingId] = useState(null)

  // Bộ lọc
  const [selectedAge, setSelectedAge] = useState('Tất cả độ tuổi')
  const [selectedStatus, setSelectedStatus] = useState('Tất cả tình trạng')
  const [selectedConnType, setSelectedConnType] = useState('Tất cả kiểu kết nối')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [sortByCompatibility, setSortByCompatibility] = useState(true)

  // Modal chi tiết & An toàn
  const [selectedUserForProfile, setSelectedUserForProfile] = useState(null)
  const [reportTargetUser, setReportTargetUser] = useState(null)
  const [blockTargetUser, setBlockTargetUser] = useState(null)
  const [connectToast, setConnectToast] = useState('')

  const showToast = (msg) => {
    setConnectToast(msg)
    setTimeout(() => setConnectToast(''), 4000)
  }

  const handleBlockSuccess = (msg) => {
    if (blockTargetUser) {
      const blockedId = blockTargetUser.id
      setMatches((prev) => prev.filter((m) => m.user.id !== blockedId))
      setSelectedUserForProfile(null)
    }
    setBlockTargetUser(null)
    showToast(msg)
  }

  const fetchMatches = async () => {
    setLoading(true)
    setError('')
    try {
      const [data, conns, reqs] = await Promise.all([
        getMatches(40),
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
          'Không thể tải danh sách kết nối. Hãy chắc chắn rằng bạn đã hoàn thành khảo sát!'
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
      if (e.key === 'Escape') setSelectedUserForProfile(null)
    }
    if (selectedUserForProfile) {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedUserForProfile])

  // Lọc dữ liệu client-side
  const filteredMatches = useMemo(() => {
    let result = matches.filter((item) => {
      const u = item.user
      if (selectedAge !== 'Tất cả độ tuổi' && u.age_group !== selectedAge) return false
      if (selectedStatus !== 'Tất cả tình trạng' && u.current_status !== selectedStatus) return false
      if (
        selectedConnType !== 'Tất cả kiểu kết nối' &&
        !u.desired_connection_types?.includes(selectedConnType)
      ) {
        return false
      }
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase()
        const nameMatch = (u.display_name || '').toLowerCase().includes(kw)
        const usernameMatch = (u.username || '').toLowerCase().includes(kw)
        const bioMatch = (u.bio || '').toLowerCase().includes(kw)
        const interestMatch = (item.common_interests || []).some((i) => i.toLowerCase().includes(kw))
        if (!nameMatch && !usernameMatch && !bioMatch && !interestMatch) return false
      }
      return true
    })

    if (sortByCompatibility) {
      result.sort((a, b) => b.match_score - a.match_score)
    }
    return result
  }, [matches, selectedAge, selectedStatus, selectedConnType, searchKeyword, sortByCompatibility])

  // Gửi kết nối
  const handleConnect = async (userId, userName) => {
    setActionLoadingId(userId)
    try {
      await sendConnectionRequest(userId)
      setConnectionStatuses((prev) => ({ ...prev, [userId]: 'pending_sent' }))
      showToast(`Đã gửi lời mời kết nối tới ${userName}! 💌`)
    } catch (err) {
      showToast(err.response?.data?.detail || 'Không thể gửi kết nối.')
    } finally {
      setActionLoadingId(null)
    }
  }

  // Chấp nhận lời mời trực tiếp
  const handleAcceptDirect = async (userId, userName) => {
    const connectionId = incomingRequestMap[userId]
    if (!connectionId) return
    setActionLoadingId(userId)
    try {
      await acceptConnection(connectionId)
      setConnectionStatuses((prev) => ({ ...prev, [userId]: 'accepted' }))
      showToast(`Bạn và ${userName} đã trở thành bạn bè! 🎉`)
    } catch (err) {
      showToast(err.response?.data?.detail || 'Không thể chấp nhận lời mời.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleResetFilters = () => {
    setSelectedAge('Tất cả độ tuổi')
    setSelectedStatus('Tất cả tình trạng')
    setSelectedConnType('Tất cả kiểu kết nối')
    setSearchKeyword('')
    setSortByCompatibility(true)
  }

  return (
    <div className="min-h-screen bg-[#F8F7FA] text-[#292631] font-sans antialiased selection:bg-[#E9E1F3] selection:text-[#7C5CBF] pb-20 md:pb-12">
      <Navbar />

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Toast Feedback */}
        {connectToast && (
          <div className="fixed top-20 right-6 z-50 animate-bounce">
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-[#E9E1F3] shadow-[0_10px_25px_rgba(124,92,191,0.15)] text-[#7C5CBF] font-semibold text-xs">
              <span className="material-symbols-outlined text-[18px]">favorite</span>
              <span>{connectToast}</span>
            </div>
          </div>
        )}

        {/* 1. Header Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F5F0FA] border border-[#E9E1F3] text-[#7C5CBF] text-xs font-bold">
            <span>✨ Khám phá người đồng điệu</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#292631] tracking-tight">
            Discover your kindred.
          </h1>

          <p className="text-sm sm:text-base text-[#77717F]">
            Những người có thể hiểu câu chuyện, hoàn cảnh và suy nghĩ của bạn đang ở ngay đây.
          </p>
        </div>

        {/* 2. Search & Filters Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E9E1F3] shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77717F] text-[20px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Tìm theo tên, sở thích, từ khóa..."
                className="w-full h-11 pl-11 pr-4 rounded-xl border border-[#E9E1F3] bg-[#F8F7FA] text-xs sm:text-sm text-[#292631] placeholder:text-[#A19AA8] focus:bg-white focus:border-[#7C5CBF] outline-none transition-all"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={selectedAge}
                onChange={(e) => setSelectedAge(e.target.value)}
                className="h-11 px-3 rounded-xl border border-[#E9E1F3] bg-[#F8F7FA] text-xs text-[#292631] font-medium outline-none cursor-pointer focus:border-[#7C5CBF]"
              >
                {AGE_FILTER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="h-11 px-3 rounded-xl border border-[#E9E1F3] bg-[#F8F7FA] text-xs text-[#292631] font-medium outline-none cursor-pointer focus:border-[#7C5CBF]"
              >
                {STATUS_FILTER_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleResetFilters}
                className="h-11 px-3.5 rounded-xl border border-[#E9E1F3] bg-[#F5F0FA] text-[#7C5CBF] hover:bg-[#E9E1F3] text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                title="Đặt lại bộ lọc"
              >
                <span className="material-symbols-outlined text-[18px]">restart_alt</span>
                <span className="hidden sm:inline">Đặt lại</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. Match Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="p-6 rounded-3xl bg-white border border-[#E9E1F3] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl skeleton"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-3/4 skeleton"></div>
                    <div className="h-3 w-1/2 skeleton"></div>
                  </div>
                </div>
                <div className="h-14 skeleton"></div>
                <div className="h-8 skeleton"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-10 text-center rounded-3xl bg-white border border-[#E9E1F3] space-y-4 max-w-md mx-auto">
            <span className="material-symbols-outlined text-[40px] text-[#7C5CBF]">quiz</span>
            <h3 className="text-base font-bold text-[#292631]">Chưa có dữ liệu ghép đôi</h3>
            <p className="text-xs text-[#77717F] leading-relaxed">{error}</p>
            <Link to="/survey" className="btn-primary inline-flex !py-2.5 !px-5 text-xs">
              Làm khảo sát ngay
            </Link>
          </div>
        ) : filteredMatches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMatches.map((item) => {
              const u = item.user
              const matchPercent = Math.round(item.match_score * 100)
              const status = connectionStatuses[u.id]
              const avatar =
                u.avatar_url ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                  u.username || 'user'
                )}`

              return (
                <div
                  key={u.id}
                  className="p-6 rounded-3xl bg-white border border-[#E9E1F3] shadow-[0_4px_16px_rgba(124,92,191,0.04)] hover:shadow-[0_12px_30px_rgba(124,92,191,0.1)] transition-all duration-300 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header: Avatar, Name & Match Pill */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={avatar}
                            alt=""
                            className="w-14 h-14 rounded-2xl object-cover bg-[#F5F0FA] border border-[#E9E1F3]"
                            onError={(e) => {
                              e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                                u.username || 'user'
                              )}`
                            }}
                          />
                          <span className="pulse-dot absolute -bottom-0.5 -right-0.5"></span>
                        </div>

                        <div>
                          <div className="flex items-center gap-1">
                            <h3 className="font-bold text-sm text-[#292631] truncate max-w-[130px]">
                              {u.display_name || u.username}
                            </h3>
                            <span
                              className="material-symbols-outlined text-[16px] text-[#7C5CBF]"
                              style={{ fontVariationSettings: "'FILL' 1" }}
                            >
                              verified
                            </span>
                          </div>
                          <p className="text-[11px] text-[#77717F] mt-0.5">
                            {u.age_group ? `${u.age_group} • ` : ''}
                            {u.current_status || 'Thành viên'}
                          </p>
                        </div>
                      </div>

                      {/* Match Percentage Pill */}
                      <div className="px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#10B981] font-bold text-xs border border-[#A7F3D0] shrink-0 flex items-center gap-1 shadow-sm">
                        <span>{matchPercent}%</span>
                        <span className="text-[10px] font-semibold text-[#059669]">Match</span>
                      </div>
                    </div>

                    {/* Bio Quote */}
                    <p className="text-xs text-[#292631] italic bg-[#F8F7FA] p-3 rounded-2xl border border-[#E9E1F3] line-clamp-2 leading-relaxed">
                      “{u.bio || 'Chào bạn! Mình mong muốn kết nối và chia sẻ câu chuyện cùng bạn.'}”
                    </p>

                    {/* Compatibility Reason & Shared Interests */}
                    <div className="space-y-1.5 pt-1">
                      {item.match_reasons && item.match_reasons.length > 0 && (
                        <p className="text-[11px] text-[#7C5CBF] font-semibold flex items-center gap-1">
                          <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                          <span className="line-clamp-1">{item.match_reasons[0]}</span>
                        </p>
                      )}

                      <div className="flex flex-wrap gap-1">
                        {(item.common_interests || []).slice(0, 3).map((interest, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-lg bg-[#F5F0FA] text-[#7C5CBF] text-[11px] font-semibold"
                          >
                            #{interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-[#F2EFF5] flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedUserForProfile(item)}
                      className="flex-1 py-2 rounded-xl bg-[#F5F0FA] text-[#7C5CBF] hover:bg-[#E9E1F3] text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Xem hồ sơ
                    </button>

                    {status === 'accepted' ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/messages?user=${u.id}`)}
                        className="flex-1 py-2 rounded-xl bg-[#7C5CBF] text-white hover:bg-[#6949A8] text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">chat</span>
                        <span>Nhắn tin</span>
                      </button>
                    ) : status === 'pending_received' ? (
                      <button
                        type="button"
                        onClick={() => handleAcceptDirect(u.id, u.display_name || u.username)}
                        disabled={actionLoadingId === u.id}
                        className="flex-1 py-2 rounded-xl bg-[#10B981] text-white hover:bg-[#059669] text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span>
                        <span>Chấp nhận</span>
                      </button>
                    ) : status === 'pending_sent' ? (
                      <button
                        type="button"
                        disabled
                        className="flex-1 py-2 rounded-xl bg-gray-100 text-gray-500 text-xs font-semibold cursor-not-allowed"
                      >
                        Đã gửi lời mời
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleConnect(u.id, u.display_name || u.username)}
                        disabled={actionLoadingId === u.id}
                        className="flex-1 py-2 rounded-xl bg-[#7C5CBF] text-white hover:bg-[#6949A8] text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined text-[16px]">person_add</span>
                        <span>Kết nối</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-12 text-center rounded-3xl bg-white border border-[#E9E1F3] space-y-3">
            <span className="material-symbols-outlined text-[40px] text-[#A19AA8]">
              person_search
            </span>
            <h3 className="text-base font-bold text-[#292631]">Không tìm thấy người phù hợp</h3>
            <p className="text-xs text-[#77717F]">
              Hãy thử điều chỉnh lại bộ lọc độ tuổi hoặc xóa từ khóa tìm kiếm.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-secondary !py-2 !px-4 text-xs inline-flex"
            >
              Đặt lại tất cả bộ lọc
            </button>
          </div>
        )}
      </main>

      {/* ================= PROFILE DETAIL MODAL ================= */}
      {selectedUserForProfile && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedUserForProfile(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white border border-[#E9E1F3] p-6 sm:p-8 shadow-2xl space-y-5 animate-scaleUp max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <img
                  src={
                    selectedUserForProfile.user?.avatar_url ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                      selectedUserForProfile.user?.username || 'user'
                    )}`
                  }
                  alt=""
                  className="w-16 h-16 rounded-2xl object-cover bg-[#F5F0FA] border-2 border-[#E9E1F3]"
                />
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-lg font-bold text-[#292631]">
                      {selectedUserForProfile.user?.display_name ||
                        selectedUserForProfile.user?.username}
                    </h3>
                    <span className="material-symbols-outlined text-[18px] text-[#7C5CBF]">
                      verified
                    </span>
                  </div>
                  <p className="text-xs text-[#77717F]">
                    @{selectedUserForProfile.user?.username} •{' '}
                    {selectedUserForProfile.user?.age_group} •{' '}
                    {selectedUserForProfile.user?.current_status}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserForProfile(null)}
                className="w-8 h-8 rounded-full bg-[#F5F0FA] hover:bg-[#E9E1F3] text-[#77717F] hover:text-[#292631] flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Bio quote */}
            <div className="p-4 rounded-2xl bg-[#F8F7FA] border border-[#E9E1F3] space-y-1">
              <span className="text-[11px] font-bold text-[#7C5CBF] uppercase tracking-wide">
                Tiểu sử cá nhân
              </span>
              <p className="text-xs sm:text-sm text-[#292631] italic leading-relaxed">
                “{selectedUserForProfile.user?.bio || 'Chưa cập nhật tiểu sử.'}”
              </p>
            </div>

            {/* Match percentage & reasons */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#292631]">Độ tương hợp thuật toán</span>
                <span className="font-extrabold text-[#10B981]">
                  {Math.round(selectedUserForProfile.match_score * 100)}% Match
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#F2EFF5] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#7C5CBF] to-[#10B981] rounded-full"
                  style={{ width: `${Math.round(selectedUserForProfile.match_score * 100)}%` }}
                ></div>
              </div>

              {selectedUserForProfile.match_reasons?.map((r, i) => (
                <p key={i} className="text-xs text-[#77717F] flex items-center gap-1.5 pt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7C5CBF]"></span>
                  <span>{r}</span>
                </p>
              ))}
            </div>

            {/* Safety actions */}
            <div className="pt-4 border-t border-[#F2EFF5] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setReportTargetUser(selectedUserForProfile.user)
                  }}
                  className="text-xs text-amber-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">flag</span>
                  <span>Báo cáo</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBlockTargetUser(selectedUserForProfile.user)
                  }}
                  className="text-xs text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">block</span>
                  <span>Chặn</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserForProfile(null)}
                className="btn-secondary !py-2 !px-4 text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
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

      {/* Block Confirm Modal */}
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
