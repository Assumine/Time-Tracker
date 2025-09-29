import requests

BASE_URL = "http://127.0.0.1:30033/settings"

def get_all_settings():
    url = f"{BASE_URL}/get_all"
    try:
        r = requests.get(url)
        r.raise_for_status()
        print("GET /get_all 成功:")
        print(r.json())
    except Exception as e:
        print("GET /get_all 失败:", e)

def update_setting(setting_id, value):
    url = f"{BASE_URL}/update/{setting_id}"
    payload = {"value": value}
    try:
        r = requests.post(url, json=payload)
        r.raise_for_status()
        print(f"POST /update/{setting_id} 成功:")
        print(r.json())
    except Exception as e:
        print(f"POST /update/{setting_id} 失败:", e)

def reset_settings():
    url = f"{BASE_URL}/reset"
    try:
        r = requests.post(url)
        r.raise_for_status()
        print("POST /reset 成功:")
        print(r.json())
    except Exception as e:
        print("POST /reset 失败:", e)

if __name__ == "__main__":
    print("=== 获取所有设置 ===")
    get_all_settings()
    print("\n=== 更新测试设置 ===")
    update_setting(1, "test_value")
    print("\n=== 重置设置 ===")
    reset_settings()
    print("\n=== 再次获取所有设置 ===")
    get_all_settings()
