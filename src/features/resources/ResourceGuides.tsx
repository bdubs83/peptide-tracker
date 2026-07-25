import React, { useState } from "react";
import { Activity, ChevronDown, ChevronRight, Droplet, FileText, Info, ShieldAlert } from "lucide-react";
import { Card } from "../../components/Card";

const bodyStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  fontSize: "0.9rem",
  color: "var(--text-primary)",
};

export const ResourceGuides: React.FC = () => {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const sections = [
    {
      id: "reconstitution",
      title: "Reconstitution & Mixing Guide",
      icon: <Droplet size={20} style={{ color: "var(--color-primary)" }} />,
      content: (
        <div style={bodyStyle}>
          <p>Lyophilized peptides arrive as a freeze-dried powder. Reconstitution is the process of mixing this powder with sterile Bacteriostatic (BAC) water so it can be measured and administered.</p>
          <div style={{ background: "var(--bg-input)", border: "1px solid var(--border-color)", borderRadius: "var(--border-radius-sm)", padding: "12px" }}>
            <h4 style={{ fontSize: "0.85rem", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: "6px" }}>The Reconstitution Formula</h4>
            <div style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--color-primary)" }}>Dose Draw (mL) = (Desired Dose (mcg) / Total Vial Peptide (mcg)) × BAC Water Volume (mL)</div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", marginTop: "4px" }}>Note: 1 mg = 1,000 mcg. Therefore, a 5 mg vial contains 5,000 mcg.</p>
          </div>
          <h4 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Common Mixing Configurations</h4>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
              <thead><tr style={{ borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}><th style={{ padding: "6px 4px" }}>Vial Size</th><th style={{ padding: "6px 4px" }}>BAC Water</th><th style={{ padding: "6px 4px" }}>Target Dose</th><th style={{ padding: "6px 4px" }}>Syringe Draw</th></tr></thead>
              <tbody>
                <tr><td style={{ padding: "8px 4px" }}>5 mg</td><td>2.0 mL</td><td>250 mcg</td><td style={{ color: "var(--color-primary)", fontWeight: 700 }}>10 Units (0.1 mL)</td></tr>
                <tr><td style={{ padding: "8px 4px" }}>10 mg</td><td>2.0 mL</td><td>500 mcg</td><td style={{ color: "var(--color-primary)", fontWeight: 700 }}>10 Units (0.1 mL)</td></tr>
                <tr><td style={{ padding: "8px 4px" }}>15 mg</td><td>3.0 mL</td><td>750 mcg</td><td style={{ color: "var(--color-primary)", fontWeight: 700 }}>15 Units (0.15 mL)</td></tr>
              </tbody>
            </table>
          </div>
          <h4 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Step-by-Step Mixing Protocol</h4>
          <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
            <li>Clean your workspace and wash your hands thoroughly.</li>
            <li>Wipe the rubber stoppers of both the BAC water vial and the peptide vial with an alcohol swab; let them dry for 10 seconds.</li>
            <li>Using a syringe, draw the exact volume of BAC water required.</li>
            <li>Insert the needle into the peptide vial at a 45-degree angle. <strong>Slowly</strong> drip the water down the inside glass wall of the vial. Do not spray directly onto the powder.</li>
            <li>Once the water is added, withdraw the needle. Gently swirl the vial in circular motions. <strong>Never shake the vial</strong>.</li>
          </ol>
        </div>
      ),
    },
    {
      id: "syringe",
      title: "Syringes Decoded (U-100 vs U-40)",
      icon: <Activity size={20} style={{ color: "var(--color-secondary)" }} />,
      content: (
        <div style={bodyStyle}>
          <p>Understanding the distinction between liquid volume (mL) and syringe markers (Units) is crucial to avoid under-dosing or over-dosing.</p>
          <div style={{ background: "var(--bg-active-soft)", border: "1px solid var(--border-color-focus)", borderRadius: "var(--border-radius-sm)", padding: "12px" }}>
            <h4 style={{ fontSize: "0.9rem", color: "var(--color-primary)", display: "flex", alignItems: "center", gap: "6px" }}><Info size={16} /> U-100 Syringes (Standard)</h4>
            <p>Most insulin/peptide syringes are <strong>U-100</strong>, which means there are <strong>100 units in 1.0 mL</strong>.</p>
            <div style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>• 1 Unit = 0.01 mL<br />• 10 Units = 0.10 mL<br />• 50 Units = 0.50 mL</div>
          </div>
          <div style={{ background: "var(--bg-card-hover)", border: "1px solid var(--border-color-focus)", borderRadius: "var(--border-radius-sm)", padding: "12px" }}>
            <h4 style={{ fontSize: "0.9rem", color: "var(--color-secondary)", display: "flex", alignItems: "center", gap: "6px" }}><Info size={16} /> U-40 Syringes</h4>
            <p>Some specialized veterinary or therapeutic syringes are <strong>U-40</strong>, which means <strong>40 units in 1.0 mL</strong>.</p>
            <div style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>• 1 Unit = 0.025 mL<br />• 10 Units = 0.25 mL<br />• 20 Units = 0.50 mL</div>
          </div>
          <div style={{ background: "rgba(244, 63, 94, 0.05)", border: "1px solid rgba(244, 63, 94, 0.2)", borderRadius: "var(--border-radius-sm)", padding: "12px", display: "flex", gap: "8px" }}>
            <ShieldAlert size={20} style={{ color: "var(--color-danger)", flexShrink: 0 }} />
            <div style={{ fontSize: "0.8rem" }}><strong>Important Warning:</strong> Always verify the scale type and syringe size before calculating your dose draw.</div>
          </div>
        </div>
      ),
    },
    {
      id: "injection",
      title: "Subcutaneous Injection Basics",
      icon: <FileText size={20} style={{ color: "var(--color-success)" }} />,
      content: (
        <div style={bodyStyle}>
          <p>Subcutaneous (SubQ) injections are administered into the fatty tissue layer just beneath the skin. This allows for slow, stable absorption.</p>
          <h4 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Common Injection Sites</h4>
          <ul style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "4px" }}><li><strong>Abdomen:</strong> At least 2 inches away from the belly button.</li><li><strong>Thighs:</strong> Outer, middle aspect of the thigh.</li><li><strong>Love Handles:</strong> Side of the waist.</li></ul>
          <h4 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Administration Guide</h4>
          <ol style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}><li>Wash hands and sterilize the injection site. Allow the skin to dry completely.</li><li>Pinch a 1-to-2 inch fold of skin.</li><li>Insert the needle quickly at a 45-to-90-degree angle.</li><li>Depress the plunger slowly and steadily.</li><li>Hold the needle in place for 3 to 5 seconds, then pull it straight out.</li><li>Dispose of the syringe in an approved sharps container. <strong>Never reuse needles.</strong></li></ol>
        </div>
      ),
    },
    {
      id: "storage",
      title: "Storage & Handling Best Practices",
      icon: <ShieldAlert size={20} style={{ color: "var(--color-warning)" }} />,
      content: (
        <div style={bodyStyle}>
          <p>Peptides are delicate chains of amino acids. Exposure to heat, light, and mechanical stress can degrade their efficacy.</p>
          <h4 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Lyophilized Powder (Unmixed)</h4>
          <ul style={{ paddingLeft: "20px" }}><li>Store in a cool, dry, dark place.</li><li><strong>Short term (months):</strong> Refrigerate at 2°C to 8°C / 36°F to 46°F.</li><li><strong>Long term (years):</strong> Store at -20°C / -4°F.</li></ul>
          <h4 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Reconstituted Peptide (Mixed)</h4>
          <ul style={{ paddingLeft: "20px" }}><li><strong>Must be refrigerated</strong> after mixing.</li><li>Do not freeze reconstituted peptides.</li><li>Keep out of direct sunlight and extreme temperatures.</li><li>Use within 3 to 8 weeks, depending on the specific stability profile.</li></ul>
          <h4 style={{ fontSize: "0.95rem", fontWeight: 600 }}>Avoid Physical Shock</h4>
          <p>Avoid dropping or shaking the reconstituted vial. Insert the needle gently and avoid venting or bubbling the liquid unnecessarily.</p>
        </div>
      ),
    },
  ];

  return (
    <section aria-labelledby="educational-guides" style={{ marginTop: "24px" }}>
      <h2 id="educational-guides" style={{ fontSize: "1.05rem", marginBottom: "10px" }}>Educational Guides</h2>
      <Card style={{ border: "1px dashed rgba(245, 158, 11, 0.3)", background: "rgba(245, 158, 11, 0.03)", padding: "12px 14px", display: "flex", gap: "10px", marginBottom: "12px" }}>
        <ShieldAlert size={22} style={{ color: "var(--color-warning)", flexShrink: 0 }} />
        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}><strong style={{ color: "var(--color-warning)" }}>Disclaimer:</strong> This content is for educational and informational purposes only and is not medical advice. Always consult a healthcare professional regarding clinical concerns.</div>
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {sections.map((section) => {
          const isOpen = openSection === section.id;
          return (
            <Card key={section.id} style={{ padding: 0, overflow: "hidden", border: isOpen ? "1px solid var(--border-color-focus)" : "1px solid var(--border-color)" }}>
              <button type="button" onClick={() => setOpenSection(isOpen ? null : section.id)} aria-expanded={isOpen} style={{ width: "100%", background: "none", border: "none", padding: "16px", display: "flex", alignItems: "center", cursor: "pointer", textAlign: "left" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>{section.icon}<span style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--text-primary)" }}>{section.title}</span></span>
                <span style={{ color: "var(--text-secondary)" }}>{isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}</span>
              </button>
              {isOpen && <div style={{ padding: "16px", borderTop: "1px solid var(--border-color)" }}>{section.content}</div>}
            </Card>
          );
        })}
      </div>
    </section>
  );
};
