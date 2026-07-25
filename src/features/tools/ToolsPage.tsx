import React from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { Activity, Calculator } from "lucide-react";
import { CalculatorPage } from "../calculator/CalculatorPage";
import { MultiHalfLifeTool } from "./MultiHalfLifeTool";

const tools = [
  { path: "calculator", label: "Calculator", Icon: Calculator },
  { path: "half-life", label: "Half-Life", Icon: Activity },
];

export const ToolsPage: React.FC = () => {
  return (
    <div className="fade-in" style={{ paddingBottom: "30px" }}>
      <div style={{ marginBottom: "14px" }}>
        <h1 style={{ fontSize: "1.5rem", fontFamily: "var(--font-display)", marginBottom: "4px" }}>
          Tools
        </h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Calculators and trackers for repeated use.
        </p>
      </div>

      <nav
        aria-label="Tools"
        style={{
          position: "sticky",
          top: "0",
          zIndex: 20,
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: "6px",
          marginBottom: "16px",
          padding: "8px",
          border: "1px solid var(--border-color)",
          borderRadius: "8px",
          background: "var(--bg-nav)",
          backdropFilter: "var(--backdrop-blur)",
        }}
      >
        {tools.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={`/tools/${path}`}
            style={({ isActive }) => ({
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              borderRadius: "8px",
              border: `1px solid ${isActive ? "var(--border-color-focus)" : "transparent"}`,
              background: isActive ? "var(--bg-active-soft)" : "transparent",
              color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
              textDecoration: "none",
              fontSize: "0.78rem",
              fontWeight: 800,
              textAlign: "center",
            })}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <Routes>
        <Route index element={<Navigate to="calculator" replace />} />
        <Route path="calculator" element={<CalculatorPage />} />
        <Route path="half-life" element={<MultiHalfLifeTool />} />
        <Route path="*" element={<Navigate to="calculator" replace />} />
      </Routes>
    </div>
  );
};
