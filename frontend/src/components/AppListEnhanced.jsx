import React, { useState, useEffect, useMemo } from "react";
import { API_BASE } from "../api";
import pinyin from "pinyin";

// 排序图标组件
const SortIcon = ({ sortOrder }) => {
  if (sortOrder === "asc") {
    return <span>↑</span>;
  } else if (sortOrder === "desc") {
    return <span>↓</span>;
  }
  return <span>↕</span>;
};

const AppListEnhanced = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [filterText, setFilterText] = useState("");
  const [filterColumn, setFilterColumn] = useState("all");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [lastRequestTime, setLastRequestTime] = useState(0); // 用于记录上次请求时间

  // 获取应用列表数据
  const fetchApps = async (force = false) => {
    try {
      const now = Date.now();
      // 如果不是强制刷新且距离上次请求不足2分钟，则不请求
      if (!force && now - lastRequestTime < 120000) {
        return;
      }
      
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/apps/list`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // 后端直接返回应用数据数组，不需要检查code字段
      setApps(data);
      setLastRefresh(new Date());
      setLastRequestTime(now); // 更新上次请求时间
    } catch (err) {
      setError("网络错误，请检查后端服务是否正常运行");
      console.error("获取应用列表失败:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps(true); // 组件挂载时强制请求数据
    
    // 移除定时刷新功能
  }, []);

  // 计算本周累计使用时间
  const appsWithWeeklyTime = useMemo(() => {
    return apps.map(app => ({
      ...app,
      weeklyTime: app.last3Days.reduce((sum, day) => sum + day, 0)
    }));
  }, [apps]);

  // 处理排序
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // 获取字符串的拼音
  const getPinyin = (str) => {
    if (!str) return "";
    try {
      // 使用pinyin库获取拼音
      const py = pinyin(str, { style: pinyin.STYLE_NORMAL });
      return py.flat().join("");
    } catch (error) {
      // 如果转换失败，返回原字符串
      return str;
    }
  };

  // 获取排序后的数据
  const sortedApps = useMemo(() => {
    if (!sortConfig.key) return appsWithWeeklyTime;
    
    return [...appsWithWeeklyTime].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      // 特殊处理某些字段
      if (sortConfig.key === "weeklyTime" || sortConfig.key === "dailyTime" || sortConfig.key === "coolingDays") {
        // 数字比较
        const aNum = parseFloat(aValue) || 0;
        const bNum = parseFloat(bValue) || 0;
        
        if (aNum < bNum) {
          return sortConfig.direction === "asc" ? -1 : 1;
        }
        if (aNum > bNum) {
          return sortConfig.direction === "asc" ? 1 : -1;
        }
        return 0;
      } else if (sortConfig.key === "name" || sortConfig.key === "id") {
        // 字符串比较，支持拼音排序
        const aStr = aValue?.toString() || "";
        const bStr = bValue?.toString() || "";
        
        // 获取拼音进行比较
        const aPinyin = getPinyin(aStr);
        const bPinyin = getPinyin(bStr);
        
        // 先按拼音比较，如果拼音相同则按原字符串比较
        const pinyinComparison = aPinyin.localeCompare(bPinyin);
        if (pinyinComparison !== 0) {
          return sortConfig.direction === "asc" ? pinyinComparison : -pinyinComparison;
        }
        
        // 拼音相同时按原字符串比较
        const strComparison = aStr.localeCompare(bStr);
        return sortConfig.direction === "asc" ? strComparison : -strComparison;
      } else if (sortConfig.key === "hasBlackHistory") {
        // 布尔值转换为数字进行比较
        aValue = aValue ? 1 : 0;
        bValue = bValue ? 1 : 0;
      }
      
      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [appsWithWeeklyTime, sortConfig]);

  // 获取筛选后的数据
  const filteredApps = useMemo(() => {
    if (!filterText) return sortedApps;
    
    return sortedApps.filter(app => {
      if (filterColumn === "all") {
        // 在所有列中搜索
        const levelInfo = getLevelInfo(app);
        const filterRuleText = app.hasBlackHistory ? "黑名单" : "白名单";
        const statusText = app.is_blocked ? "已禁止" : "正常";
        
        return (
          app.name?.toLowerCase().includes(filterText.toLowerCase()) ||
          app.id?.toLowerCase().includes(filterText.toLowerCase()) ||
          app.coolingDays?.toString().includes(filterText) ||
          app.dailyTime?.toString().includes(filterText) ||
          app.weeklyTime?.toString().includes(filterText) ||
          levelInfo.current.includes(filterText) ||
          levelInfo.next.includes(filterText) ||
          filterRuleText.includes(filterText) ||
          statusText.includes(filterText)
        );
      } else if (filterColumn === "status") {
        // 状态列筛选
        const statusText = app.is_blocked ? "已禁止" : "正常";
        return statusText.includes(filterText);
      } else if (filterColumn === "currentLevel") {
        // 当前等级列筛选
        const levelInfo = getLevelInfo(app);
        return levelInfo.current.includes(filterText);
      } else if (filterColumn === "nextLevel") {
        // 下一等级列筛选
        const levelInfo = getLevelInfo(app);
        return levelInfo.next.includes(filterText);
      } else if (filterColumn === "filterRule") {
        // 筛选规则列筛选
        const filterRuleText = app.hasBlackHistory ? "黑名单" : "白名单";
        return filterRuleText.includes(filterText);
      } else {
        // 在指定列中搜索
        const value = app[filterColumn];
        if (value === undefined || value === null) return false;
        return value.toString().toLowerCase().includes(filterText.toLowerCase());
      }
    });
  }, [sortedApps, filterText, filterColumn]);

  // 计算本周累计使用时间
  const calculateWeeklyTime = (last3Days) => {
    return last3Days.reduce((sum, day) => sum + day, 0);
  };

  // 获取等级信息
  const getLevelInfo = (app) => {
    // 使用应用的hasBlackHistory和is_blocked字段来确定等级
    if (app.hasBlackHistory) {
      return { current: "黑名单", next: "普通应用" };
    } else if (app.is_blocked) {
      return { current: "普通应用", next: "白名单" };
    } else {
      return { current: "白名单", next: "—" };
    }
  };

  // 格式化时间显示
  const formatTime = (seconds) => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      if (remainingSeconds > 0) {
        return `${minutes}分${remainingSeconds}秒`;
      }
      return `${minutes}分钟`;
    }
    return `${seconds}秒`;
  };

  if (loading && apps.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>加载中...</p>
      </div>
    );
  }

  if (error && apps.length === 0) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
        <p>错误: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center", 
        marginBottom: "20px",
        padding: "16px",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <h2 style={{ margin: 0, color: "#202124" }}>应用列表</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button 
            onClick={() => fetchApps(true)} // 点击时强制刷新
            style={{ 
              padding: "8px 16px", 
              backgroundColor: "#0078d4",
              color: "white", 
              border: "none", 
              borderRadius: "4px", 
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontWeight: "500",
              transition: "background-color 0.2s"
            }}
            disabled={loading}
            onMouseEnter={(e) => e.target.style.backgroundColor = "#106ebe"}
            onMouseLeave={(e) => e.target.style.backgroundColor = "#0078d4"}
          >
            {loading ? "刷新中..." : "刷新"}
          </button>
          <div style={{ fontSize: "14px", color: "#666" }}>
            最后更新: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>
      
      {/* 筛选控件 */}
      <div style={{ 
        marginBottom: "20px", 
        display: "flex", 
        gap: "12px", 
        alignItems: "center",
        padding: "12px",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <input
          type="text"
          placeholder="输入筛选关键词"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{ 
            padding: "8px 12px", 
            borderRadius: "4px", 
            border: "1px solid #d1d5db",
            fontSize: "14px",
            minWidth: "200px"
          }}
        />
        <select
          value={filterColumn}
          onChange={(e) => setFilterColumn(e.target.value)}
          style={{ 
            padding: "8px 12px", 
            borderRadius: "4px", 
            border: "1px solid #d1d5db",
            fontSize: "14px",
            backgroundColor: "#fff"
          }}
        >
          <option value="all">所有列</option>
          <option value="name">应用名称</option>
          <option value="id">应用ID</option>
          <option value="coolingDays">冷却天数</option>
          <option value="dailyTime">今日使用</option>
          <option value="weeklyTime">本周累计使用</option>
          <option value="currentLevel">当前等级</option>
          <option value="nextLevel">下一等级</option>
          <option value="filterRule">筛选规则</option>
          <option value="status">状态</option>
        </select>
      </div>
      
      <div style={{ 
        background: "#fff", 
        borderRadius: "8px", 
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        overflow: "hidden"
      }}>
        {/* 表格头部 */}
        <div style={{ 
          display: "flex", 
          gap: "1px",
          background: "rgb(241, 243, 244)",
          fontWeight: "bold"
        }}>
          <div 
            style={{ 
              padding: "12px", 
              background: "#fafafa", 
              cursor: "pointer",
              color: "#202124",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1
            }}
            onClick={() => handleSort("name")}
          >
            应用名称 <SortIcon sortOrder={sortConfig.key === "name" ? sortConfig.direction : null} />
          </div>
          <div 
            style={{ 
              padding: "12px", 
              background: "#fafafa", 
              cursor: "pointer",
              color: "#202124",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1.5
            }}
            onClick={() => handleSort("id")}
          >
            应用ID <SortIcon sortOrder={sortConfig.key === "id" ? sortConfig.direction : null} />
          </div>
          <div 
            style={{ 
              padding: "12px", 
              background: "#fafafa", 
              cursor: "pointer",
              color: "#202124",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 0.3
            }}
            onClick={() => handleSort("coolingDays")}
          >
            冷却天数 <SortIcon sortOrder={sortConfig.key === "coolingDays" ? sortConfig.direction : null} />
          </div>
          <div 
            style={{ 
              padding: "12px", 
              background: "#fafafa", 
              cursor: "pointer",
              color: "#202124",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 0.5
            }}
            onClick={() => handleSort("dailyTime")}
          >
            今日使用 <SortIcon sortOrder={sortConfig.key === "dailyTime" ? sortConfig.direction : null} />
          </div>
          <div 
            style={{ 
              padding: "12px", 
              background: "#fafafa", 
              cursor: "pointer",
              color: "#202124",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 0.5
            }}
            onClick={() => handleSort("weeklyTime")}
          >
            本周累计 <SortIcon sortOrder={sortConfig.key === "weeklyTime" ? sortConfig.direction : null} />
          </div>
          <div style={{ 
            padding: "12px", 
            background: "#fafafa",
            color: "#202124",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 0.5
          }}>
            当前等级
          </div>
          <div style={{ 
            padding: "12px", 
            background: "#fafafa",
            color: "#202124",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 0.5
          }}>
            下一等级
          </div>
          <div style={{ 
            padding: "12px", 
            background: "#fafafa",
            color: "#202124",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 1
          }}>
            筛选规则
          </div>
          <div style={{ 
            padding: "12px", 
            background: "#fafafa",
            color: "#202124",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            flex: 0.3
          }}>
            状态
          </div>
        </div>
        
        {/* 表格内容 */}
        <div>
          {filteredApps.map((app) => {
            const levelInfo = getLevelInfo(app);
            return (
              <div 
                key={app.id} 
                style={{
                  display: "flex", 
                  gap: "1px",
                  background: "rgb(241, 243, 244)"
                }}
              >
                <div style={{ 
                  padding: "12px", 
                  background: "#fff",
                  color: "#202124",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 1
                }}>{app.name}</div>
                <div style={{ 
                  padding: "12px", 
                  background: "#fff",
                  color: "#202124",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 1.5
                }}>{app.id}</div>
                <div style={{ 
                  padding: "12px", 
                  background: "#fff",
                  color: "#202124",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 0.3
                }}>{app.coolingDays}天</div>
                <div style={{ 
                  padding: "12px", 
                  background: "#fff",
                  color: "#202124",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 0.5
                }}>{formatTime(app.dailyTime)}</div>
                <div style={{ 
                  padding: "12px", 
                  background: "#fff",
                  color: "#202124",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 0.5
                }}>
                  {formatTime(calculateWeeklyTime(app.last3Days))}
                </div>
                <div style={{ 
                  padding: "12px", 
                  background: "#fff",
                  color: levelInfo.current === "黑名单" ? "red" : levelInfo.current === "白名单" ? "green" : "#202124",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 0.5
                }}>
                  {levelInfo.current}
                </div>
                <div style={{ 
                  padding: "12px", 
                  background: "#fff",
                  color: levelInfo.next === "黑名单" ? "red" : levelInfo.next === "白名单" ? "green" : "#202124",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 0.5
                }}>
                  {levelInfo.next}
                </div>
                <div style={{ 
                  padding: "12px", 
                  background: "#fff",
                  color: "#202124",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 1
                }}>
                  {app.hasBlackHistory ? "黑名单" : "白名单"}
                </div>
                <div style={{ 
                  padding: "12px", 
                  background: "#fff",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: 0.3
                }}>
                  <span style={{ 
                    color: app.is_blocked ? "red" : "green",
                    fontWeight: "bold"
                  }}>
                    {app.is_blocked ? "已禁止" : "正常"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {filteredApps.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center", color: "#666" }}>
            <p>没有找到匹配的应用</p>
          </div>
        )}
      </div>
      
      <div style={{ 
        marginTop: "16px", 
        color: "#666",
        padding: "12px",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        共 {filteredApps.length} 个应用
      </div>
    </div>
  );
};

export default AppListEnhanced;