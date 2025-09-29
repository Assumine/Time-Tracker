import unittest
from improved_app_identifier import AppIdentifier

class TestAppMatching(unittest.TestCase):
    """应用匹配规则测试类"""
    
    def setUp(self):
        """测试初始化"""
        self.app_id = AppIdentifier()
    
    def test_whitelist_matching_all_rules(self):
        """测试白名单匹配：所有规则都必须匹配"""
        # 识别Chrome浏览器
        chrome_info = self.app_id.identify_app("chrome.exe", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
        
        # 白名单规则：产品名称和公司名称都匹配
        whitelist_rules_all_match = [
            {
                "product_name": "Google Chrome",
                "company_name": "Google LLC"
            }
        ]
        
        # 应该匹配成功
        result = self.app_id.match_against_rules(chrome_info, whitelist_rules_all_match, "whitelist")
        self.assertTrue(result, "白名单应该匹配成功")
        
        # 白名单规则：一条规则匹配，一条不匹配
        whitelist_rules_partial_match = [
            {
                "product_name": "Google Chrome",
                "company_name": "Google LLC"
            },
            {
                "product_name": "Non-existent Product"
            }
        ]
        
        # 应该匹配失败（白名单需要所有规则都匹配）
        result = self.app_id.match_against_rules(chrome_info, whitelist_rules_partial_match, "whitelist")
        self.assertFalse(result, "白名单应该匹配失败，因为不是所有规则都匹配")
    
    def test_blacklist_matching_any_rule(self):
        """测试黑名单匹配：任一规则匹配即可"""
        # 识别记事本应用
        notepad_info = self.app_id.identify_app("notepad.exe", "C:\\Windows\\System32\\notepad.exe")
        
        # 黑名单规则：进程名匹配
        blacklist_rules_process_match = [
            {
                "process_name": "notepad.exe"
            }
        ]
        
        # 应该匹配成功
        result = self.app_id.match_against_rules(notepad_info, blacklist_rules_process_match, "blacklist")
        self.assertTrue(result, "黑名单应该匹配成功")
        
        # 黑名单规则：一条规则匹配，一条不匹配
        blacklist_rules_mixed = [
            {
                "process_name": "notepad.exe"
            },
            {
                "product_name": "Non-existent Product"
            }
        ]
        
        # 应该匹配成功（黑名单只需要任一规则匹配）
        result = self.app_id.match_against_rules(notepad_info, blacklist_rules_mixed, "blacklist")
        self.assertTrue(result, "黑名单应该匹配成功，因为至少有一条规则匹配")
    
    def test_no_match_scenarios(self):
        """测试不匹配场景"""
        # 识别记事本应用
        notepad_info = self.app_id.identify_app("notepad.exe", "C:\\Windows\\System32\\notepad.exe")
        
        # 规则：不匹配的进程名
        non_matching_rules = [
            {
                "process_name": "nonexistent.exe"
            }
        ]
        
        # 白名单应该不匹配
        whitelist_result = self.app_id.match_against_rules(notepad_info, non_matching_rules, "whitelist")
        self.assertFalse(whitelist_result, "白名单应该不匹配")
        
        # 黑名单也应该不匹配
        blacklist_result = self.app_id.match_against_rules(notepad_info, non_matching_rules, "blacklist")
        self.assertFalse(blacklist_result, "黑名单应该不匹配")

if __name__ == "__main__":
    unittest.main()