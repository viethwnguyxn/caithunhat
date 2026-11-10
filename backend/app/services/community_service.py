from datetime import datetime

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.chat import Conversation, ConversationMember, Message
from ..models.community import Community, CommunityMember
from ..models.post import Post
from ..models.user import User
from ..schemas.community import (
    CommunityCreate,
    CommunityDetailResponse,
    CommunityMemberResponse,
    CommunityResponse,
)

DEFAULT_COMMUNITIES_DATA = [
    {
        "name": "Lập trình viên & Tech Creators",
        "category": "Công nghệ & Lập trình",
        "icon": "💻",
        "description": "Dành cho những bạn đam mê coding, xây dựng sản phẩm AI, công nghệ, chia sẻ kinh nghiệm học thuật và dự án nguồn mở.",
        "tags": "Python,React,AI / ML,WebRTC,FastAPI",
    },
    {
        "name": "Sách & Phát triển bản thân",
        "category": "Sách & Tư duy",
        "icon": "📚",
        "description": "Nơi cùng nhau chia sẻ những cuốn sách hay, đúc kết tư duy tích cực, xây dựng kỷ luật và thói quen tốt mỗi ngày.",
        "tags": "Đọc sách,Tư duy,Thói quen,Tâm lý học,DeepWork",
    },
    {
        "name": "Nghệ thuật & Sáng tạo",
        "category": "Nghệ thuật & Sáng tạo",
        "icon": "🎨",
        "description": "Không gian ấm cúng dành cho những tâm hồn yêu vẽ, nhiếp ảnh, âm nhạc, thiết kế đồ họa và sáng tác nội dung.",
        "tags": "Hội họa,Nhiếp ảnh,Thiết kế,Âm nhạc,Sáng tạo",
    },
    {
        "name": "Sức khỏe, Thể thao & Running",
        "category": "Thể thao & Sức khỏe",
        "icon": "🏃",
        "description": "Cùng nhau rèn luyện thể lực, chia sẻ lộ trình chạy bộ, tập gym, yoga và xây dựng lối sống lành mạnh, giàu năng lượng.",
        "tags": "Chạy bộ,Gym & Fitness,Yoga,Dinh dưỡng,Marathon",
    },
    {
        "name": "Freelance & Khởi nghiệp",
        "category": "Freelance & Khởi nghiệp",
        "icon": "☕",
        "description": "Mạng lưới gắn kết cho những người làm việc tự do hoặc khởi nghiệp, tìm bạn đồng hành tại quán cafe và chia sẻ dự án.",
        "tags": "Freelance,Remote Work,Co-working,Khởi nghiệp,Cà phê",
    },
    {
        "name": "Game & Esports Gaming",
        "category": "Game & Esports",
        "icon": "🎮",
        "description": "Không gian thảo luận chiến thuật, tìm đồng đội leo rank và chia sẻ đam mê game đa nền tảng.",
        "tags": "Esports,Steam,Indie Games,Co-op,Discord",
    },
]


def _build_community_response(
    db: Session, comm: Community, current_user_id: int | None = None
) -> CommunityResponse:
    """Helper chuyển đổi Community ORM sang CommunityResponse Pydantic DTO."""
    members_count = (
        db.query(CommunityMember)
        .filter(CommunityMember.community_id == comm.id)
        .count()
    )
    posts_count = (
        db.query(Post)
        .filter(
            (Post.community_id == comm.id) | (Post.category == comm.category)
        )
        .count()
    )
    is_joined = False
    if current_user_id:
        is_joined = (
            db.query(CommunityMember)
            .filter(
                CommunityMember.community_id == comm.id,
                CommunityMember.user_id == current_user_id,
            )
            .first()
            is not None
        )

    return CommunityResponse(
        id=comm.id,
        name=comm.name,
        description=comm.description,
        category=comm.category,
        icon=comm.icon,
        avatar_url=getattr(comm, "avatar_url", None),
        tags=comm.tags,
        creator_id=comm.creator_id,
        conversation_id=comm.conversation_id,
        members_count=members_count,
        posts_count=posts_count,
        is_joined=is_joined,
        created_at=comm.created_at,
        updated_at=comm.updated_at,
    )


