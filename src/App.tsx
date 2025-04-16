// src/App.tsx
import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext'; // Import the custom hook
import { setAuthContextRef } from './services/api'; // Import the setter for the API service

// Import Core Layout and Route Protection Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Import Page Components (Create these files with basic content)
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ApiKeysPage from './pages/ApiKeysPage';
import UserManagementPage from './pages/UserManagementPage';
import RulesetsPage from './pages/RulesetsPage'; // Example page for rules
import SettingsPage from './pages/SettingsPage'; // Example page for settings
import UnauthorizedPage from './pages/UnauthorizedPage';
import NotFoundPage from './pages/NotFoundPage';

/**
 * AppContent component sets up the main routing logic and connects
 * the authentication context to the API service helper.
 */
function AppContent() {
  // Get the auth context instance
  const auth = useAuth();

  // Effect to update the API service helper with the current auth context instance
  // This ensures the API client always has access to the latest token/logout function
  useEffect(() => {
      setAuthContextRef(auth);
  }, [auth]); // Re-run this effect if the auth object changes

  return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected Routes */}
            {/* This outer ProtectedRoute ensures a user must be logged in */}
            <Route element={<ProtectedRoute />}>
                {/* Routes using the main Layout (Sidebar, Header etc.) */}
                <Route element={<Layout />}>
                    {/* Default route maps to Dashboard */}
                    <Route index element={<DashboardPage />} />
                    <Route path="/" element={<DashboardPage />} />

                    {/* Standard user routes */}
                    <Route path="/api-keys" element={<ApiKeysPage />} />
                    <Route path="/rulesets" element={<RulesetsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    {/* Add more standard user routes here as needed */}
                </Route>
            </Route>

             {/* Protected Admin Routes */}
             {/* This outer ProtectedRoute ensures user is logged in AND has 'Admin' role */}
            <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                 {/* Admin routes also use the main Layout */}
                 <Route element={<Layout />}>
                    <Route path="/admin/users" element={<UserManagementPage />} />
                     {/* Add more admin-specific routes here */}
                 </Route>
             </Route>

            {/* Catch-all Not Found Route - Must be last */}
            <Route path="*" element={<NotFoundPage />} />
        </Routes>
  );
}

/**
 * The main App component.
 * Its primary role now is to render AppContent, which handles the routing logic.
 * The necessary providers (BrowserRouter, GoogleOAuthProvider, AuthProvider)
 * are wrapped around App in main.tsx.
 */
function App() {
     return <AppContent />;
}

export default App;
