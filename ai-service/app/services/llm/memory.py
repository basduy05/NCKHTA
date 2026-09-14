import json
from ...database import get_db

def get_learning_profile(user_id: int) -> dict:
    """Retrieve or initialize the long-term learning profile for a student."""
    conn = get_db()
    try:
        row = conn.execute("SELECT * FROM user_learning_profile WHERE user_id = ?", (user_id,)).fetchone()
        if row:
            return {
                "user_id": row["user_id"],
                "weak_grammar_topics": json.loads(row["weak_grammar_topics"] or "[]"),
                "strong_grammar_topics": json.loads(row["strong_grammar_topics"] or "[]"),
                "weak_vocab_categories": json.loads(row["weak_vocab_categories"] or "[]"),
                "total_study_minutes": row["total_study_minutes"] or 0,
                "preferred_difficulty": row["preferred_difficulty"] or "medium",
                "mistake_log": json.loads(row["mistake_log"] or "{}"),
                "ai_notes": row["ai_notes"] or "",
            }

        # Initialize profile if not present
        conn.execute("""
            INSERT OR IGNORE INTO user_learning_profile (user_id) VALUES (?)
        """, (user_id,))
        conn.commit()
        return {
            "user_id": user_id,
            "weak_grammar_topics": [],
            "strong_grammar_topics": [],
            "weak_vocab_categories": [],
            "total_study_minutes": 0,
            "preferred_difficulty": "medium",
            "mistake_log": {},
            "ai_notes": "",
        }
    except Exception as e:
        print(f"[MEMORY] Error fetching learning profile: {e}")
        return {}
    finally:
        conn.close()


def update_learning_profile(
    user_id: int,
    weak_topic: str = None,
    strong_topic: str = None,
    study_minutes: int = 0,
    ai_note: str = None
):
    """Update student profile with new observations."""
    profile = get_learning_profile(user_id)
    if not profile:
        return

    conn = get_db()
    try:
        weak_topics = profile.get("weak_grammar_topics", [])
        if weak_topic and weak_topic not in weak_topics:
            weak_topics.append(weak_topic)

        strong_topics = profile.get("strong_grammar_topics", [])
        if strong_topic and strong_topic not in strong_topics:
            strong_topics.append(strong_topic)

        total_mins = profile.get("total_study_minutes", 0) + max(0, study_minutes)
        notes = (profile.get("ai_notes", "") + ("\n" + ai_note if ai_note else "")).strip()

        conn.execute("""
            UPDATE user_learning_profile
            SET weak_grammar_topics = ?,
                strong_grammar_topics = ?,
                total_study_minutes = ?,
                ai_notes = ?,
                last_updated = CURRENT_TIMESTAMP
            WHERE user_id = ?
        """, (
            json.dumps(weak_topics, ensure_ascii=False),
            json.dumps(strong_topics, ensure_ascii=False),
            total_mins,
            notes,
            user_id
        ))
        conn.commit()
    except Exception as e:
        print(f"[MEMORY] Error updating learning profile: {e}")
    finally:
        conn.close()


def build_student_context(user_id: int) -> str:
    """Builds personalized context injected into AI Tutor system prompts."""
    conn = get_db()
    try:
        # 1. User base info
        u = conn.execute("SELECT name, current_level, target_goal FROM users WHERE id = ?", (user_id,)).fetchone()
        if not u:
            return ""

        name = u["name"]
        level = u["current_level"] or "B1"
        goal = u["target_goal"] or "General English"

        # 2. High lapse words from FSRS
        lapsed_rows = conn.execute("""
            SELECT word FROM saved_vocabulary 
            WHERE user_id = ? AND lapses >= 2
            ORDER BY lapses DESC LIMIT 5
        """, (user_id,)).fetchall()
        struggling_words = [r["word"] for r in lapsed_rows]

        # 3. Learning profile
        profile = get_learning_profile(user_id)
        weak_grammar = profile.get("weak_grammar_topics", [])

        # 4. Total vocabulary count
        v_count = conn.execute("SELECT COUNT(*) FROM saved_vocabulary WHERE user_id = ?", (user_id,)).fetchone()[0]

        parts = [
            "--- STUDENT PERSONAL LEARNING CONTEXT ---",
            f"Student Name: {name}",
            f"Current Level: {level} | Target Goal: {goal}",
            f"Vocabulary Size: {v_count} saved words",
        ]
        if struggling_words:
            parts.append(f"Words currently struggling with (high lapses): {', '.join(struggling_words)}")
        if weak_grammar:
            parts.append(f"Grammar topics needing attention: {', '.join(weak_grammar[:4])}")

        parts.append("Tailor your explanations and examples to match this student's profile and CEFR level.")
        return "\n".join(parts)
    except Exception as e:
        print(f"[MEMORY] Error building student context: {e}")
        return ""
    finally:
        conn.close()
