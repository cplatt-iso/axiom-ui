// src/pages/LogManagementLayout.tsx
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LogRetentionPoliciesPage from './LogRetentionPoliciesPage';

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
                    <Card>
                        <CardHeader>
                            <CardTitle>Log Archival Rules</CardTitle>
                            <CardDescription>
                                Configure rules for archiving logs to long-term storage systems.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-12 text-gray-500">
                                <p>Archival rules management coming soon...</p>
                                <p className="text-sm mt-2">
                                    This will allow configuration of automated log archival to external storage systems
                                    like S3, GCS, or Azure Blob Storage for long-term compliance retention.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="statistics" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Log Storage Statistics</CardTitle>
                            <CardDescription>
                                View storage usage, index sizes, and retention policy effectiveness.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-12 text-gray-500">
                                <p>Storage statistics dashboard coming soon...</p>
                                <p className="text-sm mt-2">
                                    This will show real-time metrics on log volume, storage costs by tier,
                                    and policy compliance across all managed indices.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="health" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Log Management Health</CardTitle>
                            <CardDescription>
                                Monitor the health and status of log management operations.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-12 text-gray-500">
                                <p>Health monitoring dashboard coming soon...</p>
                                <p className="text-sm mt-2">
                                    This will display the operational status of retention policies,
                                    archival processes, and any failed or pending operations.
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default LogManagementLayout;
