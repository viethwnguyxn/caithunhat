from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models.user import User
from ..schemas.matching import MatchListResponse
from ..services.matching_service import get_user_matches
from .deps import get_current_user

router = APIRouter(prefix="/api/matches", tags=["Matching"])


@router.get(
    "",
    response_model=MatchListResponse,
    summary="Lấy danh sách người dùng tương đồng được gợi ý (TF-IDF & Cosine Similarity)",
)
def get_matches(
    limit: int = Query(10, ge=1, le=50, description="Số lượng người gợi ý tối đa"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Protected: Tìm kiếm người dùng có độ tương đồng cao nhất dựa trên khảo sát cá nhân."""
    return get_user_matches(db=db, current_user=current_user, limit=limit)
