import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProfile, updateProfile } from '../services/profileService'
import { getSurvey } from '../services/surveyService'
import Navbar from '../components/Navbar'

// Danh sách các avatar phong cách Kindred sẵn có để người dùng chọn nhanh không cần gõ URL
const PRESET_AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=KindredSoul&backgroundColor=b6e3f4,c0aede,d1d4f9',
  'https://api.dicebear.com/7.x/bottts/svg?seed=AuraViolet&backgroundColor=c0aede,ffd5dc,ffdfbf',
  'https://api.dicebear.com/7.x/bottts/svg?seed=SereneRiver&backgroundColor=b6e3f4,ffd5dc',
  'https://api.dicebear.com/7.x/bottts/svg?seed=ZenGarden&backgroundColor=d1d4f9,c0aede',
  'https://api.dicebear.com/7.x/bottts/svg?seed=CosmicWanderer&backgroundColor=ffd5dc,d1d4f9',
  'https://api.dicebear.com/7.x/bottts/svg?seed=GentleStar&backgroundColor=c0aede,b6e3f4',
  'https://api.dicebear.com/7.x/bottts/svg?seed=WarmSun&backgroundColor=ffdfbf,ffd5dc',
  'https://api.dicebear.com/7.x/bottts/svg?seed=QuietThinker&backgroundColor=d1d4f9,b6e3f4',
]

