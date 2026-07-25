import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";

const inputPath = "C:/Users/willi/Downloads/inner-circle-backup-2026-07-24 (1).json";
const outputPath = "C:/Users/willi/Projects/peptides/outputs/inner-circle-stock-backed-rebuild-2026-07-24.json";
const auditPath = "C:/Users/willi/Projects/peptides/outputs/inner-circle-stock-backed-rebuild-2026-07-24-audit.json";
const backup = JSON.parse(await fs.readFile(inputPath, "utf8"));
const nowIso = "2026-07-24T21:03:22.000Z";
const active = (record) => !record.deletedAt;
const completed = (log) => log.status === "taken" || log.status === "manual";
const doseMg = (log) => log.doseUnit === "mcg" ? log.doseValue / 1000 : log.doseValue;
const canonicalName = (name) => {
  const key = name.trim().toLowerCase();
  if (key === "ss-31") return "ss-31 (elamipretide)";
  return key;
};
const lotKey = (item) => canonicalName(item.name);
const fullName = (name) => canonicalName(name) === "ss-31 (elamipretide)" ? "SS-31 (Elamipretide)" : name;
const isoForLog = (log) => log.actualDateTime || log.createdAt || `${log.scheduledDate}T12:00:00.000Z`;
const clone = (value) => JSON.parse(JSON.stringify(value));

const stockItems = clone(backup.stockItems);
const wolverineStock = {
  id: randomUUID(), name: "Wolverine", productKey: "wolverine::20", mgPerVial: "20",
  purchasedVialCount: "1", numberOfVials: "1", supplier: "Manual inventory", receivedDate: "2026-06-01",
  notes: "Single vial added for reconstruction pending source confirmation.", createdAt: nowIso, updatedAt: nowIso,
};
stockItems.push(wolverineStock);

const stockByProduct = new Map();
for (const item of stockItems) {
  const key = lotKey(item);
  stockByProduct.set(key, [...(stockByProduct.get(key) || []), item]);
}
for (const lots of stockByProduct.values()) {
  lots.sort((a, b) => {
    const aLili = /lili/i.test(a.supplier || "") ? 0 : 1;
    const bLili = /lili/i.test(b.supplier || "") ? 0 : 1;
    return aLili - bLili || String(a.receivedDate || a.createdAt).localeCompare(String(b.receivedDate || b.createdAt));
  });
}
const pulls = [];
const pullStock = (name, at) => {
  const lots = stockByProduct.get(canonicalName(name)) || [];
  const lot = lots.find((item) => Number(item.numberOfVials) > 0);
  if (!lot) throw new Error(`No stock available for ${name} at ${at}.`);
  lot.numberOfVials = String(Number(lot.numberOfVials) - 1);
  lot.updatedAt = nowIso;
  pulls.push({ name: fullName(name), stockItemId: lot.id, supplier: lot.supplier, mg: Number(lot.mgPerVial), at });
  return lot;
};

const oldPeptides = backup.peptides.filter((peptide) => !peptide.isContainerOnly);
const oldPeptideById = new Map(oldPeptides.map((peptide) => [peptide.id, peptide]));
const penRecords = backup.peptides.filter((peptide) => peptide.isContainerOnly && peptide.containerType === "pen" && active(peptide));
const penSourceIds = new Set(penRecords.map((pen) => pen.sourceOpenVialId));
const logsByOldPeptide = new Map();
for (const log of backup.injectionLogs.filter(active)) {
  logsByOldPeptide.set(log.peptideId, [...(logsByOldPeptide.get(log.peptideId) || []), clone(log)]);
}
for (const logs of logsByOldPeptide.values()) logs.sort((a, b) => isoForLog(a).localeCompare(isoForLog(b)));

const activeScheduleByOldPeptide = new Map(
  backup.schedules.filter((schedule) => active(schedule) && schedule.isActive).map((schedule) => [schedule.peptideId, schedule])
);
const rebuiltPeptides = [];
const rebuiltLogs = [];
const replacementForOldPeptide = new Map();
const audit = { pulledVials: pulls, reconstructedContainers: [], unmappedLogs: [], notes: [] };

const computeFields = (template, vialMg, bacWaterMl) => {
  const concentrationMgPerMl = vialMg / bacWaterMl;
  const concentrationMcgPerMl = concentrationMgPerMl * 1000;
  const doseMgValue = template.desiredDoseUnit === "mcg" ? template.desiredDoseValue / 1000 : template.desiredDoseValue;
  const doseMl = doseMgValue / concentrationMgPerMl;
  return {
    name: fullName(template.name), vialMg, bacWaterMl,
    concentrationMgPerMl, concentrationMcgPerMl,
    doseMl, doseUnits: doseMl * template.unitsPerMl,
    estimatedDosesPerVial: vialMg / doseMgValue,
    percentOfVialPerDose: (doseMgValue / vialMg) * 100,
  };
};

