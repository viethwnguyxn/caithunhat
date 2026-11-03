import os
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import jwt
from fastapi import HTTPException
from app.core.config import JWT_SECRET_KEY, JWT_ALGORITHM
from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)
from app.db.database import SessionLocal
from app.models.user import User
from app.models.profile import Profile
from app.models.survey import SurveyAnswer
from app.models.connection import Connection
from app.models.chat import Conversation, ConversationMember, Message
from app.models.notification import Notification
from app.schemas.user import UserCreate, UserResponse
from app.schemas.profile import ProfileUpdate
from app.schemas.survey import SurveyCreate
from app.services import (
    user_service,
    profile_service,
    survey_service,
    matching_service,
    connection_service,
    chat_service,
    notification_service,
)
from app.websocket.manager import manager


def run_full_backend_test_suite():
    print("=" * 60)
    print("🚀 BẮT ĐẦU CHẠY TOÀN BỘ TEST SUITE BACKEND (TASK 14)")
    print("=" * 60)

    db = SessionLocal()
    try:
        # =====================================================================
        # 1. AUTHENTICATION & SECURITY TESTS
        # =====================================================================
        print("\n--- [1/7] KIỂM TRA AUTHENTICATION & SECURITY ---")

        # Test hashing
        pwd = "SecretPassword123!"
        hashed = hash_password(pwd)
        assert verify_password(pwd, hashed) is True, "Password verification failed"
        assert verify_password("WrongPassword", hashed) is False, "Password verification should fail for wrong password"
        print("✓ Hashing & Verify Password: OK")

        # Test JWT generation & decoding
        token = create_access_token("999")
        payload = decode_access_token(token)
        assert payload is not None and payload.get("sub") == "999", "JWT decoding failed"

        # Test expired JWT
        past_time = datetime.now(timezone.utc) - timedelta(minutes=10)
        expired_token = jwt.encode(
            {"sub": "999", "exp": past_time},
            JWT_SECRET_KEY,
            algorithm=JWT_ALGORITHM,
        )
        expired_payload = decode_access_token(expired_token)
        assert expired_payload is None, "Expired token should return None"

        # Test invalid JWT
        invalid_payload = decode_access_token("invalid.token.structure")
        assert invalid_payload is None, "Invalid token should return None"
        print("✓ JWT Token (Valid, Expired, Invalid): OK")

        # Test User Registration & Duplicates
        test_user_email = "test_suite_user@example.com"
        test_user_name = "test_suite_user"
        existing = db.query(User).filter((User.username == test_user_name) | (User.email == test_user_email)).first()
        if existing:
            # Clean up previous test run data
            db.query(Notification).filter(Notification.user_id == existing.id).delete()
            db.query(Profile).filter(Profile.user_id == existing.id).delete()
            db.query(SurveyAnswer).filter(SurveyAnswer.user_id == existing.id).delete()
            db.delete(existing)
            db.commit()

        new_user = user_service.register_user(
            db=db,
            user_in=UserCreate(username=test_user_name, email=test_user_email, password=pwd),
        )
        assert new_user.id is not None
        assert new_user.username == test_user_name
        assert hasattr(new_user, "password_hash") and new_user.password_hash != pwd
        print(f"✓ Đăng ký tài khoản mới (User ID: {new_user.id}): OK")

        # Duplicate email check
        try:
            user_service.register_user(
                db=db,
                user_in=UserCreate(username="another_name", email=test_user_email, password=pwd),
            )
            assert False, "Should raise 400 for duplicate email"
        except HTTPException as e:
            assert e.status_code == 400
        print("✓ Chặn trùng lặp Email (400): OK")

        # Duplicate username check
        try:
            user_service.register_user(
                db=db,
                user_in=UserCreate(username=test_user_name, email="another@example.com", password=pwd),
            )
            assert False, "Should raise 400 for duplicate username"
        except HTTPException as e:
            assert e.status_code == 400
        print("✓ Chặn trùng lặp Username (400): OK")

        # Login with valid & invalid credentials
        auth_user = user_service.authenticate_user(db, test_user_email, pwd)
        assert auth_user is not None and auth_user.id == new_user.id
        try:
            user_service.authenticate_user(db, test_user_email, "WrongPassword")
            assert False, "Should raise 401 for wrong password"
        except HTTPException as e:
            assert e.status_code == 401
        print("✓ Đăng nhập (Đúng mật khẩu / Sai mật khẩu 401): OK")

        # Security: Schema response does NOT expose password_hash
        user_schema = UserResponse.model_validate(new_user)
        dumped = user_schema.model_dump()
        assert "password" not in dumped and "password_hash" not in dumped
        print("✓ Security: UserResponse không chứa password hoặc password_hash: OK")

        # =====================================================================
        # 2. PROFILE TESTS
        # =====================================================================
        print("\n--- [2/7] KIỂM TRA PROFILE ---")
        prof = profile_service.get_or_create_profile(db, new_user)
        assert prof is not None
        assert prof.user_id == new_user.id

        updated_prof = profile_service.update_user_profile(
            db=db,
            user=new_user,
            profile_in=ProfileUpdate(
                display_name="Test Suite Display",
                bio="Senior Tester Bio",
                age_group="23-27",
                current_status="Đi làm",
            ),
        )
        assert updated_prof.display_name == "Test Suite Display"
        assert updated_prof.bio == "Senior Tester Bio"
        assert updated_prof.age_group == "23-27"

        # Kiểm tra hồ sơ công khai qua cả 2 route function: /api/users/{id}/public và /api/profile/{id}
        from app.routers.users import get_user_public_profile
        from app.routers.profile import get_public_profile as get_profile_public

        res_p1 = get_user_public_profile(user_id=new_user.id, current_user=new_user, db=db)
        assert res_p1.display_name == "Test Suite Display"
        assert not hasattr(res_p1, "password") and not hasattr(res_p1, "email")

        res_p2 = get_profile_public(user_id=new_user.id, current_user=new_user, db=db)
        assert res_p2.display_name == "Test Suite Display"

        print("✓ Lấy và Cập nhật hồ sơ cá nhân & Hồ sơ công khai (cả 2 endpoints): OK")

        # =====================================================================
        # 3. SURVEY TESTS
        # =====================================================================
        print("\n--- [3/7] KIỂM TRA SURVEY ONBOARDING ---")
        survey_payload = SurveyCreate(
            age_group="23-27",
            current_status="Đi làm",
            life_situation="Công việc bận rộn, muốn tìm bạn bè cùng học hỏi",
            recent_feelings=["Cảm thấy cần mở rộng mạng lưới giao lưu"],
            goals=["Nâng cao kỹ năng, tìm bạn lập trình"],
            community_expectations=["Chia sẻ kinh nghiệm thực chiến"],
            topics=["Lập trình", "Công nghệ", "AI / ML"],
            free_time_activities=["Code dạo", "Đọc sách", "Chạy bộ"],
            desired_connection_types=["Bạn cùng tiến", "Đồng nghiệp chia sẻ"],
            preferred_mode="Cả hai (Online & Offline)",
            discovery_preference="Tương đồng tối đa",
            story="Tôi là một developer yêu thích Python và React, mong muốn kết nối cùng các bạn đồng điệu.",
        )
        saved_survey = survey_service.save_or_update_survey(db, new_user, survey_payload)
        assert saved_survey.id is not None
        assert saved_survey.topics == ["Lập trình", "Công nghệ", "AI / ML"]

        fetched_survey = survey_service.get_user_survey(db, new_user)
        assert fetched_survey is not None
        assert fetched_survey.age_group == "23-27"
        print("✓ Lưu và Truy vấn Survey Onboarding: OK")

        # =====================================================================
        # 4. MATCHING ENGINE TESTS
        # =====================================================================
        print("\n--- [4/7] KIỂM TRA MATCHING ENGINE (TF-IDF + COSINE SIMILARITY) ---")
        match_response = matching_service.get_user_matches(db, new_user, limit=5)
        matches = match_response.matches
        # Verify current user is excluded
        assert all(m.user.id != new_user.id for m in matches), "Current user MUST be excluded from matches"

        # Verify sorted in descending order
        scores = [m.match_score for m in matches]
        assert scores == sorted(scores, reverse=True), "Matches must be sorted descending by match score"

        # Verify score bounds and attributes
        for m in matches:
            assert 0 <= m.match_score <= 100, f"Invalid match score: {m.match_score}"
            assert isinstance(m.common_interests, list), "common_interests must be list"
            assert isinstance(m.match_reasons, list), "match_reasons must be list"
            assert m.user.username != new_user.username
        print(f"✓ Matching Engine trả về {len(matches)} ứng viên phù hợp (Top Score: {scores[0] if scores else 0}%): OK")

        # =====================================================================
        # 5. CONNECTION SYSTEM TESTS
        # =====================================================================
        print("\n--- [5/7] KIỂM TRA CONNECTION SYSTEM ---")
        alice = db.query(User).filter(User.username == "alice_dev").first()
        bob = db.query(User).filter(User.username == "bob_coder").first()
        assert alice and bob

        # Clean existing test connection between new_user and alice
        db.query(Connection).filter(
            ((Connection.requester_id == new_user.id) & (Connection.receiver_id == alice.id)) |
            ((Connection.requester_id == alice.id) & (Connection.receiver_id == new_user.id))
        ).delete()
        db.commit()

        # 1. Chặn tự gửi kết nối cho chính mình
        try:
            connection_service.send_connection_request(db, new_user, new_user.id)
            assert False, "Should raise 400 for self connection"
        except HTTPException as e:
            assert e.status_code == 400
        print("✓ Chặn tự kết nối chính mình (400): OK")

        # 2. Gửi lời mời kết nối tới Alice
        conn_req = connection_service.send_connection_request(db, new_user, alice.id)
        assert conn_req.status == "pending"

        # 3. Chặn gửi trùng lặp
        try:
            connection_service.send_connection_request(db, new_user, alice.id)
            assert False, "Should raise 400 for duplicate connection"
        except HTTPException as e:
            assert e.status_code == 400
        print("✓ Gửi lời mời & Chặn trùng lặp (400): OK")

        # 4. Chặn người ngoài accept (User thứ 3 không phải receiver)
        try:
            connection_service.accept_connection(db, conn_req.id, bob)
            assert False, "Should raise 403 when 3rd party accepts"
        except HTTPException as e:
            assert e.status_code == 403
        print("✓ Chặn người ngoài can thiệp lời mời kết nối (403): OK")

        # 5. Alice accept hợp lệ
        conn_accepted = connection_service.accept_connection(db, conn_req.id, alice)
        assert conn_accepted.status == "accepted"
        print("✓ Người nhận (Alice) chấp nhận kết nối: OK")

        # =====================================================================
        # 6. REALTIME CHAT SYSTEM TESTS
        # =====================================================================
        print("\n--- [6/7] KIỂM TRA CHAT 1-1 & WEBSOCKET AUTHORIZATION ---")
        # 1. Chặn tự tạo hội thoại với chính mình
        try:
            chat_service.get_or_create_conversation(db, new_user, new_user.id)
            assert False, "Should raise 400 for self-conversation"
        except HTTPException as e:
            assert e.status_code == 400
        print("✓ Chặn tự chat với chính mình (400): OK")

        # 2. Tạo hoặc lấy hội thoại giữa new_user và Alice
        conv = chat_service.get_or_create_conversation(db, new_user, alice.id)
        assert conv.id is not None
        assert conv.partner.id == alice.id

        # Idempotence: gọi lại trả về cùng ID
        conv_again = chat_service.get_or_create_conversation(db, new_user, alice.id)
        assert conv_again.id == conv.id
        print("✓ Tạo hội thoại 1-1 (Idempotent): OK")

        # 3. Gửi tin nhắn hợp lệ
        sent_msg = chat_service.create_message(
            db=db,
            conversation_id=conv.id,
            sender_id=new_user.id,
            content="Hello Alice, rất vui được kết nối!",
        )
        assert sent_msg.id is not None
        assert sent_msg.content == "Hello Alice, rất vui được kết nối!"

        # 4. Chặn người ngoài (Bob) gửi tin nhắn vào hội thoại của new_user và Alice
        try:
            chat_service.create_message(
                db=db,
                conversation_id=conv.id,
                sender_id=bob.id,
                content="Tin nhắn xâm nhập trái phép",
            )
            assert False, "Should raise 403 for unauthorized sender"
        except HTTPException as e:
            assert e.status_code == 403
        print("✓ Chặn người ngoài gửi tin nhắn vào cuộc trò chuyện riêng (403): OK")

        # 5. Chặn người ngoài (Bob) đọc tin nhắn
        try:
            chat_service.get_conversation_messages(db, conv.id, bob)
            assert False, "Should raise 403 for unauthorized reader"
        except HTTPException as e:
            assert e.status_code == 403
        print("✓ Chặn người ngoài đọc lịch sử tin nhắn (403): OK")

        # =====================================================================
        # 7. NOTIFICATIONS & ONLINE STATUS TESTS
        # =====================================================================
        print("\n--- [7/7] KIỂM TRA NOTIFICATIONS & ONLINE STATUS ---")
        # Kiểm tra thông báo của Alice (nhận được tin nhắn từ new_user)
        alice_notifs = notification_service.get_user_notifications(db, alice.id)
        assert alice_notifs.unread_count > 0
        latest_notif = alice_notifs.items[0]
        assert latest_notif.user_id == alice.id

        # Đánh dấu đã đọc 1 thông báo
        read_res = notification_service.mark_notification_read(db, latest_notif.id, alice.id)
        assert read_res.is_read is True

        # Chặn người ngoài đọc thông báo của Alice
        try:
            notification_service.mark_notification_read(db, latest_notif.id, bob.id)
            assert False, "Should raise 403 when marking another user's notification"
        except HTTPException as e:
            assert e.status_code == 403
        print("✓ Đánh dấu đã đọc & Phân quyền bảo mật thông báo (403): OK")

        # Kiểm tra các loại thông báo mới (post_like, post_comment)
        assert "post_like" in notification_service.VALID_NOTIFICATION_TYPES
        assert "post_comment" in notification_service.VALID_NOTIFICATION_TYPES
        notif_like = notification_service.create_notification(
            db, new_user.id, "post_like", "Thả tim", "Có người thích bài", related_id=1
        )
        assert notif_like.type == "post_like"
        notif_comment = notification_service.create_notification(
            db, new_user.id, "post_comment", "Bình luận", "Có người bình luận", related_id=1
        )
        assert notif_comment.type == "post_comment"

        # Đánh dấu tất cả đã đọc
        notification_service.mark_all_read(db, alice.id)
        alice_notifs_after = notification_service.get_user_notifications(db, alice.id)
        assert alice_notifs_after.unread_count == 0
        print("✓ Đánh dấu tất cả thông báo là đã đọc (mark-all-read): OK")

        # Online / Offline tracking
        manager._update_user_db_status(new_user.id, is_online=True)
        db.refresh(new_user)
        assert new_user.is_online is True

        now_utc = datetime.now(timezone.utc)
        manager._update_user_db_status(new_user.id, is_online=False, last_seen=now_utc)
        db.refresh(new_user)
        assert new_user.is_online is False
        assert new_user.last_seen is not None
        print(f"✓ Trạng thái Online/Offline & Last Seen: OK ({new_user.last_seen})")

        # Clean up test user created for test suite
        db.query(Notification).filter(Notification.user_id == new_user.id).delete()
        db.query(Message).filter(Message.conversation_id == conv.id).delete()
        db.query(ConversationMember).filter(ConversationMember.conversation_id == conv.id).delete()
        db.query(Conversation).filter(Conversation.id == conv.id).delete()
        db.query(Connection).filter(
            ((Connection.requester_id == new_user.id) | (Connection.receiver_id == new_user.id))
        ).delete()
        db.query(Profile).filter(Profile.user_id == new_user.id).delete()
        db.query(SurveyAnswer).filter(SurveyAnswer.user_id == new_user.id).delete()
        db.delete(new_user)
        db.commit()

        print("\n" + "=" * 60)
        print("🎉 TOÀN BỘ 7/7 NHÓM TEST BACKEND ĐÃ VƯỢT QUA 100%! 🎉")
        print("=" * 60)

    finally:
        db.close()


if __name__ == "__main__":
    run_full_backend_test_suite()
