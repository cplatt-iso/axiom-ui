// src/components/LoginButton.tsx
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import React from 'react';

interface LoginButtonProps {
  // Renamed prop for clarity: receives the Google token string
  onGoogleSignInSuccess: (googleIdToken: string) => void;
}

const LoginButton: React.FC<LoginButtonProps> = ({ onGoogleSignInSuccess }) => {

  const handleInternalGoogleSuccess = (credentialResponse: CredentialResponse) => {
    console.log('LoginButton: Google credential response received:', credentialResponse);
    if (credentialResponse.credential) {
        console.log("LoginButton: Passing Google ID Token up:", credentialResponse.credential.substring(0,30)+"...");
        // Call the callback passed from LoginPage, providing ONLY the Google token
        onGoogleSignInSuccess(credentialResponse.credential);
    } else {
        console.error("LoginButton: Login success, but no credential received.");
    }
  };

  const handleLoginError = () => {
    console.error('LoginButton: Google Login Failed');
    // Optionally call an error handler prop if needed
  };

  return (
    // Add some basic styling if needed, or handle in parent
     <div className="inline-block">
        <GoogleLogin
            onSuccess={handleInternalGoogleSuccess}
            onError={handleLoginError}
            useOneTap
            shape="rectangular"
            theme="outline" // Or "filled_blue", etc.
            size="medium"
        />
    </div>
  );
};

export default LoginButton;
