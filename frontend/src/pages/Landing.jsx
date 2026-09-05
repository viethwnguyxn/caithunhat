import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f7ff', display: 'flex', flexDirection: 'column' }}>
      {/* Landing Header */}
      <header
        style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '22px', color: '#7c5cbf' }}>
          <span
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c5cbf, #9b7fe8)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}
          >
            ◎
          </span>
          <span>Kindred</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to="/login"
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#4b5563',
              transition: 'all 0.15s ease',
            }}
          >
            Đăng nhập
          </Link>
          <Link
            to="/register"
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #7c5cbf, #9b7fe8)',
              boxShadow: '0 2px 10px rgba(124, 92, 191, 0.25)',
            }}
          >
            Bắt đầu ngay
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px 60px' }}>
        <div className="landing-hero" style={{ maxWidth: '780px', textAlign: 'center', margin: '0 auto' }}>
          {/* Badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 16px',
              borderRadius: '20px',
              backgroundColor: '#f5f0ff',
              border: '1px solid #ede9fe',
              color: '#7c5cbf',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '24px',
            }}
          >
            <span>✨ Nền tảng kết nối cộng đồng thấu hiểu</span>
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: '44px',
              fontWeight: 900,
              lineHeight: 1.2,
              color: '#1a1a2e',
              marginBottom: '20px',
              letterSpacing: '-1px',
            }}
          >
            Find people who <span style={{ color: '#7c5cbf' }}>understand you</span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: '17px',
              color: '#4b5563',
              maxWidth: '560px',
              margin: '0 auto 36px',
              lineHeight: 1.6,
            }}
          >
            Kết nối với những người có cùng hoàn cảnh, mục tiêu và câu chuyện cuộc sống. Bởi vì đôi khi, được thấu hiểu là tất cả.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '48px' }}>
            <Link
              to="/register"
              className="btn-primary"
              style={{
                width: 'auto',
                padding: '14px 28px',
                fontSize: '15px',
                borderRadius: '12px',
              }}
            >
              Bắt đầu miễn phí →
            </Link>
            <Link
              to="/login"
              className="btn-secondary"
              style={{
                width: 'auto',
                padding: '14px 28px',
                fontSize: '15px',
                borderRadius: '12px',
              }}
            >
              Đăng nhập tài khoản
            </Link>
          </div>

          {/* 3 Value Pillars */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px',
              textAlign: 'left',
              marginTop: '20px',
            }}
          >
            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #ede9fe',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>📋</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', marginBottom: '6px' }}>
                Khảo sát chân thực
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                6 bước nhẹ nhàng chia sẻ về độ tuổi, cảm xúc gần đây, sở thích và kỳ vọng kết nối.
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #ede9fe',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>🧠</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', marginBottom: '6px' }}>
                Đề xuất đồng điệu
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                Hệ thống so khớp thông minh bằng TF-IDF & Cosine Similarity giúp tìm ra bạn bè có cùng tần số.
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#ffffff',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #ede9fe',
                boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>💬</div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a2e', marginBottom: '6px' }}>
                Trò chuyện Realtime
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>
                Nhắn tin 1-1 trực tiếp qua WebSocket mượt mà, lưu trữ an toàn và bảo mật riêng tư.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Landing Footer */}
      <footer
        style={{
          borderTop: '1px solid #ede9fe',
          padding: '24px 16px',
          textAlign: 'center',
          color: '#9ca3af',
          fontSize: '13px',
          backgroundColor: '#ffffff',
        }}
      >
        <p style={{ margin: 0 }}>
          ◎ Kindred Community Connection Platform • <em>"Find people who understand you"</em>
        </p>
      </footer>
    </div>
  )
}
