import winreg
import win32api
import pefile
import os
import re
from cryptography.hazmat.primitives.serialization import pkcs7

class EnhancedAppIdentifier:
    """增强版应用唯一标识符识别类"""
    
    def __init__(self):
        self.installed_apps = self._get_installed_apps()
    
    def _get_installed_apps(self):
        """获取已安装应用程序列表"""
        apps = []
        reg_paths = [
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
            r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
        ]
        
        for reg_path in reg_paths:
            try:
                key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, reg_path)
                for i in range(0, winreg.QueryInfoKey(key)[0]):
                    subkey_name = winreg.EnumKey(key, i)
                    subkey_path = f"{reg_path}\\{subkey_name}"
                    try:
                        subkey = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, subkey_path)
                        display_name = winreg.QueryValueEx(subkey, "DisplayName")[0]
                        try:
                            display_version = winreg.QueryValueEx(subkey, "DisplayVersion")[0]
                        except FileNotFoundError:
                            display_version = "Unknown"
                        
                        try:
                            install_location = winreg.QueryValueEx(subkey, "InstallLocation")[0]
                        except FileNotFoundError:
                            install_location = "Unknown"
                        
                        apps.append({
                            "name": display_name,
                            "version": display_version,
                            "install_location": install_location
                        })
                        winreg.CloseKey(subkey)
                    except (WindowsError, FileNotFoundError):
                        continue
                winreg.CloseKey(key)
            except WindowsError:
                continue
        return apps
    
    def _get_file_version_info(self, filepath):
        """获取文件版本信息"""
        try:
            info = win32api.GetFileVersionInfo(filepath, '\\')
            lang, codepage = win32api.GetFileVersionInfo(filepath, '\\VarFileInfo\\Translation')[0]
            string_file_info = f'\\StringFileInfo\\{lang:04x}{codepage:04x}'
            product_name = win32api.GetFileVersionInfo(filepath, f'{string_file_info}\\ProductName')
            company_name = win32api.GetFileVersionInfo(filepath, f'{string_file_info}\\CompanyName')
            # 不获取文件版本信息，因为我们不需要在唯一标识符中包含版本号
            return {
                "product_name": product_name,
                "company_name": company_name
            }
        except Exception:
            return {}
    
    def _get_pe_signature(self, filepath):
        """获取PE文件数字签名状态"""
        try:
            # 使用PowerShell检查数字签名状态，这是最准确的方法
            import subprocess
            import json
            
            # PowerShell命令检查签名状态
            ps_command = f'''
            $sig = Get-AuthenticodeSignature -FilePath "{filepath}"
            if ($sig.Status -eq "Valid") {{
                "Signed"
            }} elseif ($sig.Status -eq "UnknownError" -or $sig.Status -eq "HashMismatch" -or $sig.Status -eq "NotSigned") {{
                "Unsigned"
            }} else {{
                "Unknown"
            }}
            '''
            
            # 执行PowerShell命令
            result = subprocess.run(
                ["powershell", "-Command", ps_command],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
            
            # 如果PowerShell方法失败，回退到其他方法
            # 首先尝试使用pywin32检查签名状态
            try:
                import win32api
                sig = win32api.GetFileVersionInfo(filepath, "\\")
                if sig:
                    # 使用WinVerifyTrust API检查签名
                    try:
                        import win32crypt
                        import win32con
                        from win32api import GetFileVersionInfo, VerQueryValue
                        # 获取文件版本信息
                        info = GetFileVersionInfo(filepath, "\\")
                        if info:
                            # 尝试验证签名
                            hfile = win32api.CreateFile(filepath, win32con.GENERIC_READ, win32con.FILE_SHARE_READ, None, win32con.OPEN_EXISTING, 0, None)
                            win32api.CloseHandle(hfile)
                            # 如果能成功打开文件，很可能有签名
                            return "Signed"
                    except:
                        pass
            except:
                pass
            
            # 然后尝试使用pefile检查嵌入签名
            try:
                pe = pefile.PE(filepath)
                security_dir = pe.OPTIONAL_HEADER.DATA_DIRECTORY[pefile.DIRECTORY_ENTRY['IMAGE_DIRECTORY_ENTRY_SECURITY']]
                
                # 检查安全目录是否有效（嵌入签名）
                if security_dir.VirtualAddress != 0 and security_dir.Size != 0:
                    # 获取数字签名数据并转换为bytes
                    data = bytes(pe.write()[security_dir.VirtualAddress:security_dir.VirtualAddress + security_dir.Size])
                    
                    # 跳过 WIN_CERTIFICATE 结构头（8字节长度 + 2字节修订版 + 2字节类型）
                    if len(data) >= 8:
                        pkcs7_data = bytes(data[8:])
                        
                        try:
                            # 解析 PKCS#7 签名块，获取证书列表
                            certs = pkcs7.load_der_pkcs7_certificates(pkcs7_data)
                            
                            if certs:
                                pe.close()
                                return "Signed"
                            pe.close()
                            return "Signed but no certificate found"
                        except Exception:
                            pe.close()
                            return "Signed but parse error"
                
                pe.close()
            except:
                pass
            
            return "Unsigned"
        except Exception:
            return "Unknown"
    
    def _extract_organization_from_signature(self, filepath):
        """从PE文件数字签名中提取组织名称"""
        try:
            pe = pefile.PE(filepath)
            security_dir = pe.OPTIONAL_HEADER.DATA_DIRECTORY[pefile.DIRECTORY_ENTRY['IMAGE_DIRECTORY_ENTRY_SECURITY']]
            
            # 检查安全目录是否有效
            if security_dir.VirtualAddress != 0 and security_dir.Size != 0:
                # 获取数字签名数据并转换为bytes
                data = bytes(pe.write()[security_dir.VirtualAddress:security_dir.VirtualAddress + security_dir.Size])
                
                # 跳过 WIN_CERTIFICATE 结构头（8字节长度 + 2字节修订版 + 2字节类型）
                if len(data) >= 8:
                    pkcs7_data = bytes(data[8:])
                    
                    try:
                        # 解析 PKCS#7 签名块，获取证书列表
                        certs = pkcs7.load_der_pkcs7_certificates(pkcs7_data)
                        
                        if certs:
                            # 获取第一个证书（通常是签名者的证书）
                            signer_cert = certs[0]
                            subject = signer_cert.subject.rfc4514_string()
                            
                            # 从主题中提取组织名称（O=字段）
                            import re
                            org_match = re.search(r'O=([^,]+)', subject)
                            if org_match:
                                return org_match.group(1)
                            return "Unknown Organization"
                        return None
                    except Exception:
                        return None
            
            return None
        except Exception:
            return None
    
    def identify_app(self, process_name, executable_path=None):
        """
        识别应用程序的唯一标识符（不使用哈希值）
        
        Args:
            process_name (str): 进程名称
            executable_path (str, optional): 可执行文件路径
            
        Returns:
            dict: 包含应用标识信息的字典
        """
        # 第一层：基于进程名匹配
        identifier = {
            "process_name": process_name,
            "unique_id": process_name,  # 默认使用进程名作为唯一标识符
            "confidence_level": "high",  # 默认置信度为高
            "identifier_type": "APPID"   # 默认标识符类型为APPID
        }
        
        # 第二层：基于注册表信息匹配
        for app in self.installed_apps:
            if process_name.lower() in app["name"].lower():
                identifier.update({
                    "display_name": app["name"],
                    "version": app["version"],
                    "install_location": app["install_location"],
                    "confidence_level": "high",  # 注册表匹配也是高置信度
                    "identifier_type": "APPID"   # 注册表匹配的标识符类型为APPID
                })
                break
        
        # 第三层：基于文件属性匹配
        if executable_path and os.path.exists(executable_path):
            version_info = self._get_file_version_info(executable_path)
            signature_status = self._get_pe_signature(executable_path)
            
            identifier.update({
                "executable_path": executable_path,
                "version_info": version_info,
                "signature_status": signature_status,
                "confidence_level": "high"
            })
            
            # 如果文件有数字签名，将标识符类型设置为数字签名
            if signature_status == "Signed":
                identifier["identifier_type"] = "数字签名"
                # 尝试提取组织名称
                organization = self._extract_organization_from_signature(executable_path)
                if organization:
                    identifier["organization"] = organization
            elif executable_path:
                identifier["identifier_type"] = "文件路径"
            else:
                identifier["identifier_type"] = "文件名"
            
            # 生成唯一ID（不使用哈希值）
            # 使用产品名称和公司名称的组合作为唯一标识符（不包含版本号）
            if version_info:
                product_name = version_info.get("product_name", "")
                company_name = version_info.get("company_name", "")
                # 创建基于产品属性的唯一标识符（不包含版本号）
                unique_id = f"{product_name}|{company_name}".replace(" ", "_")
                # 确保唯一标识符不为空
                if unique_id and product_name and company_name:
                    identifier["unique_id"] = unique_id
        
        # 确保唯一标识符不为空
        if not identifier["unique_id"]:
            identifier["unique_id"] = process_name
            
        return identifier
    
    def match_against_rules(self, app_identifier, rules, match_type="whitelist"):
        """
        根据规则匹配应用标识符
        
        Args:
            app_identifier (dict): 应用标识符信息
            rules (list): 规则列表
            match_type (str): 匹配类型 ("whitelist" 或 "blacklist")
            
        Returns:
            bool: 是否匹配
        """
        if match_type == "whitelist":
            # 白名单：需要所有规则都匹配才生效
            for rule in rules:
                if not self._match_single_rule(app_identifier, rule):
                    return False
            return True
        else:
            # 黑名单：只要有一条规则匹配就生效
            for rule in rules:
                if self._match_single_rule(app_identifier, rule):
                    return True
            return False
    
    def _match_single_rule(self, app_identifier, rule):
        """
        匹配单个规则
        
        Args:
            app_identifier (dict): 应用标识符信息
            rule (dict): 单个规则
            
        Returns:
            bool: 是否匹配
        """
        # 检查进程名（支持精确匹配和模糊匹配）
        if "process_name" in rule:
            rule_process_name = rule["process_name"]
            actual_process_name = app_identifier["process_name"]
            
            # 如果规则中包含通配符，使用正则表达式匹配
            if "*" in rule_process_name or "?" in rule_process_name:
                pattern = rule_process_name.replace(".", "\\.").replace("*", ".*").replace("?", ".")
                if not re.match(pattern, actual_process_name, re.IGNORECASE):
                    return False
            else:
                # 精确匹配
                if rule_process_name.lower() != actual_process_name.lower():
                    return False
        
        # 检查显示名称（支持模糊匹配）
        if "display_name" in rule:
            if "display_name" not in app_identifier or not self._fuzzy_match(
                    rule["display_name"], app_identifier["display_name"]):
                return False
        
        # 检查产品名称（支持模糊匹配）
        if "product_name" in rule:
            if "version_info" not in app_identifier or "product_name" not in app_identifier["version_info"] or \
               not self._fuzzy_match(rule["product_name"], app_identifier["version_info"]["product_name"]):
                return False
        
        # 检查公司名称（支持模糊匹配）
        if "company_name" in rule:
            if "version_info" not in app_identifier or "company_name" not in app_identifier["version_info"] or \
               not self._fuzzy_match(rule["company_name"], app_identifier["version_info"]["company_name"]):
                return False
        
        # 检查文件版本（支持精确匹配）
        if "file_version" in rule:
            if "version_info" not in app_identifier or "file_version" not in app_identifier["version_info"] or \
               rule["file_version"] not in app_identifier["version_info"]["file_version"]:
                return False
        
        return True
    
    def _fuzzy_match(self, pattern, text):
        """
        模糊匹配文本
        
        Args:
            pattern (str): 匹配模式
            text (str): 被匹配文本
            
        Returns:
            bool: 是否匹配
        """
        return pattern.lower() in text.lower()

# 使用示例
if __name__ == "__main__":
    # 创建应用标识符实例
    app_id = EnhancedAppIdentifier()
    
    # 示例1：识别记事本应用
    result1 = app_id.identify_app("notepad.exe", "C:\\Windows\\System32\\notepad.exe")
    print("记事本应用识别结果:")
    print(result1)
    
    # 示例2：识别Chrome浏览器
    result2 = app_id.identify_app("chrome.exe", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
    print("\nChrome浏览器识别结果:")
    print(result2)
    
    # 示例3：使用通配符的规则匹配
    wildcard_rules = [
        {
            "process_name": "chrome*.exe"  # 匹配所有以chrome开头的exe文件
        }
    ]
    
    is_matched = app_id.match_against_rules(result2, wildcard_rules, "blacklist")
    print(f"\nChrome是否匹配通配符规则: {is_matched}")