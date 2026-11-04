import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import postService from '../services/postService'

const COMMUNITIES_GROUPS = [
  {
    id: 1,
    name: 'Lập trình viên & Tech Creators',
    category: 'Công nghệ',
    icon: '💻',
    membersCount: 1240,
    description:
      'Dành cho những bạn đam mê coding, xây dựng sản phẩm công nghệ, AI, chia sẻ kiến thức dự án.',
    tags: ['Python', 'React', 'AI', 'WebDev', 'Startups'],
  },
  {
    id: 2,
    name: 'Sách & Phát triển bản thân',
    category: 'Sách & Tư duy',
    icon: '📚',
    membersCount: 980,
    description:
      'Nơi cùng nhau chia sẻ những cuốn sách hay, đúc kết tư duy tích cực, xây dựng kỷ luật và thói quen.',
    tags: ['Đọc sách', 'Tư duy', 'Thói quen', 'Tâm lý học', 'DeepWork'],
  },
  {
    id: 3,
    name: 'Nghệ thuật & Sáng tạo',
    category: 'Nghệ thuật',
    icon: '🎨',
    membersCount: 750,
    description:
      'Không gian ấm cúng dành cho những tâm hồn yêu vẽ, nhiếp ảnh, âm nhạc, thiết kế đồ họa.',
    tags: ['Hội họa', 'Nhiếp ảnh', 'Thiết kế', 'Âm nhạc', 'Viết lách'],
  },
  {
    id: 4,
    name: 'Sức khỏe, Thể thao & Running',
    category: 'Đời sống',
    icon: '🏃',
    membersCount: 860,
    description:
      'Cùng nhau rèn luyện thể lực, chia sẻ lộ trình chạy bộ, tập gym, yoga và xây dựng lối sống lành mạnh.',
    tags: ['Chạy bộ', 'Fitness', 'Yoga', 'Dinh dưỡng', 'Marathon'],
  },
  {
    id: 5,
    name: 'Freelancer & Remote Workers',
    category: 'Khởi nghiệp',
    icon: '☕',
    membersCount: 690,
    description:
      'Mạng lưới gắn kết cho những người làm việc tự do hoặc làm việc từ xa, tìm bạn đồng hành tại quán cafe.',
    tags: ['Freelance', 'Remote', 'Co-working', 'Quản lý thời gian'],
  },
]

const CATEGORIES = [
  'Tất cả',
  'Công nghệ',
  'Sách & Tư duy',
  'Nghệ thuật',
  'Đời sống',
  'Khởi nghiệp',
]