def seed_default_communities(db: Session, admin_user_id: int | None = None):
    """
    Đảm bảo 6 cộng đồng chuẩn ban đầu luôn luôn có mặt trong database.
    Nếu cộng đồng nào chưa có, tự động tạo mới kèm nhóm chat riêng và tin nhắn chào mừng.
    """
    if not admin_user_id:
        admin_user = (
            db.query(User)
            .filter((User.role == "admin") | (User.username == "admin"))
            .first()
        )
        if not admin_user:
            admin_user = db.query(User).first()
        if admin_user:
            admin_user_id = admin_user.id
        else:
            return

    has_new = False
    for item in DEFAULT_COMMUNITIES_DATA:
        # Kiểm tra xem cộng đồng chuẩn này đã có trong database chưa
        existing = db.query(Community).filter(Community.name == item["name"]).first()
        if existing:
            continue

        has_new = True
        # Tạo nhóm chat riêng cho cộng đồng
        conv = Conversation(is_group=True, title=item["name"])
        db.add(conv)
        db.flush()

        comm = Community(
            name=item["name"],
            category=item["category"],
            icon=item["icon"],
            description=item["description"],
            tags=item["tags"],
            creator_id=admin_user_id,
            conversation_id=conv.id,
        )
        db.add(comm)
        db.flush()

        # Cập nhật community_id vào conversation
        conv.community_id = comm.id

        # Cho Admin tham gia cộng đồng và nhóm chat
        comm_mem = CommunityMember(
            community_id=comm.id, user_id=admin_user_id, role="admin"
        )
        conv_mem = ConversationMember(
            conversation_id=conv.id, user_id=admin_user_id
        )
        db.add_all([comm_mem, conv_mem])

        # Tin nhắn chào mừng hệ thống
        welcome_msg = Message(
            conversation_id=conv.id,
            sender_id=admin_user_id,
            content=f"Chào mừng các bạn đến với nhóm chat của cộng đồng {comm.name}! Cùng nhau thảo luận và chia sẻ kiến thức nhé 🎉",
        )
        db.add(welcome_msg)

    if has_new:
        db.commit()


def get_communities(
    db: Session, current_user: User, category: str | None = None
) -> list[CommunityResponse]:
    """Lấy danh sách tất cả các cộng đồng."""
    # Đảm bảo 6 cộng đồng chuẩn luôn tồn tại trong Database
    try:
        seed_default_communities(db, current_user.id)
    except Exception:
        pass

    query = db.query(Community)
    if category and category != "Tất cả":
        query = query.filter(Community.category == category)

    communities = query.order_by(Community.created_at.desc()).all()
    return [_build_community_response(db, c, current_user.id) for c in communities]


def get_community_by_id(
    db: Session, community_id: int, current_user: User
) -> CommunityDetailResponse:
    """Lấy chi tiết một cộng đồng kèm danh sách thành viên."""
    comm = db.query(Community).filter(Community.id == community_id).first()
    if not comm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cộng đồng không tồn tại",
        )

    base_resp = _build_community_response(db, comm, current_user.id)

    # Lấy danh sách thành viên
    members_data = []
    comm_members = (
        db.query(CommunityMember)
        .filter(CommunityMember.community_id == comm.id)
        .order_by(CommunityMember.joined_at.desc())
        .limit(50)
        .all()
    )
    for cm in comm_members:
        u = cm.user
        prof = getattr(u, "profile", None)
        if isinstance(prof, list):
            prof = prof[0] if prof else None

        display_name = prof.display_name if prof and prof.display_name else u.username
        avatar_url = prof.avatar_url if prof and prof.avatar_url else u.avatar_url

        members_data.append(
            CommunityMemberResponse(
                user_id=u.id,
                username=u.username,
                display_name=display_name,
                avatar_url=avatar_url,
                role=cm.role,
                joined_at=cm.joined_at,
            )
        )

    return CommunityDetailResponse(
        **base_resp.model_dump(),
        members=members_data,
    )


