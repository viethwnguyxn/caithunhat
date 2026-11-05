import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi import HTTPException
from sqlalchemy import text
from app.core.security import hash_password
from app.db.database import Base, SessionLocal, engine
from app.models.notification import Notification
from app.models.post import Post, PostComment, PostLike
from app.models.profile import Profile
from app.models.user import User
from app.schemas.post import CommentCreate, PostCreate
from app.services import post_service

# Đồng bộ các bảng mới (posts, post_likes, post_comments)
Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    try:
        cols = [r[1] for r in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
        if "role" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user' NOT NULL"))
        if "auth_provider" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(20) DEFAULT 'local' NOT NULL"))
        if "avatar_url" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500)"))
        if "is_online" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_online BOOLEAN DEFAULT 0 NOT NULL"))
        if "last_seen" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN last_seen DATETIME"))
        conn.commit()
    except Exception:
        pass


def ensure_user(db, username, email, role="user"):
    u = db.query(User).filter(User.username == username).first()
    if not u:
        u = User(
            username=username,
            email=email,
            password_hash=hash_password("password123"),
            auth_provider="local",
            role=role,
            is_active=True,
        )
        db.add(u)
        db.commit()
        db.refresh(u)
    else:
        if u.role != role:
            u.role = role
            db.commit()

    p = db.query(Profile).filter(Profile.user_id == u.id).first()
    if not p:
        p = Profile(user_id=u.id, display_name=f"Hồ sơ {username}", bio=f"Bio của {username}")
        db.add(p)
        db.commit()
    return u


