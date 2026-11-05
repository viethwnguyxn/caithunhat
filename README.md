# Kindred — Community Connection Platform

> **"Find people who understand you."**  
> Nền tảng kết nối cộng đồng thông minh, giúp người dùng tìm thấy những người bạn đồng điệu và sẻ chia dựa trên khảo sát tâm lý, hoàn cảnh sống và sở thích cá nhân. Tích hợp trò chuyện thời gian thực (WebSocket) và gọi thoại / video qua Stringee Call API.

---

## 1. Giới thiệu Dự án (Project Description)

**Kindred** là một ứng dụng web kết nối cộng đồng (Community Connection Platform) được xây dựng theo phong cách: **Ấm áp, Hiện đại, Thân thiện và Tinh giản**.

Thay vì chạy theo các thuật toán câu tương tác gây kiệt quệ tâm lý hay lướt mạng xã hội vô định, Kindred tập trung vào sự đồng cảm sâu sắc:
1. **Khảo sát Đồng điệu (Onboarding Survey)**: Người dùng hoàn thành một bảng khảo sát ngắn gọn gồm 6 nhóm nội dung (nhóm tuổi, hoàn cảnh hiện tại, cảm xúc gần đây, mục tiêu cá nhân, sở thích và câu chuyện tự thuật).
2. **Thuật toán Khớp đôi Thông minh (Matching Engine)**: Sử dụng kỹ thuật xử lý ngôn ngữ tự nhiên truyền thống (**TF-IDF + Cosine Similarity**) để tính toán độ tương đồng giữa các hồ sơ mà không cần đến các mô hình Deep Learning phức tạp.
3. **Kết nối & Trò chuyện Thời gian thực (Realtime Chat & Calling)**: Sau khi tìm thấy người đồng điệu, người dùng có thể gửi kết nối, trò chuyện trực tiếp qua **WebSocket**, và thực hiện cuộc gọi thoại / video 1-1 qua **Stringee Web SDK**.
4. **Bảng tin Cộng đồng (Community Feed & Moments)**: Chia sẻ những khoảnh khắc, tâm sự theo từng chủ đề, thảo luận và tương tác lành mạnh.
5. **Môi trường An toàn & Kiểm duyệt (Safety & Moderation)**: Hỗ trợ tính năng Chặn 2 chiều (Block), Báo cáo vi phạm (Report) và Bảng điều khiển Quản trị viên (Admin Dashboard) để giữ gìn môi trường cộng đồng văn minh.

---

## 2. Tính năng Chính (Key Features)

### 🔐 1. Xác thực & Bảo mật (Authentication & Security)
- Đăng ký và đăng nhập tài khoản bằng Email / Tên người dùng và Mật khẩu (bảo mật bằng thuật toán băm `bcrypt`).
- Đăng nhập một chạm tiện lợi bằng **Google OAuth 2.0** (Google Identity Services).
- Phân quyền người dùng an toàn bằng **JSON Web Token (JWT)** với thuật toán mã hóa `HS256`, kiểm tra thời hạn hết hạn (`exp`) và phân quyền tài nguyên nghiêm ngặt.

### 📝 2. Khảo sát Onboarding & Hồ sơ cá nhân (Survey & Profile)
- 6 nhóm câu hỏi khảo sát ngắn gọn, trực quan (nhóm tuổi, hoàn cảnh sống, cảm xúc, mục tiêu, sở thích, câu chuyện).
- Tự động đồng bộ các thông tin cơ bản sang Hồ sơ cá nhân (Profile).
- **Gợi ý làm khảo sát (Survey CTA Banner)**: Phát hiện người dùng mới chưa làm khảo sát (`has_survey: false`) ngay trên trang Khám phá để kêu gọi hoàn thành khảo sát mở khóa tính năng ghép đôi.
- Xem và chỉnh sửa hồ sơ cá nhân; xem hồ sơ công khai của bạn bè một cách an toàn (tuyệt đối không lộ email hoặc mã băm mật khẩu).

