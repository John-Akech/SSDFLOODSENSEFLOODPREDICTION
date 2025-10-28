import sqlite3

conn = sqlite3.connect('database/floodsense.db')
cursor = conn.cursor()

cursor.execute('SELECT id, latitude, longitude, flood_probability, risk_level, created_at FROM predictions ORDER BY id DESC LIMIT 5')

print('Recent Predictions:')
for row in cursor.fetchall():
    print(f'ID: {row[0]}, Lat: {row[1]}, Lon: {row[2]}, Prob: {row[3]:.2%}, Risk: {row[4]}, Time: {row[5]}')

conn.close()
