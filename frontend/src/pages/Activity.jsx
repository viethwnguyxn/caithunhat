import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import postService from '../services/postService'

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

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
      const feed = await postService.getFeed({ limit: 100 })
      const mentionPattern = new RegExp(`(^|[^\\w])@${escapeRegExp(user.username)}(?![\\w.-])`, 'i')
      const matched = []

      for (const post of feed || []) {
        if (post.author?.id !== user.id && mentionPattern.test(post.content || '')) {
          matched.push({
            id: `post-${post.id}`,
            post,
            content: post.content,
            author: post.author,
            created_at: post.created_at,
            type: 'bài viết',
          })
        }
      }

      const commentedPosts = (feed || [])
        .filter((post) => post.author?.id !== user.id && post.comments_count > 0)
        .slice(0, 20)
      const commentLists = await Promise.all(
        commentedPosts.map((post) => postService.getComments(post.id))
      )
      commentLists.forEach((comments, index) => {
        const post = commentedPosts[index]
        comments.forEach((comment) => {
          if (comment.author?.id !== user.id && mentionPattern.test(comment.content || '')) {
            matched.push({
              id: `comment-${comment.id}`,
              post,
              content: comment.content,
              author: comment.author,
              created_at: comment.created_at,
              type: 'bình luận',
            })
          }
        })
      })

      setMentions(matched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)))
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

  const handleLike = async (post) => {
    const liked = !post.is_liked_by_me
    updatePost(post.id, (current) => ({
      ...current,
      is_liked_by_me: liked,
      likes_count: Math.max(0, (current.likes_count || 0) + (liked ? 1 : -1)),
    }))
    setActionError('')
    try {
      await postService.toggleLike(post.id)
    } catch (error) {
      console.error('Lỗi khi bày tỏ đồng cảm:', error)
      updatePost(post.id, (current) => ({
        ...current,
        is_liked_by_me: !liked,
        likes_count: Math.max(0, (current.likes_count || 0) + (liked ? -1 : 1)),
      }))
      setActionError('Không thể cập nhật lượt đồng cảm. Vui lòng thử lại.')
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
        <button
          type="button"
          className={post.is_liked_by_me ? 'home-like-button is-liked' : 'home-like-button'}
          onClick={() => handleLike(post)}
          aria-pressed={Boolean(post.is_liked_by_me)}
        >
          {post.is_liked_by_me ? '♥' : '♡'} Đồng cảm · {post.likes_count || 0}
        </button>
        <button type="button" className="activity-comments-toggle" onClick={() => toggleComments(post.id)}>
          💬 {commentsOpen[post.id] ? 'Ẩn bình luận' : `Bình luận · ${post.comments_count || 0}`}
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
