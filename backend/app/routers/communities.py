from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models.user import User
from ..routers.deps import get_current_user
from ..schemas.community import (
    CommunityCreate,
    CommunityDetailResponse,
    CommunityResponse,
)
from ..schemas.post import PostResponse
from ..services import community_service, post_service

router = APIRouter(prefix="/api/communities", tags=["communities"])


@router.get("", response_model=list[CommunityResponse])
def get_all_communities(
    category: str | None = Query(None, description="Lọc theo danh mục"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách tất cả cộng đồng (kèm trạng thái đã tham gia và số lượng thành viên)."""
    return community_service.get_communities(
        db=db, current_user=current_user, category=category
    )


@router.post("", response_model=CommunityResponse, status_code=status.HTTP_201_CREATED)
def create_new_community(
    comm_in: CommunityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Tạo mới một cộng đồng.
    Hệ thống tự động tạo một nhóm chat riêng (Group Conversation) cho cộng đồng này.
    """
    return community_service.create_community(
        db=db, current_user=current_user, comm_in=comm_in
    )


@router.get("/{community_id}", response_model=CommunityDetailResponse)
def get_community_detail(
    community_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy thông tin chi tiết cộng đồng kèm danh sách thành viên."""
    return community_service.get_community_by_id(
        db=db, community_id=community_id, current_user=current_user
    )


@router.post("/{community_id}/join", response_model=CommunityResponse)
def join_community(
    community_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tham gia cộng đồng và tự động tham gia nhóm chat của cộng đồng."""
    return community_service.join_community(
        db=db, community_id=community_id, current_user=current_user
    )


@router.post("/{community_id}/leave", response_model=CommunityResponse)
def leave_community(
    community_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Rời khỏi cộng đồng và rời nhóm chat."""
    return community_service.leave_community(
        db=db, community_id=community_id, current_user=current_user
    )


@router.get("/{community_id}/posts", response_model=list[PostResponse])
def get_community_posts(
    community_id: int,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách các bài viết thuộc về cộng đồng này."""
    comm = community_service.get_community_by_id(db, community_id, current_user)
    # Lấy bài viết theo category hoặc theo community_id
    return post_service.get_posts(
        db=db,
        current_user_id=current_user.id,
        category=comm.category,
        limit=limit,
        offset=offset,
    )
