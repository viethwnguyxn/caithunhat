from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models.profile import Profile
from ..models.user import User
from ..schemas.profile import ProfileResponse
from ..schemas.user import UserResponse
from ..services.profile_service import get_or_create_profile
from .deps import get_current_user

router = APIRouter(prefix="/api/users", tags=["Users"])


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Lấy thông tin tài khoản người dùng hiện tại",
)
def get_me(current_user: User = Depends(get_current_user)):
    """Protected endpoint: Chỉ người dùng có JWT hợp lệ mới truy cập được."""
    return current_user


@router.get(
    "/{user_id}/public",
    response_model=ProfileResponse,
    summary="Lấy thông tin hồ sơ công khai của người dùng (Alias route)",
)
def get_user_public_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Protected endpoint: Lấy hồ sơ công khai của người dùng theo ID (khớp với tài liệu README/MVP_STATUS).
    Bảo mật tuyệt đối: Không trả về password_hash hoặc email cá nhân.
    """
    stmt = select(Profile).where(Profile.user_id == user_id)
    profile = db.execute(stmt).scalar_one_or_none()

    if not profile:
        user_stmt = select(User).where(User.id == user_id, User.is_active == True)
        target_user = db.execute(user_stmt).scalar_one_or_none()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy người dùng",
            )
        profile = get_or_create_profile(db=db, user=target_user)

    return profile
