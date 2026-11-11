import { useRef, useState } from 'react'
import brandMark from '../assets/lapulga-mark.svg'

const PRESET_COMMUNITY_AVATARS = [
  {
    label: 'Công nghệ & AI',
    url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&h=300&fit=crop&q=80',
    icon: '💻',
  },
  {
    label: 'Lập trình & Code',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=300&h=300&fit=crop&q=80',
    icon: '🚀',
  },
  {
    label: 'Sách & Tư duy',
    url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=300&h=300&fit=crop&q=80',
    icon: '📚',
  },
  {
    label: 'Hội họa & Sáng tạo',
    url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&h=300&fit=crop&q=80',
    icon: '🎨',
  },
  {
    label: 'Chạy bộ & Thể thao',
    url: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=300&h=300&fit=crop&q=80',
    icon: '🏃',
  },
  {
    label: 'Cà phê & Co-working',
    url: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=300&h=300&fit=crop&q=80',
    icon: '☕',
  },
  {
    label: 'Game & Esports',
    url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=300&h=300&fit=crop&q=80',
    icon: '🎮',
  },
  {
    label: 'Âm nhạc & Sound',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop&q=80',
    icon: '🎵',
  },
  {
    label: 'Thiên nhiên & Chữa lành',
    url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=300&h=300&fit=crop&q=80',
    icon: '🌿',
  },
  {
    label: 'Khởi nghiệp & Startup',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&h=300&fit=crop&q=80',
    icon: '💼',
  },
]

const PRESET_CATEGORIES = [
  'Công nghệ & Lập trình',
  'Sách & Tư duy',
  'Nghệ thuật & Sáng tạo',
  'Thể thao & Sức khỏe',
  'Freelance & Khởi nghiệp',
  'Game & Esports',
  'Học tập & Sự nghiệp',
  'Đời sống & Sở thích',
  'Khác (Tự điền chủ đề mới...)',
]

