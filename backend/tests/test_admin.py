import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi import HTTPException
from sqlalchemy import text
from app.core.security import hash_password
from app.db.database import Base, SessionLocal, engine
from app.models.profile import Profile
from app.models.report import Report
from app.models.user import User
from app.schemas.admin import AdminReportUpdate
from app.schemas.report import ReportCreate
from app.services import admin_service, report_service, user_service

# Đảm bảo các bảng và cột mới đã được đồng bộ
Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    try:
        cols = [r[1] for r in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
        if "role" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' NOT NULL"))
        if "auth_provider" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'local' NOT NULL"))
        if "avatar_url" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)"))
        if "is_online" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT 0 NOT NULL"))
        if "last_seen" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_seen DATETIME"))
        conn.commit()
    except Exception:
        pass


def ensure_user(db, username, email, role="user"):
    u = db.query(User).filter(User.username == username).first()
    if not u:
        u = User(
            username=username,
            email=email,
            password_hash=hash_password("password123"),
            auth_provider="local",
            role=role,
            is_active=True,
        )
        db.add(u)
        db.commit()
        db.refresh(u)
    else:
        if u.role != role:
            u.role = role
            db.commit()
    p = db.query(Profile).filter(Profile.user_id == u.id).first()
    if not p:
        p = Profile(user_id=u.id, display_name=f"Hồ sơ {username}", bio=f"Bio của {username}")
        db.add(p)
        db.commit()
    return u


def test_admin_flow():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("🚀 BẮT ĐẦU CHẠY TEST ADMIN DASHBOARD & MODERATION SYSTEM")
        print("=" * 60)

        # 1. Khởi tạo dữ liệu người dùng
        admin = ensure_user(db, "admin", "admin@kindred.local", role="admin")
        alice = ensure_user(db, "alice_dev", "alice@example.com", role="user")
        bob = ensure_user(db, "bob_coder", "bob@example.com", role="user")

        print("\n--- [1] KIỂM TRA PHÂN QUYỀN (AUTHORIZATION) ---")
        # Giả lập get_current_admin cho user thường (Alice)
        from app.routers.deps import get_current_admin
        try:
            get_current_admin(current_user=alice)
            assert False, "User thường không được phép truy cập get_current_admin"
        except HTTPException as e:
            assert e.status_code == 403
            print(f"  ✓ User thường bị chặn với HTTP 403: {e.detail}")

        # Giả lập get_current_admin cho admin
        admin_auth = get_current_admin(current_user=admin)
        assert admin_auth.id == admin.id
        print("  ✓ Admin vượt qua phân quyền get_current_admin thành công")

        print("\n--- [2] KIỂM TRA THỐNG KÊ HỆ THỐNG (ADMIN STATS) ---")
        stats = admin_service.get_admin_stats(db)
        assert stats.total_users >= 3
        assert stats.active_users >= 1
        print(f"  ✓ Thống kê chính xác: Tổng {stats.total_users} Users, {stats.active_users} Hoạt động, {stats.pending_reports} Reports chờ")

        print("\n--- [3] KIỂM TRA QUẢN LÝ NGƯỜI DÙNG (USER MANAGEMENT) ---")
        # 3.1 Danh sách người dùng
        all_users = admin_service.get_all_users(db)
        assert len(all_users) >= 3
        assert any(u.username == "admin" for u in all_users)
        print(f"  ✓ Lấy danh sách thành công: {len(all_users)} tài khoản")

        # 3.2 Tìm kiếm người dùng
        search_res = admin_service.get_all_users(db, search="alice")
        assert any(u.username == "alice_dev" for u in search_res)
        assert not any(u.username == "bob_coder" for u in search_res)
        print("  ✓ Tìm kiếm người dùng theo từ khóa hoạt động chuẩn xác")

        # 3.3 Chặn admin tự khóa chính mình
        try:
            admin_service.toggle_user_status(db, admin, admin.id)
            assert False, "Admin không thể tự khóa chính mình"
        except HTTPException as e:
            assert e.status_code == 400
            print("  ✓ Chặn admin tự khóa tài khoản của bản thân thành công (HTTP 400)")

        # 3.4 Khóa tài khoản Alice
        lock_res = admin_service.toggle_user_status(db, admin, alice.id)
        assert lock_res.is_active is False
        print("  ✓ Admin khóa tài khoản Alice thành công (is_active = False)")

        # 3.5 Thử đăng nhập bằng tài khoản bị khóa -> Bị từ chối HTTP 403
        try:
            user_service.authenticate_user(db, "alice@example.com", "password123")
            assert False, "Tài khoản bị khóa không được phép đăng nhập"
        except HTTPException as e:
            assert e.status_code == 403
            print(f"  ✓ Tài khoản bị khóa không thể đăng nhập (HTTP 403): {e.detail}")

        # 3.6 Mở khóa lại cho Alice
        unlock_res = admin_service.toggle_user_status(db, admin, alice.id)
        assert unlock_res.is_active is True
        print("  ✓ Admin mở khóa tài khoản Alice thành công (is_active = True)")

        # 3.7 Đăng nhập lại bình thường sau khi mở khóa
        auth_alice = user_service.authenticate_user(db, "alice@example.com", "password123")
        assert auth_alice.id == alice.id
        print("  ✓ Alice đăng nhập lại bình thường sau khi được mở khóa")

        print("\n--- [4] KIỂM TRA KIỂM DUYỆT BÁO CÁO VI PHẠM (REPORTS MODERATION) ---")
        # 4.1 Tạo một báo cáo vi phạm mới từ Alice nhắm vào Bob
        rep = report_service.create_report(
            db,
            alice,
            ReportCreate(
                reported_id=bob.id,
                reason="Lừa đảo",
                description="Tài khoản có dấu hiệu gửi link giả mạo",
            ),
        )
        assert rep.id is not None
        print(f"  ✓ Tạo đơn báo cáo kiểm thử ID {rep.id}")

        # 4.2 Lấy danh sách báo cáo pending
        pending_reports = admin_service.get_all_reports(db, status_filter="pending")
        assert any(r.id == rep.id for r in pending_reports)
        target_rep = next(r for r in pending_reports if r.id == rep.id)
        assert target_rep.reporter.username == "alice_dev"
        assert target_rep.reported.username == "bob_coder"
        print("  ✓ Admin truy vấn danh sách đơn báo cáo pending đầy đủ thông tin")

        # 4.3 Xử lý duyệt đơn vi phạm và khóa luôn tài khoản người bị tố cáo
        res_rep = admin_service.update_report_status(
            db,
            rep.id,
            AdminReportUpdate(status="resolved", lock_reported_user=True),
        )
        assert res_rep.status == "resolved"
        # Kiểm tra Bob đã bị khóa
        bob_db = db.query(User).filter(User.id == bob.id).first()
        assert bob_db.is_active is False
        print("  ✓ Admin duyệt vi phạm 'resolved' và khóa tài khoản vi phạm (Bob) thành công")

        # Khôi phục Bob để không ảnh hưởng dữ liệu sau test
        admin_service.toggle_user_status(db, admin, bob.id)
        print("  ✓ Khôi phục trạng thái Bob sau test")

        print("\n" + "=" * 60)
        print("🎉 TOÀN BỘ CÁC TEST CASES ADMIN & MODERATION ĐÃ PASS 100%! 🎉")
        print("=" * 60 + "\n")
        return True

    finally:
        db.close()


if __name__ == "__main__":
    if not test_admin_flow():
        sys.exit(1)

