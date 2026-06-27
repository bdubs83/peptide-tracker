import { Beaker, BookOpen, Calendar, Dna, User, Wrench } from "lucide-react";

export const navItems = [
  { path: "/tools", label: "Tools", Icon: Wrench },
  { path: "/vault", label: "Vault", Icon: Dna },
  { path: "/calendar", label: "Calendar", Icon: Calendar },
  { path: "/peptides", label: "Peptides", Icon: Beaker },
  { path: "/guides", label: "Guides", Icon: BookOpen },
  { path: "/settings", label: "Settings", Icon: User },
];

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
