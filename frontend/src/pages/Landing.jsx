import { Link } from 'react-router-dom'
import '../styles/lapulga.css'
import brandMark from '../assets/lapulga-mark.svg'

const features = [
  {
    icon: 'favorite',
    title: 'Kết nối chân thật',
    description: 'Với những người thấu hiểu bạn',
  },
  {
    icon: 'groups',
    title: 'Cộng đồng đa dạng',
    description: 'Theo đuổi sở thích chung',
  },
  {
    icon: 'explore',
    title: 'Trải nghiệm mượt mà',
    description: 'Mọi lúc, mọi nơi',
  },
]

export default function Landing() {
  return (
    <div className="lp-landing">
      <header className="lp-landing-nav">
        <Link to="/" className="lp-brand" aria-label="La Pulga - Trang chủ">
          <img src={brandMark} alt="" className="lp-brand-image" />
          <span>La Pulga</span>
        </Link>
        <nav aria-label="Điều hướng trang bắt đầu">
          <Link to="/discover">Khám phá</Link>
          <Link to="/communities">Cộng đồng</Link>
          <a href="#about">Về chúng tôi</a>
        </nav>
        <Link to="/login" className="lp-login-link">Đăng nhập</Link>
      </header>

      <main className="lp-landing-main" id="about">
        <div className="lp-landing-copy">
          <h1>
            Kết nối thật.
            <br />
            <em>Khoảnh khắc thật.</em>
          </h1>
          <p>
            La Pulga là nơi bạn tìm thấy những người cùng tần số, chia sẻ sở thích
            và tạo nên những mối quan hệ ý nghĩa.
          </p>
          <div className="lp-landing-actions">
            <Link to="/register" className="lp-button lp-button-large">
              Tham gia ngay <span aria-hidden="true">→</span>
            </Link>
            <a href="#features" className="lp-learn-link">
              <span className="lp-play-icon" aria-hidden="true">▶</span>
              Tìm hiểu thêm
            </a>
          </div>
        </div>
      </main>

      <section className="lp-feature-strip" id="features" aria-label="Điểm nổi bật">
        {features.map((feature) => (
          <article key={feature.title}>
            <span className="material-symbols-outlined lp-feature-icon" aria-hidden="true">
              {feature.icon}
            </span>
            <div>
              <b>{feature.title}</b>
              <p>{feature.description}</p>
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}
