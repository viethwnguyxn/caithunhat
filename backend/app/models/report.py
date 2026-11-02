from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.database import Base


class Report(Base):
    """
    Bảng lưu trữ báo cáo vi phạm người dùng hoặc nội dung.
    Các lý do: Spam, Quấy rối, Lừa đảo, Nội dung phản cảm, Khác.
    Trạng thái: pending (chờ xử lý), resolved (đã xử lý), dismissed (bác bỏ).
    """
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    reporter_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reported_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    reason: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending", nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    reporter = relationship("User", foreign_keys=[reporter_id], backref="submitted_reports")
    reported = relationship("User", foreign_keys=[reported_id], backref="received_reports")

