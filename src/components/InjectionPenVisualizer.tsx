import React from "react";

interface InjectionPenVisualizerProps {
  drawMl: number;
  unitsPerMl: number;
  displayMode?: "units" | "mL";
}

const formatNumber = (value: number, digits: number) => Number(value.toFixed(digits));

export const InjectionPenVisualizer: React.FC<InjectionPenVisualizerProps> = ({
  drawMl,
  unitsPerMl,
  displayMode = "units",
}) => {
  const safeDrawMl = Number.isFinite(drawMl) && drawMl > 0 ? drawMl : 0;
  const safeUnitsPerMl = Number.isFinite(unitsPerMl) && unitsPerMl > 0 ? unitsPerMl : 100;
  const dialUnits = safeDrawMl * safeUnitsPerMl;
  const dialText = formatNumber(dialUnits, 1).toString();

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.01)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--border-radius-sm)",
        padding: "16px",
        marginTop: "12px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <div style={{ width: "100%", display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
        <span>3 mL Injection Pen</span>
        <span style={{ color: "var(--color-primary)" }}>Set dial to {dialText} units</span>
      </div>

      <svg
        viewBox="0 0 520 132"
        style={{ width: "100%", maxHeight: "132px", display: "block", overflow: "visible" }}
        role="img"
        aria-label={`Injection pen showing a dial setting of ${dialText} units`}
      >
        <defs>
          <linearGradient id="pen-body-gradient" x1="0" x2="1">
            <stop offset="0" stopColor="#312e81" />
            <stop offset="0.58" stopColor="#4f46e5" />
            <stop offset="1" stopColor="#3730a3" />
          </linearGradient>
          <linearGradient id="pen-cartridge-gradient" x1="0" x2="1">
            <stop offset="0" stopColor="rgba(165, 180, 252, 0.18)" />
            <stop offset="1" stopColor="rgba(129, 140, 248, 0.5)" />
          </linearGradient>
        </defs>

        {/* Pen needle and hub */}
        <line x1="8" y1="61" x2="45" y2="61" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
        <polygon points="45,54 67,48 67,74 45,68" fill="#c7d2fe" stroke="#64748b" strokeWidth="1" />
        <rect x="64" y="43" width="20" height="36" rx="6" fill="#e0e7ff" stroke="#818cf8" strokeWidth="1.5" />

        {/* Pen body and cartridge window */}
        <rect x="78" y="36" width="292" height="50" rx="24" fill="url(#pen-body-gradient)" stroke="#818cf8" strokeWidth="1.5" />
        <rect x="106" y="47" width="118" height="28" rx="10" fill="#111827" stroke="#a5b4fc" strokeWidth="1" />
        <rect x="114" y="52" width="102" height="18" rx="7" fill="url(#pen-cartridge-gradient)" />
        <line x1="137" y1="54" x2="137" y2="68" stroke="rgba(255,255,255,0.35)" />
        <line x1="164" y1="54" x2="164" y2="68" stroke="rgba(255,255,255,0.35)" />
        <line x1="191" y1="54" x2="191" y2="68" stroke="rgba(255,255,255,0.35)" />
        <text x="265" y="66" fill="#eef2ff" fontSize="13" fontWeight="800" textAnchor="middle">3 mL PEN</text>

        {/* Dose display and end dial */}
        <rect x="350" y="43" width="58" height="36" rx="7" fill="#0f172a" stroke="#c7d2fe" strokeWidth="2" />
        <text x="379" y="67" fill="#ffffff" fontSize="20" fontWeight="900" textAnchor="middle">{dialText}</text>
        <rect x="405" y="37" width="67" height="48" rx="12" fill="#4338ca" stroke="#a5b4fc" strokeWidth="1.5" />
        {[414, 424, 434, 444, 454, 464].map((x) => (
          <line key={x} x1={x} y1="41" x2={x} y2="81" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
        ))}
        <rect x="469" y="45" width="38" height="32" rx="10" fill="#6366f1" stroke="#c7d2fe" strokeWidth="1.5" />

        {/* Dial direction and instruction */}
        <path d="M420 22 C440 8, 468 12, 480 27" fill="none" stroke="#a5b4fc" strokeWidth="2" strokeLinecap="round" />
        <polygon points="478,22 487,29 476,31" fill="#a5b4fc" />
        <text x="379" y="105" fill="var(--text-primary)" fontSize="12" fontWeight="800" textAnchor="middle">
          DIAL TO {dialText} UNITS
        </text>
        <text x="379" y="121" fill="var(--text-secondary)" fontSize="10" textAnchor="middle">
          {displayMode === "mL" ? `${formatNumber(safeDrawMl, 3)} mL equivalent` : `${formatNumber(safeDrawMl, 3)} mL`}
        </text>
      </svg>
    </div>
  );
};
