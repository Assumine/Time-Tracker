import ctypes
from ctypes import wintypes
import time
from collections import deque
from threading import Thread, Event
import psutil
from datetime import datetime

# pycaw for audio
try:
    from pycaw.pycaw import AudioUtilities, IAudioMeterInformation
    from comtypes import CLSCTX_ALL
    PYCaw_AVAILABLE = True
except Exception:
    PYCaw_AVAILABLE = False

# Win32 APIs (ctypes)
user32 = ctypes.windll.user32
EnumWindows = user32.EnumWindows
GetWindowThreadProcessId = user32.GetWindowThreadProcessId
IsWindowVisible = user32.IsWindowVisible
GetWindowRect = user32.GetWindowRect
GetForegroundWindow = user32.GetForegroundWindow
GetTopWindow = user32.GetTopWindow
GetWindow = user32.GetWindow
GW_HWNDNEXT = 2

class RECT(ctypes.Structure):
    _fields_ = [('left', wintypes.LONG),
                ('top', wintypes.LONG),
                ('right', wintypes.LONG),
                ('bottom', wintypes.LONG)]

def rect_area(r: RECT):
    """计算矩形面积"""
    w = max(0, r.right - r.left)
    h = max(0, r.bottom - r.top)
    return w * h

def intersect_rect(a: RECT, b: RECT):
    """计算两个矩形的交集"""
    left = max(a.left, b.left)
    right = min(a.right, b.right)
    top = max(a.top, b.top)
    bottom = min(a.bottom, b.bottom)
    if right <= left or bottom <= top:
        return None
    return RECT(left, top, right, bottom)

def enum_windows_cached():
    """缓存枚举所有顶层窗口"""
    hwnds = []
    @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    def enum_proc(hwnd, lParam):
        hwnds.append(hwnd)
        return True
    EnumWindows(enum_proc, 0)
    return hwnds

def get_hwnds_for_pid(pid):
    """根据进程ID获取其所有顶层窗口句柄"""
    res = []
    @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    def _enum(hwnd, lparam):
        tid = wintypes.DWORD()
        GetWindowThreadProcessId(hwnd, ctypes.byref(tid))
        if tid.value == pid:
            res.append(hwnd)
        return True
    EnumWindows(_enum, 0)
    return res

def get_windows_above(target_hwnd, all_top_hwnds):
    """获取在目标窗口之上的所有窗口（按z-order）"""
    res = []
    for hwnd in all_top_hwnds:
        if hwnd == target_hwnd:
            break
        res.append(hwnd)
    return res

def union_area_of_intersections(target_rect: RECT, inter_rects):
    """
    计算交集矩形的并集面积
    使用扫描线算法实现，避免引入重量级几何库
    """
    if not inter_rects:
        return 0
    # 收集唯一的y坐标
    ys = set()
    for r in inter_rects:
        ys.add(r.top)
        ys.add(r.bottom)
    ys = sorted(ys)
    total = 0
    for i in range(len(ys)-1):
        y0, y1 = ys[i], ys[i+1]
        if y1 <= y0: 
            continue
        # 收集此扫描线上的水平线段
        segs = []
        for r in inter_rects:
            if r.top <= y0 and r.bottom >= y1:
                segs.append((r.left, r.right))
        if not segs:
            continue
        # 合并线段
        segs.sort()
        merged_left, merged_right = segs[0]
        cover = 0
        for (l, r) in segs[1:]:
            if r <= merged_right:
                continue
            if l <= merged_right:
                merged_right = r
            else:
                cover += (merged_right - merged_left)
                merged_left, merged_right = l, r
        cover += (merged_right - merged_left)
        total += cover * (y1 - y0)
    return total

def visible_area_of_hwnd(hwnd, all_top_hwnds, screen_rect):
    """计算窗口的可见面积"""
    if not IsWindowVisible(hwnd):
        return 0
    r = RECT()
    if not GetWindowRect(hwnd, ctypes.byref(r)):
        return 0
    # 裁剪到屏幕
    target = intersect_rect(r, screen_rect)
    if not target:
        return 0
    target_area = rect_area(target)
    if target_area == 0:
        return 0

    # 收集目标窗口与上方窗口的交集（限制前8个）
    above = get_windows_above(hwnd, all_top_hwnds)
    inters = []
    MAX_ABOVE = 8
    count = 0
    for aw in above:
        if count >= MAX_ABOVE:
            break
        if not IsWindowVisible(aw):
            continue
        other_r = RECT()
        if not GetWindowRect(aw, ctypes.byref(other_r)):
            continue
        inter = intersect_rect(target, other_r)
        if inter:
            inters.append(inter)
            count += 1

    overlap_area = union_area_of_intersections(target, inters)
    visible = max(0, target_area - overlap_area)
    return visible