### 🎯 3. Thuật toán Ghép đôi (Matching Engine)
- Kết hợp **TF-IDF Vectorizer** và độ đo góc **Cosine Similarity** từ thư viện `scikit-learn`.
- Biểu diễn văn bản đặc trưng tiếng Việt có tiền tố ngữ nghĩa từ dữ liệu khảo sát và tiểu sử.
- Điểm tương đồng được chuẩn hóa sang thang đo 0–100%, cộng thưởng điểm theo các quy tắc thực tế (cùng lứa tuổi, cùng hoàn cảnh).
- Tự động bóc tách sở thích chung (Common Interests) và chỉ ra các lý do đồng điệu (Match Reasons) để người dùng dễ mở lời làm quen.
- Tự động loại trừ chính bản thân khỏi danh sách gợi ý.

### 🧭 4. Khám phá & Kết nối (Discover & Connections)
- Giao diện thẻ người dùng trực quan hiển thị % Match, lý do đồng điệu, huy hiệu chủ đề và bio tóm tắt.
- Bộ lọc tìm kiếm nhanh theo lứa tuổi, hoàn cảnh và sở thích.
- **Đồng ý kết bạn 1-chạm (Inline Quick Accept)**: Nút **[ 🤝 Đồng ý ]** ngay trên thẻ người dùng tại trang Khám phá, cập nhật trạng thái tức thì sang **[ 💬 Nhắn tin ]** mà không cần rời trang.
- Quản lý 3 danh sách kết nối rõ ràng: Bạn bè của tôi, Lời mời đã nhận, Lời mời đã gửi (hỗ trợ deeplink URL `/connections?tab=received`).

### 💬 5. Nhắn tin Thời gian thực (Realtime 1-1 Chat)
- Xây dựng trên nền tảng **FastAPI WebSocket** thuần kết hợp chuẩn **HTML5 WebSocket API** ở Frontend.
- Xác thực 2 lớp: JWT handshake qua query parameter và kiểm tra quyền thành viên trong cơ sở dữ liệu trước khi chấp thuận kết nối socket (`websocket.accept()`).
- Tự động lưu trữ tin nhắn bền vững vào cơ sở dữ liệu; hỗ trợ fallback REST API nếu kết nối mạng của người dùng không ổn định.
- Tự động đánh dấu tin nhắn đã đọc (`read`) và cập nhật số lượng tin nhắn chưa đọc theo thời gian thực.

### 📞 6. Gọi Thoại & Gọi Video 1-1 (Stringee Call API)
- **Stringee Web SDK**: Quản lý xác thực client, báo hiệu và kết nối media cho cuộc gọi ứng dụng-đến-ứng-dụng.
- **Bảo vệ khóa API**: Backend cấp access token JWT ngắn hạn; API secret và project signing secret chỉ được cấu hình trên backend.
- **Kiểm tra quyền cuộc gọi**: Stringee gọi answer URL có chữ ký; backend chỉ cho phép hai user cùng hội thoại và chưa bị chặn kết nối.
- **Giao diện Cuộc gọi Chuyên nghiệp (CallModal)**:
  - Nền tối (dark overlay) sang trọng, hiển thị video đối phương toàn màn hình và video của mình thu nhỏ ở góc.
  - Chế độ Gọi thoại hiển thị avatar to cùng hiệu ứng sóng âm (Pulse Ripple Effect).
  - Bảng điều khiển nổi: Bật/Tắt Micro, Bật/Tắt Camera, Kết thúc cuộc gọi và Đồng hồ đếm thời gian thực (`00:01`, `00:02`...).
- **Hệ thống Âm thanh Thuần Web Audio API**: Tự động tổng hợp âm thanh tút đổ chuông (ringback tone) và chuông reo cuộc gọi đến bằng dao động sóng âm (OscillatorNode), triệt tiêu hoàn toàn lỗi rò rỉ âm thanh mà không cần dùng file mp3 ngoài.
- **Tự động Ghi vết Lịch sử**: Khi cuộc gọi kết thúc, hệ thống tự động lưu tin nhắn vào đoạn chat: `📞 Cuộc gọi thoại (Thời lượng: 00:26)`, `📹 Cuộc gọi video (Thời lượng: 00:53)` hoặc `📞 Cuộc gọi nhỡ`.
- **Ràng buộc An toàn**: Tự động hủy sau 45 giây đổ chuông nếu đối phương không nghe máy; từ chối cuộc gọi nếu hai người dùng đã chặn nhau.