export default function CreateCommunityModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(PRESET_CATEGORIES[0])
  const [customCategory, setCustomCategory] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(PRESET_COMMUNITY_AVATARS[0].url)
  const [icon, setIcon] = useState(PRESET_COMMUNITY_AVATARS[0].icon)
  const [tags, setTags] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [customUrl, setCustomUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const fileInputRef = useRef(null)

  if (!isOpen) return null

  // Xử lý tải ảnh từ máy tính (nén nhẹ để mượt)
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, WEBP).')
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // Nén ảnh bằng Canvas xuống max 400x400 để lưu mượt mà
        const canvas = document.createElement('canvas')
        const maxDim = 400
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85)
        setAvatarUrl(compressedDataUrl)
        setIcon('👥')
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)
  }

  const handleApplyCustomUrl = () => {
    if (customUrl.trim()) {
      setAvatarUrl(customUrl.trim())
      setIcon('👥')
      setShowUrlInput(false)
      setCustomUrl('')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Vui lòng nhập tên cộng đồng')
      return
    }
    if (name.trim().length < 2) {
      setError('Tên cộng đồng tối thiểu 2 ký tự')
      return
    }
    if (!description.trim()) {
      setError('Vui lòng nhập mô tả cho cộng đồng')
      return
    }
    if (description.trim().length < 5) {
      setError('Mô tả tối thiểu 5 ký tự')
      return
    }

    let finalCategory = category
    if (category === 'Khác (Tự điền chủ đề mới...)') {
      if (!customCategory.trim()) {
        setError('Vui lòng tự nhập tên chủ đề mới')
        return
      }
      if (customCategory.trim().length < 2) {
        setError('Tên chủ đề tối thiểu 2 ký tự')
        return
      }
      finalCategory = customCategory.trim()
    }

    setIsSubmitting(true)
    setError('')

    try {
      await onCreated({
        name: name.trim(),
        description: description.trim(),
        category: finalCategory,
        icon: icon || '👥',
        avatar_url: avatarUrl || null,
        tags: tags.trim() || null,
      })
      onClose()
    } catch (err) {
      console.error('Lỗi tạo cộng đồng:', err)
      setError(err.response?.data?.detail || 'Không thể tạo cộng đồng, vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-[#11151c] border border-[#1a232e] p-6 md:p-8 shadow-2xl relative text-[#e3e2e3] scrollbar-thin scrollbar-thumb-[#1f2b23]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1a232e] mb-6">
          <div className="flex items-center gap-3.5">
            {/* Live Preview Avatar */}
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-[#181d26] border-2 border-[#00ff88]/40 shadow-[0_0_15px_rgba(0,255,136,0.2)] shrink-0">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <img src={brandMark} alt="Preview" className="w-full h-full object-contain p-2" />
              )}
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-extrabold text-[#f1ffef]">
                Tạo Cộng Đồng Mới
              </h2>
              <p className="text-xs text-[#849585] font-mono mt-0.5">
                Tự động tạo nhóm chat riêng cho cộng đồng
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#849585] hover:text-[#f1ffef] hover:bg-[#181d26] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* PHẦN CHỌN ẢNH ĐẠI DIỆN CHO NHÓM (AVATAR) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-mono text-[#b9cbb9]">
                Ảnh đại diện nhóm (Avatar) <span className="text-[#00ff88]">*</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-mono text-[#00ff88] hover:text-[#4edea3] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">upload_file</span>
                  Tải ảnh từ máy
                </button>
                <span className="text-[#526456] text-xs">•</span>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-[11px] font-mono text-[#849585] hover:text-[#f1ffef] hover:underline"
                >
                  {showUrlInput ? 'Ẩn link' : 'Dán link ảnh'}
                </button>
              </div>
            </div>

            {/* Ô dán link ảnh tùy chỉnh */}
            {showUrlInput && (
              <div className="flex gap-2 mb-3 animate-fadeIn">
                <input
                  type="text"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/anh-nhom.jpg"
                  className="flex-1 h-9 px-3 rounded-xl bg-[#08090a] border border-[#1a232e] text-xs text-[#f1ffef] outline-none focus:border-[#00ff88]"
                />
                <button
                  type="button"
                  onClick={handleApplyCustomUrl}
                  className="px-3 h-9 rounded-xl bg-[#18261e] border border-[#00ff88]/40 text-[#00ff88] text-xs font-mono hover:bg-[#203328]"
                >
                  Dùng ảnh
                </button>
              </div>
            )}

            {/* Danh sách ảnh mẫu chất lượng cao */}
            <div className="grid grid-cols-5 gap-2.5 p-2.5 rounded-2xl bg-[#0a0d12] border border-[#1a232e]">
              {PRESET_COMMUNITY_AVATARS.map((item, idx) => {
                const isSelected = avatarUrl === item.url
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatarUrl(item.url)
                      setIcon(item.icon)
                    }}
                    title={item.label}
                    className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#00ff88] shadow-[0_0_12px_rgba(0,255,136,0.5)] scale-105 ring-2 ring-[#00ff88]/30'
                        : 'border-[#1a232e] hover:border-[#00ff88]/50 opacity-75 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={item.url}
                      alt={item.label}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 bg-[#00ff88]/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#00ff88] text-lg font-bold drop-shadow">
                          check_circle
                        </span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-[#718274] font-mono mt-1.5 text-right">
              Nhấp vào ảnh để chọn nhanh hoặc tải ảnh riêng của bạn lên
            </p>
          </div>

          {/* Tên cộng đồng */}
          <div>
            <label className="block text-xs font-mono text-[#b9cbb9] mb-1.5">
              Tên cộng đồng <span className="text-[#00ff88]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vd: Hội đam mê AI & Machine Learning, CLB Chạy bộ..."
              maxLength={100}
              className="w-full h-11 px-4 rounded-xl bg-[#08090a] border border-[#1a232e] text-sm text-[#f1ffef] placeholder:text-[#849585] focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] transition-all"
            />
          </div>

          {/* Danh mục */}
          <div>
            <label className="block text-xs font-mono text-[#b9cbb9] mb-1.5">
              Chủ đề / Lĩnh vực <span className="text-[#00ff88]">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 px-4 rounded-xl bg-[#08090a] border border-[#1a232e] text-sm text-[#f1ffef] focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] transition-all cursor-pointer"
            >
              {PRESET_CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-[#11151c] text-[#f1ffef]">
                  {cat}
                </option>
              ))}
            </select>

            {/* Ô tự điền chủ đề mới nếu chọn Khác */}
            {category === 'Khác (Tự điền chủ đề mới...)' && (
              <div className="mt-2.5">
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Nhập tên chủ đề mới (Vd: Nấu ăn & Ẩm thực, Du lịch, Thú cưng...)"
                  maxLength={50}
                  className="w-full h-11 px-4 rounded-xl bg-[#08090a] border border-[#00ff88]/50 text-sm text-[#f1ffef] placeholder:text-[#849585] focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] transition-all"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-xs font-mono text-[#b9cbb9] mb-1.5">
              Mô tả cộng đồng <span className="text-[#00ff88]">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Chia sẻ về mục đích, đối tượng tham gia và giá trị của cộng đồng..."
              className="w-full p-3.5 rounded-xl bg-[#08090a] border border-[#1a232e] text-sm text-[#f1ffef] placeholder:text-[#849585] focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] transition-all resize-none"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-mono text-[#b9cbb9] mb-1.5">
              Thẻ từ khóa (Tags, cách nhau bởi dấu phẩy)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Vd: AI, Python, LLM, DeepTech"
              maxLength={255}
              className="w-full h-11 px-4 rounded-xl bg-[#08090a] border border-[#1a232e] text-sm text-[#f1ffef] placeholder:text-[#849585] focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] transition-all"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1a232e]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-[#b9cbb9] hover:bg-[#181d26] transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-[#c5f36a] text-[#112015] hover:bg-[#d5fa80] shadow-[0_0_15px_rgba(197,243,106,0.3)] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-[#112015] border-t-transparent rounded-full animate-spin" />
                  <span>Đang tạo...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  <span>Tạo Cộng Đồng Ngay</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
