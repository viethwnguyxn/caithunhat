from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ConnectionUserResponse(BaseModel):
    """Thông tin công khai của người dùng trong kết nối."""
    id: int
    username: str
    display_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    age_group: str | None = None
    current_status: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ConnectionResponse(BaseModel):
    """Chi tiết một kết nối kèm thông tin người đối diện."""
    id: int
    requester_id: int
    receiver_id: int
    status: str  # pending, accepted, rejected, blocked
    created_at: datetime
    updated_at: datetime
    user: ConnectionUserResponse

    model_config = ConfigDict(from_attributes=True)


class ConnectionRequestsResponse(BaseModel):
    """Danh sách lời mời kết nối đến (incoming) và đi (outgoing)."""
    incoming: list[ConnectionResponse] = []
    outgoing: list[ConnectionResponse] = []


class ConnectionActionResponse(BaseModel):
    """Phản hồi sau khi thực hiện thao tác kết nối."""
    message: str
    connection: ConnectionResponse

