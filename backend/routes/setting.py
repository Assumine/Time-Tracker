from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from db_utils import save_settings, load_settings

router = APIRouter(prefix="/api", tags=["settings"])

class WorkTimes(BaseModel):
    workPeriods: list[dict]

class Blacklist(BaseModel):
    blacklist: list[dict]

class Whitelist(BaseModel):
    whitelist: list[dict]

class RestDays(BaseModel):
    restDays: list[str]

class ResetPolicy(BaseModel):
    resetPolicy: str

@router.get("/settings")
def get_settings():
    settings = load_settings()
    # 转换数据结构以匹配前端期望的格式
    transformed_settings = {
        "workPeriods": settings.get("workPeriods", [{"start": "09:00", "end": "18:00"}]),
        "blacklist": settings.get("blacklist", []),
        "whitelist": settings.get("whitelist", []),
        "restDays": settings.get("restDays", []),
        "resetPolicy": settings.get("resetPolicy", "daily"),
        # 添加前端需要的其他字段（使用空数据而不是示例数据）
        "apps": [],
        "pathsList": {
            "black": [""],
            "white": [""]
        },
        "namesList": {
            "black": [""],
            "white": [""]
        },
        "normalUpgradeQuota": 0,
        "whiteUpgradeQuota": 0
    }
    return transformed_settings

@router.post("/settings")
def get_settings_by_params(data: dict):
    # 这里可以根据传入的参数来获取特定的设置数据
    # 目前我们直接返回所有设置数据
    settings = load_settings()
    # 转换数据结构以匹配前端期望的格式
    transformed_settings = {
        "workPeriods": settings.get("workPeriods", [{"start": "09:00", "end": "18:00"}]),
        "blacklist": settings.get("blacklist", []),
        "whitelist": settings.get("whitelist", []),
        "restDays": settings.get("restDays", []),
        "resetPolicy": settings.get("resetPolicy", "daily"),
        # 添加前端需要的其他字段（使用空数据而不是示例数据）
        "apps": [],
        "pathsList": {
            "black": [""],
            "white": [""]
        },
        "namesList": {
            "black": [""],
            "white": [""]
        },
        "normalUpgradeQuota": 0,
        "whiteUpgradeQuota": 0
    }
    return transformed_settings

@router.put("/settings")
def update_settings(data: dict):
    save_settings(data)
    return {"message": "Settings updated successfully", "data": data}

@router.post("/worktimes")
def set_worktimes(data: WorkTimes):
    s = load_settings()
    s["workPeriods"] = data.workPeriods
    save_settings(s)
    return {"workPeriods": s["workPeriods"]}

@router.post("/blacklist")
def set_blacklist(data: Blacklist):
    s = load_settings()
    s["blacklist"] = data.blacklist
    save_settings(s)
    return {"blacklist": s["blacklist"]}

@router.post("/whitelist")
def set_whitelist(data: Whitelist):
    s = load_settings()
    s["whitelist"] = data.whitelist
    save_settings(s)
    return {"whitelist": s["whitelist"]}

@router.post("/restdays")
def set_restdays(data: RestDays):
    s = load_settings()
    s["restDays"] = data.restDays
    save_settings(s)
    return {"restDays": s["restDays"]}

@router.post("/resetpolicy")
def set_resetpolicy(data: ResetPolicy):
    s = load_settings()
    s["resetPolicy"] = data.resetPolicy
    save_settings(s)
    return {"resetPolicy": s["resetPolicy"]}
