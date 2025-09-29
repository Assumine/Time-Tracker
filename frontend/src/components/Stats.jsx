import React, { useEffect, useState, useMemo, useCallback } from "react";
import { FaSyncAlt } from "react-icons/fa";
import {
  Area,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as ReTooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from "recharts";

// Helpers
const fmtDurationCompact = (sec) => {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${String(h).padStart(2, "0")}h ${String(m % 60).padStart(2, "0")}m`;
  return `${m}m`;
};
const fmtDurationForPie = (sec) => (sec / 60).toFixed(1) + "m";
const humanPercent = (v) => `${Math.round(v * 100)}%`;

// Try fetch wrapper with fallback
async function tryFetchJson(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("bad");
    return await res.json();
  } catch {
    return null;
  }
}

// Mock data generator (used if backend not available)
function makeMockStats() {
  // apps with seconds used today
  const apps = [
    { exe: "WeChat.exe", window: "WeChat", seconds: 2 * 60 + 30 },
    { exe: "QQ.exe", window: "QQ", seconds: 50 },
    { exe: "Code.exe", window: "VSCode", seconds: 90 * 60 },
    { exe: "Chrome.exe", window: "Chrome - Tabs", seconds: 120 * 60 },
    { exe: "Slack.exe", window: "Slack", seconds: 40 * 60 },
    { exe: "Spotify.exe", window: "Spotify", seconds: 10 }, // tiny -> other
  ];
  // hourly arrays
  const hours = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, "0")}:00`,
    work: Math.floor(Math.random() * 60),
    active: Math.floor(Math.random() * 60),
  }));
  const totalWork = apps.reduce((s, a) => s + a.seconds, 0);
  const totalRest = 180 * 60 - Math.floor(Math.random() * 60 * 60);
  return { apps, hours, totalWork, totalRest, blockedCount: 3 };
}

