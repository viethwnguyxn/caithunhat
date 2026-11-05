import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ImagePlus, MessageCircle, Sparkles, X } from 'lucide-react'
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

const REACTIONS = [
  { value: 'heart', emoji: '❤️', label: 'Tim' },
  { value: 'like', emoji: '👍', label: 'Thích' },
  { value: 'angry', emoji: '😠', label: 'Giận' },
  { value: 'sad', emoji: '😢', label: 'Buồn' },
  { value: 'haha', emoji: '😂', label: 'Haha' },
]

const RELAXATION_REELS = [
  {
    id: 'breathing',
    title: 'Thở chậm cùng mình',
    duration: '1 phút',
    durationSeconds: 60,
    stepDurations: [20, 20, 20],
    description: 'Thả lỏng vai, hít vào nhẹ nhàng rồi thở ra chậm hơn.',
    steps: ['Ngồi thoải mái và đặt hai chân vững trên sàn.', 'Hít vào bằng mũi trong 4 nhịp.', 'Thở ra chậm trong 6 nhịp. Lặp lại nhẹ nhàng trong một phút.'],
  },
  {
    id: 'grounding',
    title: 'Trở về với hiện tại',
    duration: '2 phút',
    durationSeconds: 120,
    stepDurations: [40, 40, 40],
    description: 'Dùng giác quan để neo mình lại với khoảnh khắc này.',
    steps: ['Nhìn quanh và gọi tên 5 thứ bạn thấy.', 'Chạm vào 4 thứ gần bạn, để ý cảm giác của chúng.', 'Lắng nghe 3 âm thanh và thả lỏng hàm, vai.'],
  },
  {
    id: 'stretch',
    title: 'Thả lỏng vai gáy',
    duration: '1 phút',
    durationSeconds: 60,
    stepDurations: [20, 20, 20],
    description: 'Một vài chuyển động nhỏ để cơ thể bớt căng cứng.',
    steps: ['Hạ vai xuống và xoay vai chậm 5 vòng.', 'Nghiêng đầu nhẹ sang mỗi bên, không kéo căng.', 'Duỗi hai tay lên cao rồi thả lỏng theo nhịp thở.'],
  },
  {
    id: 'kindness',
    title: 'Một lời tử tế với mình',
    duration: '30 giây',
    durationSeconds: 30,
    stepDurations: [10, 10, 10],
    description: 'Tạm dừng và nói với bản thân điều bạn cần nghe.',
    steps: ['Đặt tay lên ngực nếu thấy thoải mái.', 'Nghĩ về một điều nhỏ bạn đã cố gắng hôm nay.', 'Nhắc mình: “Mình đang làm tốt nhất có thể, từng chút một.”'],
  },
  {
    id: 'pause',
    title: 'Nghỉ mắt một chút',
    duration: '1 phút',
    durationSeconds: 60,
    stepDurations: [20, 20, 20],
    description: 'Rời màn hình và cho đôi mắt khoảng nghỉ ngắn.',
    steps: ['Nhìn ra xa khỏi màn hình.', 'Chớp mắt chậm vài lần và để ánh nhìn dịu lại.', 'Uống một ngụm nước, hít thở tự nhiên rồi quay lại khi sẵn sàng.'],
  },
]

