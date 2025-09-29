# 应用监控规则配置文件

# 白名单规则 - 只有匹配所有规则的应用才被允许监控
WHITELIST_RULES = [
    # Google Chrome浏览器
    {
        "product_name": "Google Chrome",
        "company_name": "Google LLC"
    },
    
    # Microsoft Edge浏览器
    {
        "product_name": "Microsoft Edge",
        "company_name": "Microsoft Corporation"
    },
    
    # Mozilla Firefox浏览器
    {
        "product_name": "Firefox",
        "company_name": "Mozilla Corporation"
    },
    
    # Microsoft Office套件
    {
        "company_name": "Microsoft Corporation",
        "product_name": "Microsoft Office"
    },
    
    # Adobe Reader
    {
        "product_name": "Adobe Reader",
        "company_name": "Adobe Systems Incorporated"
    }
]

# 黑名单规则 - 匹配任一规则的应用都将被阻止监控
BLACKLIST_RULES = [
    # 已知的恶意软件进程名
    {
        "process_name": "malware.exe"
    },
    
    # 已知的广告软件
    {
        "product_name": "Adware",
    },
    
    # 系统关键进程（不希望被监控）
    {
        "process_name": "explorer.exe"
    },
    
    {
        "process_name": "taskmgr.exe"
    },
    
    {
        "process_name": "services.exe"
    },
    
    {
        "process_name": "winlogon.exe"
    },
    
    # 不希望被监控的特定软件
    {
        "product_name": "Unwanted Software"
    }
]

# 敏感应用规则 - 需要特殊处理的应用
SENSITIVE_APP_RULES = [
    # 游戏应用
    {
        "category": "game",
        "product_name": "Game"
    },
    
    # 社交媒体应用
    {
        "category": "social",
        "product_name": "Social"
    },
    
    # 娱乐应用
    {
        "category": "entertainment",
        "product_name": "Entertainment"
    }
]