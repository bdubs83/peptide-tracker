import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { SyringeVisualizer } from "../../components/SyringeVisualizer";
import { calculateReconstitution, drawAmountToMl, solveReconstitutionInput } from "./calculatorUtils";
import {
  formatMl,
  formatUnits,
  formatMgPerMl,
  formatMcgPerMl,
  formatDosesPerVial,
  formatPercentOfVial,
} from "../../utils/formatting";
import type { DoseUnit } from "../../types/peptide";
import { AlertCircle, Plus } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import type { ReconstitutionSolveField } from "./calculatorUtils";

type CalculatorLocationState = {
  peptideMg?: number;
  bacWaterMl?: number;
  desiredDoseValue?: number;
  desiredDoseUnit?: DoseUnit;
  syringeSizeMl?: number;
  unitsPerMl?: number;
};

const getStandardSyringeOption = (size: number) => {
  if (size === 0.3) return "0.3";
  if (size === 0.5) return "0.5";
  if (size === 1) return "1.0";
  if (size === 3) return "3.0";
  return null;
};

export const CalculatorPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Input states
  const [peptideMg, setPeptideMg] = useState<string>("5");
  const [bacWaterMl, setBacWaterMl] = useState<string>("2");
  const [desiredDoseValue, setDesiredDoseValue] = useState<string>("0.25");
  const [desiredDoseUnit, setDesiredDoseUnit] = useState<DoseUnit>("mg");
  const [drawAmount, setDrawAmount] = useState<string>("10");
  const [solveFor, setSolveFor] = useState<ReconstitutionSolveField>("drawAmount");
  const [syringeSize, setSyringeSize] = useState<string>("1.0");
  const [customSyringeSize, setCustomSyringeSize] = useState<string>("");
  const [unitsPerMl, setUnitsPerMl] = useState<string>("100");
  const [syringeDisplayMode, setSyringeDisplayMode] = useState<"mL" | "units">("units");

  // Load user default preferences from settings
  const settingsList = useLiveQuery(() => db.appSettings.toArray());
  const preferencesInitializedRef = useRef(false);
  const calculatorLocationState = location.state as CalculatorLocationState | null;

  // Load state parameters if passed via router navigation (e.g. recalculating from details page)
  const prefillInitializedRef = useRef(false);
  useEffect(() => {
    if (!calculatorLocationState || prefillInitializedRef.current) return;
    prefillInitializedRef.current = true;
    queueMicrotask(() => {
      if (calculatorLocationState.peptideMg !== undefined) setPeptideMg(String(calculatorLocationState.peptideMg));
      if (calculatorLocationState.bacWaterMl !== undefined) setBacWaterMl(String(calculatorLocationState.bacWaterMl));
      if (calculatorLocationState.desiredDoseValue !== undefined) {
        setDesiredDoseValue(String(calculatorLocationState.desiredDoseValue));
      }
      if (calculatorLocationState.desiredDoseUnit !== undefined) setDesiredDoseUnit(calculatorLocationState.desiredDoseUnit);
      if (calculatorLocationState.unitsPerMl !== undefined) setUnitsPerMl(String(calculatorLocationState.unitsPerMl));

      if (calculatorLocationState.syringeSizeMl !== undefined) {
        const size = calculatorLocationState.syringeSizeMl;
        const standardSize = getStandardSyringeOption(size);
        if (standardSize) {
          setSyringeSize(standardSize);
        } else {
          setSyringeSize("custom");
          setCustomSyringeSize(String(size));
        }
      }
    });
  }, [calculatorLocationState]);

  useEffect(() => {
    // Only load preferences if no router navigation state parameters are passed,
    // and if we haven't already applied the preferences on mount.
    if (calculatorLocationState || preferencesInitializedRef.current || !settingsList) return;

    preferencesInitializedRef.current = true;
    queueMicrotask(() => {
      settingsList.forEach((item) => {
        if (item.key === "pref_syringeSize" && typeof item.value === "string") {
          setSyringeSize(item.value);
        }
        if (item.key === "pref_displayMode" && (item.value === "mL" || item.value === "units")) {
          setSyringeDisplayMode(item.value);
        }
        if (item.key === "pref_dosingUnit" && (item.value === "mcg" || item.value === "mg")) {
          setDesiredDoseUnit(item.value);
        }
      });
    });
  }, [settingsList, calculatorLocationState]);

  // Determine active syringe size
  const activeSyringeSizeMl =
    syringeSize === "custom"
      ? parseFloat(customSyringeSize) || 0
      : parseFloat(syringeSize);
  const isInjectionPen = Math.abs(activeSyringeSizeMl - 3) < 0.0001;

  const solvedInput = useMemo(() => {
    const mg = parseFloat(peptideMg);
    const water = parseFloat(bacWaterMl);
    const dose = parseFloat(desiredDoseValue);
    const draw = parseFloat(drawAmount);
    const upm = parseFloat(unitsPerMl);

    if (
      isNaN(mg) ||
      mg <= 0 ||
      isNaN(upm) ||
      upm <= 0 ||
      isNaN(activeSyringeSizeMl) ||
      activeSyringeSizeMl <= 0
    ) {
      return null;
    }

    return solveReconstitutionInput({
      peptideMg: mg,
      bacWaterMl: solveFor === "bacWaterMl" || isNaN(water) ? undefined : water,
      desiredDoseValue: solveFor === "desiredDoseValue" || isNaN(dose) ? undefined : dose,
      desiredDoseUnit,
      drawAmount: solveFor === "drawAmount" || isNaN(draw) ? undefined : draw,
      syringeDisplayMode,
      unitsPerMl: upm,
    });
  }, [activeSyringeSizeMl, bacWaterMl, desiredDoseUnit, desiredDoseValue, drawAmount, peptideMg, solveFor, syringeDisplayMode, unitsPerMl]);

  const effectiveBacWaterMl = solvedInput?.field === "bacWaterMl" ? String(Number(solvedInput.value.toFixed(4))) : bacWaterMl;
  const effectiveDesiredDoseValue =
    solvedInput?.field === "desiredDoseValue" ? String(Number(solvedInput.value.toFixed(4))) : desiredDoseValue;
  const effectiveDrawAmount = solvedInput?.field === "drawAmount" ? String(Number(solvedInput.value.toFixed(2))) : drawAmount;

  const outputs = useMemo(() => {
    const mg = parseFloat(peptideMg);
    const water = parseFloat(effectiveBacWaterMl);
    const dose = parseFloat(effectiveDesiredDoseValue);
    const upm = parseFloat(unitsPerMl);
    const draw = parseFloat(effectiveDrawAmount);

    // Validation checks
    if (
      isNaN(mg) ||
      mg <= 0 ||
      isNaN(water) ||
      water <= 0 ||
      isNaN(dose) ||
      dose <= 0 ||
      isNaN(upm) ||
      upm <= 0 ||
      isNaN(activeSyringeSizeMl) ||
      activeSyringeSizeMl <= 0
    ) {
      return null;
    }

    const result = calculateReconstitution({
      peptideMg: mg,
      bacWaterMl: water,
      desiredDoseValue: dose,
      desiredDoseUnit: desiredDoseUnit,
      unitsPerMl: upm,
    });

    if (solveFor !== "drawAmount" && !isNaN(draw) && draw > 0) {
      const drawMl = drawAmountToMl(draw, syringeDisplayMode, upm);
      return {
        ...result,
        doseMl: drawMl,
        doseUnits: drawMl * upm,
      };
    }

    return result;
  }, [
    activeSyringeSizeMl,
    effectiveBacWaterMl,
    effectiveDesiredDoseValue,
    effectiveDrawAmount,
    peptideMg,
    desiredDoseUnit,
    solveFor,
    syringeDisplayMode,
    unitsPerMl,
  ]);
  const warning =
    outputs && outputs.doseMl > activeSyringeSizeMl
      ? `Calculated amount exceeds the selected ${isInjectionPen ? "pen capacity" : "syringe size"}.`
      : "";

  const handleSaveToVault = () => {
    if (!outputs) return;
    navigate("/vault/add", {
      state: {
        peptideMg: parseFloat(peptideMg),
        bacWaterMl: parseFloat(effectiveBacWaterMl),
        desiredDoseValue: parseFloat(effectiveDesiredDoseValue),
        desiredDoseUnit: desiredDoseUnit,
        syringeSizeMl: activeSyringeSizeMl,
        unitsPerMl: parseFloat(unitsPerMl),
      },
    });
  };

  return (
    <div className="fade-in calculator-page">
      <div className="calculator-layout" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Input Panel Card */}
        <Card>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>Reconstitution Inputs</h2>

          <Select
            label="Solve For"
            value={solveFor}
            onChange={(e) => setSolveFor(e.target.value as ReconstitutionSolveField)}
            options={[
              { value: "drawAmount", label: syringeDisplayMode === "units" ? (isInjectionPen ? "Pen Dial Units" : "Syringe Units") : "mL Draw" },
              { value: "bacWaterMl", label: "BAC Water" },
              { value: "desiredDoseValue", label: "Desired Dose" },
            ]}
          />
          
          <div className="form-row-grid">
            <Input
              label="Peptide Amount"
              type="number"
              inputMode="decimal"
              value={peptideMg}
              onChange={(e) => setPeptideMg(e.target.value)}
              suffix="mg"
              min="0.01"
              step="any"
            />
            <Input
              label={solveFor === "bacWaterMl" ? "BAC Water (calculated)" : "BAC Water"}
              type="number"
              inputMode="decimal"
              value={effectiveBacWaterMl}
              onChange={(e) => setBacWaterMl(e.target.value)}
              suffix="mL"
              min="0.01"
              step="any"
              readOnly={solveFor === "bacWaterMl"}
              warning={solveFor === "bacWaterMl" ? "Calculated from dose and draw amount." : undefined}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
            <Input
              label={solveFor === "desiredDoseValue" ? "Desired Dose (calculated)" : "Desired Dose"}
              type="number"
              inputMode="decimal"
              value={effectiveDesiredDoseValue}
              onChange={(e) => setDesiredDoseValue(e.target.value)}
              min="0.01"
              step="any"
              readOnly={solveFor === "desiredDoseValue"}
              warning={solveFor === "desiredDoseValue" ? "Calculated from water and draw amount." : undefined}
            />
            <Select
              label="Unit"
              value={desiredDoseUnit}
              onChange={(e) => setDesiredDoseUnit(e.target.value as DoseUnit)}
              options={[
                { value: "mcg", label: "mcg" },
                { value: "mg", label: "mg" },
              ]}
            />
          </div>

          <Input
            label={
              solveFor === "drawAmount"
                ? syringeDisplayMode === "units"
                  ? isInjectionPen ? "Pen Dial Setting (calculated)" : "Syringe Units (calculated)"
                  : "mL Draw (calculated)"
                : syringeDisplayMode === "units"
                  ? isInjectionPen ? "Desired Pen Dial Setting" : "Desired Syringe Units"
                  : "Desired mL Draw"
            }
            type="number"
            inputMode="decimal"
            value={effectiveDrawAmount}
            onChange={(e) => setDrawAmount(e.target.value)}
            suffix={syringeDisplayMode === "units" ? "units" : "mL"}
            min="0.01"
            step="any"
            readOnly={solveFor === "drawAmount"}
            warning={solveFor === "drawAmount" ? "Calculated from water and dose." : undefined}
          />

          <div className="form-row-grid">
            <Select
              label="Injection Device"
              value={syringeSize}
              onChange={(e) => setSyringeSize(e.target.value)}
              options={[
                { value: "0.3", label: "0.3 mL" },
                { value: "0.5", label: "0.5 mL" },
                { value: "1.0", label: "1.0 mL" },
                { value: "3.0", label: "3 mL Pen" },
                { value: "custom", label: "Custom" },
              ]}
            />
            
            {syringeSize === "custom" ? (
              <Input
                label="Custom Size"
                type="number"
                inputMode="decimal"
                value={customSyringeSize}
                onChange={(e) => setCustomSyringeSize(e.target.value)}
                suffix="mL"
                min="0.01"
                step="any"
              />
            ) : (
              <Input
                label="Units per mL"
                type="number"
                inputMode="numeric"
                value={unitsPerMl}
                onChange={(e) => setUnitsPerMl(e.target.value)}
                min="1"
              />
            )}
          </div>

          <Select
            label="Dose Display Mode"
            value={syringeDisplayMode}
            onChange={(e) => setSyringeDisplayMode(e.target.value as "mL" | "units")}
            options={[
              { value: "units", label: isInjectionPen ? "Pen Dial Units (recommended)" : "Syringe Units (recommended)" },
              { value: "mL", label: "mL Draw" },
            ]}
          />
        </Card>

        {/* Warning Indicator */}
        {warning && (
          <div
            style={{
              background: "rgba(244, 63, 94, 0.1)",
              border: "1px solid var(--color-danger)",
              borderRadius: "var(--border-radius-sm)",
              padding: "12px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "var(--color-danger)",
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            <AlertCircle size={20} style={{ flexShrink: 0 }} />
            <span>{warning}</span>
          </div>
        )}

        {/* Output Panel Card */}
        {outputs ? (
          <Card>
            <h2 style={{ fontSize: "1.2rem", marginBottom: "16px" }}>Calculation Results</h2>

            {/* Display Dosing Draw Visual */}
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                padding: "20px",
                borderRadius: "var(--border-radius-sm)",
                border: "1px dashed var(--border-color)",
                textAlign: "center",
                marginBottom: "20px",
              }}
            >
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {isInjectionPen ? "Required Pen Setting" : "Required Draw Amount"}
              </span>
              <h1
                style={{
                  fontSize: "2rem",
                  background: "var(--gradient-brand)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  margin: "8px 0",
                  fontFamily: "var(--font-display)",
                }}
              >
                {syringeDisplayMode === "units"
                  ? formatUnits(outputs.doseUnits)
                  : formatMl(outputs.doseMl)}
              </h1>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                {syringeDisplayMode === "units"
                  ? `Equivalent to ${formatMl(outputs.doseMl)}`
                  : `Equivalent to ${formatUnits(outputs.doseUnits)}`}
              </span>
            </div>

            <SyringeVisualizer
              drawMl={outputs.doseMl}
              syringeSizeMl={activeSyringeSizeMl}
              unitsPerMl={parseFloat(unitsPerMl) || 100}
              displayMode={syringeDisplayMode}
            />

            {/* Output Details Grid */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "0.95rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Concentration (mg)</span>
                <span style={{ fontWeight: 600 }}>{formatMgPerMl(outputs.concentrationMgPerMl)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Concentration (mcg)</span>
                <span style={{ fontWeight: 600 }}>{formatMcgPerMl(outputs.concentrationMcgPerMl)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Approx. Doses per Vial</span>
                <span style={{ fontWeight: 600 }}>{formatDosesPerVial(outputs.estimatedDosesPerVial)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "4px" }}>
                <span style={{ color: "var(--text-secondary)" }}>Vial Used per Dose</span>
                <span style={{ fontWeight: 600 }}>{formatPercentOfVial(outputs.percentOfVialPerDose)}</span>
              </div>
            </div>

            <Button
              variant="success"
              fullWidth
              style={{ marginTop: "20px" }}
              onClick={handleSaveToVault}
            >
              <Plus size={18} />
              Save to Vault
            </Button>
          </Card>
        ) : (
          <div
            style={{
              padding: "40px 20px",
              textAlign: "center",
              color: "var(--text-muted)",
              border: "1px dashed var(--border-color)",
              borderRadius: "var(--border-radius-md)",
            }}
          >
            Enter valid reconstitution parameters above to see dose calculation results.
          </div>
        )}
      </div>
    </div>
  );
};
