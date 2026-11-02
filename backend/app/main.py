from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from .core.security import hash_password
from .db.database import Base, SessionLocal, engine, get_db
from .models import (
    Block,
    Connection,
    Conversation,
    ConversationMember,
    Message,
    Notification,
    Post,
    PostComment,
    PostLike,
    Profile,
    Report,
    SurveyAnswer,
    User,
)  # Đăng ký models vào Base.metadata
from .routers import (
    admin_router,
    auth_router,
    chat_router,
    connections_router,
    matching_router,
    notifications_router,
    posts_router,
    profile_router,
    reports_router,
    survey_router,
    users_router,
)

# Tự động tạo bảng nếu chưa có
Base.metadata.create_all(bind=engine)

# Đảm bảo SQLite tương thích khi thêm cột mới vào bảng users đã tồn tại
with engine.connect() as conn:
    try:
        cols = [r[1] for r in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
        if "role" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' NOT NULL"))
        if "auth_provider" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'local' NOT NULL"))
        if "avatar_url" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)"))
        if "is_online" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT 0 NOT NULL"))
        if "last_seen" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_seen DATETIME"))
        conn.commit()
    except Exception:
        pass


def ensure_admin_user():
    """Khởi tạo tài khoản Quản trị viên mặc định nếu chưa tồn tại."""
    with SessionLocal() as db:
        admin_email = "admin@kindred.local"
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                email=admin_email,
                username="admin",
                password_hash=hash_password("admin123"),
                auth_provider="local",
                role="admin",
                is_active=True,
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
        else:
            if admin.role != "admin":
                admin.role = "admin"
                db.commit()

        p = db.query(Profile).filter(Profile.user_id == admin.id).first()
        if not p:
            p = Profile(
                user_id=admin.id,
                display_name="Kindred Administrator",
                bio="Quản trị viên hệ thống kết nối cộng đồng Kindred",
            )
            db.add(p)
            db.commit()


try:
    ensure_admin_user()
except Exception:
    pass

app = FastAPI(title="Community Connection Platform")

import os

cors_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
]
env_cors = os.getenv("CORS_ORIGINS")
if env_cors:
    cors_origins.extend([o.strip() for o in env_cors.split(",") if o.strip()])

# Cho phép frontend gọi API (hỗ trợ cả localhost và các domain deploy HTTPS như Vercel)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https:\/\/.*$" if not env_cors else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gắn các routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(profile_router)
app.include_router(survey_router)
app.include_router(matching_router)
app.include_router(connections_router)
app.include_router(chat_router)
app.include_router(notifications_router)
app.include_router(reports_router)
app.include_router(admin_router)
app.include_router(posts_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/db-check")
def db_check(db: Session = Depends(get_db)):
    """Kiểm tra database connection có hoạt động không."""
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
