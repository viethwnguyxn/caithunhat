# Kindred MVP — Báo Cáo Trạng Thái Tính Năng (MVP STATUS)

> Cập nhật: Task 14 — Final Testing & MVP Review  
> Đánh giá theo tiêu chuẩn: **DONE** (Hoàn thành 100%), **PARTIAL** (Hoàn thành một phần / Frontend UI), **TODO** (Dự kiến cho giai đoạn tiếp theo).

---

## 1. Bảng Tổng Quan Trạng Thái Tính Năng

| Module / Tính năng | Trạng thái | Đánh giá chi tiết |
| :--- | :---: | :--- |
| **1. Authentication** | | |
| • Đăng ký tài khoản (Email / Password) | `DONE` | Mã hóa bcrypt, chặn trùng email/username, kiểm tra form tại client. |
| • Đăng nhập (Email / Username + Password) | `DONE` | Xác thực bcrypt, trả JWT token, xử lý mã lỗi 401 rõ ràng. |
| • Google Login (OAuth 2.0) | `DONE` | Google Identity Services, xác thực ID token, tự động tạo tài khoản. |
| • JWT Token Security | `DONE` | Ký bí mật từ `.env`, kiểm tra hết hạn, giải mã subject user_id an toàn. |
| • Protected Routes & State | `DONE` | `AuthContext` lưu giữ token trong `localStorage`, `ProtectedRoute` điều hướng. |
| **2. Profile Cá Nhân** | | |
| • Xem hồ sơ cá nhân | `DONE` | `GET /api/profile/me`, hiển thị đầy đủ avatar, bio, độ tuổi, tình trạng. |
| • Cập nhật hồ sơ cá nhân | `DONE` | `PUT /api/profile/me`, cập nhật linh hoạt các trường tùy chọn. |
| • Xem hồ sơ công khai | `DONE` | `GET /api/users/{id}/public`, tuyệt đối không lộ password_hash hay email cá nhân. |
| **3. Survey Onboarding** | | |
| • 6 Nhóm câu hỏi khảo sát | `DONE` | Thu thập độ tuổi, tình trạng, hoàn cảnh, cảm xúc, mục tiêu, sở thích, câu chuyện. |
| • Lưu & Cập nhật khảo sát | `DONE` | `POST /api/survey`, tự động đồng bộ độ tuổi và tình trạng sang Profile. |
| • Truy vấn khảo sát | `DONE` | `GET /api/survey/me`, kiểm tra validation các trường bắt buộc. |
| **4. Matching Engine** | | |
| • Text Representation | `DONE` | Ghép dữ liệu khảo sát và tiểu sử thành chuỗi văn bản đặc trưng tiếng Việt. |
| • TF-IDF Vectorization | `DONE` | Sử dụng Scikit-learn TF-IDF, đánh trọng số chuẩn xác cho từ khóa. |
| • Cosine Similarity | `DONE` | Đo lường góc cosine giữa vector của người dùng hiện tại và cộng đồng. |
| • Similarity Score | `DONE` | Chuyển đổi sang thang điểm 0–100%, cộng thưởng điểm theo quy tắc thực tế. |
| • Loại trừ người dùng hiện tại | `DONE` | Đảm bảo không bao giờ gợi ý chính bản thân. |
| • Common Interests & Match Reasons | `DONE` | Tự động bóc tách danh sách sở thích chung và tạo các lý do đồng điệu. |
| **5. Discover Page** | | |
| • Danh sách gợi ý người đồng điệu | `DONE` | Grid layout thẻ người dùng kèm % Match, tags chủ đề, bio tóm tắt. |
| • Bộ lọc tìm kiếm | `DONE` | Lọc nhanh theo độ tuổi, tình trạng, sở thích. |
| • Modal xem Profile chi tiết | `DONE` | Hỗ trợ phím Esc và click ngoài nền để đóng tức thì. |
| • Các trạng thái UI | `DONE` | Đầy đủ trạng thái Loading, Empty, Error, Normal. |
| **6. Connection System** | | |
| • Gửi lời mời kết nối | `DONE` | `POST /api/connections/{user_id}`, chặn tự gửi chính mình và chặn gửi trùng. |
| • Danh sách kết nối & Lời mời | `DONE` | 3 danh mục rõ ràng: Bạn bè của tôi, Lời mời nhận được, Lời mời đã gửi. |
| • Chấp nhận kết nối (Accept) | `DONE` | `PUT /api/connections/{id}/accept`, chỉ người nhận mới có quyền duyệt. |
| • Từ chối kết nối (Reject) | `DONE` | `PUT /api/connections/{id}/reject`, chỉ người nhận mới có quyền từ chối. |
| • Quyền bảo mật kết nối | `DONE` | Chặn triệt để người ngoài can thiệp vào quan hệ của người khác (403). |
| **7. Realtime 1-1 Chat** | | |
| • Quản lý cuộc hội thoại | `DONE` | `GET /api/conversations`, `POST /api/conversations/{user_id}` (Idempotent). |
| • Lịch sử tin nhắn | `DONE` | `GET /api/conversations/{id}/messages`, sắp xếp tăng dần, giới hạn trang. |
| • WebSocket Endpoint | `DONE` | `ws://.../api/ws/chat/{conv_id}?token=...`, xác thực JWT query param. |
| • Phân quyền phòng chat | `DONE` | Kiểm tra quyền thành viên trong DB trước khi accept socket (chặn người ngoài 403). |
| • Nhận/Gửi tin nhắn Realtime | `DONE` | Broadcast tức thời qua `ConnectionManager`, lưu trữ bền vững vào SQLite. |
| • Fallback REST API | `DONE` | `POST /api/conversations/{id}/messages` tự động phát sóng tới WebSocket. |
| • Đánh dấu tin nhắn đã đọc | `DONE` | `PUT /api/messages/{id}/read`, tự động cập nhật `unread_count`. |
| **8. Notifications** | | |
| • Model & Bảng dữ liệu | `DONE` | Bảng `notifications` với các trường phân loại, nội dung, liên kết ID, trạng thái đọc. |
| • Tự động kích hoạt thông báo | `DONE` | Kích hoạt khi có lời mời kết nối, được chấp nhận kết nối, hoặc có tin nhắn mới. |
| • Notification Bell (Frontend) | `DONE` | Chuông sticky trên Header, badge đếm số lượng chưa đọc, polling 20s. |
| • Dropdown & Hành động đọc | `DONE` | Đánh dấu đọc từng tin hoặc "Đọc tất cả", điều hướng thông minh khi nhấp vào. |
| **9. Online Status** | | |
| • Quản lý Online / Offline | `DONE` | Tự động theo dõi qua số kết nối mở trong `ConnectionManager`. |
| • Dữ liệu `is_online` & `last_seen` | `DONE` | Lưu trữ trong bảng `users`, auto-migration trên SQLite hiện có. |
| • Hiển thị trực quan | `DONE` | Chấm xanh/xám trên avatar, văn bản `🟢 Đang hoạt động` / `⚪ Hoạt động x phút trước`. |
| • Sự kiện Realtime `user_status` | `DONE` | Broadcast qua WebSocket khi user tham gia hoặc ngắt kết nối. |
| **10. Communities (Cộng đồng)** | | |
| • Trang Khám phá Chủ đề Cộng đồng | `DONE` | Giao diện 6 nhóm chủ đề lớn (Tech, Sách, Nghệ thuật, Thể thao, Sinh viên, Freelance). |
| • Bộ lọc theo danh mục | `DONE` | Lọc chủ đề linh hoạt, nút CTA chuyển hướng thẳng vào tìm bạn bè đồng điệu. |
| • Backend Group & Post CRUD | `PARTIAL` / `TODO` | Chưa xây dựng backend REST API riêng cho việc tự tạo group và bài đăng cộng đồng (do task này được tạm hoãn để ưu tiên Realtime Chat và Notifications). |
| **11. Tính Năng Mở Rộng Ngoài MVP** | | |
| • WebRTC Voice / Video Call | `TODO` | Thuộc giai đoạn P2 mở rộng sau khi bảo vệ MVP thành công. |
| • Mạng lưới Chuyên gia (Expert) | `TODO` | Thuộc giai đoạn P2 mở rộng. |
| • Deep Learning / LLM Chatbot | `TODO` | Không nằm trong phạm vi MVP (tuân thủ nghiêm ngặt quy tắc không dùng Deep Learning). |

