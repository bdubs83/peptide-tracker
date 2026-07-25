import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { getVisibleNavItems, isNavPathActive, minimalistHiddenTabsKey } from "../app/navigation";

export const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hiddenTabs = useLiveQuery(() => db.appSettings.get(minimalistHiddenTabsKey));
  const visibleNavItems = getVisibleNavItems(hiddenTabs?.value);

  return (
    <div className="bottom-nav-container">
      {visibleNavItems.map(({ path, label, Icon }) => (
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
