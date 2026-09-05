import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from datetime import datetime, timezone
from app.db.database import SessionLocal
from app.models.user import User
from app.models.connection import Connection
from app.models.notification import Notification
from app.services import connection_service, chat_service, notification_service
from app.routers.notifications import (
    get_notifications,
    mark_notification_as_read,
    mark_all_notifications_as_read,
)
from app.websocket.manager import manager


def test_notifications_and_online_status():
    db = SessionLocal()

    try:
        alice = db.query(User).filter(User.username == "alice_dev").first()
        bob = db.query(User).filter(User.username == "bob_coder").first()
        quang = db.query(User).filter(User.username == "quang_tech").first()

        assert alice is not None and bob is not None and quang is not None, "Users not found!"

        # Dọn dẹp notifications và connections cũ giữa alice, bob, quang
        db.query(Notification).filter(Notification.user_id.in_([alice.id, bob.id, quang.id])).delete()
        db.query(Connection).filter(
            ((Connection.requester_id == alice.id) & (Connection.receiver_id == bob.id)) |
            ((Connection.requester_id == bob.id) & (Connection.receiver_id == alice.id)) |
            ((Connection.requester_id == alice.id) & (Connection.receiver_id == quang.id)) |
            ((Connection.requester_id == quang.id) & (Connection.receiver_id == alice.id))
        ).delete()
        db.commit()

        # 1. Kiểm tra cấu trúc User có cột is_online và last_seen
        assert hasattr(alice, "is_online"), "User model missing is_online"
        assert hasattr(alice, "last_seen"), "User model missing last_seen"
        print("PASSED 1: User model has is_online and last_seen attributes")

        # 2. Test tạo thông báo thủ công
        notif1 = notification_service.create_notification(
            db=db,
            user_id=bob.id,
            type="group_join",
            title="Tham gia nhóm",
            content="Bạn đã tham gia nhóm Lập trình viên",
            related_id=1,
        )
        assert notif1.id is not None
        assert notif1.is_read is False
        print("PASSED 2: Created manual notification successfully")

        # 3. Test gửi connection request tự động sinh notification
        req = connection_service.send_connection_request(db, alice, bob.id)
        assert req.status == "pending"

        bob_notifs = notification_service.get_user_notifications(db, bob.id)
        assert bob_notifs.unread_count >= 2
        conn_req_notif = next((n for n in bob_notifs.items if n.type == "connection_request"), None)
        assert conn_req_notif is not None
        assert "kết nối" in conn_req_notif.title.lower()
        print(f"PASSED 3: Connection request triggered notification for Bob (ID: {conn_req_notif.id})")

        # 4. Test chấp nhận connection request tự động sinh notification
        accept_res = connection_service.accept_connection(db, req.id, bob)
        assert accept_res.status == "accepted"

        alice_notifs = notification_service.get_user_notifications(db, alice.id)
        conn_acc_notif = next((n for n in alice_notifs.items if n.type == "connection_accepted"), None)
        assert conn_acc_notif is not None
        assert "chấp nhận" in conn_acc_notif.title.lower()
        print(f"PASSED 4: Connection accept triggered notification for Alice (ID: {conn_acc_notif.id})")

        # 5. Test gửi tin nhắn chat tự động sinh message notification
        conv = chat_service.get_or_create_conversation(db, alice, bob.id)
        msg = chat_service.create_message(
            db=db,
            conversation_id=conv.id,
            sender_id=alice.id,
            content="Xin chào Bob! Cùng làm việc nhé.",
        )
        bob_notifs_after_msg = notification_service.get_user_notifications(db, bob.id)
        msg_notif = next((n for n in bob_notifs_after_msg.items if n.type == "message"), None)
        assert msg_notif is not None
        assert msg_notif.related_id == conv.id
        print(f"PASSED 5: Chat message triggered notification for recipient Bob (ID: {msg_notif.id})")

        # 6. Test API endpoints qua router functions
        # GET /api/notifications
        notif_list = get_notifications(db=db, current_user=bob)
        assert len(notif_list.items) >= 3
        assert notif_list.unread_count >= 3
        print(f"PASSED 6: GET /api/notifications returned {len(notif_list.items)} items, unread: {notif_list.unread_count}")

        # PUT /api/notifications/{id}/read
        read_id = notif_list.items[0].id
        notif_read = mark_notification_as_read(notification_id=read_id, db=db, current_user=bob)
        assert notif_read.is_read is True
        print(f"PASSED 7: PUT /api/notifications/{read_id}/read marked as read")

        # PUT /api/notifications/read-all
        res_read_all = mark_all_notifications_as_read(db=db, current_user=bob)
        assert res_read_all.success is True

        notif_check = get_notifications(db=db, current_user=bob)
        assert notif_check.unread_count == 0
        print("PASSED 8: PUT /api/notifications/read-all marked all as read")

        # 7. Test online status cập nhật qua ConnectionManager
        manager._update_user_db_status(bob.id, is_online=True)
        db.refresh(bob)
        assert bob.is_online is True

        now_test = datetime.now(timezone.utc)
        manager._update_user_db_status(bob.id, is_online=False, last_seen=now_test)
        db.refresh(bob)
        assert bob.is_online is False
        assert bob.last_seen is not None
        print(f"PASSED 9: Online status db update verified: is_online={bob.is_online}, last_seen={bob.last_seen}")

        print("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉")

    finally:
        db.close()


if __name__ == "__main__":
    test_notifications_and_online_status()
