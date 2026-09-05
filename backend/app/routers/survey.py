from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models.user import User
from ..schemas.survey import SurveyCreate, SurveyResponse
from ..services.survey_service import get_user_survey, save_or_update_survey
from .deps import get_current_user

router = APIRouter(prefix="/api/survey", tags=["Survey"])


@router.post(
    "",
    response_model=SurveyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Lưu hoặc cập nhật kết quả Onboarding Survey",
)
def submit_survey(
    survey_in: SurveyCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Protected: Gửi kết quả khảo sát ban đầu."""
    survey = save_or_update_survey(db=db, user=current_user, survey_in=survey_in)
    return survey


@router.get(
    "/me",
    response_model=SurveyResponse | None,
    summary="Lấy kết quả khảo sát của người dùng hiện tại",
)
def get_my_survey(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Protected: Xem lại kết quả survey cá nhân."""
    survey = get_user_survey(db=db, user=current_user)
    if not survey:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Người dùng chưa hoàn thành khảo sát Onboarding",
        )
    return survey
