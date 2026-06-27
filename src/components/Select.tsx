import React from "react";

interface SelectOption {
  value: string | number;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  className = "",
  id,
  ...props
}) => {
  const selectId = id || `select-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="form-group">
      <label htmlFor={selectId} className="form-label">
        {label}
      </label>
      <select
        id={selectId}
        className={`form-control ${className}`}
        style={{
          width: "100%",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'></polyline></svg>")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
          backgroundSize: "18px",
          paddingRight: "40px",
        }}
        {...props}
      >
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            style={{ background: "var(--bg-modal)", color: "var(--text-primary)" }}
          >
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span style={{ fontSize: "0.8rem", color: "var(--color-danger)", marginTop: "4px" }}>
          {error}
        </span>
      )}
    </div>
  );
};
