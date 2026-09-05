from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models.profile import Profile
from ..models.user import User
from ..schemas.profile import ProfileResponse, ProfileUpdate
from ..services.profile_service import get_or_create_profile, update_user_profile
from .deps import get_current_user

router = APIRouter(prefix="/api/profile", tags=["Profile"])


@router.get(
    "/me",
    response_model=ProfileResponse,
    summary="Lấy thông tin Profile của người dùng hiện tại",
)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Protected: Lấy profile cá nhân."""
    profile = get_or_create_profile(db=db, user=current_user)
    return profile


@router.put(
    "/me",
    response_model=ProfileResponse,
    summary="Cập nhật thông tin Profile của người dùng hiện tại",
)
def update_my_profile(
    profile_in: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Protected: Chỉ user hiện tại mới được sửa profile của mình."""
    profile = update_user_profile(db=db, user=current_user, profile_in=profile_in)
    return profile


@router.get(
    "/{user_id}",
    response_model=ProfileResponse,
    summary="Xem hồ sơ công khai của một người dùng bất kỳ",
)
def get_public_profile(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Protected: Xem thông tin công khai của người dùng khác. Tuyệt đối không trả về password hay email."""
    stmt = select(Profile).where(Profile.user_id == user_id)
    profile = db.execute(stmt).scalar_one_or_none()

    if not profile:
        # Kiểm tra user có tồn tại không
        user_stmt = select(User).where(User.id == user_id, User.is_active == True)
        target_user = db.execute(user_stmt).scalar_one_or_none()
        if not target_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy người dùng",
            )
        profile = get_or_create_profile(db=db, user=target_user)

    return profile
