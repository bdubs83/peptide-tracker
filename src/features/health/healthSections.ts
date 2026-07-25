export type HealthSectionId = "overview" | "body" | "activity" | "nutrition" | "recovery";

export const getHealthSection = (search: string): HealthSectionId => {
  const tab = new URLSearchParams(search).get("tab");
  return tab === "body" || tab === "activity" || tab === "nutrition" || tab === "recovery" ? tab : "overview";
};
