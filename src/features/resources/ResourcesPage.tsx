import React from "react";
import { ExternalLink, Globe, Users } from "lucide-react";
import { ResourceGuides } from "./ResourceGuides";

type Resource = {
  title: string;
  description: string;
  url: string;
  image?: string;
  imageAlt?: string;
  subscriberCount?: string;
  kind?: "youtube" | "community" | "website";
};

const communityResources: Resource[] = [
  {
    title: "Reta Unfiltered Skool",
    description: "Join the Reta Unfiltered Inner Circle community.",
    url: "https://www.skool.com/retaunfiltered/about?ref=fbe7e9d856ed44de89af48d503a9ce93",
    image: "/resource-icons/skool.ico",
    imageAlt: "Skool logo",
    kind: "community",
  },
  {
    title: "Reta Unfiltered on X",
    description: "Follow @RetaUnfiltered on X.",
    url: "https://x.com/retaunfiltered",
    image: "/resource-icons/x.svg",
    imageAlt: "X logo",
    kind: "community",
  },
  {
    title: "Reta Unfiltered on Rumble",
    description: "Watch Reta Unfiltered with David on Rumble.",
    url: "https://rumble.com/user/RetaUnfilteredwithDavid",
    image: "/resource-icons/rumble.svg",
    imageAlt: "Rumble logo",
    kind: "community",
  },
];

const websiteResources: Resource[] = [
  { title: "RUI VPN Data", description: "Designed by Said Kol of the RUIC community.", url: "https://ruivpndata.com/", kind: "website" },
  { title: "Pep-Pedia", description: "Source for specific peptide information.", url: "https://pep-pedia.org/", kind: "website" },
  { title: "Path to Peptides", description: "Peptides database and interactive tools.", url: "https://www.pathtopeptides.com/", kind: "website" },
];

const youtubeResources: Resource[] = [
  { title: "Dr Alex Tatem", description: "@DrAlexTatem", subscriberCount: "205K subscribers", url: "https://www.youtube.com/@DrAlexTatem", image: "/resource-icons/dr-alex-tatem.jpg", imageAlt: "Dr Alex Tatem channel", kind: "youtube" },
  { title: "Dr Jones DC", description: "@DrJonesDC", subscriberCount: "247K subscribers", url: "https://www.youtube.com/@DrJonesDC", image: "/resource-icons/dr-jones-dc.jpg", imageAlt: "Dr Jones DC channel", kind: "youtube" },
  { title: "Dr A Froese", description: "@DrAFroese", subscriberCount: "2.84K subscribers", url: "https://www.youtube.com/@DrAFroese", image: "/resource-icons/dr-a-froese.jpg", imageAlt: "Dr A Froese channel", kind: "youtube" },
  { title: "Living Youthful", description: "@Livingyouthful07", subscriberCount: "31.5K subscribers", url: "https://www.youtube.com/@Livingyouthful07", image: "/resource-icons/living-youthful.jpg", imageAlt: "Living Youthful channel", kind: "youtube" },
];

const ResourceCard: React.FC<{ resource: Resource }> = ({ resource }) => (
  <a
    href={resource.url}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={`Open ${resource.title}`}
    className="card-premium resource-card-link"
    style={{ padding: "14px", display: "grid", gridTemplateColumns: "auto minmax(0, 1fr) auto", gap: "12px", alignItems: "center", border: "1px solid var(--border-color)" }}
  >
    <div style={{ width: "42px", height: "42px", borderRadius: resource.kind === "youtube" ? "50%" : "10px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-active-soft)", flexShrink: 0 }}>
      {resource.image ? <img src={resource.image} alt={resource.imageAlt ?? ""} width="42" height="42" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Globe size={21} style={{ color: "var(--color-primary)" }} />}
    </div>

    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "7px", flexWrap: "wrap" }}>
        <h3 style={{ fontSize: "0.98rem", margin: 0, color: "var(--text-primary)" }}>{resource.title}</h3>
        {resource.subscriberCount && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "0.72rem", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
            <img src="/resource-icons/youtube.svg" alt="YouTube" width="18" height="18" style={{ width: "18px", height: "18px", objectFit: "contain" }} />
            {resource.subscriberCount}
          </span>
        )}
      </div>
      <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "4px 0 0", lineHeight: 1.35 }}>{resource.description}</p>
    </div>

    <span aria-hidden="true" className="btn btn-secondary" style={{ width: "38px", height: "38px", padding: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><ExternalLink size={16} /></span>
  </a>
);

const ResourceSection: React.FC<{ title: string; icon: React.ReactNode; resources: Resource[] }> = ({ title, icon, resources }) => {
  const sectionId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-resources`;
  return (
    <section aria-labelledby={sectionId}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", marginBottom: "10px" }}>
        <h2 id={sectionId} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "1rem", margin: 0 }}>{icon}{title}</h2>
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{resources.length}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>{resources.map((resource) => <ResourceCard key={resource.url} resource={resource} />)}</div>
    </section>
  );
};

export const ResourcesPage: React.FC = () => (
  <div className="fade-in" style={{ paddingBottom: "30px" }}>
    <div style={{ marginBottom: "18px" }}>
      <h1 style={{ fontSize: "1.5rem", fontFamily: "var(--font-display)", marginBottom: "4px" }}>Resources</h1>
      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Community links, useful websites, YouTube channels, and educational guides.</p>
    </div>

    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <ResourceSection title="Reta Unfiltered Community" icon={<Users size={18} />} resources={communityResources} />
      <ResourceSection title="Websites" icon={<Globe size={18} />} resources={websiteResources} />
      <ResourceSection title="YouTube" icon={<img src="/resource-icons/youtube.svg" alt="" width="20" height="20" />} resources={youtubeResources} />
    </div>

    <ResourceGuides />
  </div>
);
