from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class AdminStatsResponse(BaseModel):
    """Thống kê tổng quan hệ thống."""
    total_users: int
    active_users: int
    locked_users: int
    pending_reports: int
    total_reports: int


class AdminUserResponse(BaseModel):
    """Thông tin chi tiết người dùng phục vụ trang quản trị."""
    id: int
    email: str
    username: str
    role: str
    is_active: bool
    is_online: bool
    display_name: str | None = None
    avatar_url: str | None = None
    auth_provider: str = "local"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminUserStatusResponse(BaseModel):
    """Kết quả khi thay đổi trạng thái kích hoạt của người dùng."""
    success: bool = True
    message: str
    user_id: int
    is_active: bool


class AdminReportUserSummary(BaseModel):
    """Tóm tắt người dùng trong đơn tố cáo."""
    id: int
    username: str
    display_name: str | None = None
    avatar_url: str | None = None
    is_active: bool


class AdminReportDetailResponse(BaseModel):
    """Chi tiết đơn báo cáo vi phạm gửi tới Admin."""
    id: int
    reporter: AdminReportUserSummary
    reported: AdminReportUserSummary
    reason: str
    description: str | None = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminReportUpdate(BaseModel):
    """Yêu cầu cập nhật trạng thái đơn báo cáo vi phạm."""
    status: str = Field(..., description="Trạng thái mới: 'resolved' hoặc 'dismissed'")
    lock_reported_user: bool = Field(
        False, description="Tùy chọn khóa luôn tài khoản bị báo cáo nếu xác nhận vi phạm nghiêm trọng"
    )

