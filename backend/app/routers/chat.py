from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.security import decode_access_token
from ..db.database import SessionLocal, get_db
from ..models.chat import ConversationMember
from ..models.profile import Profile
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


@router.post("/api/conversations/{conversation_id}/messages", response_model=MessageResponse)
def send_message_rest(
    conversation_id: int,
    message_in: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Gửi tin nhắn qua REST API (Fallback khi WebSocket mất kết nối).
    Tự động broadcast tới WebSocket room nếu có kết nối đang mở.
    """
    new_msg = chat_service.create_message(
        db=db,
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=message_in.content,
    )
    msg_dict = MessageResponse.model_validate(new_msg).model_dump(mode="json")

    # Broadcast tới các thành viên trong phòng chat
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(
                manager.broadcast_to_conversation(
                    conversation_id,
                    {"type": "message", "message": msg_dict},
                )
            )
    except Exception:
        pass

    return new_msg


@router.put("/api/messages/{message_id}/read")
def mark_message_as_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Đánh dấu tin nhắn là đã đọc."""
    return chat_service.mark_as_read(db, message_id, current_user)


# ==========================================
# 2. XỬ LÝ WEBRTC SIGNALING DÙNG CHUNG
# ==========================================

async def _handle_call_signaling(data: dict, sender_id: int, sender_ws: WebSocket):
    """
    Xử lý tập trung tín hiệu gọi WebRTC (call:offer, call:answer, call:ice_candidate, call:reject, call:end).
    Chuyển tiếp trực tiếp tới target_user_id (toàn cục qua manager.send_to_user)
    và tới phòng chat (qua manager.broadcast_to_conversation).
    """
    msg_type = data.get("type", "")
    raw_conv_id = data.get("conversation_id")
    raw_target_id = data.get("target_user_id")
    conversation_id = int(raw_conv_id) if raw_conv_id is not None and str(raw_conv_id).isdigit() else None
    target_user_id = int(raw_target_id) if raw_target_id is not None and str(raw_target_id).isdigit() else None

    caller_info = None

    with SessionLocal() as db:
        # Nếu chưa có target_user_id nhưng có conversation_id -> tìm người còn lại
        if conversation_id and not target_user_id:
            partner_mem = (
                db.query(ConversationMember)
                .filter(
                    ConversationMember.conversation_id == conversation_id,
                    ConversationMember.user_id != sender_id,
                )
                .first()
            )
            if partner_mem:
                target_user_id = partner_mem.user_id

        # Nếu chưa có conversation_id nhưng có target_user_id -> tìm conversation chung
        if not conversation_id and target_user_id:
            user1_convs = select(ConversationMember.conversation_id).where(
                ConversationMember.user_id == sender_id
            )
            existing_member = (
                db.query(ConversationMember)
                .filter(
                    ConversationMember.user_id == target_user_id,
                    ConversationMember.conversation_id.in_(user1_convs),
                )
                .first()
            )
            if existing_member:
                conversation_id = existing_member.conversation_id

        # Kiểm tra chặn (Block)
        if conversation_id and chat_service.is_conversation_blocked(db, conversation_id, sender_id):
            await manager.send_personal_message(
                {
                    "type": "call:error",
                    "message": "Cuộc hội thoại đã bị chặn. Không thể thực hiện cuộc gọi.",
                },
                sender_ws,
            )
            return

        # Lấy thông tin người gọi khi gửi offer
        if msg_type == "call:offer":
            sender_user = db.query(User).filter(User.id == sender_id).first()
            sender_profile = db.query(Profile).filter(Profile.user_id == sender_id).first()
            if sender_user:
                caller_info = {
                    "id": sender_user.id,
                    "username": sender_user.username,
                    "display_name": sender_profile.display_name if sender_profile and sender_profile.display_name else sender_user.username,
                    "avatar_url": sender_profile.avatar_url if sender_profile and sender_profile.avatar_url else sender_user.avatar_url,
                }

    # Chuẩn hóa dữ liệu gửi đi
    data["sender_id"] = sender_id
    if caller_info:
        data["caller"] = caller_info
    if target_user_id:
        data["target_user_id"] = target_user_id
    if conversation_id:
        data["conversation_id"] = conversation_id

    # Gửi trực tiếp tới target_user_id qua user_sockets (BẤT KỂ TARGET ĐANG Ở TRANG NÀO!)
    sent_directly = False
    if target_user_id:
        sent_directly = await manager.send_to_user(target_user_id, data)

    # Đồng thời gửi tới phòng chat nếu có active connections
    if conversation_id:
        await manager.broadcast_to_conversation(
            conversation_id, data, exclude_user_id=sender_id
        )

    # Nếu người gọi gửi offer mà đối phương không mở kết nối nào
    if msg_type == "call:offer" and not sent_directly:
        await manager.send_personal_message(
            {
                "type": "call:unavailable",
                "message": "Đối phương hiện không trực tuyến hoặc chưa mở ứng dụng.",
                "target_user_id": target_user_id,
            },
            sender_ws,
        )

    # Ghi log tin nhắn khi cuộc gọi kết thúc hoặc bị từ chối/nhỡ
    if msg_type in ("call:end", "call:reject") and conversation_id:
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
                    sender_id=sender_id,
                    content=log_content,
                )
                msg_dict = MessageResponse.model_validate(sys_msg).model_dump(mode="json")

            # Gửi thông báo tin nhắn hệ thống tới cả 2 người dùng
            msg_payload = {"type": "message", "message": msg_dict}
            await manager.broadcast_to_conversation(conversation_id, msg_payload)
            if target_user_id:
                await manager.send_to_user(target_user_id, msg_payload)
            await manager.send_to_user(sender_id, msg_payload)
        except Exception:
            pass


