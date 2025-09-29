import React, { useEffect, useState } from "react";
import { FaSyncAlt, FaList, FaInfoCircle, FaExclamationCircle } from "react-icons/fa";
import { API_BASE } from "../api";

export default function Logs() {
  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState("all"); // all / info / error
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    setLoading(true);
    try {
      const data = await fetchLogs();
      if (Array.isArray(data) && data.length > 0) {
        // 转换后端数据格式为前端显示格式
        const formattedLogs = data.map(item => ({
          time: new Date(item.time).toLocaleString('zh-CN'),
          exe: item.exe,
          message: `${item.app} 使用了 ${item.duration} 秒`,
          type: "info" // 后端数据都是info类型
        }));
        setLogs(formattedLogs);
      } else {
        setLogs([]); // 无内容
      }
    } catch {
      setLogs([]); // 请求失败
    } finally {
      setLoading(false);
    }
  }

  async function fetchLogs() {
    const res = await fetch(`${API_BASE}/logs`);
    if (!res.ok) throw new Error("获取日志失败");
    return res.json();
  }

  const filtered = logs.filter((l) => (filter === "all" ? true : l.type === filter));

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif", position: "relative" }}>
      {/* 顶部工具栏 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2>日志</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={loadLogs}
            title="刷新"
            style={{
              width: 36,
              height: 36,
              border: "none",
              borderRadius: 6,
              background: "#4A8C4E",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <FaSyncAlt />
          </button>
          <button
            onClick={() => setFilter("all")}
            title="全部"
            style={{
              width: 36,
              height: 36,
              border: "none",
              borderRadius: 6,
              background: filter === "all" ? "#4A8C4E" : "#ccc",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <FaList />
          </button>
          <button
            onClick={() => setFilter("info")}
            title="日志"
            style={{
              width: 36,
              height: 36,
              border: "none",
              borderRadius: 6,
              background: filter === "info" ? "#4A8C4E" : "#ccc",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <FaInfoCircle />
          </button>
          <button
            onClick={() => setFilter("error")}
            title="错误"
            style={{
              width: 36,
              height: 36,
              border: "none",
              borderRadius: 6,
              background: filter === "error" ? "crimson" : "#ccc",
              color: "#fff",
              cursor: "pointer",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <FaExclamationCircle />
          </button>
        </div>
      </div>

      {/* 日志列表 */}
      <div
        style={{
          maxHeight: 520,
          overflowY: "auto",
          borderRadius: 8,
          paddingRight: 4,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        <style>{`
          div::-webkit-scrollbar { display: none; }
        `}</style>

        {loading ? (
          <div style={{ padding: 20 }}>加载中...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 20 }}>暂无日志</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map((l, i) => (
              <div
                key={i}
                style={{
                  background: l.type === "error" ? "#fff0f0" : "#f7f7f7",
                  padding: 12,
                  borderRadius: 8,
                  display: "flex",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                <div style={{ minWidth: 160, fontFamily: "monospace", color: "#333" }}>{l.time}</div>
                <div style={{ minWidth: 90, fontWeight: 700, color: l.type === "error" ? "crimson" : "#333" }}>
                  {l.type === "error" ? "错误" : "日志"}
                </div>
                <div style={{ minWidth: 140, fontWeight: 600 }}>{l.exe}</div>
                <div style={{ flex: 1 }}>
                  <input
                    readOnly
                    value={l.message}
                    style={{
                      width: "100%",
                      border: "none",
                      background: "transparent",
                      color: "#111",
                      fontFamily: "monospace",
                    }}
                    onFocus={(e) => e.target.select()}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 渐隐遮罩 */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: 20,
          right: 20,
          height: 40,
          background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
