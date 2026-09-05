from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.profile import Profile
from ..models.user import User
from ..schemas.profile import ProfileUpdate


def get_or_create_profile(db: Session, user: User) -> Profile:
    """Lấy Profile của user, nếu chưa có thì tự động tạo mới."""
    stmt = select(Profile).where(Profile.user_id == user.id)
    profile = db.execute(stmt).scalar_one_or_none()

    if not profile:
        profile = Profile(
            user_id=user.id,
            display_name=user.username,
            avatar_url=user.avatar_url,
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return profile


def update_user_profile(db: Session, user: User, profile_in: ProfileUpdate) -> Profile:
    """Cập nhật thông tin Profile cho user hiện tại."""
    profile = get_or_create_profile(db, user)

    # Cập nhật các trường được gửi lên
    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile
