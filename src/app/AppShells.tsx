import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Copy } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { isNavPathActive, navItems } from "./navigation";

type ShellProps = {
  children: React.ReactNode;
  copied: boolean;
  onCopyLink: () => void;
};

const BrandHeader: React.FC<
  Pick<ShellProps, "copied" | "onCopyLink"> & {
    compact?: boolean;
  }
> = ({ copied, onCopyLink, compact = false }) => (
  <header className={compact ? "desktop-brand" : "header-bar"} style={compact ? undefined : { padding: "10px 16px" }}>
    <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
      <img
        src="/icon-192.png"
        alt="Inner Circle Logo"
        style={{
          width: compact ? "42px" : "44px",
          height: compact ? "42px" : "44px",
          borderRadius: "10px",
          objectFit: "cover",
          border: "1px solid var(--border-color)",
          flexShrink: 0,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 }}>
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
        <div style={{ display: "flex", alignItems: "center", gap: "6px", minWidth: 0 }}>
          <a
            href="https://www.youtube.com/@RetaUnfiltered"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.75rem",
              color: "var(--text-secondary)",
              textDecoration: "none",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            youtube.com/@RetaUnfiltered
          </a>
          <button
            onClick={onCopyLink}
            style={{
              background: "none",
              border: "none",
              color: copied ? "var(--color-success)" : "var(--text-muted)",
              cursor: "pointer",
              padding: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Copy Link"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        </div>
      </div>
    </div>

    <div style={{ width: "28px", flexShrink: 0 }} />
  </header>
);

export const MobileAppShell: React.FC<ShellProps> = ({
  children,
  copied,
  onCopyLink,
}) => (
  <div className="app-container mobile-app-container">
    <BrandHeader copied={copied} onCopyLink={onCopyLink} />
    <main className="page-content">{children}</main>
    <BottomNav />
  </div>
);

export const DesktopAppShell: React.FC<ShellProps> = ({
  children,
  copied,
  onCopyLink,
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="desktop-app-shell">
      <aside className="desktop-sidebar">
        <BrandHeader
          compact
          copied={copied}
          onCopyLink={onCopyLink}
        />
        <nav className="desktop-nav" aria-label="Main navigation">
          {navItems.map(({ path, label, Icon }) => {
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

      <main className="desktop-page-content">{children}</main>
    </div>
  );
};
