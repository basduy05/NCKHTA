import sqlite3, os
p = r"c:/Users/basdu/Downloads/NCKHTA/ai-service/app/app.db"
print("db_exists", os.path.exists(p), p)
conn = sqlite3.connect(p)
cur = conn.cursor()
for t in ["users","classes","class_members","lessons","assignments","student_submissions","vocabulary"]:
    try:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        print(t, cur.fetchone()[0])
    except Exception as e:
        print(t, "ERR", e)
cur.execute("SELECT id,email,role,name FROM users WHERE lower(email)=lower(?) LIMIT 1", ("student@iedu.vn",))
r = cur.fetchone()
print("student_user", r)
if r:
    uid = r[0]
    cur.execute("SELECT COUNT(*) FROM class_members WHERE student_id=?", (uid,))
    print("class_members_for_student", cur.fetchone()[0])
    cur.execute("SELECT COUNT(*) FROM student_submissions WHERE student_id=?", (uid,))
    print("student_submissions_for_student", cur.fetchone()[0])
    cur.execute("SELECT COUNT(*) FROM vocabulary WHERE user_id=?", (uid,))
    print("vocabulary_for_student", cur.fetchone()[0])
conn.close()
