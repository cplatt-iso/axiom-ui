// src/pages/LoginPage.tsx
import React, { useState } from 'react'; // Add useState for loading/error state
import LoginButton from '../components/LoginButton';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { apiClient } from '../services/api'; // Import the API client

const LoginPage: React.FC = () => {
    const { user, login } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // This function now receives the Google ID token string
    const handleGoogleSignIn = async (googleIdToken: string) => {
        console.log("LoginPage: Received Google ID token from LoginButton:", googleIdToken.substring(0, 30) + "...");
        setIsLoading(true);
        setError(null);

        try {
            console.log("LoginPage: Calling backend /auth/google...");
            // Call the backend using apiClient (don't use auth for this specific call)
            const backendResponseData = await apiClient<{
                access_token: string;
                token_type: string;
                user: { email?: string; full_name?: string; picture?: string; roles?: { name: string }[] };
            }>('/auth/google', {
                method: 'POST',
                body: JSON.stringify({ token: googleIdToken }),
                useAuth: false // Explicitly disable sending Bearer token for this login call
            });

            console.log("LoginPage: Received backend response:", backendResponseData);

            // Construct the profile for AuthContext
            const userProfile = {
                 sessionToken: backendResponseData.access_token,
                 email: backendResponseData.user?.email,
                 name: backendResponseData.user?.full_name,
                 picture: backendResponseData.user?.picture,
                 roles: backendResponseData.user?.roles?.map(role => role.name) || []
             };

            console.log("LoginPage: Calling AuthContext login with profile:", userProfile);
            login(userProfile);
            // Navigate automatically handled by the redirect check below

        } catch (err: any) {
             console.error("LoginPage: Backend login failed:", err);
             setError(err.message || "Failed to log in with backend.");
        } finally {
             setIsLoading(false);
        }
    };

    // If user is logged in (after successful login call), redirect to dashboard
    if (user) {
        console.log("LoginPage: User detected, redirecting to '/'");
        return <Navigate to="/" replace />;
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="p-8 bg-white dark:bg-gray-800 rounded shadow-md text-center w-full max-w-sm">
                <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Sign In</h1>
                 <p className="mb-6 text-gray-600 dark:text-gray-300 text-sm">
                     Use your Google account to access Axiom Flow.
                 </p>

                {/* Display Loading State */}
                 {isLoading && <p className="text-indigo-600 dark:text-indigo-400">Signing in...</p>}

                 {/* Display Errors */}
                 {error && <p className="text-red-500 dark:text-red-400 text-sm mb-4">{error}</p>}

                 {/* Render Login Button only if not loading */}
                 {!isLoading && (
                     <LoginButton onGoogleSignInSuccess={handleGoogleSignIn} />
                 )}
            </div>
        </div>
    );
};

export default LoginPage;
