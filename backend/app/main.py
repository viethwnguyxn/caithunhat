from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

from .db.database import Base, engine, get_db
from .models import (
    Connection,
    Conversation,
    ConversationMember,
    Message,
    Notification,
    Profile,
    SurveyAnswer,
    User,
)  # Đăng ký models vào Base.metadata
from .routers import (
    auth_router,
    chat_router,
    connections_router,
    matching_router,
    notifications_router,
    profile_router,
    survey_router,
    users_router,
)

# Tự động tạo bảng nếu chưa có
Base.metadata.create_all(bind=engine)

# Đảm bảo SQLite tương thích khi thêm cột mới vào bảng users đã tồn tại
with engine.connect() as conn:
    try:
        cols = [r[1] for r in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
        if "is_online" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT 0 NOT NULL"))
        if "last_seen" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_seen DATETIME"))
        conn.commit()
    except Exception:
        pass

app = FastAPI(title="Community Connection Platform")

# Cho phép frontend (Vite dev server) gọi API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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


@app.get("/api/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/db-check")
def db_check(db: Session = Depends(get_db)):
    """Kiểm tra database connection có hoạt động không."""
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
