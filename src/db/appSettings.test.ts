import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";

const loadSettingsModule = async () => {
  vi.resetModules();
  return import("./appSettings");
};

afterEach(async () => {
  const { db } = await import("./db");
  db.close();
  await indexedDB.deleteDatabase("PeptideVaultDatabase");
});

describe("app settings", () => {
  it("persists the user layout setting after reload", async () => {
    const firstLoad = await loadSettingsModule();
    await firstLoad.updateAppSettings({ layoutMode: "desktop" });

    const { db } = await import("./db");
    db.close();

    const secondLoad = await loadSettingsModule();
    const settings = await secondLoad.getAppSettings();

    expect(settings.layoutMode).toBe("desktop");
  });

  it("persists the selected app theme after reload", async () => {
    const firstLoad = await loadSettingsModule();
    await firstLoad.updateAppSettings({ theme: "fun" });

    const { db } = await import("./db");
    db.close();

    const secondLoad = await loadSettingsModule();
    const settings = await secondLoad.getAppSettings();

    expect(settings.theme).toBe("fun");
  });
});
