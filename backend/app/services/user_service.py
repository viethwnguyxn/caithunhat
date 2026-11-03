import re
import uuid
from fastapi import HTTPException, status
from google.auth.transport import requests
from google.oauth2 import id_token
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..core.config import GOOGLE_CLIENT_ID
from ..core.security import hash_password, verify_password
from ..models.user import User
from ..schemas.user import UserCreate


def register_user(db: Session, user_in: UserCreate) -> User:
    """Xử lý business logic đăng ký người dùng mới bằng email/password."""
    # 1. Kiểm tra email đã tồn tại chưa
    stmt_email = select(User).where(User.email == user_in.email)
    existing_user_email = db.execute(stmt_email).scalar_one_or_none()
    if existing_user_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email đã được sử dụng",
        )

    # 2. Kiểm tra username đã tồn tại chưa
    stmt_username = select(User).where(User.username == user_in.username)
    existing_user_username = db.execute(stmt_username).scalar_one_or_none()
    if existing_user_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username đã được sử dụng",
        )

    # 3. Hash mật khẩu
    hashed_pwd = hash_password(user_in.password)

    # 4. Lưu người dùng mới vào Database
    new_user = User(
        email=user_in.email,
        username=user_in.username,
        password_hash=hashed_pwd,
        auth_provider="local",
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


def authenticate_user(db: Session, account: str, password: str) -> User:
    """Xác thực đăng nhập người dùng bằng email/username và mật khẩu."""
    clean_account = account.strip().lower()

    # Tìm user theo email hoặc username
    stmt = select(User).where(
        or_(
            User.email == clean_account,
            User.username == account.strip(),
        )
    )
    user = db.execute(stmt).scalar_one_or_none()

    # Nếu user tạo qua Google và chưa đặt password
    if user and user.password_hash is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản này được đăng ký qua Google. Vui lòng bấm 'Continue with Google'.",
        )

    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa",
        )

    return user


def verify_google_token(token_str: str) -> dict:
    """Xác thực Google ID Token với Google API (Bắt buộc kiểm tra chính xác audience client_id)."""
    client_id = (GOOGLE_CLIENT_ID or "").strip()
    if not client_id or client_id.startswith("your_"):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Máy chủ chưa được cấu hình GOOGLE_CLIENT_ID hợp lệ. Vui lòng cấu hình biến môi trường trên Render/Server.",
        )

    try:
        req = requests.Request()
        id_info = id_token.verify_oauth2_token(token_str, req, audience=client_id)

        # Đảm bảo issuer từ Google
        if id_info.get("iss") not in ["accounts.google.com", "https://accounts.google.com"]:
            raise ValueError("Token không phải từ Google")

        return id_info
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Xác thực Google Token thất bại: {str(e)}",
        )


def authenticate_or_create_google_user(db: Session, google_id_token: str) -> User:
    """Xử lý đăng nhập hoặc tạo mới user từ Google OAuth."""
    payload = verify_google_token(google_id_token)
    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google Token không cung cấp email người dùng",
        )

    email = email.strip().lower()
    avatar_url = payload.get("picture")

    # 1. Kiểm tra xem user với email này đã tồn tại chưa
    stmt = select(User).where(User.email == email)
    user = db.execute(stmt).scalar_one_or_none()

    if user:
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị vô hiệu hóa",
            )
        # Cập nhật avatar nếu có
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
            db.commit()
            db.refresh(user)
        return user

    # 2. Nếu chưa tồn tại -> Tạo user mới
    # Tạo username từ email hoặc tên
    base_username = email.split("@")[0]
    clean_username = re.sub(r"[^a-zA-Z0-9_]", "_", base_username)[:20]

    # Đảm bảo username là duy nhất
    candidate_username = clean_username
    counter = 1
    while True:
        stmt_check = select(User).where(User.username == candidate_username)
        if not db.execute(stmt_check).scalar_one_or_none():
            break
        candidate_username = f"{clean_username[:15]}_{counter}"
        counter += 1

    new_user = User(
        email=email,
        username=candidate_username,
        password_hash=None,  # Không có mật khẩu đối với tài khoản Google
        auth_provider="google",
        avatar_url=avatar_url,
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


def get_user_by_id(db: Session, user_id: int) -> User | None:
    """Tìm người dùng theo ID."""
    stmt = select(User).where(User.id == user_id)
    return db.execute(stmt).scalar_one_or_none()
