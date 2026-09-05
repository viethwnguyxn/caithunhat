from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models.profile import Profile
from ..models.survey import SurveyAnswer
from ..models.user import User
from ..schemas.survey import SurveyCreate
from .profile_service import get_or_create_profile


def save_or_update_survey(db: Session, user: User, survey_in: SurveyCreate) -> SurveyAnswer:
    """Lưu hoặc cập nhật kết quả survey của người dùng."""
    stmt = select(SurveyAnswer).where(SurveyAnswer.user_id == user.id)
    survey = db.execute(stmt).scalar_one_or_none()

    survey_data = survey_in.model_dump()

    if survey:
        # Cập nhật kết quả đã có
        for field, value in survey_data.items():
            setattr(survey, field, value)
    else:
        # Tạo mới kết quả survey
        survey = SurveyAnswer(user_id=user.id, **survey_data)
        db.add(survey)

    # Đồng bộ age_group và current_status sang Profile
    profile = get_or_create_profile(db, user)
    profile.age_group = survey_in.age_group
    profile.current_status = survey_in.current_status

    db.commit()
    db.refresh(survey)
    return survey


def get_user_survey(db: Session, user: User) -> SurveyAnswer | None:
    """Lấy câu trả lời survey của chính user."""
    stmt = select(SurveyAnswer).where(SurveyAnswer.user_id == user.id)
    return db.execute(stmt).scalar_one_or_none()
