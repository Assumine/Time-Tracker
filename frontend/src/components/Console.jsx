import React, { useState, useEffect, useRef } from "react";
import { FaSyncAlt } from "react-icons/fa";

const Console = () => {
  const [workPeriods, setWorkPeriods] = useState([
    { start: "12:00", end: "16:00" },
    { start: "17:00", end: "18:00" },
    { start: "20:00", end: "21:00" },
  ]);
  const [countdown, setCountdown] = useState(240);
  const [restMinutes, setRestMinutes] = useState(0);
  const [blockedCount, setBlockedCount] = useState(2);
  const [isWorking, setIsWorking] = useState(true);
  const keyframesAdded = useRef(false);

  // 倒计时（假数据）
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 0 ? 240 : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 添加渐变动画关键帧
  useEffect(() => {
    if (!keyframesAdded.current) {
      const styleSheet = document.createElement("style");
      styleSheet.textContent = `
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 50% 0%; }
          100% { background-position: 100% 50%; }
        }
      `;
      document.head.appendChild(styleSheet);
      keyframesAdded.current = true;
    }
  }, []);

  // 倒计时格式化
  const formatTime = (seconds) => {
    const m = String(Math.floor(seconds / 60)).padStart(2, "0");
    const s = String(seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  };

  // 主容器
  const containerStyle = {
    padding: "1.25rem",
    fontFamily: "Arial, sans-serif",
  };

  // 工作状态大块
  const largeBlockStyle = {
    width: "83.33%",
    height: "11.25rem", // 180px
    borderRadius: "0.75rem",
    margin: "1.25rem auto",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    color: "#fff",
    fontSize: "1.75rem",
    fontWeight: "bold",
    background: isWorking
      ? "linear-gradient(90deg, #F0FF00, #58CFFB)"
      : "linear-gradient(90deg, #E1E1E1, #A1A1A1, #616161)",
    backgroundSize: "200% 200%",
    animation: "gradientFlow 10s linear infinite",
  };

  // 四个模块容器 
  const cardsContainerStyle = {
    display: "flex",
    width: "85%",
    margin: "0 auto",
  };

  const cardBaseStyle = {
    flex: 1,
    margin: "0 0.625rem",
    borderRadius: "0.75rem",
    padding: "1rem",
    color: "#fff",
    fontSize: "1.5rem",
    height: "11.25rem", // 180px 固定
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  };

  const cardTitleStyle = {
    fontSize: "0.9rem",
    marginBottom: "0.75rem",
    textAlign: "center",
  };

  // 时间段样式
  const workPeriodsContainer = {
    position: "relative",
    margin: "0 auto",
    width: "90%",
    height: "6.25rem",
  };

  const scrollContainerStyle = {
    overflowY: "auto",
    height: "100%",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    textAlign: "center",
  };

  const maskStyle = {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "1.875rem",
    background: "linear-gradient(to bottom, rgba(79, 63, 132, 0) 0%, rgba(79, 63, 132, 1) 100%)",
    borderRadius: "0 0 0.75rem 0.75rem",
    pointerEvents: "none",
  };

  const workPeriodColors = [ "#5882B9", "#3F5D84", "#324A6A", "#26384F" ];


  const timePeriodStyle = (index) => ({
    background: workPeriodColors[index] || "#A6A6A6",
    borderRadius: "0.375rem",
    padding: "0.375rem 0.75rem",
    marginBottom: "0.5rem",
    fontWeight: "bold",
    fontSize: "1rem",
    display: "flex",
    justifyContent: "center",
  });

  // 时间刻度尺
  const timeRulerContainer = {
    marginTop: "4%",
    marginLeft: "10%",
    width: "80%",
  };

  const timeRulerStyle = {
    position: "relative",
    width: "100%",
    margin: "0 auto",
    height: "1rem",
  };

  const nowIndicatorStyle = {
    position: "absolute",
    top: "-0.75rem",
    bottom: 0,
    width: "0.125rem",
    backgroundColor: "red",
  };

  const timeLabelStyle = {
    position: "absolute",
    top: "-1.125rem",
    transform: "translateX(-50%)",
    fontSize: "0.625rem",
    color: "#000",
  };

  const timeMarkerStyle = (height) => ({
    position: "absolute",
    bottom: 0,
    width: "0.0625rem",
    height: `${height}rem`,
    background: "#000",
  });

  const renderTimeRuler = () => {
    const totalMinutes = 24 * 60;
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return (
      <div style={timeRulerStyle}>
        {Array.from({ length: totalMinutes / 10 + 1 }).map((_, i) => {
          const minute = i * 10;
          const left = (minute / totalMinutes) * 100 + "%";
          const hour = Math.floor(minute / 60);

          let height = 0.375;
          let label = null;
          if (minute % 60 === 0) {
            height = 1;
            label = `${hour}:00`;
          } else if (minute % 30 === 0) {
            height = 0.625;
          }

          return (
            <React.Fragment key={i}>
              <div style={{ ...timeMarkerStyle(height), left }} />
              {label && <div style={{ ...timeLabelStyle, left }}>{label}</div>}
            </React.Fragment>
          );
        })}
        <div style={{ ...nowIndicatorStyle, left: `${(nowMinutes / totalMinutes) * 100}%` }} />
      </div>
    );
  };

  return (
    <div style={containerStyle}>
      {/* 工作状态大块 */}
      <div style={largeBlockStyle}>{isWorking ? "工作时间" : "休息时间"}</div>

      {/* 四个模块 */}
      <div style={cardsContainerStyle}>
        {/* 工作时间段 */}
        <div style={{ ...cardBaseStyle, background: "#4F3F84" }}>
          <div style={cardTitleStyle}>工作时间段</div>
          <div style={workPeriodsContainer}>
            <div style={scrollContainerStyle}>
              {workPeriods.map((p, i) => (
                <div key={i} style={timePeriodStyle(i)}>
                  {p.start} ~ {p.end}
                </div>
              ))}
            </div>
            <div style={maskStyle} />
          </div>
        </div>

        {/* 倒计时 */}
        <div style={{ ...cardBaseStyle, background: "#FFA22A" }}>
          <div style={cardTitleStyle}>下班倒计时</div>
          <div style={{ fontSize: "2em", textAlign: "center" }}>{formatTime(countdown)}</div>
        </div>

        {/* 休息时间 */}
        <div style={{ ...cardBaseStyle, background: "#82AC26" }}>
          <div style={cardTitleStyle}>休息时间</div>
          <div style={{ textAlign: "center", fontSize: "2em" }}>
            {restMinutes}min{" "}
            <button
              style={{
                border: "none",
                background: "transparent",
                color: "#fff",
                cursor: "pointer",
                fontSize: "1rem",
              }}
            >
              <FaSyncAlt />
            </button>
          </div>
        </div>

        {/* 已禁止应用 */}
        <div style={{ ...cardBaseStyle, background: "#FF662A" }}>
          <div style={cardTitleStyle}>已禁止程序数</div>
          <div style={{ fontSize: "2em", textAlign: "center" }}>{blockedCount}</div>
        </div>
      </div>

      {/* 时间刻度尺 */}
      <div style={timeRulerContainer}>{renderTimeRuler()}</div>
    </div>
  );
};

export default Console;
