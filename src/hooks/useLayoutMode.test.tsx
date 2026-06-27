/**
 * @vitest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useLayoutMode } from "./useLayoutMode";
import type { LayoutMode } from "../db/schema";

const setViewportWidth = (width: number) => {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });
};

const renderLayoutHook = (selectedMode: LayoutMode) =>
  renderHook(({ mode }) => useLayoutMode(mode), {
    initialProps: { mode: selectedMode },
  });

describe("useLayoutMode", () => {
  it("returns mobile for auto below 1024px", () => {
    setViewportWidth(900);
    const { result } = renderLayoutHook("auto");
    expect(result.current).toBe("mobile");
  });

  it("returns desktop for auto at or above 1024px", () => {
    setViewportWidth(1024);
    const { result } = renderLayoutHook("auto");
    expect(result.current).toBe("desktop");
  });

  it("always returns mobile for the mobile override", () => {
    setViewportWidth(1400);
    const { result } = renderLayoutHook("mobile");
    expect(result.current).toBe("mobile");
  });

  it("always returns desktop for the desktop override", () => {
    setViewportWidth(420);
    const { result } = renderLayoutHook("desktop");
    expect(result.current).toBe("desktop");
  });

  it("updates the auto layout when the viewport is resized", () => {
    setViewportWidth(900);
    const { result } = renderLayoutHook("auto");
    expect(result.current).toBe("mobile");

    act(() => {
      setViewportWidth(1200);
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toBe("desktop");
  });
});
