"""
seed_data.py
Script nạp dữ liệu mẫu (Mock / Seed Data) vào Database (hỗ trợ cả Local SQLite lẫn Supabase Cloud).

Cách chạy:
1. Nạp vào Supabase Cloud:
   python backend/seed_data.py --supabase

2. Hoặc nạp vào Local SQLite (trong máy):
   python backend/seed_data.py --local

3. Hoặc truyền URL tùy ý:
   python backend/seed_data.py "postgresql://..."
"""

import sys
import os

# Thêm đường dẫn backend vào sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.security import hash_password
from app.db.database import Base
from app.models.user import User
from app.models.profile import Profile
from app.models.survey import SurveyAnswer
from app.models.post import Post, PostLike, PostComment

# Lấy URL từ biến môi trường (bảo mật tuyệt đối, không hard-code thông tin database thật)
DEFAULT_DATABASE_URL = os.getenv("DATABASE_URL")

# Danh sách người dùng mẫu chất lượng cao
SAMPLE_USERS = [
    {
        "username": "mai_linh_ui",
        "email": "mailinh.design@gmail.com",
        "display_name": "Nguyễn Mai Linh",
        "avatar_url": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
        "bio": "UI/UX Designer tại TP.HCM 🎨 Yêu cà phê sách, thích nghe nhạc indie và vẽ tranh màu nước mỗi cuối tuần.",
        "survey": {
            "age_group": "21–24",
            "current_status": "Đang đi làm",
            "life_situation": "Vừa chuyển đến môi trường mới",
            "recent_feelings": ["Hy vọng & Hướng về phía trước", "Thỉnh thoảng thấy cô đơn"],
            "goals": ["Tìm bạn tâm giao, đồng điệu", "Chia sẻ câu chuyện & sở thích"],
            "community_expectations": ["Lắng nghe chân thành, không phán xét", "Năng lượng tích cực, ấm áp"],
            "topics": ["Nghệ thuật & Âm nhạc", "Tâm lý học & Chữa lành", "Du lịch & Trải nghiệm"],
            "free_time_activities": ["Dạo phố, quán cà phê yên tĩnh", "Nghe nhạc, podcast thư giãn", "Đọc sách hoặc viết lách"],
            "desired_connection_types": ["Kết nối bạn bè 1-1", "Nhóm bạn nhỏ cùng chung mục tiêu"],
            "preferred_mode": "Nhắn tin chậm rãi, sâu sắc khi rảnh",
            "discovery_preference": "Ưu tiên người có hoàn cảnh tương đồng nhất",
            "story": "Mình mới chuyển từ Đà Nẵng vào Sài Gòn làm việc được 6 tháng. Đôi lúc cảm thấy nhịp sống ở đây hơi vội vã nên muốn tìm những người bạn cùng gu để trò chuyện chân thành.",
            "what_you_want_others_to_understand": "Mình phản hồi tin nhắn hơi chậm khi đang tập trung làm việc, nhưng luôn trân trọng mọi cuộc trò chuyện sâu sắc."
        }
    },
    {
        "username": "tuan_anh_dev",
        "email": "tuananh.coder@gmail.com",
        "display_name": "Trần Tuấn Anh",
        "avatar_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
        "bio": "Frontend & Fullstack Engineer 💻 Đam mê AI, mã nguồn mở, thích chạy bộ và chơi cờ vua.",
        "survey": {
            "age_group": "25–29",
            "current_status": "Đang đi làm",
            "life_situation": "Cuộc sống ổn định nhưng muốn kết nối sâu sắc hơn",
            "recent_feelings": ["Tò mò, hào hứng khám phá", "Hy vọng & Hướng về phía trước"],
            "goals": ["Cùng học tập, phát triển kỹ năng", "Chia sẻ câu chuyện & sở thích"],
            "community_expectations": ["Gợi ý, lời khuyên hữu ích", "Sự tôn trọng và giữ gìn riêng tư"],
            "topics": ["Công nghệ & Lập trình", "Phát triển bản thân", "Phim ảnh & Văn hóa"],
            "free_time_activities": ["Tập luyện thể thao, yoga", "Đọc sách hoặc viết lách", "Xem phim hoặc chơi game"],
            "desired_connection_types": ["Người đồng hành học tập/công việc", "Kết nối bạn bè 1-1"],
            "preferred_mode": "Trò chuyện thường xuyên, chia sẻ hàng ngày",
            "discovery_preference": "Mở rộng kết nối để học hỏi góc nhìn mới",
            "story": "Mình làm IT remote nên ít có dịp giao lưu bên ngoài. Hy vọng gặp được những người bạn có cùng chí hướng học hỏi và rèn luyện bản thân mỗi ngày.",
            "what_you_want_others_to_understand": "Mình thích sự thẳng thắn, tích cực và luôn sẵn sàng hỗ trợ bạn bè khi có thể."
        }
    },
    {
        "username": "ha_my_writer",
        "email": "hamy.literature@gmail.com",
        "display_name": "Lê Hà My",
        "avatar_url": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80",
        "bio": "Content Writer & Book Lover 📖 Thích mùi giấy cũ, trà thảo mộc và những cuộc chuyện trò dưới đêm mưa.",
        "survey": {
            "age_group": "21–24",
            "current_status": "Freelancer",
            "life_situation": "Bắt đầu cuộc sống tự lập",
            "recent_feelings": ["Mong muốn được lắng nghe", "Thỉnh thoảng thấy cô đơn"],
            "goals": ["Tìm bạn tâm giao, đồng điệu", "Tìm người cùng vượt qua giai đoạn khó khăn"],
            "community_expectations": ["Lắng nghe chân thành, không phán xét", "Năng lượng tích cực, ấm áp"],
            "topics": ["Sách & Viết lách", "Tâm lý học & Chữa lành", "Nghệ thuật & Âm nhạc"],
            "free_time_activities": ["Đọc sách hoặc viết lách", "Nghe nhạc, podcast thư giãn", "Dạo phố, quán cà phê yên tĩnh"],
            "desired_connection_types": ["Kết nối bạn bè 1-1"],
            "preferred_mode": "Nhắn tin chậm rãi, sâu sắc khi rảnh",
            "discovery_preference": "Ưu tiên người có hoàn cảnh tương đồng nhất",
            "story": "Mình viết lách tự do tại nhà. Đôi lúc những dòng chữ không đủ để giãi bày hết tâm sự, mình cần một người bạn biết lắng nghe và thấu hiểu.",
            "what_you_want_others_to_understand": "Mình hướng nội nhưng rất cởi mở khi gặp đúng người đồng điệu về tâm hồn."
        }
    },
    {
        "username": "hoang_nam_fit",
        "email": "hoangnam.active@gmail.com",
        "display_name": "Phạm Hoàng Nam",
        "avatar_url": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
        "bio": "Sinh viên Thể thao & Đời sống 🏃‍♂️ Yêu leo núi, trekking và lan tỏa lối sống lành mạnh.",
        "survey": {
            "age_group": "18–20",
            "current_status": "Sinh viên",
            "life_situation": "Đang tìm kiếm định hướng tương lai",
            "recent_feelings": ["Tò mò, hào hứng khám phá", "Hy vọng & Hướng về phía trước"],
            "goals": ["Cùng học tập, phát triển kỹ năng", "Chia sẻ câu chuyện & sở thích"],
            "community_expectations": ["Năng lượng tích cực, ấm áp", "Gợi ý, lời khuyên hữu ích"],
            "topics": ["Thể thao & Sức khỏe", "Du lịch & Trải nghiệm", "Phát triển bản thân"],
            "free_time_activities": ["Tập luyện thể thao, yoga", "Dạo phố, quán cà phê yên tĩnh"],
            "desired_connection_types": ["Nhóm bạn nhỏ cùng chung mục tiêu", "Người đồng hành học tập/công việc"],
            "preferred_mode": "Trò chuyện thường xuyên, chia sẻ hàng ngày",
            "discovery_preference": "Mở rộng kết nối để học hỏi góc nhìn mới",
            "story": "Là sinh viên năm 2 đang muốn thử thách bản thân với nhiều hoạt động ngoại khóa và tìm kiếm bạn đồng hành cùng tập luyện.",
            "what_you_want_others_to_understand": "Tính cách mình khá năng động, thích trò chuyện vui vẻ và không ngại thử cái mới!"
        }
    },
    {
        "username": "thu_trang_mkt",
        "email": "thutrang.travel@gmail.com",
        "display_name": "Đỗ Thu Trang",
        "avatar_url": "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
        "bio": "Marketing Specialist & Nhiếp ảnh gia tự do 📷 Đi tìm những khoảnh khắc dịu dàng giữa đời thường.",
        "survey": {
            "age_group": "25–29",
            "current_status": "Đang đi làm",
            "life_situation": "Gặp áp lực công việc hoặc học tập",
            "recent_feelings": ["Căng thẳng, quá tải", "Mong muốn được lắng nghe"],
            "goals": ["Tìm bạn tâm giao, đồng điệu", "Tìm người cùng vượt qua giai đoạn khó khăn"],
            "community_expectations": ["Lắng nghe chân thành, không phán xét", "Năng lượng tích cực, ấm áp"],
            "topics": ["Du lịch & Trải nghiệm", "Nghệ thuật & Âm nhạc", "Tâm lý học & Chữa lành"],
            "free_time_activities": ["Dạo phố, quán cà phê yên tĩnh", "Nghe nhạc, podcast thư giãn"],
            "desired_connection_types": ["Kết nối bạn bè 1-1"],
            "preferred_mode": "Nhắn tin chậm rãi, sâu sắc khi rảnh",
            "discovery_preference": "Ưu tiên người có hoàn cảnh tương đồng nhất",
            "story": "Công việc agency nhiều deadline khiến mình đôi khi kiệt sức. Cần một không gian nhẹ nhàng để chia sẻ mà không phải mang mặt nạ mạnh mẽ.",
            "what_you_want_others_to_understand": "Đừng ngần ngại nhắn tin cho mình nếu bạn cũng cần một người bầu bạn sau những giờ làm việc mệt mỏi."
        }
    },
    {
        "username": "duc_minh_startup",
        "email": "ducminh.edtech@gmail.com",
        "display_name": "Vũ Đức Minh",
        "avatar_url": "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=400&q=80",
        "bio": "EdTech Builder 🚀 Thích chia sẻ về phương pháp học tập hiệu quả, tư duy khởi nghiệp và lối sống tối giản.",
        "survey": {
            "age_group": "25–29",
            "current_status": "Đang đi làm",
            "life_situation": "Cuộc sống ổn định nhưng muốn kết nối sâu sắc hơn",
            "recent_feelings": ["Tò mò, hào hứng khám phá", "Hy vọng & Hướng về phía trước"],
            "goals": ["Cùng học tập, phát triển kỹ năng", "Chia sẻ câu chuyện & sở thích"],
            "community_expectations": ["Gợi ý, lời khuyên hữu ích", "Sự tôn trọng và giữ gìn riêng tư"],
            "topics": ["Công nghệ & Lập trình", "Phát triển bản thân", "Sách & Viết lách"],
            "free_time_activities": ["Đọc sách hoặc viết lách", "Tập luyện thể thao, yoga"],
            "desired_connection_types": ["Người đồng hành học tập/công việc", "Nhóm bạn nhỏ cùng chung mục tiêu"],
            "preferred_mode": "Trò chuyện thường xuyên, chia sẻ hàng ngày",
            "discovery_preference": "Mở rộng kết nối để học hỏi góc nhìn mới",
            "story": "Đang xây dựng một nền tảng giáo dục mở. Luôn tin rằng việc kết nối đúng người vào đúng thời điểm sẽ tạo nên những thay đổi kỳ diệu.",
            "what_you_want_others_to_understand": "Mình trân trọng thời gian của nhau và luôn hướng tới những cuộc trò chuyện tạo ra giá trị."
        }
    }
]

