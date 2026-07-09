import React, { useMemo, useState } from "react";
import { ExternalLink, Globe, Link as LinkIcon, Search, Video } from "lucide-react";
import { Card } from "../../components/Card";
import { Input } from "../../components/Input";

type Resource = {
  title: string;
  description: string;
  url: string;
  type: "website" | "youtube";
};

const websiteResources: Resource[] = [
  {
    title: "RUI VPN Data",
    description: "Designed by Said Kol of the RUIC community.",
    url: "https://ruivpndata.com/",
    type: "website",
  },
  {
    title: "Pep-Pedia",
    description: "Source for specific peptide information.",
    url: "https://pep-pedia.org/",
    type: "website",
  },
  {
    title: "Path to Peptides",
    description: "Peptides database and interactive tools.",
    url: "https://www.pathtopeptides.com/",
    type: "website",
  },
];

const peptideSourcingResources: Resource[] = [
  {
    title: "Reta Unfiltered Skool",
    description: "Trusted community resource for wholesale peptides with COAs.",
    url: "https://www.skool.com/retaunfiltered/about?ref=fbe7e9d856ed44de89af48d503a9ce93",
    type: "website",
  },
];

const youtubeResources: Resource[] = [
  {
    title: "Dr Alex Tatem",
    description: "@DrAlexTatem",
    url: "https://www.youtube.com/@DrAlexTatem",
    type: "youtube",
  },
  {
    title: "Dr Jones DC",
    description: "@DrJonesDC",
    url: "https://www.youtube.com/@DrJonesDC",
    type: "youtube",
  },
  {
    title: "Dr A Froese",
    description: "@DrAFroese",
    url: "https://www.youtube.com/@DrAFroese",
    type: "youtube",
  },
  {
    title: "Peptide Critic",
    description: "@PeptideCritic",
    url: "https://www.youtube.com/@PeptideCritic",
    type: "youtube",
  },
  {
    title: "Living Youthful",
    description: "@Livingyouthful07",
    url: "https://www.youtube.com/@Livingyouthful07",
    type: "youtube",
  },
];

const resourceSections = [
  { title: "Peptide Sourcing", Icon: LinkIcon, resources: peptideSourcingResources },
  { title: "Websites", Icon: Globe, resources: websiteResources },
  { title: "YouTube", Icon: Video, resources: youtubeResources },
];

const normalizeSearchText = (value: string) => value.trim().toLowerCase();

const ResourceCard: React.FC<{ resource: Resource }> = ({ resource }) => {
  const Icon = resource.type === "youtube" ? Video : LinkIcon;

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${resource.title}`}
      title={`Open ${resource.title}`}
      className="card-premium resource-card-link"
      style={{
        padding: "14px",
        display: "grid",
        gridTemplateColumns: "auto minmax(0, 1fr) auto",
        gap: "12px",
        alignItems: "center",
        border: "1px solid var(--border-color)",
      }}
    >
      <div
        style={{
          width: "38px",
          height: "38px",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: resource.type === "youtube" ? "rgba(239, 68, 68, 0.1)" : "var(--bg-active-soft)",
          color: resource.type === "youtube" ? "#ef4444" : "var(--color-primary)",
        }}
      >
        <Icon size={20} />
      </div>

      <div style={{ minWidth: 0 }}>
        <h3 style={{ fontSize: "0.98rem", margin: 0, color: "var(--text-primary)" }}>
          {resource.title}
        </h3>
        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: "4px 0 0", lineHeight: 1.35 }}>
          {resource.description}
        </p>
      </div>

      <span
        aria-hidden="true"
        className="btn btn-secondary"
        style={{
          width: "38px",
          height: "38px",
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textDecoration: "none",
          flexShrink: 0,
        }}
      >
        <ExternalLink size={16} />
      </span>
    </a>
  );
};

export const ResourcesPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedQuery = normalizeSearchText(searchQuery);

  const filteredSections = useMemo(
    () =>
      resourceSections.map((section) => ({
        ...section,
        resources: section.resources.filter((resource) => {
          if (!normalizedQuery) return true;
          return [resource.title, resource.description, resource.url]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery);
        }),
      })),
    [normalizedQuery]
  );

  const resultCount = filteredSections.reduce((total, section) => total + section.resources.length, 0);

  return (
    <div className="fade-in" style={{ paddingBottom: "30px" }}>
      <div style={{ marginBottom: "14px" }}>
        <h1 style={{ fontSize: "1.5rem", fontFamily: "var(--font-display)", marginBottom: "4px" }}>
          Resources
        </h1>
        <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Useful websites and YouTube pages for members.
        </p>
      </div>

      <div style={{ position: "relative", marginBottom: "16px" }}>
        <Search
          size={17}
          style={{
            position: "absolute",
            left: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            color: "var(--text-muted)",
            pointerEvents: "none",
          }}
        />
        <Input
          label="Search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search resources"
          aria-label="Search resources"
          style={{ paddingLeft: "38px" }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {filteredSections.map(({ title, Icon, resources }) => (
          <section key={title} aria-labelledby={`${title.toLowerCase()}-resources`}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "10px",
                marginBottom: "10px",
              }}
            >
              <h2
                id={`${title.toLowerCase()}-resources`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "1rem",
                  margin: 0,
                }}
              >
                <Icon size={18} />
                {title}
              </h2>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                {resources.length}
              </span>
            </div>

            {resources.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {resources.map((resource) => (
                  <ResourceCard key={resource.url} resource={resource} />
                ))}
              </div>
            ) : (
              <Card style={{ padding: "14px", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                No {title.toLowerCase()} match your search.
              </Card>
            )}
          </section>
        ))}
      </div>

      {normalizedQuery && resultCount === 0 && (
        <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginTop: "12px" }}>
          Try a different name, handle, or website.
        </p>
      )}
    </div>
  );
};
