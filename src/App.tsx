// src/App.tsx
import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './context/AuthContext'; // Import the custom hook
import { setAuthContextRef } from './services/api'; // Import the setter for the API service

// Import Core Layout and Route Protection Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Import Page Components
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ApiKeysPage from './pages/ApiKeysPage';
import UserManagementPage from './pages/UserManagementPage';
import RulesetsPage from './pages/RulesetsPage';
import RulesetDetailPage from './pages/RulesetDetailPage'; // <-- Import the new page
import SettingsPage from './pages/SettingsPage';
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
  useEffect(() => {
      setAuthContextRef(auth);
  }, [auth]); // Re-run this effect if the auth object changes

  return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Protected Routes (Standard Users & Admins) */}
            {/* This outer ProtectedRoute ensures a user must be logged in */}
            <Route element={<ProtectedRoute />}>
                {/* Routes using the main Layout */}
                <Route element={<Layout />}>
                    {/* Default route maps to Dashboard */}
                    {/* Use index route for cleaner default */}
                    <Route index element={<DashboardPage />} />
                    {/* Removed redundant path="/" */}

                    {/* Standard user routes */}
                    <Route path="/dashboard" element={<DashboardPage />} /> {/* Explicit dashboard route */}
                    <Route path="/api-keys" element={<ApiKeysPage />} />
                    <Route path="/settings" element={<SettingsPage />} />

                    {/* Rules Engine Routes (accessible by standard logged-in users) */}
                    <Route path="/rulesets" element={<RulesetsPage />} />
                    {/* --- New Route for Ruleset Details/Rules --- */}
                    <Route path="/rulesets/:rulesetId" element={<RulesetDetailPage />} />

                    {/* --- Admin Only Route (Nested Inside Layout) --- */}
                    {/* Apply admin role check specifically here */}
                    <Route
                        path="/admin/users"
                        element={
                            <ProtectedRoute allowedRoles={['Admin']}>
                                <UserManagementPage />
                            </ProtectedRoute>
                        }
                    />
                    {/* Add more routes accessible by standard users OR admins here */}
                </Route>
            </Route>

             {/* --- Alternative: Separate block for Admin routes if they don't use standard Layout or need different protection --- */}
             {/* If admin routes used a different Layout or protection mechanism, they could be structured like this:
             <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
                  <Route element={<AdminLayout />}> // Or <Layout /> if same
                     <Route path="/admin/dashboard" element={<AdminDashboard />} />
                     <Route path="/admin/users" element={<UserManagementPage />} />
                  </Route>
             </Route>
             */}
             {/* Based on your current structure, nesting the admin check within the main protected layout seems correct. */}


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
