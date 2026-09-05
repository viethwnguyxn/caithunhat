import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi import HTTPException
from app.db.database import SessionLocal
from app.models.user import User
from app.models.chat import Conversation, ConversationMember, Message
from app.services import chat_service
from app.websocket.manager import ConnectionManager


def test_chat_flow():
    db = SessionLocal()
    try:
        alice = db.query(User).filter(User.username == "alice_dev").first()
        bob = db.query(User).filter(User.username == "bob_coder").first()
        quang = db.query(User).filter(User.username == "quang_tech").first()

        if not alice or not bob or not quang:
            print("Users not found, please check user seeds!")
            return

        # Dọn dẹp hội thoại thử nghiệm cũ giữa alice và bob
        from sqlalchemy import select
        mem_sub = select(ConversationMember.conversation_id).where(
            ConversationMember.user_id.in_([alice.id, bob.id])
        )
        old_convs = db.query(Conversation).filter(Conversation.id.in_(mem_sub)).all()
        for c in old_convs:
            db.delete(c)
        db.commit()

        # 1. Test chặn tự tạo hội thoại với chính mình
        try:
            chat_service.get_or_create_conversation(db, alice, alice.id)
            print("FAILED: Allowed self-conversation")
            sys.exit(1)
        except HTTPException as e:
            assert e.status_code == 400
            print("PASSED 1: Chặn tự chat với chính mình (400):", e.detail)

        # 2. Test tạo hội thoại giữa Alice và Bob
        conv_dto = chat_service.get_or_create_conversation(db, alice, bob.id)
        assert conv_dto.id is not None
        assert conv_dto.partner.username == "bob_coder"
        print(f"PASSED 2: Tạo hội thoại Alice <-> Bob thành công (ID: {conv_dto.id})")

        # 3. Test tính idempotent (không tạo trùng lặp khi gọi lại)
        conv_dto_again = chat_service.get_or_create_conversation(db, alice, bob.id)
        assert conv_dto_again.id == conv_dto.id
        print("PASSED 3: Không tạo trùng hội thoại khi Alice gọi lại")

        # 4. Test Bob gọi tạo hội thoại với Alice -> trả về cùng ID
        conv_dto_bob = chat_service.get_or_create_conversation(db, bob, alice.id)
        assert conv_dto_bob.id == conv_dto.id
        assert conv_dto_bob.partner.username == "alice_dev"
        print("PASSED 4: Bob gọi lấy hội thoại trả về đúng ID và partner là Alice")

        # 5. Test người ngoài (Quang) không có quyền đọc tin nhắn
        try:
            chat_service.get_conversation_messages(db, conv_dto.id, quang)
            print("FAILED: Quang was able to read conversation messages")
            sys.exit(1)
        except HTTPException as e:
            assert e.status_code == 403
            print("PASSED 5: Chặn người ngoài đọc tin nhắn (403):", e.detail)

        # 6. Test người ngoài (Quang) không có quyền gửi tin nhắn
        try:
            chat_service.create_message(db, conv_dto.id, quang.id, "Tin nhắn xâm nhập!")
            print("FAILED: Quang was able to send message")
            sys.exit(1)
        except HTTPException as e:
            assert e.status_code == 403
            print("PASSED 6: Chặn người ngoài gửi tin nhắn (403):", e.detail)

        # 7. Alice gửi tin nhắn
        msg1 = chat_service.create_message(db, conv_dto.id, alice.id, "Xin chào Bob!")
        assert msg1.id is not None
        assert msg1.content == "Xin chào Bob!"
        print(f"PASSED 7: Alice gửi tin nhắn thành công (ID: {msg1.id})")

        # 8. Bob gửi tin nhắn phản hồi
        msg2 = chat_service.create_message(db, conv_dto.id, bob.id, "Chào Alice, rất vui được kết nối!")
        assert msg2.id is not None
        print(f"PASSED 8: Bob gửi tin nhắn phản hồi thành công (ID: {msg2.id})")

        # 9. Đọc lịch sử tin nhắn
        history = chat_service.get_conversation_messages(db, conv_dto.id, bob)
        assert len(history) >= 2
        assert history[0].content == "Xin chào Bob!"
        assert history[1].content == "Chào Alice, rất vui được kết nối!"
        print(f"PASSED 9: Lấy lịch sử tin nhắn chính xác theo thứ tự ({len(history)} tin)")

        # 10. Test ConnectionManager đơn lẻ
        test_mgr = ConnectionManager()
        assert test_mgr.active_connections == {}
        print("PASSED 10: Khởi tạo ConnectionManager sạch sẽ và sẵn sàng cho WebSocket")

        print("\n==========================================")
        print("TẤT CẢ TEST REALTIME CHAT SERVICE ĐÃ PASS 100%!")
        print("==========================================")

    finally:
        db.close()


if __name__ == "__main__":
    test_chat_flow()
