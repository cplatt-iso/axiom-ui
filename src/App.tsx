// src/App.tsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { setAuthContextRef } from './services/api';

import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ApiKeysPage from './pages/ApiKeysPage';
import UserManagementPage from './pages/UserManagementPage';
import RulesetsPage from './pages/RulesetsPage';
import RulesetDetailPage from './pages/RulesetDetailPage';
import SettingsPage from './pages/SettingsPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';

// --- UPDATED: Rename ConfigurationPage import ---
import RoutingConfigurationPage from './pages/RoutingConfigurationPage'; // Renamed from ConfigurationPage
// --- END UPDATED ---
import ScrapersLayout from './pages/ScrapersLayout';
import ListenersLayout from './pages/ListenersLayout';
import DicomWebSourcesConfigPage from './pages/DicomWebSourcesConfigPage';
import DimseListenersConfigPage from './pages/DimseListenersConfigPage';
import DimseQrSourcesConfigPage from './pages/DimseQrSourcesConfigPage';
import StorageBackendsConfigPage from './pages/StorageBackendsConfigPage';
import CrosswalkLayout from './pages/CrosswalkLayout';
import CrosswalkDataSourcesPage from './pages/CrosswalkDataSourcesPage';
import CrosswalkMappingsPage from './pages/CrosswalkMappingsPage';
import StowRsInfoPage from './pages/StowRsInfoPage';
import JsonApiInfoPage from './pages/JsonApiInfoPage';
import SchedulesConfigPage from './pages/SchedulesConfigPage';
import DataBrowserPage from './pages/DataBrowserPage';
import InventoryToolPage from './pages/InventoryToolPage';

// --- ADDED: Import New System Config Page ---
import SystemConfigurationPage from './pages/SystemConfigurationPage'; // Placeholder page
import SysInfoDisplay from './components/system-config/SysInfoDisplay';
import SysProcessingSettings from './components/system-config/SysProcessingSettings';
import SysLimitsSettings from './components/system-config/SysLimitsSettings';
import SysExternalServices from './components/system-config/SysExternalServices';
import SysAdminActions from './components/system-config/SysAdminActions';
// --- END ADDED ---

function AppContent() {
  const auth = useAuth();

  useEffect(() => {
      setAuthContextRef(auth);
  }, [auth]);

  return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                    {/* Standard Routes */}
                    <Route index element={<DashboardPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/rulesets" element={<RulesetsPage />} />
                    <Route path="/rulesets/:rulesetId" element={<RulesetDetailPage />} />
                    <Route path="/data-browser" element={<DataBrowserPage />} />
                    <Route path="/inventory-tool" element={<InventoryToolPage />} />
                    <Route path="/api-keys" element={<ApiKeysPage />} />
                    <Route path="/settings" element={<SettingsPage />} />

                    {/* Admin Routes Section */}
                    <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                        {/* User Management */}
                        <Route path="/admin/users" element={<UserManagementPage />} />

                        {/* --- UPDATED: Routing Configuration Section --- */}
                        <Route path="/admin/routing-config" element={<RoutingConfigurationPage />}>
                            <Route index element={<Navigate to="scrapers" replace />} />

                            {/* Scrapers Sub-Section */}
                            <Route path="scrapers" element={<ScrapersLayout />}>
                                <Route index element={<Navigate to="dicomweb" replace />} />
                                <Route path="dicomweb" element={<DicomWebSourcesConfigPage />} />
                                <Route path="dimse-qr" element={<DimseQrSourcesConfigPage />} />
                            </Route>

                            {/* Listeners Sub-Section */}
                            <Route path="listeners" element={<ListenersLayout />}>
                                <Route index element={<Navigate to="dimse" replace />} />
                                <Route path="dimse" element={<DimseListenersConfigPage />} />
                                <Route path="stow-rs" element={<StowRsInfoPage />} />
                                <Route path="json-api" element={<JsonApiInfoPage />} />
                            </Route>

                            {/* Schedules Route */}
                            <Route path="schedules" element={<SchedulesConfigPage />} />

                            {/* Storage Backends Route */}
                            <Route path="storage-backends" element={<StorageBackendsConfigPage />} />

                            {/* Crosswalk Sub-Section */}
                            <Route path="crosswalk" element={<CrosswalkLayout />}>
                                <Route index element={<Navigate to="data-sources" replace />} />
                                <Route path="data-sources" element={<CrosswalkDataSourcesPage />} />
                                <Route path="mappings" element={<CrosswalkMappingsPage />} />
                            </Route>
                        </Route>
                        {/* --- END UPDATED --- */}

                        {/* --- ADDED: System Configuration Section --- */}
                        <Route path="/admin/system-config" element={<SystemConfigurationPage />}>
                            <Route index element={<Navigate to="info" replace />} />
                            <Route path="info" element={<SysInfoDisplay />} />
                            <Route path="processing" element={<SysProcessingSettings />} />
                            <Route path="limits" element={<SysLimitsSettings />} />
                            <Route path="services" element={<SysExternalServices />} />
                            <Route path="admin-actions" element={<SysAdminActions />} />
			</Route>
                    </Route> {/* End Admin Protected Route */}

                </Route> {/* End Layout */}
            </Route> {/* End Outer ProtectedRoute */}

            {/* Catch-all Not Found Route */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
  );
}

function App() {
     return <AppContent />;
}

export default App;
