import sys
try:
    from app import database
    print("Database imported OK!")
except Exception as e:
    import traceback
    traceback.print_exc()
