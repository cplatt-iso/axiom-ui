// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo } from 'react'; // Import useMemo

// --- Keep Interfaces the same ---
export interface UserProfile {
    sessionToken: string;
    email?: string;
    name?: string;
    picture?: string;
    roles?: string[];
}

export interface AuthContextType {
    user: UserProfile | null;
    isLoading: boolean;
    isAuthenticated: boolean; // <-- Add isAuthenticated state
    login: (profile: UserProfile) => void;
    logout: () => void;
    getToken: () => string | null;
}
// --- End Interfaces ---

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading

    // --- Derive isAuthenticated based on user state ---
    // Use useMemo to prevent unnecessary recalculations
    const isAuthenticated = useMemo(() => !!user, [user]);
    // --- End Derive ---

    // Load user from localStorage on initial mount
    useEffect(() => {
        console.log("AuthProvider: Checking localStorage for session...");
        let isMounted = true; // Flag to prevent state updates if unmounted
        setIsLoading(true); // Ensure loading is true at the start of the effect

        const checkSession = async () => { // Make async if adding backend validation
            try {
                const storedToken = localStorage.getItem('sessionToken');
                const storedProfile = localStorage.getItem('userProfile');

                if (storedToken && storedProfile) {
                    console.log("AuthProvider: Found stored token and profile.");
                    const profile = JSON.parse(storedProfile);

                    // TODO: IMPORTANT! Validate token with backend /users/me endpoint here!
                    // This current implementation trusts localStorage, which is insecure.
                    // Example:
                    // try {
                    //    const backendUser = await apiClient('/users/me', { token: storedToken }); // Assuming apiClient handles token
                    //    if (isMounted) {
                    //       setUser({ sessionToken: storedToken, ...backendUser }); // Update with fresh data
                    //    }
                    // } catch (validationError) {
                    //     console.error("AuthProvider: Session token validation failed", validationError);
                    //     localStorage.removeItem('sessionToken');
                    //     localStorage.removeItem('userProfile');
                    //     if (isMounted) setUser(null); // Clear user if validation fails
                    // }

                    // --- Temporary: Trust localStorage ---
                    if (isMounted) {
                         setUser({
                             sessionToken: storedToken,
                             email: profile.email,
                             name: profile.name,
                             picture: profile.picture,
                             roles: profile.roles || []
                         });
                    }
                    // --- End Temporary ---

                } else {
                    console.log("AuthProvider: No valid session found in localStorage.");
                     if (isMounted) setUser(null); // Ensure user is null if no session found
                }
            } catch (error) {
                console.error("AuthProvider: Error loading from localStorage", error);
                localStorage.removeItem('sessionToken');
                localStorage.removeItem('userProfile');
                if (isMounted) setUser(null); // Clear user on error
            } finally {
                 // Only set loading false once checks are complete
                 if (isMounted) {
                    setIsLoading(false);
                    console.log("AuthProvider: Finished checking session.");
                 }
            }
        };

        checkSession();

        return () => {
            isMounted = false; // Cleanup function to set flag on unmount
        };
    }, []); // Empty dependency array ensures this runs only once on mount

    const login = (profile: UserProfile) => {
        console.log("AuthProvider: Logging in user", profile);
        setUser(profile); // This will trigger isAuthenticated update
        setIsLoading(false); // Ensure loading is false after login attempt
        localStorage.setItem('sessionToken', profile.sessionToken);
        localStorage.setItem('userProfile', JSON.stringify({
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            roles: profile.roles
        }));
    };

    const logout = () => {
        console.log("AuthProvider: Logging out user");
        setUser(null); // This will trigger isAuthenticated update
        setIsLoading(false); // Ensure loading is false after logout
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('userProfile');
    };

    const getToken = (): string | null => {
        // Check state first, then localStorage as fallback (though should be sync)
        return user?.sessionToken ?? localStorage.getItem('sessionToken');
    };


    // --- Context value now includes isAuthenticated ---
    const contextValue = useMemo(() => ({
        user,
        isLoading,
        isAuthenticated, // Pass derived value
        login,
        logout,
        getToken
    }), [user, isLoading, isAuthenticated]); // Dependencies for context value memoization
    // --- End Context value ---

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the auth context
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
