import sqlite3

DB_FILE = "time_tracker.db"

def optimize_database():
    """为数据库添加索引以优化查询性能"""
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 检查是否已存在unique_id索引
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_app_usage_unique_id'")
    if not cursor.fetchone():
        # 为unique_id列创建索引
        print("正在为app_usage表的unique_id列创建索引...")
        cursor.execute("CREATE INDEX idx_app_usage_unique_id ON app_usage (unique_id)")
        print("✅ unique_id索引创建完成")
    else:
        print("✅ unique_id索引已存在")
    
    # 检查是否已存在start_time索引
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_app_usage_start_time'")
    if not cursor.fetchone():
        # 为start_time列创建索引
        print("正在为app_usage表的start_time列创建索引...")
        cursor.execute("CREATE INDEX idx_app_usage_start_time ON app_usage (start_time)")
        print("✅ start_time索引创建完成")
    else:
        print("✅ start_time索引已存在")
    
    # 检查是否已存在is_blocked索引
    cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_app_usage_is_blocked'")
    if not cursor.fetchone():
        # 为is_blocked列创建索引
        print("正在为app_usage表的is_blocked列创建索引...")
        cursor.execute("CREATE INDEX idx_app_usage_is_blocked ON app_usage (is_blocked)")
        print("✅ is_blocked索引创建完成")
    else:
        print("✅ is_blocked索引已存在")
    
    conn.commit()
    conn.close()
    print("🎉 数据库优化完成")

if __name__ == "__main__":
    optimize_database()