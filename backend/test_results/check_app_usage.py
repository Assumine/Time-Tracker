import sqlite3

# 连接到数据库
conn = sqlite3.connect('D:/APPS/AT/1.1/backend/time_tracker.db')
cursor = conn.cursor()

# 查询应用使用数据
cursor.execute('SELECT * FROM app_usage LIMIT 5')
rows = cursor.fetchall()

print("App usage data:")
for row in rows:
    print(row)

# 查询设置数据
cursor.execute('SELECT * FROM settings')
settings_rows = cursor.fetchall()

print("\nSettings data:")
for row in settings_rows:
    print(row)

conn.close()