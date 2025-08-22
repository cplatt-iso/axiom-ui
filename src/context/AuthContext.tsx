// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode, useMemo, useCallback } from 'react'; // Import useMemo and useCallback

// --- Keep Interfaces the same ---
export interface UserProfile {
    sessionToken: string;
    email?: string;
    name?: string;
    picture?: string;
    roles?: string[];
    is_superuser?: boolean;
}

export interface AuthContextType {
    user: UserProfile | null;
    isLoading: boolean;
    isAuthenticated: boolean; // <-- Add isAuthenticated state
    isDeveloperMode: boolean; // <-- Add developer mode state
    login: (profile: UserProfile) => void;
    logout: () => void;
    toggleDeveloperMode: () => void; // <-- Add developer mode toggle
    getToken: () => string | null;
    isSuperUser: () => boolean;
}
// --- End Interfaces ---

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading
    const [isDeveloperMode, setIsDeveloperMode] = useState<boolean>(() => {
        // Check URL parameters and localStorage for developer mode
        const urlParams = new URLSearchParams(window.location.search);
        const fromUrl = urlParams.get('dev') === 'true';
        const fromStorage = localStorage.getItem('developerMode') === 'true';
        return fromUrl || fromStorage;
    });

    // --- Derive isAuthenticated based on user state OR developer mode ---
    // Use useMemo to prevent unnecessary recalculations
    const isAuthenticated = useMemo(() => isDeveloperMode || !!user, [user, isDeveloperMode]);
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
                             roles: profile.roles || [],
                             is_superuser: profile.is_superuser
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

    const login = useCallback((profile: UserProfile) => {
        console.log("AuthProvider: Logging in user", profile);
        setUser(profile); // This will trigger isAuthenticated update
        setIsLoading(false); // Ensure loading is false after login attempt
        localStorage.setItem('sessionToken', profile.sessionToken);
        localStorage.setItem('userProfile', JSON.stringify({
            email: profile.email,
            name: profile.name,
            picture: profile.picture,
            roles: profile.roles,
            is_superuser: profile.is_superuser
        }));
    }, []);

    const logout = useCallback(() => {
        console.log("AuthProvider: Logging out user");
        setUser(null); // This will trigger isAuthenticated update
        setIsLoading(false); // Ensure loading is false after logout
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('userProfile');
    }, []);

    const getToken = useCallback((): string | null => {
        // Check state first, then localStorage as fallback (though should be sync)
        return user?.sessionToken ?? localStorage.getItem('sessionToken');
    }, [user?.sessionToken]);

    const isSuperUser = useCallback((): boolean => {
        return user?.is_superuser ?? false;
    }, [user?.is_superuser]);

    const toggleDeveloperMode = useCallback(() => {
        setIsDeveloperMode(prev => {
            const newMode = !prev;
            localStorage.setItem('developerMode', newMode.toString());
            console.log(`Developer mode ${newMode ? 'enabled' : 'disabled'}`);
            return newMode;
        });
    }, []);

    // Effect to handle URL parameter for developer mode
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('dev') === 'true') {
            setIsDeveloperMode(true);
            localStorage.setItem('developerMode', 'true');
            console.log('Developer mode enabled via URL parameter');
        }
    }, []);


    // --- Context value now includes isAuthenticated and developer mode ---
    const contextValue = useMemo(() => ({
        user,
        isLoading,
        isAuthenticated, // Pass derived value
        isDeveloperMode,
        login,
        logout,
        toggleDeveloperMode,
        getToken,
        isSuperUser
    }), [user, isLoading, isAuthenticated, isDeveloperMode, login, logout, toggleDeveloperMode, getToken, isSuperUser]); // Dependencies for context value memoization
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
