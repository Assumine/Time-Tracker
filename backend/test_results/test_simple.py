import sys
import os
sys.path.append(os.path.dirname(__file__))

try:
    from enhanced_app_identifier import EnhancedAppIdentifier
    print("成功导入EnhancedAppIdentifier")
    
    # 创建应用标识符实例
    app_id = EnhancedAppIdentifier()
    print("成功创建应用标识符实例")
    
    # 测试识别应用
    result = app_id.identify_app("notepad.exe")
    print(f"测试结果: {result}")
    
except Exception as e:
    print(f"导入或测试过程中出现错误: {e}")
    import traceback
    traceback.print_exc()