#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
去抖策略配置文件
用于集中管理去抖相关的参数配置
"""

# 默认去抖参数配置
DEBOUNCE_CONFIG = {
    # 默认配置
    "default": {
        "start_req": 2,      # 开始计时所需连续次数
        "stop_req": 3,       # 停止计时所需连续次数
    },
    
    # 视频播放应用配置（更宽松）
    "video_player": {
        "start_req": 1,      # 视频播放应用可以更快开始计时
        "stop_req": 4,       # 但需要更严格的停止条件
    },
    
    # 游戏应用配置
    "game": {
        "start_req": 1,      # 游戏应用通常需要立即响应
        "stop_req": 5,       # 但停止条件更严格以防止误判
    },
    
    # 浏览器配置
    "browser": {
        "start_req": 2,      # 浏览器保持默认开始条件
        "stop_req": 3,       # 停止条件也保持默认
    }
}

# 获取指定类型的去抖配置
def get_debounce_config(app_type="default"):
    """
    获取指定应用类型的去抖配置
    
    Args:
        app_type (str): 应用类型
        
    Returns:
        dict: 去抖配置参数
    """
    return DEBOUNCE_CONFIG.get(app_type, DEBOUNCE_CONFIG["default"])

# 判断应用类型（简化版示例）
def determine_app_type(process_name):
    """
    根据进程名简单判断应用类型
    
    Args:
        process_name (str): 进程名称
        
    Returns:
        str: 应用类型
    """
    process_name = process_name.lower()
    
    # 视频播放器
    video_players = ["vlc", "potplayer", "mpc-hc", "wmplayer", "quicktime"]
    if any(player in process_name for player in video_players):
        return "video_player"
    
    # 游戏
    games = ["game", "minecraft", "steam", "epic", "origin"]
    if any(game in process_name for game in games):
        return "game"
    
    # 浏览器
    browsers = ["chrome", "firefox", "edge", "safari", "opera"]
    if any(browser in process_name for browser in browsers):
        return "browser"
    
    # 默认类型
    return "default"