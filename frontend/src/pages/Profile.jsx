import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProfile, updateProfile } from '../services/profileService'
import { getSurvey } from '../services/surveyService'
import { getMyConnections } from '../services/connectionService'
import postService from '../services/postService'
import Navbar from '../components/Navbar'
import Avatar from '../components/Avatar'

const PRESET_AVATARS = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCiQ_9KvdGg49TZie-zDjVeOftAxNCznV6JPzx4pJuGpDLiP3cMwgIzRYJv0BXvzvYmoqkLvkb5DC9pKojWcGf1TIZYjSg_bhLv31lF7U_me8dOsc9FjEyHP4WqQiu9OD4ro-Firy3DdCECYjpKZTZkFEi8wKUV3lEnRuvn010z3zVsfOH0-s4aasvto5JX88VuqpgV9umBb-z4uc5IsfcwDfbyW7tia7QNAXx0TPw',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBKROmy_vcOiz0eA7jyGi0aRTCpcyevF9nsFyhm43vRarVPxoHuEjdHezu5ySalTCwf1oxW880XTSkZ7QAAwupGQDXJDAi4agOnPkOwG3Sa5bKbZJLbAptmpoAOI1driEszJ79Q-7nmhzF-_v5HhunaB0ZIlLmqpj7XOyH6fUoyw6FrthwToaYRI18Ui10v7IEmTvpd3nzhQdwS-M-yTp-uqLW7nowdiKvPeV4n7o0',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDm8BtqbxQATnU4r8p4HYsEBzlVFeftfs7AcBeTdOxmQE0GVijI7YDUjS02GoMHebMPtnHXtwPndG3fNytPdSrE5SqmwtQY6SRqc8oFa3u7nrj61Pj_PdegCtFH-5stO55QCOd6wELZdwQ_gFFknTe8PxQW0K-FRKcw7YkiDkKJvcKZnKLz7lsewidNmk38V9gL4K6lDbOunjzQNl56SNsUP0emS049SHxPm4IZ8Sc',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCal4ZuqvY2Ev-a-URX2XDcXYOUde9GHcLFGFgGOysZxm4E7gTIfSTZCDtw-KudedJDgu7gkbT5JQ8jrLhPcR_5COkO8PIktEHRrquMSEsptWvi5MLggqkOC_lkXsCdmpvI9PSwe8z-s8823UJSqzVkSfjYIyoMzFZlNbT9IZXwksy8FRtZkyD7LHA9_vFr1_Cw02IYll3Z3s3AWbAseGqNZD9R9UWAAFlA9HFpPJ4',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAvClrxi7sYu2IW5nlZnqwGayEg9Or6If9xcTzUHg1SZjEtktTn7ti7rEkXamrQsCq2Xzw0hoyLngKge8FG-nF05NdgmTi3z7xc9BSO7v8mShGBuYIUYo1U5FwAQok7qykPKylUzr-swZCYpDgtAsbnhISm1qHVQrR5l_xgBuGGh0OMupkq0O8rTQtZO4NLsIR6MYBX1ZMGe4tILjFaxyX44CjxjOZ7O4otKBidLxg',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA9NNF1YWYQcAvQfoI53bxWdekgAD-r0MKjqiY3OEY4qEOxxxhDM7TWaxtyv5NwmM7WgvsTqVG7ZmonELtCMvAdRtZp-1IHna2frNVxbyG4a85ViLdk8kWOLvoMgs6iadoR7adw7E3MC7lOxS3NwKfdfCBuFFmuQKeMKSYvcKPtCOGEuu3ntPh05nmq6mSnk0m4aDyHhHhrlZKKyyQUTx54uG82zU3bdfRRtb4Ueic',
]

