import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight, Check, FileText, Pencil } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getProfile, updateProfile } from '../services/profileService'
import Navbar from '../components/Navbar'

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    display_name: '',
    avatar_url: '',
    bio: '',
    age_group: '',
    current_status: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const showToast = (type, text) => {
    setMessage({ type, text })
    setTimeout(() => setMessage({ type: '', text: '' }), 3500)
  }

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getProfile()
        setForm({
          display_name: data.display_name || '',
          avatar_url: data.avatar_url || '',
          bio: data.bio || '',
          age_group: data.age_group || '',
          current_status: data.current_status || '',
        })
      } catch (err) {
        console.error('Lỗi khi tải profile:', err)
        showToast('error', 'Không thể tải thông tin profile. Vui lòng thử lại sau.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [user?.id])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    if (message.text) setMessage({ type: '', text: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    try {
      await updateProfile(form)
      showToast('success', 'Cập nhật thông tin Profile thành công!')
    } catch (err) {
      console.error('Lỗi khi cập nhật profile:', err)
      showToast(
        'error',
        err.response?.data?.detail || 'Không thể cập nhật profile. Vui lòng thử lại.'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const avatarSrc =
    form.avatar_url ||
    `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user?.username || 'user')}`

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f7faf8' }}>
      <Navbar />

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '36px 16px 64px' }}>
        <div className="card" style={{ maxWidth: '100%', padding: '36px' }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h1 style={{ fontSize: '24px', margin: 0, color: '#1a1a2e' }}>Thông tin cá nhân</h1>
              <p style={{ color: '#6b7280', fontSize: '13.5px', margin: '4px 0 0 0' }}>
                Thông tin công khai hiển thị với bạn bè và cộng đồng La Pulga
              </p>
            </div>
            <Link
              to="/discover"
              style={{
                fontSize: '13px',
                color: '#245745',
                fontWeight: 700,
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: '#e1efe8',
              }}
            >
              Khám phá <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>

          {/* Feedback message */}
          {message.text && (
            <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {message.type === 'success'
                ? <Check size={16} aria-hidden="true" />
                : <AlertTriangle size={16} aria-hidden="true" />}
              <span>{message.text}</span>
            </div>
          )}

          {/* Avatar Preview Section */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              padding: '16px',
              backgroundColor: '#f3f7f4',
              borderRadius: '16px',
              border: '1px solid #dce8e2',
              marginBottom: '24px',
            }}
          >
            <img
              src={avatarSrc}
              alt="Avatar preview"
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #245745',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 8px rgba(36, 87, 69, 0.2)',
              }}
              onError={(e) => {
                e.target.src = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                  user?.username || 'user'
                )}`
              }}
            />

            <div>
              <div style={{ fontWeight: 800, fontSize: '16px', color: '#1a1a2e' }}>
                {form.display_name || user?.username}
              </div>
              <div style={{ color: '#6b7280', fontSize: '13px' }}>@{user?.username}</div>
              <div style={{ color: '#9ca3af', fontSize: '12px' }}>{user?.email}</div>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#6b7280' }}>
              Đang tải thông tin hồ sơ...
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="display_name">Tên hiển thị (Display Name)</label>
                <input
                  id="display_name"
                  type="text"
                  name="display_name"
                  placeholder="Tên bạn muốn mọi người gọi"
                  value={form.display_name}
                  onChange={handleChange}
                  maxLength={100}
                />
              </div>

              <div className="form-group">
                <label htmlFor="avatar_url">URL Ảnh đại diện (tùy chọn)</label>
                <input
                  id="avatar_url"
                  type="url"
                  name="avatar_url"
                  placeholder="https://images.unsplash.com/... hoặc để trống để tạo avatar tự động"
                  value={form.avatar_url}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="bio">Giới thiệu bản thân (Bio)</label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={3}
                  placeholder="Vài dòng chia sẻ về sở thích, câu chuyện, phong cách sống..."
                  value={form.bio}
                  onChange={handleChange}
                  maxLength={1000}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div className="form-group">
                  <label htmlFor="age_group">Nhóm độ tuổi</label>
                  <select
                    id="age_group"
                    name="age_group"
                    value={form.age_group}
                    onChange={handleChange}
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

                <div className="form-group">
                  <label htmlFor="current_status">Tình trạng hiện tại</label>
                  <select
                    id="current_status"
                    name="current_status"
                    value={form.current_status}
                    onChange={handleChange}
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

              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
                style={{ marginTop: '12px' }}
              >
                {saving ? 'Đang lưu thay đổi...' : 'Lưu hồ sơ cá nhân'}
              </button>
            </form>
          )}

          {/* Card Khảo sát kết nối & Câu chuyện */}
          <div
            style={{
              marginTop: '28px',
              padding: '20px',
              borderRadius: '16px',
              border: '1.5px solid #dce8e2',
              backgroundColor: '#f1f7f3',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#5b21b6', marginBottom: '4px' }}>
                <FileText size={16} aria-hidden="true" /> Khảo sát kết nối & Câu chuyện cá nhân
              </h3>
              <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
                Cập nhật hoàn cảnh sống, gu kết nối, cảm xúc và câu chuyện của bạn để tìm người đồng điệu hơn.
              </p>
            </div>
            <Link
              to="/survey"
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                textDecoration: 'none',
                fontWeight: 600,
                fontSize: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#ffffff',
                border: '1.5px solid #245745',
                color: '#245745',
                transition: 'all 0.2s ease',
              }}
            >
              <Pencil size={14} aria-hidden="true" /> Cập nhật Khảo sát
            </Link>
          </div>

          <section className="profile-account-settings">
            <div>
              <h3>Thông tin tài khoản</h3>
              <p>@{user?.username} · {user?.email}</p>
            </div>
            <button type="button" onClick={handleLogout}>
              Đăng xuất
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}
