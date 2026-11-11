# La Pulga — Nền tảng Kết nối Cộng đồng & Đồng hành Cảm xúc

> **Kết nối từ sự đồng điệu.**  
> *Kết nối thật. Khoảnh khắc thật.*

**La Pulga** là ứng dụng web Full-Stack giúp những người có cùng hoàn cảnh, sở thích và tâm trạng tìm thấy nhau thông qua khảo sát onboarding, thuật toán gợi ý **TF-IDF + Cosine Similarity**, hệ thống **Cộng đồng & Nhóm chat riêng**, **Bảng tin khoảnh khắc**, **Nhắn tin & Gọi thoại/Video 1-1 realtime**, cùng **Trợ lý tâm lý AI "El Pulga"**.

---

## 1. Tính năng chính

- **Xác thực & Tài khoản**
  - Đăng ký, đăng nhập bằng Email/Username + mật khẩu (`bcrypt` + JWT `HS256`).
  - Đăng nhập nhanh bằng **Google OAuth 2.0** (Google Identity Services).
  - Tự động khởi tạo hồ sơ cá nhân (`Profile`), bảo vệ route qua `ProtectedRoute` & `AuthContext`.
- **Khảo sát Đồng điệu (Onboarding Survey)**
  - Thu thập đa chiều thông tin: độ tuổi, tình trạng hiện tại, hoàn cảnh sống, cảm xúc gần đây, mục tiêu, kỳ vọng cộng đồng, chủ đề yêu thích, hoạt động rảnh rỗi, hình thức kết nối mong muốn và câu chuyện cá nhân.
  - Tự động đồng bộ nhóm tuổi và tình trạng hiện tại sang `Profile`, gợi ý hoàn thành khảo sát tại trang Khám phá nếu chưa thực hiện.
- **Thuật toán Ghép đôi & Khám phá (`/discover`)**
  - Biểu diễn hồ sơ khảo sát & tiểu sử thành văn bản có tiền tố ngữ nghĩa tiếng Việt, tính độ tương đồng bằng **Scikit-learn TF-IDF + Cosine Similarity** kết hợp thưởng theo quy tắc thực tế.
  - Hiển thị phần trăm đồng điệu, sở thích chung, lý do ghép đôi; hỗ trợ tìm kiếm từ khóa và lọc theo độ tuổi, tình trạng, mục tiêu kết nối.
  - Kết nối nhanh trực tiếp trên thẻ người dùng, xem hồ sơ công khai, chặn 2 chiều hoặc báo cáo vi phạm.
- **Cộng đồng & Nhóm chat riêng (`/communities` & `/discover?tab=groups`)**
  - Tự động khởi tạo 6 cộng đồng mặc định ban đầu kèm nhóm chat chào mừng.
  - Cho phép người dùng **Tạo cộng đồng mới** với tên, mô tả, chọn chủ đề có sẵn hoặc **tự nhập chủ đề mới**, chọn/tải ảnh đại diện nhóm (có nén ảnh phía trình duyệt) và gắn tags.
  - Mỗi cộng đồng có **Nhóm chat riêng (`Group Conversation`)**: khi tạo hoặc tham gia/rời cộng đồng, hệ thống tự động đồng bộ thành viên vào nhóm chat.
  - Giao diện chat nhóm realtime (`CommunityChatModal`), xem danh sách bài viết theo nhóm, lọc bài theo *Tất cả / Nhóm của tôi / từng nhóm / chủ đề* và giữ nguyên trạng thái bộ lọc qua URL query params.
- **Bảng tin Trang chủ & Khoảnh khắc (`/home`)**
  - Bảng tin cá nhân hóa theo bạn bè kết nối và sự tương đồng khảo sát (*Phù hợp với bạn*, *Bạn bè kết nối*, *Cùng tâm trạng & hoàn cảnh*, *Tất cả bài viết*).
  - Đăng bài viết kèm tâm trạng (`mood`), gắn cộng đồng/chủ đề và ảnh minh họa (URL hoặc tải ảnh trực tiếp từ máy tính).
  - Hiển thị ảnh đúng tỷ lệ gốc (`object-contain`), hỗ trợ click mở **Lightbox phóng to ảnh**; tương tác Thả tim, Bình luận, Sao chép liên kết chia sẻ và Xóa bài viết/bình luận theo quyền tác giả hoặc Admin.
- **Nhắn tin Realtime 1-1 & Nhóm (`/messages`)**
  - Kết nối WebSocket toàn cục (`/api/ws/user`) duy trì trạng thái trực tuyến và nhận sự kiện tức thì ở mọi trang.
  - Phòng chat realtime (`/api/ws/chat/{conversation_id}`) hỗ trợ cả chat 1-1 và nhóm chat cộng đồng (`[Nhóm]`), kèm REST API fallback khi mất kết nối socket, lọc tin nhắn chưa đọc, đánh dấu đã đọc và theo dõi trạng thái `is_online` / `last_seen`.
