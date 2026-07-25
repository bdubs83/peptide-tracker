// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SyringeVisualizer } from "./SyringeVisualizer";

describe("SyringeVisualizer", () => {
  it("automatically renders saved 3 mL devices as injection pens with a dial setting", () => {
    render(<SyringeVisualizer drawMl={0.25} syringeSizeMl={3} unitsPerMl={100} />);

    expect(screen.getByText("3 mL Injection Pen")).toBeTruthy();
    expect(screen.getByText("Set dial to 25 units")).toBeTruthy();
    expect(screen.getByRole("img", { name: "Injection pen showing a dial setting of 25 units" })).toBeTruthy();
    expect(screen.queryByText("Syringe Calibration Visualizer")).toBeNull();
  });

  it("keeps the syringe visual for smaller syringe sizes", () => {
    render(<SyringeVisualizer drawMl={0.1} syringeSizeMl={1} unitsPerMl={100} />);
    expect(screen.getByText("Syringe Calibration Visualizer")).toBeTruthy();
  });
});
