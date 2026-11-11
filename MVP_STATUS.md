# La Pulga — Báo Cáo Trạng Thái Tính Năng (MVP STATUS)

> Phiên bản: **La Pulga (phát triển mở rộng từ Kindred MVP 1.0)**  
> Đánh giá theo tiêu chuẩn: **DONE** (Hoàn thành triển khai trong mã nguồn), **PARTIAL** (Hoàn thành phần lõi, còn phụ thuộc cấu hình hạ tầng ngoài hoặc kiểm thử E2E thực tế), **TODO** (Dự kiến mở rộng).

---

## 1. Bảng Tổng Quan Trạng Thái Tính Năng

| Module / Tính năng | Trạng thái | Đánh giá chi tiết |
| :--- | :---: | :--- |
| **1. Authentication & Authorization** | | |
| • Đăng ký tài khoản (Email / Password) | `DONE` | `POST /api/auth/register`, mã hóa `bcrypt`, kiểm tra trùng email/username, validate form. |
| • Đăng nhập (Email / Username + Password) | `DONE` | `POST /api/auth/login`, xác thực `bcrypt`, cấp phát JWT token (`HS256`), xử lý lỗi 401 rõ ràng. |
| • Google Login (OAuth 2.0) | `DONE` | Google Identity Services + `POST /api/auth/google`, xác thực ID token bằng `google-auth`, tự khởi tạo tài khoản & hồ sơ. |
| • JWT Token Security | `DONE` | Ký bí mật từ biến môi trường `JWT_SECRET_KEY`, kiểm tra thời hạn `exp`, giải mã `user_id`. |
| • Protected Routes & State Management | `DONE` | `AuthContext` lưu `access_token` trong `localStorage`, `ProtectedRoute` bảo vệ toàn bộ route nội bộ. |
| **2. Profile Cá nhân & Cài đặt (`/profile`, `/settings`)** | | |
| • Xem & cập nhật hồ sơ cá nhân | `DONE` | `GET /api/profile/me`, `PUT /api/profile/me`, cập nhật tên hiển thị, bio, độ tuổi, tình trạng hiện tại. |
| • Ảnh đại diện mẫu & tải ảnh từ máy | `DONE` | Hỗ trợ chọn bộ preset hoặc upload ảnh từ máy bằng `FileReader` (kèm xử lý ảnh phía client) trong `Profile.jsx`. |
| • Xem hồ sơ công khai & bài viết cá nhân | `DONE` | `GET /api/users/{id}/public` và `GET /api/profile/{id}` (ẩn `password_hash`/email), hiển thị bài viết đã đăng trên trang Profile. |
| • Trang Cài đặt (`/settings`) | `DONE` | Chia 3 tab: Tài khoản (`username`, `email`, `role`), Quyền riêng tư (xem lại khảo sát), Bảo mật. |
| • Tiện ích đăng xuất an toàn | `DONE` | Xác nhận modal trước khi đăng xuất khỏi phiên hiện tại. |
| **3. Survey Onboarding (Khảo sát Đồng điệu)** | | |
| • Bộ câu hỏi khảo sát đa chiều | `DONE` | Thu thập độ tuổi, tình trạng, hoàn cảnh, cảm xúc gần đây, mục tiêu, kỳ vọng, chủ đề, hoạt động, kiểu kết nối và câu chuyện riêng. |
| • Lưu, cập nhật & đồng bộ sang Profile | `DONE` | `POST /api/survey`, tự động đồng bộ `age_group` và `current_status` sang bảng `profiles`. |
| • Truy vấn khảo sát cá nhân | `DONE` | `GET /api/survey/me`, validate các trường khảo sát. |
| • Banner nhắc khảo sát tại Discover | `DONE` | Tự động phát hiện `has_survey: false` và hiển thị banner CTA điều hướng tới `/survey`. |
| **4. Matching Engine (Thuật toán Ghép đôi)** | | |
| • Text Representation tiếng Việt | `DONE` | Ghép dữ liệu khảo sát và tiểu sử thành chuỗi đặc trưng có tiền tố ngữ nghĩa (`matching_service.py`). |
| • TF-IDF Vectorization | `DONE` | Sử dụng `TfidfVectorizer` của Scikit-learn, xử lý cả trường hợp corpus rỗng an toàn. |
| • Cosine Similarity | `DONE` | Tính góc cosine giữa vector người dùng hiện tại và các ứng viên khác. |
| • Quy đổi điểm & quy tắc cộng thưởng | `DONE` | Quy đổi sang thang phần trăm match và kết hợp quy tắc đồng điệu độ tuổi/hoàn cảnh/tình trạng. |
| • Loại trừ bản thân & người bị chặn | `DONE` | Không gợi ý chính người dùng hiện tại và lọc bỏ quan hệ đã block 2 chiều. |
| • Sở thích chung & Match Reasons | `DONE` | Bóc tách danh sách sở thích chung (`find_common_interests`) và sinh lý do ghép đôi (`generate_match_reasons`). |
| **5. Discover Page (Khám phá Mọi người & Cộng đồng)** | | |
| • Danh sách gợi ý người đồng điệu | `DONE` | Grid thẻ người dùng kèm % Match, trạng thái online, sở thích chung, lý do đồng điệu và bio. |
| • Bộ lọc & tìm kiếm từ khóa | `DONE` | Lọc theo độ tuổi, tình trạng, mục tiêu kết nối và từ khóa (đồng bộ từ thanh tìm kiếm trên `Navbar`). |
| • Kết nối / Chấp nhận kết bạn trực tiếp | `DONE` | Gửi kết nối hoặc chấp nhận lời mời đang chờ ngay trên thẻ người dùng, chuyển nhanh sang Nhắn tin khi đã là bạn. |
| • Modal xem Profile chi tiết, Block & Report | `DONE` | Xem thông tin công khai chi tiết, hỗ trợ phím `Esc`/click nền để đóng, mở modal Chặn / Báo cáo. |
| • Điều hướng thống nhất Mọi người / Cộng đồng | `DONE` | Tab chuyển đổi giữa Mọi người (`/discover`) và Cộng đồng (`/discover?tab=groups` hoặc `/communities`) với thanh điều hướng đồng bộ. |
| **6. Connection System (Hệ thống Kết nối)** | | |
| • Gửi lời mời kết nối | `DONE` | `POST /api/connections/{user_id}`, chặn tự kết nối chính mình và chặn gửi trùng. |
| • Danh sách Bạn bè, Lời mời đến & đã gửi | `DONE` | `GET /api/connections`, `GET /api/connections/requests` hiển thị rõ theo 3 nhóm trên `/connections`. |
| • Chấp nhận kết nối (Accept) | `DONE` | `PUT /api/connections/{id}/accept`, chỉ người nhận mới có quyền duyệt. |
| • Từ chối kết nối (Reject) | `DONE` | `PUT /api/connections/{id}/reject`, chỉ người nhận mới có quyền từ chối. |
| • Quyền bảo mật kết nối | `DONE` | Ngăn người ngoài can thiệp vào lời mời kết nối của người khác (`403 Forbidden`). |
| **7. Community Hub & Group Chat (Cộng đồng & Nhóm chat riêng)** | | |
| • Seed 6 cộng đồng chuẩn ban đầu | `DONE` | `seed_default_communities` trong `community_service.py` tự khởi tạo 6 cộng đồng mặc định kèm nhóm chat & tin nhắn chào mừng. |
| • Tạo cộng đồng mới & chủ đề tùy chỉnh | `DONE` | `POST /api/communities` (`CreateCommunityModal`): hỗ trợ chọn danh mục có sẵn hoặc **Khác (Tự điền chủ đề mới...)**, chọn preset hoặc upload ảnh nhóm từ máy (nén Canvas). |
| • Tự động tạo Nhóm chat riêng cho cộng đồng | `DONE` | Khi tạo cộng đồng mới, backend tạo `Conversation` (`is_group=True`, `community_id`) và thêm người tạo làm admin + thành viên nhóm chat. |
| • Tham gia / Rời cộng đồng đồng bộ chat nhóm | `DONE` | `POST /api/communities/{id}/join` & `/leave` tự động cập nhật cả `CommunityMember` lẫn `ConversationMember`. |
| • Cửa sổ Chat nhóm cộng đồng Realtime | `DONE` | `CommunityChatModal` kết nối WebSocket `/api/ws/chat/{conversation_id}`, đồng thời nhóm chat xuất hiện trong `/messages` với tiền tố `[Nhóm]`. |
| • Lọc Bảng tin theo nhóm & giữ state URL | `DONE` | `GET /api/communities/{id}/posts` & `GET /api/posts` hỗ trợ `community_id`, `joined_only`, `category`; đồng bộ query params URL (`tab`, `group_id`, `filter`, `category`) để reload không mất bộ lọc. |
| **8. Home Feed & Community Moments (Trang chủ & Bảng tin)** | | |
| • Trang chủ cá nhân hóa (`/home`) | `DONE` | Hiển thị thống kê nhanh và bộ lọc bài viết (*Phù hợp với bạn*, *Bạn bè kết nối*, *Cùng tâm trạng & hoàn cảnh*, *Tất cả bài viết*). |
| • Đăng bài viết kèm tâm trạng & tải ảnh từ máy | `DONE` | `POST /api/posts` hỗ trợ chọn `mood`, gắn `community_id` (tự động gắn khi đang xem trong nhóm cụ thể) và tải ảnh từ máy tính hoặc URL (`image_url` max `2_500_000` ký tự). |
| • Hiển thị ảnh đúng tỷ lệ & Lightbox phóng to | `DONE` | Hiển thị ảnh đầy đủ không cắt khung (`object-contain`), bấm vào ảnh để mở modal phóng to xem chi tiết (đóng bằng nút hoặc phím `Esc`). |
| • Thả tim, Bình luận & Chia sẻ liên kết | `DONE` | `POST /api/posts/{id}/like`, `POST /api/posts/{id}/comments`, sao chép link bài viết; giao diện nút tương tác đồng bộ giữa `/home` và `/communities`. |
| • Phân quyền xóa bài viết & bình luận | `DONE` | `DELETE /api/posts/{id}`, `DELETE /api/comments/{comment_id}` theo đúng quyền tác giả / chủ bài / Admin. |
| • Đồng bộ hệ thống biểu tượng & avatar | `DONE` | Chuẩn hóa `Avatar.jsx`, `brandMark` (`lapulga-mark.svg`) và biểu tượng Material Symbols đồng nhất trên các trang. |
| **9. Realtime Chat 1-1 & Nhóm (Tin nhắn Thời gian thực)** | | |
| • Global User WebSocket | `DONE` | `/api/ws/user` (và `/ws/user`) duy trì kết nối xuyên suốt mọi trang, nhận tin nhắn mới & cập nhật `user_status`. |
| • Quản lý hội thoại 1-1 & nhóm | `DONE` | `GET /api/conversations`, `POST /api/conversations/{user_id}` (idempotent 1-1), hỗ trợ cả cuộc hội thoại nhóm cộng đồng (`is_group`). |
| • Lịch sử tin nhắn & lọc hội thoại | `DONE` | `GET /api/conversations/{id}/messages`, tìm kiếm hội thoại và lọc cuộc trò chuyện chưa đọc trên `/messages`. |
| • Room Chat WebSocket & phân quyền phòng | `DONE` | `/api/ws/chat/{conv_id}`, xác thực JWT query param và kiểm tra `ConversationMember` trước khi accept socket. |
| • Nhận / Gửi tin nhắn Realtime | `DONE` | Broadcast qua `ConnectionManager` tới phòng chat và `user_sockets`, lưu bền vững vào DB. |
| • Fallback REST API | `DONE` | `POST /api/conversations/{id}/messages` gửi tin nhắn qua HTTP khi socket gián đoạn và tự broadcast lên phòng chat. |
| • Đánh dấu tin nhắn đã đọc | `DONE` | `PUT /api/messages/{id}/read`, cập nhật `read_at` và giảm `unread_count`. |
| **10. Voice & Video Call 1-1 (Stringee Web SDK)** | | |
| • Tích hợp Stringee Web SDK & Token | `PARTIAL` | `CallContext` & `GET /api/calls/stringee-token` đã triển khai; cần cấu hình đầy đủ `STRINGEE_API_KEY_SID`, `STRINGEE_API_KEY_SECRET` và `STRINGEE_SIGNING_SECRET` trên server thật. |
| • Answer URL Webhook & ICE/TURN | `PARTIAL` | `GET /api/calls/stringee-answer` kiểm tra HMAC-SHA1 `X-STRINGEE-SIGNATURE`, quan hệ hội thoại & block; `GET /api/calls/ice-servers` hỗ trợ STUN/TURN. Cần Project Answer URL hoạt động và kiểm thử live giữa 2 tài khoản/thiết bị thật. |
| • Giao diện Cuộc gọi (`CallModal`) | `DONE` | Dark overlay cho cuộc gọi thoại/video đến & đi, xử lý bận/từ chối/kết thúc. |
| • Đồng hồ đếm thời gian đồng bộ 2 phía | `DONE` | Sửa lỗi người nghe kẹt trạng thái đang kết nối: gọi `markConnected()` chuẩn xác để cả người gọi và người nghe cùng chạy timer thời lượng. |
| • Tỷ lệ camera thật & hướng hiển thị nhất quán | `DONE` | Video hiển thị đúng tỷ lệ camera (`object-fit: contain`), khung PiP local tự co theo hướng dọc/ngang (`getLocalPipSizeStyle`), bỏ lật gương `scaleX(-1)` (`transform: none`) để hình mình thấy khớp y hệt bên kia nhìn thấy. |
| • Âm chuông & điều khiển trong cuộc gọi | `DONE` | Âm báo gọi đi/đến bằng Web Audio API; nút Bật/Tắt Micro, Bật/Tắt Camera và Kết thúc cuộc gọi. |
| • Lưu vết lịch sử & thông báo cuộc gọi nhỡ | `DONE` | `POST /api/calls/{conversation_id}/events` lưu tin nhắn cuộc gọi hoàn tất, nhỡ, bận hoặc từ chối vào đoạn chat kèm thông báo `missed_call`. |
| **11. AI Companion "El Pulga" (Trợ lý Tâm lý Cá nhân hóa)** | | |
| • Widget Chat nổi toàn trang | `DONE` | `ElPulgaChatWidget` hiển thị xuyên suốt ứng dụng (tự ẩn khi chưa đăng nhập hoặc đang mở toàn màn hình trong `/messages?chat=el-pulga`). |
| • Chế độ trò chuyện toàn màn hình | `DONE` | Tích hợp luồng chat với El Pulga ngay trong trang `/messages?chat=el-pulga` để trải nghiệm không gian rộng rãi hơn. |
| • Tích hợp LangChain + Google Gemini API | `DONE` | `ai_service.py` ưu tiên gọi qua `ChatGoogleGenerativeAI` và có cơ chế fallback qua Gemini REST API (`FALLBACK_MODELS`). |
| • System Prompt cá nhân hóa theo người dùng | `DONE` | Đọc `Profile` và `SurveyAnswer` để El Pulga hiểu bối cảnh, cảm xúc và câu chuyện riêng mà không hỏi lại máy móc. |
| • Kho tri thức tâm lý học (`knowledge/`) | `DONE` | Tự động nạp các file `.txt`, `.md` từ `backend/app/knowledge/` (Carl Rogers, Active Listening, ACT) vào ngữ cảnh hệ thống. |
| • Lưu lịch sử DB, Quick Prompts & Xóa lịch sử | `DONE` | `GET /api/ai/history`, `POST /api/ai/chat`, `DELETE /api/ai/history`, `GET /api/ai/quick-prompts` gợi ý câu mở lời theo tâm trạng khảo sát. |
| **12. An toàn & Kiểm duyệt (Block & Report)** | | |
| • Chặn người dùng 2 chiều (Block) | `DONE` | `POST /api/blocks/{user_id}`, ẩn khỏi Discover, chặn kết nối, khóa nhắn tin và vô hiệu hóa cuộc gọi. |
| • Bỏ chặn & xem danh sách đã chặn | `DONE` | `DELETE /api/blocks/{user_id}`, `GET /api/blocks`, chỉ người chủ động chặn mới có quyền bỏ chặn. |
| • Báo cáo vi phạm (Report) | `DONE` | `POST /api/reports` lưu lý do & mô tả chi tiết vào DB để Admin xử lý. |
| **13. Quản trị viên (Admin Dashboard)** | | |
| • Phân quyền Admin (`role == "admin"`) | `DONE` | Dependency `get_current_admin`, bảo vệ toàn diện các route `/api/admin/*`. |
| • Thống kê hệ thống (Stats) | `DONE` | `GET /api/admin/stats`: tổng thành viên, hoạt động, bị khóa và đơn báo cáo chờ duyệt. |
| • Quản lý tài khoản & xem hồ sơ user | `DONE` | `GET /api/admin/users`, `PUT /api/admin/users/{id}/toggle-status`, modal xem chi tiết hồ sơ người dùng (`AdminUserProfileModal`). |
| • Kiểm duyệt đơn vi phạm (Moderation) | `DONE` | `GET /api/admin/reports`, `PUT /api/admin/reports/{id}`: phê duyệt (kèm tùy chọn khóa user) hoặc bác bỏ báo cáo. |
| **14. Notifications & Online Status (Thông báo & Trạng thái)** | | |
| • Notification Engine đa sự kiện | `DONE` | Tạo thông báo cho kết nối mới, chấp nhận kết nối, tin nhắn, cuộc gọi nhỡ, thích bài viết và bình luận. |
| • Notification Bell (Frontend) | `DONE` | Chuông trên `Navbar` hiển thị badge chưa đọc, polling 15 giây (khi tab đang active) và cập nhật theo sự kiện UI. |
| • Hành động đọc & điều hướng thông minh | `DONE` | `PUT /api/notifications/{id}/read`, `read-all`, `conversations/{id}/read`; click vào thông báo điều hướng đúng ngữ cảnh. |
| • Trạng thái Online / `last_seen` | `DONE` | Cập nhật `is_online` và `last_seen` trong DB thông qua `ConnectionManager`. |
| • Sự kiện Realtime `user_status` | `DONE` | Phát sóng trạng thái trực tuyến qua WebSocket tới các phiên đang kết nối. |
| **15. Kiểm thử, Scripts & Triển khai (Testing & Deployment)** | | |
| • Bộ kiểm thử Backend (`backend/tests/`) | `DONE` | Có 9 file kiểm thử `pytest` bao phủ auth/admin, kết nối, chat, cộng đồng, bài viết, thông báo, block/report và WebSocket realtime. |
| • Scripts seed dữ liệu & migrate DB | `DONE` | `backend/seed_data.py`, `backend/seed_demo_content.py`, `migrate_db.py` cùng auto-seed mặc định trong `main.py`. |
| • Triển khai Frontend (Vercel) | `DONE` | Cấu hình SPA rewrite thông qua `vercel.json` và `frontend/vercel.json`. |
| • Triển khai Backend (Render / PostgreSQL) | `DONE` | FastAPI + Uvicorn ASGI, hỗ trợ PostgreSQL (`NullPool` + `pool_pre_ping`), cấu hình CORS cho domain production và `*.vercel.app`. |

