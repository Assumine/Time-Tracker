import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from enhanced_app_identifier import EnhancedAppIdentifier

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