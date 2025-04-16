// src/context/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

interface UserProfile {
    sessionToken: string;
    email?: string;
    name?: string;
    picture?: string; // Add picture field
    roles?: string[]; // Add roles field
}

interface AuthContextType {
    user: UserProfile | null;
    isLoading: boolean; // Track initial loading state
    login: (profile: UserProfile) => void;
    logout: () => void;
    getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading

    // Load user from localStorage on initial mount
    useEffect(() => {
        console.log("AuthProvider: Checking localStorage for session...");
        try {
            const storedToken = localStorage.getItem('sessionToken');
            const storedProfile = localStorage.getItem('userProfile');

            if (storedToken && storedProfile) {
                console.log("AuthProvider: Found stored token and profile.");
                const profile = JSON.parse(storedProfile);
                // TODO: Validate token with backend /me endpoint here!
                // For now, we trust localStorage. Replace with a fetch call.
                setUser({
                    sessionToken: storedToken,
                    email: profile.email,
                    name: profile.name,
                    picture: profile.picture, // Load picture
                    roles: profile.roles || [] // Load roles or default to empty
                });
            } else {
                console.log("AuthProvider: No valid session found in localStorage.");
            }
        } catch (error) {
            console.error("AuthProvider: Error loading from localStorage", error);
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('userProfile');
        } finally {
            setIsLoading(false); // Finished loading attempt
        }
    }, []);

    const login = (profile: UserProfile) => {
        console.log("AuthProvider: Logging in user", profile);
        setUser(profile);
        localStorage.setItem('sessionToken', profile.sessionToken);
        // Store relevant parts of the profile
        localStorage.setItem('userProfile', JSON.stringify({
            email: profile.email,
            name: profile.name,
            picture: profile.picture, // Save picture
            roles: profile.roles // Save roles
        }));
    };

    const logout = () => {
        console.log("AuthProvider: Logging out user");
        setUser(null);
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('userProfile');
        // Add potential call to backend logout endpoint if needed
    };

    const getToken = (): string | null => {
        return user?.sessionToken ?? null;
    };


    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, getToken }}>
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
