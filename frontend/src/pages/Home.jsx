import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import { getProfile } from '../services/profileService'
import { getSurvey } from '../services/surveyService'
import { getMyConnections } from '../services/connectionService'
import { getConversations } from '../services/chatService'
import postService from '../services/postService'
import '../styles/lapulga.css'

const avatarFor = (name = 'user') => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
const unwrapList = (value) => Array.isArray(value) ? value : Array.isArray(value?.items) ? value.items : Array.isArray(value?.posts) ? value.posts : Array.isArray(value?.data) ? value.data : []

export default function Home() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [survey, setSurvey] = useState(null)
  const [friendsCount, setFriendsCount] = useState(0)
  const [connectedUserIds, setConnectedUserIds] = useState([])
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('Phù hợp với bạn')
  const displayName = profile?.display_name || user?.display_name || user?.username || 'Bạn'
  const avatar = profile?.avatar_url || user?.avatar_url || avatarFor(user?.username)

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
    const id = post?.id || post?.post_id
    if (!id) return
    try {
      await postService.toggleLike(id)
      setPosts((current) => current.map((item) => (item.id || item.post_id) === id ? { ...item, is_liked: !item.is_liked, liked: !item.liked, likes_count: Math.max(0, (item.likes_count || item.like_count || 0) + (item.is_liked ? -1 : 1)) } : item))
    } catch (error) { console.error('Không thể thích bài viết:', error) }
  }

  return <div className="lp-home app-green-theme"><Navbar />
    <div className="lp-home-grid">
      <main className="lp-home-center">
        <section className="lp-hero"><small>LA PULGA · KHÔNG GIAN ĐỒNG ĐIỆU</small><h1>Chào {displayName}, hôm nay bạn cảm thấy thế nào?</h1><p>Một nơi để chia sẻ câu chuyện thật, gặp gỡ những người cùng cảm xúc và tìm thấy sự thấu hiểu.</p><Link to="/discover">Khám phá kết nối mới　→</Link></section>
        <div className="lp-feed-card lp-create-card" style={{padding:16}}><div className="lp-feed-head"><img src={avatar} alt="Avatar của bạn"/><div style={{flex:1}}><b>Chia sẻ điều bạn đang nghĩ, {displayName}?</b><small>Bài viết của bạn có thể giúp ai đó cảm thấy được thấu hiểu.</small></div></div><Link to="/communities?tab=feed" className="lp-filter lp-create-post">＋　Tạo bài viết / chia sẻ khoảnh khắc</Link></div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',margin:'22px 2px 12px',gap:12}}><div><div className="lp-section-label" style={{margin:0}}>Cộng đồng La Pulga</div><h2 style={{fontSize:20,marginTop:5}}>Bảng tin mới nhất</h2></div><select className="lp-feed-filter" value={filter} onChange={(e)=>setFilter(e.target.value)}><option>Phù hợp với bạn</option><option>Bạn bè kết nối</option><option>Cùng tâm trạng & hoàn cảnh</option><option>Tất cả bài viết</option></select></div>
        {loading ? <div className="lp-feed-card lp-home-empty">Đang tải bảng tin...</div> : visiblePosts.length === 0 ? <div className="lp-feed-card lp-home-empty">{posts.length === 0 ? 'Chưa có bài viết nào. Hãy khám phá cộng đồng hoặc kết nối với mọi người nhé.' : 'Chưa có bài viết phù hợp với bộ lọc này.'}<div style={{marginTop:14}}><Link className="lp-chip" to="/discover">Khám phá mọi người →</Link></div></div> : visiblePosts.map((post, index) => {
          const author = post.author || post.user || {}
          const name = author.display_name || author.username || post.author_name || 'Thành viên La Pulga'
          const content = post.content || post.body || post.text || ''
          const postId = post.id || post.post_id || index
          const postImage = post.image_url || post.image
          return <article className="lp-feed-card" key={postId}><div className="lp-feed-head"><img src={author.avatar_url || avatarFor(name)} alt={name}/><div style={{flex:1}}><b>{name}</b><small>{post.created_at ? new Date(post.created_at).toLocaleString('vi-VN') : 'Vừa chia sẻ'}{post.mood ? ` · ${post.mood}` : ''}</small></div><span className="lp-muted">•••</span></div><p>{content}</p>{postImage && <img src={postImage} alt="Ảnh trong bài viết" style={{width:'100%',maxHeight:420,objectFit:'cover',borderRadius:12,marginBottom:14}}/>}<div className="lp-feed-actions"><button type="button" onClick={()=>handleLike(post)} className={`lp-like-button ${post.is_liked || post.liked ? 'is-liked' : ''}`}>♡　{post.likes_count ?? post.like_count ?? 0} Thích</button><span>▢　{post.comments_count ?? post.comment_count ?? 0} Bình luận</span><span>↗　Chia sẻ</span></div></article>
        })}
      </main>

      <aside className="lp-home-right"><section className="lp-panel"><div className="lp-section-label" style={{marginTop:0}}>Tổng quan của bạn</div><div className="lp-stat"><span>Bạn bè kết nối</span><strong>{friendsCount}</strong></div><div className="lp-stat"><span>Tin nhắn chưa đọc</span><strong>{unreadMsgCount}</strong></div><div className="lp-stat"><span>Khảo sát</span><strong>{survey ? 'Hoàn tất' : 'Chưa làm'}</strong></div></section><section className="lp-panel" style={{marginTop:16}}><div className="lp-section-label" style={{marginTop:0}}>Gợi ý không gian</div>{[['🎨','Nghệ thuật & Sáng tạo','Chia sẻ cảm hứng'],['🎧','Âm nhạc & Lofi','Tìm người cùng gu'],['🌱','Phát triển bản thân','Cùng tiến bộ mỗi ngày']].map(([icon,title,desc])=><div className="lp-community-row" key={title}><span className="lp-community-icon">{icon}</span><div><b>{title}</b><small>{desc}</small></div></div>)}<Link to="/discover?tab=groups" className="lp-chip">Xem tất cả cộng đồng →</Link></section><section className="lp-panel" style={{marginTop:16}}><div className="lp-section-label" style={{marginTop:0}}>Câu hỏi hôm nay</div><p style={{fontSize:14,lineHeight:1.7}}>Điều nhỏ bé nào gần đây khiến bạn cảm thấy biết ơn?</p><span className="lp-muted">Một lời nhắc để bắt đầu cuộc trò chuyện.</span></section></aside>
    </div>
  </div>
}
