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

# Chạy Backend (Cổng 8000)
uvicorn app.main:app --reload --port 8000
```
> [!NOTE]
> Backend sẽ chạy tại: `http://localhost:8000`
> Tài liệu API (Swagger UI): `http://localhost:8000/docs`

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
> `NEXT_PUBLIC_API_URL=http://localhost:8000`
> Để frontend kết nối với backend local.

---

## 3. Đồng bộ dữ liệu từ API về Local

Tôi đã tạo một file `ai-service/sync_vocabulary.py`. File này sẽ lấy các từ vựng bạn đã lưu trên Server (Render) của tài khoản `admin@eam.edu.vn` và lưu vào file database local (`app.db`) để bạn có dữ liệu test.

**Cách chạy:**
```powershell
# Trong terminal backend (đã activate venv)
cd ai-service
python sync_vocabulary.py
```
