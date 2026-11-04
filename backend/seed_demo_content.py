"""Seed clearly labeled demo accounts and posts into a PostgreSQL database."""

import argparse

from sqlalchemy.orm import Session

from app.db.database import SessionLocal, engine
from app.models import Post, Profile, SurveyAnswer, User


DEMO_PROFILES = [
    {
        "username": "demo_lapulga_01",
        "display_name": "La Pulga Demo 01",
        "age_group": "23-26",
        "current_status": "Sinh viên",
        "life_situation": "Đang tìm kiếm định hướng tương lai",
        "topic": "Công nghệ & Lập trình",
        "activity": "Đọc sách hoặc viết lách",
        "story": "Tài khoản minh họa để thử luồng chia sẻ về công nghệ.",
        "post_category": "Công nghệ & Lập trình",
        "post_content": "[BÀI MẪU • DEMO] Mình đang học làm một ứng dụng nhỏ đầu tiên. Mọi người thường làm gì để giữ động lực khi gặp lỗi khó?",
        "mood": "🚀 Quyết tâm",
    },
    {
        "username": "demo_lapulga_02",
        "display_name": "La Pulga Demo 02",
        "age_group": "27-35",
        "current_status": "Đang đi làm",
        "life_situation": "Cuộc sống ổn định nhưng muốn kết nối sâu sắc hơn",
        "topic": "Sách & Viết lách",
        "activity": "Đọc sách hoặc viết lách",
        "story": "Tài khoản minh họa cho các cuộc trò chuyện về sách và thói quen.",
        "post_category": "Sách & Tư duy",
        "post_content": "[BÀI MẪU • DEMO] Gần đây mình thử dành mười phút mỗi tối để đọc sách thay vì lướt điện thoại. Có ai đang xây một thói quen nhỏ như vậy không?",
        "mood": "☕ Thư giãn",
    },
    {
        "username": "demo_lapulga_03",
        "display_name": "La Pulga Demo 03",
        "age_group": "18-22",
        "current_status": "Sinh viên",
        "life_situation": "Vừa chuyển đến môi trường mới",
        "topic": "Nghệ thuật & Âm nhạc",
        "activity": "Dạo phố, quán cà phê yên tĩnh",
        "story": "Tài khoản minh họa cho chủ đề sáng tạo và nghệ thuật.",
        "post_category": "Nghệ thuật & Sáng tạo",
        "post_content": "[BÀI MẪU • DEMO] Hôm nay mình thử vẽ lại một góc phố quen bằng màu nước. Những lúc bí ý tưởng, mọi người thường tìm cảm hứng ở đâu?",
        "mood": "😊 Vui vẻ",
    },
    {
        "username": "demo_lapulga_04",
        "display_name": "La Pulga Demo 04",
        "age_group": "23-26",
        "current_status": "Freelancer",
        "life_situation": "Bắt đầu cuộc sống tự lập",
        "topic": "Thể thao & Sức khỏe",
        "activity": "Tập luyện thể thao, yoga",
        "story": "Tài khoản minh họa cho các hoạt động sức khỏe và vận động.",
        "post_category": "Thể thao & Sức khỏe",
        "post_content": "[BÀI MẪU • DEMO] Mình đang bắt đầu đi bộ nhanh vài vòng sau giờ làm để vận động nhiều hơn. Ai có playlist hoặc mẹo nào giúp duy trì đều đặn không?",
        "mood": "✨ Truyền cảm hứng",
    },
    {
        "username": "demo_lapulga_05",
        "display_name": "La Pulga Demo 05",
        "age_group": "27-35",
        "current_status": "Freelancer",
        "life_situation": "Cuộc sống ổn định nhưng muốn kết nối sâu sắc hơn",
        "topic": "Phát triển bản thân",
        "activity": "Dạo phố, quán cà phê yên tĩnh",
        "story": "Tài khoản minh họa cho chủ đề làm việc tự do và khởi nghiệp.",
        "post_category": "Freelance & Khởi nghiệp",
        "post_content": "[BÀI MẪU • DEMO] Làm việc tự do ở nhà đôi khi hơi thiếu tương tác. Mọi người thích làm ở nhà, thư viện hay quán cà phê hơn?",
        "mood": "☕ Thư giãn",
    },
    {
        "username": "demo_lapulga_06",
        "display_name": "La Pulga Demo 06",
        "age_group": "18-22",
        "current_status": "Sinh viên",
        "life_situation": "Đang tìm kiếm định hướng tương lai",
        "topic": "Phim ảnh & Văn hóa",
        "activity": "Xem phim hoặc chơi game",
        "story": "Tài khoản minh họa cho chủ đề trò chơi và giải trí.",
        "post_category": "Game & Esports",
        "post_content": "[BÀI MẪU • DEMO] Mình thích những game co-op nhẹ nhàng để chơi cùng bạn sau giờ học. Mọi người có tựa game nào dễ rủ người mới chơi cùng không?",
        "mood": "😊 Vui vẻ",
    },
    {
        "username": "demo_lapulga_07",
        "display_name": "La Pulga Demo 07",
        "age_group": "23-26",
        "current_status": "Đang đi làm",
        "life_situation": "Gặp áp lực công việc hoặc học tập",
        "topic": "Công nghệ & Lập trình",
        "activity": "Nghe nhạc, podcast thư giãn",
        "story": "Tài khoản minh họa cho trao đổi kinh nghiệm học công nghệ.",
        "post_category": "Công nghệ & Lập trình",
        "post_content": "[BÀI MẪU • DEMO] Mình đang học thêm một công cụ mới ngoài giờ làm và cố gắng chia nhỏ mục tiêu mỗi tuần. Mọi người thường sắp xếp thời gian học thế nào?",
        "mood": "🚀 Quyết tâm",
    },
]


