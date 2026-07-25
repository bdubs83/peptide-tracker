import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BottomNav } from "../components/BottomNav";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { HealthSubnav } from "../features/health/HealthSubnav";
import { getVisibleNavItems, isNavPathActive, minimalistHiddenTabsKey } from "./navigation";

type ShellProps = {
  children: React.ReactNode;
};

const BrandHeader: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <header className={compact ? "desktop-brand" : "header-bar"} style={compact ? undefined : { padding: "10px 16px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
      <img
        src="/icon-mark-192.png"
        alt="Inner Circle Logo"
        style={{
          width: compact ? "42px" : "44px",
          height: compact ? "42px" : "44px",
          objectFit: "contain",
          flexShrink: 0,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: compact ? "1.2rem" : "1.35rem",
            background: "var(--gradient-brand)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            lineHeight: "1.2",
          }}
        >
          Inner Circle
        </span>
      </div>
    </div>

    <div style={{ width: "28px", flexShrink: 0 }} />
  </header>
);

export const MobileAppShell: React.FC<ShellProps> = ({ children }) => {
  const location = useLocation();
  const isHealthTracker = location.pathname === "/health";
  return <div className="app-container mobile-app-container">
      <BrandHeader />
      <main className={`page-content${isHealthTracker ? " health-page-content" : ""}`}>{children}</main>
      {isHealthTracker && <HealthSubnav />}
      <BottomNav />
    </div>;
};

export const DesktopAppShell: React.FC<ShellProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHealthTracker = location.pathname === "/health";
  const hiddenTabs = useLiveQuery(() => db.appSettings.get(minimalistHiddenTabsKey));
  const visibleNavItems = getVisibleNavItems(hiddenTabs?.value);

  return (
    <div className="desktop-app-shell">
      <aside className="desktop-sidebar">
        <BrandHeader compact />
        <nav className="desktop-nav" aria-label="Main navigation">
          {visibleNavItems.map(({ path, label, Icon }) => {
            const active = isNavPathActive(location.pathname, path);
            return (
              <button
                key={path}
                className={`desktop-nav-item ${active ? "active" : ""}`}
                onClick={() => navigate(path)}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <main className={`desktop-page-content${isHealthTracker ? " desktop-health-page-content" : ""}`}>
        {isHealthTracker && <HealthSubnav />}
        {children}
      </main>
    </div>
  );
};
