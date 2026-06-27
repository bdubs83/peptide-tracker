import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { VaultPage } from "../features/vault/VaultPage";
import { AddPeptidePage } from "../features/vault/AddPeptidePage";
import { PeptideDetailPage } from "../features/vault/PeptideDetailPage";
import { CalendarPage } from "../features/calendar/CalendarPage";
import { PeptidesPage } from "../features/vault/PeptidesPage";
import { PeptideInfoPage } from "../features/vault/PeptideInfoPage";
import { ProfilePage } from "../features/vault/ProfilePage";
import { GuidesPage } from "../features/guides/GuidesPage";
import { ToolsPage } from "../features/tools/ToolsPage";

export const AppRoutes: React.FC = () => {
  return (
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
      <Route path="/guides" element={<GuidesPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/settings" element={<ProfilePage />} />
      <Route path="*" element={<Navigate to="/calculator" replace />} />
    </Routes>
  );
};
