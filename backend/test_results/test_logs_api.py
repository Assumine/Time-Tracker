import requests

try:
    response = requests.get("http://127.0.0.1:30022/logs")
    print(f"Status Code: {response.status_code}")
    if response.status_code == 200:
        print("Response:")
        print(response.json())
    else:
        print("Error Response:")
        print(response.text)
except Exception as e:
    print(f"Request failed: {e}")