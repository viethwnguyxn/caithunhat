from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from ..core.security import decode_access_token
from ..db.database import SessionLocal, get_db
from ..models.chat import ConversationMember
from ..models.user import User
from ..routers.deps import get_current_user
from ..schemas.chat import (
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)
from ..services import chat_service
from ..websocket.manager import manager

router = APIRouter(tags=["chat"])


# ==========================================
# 1. REST APIs
# ==========================================

@router.get("/api/conversations", response_model=list[ConversationResponse])
def get_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách các cuộc hội thoại của người dùng hiện tại."""
    return chat_service.get_user_conversations(db, current_user)


@router.post("/api/conversations/{user_id}", response_model=ConversationResponse)
def get_or_create_conversation(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tạo hoặc lấy cuộc hội thoại 1-1 với user_id."""
    return chat_service.get_or_create_conversation(db, current_user, user_id)


@router.get("/api/conversations/{conversation_id}/messages", response_model=list[MessageResponse])
def get_conversation_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy lịch sử tin nhắn của cuộc hội thoại (yêu cầu là thành viên)."""
    return chat_service.get_conversation_messages(db, conversation_id, current_user)


@router.post(
    "/api/conversations/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_message_rest(
    conversation_id: int,
    message_in: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Gửi tin nhắn qua REST API (hỗ trợ fallback khi WebSocket gặp sự cố).
    Tự động broadcast tin nhắn tới các thành viên đang online qua WebSocket.
    """
    msg = chat_service.create_message(
        db=db,
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=message_in.content,
    )
    msg_response = MessageResponse.model_validate(msg).model_dump(mode="json")

    # Broadcast tới các thành viên qua WebSocket
    await manager.broadcast_to_conversation(
        conversation_id,
        {"type": "message", "message": msg_response},
    )

    return msg


