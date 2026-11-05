from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool

from ..core.config import DATABASE_URL

db_url = DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

connect_args = {}
is_postgres = db_url.startswith("postgresql")

if db_url.startswith("sqlite"):
    # check_same_thread=False bắt buộc với SQLite khi dùng FastAPI
    # vì FastAPI xử lý request trên nhiều thread khác nhau
    connect_args["check_same_thread"] = False

if is_postgres:
    # NullPool: không giữ connection sau khi dùng xong — phù hợp với Supabase
    # vì Supabase giới hạn số connection đồng thời (free tier: ~20 connections)
    # pool_pre_ping: tự kiểm tra connection còn sống trước khi dùng
    # tránh lỗi "connection closed" sau 10 phút nhàn rỗi của Supabase
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        poolclass=NullPool,
        pool_pre_ping=True,
    )
else:
    engine = create_engine(
        db_url,
        connect_args=connect_args,
    )

# Upgrade existing databases without requiring a destructive reset.
if inspect(engine).has_table("post_likes"):
    post_like_columns = {
        column["name"] for column in inspect(engine).get_columns("post_likes")
    }
    if "reaction_type" not in post_like_columns:
        with engine.begin() as conn:
            conn.execute(
                text(
                    "ALTER TABLE post_likes "
                    "ADD COLUMN reaction_type VARCHAR(20) NOT NULL DEFAULT 'like'"
                )
            )

# Session factory — mỗi request sẽ tạo một session riêng
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Base class cho tất cả SQLAlchemy models sau này
class Base(DeclarativeBase):
    pass


def get_db():
    """
    FastAPI dependency injection cho database session.
    Tự động đóng session sau khi request kết thúc.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