const bacFor = (template, vialMg) => {
  if (canonicalName(template.name) === "retatrutide") return 1.5;
  return template.bacWaterMl * (vialMg / template.vialMg);
};

const createVial = (template, openedAt, forceContainerOnly = false) => {
  const lot = pullStock(template.name, openedAt);
  const vialMg = Number(lot.mgPerVial);
  const bacWaterMl = bacFor(template, vialMg);
  const id = randomUUID();
  const peptide = {
    ...clone(template), ...computeFields(template, vialMg, bacWaterMl), id, openVialId: id,
    sourceStockItemId: lot.id, sourceOpenVialId: undefined, containerType: "vial",
    isContainerOnly: forceContainerOnly || undefined, containerLabel: forceContainerOnly ? `${fullName(template.name)} source vial` : undefined,
    sharedWithUserIds: undefined, currentVialTotalMg: vialMg, currentVialStartedAt: openedAt,
    createdAt: openedAt, updatedAt: nowIso, deletedAt: undefined,
  };
  rebuiltPeptides.push(peptide);
  audit.reconstructedContainers.push({ id, name: peptide.name, type: "vial", mg: vialMg, bacWaterMl, source: lot.supplier, openedAt });
  return peptide;
};

for (const old of oldPeptides) {
  const oldLogs = logsByOldPeptide.get(old.id) || [];
  const needsSchedule = activeScheduleByOldPeptide.has(old.id);
  const isPenSource = penSourceIds.has(old.id);
  // A pen source with no history is reconstructed below as the dedicated vial
  // that transfers into the new pen; do not pull it twice.
  if (isPenSource && oldLogs.length === 0) continue;
  if (oldLogs.length === 0 && !needsSchedule && !isPenSource) continue;
  const instances = [];
  let instance = null;
  let usedMg = 0;
  const ensureInstance = (log) => {
    if (!instance) {
      instance = createVial(old, isoForLog(log));
      instances.push(instance);
      usedMg = 0;
    }
    return instance;
  };
  for (const log of oldLogs) {
    const current = ensureInstance(log);
    const amount = completed(log) ? doseMg(log) : 0;
    if (amount > 0 && usedMg + amount > current.vialMg + 1e-9) {
      current.deletedAt = isoForLog(log);
      current.updatedAt = nowIso;
      instance = createVial(old, isoForLog(log));
      instances.push(instance);
      usedMg = 0;
    }
    const target = instance;
    const concentration = target.concentrationMgPerMl;
    const correctedDrawMl = doseMg(log) / concentration;
    const correctedLog = {
      ...log, peptideId: target.id, openVialId: target.id, peptideNameSnapshot: target.name,
      drawMl: correctedDrawMl, drawUnits: correctedDrawMl * target.unitsPerMl,
      inventoryAssignment: "assigned", updatedAt: nowIso,
    };
    rebuiltLogs.push(correctedLog);
    if (completed(log)) usedMg += amount;
  }
  if (instances.length === 0 && (needsSchedule || isPenSource)) {
    instance = createVial(old, old.currentVialStartedAt || old.createdAt);
    instances.push(instance);
  }
  if (isPenSource) {
    for (const item of instances) { item.deletedAt = nowIso; item.updatedAt = nowIso; }
  } else if (!needsSchedule || old.deletedAt) {
    for (const item of instances) { item.deletedAt = item.deletedAt || old.deletedAt || nowIso; item.updatedAt = nowIso; }
  } else {
    const last = instances.at(-1);
    replacementForOldPeptide.set(old.id, last.id);
  }
}

