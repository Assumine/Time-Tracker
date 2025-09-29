import threading
import time
from datetime import datetime
import psutil
import platform
import re
from fastapi import FastAPI, Body, Request
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from db_utils import log_usage, get_blacklist, get_whitelist, get_blocked_apps_count, init_db, save_settings, load_settings
from routes.setting import router as settings_router
from routes.apps import router as apps_router
from api import router as main_router
from enhanced_app_identifier import EnhancedAppIdentifier
from logger import log_to_file, log_api_request

# ------------------------------
# FastAPI 实例
# ------------------------------
app = FastAPI()

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:30033", "http://localhost:30033", "http://127.0.0.1:30035", "http://localhost:30035"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 添加请求日志中间件
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    log_api_request(
        endpoint=str(request.url),
        method=request.method,
        status_code=response.status_code,
        duration=process_time
    )
    return response

app.include_router(settings_router)
app.include_router(main_router)
app.include_router(apps_router)
# app.mount("/", StaticFiles(directory="../frontend/dist", html=True), name="frontend")

# ------------------------------
# 初始化数据库
# ------------------------------
init_db()

# ------------------------------
# 全局状态
# ------------------------------
monitor_data = {
    "current_app": None,
    "work_time_elapsed": 0,
    "rest_time_remaining": 0,
    "blocked_count": 0
}

# 挂机开始时间
idle_start = None

# ------------------------------
# 获取前台应用函数
# ------------------------------
def get_foreground_app():
    """获取前台应用的进程名和窗口标题"""
    try:
        import ctypes
        import ctypes.wintypes

        # 获取前台窗口句柄
        hwnd = ctypes.windll.user32.GetForegroundWindow()
        
        # 获取进程ID
        pid = ctypes.c_ulong()
        ctypes.windll.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        
        # 获取进程信息
        proc = psutil.Process(pid.value)
        exe_name = proc.name()
        
        # 获取窗口标题
        length = ctypes.windll.user32.GetWindowTextLengthW(hwnd)
        if length > 0:
            buffer = ctypes.create_unicode_buffer(length + 1)
            ctypes.windll.user32.GetWindowTextW(hwnd, buffer, length + 1)
            title = buffer.value
        else:
            title = ""
            
        return exe_name, title
    except Exception as e:
        print(f"获取前台应用失败: {e}")
        return "Unknown", "Unknown"

def extract_app_title(exe_name, window_title):
    """
    智能提取应用标题，按照指定规则处理
    规则:
    1. 窗口标题与程序名相同时，取相同部分并转为大写
    2. 大小写选大写
    3. 若只部分匹配，取最相似的部分
    4. 若无相同，按优先级取标题：
       - 最后一个"-"后的内容
       - exe文件名
    """
    # 移除.exe扩展名
    exe_base_name = exe_name.replace('.exe', '').replace('.EXE', '')
    
    # 规则1: 窗口标题和程序名有相同部分，取相同部分（大小写选大写）
    # 检查窗口标题是否包含程序名（大小写不敏感）
    if exe_base_name.lower() in window_title.lower():
        # 找到匹配的部分
        start_idx = window_title.lower().find(exe_base_name.lower())
        if start_idx != -1:
            matched_part = window_title[start_idx:start_idx + len(exe_base_name)]
            # 返回首字母大写的形式
            return matched_part.capitalize()
    
    # 规则2: 若只部分匹配
    # 例如: 窗口标题"预览 - 无标题 (工作区) - Traeasd CN" 程序名"traea.exe" -> 返回"Traee"
    if len(exe_base_name) > 0:
        # 寻找最佳匹配的子串
        best_match = exe_base_name  # 默认返回程序名
        best_score = 0
        
        # 遍历窗口标题的所有可能子串
        for i in range(len(window_title) - len(exe_base_name) + 1):
            substring = window_title[i:i + len(exe_base_name)]
            # 计算相似度得分
            score = sum(1 for a, b in zip(exe_base_name.lower(), substring.lower()) if a == b)
            
            # 更新最佳匹配
            if score > best_score:
                best_score = score
                best_match = substring
        
        # 根据规则选择大小写形式
        # 如果匹配度较高，则返回匹配的子串（首字母大写）
        if best_score >= len(exe_base_name) * 0.5:  # 50%以上的匹配度
            return best_match.capitalize()
    
    # 规则3: 若无相同部分，按照优先顺序取标题
    # 优先级1: 取最后一个"-"符号后的内容
    if " - " in window_title:
        parts = window_title.split(" - ")
        if parts:
            return parts[-1]  # 取最后一个部分
    
    # 优先级2: 取exe文件名（不包含扩展名）
    return exe_base_name.capitalize()

def wildcard_match(pattern, text):
    """
    通配符匹配函数，支持 * 和 ?
    * 匹配任意数量的任意字符
    ? 匹配单个任意字符
    进行大小写不敏感匹配
    """
    if not pattern or not text:
        return False
    
    # 将通配符模式转换为正则表达式
    # 先转义特殊字符，但保留通配符
    regex_pattern = re.escape(pattern)
    # 将转义后的通配符替换回正则表达式模式
    # 注意：re.escape会将*转为\*，将?转为\?
    regex_pattern = regex_pattern.replace(r'\*', '.*').replace(r'\?', '.')
    
    # 使用 ^ 和 $ 锚点进行完整匹配
    regex_pattern = '^' + regex_pattern + '$'
    
    # 进行大小写不敏感匹配
    return bool(re.search(regex_pattern, text, re.IGNORECASE))

