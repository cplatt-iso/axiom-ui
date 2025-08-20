// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'; // Import AuthProvider
import { Toaster } from 'sonner';
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

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Configure caching for better performance
            staleTime: 1000 * 30, // Consider data fresh for 30 seconds
            gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
            refetchOnWindowFocus: false, // Disable auto refetch on focus
            retry: 1, // Only retry once on failure
            refetchInterval: false, // Disable auto-refetching by default
        },
    },
})

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(
        <StrictMode>
            <GoogleOAuthProvider clientId={googleClientId}>
                <QueryClientProvider client={queryClient}>
                    <BrowserRouter>
                        <AuthProvider>
                            <App />
                            <Toaster richColors position="top-right" />
                        </AuthProvider>
                    </BrowserRouter>
                </QueryClientProvider>
            </GoogleOAuthProvider>
        </StrictMode>
    );
}
