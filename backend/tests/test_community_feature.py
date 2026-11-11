import os
import sys

# Đảm bảo đường dẫn import và dùng SQLite local cho test
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["DATABASE_URL"] = "sqlite:///./community.db"

from app.db.database import Base, SessionLocal, engine
from app.models.chat import Conversation, Message
from app.models.community import Community, CommunityMember
from app.models.user import User
from app.schemas.community import CommunityCreate
from app.schemas.post import PostCreate
from app.services import community_service, post_service


def run_tests():
    print("=" * 60)
    print("🚀 BẮT ĐẦU TEST TÍNH NĂNG CỘNG ĐỒNG & NHÓM CHAT (COMMUNITY FEATURE)")
    print("=" * 60)

    # Đảm bảo migration schema và các bảng mới được tạo
    from app.main import migrate_community_schema
    migrate_community_schema()
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Lấy hoặc tạo user test
        test_user = db.query(User).filter(User.username == "admin").first()
        if not test_user:
            test_user = db.query(User).first()
        assert test_user is not None, "Cần có ít nhất 1 user trong database"

        # 1. Test Seed dữ liệu mặc định
        print("\n--- [1/6] Kiểm tra Seed cộng đồng mặc định ---")
        community_service.seed_default_communities(db, test_user.id)
        comm_list = community_service.get_communities(db, test_user)
        assert len(comm_list) >= 6, f"Mong đợi ít nhất 6 cộng đồng, nhận được {len(comm_list)}"
        print(f"✓ Đã có {len(comm_list)} cộng đồng (Top: {comm_list[0].name})")

        # 2. Test Tạo cộng đồng mới
        print("\n--- [2/6] Kiểm tra Tạo mới một Cộng đồng & Nhóm chat riêng ---")
        new_comm_data = CommunityCreate(
            name="Cộng đồng AI & Deep Learning Test",
            description="Không gian thảo luận chuyên sâu về các mô hình ngôn ngữ lớn, Computer Vision và AI Agents.",
            category="Công nghệ & Lập trình",
            icon="🧠",
            tags="AI,LLM,Python,Agents",
        )
        created_comm = community_service.create_community(db, test_user, new_comm_data)
        assert created_comm.id is not None
        assert created_comm.name == "Cộng đồng AI & Deep Learning Test"
        assert created_comm.conversation_id is not None, "Cộng đồng phải có conversation_id"
        assert created_comm.is_joined is True, "Người tạo phải tự động là thành viên"
        print(f"✓ Tạo thành công cộng đồng #{created_comm.id}: {created_comm.name}")
        print(f"✓ Nhóm chat riêng tự động tạo với Conversation ID: {created_comm.conversation_id}")

        # Kiểm tra tin nhắn chào mừng trong nhóm chat
        welcome_msgs = (
            db.query(Message)
            .filter(Message.conversation_id == created_comm.conversation_id)
            .all()
        )
        assert len(welcome_msgs) >= 1
        print(f"✓ Nhóm chat đã có tin nhắn chào mừng: '{welcome_msgs[0].content}'")

        # 3. Test Chi tiết cộng đồng
        print("\n--- [3/6] Kiểm tra Chi tiết Cộng đồng kèm danh sách thành viên ---")
        detail = community_service.get_community_by_id(db, created_comm.id, test_user)
        assert len(detail.members) >= 1
        print(f"✓ Lấy chi tiết thành công: {detail.name} (Thành viên: {detail.members[0].username})")

        # 4. Test Nhắn tin vào Nhóm Chat cộng đồng
        print("\n--- [4/6] Kiểm tra Gửi tin nhắn vào Nhóm Chat riêng ---")
        msg = Message(
            conversation_id=created_comm.conversation_id,
            sender_id=test_user.id,
            content="Xin chào tất cả mọi người trong cộng đồng AI!",
        )
        db.add(msg)
        db.commit()
        chat_msgs = (
            db.query(Message)
            .filter(Message.conversation_id == created_comm.conversation_id)
            .all()
        )
        assert len(chat_msgs) >= 2
        print(f"✓ Nhóm chat hoạt động chuẩn: Hiện có {len(chat_msgs)} tin nhắn")

        # 5. Test Đăng bài viết vào cộng đồng (có ảnh base64 dài và mood=None)
        print("\n--- [5/6] Kiểm tra Đăng bài viết vào Cộng đồng (ảnh tải từ máy & không cần mood) ---")
        fake_base64_img = "data:image/jpeg;base64," + ("A" * 5000)
        post_in = PostCreate(
            category=created_comm.category,
            community_id=created_comm.id,
            content="Đây là bài viết đầu tiên chia sẻ về dự án AI Agent trong cộng đồng mới!",
            image_url=fake_base64_img,
            mood=None,
        )
        new_post = post_service.create_post(db, test_user, post_in)
        assert new_post.id is not None
        assert new_post.community_id == created_comm.id
        assert new_post.mood is None
        assert new_post.image_url == fake_base64_img
        print(f"✓ Đăng bài viết thành công #{new_post.id} trong nhóm #{created_comm.id} (ảnh {len(fake_base64_img)} chars)")

        # 6. Test Rời và Tham gia lại cộng đồng
        print("\n--- [6/6] Kiểm tra Rời và Tham gia lại cộng đồng ---")
        # Tạo thêm 1 user khác để test join/leave
        other_user = db.query(User).filter(User.id != test_user.id).first()
        if other_user:
            joined = community_service.join_community(db, created_comm.id, other_user)
            assert joined.is_joined is True
            print(f"✓ User @{other_user.username} tham gia cộng đồng thành công")

            left = community_service.leave_community(db, created_comm.id, other_user)
            assert left.is_joined is False
            print(f"✓ User @{other_user.username} rời cộng đồng thành công")
        else:
            print("✓ Bỏ qua test user phụ (chỉ có 1 user)")

        print("\n" + "=" * 60)
        print("🎉 TẤT CẢ TEST CỘNG ĐỒNG & NHÓM CHAT ĐÃ PASS 100%! 🎉")
        print("=" * 60)
    finally:
        db.close()


if __name__ == "__main__":
    run_tests()
