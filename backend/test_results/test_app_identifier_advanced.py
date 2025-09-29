import sys
import os
import psutil
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from enhanced_app_identifier import EnhancedAppIdentifier

def get_process_executable(process_name):
    """通过进程名获取可执行文件路径"""
    try:
        for proc in psutil.process_iter(['name', 'exe']):
            if proc.info['name'] == process_name:
                return proc.info['exe']
    except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
        pass
    return None

def test_app_identifier():
    """测试应用标识符功能"""
    print("测试应用标识符功能...")
    
    # 创建应用标识符实例
    app_id = EnhancedAppIdentifier()
    
    # 测试几个常见的应用
    test_apps = [
        "notepad.exe",
        "chrome.exe",
        "msedge.exe",
        "firefox.exe"
    ]
    
    for app_name in test_apps:
        print(f"\n测试应用: {app_name}")
        # 尝试获取进程的可执行文件路径
        exe_path = get_process_executable(app_name)
        if exe_path:
            print(f"  可执行文件路径: {exe_path}")
            result = app_id.identify_app(app_name, exe_path)
        else:
            print(f"  未找到运行中的 {app_name} 进程，仅使用进程名识别")
            result = app_id.identify_app(app_name)
            
        print(f"  唯一标识符: {result.get('unique_id')}")
        print(f"  置信度级别: {result.get('confidence_level')}")
        print(f"  显示名称: {result.get('display_name', 'N/A')}")
        
        if result.get('version_info'):
            version_info = result['version_info']
            print(f"  产品名称: {version_info.get('product_name', 'N/A')}")
            print(f"  公司名称: {version_info.get('company_name', 'N/A')}")
            print(f"  文件版本: {version_info.get('file_version', 'N/A')}")

if __name__ == "__main__":
    test_app_identifier()