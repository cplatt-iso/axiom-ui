// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Use relative path

interface ProtectedRouteProps {
    allowedRoles?: string[]; // Optional roles for RBAC
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        // You can replace this with a more sophisticated loading component later
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="p-4 text-center text-gray-600 dark:text-gray-300">Loading session...</div>
                {/* Optional: Add a spinner here */}
            </div>
        );
    }

    if (!user) {
        // User not logged in, redirect to login page
        // Pass the current location so the user can be redirected back after login (optional)
        // const location = useLocation(); // If needed: import { useLocation } from 'react-router-dom';
        console.log("ProtectedRoute: No user found, redirecting to /login");
        return <Navigate to="/login" replace />; // state={{ from: location }}
    }

    // Optional: RBAC check
    if (allowedRoles && allowedRoles.length > 0) {
        const userRoles = user.roles || [];
        const hasRequiredRole = allowedRoles.some(role => userRoles.includes(role));
        if (!hasRequiredRole) {
            // User logged in but doesn't have required role
            console.warn(`ProtectedRoute: Access denied for user ${user.email}. Required roles: ${allowedRoles.join(', ')}, User roles: ${userRoles.join(', ')}`);
            return <Navigate to="/unauthorized" replace />; // Redirect to an 'Unauthorized' page
        }
         console.debug(`ProtectedRoute: User ${user.email} has required roles (${allowedRoles.join(', ')}). Access granted.`);
    }

    // User is authenticated (and has roles if required), render the child route component
    // console.debug("ProtectedRoute: User authenticated. Rendering child route.");
    return <Outlet />; // Outlet renders the nested child route defined in App.tsx
};

export default ProtectedRoute;
