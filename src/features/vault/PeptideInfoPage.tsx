import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPeptideProfile, hasJsonPeptideProfile } from "../../utils/peptideDetails";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import {
  Activity,
  CalendarClock,
  ChevronLeft,
  Clock3,
  ClipboardList,
  Info,
  MapPin,
  Plus,
  RotateCcw,
  Snowflake,
  Sparkles,
  Syringe,
} from "lucide-react";

// Consistent color generation function
const getPeptideColor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 75%, 65%)`;
};

// Large premium SVG Vial for detail view
const LargeVialIcon: React.FC<{ color: string }> = ({ color }) => {
  return (
    <svg
      width="100"
      height="150"
      viewBox="0 0 60 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: "drop-shadow(0 8px 24px rgba(0, 0, 0, 0.5))",
        margin: "0 auto",
        display: "block",
      }}
    >
      {/* Cap */}
      <rect x="18" y="2" width="24" height="8" rx="2" fill={color} />
      <rect x="16" y="8" width="28" height="3" fill={color} opacity="0.8" />
      <rect x="22" y="11" width="16" height="4" fill="#94a3b8" />
      
      {/* Neck */}
      <rect
        x="24"
        y="15"
        width="12"
        height="10"
        fill="rgba(255, 255, 255, 0.15)"
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="1"
      />
      
      {/* Body */}
      <rect
        x="10"
        y="25"
        width="40"
        height="60"
        rx="8"
        fill="rgba(255, 255, 255, 0.04)"
        stroke="rgba(255, 255, 255, 0.15)"
        strokeWidth="1.5"
      />
      
      {/* Content */}
      <rect x="13" y="52" width="34" height="30" rx="4" fill={`${color}22`} />
      <line
        x1="13"
        y1="52"
        x2="47"
        y2="52"
        stroke={color}
        strokeWidth="1.5"
        strokeDasharray="2 2"
      />
      
      {/* Label */}
      <rect x="12" y="32" width="36" height="18" rx="1" fill="#ffffff" fillOpacity="0.9" />
      <rect x="16" y="38" width="28" height="2" fill="#475569" />
      <rect x="16" y="44" width="20" height="2" fill="#64748b" />
      
      {/* Glass highlights */}
      <rect x="42" y="28" width="3" height="52" rx="1.5" fill="rgba(255, 255, 255, 0.1)" />
      <path
        d="M 14 29 C 14 29, 20 27, 24 29"
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

const getQuickStartIcon = (label: string) => {
  const lower = label.toLowerCase();
  if (lower.includes("dose")) return <Syringe size={16} />;
  if (lower.includes("often")) return <RotateCcw size={16} />;
  if (lower.includes("where")) return <MapPin size={16} />;
  if (lower.includes("timing")) return <Clock3 size={16} />;
  if (lower.includes("timeline")) return <CalendarClock size={16} />;
  if (lower.includes("storage")) return <Snowflake size={16} />;
  return <ClipboardList size={16} />;
};

export const PeptideInfoPage: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();

  const decodedName = decodeURIComponent(name || "");
  const profile = getPeptideProfile(decodedName);
  const color = getPeptideColor(decodedName);
  const hasImportedProfile = hasJsonPeptideProfile(decodedName);

  const handleAddToVault = () => {
    navigate("/vault/add", {
      state: {
        prefilledName: decodedName,
      },
    });
  };

  const handleTagClick = (tag: string) => {
    navigate("/peptides", {
      state: {
        selectedTag: tag,
      },
    });
  };

  const infoCards = [
    {
      title: `What is ${profile.name}?`,
      icon: <Info size={18} />,
      accent: "var(--color-primary)",
      body: profile.whatIs,
    },
    {
      title: "Key Benefits",
      icon: <Sparkles size={18} />,
      accent: "var(--color-success)",
      body: profile.keyBenefits,
    },
    {
      title: "Mechanism of Action",
      icon: <Activity size={18} />,
      accent: "var(--color-warning)",
      body: profile.mechanismOfAction,
    },
  ];

  return (
    <div className="fade-in" style={{ paddingBottom: "40px" }}>
      {/* Navigation bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
        }}
      >
        <button
          onClick={() => navigate(-1)}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            padding: "4px",
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 style={{ fontSize: "1.4rem" }}>Peptide Profile</h1>
      </div>

      {/* Vial Display Header */}
      <Card
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
          padding: "18px",
          marginBottom: "20px",
        }}
      >
        <div style={{ flex: "0 0 86px" }}>
          <LargeVialIcon color={color} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: "inline-flex",
              padding: "4px 8px",
              borderRadius: "999px",
              background: hasImportedProfile ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
              color: hasImportedProfile ? "var(--color-success)" : "var(--color-warning)",
              fontSize: "0.72rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              marginBottom: "8px",
            }}
          >
            {hasImportedProfile ? "Quick reference" : "Profile coming soon"}
          </span>

          <h2
            style={{
              fontSize: "1.55rem",
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              marginBottom: "10px",
              lineHeight: 1.15,
            }}
          >
            {profile.name}
          </h2>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
            {profile.tags.slice(0, 3).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                style={{
                  border: "1px solid rgba(99, 102, 241, 0.22)",
                  background: "rgba(99, 102, 241, 0.08)",
                  color: "var(--color-primary)",
                  borderRadius: "999px",
                  padding: "4px 8px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                {tag}
              </button>
            ))}
          </div>

          <Button variant="primary" style={{ padding: "10px 18px" }} onClick={handleAddToVault}>
            <Plus size={18} />
            Configure & Add to Vault
          </Button>
        </div>
      </Card>

      {!hasImportedProfile && (
        <Card
          style={{
            marginBottom: "16px",
            border: "1px dashed rgba(245, 158, 11, 0.45)",
            background: "rgba(245, 158, 11, 0.06)",
          }}
        >
          <h3 style={{ fontSize: "1rem", marginBottom: "6px", color: "var(--color-warning)" }}>
            Profile coming soon
          </h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.88rem", lineHeight: 1.5 }}>
            This peptide is in the catalog, but no matching quick-start JSON profile has been imported yet.
          </p>
        </Card>
      )}

      {/* Four-card profile layout */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {infoCards.map((card) => (
          <Card key={card.title}>
            <h3
              style={{
                fontSize: "1.05rem",
                marginBottom: "10px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: card.accent,
              }}
            >
              {card.icon}
              {card.title}
            </h3>
            <p
              style={{
                fontSize: "0.9rem",
                color: "var(--text-secondary)",
                lineHeight: "1.6",
              }}
            >
              {card.body}
            </p>
          </Card>
        ))}

        <Card>
          <h3
            style={{
              fontSize: "1.05rem",
              marginBottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "var(--color-primary)",
            }}
          >
            <ClipboardList size={18} />
            Quick Start Guide
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
            {profile.quickStartGuide.map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  gap: "10px",
                  padding: "12px",
                  borderRadius: "var(--border-radius-sm)",
                  border: "1px solid var(--border-color)",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <span style={{ color: "var(--color-primary)", marginTop: "2px", flexShrink: 0 }}>
                  {getQuickStartIcon(item.label)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      display: "block",
                      marginBottom: "4px",
                    }}
                  >
                    {item.label}
                  </span>
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: "1.4" }}>
                    {item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 style={{ fontSize: "1.05rem", marginBottom: "12px" }}>Profile Tags</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {profile.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                style={{
                  background: "rgba(99, 102, 241, 0.08)",
                  border: "1px solid rgba(99, 102, 241, 0.2)",
                  color: "var(--color-primary)",
                  padding: "6px 12px",
                  borderRadius: "var(--border-radius-sm)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.02em",
                  cursor: "pointer",
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
};
