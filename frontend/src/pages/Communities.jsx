import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import postService from '../services/postService'

const COMMUNITIES_DATA = [
  {
    id: 1,
    name: 'Lập trình viên & Tech Creators',
    category: 'Công nghệ',
    icon: '💻',
    bgGradient: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    membersCount: 1240,
    description:
      'Dành cho những bạn đam mê coding, xây dựng sản phẩm công nghệ, chia sẻ kinh nghiệm học thuật và trao đổi kiến thức dự án.',
    tags: ['Python', 'React', 'AI / ML', 'Web Dev', 'Startups'],
    activeTopic: 'Chia sẻ các dự án cá nhân tâm đắc nhất bạn từng làm',
    keyword: 'Lập trình',
  },
  {
    id: 2,
    name: 'Sách & Phát triển bản thân',
    category: 'Học tập & Sự nghiệp',
    icon: '📚',
    bgGradient: 'linear-gradient(135deg, #0ea5e9 0%, #3b82f6 100%)',
    membersCount: 980,
    description:
      'Nơi cùng nhau chia sẻ những cuốn sách hay, đúc kết tư duy tích cực, xây dựng kỷ luật và thói quen tốt mỗi ngày.',
    tags: ['Đọc sách', 'Tư duy', 'Thói quen', 'Tâm lý học', 'Phát triển bản thân'],
    activeTopic: 'Cuốn sách nào đã thay đổi góc nhìn cuộc sống của bạn?',
    keyword: 'Đọc sách',
  },
  {
    id: 3,
    name: 'Nghệ thuật & Sáng tạo',
    category: 'Nghệ thuật',
    icon: '🎨',
    bgGradient: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
    membersCount: 750,
    description:
      'Không gian ấm cúng dành cho những tâm hồn yêu vẽ, nhiếp ảnh, âm nhạc, thiết kế đồ họa và sáng tác nội dung.',
    tags: ['Hội họa', 'Nhiếp ảnh', 'Thiết kế', 'Âm nhạc', 'Viết lách'],
    activeTopic: 'Tác phẩm sáng tạo gần đây khiến bạn tự hào nhất',
    keyword: 'Nghệ thuật',
  },
  {
    id: 4,
    name: 'Sức khỏe, Thể thao & Running',
    category: 'Đời sống & Sở thích',
    icon: '🏃',
    bgGradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    membersCount: 860,
    description:
      'Cùng nhau rèn luyện thể lực, chia sẻ lộ trình chạy bộ, tập gym, yoga và xây dựng lối sống lành mạnh, giàu năng lượng.',
    tags: ['Chạy bộ', 'Gym & Fitness', 'Yoga', 'Dinh dưỡng', 'Marathon'],
    activeTopic: 'Mục tiêu chạy bộ / thể thao của bạn trong tháng này',
    keyword: 'Chạy bộ',
  },
  {
    id: 5,
    name: 'Sinh viên & Định hướng tương lai',
    category: 'Học tập & Sự nghiệp',
    icon: '🎓',
    bgGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    membersCount: 1520,
    description:
      'Đồng hành cùng các bạn trẻ trong giai đoạn học đại học, thực tập, làm đồ án tốt nghiệp và định hình sự nghiệp đầu đời.',
    tags: ['Sinh viên', 'Thực tập', 'Định hướng', 'Kỹ năng mềm', 'Tìm việc'],
    activeTopic: 'Kinh nghiệm phỏng vấn thực tập lần đầu không bị run',
    keyword: 'Sinh viên',
  },
  {
    id: 6,
    name: 'Freelancer & Remote Workers',
    category: 'Đời sống & Sở thích',
    icon: '☕',
    bgGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    membersCount: 690,
    description:
      'Mạng lưới gắn kết cho những người làm việc tự do hoặc làm việc từ xa, tìm bạn đồng hành tại quán cafe và chia sẻ dự án.',
    tags: ['Freelance', 'Remote Work', 'Co-working', 'Quản lý thời gian', 'Cà phê'],
    activeTopic: 'Địa điểm làm việc cafe yêu thích nhất của bạn',
    keyword: 'Freelancer',
  },
]

const CATEGORIES = [
  'Tất cả',
  'Công nghệ',
  'Học tập & Sự nghiệp',
  'Nghệ thuật',
  'Đời sống & Sở thích',
  'Tâm sự & Cảm xúc',
]