### 📰 7. Bảng tin Cộng đồng & Khoảnh khắc (Community Feed & Moments)
- Đăng bài viết chia sẻ cảm nghĩ, khoảnh khắc cuộc sống kèm lựa chọn danh mục chủ đề (Công nghệ, Đọc sách, Nghệ thuật, Sinh viên, v.v.).
- Lọc bài viết theo danh mục; xem chi tiết bài viết kèm danh sách bình luận theo luồng thời gian.
- Thả tim (Like) và Bỏ thả tim (Unlike) tức thì kèm thông báo tự động gửi đến tác giả bài viết.
- Phân quyền chặt chẽ: Chỉ tác giả bài viết hoặc Quản trị viên (Admin) mới có quyền xóa bài.

### 🛡️ 8. An toàn & Kiểm duyệt (Safety, Block & Report)
- **Chặn 2 chiều (Block)**: Ẩn hoàn toàn đối phương khỏi trang Khám phá, chặn gửi lời mời kết nối, khóa phòng chat và vô hiệu hóa các nút gọi điện thoại/video.
- **Báo cáo vi phạm (Report)**: Người dùng có thể báo cáo các tài khoản có hành vi không phù hợp (Spam, Quấy rối, Lừa đảo, Khác) kèm mô tả chi tiết gửi lên hệ thống quản trị.

### 👑 9. Bảng điều khiển Quản trị viên (Admin Dashboard)
- Endpoint và giao diện chuyên biệt dành cho tài khoản có quyền Quản trị viên (`role == "admin"`).
- **Thống kê tổng quan (System Stats)**: Tổng số thành viên, số tài khoản đang hoạt động, số tài khoản đang bị khóa, số lượng báo cáo vi phạm đang chờ xử lý.
- **Quản lý người dùng**: Tìm kiếm người dùng, xem trạng thái, Khóa hoặc Mở khóa tài khoản ngay lập tức.
- **Kiểm duyệt báo cáo**: Phê duyệt báo cáo vi phạm (hỗ trợ tùy chọn khóa luôn tài khoản bị tố cáo) hoặc Bác bỏ báo cáo không hợp lệ.

### 🔔 10. Thông báo & Trạng thái Hoạt động (Notifications & Online Status)
- Chuông thông báo trực quan trên thanh điều hướng với badge số lượng chưa đọc, hỗ trợ đánh dấu đọc từng tin hoặc đọc tất cả.
- Tự động kích hoạt thông báo khi: Nhận được lời mời kết bạn, Lời mời được chấp nhận, Có tin nhắn mới, Bài viết được thả tim hoặc có bình luận mới.
- Theo dõi trạng thái Online/Offline và thời gian hoạt động gần nhất (`last_seen`) cập nhật tự động qua WebSocket connection manager.

---

## 3. Kiến trúc Hệ thống (System Architecture)

```mermaid
flowchart TD
    subgraph Clients [Trình duyệt Người dùng]
        ClientA["Client A (React SPA)"]
        ClientB["Client B (React SPA)"]
    end

    subgraph BackendServer [FastAPI Backend Service]
        Router["API Routers (/api/*)"]
        AuthMiddleware["JWT / Security Layer"]
        ServiceLayer["Service Business Logic"]
        WSEndpoint["WebSocket Endpoint (/api/ws/chat/*)"]
        ConnManager["ConnectionManager (Sockets & Status)"]
        MatchingEngine["TF-IDF + Cosine Similarity Engine"]
    end

    subgraph ExternalServices [Hạ tầng Mạng & Hỗ trợ]
        Stringee["Stringee Call API\n(Web SDK / Voice / Video)"]
    end

    subgraph Storage [Cơ sở Dữ liệu]
        DB[("PostgreSQL\n(Supabase Cloud — Production)\nSQLite (Local Dev)")]
    end

    %% REST & WebSocket Communication
    ClientA -->|HTTP / REST Requests| Router
    ClientB -->|HTTP / REST Requests| Router
    ClientA <-->|WebSocket Realtime Chat| WSEndpoint
    ClientB <-->|WebSocket Realtime Chat| WSEndpoint

    %% Stringee call handling
    ClientA <-->|Stringee Web SDK| Stringee
    ClientB <-->|Stringee Web SDK| Stringee
    Stringee -->|Signed answer URL| Router

    %% Backend Internals
    Router --> AuthMiddleware
    AuthMiddleware --> ServiceLayer
    WSEndpoint <--> ConnManager
    ConnManager --> ServiceLayer
    ServiceLayer --> MatchingEngine
    ServiceLayer --> DB
```

---

