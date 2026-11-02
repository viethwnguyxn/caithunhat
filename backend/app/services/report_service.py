from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..models.block import Block
from ..models.connection import Connection
from ..models.profile import Profile
from ..models.report import Report
from ..models.user import User
from ..schemas.report import BlockActionResponse, BlockedUserResponse, ReportCreate


def create_report(db: Session, reporter: User, report_in: ReportCreate) -> Report:
    """Tạo mới một báo cáo vi phạm."""
    if report_in.reported_id == reporter.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tự báo cáo chính mình",
        )

    target_user = db.query(User).filter(User.id == report_in.reported_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng bị báo cáo không tồn tại",
        )

    report = Report(
        reporter_id=reporter.id,
        reported_id=report_in.reported_id,
        reason=report_in.reason,
        description=report_in.description,
        status="pending",
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


def is_user_blocked(db: Session, user_a_id: int, user_b_id: int) -> tuple[bool, int | None]:
    """
    Kiểm tra xem 2 user có mối quan hệ chặn hay không (chiều A->B hoặc B->A).
    Trả về (True, blocker_id) nếu bị chặn, ngược lại (False, None).
    """
    block = (
        db.query(Block)
        .filter(
            ((Block.blocker_id == user_a_id) & (Block.blocked_id == user_b_id))
            | ((Block.blocker_id == user_b_id) & (Block.blocked_id == user_a_id))
        )
        .first()
    )
    if block:
        return True, block.blocker_id
    return False, None


def block_user(db: Session, blocker: User, target_user_id: int) -> BlockActionResponse:
    """
    Chặn một người dùng.
    1. Không tự chặn chính mình.
    2. Người dùng mục tiêu phải tồn tại.
    3. Thêm bản ghi vào bảng Block (nếu chưa có).
    4. Cập nhật Connection (nếu có) thành trạng thái 'blocked'.
    """
    if target_user_id == blocker.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Không thể tự chặn chính mình",
        )

    target_user = db.query(User).filter(User.id == target_user_id).first()
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng không tồn tại",
        )

    # Kiểm tra xem đã chặn chưa
    existing_block = (
        db.query(Block)
        .filter(Block.blocker_id == blocker.id, Block.blocked_id == target_user_id)
        .first()
    )
    if not existing_block:
        new_block = Block(blocker_id=blocker.id, blocked_id=target_user_id)
        db.add(new_block)

    # Cập nhật quan hệ Connection (nếu có) thành 'blocked'
    connection = (
        db.query(Connection)
        .filter(
            ((Connection.requester_id == blocker.id) & (Connection.receiver_id == target_user_id))
            | ((Connection.requester_id == target_user_id) & (Connection.receiver_id == blocker.id))
        )
        .first()
    )
    if connection:
        connection.status = "blocked"

    db.commit()
    return BlockActionResponse(success=True, message="Đã chặn người dùng thành công")


def unblock_user(db: Session, blocker: User, target_user_id: int) -> BlockActionResponse:
    """
    Bỏ chặn người dùng. Chỉ người đã chặn mới có quyền bỏ chặn.
    """
    block = (
        db.query(Block)
        .filter(Block.blocker_id == blocker.id, Block.blocked_id == target_user_id)
        .first()
    )
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bạn chưa chặn người dùng này",
        )

    db.delete(block)

    # Nếu có Connection đang ở trạng thái 'blocked', chuyển về 'rejected' để có thể gửi lại kết nối nếu muốn
    connection = (
        db.query(Connection)
        .filter(
            ((Connection.requester_id == blocker.id) & (Connection.receiver_id == target_user_id))
            | ((Connection.requester_id == target_user_id) & (Connection.receiver_id == blocker.id))
        )
        .first()
    )
    if connection and connection.status == "blocked":
        connection.status = "rejected"

    db.commit()
    return BlockActionResponse(success=True, message="Đã bỏ chặn người dùng thành công")


def get_blocked_users(db: Session, blocker: User) -> list[BlockedUserResponse]:
    """Lấy danh sách các tài khoản mà người dùng hiện tại đã chặn."""
    blocks = (
        db.query(Block)
        .filter(Block.blocker_id == blocker.id)
        .order_by(Block.created_at.desc())
        .all()
    )

    results: list[BlockedUserResponse] = []
    for b in blocks:
        user = db.query(User).filter(User.id == b.blocked_id).first()
        if not user:
            continue
        profile = getattr(user, "profile", None)
        if isinstance(profile, list):
            profile = profile[0] if profile else None

        results.append(
            BlockedUserResponse(
                id=b.id,
                user_id=user.id,
                username=user.username,
                display_name=profile.display_name if profile and profile.display_name else user.username,
                avatar_url=profile.avatar_url if profile and profile.avatar_url else user.avatar_url,
                created_at=b.created_at,
            )
        )
    return results