- **Gọi Thoại & Video Call 1-1 (Stringee Web SDK)**
  - Tích hợp **Stringee Web SDK** (`CallContext` & `CallModal`) với token xác thực ngắn hạn (`GET /api/calls/stringee-token`), Answer URL webhook ký HMAC-SHA1 (`GET /api/calls/stringee-answer`) và cấu hình STUN/TURN ICE (`GET /api/calls/ice-servers`).
  - Hỗ trợ đồng bộ đồng hồ thời gian cuộc gọi ở cả người gọi và người nghe, âm chuông Web Audio API, bật/tắt Mic & Camera, hiển thị video đúng tỷ lệ khung hình thật của camera (không bị cắt hay lật gương giữa 2 phía), tự động lưu lịch sử cuộc gọi và thông báo cuộc gọi nhỡ vào đoạn chat.
- **Trợ lý Tâm lý AI "El Pulga" (`ElPulgaChatWidget` & `/messages?chat=el-pulga`)**
  - Người bạn đồng hành tâm lý sử dụng **LangChain (`langchain-google-genai`)** và **Google Gemini API** (có danh sách model fallback), cá nhân hóa System Prompt theo `Profile` & `SurveyAnswer` của từng người dùng.
  - Hỗ trợ nạp tài liệu tham khảo từ kho tri thức tâm lý `backend/app/knowledge/` (Liệu pháp Nhân văn Carl Rogers, Lắng nghe Tích cực, ACT).
  - Lưu trữ lịch sử trò chuyện bền vững trong DB, gợi ý câu mở lời theo cảm xúc (`quick-prompts`), dùng được cả ở widget nổi góc màn hình lẫn chế độ toàn màn hình trong `/messages`.
- **Hồ sơ, Cài đặt, Thông báo, An toàn & Quản trị**
  - Trang Hồ sơ cá nhân (`/profile`) hỗ trợ chọn/upload ảnh đại diện từ máy tính, xem lại khảo sát và bài viết đã đăng; trang Cài đặt (`/settings`) quản lý tài khoản, quyền riêng tư và đăng xuất.
  - Chuông thông báo (`NotificationBell`) với polling & sự kiện cập nhật tức thì; hệ thống chặn 2 chiều (`Block`) và báo cáo vi phạm (`Report`).
  - Trang Quản trị (`/admin`): thống kê hệ thống, tìm kiếm/lọc/khóa/mở khóa tài khoản người dùng và xử lý báo cáo vi phạm.

---

## 2. Công nghệ sử dụng (Tech Stack)

### Frontend (`frontend/`)
- **Core:** React 18 (`react`, `react-dom`), Vite 5, JavaScript (JSX)
- **Routing & HTTP:** `react-router-dom` v6, `axios`
- **Styling:** Tailwind CSS 3, PostCSS, custom CSS (`frontend/src/styles/lapulga.css`)
- **Realtime & Calling:** Native Browser WebSocket API, `stringee` (`^2.9.3`), Web Audio API
- **Auth:** Google Identity Services SDK

### Backend (`backend/`)
- **Framework:** Python, FastAPI (`0.115.0`), Uvicorn (`uvicorn[standard]`)
- **ORM & Validation:** SQLAlchemy `2.0.36`, Pydantic
- **Database:** SQLite mặc định (`sqlite:///./community.db`) hoặc PostgreSQL (Supabase / Render qua `psycopg2-binary`)
- **Security & Auth:** `pyjwt`, `bcrypt`, `google-auth`, `python-dotenv`
- **Matching & AI:** `scikit-learn` (`TfidfVectorizer`, `cosine_similarity`), `langchain`, `langchain-google-genai`, Google Gemini REST API

---

## 3. Cấu trúc thư mục

