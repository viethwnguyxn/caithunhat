import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import CommunityHubContent from '../components/CommunityHubContent'

export default function Communities() {
  return (
    <div className="app-green-theme bg-[#08090a] min-h-screen text-[#e3e2e3] font-sans antialiased selection:bg-[#00ff88] selection:text-[#00210c]">
      <Navbar />

      <div className="pt-16">
        {/* Thanh điều hướng đồng nhất giữa Mọi người và Cộng đồng */}
        <div className="w-full bg-[#0d0e0f] border-b border-[#1a232e]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2">
            <Link
              to="/discover"
              className="inline-flex items-center gap-2 px-4 py-3 border-b-2 border-transparent text-sm font-semibold text-[#94a3b8] hover:text-[#f8fafc] transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">person_search</span>
              Mọi người
            </Link>
            <span className="inline-flex items-center gap-2 px-4 py-3 border-b-2 border-[#00ff88] text-sm font-semibold text-[#00ff88]">
              <span className="material-symbols-outlined text-[18px]">groups</span>
              Cộng đồng
            </span>
          </div>
        </div>

        <CommunityHubContent embedded={false} />
      </div>
    </div>
  )
}
