# Kindred MVP — Báo Cáo Trạng Thái Tính Năng (MVP STATUS)

> Phiên bản: **MVP 1.0 — Production Ready**  
> Đánh giá theo tiêu chuẩn: **DONE** (Hoàn thành 100%), **PARTIAL** (Hoàn thành một phần), **TODO** (Dự kiến mở rộng).

---

## 1. Bảng Tổng Quan Trạng Thái Tính Năng

| Module / Tính năng | Trạng thái | Đánh giá chi tiết |
| :--- | :---: | :--- |
| **1. Authentication & Authorization** | | |
| • Đăng ký tài khoản (Email / Password) | `DONE` | Mã hóa bcrypt, kiểm tra trùng email/username, validate form phía client. |
| • Đăng nhập (Email / Username + Password) | `DONE` | Xác thực bcrypt, cấp phát JWT token, xử lý mã lỗi 401 rõ ràng. |
| • Google Login (OAuth 2.0) | `DONE` | Google Identity Services, xác thực ID token, tự động khởi tạo tài khoản & hồ sơ. |
| • JWT Token Security | `DONE` | Ký bí mật từ `.env` (HS256), kiểm tra thời hạn (exp), giải mã an toàn `user_id`. |
| • Protected Routes & State Management | `DONE` | `AuthContext` lưu giữ token trong `localStorage`, `ProtectedRoute` điều hướng chuẩn xác. |
| **2. Profile Cá Nhân** | | |
| • Xem hồ sơ cá nhân | `DONE` | `GET /api/profile/me`, hiển thị đầy đủ avatar, bio, độ tuổi, hoàn cảnh sống. |
| • Cập nhật hồ sơ cá nhân | `DONE` | `PUT /api/profile/me`, cập nhật linh hoạt các trường tùy chọn. |
| • Xem hồ sơ công khai | `DONE` | `GET /api/users/{id}/public`, bảo mật tuyệt đối không lộ password_hash hay email cá nhân. |
| **3. Survey Onboarding (Khảo sát Đồng điệu)** | | |
| • 6 Nhóm câu hỏi khảo sát | `DONE` | Thu thập độ tuổi, hoàn cảnh hiện tại, cảm xúc, mục tiêu, sở thích, câu chuyện riêng. |
| • Lưu & Cập nhật khảo sát | `DONE` | `POST /api/survey`, tự động đồng bộ độ tuổi và tình trạng sang Profile cá nhân. |
| • Truy vấn khảo sát | `DONE` | `GET /api/survey/me`, kiểm tra validation các trường bắt buộc. |
| • Gợi ý khảo sát tại Discover | `DONE` | Tự động phát hiện tài khoản mới chưa làm khảo sát (`has_survey: false`) và hiển thị banner CTA dẫn tới `/survey`. |
| **4. Matching Engine (Thuật toán Ghép đôi)** | | |
| • Text Representation | `DONE` | Ghép dữ liệu khảo sát và tiểu sử thành chuỗi văn bản đặc trưng tiếng Việt có tiền tố ngữ nghĩa. |
| • TF-IDF Vectorization | `DONE` | Sử dụng Scikit-learn TF-IDF, đánh trọng số chuẩn xác cho từ khóa độc đáo. |
| • Cosine Similarity | `DONE` | Đo lường góc cosine giữa vector của người dùng hiện tại và cộng đồng. |
| • Similarity Score | `DONE` | Chuyển đổi sang thang điểm 0–100%, cộng thưởng điểm theo quy tắc thực tế (cùng tuổi, hoàn cảnh). |
| • Loại trừ người dùng hiện tại | `DONE` | Đảm bảo không bao giờ gợi ý chính bản thân người dùng. |
| • Common Interests & Match Reasons | `DONE` | Tự động bóc tách danh sách sở thích chung và tạo các lý do đồng điệu trực quan. |
| **5. Discover Page (Khám phá)** | | |
| • Danh sách gợi ý người đồng điệu | `DONE` | Grid layout thẻ người dùng kèm % Match rực rỡ, tags chủ đề, bio tóm tắt. |
| • Bộ lọc tìm kiếm | `DONE` | Lọc nhanh theo độ tuổi, tình trạng, sở thích. |
| • Đồng ý kết bạn 1-chạm trực tiếp | `DONE` | Nút **[ 🤝 Đồng ý ]** ngay trên thẻ người dùng, cập nhật lạc quan tức thì sang **[ 💬 Nhắn tin ]**. |
| • Modal xem Profile chi tiết | `DONE` | Hỗ trợ phím Esc và click ngoài nền để đóng tức thì, đầy đủ thông tin đồng điệu. |
| • Các trạng thái UI | `DONE` | Đầy đủ trạng thái Loading (Skeleton), Empty, Error, Normal. |
| **6. Connection System (Hệ thống Kết nối)** | | |
| • Gửi lời mời kết nối | `DONE` | `POST /api/connections/{user_id}`, chặn tự gửi chính mình và chặn gửi trùng. |
| • Danh sách kết nối & Lời mời | `DONE` | 3 danh mục rõ ràng: Bạn bè của tôi, Lời mời nhận được, Lời mời đã gửi (hỗ trợ deeplink tab). |
| • Chấp nhận kết nối (Accept) | `DONE` | `PUT /api/connections/{id}/accept`, chỉ người nhận mới có quyền duyệt. |
| • Từ chối kết nối (Reject) | `DONE` | `PUT /api/connections/{id}/reject`, chỉ người nhận mới có quyền từ chối. |
| • Quyền bảo mật kết nối | `DONE` | Chặn triệt để người ngoài can thiệp vào quan hệ của người khác (HTTP 403 Forbidden). |
| **7. Realtime 1-1 Chat (Trò chuyện Thời gian thực)** | | |
| • Quản lý cuộc hội thoại | `DONE` | `GET /api/conversations`, `POST /api/conversations/{user_id}` (Idempotent 1-1). |
| • Lịch sử tin nhắn | `DONE` | `GET /api/conversations/{id}/messages`, sắp xếp tăng dần, hỗ trợ phân trang tin nhắn. |
| • WebSocket Endpoint | `DONE` | `ws://.../api/ws/chat/{conv_id}?token=...`, xác thực JWT query param. |
| • Phân quyền phòng chat | `DONE` | Kiểm tra quyền thành viên trong DB trước khi accept socket (chặn người ngoài 403). |
| • Nhận/Gửi tin nhắn Realtime | `DONE` | Broadcast tức thời qua `ConnectionManager`, lưu trữ bền vững vào SQLite. |
| • Fallback REST API | `DONE` | `POST /api/conversations/{id}/messages` tự động phát sóng tới WebSocket khi mạng yếu. |
| • Đánh dấu tin nhắn đã đọc | `DONE` | `PUT /api/messages/{id}/read`, tự động cập nhật `unread_count` và đồng bộ realtime. |
| **8. Realtime WebRTC 1-1 Voice & Video Call (Gọi thoại & Video)** | | |
| • P2P WebRTC Direct Stream | `DONE` | Sử dụng Google STUN miễn phí (`stun:stun.l.google.com:19302`), truyền tải video/audio trực tiếp P2P. |
| • Signaling Protocol qua WebSocket | `DONE` | Chuyển tiếp các bản tin: `call:offer`, `call:answer`, `call:ice_candidate`, `call:reject`, `call:end`. |
| • Giao diện Cuộc gọi (CallModal) | `DONE` | Dark overlay sang trọng: Remote Video toàn khung, Local Video thu nhỏ góc, hiệu ứng sóng âm khi gọi thoại. |
| • Điều khiển trong cuộc gọi | `DONE` | Đồng hồ đếm thời gian thực, nút Bật/Tắt Micro, Bật/Tắt Camera, nút Kết thúc cuộc gọi. |
| • Bộ âm thanh thuần Web Audio API | `DONE` | Âm báo tút đổ chuông (ringback) và chuông reo cuộc gọi đến (incoming chime) không phụ thuộc file mp3 ngoài, triệt tiêu rò rỉ âm thanh. |
| • Lưu vết lịch sử cuộc gọi | `DONE` | Tự động ghi nhận tin nhắn thông báo vào đoạn chat (`Cuộc gọi thoại/video (Thời lượng: mm:ss)`, `Cuộc gọi nhỡ`). |
| • Ràng buộc nghiệp vụ gọi điện | `DONE` | Chặn gọi nếu bị Block, đổ chuông tối đa 30s tự hủy nếu không nghe, chống mất kết nối bất ngờ. |
| **9. Community Feed & Moments (Bảng tin & Khoảnh khắc)** | | |
| • Đăng bài viết cộng đồng | `DONE` | `POST /api/posts`, hỗ trợ chọn danh mục chủ đề (Công nghệ, Đọc sách, Nghệ thuật, v.v.). |
| • Xem bảng tin & Lọc theo chủ đề | `DONE` | `GET /api/posts?category=...`, phân trang, hiển thị avatar tác giả, thời gian tạo, số lượt tương tác. |
| • Chi tiết bài viết & Bình luận | `DONE` | `GET /api/posts/{id}`, `POST /api/posts/{id}/comments`, bình luận theo dòng thời gian. |
| • Thả tim & Hủy thả tim (Like/Unlike) | `DONE` | `POST /api/posts/{id}/like`, toggle linh hoạt kèm thông báo tức thì tới tác giả. |
| • Phân quyền xóa bài & bình luận | `DONE` | Chỉ tác giả hoặc Quản trị viên (Admin) mới có quyền xóa (HTTP 403 Forbidden nếu vi phạm). |
| **10. An toàn & Kiểm duyệt (Block & Report)** | | |
| • Chặn người dùng 2 chiều (Block) | `DONE` | `POST /api/blocks/{user_id}`, ẩn nhau khỏi Discover, chặn kết nối, khóa chat và vô hiệu hóa nút gọi điện. |
| • Bỏ chặn người dùng (Unblock) | `DONE` | `DELETE /api/blocks/{user_id}`, chỉ người chủ động chặn mới có quyền bỏ chặn. |
| • Báo cáo vi phạm (Report) | `DONE` | `POST /api/reports`, gửi lý do (Spam, Quấy rối, Lừa đảo, Khác) và mô tả lưu DB cho Admin duyệt. |
| **11. Quản trị viên (Admin Dashboard)** | | |
| • Phân quyền Admin (`role == "admin"`) | `DONE` | Dependency `get_current_admin`, bảo vệ toàn diện các endpoint quản trị. |
| • Thống kê hệ thống (Stats) | `DONE` | `GET /api/admin/stats`: Tổng thành viên, số user hoạt động, user bị khóa, số đơn vi phạm chờ duyệt. |
| • Quản lý tài khoản người dùng | `DONE` | `GET /api/admin/users`, `PUT /api/admin/users/{id}/toggle-status`: Tìm kiếm, Khóa / Mở khóa tài khoản ngay lập tức. |
| • Kiểm duyệt đơn vi phạm (Moderation) | `DONE` | `GET /api/admin/reports`, `PUT /api/admin/reports/{id}`: Phê duyệt (kèm tùy chọn khóa user vi phạm) hoặc Bác bỏ báo cáo. |
| **12. Notifications & Online Status (Thông báo & Trạng thái)** | | |
| • Notification Engine | `DONE` | Tự động tạo thông báo khi có lời mời kết bạn, chấp nhận kết bạn, tin nhắn mới, bài viết được like/comment. |
| • Notification Bell (Frontend) | `DONE` | Chuông sticky trên Header, badge đếm số lượng chưa đọc, polling và cập nhật tức thì. |
| • Dropdown & Hành động đọc | `DONE` | Đánh dấu đọc từng tin hoặc "Đọc tất cả", điều hướng thông minh khi nhấp vào. |
| • Trạng thái Online / Offline | `DONE` | Theo dõi qua WebSocket ConnectionManager, cập nhật `is_online` và `last_seen` trong DB. |
| • Sự kiện Realtime `user_status` | `DONE` | Phát sóng tới các kết nối đang mở khi người dùng truy cập hoặc ngắt mạng. |
| **13. Triển khai & Môi trường Sản phẩm (Deployment)** | | |
| • Triển khai Frontend (Vercel) | `DONE` | Hosted tại Vercel (`caithunhat.vercel.app`), cấu hình SPA rewrite thông qua `vercel.json`. |
| • Triển khai Backend (Render) | `DONE` | Hosted tại Render Web Service, hỗ trợ WebSocket và Uvicorn ASGI. |
| • Cấu hình Database & CORS | `DONE` | Kết nối an toàn, cấu hình CORS chuẩn cho production domain. |