def create_community(
    db: Session, current_user: User, comm_in: CommunityCreate
) -> CommunityResponse:
    """
    Tạo mới một cộng đồng.
    Đồng thời tự động tạo 1 nhóm chat riêng (Conversation) cho cộng đồng đó.
    Người tạo tự động trở thành Quản trị viên (Admin) và thành viên nhóm chat.
    """
    # 1. Tạo nhóm chat riêng (Group Conversation)
    group_conv = Conversation(
        is_group=True,
        title=comm_in.name,
    )
    db.add(group_conv)
    db.flush()

    # 2. Tạo bản ghi Community
    new_comm = Community(
        name=comm_in.name.strip(),
        description=comm_in.description.strip(),
        category=comm_in.category.strip(),
        icon=comm_in.icon.strip() or "👥",
        avatar_url=comm_in.avatar_url.strip() if comm_in.avatar_url else None,
        tags=comm_in.tags.strip() if comm_in.tags else None,
        creator_id=current_user.id,
        conversation_id=group_conv.id,
    )
    db.add(new_comm)
    db.flush()

    # Cập nhật community_id ngược lại cho Conversation
    group_conv.community_id = new_comm.id

    # 3. Thêm người tạo vào CommunityMember (role=admin) và ConversationMember
    comm_member = CommunityMember(
        community_id=new_comm.id,
        user_id=current_user.id,
        role="admin",
    )
    conv_member = ConversationMember(
        conversation_id=group_conv.id,
        user_id=current_user.id,
    )
    db.add_all([comm_member, conv_member])

    # 4. Gửi tin nhắn chào mừng ban đầu vào nhóm chat
    welcome_message = Message(
        conversation_id=group_conv.id,
        sender_id=current_user.id,
        content=f"Chào mừng các bạn đến với nhóm chat của cộng đồng {new_comm.name}! Hãy cùng nhau kết nối và chia sẻ góc nhìn nhé! 🚀",
    )
    db.add(welcome_message)

    db.commit()
    db.refresh(new_comm)

    return _build_community_response(db, new_comm, current_user.id)


def join_community(
    db: Session, community_id: int, current_user: User
) -> CommunityResponse:
    """
    Người dùng tham gia vào một cộng đồng.
    Tự động thêm người dùng vào nhóm chat riêng của cộng đồng đó.
    """
    comm = db.query(Community).filter(Community.id == community_id).first()
    if not comm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cộng đồng không tồn tại",
        )

    # Kiểm tra đã tham gia chưa
    existing = (
        db.query(CommunityMember)
        .filter(
            CommunityMember.community_id == community_id,
            CommunityMember.user_id == current_user.id,
        )
        .first()
    )
    if existing:
        return _build_community_response(db, comm, current_user.id)

    # Thêm vào CommunityMember
    new_member = CommunityMember(
        community_id=community_id,
        user_id=current_user.id,
        role="member",
    )
    db.add(new_member)

    # Đảm bảo tham gia nhóm chat của cộng đồng
    if comm.conversation_id:
        conv_mem = (
            db.query(ConversationMember)
            .filter(
                ConversationMember.conversation_id == comm.conversation_id,
                ConversationMember.user_id == current_user.id,
            )
            .first()
        )
        if not conv_mem:
            db.add(
                ConversationMember(
                    conversation_id=comm.conversation_id,
                    user_id=current_user.id,
                )
            )

    db.commit()
    return _build_community_response(db, comm, current_user.id)


def leave_community(
    db: Session, community_id: int, current_user: User
) -> CommunityResponse:
    """Người dùng rời khỏi cộng đồng và nhóm chat của cộng đồng."""
    comm = db.query(Community).filter(Community.id == community_id).first()
    if not comm:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cộng đồng không tồn tại",
        )

    # Xóa khỏi CommunityMember
    db.query(CommunityMember).filter(
        CommunityMember.community_id == community_id,
        CommunityMember.user_id == current_user.id,
    ).delete()

    # Xóa khỏi ConversationMember của nhóm chat
    if comm.conversation_id:
        db.query(ConversationMember).filter(
            ConversationMember.conversation_id == comm.conversation_id,
            ConversationMember.user_id == current_user.id,
        ).delete()

    db.commit()
    return _build_community_response(db, comm, current_user.id)