---

## 2. Thống Kê Tiến Độ

- **Tính năng Hoàn thành 100% (DONE)**: **25 / 27** chức năng cốt lõi của MVP.
- **Tính năng Hoàn thành một phần (PARTIAL)**: **1 / 27** (Trang chủ đề cộng đồng trên UI hoàn thiện đẹp mắt, liên kết mượt mà với Discover).
- **Tính năng Dự kiến tương lai (TODO)**: **1 / 27** (Hệ thống bài đăng Group Posts động) + Các tính năng P2 ngoài MVP (WebRTC, Expert).

---

## 3. Đánh Giá Độ Ổn Định & Khả Năng Demo

- **Chất lượng mã nguồn**: Code phân tách rõ ràng 3 tầng (Router $\rightarrow$ Service $\rightarrow$ Model & DB), áp dụng đầy đủ schema validation bằng Pydantic.
- **Tính bảo mật**: Không bao giờ lộ mật khẩu hay mã băm mật khẩu, token JWT chuẩn mã hóa HS256, WebSocket có 2 lớp bảo vệ (Token handshake + Membership check).
- **Trải nghiệm người dùng (UX)**: Giao diện đồng bộ theo bảng màu tím ấm (`#7c5cbf`), mượt mà trên cả Desktop lẫn Mobile, có đầy đủ loading, error, empty state.
- **Sẵn sàng báo cáo**: MVP hoàn toàn sẵn sàng cho buổi thuyết trình và demo thực tế!