# ==========================================
# 3. WEBSOCKET TOÀN CỤC (GLOBAL USER WS)
# ==========================================

@router.websocket("/api/ws/user")
async def websocket_user_global(
    websocket: WebSocket,
    token: str | None = Query(default=None),
):
    """
    WebSocket toàn cục dành cho từng người dùng (Global User Signaling & Calling).
    Được duy trì xuyên suốt mọi trang web (Home, Discover, Communities, Messages...).
    Giúp nhận cuộc gọi đến tức thì ngay cả khi không ở trong phòng chat chi tiết.
    """
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

    await manager.connect_user(websocket, user_id)

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if msg_type.startswith("call:"):
                await _handle_call_signaling(data, user_id, websocket)

    except WebSocketDisconnect:
        await manager.disconnect_user(websocket, user_id)
    except Exception:
        await manager.disconnect_user(websocket, user_id)


# ==========================================
# 4. WEBSOCKET PHÒNG CHAT (ROOM CHAT WS)
# ==========================================

@router.websocket("/api/ws/chat/{conversation_id}")
async def websocket_chat(
    websocket: WebSocket,
    conversation_id: int,
    token: str | None = Query(default=None),
):
    """
    WebSocket endpoint trò chuyện 1-1 realtime theo phòng chat.
    Bảo mật:
      1. Xác thực JWT token từ Query Parameter.
      2. Kiểm tra quyền thành viên (ConversationMember).
      3. Nhận tin nhắn text, lưu DB và broadcast tới toàn bộ thành viên trong phòng.
      4. Chuyển tiếp tín hiệu WebRTC Calling (nếu phát sinh từ phòng chat).
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

            elif msg_type == "read":
                with SessionLocal() as db:
                    current_user = db.query(User).filter(User.id == user_id).first()
                    if not current_user:
                        continue
                    messages = chat_service.get_conversation_messages(
                        db=db,
                        conversation_id=conversation_id,
                        current_user=current_user,
                    )

                for message in messages:
                    if message.sender_id != user_id and message.read_at:
                        await manager.broadcast_to_conversation(
                            conversation_id,
                            {
                                "type": "read_receipt",
                                "message_id": message.id,
                                "read_at": message.read_at.isoformat(),
                            },
                            exclude_user_id=user_id,
                        )

            elif msg_type.startswith("call:"):
                await _handle_call_signaling(data, user_id, websocket)

    except WebSocketDisconnect:
        await manager.disconnect(websocket, conversation_id, user_id)
    except Exception:
        await manager.disconnect(websocket, conversation_id, user_id)
