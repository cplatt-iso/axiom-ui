// src/components/LoginButton.tsx
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';

interface LoginButtonProps {
  onLoginSuccess: (idToken: string) => void; // Define prop type for callback
}

const LoginButton: React.FC<LoginButtonProps> = ({ onLoginSuccess }) => {

  const handleLoginSuccess = (credentialResponse: CredentialResponse) => {
    console.log('Google Login Success:', credentialResponse);
    if (credentialResponse.credential) {
        console.log("ID Token:", credentialResponse.credential);
        // Call the callback passed from App component
        onLoginSuccess(credentialResponse.credential);
    } else {
        console.error("Login success, but no credential received.");
    }
  };

  const handleLoginError = () => {
    console.error('Google Login Failed');
    // Optionally call an error handler prop if needed
  };

  return (
    <div style={{ marginTop: '20px', marginLeft: '20px' }}>
        <GoogleLogin
            onSuccess={handleLoginSuccess}
            onError={handleLoginError}
            useOneTap
            shape="rectangular"
            theme="outline"
            size="medium"
        />
    </div>
  );
};

export default LoginButton;
