from notify import show_toast_sync
from datetime import datetime

options = {"1": "1分钟", "3": "3分钟", "5": "5分钟", "10": "10分钟", "all": "用完所有"}

print(">>> 测试 banned 通知")
result = show_toast_sync("warn", app_name="QQ.exe", remain_time="17分钟", options=options)
print("banned 阶段返回:", result)

if result["action"] == "confirm" and result["selection"] is not None:
    # 后端逻辑判断最终奖励时间

    duration = result["selection"]
    print(f"确定奖励时长: {duration}")

    # 显示 allowed 通知
    show_toast_sync("allowed", duration=duration)
else:
    print("用户未确认或取消，流程结束。")


#>>> 测试 banned 通知

#banned 阶段返回: {'action': 'confirm', 'selection': 10, 'error': None}
#              : 确定奖励时长: 5
#allowed  阶段返回

#banned 阶段返回: {'action': None, 'selection': None, 'error': '未选择或超时'}

#warn 阶段返回: {'action': 'confirm', 'selection': 5, 'error': None}
#           : 确定奖励时长: 5
#allowed  阶段返回