## 4. Công nghệ Sử dụng (Technology Stack)

| Tầng | Công nghệ | Chi tiết |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | JavaScript thuần (không dùng TypeScript/Next.js/Redux), React Router DOM v6, Context API, Vanilla CSS Design Tokens |
| **Backend** | Python 3.10+, FastAPI | Pydantic v2 (Validation), SQLAlchemy 2.0 ORM, Uvicorn ASGI Server |
| **Khớp đôi / AI** | Scikit-learn | TF-IDF Vectorizer, Cosine Similarity (Tuân thủ nghiêm ngặt: Không dùng Deep Learning/LLM) |
| **Database** | PostgreSQL (Supabase) | Supabase Cloud PostgreSQL cho production; SQLite local cho phát triển. NullPool + pool_pre_ping cho Supabase |
| **Xác thực** | JWT & Google OAuth 2.0 | `PyJWT`, `bcrypt`, Google Identity Services (`@react-oauth/google`) |
| **Realtime Chat** | Native WebSocket | Giao thức WebSocket chuẩn RFC 6455, tự động quản lý trạng thái Online/Offline |
| **Gọi thoại & Video**| Stringee Web SDK | Stringee Call API cho gọi thoại/video, Web Audio synthesizer cho chuông |
| **Triển khai (Deploy)**| Vercel + Render + Supabase | Frontend trên Vercel, Backend API trên Render Web Service, Database trên Supabase |

---

## 5. Cấu trúc Thư mục Dự án (Project Structure)

```
chat/
├── backend/
│   ├── app/
│   │   ├── core/               # Cấu hình hệ thống, JWT, hashing mật khẩu, dependencies
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── dependencies.py
│   │   ├── db/                 # Kết nối SQLAlchemy engine, SessionLocal, Base (NullPool + pool_pre_ping cho Supabase)
│   │   │   └── database.py
│   │   ├── models/             # SQLAlchemy ORM models
│   │   │   ├── user.py         # User, Profile, SurveyAnswer
│   │   │   ├── connection.py   # Connection
│   │   │   ├── chat.py         # Conversation, ConversationMember, Message
│   │   │   ├── post.py         # Post, Comment, Like
│   │   │   ├── report.py       # UserBlock, UserReport
│   │   │   └── notification.py # Notification
│   │   ├── schemas/            # Pydantic Schemas (Request / Response validation)
│   │   │   ├── auth.py, user.py, profile.py, survey.py, matching.py
│   │   │   ├── connection.py, chat.py, post.py, report.py, admin.py
│   │   ├── services/           # Tầng nghiệp vụ (Business Logic Layer)
│   │   │   ├── user_service.py, profile_service.py, survey_service.py
│   │   │   ├── matching_service.py, connection_service.py, chat_service.py
│   │   │   ├── post_service.py, report_service.py, admin_service.py
│   │   ├── routers/            # FastAPI Routers (/api/...)
│   │   │   ├── auth.py, users.py, profile.py, survey.py, matching.py
│   │   │   ├── connections.py, chat.py, posts.py, reports.py, admin.py
│   │   ├── websocket/          # Quản lý kết nối WebSocket chat và trạng thái online
│   │   │   └── manager.py
│   │   └── main.py             # Entrypoint FastAPI, CORS middleware, auto-migration
│   ├── tests/                  # Bộ kiểm thử tự động (Automated Test Suites)
│   │   ├── test_full_suite.py
│   │   ├── test_posts_and_feed.py
│   │   ├── test_block_and_report.py
│   │   ├── test_admin.py
│   │   ├── test_realtime_ws.py
│   │   ├── test_connections.py
│   │   ├── test_chat_flow.py
│   │   └── test_notifications_and_status.py
│   ├── requirements.txt        # Danh sách thư viện Python
│   ├── .env.example            # Mẫu cấu hình môi trường backend
│   └── community.db            # Cơ sở dữ liệu SQLite (chỉ dùng local — production dùng Supabase PostgreSQL)
├── frontend/
│   ├── src/
│   │   ├── components/         # CallModal, Navbar, NotificationBell, ReportModal, BlockConfirmModal
│   │   ├── contexts/           # AuthContext (quản lý token JWT, trạng thái đăng nhập)
│   │   ├── pages/              # Landing, Login, Register, Survey, Home, Discover, Communities
│   │   │                       # Connections, Messages, Profile, AdminDashboard
│   │   ├── services/           # Axios HTTP client & API service modules
│   │   ├── App.jsx             # Định tuyến React Router DOM
│   │   ├── main.jsx            # Entry point ReactDOM
│   │   └── index.css           # Global CSS variables, animations, theme tokens
│   ├── package.json            # Cấu hình dependencies Frontend
│   └── vite.config.js          # Cấu hình Vite build tool
├── vercel.json                 # Cấu hình định tuyến SPA cho Vercel Deployment
├── AI_RULES.md                 # Quy tắc phát triển và chuẩn mực kỹ thuật
├── MVP_STATUS.md               # Báo cáo chi tiết trạng thái tính năng MVP
└── README.md                   # Tài liệu hướng dẫn sử dụng và giới thiệu dự án
```

