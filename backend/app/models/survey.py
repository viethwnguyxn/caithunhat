from datetime import datetime

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..db.database import Base


class SurveyAnswer(Base):
    __tablename__ = "survey_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True, nullable=False
    )

    # 1. About You
    age_group: Mapped[str | None] = mapped_column(String(50), nullable=True)
    current_status: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # 2. Life Situation
    life_situation: Mapped[str | None] = mapped_column(String(100), nullable=True)
    recent_feelings: Mapped[list[str] | None] = mapped_column(JSON, default=list, nullable=True)

    # 3. Goals
    goals: Mapped[list[str] | None] = mapped_column(JSON, default=list, nullable=True)
    community_expectations: Mapped[list[str] | None] = mapped_column(JSON, default=list, nullable=True)

    # 4. Interests
    topics: Mapped[list[str] | None] = mapped_column(JSON, default=list, nullable=True)
    free_time_activities: Mapped[list[str] | None] = mapped_column(JSON, default=list, nullable=True)

    # 5. Connection
    desired_connection_types: Mapped[list[str] | None] = mapped_column(JSON, default=list, nullable=True)
    preferred_mode: Mapped[str | None] = mapped_column(String(50), nullable=True)
    discovery_preference: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # 6. Story (Optional)
    story: Mapped[str | None] = mapped_column(Text, nullable=True)
    what_you_want_others_to_understand: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=True
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=True,
    )

    user = relationship("User", backref="survey_answer", uselist=False)
