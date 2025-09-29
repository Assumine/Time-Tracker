import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from main import wildcard_match
import backend.db_utils as db_utils

def test_wildcard_matching():
    """测试通配符匹配功能"""
    print("=== 测试通配符匹配功能 ===")
    
    # 测试精确匹配
    assert wildcard_match("notepad.exe", "notepad.exe") == True
    assert wildcard_match("notepad.exe", "Notepad.exe") == True  # 大小写不敏感
    assert wildcard_match("notepad.exe", "notepad.exe.backup") == False
    print("✓ 精确匹配测试通过")
    
    # 测试通配符匹配
    assert wildcard_match("*.exe", "notepad.exe") == True
    assert wildcard_match("*.exe", "calc.exe") == True
    assert wildcard_match("*.exe", "document.txt") == False
    assert wildcard_match("C:\\Program Files\\*", "C:\\Program Files\\Google\\Chrome\\chrome.exe") == True
    assert wildcard_match("C:\\Program Files\\*", "C:\\Windows\\notepad.exe") == False
    print("✓ 通配符匹配测试通过")
    
def test_black_white_list_matching():
    """测试黑白名单匹配和优先级"""
    print("\n=== 测试黑白名单匹配和优先级 ===")
    
    # 设置黑白名单规则
    blacklist = [
        {"exe_name": "*.exe", "app_name": ""},  # 所有exe文件
        {"exe_name": "", "app_name": "C:\\Games\\*"}  # 所有游戏目录
    ]
    
    whitelist = [
        {"exe_name": "浏览器.exe", "app_name": ""},  # 特定浏览器
        {"exe_name": "", "app_name": "*\\notepad.exe"}  # 所有notepad.exe
    ]
    
    # 保存到数据库
    db_utils.save_settings({
        "workPeriods": [],
        "blacklist": blacklist,
        "whitelist": whitelist
    })
    
    # 获取黑白名单
    actual_blacklist = db_utils.get_blacklist()
    actual_whitelist = db_utils.get_whitelist()
    
    print(f"黑名单规则: {actual_blacklist}")
    print(f"白名单规则: {actual_whitelist}")
    
    # 测试应用
    test_cases = [
        {"name": "游戏.exe", "path": "C:\\Games\\game.exe", "expected": "黑名单"},
        {"name": "浏览器.exe", "path": "C:\\Program Files\\Browser\\browser.exe", "expected": "白名单"},
        {"name": "记事本.exe", "path": "C:\\Windows\\System32\\notepad.exe", "expected": "白名单"},
        {"name": "文本编辑器.exe", "path": "D:\\Apps\\editor.exe", "expected": "黑名单"},
        {"name": "特殊应用.exe", "path": "D:\\Apps\\special.exe", "expected": "黑名单"},
        {"name": "音乐播放器.exe", "path": "D:\\Music\\player.exe", "expected": "黑名单"}
    ]
    
    # 测试每个应用
    for case in test_cases:
        app_name = case['name']
        app_path = case['path']
        expected = case['expected']
        
        # 检查是否在白名单中
        is_whitelisted = False
        for w_exe, w_title in actual_whitelist:
            if (wildcard_match(w_exe, app_name) or 
                (w_title and wildcard_match(w_title, app_path))):
                is_whitelisted = True
                break
        
        # 检查是否在黑名单中（仅当不在白名单中时）
        is_blacklisted = False
        if not is_whitelisted:
            for b_exe, b_title in actual_blacklist:
                if (wildcard_match(b_exe, app_name) or 
                    (b_title and wildcard_match(b_title, app_path))):
                    is_blacklisted = True
                    break
        
        result = "白名单" if is_whitelisted else ("黑名单" if is_blacklisted else "普通")
        status = "✓" if result == expected else "✗"
        print(f"{status} 应用 {app_name} ({app_path}) -> {result} (期望: {expected})")

if __name__ == "__main__":
    test_wildcard_matching()
    test_black_white_list_matching()
    print("\n=== 所有测试完成 ===")