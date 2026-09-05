import asyncio
import json
import os
import sys
import threading
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

import uvicorn
import websockets
from app.core.security import create_access_token
from app.db.database import SessionLocal
from app.main import app
from app.models.chat import Conversation, Message
from app.models.user import User
from app.services import chat_service

TEST_PORT = 8005
TEST_HOST = "127.0.0.1"


def run_server():
    uvicorn.run(app, host=TEST_HOST, port=TEST_PORT, log_level="warning")


async def main():
    # 1. Khởi động server test trong background thread
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(1.5)  # Chờ server lắng nghe port

    db = SessionLocal()
    try:
        alice = db.query(User).filter(User.username == "alice_dev").first()
        bob = db.query(User).filter(User.username == "bob_coder").first()
        quang = db.query(User).filter(User.username == "quang_tech").first()

        assert alice and bob and quang, "Không tìm thấy đủ người dùng test"

        # Đảm bảo có conversation giữa Alice và Bob
        conv_dto = chat_service.get_or_create_conversation(db, alice, bob.id)
        conv_id = conv_dto.id

        alice_token = create_access_token(alice.id)
        bob_token = create_access_token(bob.id)
        quang_token = create_access_token(quang.id)

        base_ws = f"ws://{TEST_HOST}:{TEST_PORT}/api/ws/chat/{conv_id}"

        # -------------------------------------------------------------
        # TEST 1: Kết nối không có token -> Bị từ chối kết nối (403 / 1008)
        # -------------------------------------------------------------
        try:
            async with websockets.connect(base_ws) as ws:
                await ws.recv()
                print("FAILED: No token connection succeeded")
                sys.exit(1)
        except (websockets.exceptions.ConnectionClosed, websockets.exceptions.InvalidStatus) as e:
            print("PASSED 1: Chặn kết nối không có token (Handshake Refused / Policy Violation)")

        # -------------------------------------------------------------
        # TEST 2: Kết nối token giả / không hợp lệ -> Bị từ chối (403 / 1008)
        # -------------------------------------------------------------
        try:
            async with websockets.connect(f"{base_ws}?token=invalid_jwt_token") as ws:
                await ws.recv()
                print("FAILED: Invalid token connection succeeded")
                sys.exit(1)
        except (websockets.exceptions.ConnectionClosed, websockets.exceptions.InvalidStatus) as e:
            print("PASSED 2: Chặn kết nối token giả (Handshake Refused / Policy Violation)")

        # -------------------------------------------------------------
        # TEST 3: Quang (không thuộc phòng chat) -> Bị từ chối (403 / 1008)
        # -------------------------------------------------------------
        try:
            async with websockets.connect(f"{base_ws}?token={quang_token}") as ws:
                await ws.recv()
                print("FAILED: Non-member connection succeeded")
                sys.exit(1)
        except (websockets.exceptions.ConnectionClosed, websockets.exceptions.InvalidStatus) as e:
            print("PASSED 3: Chặn người ngoài phòng chat (Handshake Refused / Policy Violation)")

        # -------------------------------------------------------------
        # TEST 4 & 5: Alice & Bob cùng kết nối WebSocket thành công
        # -------------------------------------------------------------
        alice_ws_url = f"{base_ws}?token={alice_token}"
        bob_ws_url = f"{base_ws}?token={bob_token}"

        async with websockets.connect(alice_ws_url) as alice_ws, websockets.connect(
            bob_ws_url
        ) as bob_ws:
            print("PASSED 4: Alice & Bob kết nối WebSocket thành công cùng lúc!")

            async def recv_chat_message(ws):
                while True:
                    data = json.loads(await ws.recv())
                    if data.get("type") == "message":
                        return data

            # ---------------------------------------------------------
            # TEST 6: Alice gửi tin nhắn -> Cả Alice và Bob nhận realtime
            # ---------------------------------------------------------
            alice_msg = {"type": "message", "content": "Chào Bob từ WebSocket!"}
            await alice_ws.send(json.dumps(alice_msg))

            # Alice nhận echo broadcast
            res_alice = await recv_chat_message(alice_ws)
            assert res_alice["type"] == "message"
            assert res_alice["message"]["content"] == "Chào Bob từ WebSocket!"
            assert res_alice["message"]["sender_id"] == alice.id

            # Bob nhận broadcast realtime
            res_bob = await recv_chat_message(bob_ws)
            assert res_bob["type"] == "message"
            assert res_bob["message"]["content"] == "Chào Bob từ WebSocket!"
            assert res_bob["message"]["sender_id"] == alice.id
            print("PASSED 5: Alice gửi tin -> Bob nhận realtime broadcast thành công!")

            # ---------------------------------------------------------
            # TEST 7: Bob trả lời tin nhắn -> Alice nhận realtime
            # ---------------------------------------------------------
            bob_msg = {"type": "message", "content": "Chào Alice, mình nhận được rồi nhé!"}
            await bob_ws.send(json.dumps(bob_msg))

            # Alice nhận tin của Bob
            res_alice_2 = await recv_chat_message(alice_ws)
            assert res_alice_2["message"]["content"] == "Chào Alice, mình nhận được rồi nhé!"
            assert res_alice_2["message"]["sender_id"] == bob.id

            # Bob nhận tin của chính mình
            res_bob_2 = await recv_chat_message(bob_ws)
            assert res_bob_2["message"]["content"] == "Chào Alice, mình nhận được rồi nhé!"
            print("PASSED 6: Bob phản hồi -> Alice nhận realtime broadcast thành công!")

        # -------------------------------------------------------------
        # TEST 8: Kiểm tra dữ liệu đã lưu vào database SQLite
        # -------------------------------------------------------------
        saved_msg = (
            db.query(Message)
            .filter(
                Message.conversation_id == conv_id,
                Message.content == "Chào Bob từ WebSocket!",
            )
            .first()
        )
        assert saved_msg is not None
        assert saved_msg.sender_id == alice.id
        print("PASSED 7: Tin nhắn đã được lưu trữ vĩnh viễn trong database SQLite!")

        print("\n==================================================")
        print("TẤT CẢ TEST REALTIME WEBSOCKET ĐÃ THÀNH CÔNG 100%!")
        print("==================================================")

    finally:
        db.close()


if __name__ == "__main__":
    asyncio.run(main())
