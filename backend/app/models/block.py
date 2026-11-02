from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.database import Base


class Block(Base):
    """
    Bảng lưu trữ thông tin chặn người dùng 1 chiều.
    blocker_id là người thực hiện chặn.
    blocked_id là người bị chặn.
    """
    __tablename__ = "blocks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    blocker_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    blocked_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    blocker = relationship("User", foreign_keys=[blocker_id], backref="blocked_users")
    blocked = relationship("User", foreign_keys=[blocked_id], backref="blocked_by_users")

