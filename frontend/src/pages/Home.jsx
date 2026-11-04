import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import { getProfile } from '../services/profileService'
import { getSurvey } from '../services/surveyService'
import { getMyConnections, getConnectionRequests, sendConnectionRequest } from '../services/connectionService'
import { getConversations } from '../services/chatService'
import { getMatches } from '../services/matchingService'
import postService from '../services/postService'

export default function Home() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [survey, setSurvey] = useState(null)
  const [friendsCount, setFriendsCount] = useState(0)
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)

  // Recommended connections & Community feed preview
  const [recommendedUsers, setRecommendedUsers] = useState([])
  const [feedPreview, setFeedPreview] = useState([])
  const [connectedIds, setConnectedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [profileData, surveyData, conns, reqs, convs, matchData, posts] =
          await Promise.allSettled([
            getProfile(),
            getSurvey(),
            getMyConnections(),
            getConnectionRequests(),
            getConversations(),
            getMatches(3),
            postService.getFeed({ limit: 2 }),
          ])

        if (profileData.status === 'fulfilled') setProfile(profileData.value)
        if (surveyData.status === 'fulfilled') setSurvey(surveyData.value)
        if (conns.status === 'fulfilled' && Array.isArray(conns.value)) {
          setFriendsCount(conns.value.length)
          setConnectedIds(new Set(conns.value.map((c) => c.user?.id)))
        }
        if (reqs.status === 'fulfilled' && reqs.value) {
          setPendingRequestsCount(reqs.value.incoming?.length || 0)
        }
        if (convs.status === 'fulfilled' && Array.isArray(convs.value)) {
          const unreadTotal = convs.value.reduce((acc, c) => acc + (c.unread_count || 0), 0)
          setUnreadMsgCount(unreadTotal)
        }
        if (matchData.status === 'fulfilled' && matchData.value?.matches) {
          setRecommendedUsers(matchData.value.matches.slice(0, 3))
        }
        if (posts.status === 'fulfilled' && Array.isArray(posts.value)) {
          setFeedPreview(posts.value.slice(0, 2))
        }
      } catch (err) {
        console.error('Lỗi khi tải thông tin Dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleConnect = async (userId) => {
    try {
      await sendConnectionRequest(userId)
      setConnectedIds((prev) => new Set([...prev, userId]))
    } catch (err) {
      console.error('Lỗi khi gửi kết nối:', err)
    }
  }

  const displayName = profile?.display_name || user?.username || 'Bạn'
  const avatarUrl =
    profile?.avatar_url ||
    user?.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`

  return (
    <div className="min-h-screen bg-[#F8F7FA] text-[#292631] font-sans antialiased selection:bg-[#E9E1F3] selection:text-[#7C5CBF] pb-20 md:pb-12">
      <Navbar />

      <main className="max-w-[1140px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ================= 1. HERO WELCOME BANNER ================= */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#7C5CBF] to-[#906CD9] p-8 md:p-10 text-white shadow-[0_12px_36px_rgba(124,92,191,0.22)] overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>

          <div className="relative z-10 max-w-xl text-center md:text-left space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-sm border border-white/20">
              <span>◎ Kindred Community</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Chào mừng bạn trở lại, {displayName}! ✨
            </h1>

            <p className="text-sm text-white/90 leading-relaxed">
              <em>"Find people who understand you."</em> — Nơi bạn tìm thấy những người bạn có cùng
              hoàn cảnh, mục tiêu và chia sẻ những câu chuyện chân thực nhất.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <Link
                to="/discover"
                className="px-5 py-2.5 rounded-xl bg-white text-[#7C5CBF] font-bold text-xs shadow-md hover:bg-[#F5F0FA] transition-all flex items-center gap-1.5"
              >
                <span>Khám phá người đồng điệu</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>

              {!survey && (
                <Link
                  to="/survey"
                  className="px-5 py-2.5 rounded-xl border border-white/80 bg-white/10 text-white font-semibold text-xs hover:bg-white/20 transition-all flex items-center gap-1.5"
                >
                  <span>Hoàn thành Khảo sát</span>
                  <span className="material-symbols-outlined text-[16px]">quiz</span>
                </Link>
              )}
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-center shrink-0">
            <div className="relative">
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover border-4 border-white/80 bg-[#F5F0FA] shadow-lg"
              />
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#10B981] border-2 border-white"></span>
            </div>
            <span className="mt-2 text-xs font-mono font-medium text-white/90">
              @{user?.username}
            </span>
          </div>
        </div>

        {/* ================= 2. CONNECTION OVERVIEW STATS ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-[#E9E1F3] shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#77717F] uppercase tracking-wider">
                Mạng lưới bạn bè
              </span>
              <p className="text-2xl font-bold text-[#292631]">{friendsCount} người</p>
            </div>
            <Link
              to="/connections"
              className="p-2.5 rounded-xl bg-[#F5F0FA] text-[#7C5CBF] hover:bg-[#E9E1F3] transition-colors"
              title="Quản lý kết nối"
            >
              <span className="material-symbols-outlined text-[20px]">diversity_3</span>
            </Link>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E9E1F3] shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#77717F] uppercase tracking-wider">
                Lời mời đang chờ
              </span>
              <p className="text-2xl font-bold text-[#292631]">
                {pendingRequestsCount > 0 ? (
                  <span className="text-[#7C5CBF]">{pendingRequestsCount} lời mời</span>
                ) : (
                  '0 lời mời'
                )}
              </p>
            </div>
            <Link
              to="/connections?tab=received"
              className="p-2.5 rounded-xl bg-[#F5F0FA] text-[#7C5CBF] hover:bg-[#E9E1F3] transition-colors"
              title="Xem lời mời"
            >
              <span className="material-symbols-outlined text-[20px]">mark_email_unread</span>
            </Link>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-[#E9E1F3] shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-[#77717F] uppercase tracking-wider">
                Tin nhắn chưa đọc
              </span>
              <p className="text-2xl font-bold text-[#292631]">
                {unreadMsgCount > 0 ? (
                  <span className="text-red-600">{unreadMsgCount} tin mới</span>
                ) : (
                  'Hộp thư đã đọc'
                )}
              </p>
            </div>
            <Link
              to="/messages"
              className="p-2.5 rounded-xl bg-[#F5F0FA] text-[#7C5CBF] hover:bg-[#E9E1F3] transition-colors"
              title="Mở tin nhắn"
            >
              <span className="material-symbols-outlined text-[20px]">chat</span>
            </Link>
          </div>
        </div>

        {/* ================= 3. RECOMMENDED CONNECTIONS SECTION ================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#292631] flex items-center gap-2">
                <span>Gợi ý kết nối đồng điệu</span>
                <span className="px-2 py-0.5 rounded-full bg-[#F5F0FA] text-[#7C5CBF] text-[11px] font-bold">
                  AI Match
                </span>
              </h2>
              <p className="text-xs text-[#77717F]">Dựa trên sự tương đồng về hoàn cảnh và sở thích</p>
            </div>
            <Link
              to="/discover"
              className="text-xs font-bold text-[#7C5CBF] hover:underline flex items-center gap-1"
            >
              <span>Xem tất cả</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {recommendedUsers.length > 0 ? (
              recommendedUsers.map((item) => {
                const u = item.user || {}
                const isConnected = connectedIds.has(u.id)
                const avatar =
                  u.avatar_url ||
                  `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                    u.username || 'user'
                  )}`

                return (
                  <div
                    key={u.id}
                    className="p-5 rounded-2xl bg-white border border-[#E9E1F3] shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={avatar}
                            alt=""
                            className="w-12 h-12 rounded-xl object-cover bg-[#F5F0FA] border border-[#E9E1F3]"
                          />
                          <div>
                            <h4 className="font-bold text-sm text-[#292631] truncate">
                              {u.display_name || u.username}
                            </h4>
                            <p className="text-[11px] text-[#77717F]">
                              {u.age_group ? `${u.age_group} • ` : ''}
                              {u.current_status || 'Thành viên'}
                            </p>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981] font-bold text-xs border border-[#A7F3D0] shrink-0">
                          {Math.round(item.match_score * 100)}%
                        </span>
                      </div>

                      <p className="text-xs text-[#77717F] mt-3 line-clamp-2 italic bg-[#F8F7FA] p-2.5 rounded-xl border border-[#E9E1F3]">
                        “{u.bio || 'Chào bạn! Mình mong muốn tìm kiếm những người bạn đồng điệu.'}”
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#F2EFF5] flex items-center gap-2">
                      <Link
                        to="/discover"
                        className="flex-1 py-2 rounded-xl bg-[#F5F0FA] text-[#7C5CBF] hover:bg-[#E9E1F3] font-semibold text-xs text-center transition-colors"
                      >
                        Xem chi tiết
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleConnect(u.id)}
                        disabled={isConnected}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                          isConnected
                            ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                            : 'bg-[#7C5CBF] hover:bg-[#6949A8] text-white shadow-sm cursor-pointer'
                        }`}
                      >
                        {isConnected ? 'Đã gửi' : 'Kết nối'}
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="col-span-3 py-8 text-center rounded-2xl bg-white border border-[#E9E1F3] text-xs text-[#77717F]">
                Hãy hoàn thành bài khảo sát để xem các gợi ý ghép đôi phù hợp nhất!
              </div>
            )}
          </div>
        </section>

        {/* ================= 4. COMMUNITY FEED PREVIEW ================= */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#292631]">Bảng tin cộng đồng gần đây</h2>
              <p className="text-xs text-[#77717F]">Những chia sẻ chân thực từ các thành viên</p>
            </div>
            <Link
              to="/communities"
              className="text-xs font-bold text-[#7C5CBF] hover:underline flex items-center gap-1"
            >
              <span>Xem bảng tin</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {feedPreview.length > 0 ? (
              feedPreview.map((post) => (
                <div
                  key={post.id}
                  className="p-5 rounded-2xl bg-white border border-[#E9E1F3] shadow-sm space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <img
                        src={
                          post.author?.avatar_url ||
                          `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                            post.author?.username || 'user'
                          )}`
                        }
                        alt=""
                        className="w-9 h-9 rounded-xl object-cover bg-[#F5F0FA]"
                      />
                      <div>
                        <h4 className="text-xs font-bold text-[#292631]">
                          {post.author?.display_name || post.author?.username}
                        </h4>
                        <span className="text-[10px] text-[#A19AA8]">{post.category}</span>
                      </div>
                    </div>
                    {post.mood && (
                      <span className="px-2 py-0.5 rounded-full bg-[#F5F0FA] text-[#7C5CBF] text-[11px] font-semibold">
                        {post.mood}
                      </span>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-[#292631] line-clamp-3 leading-relaxed">
                    {post.content}
                  </p>

                  <div className="pt-2 border-t border-[#F2EFF5] flex items-center justify-between text-xs text-[#77717F]">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px] text-[#EC4899]">
                          favorite
                        </span>
                        <span>{post.likes_count || 0}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[16px]">chat_bubble</span>
                        <span>{post.comments_count || 0}</span>
                      </span>
                    </div>

                    <Link to="/communities" className="text-[#7C5CBF] font-bold text-[11px] hover:underline">
                      Tham gia thảo luận →
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 py-8 text-center rounded-2xl bg-white border border-[#E9E1F3] text-xs text-[#77717F]">
                Chưa có bài viết mới. Hãy là người đầu tiên chia sẻ góc nhìn!
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}
