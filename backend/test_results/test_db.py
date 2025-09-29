import sqlite3
import os

# 获取数据库文件的绝对路径
db_path = os.path.join(os.path.dirname(__file__), 'time_tracker.db')
print(f"数据库路径: {db_path}")

# 检查数据库文件是否存在
if not os.path.exists(db_path):
    print("数据库文件不存在!")
    exit(1)

try:
    # 连接到数据库
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 查询表结构
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print("数据库中的表:")
    for table in tables:
        print(f"  {table[0]}")
    
    # 尝试查询app_usage表
    cursor.execute("SELECT COUNT(*) FROM app_usage")
    count = cursor.fetchone()[0]
    print(f"app_usage表中的记录数: {count}")
    
    # 查询最近的几条记录
    cursor.execute("SELECT * FROM app_usage ORDER BY id DESC LIMIT 5")
    records = cursor.fetchall()
    print("最近的5条记录:")
    for record in records:
        print(f"  {record}")
    
    conn.close()
    print("数据库连接测试成功!")
    
except Exception as e:
    print(f"数据库连接测试失败: {e}")
    import traceback
    traceback.print_exc()