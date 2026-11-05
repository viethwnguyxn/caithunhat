import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Avatar from '../components/Avatar'
import OnlineStatusDot from '../components/OnlineStatusDot'
import { useAuth } from '../contexts/AuthContext'
import postService from '../services/postService'
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
  const [joinedCommunities, setJoinedCommunities] = useState([1, 2])
  const [toastMessage, setToastMessage] = useState('')

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

  const loadPosts = async () => {
    setLoadingPosts(true)
    try {
      const data = await postService.getFeed({
        category: selectedCategory === 'Tất cả' ? '' : selectedCategory,
        limit: 50,
      })
      setPosts(data || [])
    } catch (err) {
      console.error('Lỗi khi tải bảng tin cộng đồng:', err)
      showToast('Không thể tải bài viết, vui lòng thử lại sau.')
    } finally {
      setLoadingPosts(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'feed') {
      loadPosts()
    }
  }, [activeTab, selectedCategory])

  const handleCreatePost = async (e) => {
    e.preventDefault()
    if (!newContent.trim()) {
      showToast('Vui lòng nhập nội dung bài viết')
      return
    }

    setIsSubmitting(true)
    try {
      const created = await postService.createPost({
        category: newCategory,
        content: newContent.trim(),
        mood: newMood,
        image_url: newImageUrl.trim() || null,
      })

      setPosts((prev) => [created, ...prev])
      setNewContent('')
      setNewImageUrl('')
      setShowImageInput(false)
      showToast('Đã đăng bài viết lên cộng đồng lapulga! 🎉')
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

  const handleToggleJoinGroup = (groupId) => {
    setJoinedCommunities((prev) => {
      const isJoined = prev.includes(groupId)
      if (isJoined) {
        showToast('Đã rời khỏi nhóm.')
        return prev.filter((id) => id !== groupId)
      } else {
        showToast('Đã tham gia nhóm thành công! 🌟')
        return [...prev, groupId]
      }
    })
  }

  return (
    <div className="app-green-theme bg-[#08090a] min-h-screen text-[#e3e2e3] font-sans antialiased selection:bg-[#00ff88] selection:text-[#00210c]">
      <Navbar />

      <main className="w-full pt-20 min-h-[calc(100vh-80px)] pb-16">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-24 right-6 z-50 animate-bounce">
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#00ff88]/50 bg-[#11151c]/95 text-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.3)] backdrop-blur-md">
              <span className="material-symbols-outlined text-[20px]">check_circle</span>
              <span className="text-sm font-medium">{toastMessage}</span>
            </div>
          </div>
        )}

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
                  Protocol Sync • V2.4
                </span>
              </div>
              <h1 className="text-3xl md:text-5xl font-extrabold text-[#f1ffef] tracking-tight">
                Community Hub
              </h1>
              <p className="text-sm md:text-base text-[#b9cbb9] mt-2 max-w-xl">
                Kết nối những tâm hồn cùng tần số, chia sẻ góc nhìn và xây dựng nhóm chung đam mê
                trong không gian số bảo mật.
              </p>
            </div>

            {/* Tab Controller Switcher */}
            <div className="flex items-center justify-center mb-6">
              <div className="inline-flex items-center p-1 rounded-full bg-[#11151c] border border-[#1a232e]">
                <button
                  type="button"
                  onClick={() => setActiveTab('feed')}
                  className={`px-6 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
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
                  className={`px-6 py-2.5 rounded-full text-xs md:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer ${
                    activeTab === 'groups'
                      ? 'bg-[#00ff88] text-[#00210c] shadow-[0_0_20px_rgba(0,255,136,0.45)]'
                      : 'text-[#b9cbb9] hover:text-[#f1ffef]'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">group_work</span>
                  <span>👥 Nhóm chủ đề ({COMMUNITY_DIRECTORY.length})</span>
                </button>
              </div>
            </div>

            {/* Horizontal Scrollable Category Pills */}
            <div className="w-full flex items-center justify-start md:justify-center overflow-x-auto pb-2 gap-2 no-scrollbar">
              {COMMUNITY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
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
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]"></span>
                    </div>

                    <div className="flex-1">
                      <textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Bạn đang nghĩ gì hoặc muốn chia sẻ điều gì với cộng đồng?"
                        rows={3}
                        className="w-full p-3 rounded-xl bg-[#08090a] text-[#f1ffef] placeholder:text-[#849585] text-sm focus:outline-none focus:ring-1 focus:ring-[#00ff88] focus:shadow-[0_0_16px_rgba(0,255,136,0.2)] border border-[#1a232e] resize-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Mood Selector Row */}
                  <div className="mt-3 pt-3 flex flex-wrap items-center gap-1.5 bg-[#08090a]/50 p-2 rounded-xl border border-[#1a232e]">
                    <span className="text-[11px] font-mono text-[#849585] mr-1">Tâm trạng:</span>
                    {MOODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setNewMood(m)}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                          newMood === m
                            ? 'font-bold text-[#00210c] bg-[#00ff88] shadow-[0_0_10px_rgba(0,255,136,0.35)]'
                            : 'text-[#b9cbb9] bg-[#181d26] hover:bg-[#1f2021]'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* Image input if opened */}
                  {showImageInput && (
                    <div className="mt-3">
                      <input
                        type="url"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="Dán URL ảnh đính kèm (https://...)"
                        className="w-full h-10 px-3 rounded-xl bg-[#08090a] text-xs text-[#f1ffef] border border-[#1a232e] focus:outline-none focus:ring-1 focus:ring-[#00ff88]"
                      />
                    </div>
                  )}

                  {/* Bottom Action Toolbar */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="h-9 px-3 rounded-xl bg-[#181d26] text-[#00ff88] text-xs font-mono border border-[#1a232e] focus:outline-none cursor-pointer"
                      >
                        {COMMUNITY_CATEGORIES.filter((c) => c !== 'Tất cả').map((c) => (
                          <option key={c} value={c} className="bg-[#11151c] text-[#f1ffef]">
                            {c}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setShowImageInput(!showImageInput)}
                        className={`p-2 rounded-xl transition-all cursor-pointer ${
                          showImageInput
                            ? 'bg-[#00ff88]/20 text-[#00ff88]'
                            : 'bg-[#181d26] hover:bg-[#1f2021] text-[#b9cbb9]'
                        }`}
                        title="Đính kèm link ảnh"
                      >
                        <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleCreatePost}
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl text-xs font-bold bg-[#00ff88] text-[#00210c] shadow-[0_0_20px_rgba(0,255,136,0.4)] hover:shadow-[0_0_28px_rgba(0,255,136,0.6)] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>{isSubmitting ? 'Đang gửi...' : 'Đăng bài'}</span>
                      <span className="material-symbols-outlined text-[16px]">send</span>
                    </button>
                  </div>
                </div>

                {/* Feed Stream */}
                {loadingPosts ? (
                  <div className="py-20 text-center text-[#849585] font-mono text-sm">
                    Đang tải bảng tin cộng đồng...
                  </div>
                ) : posts.length > 0 ? (
                  posts.map((post) => {
                    const author = post.author || {}
                    const isMyPost = user?.id === author.id

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
                              className="p-1.5 rounded-lg text-[#849585] hover:text-red-400 hover:bg-red-500/15 transition-all"
                              title="Xóa bài viết"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>

                        {/* Badges */}
                        <div className="flex items-center gap-2">
                          {post.mood && (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono bg-[#181d26] text-[#00ff88] border border-[#00ff88]/20">
                              {post.mood}
                            </span>
                          )}
                          {post.category && (
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono bg-[#08090a] text-[#4edea3] border border-[#1a232e]">
                              {post.category}
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
              /* Groups View */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {COMMUNITY_DIRECTORY.map((group) => {
                  const isJoined = joinedCommunities.includes(group.id)
                  return (
                    <div
                      key={group.id}
                      className="rounded-2xl bg-[#11151c] border border-[#1a232e] p-5 shadow-lg flex flex-col justify-between hover:border-[#00ff88]/30 transition-all space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <span className="text-3xl p-2.5 rounded-xl bg-[#181d26] border border-[#1a232e]">
                            {group.icon}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#08090a] text-[#4edea3] text-[11px] font-mono border border-[#4edea3]/20">
                            {group.membersCount.toLocaleString()} thành viên
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-[#f1ffef]">{group.name}</h3>
                          <p className="text-xs text-[#849585] font-mono mt-0.5">{group.category}</p>
                        </div>

                        <p className="text-xs text-[#b9cbb9] leading-relaxed line-clamp-3">
                          {group.description}
                        </p>

                        <div className="flex flex-wrap gap-1">
                          {group.tags.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded bg-[#08090a] text-[#849585] text-[10px] font-mono"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleJoinGroup(group.id)}
                        className={`w-full h-10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isJoined
                            ? 'bg-[#181d26] text-[#b9cbb9] hover:text-red-400 hover:bg-red-500/15 border border-[#1a232e]'
                            : 'bg-[#00ff88] text-[#00210c] shadow-[0_0_16px_rgba(0,255,136,0.35)] hover:shadow-[0_0_22px_rgba(0,255,136,0.6)]'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isJoined ? 'check' : 'add'}
                        </span>
                        <span>{isJoined ? 'Đã tham gia' : 'Tham gia nhóm'}</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Tactical Sidebar */}
          <aside className="lg:col-span-4 flex flex-col gap-6">
            {/* User Quick Status HUD */}
            <div className="w-full rounded-2xl bg-[#11151c] border border-[#1a232e] p-5 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-[#181d26] border border-[#00ff88]/40 flex items-center justify-center text-lg text-[#00ff88] font-bold font-mono">
                    LP
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
                    {joinedCommunities.length}
                  </div>
                  <div className="text-[10px] text-[#849585]">Nhóm</div>
                </div>
                <div>
                  <div className="text-base md:text-lg font-bold text-[#44fb8a]">{posts.length}</div>
                  <div className="text-[10px] text-[#849585]">Bài viết</div>
                </div>
                <div>
                  <div className="text-base md:text-lg font-bold text-[#62ff96]">98.2%</div>
                  <div className="text-[10px] text-[#849585]">Cộng hưởng</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className="text-[#b9cbb9]">Chỉ số cộng hưởng tuần</span>
                  <span className="text-[#00ff88] font-bold">+18.5%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[#181d26] overflow-hidden">
                  <div
                    className="h-full bg-[#00ff88] shadow-[0_0_10px_#00ff88]"
                    style={{ width: '78%' }}
                  ></div>
                </div>
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
