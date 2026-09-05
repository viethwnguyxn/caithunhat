from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models.user import User
from ..routers.deps import get_current_user
from ..schemas.notification import (
    NotificationActionResponse,
    NotificationListResponse,
    NotificationResponse,
)
from ..services import notification_service

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
def get_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách thông báo của người dùng hiện tại kèm số lượng chưa đọc."""
    return notification_service.get_user_notifications(db, current_user.id)


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Đánh dấu một thông báo cụ thể là đã đọc."""
    return notification_service.mark_notification_read(db, notification_id, current_user.id)


@router.put("/read-all", response_model=NotificationActionResponse)
def mark_all_notifications_as_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Đánh dấu tất cả thông báo của người dùng là đã đọc."""
    count = notification_service.mark_all_read(db, current_user.id)
    return NotificationActionResponse(
        success=True,
        message=f"Đã đánh dấu {count} thông báo là đã đọc",
    )

