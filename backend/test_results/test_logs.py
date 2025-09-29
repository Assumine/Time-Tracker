import sys
import os

# 添加backend目录到Python路径
sys.path.append(os.path.join(os.path.dirname(__file__)))

try:
    from db_utils import get_recent_logs
    print("成功导入db_utils模块")
    
    # 调用get_recent_logs函数
    logs = get_recent_logs(50)
    print(f"成功获取日志，记录数: {len(logs)}")
    
    # 打印前几条日志
    print("前5条日志:")
    for i, log in enumerate(logs[:5]):
        print(f"  {i+1}. {log}")
        
except Exception as e:
    print(f"调用get_recent_logs函数时出错: {e}")
    import traceback
    traceback.print_exc()