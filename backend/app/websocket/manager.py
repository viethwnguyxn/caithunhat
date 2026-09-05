from datetime import datetime, timezone

from fastapi import WebSocket

from ..db.database import SessionLocal
from ..models.user import User


class ConnectionManager:
    """
    Quản lý tập trung các kết nối WebSocket theo từng cuộc hội thoại (room).
    Cấu trúc lưu trữ:
      active_connections[conversation_id][user_id] = set(WebSocket)
      user_sockets[user_id] = set(WebSocket)
    Tự động cập nhật is_online và last_seen của user khi kết nối/ngắt kết nối,
    và broadcast trạng thái user_status tới phòng chat.
    """

    def __init__(self):
        self.active_connections: dict[int, dict[int, set[WebSocket]]] = {}
        self.user_sockets: dict[int, set[WebSocket]] = {}

    def is_user_online(self, user_id: int) -> bool:
        """Kiểm tra người dùng có đang mở ít nhất 1 kết nối WebSocket không."""
        return user_id in self.user_sockets and len(self.user_sockets[user_id]) > 0

    def _update_user_db_status(self, user_id: int, is_online: bool, last_seen: datetime | None = None):
        """Cập nhật trạng thái online/offline vào SQLite DB."""
        try:
            with SessionLocal() as db:
                update_vals = {"is_online": is_online}
                if last_seen is not None:
                    update_vals["last_seen"] = last_seen
                db.query(User).filter(User.id == user_id).update(update_vals)
                db.commit()
        except Exception:
            pass

    async def connect(self, websocket: WebSocket, conversation_id: int, user_id: int):
        """Chấp nhận kết nối WebSocket và thêm vào danh sách theo dõi."""
        await websocket.accept()
        if conversation_id not in self.active_connections:
            self.active_connections[conversation_id] = {}
        if user_id not in self.active_connections[conversation_id]:
            self.active_connections[conversation_id][user_id] = set()

        self.active_connections[conversation_id][user_id].add(websocket)

        if user_id not in self.user_sockets:
            self.user_sockets[user_id] = set()

        is_first_connection = (len(self.user_sockets[user_id]) == 0)
        self.user_sockets[user_id].add(websocket)

        if is_first_connection:
            self._update_user_db_status(user_id, is_online=True)
            # Broadcast trạng thái online tới các thành viên khác trong cuộc hội thoại
            await self.broadcast_to_conversation(
                conversation_id,
                {"type": "user_status", "user_id": user_id, "is_online": True},
            )

    async def disconnect(self, websocket: WebSocket, conversation_id: int, user_id: int):
        """Xóa kết nối WebSocket khi client ngắt kết nối hoặc rời phòng."""
        if conversation_id in self.active_connections:
            if user_id in self.active_connections[conversation_id]:
                self.active_connections[conversation_id][user_id].discard(websocket)
                if not self.active_connections[conversation_id][user_id]:
                    del self.active_connections[conversation_id][user_id]
            if not self.active_connections[conversation_id]:
                del self.active_connections[conversation_id]

        is_now_offline = False
        now = datetime.now(timezone.utc)
        if user_id in self.user_sockets:
            self.user_sockets[user_id].discard(websocket)
            if not self.user_sockets[user_id]:
                del self.user_sockets[user_id]
                is_now_offline = True

        if is_now_offline:
            self._update_user_db_status(user_id, is_online=False, last_seen=now)
            await self.broadcast_to_conversation(
                conversation_id,
                {
                    "type": "user_status",
                    "user_id": user_id,
                    "is_online": False,
                    "last_seen": now.isoformat(),
                },
            )

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Gửi tin nhắn riêng tới một kết nối WebSocket cụ thể."""
        try:
            await websocket.send_json(message)
        except Exception:
            pass

    async def broadcast_to_conversation(self, conversation_id: int, message: dict):
        """
        Phát tin nhắn (broadcast) tới tất cả thành viên đang online trong cuộc hội thoại.
        Tự động dọn dẹp các socket bị ngắt kết nối đột ngột.
        """
        if conversation_id not in self.active_connections:
            return

        dead_connections: list[tuple[int, WebSocket]] = []

        for user_id, sockets in list(self.active_connections[conversation_id].items()):
            for ws in list(sockets):
                try:
                    await ws.send_json(message)
                except Exception:
                    dead_connections.append((user_id, ws))

        # Dọn dẹp kết nối hỏng
        for uid, dead_ws in dead_connections:
            await self.disconnect(dead_ws, conversation_id, uid)


# Instance đơn lẻ (Singleton) dùng chung cho toàn bộ app
manager = ConnectionManager()
