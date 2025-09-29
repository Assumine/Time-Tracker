import sys
import os

# 获取当前工作目录
print(f"当前工作目录: {os.getcwd()}")

# 获取db_utils.py文件的路径
db_utils_path = os.path.join(os.path.dirname(__file__), 'db_utils.py')
print(f"db_utils.py路径: {db_utils_path}")
print(f"db_utils.py是否存在: {os.path.exists(db_utils_path)}")

# 添加backend目录到Python路径
backend_dir = os.path.dirname(__file__)
print(f"添加到Python路径: {backend_dir}")
sys.path.insert(0, backend_dir)

try:
    # 尝试导入db_utils
    import db_utils
    print("成功导入db_utils模块")
    print(f"db_utils模块文件: {db_utils.__file__}")
    
    # 检查DB_FILE变量
    print(f"DB_FILE变量: {db_utils.DB_FILE}")
    
    # 检查当前目录下的数据库文件
    local_db = os.path.join(os.getcwd(), db_utils.DB_FILE)
    backend_db = os.path.join(backend_dir, db_utils.DB_FILE)
    print(f"当前目录下的数据库文件: {local_db}, 存在: {os.path.exists(local_db)}")
    print(f"backend目录下的数据库文件: {backend_db}, 存在: {os.path.exists(backend_db)}")
    
    # 调用get_recent_logs函数
    print("调用get_recent_logs函数...")
    logs = db_utils.get_recent_logs(5)
    print(f"成功获取日志，记录数: {len(logs)}")
    
    # 打印前几条日志
    print("前5条日志:")
    for i, log in enumerate(logs[:5]):
        print(f"  {i+1}. {log}")
        
except Exception as e:
    print(f"调用get_recent_logs函数时出错: {e}")
    import traceback
    traceback.print_exc()