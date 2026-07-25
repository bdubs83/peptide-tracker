import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Apple, Footprints, LayoutDashboard, Moon, Scale, type LucideIcon } from "lucide-react";
import { getHealthSection, type HealthSectionId } from "./healthSections";

const items: Array<{ id: HealthSectionId; label: string; Icon: LucideIcon }> = [
  { id: "overview", label: "Overview", Icon: LayoutDashboard },
  { id: "body", label: "Body Tracker", Icon: Scale },
  { id: "activity", label: "Activity", Icon: Footprints },
  { id: "nutrition", label: "Nutrition", Icon: Apple },
  { id: "recovery", label: "Recovery", Icon: Moon },
];

export const HealthSubnav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection = getHealthSection(location.search);

  return <nav className="health-subnav" aria-label="Health sections">
    {items.map(({ id, label, Icon }) => <button key={id} type="button" className={activeSection === id ? "active" : ""} onClick={() => navigate(id === "overview" ? "/health" : `/health?tab=${id}`)}><Icon size={18} /><span>{label}</span></button>)}
  </nav>;
};
