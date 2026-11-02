from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class MessageCreate(BaseModel):
    """Schema tạo tin nhắn mới."""
    content: str = Field(..., min_length=1, max_length=5000, description="Nội dung tin nhắn")


class MessageResponse(BaseModel):
    """Schema trả về thông tin tin nhắn."""
    id: int
    conversation_id: int
    sender_id: int
    content: str
    created_at: datetime
    read_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ConversationPartnerResponse(BaseModel):
    """Thông tin của đối phương trong cuộc hội thoại 1-1."""
    id: int
    username: str
    display_name: str | None = None
    avatar_url: str | None = None
    current_status: str | None = None
    is_online: bool = False
    last_seen: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    """Schema thông tin cuộc hội thoại kèm đối phương và tin nhắn cuối."""
    id: int
    created_at: datetime
    partner: ConversationPartnerResponse
    last_message: MessageResponse | None = None
    unread_count: int = 0
    is_blocked: bool = False
    blocked_by_me: bool = False

    model_config = ConfigDict(from_attributes=True)


class WebSocketMessagePayload(BaseModel):
    """Định dạng message client gửi lên qua WebSocket."""
    type: str = "message"
    content: str


class WebSocketServerMessage(BaseModel):
    """Định dạng server broadcast tới các client qua WebSocket."""
    type: str = "message"
    message: MessageResponse

