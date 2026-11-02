from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.block import Block
from ..models.chat import Conversation, ConversationMember, Message
from ..models.user import User
from ..schemas.chat import (
    ConversationPartnerResponse,
    ConversationResponse,
    MessageResponse,
)
from . import notification_service


def to_partner_response(user: User) -> ConversationPartnerResponse:
    """Chuyển đổi User thành thông tin đối phương trong hội thoại."""
    profile = getattr(user, "profile", None)
    if isinstance(profile, list):
        profile = profile[0] if profile else None

    return ConversationPartnerResponse(
        id=user.id,
        username=user.username,
        display_name=profile.display_name if profile and profile.display_name else user.username,
        avatar_url=profile.avatar_url if profile and profile.avatar_url else user.avatar_url,
        current_status=profile.current_status if profile else None,
        is_online=bool(getattr(user, "is_online", False)),
        last_seen=getattr(user, "last_seen", None),
    )


def to_conversation_response(
    db: Session, conv: Conversation, current_user: User
) -> ConversationResponse:
    """Chuyển đổi Conversation ORM thành ConversationResponse Pydantic schema."""
    # Tìm thành viên còn lại (partner)
    partner_member = None
    for m in conv.members:
        if m.user_id != current_user.id:
            partner_member = m
            break

    # Nếu không tìm thấy trong quan hệ đã tải, truy vấn DB
    if not partner_member:
        partner_member = (
            db.query(ConversationMember)
            .filter(
                ConversationMember.conversation_id == conv.id,
                ConversationMember.user_id != current_user.id,
            )
            .first()
        )

    partner_user = partner_member.user if partner_member else None
    if not partner_user and partner_member:
        partner_user = db.query(User).filter(User.id == partner_member.user_id).first()

    partner_dto = (
        to_partner_response(partner_user)
        if partner_user
        else ConversationPartnerResponse(id=0, username="unknown", display_name="Người dùng")
    )

    # Tin nhắn cuối cùng
    last_msg = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.desc())
        .first()
    )

    # Số lượng tin nhắn chưa đọc gửi tới current_user
    unread_count = (
        db.query(Message)
        .filter(
            Message.conversation_id == conv.id,
            Message.sender_id != current_user.id,
            Message.read_at.is_(None),
        )
        .count()
    )

    # Kiểm tra trạng thái chặn giữa 2 bên
    is_blocked = False
    blocked_by_me = False
    if partner_user:
        block_entry = (
            db.query(Block)
            .filter(
                ((Block.blocker_id == current_user.id) & (Block.blocked_id == partner_user.id))
                | ((Block.blocker_id == partner_user.id) & (Block.blocked_id == current_user.id))
            )
            .first()
        )
        if block_entry:
            is_blocked = True
            blocked_by_me = (block_entry.blocker_id == current_user.id)

    return ConversationResponse(
        id=conv.id,
        created_at=conv.created_at,
        partner=partner_dto,
        last_message=MessageResponse.model_validate(last_msg) if last_msg else None,
        unread_count=unread_count,
        is_blocked=is_blocked,
        blocked_by_me=blocked_by_me,
    )


