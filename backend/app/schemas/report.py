from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ReportCreate(BaseModel):
    """Schema gửi báo cáo vi phạm."""
    reported_id: int = Field(..., description="ID của người dùng bị báo cáo")
    reason: str = Field(..., min_length=2, max_length=100, description="Lý do báo cáo: Spam, Quấy rối, Lừa đảo, Nội dung phản cảm, Khác")
    description: str | None = Field(None, max_length=1000, description="Mô tả chi tiết vi phạm (tùy chọn)")


class ReportResponse(BaseModel):
    """Schema trả về thông tin chi tiết một báo cáo."""
    id: int
    reporter_id: int
    reported_id: int
    reason: str
    description: str | None = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BlockedUserResponse(BaseModel):
    """Thông tin của người dùng nằm trong danh sách đã bị chặn."""
    id: int
    user_id: int
    username: str
    display_name: str | None = None
    avatar_url: str | None = None
    created_at: datetime


class BlockActionResponse(BaseModel):
    """Schema phản hồi cho thao tác chặn hoặc bỏ chặn."""
    success: bool = True
    message: str

