import { useEffect, useState } from 'react'
import { MessageCircle } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import postService from '../services/postService'

const REACTIONS = [
  { value: 'heart', emoji: '❤️', label: 'Tim' },
  { value: 'like', emoji: '👍', label: 'Thích' },
  { value: 'angry', emoji: '😠', label: 'Giận' },
  { value: 'sad', emoji: '😢', label: 'Buồn' },
  { value: 'haha', emoji: '😂', label: 'Haha' },
]

export default function Activity() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('posts')
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(true)
  const [postsError, setPostsError] = useState('')
  const [mentions, setMentions] = useState([])
  const [mentionsLoading, setMentionsLoading] = useState(false)
  const [mentionsLoaded, setMentionsLoaded] = useState(false)
  const [mentionsError, setMentionsError] = useState('')
  const [comments, setComments] = useState({})
  const [commentsOpen, setCommentsOpen] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [commentLoading, setCommentLoading] = useState({})
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    let active = true
    postService.getFeed({ limit: 100 })
      .then((feed) => {
        if (active) setPosts((feed || []).filter((post) => post.author?.id === user?.id))
      })
      .catch((error) => {
        console.error('Lỗi khi tải hoạt động cá nhân:', error)
        if (active) setPostsError('Không thể tải bài viết của bạn. Vui lòng thử lại sau.')
      })
      .finally(() => {
        if (active) setPostsLoading(false)
      })

    return () => {
      active = false
    }
  }, [user?.id])

  const loadMentions = async () => {
    if (mentionsLoaded || mentionsLoading || !user?.username) return
    setMentionsLoading(true)
    setMentionsError('')
    try {
      const matched = await postService.getMentions()
      setMentions(matched || [])
      setMentionsLoaded(true)
    } catch (error) {
      console.error('Lỗi khi tải nội dung nhắc đến bạn:', error)
      setMentionsError('Không thể tải nội dung nhắc đến bạn. Vui lòng thử lại.')
    } finally {
      setMentionsLoading(false)
    }
  }

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    if (tab === 'mentions') loadMentions()
  }

  const updatePost = (postId, update) => {
    setPosts((current) => current.map((post) => post.id === postId ? update(post) : post))
    setMentions((current) => current.map((mention) => (
      mention.post.id === postId ? { ...mention, post: update(mention.post) } : mention
    )))
  }

  const handleReaction = async (post, reaction) => {
    const previousReaction = post.my_reaction || null
    const previousCounts = post.reactions || {}
    const nextReaction = previousReaction === reaction ? null : reaction
    const nextCounts = { ...previousCounts }
    if (previousReaction) {
      nextCounts[previousReaction] = Math.max(0, (nextCounts[previousReaction] || 0) - 1)
    }
    if (nextReaction) nextCounts[nextReaction] = (nextCounts[nextReaction] || 0) + 1
    const withReaction = (current, value, counts) => ({
      ...current,
      my_reaction: value,
      is_liked_by_me: value === 'heart' || value === 'like',
      reactions: counts,
      likes_count: Object.values(counts).reduce((total, count) => total + count, 0),
    })
    updatePost(post.id, (current) => withReaction(current, nextReaction, nextCounts))
    setActionError('')
    try {
      const result = await postService.setReaction(post.id, reaction)
      updatePost(post.id, (current) => withReaction(current, result.reaction, result.reactions))
    } catch (error) {
      console.error('Lỗi khi bày tỏ đồng cảm:', error)
      updatePost(post.id, (current) => withReaction(current, previousReaction, previousCounts))
      setActionError('Không thể cập nhật cảm xúc. Vui lòng thử lại.')
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
    setActionError('')
    try {
      const postComments = await postService.getComments(postId)
      setComments((current) => ({ ...current, [postId]: postComments || [] }))
    } catch (error) {
      console.error('Lỗi khi tải bình luận:', error)
      setActionError('Không thể tải bình luận. Vui lòng thử lại.')
    } finally {
      setCommentLoading((current) => ({ ...current, [postId]: false }))
    }
  }

  const submitComment = async (postId) => {
    const content = commentInputs[postId]?.trim()
    if (!content || commentLoading[postId]) return
    setCommentLoading((current) => ({ ...current, [postId]: true }))
    setActionError('')
    try {
      const created = await postService.addComment(postId, content)
      setComments((current) => ({
        ...current,
        [postId]: [...(current[postId] || []), created],
      }))
      updatePost(postId, (post) => ({
        ...post,
        comments_count: (post.comments_count || 0) + 1,
      }))
      setCommentInputs((current) => ({ ...current, [postId]: '' }))
    } catch (error) {
      console.error('Lỗi khi đăng bình luận:', error)
      setActionError(error.response?.data?.detail || 'Không thể gửi bình luận. Vui lòng thử lại.')
    } finally {
      setCommentLoading((current) => ({ ...current, [postId]: false }))
    }
  }

  const renderPost = (post, mention) => (
    <article className="profile-activity-card" key={mention?.id || post.id}>
      {mention && (
        <div className="activity-mention-label">
          @{mention.author?.username || 'thành viên'} nhắc đến bạn trong {mention.type}
          <time>{new Date(mention.created_at).toLocaleString('vi-VN')}</time>
        </div>
      )}
      <div className="profile-activity-meta">
        <span>{post.mood || 'Tâm sự'}</span>
        <time>{new Date(post.created_at).toLocaleString('vi-VN')}</time>
      </div>
      {mention?.type === 'bình luận' && (
        <blockquote className="activity-mentioned-content">{mention.content}</blockquote>
      )}
      <p>{post.content}</p>
      {post.image_url && <img className="activity-post-image" src={post.image_url} alt="Ảnh trong bài viết" />}
      <div className="activity-post-actions">
        {REACTIONS.map((reaction) => (
          <button
            type="button"
            key={reaction.value}
            className={`home-reaction${post.my_reaction === reaction.value ? ' is-selected' : ''}`}
            onClick={() => handleReaction(post, reaction.value)}
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
        <button type="button" className="activity-comments-toggle" onClick={() => toggleComments(post.id)}>
          <MessageCircle size={15} aria-hidden="true" />
          {commentsOpen[post.id] ? 'Ẩn bình luận' : `Bình luận · ${post.comments_count || 0}`}
        </button>
      </div>
      {commentsOpen[post.id] && (
        <div className="activity-comments">
          {commentLoading[post.id] && !comments[post.id] ? (
            <p className="profile-activity-empty">Đang tải bình luận...</p>
          ) : (
            <>
              {(comments[post.id] || []).map((comment) => (
                <div className="activity-comment" key={comment.id}>
                  <strong>@{comment.author?.username || 'thành viên'}</strong>
                  <span>{comment.content}</span>
                </div>
              ))}
              <form
                className="activity-comment-form"
                onSubmit={(event) => {
                  event.preventDefault()
                  submitComment(post.id)
                }}
              >
                <input
                  type="text"
                  value={commentInputs[post.id] || ''}
                  onChange={(event) => setCommentInputs((current) => ({
                    ...current,
                    [post.id]: event.target.value,
                  }))}
                  placeholder="Viết bình luận..."
                  aria-label="Viết bình luận"
                  maxLength={1000}
                />
                <button type="submit" disabled={!commentInputs[post.id]?.trim() || commentLoading[post.id]}>
                  Gửi
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </article>
  )

  return (
    <div className="activity-page">
      <Navbar />
      <main className="activity-content">
        <section className="profile-activity" aria-labelledby="activity-title">
          <div className="profile-activity-heading">
            <div>
              <h1 id="activity-title">Hoạt động của bạn</h1>
              <p>Chỉ gồm bài bạn đã đăng và nội dung nhắc đến bạn.</p>
            </div>
          </div>
          <div className="profile-activity-tabs" role="tablist" aria-label="Hoạt động cá nhân">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'posts'}
              className={activeTab === 'posts' ? 'is-active' : ''}
              onClick={() => handleTabChange('posts')}
            >
              Bài viết của bạn <span>{posts.length}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'mentions'}
              className={activeTab === 'mentions' ? 'is-active' : ''}
              onClick={() => handleTabChange('mentions')}
            >
              Nhắc đến bạn {mentionsLoaded && <span>{mentions.length}</span>}
            </button>
          </div>

          {activeTab === 'posts' ? (
            postsLoading ? (
              <p className="profile-activity-empty">Đang tải bài viết của bạn...</p>
            ) : postsError ? (
              <p className="profile-activity-empty" role="alert">{postsError}</p>
            ) : posts.length === 0 ? (
              <p className="profile-activity-empty">Bạn chưa đăng bài nào. Tâm sự đầu tiên của bạn sẽ xuất hiện ở đây.</p>
            ) : (
              <div className="profile-activity-list">{posts.map((post) => renderPost(post))}</div>
            )
          ) : mentionsLoading ? (
            <p className="profile-activity-empty">Đang tìm nội dung nhắc đến bạn...</p>
          ) : mentionsError ? (
            <p className="profile-activity-empty" role="alert">{mentionsError}</p>
          ) : mentions.length === 0 ? (
            <p className="profile-activity-empty">Chưa tìm thấy bài viết hoặc bình luận có nhắc đến @{user?.username}.</p>
          ) : (
            <div className="profile-activity-list">
              {mentions.map((mention) => renderPost(mention.post, mention))}
            </div>
          )}
          {actionError && <p className="profile-activity-error" role="alert">{actionError}</p>}
        </section>
      </main>
    </div>
  )
}
