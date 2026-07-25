import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { PRELOADED_PEPTIDES } from "../../utils/peptideList";
import {
  getPeptideCatalogItem,
  getPeptideProfile,
  isHiddenPeptideCatalogItem,
} from "../../utils/peptideDetails";
import type { PeptideCatalogItem } from "../../utils/peptideCatalog";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { AlertTriangle, ChevronRight, Plus, Search, X } from "lucide-react";

const statusTone: Record<string, { color: string; border: string; background: string }> = {
  Approved: { color: "var(--color-success)", border: "rgba(16, 185, 129, 0.35)", background: "rgba(16, 185, 129, 0.1)" },
  Investigational: { color: "var(--color-info)", border: "rgba(14, 165, 233, 0.35)", background: "rgba(14, 165, 233, 0.1)" },
  Research: { color: "var(--color-warning)", border: "rgba(245, 158, 11, 0.35)", background: "rgba(245, 158, 11, 0.1)" },
  Unknown: { color: "var(--text-secondary)", border: "var(--border-color)", background: "rgba(255,255,255,0.04)" },
};

function Badge({ children, tone }: { children: React.ReactNode; tone?: string | null }) {
  const colors = tone ? statusTone[tone] ?? statusTone.Unknown : statusTone.Unknown;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "8px",
        border: `1px solid ${colors.border}`,
        background: colors.background,
        color: colors.color,
        padding: "4px 7px",
        fontSize: "0.7rem",
        fontWeight: 700,
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );
}



function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "116px minmax(0, 1fr)",
        gap: "10px",
        borderBottom: "1px solid var(--border-color)",
        background: "rgba(255,255,255,0.025)",
        padding: "10px 12px",
      }}
    >
      <p
        style={{
          color: "var(--text-muted)",
          fontSize: "0.72rem",
          fontWeight: 800,
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.86rem", lineHeight: 1.45 }}>
        {value}
      </p>
    </div>
  );
}

