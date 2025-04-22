// src/App.tsx
import React, { useEffect } from 'react';
// --- ADDED: Import Navigate for potential default redirect ---
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { setAuthContextRef } from './services/api';

// Import Core Layout and Route Protection Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Import Page Components
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ApiKeysPage from './pages/ApiKeysPage';
import UserManagementPage from './pages/UserManagementPage';
import RulesetsPage from './pages/RulesetsPage';
import RulesetDetailPage from './pages/RulesetDetailPage';
import SettingsPage from './pages/SettingsPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';

// --- ADDED: Import new configuration pages (will be created next) ---
import ConfigurationPage from './pages/ConfigurationPage'; // Parent page with Tabs
import DicomWebSourcesConfigPage from './pages/DicomWebSourcesConfigPage'; // Specific config page
// --- END ADDED IMPORTS ---

/**
 * AppContent component sets up the main routing logic and connects
 * the authentication context to the API service helper.
 */
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

            {/* Protected Routes (Standard Users & Admins) */}
            <Route element={<ProtectedRoute />}> {/* Outer: User must be logged in */}
                <Route element={<Layout />}> {/* Apply standard layout */}
                    {/* --- Standard Routes --- */}
                    <Route index element={<DashboardPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/api-keys" element={<ApiKeysPage />} />
                    <Route path="/settings" element={<SettingsPage />} /> {/* User settings */}
                    <Route path="/rulesets" element={<RulesetsPage />} />
                    <Route path="/rulesets/:rulesetId" element={<RulesetDetailPage />} />

                    {/* --- Admin Routes Section (Nested within Layout) --- */}
                    {/* Group admin routes under a common protected element */}
                    <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                        {/* User Management */}
                        <Route path="/admin/users" element={<UserManagementPage />} />

                        {/* Configuration Section */}
                        <Route path="/admin/config" element={<ConfigurationPage />}>
                            {/* Default/Index route for config: Navigate to the first config page */}
                            <Route index element={<Navigate to="dicomweb-sources" replace />} />

                            {/* Specific Configuration Pages */}
                            <Route path="dicomweb-sources" element={<DicomWebSourcesConfigPage />} />
                            {/* Add other config pages here later, e.g., */}
                            {/* <Route path="dimse-listeners" element={<DimseListenersConfigPage />} /> */}
                            {/* <Route path="storage-backends" element={<StorageBackendsConfigPage />} /> */}
                        </Route>

                        {/* Add other top-level admin routes here */}
                        {/* e.g., <Route path="/admin/audit-log" element={<AuditLogPage />} /> */}
                    </Route>
                    {/* --- End Admin Routes Section --- */}

                </Route> {/* End Layout */}
            </Route> {/* End Outer ProtectedRoute */}

            {/* Catch-all Not Found Route - Must be last */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
  );
}

/**
 * The main App component.
 */
function App() {
     return <AppContent />;
}

export default App;
