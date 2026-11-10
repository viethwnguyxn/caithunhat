import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Avatar from '../components/Avatar'
import OnlineStatusDot from '../components/OnlineStatusDot'
import CreateCommunityModal from '../components/CreateCommunityModal'
import CommunityChatModal from '../components/CommunityChatModal'
import { useAuth } from '../contexts/AuthContext'
import postService from '../services/postService'
import communityService from '../services/communityService'
import { COMMUNITY_CATEGORIES, COMMUNITY_DIRECTORY } from '../data/communities'

const MOODS = ['😊 Vui vẻ', '☕ Thư giãn', '🌧️ Cần chia sẻ', '🚀 Quyết tâm', '✨ Truyền cảm hứng']

function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now - date) / 1000)

  if (diffInSeconds < 60) return 'vừa xong'
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) return `${diffInHours} giờ trước`
  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 7) return `${diffInDays} ngày trước`
  return date.toLocaleDateString('vi-VN')
}

export default function Communities() {
  const [searchParams] = useSearchParams()
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'groups' ? 'groups' : 'feed')
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'Tất cả')
  const [feedFilter, setFeedFilter] = useState('all') // 'all' | 'joined' | categoryName | `group:${groupId}`
  const [toastMessage, setToastMessage] = useState('')

  // State cho Danh sách Cộng đồng (Backend API)
  const [communities, setCommunities] = useState([])
  const [loadingCommunities, setLoadingCommunities] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [chatCommunity, setChatCommunity] = useState(null)

  // Danh sách các danh mục / chủ đề động (kết hợp các chủ đề chuẩn và các chủ đề do user tự tạo)
  const allCategories = useMemo(() => {
    const cats = new Set(COMMUNITY_CATEGORIES.filter((c) => c !== 'Tất cả'))
    communities.forEach((c) => {
      if (c.category) cats.add(c.category)
    })
    return ['Tất cả', ...Array.from(cats)]
  }, [communities])

  // Danh sách các nhóm mà người dùng hiện tại đã tham gia
  const myJoinedCommunities = useMemo(() => {
    return communities.filter((c) => c.is_joined)
  }, [communities])

  // Danh sách nhóm hiển thị ở tab "Nhóm cộng đồng"
  const displayedCommunities = useMemo(() => {
    if (selectedCategory === 'joined') {
      return communities.filter((c) => c.is_joined)
    }
    if (selectedCategory !== 'Tất cả') {
      return communities.filter((c) => c.category === selectedCategory)
    }
    return communities
  }, [communities, selectedCategory])

  // State cho Bảng tin
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)

  // State cho Tạo bài viết
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('Công nghệ & Lập trình')
  const [newMood, setNewMood] = useState('🚀 Quyết tâm')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [showImageInput, setShowImageInput] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Quản lý comments
  const [expandedComments, setExpandedComments] = useState({})
  const [commentsMap, setCommentsMap] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [submittingComment, setSubmittingComment] = useState({})

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // 1. Tải danh sách cộng đồng từ Backend (luôn lấy toàn bộ để state communities luôn đủ dữ liệu)
  const loadCommunities = async () => {
    setLoadingCommunities(true)
    try {
      const data = await communityService.getCommunities(null)
      setCommunities(data || [])
    } catch (err) {
      console.warn('Lỗi khi tải cộng đồng từ API, dùng danh sách fallback:', err)
      setCommunities(
        COMMUNITY_DIRECTORY.map((c) => ({
          ...c,
          members_count: c.membersCount,
          is_joined: false,
        }))
      )
    } finally {
      setLoadingCommunities(false)
    }
  }

  // 2. Tải bảng tin bài viết theo bộ lọc feedFilter
  const loadPosts = async () => {
    setLoadingPosts(true)
    try {
      const params = { limit: 50 }
      if (feedFilter === 'joined') {
        params.joined_only = true
      } else if (feedFilter.startsWith('group:')) {
        params.community_id = parseInt(feedFilter.replace('group:', ''), 10)
      } else if (feedFilter !== 'all' && feedFilter !== 'Tất cả') {
        params.category = feedFilter
      }
      const data = await postService.getFeed(params)
      setPosts(data || [])
    } catch (err) {
      console.error('Lỗi khi tải bảng tin cộng đồng:', err)
      showToast('Không thể tải bài viết, vui lòng thử lại sau.')
    } finally {
      setLoadingPosts(false)
    }
  }

  useEffect(() => {
    loadCommunities()
  }, [])

  useEffect(() => {
    if (activeTab === 'feed') {
      loadPosts()
    }
  }, [activeTab, feedFilter])

  // 3. Xử lý Tạo cộng đồng mới
  const handleCreateCommunity = async (payload) => {
    const created = await communityService.createCommunity(payload)
    showToast(`Đã tạo thành công cộng đồng "${created.name}" kèm nhóm chat riêng! 🎉`)
    await loadCommunities()
    setActiveTab('groups')
  }

  // 4. Xử lý Tham gia / Rời khỏi cộng đồng
  const handleToggleJoinGroup = async (group) => {
    try {
      if (group.is_joined) {
        await communityService.leaveCommunity(group.id)
        setCommunities((prev) =>
          prev.map((c) =>
            c.id === group.id
              ? { ...c, is_joined: false, members_count: Math.max(0, (c.members_count || 1) - 1) }
              : c
          )
        )
        showToast(`Đã rời khỏi nhóm ${group.name}.`)
      } else {
        await communityService.joinCommunity(group.id)
        setCommunities((prev) =>
          prev.map((c) =>
            c.id === group.id
              ? { ...c, is_joined: true, members_count: (c.members_count || 0) + 1 }
              : c
          )
        )
        showToast(`Đã tham gia nhóm ${group.name} thành công! 🌟`)
      }
    } catch (err) {
      console.error('Lỗi khi tham gia/rời nhóm:', err)
      showToast('Không thể cập nhật trạng thái nhóm, vui lòng thử lại.')
    }
  }

  // 5. Mở Nhóm Chat của Cộng đồng
  const handleOpenGroupChat = async (group) => {
    // Nếu chưa tham gia, tự động tham gia nhóm trước để có quyền truy cập nhóm chat
    if (!group.is_joined) {
      try {
        await communityService.joinCommunity(group.id)
        setCommunities((prev) =>
          prev.map((c) =>
            c.id === group.id
              ? { ...c, is_joined: true, members_count: (c.members_count || 0) + 1 }
              : c
          )
        )
      } catch (err) {
        console.warn('Lỗi tự động tham gia nhóm khi mở chat:', err)
      }
    }
    setChatCommunity(group)
  }

  // 6. Đăng bài viết mới
  const handleCreatePost = async (e) => {
    e.preventDefault()
    if (!newContent.trim()) {
      showToast('Vui lòng nhập nội dung bài viết')
      return
    }

    let postCategory = newCategory
    let postCommunityId = null
    if (newCategory.startsWith('grp:')) {
      const parts = newCategory.split(':')
      postCommunityId = parseInt(parts[1], 10)
      postCategory = parts[2] || 'Cộng đồng'
    }

    setIsSubmitting(true)
    try {
      const created = await postService.createPost({
        category: postCategory,
        community_id: postCommunityId,
        content: newContent.trim(),
        mood: newMood,
        image_url: newImageUrl.trim() || null,
      })

      setPosts((prev) => [created, ...prev])
      setNewContent('')
      setNewImageUrl('')
      setShowImageInput(false)
      showToast('Đã đăng bài viết lên cộng đồng! 🎉')
    } catch (err) {
      console.error('Lỗi khi đăng bài viết:', err)
      showToast(err.response?.data?.detail || 'Lỗi khi đăng bài viết')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleToggleLike = async (postId) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          const nextLiked = !p.is_liked_by_me
          return {
            ...p,
            is_liked_by_me: nextLiked,
            likes_count: nextLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1),
          }
        }
        return p
      })
    )

    try {
      await postService.toggleLike(postId)
    } catch (err) {
      console.error('Lỗi khi thả tim:', err)
      loadPosts()
    }
  }

  const handleToggleComments = async (postId) => {
    const isExpanded = !!expandedComments[postId]
    setExpandedComments((prev) => ({ ...prev, [postId]: !isExpanded }))

    if (!isExpanded && !commentsMap[postId]) {
      try {
        const comments = await postService.getComments(postId)
        setCommentsMap((prev) => ({ ...prev, [postId]: comments || [] }))
      } catch (err) {
        console.error('Lỗi khi lấy bình luận:', err)
      }
    }
  }

  const handleAddComment = async (postId) => {
    const text = commentInputs[postId]?.trim()
    if (!text) return

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }))
    try {
      const newComment = await postService.addComment(postId, text)
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }))
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
      )
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }))
      showToast('Đã đăng bình luận! 💬')
    } catch (err) {
      console.error('Lỗi khi đăng bình luận:', err)
      showToast('Không thể gửi bình luận, vui lòng thử lại.')
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }))
    }
  }

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này không?')) return
    try {
      await postService.deletePost(postId)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      showToast('Đã xóa bài viết thành công.')
    } catch (err) {
      console.error('Lỗi khi xóa bài viết:', err)
      showToast(err.response?.data?.detail || 'Không có quyền xóa bài viết này')
    }
  }

  const joinedCount = communities.filter((c) => c.is_joined).length

  return (
    <div className="app-green-theme bg-[#08090a] min-h-screen text-[#e3e2e3] font-sans antialiased selection:bg-[#00ff88] selection:text-[#00210c]">
      <Navbar />

      <main className="w-full pt-20 min-h-[calc(100vh-80px)] pb-16">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-24 right-6 z-50 animate-bounce">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#00ff88]/50 bg-[#11151c]/95 text-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.3)] backdrop-blur-md">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span className="text-sm font-medium">{toastMessage}</span>
            </div>
          </div>
        )}

        {/* Modal Tạo Cộng Đồng Mới */}
        <CreateCommunityModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreated={handleCreateCommunity}
        />

        {/* Modal Nhóm Chat Riêng Của Cộng Đồng */}
        <CommunityChatModal
          isOpen={!!chatCommunity}
          onClose={() => setChatCommunity(null)}
          community={chatCommunity}
        />

        {/* Core Hero Header */}
        <section className="relative w-full overflow-hidden bg-[#0d0e0f] border-b border-[#1a232e] py-10 md:py-12">
          {/* Ambient Glows */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] h-[280px] bg-[#00ff88]/10 blur-[130px] rounded-full pointer-events-none"></div>
          <div className="absolute top-1/2 -left-32 w-80 h-80 bg-[#44fb8a]/5 blur-[100px] rounded-full pointer-events-none"></div>

          <div className="max-w-[1440px] mx-auto px-4 md:px-8 relative z-10">
            {/* Title & Subtitle */}
            <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#181d26] border border-[#1a232e] mb-3 shadow-[0_0_12px_rgba(0,255,136,0.15)]">
                <span className="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]"></span>
                <span className="text-[11px] font-mono text-[#00ff88] uppercase tracking-widest">
                  Community Protocol • V3.0
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-[#f1ffef] tracking-tight">
                Community Hub
              </h1>
              <p className="text-sm md:text-base text-[#b9cbb9] mt-2 max-w-xl">
                Kết nối những tâm hồn cùng tần số, chia sẻ bài viết và trò chuyện realtime trong nhóm chat riêng của từng cộng đồng.
              </p>
            </div>

            {/* Action Bar: Tab Controller Switcher + Nút Tạo Cộng Đồng */}
            <div className="flex flex-wrap items-center justify-center gap-4 mb-6">
              <div className="inline-flex items-center p-1 rounded-full bg-[#11151c] border border-[#1a232e]">
                <button
                  type="button"
                  onClick={() => setActiveTab('feed')}
                  className={`px-5 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'feed'
                      ? 'bg-[#00ff88] text-[#00210c] shadow-[0_0_20px_rgba(0,255,136,0.45)]'
                      : 'text-[#b9cbb9] hover:text-[#f1ffef]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">dynamic_feed</span>
                  <span>📰 Bảng tin (Feed)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('groups')}
                  className={`px-5 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'groups'
                      ? 'bg-[#00ff88] text-[#00210c] shadow-[0_0_20px_rgba(0,255,136,0.45)]'
                      : 'text-[#b9cbb9] hover:text-[#f1ffef]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">group_work</span>
                  <span>👥 Nhóm cộng đồng ({communities.length})</span>
                </button>
              </div>

              {/* Nút Tạo Cộng Đồng Mới */}
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-2.5 rounded-full bg-[#00ff88] text-[#00210c] text-xs md:text-sm font-bold shadow-[0_0_20px_rgba(0,255,136,0.4)] hover:shadow-[0_0_26px_rgba(0,255,136,0.65)] hover:scale-105 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                <span>Tạo cộng đồng mới</span>
              </button>
            </div>

            {/* Horizontal Scrollable Category / Feed Filter Pills */}
            <div className="w-full flex items-center justify-start md:justify-center overflow-x-auto pb-2 gap-2 no-scrollbar">
              {activeTab === 'feed' ? (
                <>
                  {/* Pill: Tất cả bài viết */}
                  <button
                    type="button"
                    onClick={() => setFeedFilter('all')}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
                      feedFilter === 'all'
                        ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/40 shadow-[0_0_12px_rgba(0,255,136,0.22)] font-bold'
                        : 'bg-[#11151c] text-[#b9cbb9] hover:bg-[#181d26] hover:text-[#f1ffef] border border-[#1a232e]'
                    }`}
                  >
                    🌍 Tất cả bài viết
                  </button>

                  {/* Pill: Nhóm của tôi (Đã tham gia) */}
                  <button
                    type="button"
                    onClick={() => setFeedFilter('joined')}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                      feedFilter === 'joined'
                        ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/40 shadow-[0_0_12px_rgba(0,255,136,0.22)] font-bold'
                        : 'bg-[#11151c] text-[#b9cbb9] hover:bg-[#181d26] hover:text-[#f1ffef] border border-[#1a232e]'
                    }`}
                  >
                    <span>⭐ Nhóm của tôi ({myJoinedCommunities.length})</span>
                  </button>

                  {/* Các nhóm đã tham gia */}
                  {myJoinedCommunities.map((grp) => (
                    <button
                      key={`feed-grp-${grp.id}`}
                      type="button"
                      onClick={() => setFeedFilter(`group:${grp.id}`)}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                        feedFilter === `group:${grp.id}`
                          ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/40 shadow-[0_0_12px_rgba(0,255,136,0.22)] font-bold'
                          : 'bg-[#11151c] text-[#b9cbb9] hover:bg-[#181d26] hover:text-[#f1ffef] border border-[#1a232e]'
                      }`}
                      title={`Xem bài viết trong nhóm ${grp.name}`}
                    >
                      <span>{grp.icon || '👥'}</span>
                      <span>{grp.name}</span>
                    </button>
                  ))}

                  {/* Lọc bài viết theo Chủ đề */}
                  {allCategories.filter((c) => c !== 'Tất cả').map((cat) => (
                    <button
                      key={`feed-cat-${cat}`}
                      type="button"
                      onClick={() => setFeedFilter(cat)}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
                        feedFilter === cat
                          ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/40 shadow-[0_0_12px_rgba(0,255,136,0.22)] font-bold'
                          : 'bg-[#11151c] text-[#b9cbb9] hover:bg-[#181d26] hover:text-[#f1ffef] border border-[#1a232e]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </>
              ) : (
                <>
                  {/* Tab Nhóm: Tất cả */}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('Tất cả')}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
                      selectedCategory === 'Tất cả'
                        ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/40 shadow-[0_0_12px_rgba(0,255,136,0.22)] font-bold'
                        : 'bg-[#11151c] text-[#b9cbb9] hover:bg-[#181d26] hover:text-[#f1ffef] border border-[#1a232e]'
                    }`}
                  >
                    Tất cả ({communities.length})
                  </button>

                  {/* Tab Nhóm: Đã tham gia */}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('joined')}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedCategory === 'joined'
                        ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/40 shadow-[0_0_12px_rgba(0,255,136,0.22)] font-bold'
                        : 'bg-[#11151c] text-[#b9cbb9] hover:bg-[#181d26] hover:text-[#f1ffef] border border-[#1a232e]'
                    }`}
                  >
                    <span>⭐ Đã tham gia ({myJoinedCommunities.length})</span>
                  </button>

                  {/* Tab Nhóm: Lọc theo từng Chủ đề */}
                  {allCategories.filter((c) => c !== 'Tất cả').map((cat) => (
                    <button
                      key={`grp-cat-${cat}`}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/40 shadow-[0_0_12px_rgba(0,255,136,0.22)] font-bold'
                          : 'bg-[#11151c] text-[#b9cbb9] hover:bg-[#181d26] hover:text-[#f1ffef] border border-[#1a232e]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </section>

        {/* Main Content Layout */}
        <div className="w-full max-w-[1440px] mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Feed or Groups Grid */}
          <div className="lg:col-span-8 flex flex-col gap-6 max-w-[740px] mx-auto w-full">
            {activeTab === 'feed' ? (
              <>
                {/* Create Post Box Component */}
                <div className="w-full rounded-2xl bg-[#11151c] border border-[#1a232e] p-5 shadow-lg">
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-xl bg-[#181d26] overflow-hidden border border-[#00ff88]/30">
                        <Avatar
                          src={user?.avatar_url}
                          alt="User Avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="flex-1 space-y-3">
                      <textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Chia sẻ góc nhìn, câu chuyện hoặc dự án với cộng đồng..."
                        rows={3}
                        className="w-full bg-[#08090a] text-sm text-[#f1ffef] placeholder:text-[#849585] p-3.5 rounded-xl border border-[#1a232e] focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] transition-all resize-none"
                      />

                      {showImageInput && (
                        <div className="space-y-1 animate-fadeIn">
                          <input
                            type="text"
                            value={newImageUrl}
                            onChange={(e) => setNewImageUrl(e.target.value)}
                            placeholder="Dán URL hình ảnh (Unsplash, Imgur, direct link...)"
                            className="w-full h-10 px-3.5 rounded-xl bg-[#08090a] text-xs text-[#f1ffef] placeholder:text-[#849585] border border-[#1a232e] focus:outline-none focus:ring-1 focus:ring-[#00ff88]"
                          />
                          {newImageUrl && (
                            <div className="w-24 h-24 rounded-lg overflow-hidden border border-[#1a232e] mt-1">
                              <img
                                src={newImageUrl}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#1a232e]">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Category / Group select */}
                          <select
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            className="h-8 px-3 rounded-lg bg-[#08090a] border border-[#1a232e] text-xs text-[#f1ffef] focus:outline-none cursor-pointer max-w-[220px]"
                          >
                            <optgroup label="Chủ đề bài viết">
                              {allCategories.filter((c) => c !== 'Tất cả').map((cat) => (
                                <option key={cat} value={cat}>
                                  🏷️ {cat}
                                </option>
                              ))}
                            </optgroup>
                            {myJoinedCommunities.length > 0 && (
                              <optgroup label="Đăng vào Nhóm của bạn">
                                {myJoinedCommunities.map((grp) => (
                                  <option key={`post-grp-${grp.id}`} value={`grp:${grp.id}:${grp.category}`}>
                                    {grp.icon || '👥'} {grp.name}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>

                          {/* Mood select */}
                          <select
                            value={newMood}
                            onChange={(e) => setNewMood(e.target.value)}
                            className="h-8 px-3 rounded-lg bg-[#08090a] border border-[#1a232e] text-xs text-[#f1ffef] focus:outline-none cursor-pointer"
                          >
                            {MOODS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => setShowImageInput(!showImageInput)}
                            className={`p-1.5 rounded-lg text-xs font-mono flex items-center gap-1 transition-all cursor-pointer ${
                              showImageInput || newImageUrl
                                ? 'bg-[#00ff88]/15 text-[#00ff88]'
                                : 'text-[#849585] hover:text-[#f1ffef]'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[18px]">image</span>
                            <span className="text-[11px]">Ảnh</span>
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={handleCreatePost}
                          disabled={isSubmitting || !newContent.trim()}
                          className="h-9 px-5 rounded-xl bg-[#00ff88] text-[#00210c] text-xs font-bold shadow-[0_0_12px_rgba(0,255,136,0.3)] hover:shadow-[0_0_18px_rgba(0,255,136,0.5)] transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                        >
                          <span className="material-symbols-outlined text-[16px]">send</span>
                          <span>{isSubmitting ? 'Đang đăng...' : 'Đăng bài'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Feed Posts List */}
                {loadingPosts ? (
                  <div className="py-20 text-center text-xs font-mono text-[#849585]">
                    <span className="animate-pulse">Đang tải bảng tin cộng đồng...</span>
                  </div>
                ) : posts.length > 0 ? (
                  posts.map((post) => {
                    const author = post.author || {}
                    const isMyPost = user && author.id === user.id

                    return (
                      <article
                        key={post.id}
                        className="w-full rounded-2xl bg-[#11151c] border border-[#1a232e] p-6 shadow-md transition-all hover:border-[#00ff88]/30 space-y-4"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar
                                src={author.avatar_url}
                                alt={author.username}
                                className="w-12 h-12 rounded-xl object-cover bg-[#08090a] border border-[#00ff88]/30"
                              />
                              <OnlineStatusDot
                                isOnline={author.is_online}
                                className="absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-[#11151c]"
                              />
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#f1ffef] text-sm md:text-base">
                                  {author.display_name || author.username}
                                </span>
                                <span
                                  className="material-symbols-outlined text-[#00ff88] text-[16px]"
                                  style={{ fontVariationSettings: "'FILL' 1" }}
                                >
                                  verified
                                </span>
                                <span className="text-xs text-[#849585] font-mono">
                                  @{author.username}
                                </span>
                              </div>
                              <div className="text-[11px] font-mono text-[#849585]">
                                {formatTimeAgo(post.created_at)}
                              </div>
                            </div>
                          </div>

                          {isMyPost && (
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              className="p-1.5 rounded-lg text-[#849585] hover:text-red-400 hover:bg-red-500/15 transition-all cursor-pointer"
                              title="Xóa bài viết"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {post.mood && (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono bg-[#181d26] text-[#00ff88] border border-[#00ff88]/20">
                              {post.mood}
                            </span>
                          )}
                          {post.community_id && (() => {
                            const comm = communities.find((c) => c.id === post.community_id)
                            return comm ? (
                              <span className="px-2.5 py-0.5 rounded-md text-xs font-mono bg-[#00ff88]/15 text-[#00ff88] border border-[#00ff88]/30 flex items-center gap-1 font-semibold">
                                <span>{comm.icon || '👥'}</span>
                                <span>{comm.name}</span>
                              </span>
                            ) : null
                          })()}
                          {post.category && (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono bg-[#08090a] text-[#4edea3] border border-[#1a232e]">
                              🏷️ {post.category}
                            </span>
                          )}
                        </div>

                        {/* Content */}
                        <p className="text-sm md:text-base text-[#e3e2e3] leading-relaxed whitespace-pre-wrap">
                          {post.content}
                        </p>

                        {/* Image */}
                        {post.image_url && (
                          <div className="w-full rounded-xl overflow-hidden max-h-96 border border-[#1a232e]">
                            <img
                              src={post.image_url}
                              alt="Post attachment"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Action stats */}
                        <div className="flex items-center justify-between pt-2 border-t border-[#1a232e] text-[#b9cbb9] text-xs font-mono">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleLike(post.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                post.is_liked_by_me
                                  ? 'bg-[#00ff88]/15 text-[#00ff88] font-bold shadow-[0_0_10px_rgba(0,255,136,0.2)]'
                                  : 'hover:bg-[#181d26] hover:text-[#f1ffef]'
                              }`}
                            >
                              <span
                                className="material-symbols-outlined text-[18px]"
                                style={{
                                  fontVariationSettings: post.is_liked_by_me ? "'FILL' 1" : "'FILL' 0",
                                }}
                              >
                                favorite
                              </span>
                              <span>{post.likes_count || 0}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleComments(post.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-[#181d26] hover:text-[#f1ffef] transition-all cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                chat_bubble
                              </span>
                              <span>{post.comments_count || 0}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard?.writeText(window.location.href)
                                showToast('Đã sao chép liên kết bài viết!')
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-[#181d26] hover:text-[#f1ffef] transition-all cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[18px]">share</span>
                            </button>
                          </div>
                        </div>

                        {/* Expandable Comments Drawer */}
                        {expandedComments[post.id] && (
                          <div className="pt-3 border-t border-[#1a232e] space-y-3">
                            {commentsMap[post.id] && commentsMap[post.id].length > 0 ? (
                              <div className="space-y-2">
                                {commentsMap[post.id].map((c) => (
                                  <div
                                    key={c.id}
                                    className="p-3 rounded-xl bg-[#08090a] border border-[#1a232e] text-xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between text-[#849585] font-mono">
                                      <span className="text-[#00ff88] font-bold">
                                        @{c.author?.username || 'member'}
                                      </span>
                                      <span>{formatTimeAgo(c.created_at)}</span>
                                    </div>
                                    <p className="text-[#e3e2e3]">{c.content}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-[#849585] italic py-2">
                                Chưa có bình luận nào. Hãy là người đầu tiên!
                              </p>
                            )}

                            {/* Comment input form */}
                            <div className="flex items-center gap-2 pt-2">
                              <input
                                type="text"
                                value={commentInputs[post.id] || ''}
                                onChange={(e) =>
                                  setCommentInputs((prev) => ({
                                    ...prev,
                                    [post.id]: e.target.value,
                                  }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleAddComment(post.id)
                                }}
                                placeholder="Viết phản hồi của bạn..."
                                className="flex-1 h-10 px-3.5 rounded-xl bg-[#08090a] text-xs text-[#f1ffef] placeholder:text-[#849585] border border-[#1a232e] focus:outline-none focus:ring-1 focus:ring-[#00ff88]"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddComment(post.id)}
                                disabled={submittingComment[post.id]}
                                className="h-10 px-4 rounded-xl bg-[#00ff88] text-[#00210c] text-xs font-bold shadow-[0_0_12px_rgba(0,255,136,0.3)] hover:shadow-[0_0_16px_rgba(0,255,136,0.5)] transition-all cursor-pointer"
                              >
                                Gửi
                              </button>
                            </div>
                          </div>
                        )}
                      </article>
                    )
                  })
                ) : (
                  <div className="py-20 text-center rounded-2xl bg-[#11151c] border border-[#1a232e] text-[#849585] space-y-2">
                    <span className="material-symbols-outlined text-[36px] text-[#00ff88]">
                      feed
                    </span>
                    <p className="text-sm">Chưa có bài viết nào trong chủ đề này.</p>
                  </div>
                )}
              </>
            ) : (
              /* Groups View - Danh sách Nhóm Chủ Đề */
              <>
                <div className="flex items-center justify-between pb-2">
                  <h3 className="text-sm font-mono text-[#849585]">
                    Hiển thị <span className="text-[#00ff88] font-bold">{displayedCommunities.length}</span> cộng đồng
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(true)}
                    className="text-xs font-mono text-[#00ff88] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">add_circle</span>
                    <span>Tạo thêm cộng đồng mới</span>
                  </button>
                </div>

                {loadingCommunities ? (
                  <div className="py-20 text-center text-xs font-mono text-[#849585]">
                    <span className="animate-pulse">Đang tải danh sách cộng đồng...</span>
                  </div>
                ) : displayedCommunities.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {displayedCommunities.map((group) => {
                      const tagsList = Array.isArray(group.tags)
                        ? group.tags
                        : typeof group.tags === 'string'
                        ? group.tags.split(',').map((t) => t.trim()).filter(Boolean)
                        : []

                      return (
                        <div
                          key={group.id}
                          className="rounded-2xl bg-[#11151c] border border-[#1a232e] p-5 shadow-lg flex flex-col justify-between hover:border-[#00ff88]/40 transition-all space-y-4"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between">
                              <span className="text-3xl p-2.5 rounded-xl bg-[#181d26] border border-[#1a232e]">
                                {group.icon || '👥'}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-0.5 rounded-full bg-[#08090a] text-[#4edea3] text-[11px] font-mono border border-[#4edea3]/20">
                                  {(group.members_count || group.membersCount || 1).toLocaleString()} thành viên
                                </span>
                              </div>
                            </div>

                            <div>
                              <h3 className="text-base font-bold text-[#f1ffef] line-clamp-1">{group.name}</h3>
                              <p className="text-xs text-[#849585] font-mono mt-0.5">{group.category}</p>
                            </div>

                            <p className="text-xs text-[#b9cbb9] leading-relaxed line-clamp-3">
                              {group.description}
                            </p>

                            {tagsList.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {tagsList.map((t) => (
                                  <span
                                    key={t}
                                    className="px-2 py-0.5 rounded bg-[#08090a] text-[#849585] text-[10px] font-mono"
                                  >
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action Buttons: Chat Nhóm, Xem bài viết & Tham gia */}
                          <div className="space-y-2 pt-2 border-t border-[#1a232e]">
                            <div className="grid grid-cols-2 gap-2">
                              {/* Nút Chat Nhóm Riêng */}
                              <button
                                type="button"
                                onClick={() => handleOpenGroupChat(group)}
                                className="h-9 rounded-xl text-xs font-bold bg-[#181d26] text-[#00ff88] hover:bg-[#00ff88]/15 border border-[#00ff88]/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_10px_rgba(0,255,136,0.15)]"
                                title="Mở nhóm chat thảo luận realtime"
                              >
                                <span className="material-symbols-outlined text-[16px]">forum</span>
                                <span>💬 Chat nhóm</span>
                              </button>

                              {/* Nút Xem bài viết */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCategory(group.category)
                                  setActiveTab('feed')
                                }}
                                className="h-9 rounded-xl text-xs font-semibold bg-[#11151c] text-[#b9cbb9] hover:text-[#f1ffef] hover:bg-[#181d26] border border-[#1a232e] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span className="material-symbols-outlined text-[16px]">article</span>
                                <span>Xem bài ({group.posts_count || 0})</span>
                              </button>
                            </div>

                            {/* Nút Tham gia / Rời nhóm */}
                            <button
                              type="button"
                              onClick={() => handleToggleJoinGroup(group)}
                              className={`w-full h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                                group.is_joined
                                  ? 'bg-[#181d26] text-[#b9cbb9] hover:text-red-400 hover:bg-red-500/15 border border-[#1a232e]'
                                  : 'bg-[#00ff88] text-[#00210c] shadow-[0_0_16px_rgba(0,255,136,0.35)] hover:shadow-[0_0_22px_rgba(0,255,136,0.6)]'
                              }`}
                            >
                              <span className="material-symbols-outlined text-[16px]">
                                {group.is_joined ? 'check' : 'add'}
                              </span>
                              <span>{group.is_joined ? 'Đã tham gia' : 'Tham gia nhóm'}</span>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="py-20 text-center rounded-2xl bg-[#11151c] border border-[#1a232e] text-[#849585] space-y-3 p-8">
                    <span className="material-symbols-outlined text-[42px] text-[#00ff88]">
                      diversity_3
                    </span>
                    <h4 className="text-base font-bold text-[#f1ffef]">
                      {selectedCategory === 'joined'
                        ? 'Bạn chưa tham gia nhóm nào'
                        : `Chưa có cộng đồng nào thuộc chủ đề "${selectedCategory}"`}
                    </h4>
                    <p className="text-xs text-[#849585] max-w-md mx-auto leading-relaxed">
                      {selectedCategory === 'joined'
                        ? 'Hãy duyệt qua các nhóm trong danh mục và bấm "Tham gia nhóm" để cùng thảo luận realtime!'
                        : 'Hãy là người tiên phong tạo cộng đồng đầu tiên cho chủ đề này!'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCreateModalOpen(true)}
                      className="mt-2 px-5 py-2 rounded-xl bg-[#00ff88] text-[#00210c] font-bold text-xs shadow-[0_0_15px_rgba(0,255,136,0.3)] hover:scale-105 transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[16px]">add_circle</span>
                      <span>Tạo cộng đồng ngay</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Tactical Sidebar */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            {/* User Quick Status HUD */}
            <div className="w-full rounded-2xl bg-[#11151c] border border-[#1a232e] p-5 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-[#181d26] border border-[#00ff88]/40 flex items-center justify-center text-lg text-[#00ff88] font-bold font-mono">
                    {user?.username?.substring(0, 2).toUpperCase() || 'KD'}
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]"></span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#f1ffef]">Trạm Kết Nối Của Bạn</h4>
                  <p className="text-[11px] font-mono text-[#849585]">
                    Tần số: 104.2 MHz [Online]
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#08090a] border border-[#1a232e] text-center mb-4 font-mono">
                <div>
                  <div className="text-base md:text-lg font-bold text-[#00ff88]">
                    {joinedCount}
                  </div>
                  <div className="text-[10px] text-[#849585]">Đã tham gia</div>
                </div>
                <div>
                  <div className="text-base md:text-lg font-bold text-[#44fb8a]">{posts.length}</div>
                  <div className="text-[10px] text-[#849585]">Bài viết</div>
                </div>
                <div>
                  <div className="text-base md:text-lg font-bold text-[#62ff96]">{communities.length}</div>
                  <div className="text-[10px] text-[#849585]">Tổng nhóm</div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full h-10 rounded-xl bg-[#00ff88]/15 text-[#00ff88] hover:bg-[#00ff88]/25 border border-[#00ff88]/40 text-xs font-bold font-mono transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_12px_rgba(0,255,136,0.15)]"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  <span>+ Tạo cộng đồng mới</span>
                </button>
              </div>
            </div>

            {/* Trending Radar Topics */}
            <div className="w-full rounded-2xl bg-[#11151c] border border-[#1a232e] p-5 shadow-md">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-[#00ff88]">radar</span>
                  <h4 className="text-sm font-bold text-[#f1ffef]">Chủ đề thịnh hành</h4>
                </div>
                <span className="text-[10px] font-mono text-[#849585] uppercase">Trực tiếp</span>
              </div>

              <div className="flex flex-col gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-[#08090a] border border-[#1a232e] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[#f1ffef]">#DeepWorkVietnam</div>
                    <div className="text-[10px] font-mono text-[#849585]">1.8k thảo luận</div>
                  </div>
                  <span className="text-[#00ff88] font-mono">HOT</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#08090a] border border-[#1a232e] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[#f1ffef]">#OllamaLocalLLM</div>
                    <div className="text-[10px] font-mono text-[#849585]">950 chia sẻ</div>
                  </div>
                  <span className="text-[#44fb8a] font-mono">NEW</span>
                </div>

                <div className="p-2.5 rounded-xl bg-[#08090a] border border-[#1a232e] flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-[#f1ffef]">#SáchHayMỗiNgày</div>
                    <div className="text-[10px] font-mono text-[#849585]">1.2k phản hồi</div>
                  </div>
                  <span className="text-[#62ff96] font-mono">TOP</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
