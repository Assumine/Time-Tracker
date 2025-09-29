import pefile
from cryptography import x509
from cryptography.hazmat.backends import default_backend

def get_pe_signature(filename):
    try:
        pe = pefile.PE(filename)
        if hasattr(pe, 'DIRECTORY_ENTRY_SECURITY'):
            directory = pe.OPTIONAL_HEADER.DATA_DIRECTORY[pefile.DIRECTORY_ENTRY['IMAGE_DIRECTORY_ENTRY_SECURITY']]
            if directory.VirtualAddress != 0 and directory.Size != 0:
                # 获取数字签名数据
                signature_data = pe.write()[directory.VirtualAddress:directory.VirtualAddress + directory.Size]
                # 解析数字签名
                cert = x509.load_der_x509_certificate(signature_data, default_backend())
                return cert
        return None
    except Exception as e:
        print(f"Error: {e}")
        return None

# 测试获取PE文件数字签名
cert = get_pe_signature('C:\\Windows\\System32\\notepad.exe')
if cert:
    print('应用程序名称：', cert.subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value)
    print('发布者：', cert.issuer.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value)
    print('有效期：', cert.not_valid_before, '至', cert.not_valid_after)
    print('签名算法：', cert.signature_algorithm_oid._name)
else:
    print("未找到数字签名信息")