import React, { useMemo } from "react";
import { InjectionPenVisualizer } from "./InjectionPenVisualizer";

interface SyringeVisualizerProps {
  drawMl: number;
  syringeSizeMl: number;
  unitsPerMl: number;
  displayMode?: "units" | "mL";
}

export const SyringeVisualizer: React.FC<SyringeVisualizerProps> = ({
  drawMl,
  syringeSizeMl,
  unitsPerMl,
  displayMode = "units",
}) => {
  const safeSyringeSizeMl = Number.isFinite(syringeSizeMl) && syringeSizeMl > 0 ? syringeSizeMl : 1.0;
  const safeUnitsPerMl = Number.isFinite(unitsPerMl) && unitsPerMl > 0 ? unitsPerMl : 100;
  const safeDrawMl = Number.isFinite(drawMl) && drawMl > 0 ? drawMl : 0;

  const maxUnits = useMemo(() => {
    return Math.max(1, Math.round(safeSyringeSizeMl * safeUnitsPerMl));
  }, [safeSyringeSizeMl, safeUnitsPerMl]);

  const drawUnits = useMemo(() => {
    return safeDrawMl * safeUnitsPerMl;
  }, [safeDrawMl, safeUnitsPerMl]);

  // Percentage filled (capped at 100%)
  const fillRatio = useMemo(() => {
    return Math.min(1, Math.max(0, safeDrawMl / safeSyringeSizeMl));
  }, [safeDrawMl, safeSyringeSizeMl]);

  const percentText = `${(fillRatio * 100).toFixed(0)}%`;

  // SVG parameters
  const width = 500;
  const height = 110;
  const barrelStart = 90;
  const barrelEnd = 410;
  const barrelWidth = barrelEnd - barrelStart;
  const barrelTop = 30;
  const barrelBottom = 70;
  const barrelHeight = barrelBottom - barrelTop;

  // Fluid and Plunger coordinates
  const fluidWidth = barrelWidth * fillRatio;
  const stopperWidth = 12;
  const stopperX = barrelStart + fluidWidth;

  // Generate tick marks along the barrel
  const ticks = useMemo(() => {
    const list: Array<{ x: number; label?: string; isMajor: boolean }> = [];
    if (maxUnits <= 0) return list;

    // Determine spacing of ticks based on syringe capacity
    let interval = 10;
    let minorInterval = 2;
    if (maxUnits <= 30) {
      interval = 5;
      minorInterval = 1;
    } else if (maxUnits <= 50) {
      interval = 5;
      minorInterval = 1;
    } else if (maxUnits > 100) {
      interval = Math.ceil(maxUnits / 10 / 5) * 5;
      minorInterval = Math.max(1, interval / 2);
    }

    for (let u = 0; u <= maxUnits; u += minorInterval) {
      const isMajor = u % interval === 0;
      const x = barrelStart + (u / maxUnits) * barrelWidth;
      const label = isMajor ? String(u) : undefined;
      list.push({ x, label, isMajor });
    }

    return list;
  }, [maxUnits, barrelWidth, barrelStart]);

  if (Math.abs(safeSyringeSizeMl - 3) < 0.0001) {
    return (
      <InjectionPenVisualizer
        drawMl={safeDrawMl}
        unitsPerMl={safeUnitsPerMl}
        displayMode={displayMode}
      />
    );
  }

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
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
          fontWeight: 600,
        }}
      >
        <span>Syringe Calibration Visualizer</span>
        <span>
          Filled: {percentText} of {safeSyringeSizeMl} mL ({maxUnits} Units)
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{
          width: "100%",
          maxHeight: "110px",
          display: "block",
          overflow: "visible",
        }}
        aria-label={`Visual syringe drawing showing fluid at ${percentText} capacity`}
      >
        {/* Needle Hub & Needle */}
        {/* Needle (silver line) */}
        <line
          x1="10"
          y1="50"
          x2="70"
          y2="50"
          stroke="#94a3b8"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Plastic needle holder (hub) */}
        <polygon
          points="70,42 90,30 90,70 70,58"
          fill="#1e1b4b"
          stroke="var(--border-color)"
          strokeWidth="1"
        />

        {/* Fluid level inside syringe */}
        {fluidWidth > 0 && (
          <rect
            x={barrelStart}
            y={barrelTop + 1}
            width={fluidWidth}
            height={barrelHeight - 2}
            fill="rgba(99, 102, 241, 0.38)"
            style={{ transition: "width 0.3s ease-out" }}
          />
        )}

        {/* Syringe Plunger Shaft (extending out the back) */}
        <rect
          x={stopperX}
          y="46"
          width={Math.max(0, width - stopperX - 30)}
          height="8"
          fill="rgba(148, 163, 184, 0.3)"
          style={{ transition: "x 0.3s ease-out" }}
        />
        {/* Plunger Thumb Press */}
        <rect
          x={Math.max(barrelEnd, stopperX + Math.max(0, width - stopperX - 30))}
          y="35"
          width="8"
          height="30"
          rx="2"
          fill="#64748b"
          style={{ transition: "x 0.3s ease-out" }}
        />

        {/* Rubber Stopper (tip of the plunger) */}
        <rect
          x={stopperX - stopperWidth / 2}
          y={barrelTop + 2}
          width={stopperWidth}
          height={barrelHeight - 4}
          rx="2"
          fill="#1e293b"
          stroke="#475569"
          strokeWidth="1.5"
          style={{ transition: "x 0.3s ease-out" }}
        />
        <line
          x1={stopperX}
          y1={barrelTop + 4}
          x2={stopperX}
          y2={barrelBottom - 4}
          stroke="#94a3b8"
          strokeWidth="2"
          style={{ transition: "x 0.3s ease-out" }}
        />

        {/* Transparent Glass Syringe Barrel Cylinder */}
        <rect
          x={barrelStart}
          y={barrelTop}
          width={barrelWidth}
          height={barrelHeight}
          rx="1"
          fill="rgba(255, 255, 255, 0.03)"
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="1.5"
        />
        
        {/* Barrel Finger Flanges */}
        <rect
          x={barrelEnd}
          y="20"
          width="6"
          height="60"
          rx="2"
          fill="rgba(255, 255, 255, 0.25)"
        />

        {/* Ticks and Labels */}
        {ticks.map((tick, index) => (
          <g key={`tick-${index}`}>
            <line
              x1={tick.x}
              y1={barrelTop}
              x2={tick.x}
              y2={barrelTop + (tick.isMajor ? 8 : 4)}
              stroke="rgba(255, 255, 255, 0.55)"
              strokeWidth={tick.isMajor ? "1.5" : "1"}
            />
            <line
              x1={tick.x}
              y1={barrelBottom}
              x2={tick.x}
              y2={barrelBottom - (tick.isMajor ? 8 : 4)}
              stroke="rgba(255, 255, 255, 0.55)"
              strokeWidth={tick.isMajor ? "1.5" : "1"}
            />
            {tick.label && (
              <text
                x={tick.x}
                y={barrelBottom + 18}
                fill="var(--text-secondary)"
                fontSize="9"
                textAnchor="middle"
                fontWeight="700"
              >
                {tick.label}
              </text>
            )}
          </g>
        ))}

        {/* Draw Amount Indicator Label inside the barrel */}
        <text
          x={barrelStart + barrelWidth / 2}
          y={barrelTop - 8}
          fill="var(--text-primary)"
          fontSize="11"
          fontWeight="800"
          textAnchor="middle"
        >
          {displayMode === "units"
            ? `${drawUnits.toFixed(1)} Units`
            : `${safeDrawMl.toFixed(3)} mL`}
        </text>
      </svg>
    </div>
  );
};