```text
.
├── backend/
│   ├── app/
│   │   ├── core/            # Cấu hình biến môi trường (config.py) & bảo mật JWT/bcrypt (security.py)
│   │   ├── db/              # Kết nối SQLAlchemy & session (database.py)
│   │   ├── knowledge/       # Tài liệu tâm lý học (.txt/.md) nạp cho AI El Pulga
│   │   ├── models/          # SQLAlchemy ORM models (User, Profile, SurveyAnswer, Community, Post, Chat, AIChatMessage...)
│   │   ├── routers/         # FastAPI endpoints & WebSocket endpoints (/api/*)
│   │   ├── schemas/         # Pydantic schemas validate request/response
│   │   ├── services/        # Business logic (matching, community, post, chat, ai, admin...)
│   │   ├── websocket/       # ConnectionManager quản lý phòng chat & user sockets
│   │   └── main.py          # Khởi tạo app, auto-migration nhẹ, CORS, auto-seed admin & 6 cộng đồng
│   ├── tests/               # Bộ kiểm thử pytest (9 file test)
│   ├── .env.example         # Mẫu biến môi trường backend
│   ├── requirements.txt     # Danh sách thư viện Python
│   ├── seed_data.py         # Script nạp dữ liệu mẫu (local SQLite hoặc PostgreSQL)
│   └── seed_demo_content.py # Script nạp tài khoản & bài viết demo
├── frontend/
│   ├── src/
│   │   ├── assets/          # Logo SVG & ảnh nền
│   │   ├── components/      # Navbar, CallModal, CommunityHubContent, CommunityChatModal, CreateCommunityModal, ElPulgaChatWidget...
│   │   ├── contexts/        # AuthContext, CallContext
│   │   ├── data/            # Danh mục cộng đồng & avatar mặc định
│   │   ├── pages/           # Landing, Login, Register, Home, Discover, Communities, Connections, Messages, Profile, Survey, Settings, AdminDashboard
│   │   ├── services/        # Axios API clients theo từng domain
│   │   ├── styles/          # lapulga.css
│   │   └── App.jsx          # Định tuyến & Providers
│   ├── .env.example         # Mẫu biến môi trường frontend
│   ├── index.html
│   ├── package.json
│   ├── vercel.json          # Cấu hình SPA rewrite trên Vercel
│   └── vite.config.js
├── GOOGLE_OAUTH_GUIDE.md    # Hướng dẫn tạo Google Client ID
├── MVP_STATUS.md            # Báo cáo trạng thái các module & tính năng
├── migrate_db.py            # Script sao chép dữ liệu giữa 2 PostgreSQL DB
└── vercel.json              # Cấu hình SPA rewrite cấp root
```

---

## 4. Cài đặt & chạy cục bộ (Local Development)

### Yêu cầu môi trường
- **Python 3.11+** (xem `.python-version` / `backend/.python-version`)
- **Node.js 18+** và `npm`

### Bước 1: Khởi chạy Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Tạo file `backend/.env` từ `backend/.env.example` và điền các giá trị phù hợp:

```env
# Để trống hoặc dùng SQLite cục bộ nếu chạy local nhanh: sqlite:///./community.db
DATABASE_URL=sqlite:///./community.db

JWT_SECRET_KEY=your_jwt_secret_key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Google OAuth (tùy chọn, xem GOOGLE_OAUTH_GUIDE.md)
GOOGLE_CLIENT_ID=your_google_client_id

# Tài khoản Admin mặc định tự tạo khi server khởi động
ADMIN_EMAIL=admin@la-pulga.local
ADMIN_DEFAULT_PASSWORD=@Abc1234

# CORS bổ sung (nếu cần ngoài localhost và *.vercel.app)
CORS_ORIGINS=http://localhost:5173

# Stringee Calling (cần thiết để bật gọi thoại/video qua Stringee)
STRINGEE_API_KEY_SID=your_stringee_api_key_sid
STRINGEE_API_KEY_SECRET=your_stringee_api_key_secret
STRINGEE_SIGNING_SECRET=your_stringee_project_signing_secret
STRINGEE_ACCESS_TOKEN_TTL_SECONDS=3600

# TURN Server (tùy chọn cho WebRTC)
# TURN_SERVER_URLS=turn:your-turn-server:3478
# TURN_SHARED_SECRET=your_turn_secret
# TURN_CREDENTIAL_TTL_SECONDS=3600

# Trợ lý AI El Pulga (Google Gemini)
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-flash-lite-latest
```

Chạy server FastAPI (cổng `8000`):

```powershell
uvicorn app.main:app --reload --port 8000
```

- Khi khởi động, `backend/app/main.py` sẽ tự động tạo bảng (`Base.metadata.create_all`), chạy các hàm kiểm tra/bổ sung cột tương thích schema, khởi tạo tài khoản Admin (từ `ADMIN_EMAIL` / `ADMIN_DEFAULT_PASSWORD`, mặc định fallback trong code là `admin@kindred.local` / `admin123` nếu không set env) và seed **6 cộng đồng chuẩn ban đầu** kèm nhóm chat riêng.
- Tài liệu API tương tác mặc định tại: `http://localhost:8000/docs`

### Bước 2: Khởi chạy Frontend

```powershell
cd frontend
npm install
```

Tạo `frontend/.env` từ `frontend/.env.example`:

```env
VITE_API_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_google_client_id_here.apps.googleusercontent.com
```

Chạy Vite dev server (cổng `5173`):

```powershell
npm run dev
```

