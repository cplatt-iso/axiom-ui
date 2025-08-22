// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    allowedRoles?: string[];
    children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
    const { user, isLoading, isAuthenticated, isDeveloperMode } = useAuth();
    const location = useLocation();

    // --- Keep console logs for debugging if needed ---
    console.log(`--- ProtectedRoute Check (${location.pathname}) ---`);
    console.log("Props:", { allowedRoles });
    console.log("Auth State:", { isAuthenticated, isLoading, isDeveloperMode });
    console.log("User Object:", user);
    // --- End Logs ---

    if (isLoading) {
        console.log("ProtectedRoute: Auth Loading...");
        // --- Return an actual element for the loading state ---
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="p-4 text-center text-gray-600 dark:text-gray-300">
                    Loading session...
                    {/* Optional: Add spinner SVG or component here */}
                </div>
            </div>
        );
        // --- End Loading Element ---
    }

    if (!isAuthenticated) {
        console.log(`ProtectedRoute: Not authenticated (isAuthenticated: ${isAuthenticated}, developerMode: ${isDeveloperMode}). Redirecting to /login.`);
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        const userRoles = user?.roles || [];
        console.log(`ProtectedRoute: Checking roles for ${location.pathname}. Required: [${allowedRoles.join(', ')}]. User roles found: [${userRoles.join(', ')}]`);
        const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));
        if (!hasRequiredRole) {
            console.warn(`ProtectedRoute: Role check FAILED for user ${user?.email} at ${location.pathname}. Redirecting to /unauthorized.`);
            return <Navigate to="/unauthorized" state={{ from: location }} replace />;
        }
        console.log(`ProtectedRoute: Role check PASSED for user ${user?.email} at ${location.pathname}.`);
    }

    console.log(`ProtectedRoute: Access GRANTED for ${location.pathname}. Rendering child/outlet.`);
    return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
