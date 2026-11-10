import os
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from .core.security import hash_password
from .db.database import Base, SessionLocal, engine, get_db
from .models import (
    Block,
    Community,
    CommunityMember,
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
    communities_router,
    connections_router,
    matching_router,
    notifications_router,
    posts_router,
    profile_router,
    reports_router,
    survey_router,
    users_router,
)
from .services import community_service

# Tự động tạo bảng nếu chưa có
Base.metadata.create_all(bind=engine)

# Đảm bảo SQLite tương thích khi thêm cột mới vào bảng users đã tồn tại
if str(engine.url).startswith("sqlite"):
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


def migrate_notification_schema():
    if not inspect(engine).has_table("notifications"):
        return

    columns = {column["name"] for column in inspect(engine).get_columns("notifications")}
    with engine.begin() as conn:
        if "title" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE notifications "
                    "ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT ''"
                )
            )
        if "content" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE notifications "
                    "ADD COLUMN content TEXT NOT NULL DEFAULT ''"
                )
            )
        if "related_id" not in columns:
            conn.execute(
                text("ALTER TABLE notifications ADD COLUMN related_id INTEGER")
            )
        conn.execute(
            text(
                """
                UPDATE notifications
                SET title = CASE type
                    WHEN 'connection_request' THEN 'Lời mời kết nối'
                    WHEN 'connection_accepted' THEN 'Kết nối mới'
                    WHEN 'message' THEN 'Tin nhắn mới'
                    WHEN 'group_join' THEN 'Thành viên mới'
                    WHEN 'group_post' THEN 'Bài viết mới'
                    WHEN 'post_like' THEN 'Lượt thích mới'
                    WHEN 'post_comment' THEN 'Bình luận mới'
                    ELSE 'Thông báo'
                END
                WHERE title = ''
                """
            )
        )


migrate_notification_schema()


def migrate_conversation_member_schema():
    if not inspect(engine).has_table("conversation_members"):
        return

    columns = {
        column["name"]
        for column in inspect(engine).get_columns("conversation_members")
    }
    if "joined_at" in columns:
        return

    with engine.begin() as conn:
        if engine.dialect.name == "sqlite":
            conn.execute(
                text("ALTER TABLE conversation_members ADD COLUMN joined_at DATETIME")
            )
            conn.execute(
                text(
                    "UPDATE conversation_members "
                    "SET joined_at = CURRENT_TIMESTAMP WHERE joined_at IS NULL"
                )
            )
        else:
            conn.execute(
                text(
                    "ALTER TABLE conversation_members "
                    "ADD COLUMN joined_at TIMESTAMP WITH TIME ZONE "
                    "NOT NULL DEFAULT CURRENT_TIMESTAMP"
                )
            )


migrate_conversation_member_schema()


def migrate_survey_answer_schema():
    if not inspect(engine).has_table("survey_answers"):
        return

    columns = {
        column["name"]
        for column in inspect(engine).get_columns("survey_answers")
    }
    required_identity_columns = {"id", "user_id"}
    if missing_identity_columns := required_identity_columns - columns:
        raise RuntimeError(
            "Cannot safely migrate survey_answers; missing identity columns: "
            + ", ".join(sorted(missing_identity_columns))
        )

    table = SurveyAnswer.__table__
    preparer = engine.dialect.identifier_preparer

    with engine.begin() as conn:
        for column in table.columns:
            if column.name in columns:
                continue
            column_type = column.type.compile(dialect=engine.dialect)
            definition = (
                f"ALTER TABLE {preparer.quote(table.name)} "
                f"ADD COLUMN {preparer.quote(column.name)} {column_type}"
            )
            conn.execute(text(definition))

        if engine.dialect.name == "postgresql":
            for column in inspect(engine).get_columns("survey_answers"):
                if column["name"] not in required_identity_columns and not column["nullable"]:
                    conn.execute(
                        text(
                            f"ALTER TABLE {preparer.quote(table.name)} "
                            f"ALTER COLUMN {preparer.quote(column['name'])} DROP NOT NULL"
                        )
                    )

        profile_columns = (
            {column["name"] for column in inspect(engine).get_columns("profiles")}
            if inspect(engine).has_table("profiles")
            else set()
        )
        for field in ("age_group", "current_status"):
            if field in profile_columns:
                conn.execute(
                    text(
                        f"UPDATE survey_answers AS survey "
                        f"SET {preparer.quote(field)} = profiles.{preparer.quote(field)} "
                        f"FROM profiles "
                        f"WHERE profiles.user_id = survey.user_id "
                        f"AND survey.{preparer.quote(field)} = '' "
                        f"AND profiles.{preparer.quote(field)} IS NOT NULL"
                    )
                )


