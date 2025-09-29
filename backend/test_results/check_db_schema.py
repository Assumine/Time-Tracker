import sqlite3

# 连接到数据库
conn = sqlite3.connect('d:/APPS/AT/1.1/backend/time_tracker.db')
cursor = conn.cursor()

# 获取所有表名
cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
tables = cursor.fetchall()
print("数据库中的表:")
for table in tables:
    print(f"  {table[0]}")

# 查看每个表的结构
for table in tables:
    print(f"\n{table[0]} 表结构:")
    cursor.execute(f"PRAGMA table_info({table[0]});")
    columns = cursor.fetchall()
    for column in columns:
        print(f"  {column[1]} ({column[2]})")

# 查看logs表的数据
try:
    print("\nlogs表数据样本:")
    cursor.execute("SELECT * FROM logs LIMIT 5;")
    logs = cursor.fetchall()
    for log in logs:
        print(f"  {log}")
except Exception as e:
    print(f"查询logs表出错: {e}")

conn.close()