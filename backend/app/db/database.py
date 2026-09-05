from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from ..core.config import DATABASE_URL

# check_same_thread=False bắt buộc với SQLite khi dùng FastAPI
# vì FastAPI xử lý request trên nhiều thread khác nhau
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
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
