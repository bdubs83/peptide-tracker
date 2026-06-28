import React, { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { resolveAppSettings } from "../db/appSettings";
import { normalizeLegacyPeptideNames } from "../db/nameCleanup";
import { useLayoutMode } from "../hooks/useLayoutMode";
import { AppRoutes } from "./routes";
import { DesktopAppShell, MobileAppShell } from "./AppShells";
import { LayoutModeProvider } from "./LayoutModeContext";
import { ReminderCenter } from "../features/reminders/ReminderCenter";

const themeColors = {
  light: "#f6f8fb",
  dark: "#0d0e15",
  professional: "#0b1220",
  fun: "#fff7ed",
  cottonCandySkies: "#fbf7ff",
  electropop: "#16072f",
  urbanGraffiti: "#101010",
};

export const App: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://www.youtube.com/@RetaUnfiltered");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const appSettings = useLiveQuery(() => db.appSettings.toArray());
  const isLoaded = appSettings !== undefined;
  const settings = resolveAppSettings(appSettings);
  const layoutMode = useLayoutMode(settings.layoutMode);
  const Shell = layoutMode === "desktop" ? DesktopAppShell : MobileAppShell;

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    const themeColor = themeColors[settings.theme];
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
  }, [settings.theme]);

  useEffect(() => {
    void normalizeLegacyPeptideNames();
  }, []);

  return (
    <Shell
      copied={copied}
      onCopyLink={handleCopyLink}
    >
      <LayoutModeProvider value={layoutMode}>
        {isLoaded && <ReminderCenter />}
        <AppRoutes />
      </LayoutModeProvider>
    </Shell>
  );
};
