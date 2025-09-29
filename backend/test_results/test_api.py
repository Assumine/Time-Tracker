import requests
import json

try:
    # 测试任务状态API
    response = requests.get('http://127.0.0.1:30022/task_status')
    print(f"Task Status - Status Code: {response.status_code}")
    print(f"Task Status - Response: {response.text}")
    print()
    
    # 测试日志API
    response = requests.get('http://127.0.0.1:30022/logs')
    print(f"Logs - Status Code: {response.status_code}")
    print(f"Logs - Response: {response.text}")
    print()
    
    # 测试统计API
    response = requests.get('http://127.0.0.1:30022/stats')
    print(f"Stats - Status Code: {response.status_code}")
    print(f"Stats - Response: {response.text}")
    print()
    
    # 测试设置API
    response = requests.get('http://127.0.0.1:30022/api/settings')
    print(f"Settings - Status Code: {response.status_code}")
    print(f"Settings - Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")