import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

const inputPath = "C:/Users/willi/Projects/peptides/outputs/inner-circle-stock-backed-rebuild-2026-07-24.json";
const outputPath = "C:/Users/willi/Projects/peptides/outputs/inner-circle-stock-backed-rebuild-2026-07-25.json";
const backup = JSON.parse(await fs.readFile(inputPath, "utf8"));
const updatedAt = "2026-07-25T12:00:00.000Z";
const riaId = "0545990b-6245-44fc-81fb-a93de1a0b61e";
const paytonId = "user-1";
const retatrutideRows = backup.peptides.filter((peptide) => peptide.name === "Retatrutide");
if (retatrutideRows.length !== 2) throw new Error(`Expected 2 reconstructed Retatrutide rows, found ${retatrutideRows.length}.`);
const logs = backup.injectionLogs.filter((log) => log.peptideNameSnapshot === "Retatrutide" && !log.deletedAt);
if (logs.length !== 22) throw new Error(`Expected 22 Retatrutide logs, found ${logs.length}.`);

// Return both prior 30 mg substitute pulls; the historical doses are now
// represented by one shared 50 mg Apex vial instead.
const lili30 = backup.stockItems.find((item) => item.name === "Retatrutide" && item.supplier === "Lilipeptides" && Number(item.mgPerVial) === 30);
if (!lili30) throw new Error("The 30 mg Lilipeptides Retatrutide stock item was not found.");
lili30.numberOfVials = "20";
lili30.updatedAt = updatedAt;

const apexStockId = randomUUID();
backup.stockItems = backup.stockItems.filter((item) => !(item.name === "Retatrutide" && item.supplier === "Apex" && Number(item.mgPerVial) === 50));
backup.stockItems.push({
  id: apexStockId, name: "Retatrutide", productKey: "retatrutide::50", mgPerVial: "50",
  purchasedVialCount: "2", numberOfVials: "1", supplier: "Apex", receivedDate: "2026-06-29",
  notes: "Two 50 mg vials. One vial was reconstituted with 3 mL BAC and shared by Ria and Payton.",
  createdAt: updatedAt, updatedAt,
});

const openVialId = randomUUID();
const startAt = logs.map((log) => log.actualDateTime || log.createdAt).sort()[0] || "2026-06-30T08:00:00.000Z";
const common = {
  name: "Retatrutide", vialMg: 50, bacWaterMl: 3, desiredDoseValue: 1.33, desiredDoseUnit: "mg",
  syringeSizeMl: 0.5, unitsPerMl: 100, concentrationMgPerMl: 50 / 3, concentrationMcgPerMl: (50 / 3) * 1000,
  doseMl: 1.33 / (50 / 3), doseUnits: (1.33 / (50 / 3)) * 100,
  estimatedDosesPerVial: 50 / 1.33, percentOfVialPerDose: (1.33 / 50) * 100,
  sourceStockItemId: apexStockId, openVialId, containerType: "vial", currentVialTotalMg: 50,
  currentVialStartedAt: startAt, createdAt: startAt, updatedAt, deletedAt: undefined,
};
const ria = { ...retatrutideRows.find((peptide) => peptide.vaultUserId === riaId), ...common, id: randomUUID(), vaultUserId: riaId };
const payton = { ...retatrutideRows.find((peptide) => peptide.vaultUserId === paytonId), ...common, id: randomUUID(), vaultUserId: paytonId };
backup.peptides = backup.peptides.filter((peptide) => peptide.name !== "Retatrutide");
backup.peptides.push(ria, payton);

for (const log of logs) {
  const protocol = log.vaultUserId === riaId ? ria : payton;
  log.peptideId = protocol.id;
  log.openVialId = openVialId;
  log.drawMl = 1.33 / (50 / 3);
  log.drawUnits = log.drawMl * 100;
  log.inventoryAssignment = "assigned";
  log.updatedAt = updatedAt;
}
for (const schedule of backup.schedules.filter((schedule) => !schedule.deletedAt && schedule.isActive)) {
  const previous = retatrutideRows.find((peptide) => peptide.id === schedule.peptideId);
  if (!previous) continue;
  const protocol = previous.vaultUserId === riaId ? ria : payton;
  schedule.peptideId = protocol.id;
  schedule.openVialId = openVialId;
  schedule.updatedAt = updatedAt;
}
backup.vialAdjustments = backup.vialAdjustments.filter((adjustment) => adjustment.peptideNameSnapshot !== "Retatrutide");
backup.exportedAt = updatedAt;
backup.appSettings = [...backup.appSettings.filter((setting) => setting.key !== "reconstructionMetadata"), {
  key: "reconstructionMetadata",
  value: { rebuiltAt: updatedAt, source: "stock-backed reconstruction", retatrutideCorrection: "One shared 50 mg Apex vial with 3 mL BAC; 22 historical shots assigned; two 30 mg Lilipeptides substitute pulls returned." },
  createdAt: updatedAt, updatedAt,
}];
await fs.writeFile(outputPath, JSON.stringify(backup, null, 2));
console.log(outputPath);
