import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
from fastapi import HTTPException
from app.db.database import SessionLocal
from app.models.user import User
from app.models.connection import Connection
from app.services import connection_service

def test_connection_flow():
    db = SessionLocal()
    try:
        alice = db.query(User).filter(User.username == "alice_dev").first()
        bob = db.query(User).filter(User.username == "bob_coder").first()
        quang = db.query(User).filter(User.username == "quang_tech").first()

        if not alice or not bob or not quang:
            print("Users not found, please seed users first!")
            return

        # Clean existing connections between test users
        db.query(Connection).filter(
            ((Connection.requester_id == alice.id) & (Connection.receiver_id == bob.id)) |
            ((Connection.requester_id == bob.id) & (Connection.receiver_id == alice.id)) |
            ((Connection.requester_id == alice.id) & (Connection.receiver_id == quang.id)) |
            ((Connection.requester_id == quang.id) & (Connection.receiver_id == alice.id))
        ).delete()
        db.commit()

        # 1. Test không cho connect chính mình
        try:
            connection_service.send_connection_request(db, alice, alice.id)
            sys.exit(1)
        except HTTPException as e:
            assert e.status_code == 400

        # 2. Test gửi lời mời Alice -> Bob
        req1 = connection_service.send_connection_request(db, alice, bob.id)
        assert req1.status == "pending"

        # 3. Duplicate request
        try:
            connection_service.send_connection_request(db, alice, bob.id)
            sys.exit(1)
        except HTTPException as e:
            assert e.status_code == 400

        # 4. Reverse duplicate
        try:
            connection_service.send_connection_request(db, bob, alice.id)
            sys.exit(1)
        except HTTPException as e:
            assert e.status_code == 400

        # 5. Requests pending check
        bob_reqs = connection_service.get_connection_requests(db, bob)
        assert any(r.requester_id == alice.id for r in bob_reqs.incoming)

        # 6. Unauthorized accept
        try:
            connection_service.accept_connection(db, req1.id, quang)
            sys.exit(1)
        except HTTPException as e:
            assert e.status_code == 403

        # 7. Bob accept
        accepted = connection_service.accept_connection(db, req1.id, bob)
        assert accepted.status == "accepted"

        # 8. Re-accept blocked
        try:
            connection_service.accept_connection(db, req1.id, bob)
            sys.exit(1)
        except HTTPException as e:
            assert e.status_code == 400

        # 9. get_my_connections
        alice_conns = connection_service.get_my_connections(db, alice)
        assert any(c.user.username == "bob_coder" for c in alice_conns)

        # 10. Reject & Re-request
        req2 = connection_service.send_connection_request(db, alice, quang.id)
        rejected = connection_service.reject_connection(db, req2.id, quang)
        assert rejected.status == "rejected"
        re_requested = connection_service.send_connection_request(db, alice, quang.id)
        assert re_requested.status == "pending"

        print("Test kết nối hoàn thành xuất sắc!")
    finally:
        db.close()

if __name__ == "__main__":
    test_connection_flow()
