import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isNavPathActive, navItems } from "../app/navigation";

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="bottom-nav-container">
      {navItems.map(({ path, label, Icon }) => (
        <button
          key={path}
          className={`nav-tab-button ${isNavPathActive(location.pathname, path) ? "active" : ""}`}
          onClick={() => navigate(path)}
        >
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
};