const MOODS = ['😊 Vui vẻ', '🤔 Suy ngẫm', '☕ Thư giãn', '🚀 Quyết tâm', '🌧️ Cần chia sẻ', '✨ Truyền cảm hứng']

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
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState('feed') // 'feed' | 'groups'
  const [selectedCategory, setSelectedCategory] = useState('Tất cả')
  const [joinedGroups, setJoinedGroups] = useState([1, 2])
  const [toastMessage, setToastMessage] = useState('')

  // State Posts
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)

  // State Create Post
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('Công nghệ')
  const [newMood, setNewMood] = useState('😊 Vui vẻ')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [showImageInput, setShowImageInput] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Comments state
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
      console.error('Lỗi khi tải bảng tin:', err)
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
      showToast('Đã đăng bài viết lên cộng đồng thành công! 🎉')
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
    setJoinedGroups((prev) => {
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

  const userAvatar =
    user?.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`

  return (
    <div className="min-h-screen bg-[#F8F7FA] text-[#292631] font-sans antialiased selection:bg-[#E9E1F3] selection:text-[#7C5CBF] pb-20 md:pb-12">
      <Navbar />

      <main className="max-w-[1140px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Toast */}
        {toastMessage && (
          <div className="fixed top-20 right-6 z-50 animate-bounce">
            <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white border border-[#E9E1F3] shadow-md text-[#7C5CBF] font-semibold text-xs">
              <span className="material-symbols-outlined text-[18px]">info</span>
              <span>{toastMessage}</span>
            </div>
          </div>
        )}

        {/* 1. Header Section */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F5F0FA] border border-[#E9E1F3] text-[#7C5CBF] text-xs font-bold">
            <span>🌟 Không gian chia sẻ</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#292631] tracking-tight">
            Community
          </h1>

          <p className="text-sm sm:text-base text-[#77717F]">
            Chia sẻ câu chuyện, ý tưởng và những điều bạn quan tâm trong không gian thấu cảm, văn minh.
          </p>

          {/* Tab Switcher */}
          <div className="pt-2 flex justify-center">
            <div className="inline-flex p-1 rounded-2xl bg-white border border-[#E9E1F3] shadow-sm">
              <button
                type="button"
                onClick={() => setActiveTab('feed')}
                className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'feed'
                    ? 'bg-[#7C5CBF] text-white shadow-sm font-bold'
                    : 'text-[#77717F] hover:text-[#292631]'
                }`}
              >
                📰 Bảng tin bài viết
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('groups')}
                className={`px-5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'groups'
                    ? 'bg-[#7C5CBF] text-white shadow-sm font-bold'
                    : 'text-[#77717F] hover:text-[#292631]'
                }`}
              >
                👥 Nhóm chủ đề ({COMMUNITIES_GROUPS.length})
              </button>
            </div>
          </div>
        </div>

        {/* 2. Category Chips Bar */}
        {activeTab === 'feed' && (
          <div className="w-full flex items-center justify-start sm:justify-center overflow-x-auto pb-2 gap-2 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`shrink-0 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#7C5CBF] text-white shadow-sm'
                    : 'bg-white text-[#77717F] hover:text-[#292631] hover:bg-[#F5F0FA] border border-[#E9E1F3]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* 3. Main Content: Feed or Groups */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Feed Column */}
          <div className="lg:col-span-8 space-y-6">
            {activeTab === 'feed' ? (
              <>
                {/* Create Post Composer */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E9E1F3] shadow-sm space-y-4">
                  <div className="flex items-start gap-3.5">
                    <img
                      src={userAvatar}
                      alt=""
                      className="w-11 h-11 rounded-2xl object-cover bg-[#F5F0FA] border border-[#E9E1F3] shrink-0"
                    />
                    <div className="flex-1">
                      <textarea
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="Bạn đang nghĩ gì hoặc muốn chia sẻ điều gì hôm nay?"
                        rows={3}
                        className="w-full p-3.5 rounded-2xl border border-[#E9E1F3] bg-[#F8F7FA] text-xs sm:text-sm text-[#292631] placeholder:text-[#A19AA8] focus:bg-white focus:border-[#7C5CBF] outline-none transition-all resize-none"
                      />
                    </div>
                  </div>

                  {/* Mood Selector Row */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] font-semibold text-[#77717F] mr-1">Tâm trạng:</span>
                    {MOODS.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setNewMood(m)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                          newMood === m
                            ? 'bg-[#7C5CBF] text-white font-semibold shadow-xs'
                            : 'bg-[#F8F7FA] text-[#77717F] hover:bg-[#F5F0FA]'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* Image link input */}
                  {showImageInput && (
                    <div>
                      <input
                        type="url"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="Dán link ảnh đính kèm (https://...)"
                        className="w-full h-10 px-3.5 rounded-xl border border-[#E9E1F3] bg-[#F8F7FA] text-xs outline-none focus:border-[#7C5CBF]"
                      />
                    </div>
                  )}

                  {/* Bottom Actions */}
                  <div className="pt-2 border-t border-[#F2EFF5] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        className="h-9 px-3 rounded-xl border border-[#E9E1F3] bg-[#F8F7FA] text-xs font-semibold text-[#7C5CBF] outline-none cursor-pointer"
                      >
                        {CATEGORIES.filter((c) => c !== 'Tất cả').map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => setShowImageInput(!showImageInput)}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${
                          showImageInput
                            ? 'bg-[#F5F0FA] text-[#7C5CBF]'
                            : 'text-[#77717F] hover:bg-[#F5F0FA]'
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
                      className="btn-primary !py-2 !px-5 text-xs cursor-pointer shadow-sm disabled:opacity-50"
                    >
                      <span>{isSubmitting ? 'Đang gửi...' : 'Đăng bài'}</span>
                      <span className="material-symbols-outlined text-[16px]">send</span>
                    </button>
                  </div>
                </div>

                {/* Posts Stream */}
                {loadingPosts ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-6 rounded-3xl bg-white border border-[#E9E1F3] space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl skeleton"></div>
                          <div className="space-y-2 flex-1">
                            <div className="h-4 w-1/3 skeleton"></div>
                            <div className="h-3 w-1/4 skeleton"></div>
                          </div>
                        </div>
                        <div className="h-16 skeleton"></div>
                      </div>
                    ))}
                  </div>
                ) : posts.length > 0 ? (
                  posts.map((post) => {
                    const author = post.author || {}
                    const avatar =
                      author.avatar_url ||
                      `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                        author.username || 'user'
                      )}`
                    const isMyPost = user?.id === author.id

                    return (
                      <article
                        key={post.id}
                        className="p-6 rounded-3xl bg-white border border-[#E9E1F3] shadow-sm hover:shadow-md transition-all space-y-4"
                      >
                        {/* Author Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={avatar}
                              alt=""
                              className="w-11 h-11 rounded-2xl object-cover bg-[#F5F0FA] border border-[#E9E1F3]"
                            />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-sm text-[#292631]">
                                  {author.display_name || author.username}
                                </h4>
                                <span className="text-xs text-[#77717F]">@{author.username}</span>
                              </div>
                              <div className="text-[11px] text-[#A19AA8] mt-0.5">
                                {formatTimeAgo(post.created_at)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {post.category && (
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F5F0FA] text-[#7C5CBF]">
                                {post.category}
                              </span>
                            )}

                            {isMyPost && (
                              <button
                                type="button"
                                onClick={() => handleDeletePost(post.id)}
                                className="p-1 rounded-lg text-[#A19AA8] hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Xóa bài viết"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Mood */}
                        {post.mood && (
                          <span className="inline-block px-2.5 py-0.5 rounded-lg text-xs bg-[#F8F7FA] text-[#77717F] border border-[#E9E1F3]">
                            {post.mood}
                          </span>
                        )}

                        {/* Content */}
                        <p className="text-sm text-[#292631] leading-relaxed whitespace-pre-wrap">
                          {post.content}
                        </p>

                        {/* Image */}
                        {post.image_url && (
                          <div className="rounded-2xl overflow-hidden max-h-96 border border-[#E9E1F3]">
                            <img
                              src={post.image_url}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="pt-3 border-t border-[#F2EFF5] flex items-center justify-between text-xs text-[#77717F]">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleToggleLike(post.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                                post.is_liked_by_me
                                  ? 'bg-pink-50 text-pink-600 font-bold'
                                  : 'hover:bg-[#F5F0FA] hover:text-[#7C5CBF]'
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
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl hover:bg-[#F5F0FA] hover:text-[#7C5CBF] transition-all cursor-pointer"
                            >
                              <span className="material-symbols-outlined text-[18px]">
                                chat_bubble
                              </span>
                              <span>{post.comments_count || 0}</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(window.location.href)
                              showToast('Đã sao chép liên kết bài viết!')
                            }}
                            className="p-1.5 rounded-xl hover:bg-[#F5F0FA] hover:text-[#7C5CBF] transition-colors"
                            title="Chia sẻ"
                          >
                            <span className="material-symbols-outlined text-[18px]">share</span>
                          </button>
                        </div>

                        {/* Expandable Comments Drawer */}
                        {expandedComments[post.id] && (
                          <div className="pt-3 border-t border-[#F2EFF5] space-y-3">
                            {commentsMap[post.id] && commentsMap[post.id].length > 0 ? (
                              <div className="space-y-2">
                                {commentsMap[post.id].map((c) => (
                                  <div
                                    key={c.id}
                                    className="p-3 rounded-2xl bg-[#F8F7FA] border border-[#E9E1F3] text-xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between text-[#77717F]">
                                      <span className="font-bold text-[#7C5CBF]">
                                        @{c.author?.username || 'member'}
                                      </span>
                                      <span className="text-[10px] text-[#A19AA8]">
                                        {formatTimeAgo(c.created_at)}
                                      </span>
                                    </div>
                                    <p className="text-[#292631]">{c.content}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-[#A19AA8] italic py-1">
                                Chưa có bình luận nào. Hãy là người đầu tiên!
                              </p>
                            )}

                            {/* Input Form */}
                            <div className="flex items-center gap-2 pt-1">
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
                                placeholder="Viết phản hồi chân thành..."
                                className="flex-1 h-10 px-3.5 rounded-xl border border-[#E9E1F3] bg-[#F8F7FA] text-xs outline-none focus:bg-white focus:border-[#7C5CBF]"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddComment(post.id)}
                                disabled={submittingComment[post.id]}
                                className="btn-primary !py-2 !px-4 text-xs cursor-pointer shadow-sm"
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
                  <div className="py-16 text-center rounded-3xl bg-white border border-[#E9E1F3] text-xs text-[#77717F] space-y-2">
                    <span className="material-symbols-outlined text-[36px] text-[#7C5CBF]">
                      dynamic_feed
                    </span>
                    <p>Chưa có bài viết nào trong chủ đề này.</p>
                  </div>
                )}
              </>
            ) : (
              /* Groups View */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {COMMUNITIES_GROUPS.map((group) => {
                  const isJoined = joinedGroups.includes(group.id)
                  return (
                    <div
                      key={group.id}
                      className="p-6 rounded-3xl bg-white border border-[#E9E1F3] shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <span className="text-3xl p-3 rounded-2xl bg-[#F5F0FA] border border-[#E9E1F3]">
                            {group.icon}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#10B981] font-bold text-xs border border-[#A7F3D0]">
                            {group.membersCount.toLocaleString()} thành viên
                          </span>
                        </div>

                        <div>
                          <h3 className="text-base font-bold text-[#292631]">{group.name}</h3>
                          <span className="text-xs text-[#7C5CBF] font-semibold">{group.category}</span>
                        </div>

                        <p className="text-xs text-[#77717F] leading-relaxed line-clamp-2">
                          {group.description}
                        </p>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {group.tags.map((t) => (
                            <span
                              key={t}
                              className="px-2 py-0.5 rounded-lg bg-[#F8F7FA] text-[#77717F] text-[10px] font-medium"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleJoinGroup(group.id)}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isJoined
                            ? 'bg-[#F5F0FA] text-[#7C5CBF] hover:bg-red-50 hover:text-red-600 border border-[#E9E1F3]'
                            : 'btn-primary'
                        }`}
                      >
                        {isJoined ? '✓ Đã tham gia' : '+ Tham gia nhóm'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Sidebar Column */}
          <aside className="lg:col-span-4 space-y-6">
            {/* Community Guidelines Card */}
            <div className="p-6 rounded-3xl bg-white border border-[#E9E1F3] shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-[#7C5CBF] font-bold text-sm">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
                <span>Nguyên tắc cộng đồng</span>
              </div>
              <ul className="text-xs text-[#77717F] space-y-2 leading-relaxed">
                <li className="flex items-start gap-1.5">
                  <span className="text-[#10B981]">✓</span>
                  <span>Lắng nghe chân thành, không phán xét góc nhìn của người khác.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#10B981]">✓</span>
                  <span>Tôn trọng danh tính và quyền riêng tư cá nhân.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <span className="text-[#10B981]">✓</span>
                  <span>Chia sẻ tích cực, hướng đến kết nối sâu sắc.</span>
                </li>
              </ul>
            </div>

            {/* Trending Topics Card */}
            <div className="p-6 rounded-3xl bg-white border border-[#E9E1F3] shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-[#292631] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[18px] text-[#7C5CBF]">
                  trending_up
                </span>
                <span>Chủ đề thảo luận nổi bật</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-2xl bg-[#F8F7FA] border border-[#E9E1F3] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#292631]">#DocSachMoiNgay</p>
                    <span className="text-[10px] text-[#A19AA8]">340 bài thảo luận</span>
                  </div>
                  <span className="text-[#7C5CBF] font-bold text-xs">HOT</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#F8F7FA] border border-[#E9E1F3] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#292631]">#TuHocLapTrinh</p>
                    <span className="text-[10px] text-[#A19AA8]">210 bài thảo luận</span>
                  </div>
                  <span className="text-[#10B981] font-bold text-xs">NEW</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#F8F7FA] border border-[#E9E1F3] flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#292631]">#TamSuGapYear</p>
                    <span className="text-[10px] text-[#A19AA8]">180 chia sẻ</span>
                  </div>
                  <span className="text-[#7C5CBF] font-bold text-xs">TOP</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}
