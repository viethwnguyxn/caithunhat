from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.notification import Notification
from ..schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
)

VALID_NOTIFICATION_TYPES = {
    "connection_request",
    "connection_accepted",
    "message",
    "group_join",
    "group_post",
    "post_like",
    "post_comment",
    "mention",
}


def create_notification(
    db: Session,
    user_id: int,
    type: str,
    title: str,
    content: str,
    related_id: int | None = None,
) -> Notification:
    """
    Tạo thông báo mới cho người dùng.
    """
    if type not in VALID_NOTIFICATION_TYPES:
        # Vẫn cho phép lưu nếu type mở rộng trong tương lai nhưng log cảnh báo nếu cần
        pass

    notification = Notification(
        user_id=user_id,
        type=type,
        title=title,
        content=content,
        related_id=related_id,
        is_read=False,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


def get_user_notifications(
    db: Session, user_id: int, limit: int = 50
) -> NotificationListResponse:
    """
    Lấy danh sách thông báo mới nhất của người dùng kèm số lượng chưa đọc.
    """
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )

    unread_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .count()
    )

    return NotificationListResponse(
        items=[NotificationResponse.model_validate(n) for n in notifications],
        unread_count=unread_count,
    )


def mark_notification_read(
    db: Session, notification_id: int, user_id: int
) -> NotificationResponse:
    """
    Đánh dấu một thông báo cụ thể là đã đọc.
    """
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id)
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông báo",
        )

    if notification.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thao tác trên thông báo này",
        )

    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return NotificationResponse.model_validate(notification)


def mark_all_read(db: Session, user_id: int) -> int:
    """
    Đánh dấu tất cả thông báo chưa đọc của người dùng thành đã đọc.
    Trả về số lượng bản ghi đã được cập nhật.
    """
    updated_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .update({Notification.is_read: True})
    )
    db.commit()
    return updated_count


def mark_conversation_notifications_read(
    db: Session, conversation_id: int, user_id: int
) -> int:
    """
    Đánh dấu tất cả thông báo tin nhắn thuộc một cuộc hội thoại cụ thể là đã đọc.
    """
    updated_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == user_id,
            Notification.type == "message",
            Notification.related_id == conversation_id,
            Notification.is_read.is_(False),
        )
        .update({Notification.is_read: True}, synchronize_session=False)
    )
    db.commit()
    return updated_count