Truy cập ứng dụng tại `http://localhost:5173`. Xem thêm hướng dẫn cấu hình đăng nhập Google tại [GOOGLE_OAUTH_GUIDE.md](GOOGLE_OAUTH_GUIDE.md).

---

## 5. Scripts dữ liệu, Kiểm thử & Build

### Nạp dữ liệu mẫu & Di chuyển Database
- Nạp người dùng mẫu vào Local SQLite:
  ```powershell
  python backend/seed_data.py --local
  ```
- Hoặc nạp vào `DATABASE_URL` (PostgreSQL/Supabase):
  ```powershell
  python backend/seed_data.py --supabase
  python backend/seed_demo_content.py
  ```
- Sao chép dữ liệu giữa 2 database PostgreSQL:
  ```powershell
  python migrate_db.py "URL_DATABASE_CU" "URL_DATABASE_MOI"
  ```

### Kiểm thử Backend & Build Frontend
- Chạy test backend (gồm 9 bộ test trong `backend/tests/`: `test_admin.py`, `test_block_and_report.py`, `test_chat_flow.py`, `test_community_feature.py`, `test_connections.py`, `test_full_suite.py`, `test_notifications_and_status.py`, `test_posts_and_feed.py`, `test_realtime_ws.py`):
  ```powershell
  cd backend
  pytest
  ```
- Build production frontend:
  ```powershell
  cd frontend
  npm run build
  ```

---

## 6. Tóm tắt API Endpoints chính

| Nhóm API | Prefix / Endpoints tiêu biểu | Mô tả |
| :--- | :--- | :--- |
| **Health** | `GET /api/health`, `GET /api/db-check` | Kiểm tra server & kết nối DB |
| **Auth** | `POST /api/auth/register`, `/login`, `/google` | Đăng ký, đăng nhập & Google OAuth |
| **Users & Profile** | `GET /api/users/me`, `GET/PUT /api/profile/me`, `GET /api/users/{id}/public`, `GET /api/profile/{id}` | Hồ sơ cá nhân & hồ sơ công khai |
| **Survey** | `POST /api/survey`, `GET /api/survey/me` | Lưu & xem lại khảo sát onboarding |
| **Matching** | `GET /api/matches` | Gợi ý người đồng điệu (TF-IDF + Cosine Similarity) |
| **Connections** | `POST /api/connections/{user_id}`, `GET /api/connections`, `/requests`, `PUT .../accept`, `.../reject` | Kết bạn & quản lý lời mời |
| **Communities** | `GET/POST /api/communities`, `GET /api/communities/{id}`, `POST .../join`, `.../leave`, `GET .../posts` | Quản lý cộng đồng & nhóm chat riêng |
| **Posts (Feed)** | `GET/POST /api/posts`, `GET/DELETE /api/posts/{id}`, `POST .../like`, `GET/POST .../comments`, `DELETE /api/comments/{id}` | Bảng tin, lọc nhóm/chủ đề, like & bình luận |
| **Chat & WebSocket** | `GET /api/conversations`, `POST /api/conversations/{user_id}`, `GET/POST .../messages`, `PUT /api/messages/{id}/read`, `WS /api/ws/user`, `WS /api/ws/chat/{id}` | Nhắn tin realtime 1-1 & nhóm, trạng thái online |
| **Voice / Video Call** | `GET /api/calls/stringee-token`, `/stringee-answer`, `/ice-servers`, `POST /api/calls/{id}/events` | Tích hợp Stringee Call, TURN ICE & lưu lịch sử cuộc gọi |
| **AI Companion** | `GET /api/ai/history`, `POST /api/ai/chat`, `DELETE /api/ai/history`, `GET /api/ai/quick-prompts` | Trợ lý tâm lý El Pulga (Gemini + LangChain) |
| **Safety & Notifications** | `GET/POST/DELETE /api/blocks*`, `POST /api/reports`, `GET/PUT /api/notifications*` | Chặn 2 chiều, báo cáo & thông báo |
| **Admin** | `GET /api/admin/stats`, `GET /api/admin/users`, `PUT .../toggle-status`, `GET/PUT /api/admin/reports*` | Quản trị người dùng & kiểm duyệt báo cáo |

---

## 7. Triển khai (Deployment)

- **Frontend (Vercel):** Dùng Vite build (`dist/`), đã cấu hình SPA fallback rewrite tại `vercel.json` và `frontend/vercel.json`. Cần khai báo `VITE_API_URL` và `VITE_GOOGLE_CLIENT_ID`.
- **Backend (Render / ASGI):** Chạy `uvicorn app.main:app` hỗ trợ WebSocket, kết nối PostgreSQL (Supabase với `NullPool` + `pool_pre_ping`), cấu hình đầy đủ biến môi trường tại `backend/.env.example` và `CORS_ORIGINS`.
