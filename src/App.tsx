// src/App.tsx
import { useState, useEffect } from 'react'; // Import useEffect
import ThemeToggle from './components/ThemeToggle';
import LoginButton from './components/LoginButton';

interface UserProfile {
  // Store our application's token now, not Google's
  sessionToken: string;
  email?: string; // Optional: info returned from backend
  name?: string; // Optional: info returned from backend
}

function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null); // For displaying errors

  // --- Make sure this function is async and has the fetch logic ---
  const handleLogin = async (googleIdToken: string) => {
    setLoginError(null); // Clear previous errors
    console.log("App: Handling login, received Google token:", googleIdToken);
    console.log("Attempting fetch to backend..."); // Add this log line

    try {
      // Adjust the URL based on your backend setup and proxy
      const backendUrl = '/api/v1/auth/google'; // Relative URL for proxy

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: googleIdToken }), // Send Google token
      });

      // Check if response is OK (status in 200-299 range)
      if (!response.ok) {
         let errorDetail = `Backend responded with status ${response.status}`;
         try {
             // Try to parse error detail from backend JSON response
             const errorData = await response.json();
             errorDetail = errorData.detail || JSON.stringify(errorData);
         } catch (parseError) {
             // If parsing fails, use the status text or fallback
             errorDetail = response.statusText || errorDetail;
         }
         console.error("Backend request failed:", response.status, errorDetail);
         throw new Error(errorDetail);
      }


      const sessionData = await response.json();

      if (!sessionData.access_token) {
          console.error("Backend response missing access_token:", sessionData);
          throw new Error("Backend did not return an access token.");
      }

      console.log("App: Received session data from backend:", sessionData);

      // Store the session token received from *our* backend
      setUser({
          sessionToken: sessionData.access_token,
          // Safely access nested user properties
          email: sessionData.user?.email,
          name: sessionData.user?.full_name
       });
      // Optional: Store session token for persistence
      localStorage.setItem('sessionToken', sessionData.access_token);

    } catch (error) {
      console.error("App: Login failed during backend communication:", error);
      // Set error state for display in UI
      setLoginError(error instanceof Error ? error.message : "Login failed during backend communication.");
      setUser(null); // Ensure user is logged out on error
      localStorage.removeItem('sessionToken'); // Clear potentially invalid token
    }
  };
  // --- End of handleLogin function ---


  // Callback function for logout
  const handleLogout = () => {
    console.log("App: Handling logout");
    setUser(null);
    localStorage.removeItem('sessionToken'); // Clear our session token
    setLoginError(null); // Clear any login errors on logout
    // TODO: Optionally call a backend /logout endpoint
  };

  // Check for stored session token on initial load
  useEffect(() => {
    const storedToken = localStorage.getItem('sessionToken');
    if (storedToken) {
      // TODO: Validate token with backend /me endpoint before trusting it
      console.log("App: Found stored session token, restoring session (validation needed)");
      setUser({ sessionToken: storedToken });
    }
  }, []); // Empty dependency array means run once on mount


  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 text-black dark:text-white transition-colors duration-200">
      <ThemeToggle />
      <h1 className="text-3xl font-bold underline text-blue-600 dark:text-blue-400 p-4">
        Axiom Flow UI
      </h1>

      {/* Display login errors */}
      {loginError && (
          <div className="p-4 m-4 text-red-700 bg-red-100 border border-red-400 rounded dark:bg-red-900 dark:text-red-200 dark:border-red-700" role="alert">
              <p className="font-bold">Login Error:</p>
              <p>{loginError}</p>
          </div>
      )}

      {/* Conditional rendering based on user state */}
      {user ? (
        <div className="p-4">
          <p>Welcome! {user.name || user.email || '(Logged In)'}</p>
          {/* <p>Session Token: {user.sessionToken.substring(0, 30)}...</p> */}
          <button
             onClick={handleLogout}
             className="mt-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded dark:bg-red-700 dark:hover:bg-red-800"
          >
             Logout
          </button>
        </div>
      ) : (
        <LoginButton onLoginSuccess={handleLogin} /> // Pass callback down
      )}

      {/* Add more content here later */}
    </div>
  );
}

export default App;