def get_or_create_conversation(
    db: Session, current_user: User, target_user_id: int
) -> ConversationResponse:
    """
    Tạo mới hoặc lấy cuộc hội thoại 1-1 giữa current_user và target_user_id.
    Đảm bảo tính duy nhất (idempotent): không tạo 2 cuộc hội thoại giữa cùng 2 người.
    """
    if target_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tự tạo cuộc hội thoại với chính mình",
        )

    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại",
        )

    # Tìm các conversation_id mà cả 2 người cùng tham gia
    user1_convs = select(ConversationMember.conversation_id).where(
        ConversationMember.user_id == current_user.id
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
        conv = (
            db.query(Conversation)
            .filter(Conversation.id == existing_member.conversation_id)
            .first()
        )
        return to_conversation_response(db, conv, current_user)

    # Nếu chưa có, tạo mới Conversation và 2 bản ghi ConversationMember
    new_conv = Conversation()
    db.add(new_conv)
    db.flush()  # Sinh new_conv.id

    mem1 = ConversationMember(conversation_id=new_conv.id, user_id=current_user.id)
    mem2 = ConversationMember(conversation_id=new_conv.id, user_id=target_user_id)
    db.add_all([mem1, mem2])
    db.commit()
    db.refresh(new_conv)

    return to_conversation_response(db, new_conv, current_user)


def get_user_conversations(db: Session, current_user: User) -> list[ConversationResponse]:
    """Lấy danh sách các cuộc hội thoại mà current_user tham gia, sắp xếp theo hoạt động gần nhất."""
    memberships = (
        db.query(ConversationMember)
        .filter(ConversationMember.user_id == current_user.id)
        .all()
    )

    if not memberships:
        return []

    conv_ids = [m.conversation_id for m in memberships]
    convs = db.query(Conversation).filter(Conversation.id.in_(conv_ids)).all()

    results = [to_conversation_response(db, c, current_user) for c in convs]

    # Sắp xếp hội thoại có tin nhắn mới nhất lên đầu
    results.sort(
        key=lambda c: (
            c.last_message.created_at if c.last_message else c.created_at
        ),
        reverse=True,
    )

    return results


def get_conversation_messages(
    db: Session, conversation_id: int, current_user: User, limit: int = 100
) -> list[MessageResponse]:
    """
    Lấy lịch sử tin nhắn của cuộc hội thoại.
    Yêu cầu: current_user phải là thành viên của cuộc hội thoại đó (403 nếu không phải).
    """
    is_member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == current_user.id,
        )
        .first()
    )

    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập cuộc hội thoại này",
        )

    # Đánh dấu đã đọc tất cả tin nhắn gửi tới current_user trong cuộc trò chuyện này
    now = datetime.now(timezone.utc)
    db.query(Message).filter(
        Message.conversation_id == conversation_id,
        Message.sender_id != current_user.id,
        Message.read_at.is_(None),
    ).update({Message.read_at: now}, synchronize_session=False)

    # ĐỒNG THỜI đánh dấu các thông báo Notification liên quan tới cuộc hội thoại này là đã đọc!
    notification_service.mark_conversation_notifications_read(
        db=db, conversation_id=conversation_id, user_id=current_user.id
    )

    db.commit()

    # Lấy tin nhắn theo thứ tự thời gian tăng dần
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc(), Message.id.desc())
        .limit(limit)
        .all()
    )

    messages.reverse()  # Đảo lại thứ tự tăng dần từ cũ -> mới
    return [MessageResponse.model_validate(m) for m in messages]


def is_conversation_blocked(db: Session, conversation_id: int, user_id: int) -> bool:
    """Kiểm tra xem cuộc hội thoại có thành viên nào đang chặn nhau không."""
    other_member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id != user_id,
        )
        .first()
    )
    if not other_member:
        return False

    block_entry = (
        db.query(Block)
        .filter(
            ((Block.blocker_id == user_id) & (Block.blocked_id == other_member.user_id))
            | ((Block.blocker_id == other_member.user_id) & (Block.blocked_id == user_id))
        )
        .first()
    )
    return block_entry is not None


def create_message(
    db: Session, conversation_id: int, sender_id: int, content: str
) -> Message:
    """
    Lưu tin nhắn mới vào database sau khi xác thực quyền thành viên.
    """
    is_member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id == sender_id,
        )
        .first()
    )

    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền gửi tin nhắn trong cuộc hội thoại này",
        )

    # Kiểm tra xem cuộc trò chuyện có bị chặn không
    if is_conversation_blocked(db, conversation_id, sender_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuộc hội thoại đã bị chặn. Không thể gửi tin nhắn.",
        )

    msg = Message(
        conversation_id=conversation_id,
        sender_id=sender_id,
        content=content.strip(),
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Tạo thông báo tin nhắn mới cho thành viên còn lại trong cuộc hội thoại
    recipient_member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == conversation_id,
            ConversationMember.user_id != sender_id,
        )
        .first()
    )
    if recipient_member:
        sender = db.query(User).filter(User.id == sender_id).first()
        sender_profile = getattr(sender, "profile", None)
        if isinstance(sender_profile, list):
            sender_profile = sender_profile[0] if sender_profile else None
        sender_name = (
            sender_profile.display_name
            if sender_profile and sender_profile.display_name
            else (sender.username if sender else "Ai đó")
        )
        preview = msg.content if len(msg.content) <= 80 else msg.content[:77] + "..."
        notification_service.create_notification(
            db=db,
            user_id=recipient_member.user_id,
            type="message",
            title=f"Tin nhắn mới từ {sender_name}",
            content=preview,
            related_id=conversation_id,
        )

    return msg


def mark_message_read(
    db: Session, message_id: int, current_user: User
) -> MessageResponse:
    """Đánh dấu một tin nhắn cụ thể là đã đọc."""
    msg = db.query(Message).filter(Message.id == message_id).first()
    if not msg:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tin nhắn",
        )

    # Kiểm tra current_user có thuộc conversation này không
    is_member = (
        db.query(ConversationMember)
        .filter(
            ConversationMember.conversation_id == msg.conversation_id,
            ConversationMember.user_id == current_user.id,
        )
        .first()
    )
    if not is_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền truy cập tin nhắn này",
        )

    if msg.sender_id != current_user.id and msg.read_at is None:
        msg.read_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(msg)

    return MessageResponse.model_validate(msg)