const MOODS = [
  '😊 Vui vẻ',
  '🤔 Suy ngẫm',
  '☕ Thư giãn',
  '🚀 Quyết tâm',
  '🌧️ Cần chia sẻ',
  '✨ Truyền cảm hứng',
  '🎯 Tập trung',
]

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
  const navigate = useNavigate()
  const { user } = useAuth()

  // Chế độ xem: 'feed' (Bảng tin bài viết) hoặc 'groups' (Danh sách nhóm)
  const [activeTab, setActiveTab] = useState('feed')

  // Phân loại chủ đề
  const [selectedCategory, setSelectedCategory] = useState('Tất cả')
  const [joinedCommunities, setJoinedCommunities] = useState([1, 2])
  const [toastMessage, setToastMessage] = useState('')

  // State cho Bảng tin (Feed)
  const [posts, setPosts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)

  // State cho Đăng bài mới
  const [newContent, setNewContent] = useState('')
  const [newCategory, setNewCategory] = useState('Công nghệ')
  const [newMood, setNewMood] = useState('😊 Vui vẻ')
  const [newImageUrl, setNewImageUrl] = useState('')
  const [showImageInput, setShowImageInput] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Quản lý mở bình luận cho từng bài viết: { [postId]: boolean }
  const [expandedComments, setExpandedComments] = useState({})
  // Dữ liệu chi tiết bình luận: { [postId]: CommentResponse[] }
  const [commentsMap, setCommentsMap] = useState({})
  // Input bình luận của từng bài: { [postId]: string }
  const [commentInputs, setCommentInputs] = useState({})
  const [submittingComment, setSubmittingComment] = useState({})

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
  }

  // Tải danh sách bài viết từ Backend
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

  // Xử lý tạo bài viết mới
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

      // Đưa bài viết mới lên đầu danh sách
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

  // Thả tim / Hủy thả tim bài viết
  const handleToggleLike = async (postId) => {
    // Optimistic UI update
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
      // Rollback nếu thất bại
      loadPosts()
    }
  }

  // Mở/Đóng phần bình luận
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

  // Gửi bình luận
  const handleAddComment = async (postId) => {
    const text = commentInputs[postId]?.trim()
    if (!text) return

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }))
    try {
      const newComment = await postService.addComment(postId, text)
      // Cập nhật danh sách bình luận
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment],
      }))
      // Cập nhật đếm số lượng bình luận
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
      )
      // Xóa input
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }))
      showToast('Đã đăng bình luận! 💬')
    } catch (err) {
      console.error('Lỗi khi đăng bình luận:', err)
      showToast('Không thể gửi bình luận, vui lòng thử lại.')
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }))
    }
  }

  // Xóa bài viết
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

  // Xóa bình luận
  const handleDeleteComment = async (postId, commentId) => {
    if (!window.confirm('Xóa bình luận này?')) return
    try {
      await postService.deleteComment(commentId)
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((c) => c.id !== commentId),
      }))
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: Math.max(0, p.comments_count - 1) } : p
        )
      )
      showToast('Đã xóa bình luận.')
    } catch (err) {
      console.error('Lỗi khi xóa bình luận:', err)
      showToast('Không thể xóa bình luận.')
    }
  }

  const handleToggleJoin = (comm) => {
    if (joinedCommunities.includes(comm.id)) {
      setJoinedCommunities((prev) => prev.filter((id) => id !== comm.id))
      showToast(`Đã rời khỏi nhóm ${comm.name}`)
    } else {
      setJoinedCommunities((prev) => [...prev, comm.id])
      showToast(`Đã tham gia cộng đồng ${comm.name}! 🎉`)
    }
  }

  const handleExploreMembers = (comm) => {
    navigate('/discover')
  }

  // Chuyển sang xem bài viết của nhóm cụ thể
  const handleViewCommunityPosts = (comm) => {
    setSelectedCategory(comm.category)
    setActiveTab('feed')
    window.scrollTo({ top: 300, behavior: 'smooth' })
  }

  const filteredCommunities = COMMUNITIES_DATA.filter((c) => {
    if (selectedCategory === 'Tất cả') return true
    return c.category === selectedCategory
  })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f7faf8' }}>
      <Navbar />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 16px 64px' }}>
        {/* Banner tiêu đề */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 14px',
              borderRadius: '20px',
              backgroundColor: '#e1efe8',
              border: '1px solid #dce8e2',
              color: '#245745',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '12px',
            }}
          >
            <span>🌟 Không gian Cộng đồng & Bảng tin Đồng điệu</span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1a1a2e', marginBottom: '8px' }}>
            Kết nối cùng những người <span style={{ color: '#245745' }}>chung đam mê</span>
          </h1>
          <p style={{ color: '#6b7280', fontSize: '15px', maxWidth: '600px', margin: '0 auto' }}>
            Đọc bài viết chia sẻ, thảo luận tâm tư và tham gia các nhóm cộng đồng ấm áp.
          </p>
        </div>

        {/* Toast thông báo */}
        {toastMessage && (
          <div
            style={{
              backgroundColor: '#10b981',
              color: '#ffffff',
              padding: '12px 20px',
              borderRadius: '12px',
              marginBottom: '20px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              animation: 'fadeIn 0.2s ease-in-out',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '14px' }}>✓ {toastMessage}</span>
            <button
              onClick={() => setToastMessage('')}
              style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', fontSize: '16px' }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Tabs lớn chuyển đổi giữa Bảng tin và Danh sách nhóm */}
        <div
          style={{
            display: 'flex',
            backgroundColor: '#dce8e2',
            padding: '4px',
            borderRadius: '14px',
            marginBottom: '24px',
            maxWidth: '440px',
            margin: '0 auto 28px',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('feed')}
            style={{
              flex: 1,
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'feed' ? '#245745' : 'transparent',
              color: activeTab === 'feed' ? '#ffffff' : '#4b5563',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: activeTab === 'feed' ? '0 2px 8px rgba(36, 87, 69, 0.3)' : 'none',
            }}
          >
            <span>📰</span>
            <span>Bảng tin thảo luận</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            style={{
              flex: 1,
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              backgroundColor: activeTab === 'groups' ? '#245745' : 'transparent',
              color: activeTab === 'groups' ? '#ffffff' : '#4b5563',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
              boxShadow: activeTab === 'groups' ? '0 2px 8px rgba(36, 87, 69, 0.3)' : 'none',
            }}
          >
            <span>👥</span>
            <span>Khám phá Nhóm ({COMMUNITIES_DATA.length})</span>
          </button>
        </div>

        {/* Bộ lọc danh mục (Category Pills) */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '12px',
            marginBottom: '24px',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '7px 16px',
                  borderRadius: '20px',
                  border: isSelected ? '1.5px solid #245745' : '1px solid #e5e7eb',
                  backgroundColor: isSelected ? '#245745' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#4b5563',
                  fontSize: '13px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(36, 87, 69, 0.25)' : 'none',
                }}
              >
                {cat}
              </button>
            )
          })}
        </div>

        {/* ========================================================= */}
        {/* VIEW 1: BẢNG TIN BÀI VIẾT & KHOẢNH KHẮC (COMMUNITY FEED)  */}
        {/* ========================================================= */}
        {activeTab === 'feed' && (
          <div>
            {/* KHUNG TẠO BÀI VIẾT MỚI (POST CREATOR) */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '20px',
                padding: '24px',
                border: '1px solid #dce8e2',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                marginBottom: '28px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <img
                  src={
                    user?.avatar_url ||
                    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`
                  }
                  alt="avatar"
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    border: '2px solid #245745',
                    backgroundColor: '#e1efe8',
                  }}
                />
                <div>
                  <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1a1a2e' }}>
                    {user?.display_name || user?.username || 'Bạn'}
                  </h4>
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>
                    Chia sẻ khoảnh khắc hoặc cảm nghĩ cùng mọi người
                  </span>
                </div>
              </div>

              <form onSubmit={handleCreatePost}>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Bạn đang nghĩ gì? Chia sẻ câu chuyện, kinh nghiệm hoặc cảm xúc hôm nay nhé..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '14px',
                    border: '1px solid #e5e7eb',
                    backgroundColor: '#f9fafb',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                  }}
                />

                {/* Ô nhập ảnh tuỳ chọn */}
                {showImageInput && (
                  <div style={{ marginTop: '10px' }}>
                    <input
                      type="url"
                      placeholder="Dán URL hình ảnh (ví dụ: https://images.unsplash.com/...)"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '10px',
                        border: '1px solid #e5e7eb',
                        fontSize: '13px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}

                {/* Tùy chọn Chủ đề + Cảm xúc + Nút Đăng */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: '14px',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {/* Chọn chủ đề */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Chủ đề:</span>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          backgroundColor: '#ffffff',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          color: '#4b5563',
                        }}
                      >
                        {CATEGORIES.filter((c) => c !== 'Tất cả').map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Chọn tâm trạng */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>Tâm trạng:</span>
                      <select
                        value={newMood}
                        onChange={(e) => setNewMood(e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          backgroundColor: '#ffffff',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          color: '#4b5563',
                        }}
                      >
                        {MOODS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Nút bật/tắt dán ảnh */}
                    <button
                      type="button"
                      onClick={() => setShowImageInput((prev) => !prev)}
                      style={{
                        background: 'none',
                        border: '1px dashed #245745',
                        color: '#245745',
                        padding: '5px 10px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      {showImageInput ? '✕ Bỏ ảnh' : '📷 Thêm ảnh'}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !newContent.trim()}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '10px',
                      border: 'none',
                      backgroundColor: '#245745',
                      color: '#ffffff',
                      fontSize: '13.5px',
                      fontWeight: 700,
                      cursor: isSubmitting || !newContent.trim() ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting || !newContent.trim() ? 0.6 : 1,
                      boxShadow: '0 2px 8px rgba(36, 87, 69, 0.3)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {isSubmitting ? 'Đang đăng...' : 'Đăng bài ✨'}
                  </button>
                </div>
              </form>
            </div>

            {/* DANH SÁCH BÀI VIẾT (FEED ITEMS) */}
            {loadingPosts ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#6b7280', fontSize: '15px' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>⏳</div>
                Đang tải các bài viết cộng đồng...
              </div>
            ) : posts.length === 0 ? (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '20px',
                  padding: '48px 24px',
                  textAlign: 'center',
                  border: '1px solid #dce8e2',
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '14px' }}>📝</div>
                <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1a1a2e', marginBottom: '6px' }}>
                  Chưa có bài viết nào trong chủ đề "{selectedCategory}"
                </h3>
                <p style={{ color: '#6b7280', fontSize: '14px', maxWidth: '400px', margin: '0 auto 18px' }}>
                  Hãy là người đầu tiên chia sẻ cảm nghĩ, mở lời thảo luận để kết nối cùng những người đồng điệu!
                </p>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 200, behavior: 'smooth' })}
                  className="btn-primary"
                  style={{ padding: '8px 20px', fontSize: '13.5px' }}
                >
                  Viết bài ngay ✍️
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {posts.map((post) => {
                  const isAuthor = user?.id === post.author.id
                  const isAdmin = user?.role === 'admin'
                  const isCommentsOpen = !!expandedComments[post.id]
                  const comments = commentsMap[post.id] || []

                  return (
                    <div
                      key={post.id}
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '20px',
                        border: '1px solid #dce8e2',
                        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                        overflow: 'hidden',
                        padding: '24px',
                        transition: 'box-shadow 0.2s ease',
                      }}
                    >
                      {/* Post Header: Tác giả + Nhãn chủ đề + Cảm xúc + Nút xóa */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '14px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={
                              post.author.avatar_url ||
                              `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                                post.author.username
                              )}`
                            }
                            alt={post.author.display_name || post.author.username}
                            style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '50%',
                              objectFit: 'cover',
                              border: '2px solid #245745',
                              backgroundColor: '#e1efe8',
                            }}
                          />
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#1a1a2e' }}>
                                {post.author.display_name || post.author.username}
                              </h4>
                              <span style={{ fontSize: '12px', color: '#9ca3af' }}>@{post.author.username}</span>
                            </div>
                            <span style={{ fontSize: '12px', color: '#6b7280' }}>
                              {formatTimeAgo(post.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Badges: Chủ đề & Cảm xúc */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            style={{
                              fontSize: '11.5px',
                              fontWeight: 700,
                              backgroundColor: '#e1efe8',
                              color: '#245745',
                              padding: '3px 10px',
                              borderRadius: '12px',
                              border: '1px solid #dce8e2',
                            }}
                          >
                            #{post.category}
                          </span>

                          {post.mood && (
                            <span
                              style={{
                                fontSize: '11.5px',
                                fontWeight: 600,
                                backgroundColor: '#fef3c7',
                                color: '#92400e',
                                padding: '3px 8px',
                                borderRadius: '12px',
                              }}
                            >
                              {post.mood}
                            </span>
                          )}

                          {(isAuthor || isAdmin) && (
                            <button
                              type="button"
                              onClick={() => handleDeletePost(post.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '13px',
                                cursor: 'pointer',
                                padding: '4px',
                                marginLeft: '4px',
                              }}
                              title="Xóa bài viết"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Post Content */}
                      <p
                        style={{
                          fontSize: '15px',
                          color: '#374151',
                          lineHeight: '1.65',
                          margin: '0 0 16px 0',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {post.content}
                      </p>

                      {/* Post Image (nếu có) */}
                      {post.image_url && (
                        <div style={{ marginBottom: '16px', borderRadius: '14px', overflow: 'hidden' }}>
                          <img
                            src={post.image_url}
                            alt="Khoảnh khắc"
                            style={{
                              width: '100%',
                              maxHeight: '400px',
                              objectFit: 'cover',
                              borderRadius: '14px',
                            }}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      )}

                      {/* Action Bar: Thả tim & Bình luận */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '16px',
                          paddingTop: '12px',
                          borderTop: '1px solid #f3f4f6',
                        }}
                      >
                        {/* Nút Thả tim */}
                        <button
                          type="button"
                          onClick={() => handleToggleLike(post.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: post.is_liked_by_me ? '#fef2f2' : 'none',
                            border: post.is_liked_by_me ? '1px solid #fecaca' : '1px solid #e5e7eb',
                            borderRadius: '10px',
                            padding: '6px 14px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: post.is_liked_by_me ? '#ef4444' : '#4b5563',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>{post.is_liked_by_me ? '❤️' : '🤍'}</span>
                          <span>{post.likes_count}</span>
                        </button>

                        {/* Nút Mở Bình luận */}
                        <button
                          type="button"
                          onClick={() => handleToggleComments(post.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: isCommentsOpen ? '#e1efe8' : 'none',
                            border: isCommentsOpen ? '1px solid #ddd6fe' : '1px solid #e5e7eb',
                            borderRadius: '10px',
                            padding: '6px 14px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: isCommentsOpen ? '#245745' : '#4b5563',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span>💬</span>
                          <span>{post.comments_count} bình luận</span>
                        </button>
                      </div>

                      {/* KHU VỰC BÌNH LUẬN (COMMENTS ACCORDION) */}
                      {isCommentsOpen && (
                        <div
                          style={{
                            marginTop: '16px',
                            paddingTop: '16px',
                            borderTop: '1px dashed #e5e7eb',
                            backgroundColor: '#f3f7f4',
                            padding: '16px',
                            borderRadius: '14px',
                          }}
                        >
                          {/* Danh sách bình luận */}
                          {comments.length === 0 ? (
                            <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 12px 0', fontStyle: 'italic' }}>
                              Chưa có bình luận nào. Hãy để lại lời nhắn đầu tiên!
                            </p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
                              {comments.map((c) => {
                                const canDeleteComment = user?.id === c.author.id || isAuthor || isAdmin
                                return (
                                  <div
                                    key={c.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'flex-start',
                                      gap: '10px',
                                      backgroundColor: '#ffffff',
                                      padding: '10px 14px',
                                      borderRadius: '12px',
                                      border: '1px solid #dce8e2',
                                    }}
                                  >
                                    <img
                                      src={
                                        c.author.avatar_url ||
                                        `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                                          c.author.username
                                        )}`
                                      }
                                      alt={c.author.display_name || c.author.username}
                                      style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0 }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a2e' }}>
                                          {c.author.display_name || c.author.username}
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                          {formatTimeAgo(c.created_at)}
                                        </span>
                                      </div>
                                      <p style={{ margin: '2px 0 0 0', fontSize: '13.5px', color: '#374151' }}>
                                        {c.content}
                                      </p>
                                    </div>
                                    {canDeleteComment && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteComment(post.id, c.id)}
                                        style={{
                                          background: 'none',
                                          border: 'none',
                                          color: '#9ca3af',
                                          cursor: 'pointer',
                                          fontSize: '12px',
                                        }}
                                        title="Xóa bình luận"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {/* Khung nhập bình luận mới */}
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                              type="text"
                              placeholder="Viết bình luận của bạn..."
                              value={commentInputs[post.id] || ''}
                              onChange={(e) =>
                                setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  handleAddComment(post.id)
                                }
                              }}
                              style={{
                                flex: 1,
                                padding: '8px 14px',
                                borderRadius: '10px',
                                border: '1px solid #d1d5db',
                                fontSize: '13px',
                                outline: 'none',
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => handleAddComment(post.id)}
                              disabled={submittingComment[post.id] || !commentInputs[post.id]?.trim()}
                              style={{
                                padding: '8px 16px',
                                borderRadius: '10px',
                                border: 'none',
                                backgroundColor: '#245745',
                                color: '#ffffff',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor:
                                  submittingComment[post.id] || !commentInputs[post.id]?.trim()
                                    ? 'not-allowed'
                                    : 'pointer',
                                opacity:
                                  submittingComment[post.id] || !commentInputs[post.id]?.trim() ? 0.6 : 1,
                              }}
                            >
                              Gửi
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* VIEW 2: KHÁM PHÁ CÁC NHÓM CỘNG ĐỒNG (GROUPS HUB)          */}
        {/* ========================================================= */}
        {activeTab === 'groups' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))',
              gap: '24px',
            }}
          >
            {filteredCommunities.map((comm) => {
              const isJoined = joinedCommunities.includes(comm.id)
              return (
                <div
                  key={comm.id}
                  style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '20px',
                    border: '1px solid #dce8e2',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  }}
                  className="card-hover"
                >
                  <div>
                    {/* Card Header Banner */}
                    <div
                      style={{
                        background: comm.bgGradient,
                        padding: '24px 20px',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            fontSize: '32px',
                            backgroundColor: 'rgba(255,255,255,0.2)',
                            width: '54px',
                            height: '54px',
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {comm.icon}
                        </span>
                        <div>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              opacity: 0.9,
                            }}
                          >
                            {comm.category}
                          </span>
                          <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '2px 0 0 0' }}>
                            {comm.name}
                          </h3>
                        </div>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div style={{ padding: '20px' }}>
                      {/* Member Count */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: 600 }}>
                          👥 {comm.membersCount.toLocaleString()} thành viên
                        </span>
                        {isJoined && (
                          <span
                            style={{
                              fontSize: '11px',
                              backgroundColor: '#ecfdf5',
                              color: '#059669',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '10px',
                            }}
                          >
                            ✓ Đã tham gia
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '13.5px', color: '#4b5563', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                        {comm.description}
                      </p>

                      {/* Chủ đề thảo luận sôi nổi */}
                      <div
                        style={{
                          backgroundColor: '#f3f7f4',
                          border: '1px dashed #ddd6fe',
                          borderRadius: '12px',
                          padding: '10px 12px',
                          marginBottom: '16px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#245745',
                            display: 'block',
                            marginBottom: '2px',
                          }}
                        >
                          🔥 THẢO LUẬN SÔI NỔI:
                        </span>
                        <span style={{ fontSize: '12.5px', color: '#374151', fontStyle: 'italic' }}>
                          "{comm.activeTopic}"
                        </span>
                      </div>

                      {/* Tags */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {comm.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '11.5px',
                              backgroundColor: '#f3f4f6',
                              color: '#4b5563',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontWeight: 500,
                            }}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer: Xem bài viết + Tham gia + Tìm bạn */}
                  <div
                    style={{
                      padding: '14px 20px',
                      borderTop: '1px solid #f3f4f6',
                      display: 'flex',
                      gap: '8px',
                      backgroundColor: '#ffffff',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => handleViewCommunityPosts(comm)}
                      style={{
                        flex: 1.2,
                        padding: '9px 6px',
                        borderRadius: '10px',
                        border: 'none',
                        backgroundColor: '#245745',
                        color: '#ffffff',
                        fontSize: '12.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 6px rgba(36, 87, 69, 0.25)',
                      }}
                    >
                      <span>📰</span>
                      <span>Xem bài viết</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleJoin(comm)}
                      style={{
                        flex: 1,
                        padding: '9px 6px',
                        borderRadius: '10px',
                        border: isJoined ? '1px solid #d1d5db' : '1px solid #245745',
                        backgroundColor: isJoined ? '#ffffff' : '#e1efe8',
                        color: isJoined ? '#4b5563' : '#245745',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {isJoined ? 'Rời nhóm' : 'Tham gia'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleExploreMembers(comm)}
                      style={{
                        padding: '9px 12px',
                        borderRadius: '10px',
                        border: '1px solid #dce8e2',
                        backgroundColor: '#ffffff',
                        color: '#245745',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                      title="Tìm bạn bè cùng sở thích trong Discover"
                    >
                      ✨
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