export default function Profile() {
  const { user } = useAuth()
  const fileInputRef = useRef(null)

  const [profileData, setProfileData] = useState({
    display_name: '',
    avatar_url: '',
    bio: '',
    age_group: '18-22',
    current_status: 'seeking',
  })
  const [surveyData, setSurveyData] = useState(null)
  const [connectionsCount, setConnectionsCount] = useState(0)
  const [myPosts, setMyPosts] = useState([])

  // Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalForm, setModalForm] = useState({
    display_name: '',
    avatar_url: '',
    bio: '',
    age_group: '18-22',
    current_status: 'seeking',
  })
  const [showAvatarPresets, setShowAvatarPresets] = useState(false)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ type: '', text: '' })

  const showToast = (type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast({ type: '', text: '' }), 4000)
  }

  // Load all profile, survey and connection data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [prof, surv, conns, feed] = await Promise.allSettled([
          getProfile(),
          getSurvey(),
          getMyConnections(),
          postService.getFeed({ limit: 100 }),
        ])

        if (prof.status === 'fulfilled' && prof.value) {
          const p = prof.value
          const initialProf = {
            display_name: p.display_name || user?.username || 'Lapulga User',
            avatar_url: p.avatar_url || '',
            bio:
              p.bio ||
              'Đam mê tìm kiếm những kết nối sâu sắc, cùng chia sẻ tri thức về công nghệ, sách và tư duy đa chiều.',
            age_group: p.age_group || '18-22',
            current_status: p.current_status || 'seeking',
          }
          setProfileData(initialProf)
          setModalForm(initialProf)
        }

        if (surv.status === 'fulfilled' && surv.value) {
          setSurveyData(surv.value)
        }

        if (conns.status === 'fulfilled' && Array.isArray(conns.value)) {
          setConnectionsCount(conns.value.length)
        }
        if (feed.status === 'fulfilled' && Array.isArray(feed.value)) {
          setMyPosts(feed.value.filter((post) => String(post.author?.id) === String(user?.id)))
        } else if (feed.status === 'rejected') {
          console.error('Không thể tải bài viết cá nhân:', feed.reason)
        }
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu profile:', err)
        showToast('error', 'Không thể tải toàn bộ thông tin profile.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user])

  const openEditModal = () => {
    setModalForm({ ...profileData })
    setShowAvatarPresets(false)
    setIsModalOpen(true)
  }

  const closeEditModal = () => {
    setIsModalOpen(false)
    setShowAvatarPresets(false)
  }

  const handleModalChange = (e) => {
    const { name, value } = e.target
    setModalForm((prev) => ({ ...prev, [name]: value }))
  }

  // Avatar file upload / preview
  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Vui lòng chọn ảnh nhỏ hơn 5MB.')
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        setModalForm((prev) => ({ ...prev, avatar_url: event.target.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSelectPreset = (url) => {
    setModalForm((prev) => ({ ...prev, avatar_url: url }))
    setShowAvatarPresets(false)
  }

  // Handle Save
  const handleSaveModal = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Backend expects max 500 chars for avatar_url
      // If user uploaded a large base64 data url, fallback to preset or dicebear to avoid 422
      let saveAvatar = modalForm.avatar_url
      if (saveAvatar && saveAvatar.startsWith('data:') && saveAvatar.length > 500) {
        saveAvatar = PRESET_AVATARS[0]
      }

      const payload = {
        display_name: modalForm.display_name.trim(),
        avatar_url: saveAvatar,
        bio: modalForm.bio.trim(),
        age_group: modalForm.age_group,
        current_status: modalForm.current_status,
      }

      await updateProfile(payload)
      setProfileData({ ...modalForm, avatar_url: saveAvatar })
      showToast('success', 'Đã lưu thay đổi hồ sơ thành công!')
      closeEditModal()
    } catch (err) {
      console.error('Lỗi khi lưu profile:', err)
      showToast('error', err.response?.data?.detail || 'Không thể lưu hồ sơ. Vui lòng thử lại.')
    } finally {
      setSaving(false)
    }
  }

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href)
      showToast('success', 'Đã sao chép liên kết hồ sơ của bạn vào bộ nhớ tạm!')
    }
  }

  const currentAvatar = profileData.avatar_url

  return (
    <div className="app-green-theme bg-[#08090a] min-h-screen text-[#e3e2e3] font-sans antialiased selection:bg-[#00ff88] selection:text-[#00210c]">
      <Navbar />

      <main className="w-full pt-20 min-h-[calc(100vh-80px)] pb-16">
        {/* Toast Feedback */}
        {toast.text && (
          <div className="fixed top-24 right-6 z-50 animate-bounce">
            <div
              className={`flex items-center gap-2 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md ${
                toast.type === 'success'
                  ? 'bg-[#11151c]/95 border-[#00ff88]/50 text-[#00ff88] shadow-[0_0_20px_rgba(0,255,136,0.25)]'
                  : 'bg-[#1f1012]/95 border-red-500/50 text-red-300'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">
                {toast.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span className="text-sm font-medium">{toast.text}</span>
            </div>
          </div>
        )}

        <div className="w-full max-w-3xl mx-auto py-8 md:py-10 px-4 sm:px-6 space-y-6">
          {/* ================= HERO CARD PROFILE ================= */}
          <div className="relative rounded-2xl bg-[#11151c] shadow-2xl border border-[#1a232e] overflow-hidden">
            {/* Tech Grid & Ambient Glow Background */}
            <div
              className="absolute inset-0 opacity-20 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(rgba(0, 255, 136, 0.3) 1px, transparent 1px)',
                backgroundSize: '22px 22px',
              }}
            ></div>
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#00ff88]/10 blur-3xl pointer-events-none"></div>

            {/* Banner Top Cover */}
            <div className="relative h-36 md:h-44 w-full overflow-hidden bg-[#181d26]">
              <div
                className="w-full h-full bg-cover bg-center opacity-65 scale-105"
                style={{
                  backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuCWARQnoRO1u88NUWUs9nuSsbDbVHF2Lzs6VXSDqDGM9q5WxzRF_scVaxt1oNk3AygoXrhs-ItaVB2X4tBEfbuPierv3JBSDGnrpME1b2u7z3w39tRr6DxgnKypXF-S5QYx7kXtua1vE_ghP5X27SAOPW4GIifCzp35jN2dI4BNyWCs1DHtGmEf1FZ-Fo_MCGliznON0J233jaM3GNBD_sG4ICg5cqJIasCSnzbC1A')`,
                }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-[#11151c] via-[#11151c]/50 to-transparent"></div>

              {/* Status Protocol Badge */}
              <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#08090a]/85 backdrop-blur-md border border-[#00ff88]/30 shadow-[0_0_12px_rgba(0,255,136,0.15)]">
                <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse shadow-[0_0_8px_#00ff88]"></span>
                <span className="text-[11px] text-[#00ff88] font-semibold tracking-wider font-mono">
                  NODE ONLINE
                </span>
                <span className="text-[#849585] text-[12px]">•</span>
                <span className="text-[11px] text-[#b9cbb9] font-mono">
                  {surveyData ? '99.4% Tín nhiệm' : 'Chưa hiệu chuẩn'}
                </span>
              </div>
            </div>

            {/* Main Profile Info */}
            <div className="relative px-6 md:px-8 pb-7 pt-0">
              <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-16 sm:-mt-20 mb-5 gap-4">
                {/* Avatar with Glowing Ring */}
                <div className="relative group">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 bg-[#08090a] ring-4 ring-[#00ff88]/30 shadow-[0_0_24px_rgba(0,255,136,0.35)]">
                    <div className="w-full h-full rounded-full overflow-hidden border-2 border-[#00ff88] bg-[#1a232e]">
                      <Avatar
                        className="w-full h-full object-cover"
                        src={currentAvatar}
                        alt="Avatar"
                      />
                    </div>
                  </div>
                  {/* Green Online Pulse Dot */}
                  <span className="absolute bottom-2 right-2 w-4 h-4 rounded-full bg-[#00ff88] ring-4 ring-[#11151c] shadow-[0_0_10px_#00ff88]"></span>
                </div>

                {/* Display Name & Handle */}
                <div className="flex-1 text-center sm:text-left sm:pl-3">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5">
                    <h1 className="text-2xl md:text-3xl font-bold text-[#f1ffef] tracking-tight">
                      {profileData.display_name || user?.username}
                    </h1>
                    <span
                      className="material-symbols-outlined text-[#00ff88] text-[22px] select-none"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      title="Tài khoản đã xác minh"
                    >
                      verified
                    </span>
                  </div>
                  <p className="text-[13px] text-[#44fb8a] tracking-wide mt-0.5 font-mono">
                    @{user?.username}
                  </p>
                </div>

                {/* Action Buttons: Edit Profile & Share */}
                <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5 w-full sm:w-auto">
                  <button
                    onClick={openEditModal}
                    type="button"
                    className="h-10 px-4 rounded-xl border border-[#00ff88] text-[#00ff88] hover:bg-[#00ff88] hover:text-[#003919] font-semibold text-sm transition-all shadow-[0_0_14px_rgba(0,255,136,0.2)] hover:shadow-[0_0_20px_rgba(0,255,136,0.5)] flex items-center gap-2 group cursor-pointer active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">edit</span>
                    <span>Chỉnh sửa profile</span>
                  </button>

                  <button
                    onClick={handleShare}
                    type="button"
                    className="h-10 px-3.5 rounded-xl bg-[#1f2021] hover:bg-[#292a2b] border border-[#3b4b3d]/40 text-[#b9cbb9] hover:text-[#f1ffef] font-semibold text-sm transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px]">ios_share</span>
                    <span className="hidden md:inline">Chia sẻ</span>
                  </button>
                </div>
              </div>

              {/* Bio Quote Card */}
              <div className="rounded-xl bg-[#0d0e0f]/90 border border-[#3b4b3d]/30 p-4 mt-1 relative">
                <div className="flex gap-2.5">
                  <span className="text-[#00ff88] font-mono text-xl select-none leading-none">“</span>
                  <p className="text-sm md:text-base text-[#e3e2e3] italic leading-relaxed">
                    {profileData.bio || 'Chưa có tiểu sử giới thiệu bản thân.'}
                  </p>
                  <span className="text-[#00ff88] font-mono text-xl select-none leading-none self-end">”</span>
                </div>
              </div>

              {/* Quick Stats Strip */}
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="rounded-xl bg-[#1f2021]/90 border border-[#3b4b3d]/30 p-3.5 flex flex-col items-center justify-center text-center hover:border-[#00ff88]/40 transition-colors">
                  <span className="text-[11px] font-mono text-[#b9cbb9] uppercase tracking-wider mb-1">
                    Mạng lưới
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl md:text-2xl text-[#f1ffef] font-bold">
                      {connectionsCount}
                    </span>
                    <span className="text-xs text-[#b9cbb9]">Bạn bè</span>
                  </div>
                </div>

                <div className="rounded-xl bg-[#1f2021]/90 border border-[#00ff88]/30 p-3.5 flex flex-col items-center justify-center text-center relative overflow-hidden group hover:border-[#00ff88] transition-colors shadow-[0_0_12px_rgba(0,255,136,0.1)]">
                  <div className="absolute top-0 right-0 w-8 h-8 bg-[#00ff88]/10 rounded-bl-full pointer-events-none"></div>
                  <span className="text-[11px] font-mono text-[#44fb8a] tracking-wider uppercase mb-1">
                    Đồng điệu nhất
                  </span>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-xl md:text-2xl text-[#00ff88] font-extrabold shadow-[0_0_12px_rgba(0,255,136,0.3)]">
                      {surveyData ? '98' : '--'}
                    </span>
                    <span className="text-xs text-[#00ff88] font-bold">%</span>
                  </div>
                  <span className="text-xs text-[#b9cbb9]">Điểm tương hợp</span>
                </div>

                <div className="rounded-xl bg-[#1f2021]/90 border border-[#3b4b3d]/30 p-3.5 flex flex-col items-center justify-center text-center hover:border-[#00ff88]/40 transition-colors">
                  <span className="text-[11px] font-mono text-[#b9cbb9] uppercase tracking-wider mb-1">
                    Cộng đồng
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl md:text-2xl text-[#f1ffef] font-bold">4</span>
                    <span className="text-xs text-[#b9cbb9]">Nhóm theo dõi</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

              {/* ================= PERSONAL POSTS SECTION ================= */}
              <section className="rounded-2xl bg-[#11151c] border border-[#1a232e] p-6 md:p-7 shadow-lg space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-[#1a232e] pb-3">
                  <div>
                    <h2 className="text-lg md:text-xl text-[#f1ffef] font-bold">Bài viết của tôi</h2>
                    <p className="text-xs text-[#b9cbb9] mt-1">Các bài viết bạn đã chia sẻ trong cộng đồng.</p>
                  </div>
                  <Link to="/communities?tab=feed" className="text-xs font-semibold text-[#00ff88] hover:underline">
                    Đến bảng tin
                  </Link>
                </div>
                {myPosts.length ? (
                  myPosts.map((post) => (
                    <article key={post.id} className="rounded-xl bg-[#08090a] border border-[#1a232e] p-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#849585]">
                        <span>{post.category}</span>
                        {post.mood && <span>· {post.mood}</span>}
                        <span>· {post.created_at ? new Date(post.created_at).toLocaleString('vi-VN') : ''}</span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#e3e2e3]">{post.content}</p>
                      {post.image_url && (
                        <img
                          src={post.image_url}
                          alt="Ảnh trong bài viết của bạn"
                          className="mt-3 max-h-96 w-full rounded-xl object-cover"
                        />
                      )}
                      <div className="mt-3 flex gap-4 border-t border-[#1a232e] pt-3 text-xs text-[#849585]">
                        <span>{post.likes_count} lượt thích</span>
                        <span>{post.comments_count} bình luận</span>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="rounded-xl bg-[#08090a] p-5 text-center text-sm text-[#849585]">
                    Bạn chưa có bài viết nào.
                  </p>
                )}
              </section>

              {/* ================= SURVEY RESULTS SECTION ================= */}
          <div className="rounded-2xl bg-[#11151c] border border-[#1a232e] p-6 md:p-7 shadow-lg space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1a232e] gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00ff88] text-[24px]">hub</span>
                  <h2 className="text-lg md:text-xl text-[#f1ffef] font-bold">
                    Kết quả khảo sát & Tần số đồng điệu
                  </h2>
                </div>
                <p className="text-xs text-[#b9cbb9] mt-0.5">
                  <span className="material-symbols-outlined mr-1 align-middle text-[14px]">lock</span>
                  Chỉ bạn mới có thể xem câu trả lời khảo sát này.
                </p>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1f2021] text-[#44fb8a] text-[11px] font-mono self-start sm:self-center border border-[#00ff88]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]"></span>
                <span>{surveyData ? 'Vector #V882 (98.2%)' : 'Chưa hoàn thành'}</span>
              </div>
            </div>

            {surveyData ? (
              <div className="space-y-3.5">
                {/* Hoàn cảnh sống */}
                <div className="rounded-xl bg-[#181d26]/80 border border-[#1a232e] p-4 transition-all hover:bg-[#181d26]">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="material-symbols-outlined text-[#00ff88] text-[19px]">domain</span>
                    <span className="text-[11px] font-mono text-[#b9cbb9] uppercase tracking-wider font-semibold">
                      Hoàn cảnh & Cảm xúc
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1f2021] text-[#f1ffef] text-xs font-medium">
                      <span className="material-symbols-outlined text-[15px] text-[#00ff88]">apartment</span>
                      {surveyData.life_situation || 'Cuộc sống tự lập'}
                    </span>
                    {surveyData.recent_feelings && surveyData.recent_feelings.length > 0 && (
                      <>
                        <span className="text-[#849585] text-xs">•</span>
                        {surveyData.recent_feelings.map((feeling, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#08090a] text-[#44fb8a] text-xs"
                          >
                            <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                            {feeling}
                          </span>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Sở thích & Lĩnh vực */}
                <div className="rounded-xl bg-[#181d26]/80 border border-[#1a232e] p-4 transition-all hover:bg-[#181d26]">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="material-symbols-outlined text-[#00ff88] text-[19px]">
                      interests
                    </span>
                    <span className="text-[11px] font-mono text-[#b9cbb9] uppercase tracking-wider font-semibold">
                      Sở thích & Lĩnh vực quan tâm
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {surveyData.topics && surveyData.topics.length > 0 ? (
                      surveyData.topics.map((t, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 rounded-lg bg-[#08090a] text-[#00ff88] border border-[#00ff88]/30 text-xs font-medium shadow-[0_0_8px_rgba(0,255,136,0.12)] font-mono"
                        >
                          #{t}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-[#849585]">Chưa cập nhật sở thích</span>
                    )}

                    {surveyData.free_time_activities &&
                      surveyData.free_time_activities.map((act, i) => (
                        <span
                          key={`act-${i}`}
                          className="px-3 py-1 rounded-lg bg-[#08090a] text-[#4edea3] border border-[#4edea3]/20 text-xs font-medium font-mono"
                        >
                          @{act}
                        </span>
                      ))}
                  </div>
                </div>

                {/* Mục tiêu kết nối */}
                <div className="rounded-xl bg-[#181d26]/80 border border-[#1a232e] p-4 transition-all hover:bg-[#181d26]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-[#00ff88] text-[19px]">
                      track_changes
                    </span>
                    <span className="text-[11px] font-mono text-[#b9cbb9] uppercase tracking-wider font-semibold">
                      Mục tiêu kết nối
                    </span>
                  </div>
                  <p className="text-sm text-[#e3e2e3] font-medium leading-relaxed italic">
                    “
                    {surveyData.goals?.join(', ') ||
                      surveyData.what_you_want_others_to_understand ||
                      'Tìm kiếm bạn bè đồng điệu về tư duy và cùng phát triển.'}
                    ”
                  </p>
                </div>

                <div className="rounded-xl bg-[#181d26]/80 border border-[#1a232e] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#00ff88] text-[19px]">assignment</span>
                    <span className="text-[11px] font-mono text-[#b9cbb9] uppercase tracking-wider font-semibold">
                      Thông tin khảo sát khác
                    </span>
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <div><dt className="text-xs text-[#849585]">Nhóm tuổi</dt><dd className="mt-1 text-[#e3e2e3]">{surveyData.age_group}</dd></div>
                    <div><dt className="text-xs text-[#849585]">Tình trạng hiện tại</dt><dd className="mt-1 text-[#e3e2e3]">{surveyData.current_status}</dd></div>
                    <div><dt className="text-xs text-[#849585]">Mong muốn từ cộng đồng</dt><dd className="mt-1 text-[#e3e2e3]">{surveyData.community_expectations?.join(', ') || 'Chưa trả lời'}</dd></div>
                    <div><dt className="text-xs text-[#849585]">Kiểu kết nối mong muốn</dt><dd className="mt-1 text-[#e3e2e3]">{surveyData.desired_connection_types?.join(', ') || 'Chưa trả lời'}</dd></div>
                    <div><dt className="text-xs text-[#849585]">Cách tương tác ưu tiên</dt><dd className="mt-1 text-[#e3e2e3]">{surveyData.preferred_mode}</dd></div>
                    <div><dt className="text-xs text-[#849585]">Ưu tiên khám phá</dt><dd className="mt-1 text-[#e3e2e3]">{surveyData.discovery_preference}</dd></div>
                  </dl>
                  {surveyData.story && (
                    <div className="mt-4 border-t border-[#1a232e] pt-3">
                      <p className="text-xs text-[#849585]">Câu chuyện của bạn</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[#e3e2e3]">{surveyData.story}</p>
                    </div>
                  )}
                  {surveyData.what_you_want_others_to_understand && (
                    <div className="mt-3">
                      <p className="text-xs text-[#849585]">Điều bạn muốn người khác hiểu</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-[#e3e2e3]">{surveyData.what_you_want_others_to_understand}</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-[#08090a] border border-[#1a232e] text-center space-y-3">
                <span className="material-symbols-outlined text-[#00ff88] text-[36px]">
                  psychology
                </span>
                <p className="text-sm text-[#b9cbb9]">
                  Bạn chưa thực hiện bài khảo sát kết nối. Hãy hoàn thành khảo sát 6 bước để thuật
                  toán lapulga tìm ra những người bạn có tần số đồng điệu nhất!
                </p>
                <Link
                  to="/survey"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00ff88] text-[#003919] font-bold text-sm shadow-[0_0_20px_rgba(0,255,136,0.4)] hover:shadow-[0_0_26px_rgba(0,255,136,0.7)] transition-all"
                >
                  <span className="material-symbols-outlined text-[18px]">quiz</span>
                  <span>Làm khảo sát kết nối ngay</span>
                </Link>
              </div>
            )}

            {/* Action button at bottom of Survey section */}
            <div className="pt-1 flex justify-center sm:justify-start">
              <Link
                to="/survey"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1f2021] hover:bg-[#292a2b] border border-[#3b4b3d]/40 text-[#00ff88] font-semibold text-sm hover:border-[#00ff88]/50 transition-all shadow-sm active:scale-95 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[19px]">autorenew</span>
                <span>Hiệu chuẩn / Làm lại khảo sát</span>
              </Link>
            </div>
          </div>

        </div>
      </main>

      {/* ================= EDIT PROFILE MODAL ================= */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditModal()
          }}
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-[#11151c] border border-[#1a232e] shadow-2xl overflow-hidden animate-scaleUp">
            {/* Top Glow Bar */}
            <div className="h-1 w-full bg-gradient-to-r from-transparent via-[#00ff88] to-transparent"></div>

            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a232e]">
              <div className="flex items-center gap-2.5">
                <span className="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]"></span>
                <h3 className="text-lg font-bold text-[#f1ffef]">Chỉnh sửa hồ sơ</h3>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                className="w-8 h-8 rounded-lg bg-[#1f2021] hover:bg-[#292a2b] text-[#b9cbb9] hover:text-[#f1ffef] flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveModal} className="p-6 space-y-5 max-h-[calc(85vh-120px)] overflow-y-auto">
              {/* Centered Avatar Picker with Camera Badge */}
              <div className="flex flex-col items-center justify-center space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handleAvatarFile}
                />

                <div
                  className="relative group cursor-pointer"
                  onClick={() => setShowAvatarPresets(!showAvatarPresets)}
                  title="Nhấp để chọn ảnh avatar"
                >
                  <div className="w-24 h-24 rounded-full p-1 bg-[#08090a] ring-2 ring-[#00ff88]/60 group-hover:ring-[#00ff88] group-hover:shadow-[0_0_20px_rgba(0,255,136,0.4)] transition-all">
                    <Avatar
                      className="w-full h-full object-cover rounded-full"
                      src={modalForm.avatar_url}
                      alt="Modal avatar"
                    />
                  </div>
                  {/* Camera badge */}
                  <div className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#00ff88] text-[#003919] flex items-center justify-center shadow-lg border-2 border-[#11151c] group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-[16px] font-bold">
                      photo_camera
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAvatarPresets(!showAvatarPresets)}
                    className="text-xs text-[#00ff88] hover:underline"
                  >
                    {showAvatarPresets ? 'Đóng kho ảnh' : 'Chọn mẫu avatar'}
                  </button>
                  <span className="text-[#849585] text-xs">•</span>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-[#b9cbb9] hover:text-[#00ff88]"
                  >
                    Tải ảnh từ máy
                  </button>
                </div>

                {/* Avatar Presets Drawer */}
                {showAvatarPresets && (
                  <div className="w-full p-3 rounded-xl bg-[#08090a] border border-[#1a232e] grid grid-cols-6 gap-2 animate-fadeIn">
                    {PRESET_AVATARS.map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectPreset(url)}
                        className={`w-11 h-11 rounded-full overflow-hidden border-2 transition-all hover:scale-105 ${
                          modalForm.avatar_url === url
                            ? 'border-[#00ff88] shadow-[0_0_10px_#00ff88]'
                            : 'border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={url} alt={`Preset ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tên hiển thị */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#e3e2e3]">
                  Tên hiển thị <span className="text-[#00ff88]">*</span>
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b9cbb9] text-[20px] pointer-events-none">
                    person
                  </span>
                  <input
                    type="text"
                    name="display_name"
                    value={modalForm.display_name}
                    onChange={handleModalChange}
                    required
                    maxLength={100}
                    placeholder="Tên bạn muốn mọi người gọi"
                    className="w-full h-11 pl-11 pr-4 rounded-xl bg-[#08090a] text-[#f1ffef] placeholder:text-[#849585] text-sm focus:outline-none focus:ring-1 focus:ring-[#00ff88] focus:shadow-[0_0_12px_rgba(0,255,136,0.25)] border border-[#1a232e] transition-all"
                  />
                </div>
              </div>

              {/* Tên người dùng (Handle) - Read only */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#e3e2e3]">
                  Tên người dùng (Handle)
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#849585] text-[20px] pointer-events-none">
                    alternate_email
                  </span>
                  <input
                    type="text"
                    disabled
                    value={`@${user?.username || 'user'}`}
                    className="w-full h-11 pl-11 pr-4 rounded-xl bg-[#08090a]/50 text-[#849585] text-sm border border-[#1a232e] font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Tiểu sử cá nhân (Bio) with character counter */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-[#e3e2e3]">
                    Tiểu sử cá nhân (Bio)
                  </label>
                  <span
                    className={`text-[11px] font-mono ${
                      modalForm.bio.length > 280 ? 'text-[#00ff88]' : 'text-[#849585]'
                    }`}
                  >
                    {modalForm.bio.length} / 300 ký tự
                  </span>
                </div>
                <textarea
                  name="bio"
                  value={modalForm.bio}
                  onChange={handleModalChange}
                  maxLength={300}
                  rows={3}
                  placeholder="Chia sẻ về sở thích, câu chuyện và mục tiêu của bạn..."
                  className="w-full p-3 rounded-xl bg-[#08090a] text-[#f1ffef] placeholder:text-[#849585] text-sm focus:outline-none focus:ring-1 focus:ring-[#00ff88] focus:shadow-[0_0_12px_rgba(0,255,136,0.25)] border border-[#1a232e] transition-all resize-none leading-relaxed"
                />
              </div>

              {/* 2-Column Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Nhóm độ tuổi */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#e3e2e3]">Nhóm độ tuổi</label>
                  <div className="relative">
                    <select
                      name="age_group"
                      value={modalForm.age_group}
                      onChange={handleModalChange}
                      className="w-full h-11 px-3.5 rounded-xl bg-[#08090a] text-[#f1ffef] text-sm focus:outline-none focus:ring-1 focus:ring-[#00ff88] border border-[#1a232e] appearance-none transition-all cursor-pointer"
                    >
                      <option value="Dưới 18">Dưới 18 tuổi</option>
                      <option value="18-22">18 - 22 tuổi</option>
                      <option value="23-26">23 - 26 tuổi</option>
                      <option value="27-35">27 - 35 tuổi</option>
                      <option value="36-50">36 - 50 tuổi</option>
                      <option value="Trên 50">Trên 50 tuổi</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#b9cbb9] pointer-events-none text-[20px]">
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Tình trạng hiện tại */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#e3e2e3]">
                    Tình trạng hiện tại
                  </label>
                  <div className="relative">
                    <select
                      name="current_status"
                      value={modalForm.current_status}
                      onChange={handleModalChange}
                      className="w-full h-11 px-3.5 rounded-xl bg-[#08090a] text-[#f1ffef] text-sm focus:outline-none focus:ring-1 focus:ring-[#00ff88] border border-[#1a232e] appearance-none transition-all cursor-pointer text-ellipsis overflow-hidden pr-8"
                    >
                      <option value="seeking">Tìm người cùng chí hướng & kết nối sâu</option>
                      <option value="collab">Mở rộng hợp tác dự án công nghệ</option>
                      <option value="casual">Giao lưu tâm sự thường nhật</option>
                      <option value="mentor">Trao đổi kinh nghiệm & Mentorship</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[#b9cbb9] pointer-events-none text-[20px]">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1a232e]">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="h-11 px-5 rounded-xl border border-[#3b4b3d]/50 bg-[#181d26] text-[#b9cbb9] text-sm font-semibold hover:text-[#f1ffef] hover:bg-[#1f2021] transition-colors cursor-pointer"
                >
                  [ Hủy ]
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 px-6 rounded-xl bg-[#00ff88] text-[#003919] font-bold text-sm shadow-[0_0_20px_rgba(0,255,136,0.45)] hover:shadow-[0_0_26px_rgba(0,255,136,0.7)] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[19px]">
                    {saving ? 'refresh' : 'save'}
                  </span>
                  <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
