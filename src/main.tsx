// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider
import App from './App'; // Import App
import './index.css';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID; // Use env variable

if (!googleClientId) {
  console.error("FATAL ERROR: Google Client ID (VITE_GOOGLE_CLIENT_ID) is not configured in environment variables (.env file).");
  // Render an error message or stop the app
  const rootElement = document.getElementById('root');
  if (rootElement) {
      rootElement.innerHTML = '<div style="color: red; padding: 20px;"><strong>Configuration Error:</strong> Google Client ID is missing. Check VITE_GOOGLE_CLIENT_ID in your .env file.</div>';
  }
  // Prevent further execution if critical config is missing
  throw new Error("Missing Google Client ID");
}


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter> { /* Wrap with Router */ }
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider> { /* Wrap with Auth Provider */ }
          <App />
        </AuthProvider>
      </GoogleOAuthProvider>
    </BrowserRouter>
  </StrictMode>,
);

// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

interface ProtectedRouteProps {
    allowedRoles?: string[]; // Optional roles for RBAC
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        // Show a loading spinner or skeleton screen while checking auth state
        return <div className="p-4 text-center">Loading session...</div>;
    }

    if (!user) {
        // User not logged in, redirect to login page
        return <Navigate to="/login" replace />;
    }

    // Optional: RBAC check
    if (allowedRoles && allowedRoles.length > 0) {
        const userRoles = user.roles || [];
        const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));
        if (!hasRequiredRole) {
            // User logged in but doesn't have required role
            console.warn(`Access denied: User lacks required roles (${allowedRoles.join(', ')})`);
            return <Navigate to="/unauthorized" replace />; // Redirect to an 'Unauthorized' page
        }
    }

    // User is authenticated (and has roles if required), render the child route
    return <Outlet />;
};

export default ProtectedRoute;
