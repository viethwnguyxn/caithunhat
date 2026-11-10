from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.community import Community, CommunityMember
from ..models.post import Post, PostComment, PostLike
from ..models.profile import Profile
from ..models.user import User
from ..schemas.post import (
    CommentCreate,
    CommentResponse,
    LikeToggleResponse,
    PostActionResponse,
    PostAuthorResponse,
    PostCreate,
    PostResponse,
)
from . import notification_service


def _build_post_author(db: Session, user_id: int) -> PostAuthorResponse:
    """Xây dựng thông tin tác giả bài viết / bình luận."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return PostAuthorResponse(id=user_id, username="unknown", display_name="Người dùng ẩn danh")

    profile = db.query(Profile).filter(Profile.user_id == user_id).first()
    return PostAuthorResponse(
        id=user.id,
        username=user.username,
        display_name=profile.display_name if profile and profile.display_name else user.username,
        avatar_url=profile.avatar_url if profile and profile.avatar_url else user.avatar_url,
        is_online=bool(user.is_online),
    )


def _to_post_response(
    db: Session,
    post: Post,
    current_user_id: int | None = None,
    include_comments: bool = False,
) -> PostResponse:
    """Chuyển đổi Post ORM object thành PostResponse Pydantic schema."""
    likes_count = db.query(PostLike).filter(PostLike.post_id == post.id).count()
    comments_count = db.query(PostComment).filter(PostComment.post_id == post.id).count()

    is_liked = False
    if current_user_id:
        is_liked = (
            db.query(PostLike)
            .filter(PostLike.post_id == post.id, PostLike.user_id == current_user_id)
            .first()
            is not None
        )

    comments_list: list[CommentResponse] = []
    if include_comments:
        raw_comments = (
            db.query(PostComment)
            .filter(PostComment.post_id == post.id)
            .order_by(PostComment.created_at.asc())
            .all()
        )
        for c in raw_comments:
            comments_list.append(
                CommentResponse(
                    id=c.id,
                    post_id=c.post_id,
                    content=c.content,
                    created_at=c.created_at,
                    author=_build_post_author(db, c.author_id),
                )
            )

    return PostResponse(
        id=post.id,
        category=post.category,
        community_id=post.community_id,
        content=post.content,
        image_url=post.image_url,
        mood=post.mood,
        created_at=post.created_at,
        updated_at=post.updated_at,
        author=_build_post_author(db, post.author_id),
        likes_count=likes_count,
        comments_count=comments_count,
        is_liked_by_me=is_liked,
        comments=comments_list,
    )


def create_post(db: Session, author: User, post_in: PostCreate) -> PostResponse:
    """Tạo mới một bài viết / khoảnh khắc cộng đồng."""
    post = Post(
        author_id=author.id,
        category=post_in.category.strip(),
        community_id=post_in.community_id,
        content=post_in.content.strip(),
        image_url=post_in.image_url.strip() if post_in.image_url else None,
        mood=post_in.mood.strip() if post_in.mood else None,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    return _to_post_response(db, post, current_user_id=author.id)


def get_posts(
    db: Session,
    current_user_id: int | None = None,
    category: str | None = None,
    community_id: int | None = None,
    joined_only: bool = False,
    limit: int = 50,
    offset: int = 0,
) -> list[PostResponse]:
    """Lấy danh sách bài viết trên Bảng tin (Feed), hỗ trợ lọc theo chủ đề, theo nhóm hoặc nhóm đã tham gia."""
    query = db.query(Post).order_by(Post.created_at.desc())

    if community_id is not None:
        comm = db.query(Community).filter(Community.id == community_id).first()
        if comm:
            query = query.filter(
                (Post.community_id == community_id)
                | ((Post.community_id.is_(None)) & (Post.category == comm.category))
            )
        else:
            query = query.filter(Post.community_id == community_id)
    elif joined_only and current_user_id:
        joined_comm_ids = [
            m[0]
            for m in db.query(CommunityMember.community_id)
            .filter(CommunityMember.user_id == current_user_id)
            .all()
        ]
        # Hiển thị bài viết của các cộng đồng đã tham gia hoặc bài viết do chính mình đăng
        query = query.filter(
            (Post.community_id.in_(joined_comm_ids)) | (Post.author_id == current_user_id)
        )
    elif category and category.strip() and category.strip() not in ("all", "Tất cả"):
        query = query.filter(Post.category == category.strip())

    posts = query.offset(offset).limit(limit).all()

    return [_to_post_response(db, p, current_user_id=current_user_id) for p in posts]


def get_post_by_id(
    db: Session, post_id: int, current_user_id: int | None = None
) -> PostResponse:
    """Xem chi tiết một bài viết kèm danh sách bình luận."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài viết không tồn tại",
        )
    return _to_post_response(db, post, current_user_id=current_user_id, include_comments=True)


