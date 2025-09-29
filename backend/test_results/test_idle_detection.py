import time
import ctypes
from datetime import datetime

def simulate_idle():
    """模拟挂机状态"""
    print("开始模拟挂机状态...")
    print("请不要操作鼠标和键盘，等待60秒以上...")
    
    # 循环检测系统空闲状态
    start_time = time.time()
    while True:
        try:
            class LASTINPUTINFO(ctypes.Structure):
                _fields_ = [("cbSize", ctypes.c_uint), ("dwTime", ctypes.c_uint)]
            lii = LASTINPUTINFO()
            lii.cbSize = ctypes.sizeof(LASTINPUTINFO)
            if ctypes.windll.user32.GetLastInputInfo(ctypes.byref(lii)):
                millis = ctypes.windll.kernel32.GetTickCount() - lii.dwTime
                idle_seconds = millis // 1000
                elapsed = time.time() - start_time
                print(f"系统空闲时间: {idle_seconds} 秒, 脚本运行时间: {int(elapsed)} 秒", end='\r')
                
                # 如果空闲时间超过65秒，则停止模拟
                if idle_seconds > 65:
                    print(f"\n挂机检测应该已经触发！空闲时间: {idle_seconds} 秒")
                    break
                    
        except Exception as e:
            print(f"检测出错: {e}")
            
        time.sleep(1)

def simulate_activity():
    """模拟活动状态（需要手动操作）"""
    print("现在请正常操作鼠标和键盘，观察挂机状态是否解除...")
    print("观察几秒钟后按 Ctrl+C 停止脚本")

if __name__ == "__main__":
    print("挂机检测测试脚本")
    print("=" * 30)
    
    # 先模拟挂机
    simulate_idle()
    
    # 然后提示用户恢复正常操作
    simulate_activity()