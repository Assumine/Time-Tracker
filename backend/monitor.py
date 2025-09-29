import time
import psutil
import requests
import ctypes
import os
import re
from datetime import datetime, timedelta
from math import ceil

# 导入应用标识符类
from enhanced_app_identifier import EnhancedAppIdentifier
# 导入数据库工具
import db_utils
from db_utils import log_usage, load_settings
# 导入增强监控器
from enhanced_monitor import EnhancedMonitor

# ========== 配置 ==========
CHECK_INTERVAL = 30  # 秒
IDLE_THRESHOLD = 60  # 秒，超过认为挂机
LOG_API = "http://localhost:30022/api/logs"  # 日志API地址

# ========== 全局状态 ==========
reward_period = None       # 奖励时间段信息
idle_start = None          # 挂机开始时间
app_identifier = None      # 应用标识符实例
process_identifier_cache = {}  # 进程ID到标识符的缓存
current_exe = None         # 当前前台应用
current_pid = None         # 当前前台应用进程ID
current_identifier = None  # 当前前台应用标识符
enhanced_monitors = {}     # 增强监控器实例字典，按PID管理

# ========== 工具函数 ==========
def send_log(message, exe="", type="info"):
    """发送日志到前端 API"""
    try:
        data = {
            "time": datetime.now().strftime("%H:%M:%S"),
            "type": type,
            "exe": exe,
            "message": message,
        }
        requests.post(LOG_API, json=data, timeout=2)
    except Exception as e:
        print("日志发送失败:", e, message)

def get_foreground_app():
    """获取当前前台应用的进程信息（进程ID和可执行文件路径）"""
    try:
        user32 = ctypes.windll.user32
        hwnd = user32.GetForegroundWindow()
        pid = ctypes.c_ulong()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        proc = psutil.Process(pid.value)
        return {
            "pid": pid.value,
            "name": proc.name(),
            "path": proc.exe() if hasattr(proc, 'exe') else ""
        }
    except Exception as e:
        print(f"获取前台应用失败: {e}")
        return None

def is_idle():
    """检测是否空闲（键鼠无输入超过阈值）"""
    class LASTINPUTINFO(ctypes.Structure):
        _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_uint)]
    lii = LASTINPUTINFO()
    lii.cbSize = ctypes.sizeof(LASTINPUTINFO)
    if ctypes.windll.user32.GetLastInputInfo(ctypes.byref(lii)):
        millis = ctypes.windll.kernel32.GetTickCount() - lii.dwTime
        return millis >= IDLE_THRESHOLD * 1000, millis // 1000
    return False, 0

def get_enhanced_monitor(pid, process_name=""):
    """获取或创建指定PID的增强监控器实例"""
    global enhanced_monitors
    if pid not in enhanced_monitors:
        # 导入去抖配置
        try:
            from .debounce_config import get_debounce_config, determine_app_type
            app_type = determine_app_type(process_name)
            debounce_config = get_debounce_config(app_type)
            start_req = debounce_config["start_req"]
            stop_req = debounce_config["stop_req"]
        except ImportError:
            # 如果配置文件不存在，使用默认值
            start_req = 2
            stop_req = 3
            
        # 创建新的增强监控器实例
        enhanced_monitors[pid] = EnhancedMonitor(
            pid, 
            interval=1.0, 
            v_thresh=0.3,
            start_req=start_req,
            stop_req=stop_req
        )
    return enhanced_monitors[pid]

def cleanup_monitors():
    """清理不再需要的监控器实例"""
    global enhanced_monitors, current_pid
    # 保留当前PID的监控器，删除其他所有监控器
    if current_pid and current_pid in enhanced_monitors:
        # 只保留当前PID的监控器
        current_monitor = enhanced_monitors[current_pid]
        enhanced_monitors = {current_pid: current_monitor}
    else:
        # 如果没有当前PID，清空所有监控器
        enhanced_monitors = {}

# ========== 挂机逻辑 ==========
def handle_idle_start(app_info=None):
    """记录挂机开始"""
    global idle_start
    if idle_start is None:
        idle_start = datetime.now()
        exe_name = app_info.get("name", "") if app_info else ""
        if exe_name:
            # 检查应用类型
            if app_info and "pid" in app_info and "path" in app_info:
                identifier = get_app_identifier(app_info["pid"], app_info["name"], app_info["path"])
                list_type = match_against_lists(identifier["value"])
                if list_type == "whitelist":
                    send_log(f"用户开始挂机（白名单应用：{exe_name}）", exe=exe_name)
                elif list_type == "blacklist":
                    send_log(f"用户开始挂机（黑名单应用：{exe_name}）", exe=exe_name)
                else:
                    send_log(f"用户开始挂机（应用：{exe_name}）", exe=exe_name)
            else:
                send_log(f"用户开始挂机（应用：{exe_name}）", exe=exe_name)
        else:
            send_log("用户开始挂机")