---

## 6. Hướng dẫn Cài đặt & Khởi chạy (Installation & Setup)

### 6.1 Yêu cầu Môi trường
- **Python**: Phiên bản 3.10 trở lên.
- **Node.js**: Phiên bản 18 trở lên (kèm `npm`).
- Trình duyệt hiện đại hỗ trợ WebRTC, HTML5 WebSocket và quyền truy cập Micro / Camera (Google Chrome, Microsoft Edge, Firefox, Safari).

### 6.2 Cài đặt & Khởi động Backend
```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Khởi tạo môi trường ảo Python (Virtual Environment)
python -m venv venv

# 3. Kích hoạt môi trường ảo:
# Trên Windows:
venv\Scripts\activate
# Trên macOS / Linux:
source venv/bin/activate

# 4. Cài đặt các thư viện phụ thuộc
pip install -r requirements.txt

# 5. Tạo file cấu hình môi trường từ mẫu .env.example
copy .env.example .env   # Trên Windows
# cp .env.example .env   # Trên macOS / Linux

# 6. Khởi chạy máy chủ FastAPI (Uvicorn)
uvicorn app.main:app --reload --port 8000
```
- Máy chủ Backend sẽ hoạt động tại: `http://localhost:8000`
- Tài liệu API tương tác trực quan (Swagger UI): `http://localhost:8000/docs`

### 6.3 Cấu hình Biến môi trường (`backend/.env`)
```env
# Local Development (SQLite)
DATABASE_URL=sqlite:///./community.db

# Production (Supabase PostgreSQL) — chỉ set trên Render, không commit vào git
# DATABASE_URL=postgresql://user:password@host:5432/dbname

JWT_SECRET_KEY=your_secure_random_secret_key_here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
CORS_ORIGINS=https://your-app.vercel.app
```

### 6.4 Cài đặt & Khởi động Frontend
```bash
# 1. Di chuyển vào thư mục frontend (mở cửa sổ terminal mới)
cd frontend

# 2. Cài đặt các thư viện Node.js
npm install

# 3. Khởi chạy máy chủ phát triển Vite
npm run dev
```
- Giao diện người dùng sẽ sẵn sàng tại: `http://localhost:5173`

---

## 7. Tài liệu API Endpoints (API Documentation)

### 🔑 Xác thực & Người dùng (Auth & Users)
| Method | Endpoint | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Đăng ký tài khoản người dùng mới | Public |
| `POST` | `/api/auth/login` | Đăng nhập bằng Email/Username + Mật khẩu | Public |
| `POST` | `/api/auth/google` | Đăng nhập một chạm bằng Google ID Token | Public |
| `GET` | `/api/users/me` | Lấy thông tin tài khoản hiện tại | Bearer JWT |
| `GET` | `/api/users/{id}/public` | Lấy thông tin hồ sơ công khai của người dùng (Hỗ trợ cả `/api/profile/{id}`) | Bearer JWT |

