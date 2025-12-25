
import sqlite3
import os

db_path = 'dailyport.db'

if not os.path.exists(db_path):
    print(f"Error: {db_path} not found")
    exit(1)

conn = sqlite3.connect(db_path)
cur = conn.cursor()

try:
    cur.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cur.fetchall()
    
    print(f"{'Table Name':<20} | {'Row Count':<10}")
    print("-" * 35)
    
    for table_tuple in tables:
        table_name = table_tuple[0]
        cur.execute(f"SELECT COUNT(*) FROM {table_name}")
        count = cur.fetchone()[0]
        print(f"{table_name:<20} | {count:<10}")

    # Also check database size and potential free space (VACUUM related)
    cur.execute("PRAGMA page_count")
    page_count = cur.fetchone()[0]
    cur.execute("PRAGMA page_size")
    page_size = cur.fetchone()[0]
    cur.execute("PRAGMA freelist_count")
    freelist_count = cur.fetchone()[0]
    
    print("\nSQLite Stats:")
    print(f"Total Size: {page_count * page_size / (1024*1024):.2f} MB")
    print(f"Freelist Space (Reusable): {freelist_count * page_size / (1024*1024):.2f} MB")

except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
