import { db } from "./db";

const klowProtocolPattern = /KLOW\s*\/\s*KK[-\s]*10\s*Protocol/gi;
const legacyNamesNormalizedKey = "legacyNamesNormalized";

export function normalizePeptideRecordName(value: string) {
  return value.replace(klowProtocolPattern, "KLOW").replace(/\s{2,}/g, " ").trim();
}

export async function normalizeLegacyPeptideNames() {
  const existingFlag = await db.appSettings.get(legacyNamesNormalizedKey);
  if (existingFlag?.value === true) return;

  const nowIso = new Date().toISOString();

  await db.transaction("rw", [db.peptides, db.stockItems, db.injectionLogs, db.appSettings], async () => {
    const peptides = await db.peptides.toArray();
    for (const peptide of peptides) {
      const normalizedName = normalizePeptideRecordName(peptide.name);
      if (normalizedName !== peptide.name) {
        await db.peptides.update(peptide.id, {
          name: normalizedName,
          updatedAt: nowIso,
        });
      }
    }

    const stockItems = await db.stockItems.toArray();
    for (const item of stockItems) {
      const normalizedName = normalizePeptideRecordName(item.name);
      if (normalizedName !== item.name) {
        await db.stockItems.update(item.id, {
          name: normalizedName,
          updatedAt: nowIso,
        });
      }
    }

    const injectionLogs = await db.injectionLogs.toArray();
    for (const log of injectionLogs) {
      const normalizedName = normalizePeptideRecordName(log.peptideNameSnapshot);
      if (normalizedName !== log.peptideNameSnapshot) {
        await db.injectionLogs.update(log.id, {
          peptideNameSnapshot: normalizedName,
          updatedAt: nowIso,
        });
      }
    }

    await db.appSettings.put({
      key: legacyNamesNormalizedKey,
      value: true,
    });
  });
}
