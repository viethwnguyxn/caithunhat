from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from ..db.database import get_db
from ..models.user import User
from ..routers.deps import get_current_user
from ..schemas.post import (
    CommentCreate,
    CommentResponse,
    LikeToggleResponse,
    PostActionResponse,
    PostMentionResponse,
    PostCreate,
    PostResponse,
    ReactionCreate,
    ReactionResponse,
)
from ..services import post_service

router = APIRouter(prefix="/api", tags=["posts"])


@router.post("/posts", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def create_new_post(
    post_in: PostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Tạo mới một bài viết hoặc khoảnh khắc cảm xúc trên Bảng tin."""
    return post_service.create_post(db=db, author=current_user, post_in=post_in)


@router.get("/posts", response_model=list[PostResponse])
def get_community_feed(
    category: str | None = Query(None, description="Lọc theo chủ đề"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách bài viết trên Bảng tin cộng đồng."""
    return post_service.get_posts(
        db=db,
        current_user_id=current_user.id,
        category=category,
        limit=limit,
        offset=offset,
    )


@router.get("/posts/mentions", response_model=list[PostMentionResponse])
def get_my_mentions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy mọi bài viết và bình luận nhắc đến username của người dùng hiện tại."""
    return post_service.get_user_mentions(db=db, user_id=current_user.id)


@router.get("/posts/{post_id}", response_model=PostResponse)
def get_post_detail(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xem chi tiết bài viết kèm danh sách bình luận."""
    return post_service.get_post_by_id(
        db=db, post_id=post_id, current_user_id=current_user.id
    )


@router.delete("/posts/{post_id}", response_model=PostActionResponse)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xóa bài viết (Chỉ tác giả hoặc Admin mới có quyền)."""
    return post_service.delete_post(db=db, user=current_user, post_id=post_id)


@router.post("/posts/{post_id}/like", response_model=LikeToggleResponse)
def toggle_like(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Thả tim hoặc hủy thả tim bài viết."""
    return post_service.toggle_like_post(db=db, user=current_user, post_id=post_id)


@router.put(
    "/posts/{post_id}/reaction",
    response_model=ReactionResponse,
)
def set_reaction(
    post_id: int,
    reaction_in: ReactionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Thêm, đổi hoặc gỡ cảm xúc trên bài viết."""
    return post_service.set_post_reaction(
        db=db,
        user=current_user,
        post_id=post_id,
        reaction=reaction_in.reaction,
    )


@router.post("/posts/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def add_comment(
    post_id: int,
    comment_in: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Đăng bình luận mới dưới bài viết."""
    return post_service.create_comment(
        db=db, user=current_user, post_id=post_id, comment_in=comment_in
    )


@router.get("/posts/{post_id}/comments", response_model=list[CommentResponse])
def get_comments(
    post_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lấy danh sách tất cả bình luận của bài viết."""
    return post_service.get_post_comments(db=db, post_id=post_id)


@router.delete("/comments/{comment_id}", response_model=PostActionResponse)
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Xóa bình luận (Người bình luận, tác giả bài viết, hoặc Admin)."""
    return post_service.delete_comment(db=db, user=current_user, comment_id=comment_id)
