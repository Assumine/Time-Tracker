import sys
import os
sys.path.append(os.path.dirname(__file__))

try:
    from enhanced_app_identifier import EnhancedAppIdentifier
    print("成功导入EnhancedAppIdentifier")
    
    # 创建应用标识符实例
    app_id = EnhancedAppIdentifier()
    print("成功创建应用标识符实例")
    
    # 测试识别应用（不带路径）
    result1 = app_id.identify_app("notepad.exe")
    print(f"不带路径测试结果: {result1}")
    
    # 测试识别应用（带路径）
    notepad_path = r"C:\Windows\System32\notepad.exe"
    result2 = app_id.identify_app("notepad.exe", notepad_path)
    print(f"带路径测试结果: {result2}")
    
    if result2.get("unique_id"):
        print(f"成功生成唯一标识符: {result2['unique_id']}")
        print(f"置信度级别: {result2['confidence_level']}")
    else:
        print("未能生成唯一标识符")
    
except Exception as e:
    print(f"导入或测试过程中出现错误: {e}")
    import traceback
    traceback.print_exc()