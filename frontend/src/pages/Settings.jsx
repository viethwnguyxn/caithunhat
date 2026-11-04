import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../contexts/AuthContext'

export default function Settings() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [activeTab, setActiveTab] = useState('account')
  const signOut = () => { logout(); navigate('/login') }
  return <div className="lp-settings-page"><Navbar /><main className="lp-settings-wrap">
    <div className="lp-settings-heading"><span className="lp-eyebrow">LA PULGA / ACCOUNT</span><h1>Cài đặt</h1><p>Quản lý tài khoản và quyền riêng tư của bạn.</p></div>
    <div className="lp-settings-layout"><aside className="lp-settings-menu">
      <button className={activeTab === 'account' ? 'active' : ''} onClick={() => setActiveTab('account')}>Tài khoản</button>
      <button className={activeTab === 'privacy' ? 'active' : ''} onClick={() => setActiveTab('privacy')}>Quyền riêng tư</button>
      <button className={activeTab === 'security' ? 'active' : ''} onClick={() => setActiveTab('security')}>Bảo mật</button>
    </aside><section className="lp-settings-card">
      {activeTab === 'account' && <><h2>Thông tin tài khoản</h2><p className="lp-settings-muted">Thông tin định danh đang được sử dụng trong La Pulga.</p><div className="lp-settings-row"><span>Tên người dùng</span><strong>{user?.username || 'Chưa cập nhật'}</strong></div><div className="lp-settings-row"><span>Email</span><strong>{user?.email || 'Không có thông tin email'}</strong></div><div className="lp-settings-row"><span>Vai trò</span><strong>{user?.role || 'Thành viên'}</strong></div><button className="lp-settings-action" onClick={() => navigate('/profile')}>Chỉnh sửa hồ sơ ↗</button></>}
      {activeTab === 'privacy' && <><h2>Quyền riêng tư</h2><p className="lp-settings-muted">Các câu trả lời khảo sát là thông tin cá nhân.</p><div className="lp-settings-privacy"><span className="lp-lock">⌑</span><div><strong>Thông tin khảo sát</strong><p>Chỉ bạn có thể xem câu trả lời khảo sát của mình. Thông tin này không hiển thị trên hồ sơ công khai.</p></div></div><button className="lp-settings-action" onClick={() => navigate('/survey')}>Xem khảo sát của tôi ↗</button></>}
      {activeTab === 'security' && <><h2>Bảo mật tài khoản</h2><p className="lp-settings-muted">Kết thúc phiên đăng nhập khi sử dụng xong thiết bị dùng chung.</p><div className="lp-logout-panel"><div><strong>Đăng xuất khỏi La Pulga</strong><p>Đăng xuất khỏi thiết bị này.</p></div><button onClick={() => setConfirmLogout(true)}>Đăng xuất</button></div></>}
      {confirmLogout && <div className="lp-confirm-backdrop"><div className="lp-confirm-box"><h3>Đăng xuất?</h3><p>Bạn có chắc muốn đăng xuất khỏi tài khoản này không?</p><div><button onClick={() => setConfirmLogout(false)}>Ở lại</button><button className="danger" onClick={signOut}>Đăng xuất</button></div></div></div>}
    </section></div></main></div>
}
