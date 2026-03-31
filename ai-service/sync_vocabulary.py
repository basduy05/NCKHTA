import requests
import sqlite3
import os
import json

# Cấu hình
BASE_URL = "https://iedu-ksk7.onrender.com"
EMAIL = "admin@eam.edu.vn"
PASSWORD = "123456" # Mật khẩu mặc định hoặc thay bằng mật khẩu của bạn

# Đường dẫn DB local
DB_PATH = os.path.join(os.path.dirname(__file__), "app", "app.db")

def sync():
    print(f"--- BẮT ĐẦU ĐỒNG BỘ DỮ LIỆU TỪ {BASE_URL} ---")
    
    # 1. Đăng nhập để lấy Token
    print(f"Đang đăng nhập tài khoản: {EMAIL}...")
    try:
        login_res = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": PASSWORD})
        if login_res.status_code != 200:
            # Thử mật khẩu 'password' nếu '123456' sai
            login_res = requests.post(f"{BASE_URL}/auth/login", json={"email": EMAIL, "password": "password"})
            
        if login_res.status_code != 200:
            print("❌ Đăng nhập thất bại. Vui lòng kiểm tra lại EMAIL/PASSWORD trong file này.")
            return
            
        token = login_res.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Đăng nhập thành công!")
    except Exception as e:
        print(f"❌ Lỗi kết nối API: {e}")
        return

    # 2. Lấy danh sách từ vựng
    print("\n--- [1/3] ĐỒNG BỘ TỪ VỰNG ---")
    try:
        vocab_res = requests.get(f"{BASE_URL}/student/vocabulary", headers=headers)
        vocab_list = vocab_res.json() if vocab_res.status_code == 200 else []
        print(f"✅ Tìm thấy {len(vocab_list)} từ vựng.")
    except: vocab_list = []

    # 3. Lấy danh sách lớp học
    print("\n--- [2/3] ĐỒNG BỘ LỚP HỌC ---")
    try:
        # Sử dụng endpoint teacher để lấy lớp (nếu là admin/teacher)
        class_res = requests.get(f"{BASE_URL}/teacher/my-classes", headers=headers)
        if class_res.status_code != 200:
            # Thử endpoint student nếu teacher fail
            class_res = requests.get(f"{BASE_URL}/student/my-classes", headers=headers)
        
        classes_list = class_res.json() if class_res.status_code == 200 else []
        print(f"✅ Tìm thấy {len(classes_list)} lớp học.")
    except: classes_list = []

    # 4. Lưu vào database local
    if not os.path.exists(DB_PATH):
        print(f"❌ Không tìm thấy file database local tại: {DB_PATH}")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM users WHERE email = ?", (EMAIL,))
        user_row = cursor.fetchone()
        local_user_id = user_row[0] if user_row else 1
        
        # --- LƯU TỪ VỰNG ---
        vocab_count = 0
        for item in vocab_list:
            cursor.execute("""
                INSERT OR IGNORE INTO saved_vocabulary 
                (user_id, word, phonetic, pos, meaning_en, meaning_vn, example, level, source, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (local_user_id, item.get("word"), item.get("phonetic"), item.get("pos"), item.get("meaning_en"), item.get("meaning_vn"), item.get("example"), item.get("level", "B1"), "server-sync", item.get("created_at")))
            vocab_count += cursor.rowcount
        
        # --- LƯU LỚP HỌC & BÀI HỌC ---
        class_count = 0
        lesson_count = 0
        for c in classes_list:
            class_id_remote = c.get("id")
            cursor.execute("INSERT OR IGNORE INTO classes (id, name, teacher_name, students_count, teacher_id) VALUES (?, ?, ?, ?, ?)",
                         (class_id_remote, c.get("name"), c.get("teacher_name"), c.get("students_count"), local_user_id))
            if cursor.rowcount > 0:
                class_count += 1
                # Lấy bài học của lớp này
                try:
                    lesson_res = requests.get(f"{BASE_URL}/teacher/my-classes/{class_id_remote}/lessons", headers=headers)
                    if lesson_res.status_code == 200:
                        for l in lesson_res.json():
                            cursor.execute("INSERT OR IGNORE INTO lessons (id, class_id, title, content) VALUES (?, ?, ?, ?)",
                                         (l.get("id"), class_id_remote, l.get("title"), l.get("content")))
                            lesson_count += cursor.rowcount
                except: pass
        
        conn.commit()
        conn.close()
        print(f"\n🚀 ĐÃ HOÀN TẤT ĐỒNG BỘ!")
        print(f"- Từ vựng: {vocab_count}")
        print(f"- Lớp học: {class_count}")
        print(f"- Bài học: {lesson_count}")
        print("\nGiờ bạn có thể mở localhost:3000 để kiểm tra.")
        
    except Exception as e:
        print(f"❌ Lỗi database: {e}")
        
    except Exception as e:
        print(f"❌ Lỗi database: {e}")

if __name__ == "__main__":
    sync()
