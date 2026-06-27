import { PEPTIDE_CATALOG } from "./peptideCatalog";

export const PRELOADED_PEPTIDES: string[] = Array.from(
  new Set(PEPTIDE_CATALOG.map((peptide) => peptide.name))
);
