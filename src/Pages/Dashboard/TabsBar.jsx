// src/Pages/Dashboard/TabsBar.jsx
import { useCallback, useMemo } from "react";

export default function TabsBar({ activeTab, setActiveTab }) {
  const tabs = useMemo(
    () => [
      {
        id: "docs",
        label: "📂 My Documents",
        accent: "linear-gradient(90deg,#7C5CFF,#22C1C3)", // indigo → aqua
        glow: "0 16px 36px rgba(124,92,255,.28)",
      },
      {
        id: "private",
        label: "🔒 Private Shares",
        accent: "linear-gradient(90deg,#FF4D88,#FF6A3D)", // hot pink → coral
        glow: "0 16px 36px rgba(255,77,136,.28)",
      },
      {
        id: "public",
        label: "🌍 Public Shares",
        accent: "linear-gradient(90deg,#22D3EE,#7C5CFF)", // cyan → indigo
        glow: "0 16px 36px rgba(34,211,238,.26)",
      },
      {
        id: "received",
        label: "📥 Received",
        accent: "linear-gradient(90deg,#FFD54A,#FF6A3D)", // lemon → orange
        glow: "0 16px 36px rgba(255,213,74,.28)",
      },
      // 🔻 New tab
      {
        id: "reduce",
        label: "📉 Reduce Size",
        accent: "linear-gradient(90deg,#8B5CF6,#34D399)", // violet → mint
        glow: "0 16px 36px rgba(139,92,246,.30)",
      },
    ],
    []
  );

  const onKeyDown = useCallback(
    (e) => {
      const idx = tabs.findIndex((t) => t.id === activeTab);
      if (idx === -1) return;

      if (e.key === "ArrowRight") {
        const next = tabs[(idx + 1) % tabs.length].id;
        setActiveTab(next);
        e.preventDefault();
      } else if (e.key === "ArrowLeft") {
        const prev = tabs[(idx - 1 + tabs.length) % tabs.length].id;
        setActiveTab(prev);
        e.preventDefault();
      }
    },
    [activeTab, setActiveTab, tabs]
  );

  return (
    <div
      className="tabs"
      role="tablist"
      aria-label="Dashboard sections"
      onKeyDown={onKeyDown}
    >
      {tabs.map((t) => {
        const isActive = activeTab === t.id;

        const style = {
          "--tab-accent": isActive ? undefined : "rgba(255,255,255,.72)",
          background: isActive ? t.accent : undefined,
          boxShadow: isActive
            ? `${t.glow}, 0 0 0 1px rgba(255,255,255,.35) inset`
            : undefined,
          color: isActive ? "#FFFFFF" : undefined,
        };

        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={isActive}
            aria-controls={`panel-${t.id}`}
            id={`tab-${t.id}`}
            tabIndex={isActive ? 0 : -1}
            onClick={() => setActiveTab(t.id)}
            className={`tab ${isActive ? "active" : ""}`}
            style={style}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
