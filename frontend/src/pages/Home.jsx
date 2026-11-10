import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Avatar from '../components/Avatar'
import { useAuth } from '../contexts/AuthContext'
import { getProfile } from '../services/profileService'
import { getSurvey } from '../services/surveyService'
import { getMyConnections } from '../services/connectionService'
import { getConversations } from '../services/chatService'
import postService from '../services/postService'
import '../styles/lapulga.css'

const unwrapList = (value) => Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : Array.isArray(value?.posts) ? value.posts : Array.isArray(value?.data) ? value.data : []

export default function Home() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [survey, setSurvey] = useState(null)
  const [friendsCount, setFriendsCount] = useState(0)
  const [connectedUserIds, setConnectedUserIds] = useState([])
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)
  const [posts, setPosts] = useState([])
  const [expandedComments, setExpandedComments] = useState({})
  const [commentsMap, setCommentsMap] = useState({})
  const [commentInputs, setCommentInputs] = useState({})
  const [commentsLoading, setCommentsLoading] = useState({})
  const [submittingComment, setSubmittingComment] = useState({})
  const [likingPosts, setLikingPosts] = useState({})
  const [interactionErrors, setInteractionErrors] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Phù hợp với bạn')
  const [previewImage, setPreviewImage] = useState(null)
  const displayName = profile?.display_name || user?.display_name || user?.username || 'Bạn'
  const avatar = profile?.avatar_url || user?.avatar_url

  useEffect(() => {
    if (!previewImage) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setPreviewImage(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewImage])

  useEffect(() => {
    let alive = true
    async function loadData() {
      const [profileData, surveyData, connections, conversations, feed] = await Promise.all([
        getProfile().catch(() => null), getSurvey().catch(() => null),
        getMyConnections().catch(() => []), getConversations().catch(() => []),
        postService.getFeed({ limit: 30 }).catch((error) => { console.warn('Không tải được bảng tin:', error); return [] }),
      ])
      if (!alive) return
      setProfile(profileData)
      setSurvey(surveyData)
      setFriendsCount(Array.isArray(connections) ? connections.length : 0)
      setConnectedUserIds(
        Array.isArray(connections)
          ? connections.map((connection) => connection.user?.id).filter(Boolean)
          : []
      )
      setUnreadMsgCount((Array.isArray(conversations) ? conversations : []).reduce((sum, item) => sum + (item?.unread_count || 0), 0))
      setPosts(unwrapList(feed))
      setLoading(false)
    }
    loadData()
    return () => { alive = false }
  }, [])

  const visiblePosts = useMemo(() => {
    const connectedIds = new Set(connectedUserIds.map(String))
    const feelings = survey?.recent_feelings || []
    const topics = survey?.topics || []
    const lifeSituation = survey?.life_situation?.trim().toLocaleLowerCase()

    const matchesSurvey = (post) => {
      const mood = (post.mood || '').toLocaleLowerCase()
      const category = (post.category || '').toLocaleLowerCase()
      const content = (post.content || '').toLocaleLowerCase()
      const sameFeeling = feelings.some((feeling) => {
        const value = feeling.toLocaleLowerCase()
        return value.length > 2 && mood.length > 2 && (mood.includes(value) || value.includes(mood))
      })
      const sameTopic = topics.some((topic) => {
        const value = topic.toLocaleLowerCase()
        return value.length > 2 && (category.includes(value) || value.includes(category))
      })
      const sameSituation =
        lifeSituation && lifeSituation.length > 2 && content.includes(lifeSituation)
      return sameFeeling || sameTopic || sameSituation
    }

    return posts.filter((post) => {
      const authorId = post.author?.id ?? post.user?.id
      const isConnected = connectedIds.has(String(authorId))
      const isMine = String(authorId) === String(user?.id)
      if (filter === 'Bạn bè kết nối') return isConnected || isMine
      if (filter === 'Cùng tâm trạng & hoàn cảnh') return matchesSurvey(post)
      if (filter === 'Tất cả bài viết') return true
      return isConnected || isMine || matchesSurvey(post)
    })
  }, [posts, connectedUserIds, survey, filter, user?.id])

  const handleLike = async (post) => {
    const postId = post?.id
    if (!postId || likingPosts[postId]) return

    setLikingPosts((current) => ({ ...current, [postId]: true }))
    setInteractionErrors((current) => ({ ...current, [postId]: '' }))
    try {
      const result = await postService.toggleLike(postId)
      setPosts((current) =>
        current.map((item) =>
          item.id === postId
            ? {
                ...item,
                is_liked_by_me: result.liked,
                likes_count: result.likes_count,
              }
            : item
        )
      )
    } catch (error) {
      console.error('Không thể thích bài viết:', error)
      setInteractionErrors((current) => ({
        ...current,
        [postId]: error.response?.data?.detail || 'Không thể cập nhật lượt thích.',
      }))
    } finally {
      setLikingPosts((current) => ({ ...current, [postId]: false }))
    }
  }

  const handleToggleComments = async (postId) => {
    if (expandedComments[postId]) {
      setExpandedComments((current) => ({ ...current, [postId]: false }))
      return
    }

    setExpandedComments((current) => ({ ...current, [postId]: true }))
    if (commentsMap[postId]) return

    setCommentsLoading((current) => ({ ...current, [postId]: true }))
    setInteractionErrors((current) => ({ ...current, [postId]: '' }))
    try {
      const comments = await postService.getComments(postId)
      setCommentsMap((current) => ({ ...current, [postId]: comments }))
    } catch (error) {
      console.error('Không thể tải bình luận:', error)
      setInteractionErrors((current) => ({
        ...current,
        [postId]: error.response?.data?.detail || 'Không thể tải bình luận.',
      }))
    } finally {
      setCommentsLoading((current) => ({ ...current, [postId]: false }))
    }
  }

  const handleAddComment = async (event, postId) => {
    event.preventDefault()
    const content = commentInputs[postId]?.trim()
    if (!content || submittingComment[postId]) return

    setSubmittingComment((current) => ({ ...current, [postId]: true }))
    setInteractionErrors((current) => ({ ...current, [postId]: '' }))
    try {
      const comment = await postService.addComment(postId, content)
      setCommentsMap((current) => ({
        ...current,
        [postId]: [...(current[postId] || []), comment],
      }))
      setPosts((current) =>
        current.map((item) =>
          item.id === postId
            ? { ...item, comments_count: (item.comments_count || 0) + 1 }
            : item
        )
      )
      setCommentInputs((current) => ({ ...current, [postId]: '' }))
    } catch (error) {
      console.error('Không thể gửi bình luận:', error)
      setInteractionErrors((current) => ({
        ...current,
        [postId]: error.response?.data?.detail || 'Không thể gửi bình luận.',
      }))
    } finally {
      setSubmittingComment((current) => ({ ...current, [postId]: false }))
    }
  }

  return <div className="lp-home app-green-theme"><Navbar />
    <div className="lp-home-grid">
      <main className="lp-home-center">
        <section className="lp-hero"><small>LA PULGA · KHÔNG GIAN ĐỒNG ĐIỆU</small><h1>Chào {displayName}, hôm nay bạn cảm thấy thế nào?</h1><p>Một nơi để chia sẻ câu chuyện thật, gặp gỡ những người cùng cảm xúc và tìm thấy sự thấu hiểu.</p><div className="lp-hero-actions"><Link to="/discover">Khám phá kết nối mới　→</Link>{!loading && !survey && <Link to="/survey" className="lp-survey-cta">Làm khảo sát　→</Link>}</div></section>
        <div className="lp-feed-card lp-create-card" style={{padding:16}}><div className="lp-feed-head"><Avatar src={avatar} alt="Avatar của bạn"/><div style={{flex:1}}><b>Chia sẻ điều bạn đang nghĩ, {displayName}?</b><small>Bài viết của bạn có thể giúp ai đó cảm thấy được thấu hiểu.</small></div></div><Link to="/communities?tab=feed" className="lp-filter lp-create-post">＋　Tạo bài viết / chia sẻ khoảnh khắc</Link></div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',margin:'22px 2px 12px',gap:12}}><div><div className="lp-section-label" style={{margin:0}}>Cộng đồng La Pulga</div><h2 style={{fontSize:20,marginTop:5}}>Bảng tin mới nhất</h2></div><select className="lp-feed-filter" value={filter} onChange={(e)=>setFilter(e.target.value)}><option>Phù hợp với bạn</option><option>Bạn bè kết nối</option><option>Cùng tâm trạng & hoàn cảnh</option><option>Tất cả bài viết</option></select></div>
        {loading ? <div className="lp-feed-card lp-home-empty">Đang tải bảng tin...</div> : visiblePosts.length === 0 ? <div className="lp-feed-card lp-home-empty">{posts.length === 0 ? 'Chưa có bài viết nào. Hãy khám phá cộng đồng hoặc kết nối với mọi người nhé.' : 'Chưa có bài viết phù hợp với bộ lọc này.'}<div style={{marginTop:14}}><Link className="lp-chip" to="/discover">Khám phá mọi người →</Link></div></div> : visiblePosts.map((post, index) => {
          const author = post.author || post.user || {}
          const name = author.display_name || author.username || post.author_name || 'Thành viên La Pulga'
          const content = post.content || post.body || post.text || ''
          const postId = post.id || post.post_id || index
          const postImage = post.image_url || post.image
          return (
            <article className="lp-feed-card" key={postId}>
              <div className="lp-feed-head">
                <Avatar src={author.avatar_url} alt={name} />
                <div style={{ flex: 1 }}>
                  <b>{name}</b>
                  <small>
                    {post.created_at
                      ? new Date(post.created_at).toLocaleString('vi-VN')
                      : 'Vừa chia sẻ'}
                    {post.mood ? ` · ${post.mood}` : ''}
                  </small>
                </div>
                <span className="lp-muted">•••</span>
              </div>
              <p>{content}</p>
              {postImage && (
                <div
                  onClick={() => setPreviewImage(postImage)}
                  title="Nhấn để phóng to ảnh xem chi tiết"
                  style={{
                    width: '100%',
                    maxHeight: 520,
                    borderRadius: 12,
                    overflow: 'hidden',
                    marginBottom: 14,
                    backgroundColor: '#08090a',
                    border: '1px solid #1a232e',
                    cursor: 'pointer',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={postImage}
                    alt="Ảnh trong bài viết"
                    style={{
                      maxWidth: '100%',
                      maxHeight: 520,
                      width: 'auto',
                      height: 'auto',
                      objectFit: 'contain',
                      display: 'block',
                      margin: '0 auto',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      right: 10,
                      padding: '4px 10px',
                      borderRadius: 8,
                      backgroundColor: 'rgba(0,0,0,0.7)',
                      backdropFilter: 'blur(4px)',
                      color: '#00ff88',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      pointerEvents: 'none',
                    }}
                  >
                    <span>🔍 Phóng to</span>
                  </div>
                </div>
              )}
              <div className="lp-feed-actions">
                <button
                  type="button"
                  disabled={Boolean(likingPosts[postId])}
                  onClick={() => handleLike(post)}
                  className={`lp-like-button ${post.is_liked_by_me ? 'is-liked' : ''}`}
                  aria-pressed={Boolean(post.is_liked_by_me)}
                >
                  {post.is_liked_by_me ? '♥' : '♡'}　{post.likes_count ?? 0} Thích
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleComments(postId)}
                  aria-expanded={Boolean(expandedComments[postId])}
                  aria-controls={`home-comments-${postId}`}
                >
                  ▢　{post.comments_count ?? 0} Bình luận
                </button>
                <span>↗　Chia sẻ</span>
              </div>

              {interactionErrors[postId] && (
                <p role="alert" style={{ color: '#fca5a5', fontSize: 12 }}>
                  {interactionErrors[postId]}
                </p>
              )}

              {expandedComments[postId] && (
                <section
                  id={`home-comments-${postId}`}
                  aria-label={`Bình luận bài viết của ${name}`}
                  style={{ marginTop: 14 }}
                >
                  {commentsLoading[postId] ? (
                    <p className="lp-muted">Đang tải bình luận...</p>
                  ) : (
                    <div style={{ display: 'grid', gap: 12, marginBottom: 14 }}>
                      {(commentsMap[postId] || []).length === 0 ? (
                        <p className="lp-muted">Chưa có bình luận nào.</p>
                      ) : (
                        commentsMap[postId].map((comment) => (
                          <div
                            key={comment.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 10,
                            }}
                          >
                            <Avatar
                              src={comment.author?.avatar_url}
                              alt={comment.author?.display_name || comment.author?.username}
                              style={{
                                width: 32,
                                height: 32,
                                flexShrink: 0,
                                borderRadius: '50%',
                                objectFit: 'cover',
                              }}
                            />
                            <div
                              style={{
                                flex: 1,
                                padding: '9px 12px',
                                borderRadius: 12,
                                backgroundColor: 'rgba(255,255,255,.05)',
                              }}
                            >
                              <b style={{ fontSize: 12 }}>
                                {comment.author?.display_name ||
                                  comment.author?.username ||
                                  'Thành viên'}
                              </b>
                              <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                                {comment.content}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  <form
                    onSubmit={(event) => handleAddComment(event, postId)}
                    style={{ display: 'flex', gap: 8 }}
                  >
                    <input
                      type="text"
                      value={commentInputs[postId] || ''}
                      onChange={(event) =>
                        setCommentInputs((current) => ({
                          ...current,
                          [postId]: event.target.value,
                        }))
                      }
                      placeholder="Viết bình luận..."
                      maxLength={1000}
                      aria-label="Viết bình luận"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '10px 12px',
                        border: '1px solid #3b473f',
                        borderRadius: 10,
                        color: 'inherit',
                        backgroundColor: 'rgba(0,0,0,.18)',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!commentInputs[postId]?.trim() || submittingComment[postId]}
                      className="lp-chip"
                      style={{ border: 0, cursor: 'pointer' }}
                    >
                      {submittingComment[postId] ? 'Đang gửi...' : 'Gửi'}
                    </button>
                  </form>
                </section>
              )}
            </article>
          )
        })}
      </main>

      <aside className="lp-home-right"><section className="lp-panel"><div className="lp-section-label" style={{marginTop:0}}>Tổng quan của bạn</div><div className="lp-stat"><span>Bạn bè kết nối</span><strong>{friendsCount}</strong></div><div className="lp-stat"><span>Tin nhắn chưa đọc</span><strong>{unreadMsgCount}</strong></div><div className="lp-stat"><span>Khảo sát</span><strong>{survey ? 'Hoàn tất' : 'Chưa làm'}</strong></div></section><section className="lp-panel" style={{marginTop:16}}><div className="lp-section-label" style={{marginTop:0}}>Gợi ý không gian</div>{[['🎨','Nghệ thuật & Sáng tạo','Chia sẻ cảm hứng'],['🎧','Âm nhạc & Lofi','Tìm người cùng gu'],['🌱','Phát triển bản thân','Cùng tiến bộ mỗi ngày']].map(([icon,title,desc])=><div className="lp-community-row" key={title}><span className="lp-community-icon">{icon}</span><div><b>{title}</b><small>{desc}</small></div></div>)}<Link to="/discover?tab=groups" className="lp-chip">Xem tất cả cộng đồng →</Link></section><section className="lp-panel" style={{marginTop:16}}><div className="lp-section-label" style={{marginTop:0}}>Câu hỏi hôm nay</div><p style={{fontSize:14,lineHeight:1.7}}>Điều nhỏ bé nào gần đây khiến bạn cảm thấy biết ơn?</p><span className="lp-muted">Một lời nhắc để bắt đầu cuộc trò chuyện.</span></section></aside>
    </div>

    {/* Lightbox Modal Phóng To Ảnh Chi Tiết */}
    {previewImage && (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(8px)',
          padding: 16,
        }}
        onClick={() => setPreviewImage(null)}
      >
        <div
          style={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            style={{
              position: 'absolute',
              top: -42,
              right: 0,
              width: 36,
              height: 36,
              borderRadius: '50%',
              backgroundColor: '#181d26',
              border: '1px solid #1a232e',
              color: '#f1ffef',
              cursor: 'pointer',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.2s',
            }}
            title="Đóng (Escape)"
          >
            ✕
          </button>
          <img
            src={previewImage}
            alt="Ảnh phóng to"
            style={{
              maxHeight: '85vh',
              maxWidth: '100%',
              objectFit: 'contain',
              borderRadius: 16,
              boxShadow: '0 0 50px rgba(0, 0, 0, 0.9)',
              border: '1px solid #1a232e',
            }}
          />
        </div>
      </div>
    )}
  </div>
}