def delete_post(db: Session, user: User, post_id: int) -> PostActionResponse:
    """Xóa bài viết. Chỉ tác giả bài viết hoặc Admin mới có quyền xóa."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài viết không tồn tại",
        )

    user_role = getattr(user, "role", "user")
    if post.author_id != user.id and user_role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa bài viết này",
        )

    db.delete(post)
    db.commit()

    return PostActionResponse(success=True, message="Đã xóa bài viết thành công")


def toggle_like_post(db: Session, user: User, post_id: int) -> LikeToggleResponse:
    """Thả tim hoặc hủy thả tim bài viết (Toggle)."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài viết không tồn tại",
        )

    existing_like = (
        db.query(PostLike)
        .filter(PostLike.post_id == post.id, PostLike.user_id == user.id)
        .first()
    )

    if existing_like:
        db.delete(existing_like)
        db.commit()
        count = db.query(PostLike).filter(PostLike.post_id == post.id).count()
        return LikeToggleResponse(liked=False, likes_count=count, message="Đã bỏ thích bài viết")

    # Thêm like mới
    new_like = PostLike(post_id=post.id, user_id=user.id)
    db.add(new_like)
    db.commit()
    count = db.query(PostLike).filter(PostLike.post_id == post.id).count()

    # Kích hoạt thông báo cho chủ bài viết (nếu không phải tự like chính mình)
    if post.author_id != user.id:
        user_profile = getattr(user, "profile", None)
        if isinstance(user_profile, list):
            user_profile = user_profile[0] if user_profile else None
        sender_name = (
            user_profile.display_name
            if user_profile and user_profile.display_name
            else user.username
        )
        notification_service.create_notification(
            db=db,
            user_id=post.author_id,
            type="post_like",
            title="Khoảnh khắc của bạn vừa được thả tim ❤️",
            content=f"{sender_name} đã thích bài viết của bạn.",
            related_id=post.id,
        )

    return LikeToggleResponse(liked=True, likes_count=count, message="Đã thích bài viết")


def create_comment(
    db: Session, user: User, post_id: int, comment_in: CommentCreate
) -> CommentResponse:
    """Đăng bình luận mới dưới bài viết."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài viết không tồn tại",
        )

    comment = PostComment(
        post_id=post.id,
        author_id=user.id,
        content=comment_in.content.strip(),
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    # Kích hoạt thông báo cho chủ bài viết (nếu không phải tự bình luận bài mình)
    if post.author_id != user.id:
        user_profile = getattr(user, "profile", None)
        if isinstance(user_profile, list):
            user_profile = user_profile[0] if user_profile else None
        sender_name = (
            user_profile.display_name
            if user_profile and user_profile.display_name
            else user.username
        )
        snippet = comment_in.content.strip()[:60]
        notification_service.create_notification(
            db=db,
            user_id=post.author_id,
            type="post_comment",
            title="Có bình luận mới về bài viết của bạn 💬",
            content=f"{sender_name} đã bình luận: '{snippet}'",
            related_id=post.id,
        )

    return CommentResponse(
        id=comment.id,
        post_id=comment.post_id,
        content=comment.content,
        created_at=comment.created_at,
        author=_build_post_author(db, user.id),
    )


def get_post_comments(db: Session, post_id: int) -> list[CommentResponse]:
    """Lấy danh sách tất cả bình luận của một bài viết."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài viết không tồn tại",
        )

    raw_comments = (
        db.query(PostComment)
        .filter(PostComment.post_id == post.id)
        .order_by(PostComment.created_at.asc())
        .all()
    )

    return [
        CommentResponse(
            id=c.id,
            post_id=c.post_id,
            content=c.content,
            created_at=c.created_at,
            author=_build_post_author(db, c.author_id),
        )
        for c in raw_comments
    ]


def delete_comment(db: Session, user: User, comment_id: int) -> PostActionResponse:
    """Xóa bình luận. Người bình luận, chủ bài viết, hoặc Admin mới có quyền xóa."""
    comment = db.query(PostComment).filter(PostComment.id == comment_id).first()
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bình luận không tồn tại",
        )

    post = db.query(Post).filter(Post.id == comment.post_id).first()
    user_role = getattr(user, "role", "user")

    # Quyền xóa: người viết comment, chủ bài viết, hoặc admin
    is_comment_author = comment.author_id == user.id
    is_post_author = post and post.author_id == user.id
    is_admin = user_role == "admin"

    if not (is_comment_author or is_post_author or is_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền xóa bình luận này",
        )

    db.delete(comment)
    db.commit()

    return PostActionResponse(success=True, message="Đã xóa bình luận thành công")
