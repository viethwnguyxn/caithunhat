from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.database import Base


class Community(Base):
    """
    Bảng lưu trữ thông tin cộng đồng / nhóm sở thích.
    Mỗi cộng đồng có một nhóm chat (Conversation) riêng và bảng tin bài viết riêng.
    """
    __tablename__ = "communities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    icon: Mapped[str] = mapped_column(String(50), default="👥", nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Chuỗi thẻ tag, vd: "Python,React,AI"
    creator_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    conversation_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("conversations.id", ondelete="SET NULL"), nullable=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    creator = relationship("User", foreign_keys=[creator_id])
    conversation = relationship("Conversation", foreign_keys=[conversation_id])
    members = relationship(
        "CommunityMember", back_populates="community", cascade="all, delete-orphan"
    )
    posts = relationship(
        "Post", back_populates="community", cascade="all, delete-orphan"
    )


class CommunityMember(Base):
    """
    Bảng quản lý thành viên tham gia cộng đồng.
    Đảm bảo mỗi người dùng chỉ tham gia 1 cộng đồng 1 lần (UniqueConstraint).
    """
    __tablename__ = "community_members"
    __table_args__ = (
        UniqueConstraint("community_id", "user_id", name="uq_community_member"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    community_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("communities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), default="member", nullable=False)  # 'admin' | 'member'
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    community = relationship("Community", back_populates="members")
    user = relationship("User")
