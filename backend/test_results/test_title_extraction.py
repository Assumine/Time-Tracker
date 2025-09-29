# 从main.py导入extract_app_title函数
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# 重新定义extract_app_title函数以避免导入问题
def extract_app_title(exe_name, window_title):
    """
    智能提取应用标题，根据程序名和窗口标题的匹配情况来提取更准确的应用名称
    
    Args:
        exe_name (str): 程序名，如 "Trae CN.exe"
        window_title (str): 窗口标题，如 "预览 - 无标题 (工作区) - Trae CN"
        
    Returns:
        str: 提取后的应用标题
    """
    # 获取不带扩展名的程序名
    exe_base_name = exe_name.rsplit('.', 1)[0] if '.' in exe_name else exe_name
    
    # 1. 如果窗口标题中包含程序名（不区分大小写），则使用程序名作为标题
    if exe_base_name.lower() in window_title.lower():
        # 找到匹配的部分并返回原始大小写形式
        # 在窗口标题中找到程序名的准确位置
        lower_window = window_title.lower()
        lower_exe = exe_base_name.lower()
        start_idx = lower_window.find(lower_exe)
        if start_idx != -1:
            # 返回窗口标题中与程序名匹配的部分（保持原始大小写）
            return window_title[start_idx:start_idx + len(exe_base_name)]
    
    # 2. 如果窗口标题中包含程序名的大写形式，则使用程序名作为标题
    if exe_base_name.upper() in window_title:
        return exe_base_name
    
    # 3. 如果无相同，按照优先顺序取标题
    # 3.1 如果窗口标题中有"-"符号，取最后一个"-"符号后的内容
    if "-" in window_title:
        parts = window_title.split("-")
        if len(parts) > 1:
            return parts[-1].strip()
    
    # 3.2 如果无相同，返回程序名（不带扩展名）
    return exe_base_name

# 测试用例
test_cases = [
    # 情况1: 窗口标题中包含程序名（完全匹配）
    ('Trae CN.exe', '预览 - 无标题 (工作区) - Trae CN'),
    
    # 情况2: 窗口标题中包含程序名（部分匹配）
    ('Trae.exe', '预览 - 无标题 (工作区) - Trae CN'),
    
    # 情况3: 窗口标题中包含程序名（大小写不同）
    ('trae.exe', '预览 - 无标题 (工作区) - Trae CN'),
    
    # 情况4: 无相同，但有"-"符号
    ('trae.exe', '预览 - 无标题 (工作区) - abc'),
    
    # 情况5: 无相同，无"-"符号
    ('trae.exe', '预览 无标题 (工作区)'),
    
    # 额外测试用例
    ('chrome.exe', 'GitHub - Google Chrome'),
    ('firefox.exe', 'Stack Overflow - Mozilla Firefox'),
    ('code.exe', 'main.py - Trae CN - Visual Studio Code'),
    ('notepad.exe', '无标题 - 记事本')
]

print("标题提取测试结果:")
print("=" * 60)
for exe, title in test_cases:
    result = extract_app_title(exe, title)
    print(f'程序名: {exe}')
    print(f'标题: {title}')
    print(f'提取结果: {result}')
    print("-" * 60)