import { Beaker, Calendar, Dna, HeartPulse, Link as LinkIcon, User, Wrench } from "lucide-react";

export type NavItem = { path: string; label: string; Icon: typeof Wrench; minimalistId?: MinimalistTabId };

export const navItems: NavItem[] = [
  { path: "/tools", label: "Tools", Icon: Wrench, minimalistId: "tools" },
  { path: "/vault", label: "Vault", Icon: Dna },
  { path: "/calendar", label: "Calendar", Icon: Calendar },
  { path: "/peptides", label: "Peptides", Icon: Beaker, minimalistId: "peptides" },
  { path: "/health", label: "Health", Icon: HeartPulse, minimalistId: "health" },
  { path: "/resources", label: "Resources", Icon: LinkIcon, minimalistId: "resources" },
  { path: "/settings", label: "Settings", Icon: User },
] ;

export const minimalistHiddenTabsKey = "pref_minimalist_hidden_tabs";
export type MinimalistTabId = "tools" | "peptides" | "health" | "resources";
export const minimalistTabs: Array<{ id: MinimalistTabId; label: string }> = [
  { id: "tools", label: "Tools" },
  { id: "peptides", label: "Peptides" },
  { id: "health", label: "Health" },
  { id: "resources", label: "Resources" },
];

export const getVisibleNavItems = (value: unknown) => {
  const hidden = Array.isArray(value) ? new Set(value.filter((item): item is MinimalistTabId => minimalistTabs.some((tab) => tab.id === item))) : new Set<MinimalistTabId>();
  return navItems.filter((item) => !item.minimalistId || !hidden.has(item.minimalistId));
};

export const isNavPathActive = (pathname: string, path: string) => {
  if (path === "/tools") {
    return pathname.startsWith("/tools") || pathname === "/calculator";
  }
  if (path === "/vault") {
    return pathname === "/vault" || pathname === "/";
  }
  if (path === "/settings") {
    return pathname.startsWith("/settings") || pathname.startsWith("/profile");
  }
  return pathname.startsWith(path);
};