# ------------------------------
# 挂机检测
# ------------------------------
def is_idle():
    """检测是否处于挂机状态"""
    import ctypes
    
    # 获取上次输入时间
    class LASTINPUTINFO(ctypes.Structure):
        _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_uint)]
    
    last_input = LASTINPUTINFO()
    last_input.cbSize = ctypes.sizeof(LASTINPUTINFO)
    
    if ctypes.windll.user32.GetLastInputInfo(ctypes.byref(last_input)):
        # 计算空闲时间（毫秒）
        current_time = ctypes.windll.kernel32.GetTickCount()
        idle_time = current_time - last_input.dwTime
        
        # 如果空闲时间超过阈值（毫秒），则认为挂机
        return idle_time > 60000, idle_time / 1000
    
    return False, 0

def handle_idle_start(app_name=""):
    """记录挂机开始"""
    global idle_start
    if idle_start is None:
        idle_start = datetime.now()
        print(f"挂机开始: {app_name}")
        # 记录挂机开始到数据库
        log_usage("System", f"挂机开始 - {app_name}", 0)

def handle_idle_end(app_name=""):
    """记录挂机结束"""
    global idle_start
    if idle_start:
        idle_end = datetime.now()
        idle_duration = (idle_end - idle_start).total_seconds()
        idle_start = None
        print(f"挂机结束: {app_name}, 持续时间: {idle_duration}秒")
        # 记录挂机结束到数据库
        log_usage("System", f"挂机结束 - {app_name}", int(idle_duration))

# ------------------------------
# 监控线程
# ------------------------------
def monitor_foreground():
    last_exe, last_title, last_start = None, None, None
    app_identifier = EnhancedAppIdentifier()  # 创建应用标识符实例
    process_info_cache = {}  # 缓存进程信息

    while True:
        try:
            # 挂机检测
            idle, idle_seconds = is_idle()
            if idle:
                if last_exe:
                    handle_idle_start(last_exe)
                time.sleep(5)  # 挂机时降低检测频率
                continue
            else:
                if idle_start and last_exe:
                    handle_idle_end(last_exe)

            exe_name, title = get_foreground_app()
            # 使用智能提取函数处理应用标题
            app_title = extract_app_title(exe_name, title)
            
            # 获取进程完整路径
            process_path = ""
            try:
                # 尝试获取进程完整路径
                import ctypes
                pid = ctypes.c_ulong()
                hwnd = ctypes.windll.user32.GetForegroundWindow()
                ctypes.windll.user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
                proc = psutil.Process(pid.value)
                process_path = proc.exe()
                # 缓存进程信息
                process_info_cache[exe_name] = process_path
            except:
                # 如果无法获取，尝试从缓存中获取
                if exe_name in process_info_cache:
                    process_path = process_info_cache[exe_name]
            
            now = datetime.now()
            
            # 更新全局状态
            monitor_data["current_app"] = title
            monitor_data["blocked_count"] = get_blocked_apps_count()

            blacklist = get_blacklist()
            whitelist = get_whitelist()

            # 白名单检测（优先级更高）
            is_whitelisted = False
            for w_exe, w_title in whitelist:
                if (wildcard_match(w_exe, exe_name) or 
                    (w_title and wildcard_match(w_title, title))):
                    is_whitelisted = True
                    break

            # 黑名单检测（仅在非白名单时生效）
            is_blacklisted = False
            if not is_whitelisted:
                for b_exe, b_title in blacklist:
                    if (wildcard_match(b_exe, exe_name) or 
                        (b_title and wildcard_match(b_title, title))):
                        is_blacklisted = True
                        break

            # 如果是黑名单应用且不是白名单应用，则终止进程
            if is_blacklisted:
                for p in psutil.process_iter(['name']):
                    if p.info['name'] == exe_name:
                        p.kill()
                # 记录黑名单应用的使用，使用处理后的标题
                # 使用应用标识符识别应用，传入完整路径
                app_info = app_identifier.identify_app(exe_name, process_path)
                # 确保唯一标识符不为空
                unique_id = app_info.get("unique_id", exe_name)
                if not unique_id:
                    unique_id = exe_name
                # 使用正确的标识符类型
                identifier_type = app_info.get("identifier_type", "APPID")
                log_usage(exe_name, app_title, 0, unique_id, identifier_type)
                time.sleep(1)
                continue

            # 应用切换检测
            if (last_exe != exe_name or last_title != title):
                # 记录前一个应用的使用时长，使用处理后的标题
                if last_exe and last_title and last_start:
                    duration = int((now - last_start).total_seconds())
                    if duration > 0:
                        # 使用上一个应用的信息，但使用智能提取的标题
                        last_app_title = extract_app_title(last_exe, last_title)
                        
                        # 使用应用标识符识别应用，尝试获取路径
                        last_process_path = process_info_cache.get(last_exe, "")
                        app_info = app_identifier.identify_app(last_exe, last_process_path)
                        # 确保唯一标识符不为空
                        unique_id = app_info.get("unique_id", last_exe)
                        if not unique_id:
                            unique_id = last_exe
                        # 使用正确的标识符类型
                        identifier_type = app_info.get("identifier_type", "APPID")
                        
                        # 记录应用使用日志，包含唯一标识符和标识类型
                        log_usage(last_exe, last_app_title, duration, unique_id, identifier_type)
                        monitor_data["work_time_elapsed"] += duration
                
                # 更新当前应用信息
                last_exe, last_title, last_start = exe_name, title, now

            time.sleep(1)
        except Exception as e:
            print("Monitor error:", e)
            time.sleep(1)

# ------------------------------
# 启动线程
# ------------------------------
def start_monitor_thread():
    t = threading.Thread(target=monitor_foreground, daemon=True)
    t.start()

# ------------------------------
# 启动
# ------------------------------
if __name__ == "__main__":
    start_monitor_thread()
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=30022)
