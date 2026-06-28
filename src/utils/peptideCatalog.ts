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
    "route": "Oral",
    "uses": "Fat metabolism; NNMT inhibition; Metabolic research",
    "summary": "Small-molecule NNMT inhibitor studied for its role in regulating fat cell metabolism and energy expenditure in preclinical models.",
    "warnings": [
      "Research"
    ]
  },
  {
    "id": "ace-031",
    "name": "ACE-031",
    "originalProduct": "ACE-031",
    "alternateNames": [
      "ACVR2B-Fc",
      "Soluble Activin Receptor"
    ],
    "molecularType": "Protein",
    "categoryTags": [
      "Muscle/performance"
    ],
    "fdaStatus": "Investigational",
    "doseRange": "Research dosing",
    "normalizedHalfLifeHours": 336,
    "halfLifeDisplay": "~2 weeks",
    "estimatedHalfLife": true,
    "evidenceGrade": "B-",
    "route": "SubQ",
    "uses": "Muscular dystrophy; Muscle wasting; Myostatin pathway inhibition",
    "summary": "Soluble activin type IIB receptor Fc fusion protein that traps myostatin and related ligands, studied in clinical trials for Duchenne muscular dystrophy.",
    "warnings": [
      "Investigational"
    ]
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
    ]
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
    ]
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
    "warnings": []
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
    "warnings": []
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
    ]
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
    ]
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
    "warnings": []
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
    "warnings": []
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
    "route": "SubQ/Oral",
    "uses": "Tissue repair; GI healing; Tendon/ligament recovery",
    "summary": "15-amino acid peptide derived from human gastric juice with extensive preclinical evidence for accelerating healing of tendon, muscle, and GI tissues.",
    "warnings": [
      "Research"
    ]
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
    ]
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
    "warnings": []
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
    ]
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
    ]
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
    "warnings": []
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
    "route": "SubQ/Oral",
    "uses": "Cartilage health; Joint function; Anti-aging",
    "summary": "Tripeptide bioregulator studied for cartilage and musculoskeletal tissue maintenance, part of the Khavinson peptide bioregulator family.",
    "warnings": [
      "Research"
    ]
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
    ]
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
    ]
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
    ]
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
    ]
  },
  {
    "id": "copper-peptide-ahk-cu",
    "name": "Copper Peptide AHK-Cu",
    "originalProduct": "AHK-Cu",
    "alternateNames": [
      "AHK-Cu",
      "Ala-His-Lys-Cu"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Recovery",
      "Skin/cosmetic"
    ],
    "fdaStatus": "Research",
    "doseRange": "Topical as directed",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "N/A (topical)",
    "estimatedHalfLife": false,
    "evidenceGrade": "C+",
    "route": "Topical",
    "uses": "Hair growth stimulation; Skin repair; Collagen synthesis",
    "summary": "Copper-complexed tripeptide variant studied for stimulating hair follicle growth and collagen production, related to but distinct from GHK-Cu.",
    "warnings": [
      "Research"
    ]
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
    "route": "SubQ/Oral",
    "uses": "Brain bioregulation; Cortical function; Cognitive research",
    "summary": "Tetrapeptide bioregulator studied for its regulatory effects on brain cortical function and potential neuroprotective mechanisms.",
    "warnings": [
      "Research"
    ]
  },
  {
    "id": "cristagen",
    "name": "Cristagen",
    "originalProduct": "Crystagen",
    "alternateNames": [
      "Glu-Asp-Gly-Gly (thymus bioregulator)"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Longevity",
      "Immune support"
    ],
    "fdaStatus": "Research",
    "doseRange": "10–20 mg/day",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "C",
    "route": "Oral/SubQ",
    "uses": "Thymic function; Immune aging; Longevity",
    "summary": "Tetrapeptide bioregulator from the Khavinson series targeting thymic tissue; studied alongside thymalin and epithalon in Russian longevity research protocols.",
    "warnings": [
      "Tetrapeptide bioregulator from the Khavinson series targeting thymic tissue; studied alongside thymalin and epithalon in Russian longevity research protocols.",
      "Research"
    ]
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
    "warnings": []
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
    ]
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
    ]
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
    "warnings": []
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
    "molecularType": "Blend",
    "categoryTags": [
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Research",
    "doseRange": "1-2 mL",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Blend; component-dependent",
    "estimatedHalfLife": false,
    "evidenceGrade": "LIMITED",
    "route": "Injectable",
    "uses": "Fat oxidation support; Liver lipid metabolism; Insulin sensitivity support; Metabolic function; Cellular energy production",
    "summary": "Lipotropic injection blend combining L-carnitine, methionine-inositol-choline (MIC), B vitamins such as B6/B12, and NADH; formulations vary substantially by vendor.",
    "warnings": [
      "Research / supplement-style blend"
    ]
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
    "molecularType": "Blend",
    "categoryTags": [
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Research",
    "doseRange": "1-2 mL",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Blend; component-dependent",
    "estimatedHalfLife": false,
    "evidenceGrade": "LIMITED",
    "route": "Injectable",
    "uses": "Fat oxidation support; Liver lipid metabolism; Insulin sensitivity support; Metabolic function; Cellular energy production",
    "summary": "Lipotropic injection blend combining L-carnitine, methionine-inositol-choline (MIC), B vitamins such as B6/B12, and NADH; formulations vary substantially by vendor.",
    "warnings": [
      "Research / supplement-style blend"
    ]
  },
  {
    "id": "follistatin-344",
    "name": "Follistatin 344",
    "originalProduct": "Follistatin",
    "alternateNames": [
      "FST-344",
      "Follistatin"
    ],
    "molecularType": "Protein",
    "categoryTags": [
      "Muscle/performance"
    ],
    "fdaStatus": "Research",
    "doseRange": "100 mcg/day",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "C+",
    "route": "SubQ",
    "uses": "Myostatin inhibition; Muscle growth; Gene therapy research",
    "summary": "Activin-binding protein that neutralizes myostatin and other TGF-beta superfamily members, studied for muscle growth and potential gene therapy applications.",
    "warnings": [
      "Research"
    ]
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
    ]
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
    "warnings": []
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
    ]
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
    ]
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
    ]
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
    ]
  },
  {
    "id": "glp-1-gip-dual-agonist-research-panel",
    "name": "GLP-1 / GIP Dual Agonist Research Panel",
    "originalProduct": "GLP-1",
    "alternateNames": [
      "Incretin combination research"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "GLP",
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Research",
    "doseRange": "Protocol-dependent",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Varies by compound",
    "estimatedHalfLife": false,
    "evidenceGrade": "B",
    "route": "SubQ",
    "uses": "Obesity research; Incretin biology; Comparative metabolic studies",
    "summary": "Research reference covering dual incretin mechanisms combining GLP-1 and GIP receptor activation; relevant to understanding tirzepatide mechanism and next-generation obesity therapeutics.",
    "warnings": [
      "Research reference covering dual incretin mechanisms combining GLP-1 and GIP receptor activation; relevant to understanding tirzepatide mechanism and next-generation obesity therapeutics.",
      "Research"
    ]
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
    ]
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
    "warnings": []
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
    "warnings": []
  },
  {
    "id": "hexarelin",
    "name": "Hexarelin",
    "originalProduct": "Hexarelin",
    "alternateNames": [
      "Examorelin",
      "HEX"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Recovery"
    ],
    "fdaStatus": "Research",
    "doseRange": "100-200 mcg 1-3x/day",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~70 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "B-",
    "route": "SubQ",
    "uses": "GH release; Cardioprotection; Recovery",
    "summary": "Hexapeptide ghrelin mimetic that produces robust GH release and has demonstrated cardioprotective properties in preclinical research.",
    "warnings": [
      "Hexapeptide ghrelin mimetic that produces robust GH release and has demonstrated cardioprotective properties in preclinical research.",
      "Research"
    ]
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
    "warnings": []
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
    ]
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
    "warnings": []
  },
  {
    "id": "humanin",
    "name": "Humanin",
    "originalProduct": "Humanin",
    "alternateNames": [
      "HN",
      "HNG (S14G-Humanin)"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Cognitive",
      "Longevity"
    ],
    "fdaStatus": "Research",
    "doseRange": "1-5 mg/day",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "C+",
    "route": "SubQ",
    "uses": "Cytoprotection; Mitochondrial function; Neuroprotection",
    "summary": "24-amino acid mitochondrial-derived peptide with cytoprotective effects, studied for its role in protecting against age-related cellular stress and neurodegeneration.",
    "warnings": [
      "Research"
    ]
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
    "warnings": []
  },
  {
    "id": "igf-1-des",
    "name": "IGF-1 DES",
    "originalProduct": "IGF-1 DES",
    "alternateNames": [
      "Des(1-3) IGF-1"
    ],
    "molecularType": "Protein",
    "categoryTags": [
      "Growth hormone",
      "Recovery",
      "Hormonal/fertility",
      "Muscle/performance"
    ],
    "fdaStatus": "Research",
    "doseRange": "50-100 mcg pre-workout",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "~20-30 min",
    "estimatedHalfLife": false,
    "evidenceGrade": "C+",
    "route": "SubQ",
    "uses": "Localized muscle growth; Cell proliferation; Recovery",
    "summary": "Truncated IGF-1 analog lacking the first three amino acids, resulting in reduced IGFBP binding and approximately 10x greater potency than native IGF-1.",
    "warnings": [
      "Research"
    ]
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
    ]
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
    "warnings": []
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
    ]
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
    ]
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
    ]
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
    "route": "SubQ/Oral/Topical",
    "uses": "Anti-inflammatory; Gut inflammation; Skin inflammation",
    "summary": "C-terminal tripeptide fragment of alpha-MSH with anti-inflammatory properties studied for inflammatory bowel conditions and skin inflammation.",
    "warnings": [
      "Research"
    ]
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
    ]
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
    "warnings": []
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
    "warnings": []
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
    "warnings": []
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
    "molecularType": "Blend",
    "categoryTags": [
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Research",
    "doseRange": "1-2 mL",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Blend; component-dependent",
    "estimatedHalfLife": false,
    "evidenceGrade": "LIMITED",
    "route": "Injectable",
    "uses": "Liver function support; Methylation support; Insulin sensitivity; Fat metabolism support; Modest effects",
    "summary": "Lipotropic injection containing methionine, inositol, choline, and B vitamins; used in public-market metabolic/weight-loss contexts, with evidence mostly coming from individual components rather than the exact blend.",
    "warnings": [
      "Research / supplement-style blend"
    ]
  },
  {
    "id": "lipo-c-2",
    "name": "Lipo-C",
    "originalProduct": "Lipo-C with B12",
    "alternateNames": [
      "Lipo-C with B12",
      "MIC + B vitamins"
    ],
    "molecularType": "Blend",
    "categoryTags": [
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Research",
    "doseRange": "1-2 mL",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Blend; component-dependent",
    "estimatedHalfLife": false,
    "evidenceGrade": "LIMITED",
    "route": "Injectable",
    "uses": "Liver function support; Methylation support; Insulin sensitivity; Fat metabolism support; Modest effects",
    "summary": "Variant where the public-market description centers on MIC plus B vitamins; exact vendor formulation may differ.",
    "warnings": [
      "Research / supplement-style blend"
    ]
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
    "molecularType": "Blend",
    "categoryTags": [
      "Metabolic",
      "Weight loss"
    ],
    "fdaStatus": "Research",
    "doseRange": "1-2 mL",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "Blend; component-dependent",
    "estimatedHalfLife": false,
    "evidenceGrade": "LIMITED",
    "route": "Injectable",
    "uses": "Liver function support; Methylation support; Insulin sensitivity; Fat metabolism support; Modest effects",
    "summary": "MIC/Lipo-C variant; public-market usage centers on methionine, inositol, choline, and B-vitamin lipotropic injection blends.",
    "warnings": [
      "Research / supplement-style blend"
    ]
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
    "warnings": []
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
    ]
  },
  {
    "id": "matrixyl-palmitoyl-pentapeptide-4",
    "name": "Matrixyl (Palmitoyl Pentapeptide-4)",
    "originalProduct": "Matrixyl",
    "alternateNames": [
      "Pal-KTTKS",
      "Matrixyl"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Recovery",
      "Skin/cosmetic"
    ],
    "fdaStatus": "Research",
    "doseRange": "Topical as directed",
    "normalizedHalfLifeHours": null,
    "halfLifeDisplay": "N/A (topical)",
    "estimatedHalfLife": false,
    "evidenceGrade": "B-",
    "route": "Topical",
    "uses": "Collagen stimulation; Wrinkle repair; Skin firmness",
    "summary": "Lipopeptide that stimulates collagen I, III, and fibronectin production in dermal fibroblasts, widely used in anti-aging skincare formulations.",
    "warnings": [
      "Research"
    ]
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
    ]
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
    "warnings": []
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
    ]
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
    "warnings": []
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
    ]
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
    "molecularType": "Small molecule",
    "categoryTags": [
      "Muscle/performance"
    ],
    "fdaStatus": "Investigational",
    "doseRange": "10-25 mg/day",
    "normalizedHalfLifeHours": 24,
    "halfLifeDisplay": "~24 hours",
    "estimatedHalfLife": true,
    "evidenceGrade": "B",
    "route": "Oral",
    "uses": "GH elevation; Muscle mass; Bone density",
    "summary": "Oral non-peptide ghrelin receptor agonist that elevates GH and IGF-1 levels for up to 24 hours without affecting cortisol levels.",
    "warnings": [
      "Investigational"
    ]
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
    ]
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
    ]
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
    "warnings": []
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
    ]
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
    ]
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
    "route": "SubQ/Oral",
    "uses": "Pineal gland regulation; Circadian rhythm; Neuroprotection",
    "summary": "Tripeptide bioregulator developed for pineal gland and central nervous system regulation, studied for circadian rhythm normalization and neuroprotection.",
    "warnings": [
      "Research"
    ]
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
    "warnings": []
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
    "warnings": []
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
    "warnings": []
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
    ]
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
    "warnings": []
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
    "warnings": []
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
    ]
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
    "route": "SubQ/Oral",
    "uses": "Weight management; Type 2 diabetes; Cardiovascular risk reduction",
    "summary": "GLP-1 receptor agonist with strong clinical evidence for weight loss and glycemic control in type 2 diabetes.",
    "warnings": []
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
    ]
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
    "warnings": []
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
    "route": "Oral",
    "uses": "Exercise mimetic; ERR activation; Metabolic research",
    "summary": "Estrogen-related receptor (ERR) agonist studied as an exercise mimetic that activates endurance and fatigue-resistance pathways without physical exercise.",
    "warnings": [
      "Research"
    ]
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
    ]
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
    ]
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
    "warnings": []
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
    ]
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
    ]
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
    "warnings": []
  },
  {
    "id": "thymalin",
    "name": "Thymalin",
    "originalProduct": "Thymalin",
    "alternateNames": [
      "Thymus extract peptide"
    ],
    "molecularType": "Peptide",
    "categoryTags": [
      "Longevity",
      "Immune support"
    ],
    "fdaStatus": "Research",
    "doseRange": "10 mg/day for 5-10 days",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~hours (estimated 2-4 hours)",
    "estimatedHalfLife": true,
    "evidenceGrade": "C+",
    "route": "SubQ/IM",
    "uses": "Immune restoration; Thymus function; Longevity research",
    "summary": "Thymic peptide bioregulator used in Russian gerontology research for immune system restoration and studied alongside epithalon for lifespan extension.",
    "warnings": [
      "Thymic peptide bioregulator used in Russian gerontology research for immune system restoration and studied alongside epithalon for lifespan extension.",
      "Research"
    ]
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
    "warnings": []
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
    "warnings": []
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
    "molecularType": "Peptide",
    "categoryTags": [
      "Healing",
      "Sexual health"
    ],
    "fdaStatus": "Approved",
    "doseRange": "3.75 mg/month or depot",
    "normalizedHalfLifeHours": 3,
    "halfLifeDisplay": "~3 hours (peptide); depot weeks",
    "estimatedHalfLife": true,
    "evidenceGrade": "A",
    "route": "SubQ/IM",
    "uses": "Prostate cancer; Endometriosis; Precocious puberty",
    "summary": "Potent GnRH agonist that initially stimulates then suppresses gonadotropin release, FDA-approved for advanced prostate cancer and other hormone-dependent conditions.",
    "warnings": []
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
    "warnings": []
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
    "route": "SubQ/Oral",
    "uses": "Immune bioregulation; Thymic function; Longevity",
    "summary": "Dipeptide bioregulator (Lys-Glu) studied for immune system regulation and thymic function support in gerontological research.",
    "warnings": [
      "Dipeptide bioregulator (Lys-Glu) studied for immune system regulation and thymic function support in gerontological research.",
      "Research"
    ]
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
    ]
  }
];