### 📋 Khảo sát & Hồ sơ (Survey & Profile)
| Method | Endpoint | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/profile/me` | Xem thông tin hồ sơ cá nhân | Bearer JWT |
| `PUT` | `/api/profile/me` | Cập nhật hồ sơ cá nhân | Bearer JWT |
| `POST` | `/api/survey` | Gửi câu trả lời khảo sát Onboarding | Bearer JWT |
| `GET` | `/api/survey/me` | Xem lại kết quả khảo sát cá nhân | Bearer JWT |

### 🎯 Khớp đôi & Kết nối (Matching & Connections)
| Method | Endpoint | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/matches` | Gợi ý danh sách người đồng điệu (TF-IDF + Cosine) | Bearer JWT |
| `GET` | `/api/connections` | Lấy danh sách bạn bè đã kết nối | Bearer JWT |
| `GET` | `/api/connections/requests`| Lấy danh sách lời mời đã gửi và đã nhận | Bearer JWT |
| `POST` | `/api/connections/{user_id}` | Gửi lời mời kết nối tới một người dùng | Bearer JWT |
| `PUT` | `/api/connections/{id}/accept` | Chấp nhận lời mời kết nối | Bearer JWT |
| `PUT` | `/api/connections/{id}/reject` | Từ chối lời mời kết nối | Bearer JWT |

### 💬 Trò chuyện & Gọi điện (Chat & Stringee Calling)
| Method / Giao thức | Endpoint / Event | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/conversations` | Lấy danh sách các cuộc trò chuyện | Bearer JWT |
| `POST` | `/api/conversations/{user_id}` | Khởi tạo hoặc lấy phòng chat 1-1 với user | Bearer JWT |
| `GET` | `/api/conversations/{id}/messages`| Lấy lịch sử tin nhắn trong cuộc trò chuyện | Bearer JWT |
| `POST` | `/api/conversations/{id}/messages`| Gửi tin nhắn qua REST API (Fallback) | Bearer JWT |
| `PUT` | `/api/messages/{id}/read` | Đánh dấu tin nhắn đã đọc | Bearer JWT |
| `WS` | `/api/ws/chat/{conv_id}?token=...`| Kết nối WebSocket truyền tin nhắn realtime | Query Token |
| `GET` | `/api/calls/stringee-token` | Cấp access token Stringee ngắn hạn cho user hiện tại | ****** |
| `GET` | `/api/calls/stringee-answer` | Answer URL xác thực chữ ký và quyền gọi từ Stringee | Chữ ký Stringee |
| `POST` | `/api/calls/{conv_id}/events` | Lưu kết quả gọi vào lịch sử hội thoại | ****** |

### 📰 Bảng tin & Khoảnh khắc Cộng đồng (Community Feed)
| Method | Endpoint | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/posts` | Đăng bài viết / khoảnh khắc mới | Bearer JWT |
| `GET` | `/api/posts` | Lấy danh sách bài viết (hỗ trợ lọc theo `category`) | Bearer JWT |
| `GET` | `/api/posts/{id}` | Xem chi tiết bài viết kèm danh sách bình luận | Bearer JWT |
| `DELETE` | `/api/posts/{id}` | Xóa bài viết (Chỉ tác giả hoặc Admin) | Bearer JWT |
| `POST` | `/api/posts/{id}/like` | Thả tim hoặc Hủy thả tim bài viết | Bearer JWT |
| `POST` | `/api/posts/{id}/comments` | Thêm bình luận mới vào bài viết | Bearer JWT |
| `GET` | `/api/posts/{id}/comments` | Lấy danh sách bình luận của bài viết | Bearer JWT |

### 🛡️ An toàn, Chặn & Báo cáo (Block & Report)
| Method | Endpoint | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/reports` | Gửi báo cáo vi phạm người dùng | Bearer JWT |
| `POST` | `/api/blocks/{user_id}` | Chặn người dùng 2 chiều | Bearer JWT |
| `DELETE` | `/api/blocks/{user_id}` | Bỏ chặn người dùng | Bearer JWT |
| `GET` | `/api/blocks` | Lấy danh sách những người dùng đã chặn | Bearer JWT |

### 👑 Quản trị viên (Admin Dashboard)
| Method | Endpoint | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/stats` | Thống kê số liệu hệ thống (User, Khóa, Đơn chờ) | Admin Role |
| `GET` | `/api/admin/users` | Danh sách tài khoản người dùng và bộ lọc | Admin Role |
| `PUT` | `/api/admin/users/{id}/toggle-status` | Khóa hoặc Mở khóa tài khoản người dùng | Admin Role |
| `GET` | `/api/admin/reports` | Danh sách báo cáo vi phạm chờ kiểm duyệt | Admin Role |
| `PUT` | `/api/admin/reports/{id}` | Phê duyệt (kèm tùy chọn khóa user) hoặc Bác bỏ báo cáo | Admin Role |

