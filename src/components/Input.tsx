import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  warning?: string;
  suffix?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  warning,
  suffix,
  className = "",
  id,
  ...props
}) => {
  const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="form-group">
      <label htmlFor={inputId} className="form-label">
        {label}
      </label>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          id={inputId}
          className={`form-control ${className}`}
          style={{ width: "100%", paddingRight: suffix ? "45px" : "14px" }}
          {...props}
        />
        {suffix && (
          <span
            style={{
              position: "absolute",
              right: "14px",
              color: "var(--text-secondary)",
              fontSize: "0.9rem",
              fontWeight: 500,
              pointerEvents: "none",
            }}
          >
            {suffix}
          </span>
        )}
      </div>
      {error && (
        <span style={{ fontSize: "0.8rem", color: "var(--color-danger)", marginTop: "4px" }}>
          {error}
        </span>
      )}
      {warning && !error && (
        <span style={{ fontSize: "0.8rem", color: "var(--color-warning)", marginTop: "4px" }}>
          {warning}
        </span>
      )}
    </div>
  );
};