migrate_survey_answer_schema()


def migrate_profile_schema():
    if not inspect(engine).has_table("profiles"):
        return

    columns = {
        column["name"] for column in inspect(engine).get_columns("profiles")
    }
    required_identity_columns = {"id", "user_id"}
    if missing_identity_columns := required_identity_columns - columns:
        raise RuntimeError(
            "Cannot safely migrate profiles; missing identity columns: "
            + ", ".join(sorted(missing_identity_columns))
        )

    table = Profile.__table__
    preparer = engine.dialect.identifier_preparer
    with engine.begin() as conn:
        for column in table.columns:
            if column.name in columns:
                continue
            column_type = column.type.compile(dialect=engine.dialect)
            definition = (
                f"ALTER TABLE {preparer.quote(table.name)} "
                f"ADD COLUMN {preparer.quote(column.name)} {column_type}"
            )
            if not column.nullable:
                if column.name not in {"created_at", "updated_at"}:
                    raise RuntimeError(
                        f"Cannot safely migrate required profiles column: {column.name}"
                    )
                if engine.dialect.name == "sqlite":
                    definition += " NOT NULL DEFAULT '1970-01-01 00:00:00'"
                else:
                    definition += " NOT NULL DEFAULT CURRENT_TIMESTAMP"
            conn.execute(text(definition))

        if engine.dialect.name == "postgresql":
            model_columns = {column.name for column in table.columns}
            legacy_columns = inspect(engine).get_columns("profiles")
            for column in legacy_columns:
                if column["name"] not in model_columns and not column["nullable"]:
                    conn.execute(
                        text(
                            f"ALTER TABLE {preparer.quote(table.name)} "
                            f"ALTER COLUMN {preparer.quote(column['name'])} DROP NOT NULL"
                        )
                    )

        if engine.dialect.name == "sqlite":
            for field in ("created_at", "updated_at"):
                if field not in columns:
                    conn.execute(
                        text(
                            f"UPDATE profiles "
                            f"SET {preparer.quote(field)} = CURRENT_TIMESTAMP"
                        )
                    )


migrate_profile_schema()


def migrate_community_schema():
    try:
        if not inspect(engine).has_table("conversations"):
            return

        columns = {
            column["name"]
            for column in inspect(engine).get_columns("conversations")
        }
        with engine.begin() as conn:
            if "is_group" not in columns:
                conn.execute(
                    text("ALTER TABLE conversations ADD COLUMN is_group BOOLEAN NOT NULL DEFAULT FALSE")
                )
            if "title" not in columns:
                conn.execute(
                    text("ALTER TABLE conversations ADD COLUMN title VARCHAR(100)")
                )
            if "community_id" not in columns:
                conn.execute(
                    text("ALTER TABLE conversations ADD COLUMN community_id INTEGER")
                )

        if inspect(engine).has_table("posts"):
            post_cols = {
                column["name"]
                for column in inspect(engine).get_columns("posts")
            }
            with engine.begin() as conn:
                if "community_id" not in post_cols:
                    conn.execute(
                        text("ALTER TABLE posts ADD COLUMN community_id INTEGER")
                    )
    except Exception as e:
        logger.warning("Lỗi migrate_community_schema (bỏ qua nếu đã tồn tại): %s", e)


migrate_community_schema()


def ensure_admin_user():
    """Khởi tạo tài khoản Quản trị viên mặc định nếu chưa tồn tại (đọc từ biến môi trường)."""
    with SessionLocal() as db:
        admin_email = os.getenv("ADMIN_EMAIL", "admin@kindred.local")
        admin_password = os.getenv("ADMIN_DEFAULT_PASSWORD", "admin123")
        admin = db.query(User).filter(User.email == admin_email).first()
        if not admin:
            admin = User(
                email=admin_email,
                username="admin",
                password_hash=hash_password(admin_password),
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

        # Tự động khởi tạo 6 nhóm cộng đồng chuẩn ban đầu nếu database chưa có
        try:
            community_service.seed_default_communities(db, admin.id)
        except Exception:
            pass


try:
    ensure_admin_user()
except Exception:
    pass

app = FastAPI(title="Community Connection Platform")

# Cấu hình CORS chặt chẽ: Khai báo danh sách origin cụ thể và giới hạn regex
cors_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://caithunhat.vercel.app",
    "https://la-pulga-l7vw.onrender.com",
]
env_cors = os.getenv("CORS_ORIGINS")
if env_cors:
    cors_origins.extend([o.strip() for o in env_cors.split(",") if o.strip()])

# Chỉ cho phép các domain được định danh hoặc domain *.vercel.app của dự án (ngăn chặn CSRF / wildcard HTTPS origin)
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$",
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
app.include_router(communities_router)
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
