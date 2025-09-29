import sqlite3
import time
from datetime import datetime, timedelta

def check_idle_logs():
    """检查数据库中的挂机记录"""
    print("检查数据库中的挂机记录")
    print("=" * 30)
    
    # 连接到数据库
    conn = sqlite3.connect('d:/APPS/AT/1.1/backend/time_tracker.db')
    cursor = conn.cursor()
    
    # 计算10分钟前的时间
    ten_minutes_ago = datetime.now() - timedelta(minutes=10)
    
    # 查询最近的挂机记录
    cursor.execute("""
        SELECT * FROM app_usage 
        WHERE exe_name = 'System' 
        AND start_time > ? 
        ORDER BY start_time DESC 
        LIMIT 10
    """, (ten_minutes_ago.isoformat(),))
    
    records = cursor.fetchall()
    
    if records:
        print("最近的挂机记录:")
        print("ID\t开始时间\t\t\t程序名\t\t描述\t\t\t持续时间(秒)")
        print("-" * 80)
        for record in records:
            print(f"{record[0]}\t{record[1][:19]}\t{record[2]}\t\t{record[3]}\t\t{record[4]}")
    else:
        print("最近10分钟内没有找到挂机记录")
    
    conn.close()

def wait_and_check():
    """等待一段时间后再次检查"""
    print("\n等待30秒后再次检查...")
    time.sleep(30)
    check_idle_logs()

if __name__ == "__main__":
    check_idle_logs()
    wait_and_check()