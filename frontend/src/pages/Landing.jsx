import { Link } from 'react-router-dom'
import '../styles/lapulga.css'

export default function Landing() {
  return (
    <div className="lp-landing">
      <header className="lp-landing-nav">
        <Link to="/" className="lp-brand"><span className="lp-brand-mark">✳</span><span>La Pulga</span></Link>
        <nav><a href="#about">Về La Pulga</a><a href="#features">Khám phá</a></nav>
        <div className="lp-landing-actions"><Link to="/login" className="lp-login-link">Đăng nhập</Link><Link to="/register" className="lp-button">Tham gia ngay <span>↗</span></Link></div>
      </header>
      <main className="lp-landing-main" id="about">
        <div className="lp-landing-copy"><div className="lp-eyebrow"><span className="lp-pulse"/> KHÔNG GIAN KẾT NỐI ĐỒNG ĐIỆU</div><h1>Tìm thấy những người <em>hiểu bạn.</em></h1><p>La Pulga là nơi những câu chuyện, cảm xúc và trải nghiệm gặp nhau. Kết nối chân thành bắt đầu từ những điều chúng ta có chung.</p><div className="lp-landing-actions"><Link to="/register" className="lp-button lp-button-large">Tạo tài khoản miễn phí <span>→</span></Link><Link to="/login" className="lp-outline-button">Tôi đã có tài khoản</Link></div><div className="lp-trust"><div className="lp-avatar-stack"><span>🌿</span><span>🎧</span><span>🎨</span><span>☕</span></div><span>Một cộng đồng để bạn được là chính mình.</span></div></div>
        <div className="lp-landing-art"><div className="lp-orbit lp-orbit-one"/><div className="lp-orbit lp-orbit-two"/><div className="lp-art-center">✳</div><div className="lp-float-card lp-float-one"><b>🌱 Cùng phát triển</b><small>Chia sẻ hành trình của bạn</small></div><div className="lp-float-card lp-float-two"><b>💬 Cùng thấu hiểu</b><small>Kết nối từ những câu chuyện thật</small></div><div className="lp-float-card lp-float-three"><b>✨ Cùng cảm xúc</b><small>Bạn không đơn độc</small></div></div>
      </main>
      <section className="lp-feature-strip" id="features"><article><span>01</span><b>Khám phá</b><p>Tìm người và cộng đồng có chung mối quan tâm.</p></article><article><span>02</span><b>Kết nối</b><p>Xây dựng những mối quan hệ chân thành.</p></article><article><span>03</span><b>Chia sẻ</b><p>Đăng câu chuyện và cảm xúc của bạn.</p></article></section>
    </div>
  )
}
