// src/pages/UnauthorizedPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-center px-4">
            <div className="p-8 bg-white dark:bg-gray-800 rounded shadow-md">
                <h1 className="text-4xl font-bold text-red-600 dark:text-red-500 mb-4">403</h1>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Unauthorized Access</h2>
                <p className="mb-6 text-gray-600 dark:text-gray-300">
                    You do not have the necessary permissions to access this page.
                </p>
                <Link
                    to="/"
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                >
                    Go to Dashboard
                </Link>
            </div>
        </div>
    );
};

export default UnauthorizedPage;
