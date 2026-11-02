import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi import HTTPException
from sqlalchemy import text
from app.db.database import Base, SessionLocal, engine
from app.models.block import Block
from app.models.connection import Connection
from app.models.report import Report
from app.models.user import User
from app.schemas.report import ReportCreate
from app.services import chat_service, connection_service, matching_service, report_service

# Đảm bảo các bảng mới (blocks, reports) đã được tạo trong SQLite DB
Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    try:
        cols = [r[1] for r in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
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


from fastapi import HTTPException
from app.core.security import hash_password
from app.db.database import Base, SessionLocal, engine
from app.models.block import Block
from app.models.connection import Connection
from app.models.profile import Profile
from app.models.report import Report
from app.models.survey import SurveyAnswer
from app.models.user import User
from app.schemas.report import ReportCreate
from app.services import chat_service, connection_service, matching_service, report_service


def ensure_test_user(db, username: str, email: str, display_name: str) -> User:
    u = db.query(User).filter(User.username == username).first()
    if not u:
        u = User(
            username=username,
            email=email,
            password_hash=hash_password("password123"),
            auth_provider="local",
            is_active=True,
        )
        db.add(u)
        db.commit()
        db.refresh(u)

    p = db.query(Profile).filter(Profile.user_id == u.id).first()
    if not p:
        p = Profile(user_id=u.id, display_name=display_name, bio=f"Hồ sơ của {display_name}")
        db.add(p)
        db.commit()

    s = db.query(SurveyAnswer).filter(SurveyAnswer.user_id == u.id).first()
    if not s:
        s = SurveyAnswer(
            user_id=u.id,
            age_group="23-27",
            current_status="Đi làm",
            life_situation="Muốn học hỏi và kết nối bạn bè",
            recent_feelings=["Hào hứng"],
            goals=["Học lập trình"],
            community_expectations=["Chia sẻ kiến thức"],
            topics=["Công nghệ", "AI"],
            free_time_activities=["Đọc sách", "Coding"],
            desired_connection_types=["Bạn bè"],
            preferred_mode="Nhắn tin",
            discovery_preference="Cùng sở thích",
        )
        db.add(s)
        db.commit()

    return u


def test_block_and_report_flow():
    db = SessionLocal()
    try:
        alice = ensure_test_user(db, "alice_dev", "alice@example.com", "Alice Developer")
        bob = ensure_test_user(db, "bob_coder", "bob@example.com", "Bob Coder")
        quang = ensure_test_user(db, "quang_tech", "quang@example.com", "Quang Tech")

        print("--- [1] Dọn dẹp dữ liệu cũ giữa Alice và Bob ---")
        db.query(Report).filter(
            ((Report.reporter_id == alice.id) & (Report.reported_id == bob.id))
            | ((Report.reporter_id == bob.id) & (Report.reported_id == alice.id))
        ).delete()
        db.query(Block).filter(
            ((Block.blocker_id == alice.id) & (Block.blocked_id == bob.id))
            | ((Block.blocker_id == bob.id) & (Block.blocked_id == alice.id))
        ).delete()
        db.commit()

        # Tạo sẵn conversation giữa Alice và Bob để kiểm tra chat
        conv_dto = chat_service.get_or_create_conversation(db, alice, bob.id)
        conv_id = conv_dto.id

        print("--- [2] Test Báo cáo vi phạm (Report) ---")
        # 2.1 Không thể tự báo cáo chính mình
        try:
            report_service.create_report(
                db, alice, ReportCreate(reported_id=alice.id, reason="Spam", description="Self report")
            )
            assert False, "Should fail on self-report"
        except HTTPException as e:
            assert e.status_code == 400
            print("  ✓ Chặn tự báo cáo chính mình thành công (HTTP 400)")

        # 2.2 Alice báo cáo Bob
        rep = report_service.create_report(
            db,
            alice,
            ReportCreate(
                reported_id=bob.id,
                reason="Quấy rối",
                description="Người dùng gửi tin nhắn làm phiền",
            ),
        )
        assert rep.id is not None
        assert rep.reporter_id == alice.id
        assert rep.reported_id == bob.id
        assert rep.reason == "Quấy rối"
        assert rep.status == "pending"
        print(f"  ✓ Tạo báo cáo vi phạm thành công: ID {rep.id}, status={rep.status}")

        print("--- [3] Test Chặn người dùng (Block) ---")
        # 3.1 Không thể tự chặn chính mình
        try:
            report_service.block_user(db, alice, alice.id)
            assert False, "Should fail on self-block"
        except HTTPException as e:
            assert e.status_code == 400
            print("  ✓ Chặn tự chặn chính mình thành công (HTTP 400)")

        # 3.2 Alice chặn Bob
        block_res = report_service.block_user(db, alice, bob.id)
        assert block_res.success is True
        print("  ✓ Alice chặn Bob thành công")

        # 3.3 Kiểm tra helper is_user_blocked
        is_blocked, blocker_id = report_service.is_user_blocked(db, alice.id, bob.id)
        assert is_blocked is True
        assert blocker_id == alice.id
        # Chiều ngược lại cũng phải phát hiện là bị chặn
        is_blocked_rev, blocker_id_rev = report_service.is_user_blocked(db, bob.id, alice.id)
        assert is_blocked_rev is True
        assert blocker_id_rev == alice.id
        print("  ✓ is_user_blocked phát hiện quan hệ chặn 2 chiều chính xác")

        # 3.4 Kiểm tra danh sách người đã chặn (get_blocked_users)
        blocked_list = report_service.get_blocked_users(db, alice)
        assert any(b.user_id == bob.id for b in blocked_list)
        print(f"  ✓ Danh sách người Alice đã chặn chứa Bob (Tổng: {len(blocked_list)})")

        print("--- [4] Test Quy tắc nghiệp vụ khi bị chặn ---")
        # 4.1 Discover / Matching: Cả Alice và Bob đều không thấy nhau
        matches_alice = matching_service.get_user_matches(db, alice)
        assert not any(m.user.id == bob.id for m in matches_alice.matches)
        matches_bob = matching_service.get_user_matches(db, bob)
        assert not any(m.user.id == alice.id for m in matches_bob.matches)
        print("  ✓ Discover loại bỏ hoàn toàn đối phương khi một trong 2 đã chặn nhau")

        # 4.2 Gửi lời mời kết nối bị chặn
        try:
            connection_service.send_connection_request(db, bob, alice.id)
            assert False, "Should fail connection when blocked"
        except HTTPException as e:
            assert e.status_code == 400
            print("  ✓ Bob gửi kết nối tới Alice bị chặn (HTTP 400)")

        try:
            connection_service.send_connection_request(db, alice, bob.id)
            assert False, "Should fail connection when blocked"
        except HTTPException as e:
            assert e.status_code == 400
            print("  ✓ Alice gửi kết nối tới Bob bị chặn (HTTP 400)")

        # 4.3 Trò chuyện: Cuộc hội thoại đánh dấu is_blocked và cấm gửi tin nhắn
        conv_for_alice = chat_service.to_conversation_response(
            db, db.query(chat_service.Conversation).get(conv_id), alice
        )
        assert conv_for_alice.is_blocked is True
        assert conv_for_alice.blocked_by_me is True

        conv_for_bob = chat_service.to_conversation_response(
            db, db.query(chat_service.Conversation).get(conv_id), bob
        )
        assert conv_for_bob.is_blocked is True
        assert conv_for_bob.blocked_by_me is False
        print("  ✓ Thông tin cuộc hội thoại phản ánh chính xác trạng thái is_blocked & blocked_by_me")

        # 4.4 Thử gửi tin nhắn mới khi đang bị chặn
        try:
            chat_service.create_message(db, conv_id, alice.id, "Hello after block")
            assert False, "Should forbid message when blocked"
        except HTTPException as e:
            assert e.status_code == 403
            print("  ✓ Alice gửi tin nhắn bị chặn (HTTP 403)")

        try:
            chat_service.create_message(db, conv_id, bob.id, "Hello from Bob")
            assert False, "Should forbid message when blocked"
        except HTTPException as e:
            assert e.status_code == 403
            print("  ✓ Bob gửi tin nhắn bị chặn (HTTP 403)")

        print("--- [5] Test Bỏ chặn (Unblock) ---")
        # 5.1 Bob không có quyền bỏ chặn Alice (vì Alice là người chặn)
        try:
            report_service.unblock_user(db, bob, alice.id)
            assert False, "Bob should not be able to unblock Alice"
        except HTTPException as e:
            assert e.status_code == 404
            print("  ✓ Người bị chặn không thể unblock người chặn (HTTP 404)")

        # 5.2 Alice bỏ chặn Bob
        unblock_res = report_service.unblock_user(db, alice, bob.id)
        assert unblock_res.success is True
        print("  ✓ Alice bỏ chặn Bob thành công")

        # 5.3 Sau khi bỏ chặn, có thể gửi tin nhắn bình thường
        new_msg = chat_service.create_message(db, conv_id, alice.id, "Xin chào Bob sau khi unblock!")
        assert new_msg.id is not None
        assert new_msg.content == "Xin chào Bob sau khi unblock!"
        print(f"  ✓ Gửi tin nhắn thành công sau khi bỏ chặn: ID {new_msg.id}")

        print("\n🎉 ALL BLOCK & REPORT BACKEND TESTS PASSED SUCCESSFULLY! 🎉\n")
        return True

    finally:
        db.close()


if __name__ == "__main__":
    success = test_block_and_report_flow()
    if not success:
        sys.exit(1)
