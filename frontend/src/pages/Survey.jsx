import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
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

function Survey() {
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
    // Chống bấm đúp chuột từ bước trước ăn vào nút submit của bước sau
    setStepTransitioning(true)
    setTimeout(() => {
      setStepTransitioning(false)
    }, 600)
  }

  const handleBack = () => {
    setError('')
    setStep((prev) => Math.max(prev - 1, 1))
    setStepTransitioning(true)
    setTimeout(() => {
      setStepTransitioning(false)
    }, 400)
  }

  const handleSubmit = async (e) => {
    if (e) e.preventDefault()
    // Nếu vừa mới chuyển sang bước cuối dưới 600ms thì chặn để tránh click đúp ngoài ý muốn
    if (stepTransitioning || loading) {
      return
    }

    const errMsg = validateCurrentStep()
    if (errMsg) {
      setError(errMsg)
      return
    }

    setLoading(true)
    setError('')
    try {
      await submitSurvey(form)
      navigate('/home')
    } catch (err) {
      console.error('Lỗi nộp survey:', err)
      setError(err.response?.data?.detail || 'Không thể lưu kết quả khảo sát. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  // Component Thẻ Chọn (Select Card) - Không còn ô vuông/tròn thô kệch
  const SelectCard = ({ label, isSelected, onClick, isMulti = false }) => {
    return (
      <div
        onClick={onClick}
        style={{
          padding: '14px 18px',
          borderRadius: '12px',
          border: isSelected ? '2px solid #245745' : '1.5px solid #e5e7eb',
          backgroundColor: isSelected ? '#e1efe8' : '#ffffff',
          color: isSelected ? '#2e5948' : '#374151',
          fontWeight: isSelected ? 600 : 400,
          fontSize: '15px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          transition: 'all 0.15s ease',
          boxShadow: isSelected ? '0 2px 8px rgba(36, 87, 69, 0.15)' : 'none',
          userSelect: 'none',
        }}
      >
        <span>{label}</span>
        {isSelected && (
          <span
            style={{
              width: '20px',
              height: '20px',
              borderRadius: isMulti ? '6px' : '50%',
              backgroundColor: '#245745',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            <Check size={14} aria-hidden="true" />
          </span>
        )}
      </div>
    )
  }

  if (initialLoading) {
    return (
      <div className="survey-page">
        <Navbar />
        <button
          type="button"
          className="survey-page-close"
          onClick={() => navigate('/home')}
          aria-label="Đóng khảo sát"
        >
          <X size={20} aria-hidden="true" />
        </button>
        <p style={{ color: '#6b7280' }}>Đang tải khảo sát...</p>
      </div>
    )
  }

  return (
    <div className="survey-page">
      <Navbar />
      <button
        type="button"
        className="survey-page-close"
        onClick={() => navigate('/home')}
        aria-label="Đóng khảo sát"
      >
        <X size={20} aria-hidden="true" />
      </button>
      <div className="card" style={{ maxWidth: '620px', padding: '36px' }}>
        {/* Progress Bar */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#245745', textTransform: 'uppercase' }}>
              Bước {step} / {totalSteps}
            </span>
            <span style={{ fontSize: '13px', color: '#9ca3af' }}>
              {Math.round((step / totalSteps) * 100)}% hoàn thành
            </span>
          </div>
          <div style={{ height: '6px', width: '100%', backgroundColor: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${(step / totalSteps) * 100}%`,
                background: 'linear-gradient(90deg, #245745, #3d705c)',
                transition: 'width 0.3s ease',
              }}
            ></div>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={step === totalSteps ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }}>
          {/* BƯỚC 1: ABOUT YOU */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Về bạn</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                Giúp chúng tôi hiểu độ tuổi và tình trạng hiện tại của bạn.
              </p>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ fontWeight: 600, marginBottom: '10px' }}>Độ tuổi của bạn</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                  {AGE_GROUPS.map((age) => (
                    <SelectCard
                      key={age}
                      label={age}
                      isSelected={form.age_group === age}
                      onClick={() => handleSelectRadio('age_group', age)}
                    />
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, marginBottom: '10px' }}>Tình trạng hiện tại</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Hoàn cảnh & Cảm xúc</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                Những gì bạn đang trải qua sẽ giúp kết nối với người thực sự thấu hiểu.
              </p>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ fontWeight: 600, marginBottom: '10px' }}>Hoàn cảnh hiện tại của bạn</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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

              <div className="form-group">
                <label style={{ fontWeight: 600, marginBottom: '10px' }}>Cảm xúc gần đây (chọn nhiều)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Mục tiêu & Kỳ vọng</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                Bạn tìm kiếm điều gì khi tham gia cộng đồng này?
              </p>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ fontWeight: 600, marginBottom: '10px' }}>Mục tiêu của bạn (chọn nhiều)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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

              <div className="form-group">
                <label style={{ fontWeight: 600, marginBottom: '10px' }}>Kỳ vọng từ cộng đồng (chọn nhiều)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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

          {/* BƯỚC 4: INTERESTS & ACTIVITIES */}
          {step === 4 && (
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Sở thích & Thói quen</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                Những chủ đề và sở thích giúp gắn kết bạn với những người chung tần số.
              </p>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ fontWeight: 600, marginBottom: '10px' }}>Chủ đề bạn quan tâm (chọn nhiều)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {TOPIC_OPTIONS.map((topic) => {
                    const isChecked = form.topics.includes(topic)
                    return (
                      <button
                        type="button"
                        key={topic}
                        onClick={() => handleToggleCheckbox('topics', topic)}
                        style={{
                          padding: '10px 16px',
                          borderRadius: '24px',
                          border: isChecked ? '2px solid #245745' : '1.5px solid #e5e7eb',
                          backgroundColor: isChecked ? '#245745' : '#ffffff',
                          color: isChecked ? '#ffffff' : '#374151',
                          fontSize: '14px',
                          fontWeight: isChecked ? 600 : 400,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isChecked ? '0 2px 8px rgba(36, 87, 69, 0.25)' : 'none',
                        }}
                      >
                        {isChecked && <Check size={14} aria-hidden="true" />} {topic}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, marginBottom: '10px' }}>Hoạt động khi rảnh rỗi (chọn nhiều)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Gu kết nối của bạn</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                Bạn muốn kết nối và trò chuyện theo cách nào?
              </p>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ fontWeight: 600, marginBottom: '10px' }}>Hình thức kết nối mong muốn (chọn nhiều)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ fontWeight: 600, marginBottom: '10px' }}>Nhịp điệu trò chuyện ưu tiên</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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

              <div className="form-group">
                <label style={{ fontWeight: 600, marginBottom: '10px' }}>Sở thích khám phá</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px' }}>Câu chuyện của bạn (Tùy chọn)</h2>
              <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                Một vài dòng chia sẻ chân thành sẽ giúp người khác hiểu và đồng cảm với bạn hơn.
              </p>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ fontWeight: 600, marginBottom: '8px' }}>
                  Một câu chuyện ngắn hoặc điều bạn đang trải qua
                </label>
                <textarea
                  rows={4}
                  placeholder="Ví dụ: Mình là người hướng nội mới chuyển đến thành phố mới, đôi lúc thấy lạc lõng và muốn tìm người bạn để tâm sự..."
                  value={form.story}
                  onChange={(e) => setForm({ ...form, story: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, marginBottom: '8px' }}>
                  Điều bạn muốn người khác hiểu về mình nhất
                </label>
                <textarea
                  rows={3}
                  placeholder="Ví dụ: Mình phản hồi tin nhắn hơi chậm nhưng luôn lắng nghe chân thành..."
                  value={form.what_you_want_others_to_understand}
                  onChange={(e) =>
                    setForm({ ...form, what_you_want_others_to_understand: e.target.value })
                  }
                  style={{
                    width: '100%',
                    padding: '14px',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 16px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '10px',
                  fontSize: '13px',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>💡</span>
                <span>
                  Phần câu chuyện là <strong>tùy chọn</strong>. Bạn có thể chia sẻ ngay bây giờ hoặc cập nhật lại bất kỳ lúc nào trong trang <strong>Hồ sơ cá nhân</strong>.
                </span>
              </div>
            </div>
          )}

          {/* Buttons Navigation */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            {step > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="btn-secondary"
                style={{ flex: 1, padding: '14px' }}
                disabled={loading || stepTransitioning}
              >
                Quay lại
              </button>
            )}

            {step < totalSteps ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary"
                style={{ flex: 2, padding: '14px' }}
                disabled={stepTransitioning}
              >
                Tiếp tục
              </button>
            ) : (
              <button
                type="submit"
                className="btn-primary"
                style={{
                  flex: 2,
                  padding: '14px',
                  opacity: stepTransitioning ? 0.7 : 1,
                  transition: 'opacity 0.2s ease',
                }}
                disabled={loading || stepTransitioning}
              >
                {loading
                  ? 'Đang lưu kết quả...'
                  : form.story?.trim() || form.what_you_want_others_to_understand?.trim()
                  ? 'Lưu câu chuyện & Hoàn thành'
                  : 'Bỏ qua & Hoàn thành'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default Survey
