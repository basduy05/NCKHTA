import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.routers.student import lookup_dictionary_stream
from app.database import get_db

async def test():
    print("Testing DB Connection...")
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT 1")
    except Exception as e:
        print("DB ERROR:", e)
        return
        
    print("Testing Dictionary Stream Loop without Auth Dependency...")
    # Mô phỏng một user giả để hàm không bị crash nếu cần decode JWT
    mock_student = {"id": 1, "name": "Fake Student"}
    
    # Import router handler để override dependency hoặc gọi mock db
    from app.routers import student
    
    # Tạo request payload giả
    try:
        # Gọi thẳng endpoint logic thay vì đi vòng qua HTTP Request
        response = student.lookup_dictionary(
            req=student.LookupRequest(word="ubiquitous"),
            authorization="Bearer FAkEToken",
            background_tasks=None
        )
        print("Function generated response:", response)
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
