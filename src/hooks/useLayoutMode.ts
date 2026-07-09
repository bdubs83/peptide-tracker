import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import type { LayoutMode } from "../db/schema";

export type EffectiveLayoutMode = "mobile" | "desktop";

const DESKTOP_MIN_WIDTH = 1024;

export const getLayoutModeForWidth = (
  selectedMode: LayoutMode,
  width: number,
  isNativeApp = false
): EffectiveLayoutMode => {
  if (selectedMode === "mobile" || selectedMode === "desktop") {
    return selectedMode;
  }

  if (isNativeApp) return "mobile";

  return width >= DESKTOP_MIN_WIDTH ? "desktop" : "mobile";
};

const getViewportWidth = () =>
  typeof window === "undefined" ? 0 : window.innerWidth;

export const useLayoutMode = (selectedMode: LayoutMode): EffectiveLayoutMode => {
  const isNativeApp = Capacitor.isNativePlatform();
  const [layoutMode, setLayoutMode] = useState<EffectiveLayoutMode>(() =>
    getLayoutModeForWidth(selectedMode, getViewportWidth(), isNativeApp)
  );

  useEffect(() => {
    const updateLayoutMode = () => {
      setLayoutMode(getLayoutModeForWidth(selectedMode, getViewportWidth(), isNativeApp));
    };

    updateLayoutMode();

    if (typeof window === "undefined") return undefined;

    window.addEventListener("resize", updateLayoutMode);
    return () => window.removeEventListener("resize", updateLayoutMode);
  }, [isNativeApp, selectedMode]);

  return layoutMode;
};
