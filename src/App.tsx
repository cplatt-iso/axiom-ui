// src/App.tsx
import { useEffect } from 'react';
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
import AiPromptConfigsPage from './pages/AiPromptConfigsPage';


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
import ExceptionsPage from './pages/ExceptionsPage';
import { OrdersPage } from './pages/OrdersPage';

// --- ADDED: Import New System Config Page ---
import SystemConfigurationPage from './pages/SystemConfigurationPage'; // Placeholder page
import SysInfoDisplay from './components/system-config/SysInfoDisplay';
import SysAdminActions from './components/system-config/SysAdminActions';
import RuntimeConfigurationManager from './components/system-config/RuntimeConfigurationManager';
import LoggingConfiguration from './components/system-config/LoggingConfiguration';
import LogManagementLayout from './pages/LogManagementLayout';
import GoogleHealthcareSourcesConfigPage from './pages/GoogleHealthcareSourcesConfigPage';
import FacilityModalityConfigPage from './pages/FacilityModalityConfigPage';
import FacilitiesConfigPage from './pages/FacilitiesConfigPage';
import ModalitiesConfigPage from './pages/ModalitiesConfigPage';
import AdminLogsPage from './pages/AdminLogsPage';

// --- ADDED: Import Query Spanning Pages ---
import QuerySpanningLayout from './pages/QuerySpanningLayout';
import SpannerConfigurationsPage from './pages/SpannerConfigurationsPage';
import SpannerServicesPage from './pages/SpannerServicesPage';
import SpannerAnalyticsPage from './pages/SpannerAnalyticsPage';
// --- END ADDED ---

function AppContent() {
    const auth = useAuth();
    const { isAuthenticated, isLoading } = auth;

    useEffect(() => {
        setAuthContextRef(auth);
    }, [auth]);

    // Show loading state while authentication is being checked
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="p-4 text-center text-gray-600 dark:text-gray-300">
                    Loading session...
                </div>
            </div>
        );
    }

    // If not authenticated, only show login and unauthorized routes
    if (!isAuthenticated) {
        return (
            <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/unauthorized" element={<UnauthorizedPage />} />
                {/* Redirect all other routes to login */}
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
        );
    }

    // If authenticated, show the full app
    return (
        <Routes>
            {/* Public Routes (still accessible when authenticated) */}
            <Route path="/login" element={<Navigate to="/dashboard" replace />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                    {/* Standard Routes */}
                    <Route index element={<DashboardPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/rulesets" element={<RulesetsPage />} />
                    <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
                    <Route path="/rulesets/:rulesetId" element={<RulesetDetailPage />} />
                    <Route path="/data-browser" element={<DataBrowserPage />} />
                    <Route path="/inventory-tool" element={<InventoryToolPage />} />
                    <Route path="/exceptions" element={<ExceptionsPage />} />
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
                                <Route path="google-healthcare" element={<GoogleHealthcareSourcesConfigPage />} />
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
                            <Route path="runtime-config" element={<RuntimeConfigurationManager />} />
                            <Route path="logs" element={<LoggingConfiguration />} />
                            <Route path="log-management" element={<LogManagementLayout />} />
                            <Route path="admin-actions" element={<SysAdminActions />} />
                        </Route>
                        
                        {/* Admin Logs Page */}
                        <Route path="/admin/logs" element={<AdminLogsPage />} />
                        <Route path="/settings/ai-prompts" element={<AiPromptConfigsPage />} />                                                

                        {/* Facility and Modality Configuration Section */}
                        <Route path="/admin/facility-modality-config" element={<FacilityModalityConfigPage />}>
                            <Route index element={<Navigate to="facilities" replace />} />
                            <Route path="facilities" element={<FacilitiesConfigPage />} />
                            <Route path="modalities" element={<ModalitiesConfigPage />} />
                        </Route>

                        {/* --- ADDED: Query Spanning Section --- */}
                        <Route path="/admin/query-spanning" element={<QuerySpanningLayout />}>
                            <Route index element={<Navigate to="configurations" replace />} />
                            <Route path="configurations" element={<SpannerConfigurationsPage />} />
                            <Route path="services" element={<SpannerServicesPage />} />
                            <Route path="analytics" element={<SpannerAnalyticsPage />} />
                        </Route>
                        {/* --- END ADDED --- */}
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
