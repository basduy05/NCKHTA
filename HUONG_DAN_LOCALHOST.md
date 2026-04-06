# Hướng dẫn chạy NCKHTA trên Localhost

Làm theo các bước sau để bật ứng dụng và chạy thử trên máy của bạn.

## 1. Cài đặt và Chạy Backend (AI Service)

Mở Terminal mới và chạy các lệnh sau:

```powershell
# Di chuyển vào thư mục ai-service
cd ai-service

# Tạo môi trường ảo (Virtual Environment)
python -m venv venv

# Kích hoạt môi trường ảo
.\venv\Scripts\activate

# Cài đặt thư viện cần thiết
pip install -r requirements.txt

# Bật chế độ chỉ dùng DB online (Turso)
$env:ONLINE_DB_ONLY="1"

# Chạy Backend (Cổng 8000)
uvicorn app.main:app --reload --port 8000
```
> [!NOTE]
> Backend sẽ chạy tại: `http://localhost:8000`
> Tài liệu API (Swagger UI): `http://localhost:8000/docs`
> Đảm bảo `ai-service/.env` đã có `TURSO_URL` và `TURSO_AUTH_TOKEN` hợp lệ.

---

## 2. Cài đặt và Chạy Frontend

Mở một Terminal khác (giữ Terminal backend đang chạy):

```powershell
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt node_modules
npm install

# Chạy Frontend (Cổng 3000)
npm run dev
```
> [!IMPORTANT]
> Bạn cần sửa file `frontend/.env.local` thành:
> `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`
> hoặc `NEXT_PUBLIC_API_URL=http://localhost:8000`
> (chọn 1 giá trị và dùng thống nhất khi mở frontend).

---

## 3. Kiểm tra kết nối DB Online

Sau khi backend chạy, kiểm tra health endpoint:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8000/health
```

Nếu kết nối DB online thành công, phần `dependencies.database` sẽ là `ok`.
