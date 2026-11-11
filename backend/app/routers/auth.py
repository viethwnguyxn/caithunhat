from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from ..core.security import create_access_token
from ..db.database import get_db
from ..schemas.user import (
    GoogleLoginRequest,
    LoginRequest,
    TokenResponse,
    UserCreate,
    UserResponse,
)
from ..services.user_service import (
    authenticate_or_create_google_user,
    authenticate_user,
    register_user,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản người dùng mới",
)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """API endpoint xử lý đăng ký tài khoản."""
    user = register_user(db=db, user_in=user_in)
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Đăng nhập và nhận JWT access token",
)
def login(login_in: LoginRequest, db: Session = Depends(get_db)):
    """API endpoint xử lý đăng nhập bằng email hoặc username và mật khẩu."""
    user = authenticate_user(db=db, account=login_in.account, password=login_in.password)
    access_token = create_access_token(subject=user.id)
    return TokenResponse(access_token=access_token, token_type="bearer", user=user)


@router.post(
    "/google",
    response_model=TokenResponse,
    summary="Đăng nhập hoặc đăng ký bằng Google OAuth",
)
def google_auth(google_in: GoogleLoginRequest, db: Session = Depends(get_db)):
    """API endpoint xác thực Google ID Token và trả về JWT access token."""
    user = authenticate_or_create_google_user(db=db, google_id_token=google_in.id_token)
    access_token = create_access_token(subject=user.id)
    return TokenResponse(access_token=access_token, token_type="bearer", user=user)
