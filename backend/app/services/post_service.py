import re

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from ..models.post import Post, PostComment, PostLike
from ..models.profile import Profile
from ..models.user import User
from ..schemas.post import (
    CommentCreate,
    CommentResponse,
    LikeToggleResponse,
    PostActionResponse,
    PostAuthorResponse,
    PostMentionResponse,
    PostCreate,
    PostResponse,
    ReactionResponse,
    ReactionType,
)
from . import notification_service

MENTION_PATTERN = re.compile(r"(?<![\w.-])@([A-Za-z0-9_]{3,30})(?![\w.-])", re.IGNORECASE)
REACTION_DETAILS = {
    "heart": ("❤️", "thả tim"),
    "like": ("👍", "thích"),
    "angry": ("😠", "phẫn nộ"),
    "sad": ("😢", "buồn"),
    "haha": ("😂", "haha"),
}


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
    )


def _mentioned_users(db: Session, content: str) -> list[User]:
    usernames = {match.lower() for match in MENTION_PATTERN.findall(content)}
    if not usernames:
        return []
    return (
        db.query(User)
        .filter(func.lower(User.username).in_(usernames))
        .all()
    )


def _notify_mentions(
    db: Session,
    content: str,
    sender: User,
    related_id: int,
    notification_content: str,
) -> None:
    sender_name = _build_post_author(db, sender.id).display_name or sender.username
    for mentioned_user in _mentioned_users(db, content):
        if mentioned_user.id == sender.id:
            continue
        notification_service.create_notification(
            db=db,
            user_id=mentioned_user.id,
            type="mention",
            title=f"{sender_name} đã nhắc đến bạn",
            content=notification_content,
            related_id=related_id,
        )


def _notify_reaction(db: Session, post: Post, user: User, reaction: str) -> None:
    if post.author_id == user.id:
        return
    emoji, reaction_name = REACTION_DETAILS[reaction]
    sender_name = _build_post_author(db, user.id).display_name or user.username
    notification_service.create_notification(
        db=db,
        user_id=post.author_id,
        type="post_like",
        title=f"Bài viết của bạn vừa nhận {emoji}",
        content=f"{sender_name} đã bày tỏ cảm xúc {reaction_name} với bài viết của bạn.",
        related_id=post.id,
    )


def _to_post_response(
    db: Session,
    post: Post,
    current_user_id: int | None = None,
    include_comments: bool = False,
) -> PostResponse:
    """Chuyển đổi Post ORM object thành PostResponse Pydantic schema."""
    reaction_counts = dict(
        db.query(PostLike.reaction_type, func.count(PostLike.id))
        .filter(PostLike.post_id == post.id)
        .group_by(PostLike.reaction_type)
        .all()
    )
    likes_count = sum(reaction_counts.values())
    comments_count = db.query(PostComment).filter(PostComment.post_id == post.id).count()

    my_reaction = None
    if current_user_id:
        current_like = (
            db.query(PostLike.reaction_type)
            .filter(PostLike.post_id == post.id, PostLike.user_id == current_user_id)
            .scalar()
        )
        my_reaction = current_like

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
        content=post.content,
        image_url=post.image_url,
        mood=post.mood,
        created_at=post.created_at,
        updated_at=post.updated_at,
        author=_build_post_author(db, post.author_id),
        likes_count=likes_count,
        comments_count=comments_count,
        is_liked_by_me=my_reaction in {"heart", "like"},
        my_reaction=my_reaction,
        reactions=reaction_counts,
        comments=comments_list,
    )


