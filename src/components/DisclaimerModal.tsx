import React from "react";
import { Button } from "./Button";
import { AlertTriangle } from "lucide-react";

interface DisclaimerModalProps {
  isOpen: boolean;
  forceAccept?: boolean;
  onAccept?: () => void;
  onClose?: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({
  isOpen,
  forceAccept = false,
  onAccept,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ textAlign: "center" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px",
            borderRadius: "50%",
            background: "rgba(245, 158, 11, 0.1)",
            color: "var(--color-warning)",
            marginBottom: "16px",
          }}
        >
          <AlertTriangle size={36} />
        </div>

        <h3
          style={{
            fontSize: "1.3rem",
            marginBottom: "12px",
            fontFamily: "var(--font-display)",
          }}
        >
          Safety Disclaimer
        </h3>

        <p
          style={{
            fontSize: "0.95rem",
            color: "var(--text-secondary)",
            lineHeight: "1.6",
            marginBottom: "24px",
            textAlign: "left",
            background: "rgba(255, 255, 255, 0.02)",
            padding: "16px",
            borderRadius: "var(--border-radius-sm)",
            borderLeft: "3px solid var(--color-warning)",
          }}
        >
          This app is for tracking and calculation support only. It does not provide medical
          advice, dosing recommendations, diagnosis, or treatment guidance. Users are responsible
          for verifying all calculations with a qualified medical professional.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {forceAccept ? (
            <Button variant="primary" fullWidth onClick={onAccept}>
              I Understand & Accept
            </Button>
          ) : (
            <Button variant="secondary" fullWidth onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
