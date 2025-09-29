import React, { useEffect, useState } from "react";
import { API_BASE } from "../api";

const AppList = () => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE}/api/apps/list`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        // 后端直接返回应用数据数组，不需要检查code字段
        setApps(data);
      } catch (err) {
        setError("网络错误，请检查后端服务是否正常运行");
        console.error("获取应用列表失败:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApps();
    
    // 每2分钟刷新一次数据（减少CPU占用）
    const interval = setInterval(fetchApps, 120000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px", textAlign: "center", color: "red" }}>
        <p>错误: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h2>应用列表</h2>
      <div style={{ 
        background: "#fff", 
        borderRadius: "8px", 
        boxShadow: "0 1px 4px rgba(0,0,0,0.26)",
        overflow: "hidden"
      }}>
        <div style={{ 
          display: "flex", 
          gap: "16px",
          padding: "16px"
        }}>
          {apps.map((app) => (
            <div 
              key={app.id} 
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: "8px",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}
            >
              <div style={{ fontWeight: "bold", fontSize: "16px" }}>{app.name}</div>
              <div style={{ fontSize: "14px", color: "#666" }}>ID: {app.id}</div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>今日使用:</span>
                <span>{app.dailyTime}秒</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>冷却天数:</span>
                <span>{app.coolingDays}天</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>违规历史:</span>
                <span>{app.hasBlackHistory ? "有" : "无"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>状态:</span>
                <span style={{ 
                  color: app.is_blocked ? "red" : "green",
                  fontWeight: "bold"
                }}>
                  {app.is_blocked ? "已禁止" : "正常"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AppList;