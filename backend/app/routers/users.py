from fastapi import APIRouter, Depends

from ..models.user import User
from ..schemas.user import UserResponse
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
