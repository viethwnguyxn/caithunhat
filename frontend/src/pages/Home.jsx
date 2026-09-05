import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'
import { getProfile } from '../services/profileService'
import { getSurvey } from '../services/surveyService'
import { getMyConnections } from '../services/connectionService'
import { getConversations } from '../services/chatService'

export default function Home() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [survey, setSurvey] = useState(null)
  const [friendsCount, setFriendsCount] = useState(0)
  const [unreadMsgCount, setUnreadMsgCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [profileData, surveyData, conns, convs] = await Promise.all([
          getProfile().catch(() => null),
          getSurvey().catch(() => null),
          getMyConnections().catch(() => []),
          getConversations().catch(() => []),
        ])
        setProfile(profileData)
        setSurvey(surveyData)
        setFriendsCount(conns?.length || 0)

        // Tính tổng tin nhắn chưa đọc
        const unreadTotal = (convs || []).reduce((acc, c) => acc + (c.unread_count || 0), 0)
        setUnreadMsgCount(unreadTotal)
      } catch (err) {
        console.error('Lỗi khi tải thông tin Dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const displayName = profile?.display_name || user?.username || 'Bạn'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f7ff' }}>
      <Navbar />

      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '32px 16px 64px' }}>
        {/* ========================================================= */}
        {/* HERO WELCOME BANNER                                       */}
        {/* ========================================================= */}
        <div
          style={{
            background: 'linear-gradient(135deg, #7c5cbf 0%, #9b7fe8 100%)',
            borderRadius: '24px',
            padding: '36px 32px',
            color: '#ffffff',
            marginBottom: '32px',
            boxShadow: '0 8px 24px rgba(124, 92, 191, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '24px',
          }}
        >
          <div style={{ maxWidth: '620px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                fontSize: '12px',
                fontWeight: 600,
                marginBottom: '14px',
              }}
            >
              <span>◎ Kindred Community</span>
            </div>

            <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 10px 0', letterSpacing: '-0.5px' }}>
              Chào mừng trở lại, {displayName}! ✨
            </h1>

            <p style={{ fontSize: '15px', opacity: 0.92, margin: '0 0 20px 0', lineHeight: '1.6' }}>
              <em>"Find people who understand you."</em> — Nơi bạn tìm thấy những người bạn có cùng hoàn cảnh, mục tiêu và chia sẻ những câu chuyện chân thực nhất.
            </p>

            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <Link to="/discover">
                <button
                  type="button"
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#ffffff',
                    color: '#7c5cbf',
                    fontSize: '14px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}
                >
                  Khám phá người đồng điệu →
                </button>
              </Link>
              {!survey && (
                <Link to="/survey">
                  <button
                    type="button"
                    style={{
                      padding: '10px 20px',
                      borderRadius: '10px',
                      border: '1.5px solid rgba(255,255,255,0.8)',
                      backgroundColor: 'transparent',
                      color: '#ffffff',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Hoàn thành Khảo sát
                  </button>
                </Link>
              )}
            </div>
          </div>

          {/* User Avatar Circle */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <img
              src={
                profile?.avatar_url ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`
              }
              alt={displayName}
              style={{
                width: '90px',
                height: '90px',
                borderRadius: '50%',
                border: '3px solid rgba(255, 255, 255, 0.8)',
                objectFit: 'cover',
                backgroundColor: '#f5f0ff',
                boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
              }}
            />
            <span style={{ marginTop: '10px', fontSize: '13px', fontWeight: 600, opacity: 0.9 }}>
              @{user?.username}
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* STATS QUICK SUMMARY ROW                                   */}
        {/* ========================================================= */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {/* Survey Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '18px',
              border: '1px solid #ede9fe',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                Khảo sát Onboarding
              </span>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: survey ? '#059669' : '#b45309', margin: '4px 0 0 0' }}>
                {survey ? '✓ Đã hoàn thành' : '⚡ Chưa làm'}
              </h3>
            </div>
            <Link
              to="/survey"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#f5f0ff',
                color: '#7c5cbf',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              {survey ? 'Xem lại' : 'Làm ngay'}
            </Link>
          </div>

          {/* Friends Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '18px',
              border: '1px solid #ede9fe',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                Bạn bè kết nối
              </span>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#1a1a2e', margin: '4px 0 0 0' }}>
                {friendsCount} người
              </h3>
            </div>
            <Link
              to="/connections"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#f5f0ff',
                color: '#7c5cbf',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Quản lý
            </Link>
          </div>

          {/* Messages Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              padding: '20px',
              borderRadius: '18px',
              border: '1px solid #ede9fe',
              boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>
                Tin nhắn mới
              </span>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: unreadMsgCount > 0 ? '#ef4444' : '#1a1a2e', margin: '4px 0 0 0' }}>
                {unreadMsgCount > 0 ? `${unreadMsgCount} chưa đọc` : '0 tin mới'}
              </h3>
            </div>
            <Link
              to="/messages"
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#f5f0ff',
                color: '#7c5cbf',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Mở chat 💬
            </Link>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4 FEATURE HUB CARDS                                       */}
        {/* ========================================================= */}
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1a1a2e', marginBottom: '16px' }}>
          Khám phá không gian cộng đồng 🌿
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '20px',
            marginBottom: '36px',
          }}
        >
          {/* Card 1: Khám phá */}
          <Link
            to="/discover"
            className="card-hover"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid #ede9fe',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  backgroundColor: '#f5f0ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '16px',
                }}
              >
                ✨
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>
                Khám phá người đồng điệu
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                Xem danh sách những người có điểm số tương đồng cao nhất dựa trên khảo sát và hồ sơ cá nhân của bạn.
              </p>
            </div>
            <span style={{ marginTop: '20px', color: '#7c5cbf', fontWeight: 700, fontSize: '13px' }}>
              Khám phá ngay →
            </span>
          </Link>

          {/* Card 2: Cộng đồng */}
          <Link
            to="/communities"
            className="card-hover"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid #ede9fe',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '16px',
                }}
              >
                🌟
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>
                Cộng đồng theo chủ đề
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                Gia nhập các nhóm sở thích: Lập trình viên, Sách & Phát triển bản thân, Nghệ thuật, Thể thao, Freelancer...
              </p>
            </div>
            <span style={{ marginTop: '20px', color: '#d97706', fontWeight: 700, fontSize: '13px' }}>
              Xem các nhóm →
            </span>
          </Link>

          {/* Card 3: Kết nối */}
          <Link
            to="/connections"
            className="card-hover"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid #ede9fe',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  backgroundColor: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '16px',
                }}
              >
                🤝
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>
                Mạng lưới bạn bè
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                Quản lý các kết nối đã đồng ý, duyệt các lời mời kết nối nhận được và theo dõi lời mời đã gửi đi.
              </p>
            </div>
            <span style={{ marginTop: '20px', color: '#059669', fontWeight: 700, fontSize: '13px' }}>
              Xem bạn bè ({friendsCount}) →
            </span>
          </Link>

          {/* Card 4: Nhắn tin */}
          <Link
            to="/messages"
            className="card-hover"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              padding: '24px',
              border: '1px solid #ede9fe',
              boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  backgroundColor: '#eff6ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  marginBottom: '16px',
                }}
              >
                💬
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>
                Trò chuyện Realtime
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                Nhắn tin 1-1 trực tiếp qua WebSocket tốc độ cao, hiển thị tức thời, bảo mật và lưu trữ an toàn.
              </p>
            </div>
            <span style={{ marginTop: '20px', color: '#2563eb', fontWeight: 700, fontSize: '13px' }}>
              Mở hộp thư →
            </span>
          </Link>
        </div>

        {/* ========================================================= */}
        {/* WARM TIPS & GUIDELINES                                    */}
        {/* ========================================================= */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            padding: '28px',
            border: '1px solid #ede9fe',
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: '#f5f0ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              flexShrink: 0,
            }}
          >
            💡
          </div>
          <div style={{ flex: 1, minWidth: '240px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', margin: '0 0 4px 0' }}>
              Lời khuyên kết nối từ Kindred
            </h4>
            <p style={{ fontSize: '13.5px', color: '#4b5563', margin: 0, lineHeight: 1.5 }}>
              Một lời chào chân thành và nhắc đến điểm tương đồng mà hai bạn cùng chia sẻ trong khảo sát sẽ là khởi đầu tuyệt vời cho một tình bạn lâu dài!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
