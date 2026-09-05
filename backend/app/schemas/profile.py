from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class ProfileUpdate(BaseModel):
    display_name: str | None = Field(None, max_length=100, description="Tên hiển thị")
    avatar_url: str | None = Field(None, max_length=500, description="URL ảnh đại diện")
    bio: str | None = Field(None, max_length=1000, description="Tiểu sử / giới thiệu bản thân")
    age_group: str | None = Field(None, max_length=50, description="Nhóm tuổi (vd: 21-24)")
    current_status: str | None = Field(None, max_length=100, description="Trạng thái hiện tại")


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    display_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    age_group: str | None = None
    current_status: str | None = None
    created_at: datetime
    updated_at: datetime
