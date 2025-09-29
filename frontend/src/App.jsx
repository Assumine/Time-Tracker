import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Console from "./components/Console";
import Stats from "./components/Stats";
import Logs from "./components/Logs";
import Settings from "./components/Settings";
import AppList from "./components/AppList";
import AppListEnhanced from "./components/AppListEnhanced";
import './assets/css/global.css'; // 导入全局样式


export default function App() {
  const [activeTab, setActiveTab] = useState("console");

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "system-ui, Arial, sans-serif" }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main style={{ flex: 1, padding: 16, overflow: "auto" }}>
        {activeTab === "console" && <Console />}
        {activeTab === "stats" && <Stats />}
        {activeTab === "logs" && <Logs />}
        {activeTab === "settings" && <Settings />}
        {activeTab === "apps" && <AppListEnhanced />}
      </main>
    </div>
  );
}
