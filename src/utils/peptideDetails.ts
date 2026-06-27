import { PEPTIDE_CATALOG, type PeptideCatalogItem } from "./peptideCatalog";

export interface QuickStartItem {
  label: string;
  value: string;
}

export interface PeptideProfile {
  name: string;
  whatIs: string;
  keyBenefits: string;
  mechanismOfAction: string;
  quickStartGuide: QuickStartItem[];
  tags: string[];
  halfLifeHours?: number;
  halfLifeDisplay?: string;
}

const normalizePeptideName = (name: string) =>
  name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");

const PEPTIDE_BY_KEY = new Map<string, PeptideCatalogItem>();

for (const peptide of PEPTIDE_CATALOG) {
  const names = [peptide.name, peptide.originalProduct, ...peptide.alternateNames].filter(
    (value): value is string => Boolean(value)
  );

  for (const name of names) {
    const key = normalizePeptideName(name);
    if (key && !PEPTIDE_BY_KEY.has(key)) {
      PEPTIDE_BY_KEY.set(key, peptide);
    }
  }
}

function getCatalogItem(name: string): PeptideCatalogItem | undefined {
  return PEPTIDE_BY_KEY.get(normalizePeptideName(name));
}

export function getPeptideCatalogItem(name: string): PeptideCatalogItem | undefined {
  return getCatalogItem(name);
}

export function isHiddenPeptideCatalogItem(peptide: PeptideCatalogItem): boolean {
  return (
    !peptide.summary &&
    !peptide.uses &&
    !peptide.route &&
    !peptide.doseRange &&
    !peptide.molecularType
  );
}

function normalizeTags(peptide: PeptideCatalogItem): string[] {
  const tags = new Set<string>();

  for (const tag of peptide.categoryTags) {
    const lowerTag = tag.toLowerCase();

    if (lowerTag.includes("weight") || lowerTag.includes("glp") || lowerTag.includes("metabolic")) {
      tags.add("Weight Loss");
    } else if (lowerTag.includes("healing") || lowerTag.includes("recovery")) {
      tags.add("Healing");
    } else if (lowerTag.includes("skin") || lowerTag.includes("cosmetic")) {
      tags.add("Skin Care");
    } else if (lowerTag.includes("cognitive") || lowerTag.includes("nootropic")) {
      tags.add("Cognitive");
    } else if (lowerTag.includes("longevity") || lowerTag.includes("anti-aging")) {
      tags.add("Longevity");
    } else if (lowerTag.includes("growth hormone") || lowerTag.includes("muscle")) {
      tags.add("Growth Hormone");
    } else if (lowerTag.includes("sexual") || lowerTag.includes("tanning")) {
      tags.add("Tanning");
    } else if (tag !== "Other") {
      tags.add(tag);
    }
  }

  if (tags.size === 0) tags.add("Research Only");
  return [...tags];
}

function buildQuickStartGuide(peptide: PeptideCatalogItem): QuickStartItem[] {
  const items: QuickStartItem[] = [];

  if (peptide.doseRange) items.push({ label: "Dose Range", value: peptide.doseRange });
  if (peptide.route) items.push({ label: "Route", value: peptide.route });
  if (peptide.halfLifeDisplay) items.push({ label: "Half-Life", value: peptide.halfLifeDisplay });
  if (peptide.fdaStatus) items.push({ label: "Status", value: peptide.fdaStatus });
  if (peptide.evidenceGrade) items.push({ label: "Evidence Grade", value: peptide.evidenceGrade });
  if (peptide.molecularType) items.push({ label: "Type", value: peptide.molecularType });

  return items.length > 0
    ? items
    : [{ label: "Status", value: "No structured quick-start details imported yet" }];
}

function inferTags(name: string): string[] {
  const lowerName = name.toLowerCase();
  if (
    lowerName.includes("semaglutide") ||
    lowerName.includes("tirzepatide") ||
    lowerName.includes("cagrilintide") ||
    lowerName.includes("retatrutide") ||
    lowerName.includes("adipotide")
  ) {
    return ["Weight Loss"];
  }
  if (lowerName.includes("bpc") || lowerName.includes("tb-500") || lowerName.includes("thymalin")) {
    return ["Healing"];
  }
  if (lowerName.includes("ghk") || lowerName.includes("cu") || lowerName.includes("kpv")) {
    return ["Skin Care"];
  }
  if (lowerName.includes("cjc") || lowerName.includes("ipamorelin") || lowerName.includes("ghrp")) {
    return ["Growth Hormone"];
  }
  return ["Research Only"];
}

export function hasJsonPeptideProfile(name: string): boolean {
  return Boolean(getCatalogItem(name));
}

export function getPeptideHalfLifeHours(name: string): number | null {
  const peptide = getCatalogItem(name);
  return peptide?.normalizedHalfLifeHours ?? null;
}

export function getPeptideProfile(name: string): PeptideProfile {
  const peptide = getCatalogItem(name);

  if (peptide) {
    const uses = peptide.uses ? `Primary uses: ${peptide.uses}` : "Primary uses have not been added yet.";
    const warnings =
      peptide.warnings.length > 0 ? `Warnings: ${peptide.warnings.join("; ")}` : "No specific warnings listed.";

    return {
      name: peptide.name,
      whatIs: peptide.summary || `${peptide.name} does not have a summary imported yet.`,
      keyBenefits: uses,
      mechanismOfAction: warnings,
      quickStartGuide: buildQuickStartGuide(peptide),
      tags: normalizeTags(peptide),
      halfLifeHours: peptide.normalizedHalfLifeHours ?? undefined,
      halfLifeDisplay: peptide.halfLifeDisplay,
    };
  }

  return {
    name,
    whatIs: `${name} does not have a reviewed quick-start profile imported yet.`,
    keyBenefits: "A structured benefit summary has not been added from the peptide catalog yet.",
    mechanismOfAction: "A mechanism summary has not been added from the peptide catalog yet.",
    quickStartGuide: [
      { label: "Status", value: "No matching peptide catalog profile imported yet" },
      { label: "Next Step", value: "Add a matching profile before using this as a quick reference" },
    ],
    tags: inferTags(name),
  };
}