def create_post(db: Session, author: User, post_in: PostCreate) -> PostResponse:
    """Tạo mới một bài viết / khoảnh khắc cộng đồng."""
    post = Post(
        author_id=author.id,
        category=post_in.category.strip(),
        content=post_in.content.strip(),
        image_url=post_in.image_url.strip() if post_in.image_url else None,
        mood=post_in.mood.strip() if post_in.mood else None,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    _notify_mentions(
        db,
        post.content,
        author,
        post.id,
        f"{_build_post_author(db, author.id).display_name or author.username} đã nhắc đến bạn trong một bài viết.",
    )
    return _to_post_response(db, post, current_user_id=author.id)


def get_posts(
    db: Session,
    current_user_id: int | None = None,
    category: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[PostResponse]:
    """Lấy danh sách bài viết trên Bảng tin (Feed), hỗ trợ lọc theo chủ đề."""
    query = db.query(Post).order_by(Post.created_at.desc())

    if category and category.strip() and category.strip() != "all" and category.strip() != "Tất cả":
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

    if existing_like and existing_like.reaction_type == "like":
        db.delete(existing_like)
        db.commit()
        count = db.query(PostLike).filter(PostLike.post_id == post.id).count()
        return LikeToggleResponse(liked=False, likes_count=count, message="Đã bỏ thích bài viết")

    if existing_like:
        existing_like.reaction_type = "like"
    else:
        db.add(PostLike(post_id=post.id, user_id=user.id, reaction_type="like"))
    db.commit()
    count = db.query(PostLike).filter(PostLike.post_id == post.id).count()
    _notify_reaction(db, post, user, "like")

    return LikeToggleResponse(liked=True, likes_count=count, message="Đã thích bài viết")


def set_post_reaction(
    db: Session, user: User, post_id: int, reaction: ReactionType
) -> ReactionResponse:
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bài viết không tồn tại",
        )

    existing = (
        db.query(PostLike)
        .filter(PostLike.post_id == post.id, PostLike.user_id == user.id)
        .first()
    )
    active_reaction: ReactionType | None = reaction
    if existing and existing.reaction_type == reaction:
        db.delete(existing)
        active_reaction = None
        db.commit()
        message = "Đã gỡ cảm xúc"
    else:
        if existing:
            existing.reaction_type = reaction
        else:
            db.add(PostLike(post_id=post.id, user_id=user.id, reaction_type=reaction))
        db.commit()
        _notify_reaction(db, post, user, reaction)
        message = "Đã cập nhật cảm xúc"

    reactions = dict(
        db.query(PostLike.reaction_type, func.count(PostLike.id))
        .filter(PostLike.post_id == post.id)
        .group_by(PostLike.reaction_type)
        .all()
    )
    return ReactionResponse(
        reaction=active_reaction,
        reactions_count=sum(reactions.values()),
        reactions=reactions,
        message=message,
    )


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
        sender_name = _build_post_author(db, user.id).display_name or user.username
        snippet = comment_in.content.strip()[:60]
        notification_service.create_notification(
            db=db,
            user_id=post.author_id,
            type="post_comment",
            title="Có bình luận mới về bài viết của bạn 💬",
            content=f"{sender_name} đã bình luận: '{snippet}'",
            related_id=post.id,
        )

    _notify_mentions(
        db,
        comment.content,
        user,
        post.id,
        f"{_build_post_author(db, user.id).display_name or user.username} đã nhắc đến bạn trong một bình luận.",
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


def get_user_mentions(db: Session, user_id: int) -> list[PostMentionResponse]:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return []

    escaped_username = (
        user.username.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    )
    pattern = f"%@{escaped_username}%"
    mention_regex = re.compile(
        rf"(?<![\w.-])@{re.escape(user.username)}(?![\w.-])", re.IGNORECASE
    )
    matches: list[PostMentionResponse] = []

    candidate_posts = (
        db.query(Post)
        .filter(Post.content.ilike(pattern, escape="\\"))
        .order_by(Post.created_at.desc())
        .all()
    )
    for post in candidate_posts:
        if post.author_id == user_id or not mention_regex.search(post.content):
            continue
        matches.append(
            PostMentionResponse(
                id=f"post-{post.id}",
                type="bài viết",
                content=post.content,
                created_at=post.created_at,
                author=_build_post_author(db, post.author_id),
                post=_to_post_response(db, post, current_user_id=user_id),
            )
        )

    candidate_comments = (
        db.query(PostComment, Post)
        .join(Post, Post.id == PostComment.post_id)
        .filter(PostComment.content.ilike(pattern, escape="\\"))
        .order_by(PostComment.created_at.desc())
        .all()
    )
    for comment, post in candidate_comments:
        if comment.author_id == user_id or not mention_regex.search(comment.content):
            continue
        matches.append(
            PostMentionResponse(
                id=f"comment-{comment.id}",
                type="bình luận",
                content=comment.content,
                created_at=comment.created_at,
                author=_build_post_author(db, comment.author_id),
                post=_to_post_response(db, post, current_user_id=user_id),
            )
        )

    return sorted(matches, key=lambda mention: mention.created_at, reverse=True)


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
