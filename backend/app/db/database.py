from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from ..core.config import DATABASE_URL

db_url = DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

connect_args = {}
if db_url.startswith("sqlite"):
    # check_same_thread=False bắt buộc với SQLite khi dùng FastAPI
    # vì FastAPI xử lý request trên nhiều thread khác nhau
    connect_args["check_same_thread"] = False

engine = create_engine(
    db_url,
    connect_args=connect_args,
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