### 🔔 Thông báo (Notifications)
| Method | Endpoint | Mô tả | Yêu cầu Auth |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications` | Lấy danh sách thông báo và số lượng chưa đọc | Bearer JWT |
| `PUT` | `/api/notifications/{id}/read` | Đánh dấu 1 thông báo là đã đọc | Bearer JWT |
| `PUT` | `/api/notifications/read-all` | Đánh dấu tất cả thông báo là đã đọc | Bearer JWT |

---

## 8. Chi tiết Thuật toán Ghép đôi (Matching Engine)

Thuật toán ghép đôi được xây dựng tại `backend/app/services/matching_service.py` dựa trên nguyên lý xử lý ngôn ngữ tự nhiên:
1. **Biểu diễn văn bản (Text Representation)**:
   Ghép nối các dữ liệu trả lời khảo sát và tiểu sử của người dùng thành một chuỗi văn bản thuần túy có tiền tố định danh ngữ nghĩa:
   ```python
   text = f"tuổi_{age} hoàn_cảnh_{status} cảm_xúc_{feeling} mục_tiêu_{goal} chủ_đề_{topics} hoạt_động_{activities} {bio} {story}"
   ```
2. **Vector hóa TF-IDF (Term Frequency - Inverse Document Frequency)**:
   Sử dụng `TfidfVectorizer` từ thư viện `scikit-learn` để chuyển đổi chuỗi văn bản của tất cả người dùng thành ma trận vector đặc trưng số học:
   $$\text{TF-IDF}(t, d, D) = \text{TF}(t, d) \times \log\left(\frac{1 + |D|}{1 + |\{d \in D : t \in d\}|}\right) + 1$$
   Các từ khóa độc đáo của người dùng sẽ nhận trọng số cao hơn, trong khi các từ phổ biến sẽ được giảm trọng số tương ứng.
3. **Độ đo tương đồng Cosine (Cosine Similarity)**:
   Tính góc giữa vector của người dùng đang đăng nhập ($\mathbf{u}$) và vector của từng người dùng khác ($\mathbf{v}$):
   $$\text{Cosine Similarity}(\mathbf{u}, \mathbf{v}) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$$
4. **Điểm số & Lý do Tương đồng (Score & Explanations)**:
   - Điểm số Cosine được chuyển đổi về thang điểm 0–100%.
   - Cộng thưởng điểm theo quy tắc (Rule-based Bonus): Cùng nhóm tuổi, Cùng hoàn cảnh sống.
   - Tự động bóc tách các sở thích chung và tạo các thông điệp giải thích lý do tương đồng hiển thị sinh động trên thẻ người dùng.

---

## 9. Kiểm thử Tự động (Automated Testing & QA)

Dự án có đầy đủ các bộ test tự động kiểm chứng 100% logic nghiệp vụ backend và khả năng đóng gói frontend.

### 9.1 Chạy Kiểm thử Backend
Tại thư mục `backend`, chạy các lệnh sau:
```bash
# 1. Chạy toàn bộ test suite cốt lõi (Auth, Profile, Survey, Matching, Connections, Chat)
venv\Scripts\python.exe tests\test_full_suite.py

# 2. Kiểm thử Bảng tin cộng đồng, Thả tim, Bình luận và Phân quyền xóa bài
venv\Scripts\python.exe tests\test_posts_and_feed.py

# 3. Kiểm thử Chặn 2 chiều (Block) và Báo cáo vi phạm (Report)
venv\Scripts\python.exe tests\test_block_and_report.py

# 4. Kiểm thử Bảng điều khiển Quản trị viên (Admin Dashboard & Permissions)
venv\Scripts\python.exe tests\test_admin.py

# 5. Kiểm thử WebSocket Chat Realtime độc lập
venv\Scripts\python.exe tests\test_realtime_ws.py

