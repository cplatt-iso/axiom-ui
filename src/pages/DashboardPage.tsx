// src/pages/DashboardPage.tsx
import React from 'react';
import { useAuth } from '../context/AuthContext';

const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    return (
        <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
                Welcome back, {user?.name || user?.email || 'User'}! This is your main dashboard.
            </p>
            {/* Add dashboard widgets or content here */}
        </div>
    );
};

export default DashboardPage;
