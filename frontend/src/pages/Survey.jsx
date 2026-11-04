import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSurvey, submitSurvey } from '../services/surveyService'
import Navbar from '../components/Navbar'

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
  'Sinh viên',
  'Đang đi làm',
  'Freelancer',
  'Đang tìm việc / Gap year',
  'Khác',
]

const SITUATION_OPTIONS = [
  'Vừa chuyển đến môi trường mới',
  'Bắt đầu cuộc sống tự lập',
  'Gặp áp lực công việc hoặc học tập',
  'Đang tìm kiếm định hướng tương lai',
  'Cuộc sống ổn định nhưng muốn kết nối sâu sắc hơn',
]

const FEELING_OPTIONS = [
  'Thỉnh thoảng thấy cô đơn',
  'Hy vọng & Hướng về phía trước',
  'Căng thẳng, quá tải',
  'Mong muốn được lắng nghe',
  'Tò mò, hào hứng khám phá',
]

const GOAL_OPTIONS = [
  'Tìm bạn tâm giao, đồng điệu',
  'Cùng học tập, phát triển kỹ năng',
  'Chia sẻ câu chuyện & sở thích',
  'Tìm người cùng vượt qua giai đoạn khó khăn',
]

const EXPECTATION_OPTIONS = [
  'Lắng nghe chân thành, không phán xét',
  'Sự tôn trọng và giữ gìn riêng tư',
  'Năng lượng tích cực, ấm áp',
  'Gợi ý, lời khuyên hữu ích',
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
  const [stepTransitioning, setStepTransitioning] = useState(false)

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
    setStepTransitioning(true)
    setTimeout(() => {
      setStepTransitioning(false)
    }, 400)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleBack = () => {
    setError('')
    setStep((prev) => Math.max(prev - 1, 1))
    setStepTransitioning(true)
    setTimeout(() => {
      setStepTransitioning(false)
    }, 300)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    if (stepTransitioning || loading) return

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

  // Thẻ chọn SelectCard thiết kế tinh gọn, có highlight tím khi active
  const SelectCard = ({ label, isSelected, onClick, isMulti = false }) => {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onClick()
          }
        }}
        className={`w-full p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between text-left select-none ${
          isSelected
            ? 'border-kindred-purple bg-kindred-lavender/60 text-kindred-text shadow-sm'
            : 'border-kindred-border bg-white text-kindred-text hover:border-purple-200 hover:bg-gray-50/70'
        }`}
      >
        <span className={`text-sm ${isSelected ? 'font-bold text-kindred-purple' : 'font-medium'}`}>
          {label}
        </span>
        <div
          className={`w-5 h-5 rounded-${isMulti ? 'md' : 'full'} flex items-center justify-center shrink-0 transition-all ${
            isSelected
              ? 'bg-kindred-purple text-white shadow-xs'
              : 'border border-kindred-border bg-white'
          }`}
        >
          {isSelected && (
            <span className="material-symbols-outlined text-xs">check</span>
          )}
        </div>
      </div>
    )
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-kindred-bg">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-20 text-center">
          <div className="w-12 h-12 rounded-full border-3 border-kindred-purple/30 border-t-kindred-purple animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-kindred-muted">Đang chuẩn bị khảo sát Kindred...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-kindred-bg flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white rounded-3xl border border-kindred-border shadow-soft p-6 sm:p-10 relative overflow-hidden">
          {/* Decorative subtle backdrop pattern */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-kindred-lavender/50 to-transparent rounded-bl-full pointer-events-none" />

          {/* Stepper Header */}
          <div className="mb-8 relative z-10">
            <div className="flex items-center justify-between text-xs font-bold text-kindred-muted uppercase tracking-wider mb-2.5">
              <span className="inline-flex items-center gap-1.5 text-kindred-purple">
                <span className="material-symbols-outlined text-sm">psychology</span>
                BƯỚC {step} / {totalSteps}
              </span>
              <span>{Math.round((step / totalSteps) * 100)}% HOÀN THÀNH</span>
            </div>

            {/* Progress bar */}
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-kindred-purple to-purple-400 transition-all duration-300 rounded-full"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2.5 animate-fadeIn">
              <span className="material-symbols-outlined text-rose-500">warning</span>
              <span>{error}</span>
            </div>
          )}

          {/* Survey Wizard Content */}
          <form
            onSubmit={
              step === totalSteps
                ? handleSubmit
                : (e) => {
                    e.preventDefault()
                    handleNext()
                  }
            }
          >
            {/* BƯỚC 1: ABOUT YOU */}
            {step === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-kindred-text tracking-tight">
                    Về bạn
                  </h1>
                  <p className="text-xs sm:text-sm text-kindred-muted mt-1">
                    Giúp Kindred hiểu độ tuổi và tình trạng cuộc sống hiện tại của bạn.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-2.5">
                    Độ tuổi của bạn
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {AGE_GROUPS.map((age) => (
                      <button
                        type="button"
                        key={age}
                        onClick={() => handleSelectRadio('age_group', age)}
                        className={`p-3 rounded-2xl border text-sm font-semibold text-center transition-all ${
                          form.age_group === age
                            ? 'border-kindred-purple bg-kindred-lavender text-kindred-purple shadow-xs'
                            : 'border-kindred-border bg-white text-kindred-text hover:border-purple-200 hover:bg-gray-50'
                        }`}
                      >
                        {age}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-2.5">
                    Tình trạng hiện tại
                  </label>
                  <div className="space-y-2">
                    {STATUS_OPTIONS.map((status) => (
                      <SelectCard
                        key={status}
                        label={status}
                        isSelected={form.current_status === status}
                        onClick={() => handleSelectRadio('current_status', status)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* BƯỚC 2: LIFE SITUATION & FEELINGS */}
            {step === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-kindred-text tracking-tight">
                    Hoàn cảnh & Cảm xúc
                  </h1>
                  <p className="text-xs sm:text-sm text-kindred-muted mt-1">
                    Những gì bạn đang trải qua sẽ giúp kết nối với người thực sự thấu hiểu.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-2.5">
                    Hoàn cảnh hiện tại của bạn
                  </label>
                  <div className="space-y-2">
                    {SITUATION_OPTIONS.map((item) => (
                      <SelectCard
                        key={item}
                        label={item}
                        isSelected={form.life_situation === item}
                        onClick={() => handleSelectRadio('life_situation', item)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-2.5">
                    Cảm xúc gần đây (chọn nhiều)
                  </label>
                  <div className="space-y-2">
                    {FEELING_OPTIONS.map((feeling) => (
                      <SelectCard
                        key={feeling}
                        label={feeling}
                        isMulti={true}
                        isSelected={form.recent_feelings.includes(feeling)}
                        onClick={() => handleToggleCheckbox('recent_feelings', feeling)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* BƯỚC 3: GOALS & EXPECTATIONS */}
            {step === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-kindred-text tracking-tight">
                    Mục tiêu & Kỳ vọng
                  </h1>
                  <p className="text-xs sm:text-sm text-kindred-muted mt-1">
                    Bạn tìm kiếm điều gì khi tham gia cộng đồng này?
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-2.5">
                    Mục tiêu của bạn (chọn nhiều)
                  </label>
                  <div className="space-y-2">
                    {GOAL_OPTIONS.map((goal) => (
                      <SelectCard
                        key={goal}
                        label={goal}
                        isMulti={true}
                        isSelected={form.goals.includes(goal)}
                        onClick={() => handleToggleCheckbox('goals', goal)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-2.5">
                    Kỳ vọng từ cộng đồng (chọn nhiều)
                  </label>
                  <div className="space-y-2">
                    {EXPECTATION_OPTIONS.map((exp) => (
                      <SelectCard
                        key={exp}
                        label={exp}
                        isMulti={true}
                        isSelected={form.community_expectations.includes(exp)}
                        onClick={() => handleToggleCheckbox('community_expectations', exp)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* BƯỚC 4: INTERESTS & TOPICS */}
            {step === 4 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-kindred-text tracking-tight">
                    Sở thích & Thói quen
                  </h1>
                  <p className="text-xs sm:text-sm text-kindred-muted mt-1">
                    Những chủ đề và sở thích giúp gắn kết bạn với những người chung tần số.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-2.5">
                    Chủ đề bạn quan tâm (chọn nhiều)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TOPIC_OPTIONS.map((topic) => {
                      const isChecked = form.topics.includes(topic)
                      return (
                        <button
                          type="button"
                          key={topic}
                          onClick={() => handleToggleCheckbox('topics', topic)}
                          className={`px-4 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 ${
                            isChecked
                              ? 'bg-kindred-purple text-white shadow-xs scale-102'
                              : 'bg-kindred-cardSecondary text-kindred-text border border-kindred-border hover:border-purple-200'
                          }`}
                        >
                          {isChecked && <span className="material-symbols-outlined text-xs">check</span>}
                          {topic}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-2.5">
                    Hoạt động khi rảnh rỗi (chọn nhiều)
                  </label>
                  <div className="space-y-2">
                    {ACTIVITY_OPTIONS.map((act) => (
                      <SelectCard
                        key={act}
                        label={act}
                        isMulti={true}
                        isSelected={form.free_time_activities.includes(act)}
                        onClick={() => handleToggleCheckbox('free_time_activities', act)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* BƯỚC 5: CONNECTION PREFERENCES */}
            {step === 5 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-kindred-text tracking-tight">
                    Gu kết nối của bạn
                  </h1>
                  <p className="text-xs sm:text-sm text-kindred-muted mt-1">
                    Bạn muốn kết nối và trò chuyện theo cách nào?
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-2.5">
                    Hình thức kết nối mong muốn (chọn nhiều)
                  </label>
                  <div className="space-y-2">
                    {CONNECTION_TYPE_OPTIONS.map((type) => (
                      <SelectCard
                        key={type}
                        label={type}
                        isMulti={true}
                        isSelected={form.desired_connection_types.includes(type)}
                        onClick={() => handleToggleCheckbox('desired_connection_types', type)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-2.5">
                    Nhịp điệu trò chuyện ưu tiên
                  </label>
                  <div className="space-y-2">
                    {MODE_OPTIONS.map((mode) => (
                      <SelectCard
                        key={mode}
                        label={mode}
                        isSelected={form.preferred_mode === mode}
                        onClick={() => handleSelectRadio('preferred_mode', mode)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-2.5">
                    Sở thích khám phá
                  </label>
                  <div className="space-y-2">
                    {DISCOVERY_OPTIONS.map((disc) => (
                      <SelectCard
                        key={disc}
                        label={disc}
                        isSelected={form.discovery_preference === disc}
                        onClick={() => handleSelectRadio('discovery_preference', disc)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* BƯỚC 6: STORY (OPTIONAL) */}
            {step === 6 && (
              <div className="space-y-6 animate-fadeIn">
                <div>
                  <h1 className="text-xl sm:text-2xl font-extrabold text-kindred-text tracking-tight">
                    Câu chuyện của bạn (Tùy chọn)
                  </h1>
                  <p className="text-xs sm:text-sm text-kindred-muted mt-1">
                    Một vài dòng chia sẻ chân thành sẽ giúp người khác hiểu và đồng cảm với bạn hơn.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-1.5">
                    Một câu chuyện ngắn hoặc điều bạn đang trải qua
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Ví dụ: Mình là người hướng nội mới chuyển đến thành phố mới, đôi lúc thấy lạc lõng và muốn tìm người bạn để cùng trò chuyện..."
                    value={form.story}
                    onChange={(e) => setForm({ ...form, story: e.target.value })}
                    className="w-full px-4 py-3 rounded-2xl border border-kindred-border text-sm text-kindred-text focus:outline-none focus:border-kindred-purple focus:ring-2 focus:ring-kindred-purple/20 transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-kindred-muted uppercase tracking-wider mb-1.5">
                    Điều bạn muốn người khác hiểu về mình nhất
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ví dụ: Mình phản hồi tin nhắn hơi chậm nhưng luôn lắng nghe chân thành..."
                    value={form.what_you_want_others_to_understand}
                    onChange={(e) =>
                      setForm({ ...form, what_you_want_others_to_understand: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-2xl border border-kindred-border text-sm text-kindred-text focus:outline-none focus:border-kindred-purple focus:ring-2 focus:ring-kindred-purple/20 transition-all resize-none"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-kindred-cardSecondary border border-kindred-border flex items-start gap-3">
                  <span className="material-symbols-outlined text-kindred-purple text-lg mt-0.5">
                    lock
                  </span>
                  <p className="text-xs text-kindred-muted leading-relaxed">
                    Phần câu chuyện là <strong>tùy chọn</strong>. Bạn có thể chia sẻ ngay hoặc bổ sung bất cứ lúc nào trong trang <strong>Hồ sơ cá nhân</strong>. Dữ liệu chỉ dùng để ghép nối tần số với người đồng điệu.
                  </p>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="flex items-center gap-3 pt-8 mt-6 border-t border-kindred-border">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading || stepTransitioning}
                  className="px-6 py-3 rounded-2xl text-sm font-semibold text-kindred-text bg-kindred-cardSecondary hover:bg-gray-100 transition-colors"
                >
                  Quay lại
                </button>
              )}

              {step < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={stepTransitioning}
                  className="flex-1 py-3 px-6 rounded-2xl text-sm font-bold bg-kindred-purple text-white hover:bg-kindred-hover shadow-sm transition-all inline-flex items-center justify-center gap-1.5"
                >
                  Tiếp tục
                  <span className="material-symbols-outlined text-lg">arrow_forward</span>
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || stepTransitioning}
                  className="flex-1 py-3 px-6 rounded-2xl text-sm font-bold bg-kindred-purple text-white hover:bg-kindred-hover shadow-md transition-all inline-flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                      Đang phân tích & ghép nối...
                    </>
                  ) : form.story?.trim() || form.what_you_want_others_to_understand?.trim() ? (
                    <>
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                      Lưu hồ sơ & Khám phá kết nối
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-lg">explore</span>
                      Bỏ qua câu chuyện & Khám phá kết nối
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
