// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'; // Import the provider
import './index.css'
import App from './App.tsx'

// Replace with your actual Client ID from Google Cloud Console
const googleClientId = "561172144805-t8ifbm6e0r78b9n0dslafcerqj4cocrv.apps.googleusercontent.com";

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Wrap the App component with the provider */}
    <GoogleOAuthProvider clientId={googleClientId}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
)