# 6. Kiểm thử Thông báo & Cập nhật Trạng thái Online / Offline
venv\Scripts\python.exe tests\test_notifications_and_status.py
```
> Tất cả các bộ kiểm thử đều vượt qua **100% PASSED** mà không gặp bất kỳ lỗi nào.

### 9.2 Kiểm thử Đóng gói Frontend
Tại thư mục `frontend`:
```bash
npm run build
```
> Kết quả: Đóng gói thành công vào thư mục `frontend/dist/` sạch sẽ, tối ưu hóa kích thước bundle và sẵn sàng deploy.

---

## 10. Hướng dẫn Triển khai Sản phẩm (Production Deployment)

Hệ sinh thái Kindred được triển khai thực tế trên 3 nền tảng Cloud:

| Thành phần | Nền tảng | Ghi chú |
| :--- | :--- | :--- |
| **Frontend** | [Vercel](https://vercel.com) | CI/CD tự động deploy mỗi khi push lên `main`, cấu hình SPA rewrite qua `vercel.json` |
| **Backend API** | [Render](https://render.com) | Python 3.10+, hỗ trợ WebSocket, cấp token và Stringee answer URL |
| **Database** | [Supabase](https://supabase.com) | PostgreSQL cloud, kết nối qua `DATABASE_URL`, NullPool + pool_pre_ping |

### 10.1 Biến môi trường cần set trên Render

| Biến | Mô tả |
| :--- | :--- |
| `DATABASE_URL` | Connection string Supabase (`postgresql://...`) |
| `JWT_SECRET_KEY` | Chuỗi ngẫu nhiên bảo mật, tối thiểu 32 ký tự |
| `JWT_ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` |
| `GOOGLE_CLIENT_ID` | OAuth Client ID từ Google Cloud Console |
| `CORS_ORIGINS` | Domain Vercel của frontend (vd: `https://caithunhat.vercel.app`) |
| `STRINGEE_API_KEY_SID` | API Key SID từ Stringee Dashboard |
| `STRINGEE_API_KEY_SECRET` | API Key Secret; chỉ lưu ở backend |
| `STRINGEE_SIGNING_SECRET` | Project signing secret để xác thực callback answer URL |
| `STRINGEE_ACCESS_TOKEN_TTL_SECONDS` | Thời hạn access token Stringee (mặc định `3600`, tối đa `86400`) |

### 10.1.1 Thiết lập Stringee

1. Tạo tài khoản và project trên [Stringee Developer](https://developer.stringee.com/account/register); gọi app-to-app không cần mua số điện thoại.
2. Lấy API Key SID, API Key Secret và Project Signing Secret từ project; cấu hình ba biến `STRINGEE_*` tương ứng trên backend. Không đặt secret trong biến `VITE_*` và không gửi secret qua chat.
3. Đặt Project Answer URL thành `https://<backend-domain>/api/calls/stringee-answer` (HTTPS bắt buộc ở production).
4. Sao chép `backend/.env.example` thành `backend/.env` khi chạy local và điền các giá trị Stringee; trên Render, đặt các giá trị tương tự trong Environment.
5. Chạy ứng dụng với hai tài khoản đã đăng nhập và có hội thoại; cấp quyền micro/camera khi trình duyệt hỏi.

### 10.2 Start Command trên Render

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

> **Lưu ý:** Giữ **1 instance** trên Render (mặc định free tier) để WebSocket ConnectionManager hoạt động đúng. WebSocket state được lưu trong bộ nhớ — nếu scale nhiều instance sẽ cần Redis.

---

## 11. Hướng dẫn Test Tính Năng Gọi Thoại / Video (Stringee)

Để kiểm tra cuộc gọi Stringee giữa hai tài khoản:
1. Mở trình duyệt thường (ví dụ: Google Chrome) đăng nhập tài khoản A.
2. Mở một cửa sổ ẩn danh (Incognito) đăng nhập tài khoản B.
3. Đảm bảo tài khoản A và B đã kết bạn với nhau và mở khung chat của nhau tại `/messages`.
4. Trên tài khoản A, bấm vào nút 📹 **Gọi Video** hoặc 📞 **Gọi thoại** ở góc trên bên phải khung chat.
5. Tài khoản B sẽ nghe thấy tiếng chuông reo và xuất hiện popup Cuộc gọi đến kèm avatar rung nhẹ.
6. Bấm nút 🟢 **Chấp nhận** trên tài khoản B:
   - Trình duyệt yêu cầu quyền truy cập Micro / Camera → Bấm **Allow**.
   - Màn hình cuộc gọi xuất hiện; đồng hồ bắt đầu chạy khi media kết nối.
   - Thử nghiệm bấm nút **Tắt Micro** hoặc **Tắt Camera** để kiểm tra phản hồi.
7. Bấm nút 🔴 **Kết thúc cuộc gọi**:
   - Màn hình cuộc gọi đóng lại.
   - Trong khung chat của cả 2 tài khoản xuất hiện lịch sử cuộc gọi.