function PeptideReferenceCard({
  peptide,
  onClick,
}: {
  peptide: PeptideCatalogItem;
  onClick: () => void;
}) {
  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      style={{
        cursor: "pointer",
        border: "1px solid var(--border-color)",
        borderRadius: "8px",
        background: "rgba(255,255,255,0.035)",
        padding: "15px",
        boxShadow: "var(--shadow-sm)",
        transition: "border-color var(--transition-fast), background var(--transition-fast), transform var(--transition-fast)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: "1.08rem", lineHeight: 1.2, marginBottom: "5px" }}>{peptide.name}</h3>
          {peptide.alternateNames.length > 0 && (
            <p
              style={{
                color: "var(--text-muted)",
                fontSize: "0.78rem",
                lineHeight: 1.35,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {peptide.alternateNames.slice(0, 3).join(", ")}
            </p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
          <ChevronRight size={18} style={{ color: "var(--text-muted)" }} />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "12px" }}>
        {peptide.categoryTags.slice(0, 3).map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>

      {peptide.summary && (
        <p
          style={{
            marginTop: "12px",
            color: "var(--text-secondary)",
            fontSize: "0.86rem",
            lineHeight: 1.55,
            overflow: "hidden",
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
          }}
        >
          {peptide.summary}
        </p>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "8px",
          marginTop: "13px",
        }}
      >
        <div className="metric-tile">
          <span>Half-life</span>
          <strong>{peptide.halfLifeDisplay || "Unknown"}</strong>
        </div>
        <div className="metric-tile">
          <span>Route</span>
          <strong>{peptide.route || "Not listed"}</strong>
        </div>
      </div>
    </article>
  );
}

function PeptideDetailsModal({
  peptide,
  onClose,
  onAddToVault,
  onTagClick,
}: {
  peptide: PeptideCatalogItem;
  onClose: () => void;
  onAddToVault: () => void;
  onTagClick: (tag: string) => void;
}) {
  return createPortal(
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ alignItems: "center", padding: "14px" }}
    >
      <section
        className="modal-content"
        role="dialog"
        aria-modal="true"
        aria-label={`${peptide.name} details`}
        onClick={(event) => event.stopPropagation()}
        style={{
          maxWidth: "560px",
          minHeight: "auto",
          maxHeight: "calc(100dvh - 28px)",
          overflowY: "auto",
          padding: "18px",
          borderRadius: "12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontSize: "1.35rem", lineHeight: 1.18 }}>{peptide.name}</h2>
            {peptide.alternateNames.length > 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: "0.84rem", lineHeight: 1.45, marginTop: "5px" }}>
                {peptide.alternateNames.slice(0, 5).join(", ")}
              </p>
            )}
          </div>

          <button
            type="button"
            aria-label="Close peptide details"
            onClick={onClose}
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              background: "rgba(255,255,255,0.05)",
              color: "var(--text-secondary)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {peptide.goal && (
          <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: 1.6, marginTop: "16px" }}>
            {peptide.goal}
          </p>
        )}

        {(() => {
          const isWeekly = (peptide.minDailyDose?.toLowerCase().includes("weekly") ||
                            peptide.maxDailyDose?.toLowerCase().includes("weekly"));
          return (
            <div
              style={{
                border: "1px solid var(--border-color)",
                borderRadius: "8px",
                overflow: "hidden",
                marginTop: "16px",
              }}
            >
              <DetailRow
                label={isWeekly ? "Min Weekly Rec Dose" : "Min Daily Rec Dose"}
                value={peptide.minDailyDose || "Not listed"}
              />
              <DetailRow
                label={isWeekly ? "Max Weekly Rec Dose" : "Max Daily Rec Dose"}
                value={peptide.maxDailyDose || "Not listed"}
              />
              {!isWeekly && peptide.maxWeeklyDose && peptide.maxWeeklyDose.trim().toLowerCase() !== "not stated" && (
                <DetailRow label="Max Weekly Dose" value={peptide.maxWeeklyDose} />
              )}
              {peptide.cycleLengthOn && peptide.cycleLengthOn.trim().toLowerCase() !== "not stated" && (
                <DetailRow label="Cycle Length On" value={peptide.cycleLengthOn} />
              )}
              {peptide.cycleLengthOff && peptide.cycleLengthOff.trim().toLowerCase() !== "not stated" && (
                <DetailRow label="Cycle Length Off" value={peptide.cycleLengthOff} />
              )}
              <DetailRow label="Half Life" value={peptide.halfLifeDisplay || "Unknown"} />
              <DetailRow label="Type" value={peptide.molecularType || "Unknown"} />
            </div>
          );
        })()}

        <div style={{ display: "flex", flexWrap: "wrap", gap: "7px", marginTop: "14px" }}>
          {peptide.categoryTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTagClick(tag)}
              style={{
                background: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                color: "var(--color-primary)",
                padding: "6px 9px",
                borderRadius: "8px",
                fontSize: "0.74rem",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {tag}
            </button>
          ))}
        </div>

        <Button variant="primary" fullWidth style={{ marginTop: "18px" }} onClick={onAddToVault}>
          <Plus size={18} />
          Configure & Add to Vault
        </Button>
      </section>
    </div>,
    document.body
  );
}