def seed_demo_content(db: Session) -> tuple[int, int]:
    created_users = 0
    created_posts = 0

    for data in DEMO_PROFILES:
        username = data["username"]
        user = db.query(User).filter(User.username == username).one_or_none()
        if user is None:
            user = User(
                username=username,
                email=f"{username}@demo.lapulga.invalid",
                password_hash=None,
                auth_provider="demo",
                role="user",
                is_active=True,
                is_online=False,
            )
            db.add(user)
            db.flush()
            created_users += 1
        elif user.auth_provider != "demo":
            raise RuntimeError(f"Refusing to overwrite non-demo account: {username}")

        profile = db.query(Profile).filter(Profile.user_id == user.id).one_or_none()
        profile_values = {
            "display_name": data["display_name"],
            "bio": "Tài khoản demo do hệ thống tạo để minh họa dữ liệu cộng đồng; không phải người dùng thật.",
            "age_group": data["age_group"],
            "current_status": data["current_status"],
        }
        if profile is None:
            db.add(Profile(user_id=user.id, **profile_values))
        else:
            for field, value in profile_values.items():
                setattr(profile, field, value)

        survey = db.query(SurveyAnswer).filter(SurveyAnswer.user_id == user.id).one_or_none()
        survey_values = {
            "age_group": data["age_group"],
            "current_status": data["current_status"],
            "life_situation": data["life_situation"],
            "recent_feelings": ["Tò mò, hào hứng khám phá"],
            "goals": ["Chia sẻ câu chuyện & sở thích"],
            "community_expectations": ["Lắng nghe chân thành, không phán xét"],
            "topics": [data["topic"]],
            "free_time_activities": [data["activity"]],
            "desired_connection_types": ["Kết nối bạn bè 1-1"],
            "preferred_mode": "Nhắn tin chậm rãi, sâu sắc khi rảnh",
            "discovery_preference": "Mở rộng kết nối để học hỏi góc nhìn mới",
            "story": data["story"],
            "what_you_want_others_to_understand": "Đây là hồ sơ demo, không đại diện cho người dùng thật.",
        }
        if survey is None:
            db.add(SurveyAnswer(user_id=user.id, **survey_values))
        else:
            for field, value in survey_values.items():
                setattr(survey, field, value)

        post = (
            db.query(Post)
            .filter(Post.author_id == user.id, Post.content == data["post_content"])
            .one_or_none()
        )
        if post is None:
            db.add(
                Post(
                    author_id=user.id,
                    category=data["post_category"],
                    content=data["post_content"],
                    mood=data["mood"],
                )
            )
            created_posts += 1

    db.commit()
    return created_users, created_posts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--confirm-public-demo-data",
        action="store_true",
        help="Confirm that clearly labeled demo accounts and posts will be public.",
    )
    args = parser.parse_args()

    if not args.confirm_public_demo_data:
        parser.error("Pass --confirm-public-demo-data to write public demo content.")
    if engine.dialect.name != "postgresql":
        parser.error("This command is restricted to PostgreSQL production databases.")

    with SessionLocal() as db:
        created_users, created_posts = seed_demo_content(db)

    print(f"Created {created_users} demo accounts and {created_posts} demo posts.")
    print("Existing demo accounts and their matching posts were left in place.")


if __name__ == "__main__":
    main()