def pid_is_playing_audio(pid, threshold=0.001):
    """检测进程是否有音频播放"""
    if not PYCaw_AVAILABLE:
        return False
    sessions = AudioUtilities.GetAllSessions()
    for s in sessions:
        proc = s.Process
        if proc and proc.pid == pid:
            try:
                meter = s._ctl.QueryInterface(IAudioMeterInformation)
                peak = meter.GetPeakValue()
                if peak and peak > threshold:
                    return True
            except Exception:
                continue
    return False

def get_primary_monitor_rect():
    """获取主显示器的矩形区域"""
    from ctypes import windll
    SM_CXSCREEN = 0
    SM_CYSCREEN = 1
    cx = windll.user32.GetSystemMetrics(SM_CXSCREEN)
    cy = windll.user32.GetSystemMetrics(SM_CYSCREEN)
    return RECT(0, 0, cx, cy)

class EnhancedMonitor:
    """
    增强的监控器类，用于检测应用程序是否应该计时
    使用可见性检测和音频检测来判断应用是否处于活跃状态
    """
    
    def __init__(self, pid, interval=1.0, v_thresh=0.1, start_req=2, stop_req=3):
        """
        初始化监控器
        
        Args:
            pid: 要监控的进程ID
            interval: 检测间隔（秒）
            v_thresh: 可见面积阈值（0-1之间）
            start_req: 开始计时所需的连续判定次数
            stop_req: 停止计时所需的连续判定次数
        """
        self.pid = pid
        self.interval = interval
        self.v_thresh = v_thresh
        self.start_req = start_req
        self.stop_req = stop_req
        self._stop = Event()
        self._running = False
        self._start_count = 0
        self._stop_count = 0
        self._last_result = False

    def should_count_once(self):
        """
        单次检测是否应该计时
        检测顺序：前台窗口 -> 可见性 -> 音频播放
        """
        # 1) 前台窗口检查（快速路径）
        fg = GetForegroundWindow()
        if fg:
            tid = wintypes.DWORD()
            GetWindowThreadProcessId(fg, ctypes.byref(tid))
            if tid.value == self.pid:
                return True

        # 2) 枚举窗口并计算可见比例
        all_top = enum_windows_cached()
        hwnds = get_hwnds_for_pid(self.pid)
        screen_rect = get_primary_monitor_rect()
        
        for hwnd in hwnds:
            vis = visible_area_of_hwnd(hwnd, all_top, screen_rect)
            area = 0
            r = RECT()
            if GetWindowRect(hwnd, ctypes.byref(r)):
                rr = intersect_rect(r, screen_rect)
                if rr:
                    area = rect_area(rr)
            if area > 0:
                ratio = vis / area
                if ratio >= self.v_thresh:
                    return True

        # 3) 音频检查（后备方案）
        return pid_is_playing_audio(self.pid, threshold=0.001)

    def check_once(self):
        """
        执行一次检测并应用去抖策略
        返回是否应该计时的状态
        """
        should = self.should_count_once()
        
        if should:
            self._start_count += 1
            self._stop_count = 0
        else:
            self._stop_count += 1
            self._start_count = 0

        # 应用去抖策略
        if not self._running and self._start_count >= self.start_req:
            self._running = True
        if self._running and self._stop_count >= self.stop_req:
            self._running = False
            
        self._last_result = self._running
        return self._running

    def get_last_result(self):
        """获取上次检测的结果"""
        return self._last_result

    def reset_counts(self):
        """重置计数器"""
        self._start_count = 0
        self._stop_count = 0
        self._running = False
        self._last_result = False

# 测试代码
if __name__ == "__main__":
    # 获取当前Python进程的PID进行测试
    test_pid = psutil.Process().pid
    print(f"测试PID: {test_pid}")
    
    # 创建监控器实例
    monitor = EnhancedMonitor(test_pid, interval=1.0, v_thresh=0.3)
    
    print("开始监控测试（按Ctrl+C停止）...")
    try:
        while True:
            result = monitor.check_once()
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"[{timestamp}] 监控结果: {'应该计时' if result else '不应计时'}")
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n监控测试结束")