@router.put("/api/messages/{message_id}/read", response_model=MessageResponse)
def mark_message_as_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Đánh dấu một tin nhắn là đã đọc."""
    return chat_service.mark_message_read(db, message_id, current_user)


# ==========================================
# 2. WEBSOCKET ENDPOINT
# ==========================================

@router.websocket("/api/ws/chat/{conversation_id}")
async def websocket_chat(
    websocket: WebSocket,
    conversation_id: int,
    token: str | None = Query(default=None),
):
    """
    WebSocket endpoint trò chuyện 1-1 realtime.
    Bảo mật:
      1. Xác thực JWT token từ Query Parameter.
      2. Kiểm tra quyền thành viên (ConversationMember).
      3. Đóng kết nối nếu không hợp lệ (WS 1008 Policy Violation).
      4. Nhận tin nhắn, lưu DB và broadcast tới toàn bộ thành viên trong phòng.
    """
    # 1. Xác thực Token
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Thiếu token xác thực")
        return

    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Token không hợp lệ hoặc đã hết hạn")
        return

    try:
        user_id = int(payload["sub"])
    except (ValueError, TypeError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="User ID trong token không hợp lệ")
        return

    # 2. Kiểm tra quyền thành viên trong cuộc hội thoại
    with SessionLocal() as db:
        is_member = (
            db.query(ConversationMember)
            .filter(
                ConversationMember.conversation_id == conversation_id,
                ConversationMember.user_id == user_id,
            )
            .first()
        )
        if not is_member:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Bạn không thuộc cuộc hội thoại này",
            )
            return

    # 3. Chấp nhận và đăng ký kết nối vào ConnectionManager
    await manager.connect(websocket, conversation_id, user_id)

    # Gửi trạng thái hiện tại của partner cho client vừa kết nối
    try:
        with SessionLocal() as db:
            partner_member = (
                db.query(ConversationMember)
                .filter(
                    ConversationMember.conversation_id == conversation_id,
                    ConversationMember.user_id != user_id,
                )
                .first()
            )
            if partner_member:
                p_user = db.query(User).filter(User.id == partner_member.user_id).first()
                if p_user:
                    p_online = manager.is_user_online(p_user.id) or bool(p_user.is_online)
                    p_last_seen = p_user.last_seen.isoformat() if p_user.last_seen else None
                    await manager.send_personal_message(
                        {
                            "type": "user_status",
                            "user_id": p_user.id,
                            "is_online": p_online,
                            "last_seen": p_last_seen,
                        },
                        websocket,
                    )
    except Exception:
        pass

    # 4. Lắng nghe tin nhắn từ client
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "message")

            if msg_type == "message":
                content = data.get("content", "").strip()
                if not content:
                    continue

                # Lưu tin nhắn vào Database
                try:
                    with SessionLocal() as db:
                        new_msg = chat_service.create_message(
                            db=db,
                            conversation_id=conversation_id,
                            sender_id=user_id,
                            content=content,
                        )
                        msg_dict = MessageResponse.model_validate(new_msg).model_dump(mode="json")
                except HTTPException as e:
                    await manager.send_personal_message(
                        {"type": "error", "message": e.detail},
                        websocket,
                    )
                    continue

                # Broadcast tới tất cả kết nối trong cuộc hội thoại
                broadcast_payload = {
                    "type": "message",
                    "message": msg_dict,
                }
                await manager.broadcast_to_conversation(conversation_id, broadcast_payload)

            elif msg_type.startswith("call:"):
                # ==========================================
                # XỬ LÝ WEBRTC SIGNALING (VOICE & VIDEO CALL)
                # ==========================================
                with SessionLocal() as db:
                    if chat_service.is_conversation_blocked(db, conversation_id, user_id):
                        await manager.send_personal_message(
                            {
                                "type": "call:error",
                                "message": "Cuộc hội thoại đã bị chặn. Không thể thực hiện cuộc gọi.",
                            },
                            websocket,
                        )
                        continue

                # Đính kèm sender_id và conversation_id
                data["sender_id"] = user_id
                data["conversation_id"] = conversation_id

                # Chuyển tiếp tín hiệu WebRTC tới người còn lại trong cuộc trò chuyện
                await manager.broadcast_to_conversation(
                    conversation_id,
                    data,
                    exclude_user_id=user_id,
                )

                # Khi cuộc gọi kết thúc hoặc bị từ chối/nhỡ -> tự động ghi tin nhắn hệ thống vào phòng chat
                if msg_type in ("call:end", "call:reject"):
                    call_type = data.get("call_type", "audio")
                    duration = data.get("duration_seconds", 0)
                    reason = data.get("reason")
                    call_icon = "📹" if call_type == "video" else "📞"
                    call_name = "Cuộc gọi video" if call_type == "video" else "Cuộc gọi thoại"

                    if duration and duration > 0:
                        mins = duration // 60
                        secs = duration % 60
                        log_content = f"{call_icon} {call_name} (Thời lượng: {mins:02d}:{secs:02d})"
                    elif reason == "declined" or msg_type == "call:reject":
                        log_content = f"{call_icon} Cuộc gọi bị từ chối"
                    elif reason == "busy":
                        log_content = f"{call_icon} Đối phương đang bận"
                    else:
                        log_content = f"{call_icon} Cuộc gọi nhỡ"

                    try:
                        with SessionLocal() as db:
                            sys_msg = chat_service.create_message(
                                db=db,
                                conversation_id=conversation_id,
                                sender_id=user_id,
                                content=log_content,
                            )
                            msg_dict = MessageResponse.model_validate(sys_msg).model_dump(mode="json")

                        # Gửi tin nhắn hệ thống cuộc gọi tới cả 2 bên
                        await manager.broadcast_to_conversation(
                            conversation_id,
                            {"type": "message", "message": msg_dict},
                        )
                    except Exception:
                        pass

    except WebSocketDisconnect:
        await manager.disconnect(websocket, conversation_id, user_id)
    except Exception:
        await manager.disconnect(websocket, conversation_id, user_id)

