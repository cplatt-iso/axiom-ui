// src/pages/NotFoundPage.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 text-center px-4">
             <div className="p-8 bg-white dark:bg-gray-800 rounded shadow-md">
                 <h1 className="text-6xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Page Not Found</h2>
                <p className="mb-6 text-gray-600 dark:text-gray-300">
                    Sorry, the page you are looking for does not exist or has been moved.
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

export default NotFoundPage;