const WELCOME_DISMISSED_PREFIX = 'lapulga_welcome_dismissed_'

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
  const { user, loginEventId } = useAuth()
  const [profile, setProfile] = useState(null)
  const [posts, setPosts] = useState([])
  const [comments, setComments] = useState({})
  const [commentsOpen, setCommentsOpen] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [commentLoading, setCommentLoading] = useState({})
  const [content, setContent] = useState('')
  const [mood, setMood] = useState(MOODS[0])
  const [imageUrl, setImageUrl] = useState('')
  const [showImageInput, setShowImageInput] = useState(false)
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [welcomeVisible, setWelcomeVisible] = useState(false)
  const [activeReel, setActiveReel] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [exerciseCompleted, setExerciseCompleted] = useState(false)
  const exerciseTimerRef = useRef(null)
  const welcomeDismissedKey = `${WELCOME_DISMISSED_PREFIX}${user?.id ?? 'guest'}`

  useEffect(() => {
    if (!activeReel || exerciseCompleted) return undefined

    exerciseTimerRef.current = window.setInterval(() => {
      setElapsedSeconds((elapsed) => {
        const nextElapsed = elapsed + 1
        if (nextElapsed >= activeReel.durationSeconds) {
          window.clearInterval(exerciseTimerRef.current)
          return activeReel.durationSeconds
        }
        return nextElapsed
      })
    }, 1000)

    return () => window.clearInterval(exerciseTimerRef.current)
  }, [activeReel, exerciseCompleted])

  useEffect(() => {
    if (activeReel && elapsedSeconds >= activeReel.durationSeconds) {
      setExerciseCompleted(true)
    }
  }, [activeReel, elapsedSeconds])

  useEffect(() => {
    if (
      loginEventId > 0 &&
      sessionStorage.getItem(welcomeDismissedKey) !== String(loginEventId)
    ) {
      setWelcomeVisible(true)
    }
  }, [loginEventId, welcomeDismissedKey])

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
    sessionStorage.setItem(welcomeDismissedKey, String(loginEventId))
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
        image_url: imageUrl.trim() || null,
        mood,
      })
      setPosts((currentPosts) => [created, ...currentPosts])
      setContent('')
      setImageUrl('')
      setShowImageInput(false)
    } catch (postError) {
      console.error('Không thể đăng tâm sự:', postError)
      setError(postError.response?.data?.detail || 'Không thể đăng bài. Vui lòng thử lại.')
    } finally {
      setPosting(false)
    }
  }

  const handleReaction = async (postId, reaction) => {
    const previousPost = posts.find((post) => post.id === postId)
    if (!previousPost) return
    const nextReaction = previousPost.my_reaction === reaction ? null : reaction
    const nextCounts = { ...(previousPost.reactions || {}) }
    if (previousPost.my_reaction) {
      nextCounts[previousPost.my_reaction] = Math.max(0, (nextCounts[previousPost.my_reaction] || 0) - 1)
    }
    if (nextReaction) nextCounts[nextReaction] = (nextCounts[nextReaction] || 0) + 1
    const updateReaction = (post, value, counts) => ({
      ...post,
      my_reaction: value,
      is_liked_by_me: value === 'heart' || value === 'like',
      reactions: counts,
      likes_count: Object.values(counts).reduce((total, count) => total + count, 0),
    })
    setPosts((currentPosts) =>
      currentPosts.map((post) => post.id === postId ? updateReaction(post, nextReaction, nextCounts) : post)
    )
    try {
      const result = await postService.setReaction(postId, reaction)
      setPosts((currentPosts) =>
        currentPosts.map((post) => post.id === postId
          ? updateReaction(post, result.reaction, result.reactions)
          : post)
      )
    } catch (reactionError) {
      console.error('Không thể cập nhật cảm xúc bài viết:', reactionError)
      setPosts((currentPosts) =>
        currentPosts.map((post) => post.id === postId
          ? updateReaction(post, previousPost.my_reaction || null, previousPost.reactions || {})
          : post)
      )
      setError('Không thể cập nhật cảm xúc. Vui lòng thử lại.')
    }
  }

  const toggleComments = async (postId) => {
    if (commentsOpen[postId]) {
      setCommentsOpen((current) => ({ ...current, [postId]: false }))
      return
    }
    setCommentsOpen((current) => ({ ...current, [postId]: true }))
    if (comments[postId]) return
    setCommentLoading((current) => ({ ...current, [postId]: true }))
    try {
      const result = await postService.getComments(postId)
      setComments((current) => ({ ...current, [postId]: result || [] }))
    } catch (commentError) {
      console.error('Không thể tải bình luận:', commentError)
      setError('Không thể tải bình luận. Vui lòng thử lại.')
    } finally {
      setCommentLoading((current) => ({ ...current, [postId]: false }))
    }
  }

  const handleComment = async (event, postId) => {
    event.preventDefault()
    const commentContent = commentInputs[postId]?.trim()
    if (!commentContent || commentLoading[postId]) return
    setCommentLoading((current) => ({ ...current, [postId]: true }))
    try {
      const created = await postService.addComment(postId, commentContent)
      setComments((current) => ({ ...current, [postId]: [...(current[postId] || []), created] }))
      setPosts((current) => current.map((post) => post.id === postId
        ? { ...post, comments_count: (post.comments_count || 0) + 1 }
        : post))
      setCommentInputs((current) => ({ ...current, [postId]: '' }))
    } catch (commentError) {
      console.error('Không thể gửi bình luận:', commentError)
      setError(commentError.response?.data?.detail || 'Không thể gửi bình luận. Vui lòng thử lại.')
    } finally {
      setCommentLoading((current) => ({ ...current, [postId]: false }))
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

  const startReel = (reel) => {
    if (activeReel?.id === reel.id) {
      setActiveReel(null)
      return
    }

    setElapsedSeconds(0)
    setExerciseCompleted(false)
    setActiveReel(reel)
  }

  const resetReel = () => {
    setElapsedSeconds(0)
    setExerciseCompleted(false)
  }

  const activeStep = activeReel
    ? activeReel.stepDurations.findIndex((duration, index, durations) =>
        elapsedSeconds < durations.slice(0, index + 1).reduce((total, seconds) => total + seconds, 0)
      )
    : 0
  const currentStep = activeReel
    ? activeStep < 0
      ? activeReel.steps.length - 1
      : activeStep
    : 0
  const stepElapsedSeconds = activeReel
    ? elapsedSeconds -
      activeReel.stepDurations
        .slice(0, currentStep)
        .reduce((total, seconds) => total + seconds, 0)
    : 0
  const stepRemainingSeconds = activeReel
    ? activeReel.stepDurations[currentStep] - stepElapsedSeconds
    : 0
  const remainingSeconds = activeReel
    ? Math.max(activeReel.durationSeconds - elapsedSeconds, 0)
    : 0

  const formatCountdown = (seconds) =>
    `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`

  return (
    <div className="home-feed-page">
      <Navbar />
      <main className="home-feed">
        <section className="reels-section" aria-labelledby="reels-title">
          <div className="reels-heading">
            <h1 className="reels-eyebrow" id="reels-title">CHĂM SÓC BẢN THÂN</h1>
          </div>
          <div className="reels-carousel" aria-label="Các bài tập thư giãn">
            {RELAXATION_REELS.map((reel) => (
              <button
                type="button"
                key={reel.id}
                className={`reel-card${activeReel?.id === reel.id ? ' is-active' : ''}`}
                onClick={() => startReel(reel)}
                aria-pressed={activeReel?.id === reel.id}
              >
                <span className="reel-card-title">{reel.title}</span>
                <span className="reel-card-description">{reel.description}</span>
                <span className="reel-card-duration">{reel.duration} · Bắt đầu <ArrowRight size={12} aria-hidden="true" /></span>
              </button>
            ))}
          </div>
          {activeReel && (
            <article className="reel-exercise" aria-live="polite">
              <button
                type="button"
                className="reel-exercise-close"
                onClick={() => setActiveReel(null)}
                aria-label="Đóng bài tập"
              >
                <X size={18} aria-hidden="true" />
              </button>
              <div className={`reel-exercise-status${exerciseCompleted ? ' is-finished' : ''}`} role="status">
                {!exerciseCompleted && <span className="reel-exercise-status-dot" aria-hidden="true" />}
                <span>
                  {exerciseCompleted
                    ? 'Hoàn thành bài tập'
                    : remainingSeconds === 0
                      ? 'Đã hết thời gian'
                      : `Đang thực hiện · Bước ${currentStep + 1}/${activeReel.steps.length}`}
                </span>
              </div>
              <div
                className="reel-exercise-progress"
                role="progressbar"
                aria-label="Tiến trình bài tập"
                aria-valuemin={0}
                aria-valuemax={activeReel.durationSeconds}
                aria-valuenow={elapsedSeconds}
              >
                <span
                  style={{
                    width: `${(elapsedSeconds / activeReel.durationSeconds) * 100}%`,
                  }}
                />
              </div>
              <div className="reel-exercise-timer" role="timer" aria-label={`Còn lại ${formatCountdown(remainingSeconds)}`}>
                <span className="reel-exercise-timer-label">Thời gian còn lại</span>
                <strong>{formatCountdown(remainingSeconds)}</strong>
              </div>
              <h2>{activeReel.title}</h2>
              <div className="reel-step-progress" aria-label={`Bước ${currentStep + 1} / ${activeReel.steps.length}`}>
                {activeReel.steps.map((step, index) => (
                  <span
                    key={step}
                    className={index <= currentStep ? 'is-complete' : ''}
                    style={{
                      opacity: index === currentStep && !exerciseCompleted
                        ? 0.35 + (stepElapsedSeconds / activeReel.stepDurations[currentStep]) * 0.65
                        : undefined,
                    }}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <div className="reel-current-step" aria-live="polite">
                <span>
                  Bước {currentStep + 1} / {activeReel.steps.length}
                  {!exerciseCompleted && ` · ${formatCountdown(stepRemainingSeconds)}`}
                </span>
                <p>{activeReel.steps[currentStep]}</p>
              </div>
              {remainingSeconds === 0 && !exerciseCompleted && (
                <p className="reel-exercise-time-up" role="status">
                  Đã hết thời gian cho bài tập này.
                </p>
              )}
              {exerciseCompleted ? (
                <div className="reel-exercise-completed" role="status">
                  <strong>Bạn đã hoàn thành bài tập này.</strong>
                  <button type="button" onClick={resetReel}>Làm lại bài tập</button>
                </div>
              ) : (
                <p className="reel-step-guidance">Các bước sẽ tự chuyển theo thời gian đã định.</p>
              )}
              <p className="reel-exercise-note">Hãy dừng lại nếu bạn thấy không thoải mái. Bạn có thể quay lại bất cứ lúc nào.</p>
            </article>
          )}
        </section>

        {welcomeVisible && (
          <section className="welcome-banner" aria-label="Lời chào">
            <div>
              <span className="welcome-eyebrow">Chào mừng bạn trở lại</span>
              <h1>Rất vui được gặp lại, {displayName} <Sparkles size={18} aria-hidden="true" /></h1>
              <p>Hôm nay bạn thế nào?</p>
            </div>
            <button type="button" className="welcome-dismiss" onClick={dismissWelcome} aria-label="Đóng lời chào">
              <X size={18} aria-hidden="true" />
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
              placeholder="Bạn đang cảm thấy thế nào? Hãy viết ra điều bạn muốn chia sẻ... Dùng @username để nhắc đến ai đó."
              rows={4}
              maxLength={5000}
              aria-label="Nội dung tâm sự"
            />
            {showImageInput && (
              <div className="home-composer-image">
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="Dán URL hình ảnh (https://...)"
                  maxLength={500}
                  aria-label="URL hình ảnh đính kèm"
                />
                {imageUrl.trim() && (
                  <img src={imageUrl.trim()} alt="Xem trước ảnh đính kèm" />
                )}
              </div>
            )}
            <div className="home-composer-actions">
              <div className="home-composer-options">
                <label className="mood-picker">
                  <span>Cảm xúc hôm nay</span>
                  <select value={mood} onChange={(event) => setMood(event.target.value)}>
                    {MOODS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  className="home-add-image-button"
                  onClick={() => {
                    setShowImageInput((visible) => !visible)
                    if (showImageInput) setImageUrl('')
                  }}
                  aria-pressed={showImageInput}
                >
                  {showImageInput ? <X size={15} aria-hidden="true" /> : <ImagePlus size={15} aria-hidden="true" />}
                  {showImageInput ? 'Bỏ ảnh' : 'Thêm ảnh'}
                </button>
              </div>
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
          <Link to="/communities">Khám phá cộng đồng <ArrowRight size={14} aria-hidden="true" /></Link>
        </div>

        {error && <div className="home-feed-error" role="alert">{error}</div>}

        {loading ? (
          <div className="home-feed-empty">Đang tải tâm sự...</div>
        ) : posts.length === 0 ? (
          <div className="home-feed-empty">
            <MessageCircle size={32} aria-hidden="true" />
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
                        <X size={16} aria-hidden="true" />
                      </button>
                    )}
                  </header>
                  <p className="home-post-content">{post.content}</p>
                  {post.image_url && <img className="home-post-image" src={post.image_url} alt="Ảnh đính kèm" />}
                  <footer className="home-post-footer">
                    <div className="home-reactions" aria-label="Bày tỏ cảm xúc">
                      {REACTIONS.map((reaction) => (
                        <button
                          type="button"
                          key={reaction.value}
                          className={`home-reaction${post.my_reaction === reaction.value ? ' is-selected' : ''}`}
                          onClick={() => handleReaction(post.id, reaction.value)}
                          aria-label={`${reaction.label}, ${post.reactions?.[reaction.value] || 0} lượt`}
                          aria-pressed={post.my_reaction === reaction.value}
                          title={reaction.label}
                        >
                          <span aria-hidden="true">{reaction.emoji}</span>
                          {(post.reactions?.[reaction.value] || 0) > 0 && (
                            <span>{post.reactions[reaction.value]}</span>
                          )}
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="home-comments-toggle"
                      onClick={() => toggleComments(post.id)}
                      aria-expanded={Boolean(commentsOpen[post.id])}
                    >
                      <MessageCircle size={15} aria-hidden="true" />
                      {post.comments_count || 0} bình luận
                    </button>
                  </footer>
                  {commentsOpen[post.id] && (
                    <div className="home-comments">
                      {commentLoading[post.id] && !comments[post.id] ? (
                        <p>Đang tải bình luận...</p>
                      ) : (
                        <>
                          {(comments[post.id] || []).map((comment) => (
                            <div className="home-comment" key={comment.id}>
                              <strong>@{comment.author?.username || 'thành viên'}</strong>
                              <span>{comment.content}</span>
                            </div>
                          ))}
                          {(comments[post.id] || []).length === 0 && (
                            <p>Chưa có bình luận. Hãy bắt đầu cuộc trò chuyện.</p>
                          )}
                          <form className="home-comment-form" onSubmit={(event) => handleComment(event, post.id)}>
                            <input
                              value={commentInputs[post.id] || ''}
                              onChange={(event) => setCommentInputs((current) => ({
                                ...current,
                                [post.id]: event.target.value,
                              }))}
                              placeholder="Viết bình luận... Dùng @username để nhắc đến ai đó"
                              aria-label="Viết bình luận"
                              maxLength={1000}
                            />
                            <button
                              type="submit"
                              disabled={!commentInputs[post.id]?.trim() || commentLoading[post.id]}
                            >
                              Gửi
                            </button>
                          </form>
                        </>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
