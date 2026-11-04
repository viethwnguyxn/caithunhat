import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#F8F7FA] text-[#292631] font-sans antialiased selection:bg-[#E9E1F3] selection:text-[#7C5CBF] flex flex-col justify-between">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-30 w-full bg-white/90 backdrop-blur-md border-b border-[#E9E1F3] shadow-[0_2px_12px_rgba(124,92,191,0.03)]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group select-none">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7C5CBF] to-[#906CD9] flex items-center justify-center text-white shadow-[0_2px_12px_rgba(124,92,191,0.3)] group-hover:scale-105 transition-transform">
              <span className="text-xl font-bold">◎</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-[#292631] tracking-tight group-hover:text-[#7C5CBF] transition-colors leading-none">
                Kindred
              </span>
              <span className="text-[10px] text-[#77717F] font-medium tracking-wide mt-0.5">
                Community Connection
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#77717F] hover:text-[#7C5CBF] hover:bg-[#F5F0FA] transition-all"
            >
              Đăng nhập
            </Link>
            <Link
              to="/register"
              className="btn-primary text-xs !py-2.5 !px-4 shadow-sm"
            >
              Khám phá Kindred
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 px-4 sm:px-6">
        {/* Soft Background Accents */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[360px] bg-gradient-to-tr from-[#E9E1F3]/40 via-[#F5F0FA]/70 to-transparent blur-3xl rounded-full pointer-events-none -z-10"></div>

        <div className="max-w-[1100px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5F0FA] border border-[#E9E1F3] text-[#7C5CBF] text-xs font-bold tracking-wide shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#7C5CBF] animate-pulse"></span>
              <span>Nền tảng kết nối người đồng điệu</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#292631] tracking-tight leading-[1.15]">
              Find people who <br className="hidden sm:inline" />
              <span className="text-[#7C5CBF] relative inline-block">
                understand you
                <svg
                  className="absolute -bottom-2 left-0 w-full h-2 text-[#7C5CBF]/30"
                  viewBox="0 0 100 12"
                  preserveAspectRatio="none"
                >
                  <path d="M0,8 Q50,0 100,8" fill="none" stroke="currentColor" strokeWidth="3" />
                </svg>
              </span>
            </h1>

            <p className="text-base sm:text-lg text-[#77717F] leading-relaxed max-w-xl mx-auto lg:mx-0">
              Không cần phải giống nhau hoàn toàn. Chỉ cần tìm thấy những người có thể hiểu câu chuyện, hoàn cảnh và mục tiêu của bạn.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2">
              <Link
                to="/register"
                className="btn-primary !px-7 !py-3.5 text-sm shadow-[0_8px_20px_rgba(124,92,191,0.28)]"
              >
                <span>Khám phá Kindred</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
              <a
                href="#how-it-works"
                className="btn-secondary !px-6 !py-3.5 text-sm"
              >
                Tìm hiểu thêm
              </a>
            </div>

            {/* Social Proof */}
            <div className="pt-4 flex items-center justify-center lg:justify-start gap-3 text-xs text-[#77717F]">
              <div className="flex -space-x-2">
                <img
                  className="w-8 h-8 rounded-full border-2 border-white object-cover"
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                  alt=""
                />
                <img
                  className="w-8 h-8 rounded-full border-2 border-white object-cover"
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80"
                  alt=""
                />
                <img
                  className="w-8 h-8 rounded-full border-2 border-white object-cover"
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80"
                  alt=""
                />
              </div>
              <span>Hàng ngàn bạn trẻ đang chia sẻ và tìm bạn tâm giao mỗi ngày.</span>
            </div>
          </div>

          {/* Right Floating Mockup Cards */}
          <div className="lg:col-span-5 relative flex justify-center">
            {/* Main Interactive Card */}
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-[0_20px_50px_rgba(124,92,191,0.12)] border border-[#E9E1F3] space-y-4 transition-transform hover:-translate-y-1 duration-300">
              <div className="flex items-center justify-between pb-3 border-b border-[#F2EFF5]">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80"
                      alt="Thảo Nguyên"
                      className="w-13 h-13 rounded-2xl object-cover border border-[#E9E1F3]"
                    />
                    <span className="pulse-dot absolute -bottom-0.5 -right-0.5"></span>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <h4 className="font-bold text-sm text-[#292631]">Thảo Nguyên</h4>
                      <span className="material-symbols-outlined text-[16px] text-[#7C5CBF]">verified</span>
                    </div>
                    <p className="text-xs text-[#77717F]">UI/UX Designer • 24 tuổi</p>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-full bg-[#ECFDF5] text-[#10B981] font-bold text-xs border border-[#A7F3D0]">
                  96% Match
                </div>
              </div>

              <p className="text-xs text-[#292631] italic bg-[#F5F0FA] p-3 rounded-xl border border-[#E9E1F3]/60 leading-relaxed">
                “Đang tìm người bạn cùng đọc sách Deep Work và chia sẻ về thiết kế sản phẩm mỗi tối.”
              </p>

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-[#77717F]">Điểm tương đồng:</span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg bg-[#F5F0FA] text-[#7C5CBF] text-xs font-semibold">
                    #Sách & Tư duy
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#F5F0FA] text-[#7C5CBF] text-xs font-semibold">
                    #Công nghệ
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#F5F0FA] text-[#7C5CBF] text-xs font-semibold">
                    #Cà phê làm việc
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <Link
                  to="/register"
                  className="flex-1 py-2 rounded-xl bg-[#7C5CBF] text-white text-xs font-bold text-center shadow-sm hover:bg-[#6949A8] transition-colors"
                >
                  Gửi lời mời kết nối
                </Link>
              </div>
            </div>

            {/* Subtle Floating Badge 1 */}
            <div className="absolute -top-6 -left-6 hidden sm:flex items-center gap-2 p-3 rounded-2xl bg-white border border-[#E9E1F3] shadow-lg animate-bounce [animation-duration:3s]">
              <span className="text-xl">✨</span>
              <div className="text-left">
                <p className="text-[11px] font-bold text-[#292631]">Tần số tương hợp</p>
                <p className="text-[10px] text-[#77717F]">Thuật toán ghép đôi sâu</p>
              </div>
            </div>

            {/* Subtle Floating Badge 2 */}
            <div className="absolute -bottom-4 -right-4 hidden sm:flex items-center gap-2 p-3 rounded-2xl bg-white border border-[#E9E1F3] shadow-lg">
              <span className="text-xl">🔒</span>
              <div className="text-left">
                <p className="text-[11px] font-bold text-[#292631]">Mã hóa WebRTC E2EE</p>
                <p className="text-[10px] text-[#10B981] font-semibold">Bảo mật riêng tư 100%</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How Kindred Works Section */}
      <section id="how-it-works" className="py-20 bg-white border-y border-[#E9E1F3] px-4 sm:px-6">
        <div className="max-w-[1100px] mx-auto text-center space-y-12">
          <div className="max-w-xl mx-auto space-y-3">
            <span className="text-xs font-bold text-[#7C5CBF] uppercase tracking-wider">
              Quy trình kết nối
            </span>
            <h2 className="text-3xl font-extrabold text-[#292631]">Cách Kindred hoạt động</h2>
            <p className="text-sm text-[#77717F]">
              Đơn giản, tự nhiên và an toàn. Giúp bạn tìm ra những người bạn phù hợp nhất mà không tốn công gượng gạo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-[#F8F7FA] border border-[#E9E1F3] text-left space-y-3 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F0FA] text-[#7C5CBF] font-extrabold text-xl flex items-center justify-center border border-[#E9E1F3]">
                1
              </div>
              <h3 className="text-base font-bold text-[#292631]">Làm bài khảo sát</h3>
              <p className="text-xs text-[#77717F] leading-relaxed">
                6 câu hỏi nhẹ nhàng về độ tuổi, hoàn cảnh hiện tại, cảm xúc và sở thích cá nhân.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-[#F8F7FA] border border-[#E9E1F3] text-left space-y-3 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F0FA] text-[#7C5CBF] font-extrabold text-xl flex items-center justify-center border border-[#E9E1F3]">
                2
              </div>
              <h3 className="text-base font-bold text-[#292631]">Phân tích tương hợp</h3>
              <p className="text-xs text-[#77717F] leading-relaxed">
                Thuật toán đối chiếu vector để tính điểm % tương đồng và lý do bạn nên làm quen với họ.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-[#F8F7FA] border border-[#E9E1F3] text-left space-y-3 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F0FA] text-[#7C5CBF] font-extrabold text-xl flex items-center justify-center border border-[#E9E1F3]">
                3
              </div>
              <h3 className="text-base font-bold text-[#292631]">Gửi lời mời kết nối</h3>
              <p className="text-xs text-[#77717F] leading-relaxed">
                Chủ động gửi lời mời và trở thành bạn bè khi cả hai cùng đồng ý mở lòng trò chuyện.
              </p>
            </div>

            {/* Step 4 */}
            <div className="p-6 rounded-2xl bg-[#F8F7FA] border border-[#E9E1F3] text-left space-y-3 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-[#F5F0FA] text-[#7C5CBF] font-extrabold text-xl flex items-center justify-center border border-[#E9E1F3]">
                4
              </div>
              <h3 className="text-base font-bold text-[#292631]">Trò chuyện & Gọi thoại</h3>
              <p className="text-xs text-[#77717F] leading-relaxed">
                Nhắn tin thời gian thực và gọi thoại WebRTC mã hóa đầu cuối với chất lượng âm thanh HD.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Values Pillars */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-[1100px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-8 rounded-3xl bg-white border border-[#E9E1F3] shadow-[0_4px_20px_rgba(124,92,191,0.06)] space-y-3">
            <span className="text-3xl p-3 rounded-2xl bg-[#F5F0FA] inline-block border border-[#E9E1F3]">
              🌱
            </span>
            <h3 className="text-lg font-bold text-[#292631]">Không gian an toàn, tôn trọng</h3>
            <p className="text-sm text-[#77717F] leading-relaxed">
              Môi trường hướng đến sự thấu cảm, không phán xét, với tính năng báo cáo vi phạm và kiểm duyệt tích cực.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-[#E9E1F3] shadow-[0_4px_20px_rgba(124,92,191,0.06)] space-y-3">
            <span className="text-3xl p-3 rounded-2xl bg-[#F5F0FA] inline-block border border-[#E9E1F3]">
              🎯
            </span>
            <h3 className="text-lg font-bold text-[#292631]">Chất lượng hơn số lượng</h3>
            <p className="text-sm text-[#77717F] leading-relaxed">
              Thay vì lướt vô tận, Kindred giúp bạn tìm thấy những người có hoàn cảnh và tần số phù hợp thực sự.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-white border border-[#E9E1F3] shadow-[0_4px_20px_rgba(124,92,191,0.06)] space-y-3">
            <span className="text-3xl p-3 rounded-2xl bg-[#F5F0FA] inline-block border border-[#E9E1F3]">
              🔒
            </span>
            <h3 className="text-lg font-bold text-[#292631]">Bảo mật & Quyền riêng tư</h3>
            <p className="text-sm text-[#77717F] leading-relaxed">
              Không bán dữ liệu, không quảng cáo làm phiền. Mọi thông tin nhạy cảm của bạn luôn được bảo vệ tối đa.
            </p>
          </div>
        </div>
      </section>

      {/* 5. Final CTA Section */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-[1000px] mx-auto rounded-3xl bg-gradient-to-tr from-[#7C5CBF] to-[#906CD9] p-10 md:p-14 text-white text-center space-y-6 shadow-[0_16px_40px_rgba(124,92,191,0.3)]">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Sẵn sàng tìm kiếm những người bạn thấu hiểu?
          </h2>
          <p className="text-base text-white/90 max-w-xl mx-auto leading-relaxed">
            Tham gia cộng đồng Kindred ngay hôm nay. Hoàn toàn miễn phí và bắt đầu câu chuyện của riêng bạn.
          </p>
          <div>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-[#7C5CBF] font-bold text-sm shadow-md hover:bg-[#F5F0FA] transition-all"
            >
              <span>Tạo tài khoản Kindred</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 6. Footer */}
      <footer className="w-full bg-white border-t border-[#E9E1F3] py-10 px-4 sm:px-6 text-xs text-[#77717F]">
        <div className="max-w-[1100px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-2 font-bold text-sm text-[#292631]">
            <span className="w-6 h-6 rounded-lg bg-[#7C5CBF] text-white flex items-center justify-center text-xs">
              ◎
            </span>
            <span>Kindred</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6">
            <Link to="/login" className="hover:text-[#7C5CBF] transition-colors">
              Đăng nhập
            </Link>
            <Link to="/register" className="hover:text-[#7C5CBF] transition-colors">
              Đăng ký
            </Link>
            <a href="#how-it-works" className="hover:text-[#7C5CBF] transition-colors">
              Cách hoạt động
            </a>
            <span className="text-[#A19AA8]">•</span>
            <span>Find people who understand you</span>
          </div>

          <div>© {new Date().getFullYear()} Kindred Platform. Bảo lưu mọi quyền.</div>
        </div>
      </footer>
    </div>
  )
}