export default function Profile() {
  const { user } = useAuth()
  const [profileData, setProfileData] = useState({
    display_name: '',
    avatar_url: '',
    bio: '',
    age_group: '',
    current_status: '',
  })
  const [surveyData, setSurveyData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Trạng thái modal Chỉnh sửa Profile
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    display_name: '',
    avatar_url: '',
    bio: '',
    age_group: '',
    current_status: '',
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState({ type: '', text: '' })

  const fileInputRef = useRef(null)

  const showToast = (type, text) => {
    setToast({ type, text })
    setTimeout(() => setToast({ type: '', text: '' }), 4000)
  }

  // Tải dữ liệu Profile và Survey
  const loadData = async () => {
    try {
      setLoading(true)
      const [pData, sData] = await Promise.allSettled([
        getProfile(),
        getSurvey(),
      ])

      if (pData.status === 'fulfilled' && pData.value) {
        const val = pData.value
        const normalized = {
          display_name: val.display_name || '',
          avatar_url: val.avatar_url || '',
          bio: val.bio || '',
          age_group: val.age_group || '',
          current_status: val.current_status || '',
        }
        setProfileData(normalized)
        setEditForm(normalized)
      }

      if (sData.status === 'fulfilled' && sData.value) {
        setSurveyData(sData.value)
      }
    } catch (err) {
      console.error('Lỗi khi tải hồ sơ:', err)
      showToast('error', 'Không thể tải thông tin hồ sơ. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Mở modal chỉnh sửa
  const handleOpenEdit = () => {
    setEditForm({ ...profileData })
    setIsEditModalOpen(true)
  }

  // Đóng modal chỉnh sửa
  const handleCloseEdit = () => {
    if (!saving) {
      setIsEditModalOpen(false)
    }
  }

  // Thay đổi input thông thường
  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  // Chọn avatar từ preset
  const handleSelectPresetAvatar = (url) => {
    setEditForm((prev) => ({ ...prev, avatar_url: url }))
  }

  // Tải ảnh từ thiết bị lên (chuyển sang Data URL an toàn không cần server storage bên thứ 3)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Kích thước ảnh đại diện tối đa là 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (uploadEvent) => {
      setEditForm((prev) => ({
        ...prev,
        avatar_url: uploadEvent.target.result,
      }))
    }
    reader.readAsDataURL(file)
  }

  // Submit cập nhật hồ sơ
  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      await updateProfile(editForm)
      setProfileData({ ...editForm })
      setIsEditModalOpen(false)
      showToast('success', 'Hồ sơ của bạn đã được cập nhật thành công! ✨')
    } catch (err) {
      console.error('Lỗi lưu profile:', err)
      showToast(
        'error',
        err.response?.data?.detail || 'Không thể lưu hồ sơ. Vui lòng thử lại.'
      )
    } finally {
      setSaving(false)
    }
  }

  const defaultAvatar = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
    user?.username || 'kindred'
  )}&backgroundColor=c0aede,ffd5dc`

  const avatarDisplay = profileData.avatar_url || defaultAvatar

  return (
    <div className="min-h-screen bg-kindred-bg">
      <Navbar />

      {/* Toast feedback */}
      {toast.text && (
        <div className="fixed top-20 right-6 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-lg border flex items-center gap-3 text-sm font-medium ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <span className="material-symbols-outlined text-lg">
              {toast.type === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{toast.text}</span>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="space-y-6">
            <div className="h-64 bg-white rounded-3xl animate-pulse border border-kindred-border" />
            <div className="h-48 bg-white rounded-3xl animate-pulse border border-kindred-border" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* HERO PROFILE CARD */}
            <div className="bg-white rounded-3xl border border-kindred-border shadow-soft overflow-hidden">
              {/* Header Cover Banner */}
              <div className="h-44 sm:h-52 bg-gradient-to-r from-kindred-lavender via-purple-100 to-indigo-100 relative p-6">
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#7C5CBF_1px,transparent_1px)] [background-size:16px_16px]" />
                <div className="relative z-10 flex justify-end">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-white/80 backdrop-blur-sm text-kindred-purple shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Thành viên Kindred
                  </span>
                </div>
              </div>

              {/* Profile Details Container */}
              <div className="px-6 sm:px-8 pb-8 pt-0 relative">
                <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-16 sm:-mt-20 mb-6">
                  {/* Avatar with status ring */}
                  <div className="relative group">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 bg-white shadow-md border-2 border-white overflow-hidden">
                      <img
                        src={avatarDisplay}
                        alt="Avatar"
                        className="w-full h-full object-cover rounded-2xl bg-kindred-lavender"
                        onError={(e) => {
                          e.target.src = defaultAvatar
                        }}
                      />
                    </div>
                    <span
                      className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-xs"
                      title="Đang hoạt động"
                    />
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleOpenEdit}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-sm bg-kindred-purple text-white hover:bg-kindred-hover shadow-sm transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                      Chỉnh sửa profile
                    </button>

                    <Link
                      to="/survey"
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-sm bg-kindred-lavender text-kindred-purple hover:bg-purple-100 transition-all border border-purple-200"
                    >
                      <span className="material-symbols-outlined text-lg">psychology</span>
                      {surveyData ? 'Hiệu chuẩn khảo sát' : 'Làm khảo sát'}
                    </Link>
                  </div>
                </div>

                {/* Name & Handle */}
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-kindred-text tracking-tight">
                      {profileData.display_name || user?.username}
                    </h1>
                    <span className="material-symbols-outlined text-kindred-purple text-xl" title="Đã xác thực">
                      verified
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-kindred-muted">
                    <span className="font-medium text-kindred-purple">@{user?.username}</span>
                    <span>•</span>
                    <span>{user?.email}</span>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-4">
                  {profileData.age_group ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-kindred-cardSecondary text-kindred-text border border-kindred-border">
                      <span className="material-symbols-outlined text-sm text-kindred-purple">cake</span>
                      {profileData.age_group} tuổi
                    </span>
                  ) : null}

                  {profileData.current_status ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-kindred-cardSecondary text-kindred-text border border-kindred-border">
                      <span className="material-symbols-outlined text-sm text-kindred-purple">work</span>
                      {profileData.current_status}
                    </span>
                  ) : null}

                  {user?.role === 'admin' && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      👑 Quản trị viên
                    </span>
                  )}
                </div>

                {/* Bio Section */}
                <div className="mt-5 p-4 sm:p-5 rounded-2xl bg-kindred-cardSecondary/60 border border-kindred-border/70">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-kindred-purple text-xl mt-0.5 shrink-0">
                      format_quote
                    </span>
                    <p className="text-sm sm:text-base text-kindred-text leading-relaxed italic">
                      {profileData.bio ? (
                        profileData.bio
                      ) : (
                        <span className="text-kindred-muted not-italic">
                          Chưa có tiểu sử cá nhân. Bấm <strong>Chỉnh sửa profile</strong> để chia sẻ đôi nét về bạn với mọi người!
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* SURVEY & PERSONALITY PROFILE CARD */}
            <div className="bg-white rounded-3xl border border-kindred-border shadow-soft p-6 sm:p-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-kindred-lavender flex items-center justify-center text-kindred-purple">
                    <span className="material-symbols-outlined text-2xl">interests</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-kindred-text">
                      Hồ sơ Đồng điệu & Câu chuyện
                    </h2>
                    <p className="text-xs text-kindred-muted">
                      Được đồng bộ từ Khảo sát kết nối để tìm những người hiểu bạn
                    </p>
                  </div>
                </div>

                <Link
                  to="/survey"
                  className="text-xs font-bold text-kindred-purple hover:underline inline-flex items-center gap-1"
                >
                  Chỉnh sửa khảo sát
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>

              {surveyData ? (
                <div className="space-y-5">
                  {/* Hoàn cảnh & Cảm xúc */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-2xl bg-kindred-cardSecondary border border-kindred-border">
                      <div className="text-xs font-semibold text-kindred-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-kindred-purple">compass_calibration</span>
                        Hoàn cảnh hiện tại
                      </div>
                      <p className="text-sm font-semibold text-kindred-text">
                        {surveyData.life_situation || 'Chưa cập nhật'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-kindred-cardSecondary border border-kindred-border">
                      <div className="text-xs font-semibold text-kindred-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-kindred-purple">sentiment_satisfied</span>
                        Cảm xúc gần đây
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.isArray(surveyData.recent_feelings) && surveyData.recent_feelings.length > 0 ? (
                          surveyData.recent_feelings.map((f, i) => (
                            <span
                              key={i}
                              className="px-2.5 py-1 rounded-xl text-xs font-medium bg-white text-kindred-text border border-kindred-border shadow-xs"
                            >
                              {f}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-kindred-muted">Chưa chọn</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Chủ đề quan tâm */}
                  <div>
                    <div className="text-xs font-semibold text-kindred-muted uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-kindred-purple">category</span>
                      Chủ đề & Lĩnh vực yêu thích
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(surveyData.topics) && surveyData.topics.length > 0 ? (
                        surveyData.topics.map((topic, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 rounded-2xl text-xs font-semibold bg-kindred-lavender text-kindred-purple border border-purple-200"
                          >
                            #{topic}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-kindred-muted">Chưa chọn chủ đề</span>
                      )}
                    </div>
                  </div>

                  {/* Mục tiêu kết nối */}
                  <div>
                    <div className="text-xs font-semibold text-kindred-muted uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-kindred-purple">diversity_1</span>
                      Mục tiêu & Kỳ vọng kết nối
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(surveyData.goals) && surveyData.goals.length > 0 ? (
                        surveyData.goals.map((goal, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200"
                          >
                            ✓ {goal}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-kindred-muted">Chưa chọn mục tiêu</span>
                      )}
                    </div>
                  </div>

                  {/* Câu chuyện cá nhân */}
                  {surveyData.story && (
                    <div className="p-4 sm:p-5 rounded-2xl bg-purple-50/50 border border-purple-100">
                      <div className="text-xs font-bold text-kindred-purple uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm">auto_stories</span>
                        Câu chuyện bạn muốn chia sẻ
                      </div>
                      <p className="text-sm text-kindred-text leading-relaxed whitespace-pre-wrap">
                        {surveyData.story}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 px-4 rounded-2xl border-2 border-dashed border-kindred-border bg-kindred-cardSecondary/30">
                  <div className="w-12 h-12 rounded-full bg-kindred-lavender text-kindred-purple flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-2xl">quiz</span>
                  </div>
                  <h3 className="text-sm font-bold text-kindred-text mb-1">
                    Bạn chưa hoàn thành Khảo sát kết nối
                  </h3>
                  <p className="text-xs text-kindred-muted max-w-sm mx-auto mb-4">
                    Chỉ mất 2 phút để thuật toán Kindred hiểu bạn và đề xuất những người có cùng hoàn cảnh và tần số cảm xúc.
                  </p>
                  <Link
                    to="/survey"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold bg-kindred-purple text-white hover:bg-kindred-hover shadow-sm transition-all"
                  >
                    Bắt đầu khảo sát ngay
                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ============================================================ */}
      {/* MODAL CHỈNH SỬA PROFILE (KHÔNG CÓ INPUT URL THÔ KỆCH)       */}
      {/* ============================================================ */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-kindred-border shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-scaleUp">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-kindred-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-kindred-text">
                  Chỉnh sửa hồ sơ cá nhân
                </h3>
                <p className="text-xs text-kindred-muted">
                  Thông tin này sẽ hiển thị với bạn bè trên cộng đồng Kindred
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseEdit}
                disabled={saving}
                className="w-8 h-8 rounded-full flex items-center justify-center text-kindred-muted hover:bg-kindred-cardSecondary transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* PHẦN 1: ĐỔI ẢNH ĐẠI DIỆN TRỰC TIẾP (KHÔNG DÙNG INPUT URL) */}
              <div>
                <label className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-2">
                  Ảnh đại diện
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-kindred-cardSecondary/60 border border-kindred-border">
                  {/* Current Preview */}
                  <div className="relative group shrink-0">
                    <img
                      src={editForm.avatar_url || defaultAvatar}
                      alt="Avatar preview"
                      className="w-20 h-20 rounded-2xl object-cover border-2 border-kindred-purple bg-white shadow-xs"
                      onError={(e) => {
                        e.target.src = defaultAvatar
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                      title="Tải ảnh mới"
                    >
                      <span className="material-symbols-outlined text-xl">photo_camera</span>
                    </button>
                  </div>

                  {/* Actions for Avatar */}
                  <div className="flex-1 text-center sm:text-left space-y-2">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white text-kindred-purple border border-purple-200 hover:bg-purple-50 transition-colors shadow-xs inline-flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">upload</span>
                        Tải ảnh từ máy
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const seed = 'Kindred' + Math.floor(Math.random() * 9999)
                          setEditForm((prev) => ({
                            ...prev,
                            avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}&backgroundColor=c0aede,ffd5dc`,
                          }))
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white text-kindred-text border border-kindred-border hover:bg-gray-50 transition-colors shadow-xs inline-flex items-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">shuffle</span>
                        Tạo ngẫu nhiên
                      </button>
                    </div>

                    <p className="text-[11px] text-kindred-muted">
                      Hỗ trợ JPG, PNG tối đa 2MB. Hoặc chọn nhanh từ bộ sưu tập bên dưới.
                    </p>
                  </div>

                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>

                {/* Preset Avatars Gallery */}
                <div className="mt-3">
                  <span className="text-[11px] font-semibold text-kindred-muted block mb-2">
                    Hoặc chọn linh vật Kindred:
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {PRESET_AVATARS.map((pUrl, idx) => {
                      const isSelected = editForm.avatar_url === pUrl
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectPresetAvatar(pUrl)}
                          className={`w-11 h-11 rounded-xl p-0.5 border-2 transition-all overflow-hidden ${
                            isSelected
                              ? 'border-kindred-purple scale-105 shadow-md bg-kindred-lavender'
                              : 'border-transparent hover:border-purple-200 bg-gray-50'
                          }`}
                        >
                          <img
                            src={pUrl}
                            alt={`Preset ${idx}`}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* PHẦN 2: TÊN HIỂN THỊ */}
              <div>
                <label
                  htmlFor="display_name"
                  className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-1.5"
                >
                  Tên hiển thị <span className="text-rose-500">*</span>
                </label>
                <input
                  id="display_name"
                  name="display_name"
                  type="text"
                  required
                  value={editForm.display_name}
                  onChange={handleEditChange}
                  maxLength={100}
                  placeholder="Ví dụ: Minh Quân, Hà My..."
                  className="w-full px-4 py-2.5 rounded-2xl border border-kindred-border bg-white text-kindred-text text-sm focus:outline-none focus:border-kindred-purple focus:ring-2 focus:ring-kindred-purple/20 transition-all"
                />
                <span className="text-[11px] text-kindred-muted mt-1 block">
                  Tên sẽ được nhìn thấy trên trang Khám phá và phòng chat.
                </span>
              </div>

              {/* PHẦN 3: TIỂU SỬ BIO */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="bio"
                    className="block text-xs font-bold text-kindred-muted uppercase tracking-wider"
                  >
                    Tiểu sử cá nhân (Bio)
                  </label>
                  <span className="text-xs text-kindred-muted">
                    {editForm.bio.length}/300 ký tự
                  </span>
                </div>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  value={editForm.bio}
                  onChange={handleEditChange}
                  maxLength={300}
                  placeholder="Chia sẻ về sở thích, châm ngôn sống, hoặc điều bạn đang quan tâm..."
                  className="w-full px-4 py-2.5 rounded-2xl border border-kindred-border bg-white text-kindred-text text-sm focus:outline-none focus:border-kindred-purple focus:ring-2 focus:ring-kindred-purple/20 transition-all resize-none"
                />
              </div>

              {/* PHẦN 4: NHÓM TUỔI & TÌNH TRẠNG */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="age_group"
                    className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-1.5"
                  >
                    Nhóm độ tuổi
                  </label>
                  <select
                    id="age_group"
                    name="age_group"
                    value={editForm.age_group}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2.5 rounded-2xl border border-kindred-border bg-white text-kindred-text text-sm focus:outline-none focus:border-kindred-purple focus:ring-2 focus:ring-kindred-purple/20 transition-all"
                  >
                    <option value="">-- Chọn nhóm tuổi --</option>
                    <option value="Under 18">Dưới 18 tuổi</option>
                    <option value="18–20">18 – 20 tuổi</option>
                    <option value="21–24">21 – 24 tuổi</option>
                    <option value="25–29">25 – 29 tuổi</option>
                    <option value="30–39">30 – 39 tuổi</option>
                    <option value="40–49">40 – 49 tuổi</option>
                    <option value="50+">Trên 50 tuổi</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="current_status"
                    className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-1.5"
                  >
                    Tình trạng hiện tại
                  </label>
                  <select
                    id="current_status"
                    name="current_status"
                    value={editForm.current_status}
                    onChange={handleEditChange}
                    className="w-full px-4 py-2.5 rounded-2xl border border-kindred-border bg-white text-kindred-text text-sm focus:outline-none focus:border-kindred-purple focus:ring-2 focus:ring-kindred-purple/20 transition-all"
                  >
                    <option value="">-- Chọn tình trạng --</option>
                    <option value="Sinh viên">Sinh viên</option>
                    <option value="Đang đi làm">Đang đi làm</option>
                    <option value="Freelancer">Freelancer</option>
                    <option value="Đang tìm việc / Gap year">Đang tìm việc / Gap year</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-kindred-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-2xl text-sm font-semibold text-kindred-text hover:bg-kindred-cardSecondary transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-2xl text-sm font-bold bg-kindred-purple text-white hover:bg-kindred-hover shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    'Lưu thay đổi'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
