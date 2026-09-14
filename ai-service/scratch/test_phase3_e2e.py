import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["FORCE_LOCAL_DB"] = "1"
os.environ["ONLINE_DB_ONLY"] = "0"

# Set UTF-8 encoding
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.database import get_db, init_db
from app.services.cmu_ipa_service import lookup_cmu_ipa
from app.services.job_queue_service import job_queue
import asyncio

print("=== STARTING PHASE 3 END-TO-END VERIFICATION ===")

# 1. DB Init & Indexes Check (3.16)
init_db()
conn = get_db()
cur = conn.cursor()
cur.execute("PRAGMA index_list('saved_vocabulary')")
indexes = [r[1] for r in cur.fetchall()]
print(f"[OK 3.16] Indexes on saved_vocabulary: {indexes}")

# 2. CMU IPA Service (3.4)
sample = lookup_cmu_ipa("education")
print(f"[OK 3.4] CMU IPA for 'education': {sample}")
assert sample is not None and sample["ipa"] != "", "CMU IPA should not be empty"

# 3. Test Parent Portal Link & Public Report (3.9)
cur.execute("SELECT id, name FROM users WHERE role = 'student' LIMIT 1")
student = cur.fetchone()
if not student:
    cur.execute("INSERT INTO users (name, email, password_hash, role) VALUES ('Test Student', 'test_phase3@edu.vn', 'hash', 'student')")
    conn.commit()
    student_id = cur.lastrowid
else:
    student_id = student["id"]

test_code = "P3TEST88"
cur.execute("INSERT OR REPLACE INTO parent_student_links (student_id, link_code, is_active) VALUES (?, ?, 1)", (student_id, test_code))
conn.commit()
conn.close()

from app.routers.student import get_public_student_report
report_data = get_public_student_report(test_code)
print(f"[OK 3.9] Public Parent Report for: {report_data['student_name']}, Level: {report_data['level']}")
assert report_data["student_name"] is not None

# 5. Background Job Queue (3.15)
async def test_queue():
    await job_queue.start()
    def compute():
        return 42 * 2
    job_id = job_queue.enqueue(compute)
    await asyncio.sleep(0.5)
    status = job_queue.get_status(job_id)
    print(f"[OK 3.15] Background job {job_id} result: {status['result']}")
    assert status["result"] == 84

asyncio.run(test_queue())

print("\n=== ALL PHASE 3 BACKEND & INFRA VERIFICATIONS PASSED SUCCESSFULLY! ===")

