"""
通知模块 notify.py
提供三类通知：
1. banned 通知：展示黑名单应用及奖励选择
2. allowed 通知：展示奖励时长和工作开始时间（只显示）
3. warn 通知：提醒剩余奖励时间，可选择奖励时长

接口使用：
- Toast, Text, Image, Button, ToastTextStyle
- Select
用户操作返回示例：
{'action': 'confirm', 'selection': 3, 'error': None}
"""

import asyncio
from pathlib import Path
from datetime import datetime
from toasted import Toast, Text, Image, Button, ToastTextStyle
from toasted.elements import Select

BASE_DIR = Path(__file__).parent.resolve()

# 图标路径
icon_ban_uri = f"file:///{(BASE_DIR / 'image/ban.png').as_posix()}"
icon_allow_uri = f"file:///{(BASE_DIR / 'image/allow.png').as_posix()}"
icon_warn_uri = f"file:///{(BASE_DIR / 'image/warn.png').as_posix()}"

# 注册自定义 APP_ID
APP_ID = Toast.register_app_id("TimeTracker.Assumine.AppID", "Time Tracker")

async def show_banned_toast(app_name: str, remain_time: str, options: dict):
    toast = Toast(app_id=APP_ID)
    
    toast.elements = [
        Text(f"已禁止黑名单应用: {app_name}"),
        Image(icon_ban_uri),
        [
            [Text("禁用规则:", style=ToastTextStyle.BASESUBTLE),
             Text("剩余奖励时间:", style=ToastTextStyle.BASESUBTLE)],
            [Text(app_name, style=ToastTextStyle.BASE),
             Text(remain_time, style=ToastTextStyle.BASE)]
        ],
        Text("请选择你将使用的奖励时间", style=ToastTextStyle.SUBTITLE),
        Select(id="reward_time", options=options, default="all"),
        Button("确认", arguments="confirm"),
        Button("取消", arguments="cancel")
    ]
    
    selection_result = {}

    @toast.on_result
    def handle_result(result):
        selection_result['arguments'] = result.arguments
        selection_result['inputs'] = result.inputs

    await toast.show({})

    if not selection_result or not selection_result.get('arguments'):
        return {"action": None, "selection": None, "error": "未选择或超时"}

    if selection_result['arguments'] == "confirm":
        selection = selection_result['inputs'].get("reward_time")
        if selection != "all":
            try:
                selection = int(selection)
            except ValueError:
                selection = None
        return {"action": "confirm", "selection": selection, "error": None}
    elif selection_result['arguments'] == "cancel":
        return {"action": "cancel", "selection": None, "error": None}
    else:
        return {"action": None, "selection": None, "error": "未知操作"}


async def show_allowed_toast(duration: int | str):
    """显示奖励时间确认通知，只展示，不返回值"""
    from datetime import timedelta

    now = datetime.now()
    start_time = now.strftime("%H:%M")

    if isinstance(duration, int):
        end_time = (now + timedelta(minutes=duration)).strftime("%H:%M")
    else:
        end_time = duration

    toast = Toast(app_id=APP_ID)
    toast.elements = [
        Text("奖励时间设置完成"),
        Image(icon_allow_uri),
        [
            [Text("设置奖励时间:", style=ToastTextStyle.BASESUBTLE),
             Text("工作时间开始:", style=ToastTextStyle.BASESUBTLE)],
            [Text(str(duration)+"分钟", style=ToastTextStyle.BASE),
             Text(end_time, style=ToastTextStyle.BASE)]
        ]
    ]
    await toast.show()
    return {"duration": duration, "start_time": start_time, "end_time": end_time}

async def show_warn_toast(app_name: str, remain_time: str, options: dict):
    toast = Toast(app_id=APP_ID)
    
    toast.elements = [
        Text("提醒: 你所剩的奖励时间不多了"),
        Image(icon_warn_uri),
        [[Text("请尽快完成你的活动", style=ToastTextStyle.SUBTITLE)]],
        [
            [Text("最近黑名单应用:", style=ToastTextStyle.BASESUBTLE),
             Text("剩余奖励时间:", style=ToastTextStyle.BASESUBTLE)],
            [Text(app_name, style=ToastTextStyle.BASE),
             Text(remain_time, style=ToastTextStyle.BASE)]
        ],
        Select(id="reward_time", options=options, default="all"),
        Button("确认", arguments="confirm"),
        Button("取消", arguments="cancel")
    ]
    
    selection_result = {}

    @toast.on_result
    def handle_result(result):
        selection_result['arguments'] = result.arguments
        selection_result['inputs'] = result.inputs

    await toast.show({})

    if not selection_result or not selection_result.get('arguments'):
        return {"action": None, "selection": None, "error": "未选择或超时"}

    if selection_result['arguments'] == "confirm":
        selection = selection_result['inputs'].get("reward_time")
        if selection != "all":
            try:
                selection = int(selection)
            except ValueError:
                selection = None
        return {"action": "confirm", "selection": selection, "error": None}
    elif selection_result['arguments'] == "cancel":
        return {"action": "cancel", "selection": None, "error": None}
    else:
        return {"action": None, "selection": None, "error": "未知操作"}


def show_toast_sync(mode: str, app_name=None, remain_time=None, options=None, duration=None):
    """同步调用接口"""
    if mode == "banned":
        return asyncio.run(show_banned_toast(app_name, remain_time, options))
    elif mode == "allowed":
        return asyncio.run(show_allowed_toast(duration))
    elif mode == "warn":
        return asyncio.run(show_warn_toast(app_name, remain_time, options))
    else:
        return {"error": "未知模式"}

