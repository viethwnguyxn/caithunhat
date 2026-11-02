from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models.user import User
from ..routers.deps import get_current_user
from ..schemas.report import (
    BlockActionResponse,
    BlockedUserResponse,
    ReportCreate,
    ReportResponse,
)
from ..services import report_service

router = APIRouter(prefix="/api", tags=["reports_and_blocks"])


@router.post("/reports", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def submit_report(
    report_in: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Gửi báo cáo vi phạm người dùng."""
    return report_service.create_report(db=db, reporter=current_user, report_in=report_in)


@router.post("/blocks/{user_id}", response_model=BlockActionResponse)
def block_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Chặn một người dùng theo user_id."""
    return report_service.block_user(db=db, blocker=current_user, target_user_id=user_id)


@router.delete("/blocks/{user_id}", response_model=BlockActionResponse)
def unblock_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Bỏ chặn người dùng theo user_id."""
    return report_service.unblock_user(db=db, blocker=current_user, target_user_id=user_id)


@router.get("/blocks", response_model=list[BlockedUserResponse])
def get_blocked_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách người dùng mà tài khoản hiện tại đã chặn."""
    return report_service.get_blocked_users(db=db, blocker=current_user)