# Các bài viết mẫu trên Bảng tin Cộng đồng (Moments & Feed)
SAMPLE_POSTS = [
    {
        "author_username": "mai_linh_ui",
        "category": "Nghệ thuật",
        "mood": "Bình yên",
        "content": "Chiều nay góc phố quen vắng người, ngồi vẽ xong bức tranh màu nước cảm giác nhẹ nhõm hẳn. Đôi khi chỉ cần một khoảng lặng nhỏ để nạp lại năng lượng sáng tạo. ✨",
        "image_url": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=800&q=80"
    },
    {
        "author_username": "tuan_anh_dev",
        "category": "Công nghệ",
        "mood": "Hào hứng",
        "content": "Vừa hoàn thành xong bản thử nghiệm thuật toán matching bằng TF-IDF và Cosine Similarity! Thấy kết quả gợi ý chuẩn xác mà sướng rơn. Có bác nào ở đây cũng đam mê Data & Machine Learning không?",
        "image_url": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80"
    },
    {
        "author_username": "ha_my_writer",
        "category": "Đọc sách",
        "mood": "Suy tư",
        "content": "'Chúng ta không cô đơn vì ở một mình, chúng ta cô đơn vì ở giữa đám đông mà không thể là chính mình.' - Đọc lại cuốn sách cũ vào một ngày mưa rả rích. Có bạn nào từng cảm thấy như vậy chưa?",
        "image_url": "https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&w=800&q=80"
    },
    {
        "author_username": "thu_trang_mkt",
        "category": "Tâm sự & Cảm xúc",
        "mood": "Mệt mỏi",
        "content": "Một tuần chạy deadline bận rộn cuối cùng cũng qua. Giờ chỉ ước được nằm dài nghe tiếng sóng biển và nhâm nhi một ly trà hoa cúc ấm áp. Tự thưởng cho bản thân một buổi tối nghỉ ngơi trọn vẹn nào! 🍵",
        "image_url": "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80"
    },
    {
        "author_username": "hoang_nam_fit",
        "category": "Thể thao",
        "mood": "Hạnh phúc",
        "content": "Chạy bộ 10km sáng sớm đón bình minh ở hồ Tây! Cảm giác hít hà không khí trong lành lúc 5h30 sáng thật sự không gì sánh bằng. Chúc cả nhà một ngày mới tràn đầy nhiệt huyết! 🔥🏃‍♂️",
        "image_url": "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=800&q=80"
    },
    {
        "author_username": "duc_minh_startup",
        "category": "Freelance",
        "mood": "Cần lời khuyên",
        "content": "Các bạn freelancer và solopreneur ở đây thường cân bằng thời gian giữa công việc và cuộc sống cá nhân như thế nào? Dạo này mình hay bị cuốn vào việc làm không biết điểm dừng, muốn xin một vài tips từ mọi người ạ!",
        "image_url": "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80"
    }
]


