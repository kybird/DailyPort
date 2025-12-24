import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '../../dailyport.db')
SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'schema_sqlite.sql')

def init_db():
    print(f"🚀 Initializing Local Database at: {DB_PATH}")
    
    # Connect (Creates file if not exists)
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Read Schema
    try:
        with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
            schema_sql = f.read()
    except FileNotFoundError:
        print(f"❌ Schema file not found at {SCHEMA_PATH}")
        return

    # Execute Schema
    try:
        cursor.executescript(schema_sql)
        conn.commit()
        print("✅ Database initialized successfully.")
        
        # Verify Tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("📋 Tables created:")
        for t in tables:
            print(f" - {t[0]}")
            
    except sqlite3.Error as e:
        print(f"❌ An error occurred: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    init_db()
