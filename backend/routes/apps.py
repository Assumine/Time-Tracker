from typing import List, Dict, Any
import sqlite3
import json
from datetime import datetime, timedelta
from collections import defaultdict
from fastapi import APIRouter
from logger import log_to_file, cache_result

DB_FILE = "time_tracker.db"

router = APIRouter(prefix="/api/apps", tags=["apps"])

def get_db_connection():
    """获取数据库连接"""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row  # 使结果可以通过列名访问
    return conn

@cache_result
def calculate_daily_time(conn, app_id: str, days: int = 1) -> int:
    """计算应用在指定天数内的使用时间（分钟）"""
    try:
        cursor = conn.cursor()
        target_date = datetime.now() - timedelta(days=days-1)
        target_date_str = target_date.strftime("%Y-%m-%d")
        
        cursor.execute("""
            SELECT SUM(duration) as total_duration 
            FROM app_usage 
            WHERE unique_id = ? AND start_time >= ?
        """, (app_id, target_date_str))
        
        result = cursor.fetchone()
        duration = result[0] if result[0] else 0
        log_to_file(f"计算应用 {app_id} 的每日使用时间: {duration} 分钟", "DEBUG")
        return duration
    except Exception as e:
        log_to_file(f"计算应用 {app_id} 的每日使用时间失败: {str(e)}", "ERROR")
        return 0

@cache_result
def calculate_last_n_days(conn, app_id: str, n: int = 3) -> List[int]:
    """计算应用最近n天的使用时间"""
    try:
        daily_times = []
        for i in range(n):
            target_date = datetime.now() - timedelta(days=i)
            target_date_str = target_date.strftime("%Y-%m-%d")
            
            cursor = conn.cursor()
            cursor.execute("""
                SELECT SUM(duration) as total_duration 
                FROM app_usage 
                WHERE unique_id = ? AND DATE(start_time) = ?
            """, (app_id, target_date_str))
            
            result = cursor.fetchone()
            daily_times.append(result[0] if result[0] else 0)
        
        log_to_file(f"计算应用 {app_id} 最近 {n} 天的使用时间: {daily_times}", "DEBUG")
        return daily_times
    except Exception as e:
        log_to_file(f"计算应用 {app_id} 最近 {n} 天的使用时间失败: {str(e)}", "ERROR")
        return [0] * n

@cache_result
def get_cooling_days(conn, app_id: str) -> int:
    """获取应用的冷却天数"""
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT cooling_days FROM app_identifiers WHERE unique_id = ?
        """, (app_id,))
        
        result = cursor.fetchone()
        cooling_days = result[0] if result else 0
        log_to_file(f"获取应用 {app_id} 的冷却天数: {cooling_days}", "DEBUG")
        return cooling_days
    except Exception as e:
        log_to_file(f"获取应用 {app_id} 的冷却天数失败: {str(e)}", "ERROR")
        return 0

@cache_result
def has_black_history(conn, app_id: str) -> bool:
    """检查应用是否有黑名单历史"""
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT COUNT(*) FROM app_usage 
            WHERE unique_id = ? AND is_blocked = 1
        """, (app_id,))
        
        result = cursor.fetchone()
        has_history = result[0] > 0
        log_to_file(f"检查应用 {app_id} 是否有黑名单历史: {has_history}", "DEBUG")
        return has_history
    except Exception as e:
        log_to_file(f"检查应用 {app_id} 是否有黑名单历史失败: {str(e)}", "ERROR")
        return False

@router.get("/list", response_model=List[Dict[str, Any]])
def get_apps_list():
    """
    获取应用列表数据
    返回包含应用详细信息的列表
    """
    conn = get_db_connection()
    try:
        # 获取所有唯一应用标识符以及它们的阻止状态
        cursor = conn.cursor()
        cursor.execute("""
            SELECT au.unique_id, 
                   MAX(au.exe_name) as exe_name, 
                   MAX(au.app_name) as app_name, 
                   MAX(au.identifier_type) as identifier_type, 
                   MAX(au.is_blocked) as is_blocked
            FROM app_usage au
            WHERE au.unique_id IS NOT NULL AND au.unique_id != ''
            GROUP BY au.unique_id
        """)
        
        rows = cursor.fetchall()
        apps_data = []
        
        # 预先获取所有应用的冷却天数，避免重复查询
        cursor.execute("SELECT unique_id, cooling_days FROM app_identifiers")
        cooling_days_map = {row[0]: row[1] for row in cursor.fetchall()}
        
        # 预先获取所有应用的黑名单历史，避免重复查询
        cursor.execute("""
            SELECT unique_id, COUNT(*) as black_count 
            FROM app_usage 
            WHERE is_blocked = 1 
            GROUP BY unique_id
        """)
        black_history_map = {row[0]: row[1] > 0 for row in cursor.fetchall()}
        
        for row in rows:
            app_id = row['unique_id']
            app_data = {
                "id": app_id,
                "name": row['app_name'] or row['exe_name'],
                "dailyTime": calculate_daily_time(conn, app_id, 1),
                "last3Days": calculate_last_n_days(conn, app_id, 3),
                "coolingDays": cooling_days_map.get(app_id, 0),
                "hasBlackHistory": black_history_map.get(app_id, False),
                "is_blocked": bool(row['is_blocked']),  # 添加阻止状态
                "upgradeSourceId": None  # 可以根据需要实现
            }
            apps_data.append(app_data)
        
        # 直接返回应用数据列表，符合response_model定义
        return apps_data
    except Exception as e:
        if 'conn' in locals():
            conn.close()
        # 发生错误时返回空列表而不是错误对象
        return []
    finally:
        conn.close()

@router.get("/{app_id}/details")
def get_app_details(app_id: str):
    """
    获取特定应用的详细信息
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT unique_id, exe_name, app_name, identifier_type,
                   SUM(duration) as total_duration
            FROM app_usage 
            WHERE unique_id = ?
            GROUP BY unique_id, exe_name, app_name, identifier_type
        """, (app_id,))
        
        row = cursor.fetchone()
        if not row:
            return {"error": "App not found"}
        
        return {
            "id": row['unique_id'],
            "name": row['app_name'] or row['exe_name'],
            "totalDuration": row['total_duration'],
            "dailyTime": calculate_daily_time(conn, app_id, 1),
            "last3Days": calculate_last_n_days(conn, app_id, 3),
            "coolingDays": get_cooling_days(conn, app_id),
            "hasBlackHistory": has_black_history(conn, app_id)
        }
    finally:
        conn.close()