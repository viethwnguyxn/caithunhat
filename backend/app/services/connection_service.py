from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.block import Block
from ..models.connection import Connection
from ..models.user import User
from ..schemas.connection import (
    ConnectionRequestsResponse,
    ConnectionResponse,
    ConnectionUserResponse,
)
from . import notification_service


def to_connection_user_response(user: User) -> ConnectionUserResponse:
    """Chuyển đổi User thành ConnectionUserResponse chứa thông tin công khai."""
    profile = getattr(user, "profile", None)
    if isinstance(profile, list):
        profile = profile[0] if profile else None

    return ConnectionUserResponse(
        id=user.id,
        username=user.username,
        display_name=profile.display_name if profile and profile.display_name else user.username,
        avatar_url=profile.avatar_url if profile and profile.avatar_url else user.avatar_url,
        bio=profile.bio if profile else None,
        age_group=profile.age_group if profile else None,
        current_status=profile.current_status if profile else None,
        is_online=bool(user.is_online),
    )


def to_connection_response(conn: Connection, other_user: User) -> ConnectionResponse:
    """Chuyển đổi Connection ORM object thành ConnectionResponse Pydantic model."""
    return ConnectionResponse(
        id=conn.id,
        requester_id=conn.requester_id,
        receiver_id=conn.receiver_id,
        status=conn.status,
        created_at=conn.created_at,
        updated_at=conn.updated_at,
        user=to_connection_user_response(other_user),
    )


def send_connection_request(
    db: Session, current_user: User, target_user_id: int
) -> ConnectionResponse:
    """
    Gửi lời mời kết nối tới target_user_id.
    Quy tắc:
    - Không gửi cho chính mình.
    - target_user phải tồn tại.
    - Không trùng lặp nếu đã pending hoặc accepted.
    - Nếu đã từng rejected, cho phép cập nhật lại thành pending.
    """
    if target_user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể gửi lời mời kết nối cho chính mình",
        )

    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại",
        )

    # Kiểm tra xem có ai chặn ai không
    block = (
        db.query(Block)
        .filter(
            ((Block.blocker_id == current_user.id) & (Block.blocked_id == target_user_id))
            | ((Block.blocker_id == target_user_id) & (Block.blocked_id == current_user.id))
        )
        .first()
    )
    if block:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể thực hiện kết nối do người dùng đã bị chặn",
        )

    # Tìm quan hệ kết nối giữa 2 người (bất kể chiều nào)
    existing = (
        db.query(Connection)
        .filter(
            (
                (Connection.requester_id == current_user.id)
                & (Connection.receiver_id == target_user_id)
            )
            | (
                (Connection.requester_id == target_user_id)
                & (Connection.receiver_id == current_user.id)
            )
        )
        .first()
    )

    if existing:
        if existing.status == "accepted":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Hai người đã là bạn bè với nhau rồi",
            )
        if existing.status == "pending":
            if existing.requester_id == current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Bạn đã gửi lời mời kết nối cho người này rồi, vui lòng chờ phản hồi",
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Người này đã gửi lời mời kết nối cho bạn trước đó, hãy kiểm tra danh sách lời mời nhận được",
                )
        if existing.status == "blocked":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể thực hiện kết nối",
            )
        if existing.status == "rejected":
            # Cho phép gửi lại yêu cầu bằng cách cập nhật lại bản ghi cũ
            existing.requester_id = current_user.id
            existing.receiver_id = target_user_id
            existing.status = "pending"
            db.commit()
            db.refresh(existing)

            # Tạo thông báo cho người nhận
            sender_profile = getattr(current_user, "profile", None)
            if isinstance(sender_profile, list):
                sender_profile = sender_profile[0] if sender_profile else None
            sender_name = (
                sender_profile.display_name
                if sender_profile and sender_profile.display_name
                else current_user.username
            )
            notification_service.create_notification(
                db=db,
                user_id=target_user_id,
                type="connection_request",
                title="Lời mời kết nối mới",
                content=f"{sender_name} đã gửi lời mời kết nối tới bạn.",
                related_id=current_user.id,
            )
            return to_connection_response(existing, target_user)

    # Tạo mới bản ghi Connection
    new_conn = Connection(
        requester_id=current_user.id,
        receiver_id=target_user_id,
        status="pending",
    )
    db.add(new_conn)
    db.commit()
    db.refresh(new_conn)

    # Tạo thông báo cho người nhận
    sender_profile = getattr(current_user, "profile", None)
    if isinstance(sender_profile, list):
        sender_profile = sender_profile[0] if sender_profile else None
    sender_name = (
        sender_profile.display_name
        if sender_profile and sender_profile.display_name
        else current_user.username
    )
    notification_service.create_notification(
        db=db,
        user_id=target_user_id,
        type="connection_request",
        title="Lời mời kết nối mới",
        content=f"{sender_name} đã gửi lời mời kết nối tới bạn.",
        related_id=current_user.id,
    )

    return to_connection_response(new_conn, target_user)


