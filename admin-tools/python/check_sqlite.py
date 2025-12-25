import sqlite3
import os

db_path = os.path.join(os.getcwd(), 'dailyport.db')
print(f"Connecting to DB: {db_path}")

try:
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    ticker = "488900"
    
    # Check Price Count
    cur.execute("SELECT count(*) FROM daily_price WHERE code=?", (ticker,))
    count = cur.fetchone()[0]
    print(f"[{ticker}] Daily Price Rows: {count}")
    
    if count > 0:
        cur.execute("SELECT date, close FROM daily_price WHERE code=? ORDER BY date DESC LIMIT 5", (ticker,))
        rows = cur.fetchall()
        print(f"Latest Data: {rows}")
        
        cur.execute("SELECT date FROM daily_price WHERE code=? ORDER BY date ASC LIMIT 1", (ticker,))
        first = cur.fetchone()
        print(f"First Date: {first[0]}")
    
    conn.close()
except Exception as e:
    print(f"Error: {e}")
