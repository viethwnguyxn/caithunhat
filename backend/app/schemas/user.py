import re
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field, field_validator


class UserCreate(BaseModel):
    email: str = Field(..., description="Email người dùng")
    username: str = Field(..., min_length=3, max_length=30, description="Tên đăng nhập")
    password: str = Field(..., min_length=8, max_length=128, description="Mật khẩu tối thiểu 8 ký tự")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
        if not re.match(pattern, v.strip()):
            raise ValueError("Email không hợp lệ")
        return v.strip().lower()

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        clean_v = v.strip()
        if not re.match(r"^[a-zA-Z0-9_]+$", clean_v):
            raise ValueError("Username chỉ được chứa chữ cái, số và dấu gạch dưới")
        return clean_v


class LoginRequest(BaseModel):
    account: str = Field(..., description="Email hoặc Username")
    password: str = Field(..., description="Mật khẩu")


class GoogleLoginRequest(BaseModel):
    id_token: str = Field(..., description="Google ID Token nhận từ Google Identity Services")


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    username: str
    auth_provider: str = "local"
    role: str = "user"
    avatar_url: str | None = None
    is_active: bool
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse | None = None