def handle_idle_end(app_info=None):
    """挂机结束，更新黑名单累计"""
    global idle_start, reward_period
    if not idle_start:
        return
    now = datetime.now()
    idle_duration = (now - idle_start).total_seconds()
    idle_start = None
    
    # 从app_info获取应用信息
    exe_name = app_info.get("name", "") if app_info else ""
    list_type = ""
    
    # 获取应用类型
    if app_info and "pid" in app_info and "path" in app_info:
        identifier = get_app_identifier(app_info["pid"], app_info["name"], app_info["path"])
        list_type = match_against_lists(identifier["value"])
    
    # 根据应用类型记录日志
    if list_type == "whitelist":
        send_log(f"挂机结束，本次挂机 {int(idle_duration//60)} 分钟（白名单应用：{exe_name}）", exe=exe_name)
    elif list_type == "blacklist":
        send_log(f"挂机结束，本次挂机 {int(idle_duration//60)} 分钟（黑名单应用：{exe_name}）", exe=exe_name)
    else:
        send_log(f"挂机结束，本次挂机 {int(idle_duration//60)} 分钟（应用：{exe_name}）", exe=exe_name)
    
    # 黑名单应用累计
    if reward_period and list_type == "blacklist" and now < reward_period["end"]:
        counted = min(int(idle_duration), 180)  # 黑名单最多计入3分钟
        reward_period["black_usage"][exe_name] = reward_period["black_usage"].get(exe_name, 0) + counted
        send_log(f"黑名单挂机计入 {counted//60} 分钟", exe=exe_name)

# ========== 奖励时间段相关 ==========
def start_reward(minutes):
    """启动奖励时间段"""
    global reward_period, idle_start
    reward_period = {
        "start": datetime.now(),
        "end": datetime.now() + timedelta(minutes=minutes),
        "black_usage": {}
    }
    idle_start = None
    send_log(f"奖励时间段开始 {minutes} 分钟，结束时间: {reward_period['end'].strftime('%H:%M')}", type="info")

def finalize_reward_period():
    """奖励时间段结束，统一扣除黑名单使用"""
    global reward_period
    if not reward_period:
        return

    total_seconds = sum(reward_period["black_usage"].values())
    reward_duration = (reward_period["end"] - reward_period["start"]).seconds // 60
    deducted_minutes = min(ceil(total_seconds / 60), reward_duration)

    if deducted_minutes > 0:
        send_log(f"奖励结束，黑名单累计使用 {total_seconds//60} 分钟，扣除 {deducted_minutes} 分钟奖励", type="error")
    else:
        send_log("奖励结束，无黑名单使用", type="info")

    reward_period = None

# ========== 主循环 ==========
def monitor_loop():
    global reward_period, app_identifier, current_exe, current_pid, current_identifier
    
    # 初始化应用标识符
    app_identifier = EnhancedAppIdentifier()
    send_log("监控已启动，应用标识符已初始化", type="info")

    while True:
        try:
            # 检查是否空闲
            idle, idle_seconds = is_idle()
            
            # 获取前台应用信息
            foreground_app = get_foreground_app()
            
            # 应用切换检测
            app_switched = False
            if foreground_app and (
                foreground_app["name"] != current_exe or 
                foreground_app["pid"] != current_pid
            ):
                app_switched = True
                # 记录上一个应用的使用
                if current_exe and current_identifier:
                    # 如果有之前的PID，清理不再需要的监控器
                    cleanup_monitors()
                
                # 更新当前应用信息
                current_exe = foreground_app["name"]
                current_pid = foreground_app["pid"]
                current_path = foreground_app["path"]
                
                # 获取应用标识符
                if app_switched:
                    current_identifier = get_app_identifier(current_pid, current_exe, current_path)
                    
                    # 获取增强监控器实例
                    if current_pid:
                        monitor = get_enhanced_monitor(current_pid, current_exe)
                        # 重置监控器计数器，因为这是新应用
                        monitor.reset_counts()
                    
                    # 检查是否匹配黑白名单
                    list_type = match_against_lists(current_identifier["value"])
                    
                    # 记录日志
                    if list_type == "blacklist":
                        send_log(f"切换到黑名单应用: {current_exe} (标识: {current_identifier['value']}, 类型: {current_identifier['type']})", 
                               exe=current_exe, type="warning")
                    elif list_type == "whitelist":
                        send_log(f"切换到白名单应用: {current_exe} (标识: {current_identifier['value']}, 类型: {current_identifier['type']})", 
                               exe=current_exe)
                    else:
                        send_log(f"切换到应用: {current_exe} (标识: {current_identifier['value']}, 类型: {current_identifier['type']})", 
                               exe=current_exe)
            
            # 挂机处理
            if idle:
                if foreground_app:
                    handle_idle_start(foreground_app)
                time.sleep(CHECK_INTERVAL)
                continue
            else:
                if idle_start and foreground_app:
                    handle_idle_end(foreground_app)

            # 应用使用统计
            now = datetime.now()
            if reward_period:
                # 奖励时间段结束检查
                if now >= reward_period["end"]:
                    finalize_reward_period()
                    continue
                
                # 检查当前应用是否在黑名单中
                if current_exe and current_identifier and match_against_lists(current_identifier["value"]) == "blacklist":
                    reward_period["black_usage"][current_exe] = reward_period["black_usage"].get(current_exe, 0) + CHECK_INTERVAL
                    send_log(f"用户使用黑名单应用 {current_exe}，累计 {reward_period['black_usage'][current_exe]//60} 分钟", exe=current_exe, type="warning")
                # 白名单应用不需要特别处理

        except Exception as e:
            send_log(f"监控出错: {e}", type="error")

        time.sleep(CHECK_INTERVAL)

