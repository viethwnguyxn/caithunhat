from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models.user import User
from ..routers.deps import get_current_user
from ..schemas.connection import (
    ConnectionActionResponse,
    ConnectionRequestsResponse,
    ConnectionResponse,
)
from ..services import connection_service

router = APIRouter(prefix="/api/connections", tags=["connections"])


@router.post("/{user_id}", response_model=ConnectionActionResponse, status_code=status.HTTP_201_CREATED)
def send_connection_request(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gửi lời mời kết nối tới người dùng có user_id."""
    conn = connection_service.send_connection_request(db, current_user, user_id)
    return ConnectionActionResponse(
        message="Gửi lời mời kết nối thành công",
        connection=conn,
    )


@router.get("", response_model=list[ConnectionResponse])
def get_my_connections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách các kết nối đã được chấp nhận (bạn bè) của người dùng hiện tại."""
    return connection_service.get_my_connections(db, current_user)


@router.get("/requests", response_model=ConnectionRequestsResponse)
def get_connection_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách lời mời kết nối đang chờ duyệt: gửi đến (incoming) và gửi đi (outgoing)."""
    return connection_service.get_connection_requests(db, current_user)


@router.put("/{connection_id}/accept", response_model=ConnectionActionResponse)
def accept_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chấp nhận lời mời kết nối (chỉ người nhận được phép)."""
    conn = connection_service.accept_connection(db, connection_id, current_user)
    return ConnectionActionResponse(
        message="Đã chấp nhận lời mời kết nối",
        connection=conn,
    )


@router.put("/{connection_id}/reject", response_model=ConnectionActionResponse)
def reject_connection(
    connection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Từ chối lời mời kết nối (chỉ người nhận được phép)."""
    conn = connection_service.reject_connection(db, connection_id, current_user)
    return ConnectionActionResponse(
        message="Đã từ chối lời mời kết nối",
        connection=conn,
    )

