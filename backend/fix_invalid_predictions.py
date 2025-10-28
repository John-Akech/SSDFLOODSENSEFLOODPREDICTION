import sqlite3

conn = sqlite3.connect('database/floodsense.db')
cursor = conn.cursor()

# Delete predictions with invalid default coordinates
cursor.execute('DELETE FROM predictions WHERE latitude = -90.0 AND longitude = -180.0')
deleted_count = cursor.rowcount

conn.commit()
conn.close()

print(f'[OK] Deleted {deleted_count} invalid prediction(s) with default coordinates (-90, -180)')
print('[OK] Database cleaned successfully')
