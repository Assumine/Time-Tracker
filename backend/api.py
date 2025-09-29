from fastapi import APIRouter
from typing import Any, Dict
from monitor import get_foreground_app
from db_utils import get_recent_logs
from routes.apps import router as apps_router
from logger import log_to_file

# 创建主路由器
router = APIRouter()

# 注册子路由
router.include_router(apps_router)

def unified_response(success: bool, data: Any = None, message: str = "", error: str = None) -> Dict[str, Any]:
    """统一响应格式"""
    response = {
        "success": success,
        "message": message,
        "data": data
    }
    if error:
        response["error"] = error
        log_to_file(f"API Error: {message} - {error}", "ERROR")
    elif not success:
        log_to_file(f"API Warning: {message}", "WARNING")
    else:
        log_to_file(f"API Success: {message}", "INFO")
    
    return response

# ------------------------------
# 控制台相关API
# ------------------------------

@router.get("/task_status")
def task_status():
    """
    获取任务状态
    返回当前前台应用
    """
    try:
        fg_app = get_foreground_app()
        return unified_response(
            success=True,
            data={"foreground_app": fg_app},
            message="成功获取前台应用信息"
        )
    except Exception as e:
        return unified_response(
            success=False,
            message="获取前台应用信息失败",
            error=str(e)
        )

# ------------------------------
# 日志相关API
# ------------------------------

@router.get("/logs")
def read_logs():
    """
    获取最近的日志记录
    默认返回最近50条日志
    """
    try:
        logs = get_recent_logs(50)
        return unified_response(
            success=True,
            data=logs,
            message="成功获取日志记录"
        )
    except Exception as e:
        return unified_response(
            success=False,
            message="获取日志记录失败",
            error=str(e)
        )

# ------------------------------
# 统计相关API
# ------------------------------

@router.get("/stats")
def stats(period: str = "day"):
    """
    返回统计数据：
    /api/stats?period=day
    """
    try:
        # 暂只支持当日统计
        # 这里提供一个简单的统计实现
        stats_data = {
            "period": period,
            "work_time": 0,
            "rest_time": 0,
            "blocked_apps": 0
        }
        return unified_response(
            success=True,
            data=stats_data,
            message="成功获取统计数据"
        )
    except Exception as e:
        return unified_response(
            success=False,
            message="获取统计数据失败",
            error=str(e)
        )