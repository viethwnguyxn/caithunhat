# HƯỚNG DẪN CẤU HÌNH GOOGLE OAUTH 2.0 (GOOGLE IDENTITY SERVICES)

Tài liệu này hướng dẫn từng bước để lấy `Google Client ID` và kết nối tính năng "Continue with Google" vào dự án.

---

## 1. Tạo Google Cloud Project & OAuth Client ID

### Bước 1: Truy cập Google Cloud Console
1. Mở trình duyệt và truy cập: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. Đăng nhập bằng tài khoản Google của bạn.
3. Tạo một project mới (ví dụ đặt tên: `Kindred Community`).

### Bước 2: Cấu hình OAuth Consent Screen
1. Vào menu bên trái chọn **APIs & Services** → **OAuth consent screen** (Màn hình đồng ý OAuth).
2. Chọn loại User: **External** → bấm **Create**.
3. Điền thông tin cơ bản:
   - **App name**: `Kindred Community`
   - **User support email**: Chọn email của bạn
   - **Developer contact information**: Nhập email của bạn
4. Bấm **Save and Continue** qua các bước Scopes và Test users (trong giai đoạn thử nghiệm, thêm email Google cá nhân của bạn vào danh sách **Test users**).
5. Bấm **Back to Dashboard**.

### Bước 3: Tạo Credentials (OAuth Client ID)
1. Chọn **APIs & Services** → **Credentials**.
2. Bấm **+ CREATE CREDENTIALS** → chọn **OAuth client ID**.
3. Tại mục **Application type**: Chọn **Web application**.
4. **Name**: `Kindred Web Client`.
5. **Authorized JavaScript origins** (Nguồn gốc JavaScript được phép):
   - Thêm: `http://localhost:5173`
   - Thêm: `http://localhost:8000` (nếu cần)
   - Thêm: `http://127.0.0.1:5173`
6. **Authorized redirect URIs** (URI chuyển hướng được phép):
   - Khi sử dụng SDK Google Identity Services Popup/One-tap, Google không yêu cầu redirect URI phức tạp, nhưng bạn có thể thêm:
     `http://localhost:5173`
7. Bấm **CREATE**.
8. Một cửa sổ hiện ra chứa **Client ID** (dạng: `xxxxxxx.apps.googleusercontent.com`). Copy mã này.

---

## 2. Cấu hình biến môi trường trong dự án

### Backend:
Mở file `backend/.env`, thay giá trị `GOOGLE_CLIENT_ID`:
```env
GOOGLE_CLIENT_ID=xxxxxxx.apps.googleusercontent.com
```

### Frontend:
Mở file `frontend/.env`, thay giá trị `VITE_GOOGLE_CLIENT_ID`:
```env
VITE_GOOGLE_CLIENT_ID=xxxxxxx.apps.googleusercontent.com
```

---

## 3. Khởi động và kiểm tra

1. Khởi động Backend:
   ```powershell
   cd backend
   .\venv\Scripts\activate
   uvicorn app.main:app --reload --port 8000
   ```
2. Khởi động Frontend:
   ```powershell
   cd frontend
   npm run dev
   ```
3. Truy cập `http://localhost:5173/login` hoặc `http://localhost:5173/register` sẽ thấy nút **Continue with Google**.
4. Bấm nút và chọn tài khoản Google để đăng nhập.
