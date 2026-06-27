import { useEffect, useState } from "react";
import type { LayoutMode } from "../db/schema";

export type EffectiveLayoutMode = "mobile" | "desktop";

const DESKTOP_MIN_WIDTH = 1024;

export const getLayoutModeForWidth = (
  selectedMode: LayoutMode,
  width: number
): EffectiveLayoutMode => {
  if (selectedMode === "mobile" || selectedMode === "desktop") {
    return selectedMode;
  }

  return width >= DESKTOP_MIN_WIDTH ? "desktop" : "mobile";
};

const getViewportWidth = () =>
  typeof window === "undefined" ? 0 : window.innerWidth;

export const useLayoutMode = (selectedMode: LayoutMode): EffectiveLayoutMode => {
  const [layoutMode, setLayoutMode] = useState<EffectiveLayoutMode>(() =>
    getLayoutModeForWidth(selectedMode, getViewportWidth())
  );

  useEffect(() => {
    const updateLayoutMode = () => {
      setLayoutMode(getLayoutModeForWidth(selectedMode, getViewportWidth()));
    };

    updateLayoutMode();

    if (typeof window === "undefined") return undefined;

    window.addEventListener("resize", updateLayoutMode);
    return () => window.removeEventListener("resize", updateLayoutMode);
  }, [selectedMode]);

  return layoutMode;
};
