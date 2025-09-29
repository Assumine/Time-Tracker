import React from "react";

const itemStyle = {
  padding: "8px 12px",
  borderRadius: 6,
  cursor: "pointer",
  userSelect: "none"
};

const Sidebar = ({ activeTab, setActiveTab }) => {
  const menuItems = [
    { key: "console", label: "Console" },
    { key: "stats", label: "Stats" },
    { key: "logs", label: "Logs" },
    { key: "apps", label: "应用列表" },
    { key: "settings", label: "Settings" }
  ];

  return (
    <nav
      aria-label="Main navigation"
      style={{
        width: 200,
        borderRight: "1px solid #e6e6e6",
        padding: 16,
        boxSizing: "border-box",
        background: "#fafafa",
        minHeight: "100vh"
      }}
    >
      <div style={{ marginBottom: 12, fontWeight: 700, fontSize: 18 }}>
        Time Tracker
      </div>

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {menuItems.map((item) => {
          const active = activeTab === item.key;
          return (
            <li
              key={item.key}
              role="button"
              tabIndex={0}
              onClick={() => setActiveTab(item.key)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setActiveTab(item.key); }}
              style={{
                ...itemStyle,
                marginBottom: 6,
                background: active ? "#2563eb" : "transparent",
                color: active ? "#fff" : "#111",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
              }}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default Sidebar;
