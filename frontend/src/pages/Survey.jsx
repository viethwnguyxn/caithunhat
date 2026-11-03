import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { getSurvey, submitSurvey } from '../services/surveyService'

const AGE_GROUPS = [
  'Under 18',
  '18–20',
  '21–24',
  '25–29',
  '30–39',
  '40–49',
  '50+',
]

const STATUS_OPTIONS = [
  { label: 'Sinh viên', desc: 'Đang theo học đại học hoặc cao đẳng', icon: '🎓' },
  { label: 'Đang đi làm', desc: 'Nhân viên công sở hoặc doanh nghiệp', icon: '💼' },
  { label: 'Freelancer', desc: 'Làm việc tự do, remote worker', icon: '☕' },
  { label: 'Đang tìm việc / Gap year', desc: 'Nghỉ ngơi, học thêm hoặc đổi ngành', icon: '🧭' },
  { label: 'Khác', desc: 'Các tình trạng công việc khác', icon: '⚡' },
]

const SITUATION_OPTIONS = [
  { label: 'Vừa chuyển đến môi trường mới', desc: 'Chuyển trường, đổi công ty hoặc đến thành phố mới', icon: '🎒' },
  { label: 'Bắt đầu cuộc sống tự lập', desc: 'Vừa đi làm, ở riêng hoặc chuyển ra sống tự do', icon: '🏢' },
  { label: 'Gặp áp lực công việc hoặc học tập', desc: 'Cần tìm người chia sẻ giải tỏa căng thẳng', icon: '⚡' },
  { label: 'Đang tìm kiếm định hướng tương lai', desc: 'Cần người đồng hành cùng chung mục tiêu phát triển', icon: '🧭' },
  { label: 'Cuộc sống ổn định nhưng muốn kết nối sâu sắc hơn', desc: 'Mở rộng mạng lưới bạn bè chất lượng', icon: '🌱' },
]

const FEELING_OPTIONS = [
  { label: 'Thỉnh thoảng thấy cô đơn', icon: '🌧️' },
  { label: 'Hy vọng & Hướng về phía trước', icon: '✨' },
  { label: 'Căng thẳng, quá tải', icon: '🔥' },
  { label: 'Mong muốn được lắng nghe', icon: '💬' },
  { label: 'Tò mò, hào hứng khám phá', icon: '🚀' },
]

const GOAL_OPTIONS = [
  { label: 'Tìm bạn tâm giao, đồng điệu', icon: '🤝' },
  { label: 'Cùng học tập, phát triển kỹ năng', icon: '📚' },
  { label: 'Chia sẻ câu chuyện & sở thích', icon: '☕' },
  { label: 'Tìm người cùng vượt qua khó khăn', icon: '🛡️' },
]

const EXPECTATION_OPTIONS = [
  { label: 'Lắng nghe chân thành, không phán xét', icon: '🤍' },
  { label: 'Sự tôn trọng và giữ gìn riêng tư', icon: '🔒' },
  { label: 'Năng lượng tích cực, ấm áp', icon: '☀️' },
  { label: 'Gợi ý, lời khuyên hữu ích', icon: '💡' },
]

const TOPIC_OPTIONS = [
  'Công nghệ & Lập trình',
  'Tâm lý học & Chữa lành',
  'Sách & Viết lách',
  'Nghệ thuật & Âm nhạc',
  'Du lịch & Trải nghiệm',
  'Phát triển bản thân',
  'Phim ảnh & Văn hóa',
]

const ACTIVITY_OPTIONS = [
  'Đọc sách hoặc viết lách',
  'Nghe nhạc, podcast thư giãn',
  'Dạo phố, quán cà phê yên tĩnh',
  'Xem phim hoặc chơi game',
  'Tập luyện thể thao, yoga',
]

const CONNECTION_TYPE_OPTIONS = [
  'Kết nối bạn bè 1-1',
  'Nhóm bạn nhỏ cùng chung mục tiêu',
  'Người đồng hành học tập/công việc',
]

const MODE_OPTIONS = [
  'Nhắn tin chậm rãi, sâu sắc khi rảnh',
  'Trò chuyện thường xuyên, chia sẻ hàng ngày',
  'Tương tác qua các bài chia sẻ cộng đồng',
]

const DISCOVERY_OPTIONS = [
  'Ưu tiên người có hoàn cảnh tương đồng nhất',
  'Mở rộng kết nối để học hỏi góc nhìn mới',
]

