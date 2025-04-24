// src/App.tsx
import React, { useEffect } from 'react';
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

// Import new configuration pages
import ConfigurationPage from './pages/ConfigurationPage';
import DicomWebSourcesConfigPage from './pages/DicomWebSourcesConfigPage';
import DimseListenersConfigPage from './pages/DimseListenersConfigPage';
import DimseQrSourcesConfigPage from './pages/DimseQrSourcesConfigPage';
// --- ADDED: Import new Storage Backend config page ---
import StorageBackendsConfigPage from './pages/StorageBackendsConfigPage';
// --- END ADDED ---

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
            <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                    {/* Standard Routes */}
                    <Route index element={<DashboardPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/api-keys" element={<ApiKeysPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/rulesets" element={<RulesetsPage />} />
                    <Route path="/rulesets/:rulesetId" element={<RulesetDetailPage />} />

                    {/* Admin Routes Section */}
                    <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                        {/* User Management */}
                        <Route path="/admin/users" element={<UserManagementPage />} />

                        {/* Configuration Section */}
                        <Route path="/admin/config" element={<ConfigurationPage />}>
                            <Route index element={<Navigate to="dicomweb-sources" replace />} />
                            <Route path="dicomweb-sources" element={<DicomWebSourcesConfigPage />} />
                            <Route path="dimse-listeners" element={<DimseListenersConfigPage />} />
                            <Route path="dimse-qr-sources" element={<DimseQrSourcesConfigPage />} />
                            {/* --- ADDED: Route for Storage Backends --- */}
                            <Route path="storage-backends" element={<StorageBackendsConfigPage />} />
                            {/* --- END ADDED --- */}
                            {/* Add other config pages here later */}
                        </Route>
                        {/* Add other top-level admin routes here */}
                    </Route>

                </Route> {/* End Layout */}
            </Route> {/* End Outer ProtectedRoute */}

            {/* Catch-all Not Found Route */}
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
