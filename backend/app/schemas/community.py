from datetime import datetime

from pydantic import BaseModel, Field


class CommunityBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Tên cộng đồng")
    description: str = Field(..., min_length=5, description="Mô tả cộng đồng")
    category: str = Field(..., max_length=50, description="Chủ đề / Danh mục")
    icon: str = Field(default="👥", max_length=50, description="Icon emoji đại diện")
    tags: str | None = Field(default=None, max_length=255, description="Các thẻ tag cách nhau bằng dấu phẩy")


class CommunityCreate(CommunityBase):
    pass


class CommunityMemberResponse(BaseModel):
    user_id: int
    username: str
    display_name: str
    avatar_url: str | None = None
    role: str = "member"
    joined_at: datetime

    class Config:
        from_attributes = True


class CommunityResponse(CommunityBase):
    id: int
    creator_id: int
    conversation_id: int | None = None
    members_count: int = 0
    posts_count: int = 0
    is_joined: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CommunityDetailResponse(CommunityResponse):
    members: list[CommunityMemberResponse] = []