const STEP_TITLES = [
  'HỒ SƠ CĂN BẢN & ĐỘ TUỔI',
  'HOÀN CẢNH & CẢM XÚC',
  'MỤC TIÊU & KỲ VỌNG',
  'SỞ THÍCH & HOẠT ĐỘNG',
  'KIỂU KẾT NỐI & TƯƠNG TÁC',
  'CÂU CHUYỆN CÁ NHÂN',
]

export default function Survey() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const totalSteps = 6

  const [form, setForm] = useState({
    age_group: '',
    current_status: '',
    life_situation: '',
    recent_feelings: [],
    goals: [],
    community_expectations: [],
    topics: [],
    free_time_activities: [],
    desired_connection_types: [],
    preferred_mode: '',
    discovery_preference: '',
    story: '',
    what_you_want_others_to_understand: '',
  })

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOldSurvey() {
      try {
        const data = await getSurvey()
        if (data) {
          setForm({
            age_group: data.age_group || '',
            current_status: data.current_status || '',
            life_situation: data.life_situation || '',
            recent_feelings: data.recent_feelings || [],
            goals: data.goals || [],
            community_expectations: data.community_expectations || [],
            topics: data.topics || [],
            free_time_activities: data.free_time_activities || [],
            desired_connection_types: data.desired_connection_types || [],
            preferred_mode: data.preferred_mode || '',
            discovery_preference: data.discovery_preference || '',
            story: data.story || '',
            what_you_want_others_to_understand: data.what_you_want_others_to_understand || '',
          })
        }
      } catch (err) {
        console.error('Không thể tải survey cũ:', err)
      } finally {
        setInitialLoading(false)
      }
    }
    loadOldSurvey()
  }, [])

  const handleSelectRadio = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError('')
  }

  const handleToggleCheckbox = (field, value) => {
    setForm((prev) => {
      const currentList = prev[field] || []
      const exists = currentList.includes(value)
      const updatedList = exists
        ? currentList.filter((item) => item !== value)
        : [...currentList, value]
      return { ...prev, [field]: updatedList }
    })
    setError('')
  }

  const validateCurrentStep = () => {
    if (step === 1) {
      if (!form.age_group) return 'Vui lòng chọn nhóm độ tuổi của bạn.'
      if (!form.current_status) return 'Vui lòng chọn tình trạng hiện tại.'
    }
    if (step === 2) {
      if (!form.life_situation) return 'Vui lòng chọn hoàn cảnh sống hiện tại.'
      if (form.recent_feelings.length === 0) return 'Vui lòng chọn ít nhất một cảm xúc gần đây.'
    }
    if (step === 3) {
      if (form.goals.length === 0) return 'Vui lòng chọn ít nhất một mục tiêu của bạn.'
      if (form.community_expectations.length === 0) return 'Vui lòng chọn mong muốn từ cộng đồng.'
    }
    if (step === 4) {
      if (form.topics.length === 0) return 'Vui lòng chọn ít nhất một chủ đề bạn quan tâm.'
      if (form.free_time_activities.length === 0) return 'Vui lòng chọn ít nhất một hoạt động lúc rảnh.'
    }
    if (step === 5) {
      if (form.desired_connection_types.length === 0) return 'Vui lòng chọn kiểu kết nối bạn mong muốn.'
      if (!form.preferred_mode) return 'Vui lòng chọn phương thức kết nối ưu tiên.'
      if (!form.discovery_preference) return 'Vui lòng chọn hình thức khám phá bạn thích.'
    }
    return null
  }

  const handleNext = () => {
    const errMsg = validateCurrentStep()
    if (errMsg) {
      setError(errMsg)
      return
    }
    setError('')
    setStep((prev) => Math.min(prev + 1, totalSteps))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBack = () => {
    setError('')
    setStep((prev) => Math.max(prev - 1, 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    const errMsg = validateCurrentStep()
    if (errMsg) {
      setError(errMsg)
      return
    }

    setLoading(true)
    setError('')
    try {
      await submitSurvey(form)
      navigate('/discover')
    } catch (err) {
      console.error('Lỗi nộp survey:', err)
      setError(err.response?.data?.detail || 'Không thể lưu kết quả khảo sát. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="bg-[#08090a] min-h-screen text-[#e3e2e3] flex items-center justify-center font-mono">
        Đang khởi tạo buồng khảo sát...
      </div>
    )
  }

  return (
    <div className="bg-[#08090a] min-h-screen text-[#e3e2e3] font-sans antialiased selection:bg-[#00ff88] selection:text-[#00210c] relative">
      <Navbar />

      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.06),transparent_60%)]"></div>

      <main className="relative z-10 w-full max-w-5xl mx-auto px-4 md:px-8 pt-24 pb-16">
        <div className="flex flex-col w-full items-center justify-center">
          {/* Stepper Progress Header */}
          <div className="w-full max-w-xl mx-auto mb-8 px-4 flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]"></span>
              <span className="text-xs font-mono text-[#00ff88] tracking-wider font-semibold uppercase">
                BƯỚC {step} / {totalSteps}: {STEP_TITLES[step - 1]}
              </span>
            </div>

            {/* Stepper Track Bar */}
            <div className="w-full h-2 bg-[#181d26] rounded-full overflow-hidden relative shadow-inner">
              <div
                className="h-full bg-[#00ff88] rounded-full shadow-[0_0_12px_#00ff88] transition-all duration-500 ease-out"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              ></div>
            </div>

            {/* Step Points Preview */}
            <div className="w-full flex justify-between items-center mt-3 px-1">
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <div key={s} className="flex flex-col items-center gap-1">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all ${
                      s < step
                        ? 'bg-[#00ff88]/20 border border-[#00ff88]/60 text-[#00ff88]'
                        : s === step
                        ? 'bg-[#00ff88] text-[#00210c] shadow-[0_0_14px_rgba(0,255,136,0.6)] scale-110'
                        : 'bg-[#181d26] text-[#849585]'
                    }`}
                  >
                    {s < step ? (
                      <span className="material-symbols-outlined text-[13px] font-bold">check</span>
                    ) : (
                      `0${s}`
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Card Container */}
          <div className="w-full max-w-[700px] bg-[#11151c] border border-[#1a232e] rounded-2xl p-6 sm:p-8 md:p-10 shadow-2xl relative overflow-hidden backdrop-blur-md">
            {/* Ambient Radial Glows */}
            <div className="pointer-events-none absolute -top-24 -right-24 w-64 h-64 bg-[#00ff88]/10 rounded-full blur-3xl"></div>
            <div className="pointer-events-none absolute -bottom-28 -left-24 w-60 h-60 bg-[#44fb8a]/5 rounded-full blur-2xl"></div>

            {/* Header info */}
            <div className="relative z-10">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#181d26] border border-[#1a232e] text-[#00ff88] text-[10px] font-mono">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse"></span>
                  THUẬT TOÁN KẾT NỐI LAPULGA
                </div>
                <span className="text-[11px] font-mono text-[#849585]">CALIBRATION ID: #LPG-9421</span>
              </div>

              {/* Error Alert */}
              {error && (
                <div className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{error}</span>
                </div>
              )}

              {/* BƯỚC 1: ABOUT YOU */}
              {step === 1 && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-[#f1ffef]">
                      Về thông tin của bạn
                    </h1>
                    <p className="text-xs md:text-sm text-[#b9cbb9] mt-1">
                      Giúp lapulga hiểu độ tuổi và tình trạng hiện tại để hiệu chỉnh dải tần số kết
                      nối.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#44fb8a] uppercase tracking-wider mb-2.5">
                      1. Nhóm độ tuổi của bạn *
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {AGE_GROUPS.map((age) => {
                        const isSelected = form.age_group === age
                        return (
                          <div
                            key={age}
                            onClick={() => handleSelectRadio('age_group', age)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all text-center text-xs font-mono ${
                              isSelected
                                ? 'bg-[#00ff88]/15 border-[#00ff88] text-[#00ff88] shadow-[0_0_12px_rgba(0,255,136,0.2)] font-bold'
                                : 'bg-[#08090a] border-[#1a232e] text-[#b9cbb9] hover:border-[#00ff88]/40 hover:bg-[#181d26]'
                            }`}
                          >
                            {age}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#44fb8a] uppercase tracking-wider mb-2.5">
                      2. Tình trạng hiện tại *
                    </label>
                    <div className="space-y-2.5">
                      {STATUS_OPTIONS.map((st) => {
                        const isSelected = form.current_status === st.label
                        return (
                          <div
                            key={st.label}
                            onClick={() => handleSelectRadio('current_status', st.label)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#00ff88]/10 border-[#00ff88] shadow-[0_0_14px_rgba(0,255,136,0.18)]'
                                : 'bg-[#08090a] border-[#1a232e] hover:border-[#00ff88]/40 hover:bg-[#181d26]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{st.icon}</span>
                              <div>
                                <h4
                                  className={`text-sm font-semibold ${
                                    isSelected ? 'text-[#00ff88]' : 'text-[#f1ffef]'
                                  }`}
                                >
                                  {st.label}
                                </h4>
                                <p className="text-xs text-[#849585]">{st.desc}</p>
                              </div>
                            </div>
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                isSelected
                                  ? 'bg-[#00ff88] text-[#00210c] shadow-[0_0_8px_#00ff88]'
                                  : 'border border-[#1a232e]'
                              }`}
                            >
                              {isSelected && (
                                <span className="material-symbols-outlined text-[13px] font-bold">
                                  check
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* BƯỚC 2: LIFE SITUATION & FEELINGS */}
              {step === 2 && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-[#f1ffef]">
                      Hiện tại cuộc sống của bạn như thế nào?
                    </h1>
                    <p className="text-xs md:text-sm text-[#b9cbb9] mt-1">
                      Chọn những mô tả đúng nhất về bạn lúc này để tìm người thấu hiểu.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#44fb8a] uppercase tracking-wider mb-2.5">
                      1. Hoàn cảnh sống hiện tại * (Chọn 1)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {SITUATION_OPTIONS.map((opt) => {
                        const isSelected = form.life_situation === opt.label
                        return (
                          <div
                            key={opt.label}
                            onClick={() => handleSelectRadio('life_situation', opt.label)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between ${
                              isSelected
                                ? 'bg-[#00ff88]/10 border-[#00ff88] shadow-[0_0_14px_rgba(0,255,136,0.18)]'
                                : 'bg-[#08090a] border-[#1a232e] hover:border-[#00ff88]/40 hover:bg-[#181d26]'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span className="text-2xl">{opt.icon}</span>
                              <div
                                className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-[#00ff88] text-[#00210c] shadow-[0_0_8px_#00ff88]'
                                    : 'border border-[#1a232e]'
                                }`}
                              >
                                {isSelected && (
                                  <span className="material-symbols-outlined text-[13px] font-bold">
                                    check
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mt-3">
                              <h4
                                className={`text-sm font-semibold ${
                                  isSelected ? 'text-[#00ff88]' : 'text-[#f1ffef]'
                                }`}
                              >
                                {opt.label}
                              </h4>
                              <p className="text-xs text-[#849585] mt-1 leading-relaxed">
                                {opt.desc}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#44fb8a] uppercase tracking-wider mb-2.5">
                      2. Cảm xúc gần đây của bạn * (Chọn nhiều)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {FEELING_OPTIONS.map((f) => {
                        const isSelected = form.recent_feelings.includes(f.label)
                        return (
                          <div
                            key={f.label}
                            onClick={() => handleToggleCheckbox('recent_feelings', f.label)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                              isSelected
                                ? 'bg-[#00ff88]/10 border-[#00ff88] text-[#00ff88] font-bold shadow-[0_0_10px_rgba(0,255,136,0.15)]'
                                : 'bg-[#08090a] border-[#1a232e] text-[#b9cbb9] hover:bg-[#181d26]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{f.icon}</span>
                              <span>{f.label}</span>
                            </div>
                            {isSelected && (
                              <span className="material-symbols-outlined text-[16px] text-[#00ff88]">
                                check
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* BƯỚC 3: GOALS & EXPECTATIONS */}
              {step === 3 && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-[#f1ffef]">
                      Mục tiêu & Kỳ vọng kết nối
                    </h1>
                    <p className="text-xs md:text-sm text-[#b9cbb9] mt-1">
                      Bạn đang tìm kiếm điều gì và mong đợi không gian tương tác như thế nào?
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#44fb8a] uppercase tracking-wider mb-2.5">
                      1. Mục tiêu kết nối của bạn * (Chọn nhiều)
                    </label>
                    <div className="space-y-2.5">
                      {GOAL_OPTIONS.map((g) => {
                        const isSelected = form.goals.includes(g.label)
                        return (
                          <div
                            key={g.label}
                            onClick={() => handleToggleCheckbox('goals', g.label)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#00ff88]/10 border-[#00ff88] shadow-[0_0_12px_rgba(0,255,136,0.18)]'
                                : 'bg-[#08090a] border-[#1a232e] hover:bg-[#181d26]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{g.icon}</span>
                              <span
                                className={`text-sm ${
                                  isSelected ? 'text-[#00ff88] font-bold' : 'text-[#f1ffef]'
                                }`}
                              >
                                {g.label}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="material-symbols-outlined text-[18px] text-[#00ff88]">
                                check_circle
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#44fb8a] uppercase tracking-wider mb-2.5">
                      2. Mong muốn từ cộng đồng lapulga * (Chọn nhiều)
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {EXPECTATION_OPTIONS.map((exp) => {
                        const isSelected = form.community_expectations.includes(exp.label)
                        return (
                          <div
                            key={exp.label}
                            onClick={() => handleToggleCheckbox('community_expectations', exp.label)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                              isSelected
                                ? 'bg-[#00ff88]/10 border-[#00ff88] text-[#00ff88] font-bold'
                                : 'bg-[#08090a] border-[#1a232e] text-[#b9cbb9] hover:bg-[#181d26]'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span>{exp.icon}</span>
                              <span>{exp.label}</span>
                            </div>
                            {isSelected && (
                              <span className="material-symbols-outlined text-[16px] text-[#00ff88]">
                                check
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* BƯỚC 4: TOPICS & ACTIVITIES */}
              {step === 4 && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-[#f1ffef]">
                      Sở thích & Chủ đề quan tâm
                    </h1>
                    <p className="text-xs md:text-sm text-[#b9cbb9] mt-1">
                      Giúp hệ thống tìm bạn bè có cùng gu trò chuyện và hoạt động rảnh rỗi.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#44fb8a] uppercase tracking-wider mb-2.5">
                      1. Chủ đề bạn thích trao đổi * (Chọn nhiều)
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {TOPIC_OPTIONS.map((t) => {
                        const isSelected = form.topics.includes(t)
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleToggleCheckbox('topics', t)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-mono transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#00ff88] text-[#00210c] font-bold shadow-[0_0_12px_rgba(0,255,136,0.35)]'
                                : 'bg-[#08090a] text-[#b9cbb9] border border-[#1a232e] hover:border-[#00ff88]/40'
                            }`}
                          >
                            #{t}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#44fb8a] uppercase tracking-wider mb-2.5">
                      2. Hoạt động lúc rảnh rỗi * (Chọn nhiều)
                    </label>
                    <div className="space-y-2">
                      {ACTIVITY_OPTIONS.map((act) => {
                        const isSelected = form.free_time_activities.includes(act)
                        return (
                          <div
                            key={act}
                            onClick={() => handleToggleCheckbox('free_time_activities', act)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                              isSelected
                                ? 'bg-[#00ff88]/10 border-[#00ff88] text-[#00ff88] font-bold'
                                : 'bg-[#08090a] border-[#1a232e] text-[#b9cbb9] hover:bg-[#181d26]'
                            }`}
                          >
                            <span>{act}</span>
                            {isSelected && (
                              <span className="material-symbols-outlined text-[16px] text-[#00ff88]">
                                check
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* BƯỚC 5: CONNECTION STYLE */}
              {step === 5 && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-[#f1ffef]">
                      Kiểu kết nối & Phong cách giao tiếp
                    </h1>
                    <p className="text-xs md:text-sm text-[#b9cbb9] mt-1">
                      Cách bạn muốn kết nối và nhịp điệu nhắn tin phù hợp nhất với bạn.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#44fb8a] uppercase tracking-wider mb-2.5">
                      1. Kiểu kết nối mong muốn *
                    </label>
                    <div className="space-y-2">
                      {CONNECTION_TYPE_OPTIONS.map((c) => {
                        const isSelected = form.desired_connection_types.includes(c)
                        return (
                          <div
                            key={c}
                            onClick={() => handleToggleCheckbox('desired_connection_types', c)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                              isSelected
                                ? 'bg-[#00ff88]/10 border-[#00ff88] text-[#00ff88] font-bold'
                                : 'bg-[#08090a] border-[#1a232e] text-[#b9cbb9] hover:bg-[#181d26]'
                            }`}
                          >
                            <span>{c}</span>
                            {isSelected && (
                              <span className="material-symbols-outlined text-[16px] text-[#00ff88]">
                                check
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#44fb8a] uppercase tracking-wider mb-2.5">
                      2. Nhịp điệu trò chuyện ưu tiên *
                    </label>
                    <div className="space-y-2">
                      {MODE_OPTIONS.map((m) => {
                        const isSelected = form.preferred_mode === m
                        return (
                          <div
                            key={m}
                            onClick={() => handleSelectRadio('preferred_mode', m)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                              isSelected
                                ? 'bg-[#00ff88]/10 border-[#00ff88] text-[#00ff88] font-bold'
                                : 'bg-[#08090a] border-[#1a232e] text-[#b9cbb9] hover:bg-[#181d26]'
                            }`}
                          >
                            <span>{m}</span>
                            {isSelected && (
                              <span className="material-symbols-outlined text-[16px] text-[#00ff88]">
                                radio_button_checked
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-[#44fb8a] uppercase tracking-wider mb-2.5">
                      3. Tùy chọn khám phá ghép đôi *
                    </label>
                    <div className="space-y-2">
                      {DISCOVERY_OPTIONS.map((d) => {
                        const isSelected = form.discovery_preference === d
                        return (
                          <div
                            key={d}
                            onClick={() => handleSelectRadio('discovery_preference', d)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between text-xs ${
                              isSelected
                                ? 'bg-[#00ff88]/10 border-[#00ff88] text-[#00ff88] font-bold'
                                : 'bg-[#08090a] border-[#1a232e] text-[#b9cbb9] hover:bg-[#181d26]'
                            }`}
                          >
                            <span>{d}</span>
                            {isSelected && (
                              <span className="material-symbols-outlined text-[16px] text-[#00ff88]">
                                radio_button_checked
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* BƯỚC 6: STORY (OPTIONAL) */}
              {step === 6 && (
                <div className="space-y-6 animate-fadeIn">
                  <div>
                    <h1 className="text-xl md:text-2xl font-bold text-[#f1ffef]">
                      Câu chuyện & Góc nhìn riêng của bạn
                    </h1>
                    <p className="text-xs md:text-sm text-[#b9cbb9] mt-1">
                      (Tùy chọn) Chia sẻ thêm điều bạn muốn người khác thấu hiểu nhất về bạn.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-[#44fb8a] uppercase tracking-wider">
                      Câu chuyện ngắn hoặc trải nghiệm đáng nhớ
                    </label>
                    <textarea
                      rows={4}
                      value={form.story}
                      onChange={(e) => setForm({ ...form, story: e.target.value })}
                      placeholder="Một hành trình bạn từng trải qua, một bước ngoặt cuộc sống..."
                      className="w-full p-3.5 rounded-xl bg-[#08090a] text-[#f1ffef] placeholder:text-[#849585] text-xs md:text-sm border border-[#1a232e] focus:outline-none focus:ring-1 focus:ring-[#00ff88] transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-[#44fb8a] uppercase tracking-wider">
                      Điều bạn muốn người khác hiểu về mình
                    </label>
                    <textarea
                      rows={3}
                      value={form.what_you_want_others_to_understand}
                      onChange={(e) =>
                        setForm({ ...form, what_you_want_others_to_understand: e.target.value })
                      }
                      placeholder="Vd: Mình có phần trầm tính lúc mới gặp nhưng rất chân thành và thích nghe tâm sự..."
                      className="w-full p-3.5 rounded-xl bg-[#08090a] text-[#f1ffef] placeholder:text-[#849585] text-xs md:text-sm border border-[#1a232e] focus:outline-none focus:ring-1 focus:ring-[#00ff88] transition-all resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Bottom Buttons */}
              <div className="flex items-center justify-between pt-8 mt-8 border-t border-[#1a232e]">
                {step > 1 ? (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="px-5 py-2.5 rounded-xl bg-[#181d26] text-[#b9cbb9] hover:bg-[#1f2021] hover:text-[#f1ffef] font-semibold text-xs font-mono transition-all cursor-pointer"
                  >
                    ← Quay lại
                  </button>
                ) : (
                  <div></div>
                )}

                {step < totalSteps ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 rounded-xl bg-[#00ff88] text-[#00210c] font-bold text-xs font-mono shadow-[0_0_16px_rgba(0,255,136,0.35)] hover:shadow-[0_0_24px_rgba(0,255,136,0.6)] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Tiếp theo</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-7 py-2.5 rounded-xl bg-[#00ff88] text-[#00210c] font-bold text-xs font-mono shadow-[0_0_20px_rgba(0,255,136,0.5)] hover:shadow-[0_0_28px_rgba(0,255,136,0.8)] active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span>{loading ? 'Đang hiệu chuẩn...' : 'Hoàn tất & Khám phá'}</span>
                    <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
