
# 时间追踪器设置配置文档
# 此文件用于定义设置页面的配置参数结构，供前端导入导出使用

# 配置版本号
CONFIG_VERSION = '1.0'

# Main模块配置参数
Main = {
    # 最小工作时间（分钟），用于严格模式下的工作时间要求
    'minWorkingTime': 480,  # 默认8小时
    
    # 严格模式开关，开启后会强制执行工作时间要求
    'strictMode': False,  # 默认关闭
    
    # 休息时间清零策略
    # 可选值：'off'（关闭）, 'before_next_work_period'（下个工作时间段开始前）, 
    #        'daily_4am'（每天4点）, 'weekly_monday_4am'（每周一4点）, 'monthly_1st_4am'（每月初4点）
    'resetPolicy': 'off',  # 默认关闭
    
    # 延期负数奖励比例
    # 可选值：1, 2, 3（表示1:1, 2:1, 3:1）
    'negativeRewardRatio': 1,
    
    # 固定工作时长开关
    'fixedWorkingTime': False,
    
    # 每日固定工作时长（分钟）
    'dailyWorkingHours': 480  # 默认8小时
}

# 工作时间段配置（与前端workPeriods结构匹配）
WorkingPeriods = {
    # 工作时间段配置，与数据库和前端使用的workPeriods字段匹配
    # 每个时间段为一个字典，包含start（开始时间）和end（结束时间）
    # 时间格式为HH:MM
    'workPeriods': [
        {'start': '09:00', 'end': '12:00'},
        {'start': '13:00', 'end': '18:00'}
    ]
}

# 休息日配置（与前端restDays结构匹配）
RestDays = {
    # 休息日配置，与数据库和前端使用的restDays字段匹配
    # 格式为YYYY-MM-DD的日期字符串列表
    'restDays': []
}

# BlackWhite模块配置参数（黑白名单，与前端pathsList和namesList结构匹配）
BlackWhite = {
    # 黑名单配置，与前端pathsList和namesList结构匹配
    'pathsList': {
        'black': [  # 黑名单路径列表
            'C:\\Program Files\\Game\\game.exe',
            'C:\\Users\\User\\AppData\\Roaming\\SocialApp\\socialapp.exe'
        ],
        'white': [  # 白名单路径列表
            'C:\\Program Files\\Microsoft Office\\Office16\\WINWORD.EXE',
            'C:\\Program Files\\Microsoft Office\\Office16\\EXCEL.EXE',
            'C:\\Program Files\\Microsoft Office\\Office16\\POWERPNT.EXE'
        ]
    },
    'namesList': {
        'black': [  # 黑名单应用名称列表
            'game',
            'socialapp'
        ],
        'white': [  # 白名单应用名称列表
            'WINWORD',
            'EXCEL',
            'POWERPNT'
        ]
    },
    # 应用升级额度配置
    'normalUpgradeQuota': 2,  # 普通应用升级额度
    'whiteUpgradeQuota': 2    # 白名单应用升级额度
}

# 周级数据配置（与前端weeklyData结构匹配）
WeeklyData = {
    # 格式为 "{year}-{month}-{weekIndex}": data
    # 其中data包含apps, pathsList, namesList, normalUpgradeQuota, whiteUpgradeQuota
    'exampleWeekKey': {
        'apps': [],  # 应用列表
        'pathsList': {
            'black': [],
            'white': []
        },
        'namesList': {
            'black': [],
            'white': []
        },
        'normalUpgradeQuota': 2,
        'whiteUpgradeQuota': 2
    }
}

# 完整的设置配置结构（与数据库和前端交互时使用）
SettingsConfig = {
    'version': CONFIG_VERSION,
    'main': Main,
    'workPeriods': WorkingPeriods['workPeriods'],
    'restDays': RestDays['restDays'],
    'blacklist': [],  # 兼容旧版本，实际使用pathsList和namesList
    'whitelist': [],  # 兼容旧版本，实际使用pathsList和namesList
    'pathsList': BlackWhite['pathsList'],
    'namesList': BlackWhite['namesList'],
    'normalUpgradeQuota': BlackWhite['normalUpgradeQuota'],
    'whiteUpgradeQuota': BlackWhite['whiteUpgradeQuota'],
    'weeklyData': {}
}

# 配置缓存机制说明
"""
配置缓存机制：
1. 前端应在localStorage中保存用户编辑但未保存的配置数据
2. 键名建议使用：'at_settings_cache_{configId}'，其中{configId}为配置ID
3. 保存时机：每次用户修改配置项时
4. 清除时机：用户点击保存按钮并成功保存后，或明确放弃编辑时
5. 恢复时机：用户打开编辑对话框时，检查是否有未保存的缓存数据

缓存数据结构示例：
{
    'lastEdited': '2023-07-01T10:00:00Z',
    'data': SettingsConfig  # 使用上述SettingsConfig结构
}
"""

