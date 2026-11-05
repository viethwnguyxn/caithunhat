from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class PostAuthorResponse(BaseModel):
    """Thông tin tác giả của bài viết hoặc bình luận."""
    id: int
    username: str
    display_name: str | None = None
    avatar_url: str | None = None
    is_online: bool = False

    model_config = ConfigDict(from_attributes=True)


class CommentCreate(BaseModel):
    """Schema tạo bình luận mới."""
    content: str = Field(..., min_length=1, max_length=1000, description="Nội dung bình luận")


class CommentResponse(BaseModel):
    """Schema trả về thông tin bình luận."""
    id: int
    post_id: int
    content: str
    created_at: datetime
    author: PostAuthorResponse

    model_config = ConfigDict(from_attributes=True)


class PostCreate(BaseModel):
    """Schema tạo bài viết / khoảnh khắc mới."""
    category: str = Field(
        ..., min_length=2, max_length=50, description="Chủ đề bài viết: Công nghệ, Đọc sách, Nghệ thuật, v.v."
    )
    content: str = Field(..., min_length=1, max_length=3000, description="Nội dung bài viết")
    image_url: str | None = Field(None, max_length=500, description="URL hình ảnh đính kèm (Locket/Story)")
    mood: str | None = Field(None, max_length=50, description="Cảm xúc/Tâm trạng hiện tại")


class PostResponse(BaseModel):
    """Schema thông tin bài viết trả về client."""
    id: int
    category: str
    content: str
    image_url: str | None = None
    mood: str | None = None
    created_at: datetime
    updated_at: datetime
    author: PostAuthorResponse
    likes_count: int = 0
    comments_count: int = 0
    is_liked_by_me: bool = False
    comments: list[CommentResponse] = []

    model_config = ConfigDict(from_attributes=True)


class LikeToggleResponse(BaseModel):
    """Schema kết quả khi bấm thả tim / hủy thả tim."""
    liked: bool
    likes_count: int
    message: str


class PostActionResponse(BaseModel):
    """Schema phản hồi cho thao tác xóa bài viết hoặc bình luận."""
    success: bool = True
    message: str
