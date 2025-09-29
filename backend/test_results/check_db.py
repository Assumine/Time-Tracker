import sqlite3
import json

# 连接到数据库
conn = sqlite3.connect('d:/APPS/AT/1.1/backend/time_tracker.db')
cursor = conn.cursor()

# 查询settings表
cursor.execute("SELECT * FROM settings")
rows = cursor.fetchall()

print("Settings table content:")
for row in rows:
    print(f"ID: {row[0]}")
    print(f"Data: {row[1]}")
    # 尝试解析JSON数据
    try:
        data = json.loads(row[1])
        print("Parsed JSON data:")
        print(json.dumps(data, indent=2))
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
    print("-" * 50)

# 查询其他表
tables = ['app_usage', 'blacklist_apps', 'whitelist_apps', 'rest_days']
for table in tables:
    try:
        cursor.execute(f"SELECT COUNT(*) FROM {table}")
        count = cursor.fetchone()[0]
        print(f"{table} table has {count} rows")
    except Exception as e:
        print(f"Error querying {table}: {e}")

conn.close()