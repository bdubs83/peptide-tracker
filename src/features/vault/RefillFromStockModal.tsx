import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import type { Peptide } from "../../types/peptide";
import type { StockItem } from "../../types/stock";
import { isExactStockProductForVial, sortStockLotsForUse } from "../../utils/stockUtils";

type RefillFromStockModalProps = {
  peptide: Peptide;
  stockOptions: StockItem[];
  onClose: () => void;
  onConfirm: (stockItem: StockItem, reconstitutionBacWaterMl: number) => Promise<void>;
};

const formatPreview = (value: number, digits = 3) => Number(value.toFixed(digits));

export const RefillFromStockModal: React.FC<RefillFromStockModalProps> = ({
  peptide,
  stockOptions,
  onClose,
  onConfirm,
}) => {
  const orderedLots = useMemo(() => {
    return sortStockLotsForUse(stockOptions).sort((left, right) => {
      const leftExact = isExactStockProductForVial(left, peptide.name, peptide.vialMg) ? 0 : 1;
      const rightExact = isExactStockProductForVial(right, peptide.name, peptide.vialMg) ? 0 : 1;
      return leftExact - rightExact;
    });
  }, [peptide.name, peptide.vialMg, stockOptions]);
  const initialStock = orderedLots[0];
  const initialStockMatchesCurrentVial = initialStock
    ? isExactStockProductForVial(initialStock, peptide.name, peptide.vialMg)
    : false;
  const [selectedStockId, setSelectedStockId] = useState(initialStock?.id || "");
  const [bacWaterMl, setBacWaterMl] = useState(
    initialStockMatchesCurrentVial ? String(peptide.isOilBased ? peptide.oilVolumeMl ?? "" : peptide.bacWaterMl) : ""
  );
  const [isVerified, setIsVerified] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const selectedStock = orderedLots.find((item) => item.id === selectedStockId);
  const selectedMg = Number(selectedStock?.mgPerVial);
  const parsedBacWaterMl = Number(bacWaterMl);
  const isValidReconstitution =
    Number.isFinite(selectedMg) && selectedMg > 0 && Number.isFinite(parsedBacWaterMl) && parsedBacWaterMl > 0;
  const concentrationMgPerMl = isValidReconstitution ? selectedMg / parsedBacWaterMl : null;
  const isDifferentStrength = selectedStock
    ? !isExactStockProductForVial(selectedStock, peptide.name, peptide.vialMg)
    : false;

  const selectStock = (stockId: string) => {
    setSelectedStockId(stockId);
    const selected = orderedLots.find((item) => item.id === stockId);
    const matchesCurrentVial = selected
      ? isExactStockProductForVial(selected, peptide.name, peptide.vialMg)
      : false;
    setBacWaterMl(matchesCurrentVial ? String(peptide.isOilBased ? peptide.oilVolumeMl ?? "" : peptide.bacWaterMl) : "");
    setIsVerified(false);
    setErrorMessage("");
  };

  const confirmRefill = async () => {
    if (!selectedStock || !isValidReconstitution || !isVerified) return;
    setIsSaving(true);
    setErrorMessage("");
    try {
      await onConfirm(selectedStock, parsedBacWaterMl);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Could not pull this vial from stock.");
      setIsSaving(false);
    }
  };

  return createPortal(
    <div
      className="modal-overlay stock-modal-overlay"
      onClick={onClose}
      style={{ alignItems: "flex-start", overflowY: "auto", padding: "12px" }}
    >
      <div className="modal-content stock-modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="stock-modal-header" style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <h3 style={{ fontSize: "1.15rem" }}>Pull From Stock</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.84rem", marginTop: "4px" }}>
              Continue {peptide.name}'s dosing history
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close refill popup"
            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {orderedLots.map((item) => {
            const selected = selectedStockId === item.id;
            const exactStrength = isExactStockProductForVial(item, peptide.name, peptide.vialMg);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectStock(item.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: selected ? "1px solid var(--color-primary)" : "1px solid var(--border-color)",
                  borderRadius: "8px",
                  background: selected ? "rgba(99, 102, 241, 0.12)" : "rgba(255,255,255,0.02)",
                  color: "var(--text-primary)",
                  padding: "12px",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                  <strong>{item.mgPerVial || "Unknown"} mg vial</strong>
                  <span className="badge">{item.numberOfVials || "0"} remaining</span>
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "6px" }}>
                  {item.batchNumber ? `Batch ${item.batchNumber}` : "No batch listed"}
                  {item.supplier ? ` • ${item.supplier}` : ""}
                </div>
                <div style={{ marginTop: "6px" }}>
                  <span className="badge">{exactStrength ? "Same strength" : `Different from current ${peptide.vialMg} mg`}</span>
                </div>
              </button>
            );
          })}
        </div>

        {selectedStock && (
          <div
            style={{
              marginTop: "14px",
              padding: "12px",
              borderRadius: "8px",
              border: isDifferentStrength ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid var(--border-color)",
              background: isDifferentStrength ? "rgba(245, 158, 11, 0.08)" : "rgba(255,255,255,0.025)",
            }}
          >
            {isDifferentStrength && (
              <p style={{ color: "var(--color-warning)", fontWeight: 700, marginBottom: "10px" }}>
                Different strength selected. The dosing schedule and history will stay intact, but concentration and draw will change.
              </p>
            )}
            <Input
              label={peptide.isOilBased ? "Prefilled vial volume" : "Bacteriostatic water actually used"}
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={bacWaterMl}
              onChange={(event) => {
                setBacWaterMl(event.target.value);
                setIsVerified(false);
              }}
              placeholder={peptide.isOilBased ? `Previously ${peptide.oilVolumeMl || "unknown"} mL — enter this vial's volume` : `Previously ${peptide.bacWaterMl} mL — enter this vial's actual amount`}
              suffix="mL"
              required
            />

            {concentrationMgPerMl !== null && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "8px", marginTop: "12px" }}>
                <div className="metric-tile"><span>Vial</span><strong>{selectedMg} mg</strong></div>
                <div className="metric-tile"><span>{peptide.isOilBased ? "Vial volume" : "Water used"}</span><strong>{formatPreview(parsedBacWaterMl)} mL</strong></div>
                <div className="metric-tile"><span>Concentration</span><strong>{formatPreview(concentrationMgPerMl)} mg/mL</strong></div>
              </div>
            )}

            <label style={{ display: "flex", alignItems: "flex-start", gap: "9px", marginTop: "12px", color: "var(--text-secondary)", fontSize: "0.84rem", lineHeight: 1.45 }}>
              <input
                type="checkbox"
                checked={isVerified}
                disabled={!isValidReconstitution}
                onChange={(event) => setIsVerified(event.target.checked)}
                style={{ marginTop: "3px" }}
              />
              <span>
                I verified the selected vial is <strong>{selectedStock.mgPerVial || "unknown"} mg</strong> and that it contains <strong>{bacWaterMl || "—"} mL</strong> of {peptide.isOilBased ? "premixed oil" : "bacteriostatic water"}. Update this open vial's concentration while preserving its schedules and dosing history.
              </span>
            </label>
          </div>
        )}

        {errorMessage && <p style={{ color: "var(--color-danger)", marginTop: "10px" }}>{errorMessage}</p>}

        <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
          <Button variant="secondary" fullWidth onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button
            variant="success"
            fullWidth
            onClick={() => void confirmRefill()}
            disabled={!selectedStock || !isValidReconstitution || !isVerified || isSaving}
          >
            {isSaving ? "Updating…" : "Pull Verified Vial"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
