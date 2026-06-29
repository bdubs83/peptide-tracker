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

  it("timestamps individual settings when they are saved", async () => {
    const { putAppSetting } = await loadSettingsModule();
    await putAppSetting("autoSyncEnabled", true);

    const { db } = await import("./db");
    const setting = await db.appSettings.get("autoSyncEnabled");

    expect(setting?.createdAt).toEqual(expect.any(String));
    expect(setting?.updatedAt).toEqual(expect.any(String));
  });
});
