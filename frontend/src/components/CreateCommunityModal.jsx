import { useState } from 'react'

const PRESET_ICONS = ['👥', '💻', '🚀', '📚', '🎨', '🏃', '☕', '🎮', '🌿', '💡', '🎵', '📸', '🧠', '💼', '✨']

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
  const [icon, setIcon] = useState('🚀')
  const [tags, setTags] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

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
        icon,
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
        className="w-full max-w-lg rounded-2xl bg-[#11151c] border border-[#1a232e] p-6 md:p-8 shadow-2xl relative text-[#e3e2e3]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1a232e] mb-6">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-[#181d26] border border-[#00ff88]/30 flex items-center justify-center text-xl">
              {icon}
            </span>
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
          {/* Chọn Icon Emoji */}
          <div>
            <label className="block text-xs font-mono text-[#b9cbb9] mb-1.5">
              Biểu tượng đại diện (Icon)
            </label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                    icon === emoji
                      ? 'bg-[#00ff88]/20 border-2 border-[#00ff88] scale-110 shadow-[0_0_10px_rgba(0,255,136,0.3)]'
                      : 'bg-[#08090a] border border-[#1a232e] hover:border-[#00ff88]/40'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
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
              maxLength={200}
              className="w-full h-11 px-4 rounded-xl bg-[#08090a] border border-[#1a232e] text-sm text-[#f1ffef] placeholder:text-[#849585] focus:outline-none focus:border-[#00ff88] focus:ring-1 focus:ring-[#00ff88] transition-all"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#1a232e] mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-[#1a232e] bg-[#181d26] text-xs font-semibold text-[#b9cbb9] hover:text-[#f1ffef] hover:bg-[#202733] transition-all cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-[#00ff88] text-[#00210c] text-xs font-bold shadow-[0_0_16px_rgba(0,255,136,0.35)] hover:shadow-[0_0_22px_rgba(0,255,136,0.6)] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              <span>{isSubmitting ? 'Đang tạo...' : 'Tạo Cộng Đồng Ngay'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