export default function Stats() {
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState(false);

  // core state
  const [apps, setApps] = useState([]); // {exe, window, seconds, included}
  const [hoursData, setHoursData] = useState([]); // hourly {hour,work,active}
  const [totalWork, setTotalWork] = useState(0);
  const [totalRest, setTotalRest] = useState(0);
  const [blockedCount, setBlockedCount] = useState(0);

  // fetch function (manual or scheduled)
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setBackendError(false);
    const remote = await tryFetchJson("http://127.0.0.1:30033/stats?period=day");
    // expected remote format: {"Chrome":3600,"VSCode":1200} or richer - we handle simple case
    if (remote) {
      // remote is map exe->seconds OR a more complex object; normalize defensively
      // If remote.stats exists, use it
      let normalizedApps = [];
      if (Array.isArray(remote)) {
        // maybe remote returns array of entries
        normalizedApps = remote.map((r) => ({
          exe: r.app || r.exe || r.name || "Unknown",
          window: r.window || r.app || r.exe || "Unknown",
          seconds: r.duration || r.seconds || 0,
        }));
      } else if (typeof remote === "object") {
        // remote could be map app->seconds (most likely)
        normalizedApps = Object.entries(remote).map(([k, v]) => ({
          exe: k,
          window: k,
          seconds: Number(v || 0),
        }));
      }
      if (normalizedApps.length === 0) {
        setBackendError(true);
      } else {
        // mark included default true
        const withIncluded = normalizedApps.map((a) => ({ ...a, included: true }));
        setApps(withIncluded);
        setHoursData([]); // no hourly in this simplistic API
        setTotalWork(withIncluded.reduce((s, x) => s + x.seconds, 0));
        setTotalRest(0);
        setBlockedCount(0);
        setLastUpdatedAt(new Date());
        setLoading(false);
        return;
      }
    }

    // fallback to mock
    const mock = makeMockStats();
    setApps(mock.apps.map((a) => ({ ...a, included: true })));
    setHoursData(mock.hours);
    setTotalWork(mock.totalWork);
    setTotalRest(mock.totalRest);
    setBlockedCount(mock.blockedCount);
    setLastUpdatedAt(new Date());
    setBackendError(true);
    setLoading(false);
  }, []);

  // initial + 1min interval
  useEffect(() => {
    fetchStats();
    const t = setInterval(fetchStats, 60 * 1000);
    return () => clearInterval(t);
  }, [fetchStats]);

  // Derived: normalize apps by grouping <15s into "Other"
  const processedApps = useMemo(() => {
    const threshold = 15; // seconds
    const big = [];
    let otherSeconds = 0;
    apps.forEach((a) => {
      if (a.seconds < threshold) otherSeconds += a.seconds;
      else big.push(a);
    });
    // sort descending by seconds
    big.sort((x, y) => y.seconds - x.seconds);
    const list = [...big];
    if (otherSeconds > 0) list.push({ exe: "Other", window: "Other", seconds: otherSeconds, included: true, isOther: true });
    return list;
  }, [apps]);

  // total seconds of included apps (for percentage)
  const includedTotal = useMemo(() => processedApps.reduce((s, a) => (a.included ? s + a.seconds : s), 0), [processedApps]);

  // toggle include/exclude when square clicked
  const toggleInclude = (idx) => {
    const target = processedApps[idx];
    if (!target) return;

    if (target.isOther) {
      // 特殊处理 Other
      setApps((prev) => {
        const hasOther = prev.find((p) => p.exe === "Other");
        if (hasOther) {
          return prev.map((p) =>
            p.exe === "Other" ? { ...p, included: !p.included } : p
          );
        } else {
          return [...prev, { ...target, included: !target.included }];
        }
      });
    } else {
      setApps((prev) =>
        prev.map((p) =>
          p.exe === target.exe ? { ...p, included: !p.included } : p
        )
      );
    }
  };


  // Chart data for pie & bar: only include apps with included true
  const chartData = useMemo(() => {
    return processedApps
      .filter((a) => a.included)
      .map((a) => ({ name: a.exe, value: a.seconds }));
  }, [processedApps]);

  // Bar: 与饼图保持一致
  const barData = chartData;

  // Line chart: need two series per hour: active & work. We already have hoursData mock.
  const lineData = useMemo(() => {
    if (hoursData && hoursData.length === 24) return hoursData;
    // generate hours if missing: distribute includedTotal roughly
    const perHour = Math.max(0, Math.round((includedTotal / 60) / 24));
    return Array.from({ length: 24 }, (_, h) => ({
      hour: `${String(h).padStart(2, "0")}:00`,
      active: Math.round(Math.random() * 40 + perHour),
      work: Math.round(Math.random() * 30 + perHour / 2),
    }));
  }, [hoursData, includedTotal]);

  // colors for pie cells (re-use palette, fallback)
  const palette = ["#4A8C4E", "#82AC26", "#F7F181", "#FFA22A", "#FF662A", "#4F3F84", "#58CFFB", "#F0FF00"];

  return (
    <div style={{ padding: 20, fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h2>统计</h2>
 <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
  <button 
    onClick={fetchStats} 
    style={{ 
      width: 36,
      height: 36,
      borderRadius: 6,
      border: "none",
      background: "#4A8C4E",
      color: "#fff",
      cursor: "pointer",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      transition: "background 0.2s ease"
    }}
    title="刷新数据"
  >
    {/* 确保已导入FaSyncAlt图标 */}
    <FaSyncAlt 
	  size={18} 
	  style={{ 
		animation: loading ? "spin 1s linear infinite" : "none" 
	  }} 
	/>
  </button>
  <div style={{ fontSize: 12, color: "#666" }}>
    {loading ? "刷新中..." : lastUpdatedAt ? `上次：${lastUpdatedAt.toLocaleTimeString()}` : ""}
  </div>
</div>
      </div>

      {/* Top stats blocks (3 items similar to Console style) */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, background: "#4A8C4E", color: "#fff", padding: 16, borderRadius: 10 }}>
          <div style={{ fontSize: 14 }}>今日工作时间</div>
          <div style={{ fontSize: 22, fontWeight: "bold", marginTop: 8 }}>{fmtDurationCompact(totalWork)}</div>
        </div>
        <div style={{ flex: 1, background: "#82AC26", color: "#fff", padding: 16, borderRadius: 10 }}>
          <div style={{ fontSize: 14 }}>休息时间</div>
          <div style={{ fontSize: 22, fontWeight: "bold", marginTop: 8 }}>
            {fmtDurationCompact(totalRest)} / {fmtDurationCompact(180 * 60)}
          </div>
        </div>
        <div style={{ flex: 1, background: "#FF662A", color: "#fff", padding: 16, borderRadius: 10 }}>
          <div style={{ fontSize: 14 }}>关闭程序</div>
          <div style={{ fontSize: 22, fontWeight: "bold", marginTop: 8 }}>{blockedCount}个</div>
        </div>
      </div>

      {/* Main split: list (left) + charts (right) */}
      <div style={{ display: "flex", gap: 16 }}>
        {/* Left: app list - 调整宽度和高度 */}
        <div style={{ 
          flex: 1,  // 增加宽度占比（原1 → 1.2）
          borderRadius: 8, 
          padding: 12, 
          background: "#fff", 
          boxShadow: "0 1px 4px rgba(0,0,0,0.26)" 
        }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <div style={{ width: 18 }} /> {/* placeholder for hidden header "是否统计" */}
            <div style={{ width: 120, fontWeight: "600" }}>应用名称</div>
            <div style={{ width: 120, fontWeight: "600" }}>窗口名称</div>
            <div style={{ flex: 1, minwidth:"60", textAlign: "right", fontWeight: "600" }}>使用时长</div>
            <div style={{ flex: 2, minwidth:"120", textAlign: "left", fontWeight: "600", paddingLeft: 12 }}>占比</div>
          </div>

          {/* 调整滚动区域高度 */}
          <div style={{ 
            maxHeight: 500,  // 增加高度（原420px → 500px）
            overflowY: "auto",
            // 可选项：添加滚动条样式美化
            scrollbarWidth: "thin",
            scrollbarColor: "#82AC26 #f0f0f0"
          }}>
            {/* App list rows */}
  {processedApps.map((a, idx) => {
    const percent = includedTotal > 0 ? a.seconds / includedTotal : 0;
    const displayTime = a.seconds < 60 ? `${a.seconds}s` : `${Math.floor(a.seconds / 60)}m`;
    const isGray = a.gray || !a.included;
    return (
      <div key={a.exe + idx} style={{ display: "flex", alignItems: "center", padding: "8px 4px", gap: 8 }}>
        {/* square toggle */}
                          <div
                    onClick={() => toggleInclude(idx)}
                    title={a.included ? "点击取消统计" : "点击包含统计"}
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      cursor: "pointer",
                      background: a.included ? "#4A8C4E" : "#A6A6A6",
                      flex: "0 0 18px",
                    }}
                  />

        <div style={{ width: 120, fontWeight: 600 }}>{a.exe}</div>
        <div style={{ width: 120, color: "#666" }}>{a.window}</div>
        <div style={{ flex: 1, textAlign: "right", fontFamily: "monospace" }}>{displayTime}</div>
        <div style={{ flex: 2, paddingLeft: 12 }}>
          <div style={{ height: 10, background: "#eee", borderRadius: 6, overflow: "hidden" }}>
            <div
              style={{
                width: isGray ? "0%" : `${Math.round(percent * 100)}%`,
                height: "100%",
                background: isGray ? "#A6A6A6" : "#4A8C4E",
                transition: "width 0.6s ease",
              }}
            />
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
            {isGray ? "-" : `${Math.round(percent * 100)}%`}
          </div>
        </div>
      </div>
    );
  })}
          </div>
        </div>

 
          <div style={{ 
            flex: 1,  // 占比1份
            background: "#fff", 
            padding: 12, 
            borderRadius: 8,
            height: "100%", 
            boxShadow: "0 1px 4px rgba(0,0,0,0.26)" 
          }}>
            <h4 style={{ margin: 0, marginBottom: 8 }}>应用使用（饼图）</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.filter((d) => {
                    // include only items that correspond to processedApps included true
                    const app = processedApps.find((p) => p.exe === d.name);
                    return !app || app.included;
                  })}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={"80%"}
                  label={(entry) => entry.name === "Other" ? "Other" : ""}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />
                  ))}
                </Pie>
                <ReTooltip formatter={(v, name) => [`${fmtDurationForPie(v)}`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div style={{ 
            flex: 1,  // 占比1份
            background: "#fff", 
            padding: 12, 
            borderRadius: 8,
            height: "100%", 
            boxShadow: "0 1px 4px rgba(0,0,0,0.26)" 
          }}>
            <h4 style={{ margin: 0, marginBottom: 8 }}>应用使用（柱状图）</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis />
                <ReTooltip formatter={(v) => fmtDurationForPie(v)} />
                <Bar dataKey="value" fill="#82AC26" />
              </BarChart>
            </ResponsiveContainer>
          </div>


 
		
      </div>
	            <div style={{ marginTop: "1%",height: 360, background: "#fff", padding: 12, borderRadius: 8, 
          boxShadow: "0 1px 4px rgba(0,0,0,0.26)"  }}>
            <h4 style={{ margin: 0, marginBottom: 8 }}>折线：工作时长 vs 使用时长（小时）</h4>
<ResponsiveContainer width="100%" height={260}>
  <LineChart 
    data={lineData}
    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}  // 添加边距避免内容被截断
  >
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="hour" />
    <YAxis />
    <ReTooltip />
    <Legend />
    
    {/* work面积与线条 - 增加显式配置 */}
    <Area 
      type="monotone" 
      dataKey="work" 
      stroke="#4A8C4E" 
      strokeWidth={2}
      fill="#4A8C4E" 
      fillOpacity={0.3}
      activeDot={{ r: 8 }}  // 鼠标悬停时的圆点
      isAnimationActive={false}  // 禁用动画避免渲染问题
    />
    
    {/* active面积与线条 */}
    <Area 
      type="monotone" 
      dataKey="active" 
      stroke="#8884d8" 
      strokeWidth={2}
      fill="#8884d8" 
      fillOpacity={0.3}
      activeDot={{ r: 8 }}
      isAnimationActive={false}
    />
  </LineChart>
</ResponsiveContainer>
          </div>
    </div>
  );
}
