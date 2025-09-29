import sqlite3
import json
from datetime import datetime

DB_FILE = "time_tracker.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()

    # 应用使用日志（更新表结构以支持存储应用唯一标识符和标识类型）
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS app_usage (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        start_time TEXT,
        exe_name TEXT,
        app_name TEXT,
        duration INTEGER,
        unique_id TEXT,
        identifier_type TEXT
    )
    ''')

    # 黑名单应用（保留旧结构，兼容）
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS blacklist_apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exe_name TEXT,
        app_name TEXT
    )
    ''')

    # 白名单应用（保留旧结构，兼容）
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS whitelist_apps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        exe_name TEXT,
        app_name TEXT
    )
    ''')

    # 休息日设置（保留旧结构，兼容）
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS rest_days (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT
    )
    ''')

    # 🔹 新的 settings 表（存 JSON 配置，只有一条记录）
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        data TEXT
    )
    ''')

    # 插入默认配置（如果为空）
    cursor.execute("SELECT COUNT(*) FROM settings WHERE id = 1")
    if cursor.fetchone()[0] == 0:
        default_settings = {
            "workPeriods": [{"start": "09:00", "end": "18:00"}],
            "blacklist": [],
            "whitelist": [],
            "restDays": [],
            "resetPolicy": "daily"
        }
        cursor.execute("INSERT INTO settings (id, data) VALUES (1, ?)",
                       (json.dumps(default_settings),))

    conn.commit()
    conn.close()


# ------------------------
# 日志接口
# ------------------------
def log_usage(exe_name: str, app_name: str, duration: int, unique_id: str = None, identifier_type: str = None):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO app_usage (start_time, exe_name, app_name, duration, unique_id, identifier_type) VALUES (?, ?, ?, ?, ?, ?)",
        (datetime.now().isoformat(), exe_name, app_name, duration, unique_id, identifier_type)
    )
    conn.commit()
    conn.close()

def store_app_identifier(pid, identifier_value, identifier_type):
    """
    存储应用唯一标识符信息到数据库
    如果已存在该进程ID的记录，则更新标识符信息
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 检查是否已存在该进程ID的记录
    cursor.execute(
        "SELECT id FROM app_usage WHERE unique_id = ? AND identifier_type = ?",
        (identifier_value, identifier_type)
    )
    existing_record = cursor.fetchone()
    
    if not existing_record:
        # 记录不存在，插入新记录（只记录标识符，不记录持续时间）
        cursor.execute(
            "INSERT INTO app_usage (start_time, exe_name, app_name, duration, unique_id, identifier_type) VALUES (?, ?, ?, ?, ?, ?)",
            (datetime.now().isoformat(), "", "", 0, identifier_value, identifier_type)
        )
    
    conn.commit()
    conn.close()

def check_app_identifier_exists(identifier_value, identifier_type):
    """
    检查数据库中是否已存在指定的应用标识符
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT id FROM app_usage WHERE unique_id = ? AND identifier_type = ?",
        (identifier_value, identifier_type)
    )
    result = cursor.fetchone()
    
    conn.close()
    return result is not None

def get_recent_logs(limit=50):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT start_time, exe_name, app_name, duration, unique_id, identifier_type FROM app_usage ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [
        {"time": r[0], "exe": r[1], "app": r[2], "duration": r[3], "unique_id": r[4], "identifier_type": r[5]} for r in rows
    ]


# ------------------------
# 黑白名单（兼容旧接口）
# ------------------------
def get_blocked_apps_count():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM blacklist_apps")
    count = cursor.fetchone()[0]
    conn.close()
    return count

def get_blacklist():
    settings = load_settings()
    return [(x["exe_name"], x.get("app_name", x["exe_name"])) for x in settings.get("blacklist", [])]

def get_whitelist():
    settings = load_settings()
    return [(x["exe_name"], x.get("app_name", x["exe_name"])) for x in settings.get("whitelist", [])]


# ------------------------
# 设置管理
# ------------------------
def load_settings():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT data FROM settings WHERE id = 1")
    row = cursor.fetchone()
    conn.close()
    return json.loads(row[0]) if row else {}

def save_settings(data: dict):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("UPDATE settings SET data = ? WHERE id = 1", (json.dumps(data),))
    conn.commit()
    conn.close()


# ------------------------
# 应用标识符管理
# ------------------------
def save_app_identifier(unique_id: str, exe_name: str, app_name: str, identifier_type: str, cooling_days: int = 0):
    """
    保存应用标识符信息到数据库
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 使用 INSERT OR REPLACE 来确保记录存在且是最新的
    cursor.execute("""
        INSERT OR REPLACE INTO app_identifiers 
        (unique_id, exe_name, app_name, identifier_type, cooling_days)
        VALUES (?, ?, ?, ?, ?)
    """, (unique_id, exe_name, app_name, identifier_type, cooling_days))
    
    conn.commit()
    conn.close()

def get_cooling_days(unique_id: str) -> int:
    """
    获取应用的冷却天数
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute("SELECT cooling_days FROM app_identifiers WHERE unique_id = ?", (unique_id,))
    result = cursor.fetchone()
    
    conn.close()
    return result[0] if result else 0

def has_black_history(unique_id: str) -> bool:
    """
    检查应用是否有黑名单历史
    """
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM app_usage WHERE unique_id = ? AND is_blocked = 1", (unique_id,))
    result = cursor.fetchone()
    
    conn.close()
    return result[0] > 0