def seed_database(db_url: str):
    print("=" * 60)
    print(f"🚀 BẮT ĐẦU NẠP DỮ LIỆU VÀO DATABASE:")
    # Ẩn mật khẩu khi in URL ra màn hình
    masked_url = db_url.split("@")[-1] if "@" in db_url else db_url
    print(f"🎯 Target: ...@{masked_url}")
    print("=" * 60)

    # Chuẩn hóa postgres:// -> postgresql://
    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    connect_args = {}
    if db_url.startswith("sqlite"):
        connect_args["check_same_thread"] = False

    engine = create_engine(db_url, connect_args=connect_args)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)

    with Session() as db:
        # 1. Nạp người dùng và profile, survey
        created_users = {}
        for udata in SAMPLE_USERS:
            uname = udata["username"]
            existing = db.query(User).filter(User.username == uname).first()
            if not existing:
                new_user = User(
                    username=uname,
                    email=udata["email"],
                    password_hash=hash_password("password123"),
                    auth_provider="local",
                    role="user",
                    avatar_url=udata["avatar_url"],
                    is_active=True,
                    is_online=True
                )
                db.add(new_user)
                db.commit()
                db.refresh(new_user)
                created_users[uname] = new_user
                print(f"  ✓ Đã tạo User: @{uname} ({udata['display_name']})")
            else:
                created_users[uname] = existing
                print(f"  ℹ️ Đã tồn tại User: @{uname}")

            user = created_users[uname]

            # Cập nhật Profile
            prof = db.query(Profile).filter(Profile.user_id == user.id).first()
            if not prof:
                prof = Profile(
                    user_id=user.id,
                    display_name=udata["display_name"],
                    avatar_url=udata["avatar_url"],
                    bio=udata["bio"],
                    age_group=udata["survey"]["age_group"],
                    current_status=udata["survey"]["current_status"]
                )
                db.add(prof)
                db.commit()

            # Cập nhật SurveyAnswer
            survey_data = udata["survey"]
            sv = db.query(SurveyAnswer).filter(SurveyAnswer.user_id == user.id).first()
            if not sv:
                sv = SurveyAnswer(
                    user_id=user.id,
                    age_group=survey_data["age_group"],
                    current_status=survey_data["current_status"],
                    life_situation=survey_data["life_situation"],
                    recent_feelings=survey_data["recent_feelings"],
                    goals=survey_data["goals"],
                    community_expectations=survey_data["community_expectations"],
                    topics=survey_data["topics"],
                    free_time_activities=survey_data["free_time_activities"],
                    desired_connection_types=survey_data["desired_connection_types"],
                    preferred_mode=survey_data["preferred_mode"],
                    discovery_preference=survey_data["discovery_preference"],
                    story=survey_data.get("story"),
                    what_you_want_others_to_understand=survey_data.get("what_you_want_others_to_understand")
                )
                db.add(sv)
                db.commit()

        # 2. Nạp bài viết cộng đồng (Community Posts)
        print("\n📰 ĐANG NẠP BÀI VIẾT BẢNG TIN (POSTS)...")
        for pdata in SAMPLE_POSTS:
            author = created_users.get(pdata["author_username"])
            if not author:
                continue

            existing_post = db.query(Post).filter(
                Post.author_id == author.id,
                Post.content == pdata["content"]
            ).first()

            if not existing_post:
                post = Post(
                    author_id=author.id,
                    category=pdata["category"],
                    content=pdata["content"],
                    image_url=pdata["image_url"],
                    mood=pdata.get("mood")
                )
                db.add(post)
                db.commit()
                db.refresh(post)
                print(f"  ✓ Đã đăng bài: [{pdata['category']}] bởi @{author.username}")
            else:
                post = existing_post

        # 3. Thêm một vài lượt like và bình luận tương tác
        all_posts = db.query(Post).all()
        all_user_list = list(created_users.values())

        if all_posts and len(all_user_list) >= 2:
            print("\n❤️ ĐANG TẠO LƯỢT THẢ TIM & BÌNH LUẬN GIAO LƯU...")
            for post in all_posts:
                # Mỗi bài có ít nhất 1-2 người like
                for u in all_user_list[:3]:
                    if u.id != post.author_id:
                        like_exists = db.query(PostLike).filter(
                            PostLike.post_id == post.id,
                            PostLike.user_id == u.id
                        ).first()
                        if not like_exists:
                            db.add(PostLike(post_id=post.id, user_id=u.id))

                # Thêm 1 bình luận giao lưu
                comment_exists = db.query(PostComment).filter(PostComment.post_id == post.id).first()
                if not comment_exists:
                    commenter = all_user_list[1] if post.author_id != all_user_list[1].id else all_user_list[0]
                    db.add(PostComment(
                        post_id=post.id,
                        author_id=commenter.id,
                        content="Chia sẻ hay và đồng cảm quá bạn ơi! Chúc bạn một ngày nhiều năng lượng nhé ✨"
                    ))
            db.commit()
            print("  ✓ Đã tạo lượt tương tác mẫu thành công!")

    print("\n" + "=" * 60)
    print("🎉 NẠP DỮ LIỆU MẪU HOÀN TẤT THÀNH CÔNG 100%! 🎉")
    print("👉 Tất cả tài khoản mẫu có mật khẩu đăng nhập là: password123")
    print("=" * 60)


if __name__ == "__main__":
    target_url = None
    if len(sys.argv) > 1:
        arg = sys.argv[1].strip()
        if arg in ["--supabase", "-s"]:
            target_url = os.getenv("DATABASE_URL")
            if not target_url or target_url.startswith("sqlite"):
                print("❌ Lỗi: Khi dùng cờ --supabase, bạn phải cấu hình DATABASE_URL (PostgreSQL) trong file .env hoặc biến môi trường!")
                sys.exit(1)
        elif arg in ["--local", "-l"]:
            target_url = "sqlite:///./community.db"
        elif arg.startswith("postgresql://") or arg.startswith("sqlite://"):
            target_url = arg

    if not target_url:
        target_url = os.getenv("DATABASE_URL")
        if not target_url:
            target_url = "sqlite:///./community.db"

    seed_database(target_url)

