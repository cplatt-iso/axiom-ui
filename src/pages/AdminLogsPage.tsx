// src/pages/AdminLogsPage.tsx
import React from 'react';
import SimpleLogViewer from '@/components/logs/SimpleLogViewer';

const AdminLogsPage: React.FC = () => {
    return (
        <div className="container mx-auto px-4 py-6">
            <h1 className="text-2xl font-bold mb-6">System Logs</h1>
            <p className="text-muted-foreground mb-6">
                Monitor and analyze medical imaging system logs for troubleshooting and audit compliance.
            </p>
            <SimpleLogViewer showFilters={true} maxHeight="calc(100vh - 250px)" />
        </div>
    );
};

export default AdminLogsPage;