def test_posts_and_feed_flow():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("🚀 BẮT ĐẦU CHẠY TEST COMMUNITY FEED & MOMENTS")
        print("=" * 60)

        # 1. Setup users
        alice = ensure_user(db, "alice_dev", "alice@example.com", role="user")
        bob = ensure_user(db, "bob_coder", "bob@example.com", role="user")
        quang = ensure_user(db, "quang_tech", "quang@example.com", role="user")
        admin = ensure_user(db, "admin", "admin@kindred.local", role="admin")

        # Dọn dẹp notifications cũ giữa Alice và Bob
        db.query(Notification).filter(Notification.user_id == alice.id).delete()
        db.commit()

        print("\n--- [1] KIỂM TRA ĐĂNG BÀI VIẾT / KHOẢNH KHẮC (POST CREATE) ---")
        post_in = PostCreate(
            category="Công nghệ",
            content="@bob_coder Hôm nay mình vừa hoàn thành xong tính năng Realtime Chat WebSocket! Cảm giác thật tuyệt vời 🚀",
            image_url="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600",
            mood="Hào hứng",
        )
        post_res = post_service.create_post(db, alice, post_in)
        assert post_res.id is not None
        assert post_res.author.username == "alice_dev"
        assert post_res.category == "Công nghệ"
        assert post_res.mood == "Hào hứng"
        assert post_res.likes_count == 0
        assert post_res.comments_count == 0
        print(f"  ✓ Tạo bài viết thành công: ID #{post_res.id} bởi @{alice.username}")

        bob_mentions = post_service.get_user_mentions(db, bob.id)
        assert any(mention.post.id == post_res.id for mention in bob_mentions)
        mention_notif = (
            db.query(Notification)
            .filter(
                Notification.user_id == bob.id,
                Notification.type == "mention",
                Notification.related_id == post_res.id,
            )
            .first()
        )
        assert mention_notif is not None
        print("  ✓ @mention trong bài viết xuất hiện ở mục nhắc đến và tạo thông báo")

        print("\n--- [2] KIỂM TRA TRUY VẤN BẢNG TIN (FEED & FILTER) ---")
        # 2.1 Tất cả feed
        feed_all = post_service.get_posts(db, current_user_id=bob.id)
        assert any(p.id == post_res.id for p in feed_all)
        print(f"  ✓ Lấy bảng tin chung thành công (Tổng {len(feed_all)} bài viết)")

        # 2.2 Lọc theo đúng chủ đề "Công nghệ"
        feed_tech = post_service.get_posts(db, current_user_id=bob.id, category="Công nghệ")
        assert any(p.id == post_res.id for p in feed_tech)
        print("  ✓ Lọc theo đúng chủ đề 'Công nghệ': Bài viết hiển thị chính xác")

        # 2.3 Lọc theo chủ đề khác "Đọc sách" -> Không chứa bài viết của Alice
        feed_books = post_service.get_posts(db, current_user_id=bob.id, category="Đọc sách")
        assert not any(p.id == post_res.id for p in feed_books)
        print("  ✓ Lọc theo chủ đề khác 'Đọc sách': Loại trừ bài viết chính xác")

        print("\n--- [3] KIỂM TRA THẢ TIM & HỦY THẢ TIM (LIKE / UNLIKE TOGGLE) ---")
        reaction_res = post_service.set_post_reaction(db, bob, post_res.id, "haha")
        assert reaction_res.reaction == "haha"
        assert reaction_res.reactions == {"haha": 1}
        bob_post_view = next(
            p for p in post_service.get_posts(db, current_user_id=bob.id)
            if p.id == post_res.id
        )
        assert bob_post_view.my_reaction == "haha"
        assert bob_post_view.is_liked_by_me is False
        print("  ✓ Bày tỏ cảm xúc haha được lưu và trả về đúng loại cảm xúc")

        reaction_res = post_service.set_post_reaction(db, bob, post_res.id, "haha")
        assert reaction_res.reaction is None
        assert reaction_res.reactions_count == 0
        print("  ✓ Bấm lại cảm xúc đang chọn sẽ gỡ cảm xúc")

        # 3.1 Bob thả tim bài viết của Alice
        like_res = post_service.toggle_like_post(db, bob, post_res.id)
        assert like_res.liked is True
        assert like_res.likes_count == 1
        print("  ✓ Bob thả tim bài viết: liked=True, likes_count=1")

        # Kiểm tra cờ is_liked_by_me của Bob
        bob_feed = post_service.get_posts(db, current_user_id=bob.id)
        bob_post_view = next(p for p in bob_feed if p.id == post_res.id)
        assert bob_post_view.is_liked_by_me is True
        print("  ✓ Cờ is_liked_by_me = True khi Bob xem bài viết")

        # Kiểm tra Alice nhận được thông báo post_like
        notifs = (
            db.query(Notification)
            .filter(Notification.user_id == alice.id, Notification.type == "post_like")
            .all()
        )
        assert any("thích" in item.content or "👍" in item.title for item in notifs)
        notif = next(item for item in notifs if "thích" in item.content or "👍" in item.title)
        print(f"  ✓ Đã tự động tạo thông báo cho tác giả: '{notif.title}'")

        # 3.2 Bob bấm thả tim lần nữa -> Hủy like (Toggle)
        unlike_res = post_service.toggle_like_post(db, bob, post_res.id)
        assert unlike_res.liked is False
        assert unlike_res.likes_count == 0
        print("  ✓ Bob bấm like lần nữa -> Hủy like thành công: likes_count=0")

        # Bob like lại để giữ 1 like
        post_service.toggle_like_post(db, bob, post_res.id)

        print("\n--- [4] KIỂM TRA BÌNH LUẬN (COMMENTS) ---")
        # 4.1 Bob bình luận vào bài viết của Alice
        comment_res = post_service.create_comment(
            db, bob, post_res.id, CommentCreate(content="@quang_tech Chúc mừng bạn nhé, dự án trông xịn quá!")
        )
        assert comment_res.id is not None
        assert comment_res.author.username == "bob_coder"
        assert comment_res.content == "@quang_tech Chúc mừng bạn nhé, dự án trông xịn quá!"
        print(f"  ✓ Tạo bình luận thành công: ID #{comment_res.id}")

        quang_mentions = post_service.get_user_mentions(db, quang.id)
        assert any(mention.id == f"comment-{comment_res.id}" for mention in quang_mentions)
        comment_mention_notif = (
            db.query(Notification)
            .filter(
                Notification.user_id == quang.id,
                Notification.type == "mention",
                Notification.related_id == post_res.id,
            )
            .first()
        )
        assert comment_mention_notif is not None
        print("  ✓ @mention trong bình luận xuất hiện ở mục nhắc đến và tạo thông báo")

        # Kiểm tra thông báo post_comment cho Alice
        comm_notif = (
            db.query(Notification)
            .filter(Notification.user_id == alice.id, Notification.type == "post_comment")
            .first()
        )
        assert comm_notif is not None
        assert "bình luận" in comm_notif.title
        print(f"  ✓ Đã tự động tạo thông báo bình luận: '{comm_notif.title}'")

        # 4.2 Lấy danh sách bình luận
        comments = post_service.get_post_comments(db, post_res.id)
        assert len(comments) >= 1
        assert any(c.id == comment_res.id for c in comments)
        print(f"  ✓ Truy vấn danh sách bình luận thành công ({len(comments)} bình luận)")

        print("\n--- [5] KIỂM TRA PHÂN QUYỀN XÓA BÌNH LUẬN & BÀI VIẾT ---")
        # 5.1 Người ngoài không được phép xóa bài viết của Alice
        try:
            post_service.delete_post(db, bob, post_res.id)
            assert False, "Bob không thể xóa bài của Alice"
        except HTTPException as e:
            assert e.status_code == 403
            print(f"  ✓ Bob cố xóa bài của Alice bị chặn với HTTP 403: {e.detail}")

        # 5.2 Người bình luận (Bob) tự xóa bình luận của mình
        del_comm_res = post_service.delete_comment(db, bob, comment_res.id)
        assert del_comm_res.success is True
        print("  ✓ Bob tự xóa bình luận của mình thành công")

        # 5.3 Admin có quyền xóa bài viết của Alice
        del_post_res = post_service.delete_post(db, admin, post_res.id)
        assert del_post_res.success is True
        print("  ✓ Quản trị viên (Admin) xóa bài viết thành công")

        # Xác nhận bài viết đã bị xóa khỏi DB
        assert db.query(Post).filter(Post.id == post_res.id).first() is None
        print("  ✓ Bài viết đã được xóa hoàn toàn khỏi Database")

        print("\n" + "=" * 60)
        print("🎉 TOÀN BỘ TEST CASES COMMUNITY FEED & MOMENTS ĐÃ PASS 100%! 🎉")
        print("=" * 60 + "\n")
        return True

    finally:
        db.close()


if __name__ == "__main__":
    if not test_posts_and_feed_flow():
        sys.exit(1)