for (const penTemplate of penRecords) {
  const sourceTemplate = oldPeptideById.get(penTemplate.sourceOpenVialId);
  if (!sourceTemplate) throw new Error(`Could not find source template for ${penTemplate.containerLabel}.`);
  const penOpenedAt = penTemplate.currentVialStartedAt || penTemplate.createdAt;
  const source = createVial(sourceTemplate, penOpenedAt, true);
  source.deletedAt = nowIso;
  source.updatedAt = nowIso;
  const penId = randomUUID();
  const transferredMg = source.vialMg;
  const pen = {
    ...clone(penTemplate), ...computeFields(penTemplate, transferredMg, source.bacWaterMl), id: penId,
    vialMg: transferredMg, openVialId: penId, sourceOpenVialId: source.id, sourceStockItemId: undefined,
    containerType: "pen", isContainerOnly: true, currentVialTotalMg: transferredMg,
    currentVialStartedAt: penOpenedAt, createdAt: penOpenedAt, updatedAt: nowIso, deletedAt: undefined,
  };
  rebuiltPeptides.push(pen);
  audit.reconstructedContainers.push({ id: penId, name: pen.name, type: "pen", mg: transferredMg, bacWaterMl: pen.bacWaterMl, source: source.id, openedAt: penOpenedAt });
  const protocol = {
    ...clone(sourceTemplate), ...computeFields(sourceTemplate, transferredMg, pen.bacWaterMl), id: randomUUID(),
    name: pen.name, vialMg: transferredMg, openVialId: penId, sourceOpenVialId: penId, sourceStockItemId: undefined,
    containerType: "pen", isContainerOnly: undefined, containerLabel: undefined, sharedWithUserIds: undefined,
    currentVialTotalMg: transferredMg, currentVialStartedAt: penOpenedAt, createdAt: penOpenedAt, updatedAt: nowIso, deletedAt: undefined,
  };
  rebuiltPeptides.push(protocol);
  replacementForOldPeptide.set(penTemplate.sourceOpenVialId, protocol.id);
  audit.reconstructedContainers.push({ id: protocol.id, name: protocol.name, type: "user protocol", sharedPen: penId, userId: protocol.vaultUserId });
}

const rebuiltSchedules = backup.schedules
  .filter((schedule) => active(schedule) && schedule.isActive)
  .map((schedule) => {
    const newPeptideId = replacementForOldPeptide.get(schedule.peptideId);
    if (!newPeptideId) throw new Error(`No rebuilt active container for schedule ${schedule.id}.`);
    const peptide = rebuiltPeptides.find((item) => item.id === newPeptideId);
    return { ...clone(schedule), peptideId: newPeptideId, openVialId: peptide.openVialId || peptide.id, updatedAt: nowIso, deletedAt: undefined };
  });

const rebuiltAdjustments = [];
for (const pen of rebuiltPeptides.filter((peptide) => peptide.isContainerOnly && peptide.containerType === "pen")) {
  const source = rebuiltPeptides.find((peptide) => peptide.id === pen.sourceOpenVialId);
  rebuiltAdjustments.push({
    id: randomUUID(), peptideId: source.id, vaultUserId: source.vaultUserId, openVialId: source.id,
    peptideNameSnapshot: source.name, adjustmentDate: pen.currentVialStartedAt.slice(0, 10), amountValue: source.bacWaterMl,
    amountUnit: "mL", amountMcg: pen.vialMg * 1000, reason: "transferToPen",
    notes: `Transferred to ${pen.containerLabel}.`, createdAt: pen.createdAt, updatedAt: nowIso,
  });
}

const sourceLogIds = new Set(backup.injectionLogs.filter(active).map((log) => log.id));
for (const log of backup.injectionLogs.filter((log) => !active(log))) rebuiltLogs.push(clone(log));
for (const log of backup.injectionLogs.filter(active)) {
  if (!sourceLogIds.has(log.id)) audit.unmappedLogs.push(log.id);
}
if (rebuiltLogs.length !== backup.injectionLogs.length) throw new Error(`Expected ${backup.injectionLogs.length} logs, rebuilt ${rebuiltLogs.length}.`);

const result = {
  ...clone(backup), exportedAt: nowIso, peptides: rebuiltPeptides, schedules: rebuiltSchedules,
  injectionLogs: rebuiltLogs, stockItems, vialAdjustments: rebuiltAdjustments,
  appSettings: [...backup.appSettings.filter((setting) => setting.key !== "reconstructionMetadata"), {
    key: "reconstructionMetadata", value: { rebuiltAt: nowIso, source: "stock-backed reconstruction", note: "Lilipeptides lots consumed before MKM; Wolverine has one manual 20 mg vial pending confirmation." }, createdAt: nowIso, updatedAt: nowIso,
  }],
};

audit.stockAfter = stockItems.map((item) => ({ name: item.name, mgPerVial: item.mgPerVial, supplier: item.supplier, remaining: item.numberOfVials }));
audit.counts = { peptides: result.peptides.length, schedules: result.schedules.length, injectionLogs: result.injectionLogs.length, stockItems: result.stockItems.length, adjustments: result.vialAdjustments.length };
await fs.mkdir("C:/Users/willi/Projects/peptides/outputs", { recursive: true });
await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
await fs.writeFile(auditPath, JSON.stringify(audit, null, 2));
console.log(JSON.stringify(audit.counts));
console.log(outputPath);