# ========== 测试启动 ==========
if __name__ == "__main__":
    start_reward(20)  # 测试：启动20分钟奖励
    monitor_loop()

def get_app_identifier(pid, process_name, executable_path):
    """
    获取应用程序的唯一标识符，按照优先级顺序：
    1. APPID/Package ID
    2. 产品名称 + "//" + 数字签名(签名者姓名)
    3. exe文件完整路径
    4. exe文件名称
    
    首次切换软件时获取并存储到数据库，之后从缓存获取
    """
    # 检查进程级缓存
    if pid in process_identifier_cache:
        return process_identifier_cache[pid]
    
    # 获取应用识别信息
    app_info = app_identifier.identify_app(process_name, executable_path)
    
    # 初始化标识符
    identifier = {
        "value": None,
        "type": "未知"  # 默认设置为未知类型
    }
    
    # 优先级1: 尝试获取APPID/Package ID（Windows Store应用）
    # 注：这里简化处理，实际Windows API获取APPID可能需要更复杂的实现
    # 此处仅作为示例框架
    # TODO: 实现Windows Store应用的APPID获取逻辑
    
    # 优先级2: 如果identify_app已经识别为数字签名，则使用其结果
    if (app_info.get("identifier_type") == "数字签名" and 
        app_info.get("unique_id") and 
        "//" in app_info.get("unique_id") and
        app_info.get("unique_id") != "None//None"):
        identifier["value"] = app_info["unique_id"]
        identifier["type"] = "数字签名"
    
    # 优先级3: 产品名称 + "//" + 数字签名（备用方案）
    elif app_info.get("version_info") and app_info["version_info"].get("product_name"):
        product_name = app_info["version_info"]["product_name"]
        # 尝试获取签名者信息
        # 简化处理：使用公司名称作为签名者标识
        signer = app_info["version_info"].get("company_name", "")
        if product_name and signer:
            identifier["value"] = f"{product_name}//{signer}"
            identifier["type"] = "数字签名"
    
    # 优先级4: exe文件完整路径
    elif executable_path:
        identifier["value"] = executable_path
        identifier["type"] = "文件路径"
    
    # 优先级5: exe文件名称
    else:
        identifier["value"] = process_name
        identifier["type"] = "文件名"
    
    # 确保标识符值不为空
    if not identifier["value"]:
        identifier["value"] = f"unknown_{pid}"
        identifier["type"] = "未知"
    
    # 检查数据库中是否已存在该标识符
    try:
        if not db_utils.check_app_identifier_exists(identifier["value"], identifier["type"]):
            # 如果数据库中不存在，则存储
            db_utils.store_app_identifier(pid, identifier["value"], identifier["type"])
            print(f"新应用标识符存储: {identifier['value']} ({identifier['type']})")
    except Exception as e:
        print(f"数据库操作失败: {e}")
    
    # 存储到进程级缓存
    process_identifier_cache[pid] = identifier
    
    return identifier

def match_against_lists(identifier_value):
    """检查标识符是否匹配黑白名单"""
    settings = load_settings()
    blacklist = settings.get("blacklist", [])
    whitelist = settings.get("whitelist", [])
    
    # 提取黑白名单中的标识符值列表
    blacklist_values = [item.get("exe_name") or item.get("value") for item in blacklist]
    whitelist_values = [item.get("exe_name") or item.get("value") for item in whitelist]
    
    # 检查通配符匹配
    for pattern in blacklist_values:
        if pattern and wildcard_match(pattern, identifier_value):
            return "blacklist"
    
    for pattern in whitelist_values:
        if pattern and wildcard_match(pattern, identifier_value):
            return "whitelist"
    
    return "neutral"

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
    # 转义特殊字符
    regex_pattern = re.escape(pattern)
    # 将转义后的通配符替换回正则表达式模式
    regex_pattern = regex_pattern.replace(r'\\*', '.*').replace(r'\\?', '.')
    # 添加开头和结尾锚点，确保完全匹配
    regex_pattern = f"^{regex_pattern}$"
    
    # 进行大小写不敏感匹配
    return bool(re.match(regex_pattern, text, re.IGNORECASE))
