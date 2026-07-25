export interface PeptideCatalogItem {
  id: string;
  name: string;
  originalProduct: string | null;
  alternateNames: string[];
  molecularType: string | null;
  categoryTags: string[];
  fdaStatus: string | null;
  doseRange: string | null;
  normalizedHalfLifeHours: number | null;
  halfLifeDisplay: string;
  estimatedHalfLife: boolean;
  evidenceGrade: string | null;
  route: string | null;
  uses: string | null;
  summary: string | null;
  warnings: string[];
  goal: string | null;
  minDailyDose: string | null;
  maxDailyDose: string | null;
  maxWeeklyDose: string | null;
  cycleLengthOn: string | null;
  cycleLengthOff: string | null;
}

export const PEPTIDE_CATALOG: PeptideCatalogItem[] = [
  {
    "id": "5-amino-1mq",
    "name": "5-Amino-1MQ",
    "originalProduct": "5-Amino-1MQ",
    "alternateNames": [
      "5-amino-1-methylquinolinium"
    ],
    "molecularType": "Small molecule",
    "categoryTags": [
      "GLP",
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Research",
    "doseRange": "50-150 mg/day",
    "normalizedHalfLifeHours": 12,
    "halfLifeDisplay": "~12 hours",
    "estimatedHalfLife": true,
    "evidenceGrade": "C",
    "route": "SubQ",
    "uses": "Fat metabolism; NNMT inhibition; Metabolic research",
    "summary": "Small-molecule NNMT inhibitor studied for its role in regulating fat cell metabolism and energy expenditure in preclinical models.",
    "warnings": [
      "Research"
    ],
    "goal": "Support metabolic efficiency through NNMT inhibition, potentially enhancing fat oxidation and NAD+ levels.",
    "minDailyDose": "2.5 mg",
    "maxDailyDose": "5 mg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "No explicit cycle length; daily protocol",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "ace-031",
    "name": "ACE-031",
    "originalProduct": "ACE-031",
    "alternateNames": [
      "ACVR2B-Fc",
      "Soluble Activin Receptor"
    ],
    "molecularType": null,
    "categoryTags": [
      "Muscle/performance"
    ],
    "fdaStatus": "Investigational",
    "doseRange": null,
    "normalizedHalfLifeHours": 336,
    "halfLifeDisplay": "~2 weeks",
    "estimatedHalfLife": true,
    "evidenceGrade": "B-",
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [
      "Investigational"
    ],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "adamax",
    "name": "Adamax",
    "originalProduct": "Adamax",
    "alternateNames": [
      "N-Acetyl Semax analog"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Cognitive"
    ],
    "fdaStatus": "Research",
    "doseRange": "100-500 mcg/day",
    "normalizedHalfLifeHours": 0.5,
    "halfLifeDisplay": "~minutes",
    "estimatedHalfLife": true,
    "evidenceGrade": "C",
    "route": "Nasal",
    "uses": "Cognitive enhancement; BDNF modulation; Neuroprotection",
    "summary": "Modified analog in the Semax family of ACTH-derived nootropic peptides, studied for cognitive enhancement and neuroprotective properties.",
    "warnings": [
      "Research"
    ],
    "goal": "Support cognitive enhancement, neuroprotection, and neuroplasticity via BDNF upregulation.",
    "minDailyDose": "500 µg",
    "maxDailyDose": "1000 µg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "adipotide-prohibitin-tp01",
    "name": "Adipotide (Prohibitin-TP01)",
    "originalProduct": "Adipotide",
    "alternateNames": [
      "Prohibitin-TP01"
    ],
    "molecularType": "Peptidomimetic",
    "categoryTags": [
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Research",
    "doseRange": "0.43 mg/kg",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": "Emerging",
    "route": "Injectable",
    "uses": "White adipose reduction; Insulin sensitivity; Peripheral approach",
    "summary": "Chimeric adipose-vasculature-targeted peptidomimetic that homes to prohibitin/annexin A2 on white adipose tissue endothelium and delivers a pro-apoptotic motif; noted with kidney safety concerns in early research.",
    "warnings": [
      "Chimeric adipose-vasculature-targeted peptidomimetic that homes to prohibitin/annexin A2 on white adipose tissue endothelium and delivers a pro-apoptotic motif; noted with kidney safety concerns in early research.",
      "Research"
    ],
    "goal": "Targeted reduction of fat mass via vascular targeting in adipose tissue.",
    "minDailyDose": "250 mcg",
    "maxDailyDose": "1000 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "4–8 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "aicar",
    "name": "AICAR",
    "originalProduct": "AICAR",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": "AMPK activation and metabolic research",
    "minDailyDose": "1,000 mcg",
    "maxDailyDose": "3,000 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "alprostadil",
    "name": "Alprostadil",
    "originalProduct": "Alprostadil",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "aod-9604",
    "name": "AOD-9604",
    "originalProduct": "AOD-9604",
    "alternateNames": [
      "Anti-Obesity Drug 9604",
      "Tyr-hGH Frag 177-191"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "GLP",
      "Recovery",
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Research",
    "doseRange": "250-500 mcg/day",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~30 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "C+",
    "route": "SubQ",
    "uses": "Fat metabolism; Lipolysis research; Cartilage repair",
    "summary": "Modified fragment of human growth hormone (amino acids 177-191) studied for fat metabolism without the growth-promoting effects of full HGH.",
    "warnings": [
      "Research"
    ],
    "goal": "Support reduction of fat mass and enhance fat oxidation over time.",
    "minDailyDose": "300 mcg",
    "maxDailyDose": "500 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "ara-290",
    "name": "ARA-290",
    "originalProduct": "ARA-290",
    "alternateNames": [
      "Cibinetide"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Recovery",
      "Healing",
      "Cognitive",
      "Immune support"
    ],
    "fdaStatus": "Investigational",
    "doseRange": "2-4 mg/day",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~2 min (rapid tissue uptake)",
    "estimatedHalfLife": false,
    "evidenceGrade": "B-",
    "route": "SubQ",
    "uses": "Neuropathy; Tissue protection; Anti-inflammatory",
    "summary": "11-amino acid peptide derived from erythropoietin that activates the innate repair receptor without stimulating erythropoiesis, studied for neuropathic conditions.",
    "warnings": [
      "Investigational"
    ],
    "goal": "Support tissue protection, anti-inflammatory signaling, and neuropathic symptom management via IRR activation.",
    "minDailyDose": "2 mg",
    "maxDailyDose": "4 mg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "4–8 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "b12-vitamin",
    "name": "B12 Vitamin",
    "originalProduct": "B12 Vitamin",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "botulinum-toxin",
    "name": "Botulinum Toxin",
    "originalProduct": "Botulinum Toxin",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "bpc-157",
    "name": "BPC-157",
    "originalProduct": "BPC-157",
    "alternateNames": [
      "Body Protection Compound-157",
      "Pentadecapeptide",
      "PL 14736"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Recovery",
      "Healing"
    ],
    "fdaStatus": "Research",
    "doseRange": "250-500 mcg 1-2x/day",
    "normalizedHalfLifeHours": 4,
    "halfLifeDisplay": "~4 hours",
    "estimatedHalfLife": true,
    "evidenceGrade": "B",
    "route": "SubQ",
    "uses": "Tissue repair; GI healing; Tendon/ligament recovery",
    "summary": "15-amino acid peptide derived from human gastric juice with extensive preclinical evidence for accelerating healing of tendon, muscle, and GI tissues.",
    "warnings": [
      "Research"
    ],
    "goal": "Support tissue-healing and recovery processes based on preclinical evidence.",
    "minDailyDose": "200 mcg",
    "maxDailyDose": "600 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "bpc-157-tb-500-blend",
    "name": "BPC-157/TB-500 Blend",
    "originalProduct": "BPC-157 + TB-500",
    "alternateNames": [
      "BPC",
      "TB Blend",
      "Wolverine Stack"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Recovery",
      "Healing",
      "Immune support"
    ],
    "fdaStatus": "Research",
    "doseRange": "250-500 mcg BPC + 2-5 mg TB/week",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Varies by component",
    "estimatedHalfLife": false,
    "evidenceGrade": "B",
    "route": "SubQ",
    "uses": "Synergistic tissue repair; Injury recovery; Inflammation",
    "summary": "Pre-mixed combination of BPC-157 and TB-500 designed for complementary tissue repair mechanisms through distinct but synergistic healing pathways.",
    "warnings": [
      "Research"
    ],
    "goal": "Tissue repair research",
    "minDailyDose": "600 mcg total",
    "maxDailyDose": "1,000 mcg total",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "bronchogen",
    "name": "Bronchogen",
    "originalProduct": "Bronchogen",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "cagrilintide",
    "name": "Cagrilintide",
    "originalProduct": "Cagrilintide",
    "alternateNames": [
      "AM833",
      "Long-acting amylin analog"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Investigational",
    "doseRange": "1.2–4.5 mg/week",
    "normalizedHalfLifeHours": 168,
    "halfLifeDisplay": "~7 days",
    "estimatedHalfLife": true,
    "evidenceGrade": "B+",
    "route": "SubQ",
    "uses": "Weight management; Satiety enhancement; Metabolic combination therapy",
    "summary": "Long-acting fatty-acid acylated amylin analog designed for once-weekly dosing; studied alone and in combination with semaglutide (CagriSema) for additive weight reduction beyond GLP-1 monotherapy.",
    "warnings": [
      "Investigational"
    ],
    "goal": "Support satiety, reduce food intake, and promote weight management over time.",
    "minDailyDose": "0.6 mg weekly",
    "maxDailyDose": "4.5 mg weekly",
    "maxWeeklyDose": "4.5 mg weekly",
    "cycleLengthOn": "12–16 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "cagrisema",
    "name": "CagriSema",
    "originalProduct": "CagriSema",
    "alternateNames": [
      "Cagrilintide + Semaglutide"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "GLP",
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Investigational",
    "doseRange": "2.4mg sema + 2.4mg cagri/week",
    "normalizedHalfLifeHours": 168,
    "halfLifeDisplay": "~7 days (sema), ~7 days (cagri)",
    "estimatedHalfLife": true,
    "evidenceGrade": "B+",
    "route": "SubQ",
    "uses": "Weight management; Obesity research; Metabolic combination therapy",
    "summary": "Fixed-ratio combination of the amylin analog cagrilintide and semaglutide in Phase 3 trials for enhanced weight management.",
    "warnings": [
      "Investigational"
    ],
    "goal": "Satiety and weight-management research",
    "minDailyDose": "0.25 mg of each peptide weekly",
    "maxDailyDose": "2.4 mg of each peptide weekly",
    "maxWeeklyDose": "2.4 mg of each peptide weekly",
    "cycleLengthOn": "16+ weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "cardiogen",
    "name": "Cardiogen",
    "originalProduct": "Cardiogen",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "cartalax",
    "name": "Cartalax",
    "originalProduct": "Cartalax",
    "alternateNames": [
      "Ala-Glu-Asp"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Healing",
      "Longevity"
    ],
    "fdaStatus": "Research",
    "doseRange": "10-20 mg/day",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "C",
    "route": "SubQ",
    "uses": "Cartilage health; Joint function; Anti-aging",
    "summary": "Tripeptide bioregulator studied for cartilage and musculoskeletal tissue maintenance, part of the Khavinson peptide bioregulator family.",
    "warnings": [
      "Research"
    ],
    "goal": "Support connective‑tissue homeostasis and fibroblast function based on preclinical bioregulator research.",
    "minDailyDose": "2,000 mcg",
    "maxDailyDose": "5,000 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "cerebrolysin",
    "name": "Cerebrolysin",
    "originalProduct": "Cerebrolysin",
    "alternateNames": [
      "FPF-1070"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Recovery",
      "Cognitive"
    ],
    "fdaStatus": "Investigational",
    "doseRange": "5-30 mL/day IM",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (complex mixture) (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "B",
    "route": "IM",
    "uses": "Neurodegeneration; Stroke recovery; Traumatic brain injury",
    "summary": "Enzymatic preparation of porcine brain proteins containing neurotrophic peptides, approved in some countries for neurodegenerative conditions and stroke recovery.",
    "warnings": [
      "Investigational"
    ],
    "goal": "Support neuroprotection and neuronal survival through neurotrophic factor mimicry.",
    "minDailyDose": "20 mg",
    "maxDailyDose": "32 mg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "cjc-1295-dac",
    "name": "CJC-1295 DAC",
    "originalProduct": "CJC-1295 with DAC",
    "alternateNames": [
      "Drug Affinity Complex CJC-1295",
      "DAC:GRF"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Growth hormone",
      "Recovery"
    ],
    "fdaStatus": "Research",
    "doseRange": "1-2 mg/week",
    "normalizedHalfLifeHours": 192,
    "halfLifeDisplay": "~8 days",
    "estimatedHalfLife": true,
    "evidenceGrade": "B",
    "route": "SubQ",
    "uses": "GH release; Body composition; Recovery",
    "summary": "Modified GHRH analog with Drug Affinity Complex enabling albumin binding for sustained growth hormone release over approximately one week.",
    "warnings": [
      "Research"
    ],
    "goal": "Elevate endogenous GH and IGF-1 levels to support muscle growth, fat metabolism, recovery, and anti-aging research.",
    "minDailyDose": "2 mg weekly",
    "maxDailyDose": "2 mg weekly",
    "maxWeeklyDose": "2 mg weekly",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "cjc-1295-no-dac-mod-grf-1-29",
    "name": "CJC-1295 no DAC (Mod GRF 1-29)",
    "originalProduct": "CJC-1295 without DAC",
    "alternateNames": [
      "Modified GRF 1-29",
      "Mod GRF"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Growth hormone",
      "Recovery",
      "Longevity"
    ],
    "fdaStatus": "Research",
    "doseRange": "100-300 mcg 1-3x/day",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~30 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "B",
    "route": "SubQ",
    "uses": "GH pulsatile release; Recovery; Anti-aging research",
    "summary": "Truncated and modified GHRH analog (amino acids 1-29) that stimulates pulsatile growth hormone release from the anterior pituitary.",
    "warnings": [
      "Research"
    ],
    "goal": "Elevate endogenous GH and IGF-1 levels to support muscle growth, fat metabolism, recovery, and anti-aging research.",
    "minDailyDose": "2 mg weekly",
    "maxDailyDose": "2 mg weekly",
    "maxWeeklyDose": "2 mg weekly",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "cjc-1295-ipamorelin-blend",
    "name": "CJC-1295/Ipamorelin Blend",
    "originalProduct": "CJC-1295 without DAC + Ipamorelin",
    "alternateNames": [
      "CJC",
      "Ipa Blend",
      "GH Peptide Stack"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Growth hormone",
      "Recovery",
      "Longevity"
    ],
    "fdaStatus": "Research",
    "doseRange": "100-300 mcg each, 1-3x/day",
    "normalizedHalfLifeHours": 2,
    "halfLifeDisplay": "~30 min (Mod GRF), ~2 hrs (Ipa)",
    "estimatedHalfLife": true,
    "evidenceGrade": "B",
    "route": "SubQ",
    "uses": "Synergistic GH release; Recovery; Anti-aging",
    "summary": "Pre-mixed combination of Mod GRF 1-29 and ipamorelin that synergistically amplifies growth hormone release through dual receptor activation.",
    "warnings": [
      "Research"
    ],
    "goal": "Growth-hormone release research",
    "minDailyDose": "100 mcg each",
    "maxDailyDose": "300 mcg each",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–16 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "copper-peptide-ahk-cu",
    "name": "Copper Peptide AHK-Cu",
    "originalProduct": "AHK-Cu",
    "alternateNames": [
      "AHK-Cu",
      "Ala-His-Lys-Cu"
    ],
    "molecularType": null,
    "categoryTags": [
      "Recovery",
      "Skin/cosmetic"
    ],
    "fdaStatus": "Research",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "N/A (topical)",
    "estimatedHalfLife": false,
    "evidenceGrade": "C+",
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [
      "Research"
    ],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "cortagen",
    "name": "Cortagen",
    "originalProduct": "Cortagen",
    "alternateNames": [
      "Ala-Glu-Asp-Leu"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Cognitive"
    ],
    "fdaStatus": "Research",
    "doseRange": "10-20 mg/day",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "C",
    "route": "SubQ",
    "uses": "Brain bioregulation; Cortical function; Cognitive research",
    "summary": "Tetrapeptide bioregulator studied for its regulatory effects on brain cortical function and potential neuroprotective mechanisms.",
    "warnings": [
      "Research"
    ],
    "goal": "Support neural regeneration, cognitive function, and cellular repair mechanisms over time.",
    "minDailyDose": "1,000 mcg",
    "maxDailyDose": "2,000 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "4 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "cristagen",
    "name": "Cristagen",
    "originalProduct": "Crystagen",
    "alternateNames": [
      "Glu-Asp-Gly-Gly (thymus bioregulator)"
    ],
    "molecularType": null,
    "categoryTags": [
      "Longevity",
      "Immune support"
    ],
    "fdaStatus": "Research",
    "doseRange": null,
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "C",
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [
      "Tetrapeptide bioregulator from the Khavinson series targeting thymic tissue; studied alongside thymalin and epithalon in Russian longevity research protocols.",
      "Research"
    ],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "dermorphin",
    "name": "Dermorphin",
    "originalProduct": "Dermorphin",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "dsip-delta-sleep-inducing-peptide",
    "name": "DSIP (Delta Sleep-Inducing Peptide)",
    "originalProduct": "DSIP",
    "alternateNames": [
      "Delta Sleep Peptide",
      "DSIP"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Sleep/stress"
    ],
    "fdaStatus": "Research",
    "doseRange": "100-300 mcg before bed",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~7-8 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "C+",
    "route": "SubQ",
    "uses": "Sleep quality; Stress reduction; Circadian regulation",
    "summary": "Nonapeptide originally isolated from rabbit brain that modulates sleep architecture and stress response, studied for sleep normalization without sedation.",
    "warnings": [
      "Research"
    ],
    "goal": "Support healthy sleep architecture and stress modulation over time.",
    "minDailyDose": "100 mcg",
    "maxDailyDose": "300 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "4–8 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "epithalon-epitalon",
    "name": "Epithalon (Epitalon)",
    "originalProduct": "Epitalon",
    "alternateNames": [
      "Epithalone",
      "Epithalamin",
      "AGAG"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Longevity"
    ],
    "fdaStatus": "Research",
    "doseRange": "5-10 mg/day for 10-20 day cycles",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "B-",
    "route": "SubQ",
    "uses": "Telomerase activation; Melatonin regulation; Longevity research",
    "summary": "Synthetic tetrapeptide (Ala-Glu-Asp-Gly) based on epithalamin that activates telomerase and regulates melatonin production, studied in longevity research.",
    "warnings": [
      "Synthetic tetrapeptide (Ala-Glu-Asp-Gly) based on epithalamin that activates telomerase and regulates melatonin production, studied in longevity research.",
      "Research"
    ],
    "goal": "Support telomere maintenance, melatonin regulation, and geroprotective effects over time.",
    "minDailyDose": "5 mg",
    "maxDailyDose": "5 mg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "20 days on",
    "cycleLengthOff": "4–6 months off"
  },
  {
    "id": "epo",
    "name": "EPO",
    "originalProduct": "EPO",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "fat-blaster",
    "name": "Fat Blaster",
    "originalProduct": "LC526 Blend",
    "alternateNames": [
      "FBA",
      "LC526",
      "Lipo-C Fat Blaster"
    ],
    "molecularType": null,
    "categoryTags": [
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Research",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Blend; component-dependent",
    "estimatedHalfLife": false,
    "evidenceGrade": "LIMITED",
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [
      "Research / supplement-style blend"
    ],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "fat-blaster-2",
    "name": "Fat Blaster",
    "originalProduct": "Lipo-C Fat Blaster",
    "alternateNames": [
      "FBA",
      "LC526",
      "Lipo-C Fat Blaster"
    ],
    "molecularType": null,
    "categoryTags": [
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Research",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Blend; component-dependent",
    "estimatedHalfLife": false,
    "evidenceGrade": "LIMITED",
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [
      "Research / supplement-style blend"
    ],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "follistatin-344",
    "name": "Follistatin 344",
    "originalProduct": "Follistatin",
    "alternateNames": [
      "FST-344",
      "Follistatin"
    ],
    "molecularType": null,
    "categoryTags": [
      "Muscle/performance"
    ],
    "fdaStatus": "Research",
    "doseRange": null,
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "C+",
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [
      "Research"
    ],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "foxo4-dri",
    "name": "FOXO4-DRI",
    "originalProduct": "FOXO4",
    "alternateNames": [
      "FOXO4 D-Retro-Inverso"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Longevity"
    ],
    "fdaStatus": "Research",
    "doseRange": "Variable (research dosing)",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "C+",
    "route": "SubQ",
    "uses": "Senescent cell clearance; Anti-aging; Cellular rejuvenation",
    "summary": "D-retro-inverso peptide that disrupts FOXO4-p53 interaction in senescent cells, selectively inducing apoptosis of aged cells in preclinical models.",
    "warnings": [
      "Research"
    ],
    "goal": "Selectively clear senescent cells via disruption of FOXO4–p53 binding.",
    "minDailyDose": "250 mcg",
    "maxDailyDose": "500 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–16 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "gdf-8",
    "name": "GDF-8",
    "originalProduct": "GDF-8",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "ghk-cu",
    "name": "GHK-Cu",
    "originalProduct": "GHK-Cu",
    "alternateNames": [
      "Copper Peptide GHK",
      "GHK-Copper"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Recovery",
      "Healing",
      "Skin/cosmetic"
    ],
    "fdaStatus": "Research",
    "doseRange": "200-500 mcg/day SubQ; topical as directed",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "B-",
    "route": "SubQ/Topical",
    "uses": "Skin rejuvenation; Wound healing; Collagen stimulation",
    "summary": "Copper-complexed tripeptide with evidence for stimulating collagen, elastin, and glycosaminoglycan synthesis while reducing inflammation and oxidative damage.",
    "warnings": [
      "Research"
    ],
    "goal": "Present GHK-Cu research dosage, reconstitution, supplies, and measurement context in one consistent protocol.",
    "minDailyDose": "N/A (weekly protocol)",
    "maxDailyDose": "N/A (weekly protocol)",
    "maxWeeklyDose": "2 mg",
    "cycleLengthOn": "Main table 8–12+ weeks; supplies through 16 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "ghrp-2",
    "name": "GHRP-2",
    "originalProduct": "GHRP-2",
    "alternateNames": [
      "Growth Hormone Releasing Peptide-2",
      "Pralmorelin"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Recovery"
    ],
    "fdaStatus": "Research",
    "doseRange": "100-300 mcg 1-3x/day",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~25-30 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "B-",
    "route": "SubQ",
    "uses": "GH release; Body composition; Recovery",
    "summary": "Second-generation GHRP with stronger GH release than GHRP-6 and somewhat less appetite stimulation, acting through the ghrelin receptor.",
    "warnings": [
      "Research"
    ],
    "goal": "Stimulate endogenous growth hormone secretion through ghrelin receptor activation.",
    "minDailyDose": "100 mcg",
    "maxDailyDose": "300 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–16 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "ghrp-6",
    "name": "GHRP-6",
    "originalProduct": "GHRP-6",
    "alternateNames": [
      "Growth Hormone Releasing Peptide-6"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Research",
    "doseRange": "100-300 mcg 1-3x/day",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~20-30 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "B-",
    "route": "SubQ",
    "uses": "GH release; Appetite stimulation; Cytoprotection",
    "summary": "First-generation growth hormone releasing peptide that stimulates GH secretion via the ghrelin receptor, notable for increasing appetite via ghrelin activation.",
    "warnings": [
      "Research"
    ],
    "goal": "Stimulate pulsatile GH release to support muscle growth, fat loss, and recovery.",
    "minDailyDose": "300 mcg",
    "maxDailyDose": "900 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "glow-protocol",
    "name": "Glow Protocol",
    "originalProduct": "GLOW",
    "alternateNames": [
      "GLOW",
      "BPC-157 + TB-500 + GHK-Cu"
    ],
    "molecularType": "Stack / Blend",
    "categoryTags": [
      "Recovery",
      "Healing",
      "Longevity",
      "Skin/cosmetic"
    ],
    "fdaStatus": "Research",
    "doseRange": "Varies by formulation",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Blend; component-dependent",
    "estimatedHalfLife": false,
    "evidenceGrade": "LIMITED",
    "route": "Injectable",
    "uses": "Skin rejuvenation; Collagen synthesis; Anti-aging support; Wound healing; Tissue regeneration",
    "summary": "Combination featuring BPC-157, TB-500, and GHK-Cu used in public-market peptide protocols for skin rejuvenation, tissue repair, and anti-aging; evidence is based on the individual components rather than validated combination trials.",
    "warnings": [
      "Research"
    ],
    "goal": "Tissue-healing research",
    "minDailyDose": "2.33 mg total",
    "maxDailyDose": "2.33 mg total",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "4 weeks",
    "cycleLengthOff": "2–4 weeks"
  },
  {
    "id": "glp-1-gip-dual-agonist-research-panel",
    "name": "GLP-1 / GIP Dual Agonist Research Panel",
    "originalProduct": "GLP-1",
    "alternateNames": [
      "Incretin combination research"
    ],
    "molecularType": null,
    "categoryTags": [
      "GLP",
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "glutathione",
    "name": "Glutathione",
    "originalProduct": "Glutathione",
    "alternateNames": [
      "GSH",
      "L-Glutathione",
      "Reduced Glutathione"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Metabolic",
      "Skin/cosmetic"
    ],
    "fdaStatus": "Research",
    "doseRange": "200-600 mg 2-3x/week",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~10-14 min (IV)",
    "estimatedHalfLife": false,
    "evidenceGrade": "B",
    "route": "SubQ",
    "uses": "Antioxidant defense; Detoxification; Skin brightening",
    "summary": "Endogenous tripeptide (Glu-Cys-Gly) serving as the body's primary intracellular antioxidant, studied for oxidative stress reduction and detoxification support.",
    "warnings": [
      "Research"
    ],
    "goal": "Support antioxidant defense, cellular detoxification, and immune function.",
    "minDailyDose": "100 mg",
    "maxDailyDose": "200 mg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "4–8 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "hcg",
    "name": "HCG",
    "originalProduct": "HCG",
    "alternateNames": [
      "Human Chorionic Gonadotropin",
      "Pregnyl",
      "Ovidrel"
    ],
    "molecularType": "Protein",
    "categoryTags": [
      "Hormonal/fertility"
    ],
    "fdaStatus": "Approved",
    "doseRange": "250-5000 IU 2-3x/week",
    "normalizedHalfLifeHours": 30,
    "halfLifeDisplay": "~24-36 hours",
    "estimatedHalfLife": true,
    "evidenceGrade": "A",
    "route": "SubQ/IM",
    "uses": "Ovulation trigger; Male hypogonadism; Testicular function",
    "summary": "Glycoprotein hormone that mimics LH activity, FDA-approved for ovulation induction in women and hypogonadism treatment in men.",
    "warnings": [],
    "goal": "Maintain testicular function and fertility during testosterone replacement therapy or restore endogenous testosterone production post‑cycle.",
    "minDailyDose": "1,500 IU",
    "maxDailyDose": "2,500 IU",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "healthy-hair-skin-nails-blend",
    "name": "Healthy Hair Skin Nails Blend",
    "originalProduct": "Healthy Hair Skin Nails Blend",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "hexarelin",
    "name": "Hexarelin",
    "originalProduct": "Hexarelin",
    "alternateNames": [
      "Examorelin",
      "HEX"
    ],
    "molecularType": null,
    "categoryTags": [
      "Recovery"
    ],
    "fdaStatus": "Research",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~70 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "B-",
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [
      "Hexapeptide ghrelin mimetic that produces robust GH release and has demonstrated cardioprotective properties in preclinical research.",
      "Research"
    ],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "hgh-somatropin",
    "name": "HGH (Somatropin)",
    "originalProduct": "HGH",
    "alternateNames": [
      "Human Growth Hormone",
      "rhGH",
      "Genotropin",
      "Humatrope",
      "Norditropin"
    ],
    "molecularType": "Protein",
    "categoryTags": [
      "Growth hormone",
      "Hormonal/fertility"
    ],
    "fdaStatus": "Approved",
    "doseRange": "0.5-4 IU/day",
    "normalizedHalfLifeHours": 2.5,
    "halfLifeDisplay": "~2-3 hours",
    "estimatedHalfLife": true,
    "evidenceGrade": "A",
    "route": "SubQ",
    "uses": "GH deficiency; Growth disorders; Body composition",
    "summary": "Recombinant human growth hormone identical to endogenous 191-amino acid GH, FDA-approved for multiple growth-related and metabolic conditions.",
    "warnings": [],
    "goal": "Support increases in lean body mass, reductions in adipose tissue, and enhanced metabolic function.",
    "minDailyDose": "150 mcg",
    "maxDailyDose": "500 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "hgh-fragment-176-191",
    "name": "HGH Fragment 176-191",
    "originalProduct": "HGH Fragment 176-191",
    "alternateNames": [
      "HGH Frag",
      "AOD-9604 precursor"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "GLP",
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Research",
    "doseRange": "250-500 mcg/day",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~30 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "C+",
    "route": "SubQ",
    "uses": "Fat reduction; Lipolysis; Metabolic research",
    "summary": "C-terminal fragment of human growth hormone studied for its lipolytic properties without affecting blood glucose or growth.",
    "warnings": [
      "Research"
    ],
    "goal": "Support reduction of fat mass and enhance fat oxidation over time.",
    "minDailyDose": "300 mcg",
    "maxDailyDose": "500 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "hmg",
    "name": "HMG",
    "originalProduct": "HMG",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": "Stimulate spermatogenesis in males with hypogonadotropic hypogonadism or infertility.",
    "minDailyDose": "N/A (weekly protocol)",
    "maxDailyDose": "N/A (weekly protocol)",
    "maxWeeklyDose": "75 IU",
    "cycleLengthOn": "Minimum 12 weeks; may extend to 16 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "humanin",
    "name": "Humanin",
    "originalProduct": "Humanin",
    "alternateNames": [
      "HN",
      "HNG (S14G-Humanin)"
    ],
    "molecularType": null,
    "categoryTags": [
      "Cognitive",
      "Longevity"
    ],
    "fdaStatus": "Research",
    "doseRange": null,
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "C+",
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [
      "Research"
    ],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "hyaluronic-acid",
    "name": "Hyaluronic Acid",
    "originalProduct": "Hyaluronic Acid",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "igf-1-des",
    "name": "IGF-1 DES",
    "originalProduct": "IGF-1 DES",
    "alternateNames": [
      "Des(1-3) IGF-1"
    ],
    "molecularType": null,
    "categoryTags": [
      "Growth hormone",
      "Recovery",
      "Hormonal/fertility",
      "Muscle/performance"
    ],
    "fdaStatus": "Research",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~20-30 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "C+",
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [
      "Research"
    ],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "igf-1-lr3",
    "name": "IGF-1 LR3",
    "originalProduct": "IGF-1 LR3",
    "alternateNames": [
      "Long R3 IGF-1",
      "LR3-IGF-1"
    ],
    "molecularType": "Protein",
    "categoryTags": [
      "Growth hormone",
      "Recovery",
      "Hormonal/fertility",
      "Muscle/performance"
    ],
    "fdaStatus": "Research",
    "doseRange": "20-100 mcg/day",
    "normalizedHalfLifeHours": 25,
    "halfLifeDisplay": "~20-30 hours",
    "estimatedHalfLife": true,
    "evidenceGrade": "B-",
    "route": "SubQ",
    "uses": "Muscle growth; Cell proliferation; Recovery",
    "summary": "Modified IGF-1 with an arginine substitution and 13-amino-acid extension that extends half-life and reduces IGF binding protein affinity.",
    "warnings": [
      "Research"
    ],
    "goal": "Support anabolic processes and metabolic function through enhanced IGF-1 activity with extended bioavailability.",
    "minDailyDose": "20 mcg",
    "maxDailyDose": "50 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "insulin",
    "name": "Insulin",
    "originalProduct": "Insulin",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "ipamorelin",
    "name": "Ipamorelin",
    "originalProduct": "Ipamorelin",
    "alternateNames": [
      "NNC 26-0161"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Recovery"
    ],
    "fdaStatus": "Research",
    "doseRange": "100-300 mcg 1-3x/day",
    "normalizedHalfLifeHours": 2,
    "halfLifeDisplay": "~2 hours",
    "estimatedHalfLife": true,
    "evidenceGrade": "B",
    "route": "SubQ",
    "uses": "GH release; Recovery; Body composition",
    "summary": "Selective growth hormone secretagogue that stimulates GH release via the ghrelin receptor with minimal impact on cortisol and prolactin levels.",
    "warnings": [
      "Research"
    ],
    "goal": "Stimulate endogenous growth hormone release to support anabolic processes related to muscle growth, fat metabolism, and tissue repair.",
    "minDailyDose": "100 mcg",
    "maxDailyDose": "250 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "2–4 weeks off"
  },
  {
    "id": "kisspeptin-10",
    "name": "Kisspeptin-10",
    "originalProduct": "Kisspeptin-10",
    "alternateNames": [
      "KP-10",
      "Metastin 45-54",
      "YNWNSFGLRF"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Healing",
      "Sexual health",
      "Hormonal/fertility"
    ],
    "fdaStatus": "Investigational",
    "doseRange": "1–10 mcg/kg",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~28 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "B-",
    "route": "SubQ/IV",
    "uses": "GnRH release; Fertility assessment; Puberty research",
    "summary": "C-terminal 10-amino acid active fragment of kisspeptin that potently stimulates GnRH release; used in reproductive endocrinology research and clinical diagnostic protocols.",
    "warnings": [
      "C-terminal 10-amino acid active fragment of kisspeptin that potently stimulates GnRH release; used in reproductive endocrinology research and clinical diagnostic protocols.",
      "Investigational"
    ],
    "goal": "Support physiological reproductive hormone signaling through upstream GnRH stimulation.",
    "minDailyDose": "100 mcg",
    "maxDailyDose": "200 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "klow",
    "name": "KLOW",
    "originalProduct": "KLOW",
    "alternateNames": [
      "KLOW",
      "K-L-O-W stack",
      "KPV + GHK-Cu + BPC-157 + TB-500",
      "sometimes listed with LL-37"
    ],
    "molecularType": "Stack / Blend",
    "categoryTags": [
      "Recovery",
      "Healing",
      "Immune support",
      "Skin/cosmetic"
    ],
    "fdaStatus": "Research",
    "doseRange": "250 mcg SC daily; formulation/component dosing varies",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Blend; component-dependent",
    "estimatedHalfLife": false,
    "evidenceGrade": "LIMITED",
    "route": "Injectable",
    "uses": "Multi-modal healing; Chronic inflammation support; Skin/hair regeneration; Post-surgical recovery; Sports injury support",
    "summary": "Community/public-market blend commonly described as a GLOW-style stack with KPV added for anti-inflammatory support.",
    "warnings": [
      "Research"
    ],
    "goal": "Regenerative and anti-inflammatory research",
    "minDailyDose": "250 mcg each; 1.25 mg GHK-Cu",
    "maxDailyDose": "750 mcg each; 3.75 mg GHK-Cu",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–16 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "kpv",
    "name": "KPV",
    "originalProduct": "KPV",
    "alternateNames": [
      "Lys-Pro-Val",
      "alpha-MSH fragment"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Recovery",
      "Healing",
      "Immune support",
      "Skin/cosmetic"
    ],
    "fdaStatus": "Research",
    "doseRange": "200-500 mcg 1-2x/day",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "C+",
    "route": "SubQ/Topical",
    "uses": "Anti-inflammatory; Gut inflammation; Skin inflammation",
    "summary": "C-terminal tripeptide fragment of alpha-MSH with anti-inflammatory properties studied for inflammatory bowel conditions and skin inflammation.",
    "warnings": [
      "Research"
    ],
    "goal": "Support reduction of systemic inflammation and modulate immune responses without melanotropic effects.",
    "minDailyDose": "200 mcg",
    "maxDailyDose": "500 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "l-carnitine",
    "name": "L-Carnitine",
    "originalProduct": "L-Carnitine",
    "alternateNames": [
      "Levocarnitine",
      "Carnitine"
    ],
    "molecularType": "Small molecule / nutrient derivative",
    "categoryTags": [
      "Recovery",
      "Healing",
      "Metabolic",
      "Weight loss",
      "Cognitive",
      "Longevity"
    ],
    "fdaStatus": "Approved",
    "doseRange": "500-2000 mg",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": "WELL",
    "route": "Injectable",
    "uses": "Fat metabolism & weight loss; Mitochondrial energy support; Heart health; Cognitive function (ALCAR); Exercise recovery",
    "summary": "Naturally occurring amino-acid derivative essential for transporting long-chain fatty acids into mitochondria for beta-oxidation; public peptide-market entries commonly include injectable L-carnitine in metabolic stacks.",
    "warnings": [
      "Research / approved forms exist"
    ],
    "goal": "Support mitochondrial fatty acid oxidation and energy metabolism while avoiding TMAO production associated with oral dosing.",
    "minDailyDose": "50 mg",
    "maxDailyDose": "100 mg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "lc216-blend",
    "name": "LC216 Blend",
    "originalProduct": "LC216 Blend",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "lemon-bottle",
    "name": "Lemon Bottle",
    "originalProduct": "Lemon Bottle",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "lipo-b",
    "name": "Lipo-B",
    "originalProduct": "Lipo-B",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "lipo-c",
    "name": "Lipo-C",
    "originalProduct": "Lipo-C",
    "alternateNames": [
      "LIP",
      "Lipotropic injection",
      "MIC + B vitamins"
    ],
    "molecularType": null,
    "categoryTags": [
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Research",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Blend; component-dependent",
    "estimatedHalfLife": false,
    "evidenceGrade": "LIMITED",
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [
      "Research / supplement-style blend"
    ],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "lipo-c-2",
    "name": "Lipo-C",
    "originalProduct": "Lipo-C with B12",
    "alternateNames": [
      "Lipo-C with B12",
      "MIC + B vitamins"
    ],
    "molecularType": null,
    "categoryTags": [
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Research",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Blend; component-dependent",
    "estimatedHalfLife": false,
    "evidenceGrade": "LIMITED",
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [
      "Research / supplement-style blend"
    ],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "lipo-c-3",
    "name": "Lipo-C",
    "originalProduct": "MIC / Lipo-C with B12",
    "alternateNames": [
      "MIC",
      "MIC",
      "Lipo-C with B12",
      "Methionine-Inositol-Choline + B vitamins"
    ],
    "molecularType": null,
    "categoryTags": [
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Research",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Blend; component-dependent",
    "estimatedHalfLife": false,
    "evidenceGrade": "LIMITED",
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [
      "Research / supplement-style blend"
    ],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "lipo-c-plus",
    "name": "Lipo-C Plus",
    "originalProduct": "Lipo-C Plus",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "ll-37",
    "name": "LL-37",
    "originalProduct": "LL-37",
    "alternateNames": [
      "Cathelicidin",
      "hCAP-18 fragment"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Immune support",
      "Antimicrobial"
    ],
    "fdaStatus": "Research",
    "doseRange": "100-500 mcg/day",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "B-",
    "route": "SubQ/Topical",
    "uses": "Antimicrobial defense; Immune modulation; Biofilm disruption",
    "summary": "37-amino acid human cathelicidin antimicrobial peptide with broad-spectrum activity against bacteria, viruses, and fungi, plus immunomodulatory functions.",
    "warnings": [
      "Research"
    ],
    "goal": "Support antimicrobial defense and wound-healing processes.",
    "minDailyDose": "100 µg",
    "maxDailyDose": "400 µg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "matrixyl-palmitoyl-pentapeptide-4",
    "name": "Matrixyl (Palmitoyl Pentapeptide-4)",
    "originalProduct": "Matrixyl",
    "alternateNames": [
      "Pal-KTTKS",
      "Matrixyl"
    ],
    "molecularType": null,
    "categoryTags": [
      "Recovery",
      "Skin/cosmetic"
    ],
    "fdaStatus": "Research",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "N/A (topical)",
    "estimatedHalfLife": false,
    "evidenceGrade": "B-",
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [
      "Research"
    ],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "mazdutide",
    "name": "Mazdutide",
    "originalProduct": "Mazdutide",
    "alternateNames": [
      "LY-3305677",
      "IBI362"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "GLP",
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Investigational",
    "doseRange": "3-9 mg/week",
    "normalizedHalfLifeHours": 144,
    "halfLifeDisplay": "~6 days",
    "estimatedHalfLife": true,
    "evidenceGrade": "B",
    "route": "SubQ",
    "uses": "Obesity; Type 2 diabetes; Metabolic research",
    "summary": "Dual GLP-1 and glucagon receptor agonist in Phase 3 clinical development for obesity and type 2 diabetes, showing significant weight reduction.",
    "warnings": [
      "Investigational"
    ],
    "goal": "Support chronic weight management and metabolic improvement through dual GLP‑1/glucagon receptor activation.",
    "minDailyDose": "2.5 mg weekly",
    "maxDailyDose": "6 mg weekly",
    "maxWeeklyDose": "6 mg weekly",
    "cycleLengthOn": "Minimum 8 weeks; evidence through 12–48 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "melanotan-i-afamelanotide",
    "name": "Melanotan I (Afamelanotide)",
    "originalProduct": "Melanotan I",
    "alternateNames": [
      "Afamelanotide",
      "CUV1647",
      "Scenesse"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Skin/cosmetic"
    ],
    "fdaStatus": "Approved",
    "doseRange": "16 mg implant every 60 days",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~30 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "A-",
    "route": "SubQ implant",
    "uses": "Erythropoietic protoporphyria; Photoprotection; Vitiligo research",
    "summary": "Synthetic alpha-MSH analog selectively targeting MC1R for melanogenesis, FDA-approved as Scenesse for erythropoietic protoporphyria photoprotection.",
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "melanotan-ii",
    "name": "Melanotan II",
    "originalProduct": "Melanotan II",
    "alternateNames": [
      "MT-2",
      "MT-II"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Healing",
      "Sexual health",
      "Skin/cosmetic"
    ],
    "fdaStatus": "Research",
    "doseRange": "0.25-1 mg loading; 0.5 mg maintenance",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~33 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "C+",
    "route": "SubQ",
    "uses": "Tanning; Sexual function; Appetite suppression",
    "summary": "Non-selective melanocortin receptor agonist studied for skin pigmentation, sexual function, and appetite modulation through MC1R and MC4R activation.",
    "warnings": [
      "Research"
    ],
    "goal": "Increase skin pigmentation (tanning) through melanocortin receptor activation.",
    "minDailyDose": "250 mcg",
    "maxDailyDose": "1,000 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "6–8 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "melatonin",
    "name": "Melatonin",
    "originalProduct": "Melatonin",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "mgf-mechano-growth-factor",
    "name": "MGF (Mechano Growth Factor)",
    "originalProduct": "MGF",
    "alternateNames": [
      "IGF-1Ec",
      "MGF"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Growth hormone",
      "Recovery",
      "Hormonal/fertility",
      "Muscle/performance"
    ],
    "fdaStatus": "Research",
    "doseRange": "100-200 mcg post-workout",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~5-7 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "C+",
    "route": "SubQ/IM",
    "uses": "Muscle repair; Satellite cell activation; Recovery",
    "summary": "Splice variant of IGF-1 produced in response to mechanical stress, studied for its role in activating muscle satellite cells and promoting tissue repair.",
    "warnings": [
      "Research"
    ],
    "goal": "Support tissue repair and regenerative processes through localized growth factor signaling.",
    "minDailyDose": "100 mcg",
    "maxDailyDose": "300 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "mk-677-ibutamoren",
    "name": "MK-677 (Ibutamoren)",
    "originalProduct": "MK-677",
    "alternateNames": [
      "Ibutamoren",
      "MK-0677",
      "Nutrobal"
    ],
    "molecularType": null,
    "categoryTags": [
      "Muscle/performance"
    ],
    "fdaStatus": "Investigational",
    "doseRange": null,
    "normalizedHalfLifeHours": 24,
    "halfLifeDisplay": "~24 hours",
    "estimatedHalfLife": true,
    "evidenceGrade": "B",
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [
      "Investigational"
    ],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "mots-c",
    "name": "MOTS-c",
    "originalProduct": "MOTS-c",
    "alternateNames": [
      "Mitochondrial ORF of Twelve S rRNA type-c"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "GLP",
      "Metabolic",
      "Weight loss",
      "Longevity"
    ],
    "fdaStatus": "Research",
    "doseRange": "5-10 mg 3-5x/week",
    "normalizedHalfLifeHours": 4,
    "halfLifeDisplay": "~4 hours",
    "estimatedHalfLife": true,
    "evidenceGrade": "C+",
    "route": "SubQ",
    "uses": "Metabolic regulation; Exercise mimetic; Insulin sensitivity",
    "summary": "Mitochondrial-derived peptide encoded in the 12S rRNA that activates AMPK and regulates metabolic homeostasis and insulin sensitivity.",
    "warnings": [
      "Research"
    ],
    "goal": "Support metabolic homeostasis, enhance insulin sensitivity, and promote healthy aging through AMPK activation.",
    "minDailyDose": "500 mcg",
    "maxDailyDose": "1,500 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "4–8 weeks on",
    "cycleLengthOff": "4–8 weeks off"
  },
  {
    "id": "nad",
    "name": "NAD+",
    "originalProduct": "NAD+",
    "alternateNames": [
      "Nicotinamide Adenine Dinucleotide",
      "NAD"
    ],
    "molecularType": "Small molecule",
    "categoryTags": [
      "Recovery",
      "Metabolic"
    ],
    "fdaStatus": "Research",
    "doseRange": "100-500 mg/day SubQ; 250-1000 mg IV",
    "normalizedHalfLifeHours": 0.75,
    "halfLifeDisplay": "~45 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "B",
    "route": "SubQ",
    "uses": "Cellular energy; DNA repair; Sirtuin activation",
    "summary": "Essential coenzyme in redox metabolism studied for age-related decline, with supplementation aimed at restoring cellular NAD+ levels for mitochondrial and DNA repair function.",
    "warnings": [
      "Research"
    ],
    "goal": "Support cellular energy metabolism, DNA repair pathways, and mitochondrial function through exogenous NAD+ supplementation.",
    "minDailyDose": "50 mg",
    "maxDailyDose": "100 mg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–16 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "oxytocin",
    "name": "Oxytocin",
    "originalProduct": "Oxytocin",
    "alternateNames": [
      "Pitocin",
      "OXT"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Healing",
      "Cognitive",
      "Sexual health",
      "Hormonal/fertility"
    ],
    "fdaStatus": "Approved",
    "doseRange": "10-40 IU IV/IM; 24 IU nasal",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~3-5 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "A",
    "route": "SubQ/Nasal",
    "uses": "Labor induction; Social bonding research; Postpartum hemorrhage",
    "summary": "Nine-amino acid neurohypophyseal hormone FDA-approved for labor induction and studied extensively for roles in social cognition, bonding, and stress response.",
    "warnings": [],
    "goal": "Explore oxytocin’s effects on social bonding, stress reduction, metabolic function, and pain modulation.",
    "minDailyDose": "100 mcg",
    "maxDailyDose": "500 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "pe-22-28",
    "name": "PE-22-28",
    "originalProduct": "PE-22-28",
    "alternateNames": [
      "Spadin analog"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Cognitive"
    ],
    "fdaStatus": "Research",
    "doseRange": "100-500 mcg/day",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "C",
    "route": "SubQ/Nasal",
    "uses": "Antidepressant research; TREK-1 modulation; Cognitive research",
    "summary": "Heptapeptide analog of spadin that inhibits the TREK-1 potassium channel, studied as a potential rapid-onset antidepressant in preclinical models.",
    "warnings": [
      "Research"
    ],
    "goal": "Support rapid neuroplasticity, mood regulation, and neuroprotection through selective TREK-1 inhibition.",
    "minDailyDose": "50 µg",
    "maxDailyDose": "200 µg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "12–16 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "peg-mgf",
    "name": "PEG-MGF",
    "originalProduct": "PEG-MGF",
    "alternateNames": [
      "PEGylated Mechano Growth Factor"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Growth hormone",
      "Recovery",
      "Hormonal/fertility",
      "Muscle/performance"
    ],
    "fdaStatus": "Research",
    "doseRange": "200 mcg 2-3x/week",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~several days",
    "estimatedHalfLife": false,
    "evidenceGrade": "C",
    "route": "SubQ/IM",
    "uses": "Extended muscle repair; Satellite cell activation; Recovery",
    "summary": "PEGylated form of mechano growth factor with extended half-life allowing less frequent administration compared to standard MGF.",
    "warnings": [
      "Research"
    ],
    "goal": "Support muscle recovery and regeneration through MGF’s satellite cell activation and local growth factor signaling.",
    "minDailyDose": "200 mcg",
    "maxDailyDose": "500 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "pinealon",
    "name": "Pinealon",
    "originalProduct": "Pinealon",
    "alternateNames": [
      "Glu-Asp-Arg"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Cognitive",
      "Longevity"
    ],
    "fdaStatus": "Research",
    "doseRange": "10-20 mg/day",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "C",
    "route": "SubQ",
    "uses": "Pineal gland regulation; Circadian rhythm; Neuroprotection",
    "summary": "Tripeptide bioregulator developed for pineal gland and central nervous system regulation, studied for circadian rhythm normalization and neuroprotection.",
    "warnings": [
      "Research"
    ],
    "goal": "Support neuroprotection, cognitive function, and cellular resilience in brain tissue through peptide bioregulation.",
    "minDailyDose": "1.0 mg",
    "maxDailyDose": "2.0 mg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "10–20 days",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "pnc-27",
    "name": "PNC-27",
    "originalProduct": "PNC-27",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": "Educational exploration of a p53‑derived peptide studied preclinically for selective cancer‑cell membrane disruption.",
    "minDailyDose": "100 mcg",
    "maxDailyDose": "500 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "pt-141-bremelanotide",
    "name": "PT-141 (Bremelanotide)",
    "originalProduct": "PT-141",
    "alternateNames": [
      "Bremelanotide",
      "bremelanotide"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Healing",
      "Sexual health",
      "Skin/cosmetic"
    ],
    "fdaStatus": "Approved",
    "doseRange": "1.75 mg PRN",
    "normalizedHalfLifeHours": 2.7,
    "halfLifeDisplay": "~2.7 hours",
    "estimatedHalfLife": true,
    "evidenceGrade": "A-",
    "route": "SubQ",
    "uses": "Hypoactive sexual desire; Sexual dysfunction; Melanocortin research",
    "summary": "Melanocortin-4 receptor agonist FDA-approved for premenopausal women with hypoactive sexual desire disorder, acting through central nervous system pathways.",
    "warnings": [],
    "goal": "Support sexual desire and arousal through central melanocortin receptor activation.",
    "minDailyDose": "500 mcg",
    "maxDailyDose": "1,500 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "relaxation-pm",
    "name": "Relaxation PM",
    "originalProduct": "Relaxation PM",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "retatrutide",
    "name": "Retatrutide",
    "originalProduct": "Retatrutide",
    "alternateNames": [
      "LY-3437943"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "GLP",
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Investigational",
    "doseRange": "1-12 mg/week",
    "normalizedHalfLifeHours": 144,
    "halfLifeDisplay": "~6 days",
    "estimatedHalfLife": true,
    "evidenceGrade": "B+",
    "route": "SubQ",
    "uses": "Weight loss; Metabolic research; NASH/MAFLD",
    "summary": "Triple hormone receptor agonist (GIP/GLP-1/glucagon) in late-stage clinical trials showing significant weight reduction potential.",
    "warnings": [
      "Investigational"
    ],
    "goal": "Support significant weight reduction and metabolic improvements through triple-receptor activation.",
    "minDailyDose": "2 mg weekly",
    "maxDailyDose": "12 mg weekly",
    "maxWeeklyDose": "12 mg weekly",
    "cycleLengthOn": "Minimum 24 weeks; trials through 48 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "retatrutide-cagrilintide",
    "name": "Retatrutide + Cagrilintide",
    "originalProduct": "Retatrutide + Cagrilintide",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": "Support satiety, reduce food intake, and promote weight management over time.",
    "minDailyDose": "0.6 mg weekly",
    "maxDailyDose": "4.5 mg weekly",
    "maxWeeklyDose": "4.5 mg weekly",
    "cycleLengthOn": "12–16 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "retatrutide-tirzepatide",
    "name": "Retatrutide + Tirzepatide",
    "originalProduct": "Retatrutide + Tirzepatide",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": "Support significant weight reduction and metabolic improvements through triple-receptor activation.",
    "minDailyDose": "2 mg weekly",
    "maxDailyDose": "12 mg weekly",
    "maxWeeklyDose": "12 mg weekly",
    "cycleLengthOn": "Minimum 24 weeks; trials through 48 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "selank",
    "name": "Selank",
    "originalProduct": "Selank",
    "alternateNames": [
      "TP-7",
      "Selankin"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Cognitive",
      "Immune support"
    ],
    "fdaStatus": "Research",
    "doseRange": "250-750 mcg/day intranasal",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~several min (rapid CNS uptake)",
    "estimatedHalfLife": false,
    "evidenceGrade": "B",
    "route": "Nasal",
    "uses": "Anxiolytic; Cognitive enhancement; Immune modulation",
    "summary": "Synthetic analog of the immunomodulatory peptide tuftsin with anxiolytic and nootropic properties, approved in Russia for anxiety and neurasthenia.",
    "warnings": [
      "Research"
    ],
    "goal": "Intranasal anxiolytic and cognitive research",
    "minDailyDose": "2.7 mg",
    "maxDailyDose": "0.2 mg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "14-day manufacturer course; protocol page is calculation-focused",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "semaglutide",
    "name": "Semaglutide",
    "originalProduct": "Semaglutide",
    "alternateNames": [
      "GLP-1 receptor agonist"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "GLP",
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Approved",
    "doseRange": "0.25-2.4 mg/week",
    "normalizedHalfLifeHours": 168,
    "halfLifeDisplay": "~7 days",
    "estimatedHalfLife": true,
    "evidenceGrade": "A",
    "route": "SubQ",
    "uses": "Weight management; Type 2 diabetes; Cardiovascular risk reduction",
    "summary": "GLP-1 receptor agonist with strong clinical evidence for weight loss and glycemic control in type 2 diabetes.",
    "warnings": [],
    "goal": "Support chronic weight management through GLP-1 receptor activation, leading to reduced appetite and improved metabolic parameters.",
    "minDailyDose": "0.25 mg weekly",
    "maxDailyDose": "2.4 mg weekly",
    "maxWeeklyDose": "2.4 mg weekly",
    "cycleLengthOn": "16–20+ weeks with gradual escalation",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "semax",
    "name": "Semax",
    "originalProduct": "Semax",
    "alternateNames": [
      "MEHFPGP",
      "Semax heptapeptide"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Recovery",
      "Cognitive"
    ],
    "fdaStatus": "Research",
    "doseRange": "200-600 mcg/day intranasal",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~2-3 min (rapid CNS uptake)",
    "estimatedHalfLife": false,
    "evidenceGrade": "B",
    "route": "Nasal",
    "uses": "Cognitive enhancement; Neuroprotection; Stroke recovery",
    "summary": "Synthetic analog of ACTH(4-10) approved in Russia for cognitive and neurological conditions, studied for BDNF upregulation and neuroprotective properties.",
    "warnings": [
      "Research"
    ],
    "goal": "Intranasal cognitive and neuroprotective research",
    "minDailyDose": "0.25 mg",
    "maxDailyDose": "1 mg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "No repeated cycle stated; protocol page is calculation-focused",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "sermorelin",
    "name": "Sermorelin",
    "originalProduct": "Sermorelin",
    "alternateNames": [
      "GRF 1-29",
      "Geref"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Growth hormone",
      "Longevity"
    ],
    "fdaStatus": "Approved",
    "doseRange": "200-500 mcg before bed",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~10-20 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "B+",
    "route": "SubQ",
    "uses": "GH stimulation; Pediatric GH deficiency; Anti-aging",
    "summary": "GHRH analog consisting of the first 29 amino acids of endogenous GHRH, previously FDA-approved for diagnostic use in GH deficiency.",
    "warnings": [],
    "goal": "Stimulate endogenous pituitary GH release to support physiologic IGF‑1 levels and anabolic processes.",
    "minDailyDose": "200 µg",
    "maxDailyDose": "500 µg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "3–6 months",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "slu-pp-332",
    "name": "SLU-PP-332",
    "originalProduct": "SLU-PP-322",
    "alternateNames": [
      "ERR agonist"
    ],
    "molecularType": "Small molecule",
    "categoryTags": [
      "Metabolic"
    ],
    "fdaStatus": "Research",
    "doseRange": "Research dosing",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "C",
    "route": "SubQ",
    "uses": "Exercise mimetic; ERR activation; Metabolic research",
    "summary": "Estrogen-related receptor (ERR) agonist studied as an exercise mimetic that activates endurance and fatigue-resistance pathways without physical exercise.",
    "warnings": [
      "Research"
    ],
    "goal": "Preclinical exercise-mimetic and metabolic research",
    "minDailyDose": "1,250 mcg",
    "maxDailyDose": "2,500 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "snap-8",
    "name": "SNAP-8",
    "originalProduct": "Snap-8",
    "alternateNames": [
      "Acetyl Octapeptide-3"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Longevity",
      "Skin/cosmetic"
    ],
    "fdaStatus": "Research",
    "doseRange": "3-10% topical",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "N/A (topical)",
    "estimatedHalfLife": false,
    "evidenceGrade": "C+",
    "route": "Topical",
    "uses": "Expression wrinkle reduction; Anti-aging; Botox alternative",
    "summary": "Extended version of Argireline (8 amino acids vs 6) that inhibits SNARE complex formation with reportedly enhanced efficacy for reducing expression wrinkles.",
    "warnings": [
      "Research"
    ],
    "goal": "Topical cosmetic formulation research",
    "minDailyDose": "0.0015 %",
    "maxDailyDose": "0.005 %",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "Twice daily for 28 days in manufacturer testing; other study schedules vary",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "ss-31-elamipretide",
    "name": "SS-31 (Elamipretide)",
    "originalProduct": "SS-31",
    "alternateNames": [
      "Elamipretide",
      "Bendavia",
      "MTP-131"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Longevity"
    ],
    "fdaStatus": "Investigational",
    "doseRange": "4-40 mg/day",
    "normalizedHalfLifeHours": 4,
    "halfLifeDisplay": "~4 hours",
    "estimatedHalfLife": true,
    "evidenceGrade": "B",
    "route": "SubQ",
    "uses": "Mitochondrial function; Barth syndrome; Age-related decline",
    "summary": "Cell-permeable tetrapeptide that concentrates at the inner mitochondrial membrane to stabilize cardiolipin and improve mitochondrial function.",
    "warnings": [
      "Investigational"
    ],
    "goal": "Support mitochondrial function, enhance ATP production, and reduce oxidative stress in tissues with high metabolic demand.",
    "minDailyDose": "5 mg",
    "maxDailyDose": "10 mg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "superhuman-blend",
    "name": "SuperHuman Blend",
    "originalProduct": "SuperHuman Blend",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "survodutide",
    "name": "Survodutide",
    "originalProduct": "Survodutide",
    "alternateNames": [
      "BI 456906"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "GLP",
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Investigational",
    "doseRange": "0.3-6 mg/week",
    "normalizedHalfLifeHours": 144,
    "halfLifeDisplay": "~6 days",
    "estimatedHalfLife": true,
    "evidenceGrade": "B",
    "route": "SubQ",
    "uses": "Obesity; NASH/MAFLD; Metabolic research",
    "summary": "Dual GLP-1 and glucagon receptor agonist in Phase 3 trials for obesity and metabolic liver disease.",
    "warnings": [
      "Investigational"
    ],
    "goal": "Support metabolic improvement and weight management through dual GLP‑1/glucagon receptor activation.",
    "minDailyDose": "0.6 mg weekly",
    "maxDailyDose": "6 mg weekly",
    "maxWeeklyDose": "6 mg weekly",
    "cycleLengthOn": "12–16 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "tb-500-thymosin-beta-4",
    "name": "TB-500 (Thymosin Beta-4)",
    "originalProduct": "TB-500",
    "alternateNames": [
      "Thymosin Beta-4",
      "TB4",
      "TB-500"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Recovery",
      "Healing",
      "Immune support"
    ],
    "fdaStatus": "Research",
    "doseRange": "2.5-5 mg 2x/week (loading), 2.5 mg/week (maint)",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~3 hours (estimated; tissue effects may last longer)",
    "estimatedHalfLife": true,
    "evidenceGrade": "B",
    "route": "SubQ",
    "uses": "Wound healing; Cardiac repair; Inflammation reduction",
    "summary": "43-amino acid peptide involved in cell migration, blood vessel formation, and tissue repair, studied for accelerating wound and cardiac tissue recovery.",
    "warnings": [
      "Research"
    ],
    "goal": "Support tissue repair, wound healing, and angiogenesis through the active thymosin beta‑4 fragment mechanism.",
    "minDailyDose": "500 mcg",
    "maxDailyDose": "1,000 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "tesamorelin",
    "name": "Tesamorelin",
    "originalProduct": "Tesamorelin",
    "alternateNames": [
      "TH9507"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Growth hormone",
      "Metabolic"
    ],
    "fdaStatus": "Approved",
    "doseRange": "2 mg/day",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~26-38 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "A-",
    "route": "SubQ",
    "uses": "HIV lipodystrophy; Visceral fat reduction; GH stimulation",
    "summary": "Stabilized GHRH analog FDA-approved for reducing excess abdominal fat in HIV-infected patients with lipodystrophy.",
    "warnings": [],
    "goal": "Reduce visceral adipose tissue and improve lipid profiles through sustained GH/IGF-1 elevation.",
    "minDailyDose": "1 mg",
    "maxDailyDose": "2 mg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "12–26 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "thymalin",
    "name": "Thymalin",
    "originalProduct": "Thymalin",
    "alternateNames": [
      "Thymus extract peptide"
    ],
    "molecularType": null,
    "categoryTags": [
      "Longevity",
      "Immune support"
    ],
    "fdaStatus": "Research",
    "doseRange": null,
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "C+",
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [
      "Thymic peptide bioregulator used in Russian gerontology research for immune system restoration and studied alongside epithalon for lifespan extension.",
      "Research"
    ],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "thymosin-alpha-1",
    "name": "Thymosin Alpha-1",
    "originalProduct": "Thymosin Alpha-1",
    "alternateNames": [
      "Ta1",
      "Thymalfasin",
      "Zadaxin"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Immune support"
    ],
    "fdaStatus": "Approved",
    "doseRange": "1.6-3.2 mg 2-3x/week",
    "normalizedHalfLifeHours": 2,
    "halfLifeDisplay": "~2 hours",
    "estimatedHalfLife": true,
    "evidenceGrade": "A-",
    "route": "SubQ",
    "uses": "Immune enhancement; Hepatitis B/C; Adjunct to vaccines",
    "summary": "28-amino acid thymic peptide approved in over 30 countries for immune modulation, studied extensively for chronic viral hepatitis and as a vaccine adjuvant.",
    "warnings": [],
    "goal": "Support immune modulation and enhance host defense mechanisms.",
    "minDailyDose": "300 mcg",
    "maxDailyDose": "500 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "tirzepatide",
    "name": "Tirzepatide",
    "originalProduct": "Tirzepatide",
    "alternateNames": [
      "GIP",
      "GLP-1 agonist"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "GLP",
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Approved",
    "doseRange": "2.5-15 mg/week",
    "normalizedHalfLifeHours": 120,
    "halfLifeDisplay": "~5 days",
    "estimatedHalfLife": true,
    "evidenceGrade": "A",
    "route": "SubQ",
    "uses": "Weight management; Type 2 diabetes; Metabolic syndrome",
    "summary": "Dual GIP and GLP-1 receptor agonist demonstrating superior weight reduction outcomes compared to single-agonist therapies.",
    "warnings": [],
    "goal": "Support glycemic control, weight management, and metabolic health through dual incretin receptor activation.",
    "minDailyDose": "2.5 mg weekly",
    "maxDailyDose": "15 mg weekly",
    "maxWeeklyDose": "15 mg weekly",
    "cycleLengthOn": "12–16+ weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "triptorelin",
    "name": "Triptorelin",
    "originalProduct": "Triptorelin",
    "alternateNames": [
      "Trelstar",
      "Decapeptyl",
      "GnRH agonist"
    ],
    "molecularType": null,
    "categoryTags": [
      "Healing",
      "Sexual health"
    ],
    "fdaStatus": "Approved",
    "doseRange": null,
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~3 hours (peptide); depot weeks",
    "estimatedHalfLife": true,
    "evidenceGrade": "A",
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  },
  {
    "id": "vesugen",
    "name": "Vesugen",
    "originalProduct": "Vesugen",
    "alternateNames": [],
    "molecularType": null,
    "categoryTags": [
      "Other"
    ],
    "fdaStatus": "Unknown",
    "doseRange": null,
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Unknown",
    "estimatedHalfLife": false,
    "evidenceGrade": null,
    "route": null,
    "uses": null,
    "summary": null,
    "warnings": [],
    "goal": "Support vascular endothelial function and cellular renewal over time.",
    "minDailyDose": "500 mcg",
    "maxDailyDose": "2,000 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "8–12 weeks",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "vilon",
    "name": "Vilon",
    "originalProduct": "Vilon",
    "alternateNames": [
      "Lys-Glu"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Longevity",
      "Immune support"
    ],
    "fdaStatus": "Research",
    "doseRange": "10-20 mg/day",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "C",
    "route": "SubQ",
    "uses": "Immune bioregulation; Thymic function; Longevity",
    "summary": "Dipeptide bioregulator (Lys-Glu) studied for immune system regulation and thymic function support in gerontological research.",
    "warnings": [
      "Dipeptide bioregulator (Lys-Glu) studied for immune system regulation and thymic function support in gerontological research.",
      "Research"
    ],
    "goal": "Support immune modulation and thymic function markers based on preclinical observations.",
    "minDailyDose": "67 mcg",
    "maxDailyDose": "667 mcg",
    "maxWeeklyDose": "Not stated",
    "cycleLengthOn": "5 days on",
    "cycleLengthOff": "Not stated"
  },
  {
    "id": "vip-vasoactive-intestinal-peptide",
    "name": "VIP (Vasoactive Intestinal Peptide)",
    "originalProduct": "VIP",
    "alternateNames": [
      "VIP",
      "Aviptadil"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Cognitive",
      "Immune support"
    ],
    "fdaStatus": "Investigational",
    "doseRange": "50-200 mcg/day",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~2 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "B",
    "route": "SubQ/Nasal",
    "uses": "Pulmonary hypertension; Immune modulation; Neuroprotection",
    "summary": "28-amino acid neuropeptide with vasodilatory, anti-inflammatory, and immunomodulatory properties, studied for ARDS and pulmonary conditions.",
    "warnings": [
      "Investigational"
    ],
    "goal": null,
    "minDailyDose": null,
    "maxDailyDose": null,
    "maxWeeklyDose": null,
    "cycleLengthOn": null,
    "cycleLengthOff": null
  }
];