def get_my_connections(db: Session, current_user: User) -> list[ConnectionResponse]:
    """Lấy danh sách các kết nối đã được chấp nhận (accepted) của người dùng hiện tại."""
    conns = (
        db.query(Connection)
        .filter(
            Connection.status == "accepted",
            (Connection.requester_id == current_user.id)
            | (Connection.receiver_id == current_user.id),
        )
        .order_by(Connection.updated_at.desc())
        .all()
    )

    result: list[ConnectionResponse] = []
    for c in conns:
        other_user = c.receiver if c.requester_id == current_user.id else c.requester
        result.append(to_connection_response(c, other_user))
    return result


def get_connection_requests(
    db: Session, current_user: User
) -> ConnectionRequestsResponse:
    """Lấy danh sách các lời mời kết nối đang chờ (pending) gửi đến và gửi đi."""
    incoming_conns = (
        db.query(Connection)
        .filter(
            Connection.receiver_id == current_user.id,
            Connection.status == "pending",
        )
        .order_by(Connection.created_at.desc())
        .all()
    )

    outgoing_conns = (
        db.query(Connection)
        .filter(
            Connection.requester_id == current_user.id,
            Connection.status == "pending",
        )
        .order_by(Connection.created_at.desc())
        .all()
    )

    incoming = [to_connection_response(c, c.requester) for c in incoming_conns]
    outgoing = [to_connection_response(c, c.receiver) for c in outgoing_conns]

    return ConnectionRequestsResponse(incoming=incoming, outgoing=outgoing)


def accept_connection(
    db: Session, connection_id: int, current_user: User
) -> ConnectionResponse:
    """
    Chấp nhận lời mời kết nối.
    Quy tắc:
    - Chỉ người nhận (receiver_id) mới có quyền accept.
    - Connection phải ở trạng thái pending.
    """
    conn = db.query(Connection).filter(Connection.id == connection_id).first()
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lời mời kết nối",
        )

    if conn.receiver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền chấp nhận lời mời này",
        )

    if conn.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lời mời không ở trạng thái chờ duyệt (trạng thái hiện tại: {conn.status})",
        )

    conn.status = "accepted"
    db.commit()
    db.refresh(conn)

    # Tạo thông báo cho người gửi lời mời ban đầu (requester)
    accepter_profile = getattr(current_user, "profile", None)
    if isinstance(accepter_profile, list):
        accepter_profile = accepter_profile[0] if accepter_profile else None
    accepter_name = (
        accepter_profile.display_name
        if accepter_profile and accepter_profile.display_name
        else current_user.username
    )
    notification_service.create_notification(
        db=db,
        user_id=conn.requester_id,
        type="connection_accepted",
        title="Lời mời kết nối được chấp nhận",
        content=f"{accepter_name} đã chấp nhận lời mời kết nối của bạn.",
        related_id=current_user.id,
    )

    return to_connection_response(conn, conn.requester)


def reject_connection(
    db: Session, connection_id: int, current_user: User
) -> ConnectionResponse:
    """
    Từ chối lời mời kết nối.
    Quy tắc:
    - Chỉ người nhận (receiver_id) mới có quyền reject.
    - Connection phải ở trạng thái pending.
    """
    conn = db.query(Connection).filter(Connection.id == connection_id).first()
    if not conn:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lời mời kết nối",
        )

    if conn.receiver_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền từ chối lời mời này",
        )

    if conn.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Lời mời không ở trạng thái chờ duyệt (trạng thái hiện tại: {conn.status})",
        )

    conn.status = "rejected"
    db.commit()
    db.refresh(conn)
    return to_connection_response(conn, conn.requester)
