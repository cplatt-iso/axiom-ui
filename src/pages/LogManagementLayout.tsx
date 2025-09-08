// src/pages/LogManagementLayout.tsx
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LogRetentionPoliciesPage from './LogRetentionPoliciesPage';
import { ArchivalRulesPage, StatisticsPage, HealthStatusPage } from '@/components/log-management';

const LogManagementLayout: React.FC = () => {
    const [activeTab, setActiveTab] = useState('retention-policies');

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Log Management</h2>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Manage log retention policies, archival rules, and storage optimization.
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 gap-2">
                    <TabsTrigger value="retention-policies" className="w-full">
                        Retention Policies
                    </TabsTrigger>
                    <TabsTrigger value="archival-rules" className="w-full">
                        Archival Rules
                    </TabsTrigger>
                    <TabsTrigger value="statistics" className="w-full">
                        Statistics
                    </TabsTrigger>
                    <TabsTrigger value="health" className="w-full">
                        Health Status
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="retention-policies" className="mt-6">
                    <LogRetentionPoliciesPage />
                </TabsContent>

                <TabsContent value="archival-rules" className="mt-6">
                    <ArchivalRulesPage />
                </TabsContent>

                <TabsContent value="statistics" className="mt-6">
                    <StatisticsPage />
                </TabsContent>

                <TabsContent value="health" className="mt-6">
                    <HealthStatusPage />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default LogManagementLayout;