function PeptidesDisclaimerModal({
  onClose,
}: {
  onClose: (dontShowAgain: boolean) => void;
}) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  return createPortal(
    <div className="welcome-banner-overlay" role="dialog" aria-modal="true">
      <div className="welcome-banner-panel" style={{ maxWidth: "450px", textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px",
            borderRadius: "50%",
            background: "rgba(245, 158, 11, 0.1)",
            color: "var(--color-warning)",
            margin: "0 auto 10px auto",
            width: "fit-content",
          }}
        >
          <AlertTriangle size={36} />
        </div>

        <h3 style={{ fontSize: "1.2rem", margin: "0 0 8px 0", fontFamily: "var(--font-display)" }}>
          Data Disclaimer
        </h3>

        <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
          All of this information is from{" "}
          <a
            href="https://peptidedosages.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--color-primary)", textDecoration: "underline" }}
          >
            peptidedosages.com
          </a>{" "}
          and is for informational purposes only, not medical or dosing advice.
        </p>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            cursor: "pointer",
            fontSize: "0.85rem",
            color: "var(--text-secondary)",
            margin: "12px 0 6px 0",
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            style={{ cursor: "pointer" }}
          />
          Don't show this again
        </label>

        <div style={{ marginTop: "8px" }}>
          <Button variant="primary" fullWidth onClick={() => onClose(dontShowAgain)}>
            Continue
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export const PeptidesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialTag =
    typeof location.state === "object" &&
    location.state !== null &&
    "selectedTag" in location.state &&
    typeof location.state.selectedTag === "string"
      ? location.state.selectedTag
      : "All";
  const [search, setSearch] = useState("");
  const [selectedTag, setSelectedTag] = useState(initialTag);
  const [selectedPeptideName, setSelectedPeptideName] = useState<string | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(() => {
    return localStorage.getItem("peptides_disclaimer_dismissed") !== "true";
  });

  const handleDisclaimerClose = (dontShowAgain: boolean) => {
    if (dontShowAgain) {
      localStorage.setItem("peptides_disclaimer_dismissed", "true");
    }
    setShowDisclaimer(false);
  };

  const baseFilterTags = [
    "All",
    "Healing",
    "Weight Loss",
    "Skin Care",
    "Cognitive",
    "Longevity",
    "Growth Hormone",
    "Tanning",
  ];
  const filterTags = baseFilterTags.includes(selectedTag)
    ? baseFilterTags
    : [...baseFilterTags, selectedTag];

  const filteredPeptides = PRELOADED_PEPTIDES.filter((name) => {
    const profile = getPeptideProfile(name);
    const catalogItem = getPeptideCatalogItem(name);
    if (catalogItem && isHiddenPeptideCatalogItem(catalogItem)) return false;

    const searchableText = [
      name,
      catalogItem?.alternateNames.join(" "),
      catalogItem?.summary,
      catalogItem?.uses,
      profile.tags.join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    if (!searchableText.includes(search.toLowerCase())) return false;
    if (selectedTag === "All") return true;

    return profile.tags.some((tag) => tag.toLowerCase() === selectedTag.toLowerCase());
  });

  const selectedPeptide = selectedPeptideName ? getPeptideCatalogItem(selectedPeptideName) : undefined;

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
    setSelectedPeptideName(null);
  };

  const handleAddToVault = (name: string) => {
    navigate("/vault/add", {
      state: {
        prefilledName: name,
      },
    });
  };

  return (
    <div className="fade-in" style={{ paddingBottom: "30px" }}>
      <div style={{ marginBottom: "16px" }}>
        <h1 style={{ fontSize: "1.5rem", fontFamily: "var(--font-display)" }}>
          Peptides Catalog
        </h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Learn about research peptides and configure them in your vault
        </p>
      </div>

      <div style={{ position: "relative", marginBottom: "16px" }}>
        <Input
          label=""
          placeholder="Search catalog..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: "40px" }}
        />
        <Search
          size={18}
          style={{
            position: "absolute",
            left: "14px",
            top: "22px",
            color: "var(--text-secondary)",
            pointerEvents: "none",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        {filterTags.map((tag) => {
          const isActive = selectedTag === tag;
          return (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              style={{
                background: isActive ? "var(--color-primary)" : "rgba(255,255,255,0.03)",
                border: "1px solid",
                borderColor: isActive ? "var(--color-primary)" : "var(--border-color)",
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                padding: "8px 13px",
                borderRadius: "8px",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {filteredPeptides.length === 0 ? (
        <div
          style={{
            padding: "40px 20px",
            textAlign: "center",
            border: "1px dashed var(--border-color)",
            borderRadius: "var(--border-radius-md)",
            color: "var(--text-muted)",
          }}
        >
          No matching peptides found.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "12px",
          }}
        >
          {filteredPeptides.map((name) => {
            const peptide = getPeptideCatalogItem(name);
            if (!peptide) return null;

            return (
              <PeptideReferenceCard
                key={peptide.id}
                peptide={peptide}
                onClick={() => setSelectedPeptideName(name)}
              />
            );
          })}
        </div>
      )}

      {selectedPeptide && (
        <PeptideDetailsModal
          peptide={selectedPeptide}
          onClose={() => setSelectedPeptideName(null)}
          onAddToVault={() => handleAddToVault(selectedPeptide.name)}
          onTagClick={handleTagClick}
        />
      )}

      {showDisclaimer && (
        <PeptidesDisclaimerModal onClose={handleDisclaimerClose} />
      )}
    </div>
  );
};