---

## 2. Thống Kê Tiến Độ Tổng Hợp

- **Tổng số tính năng cốt lõi**: **32 / 32** chức năng (`100% DONE`).
- **Tính năng hoàn thiện một phần (PARTIAL)**: `0`
- **Tính năng chưa hoàn thành (TODO)**: `0` (Toàn bộ các yêu cầu từ P0 đến P2 mở rộng WebRTC Calling và Moderation đều đã hoàn thành và kiểm thử).

---

## 3. Đánh Giá Độ Ổn Định & Khả Năng Demo

- **Kiến trúc phân tầng chuẩn mực**: Tách biệt hoàn toàn Routers $\rightarrow$ Services $\rightarrow$ Models & Database. Không lẫn lộn logic nghiệp vụ vào router.
- **Tính an toàn & Bảo mật**:
  - Không rò rỉ thông tin nhạy cảm (mật khẩu, hash, email riêng tư).
  - Xác thực JWT 2 lớp cho cả REST API và WebSocket Handshake.
  - Chặn 2 chiều toàn diện giữa người dùng bị block trên tất cả bề mặt: Khám phá, Kết nối, Tin nhắn, Cuộc gọi.
- **Trải nghiệm thực tế (UX/UI)**:
  - Giao diện thân thiện, hiện đại, phối màu tím ấm đặc trưng (`#7c5cbf`).
  - Hỗ trợ đầy đủ trạng thái Loading, Skeleton, Empty state, Error notification.
  - Hoạt động mượt mà cả trên máy tính (Desktop) lẫn thiết bị di động (Mobile).
- **Trạng thái thực tế**: Sẵn sàng 100% cho buổi báo cáo, thuyết trình và demo đồ án!
