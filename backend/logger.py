import os
import json
import logging
from datetime import datetime
from functools import wraps
from typing import Any, Dict, Optional
import sqlite3

# 创建logs目录（如果不存在）
LOGS_DIR = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(LOGS_DIR, exist_ok=True)

# 配置日志记录器
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join(LOGS_DIR, "app.log"), encoding='utf-8'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("TimeTracker")

# 缓存字典，用于存储缓存的数据
_cache = {}
# 缓存有效期（30分钟）
CACHE_TIMEOUT = 30 * 60

def get_cache_key(func_name: str, *args, **kwargs) -> str:
    """生成缓存键"""
    key = f"{func_name}:{hash(str(args) + str(sorted(kwargs.items())))}"
    return key

def cache_result(func):
    """装饰器：缓存函数结果30分钟"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        # 生成缓存键
        cache_key = get_cache_key(func.__name__, *args, **kwargs)
        current_time = datetime.now().timestamp()
        
        # 检查缓存是否存在且未过期
        if cache_key in _cache:
            result, timestamp = _cache[cache_key]
            if current_time - timestamp < CACHE_TIMEOUT:
                logger.debug(f"缓存命中: {func.__name__}")
                return result
        
        # 执行函数并缓存结果
        result = func(*args, **kwargs)
        _cache[cache_key] = (result, current_time)
        logger.debug(f"缓存已更新: {func.__name__}")
        return result
    
    return wrapper

def clear_expired_cache():
    """清理过期缓存"""
    current_time = datetime.now().timestamp()
    expired_keys = [
        key for key, (_, timestamp) in _cache.items()
        if current_time - timestamp >= CACHE_TIMEOUT
    ]
    for key in expired_keys:
        del _cache[key]
    logger.debug(f"清理了 {len(expired_keys)} 个过期缓存项")

def log_to_file(message: str, level: str = "INFO", extra_data: Optional[Dict] = None):
    """记录日志到文件"""
    # 清理过期缓存
    clear_expired_cache()
    
    # 记录日志
    log_method = getattr(logger, level.lower(), logger.info)
    if extra_data:
        message = f"{message} | Extra: {json.dumps(extra_data, ensure_ascii=False)}"
    log_method(message)

def log_api_request(endpoint: str, method: str, status_code: int, duration: float):
    """记录API请求日志"""
    message = f"API Request: {method} {endpoint} - Status: {status_code} - Duration: {duration:.2f}ms"
    log_to_file(message, "INFO")

def log_function_call(func_name: str, args: tuple, kwargs: dict, result: Any = None, error: Exception = None):
    """记录函数调用日志"""
    if error:
        message = f"Function {func_name} failed with error: {str(error)}"
        log_to_file(message, "ERROR")
    else:
        message = f"Function {func_name} called with args: {args}, kwargs: {kwargs}"
        if result is not None:
            message += f" | Result: {result}"
        log_to_file(message, "DEBUG")