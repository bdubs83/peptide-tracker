import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { CalendarPage } from "../features/calendar/CalendarPage";

const lazyNamed = <T extends React.ComponentType>(
  loader: () => Promise<Record<string, T>>,
  exportName: string
) => React.lazy(async () => ({ default: (await loader())[exportName] }));

const VaultPage = lazyNamed(() => import("../features/vault/VaultPage"), "VaultPage");
const AddPeptidePage = lazyNamed(() => import("../features/vault/AddPeptidePage"), "AddPeptidePage");
const PeptideDetailPage = lazyNamed(() => import("../features/vault/PeptideDetailPage"), "PeptideDetailPage");
const PeptidesPage = lazyNamed(() => import("../features/vault/PeptidesPage"), "PeptidesPage");
const PeptideInfoPage = lazyNamed(() => import("../features/vault/PeptideInfoPage"), "PeptideInfoPage");
const ProfilePage = lazyNamed(() => import("../features/vault/ProfilePage"), "ProfilePage");
const ToolsPage = lazyNamed(() => import("../features/tools/ToolsPage"), "ToolsPage");
const ResourcesPage = lazyNamed(() => import("../features/resources/ResourcesPage"), "ResourcesPage");
const ExportCenterPage = lazyNamed(() => import("../features/exports/ExportCenterPage"), "ExportCenterPage");
const HealthTrackerPage = lazyNamed(() => import("../features/health/HealthTrackerPage"), "HealthTrackerPage");

export const AppRoutes: React.FC = () => {
  return (
    <React.Suspense fallback={<div className="page-loading">Loading…</div>}>
      <Routes>
        <Route path="/" element={<Navigate to="/tools/calculator" replace />} />
        <Route path="/tools/*" element={<ToolsPage />} />
        <Route path="/calculator" element={<Navigate to="/tools/calculator" replace />} />
        <Route path="/vault" element={<VaultPage />} />
        <Route path="/vault/add" element={<AddPeptidePage />} />
        <Route path="/vault/edit/:id" element={<AddPeptidePage />} />
        <Route path="/vault/:id" element={<PeptideDetailPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/peptides" element={<PeptidesPage />} />
        <Route path="/peptides/:name" element={<PeptideInfoPage />} />
        <Route path="/guides" element={<Navigate to="/resources" replace />} />
        <Route path="/resources" element={<ResourcesPage />} />
        <Route path="/exports" element={<ExportCenterPage />} />
        <Route path="/health" element={<HealthTrackerPage />} />
        <Route path="/settings/health" element={<Navigate to="/health" replace />} />
        <Route path="/tools/body-tracker" element={<Navigate to="/health?tab=body" replace />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/settings" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/calculator" replace />} />
      </Routes>
    </React.Suspense>
  );
};
