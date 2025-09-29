import sqlite3
import json
from datetime import datetime

# 连接到数据库
conn = sqlite3.connect('d:\\APPS\\AT\\1.1\\backend\\time_tracker.db')
cursor = conn.cursor()

# 查询最近的10条日志记录
cursor.execute('SELECT id, start_time, exe_name, app_name, duration FROM app_usage ORDER BY id DESC LIMIT 20')
rows = cursor.fetchall()

print("最近的20条日志记录:")
print("ID\t时间\t\t\t应用名称\t\t持续时间(秒)")
print("-" * 80)
for row in rows:
    print(f"{row[0]}\t{row[1]}\t{row[2]}\t\t{row[4]}")

conn.close()