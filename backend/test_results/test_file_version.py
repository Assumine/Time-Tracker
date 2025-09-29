import win32api
import pywintypes

try:
    info = win32api.GetFileVersionInfo('C:\\Windows\\System32\\notepad.exe', '\\')
    # 获取语言和代码页信息
    lang, codepage = win32api.GetFileVersionInfo('C:\\Windows\\System32\\notepad.exe', '\\VarFileInfo\\Translation')[0]
    # 构造字符串文件信息路径
    string_file_info_path = f'\\StringFileInfo\\{lang:04x}{codepage:04x}'
    # 获取产品名称和公司名称
    product_name = win32api.GetFileVersionInfo('C:\\Windows\\System32\\notepad.exe', string_file_info_path + '\\ProductName')
    company_name = win32api.GetFileVersionInfo('C:\\Windows\\System32\\notepad.exe', string_file_info_path + '\\CompanyName')
    print('ProductName:', product_name)
    print('CompanyName:', company_name)
except pywintypes.error as e:
    print('Error:', e)
except Exception as e:
    print('Error:', e)