---

## 2. Thống Kê Tiến Độ Tổng Hợp

- **Tổng số hạng mục theo dõi**: **78** hạng mục trên **15** phân hệ.
- **Hoàn thành (`DONE`)**: **76 / 78**
- **Hoàn thiện một phần (`PARTIAL`)**: **2 / 78** (Cấu hình Project Stringee Answer URL / credentials môi trường và kiểm thử gọi 2 thiết bị thật).
- **Chưa triển khai (`TODO`)**: **0 / 78**

---

## 3. Ghi Chú Kiến Trúc & Chất Lượng Hệ Thống

- **Kiến trúc phân tầng rõ ràng**: Backend tách biệt `routers/` $\rightarrow$ `services/` $\rightarrow$ `models/` & `schemas/`; Frontend tách `pages/`, `components/`, `contexts/` (`AuthContext`, `CallContext`) và `services/`.
- **Tính năng mở rộng nổi bật so với MVP ban đầu**:
  1. **Hệ thống Cộng đồng đầy đủ**: tạo nhóm mới, chọn chủ đề tùy biến, ảnh đại diện nhóm, nhóm chat riêng tự động đồng bộ thành viên và lọc bảng tin theo từng nhóm.
  2. **Trợ lý AI El Pulga**: kết nối Gemini + LangChain + kho tri thức tâm lý học và cá nhân hóa theo bài khảo sát người dùng.
  3. **Trải nghiệm Media & Video Call**: tải ảnh trực tiếp từ máy tính cho bài viết/avatar, xem ảnh nguyên tỷ lệ kèm Lightbox phóng to, đồng bộ timer & tỷ lệ/hướng camera chuẩn xác trong Video Call.
- **Lưu ý kiểm thử trực tiếp**: Trước khi phát hành bản chính thức, khuyến nghị chạy lại bộ test backend (`cd backend && pytest`), build frontend (`cd frontend && npm run build`) và test thực tế cuộc gọi Stringee giữa 2 trình duyệt/tài khoản trên môi trường có HTTPS và biến môi trường Stringee hợp lệ.
