
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), '../../dailyport.db')

def migrate():
    print(f"Migrating DB at {DB_PATH}...")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Check if pension column exists in daily_supply
    try:
        cursor.execute("SELECT pension FROM daily_supply LIMIT 1")
        print("✅ 'pension' column already exists.")
    except sqlite3.OperationalError:
        print("🛠 Adding 'pension' column to daily_supply...")
        try:
            cursor.execute("ALTER TABLE daily_supply ADD COLUMN pension INTEGER DEFAULT 0")
            print("✅ 'pension' column added.")
        except Exception as e:
            print(f"❌ Failed to add column: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
