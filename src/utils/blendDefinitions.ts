export interface BlendComponentDefinition {
  peptideCatalogId: string;
  parts: number;
}

export interface BlendDefinition {
  id: string;
  displayName: string;
  blendCatalogIds: string[];
  matchNames: string[];
  matchPrefixes?: string[];
  components: BlendComponentDefinition[];
}

export const BLEND_DEFINITIONS: BlendDefinition[] = [
  {
    id: "klow-80",
    displayName: "KLOW",
    blendCatalogIds: ["klow-kk-10-protocol"],
    matchNames: ["KLOW 80", "KLOW", "K-L-O-W stack", "KLOW / KK-10 Protocol"],
    matchPrefixes: ["KLOW"],
    components: [
      { peptideCatalogId: "ghk-cu", parts: 5 },
      { peptideCatalogId: "bpc-157", parts: 1 },
      { peptideCatalogId: "tb-500-thymosin-beta-4", parts: 1 },
      { peptideCatalogId: "kpv", parts: 1 },
    ],
  },
  {
    id: "wolverine-stack",
    displayName: "Wolverine Stack",
    blendCatalogIds: ["bpc-157-tb-500-blend"],
    matchNames: ["Wolverine Stack", "BPC-157/TB-500 Blend", "BPC-157 + TB-500", "BPC TB Blend"],
    matchPrefixes: ["Wolverine"],
    components: [
      { peptideCatalogId: "bpc-157", parts: 1 },
      { peptideCatalogId: "tb-500-thymosin-beta-4", parts: 1 },
    ],
  },
  {
    id: "glow",
    displayName: "GLOW",
    blendCatalogIds: ["glow"],
    matchNames: ["GLOW", "GLOW Stack", "GHK-Cu + BPC-157 + TB-500"],
    matchPrefixes: ["GLOW"],
    components: [
      { peptideCatalogId: "ghk-cu", parts: 5 },
      { peptideCatalogId: "bpc-157", parts: 1 },
      { peptideCatalogId: "tb-500-thymosin-beta-4", parts: 1 },
    ],
  },
];

function normalizeBlendName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getBlendDefinitionForCatalogId(catalogId: string) {
  return BLEND_DEFINITIONS.find((blend) => blend.blendCatalogIds.includes(catalogId));
}

export function getBlendDefinitionForName(name: string) {
  const normalized = normalizeBlendName(name);
  return BLEND_DEFINITIONS.find((blend) =>
    blend.matchNames.some((matchName) => normalizeBlendName(matchName) === normalized) ||
    blend.matchPrefixes?.some((prefix) => normalized.startsWith(normalizeBlendName(prefix)))
  );
}
