// src/components/DeveloperModeIndicator.tsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CodeBracketIcon } from '@heroicons/react/24/outline';

const DeveloperModeIndicator: React.FC = () => {
    const { isDeveloperMode, toggleDeveloperMode, user } = useAuth();
    const [showDetails, setShowDetails] = useState(false);

    // Add keyboard shortcut to toggle developer mode (Ctrl+Shift+D)
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                toggleDeveloperMode();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [toggleDeveloperMode]);

    if (!isDeveloperMode) {
        return null;
    }

    return (
        <>
            {/* Developer Mode Banner */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 dark:bg-yellow-600 text-black dark:text-white px-4 py-2 shadow-lg border-b-2 border-yellow-600 dark:border-yellow-500">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                    <div className="flex items-center space-x-2">
                        <CodeBracketIcon className="h-5 w-5" />
                        <span className="font-semibold">Developer Mode Active</span>
                        <span className="text-sm opacity-80">
                            (Authentication Bypassed)
                        </span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setShowDetails(!showDetails)}
                            className="text-sm px-2 py-1 rounded bg-yellow-600 dark:bg-yellow-700 hover:bg-yellow-700 dark:hover:bg-yellow-800 transition-colors"
                        >
                            {showDetails ? 'Hide' : 'Show'} Details
                        </button>
                        <button
                            onClick={toggleDeveloperMode}
                            className="text-sm px-2 py-1 rounded bg-red-500 hover:bg-red-600 text-white transition-colors"
                        >
                            Disable
                        </button>
                    </div>
                </div>
                
                {/* Details Panel */}
                {showDetails && (
                    <div className="mt-2 pt-2 border-t border-yellow-600 dark:border-yellow-500">
                        <div className="max-w-7xl mx-auto">
                            <div className="text-sm space-y-1">
                                <p><strong>Status:</strong> All authentication checks are bypassed</p>
                                <p><strong>Current User:</strong> {user ? `${user.email} (${user.roles?.join(', ') || 'No roles'})` : 'None (Developer Mode)'}</p>
                                <p><strong>Toggle Shortcut:</strong> Ctrl+Shift+D</p>
                                <p><strong>URL Parameter:</strong> Add ?dev=true to enable</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Spacer to push content down when banner is visible */}
            <div className={`${showDetails ? 'h-24' : 'h-12'} transition-all duration-200`} />
        </>
    );
};

export default DeveloperModeIndicator;
