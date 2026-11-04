import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import postService from '../services/postService'
import { getProfile } from '../services/profileService'

const MOODS = [
  '😊 Vui vẻ',
  '🤔 Suy ngẫm',
  '☕ Thư giãn',
  '🚀 Quyết tâm',
  '🌧️ Cần chia sẻ',
  '✨ Truyền cảm hứng',
  '🎯 Tập trung',
]

const WELCOME_STORAGE_PREFIX = 'lapulga_welcome_dismissed_'

function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const elapsedMinutes = Math.floor((Date.now() - date.getTime()) / 60000)

  if (elapsedMinutes < 1) return 'Vừa xong'
  if (elapsedMinutes < 60) return `${elapsedMinutes} phút trước`
  if (elapsedMinutes < 1440) return `${Math.floor(elapsedMinutes / 60)} giờ trước`
  return date.toLocaleDateString('vi-VN')
}

export default function HomeFeed() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [content, setContent] = useState('')
  const [mood, setMood] = useState(MOODS[0])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [welcomeVisible, setWelcomeVisible] = useState(
    () => !localStorage.getItem(`${WELCOME_STORAGE_PREFIX}${user?.id ?? 'guest'}`)
  )

  const loadFeed = async () => {
    setLoading(true)
    setError('')
    try {
      const feed = await postService.getFeed({ limit: 50 })
      setPosts(feed || [])
    } catch (loadError) {
      console.error('Không thể tải bảng tin:', loadError)
      setError('Chưa tải được bảng tin. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    getProfile()
      .then((data) => {
        if (active) setProfile(data)
      })
      .catch((profileError) => {
        console.error('Không thể tải hồ sơ:', profileError)
      })
    loadFeed()
    return () => {
      active = false
    }
  }, [])

  const dismissWelcome = () => {
    localStorage.setItem(`${WELCOME_STORAGE_PREFIX}${user?.id ?? 'guest'}`, 'true')
    setWelcomeVisible(false)
  }

  const handleCreatePost = async (event) => {
    event.preventDefault()
    const trimmedContent = content.trim()
    if (!trimmedContent) return

    setPosting(true)
    setError('')
    try {
      const created = await postService.createPost({
        category: 'Tâm sự & Cảm xúc',
        content: trimmedContent,
        mood,
      })
      setPosts((currentPosts) => [created, ...currentPosts])
      setContent('')
    } catch (postError) {
      console.error('Không thể đăng tâm sự:', postError)
      setError(postError.response?.data?.detail || 'Không thể đăng bài. Vui lòng thử lại.')
    } finally {
      setPosting(false)
    }
  }

  const handleLike = async (postId) => {
    const previousPosts = posts
    setPosts((currentPosts) =>
      currentPosts.map((post) => {
        if (post.id !== postId) return post
        const liked = !post.is_liked_by_me
        return {
          ...post,
          is_liked_by_me: liked,
          likes_count: Math.max(0, (post.likes_count || 0) + (liked ? 1 : -1)),
        }
      })
    )
    try {
      await postService.toggleLike(postId)
    } catch (likeError) {
      console.error('Không thể cập nhật cảm xúc bài viết:', likeError)
      setPosts(previousPosts)
      setError('Không thể cập nhật lượt thích. Vui lòng thử lại.')
    }
  }

  const handleDelete = async (postId) => {
    if (!window.confirm('Bạn có chắc muốn xóa bài tâm sự này không?')) return
    try {
      await postService.deletePost(postId)
      setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId))
    } catch (deleteError) {
      console.error('Không thể xóa bài viết:', deleteError)
      setError(deleteError.response?.data?.detail || 'Không thể xóa bài viết.')
    }
  }

  const displayName = profile?.display_name || user?.username || 'bạn'
  const avatar = profile?.avatar_url || user?.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`

  return (
    <div className="home-feed-page">
      <Navbar />
      <main className="home-feed">
        {welcomeVisible && (
          <section className="welcome-banner" aria-label="Lời chào">
            <div>
              <span className="welcome-eyebrow">Chào mừng bạn trở lại</span>
              <h1>Rất vui được gặp lại, {displayName} ✨</h1>
              <p>Hôm nay bạn muốn chia sẻ điều gì với cộng đồng?</p>
            </div>
            <button type="button" className="welcome-dismiss" onClick={dismissWelcome} aria-label="Đóng lời chào">
              ×
            </button>
          </section>
        )}

        <section className="home-composer" aria-labelledby="composer-title">
          <div className="home-composer-heading">
            <img src={avatar} alt="" className="home-avatar" />
            <div>
              <h2 id="composer-title">Góc tâm sự của bạn</h2>
              <p>Chia sẻ cảm xúc hôm nay — luôn có người sẵn sàng lắng nghe.</p>
            </div>
          </div>
          <form onSubmit={handleCreatePost}>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="Bạn đang cảm thấy thế nào? Hãy viết ra điều bạn muốn chia sẻ..."
              rows={4}
              maxLength={5000}
              aria-label="Nội dung tâm sự"
            />
            <div className="home-composer-actions">
              <label className="mood-picker">
                <span>Cảm xúc hôm nay</span>
                <select value={mood} onChange={(event) => setMood(event.target.value)}>
                  {MOODS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <button type="submit" className="home-post-button" disabled={posting || !content.trim()}>
                {posting ? 'Đang chia sẻ...' : 'Chia sẻ tâm sự'}
              </button>
            </div>
          </form>
        </section>

        <div className="home-feed-heading">
          <div>
            <h2>Bảng tin cảm xúc</h2>
            <p>Những tâm sự và trạng thái mới từ cộng đồng</p>
          </div>
          <Link to="/communities">Khám phá cộng đồng →</Link>
        </div>

        {error && <div className="home-feed-error" role="alert">{error}</div>}

        {loading ? (
          <div className="home-feed-empty">Đang tải tâm sự...</div>
        ) : posts.length === 0 ? (
          <div className="home-feed-empty">
            <span aria-hidden="true">💬</span>
            <h3>Chưa có tâm sự nào</h3>
            <p>Hãy là người đầu tiên chia sẻ cảm xúc hôm nay.</p>
          </div>
        ) : (
          <div className="home-post-list">
            {posts.map((post) => {
              const author = post.author || {}
              const isOwnPost = user?.id === author.id
              return (
                <article className="home-post-card" key={post.id}>
                  <header className="home-post-header">
                    <img
                      className="home-avatar"
                      src={author.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(author.username || 'user')}`}
                      alt=""
                    />
                    <div className="home-post-author">
                      <strong>{author.display_name || author.username || 'Thành viên La Pulga'}</strong>
                      <span>@{author.username || 'thanhvien'} · {formatTimeAgo(post.created_at)}</span>
                    </div>
                    {post.mood && <span className="home-post-mood">{post.mood}</span>}
                    {(isOwnPost || user?.role === 'admin') && (
                      <button
                        type="button"
                        className="home-post-delete"
                        onClick={() => handleDelete(post.id)}
                        aria-label="Xóa bài tâm sự"
                        title="Xóa bài tâm sự"
                      >
                        ×
                      </button>
                    )}
                  </header>
                  <p className="home-post-content">{post.content}</p>
                  {post.image_url && <img className="home-post-image" src={post.image_url} alt="Ảnh đính kèm" />}
                  <footer className="home-post-footer">
                    <button
                      type="button"
                      className={post.is_liked_by_me ? 'home-like-button is-liked' : 'home-like-button'}
                      onClick={() => handleLike(post.id)}
                      aria-pressed={Boolean(post.is_liked_by_me)}
                    >
                      {post.is_liked_by_me ? '♥' : '♡'} Đồng cảm · {post.likes_count || 0}
                    </button>
                    <span>{post.comments_count || 0} bình luận</span>
                  </footer>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
