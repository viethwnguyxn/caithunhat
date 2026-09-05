from datetime import datetime
from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    """Schema trả về thông tin chi tiết một thông báo."""
    id: int
    user_id: int
    type: str
    title: str
    content: str
    related_id: int | None = None
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    """Schema trả về danh sách thông báo kèm số lượng chưa đọc."""
    items: list[NotificationResponse]
    unread_count: int


class NotificationActionResponse(BaseModel):
    """Schema phản hồi cho các hành động đánh dấu đã đọc."""
    success: bool = True
    message: str

