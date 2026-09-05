import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'

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

const CATEGORIES = ['Tất cả', 'Công nghệ', 'Học tập & Sự nghiệp', 'Nghệ thuật', 'Đời sống & Sở thích']

export default function Communities() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState('Tất cả')
  const [joinedCommunities, setJoinedCommunities] = useState([1, 2]) // Giả lập id nhóm đã tham gia
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3500)
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
    // Điều hướng sang Discover và truyền keyword sở thích
    navigate('/discover')
  }

  const filteredCommunities = COMMUNITIES_DATA.filter((c) => {
    if (selectedCategory === 'Tất cả') return true
    return c.category === selectedCategory
  })

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f7ff' }}>
      <Navbar />

      <div style={{ maxWidth: '1120px', margin: '0 auto', padding: '32px 16px 64px' }}>
        {/* Banner tiêu đề */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 14px',
              borderRadius: '20px',
              backgroundColor: '#f5f0ff',
              border: '1px solid #ede9fe',
              color: '#7c5cbf',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '12px',
            }}
          >
            <span>🌟 Không gian cộng đồng theo chủ đề</span>
          </div>

          <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1a1a2e', marginBottom: '8px' }}>
            Kết nối cùng những người <span style={{ color: '#7c5cbf' }}>chung đam mê</span>
          </h1>
          <p style={{ color: '#6b7280', fontSize: '15px', maxWidth: '600px', margin: '0 auto' }}>
            Tham gia các nhóm thảo luận chất lượng, giao lưu sở thích và tìm thấy những người bạn có cùng tần sóng.
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
              marginBottom: '24px',
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

        {/* Bộ lọc danh mục (Category Pills) */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '12px',
            marginBottom: '28px',
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
                  padding: '8px 18px',
                  borderRadius: '20px',
                  border: isSelected ? '1.5px solid #7c5cbf' : '1px solid #e5e7eb',
                  backgroundColor: isSelected ? '#7c5cbf' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#4b5563',
                  fontSize: '13.5px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 8px rgba(124, 92, 191, 0.25)' : 'none',
                }}
              >
                {cat}
              </button>
            )
          })}
        </div>

        {/* Danh sách lưới các thẻ Cộng đồng */}
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
                  border: '1px solid #ede9fe',
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
                        backgroundColor: '#faf9fe',
                        border: '1px dashed #ddd6fe',
                        borderRadius: '12px',
                        padding: '10px 12px',
                        marginBottom: '16px',
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#7c5cbf', display: 'block', marginBottom: '2px' }}>
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

                {/* Card Actions Footer */}
                <div
                  style={{
                    padding: '16px 20px',
                    borderTop: '1px solid #f3f4f6',
                    display: 'flex',
                    gap: '10px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleJoin(comm)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: isJoined ? '1px solid #d1d5db' : 'none',
                      backgroundColor: isJoined ? '#ffffff' : '#7c5cbf',
                      color: isJoined ? '#4b5563' : '#ffffff',
                      fontSize: '13px',
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
                      flex: 1,
                      padding: '10px',
                      borderRadius: '10px',
                      border: '1px solid #ede9fe',
                      backgroundColor: '#f5f0ff',
                      color: '#7c5cbf',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Tìm bạn bè ✨
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

